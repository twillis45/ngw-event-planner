"""Guest RSVP persistence — P0 (real backend so RSVPs reach the host).

Architecture: stranger's browser -> these PUBLIC endpoints -> Supabase Postgres
(rsvp_submissions). The host reads submissions back through an authenticated
planner-only endpoint. No direct frontend DB writes; the FastAPI service connects
with the Postgres role from DATABASE_URL (bypasses RLS — the "service role" path),
which is how it both resolves the event by rsvp_code and reads submissions back.

Endpoints:
  GET  /api/public/invite/{rsvp_code}     — public; resolves an event to PUBLIC
                                            display fields only (no host PII).
  POST /api/public/rsvp/{rsvp_code}       — public; upserts a guest RSVP (idempotent).
  POST /api/public/rsvp/{rsvp_code}/mine     — public; the caller's OWN reply (code + key).
  POST /api/public/rsvp/{rsvp_code}/withdraw — public; deletes the caller's own reply.
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
import re
from typing import Optional, Literal

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from ..db import get_pool
from ..host_alerts import alert_host
from ..outward import host_name_for
from ..auth import require_planner

router = APIRouter(tags=["rsvp"])

# ── Field caps (defense against abuse / oversized writes) ──────────────────────
MAX_NAME  = 120
MAX_MEAL  = 60
MAX_NEEDS = 500
MAX_NOTE  = 1000
MAX_CODE  = 80
MAX_KEY   = 120
MAX_CONTACT = 160   # guest-volunteered phone/email
MAX_ADDR    = 300   # mailing address (host-requested)
MAX_LIST    = 12    # structured dietary/access chips per list
MAX_ITEM    = 60    # single chip length
MAX_DATE_OPTIONS = 3  # the date poll offers at most three ranges

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
    # endDate: INTENTIONAL (R1 span, 2026-07-27). The last day of a multi-day
    # event — pure display logistics a guest needs (span line, calendar window,
    # live-vs-past tense). No PII; same class as `date`.
    "name", "type", "date", "endDate", "startTime", "timeOfDay", "endTime",
    "venue", "venueAddress", "venueCity", "venueState", "address",
    "inviteStyle", "hostNames", "rsvpCode",
    # parkingNotes: the field hosts ACTUALLY write (both editors). The bare
    # "parking" alias below was whitelisted first but has no writer — guests
    # never saw parking notes on remote invites until parkingNotes joined
    # (venue tokenization audit, 2026-07-27). Both stay: the client reads
    # parkingNotes || parking.
    "dressCode", "parking", "parkingNotes", "bringNote", "hostContact",
    # Recap keepsake — host-authored content the host chooses to publish to the
    # shared invite link (a note + a photo-album URL). Both are host-facing-public
    # by intent, not PII, so they belong in the whitelist for the post-event recap.
    "recapNote", "albumUrl",
    # Trip Brief (Destination program, 2026-07-27): host-authored FOR guests —
    # the stay (hotel name / group rate / booking code / book-by date) and the
    # airport options. No PII, no guest data, no money ledger; the rate is the
    # group rate the host negotiated to share. moneyDates/frontedAmount stay
    # host-private and are deliberately ABSENT here. Both are NARROWED to the
    # keys the invite renders (_NESTED_KEYS below): `lodging` also holds the
    # host's private who-stays-where list on some events, which never leaves.
    "lodging", "airportOptions",
    # itinerary: the host-ACCEPTED weekend program (day/slot/title rows the
    # host chose to publish to guests) — display copy, no owners, no crew
    # times, no PII. Raw proposals never reach here; only event.itinerary.
    "itinerary",
    # lodgingOptions (rental-house engine, 2026-07-28): the host's SHARED
    # shortlist of rental candidates — listing links + host-typed facts
    # (sleeps/beds/price/tier) published so guests can weigh in from the
    # invite. Host-curated display data; no PII, no money ledger. Narrowed
    # to the listing facts the invite prints (_NESTED_KEYS); host notes stay.
    "lodgingOptions",
    # hashtag (owner ruling 11/16/2026): the tag the HOST turned on for the
    # event, shown quietly on the invite and in share captions. Host-chosen
    # display text, no PII; absent until the host sets one.
    "hashtag",
    # dateOptions (owner pick 11/21/2026, "Ask on the invite"): up to three
    # date ranges the HOST offers, so guests tick the ones that work. Display
    # data the host wrote for guests; _resolve_event narrows each range to its
    # id / start / end, so nothing else the host keeps beside them leaks.
    "dateOptions",
    # THE GUEST'S INVITE IS THE HOST'S PREVIEW (audit 2, lane E P0-3). Each is
    # copy or a choice the host made FOR guests; none is a guest's data:
    #   hostName       the invite's "Hosted by", computed (hostNameFor's rule)
    #                  in _resolve_event, so a sample's `host` spelling counts.
    #   deckLine       the line under the name she wrote for the invitation.
    #   secondaryType  the second occasion the deck line reads ("Birthday").
    #   venueStreet, venueZip, venueKind, venueConfirmed: the parts the one
    #                  place line (venueFor.formatVenueAddress) is built from;
    #                  the street joins venueAddress, already intentional above.
    #   kidsPolicy, plusOnePolicy, collectAddresses: the reply rules, ONLY as
    #                  the values the host app writes (_RULES); public_rsvp
    #                  enforces the first two on every submit.
    "deckLine", "secondaryType", "venueStreet", "venueZip", "venueKind", "venueConfirmed",
    # hostPhoto (owner, 11/24/2026): the VERSION of the host's photo. Listed so
    # the guest-visible set is written down in one place; _resolve_event drops
    # whatever the event's JSON holds and sets it only from her account.
    "inviteLayout", "hostPhoto",
)

# A photo version is the first 12 hex of the stored file's sha256 (host_photos.py).
_PHOTO_VERSION = re.compile(r"[0-9a-f]{12}")

# The reply rules as the host app writes them (HostShellV2 invite rules). Any
# other value is not a rule and is not shipped.
_RULES = {
    "kidsPolicy": {"adults_only", "kids_welcome"},
    "plusOnePolicy": {"no_plus_ones", "plus_one_ok"},
    "collectAddresses": {True},
}

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


# ── THE TRIP BRIEF, NARROWED TO WHAT THE INVITE SHOWS (audit lane E, P0-1) ─────
# These fields are lists or objects, and the whitelist above used to pass them
# through whole. On the Wanda sample `lodging` is not the trip brief's hotel at
# all but the host's list of who stays where (a private house address, family
# names, host notes), and the invite sent it to anyone with the link. Each one
# is now cut to the keys InviteV2 renders; anything else the host keeps beside
# them stays with the host. The census in tests/test_invite_payload_privacy.py
# pins every key.
_NESTED_KEYS = {
    # The stay row: hotel, group rate, booking code, book-by date, provenance.
    # Only the hotel OBJECT; the host's who-stays-where LIST is never sent.
    "lodging": ("hotelName", "rate", "code", "deadline", "from"),
    # The shortlist guests weigh in on: the listing facts the invite prints
    # and its pictures and link. The host's own notes on a listing are not
    # written for guests and stay behind.
    "lodgingOptions": ("id", "label", "sleeps", "beds", "totalPrice", "photos", "photoUrl", "url"),
    "airportOptions": ("code", "name", "note"),
    # The accepted program as lib/itinerary normRow reads it — no owners, no
    # crew times.
    "itinerary": ("day", "slot", "time", "title", "what", "note", "anchor", "celebration", "meal"),
}
_SCALAR = (str, int, float, bool)


def _narrow(field, raw):
    keys = _NESTED_KEYS[field]
    pick = lambda d: {k: d[k] for k in keys if d.get(k) not in (None, "")}
    if field == "lodging":
        return (pick(raw) or None) if isinstance(raw, dict) else None
    if not isinstance(raw, list):
        return None
    return [r for r in (pick(d) for d in raw if isinstance(d, dict)) if r][:60] or None


def _clip(v: Optional[str], n: int) -> Optional[str]:
    if v is None:
        return None
    v = str(v).strip()
    return v[:n] if v else None


def _date_options(raw):
    """The host's offered date ranges as a guest may see them: id, start, end
    only, complete ones only, at most MAX_DATE_OPTIONS."""
    if not isinstance(raw, list):
        return []
    out = []
    for o in raw:
        if not isinstance(o, dict):
            continue
        oid, start, end = (str(o.get(k) or "").strip() for k in ("id", "start", "end"))
        if oid and start and end:
            out.append({"id": oid[:MAX_KEY], "start": start[:10], "end": end[:10]})
    return out[:MAX_DATE_OPTIONS]


# The dinner inside the trip (owner decision 11/21/2026). The invite shows the
# celebration dinner on its picked night and the group meals out, by day. Each
# is narrowed to what a guest reads: the night and the kind of place for the
# dinner; the starting point and the per-meal picks for the meals. Who pays for
# meals out stays with the host.
_MEAL_PLANS = {"own", "dinners", "house"}
_MEAL_MODES = {"house", "out", "own"}
_ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_MEAL_KEY = re.compile(r"^\d{4}-\d{2}-\d{2}:(breakfast|lunch|dinner)$")


def _celebration(raw):
    if not isinstance(raw, dict):
        return None
    out = {}
    night = str(raw.get("night") or "").strip()
    if _ISO_DAY.match(night):
        out["night"] = night
    place = str(raw.get("place") or "").strip()
    if place:
        out["place"] = place[:80]
    return out


def _trip_meals(raw):
    if not isinstance(raw, dict):
        return None
    out = {}
    if raw.get("plan") in _MEAL_PLANS:
        out["plan"] = raw["plan"]
    meals = raw.get("meals")
    if isinstance(meals, dict):
        picked = {str(k): v for k, v in meals.items() if _MEAL_KEY.match(str(k)) and v in _MEAL_MODES}
        if picked:
            out["meals"] = dict(list(picked.items())[:60])
    return out or None


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
    # ── Structured guest details (2026-07-27 data-loss fix) ──────────────────
    # The invite has been SENDING these since the reply-form redesign; this model
    # silently dropped them (pydantic default ignores unknown fields), so a remote
    # guest's allergy answer never reached the host. allergens/diets/access are
    # health-adjacent — host read-back only, never on any public response.
    allergens: Optional[list[str]] = None
    diets: Optional[list[str]] = None
    access: Optional[list[str]] = None
    picks_crabs: Optional[bool] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    mailing_address: Optional[str] = None
    # Rental-house shortlist reply (migration 016): the guest's preferred
    # lodgingOptions id — an opinion for the host, never a booking commitment.
    lodging_pick: Optional[str] = None
    # The date poll (migration 034): ids of the host's dateOptions this guest
    # said work. Kept only when they name a range the event offers.
    date_picks: Optional[list[str]] = None

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
    # host_photo: the VERSION of the host's photo, read from her account in the
    # same query (owner, 11/24/2026; app/routers/host_photos.py). Never the image.
    row = await conn.fetchrow(
        "select e.id, e.data, (select ss.data->>'hostPhoto' from public.studio_settings ss "
        "where ss.studio_id = e.studio_id) as host_photo "
        "from public.events e where e.data->>'rsvpCode' = $1 limit 1",
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
    # Display fields are scalars; a dict or list sitting in one is not shipped
    # whole. The structured trip fields are cut to what the invite renders.
    public = {k: data.get(k) for k in PUBLIC_EVENT_FIELDS
              if k not in _NESTED_KEYS and isinstance(data.get(k), _SCALAR)}
    for k in _NESTED_KEYS:
        v = _narrow(k, data.get(k))
        if v:
            public[k] = v
    host = host_name_for(data)
    if host:
        public["hostName"] = host[:MAX_NAME]
    for k, allowed in _RULES.items():
        v = data.get(k)
        # `is True`, not `in`: 1 == True in Python, and a 1 is not her answer.
        if (v is True and True in allowed) or (isinstance(v, str) and v in allowed):
            public[k] = v
    # THE HOST'S PHOTO (owner, 11/24/2026): its version from her account, and
    # only a version (12 hex). The event's own JSON cannot set it, and nothing
    # else (a URL, an image) ever reaches a guest. The page asks for the photo
    # by invite code: GET /api/public/host-photo/{code}?v=<version>.
    public.pop("hostPhoto", None)
    # The invite's layout (owner, 11/24/2026): only the two the host app writes.
    if public.get("inviteLayout") not in ("classic", "glance"):
        public.pop("inviteLayout", None)
    try:
        hp = row.get("host_photo") if hasattr(row, "get") else None
    except Exception:
        hp = None
    if isinstance(hp, str) and _PHOTO_VERSION.fullmatch(hp):
        public["hostPhoto"] = hp
    if data.get("recordKind") == "host_event":
        # Only this value: an unnamed host event is at home (venueFor's kind rule).
        public["recordKind"] = "host_event"
    # A start time the APP derived is not the host's hour (run 2, R2-23): a
    # guest is never handed it. The client's gate reads startTimeSource, which
    # this projection does not carry, so the derived hour stops here.
    if str(data.get("startTimeSource") or "") == "derived":
        public.pop("startTime", None)
    # The date poll's ranges, narrowed to what a guest needs to tick one.
    opts = _date_options(data.get("dateOptions"))
    if opts:
        public["dateOptions"] = opts
    else:
        public.pop("dateOptions", None)
    cel = _celebration(data.get("celebration"))
    if cel is not None:
        public["celebration"] = cel
    meals = _trip_meals(data.get("tripMeals"))
    if meals:
        public["tripMeals"] = meals
    # The event id is NOT display data (audit P2-9). It still ships because the
    # host app's live-invite check (checkRsvpCapability) compares it, and every
    # guest's saved reply key and outbox are named by it (InviteV2): dropping
    # it would orphan replies already sent. It is a name, not a credential —
    # no public route resolves by it. Removing it needs that client migration.
    public["id"] = row["id"]
    # Anonymized social proof: the COUNT of confirmed guests only — never names,
    # emails, or the roster itself. Closes the invite's "zero social proof on
    # backend-resolved events" gap (Partiful's growth mechanic) while the guest
    # list stays fully withheld. A number is not PII; a name would be.
    guests = data.get("guests")
    if isinstance(guests, list):
        public["goingCount"] = sum(
            1 for g in guests
            if isinstance(g, dict) and str(g.get("rsvp", "")).strip().lower().startswith("y")
        )
    return row["id"], public


async def _going_count(conn, event_id, roster_count):
    """Yes count for the invite's social line (run 2, R2-24).

    The roster count alone lags: a reply reaches the saved guest list only when
    the host next opens the app, so guests replying in between were told "Be the
    first to say yes" while others had. Replies already received count too —
    each guest name's LATEST answer once — and the larger of the two is shown,
    so neither source can lower the other. A number, never a name; a failed
    read falls back to the roster count rather than failing the invite.
    """
    try:
        n = await conn.fetchval(
            """select count(*) from (
                 select distinct on (lower(trim(guest_name))) rsvp
                   from public.rsvp_submissions
                  where event_id = $1 and coalesce(trim(guest_name), '') <> ''
                  order by lower(trim(guest_name)), coalesce(updated_at, submitted_at) desc
               ) latest
              where lower(coalesce(rsvp, '')) like 'y%'""",
            event_id,
        )
    except Exception:
        return roster_count
    return max(int(n or 0), int(roster_count or 0))


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
        if resolved and "goingCount" in resolved[1]:
            resolved[1]["goingCount"] = await _going_count(conn, resolved[0], resolved[1]["goingCount"])
    if not resolved:
        raise HTTPException(404, "invite not found")
    _event_id, public = resolved
    return {"ok": True, "event": public}


# ── 2. POST /api/public/rsvp/{rsvp_code} — PUBLIC guest submit (idempotent) ────
@router.post("/api/public/rsvp/{rsvp_code}")
async def public_rsvp(rsvp_code: str, payload: RsvpSubmit, request: Request, background: BackgroundTasks):
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

        # Structured list caps: at most MAX_LIST real, clipped, non-empty chips.
        def _clip_list(v):
            if not isinstance(v, list):
                return None
            out = [s.strip()[:MAX_ITEM] for s in v if isinstance(s, str) and s.strip()]
            return out[:MAX_LIST] or None

        # A tick counts only for a range THIS event offers: a forged or stale
        # id is dropped, duplicates collapse, and nothing at all stores NULL.
        offered = [o["id"] for o in _public.get("dateOptions") or []]
        picks = [p for p in offered if isinstance(payload.date_picks, list) and p in payload.date_picks] or None

        # THE HOST'S REPLY RULES ARE KEPT HERE, not only by the form (audit 2,
        # lane E P0-3). The form hides what she ruled out; a stale page or a
        # hand-made request can still send it. The reply is never lost over
        # it: the ruled-out part is dropped, the rest is saved, and the answer
        # says what was dropped and why.
        rules = _reply_rules(_public, payload)
        kids, plus_one, plus_one_meal, plus_one_needs, mailing = rules["values"]

        row = await conn.fetchrow(
            """
            insert into public.rsvp_submissions
              (event_id, rsvp_code, idempotency_key, guest_name, rsvp, meal, needs,
               plus_one, plus_one_meal, plus_one_needs, kids, note,
               allergens, diets, access, picks_crabs, phone, email, mailing_address,
               lodging_pick, date_picks)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
              allergens       = excluded.allergens,
              diets           = excluded.diets,
              access          = excluded.access,
              picks_crabs     = excluded.picks_crabs,
              phone           = excluded.phone,
              email           = excluded.email,
              mailing_address = excluded.mailing_address,
              lodging_pick    = excluded.lodging_pick,
              date_picks      = excluded.date_picks,
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
            plus_one,
            plus_one_meal,
            plus_one_needs,
            kids,
            _clip(payload.note, MAX_NOTE),
            _clip_list(payload.allergens),
            _clip_list(payload.diets),
            _clip_list(payload.access),
            payload.picks_crabs,
            _clip(payload.phone, MAX_CONTACT),
            _clip(payload.email, MAX_CONTACT),
            mailing,
            _clip(payload.lodging_pick, MAX_KEY),
            picks,
        )
    background.add_task(alert_host, event_id, "rsvp", _clip(payload.name, MAX_NAME), payload.rsvp)
    out = {"ok": True, "submitted_at": row["submitted_at"].isoformat()}
    if rules["dropped"]:
        out["dropped"] = rules["dropped"]
        out["notice"] = " ".join(rules["notices"])
    return out


