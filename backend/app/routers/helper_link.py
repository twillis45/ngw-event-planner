"""Helper link — a party job sent to the person who has it (owner-approved
11/15/2026, FREE: never behind the One-Event Pass).

A host gives jobs to people by name ("Jordan brings the stuffing", "Sam on
ice"). Until now the host tapped "Confirm with Jordan" by hand. This gives each
helper a link, built exactly like the vendor brief (routers/vendor_brief.py):

  POST /api/events/{event_id}/helper-links       — planner-only; mint-or-reuse
                                                   the active code for a helper.
  GET  /api/public/helper/{code}                 — public; this helper's jobs.
  POST /api/public/helper/{code}/answer          — public; "I've got it" / "I can't".
  GET  /api/events/{event_id}/helper-confirmations — planner read-back.

Security model (the vendor brief's, unchanged):
  - Minting is gated by require_planner + studio-scoped event access. The
    client supplies ONLY a helper name; the helper is found in the SERVER's
    event blob, and a name that holds no job there is a 404.
  - The public payload is a strict whitelist built from the server's blob:
    the host's display name, event name/date/start time, venue name and
    address, and THIS helper's own jobs. Never another helper's job, a guest,
    a phone or email, money, notes, or the raw blob.
  - Opaque 404 for a missing, revoked, malformed, or too-short code, and for a
    link whose helper no longer holds any job.
  - Public routes are rate-limited per IP, answers also per code, with a
    lifetime ceiling per code.

WHO A HELPER IS. The client's helper engine (src/lib/helperResponsibility.js)
dedupes people by the GUEST they resolve to (src/lib/guestMerge.js
matchGuestIndexByName), else by the lowercased typed name, and names them
`<guest id>` or `helper-<slug>`. The server keys a link the same way, so the
host's read-back matches the helper the host sees. The jobs read here are the
host's own explicit fields — the same ones src/lib/playbooks namedHelperCount
reads without the playbook engine: foodAdd owners, task owners, run-of-show
owners, informal vendors. A supply line (capacityHelpers) takes its label from
the playbook, which the server does not run, so it is left out: the page
under-counts rather than invents.

See supabase/migrations/023_helper_links.sql for the tables.
"""
import json
import os
import re
import secrets
import time
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from ..db import get_pool
from ..auth import require_planner
from .rsvp import _assert_event_studio_read, _client_ip

router = APIRouter(tags=["helper-link"])

MAX_CODE = 80
MIN_CODE_LEN = 16          # same entropy floor as rsvp / vendor_brief
MAX_NOTE = 500
MAX_KEY = 120
MAX_LABEL = 200
MAX_JOBS = 40

HELPER_RATE_WINDOW = 60
HELPER_IP_MAX = 30         # public calls per IP per window
ANSWER_CODE_MAX = 20       # answers per code per window
_rate: dict[str, list] = {}
ANSWER_CODE_MAX_TOTAL = int(os.environ.get("HELPER_ANSWER_CODE_MAX_TOTAL", "200"))

NOT_FOUND = "helper link not found"


def _rate_check(bucket: str, limit: int):
    now = time.time()
    hits = [t for t in _rate.get(bucket, []) if now - t < HELPER_RATE_WINDOW]
    if len(hits) >= limit:
        return False, int(HELPER_RATE_WINDOW - (now - hits[0])) + 1
    hits.append(now)
    _rate[bucket] = hits
    return True, 0


