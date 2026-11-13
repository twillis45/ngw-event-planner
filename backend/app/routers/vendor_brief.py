"""Vendor Brief v2 Phase 1 — tokenized LIVE brief resolve (no confirmation loop).

Replaces the frozen base64-snapshot share URL with one short server-resolvable
code per (event, vendor). The public resolver builds the brief FRESH from the
latest public.events.data blob on every request, so a shared link / printed QR
always shows current data.

Two endpoints (mirrors routers/rsvp.py conventions):
  POST /api/events/{event_id}/vendor-brief-links  — planner-only; mint-or-reuse
                                                    the active code for a vendor.
  GET  /api/public/vendor-brief/{code}            — public; resolves the brief
                                                    through the audited whitelist.

Security model:
  - Minting is gated by require_planner + studio-scoped event access (same
    _assert_event_studio_read as the RSVP host read-back). The client supplies
    ONLY a vendor_id; the vendor is verified against the SERVER's event blob —
    client-supplied event/vendor data is never trusted or stored.
  - The public resolver returns ONLY the vendor-safe whitelist below, a strict
    server-side mirror of src/lib/vendorBrief.js buildVendorBriefPayload().
    Never vendor.notes (host-private bookkeeping), money/deposit/contract/COI
    fields, reliability stats, other vendors' data, or the raw event blob.
  - Opaque 404 for missing, revoked, malformed, or too-short codes — a caller
    can't distinguish "never existed" from "revoked".
  - Public resolver is rate-limited per IP (same sliding window as RSVP).

Phase 1 guardrails (do NOT extend without a new mandate):
  - NO vendor confirmation submission endpoint.
  - NO revoke/rotate endpoints (revoked_at is honored on read, never written).
  - NO planner read-back of confirmations.

See supabase/migrations/013_vendor_brief_links.sql for the table.
"""
import os
import secrets
import time
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from ..db import get_pool
from ..auth import require_planner
from .. import config
from .rsvp import _assert_event_studio_read, _client_ip

router = APIRouter(tags=["vendor-brief"])

MAX_CODE = 80
# Entropy floor, same rationale as rsvp.MIN_CODE_LEN: a short/guessable code must
# never resolve a brief. Minted codes are 22+ chars (token_urlsafe(16)).
MIN_CODE_LEN = 16

# ── Field caps (defense against abuse / oversized writes) ──────────────────────
MAX_NAME  = 120
MAX_PHONE = 40
MAX_NOTE  = 1000
MAX_KEY   = 120

# ── In-memory sliding-window rate limiter (mirrors routers/rsvp.py) ────────────
BRIEF_RATE_WINDOW = 60   # seconds
BRIEF_IP_MAX      = 30   # public resolves per IP per window
CONFIRM_CODE_MAX  = 20   # confirm POSTs per code per window
_rate: dict[str, list] = {}

# Lifetime confirmation ceiling per code (mirrors RSVP_CODE_MAX_TOTAL): bounds
# the absolute rows one leaked link can accumulate, even low-and-slow. Legit
# re-submits/edits reuse their idempotency_key and UPDATE in place, so only a
# brand-new row counts against the cap. Env-overridable.
CONFIRM_CODE_MAX_TOTAL = int(os.environ.get("VENDOR_CONFIRM_CODE_MAX_TOTAL", "200"))


def _rate_check(bucket: str, limit: int):
    now = time.time()
    hits = [t for t in _rate.get(bucket, []) if now - t < BRIEF_RATE_WINDOW]
    if len(hits) >= limit:
        return False, int(BRIEF_RATE_WINDOW - (now - hits[0])) + 1
    hits.append(now)
    _rate[bucket] = hits
    return True, 0


def _mint_code() -> str:
    # 16 random bytes -> 22-char urlsafe token; same entropy class as the
    # 22-char rsvpToken() the frontend mints for invites.
    return secrets.token_urlsafe(16)