def _reply_rules(public: dict, payload: "RsvpSubmit") -> dict:
    """The reply as the host's rules allow it: (kids, plus_one, plus_one_meal,
    plus_one_needs, mailing_address), what was dropped, and why."""
    dropped, notices = [], []
    kids = int(payload.kids or 0)
    if public.get("kidsPolicy") == "adults_only" and kids:
        kids = 0
        dropped.append("kids")
        notices.append("This party is adults only, so the kids weren’t added to your reply.")
    plus = (_clip(payload.plus_one, MAX_NAME), _clip(payload.plus_one_meal, MAX_MEAL), _clip(payload.plus_one_needs, MAX_NEEDS))
    if public.get("plusOnePolicy") == "no_plus_ones" and plus[0]:
        dropped.append("plus_one")
        notices.append("The host asked for no plus-ones, so your guest wasn’t added to your reply.")
    if public.get("plusOnePolicy") == "no_plus_ones":
        plus = (None, None, None)
    # The mailing address is asked only when the host collects them; one sent
    # anyway is not kept (it is a guest's home address she did not ask for).
    mailing = _clip(payload.mailing_address, MAX_ADDR) if public.get("collectAddresses") is True else None
    return {"values": (kids, *plus, mailing), "dropped": dropped, "notices": notices}


