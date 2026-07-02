"""Guest RSVP persistence — P0 (real backend so RSVPs reach the host).

Architecture: stranger's browser -> these PUBLIC endpoints -> Supabase Postgres
(rsvp_submissions). The host reads submissions back through an authenticated
planner-only endpoint. No direct frontend DB writes; the FastAPI service connects
with the Postgres role from DATABASE_URL (bypasses RLS — the "service role" path),
which is how it both resolves the event by rsvp_code and reads submissions back.

Three endpoints:
  GET  /api/public/invite/{rsvp_code}     — public; resolves an event to PUBLIC
                                            display fields only (no host PII).
  POST /api/public/rsvp/{rsvp_code}       — public; upserts a guest RSVP (idempotent).
  GET  /api/events/{event_id}/rsvps       — planner-only; host read-back.

Security model:
  - The event_id is ALWAYS resolved from rsvp_code server-side. A client-supplied
    event_id is never trusted.
  - The public invite resolver returns ONLY whitelisted display fields — never
    guests, budget, vendors, host PII, notes, or the raw event blob.
  - Both public endpoints are rate-limited (per-IP and per-rsvp_code) and cap free-
    text field lengths.
  - The host read-back is gated by require_planner + studio-scoped event access.

See supabase/migrations/009_rsvp_submissions.sql for the table + RLS.
"""
import time
from typing import Optional, Literal

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from ..db import get_pool
from ..auth import require_planner

router = APIRouter(tags=["rsvp"])

# ── Field caps (defense against abuse / oversized writes) ──────────────────────
MAX_NAME  = 120
MAX_MEAL  = 60
MAX_NEEDS = 500
MAX_NOTE  = 1000
MAX_CODE  = 80
MAX_KEY   = 120

# Minimum entropy floor for a public rsvp_code. New events mint a 22-char rsvpToken
# (see rsvpToken() in src/App.js). A short/guessable/legacy code must NEVER be able to
# resolve a real event server-side and gate real PII (street address / hostNames), so
# the public resolver rejects anything below this length with the same opaque 404.
# (Demo seed events use short ids/codes; those resolve only same-browser via the local
# events.find — they never reach this server resolver, which is fine.)
MIN_CODE_LEN = 16

# Public display fields exposed by the invite resolver. NOTHING else from the event
# blob is ever returned — no guests, emails, phones, budget, vendors, notes, internal
# fields, or the raw event blob. Audited whitelist (P0 security review):
#   - venueAddress + address: INTENTIONAL. A real guest holding the invite link needs
#     the full street address to navigate. The protection is the unguessable rsvpCode
#     (long random token + rsvpCode-only public resolve), NOT a guessable event id.
#   - hostNames: INTENTIONAL. The host's own name on their own invitation is expected.
#   - Everything else (guests, RSVPs, emails, phones, budget, vendors, notes, ownerId,
#     studioId, etc.) is deliberately absent and must NEVER be added here.
#   - dressCode / parking / bringNote: INTENTIONAL. Host-authored guest logistics
#     ("Black tie optional", "Street parking on Elm", "Bring a side") — display copy
#     the host wrote FOR guests, no PII. Surfaced as the invite's logistics rows.
#   - hostContact: INTENTIONAL but contact-only. The host's chosen reply channel for
#     guest questions (an email or phone the host opted to share on their own invite).
#     The client renders it as a tap-to-message link ("Message the host"), never as
#     printed raw text. Still host-controlled and invite-scoped; never auto-derived
#     from account PII.
PUBLIC_EVENT_FIELDS = (
    "name", "type", "date", "startTime", "timeOfDay", "endTime",
    "venue", "venueAddress", "venueCity", "venueState", "address",
    "inviteStyle", "hostNames", "rsvpCode",
    "dressCode", "parking", "bringNote", "hostContact",
)

# ── In-memory sliding-window rate limiter (mirrors routers/ai.py) ──────────────
# Per-process (single-worker beta); swap for Redis if scaled horizontally.
RSVP_RATE_WINDOW = 60          # seconds
RSVP_IP_MAX      = 30          # POST/GET per IP per window
RSVP_CODE_MAX    = 20          # POST per rsvp_code per window
_rate: dict[str, list] = {}

# ── Per-rsvp_code TOTAL submission ceiling (lifetime, not a window) ─────────────
# The sliding-window limiter above caps BURST; this caps the absolute number of
# distinct rows a single invite can ever accumulate, bounding roster-spam blast
# radius even from a low-and-slow attacker. Legit re-submits/edits don't count:
# an upsert on the same idempotency_key updates the existing row in place, so we
# only block a NEW row once the code is already at/over the cap. Env-overridable.
import os
RSVP_CODE_MAX_TOTAL = int(os.environ.get("RSVP_CODE_MAX_TOTAL", "500"))