def _event_data(row) -> dict:
    data = row["data"] or {}
    if isinstance(data, str):
        import json
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    return data if isinstance(data, dict) else {}


def _find_vendor(data: dict, vendor_id: str):
    for v in data.get("vendors") or []:
        if isinstance(v, dict) and str(v.get("id")) == str(vendor_id):
            return v
    return None


# ── Whitelist — server-side mirror of src/lib/vendorBrief.js ───────────────────
# AUDITED (2026-07-05, same audit as the frontend builder): copies NAMED
# vendor-safe fields only, never spreads the vendor/event dicts. EXCLUDED by
# construction: notes, cost, depositAmt, depositPaid, balancePaid, payDueDate,
# backup, contract*, coi*, log, reliability/score fields, guests, budget, and
# anything else not named below. Planner branding fields exist only in the
# planner's browser profile (not in the event blob), so a server-resolved brief
# omits them; VendorBriefView already renders gracefully without them.
def _vendor_ros_slice(ros, vendor_name: str):
    cues = [
        r for r in (ros or [])
        if isinstance(r, dict)
        and (r.get("vendorName") == vendor_name or r.get("owner") == vendor_name)
    ]
    cues.sort(key=lambda r: r.get("time") or "")
    return [
        {"time": r.get("time"), "segment": r.get("segment"),
         "location": r.get("location"), "notes": r.get("notes")}
        for r in cues
    ]


# ── Board 2026-11-12, follow-up 1: headcount, host name, day-of contact ───────
# Mirrors src/lib/vendorBrief.js (briefGuestCount / briefDietCounts). A caterer
# cannot size an order without a headcount, so the brief now carries one — a
# NUMBER, never a guest name or a per-person dietary row. PII review: the count
# and the diet tallies are aggregates the host already keeps; no list, name,
# email or phone of any guest is read into the payload.
#
# DIET_TAGS mirrors src/lib/dietRows.js: only the fixed vocabulary passes. A
# host-typed custom key is free text and could name a person, so it stays home.
DIET_TAGS = (
    "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "Nut allergy",
    "Shellfish", "Halal", "Kosher", "Alcohol-free", "Egg allergy", "Soy allergy",
    "Diabetic-friendly",
)


def _num(v) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0
    return n if n == n and n not in (float("inf"), float("-inf")) else 0


def _brief_guest_count(data: dict):
    """guestCountFor(event).fromHost ? count : None — the outward gate. A count
    the app filled in from a playbook typical is withheld until the host gives
    one; a locked count or a roster is the host's by construction."""
    locked = _num(data.get("guestCount"))
    estimate = _num(data.get("guestEstimate"))
    guests = data.get("guests")
    roster = len(guests) if isinstance(guests, list) else 0
    count = locked or estimate or roster
    if not count:
        return None
    if not locked and estimate and data.get("guestCountSource") == "playbook-typical":
        return None
    return int(count) if float(count).is_integer() else count


def _brief_diet_counts(data: dict) -> dict:
    dc = data.get("dietCounts")
    dc = dc if isinstance(dc, dict) else {}
    out = {}
    for tag in DIET_TAGS:
        n = int(_num(dc.get(tag)))
        if n > 0:
            out[tag] = n
    return out


def build_vendor_brief_payload(vendor: dict, event_id: str, data: dict) -> dict:
    v = vendor or {}
    return {
        # vendor identity — safe: it's the vendor's own info
        "vendorId":    v.get("id"),
        "vendorName":  v.get("name"),
        "contactName": v.get("contactName") or "",
        "category":    v.get("category"),
        "arrivalTime": v.get("arrivalTime"),
        # vendor-facing note ONLY — never v["notes"] (host-private bookkeeping)
        "briefNote":   v.get("briefNote") or "",
        # event basics — what/when/where the vendor is showing up for
        "eventId":   event_id,
        "eventName": data.get("name"),
        "eventDate": data.get("date"),
        "venue":     data.get("venue"),
        # this vendor's run-of-show slice only
        "ros": _vendor_ros_slice(data.get("ros"), v.get("name") or ""),
        # the host's own name on their own brief (same rationale as the invite's
        # hostNames) — so the page never says "your event planner" to a host
        "hostName": data.get("hostName") or data.get("hostNames") or "",
        # who the vendor calls on the day, when the host named someone else —
        # host-authored FOR vendors, per event; empty means "call the host"
        "briefContactName": data.get("briefContactName") or "",
        "briefContactPhone": data.get("briefContactPhone") or "",
        # aggregate numbers only — see _brief_guest_count / _brief_diet_counts
        "guestCount": _brief_guest_count(data),
        "dietCounts": _brief_diet_counts(data),
    }