def _event_data(row) -> dict:
    data = row["data"] or {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    return data if isinstance(data, dict) else {}


# ── Who a helper is — mirrors helperResponsibility.js / guestMerge.js ─────────
_HOSTY = re.compile(r"^(host|you|yours|me|myself|self)$", re.I)
_COUPLE = re.compile(r"\s(?:and|&|\+)\s", re.I)


def _is_helper_name(v) -> bool:
    s = str(v or "").strip()
    return bool(s) and not _HOSTY.match(s)


def _match_guest(guests: list, full_name: str):
    """matchGuestIndexByName: exact, a confirmed aka, then first+last (last ≥3
    chars), then first-only (≥4 chars). A couple-shaped name matches exactly
    or not at all."""
    full = str(full_name or "").strip()
    if not full:
        return None
    low = full.lower()
    couple = bool(_COUPLE.search(full))
    toks = low.split()
    first = toks[0] if toks else ""
    last = toks[-1] if toks else ""
    for g in guests:
        if not isinstance(g, dict):
            continue
        gn = str(g.get("name") or "").strip().lower()
        if not gn:
            continue
        if gn == low:
            return g
        aka = g.get("aka")
        if isinstance(aka, list) and low in aka:
            return g
        if couple:
            continue
        gp = gn.split()
        g_first = gp[0] if gp else ""
        g_last = gp[-1] if gp else ""
        if last and len(last) >= 3 and g_last == last and g_first == first:
            return g
        if len(first) >= 4 and g_first == first:
            return g
    return None


def _resolve(name: str, guests: list):
    """(key, display name) — the client engine's helper id and name."""
    typed = str(name or "").strip()
    g = _match_guest(guests, typed)
    if g is not None and g.get("id") is not None:
        return str(g.get("id")), str(g.get("name") or typed).strip()
    return "helper-" + re.sub(r"[^a-z0-9]+", "-", typed.lower()), typed


def _clip(v, n: int) -> Optional[str]:
    if v is None:
        return None
    v = str(v).strip()
    return v[:n] if v else None


def _jobs_by_helper(data: dict) -> dict:
    """{helper key: {"name": display name, "jobs": [whitelisted job]}} from the
    host's explicit owner fields, in the client engine's order."""
    guests = data.get("guests") if isinstance(data.get("guests"), list) else []
    out: dict = {}

    def add(owner, job):
        if not _is_helper_name(owner) or not job.get("label"):
            return
        key, display = _resolve(owner, guests)
        slot = out.setdefault(key, {"name": display, "jobs": []})
        if len(slot["jobs"]) < MAX_JOBS:
            slot["jobs"].append(job)

    food_skip = data.get("foodSkip") if isinstance(data.get("foodSkip"), dict) else {}
    for a in data.get("foodAdd") or []:
        if isinstance(a, dict) and a.get("name") and not food_skip.get(a.get("id")):
            kind = "supply" if a.get("group") == "Supplies" else "food"
            add(a.get("owner"), {"kind": kind, "label": _clip(a.get("name"), MAX_LABEL)})
    for t in data.get("timeline") or []:
        if isinstance(t, dict) and t.get("task") and not t.get("retired"):
            add(t.get("owner"), {"kind": "task", "label": _clip(t.get("task"), MAX_LABEL)})
    for r in data.get("ros") or []:
        if isinstance(r, dict) and r.get("segment") and r.get("type") != "vendor":
            job = {"kind": "setup", "label": _clip(r.get("segment"), MAX_LABEL)}
            if r.get("time"):
                job["time"] = _clip(r.get("time"), 20)
            add(r.get("owner"), job)
    for v in data.get("vendors") or []:
        if isinstance(v, dict) and v.get("isInformal"):
            add(v.get("name"), {"kind": "help", "label": _clip(v.get("category") or "Helping out", MAX_LABEL)})
    return out


def build_helper_payload(data: dict, helper_key: str):
    """The whitelist, or None when this helper holds no job. Copies NAMED
    fields only — never spreads the blob."""
    slot = _jobs_by_helper(data).get(helper_key)
    if not slot or not slot["jobs"]:
        return None
    return {
        "helperName": slot["name"],
        "hostName": data.get("hostName") or data.get("hostNames") or "",
        "eventName": data.get("name") or "",
        "eventDate": data.get("date") or "",
        # An hour the app derived is its guess, not the host's word
        # (doItForMe.timePhrase), so it never reaches a helper.
        "startTime": "" if data.get("startTimeSource") == "derived" else (data.get("startTime") or ""),
        "venue": data.get("venue") or "",
        # venueAddress only: event.address is a phantom nothing writes (venueFor.js).
        "venueAddress": data.get("venueAddress") or "",
        "jobs": slot["jobs"],
    }


# ── Schemas ─────────────────────────────────────────────────────────────────────
class MintRequest(BaseModel):
    helper_name: str = Field(..., min_length=1, max_length=120)


class AnswerSubmit(BaseModel):
    idempotency_key: str = Field(..., min_length=1, max_length=120)
    state: Literal["confirmed", "declined"]
    note: Optional[str] = None


async def _active_link(conn, code: str):
    return await conn.fetchrow(
        """select event_id, helper_key from public.helper_links
           where code=$1 and revoked_at is null""",
        code,
    )


# ── 1. Mint-or-reuse ───────────────────────────────────────────────────────────
@router.post("/api/events/{event_id}/helper-links")
async def mint_helper_link(
    event_id: str,
    payload: MintRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """THE active link for one helper on one event. Planner-only, studio-
    scoped, never pass-gated. Returns { ok, code, helper_key }."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        row = await conn.fetchrow("select id, data from public.events where id=$1", event_id)
        if not row:
            raise HTTPException(404, "event not found")
        data = _event_data(row)
        guests = data.get("guests") if isinstance(data.get("guests"), list) else []
        if not _is_helper_name(payload.helper_name):
            raise HTTPException(404, "helper not found on this event")
        key, _ = _resolve(payload.helper_name, guests)
        if key not in _jobs_by_helper(data):
            raise HTTPException(404, "helper not found on this event")

        existing = await conn.fetchval(
            """select code from public.helper_links
               where event_id=$1 and helper_key=$2 and revoked_at is null limit 1""",
            event_id, key,
        )
        if existing:
            return {"ok": True, "code": existing, "helper_key": key}
        # The partial unique index makes a concurrent double-mint safe: the
        # loser's insert does nothing and it returns the winner's code.
        inserted = await conn.fetchval(
            """insert into public.helper_links (code, event_id, helper_key)
               values ($1, $2, $3)
               on conflict do nothing
               returning code""",
            secrets.token_urlsafe(16), event_id, key,
        )
        if inserted:
            return {"ok": True, "code": inserted, "helper_key": key}
        winner = await conn.fetchval(
            """select code from public.helper_links
               where event_id=$1 and helper_key=$2 and revoked_at is null limit 1""",
            event_id, key,
        )
        if not winner:
            raise HTTPException(500, "could not make the helper link")
        return {"ok": True, "code": winner, "helper_key": key}


# ── 2. Public resolve ──────────────────────────────────────────────────────────
@router.get("/api/public/helper/{code}")
async def public_helper(code: str, request: Request):
    """This helper's jobs, built fresh from the event. No auth — the
    unguessable code is the only credential."""
    code = (code or "")[:MAX_CODE]
    ok, retry = _rate_check(f"ip:{_client_ip(request)}", HELPER_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    if len(code) < MIN_CODE_LEN:
        raise HTTPException(404, NOT_FOUND)
    pool = await get_pool()
    async with pool.acquire() as conn:
        link = await _active_link(conn, code)
        if not link:
            raise HTTPException(404, NOT_FOUND)
        row = await conn.fetchrow("select id, data from public.events where id=$1", link["event_id"])
        if not row:
            raise HTTPException(404, NOT_FOUND)
        payload = build_helper_payload(_event_data(row), link["helper_key"])
        if not payload:
            raise HTTPException(404, NOT_FOUND)
        # The helper's OWN latest answer on this code, so a returning helper
        # sees it and can change it. No event or host data.
        latest = await conn.fetchrow(
            """select state, note from public.helper_confirmations
               where code=$1
               order by coalesce(updated_at, submitted_at) desc limit 1""",
            code,
        )
        payload["answer"] = {"state": latest["state"], "note": latest["note"]} if latest else None
        return {"ok": True, "helper": payload}


# ── 3. Public answer ───────────────────────────────────────────────────────────
@router.post("/api/public/helper/{code}/answer")
async def public_helper_answer(code: str, payload: AnswerSubmit, request: Request):
    """"I've got it" / "I can't" (+ note). Identity comes from the server's
    link row, never the body. Idempotent on (code, idempotency_key): a retry
    or a changed answer UPDATES the same row. Returns { ok, submitted_at }."""
    code = (code or "")[:MAX_CODE]
    ok, retry = _rate_check(f"ip:{_client_ip(request)}", HELPER_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    ok, retry = _rate_check(f"answer:{code}", ANSWER_CODE_MAX)
    if not ok:
        raise HTTPException(429, "Too many answers on this link — try again shortly",
                            headers={"Retry-After": str(retry)})
    if len(code) < MIN_CODE_LEN:
        raise HTTPException(404, NOT_FOUND)
    pool = await get_pool()
    async with pool.acquire() as conn:
        link = await _active_link(conn, code)
        if not link:
            raise HTTPException(404, NOT_FOUND)
        idk = _clip(payload.idempotency_key, MAX_KEY)
        existing = await conn.fetchrow(
            """select count(*) as n, bool_or(idempotency_key = $2) as is_resubmit
                 from public.helper_confirmations where code = $1""",
            code, idk,
        )
        if existing and not existing["is_resubmit"] and existing["n"] >= ANSWER_CODE_MAX_TOTAL:
            raise HTTPException(429, "This link has reached its answer limit — tell the host directly.")
        row = await conn.fetchrow(
            """
            insert into public.helper_confirmations
              (code, event_id, helper_key, idempotency_key, state, note)
            values ($1,$2,$3,$4,$5,$6)
            on conflict (code, idempotency_key) do update set
              state      = excluded.state,
              note       = excluded.note,
              updated_at = now()
            returning submitted_at
            """,
            code, link["event_id"], link["helper_key"], idk, payload.state,
            _clip(payload.note, MAX_NOTE),
        )
    return {"ok": True, "submitted_at": row["submitted_at"].isoformat()}


# ── 4. Host read-back ──────────────────────────────────────────────────────────
@router.get("/api/events/{event_id}/helper-confirmations")
async def list_helper_confirmations(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Every helper answer on an event, newest first. Planner-only, studio-
    scoped. The answer's own fields only. Reading never mutates anything."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            """select helper_key, state, note, submitted_at, updated_at
               from public.helper_confirmations
               where event_id = $1
               order by coalesce(updated_at, submitted_at) desc""",
            event_id,
        )
        return [dict(r) for r in rows]
