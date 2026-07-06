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
import secrets
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from ..db import get_pool
from ..auth import require_planner
from .rsvp import _assert_event_studio_read, _client_ip

router = APIRouter(tags=["vendor-brief"])

MAX_CODE = 80
# Entropy floor, same rationale as rsvp.MIN_CODE_LEN: a short/guessable code must
# never resolve a brief. Minted codes are 22+ chars (token_urlsafe(16)).
MIN_CODE_LEN = 16

# ── In-memory sliding-window rate limiter (mirrors routers/rsvp.py) ────────────
BRIEF_RATE_WINDOW = 60   # seconds
BRIEF_IP_MAX      = 30   # public resolves per IP per window
_rate: dict[str, list] = {}


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
    }


# ── Schemas ─────────────────────────────────────────────────────────────────────
class MintRequest(BaseModel):
    vendor_id: str = Field(..., min_length=1, max_length=120)


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
        link = await conn.fetchrow(
            """select event_id, vendor_id from public.vendor_brief_links
               where code=$1 and revoked_at is null""",
            code,
        )
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
        return {"ok": True, "brief": build_vendor_brief_payload(vendor, link["event_id"], data)}