# ── Schemas ─────────────────────────────────────────────────────────────────────
class MintRequest(BaseModel):
    vendor_id: str = Field(..., min_length=1, max_length=120)


class ConfirmSubmit(BaseModel):
    idempotency_key: str = Field(..., min_length=1, max_length=120)
    state: Literal["confirmed", "issue_reported"]
    on_site_name: Optional[str] = None
    on_site_phone: Optional[str] = None
    note: Optional[str] = None


def _clip(v: Optional[str], n: int) -> Optional[str]:
    if v is None:
        return None
    v = str(v).strip()
    return v[:n] if v else None


async def _resolve_active_link(conn, code: str):
    """Active (non-revoked) link row for a code, or None. Entropy floor applied
    upstream by callers; this is just the shared lookup."""
    return await conn.fetchrow(
        """select event_id, vendor_id from public.vendor_brief_links
           where code=$1 and revoked_at is null""",
        code,
    )


# ── 1. POST /api/events/{event_id}/vendor-brief-links — planner mint-or-reuse ──
@router.post("/api/events/{event_id}/vendor-brief-links")
async def mint_vendor_brief_link(
    event_id: str,
    payload: MintRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Mint (or deterministically reuse) THE active brief code for a vendor.

    Authenticated planner only, studio-scoped. The vendor must exist in the
    SERVER's copy of the event — the client never supplies trusted event data.
    Returns { ok, code } — the same code on every call until a future revoke.
    """
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)

        row = await conn.fetchrow("select id, data from public.events where id=$1", event_id)
        if not row:
            raise HTTPException(404, "event not found")
        if not _find_vendor(_event_data(row), payload.vendor_id):
            raise HTTPException(404, "vendor not found on this event")

        existing = await conn.fetchval(
            """select code from public.vendor_brief_links
               where event_id=$1 and vendor_id=$2 and revoked_at is null
               limit 1""",
            event_id, payload.vendor_id,
        )
        if existing:
            return {"ok": True, "code": existing}

        blocked = await _brief_blocked_reason(conn, event_id, payload.vendor_id, _event_data(row))
        if blocked:
            raise HTTPException(402, {"reason": blocked, "detail": "Sharing this brief takes the One-Event Pass."})

        code = _mint_code()
        # The partial unique index makes a concurrent double-mint race safe: the
        # loser hits the conflict and returns the winner's code.
        inserted = await conn.fetchval(
            """insert into public.vendor_brief_links (code, event_id, vendor_id)
               values ($1, $2, $3)
               on conflict do nothing
               returning code""",
            code, event_id, payload.vendor_id,
        )
        if inserted:
            return {"ok": True, "code": inserted}
        winner = await conn.fetchval(
            """select code from public.vendor_brief_links
               where event_id=$1 and vendor_id=$2 and revoked_at is null limit 1""",
            event_id, payload.vendor_id,
        )
        if not winner:
            raise HTTPException(500, "could not mint brief link")
        return {"ok": True, "code": winner}


# ── THE PASS, ENFORCED WHERE THE LINK IS MADE (S9-5, 11/11/2026) ───────────────
# The One-Event Pass was enforced only in the browser (lib/passGate.briefAllowed):
# any signed-in caller could POST here and get a live brief link for every
# vendor on a free event. This mirrors briefAllowed's order, trusting only what
# the server owns for an ALLOW (its own event_passes and vendor_brief_links
# rows) and using the event blob only to BLOCK:
#   billing not live (Stripe can't honour purchases) → allowed, as in the client
#   the event holds an unblocked pass                → allowed
#   this vendor already has a link (caller checks)   → allowed, never mid-conversation
#   the event is stamped destination/multi-day (door 2) → 402
#   a DIFFERENT vendor already holds a brief (door 1)→ 402
#   otherwise                                        → allowed, the free first brief
# MODEL H (owner ruling 11/13/2026, lib/passGate.lockingReasons): there is no
# event-count door. A stamp counts as pass-required only when its passReasons
# include 'destination' or 'multi-day'; a stored 'additional-event' reason
# (Model D's door 3, "any event after the first") locks nothing, so an event
# stamped under door 3 alone gets its free first brief like any other event.
# Same rule as the client, or this answers 402 where the client says allowed.
# What this cannot close: the legacy self-contained brief URL (the brief encoded
# in the link, no server involved). The client falls back to it when minting
# fails, and anyone can construct one. Only the LIVE, server-resolved link — the
# one that updates and takes vendor confirmations — is gated here.
_LOCKING_REASONS = ("destination", "multi-day")


def _stamp_locks(data: dict) -> bool:
    if data.get("passRequired") is not True:
        return False
    reasons = data.get("passReasons")
    return isinstance(reasons, list) and any(r in _LOCKING_REASONS for r in reasons)


def _billing_live() -> bool:
    return bool(config.STRIPE_SECRET_KEY and config.STRIPE_WEBHOOK_SECRET)


async def _brief_blocked_reason(conn, event_id: str, vendor_id: str, data: dict) -> Optional[str]:
    if not _billing_live():
        return None
    held = await conn.fetchval(
        """select 1 from public.event_passes p where p.event_id=$1
              and not exists (select 1 from public.pass_payment_blocks b
                              where b.stripe_payment_intent=p.stripe_payment_intent)
            limit 1""",
        event_id,
    )
    if held:
        return None
    if _stamp_locks(data):
        return "pass-required"
    linked = await conn.fetch(
        """select distinct vendor_id from public.vendor_brief_links
             where event_id=$1 and vendor_id<>$2""",
        event_id, vendor_id,
    )
    shared = data.get("briefSharedVendorIds")
    shared = [x for x in shared if x and x != vendor_id] if isinstance(shared, list) else []
    if linked or shared:
        return "second-vendor"
    return None


# ── 2. GET /api/public/vendor-brief/{code} — PUBLIC live brief resolver ────────
@router.get("/api/public/vendor-brief/{code}")
async def public_vendor_brief(code: str, request: Request):
    """Resolve a brief code to the CURRENT vendor-safe brief payload. No auth —
    the unguessable code is the only credential. Rate-limited per IP. Opaque 404
    for anything that doesn't resolve (missing, revoked, malformed, short,
    vendor since deleted from the event) — never distinguishes why.
    """
    code = (code or "")[:MAX_CODE]
    ok, retry = _rate_check(f"ip:{_client_ip(request)}", BRIEF_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    if len(code) < MIN_CODE_LEN:
        raise HTTPException(404, "brief not found")

    pool = await get_pool()
    async with pool.acquire() as conn:
        link = await _resolve_active_link(conn, code)
        if not link:
            raise HTTPException(404, "brief not found")
        row = await conn.fetchrow(
            "select id, data from public.events where id=$1", link["event_id"]
        )
        if not row:
            raise HTTPException(404, "brief not found")
        data = _event_data(row)
        vendor = _find_vendor(data, link["vendor_id"])
        if not vendor:
            raise HTTPException(404, "brief not found")
        payload = build_vendor_brief_payload(vendor, link["event_id"], data)
        # Phase 2A: let a returning vendor see their own prior answer ("You're
        # confirmed"). This is the vendor's OWN submission state for THIS code —
        # no event/host data, so the whitelist is untouched.
        latest = await conn.fetchrow(
            """select state from public.vendor_brief_confirmations
               where code=$1
               order by coalesce(updated_at, submitted_at) desc limit 1""",
            code,
        )
        payload["confirmState"] = latest["state"] if latest else None
        return {"ok": True, "brief": payload}


# ── 3. POST /api/public/vendor-brief/{code}/confirm — PUBLIC confirm-back ──────
@router.post("/api/public/vendor-brief/{code}/confirm")
async def public_vendor_brief_confirm(code: str, payload: ConfirmSubmit, request: Request):
    """Vendor confirm-back (Phase 2A). No auth — the unguessable code is the only
    credential; event/vendor identity comes from the SERVER's link row, never the
    client. Idempotent on (code, idempotency_key): a retry / double-tap / changed
    answer UPDATES the same row. Returns only { ok, submitted_at } — never event
    data. Opaque 404 for anything that doesn't resolve.

    Slice 2A: capture only. Nothing here mutates the event blob, vendor status,
    vendor logs, or any attention surface — that is Slice 2B, not started.
    """
    code = (code or "")[:MAX_CODE]
    ip = _client_ip(request)
    ok, retry = _rate_check(f"ip:{ip}", BRIEF_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    ok, retry = _rate_check(f"confirm:{code}", CONFIRM_CODE_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests for this brief — try again shortly",
                            headers={"Retry-After": str(retry)})
    if len(code) < MIN_CODE_LEN:
        raise HTTPException(404, "brief not found")

    pool = await get_pool()
    async with pool.acquire() as conn:
        link = await _resolve_active_link(conn, code)
        if not link:
            raise HTTPException(404, "brief not found")

        # Lifetime ceiling per code (mirrors the RSVP total cap). A re-submit on
        # an existing idempotency_key updates in place and is never blocked.
        idk = _clip(payload.idempotency_key, MAX_KEY)
        existing = await conn.fetchrow(
            """select count(*) as n,
                      bool_or(idempotency_key = $2) as is_resubmit
                 from public.vendor_brief_confirmations
                where code = $1""",
            code, idk,
        )
        if existing and not existing["is_resubmit"] and existing["n"] >= CONFIRM_CODE_MAX_TOTAL:
            raise HTTPException(429, "This brief has reached its response limit — contact the planner.")

        row = await conn.fetchrow(
            """
            insert into public.vendor_brief_confirmations
              (code, event_id, vendor_id, idempotency_key, state,
               on_site_name, on_site_phone, note)
            values ($1,$2,$3,$4,$5,$6,$7,$8)
            on conflict (code, idempotency_key) do update set
              state         = excluded.state,
              on_site_name  = excluded.on_site_name,
              on_site_phone = excluded.on_site_phone,
              note          = excluded.note,
              updated_at    = now()
            returning submitted_at
            """,
            code,
            link["event_id"],
            link["vendor_id"],
            idk,
            payload.state,
            _clip(payload.on_site_name, MAX_NAME),
            _clip(payload.on_site_phone, MAX_PHONE),
            _clip(payload.note, MAX_NOTE),
        )
    return {"ok": True, "submitted_at": row["submitted_at"].isoformat()}


# ── 4. GET /api/events/{event_id}/vendor-confirmations — planner read-back ─────
@router.get("/api/events/{event_id}/vendor-confirmations")
async def list_vendor_confirmations(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """All vendor confirm-backs for an event, newest first. Authenticated planner
    only, studio-scoped (same gate as the RSVP host read-back). Returns only the
    confirmation's own fields — no event or vendor-record data. Display only on
    the client (Slice 2A): reading this never mutates anything.
    """
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            """select vendor_id, state, on_site_name, on_site_phone, note,
                      submitted_at, updated_at
               from public.vendor_brief_confirmations
               where event_id = $1
               order by coalesce(updated_at, submitted_at) desc""",
            event_id,
        )
        return [dict(r) for r in rows]
