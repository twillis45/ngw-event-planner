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
  POST /api/events/{event_id}/helper-links/email — planner-only; the app emails
                                                   the helper their job (section 5).

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
reads without the playbook engine: foodAdd dishes' bringers (foodOwner, else a
not-yet-migrated line owner), task owners, run-of-show
owners, informal vendors. A supply line (capacityHelpers) takes its label from
the playbook, which the server does not run, so it is left out: the page
under-counts rather than invents.

See supabase/migrations/023_helper_links.sql for the tables.
"""
import html as _html
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
from ..config import APP_BASE_URL
from ..email_frame import clock12, frame, hue_for, paragraphs_html, when_fact, where_fact
from ..outward import event_days, host_name_for, place_line, outward_refusal
from ..email_pictures import with_picture
from ..emailer import send_thread_email
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
    # WHO BRINGS A DISH IS ONE RECORD (11/21/2026): `foodOwner[dishId]`, a name
    # or False ("I'll make it myself"). The app moves an old line `owner` into
    # it on load; until an event has been opened since, the line's own `owner`
    # still counts. A playbook dish named there has no label on the server
    # (the playbook runs in the client), so it is left out: the page
    # under-counts rather than invents, as with supply lines above.
    food_owner = data.get("foodOwner") if isinstance(data.get("foodOwner"), dict) else {}
    for a in data.get("foodAdd") or []:
        if isinstance(a, dict) and a.get("name") and not food_skip.get(a.get("id")):
            kind = "supply" if a.get("group") == "Supplies" else "food"
            owner = food_owner[a.get("id")] if a.get("id") in food_owner else a.get("owner")
            if not isinstance(owner, str):
                continue
            add(owner, {"kind": kind, "label": _clip(a.get("name"), MAX_LABEL)})
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
            add(v.get("name"), {"kind": "help", "label": _clip(helper_role(v), MAX_LABEL)})
    return out


# THE ROLE, NOT "HELPER" (audit 2, lane E P2-3). A friend added on the vendor
# list as "Vida Haynes (day-of helper)" under the category "Helper" read only
# "Helper". A generic category gives way to the role she wrote in the name.
# Mirrors src/lib/helperResponsibility.js helperRoleOf.
_GENERIC_HELP = re.compile(r"^(help|helper|helpers|helping out|volunteer|volunteers)$", re.I)
_ROLE_IN_NAME = re.compile(r"\(([^()]+)\)\s*$")


def helper_role(v: dict) -> str:
    cat = str(v.get("category") or "").strip()
    if cat and not _GENERIC_HELP.match(cat):
        return cat
    m = _ROLE_IN_NAME.search(str(v.get("name") or ""))
    if m and m.group(1).strip():
        r = m.group(1).strip()
        return r[:1].upper() + r[1:]
    return cat or "Helping out"


def build_helper_payload(data: dict, helper_key: str):
    """The whitelist, or None when this helper holds no job. Copies NAMED
    fields only — never spreads the blob."""
    slot = _jobs_by_helper(data).get(helper_key)
    if not slot or not slot["jobs"]:
        return None
    return {
        "helperName": slot["name"],
        # hostNameFor's rule: the event's host line, `host` included (audit 2, D-13).
        "hostName": host_name_for(data),
        "eventName": data.get("name") or "",
        "eventDate": data.get("date") or "",
        # The last day of a multi-day event (audit 2, E P1-1): the page and the
        # email print every day.
        "endDate": data.get("endDate") or "",
        # An hour the app derived is its guess, not the host's word
        # (doItForMe.timePhrase), so it never reaches a helper.
        "startTime": "" if data.get("startTimeSource") == "derived" else (data.get("startTime") or ""),
        # THE PARTS OF THE ONE PLACE LINE (audit 2, E P0-4): the page reads them
        # through venueFor.formatVenueAddress, the email through outward.place_line,
        # so a helper sees the street, City, ST ZIP the host sees. A helper is
        # coming to work there; she gets the address. (event.address is a
        # phantom nothing writes, venueFor.js.)
        **{k: data.get(k) for k in _VENUE_PARTS if isinstance(data.get(k), (str, bool)) and data.get(k) not in ("", None)},
        "venue": data.get("venue") or "",
        "venueAddress": data.get("venueAddress") or "",
        "jobs": slot["jobs"],
    }


_VENUE_PARTS = ("venueStreet", "venueCity", "venueState", "venueZip", "venueKind", "venueConfirmed")


def helper_event(helper: dict) -> dict:
    """The payload as the event shape the outward readers take."""
    h = helper or {}
    return {"date": h.get("eventDate"), "endDate": h.get("endDate"), "venue": h.get("venue"),
            "venueAddress": h.get("venueAddress"), **{k: h.get(k) for k in _VENUE_PARTS if k in h}}


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

        code = await _mint_or_reuse(conn, event_id, key)
        return {"ok": True, "code": code, "helper_key": key}


async def _mint_or_reuse(conn, event_id: str, key: str) -> str:
    """THE active code for one helper on one event: the existing one, else a
    new one. The partial unique index makes a concurrent double-mint safe: the
    loser's insert does nothing and it returns the winner's code."""
    existing = await conn.fetchval(
        """select code from public.helper_links
           where event_id=$1 and helper_key=$2 and revoked_at is null limit 1""",
        event_id, key,
    )
    if existing:
        return existing
    inserted = await conn.fetchval(
        """insert into public.helper_links (code, event_id, helper_key)
           values ($1, $2, $3)
           on conflict do nothing
           returning code""",
        secrets.token_urlsafe(16), event_id, key,
    )
    if inserted:
        return inserted
    winner = await conn.fetchval(
        """select code from public.helper_links
           where event_id=$1 and helper_key=$2 and revoked_at is null limit 1""",
        event_id, key,
    )
    if not winner:
        raise HTTPException(500, "could not make the helper link")
    return winner


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


# ── 5. The helper ask as an email the app sends (owner, 11/19–20/2026) ─────────
# "There will be a branded envelope too" (the helper ask), then "And other
# comms". Before this the ask was only text the host's own phone or mail app
# sent (src/lib/helperAsk.js). When the helper has an email saved on the event
# and the host taps "Email <name> their job", the server sends it in the shared
# frame (email_frame), like the invite.
#
#   WHO MAY SEND: require_planner, then the event's own studio or a claimed
#     co-host of this one event (_assert_event_studio_read) — the same people
#     who may mint the link.
#   TO WHOM: the address saved on the helper's own guest row. The client names
#     the helper; it never supplies an address. A helper who is not a guest
#     with an email gets 422 and nothing is sent.
#   LIMITS: the message route's own rules (communication._assert_email_send_
#     allowed): the address must be saved on the event, and the send counts
#     against the event's one daily email cap. A stopped address is 410.
#   RECORD: an event_messages row (metadata.delivery, kind "helper") written
#     BEFORE the send and patched with Resend's answer, so the Messages view
#     shows it and the Resend webhook updates its delivery.
#   WHAT IT SAYS: the server's whitelist only (build_helper_payload): the
#     event, its day and an hour the host set ("4:00 PM" and "16:00" both read
#     4:00 PM, src/lib/clock.js), the place, and THIS helper's jobs, each on its
#     own line. "I can do it" and "I can’t" both open the helper's own page
#     (?helper=CODE), which takes the answer: that page reads no answer from
#     its address, so neither button answers by itself, and the email says so.
_GUEST_ALLERGEN = {"peanut": "nut", "tree nuts": "nut", "milk": "dairy", "egg": "egg", "fish": "fish",
                   "shellfish": "shellfish", "soy": "soy", "wheat / gluten": "gluten", "sesame": "sesame"}
_DIET_ALLERGEN = {"Nut allergy": "nut", "Shellfish": "shellfish", "Egg allergy": "egg", "Soy allergy": "soy"}


def _join_and(xs: list) -> str:
    if len(xs) <= 1:
        return "".join(xs)
    if len(xs) == 2:
        return f"{xs[0]} and {xs[1]}"
    return f"{', '.join(xs[:-1])}, and {xs[-1]}"


def helper_allergy_note(data: dict) -> str:
    """helperAsk.js helperAllergyNote: "keep it nut-free, a guest is allergic",
    or '' when the plan knows of no allergy. Names the allergen, never the guest."""
    words, guests_with, counted = set(), 0, 0
    for g in data.get("guests") if isinstance(data.get("guests"), list) else []:
        mine = [_GUEST_ALLERGEN.get(str(a or "").strip().lower()) for a in
                (g.get("allergens") if isinstance(g, dict) and isinstance(g.get("allergens"), list) else [])]
        mine = [w for w in mine if w]
        if mine:
            guests_with += 1
        words.update(mine)
    dc = data.get("dietCounts") if isinstance(data.get("dietCounts"), dict) else {}
    for tag, word in _DIET_ALLERGEN.items():
        try:
            n = float(dc.get(tag) or 0)
        except (TypeError, ValueError):
            n = 0
        if n > 0:
            counted += n
            words.add(word)
    if not words:
        return ""
    people = max(guests_with, counted)
    return f"keep it {_join_and([w + '-free' for w in sorted(words)])}, {'guests are' if people > 1 else 'a guest is'} allergic"


def helper_page_url(code: str) -> str:
    return f"{APP_BASE_URL.rstrip('/')}/hostv2/?helper={code}"


def compose_helper_email(data: dict, helper: dict, page_url: str, stop_url):
    """(subject, html, text). PURE. `helper` is build_helper_payload's whitelist."""
    e = _html.escape
    host = " ".join(str(helper.get("hostName") or "").split())[:80]
    host_first = host.split(" ")[0] if host else ""
    first = (str(helper.get("helperName") or "").strip().split() or ["there"])[0]
    name = " ".join(str(helper.get("eventName") or "").split()) or "the party"
    ev = helper_event(helper)
    facts = [f for f in (when_fact(event_days(ev), clock12(helper.get("startTime"))), where_fact(place_line(ev))) if f]
    allergy = helper_allergy_note(data)
    lines = []
    for j in helper.get("jobs") or []:
        label = " ".join(str(j.get("label") or "").split())
        if not label:
            continue
        notes = [allergy] if j.get("kind") == "food" and allergy else []
        t = clock12(j.get("time"))
        lines.append(f"• {label}" + (f" at {t}" if t else "") + (f" — {'; '.join(notes)}" if notes else ""))
    jobs_text = "You’ve got:\n" + "\n".join(lines)
    asks = f"{host_first} asked you to help" if host_first else "You’re asked to help"
    subject = f"Your job for {name}"
    html, text = frame(
        kind="helper_ask", hue=hue_for(name), greeting=f"Hi {first},", eyebrow=asks, title=name, facts=facts,
        fixed=[(paragraphs_html(jobs_text), jobs_text)],     # the jobs are in the card's picture
        # "I can't" opens her page on that answer (E P2-4); she still taps Send,
        # so a mail scanner opening the link records nothing.
        primary=("I can do it", page_url), secondary=[("I can’t", e(page_url) + "&amp;answer=declined")],
        fine=f"Either one opens your page, where you tap your answer for {host_first or 'your host'}. No app, no account.",
        footer=f"Sent by {host or 'your host'} with No Guesswork Events.", stop_url=stop_url)
    return subject, html, text