def _rate_check(bucket: str, limit: int):
    """Returns (allowed, retry_after_seconds) for a sliding window."""
    now = time.time()
    hits = [t for t in _rate.get(bucket, []) if now - t < RSVP_RATE_WINDOW]
    if len(hits) >= limit:
        return False, int(RSVP_RATE_WINDOW - (now - hits[0])) + 1
    hits.append(now)
    _rate[bucket] = hits
    return True, 0


def _client_ip(request: Request) -> str:
    # Used only as a rate-limit bucket, never trusted for authz.
    #
    # X-Forwarded-For is a client-controllable, comma-separated chain
    # (client, proxy1, proxy2, ...). The FIRST hop is attacker-supplied and trivially
    # spoofable/rotatable — using it lets one caller dodge the per-IP limit by sending
    # a fresh fake IP each request. On Render the trusted client IP is the LAST hop
    # appended by the platform's own proxy, so we take the rightmost entry.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        hops = [h.strip() for h in xff.split(",") if h.strip()]
        if hops:
            return hops[-1]
    return request.client.host if request.client else "unknown"


def _enforce(request: Request, code: str, *, per_code: bool):
    ip = _client_ip(request)
    ok, retry = _rate_check(f"ip:{ip}", RSVP_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    if per_code:
        ok, retry = _rate_check(f"code:{code}", RSVP_CODE_MAX)
        if not ok:
            raise HTTPException(429, "Too many requests for this invite — try again shortly",
                                headers={"Retry-After": str(retry)})


def _clip(v: Optional[str], n: int) -> Optional[str]:
    if v is None:
        return None
    v = str(v).strip()
    return v[:n] if v else None


# ── Schemas ────────────────────────────────────────────────────────────────────
class RsvpSubmit(BaseModel):
    idempotency_key: str = Field(..., min_length=1)
    # A real guest name and a real answer are REQUIRED. Rejecting empty/garbage here
    # (422) stops blank rows from polluting the host's roster. `name` must be at least
    # one non-whitespace char; `rsvp` must be one of the three real answers.
    name: str = Field(..., min_length=1)
    rsvp: Literal["Yes", "No", "Maybe"]
    meal: Optional[str] = None
    needs: Optional[str] = None
    plus_one: Optional[str] = None
    plus_one_meal: Optional[str] = None
    plus_one_needs: Optional[str] = None
    kids: int = 0
    note: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        # min_length=1 alone would accept a whitespace-only name (" "); require a
        # real, non-whitespace value so the host never sees a nameless row.
        if not v or not v.strip():
            raise ValueError("name is required")
        return v


# ── Helpers ────────────────────────────────────────────────────────────────────
async def _resolve_event(conn, rsvp_code: str):
    """Resolve the event row STRICTLY by its public rsvp_code via the events JSONB.

    SECURITY (P0): public endpoints resolve ONLY by an exact `data->>'rsvpCode'`
    match — NEVER by the event id. Event ids are short, guessable slugs
    (`ev-wedding`); matching them here would turn the invite secret into a guessable
    slug and let anyone enumerate events. The invite secret is the long, unguessable
    rsvpCode (see rsvpToken() in src/App.js) — that token is the only gate.

    Returns (event_id, public_dict) or None. The backend Postgres role bypasses RLS,
    so this is the service path. The planner read-back has its OWN auth'd path
    (require_planner + studio-scoped _assert_event_access) and does not use this.

    Entropy floor: a code below MIN_CODE_LEN chars is rejected (treated as not found)
    before it can touch the DB, so a short/guessable/legacy code can never gate PII.
    """
    if not rsvp_code or len(rsvp_code) < MIN_CODE_LEN:
        return None
    row = await conn.fetchrow(
        "select id, data from public.events where data->>'rsvpCode' = $1 limit 1",
        rsvp_code,
    )
    if not row:
        return None
    data = row["data"] or {}
    if isinstance(data, str):
        import json
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    public = {k: data.get(k) for k in PUBLIC_EVENT_FIELDS if data.get(k) is not None}
    public["id"] = row["id"]
    return row["id"], public


# ── 1. GET /api/public/invite/{rsvp_code} — PUBLIC invite resolver ─────────────
@router.get("/api/public/invite/{rsvp_code}")
async def public_invite(rsvp_code: str, request: Request):
    """Resolve an event to PUBLIC display fields only. No auth. Rate-limited per IP.

    This is what lets a STRANGER'S browser (with no local copy of the event) render
    the RSVP form. Never returns host PII, guests, budget, vendors, or notes.
    """
    rsvp_code = (rsvp_code or "")[:MAX_CODE]
    _enforce(request, rsvp_code, per_code=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, rsvp_code)
    if not resolved:
        raise HTTPException(404, "invite not found")
    _event_id, public = resolved
    return {"ok": True, "event": public}


# ── 2. POST /api/public/rsvp/{rsvp_code} — PUBLIC guest submit (idempotent) ────
@router.post("/api/public/rsvp/{rsvp_code}")
async def public_rsvp(rsvp_code: str, payload: RsvpSubmit, request: Request):
    """Upsert a guest RSVP. No auth — the rsvp_code is the only credential, and the
    event_id is resolved from it server-side (a client event_id is never trusted).

    Idempotent on (rsvp_code, idempotency_key): a retry / double-tap UPDATES the
    same row, never duplicates. Returns { ok, submitted_at }.
    """
    rsvp_code = (rsvp_code or "")[:MAX_CODE]
    _enforce(request, rsvp_code, per_code=True)

    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, rsvp_code)
        if not resolved:
            raise HTTPException(404, "invite not found")
        event_id, _public = resolved

        # Lifetime submission ceiling per invite. A legit re-submit/edit reuses its
        # idempotency_key and UPDATES its row in place (no new row), so we only block
        # when this would be a brand-new row AND the code is already at/over the cap.
        # This bounds roster-spam blast radius beyond the per-window burst limiter.
        idk = _clip(payload.idempotency_key, MAX_KEY)
        existing = await conn.fetchrow(
            """select count(*) as n,
                      bool_or(idempotency_key = $2) as is_resubmit
                 from public.rsvp_submissions
                where rsvp_code = $1""",
            rsvp_code, idk,
        )
        if existing and not existing["is_resubmit"] and existing["n"] >= RSVP_CODE_MAX_TOTAL:
            raise HTTPException(
                429,
                "This invite has reached its response limit — contact the host.",
            )

        row = await conn.fetchrow(
            """
            insert into public.rsvp_submissions
              (event_id, rsvp_code, idempotency_key, guest_name, rsvp, meal, needs,
               plus_one, plus_one_meal, plus_one_needs, kids, note)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            on conflict (rsvp_code, idempotency_key) do update set
              guest_name     = excluded.guest_name,
              rsvp           = excluded.rsvp,
              meal           = excluded.meal,
              needs          = excluded.needs,
              plus_one       = excluded.plus_one,
              plus_one_meal  = excluded.plus_one_meal,
              plus_one_needs = excluded.plus_one_needs,
              kids           = excluded.kids,
              note           = excluded.note,
              updated_at     = now()
            returning submitted_at
            """,
            event_id,
            rsvp_code,
            idk,
            _clip(payload.name, MAX_NAME),
            payload.rsvp,
            _clip(payload.meal, MAX_MEAL),
            _clip(payload.needs, MAX_NEEDS),
            _clip(payload.plus_one, MAX_NAME),
            _clip(payload.plus_one_meal, MAX_MEAL),
            _clip(payload.plus_one_needs, MAX_NEEDS),
            int(payload.kids or 0),
            _clip(payload.note, MAX_NOTE),
        )
    return {"ok": True, "submitted_at": row["submitted_at"].isoformat()}