# ── 2b. A GUEST'S OWN REPLY: read it back, or delete it (11/11/2026) ─────────
# The invite asks for allergies, diet rules and access needs. A guest who
# shared them must be able to see what she sent, change it, and take it back,
# without writing to anyone. Changing it already works: a re-submit with the
# same idempotency_key updates her row in place (public_rsvp above). These two
# add reading it back and deleting it.
#
# THE CREDENTIAL is the pair (rsvp_code, idempotency_key). The code is shared
# by every guest of the event; the key is a random UUID minted in HER browser
# (rsvpIdempotencyKey) and never shown to anyone, so only the device that sent
# the reply can read or delete it. That is exactly who can already overwrite
# it, so neither route grants anything a re-submit didn't. Another device, or a
# cleared browser, has no key and gets the privacy policy's email route.
#
# DELETE IS A TOMBSTONE, NOT A MISSING ROW. The host's app copies replies into
# its own guest list when it reads them (lib/guestMerge). A row that simply
# vanished would leave that copy forever. So every answer is wiped and `rsvp`
# goes NULL — no live submission can be NULL, the model requires an answer —
# and the host's next read sees "withdrawn" and clears its copy too. The
# guest's name is kept on the tombstone only so the host's app can find the
# row it copied; it is a name the host already holds. Replying again from the
# same device overwrites the tombstone with the new reply.
class RsvpOwnKey(BaseModel):
    idempotency_key: str = Field(..., min_length=1)