class HelperEmailRequest(BaseModel):
    helper_name: str = Field(..., min_length=1, max_length=120)


@router.post("/api/events/{event_id}/helper-links/email")
async def email_helper_job(
    event_id: str,
    payload: HelperEmailRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Email one helper their job from the app. Returns { ok, status, message_id }:
    status is "accepted" only when Resend accepted it, else "failed"."""
    from .communication import _assert_email_send_allowed, _channel, _email_stop_token, email_stop_url
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        row = await conn.fetchrow("select id, data from public.events where id=$1", event_id)
        if not row:
            raise HTTPException(409, "Save this event to your account before emailing from it.")
        data = _event_data(row)
        # Nothing goes out with a placeholder (six root causes, cause 6).
        refusal = outward_refusal(data, "helper")
        if refusal:
            raise HTTPException(422, refusal)
        guests = data.get("guests") if isinstance(data.get("guests"), list) else []
        if not _is_helper_name(payload.helper_name):
            raise HTTPException(404, "helper not found on this event")
        key, _ = _resolve(payload.helper_name, guests)
        helper = build_helper_payload(data, key)
        if not helper:
            raise HTTPException(404, "helper not found on this event")
        guest = next((g for g in guests if isinstance(g, dict) and str(g.get("id")) == key), None)
        to = str((guest or {}).get("email") or "").strip()
        if not to:
            raise HTTPException(422, "There's no email saved for this helper.")
        await _assert_email_send_allowed(conn, event_id, to)
        stop_token = await _email_stop_token(conn, event_id, to)
        code = await _mint_or_reuse(conn, event_id, key)
        subject, body_html, body_text = compose_helper_email(
            data, helper, helper_page_url(code), email_stop_url(stop_token) if stop_token else None)
        ch = await _channel(conn, event_id, "CLIENT")
        delivery = {"intent": "email", "kind": "helper", "recipient_email": to,
                    "recipient_name": helper["helperName"], "subject": subject, "status": "pending"}
        msg = await conn.fetchrow(
            """insert into event_messages (event_id, channel_id, message_type, author_role, author_name, body, metadata)
               values ($1, $2, 'standard', 'planner', $3, $4, $5) returning id""",
            event_id, ch["id"], helper["hostName"] or None, body_text, json.dumps({"delivery": delivery}))
    body_html, body_text = await with_picture(body_html, body_text)
    host = " ".join(str(helper["hostName"] or "").split())[:80] or "Your host"
    stop_headers = None
    if stop_token:
        stop = email_stop_url(stop_token)
        stop_headers = {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
    result = await send_thread_email(to=to, subject=subject, body_html=body_html, body_text=body_text,
                                     sender_name=f"{host} via No Guesswork", headers=stop_headers)
    ok = bool(result.get("ok"))
    delivery.update({"status": "accepted" if ok else "failed", "provider": result.get("provider")})
    if ok:
        delivery["resend_id"] = result.get("resend_id")
    else:
        delivery["error"] = result.get("error")
    async with pool.acquire() as conn:
        await conn.execute(
            """update event_messages set metadata = jsonb_set(coalesce(metadata, '{}'), '{delivery}', $2::jsonb)
               where id=$1""", msg["id"], json.dumps(delivery))
    return {"ok": ok, "status": delivery["status"], "message_id": str(msg["id"])}