# ── Planner read authz — canonical studio ownership via public.events ──────────
async def _assert_event_studio_read(conn, event_id: str, principal: dict) -> None:
    """Authorize a planner to read an event's RSVPs by the CANONICAL studio scope on
    public.events (events.studio_id) — the same tenancy the whole frontend uses.

    Deliberately NOT the comms event_owners table: event_owners rows are created
    lazily, only when an event is claimed through a messages action
    (communication.py). Gating the RSVP read-back on that 404'd every event the host
    never opened in comms — so a host who just shared an invite could never see their
    cloud RSVPs. events.studio_id is the real owner and always present (NOT NULL), so
    any event the caller's studio owns is readable — no lazy claim required.

    Still safe: require_planner gates upstream; a planner can only read RSVPs for
    events their OWN studio owns. The dev_token path (local dev only) skips the check.
    """
    if not principal or principal.get("via") == "dev_token":
        return
    uid = principal.get("id")
    if not uid:
        raise HTTPException(status_code=403, detail="Planner identity required")
    row = await conn.fetchrow("select studio_id from public.events where id=$1", event_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    member = await conn.fetchval(
        "select 1 from studio_members where studio_id=$1 and user_id=$2",
        row["studio_id"], uid,
    )
    if not member:
        raise HTTPException(status_code=403, detail="You don't have access to this event.")


# ── 3. GET /api/events/{event_id}/rsvps — planner-only host read-back ──────────
@router.get("/api/events/{event_id}/rsvps")
async def list_rsvps(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Return all guest submissions for an event. Authenticated planner only, and
    only for an event the caller's studio owns (canonical events.studio_id scope)."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Authorize by the canonical studio ownership on public.events — NOT the comms
        # event_owners table (which is populated lazily and 404'd host read-backs for
        # events never touched in comms). See _assert_event_studio_read above.
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            """select id, event_id, rsvp_code, guest_name, rsvp, meal, needs,
                      plus_one, plus_one_meal, plus_one_needs, kids, note,
                      submitted_at, updated_at
               from public.rsvp_submissions
               where event_id = $1
               order by submitted_at desc""",
            event_id,
        )
        return [dict(r) for r in rows]