_OWN_FIELDS = (
    "guest_name, rsvp, meal, needs, plus_one, plus_one_meal, plus_one_needs, kids, note, "
    "allergens, diets, access, picks_crabs, phone, email, mailing_address, lodging_pick, "
    "date_picks, submitted_at, updated_at"
)


@router.post("/api/public/rsvp/{rsvp_code}/mine")
async def public_rsvp_mine(rsvp_code: str, payload: RsvpOwnKey, request: Request):
    """Return the caller's own reply (matched on code + key), so she can change
    it. 404 when there is none, or it was deleted. Never another guest's row."""
    rsvp_code = (rsvp_code or "")[:MAX_CODE]
    _enforce(request, rsvp_code, per_code=True)
    idk = _clip(payload.idempotency_key, MAX_KEY)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _resolve_event(conn, rsvp_code):
            raise HTTPException(404, "invite not found")
        row = await conn.fetchrow(
            f"select {_OWN_FIELDS} from public.rsvp_submissions"
            " where rsvp_code = $1 and idempotency_key = $2",
            rsvp_code, idk,
        )
    if not row or row["rsvp"] is None:
        raise HTTPException(404, "no reply from this device")
    out = dict(row)
    for k in ("submitted_at", "updated_at"):
        if out.get(k) is not None:
            out[k] = out[k].isoformat()
    return {"ok": True, "reply": out}


@router.post("/api/public/rsvp/{rsvp_code}/withdraw")
async def public_rsvp_withdraw(rsvp_code: str, payload: RsvpOwnKey, request: Request):
    """Delete the caller's own reply: wipe every answer and mark it withdrawn.
    Idempotent: deleting twice, or deleting nothing, still answers ok."""
    rsvp_code = (rsvp_code or "")[:MAX_CODE]
    _enforce(request, rsvp_code, per_code=True)
    idk = _clip(payload.idempotency_key, MAX_KEY)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _resolve_event(conn, rsvp_code):
            raise HTTPException(404, "invite not found")
        row = await conn.fetchrow(
            """update public.rsvp_submissions set
                 rsvp = null, meal = null, needs = null,
                 plus_one = null, plus_one_meal = null, plus_one_needs = null,
                 kids = 0, note = null,
                 allergens = null, diets = null, access = null, picks_crabs = null,
                 phone = null, email = null, mailing_address = null, lodging_pick = null,
                 date_picks = null,
                 updated_at = now()
               where rsvp_code = $1 and idempotency_key = $2
               returning id""",
            rsvp_code, idk,
        )
    return {"ok": True, "withdrawn": bool(row)}


# ── Planner read authz — event_owners + studio_members ───────────────────────
async def _assert_event_studio_read(conn, event_id: str, principal: dict) -> None:
    """Authorize a planner to read an event's RSVPs.

    Order of checks (first grant wins):
    1. CANONICAL: public.events.studio_id → studio_members membership. This column
       DOES exist and is stamped on every synced event (saveEvent writes studio_id),
       so a studio owner/member can read RSVPs immediately — no comms open required.
    2. FALLBACK, only when public.events has no row for the event:
       event_owners.studio_id → studio_members membership.
    3. FALLBACK, same condition: event_owners.owner_id direct match.
    When public.events has the event and the caller is not in its studio, the
    answer is 403 — an event_owners row never overrides the tenant key.

    History: this used to authorize ONLY via event_owners, which is populated lazily
    the first time a planner opens the event in comms. A freshly-created event that
    was never messaged had no event_owners row and 403'd even for its own studio
    owner (the reported bug). The earlier docstring claimed events.studio_id "does
    not exist on public.events" — that was stale; the column is present and correct,
    so it's now the primary scope and event_owners is only a fallback.

    Still safe: require_planner gates upstream.
    """
    if not principal or principal.get("via") == "dev_token":
        return
    uid = principal.get("id")
    if not uid:
        raise HTTPException(status_code=403, detail="Planner identity required")

    # PRIMARY: authorize off the CANONICAL public.events.studio_id. This column exists and
    # is stamped on every synced event (saveEvent writes { id, studio_id, data }), so a
    # planner can read RSVPs for any event their studio owns WITHOUT first opening it in
    # comms. (The old path used only event_owners, which is populated lazily on first comms
    # open — so a freshly-created, never-messaged event 403'd even for its own studio owner.)
    ev = await conn.fetchrow(
        "select studio_id from public.events where id=$1", event_id
    )
    if ev and ev["studio_id"]:
        member = await conn.fetchval(
            "select 1 from studio_members where studio_id=$1 and user_id=$2",
            ev["studio_id"], uid,
        )
        if member:
            return
        # A CLAIMED per-event co-host (026, owner ruling 11/16/2026) reads this
        # one event like its studio does. Guarded: before 026 is applied the
        # table is absent and this grants nothing.
        if await conn.fetchval("select to_regclass('public.event_cohosts') is not null") and await conn.fetchval(
            "select 1 from public.event_cohosts where event_id=$1 and user_id=$2::uuid and accepted_at is not null",
            event_id, uid,
        ):
            return
        # The event has a tenant key and the caller is not in it. Do NOT fall
        # through to event_owners: that row could have been created by the
        # caller's own first touch in comms (the cross-studio claim, closed in
        # communication._assert_event_access on 10/11/2026), so it is not
        # evidence of access when it contradicts public.events.
        raise HTTPException(status_code=403, detail="You don't have access to this event.")

    # FALLBACK: event_owners (lazy comms claim) — covers legacy events whose
    # public.events.studio_id was never backfilled, plus the direct owner_id match.
    eo = await conn.fetchrow(
        "select owner_id, studio_id from event_owners where event_id=$1", event_id
    )
    if eo is not None:
        if eo["studio_id"]:
            member = await conn.fetchval(
                "select 1 from studio_members where studio_id=$1 and user_id=$2",
                eo["studio_id"], uid,
            )
            if member:
                return
        if eo["owner_id"] == uid:
            return

    # Neither the canonical studio scope nor a legacy owner record grants access.
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
                      allergens, diets, access, picks_crabs, phone, email, mailing_address,
                      lodging_pick, date_picks,
                      submitted_at, updated_at
               from public.rsvp_submissions
               where event_id = $1
               order by submitted_at desc""",
            event_id,
        )
        # A NULL answer is a guest-deleted reply (public_rsvp_withdraw): say so
        # outright, so the host's app clears the copy it made of it.
        return [{**dict(r), "withdrawn": r["rsvp"] is None} for r in rows]
