"""Questions & updates — a guest asks the host a question from their invite
link, and the host replies to that thread (owner ruling 11/16/2026, FREE:
never behind the One-Event Pass).

Narrow, not chat: no guest-to-guest, no host-initiated messages, no
attachments, plain text only. Announcements and email notices come later
(their tables are not here); a guest's email and explicit opt-in are stored
now so that work has consent to read.

  POST /api/public/questions/{rsvp_code}/mine    — public; the caller's own thread.
  POST /api/public/questions/{rsvp_code}/ask     — public; ask (opens the thread).
  POST /api/public/questions/{rsvp_code}/email   — public; email + opt-in.
  POST /api/public/questions/{rsvp_code}/delete  — public; delete own thread.
  GET  /api/events/{event_id}/guest-threads                   — host inbox.
  GET  /api/events/{event_id}/guest-threads/{thread_id}       — one thread.
  POST /api/events/{event_id}/guest-threads/{thread_id}/reply — host reply.
  POST /api/events/{event_id}/guest-threads/{thread_id}/block — block / unblock.
  POST /api/public/invite/{rsvp_code}/opened     — public; the invite was opened.
  GET  /api/events/{event_id}/invite-opens        — host; when it was opened.

"OPENED YOUR INVITE" (owner scope addition 11/16/2026), the truthful version.
The invite is ONE shared code per event, so a guest is identifiable only by
her device key, and only after she has replied (a live RSVP row) or asked (a
thread). For her, last_opened_at is kept, written at most once an hour by a
database timestamp compare. Every other open is a number only: a per-invite
daily count of opens and of distinct devices, where a device is a salted hash
of a random id the browser sends (salt: INVITE_OPEN_SALT, the event and the
day, so one device cannot be followed across events or days). No IP address
and no raw device id is stored. The word is "opened": nothing here claims a
guest saw or took in anything.

Security model:
  - THE GUEST CREDENTIAL is the pair (rsvp code, guest_key), the same pair a
    guest's own RSVP uses (rsvp.py /mine, /withdraw): the code is shared by
    every guest, the key is the random id minted in HER browser. Both are
    matched in the WHERE clause. A wrong key, an unknown code and a short code
    are the same opaque 404.
  - The event is resolved from the code server-side (rsvp._resolve_event); a
    client event_id or author is never read.
  - Guest payload is a strict whitelist: her name, her email and opt-in,
    whether the thread is closed, and each message's author/body/time. Never a
    thread id, a key or token, another guest, or anything about the host.
  - Host payload never carries a guest's email, key or token: only whether
    email notices are on.
  - Host routes: require_planner + _assert_event_studio_read, exactly as the
    helper link's host reads; a thread is reached only through its own event.
  - Caps: 1,000 characters, control characters refused; 5 guest messages an
    hour and 30 ever per thread, 300 threads per invite, all counted in the
    DATABASE under a per-invite advisory lock (the window limiter below is
    in memory, per process). Per-IP and per-code windows on top.

See supabase/migrations/024_guest_messages.sql for the tables.
"""
import datetime as _dt
import html
import hashlib
import hmac
import os
import re
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, field_validator, model_validator

from ..db import get_pool
from ..host_alerts import alert_host
from ..guest_notices import notify_guest_of_reply
from ..auth import require_planner
from .rsvp import _assert_event_studio_read, _client_ip, _rate_check, _resolve_event

router = APIRouter(tags=["guest-messages"])

MAX_CODE = 80
MAX_BODY = 1000
MAX_NAME = 120
MAX_EMAIL = 160
MIN_KEY = 16
MAX_KEY = 120

GM_IP_MAX = 30                 # public calls per IP per window (rsvp's 60 s window)
GM_CODE_MAX = 20               # public writes per invite code per window
GUEST_MSG_HOUR_MAX = 5         # per thread, counted in the database
GUEST_MSG_TOTAL_MAX = 30       # per thread, lifetime, counted in the database
THREADS_PER_INVITE_MAX = 300   # per invite code, like rsvp.RSVP_CODE_MAX_TOTAL

NOT_FOUND = "not found"

# Plain text: newline and tab are the only control characters allowed. Bidi
# overrides and isolates are refused too, so a message cannot render reversed.
_BAD_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _plain(v: str, limit: int, *, multiline: bool) -> str:
    v = (v or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not v:
        raise ValueError("required")
    if _BAD_CHARS.search(v) or (not multiline and ("\n" in v or "\t" in v)):
        raise ValueError("plain text only")
    if len(v) > limit:
        raise ValueError(f"at most {limit} characters")
    return v


# ── Schemas ─────────────────────────────────────────────────────────────────────
class GuestKey(BaseModel):
    guest_key: str = Field(..., min_length=MIN_KEY, max_length=MAX_KEY)


class GuestAsk(GuestKey):
    name: str
    body: str

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        return _plain(v, MAX_NAME, multiline=False)

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _plain(v, MAX_BODY, multiline=True)


class GuestEmail(GuestKey):
    email: Optional[str] = None
    email_opt_in: bool = False      # explicit tick only; never assumed

    @model_validator(mode="after")
    def _check(self):
        email = (self.email or "").strip()
        if email and (len(email) > MAX_EMAIL or not _EMAIL.match(email)):
            raise ValueError("that email doesn't look right")
        if self.email_opt_in and not email:
            raise ValueError("email notices need an email")
        self.email = email or None
        return self


class HostReply(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _plain(v, MAX_BODY, multiline=True)


class HostBlock(BaseModel):
    blocked: bool = True


# ── Helpers ─────────────────────────────────────────────────────────────────────
def _limit(request: Request, code: str, *, write: bool):
    ok, retry = _rate_check(f"gm-ip:{_client_ip(request)}", GM_IP_MAX)
    if not ok:
        raise HTTPException(429, "Too many requests — try again shortly",
                            headers={"Retry-After": str(retry)})
    if write:
        ok, retry = _rate_check(f"gm-code:{code}", GM_CODE_MAX)
        if not ok:
            raise HTTPException(429, "Too many messages on this invite — try again shortly",
                                headers={"Retry-After": str(retry)})


def _iso(v):
    return v.isoformat() if v is not None else None


_THREAD_COLS = ("id, event_id, guest_name, guest_email, email_opt_in, created_at, "
                "last_guest_at, last_host_at, blocked_at")


async def _own_thread(conn, code: str, key: str):
    return await conn.fetchrow(
        f"select {_THREAD_COLS} from public.guest_threads"
        " where rsvp_code = $1 and guest_key = $2",
        code, key,
    )


async def _messages(conn, thread_id):
    rows = await conn.fetch(
        """select author, body, created_at from public.guest_messages
           where thread_id = $1 order by created_at""",
        thread_id,
    )
    return [{"author": r["author"], "body": r["body"], "created_at": _iso(r["created_at"])} for r in rows]


async def _guest_view(conn, t) -> dict:
    """The guest's whitelist. Named fields only — never spreads the row."""
    return {
        "guest_name": t["guest_name"],
        "email": t["guest_email"],
        "email_opt_in": bool(t["email_opt_in"]),
        "closed": t["blocked_at"] is not None,
        "messages": await _messages(conn, t["id"]),
    }


def _unanswered(t) -> bool:
    return (t["blocked_at"] is None and t["last_guest_at"] is not None
            and (t["last_host_at"] is None or t["last_host_at"] < t["last_guest_at"]))


def _host_view(t) -> dict:
    """The host's whitelist: no email, key, token or code."""
    return {
        "id": str(t["id"]),
        "guest_name": t["guest_name"],
        "created_at": _iso(t["created_at"]),
        "last_guest_at": _iso(t["last_guest_at"]),
        "last_host_at": _iso(t["last_host_at"]),
        "blocked": t["blocked_at"] is not None,
        "unanswered": _unanswered(t),
        "email_notices": bool(t["guest_email"]) and bool(t["email_opt_in"]),
    }


async def _post(conn, thread_id, event_id, author: str, body: str):
    """Write one message and stamp the thread's last_<author>_at."""
    row = await conn.fetchrow(
        """with m as (
             insert into public.guest_messages (thread_id, event_id, author, body)
             values ($1, $2, $3, $4) returning created_at)
           update public.guest_threads t set
             last_guest_at = case when $3 = 'guest' then m.created_at else t.last_guest_at end,
             last_host_at  = case when $3 = 'host'  then m.created_at else t.last_host_at  end
           from m where t.id = $1
           returning m.created_at""",
        thread_id, event_id, author, body,
    )
    return row["created_at"]


def _thread_uuid(thread_id: str):
    try:
        return uuid.UUID(thread_id)
    except (ValueError, TypeError):
        raise HTTPException(404, NOT_FOUND)


def _device_hash(event_id: str, day, device_id: str) -> str:
    """Salted SHA-256 of the browser's random device id. Only this is stored."""
    salt = os.environ.get("INVITE_OPEN_SALT", "").encode()
    return hmac.new(salt, f"{event_id}|{day.isoformat()}|{device_id}".encode(), hashlib.sha256).hexdigest()


class InviteOpened(BaseModel):
    device_id: str = Field(..., min_length=MIN_KEY, max_length=MAX_KEY)
    guest_key: Optional[str] = Field(default=None, max_length=MAX_KEY)


# ── Guest routes ────────────────────────────────────────────────────────────────
@router.post("/api/public/questions/{rsvp_code}/mine")
async def guest_thread_mine(rsvp_code: str, payload: GuestKey, request: Request):
    """The caller's own thread, or 404 (none from this device, or a bad code)."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _resolve_event(conn, code):
            raise HTTPException(404, NOT_FOUND)
        t = await _own_thread(conn, code, payload.guest_key)
        if not t:
            raise HTTPException(404, NOT_FOUND)
        return {"ok": True, "thread": await _guest_view(conn, t)}


@router.post("/api/public/questions/{rsvp_code}/ask")
async def guest_ask(rsvp_code: str, payload: GuestAsk, request: Request, background: BackgroundTasks):
    """Ask the host. Opens the caller's thread on the first question. The
    name is the guest's own; a later question keeps the first name."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, code)
        if not resolved:
            raise HTTPException(404, NOT_FOUND)
        event_id = resolved[0]
        async with conn.transaction():
            # One invite's caps are counted under one lock, so two requests
            # racing cannot both read "29" and write the 31st message.
            await conn.execute("select pg_advisory_xact_lock(hashtext('guest_messages:' || $1::text))", code)
            t = await _own_thread(conn, code, payload.guest_key)
            if t is None:
                n = await conn.fetchval(
                    "select count(*) from public.guest_threads where rsvp_code = $1", code)
                if (n or 0) >= THREADS_PER_INVITE_MAX:
                    raise HTTPException(429, "This invite has reached its question limit — contact the host directly.")
                t = await conn.fetchrow(
                    f"""insert into public.guest_threads
                          (event_id, rsvp_code, guest_key, guest_token, guest_name)
                        values ($1, $2, $3, $4, $5)
                        on conflict (rsvp_code, guest_key) do update set guest_name = public.guest_threads.guest_name
                        returning {_THREAD_COLS}""",
                    event_id, code, payload.guest_key, secrets.token_urlsafe(16), payload.name,
                )
            if t["blocked_at"] is not None:
                raise HTTPException(403, "This conversation is closed.")
            counts = await conn.fetchrow(
                """select count(*) filter (where created_at > now() - interval '1 hour') as hour,
                          count(*) as total
                     from public.guest_messages where thread_id = $1 and author = 'guest'""",
                t["id"],
            )
            if counts["total"] >= GUEST_MSG_TOTAL_MAX:
                raise HTTPException(429, "You've sent the most questions this invite allows — contact the host directly.")
            if counts["hour"] >= GUEST_MSG_HOUR_MAX:
                raise HTTPException(429, "You've sent several questions this hour — try again later.")
            await _post(conn, t["id"], event_id, "guest", payload.body)
        t = await _own_thread(conn, code, payload.guest_key)
        background.add_task(alert_host, event_id, "question", t["guest_name"])
        return {"ok": True, "thread": await _guest_view(conn, t)}


@router.post("/api/public/questions/{rsvp_code}/email")
async def guest_email(rsvp_code: str, payload: GuestEmail, request: Request):
    """Set or clear the guest's email and the explicit opt-in. Stored only;
    nothing is emailed by this release."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _resolve_event(conn, code):
            raise HTTPException(404, NOT_FOUND)
        t = await conn.fetchrow(
            f"""update public.guest_threads set guest_email = $3, email_opt_in = $4
                where rsvp_code = $1 and guest_key = $2
                returning {_THREAD_COLS}""",
            code, payload.guest_key, payload.email, payload.email_opt_in,
        )
        if not t:
            raise HTTPException(404, NOT_FOUND)
        return {"ok": True, "thread": await _guest_view(conn, t)}


@router.post("/api/public/questions/{rsvp_code}/delete")
async def guest_delete(rsvp_code: str, payload: GuestKey, request: Request):
    """Delete the caller's own thread and every message in it (cascade)."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _resolve_event(conn, code):
            raise HTTPException(404, NOT_FOUND)
        row = await conn.fetchrow(
            "delete from public.guest_threads where rsvp_code = $1 and guest_key = $2 returning id",
            code, payload.guest_key,
        )
        # With no thread and no live reply left, this device is no longer
        # identified, so its last-opened time goes too.
        await conn.execute(
            """delete from public.invite_opens o where o.rsvp_code = $1 and o.guest_key = $2
                 and not exists (select 1 from public.rsvp_submissions r
                                  where r.rsvp_code = $1 and r.idempotency_key = $2 and r.rsvp is not null)""",
            code, payload.guest_key,
        )
    if not row:
        raise HTTPException(404, NOT_FOUND)
    return {"ok": True, "deleted": True}


# ── Host routes ─────────────────────────────────────────────────────────────────
async def _host_thread(conn, event_id: str, thread_id: str):
    t = await conn.fetchrow(
        f"select {_THREAD_COLS} from public.guest_threads where id = $1 and event_id = $2",
        _thread_uuid(thread_id), event_id,
    )
    if not t:
        raise HTTPException(404, NOT_FOUND)
    return t


@router.get("/api/events/{event_id}/guest-threads")
async def host_list_threads(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Every question thread on an event: unanswered first, then most recent."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            f"""select {', '.join('t.' + c.strip() for c in _THREAD_COLS.split(','))},
                       (select count(*) from public.guest_messages m where m.thread_id = t.id) as message_count,
                       last.author as last_author, last.body as last_body
                  from public.guest_threads t
                  left join lateral (
                    select author, body from public.guest_messages m
                     where m.thread_id = t.id order by created_at desc limit 1) last on true
                 where t.event_id = $1""",
            event_id,
        )
    out = [{**_host_view(r), "message_count": int(r["message_count"] or 0),
            "last_author": r["last_author"], "last_body": r["last_body"]} for r in rows]
    out.sort(key=lambda x: x["last_guest_at"] or x["last_host_at"] or x["created_at"] or "", reverse=True)
    out.sort(key=lambda x: not x["unanswered"])   # stable: unanswered first
    return out


@router.get("/api/events/{event_id}/guest-threads/{thread_id}")
async def host_get_thread(
    event_id: str,
    thread_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        t = await _host_thread(conn, event_id, thread_id)
        return {"ok": True, "thread": _host_view(t), "messages": await _messages(conn, t["id"])}


@router.post("/api/events/{event_id}/guest-threads/{thread_id}/reply")
async def host_reply(
    event_id: str,
    thread_id: str,
    payload: HostReply,
    background: BackgroundTasks,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Reply to the guest. Refused (409) on a blocked thread: unblock first."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        t = await _host_thread(conn, event_id, thread_id)
        if t["blocked_at"] is not None:
            raise HTTPException(409, "This thread is blocked. Unblock it to reply.")
        created = await _post(conn, t["id"], event_id, "host", payload.body)
    # One email to the guest, only if they opted in (guest_notices decides).
    background.add_task(notify_guest_of_reply, t["id"], payload.body)
    return {"ok": True, "message": {"author": "host", "body": payload.body, "created_at": _iso(created)}}


@router.post("/api/events/{event_id}/guest-threads/{thread_id}/block")
async def host_block(
    event_id: str,
    thread_id: str,
    payload: HostBlock,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Block (the guest can no longer post) or unblock a thread."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        t = await conn.fetchrow(
            f"""update public.guest_threads
                   set blocked_at = case when $3 then coalesce(blocked_at, now()) else null end
                 where id = $1 and event_id = $2
                returning {_THREAD_COLS}""",
            _thread_uuid(thread_id), event_id, payload.blocked,
        )
        if not t:
            raise HTTPException(404, NOT_FOUND)
        return {"ok": True, "thread": _host_view(t)}


# ── "Opened your invite" ────────────────────────────────────────────────────────
@router.post("/api/public/invite/{rsvp_code}/opened")
async def invite_opened(rsvp_code: str, payload: InviteOpened, request: Request):
    """The invite page calls this on load. Always the same answer for a good
    code, so it never tells a caller whether a key is known."""
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, code)
        if not resolved:
            raise HTTPException(404, NOT_FOUND)
        event_id = resolved[0]
        key = (payload.guest_key or "").strip()
        if len(key) >= MIN_KEY:
            identified = await conn.fetchval(
                """select exists (select 1 from public.rsvp_submissions
                                   where rsvp_code = $1 and idempotency_key = $2 and rsvp is not null)
                       or exists (select 1 from public.guest_threads
                                   where rsvp_code = $1 and guest_key = $2)""",
                code, key,
            )
            if identified:
                await conn.fetchrow(
                    """insert into public.invite_opens (rsvp_code, guest_key, event_id, last_opened_at)
                       values ($1, $2, $3, now())
                       on conflict (rsvp_code, guest_key) do update set last_opened_at = now()
                         where public.invite_opens.last_opened_at < now() - interval '1 hour'
                       returning last_opened_at""",
                    code, key, event_id,
                )
        day = _dt.datetime.now(_dt.timezone.utc).date()
        device = await conn.fetchrow(
            """insert into public.invite_open_devices (event_id, day, device_hash, last_at)
               values ($1, $2, $3, now())
               on conflict (event_id, day, device_hash) do update set last_at = now()
                 where public.invite_open_devices.last_at < now() - interval '1 hour'
               returning (xmax = 0) as is_new""",
            event_id, day, _device_hash(event_id, day, payload.device_id),
        )
        if device is not None:   # a new device today, or the same one an hour later
            await conn.execute(
                """insert into public.invite_open_days (event_id, day, opens, distinct_devices)
                   values ($1, $2, 1, $3::int)
                   on conflict (event_id, day) do update set
                     opens = public.invite_open_days.opens + 1,
                     distinct_devices = public.invite_open_days.distinct_devices + excluded.distinct_devices""",
                event_id, day, bool(device["is_new"]),
            )
    return {"ok": True}


@router.get("/api/events/{event_id}/invite-opens")
async def host_invite_opens(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """When identified guests last opened the invite, and daily totals for
    everyone. Never a key, a device or a code."""
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            """select o.last_opened_at, r.id as rsvp_id, r.guest_name as rsvp_name,
                      t.id as thread_id, t.guest_name as thread_name
                 from public.invite_opens o
                 left join public.rsvp_submissions r
                   on r.rsvp_code = o.rsvp_code and r.idempotency_key = o.guest_key and r.rsvp is not null
                 left join public.guest_threads t
                   on t.rsvp_code = o.rsvp_code and t.guest_key = o.guest_key
                where o.event_id = $1 and (r.id is not null or t.id is not null)
                order by o.last_opened_at desc""",
            event_id,
        )
        days = await conn.fetch(
            """select day, opens, distinct_devices from public.invite_open_days
                where event_id = $1 order by day desc limit 90""",
            event_id,
        )
    guests = [{"guest_name": r["rsvp_name"] or r["thread_name"],
               "last_opened_at": _iso(r["last_opened_at"]),
               "rsvp_id": r["rsvp_id"],
               "thread_id": str(r["thread_id"]) if r["thread_id"] else None} for r in rows]
    return {"ok": True, "guests": guests,
            "days": [{"day": d["day"].isoformat(), "opens": int(d["opens"]),
                      "distinct_devices": int(d["distinct_devices"])} for d in days]}


# ── STOP THESE EMAILS (reply notices, 11/16/2026) ───────────────────────────
# The link in every reply notice, keyed by the thread's guest_token (024: an
# emailed-link credential returned to nobody else). GET only SHOWS a button:
# mail scanners open links, and a scanner must never unsubscribe anyone. The
# button, and a mail app's one-click List-Unsubscribe (RFC 8058), POST. Every
# answer is the same page whether the token matched or not: no oracle.
_STOP_PAGE = ("<!doctype html><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">"
              "<title>{title}</title><body style=\"font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem\">"
              "<h1 style=\"font-size:1.25rem\">{title}</h1>{body}</body>")


def _stop_token(token: str) -> str:
    t = (token or "")[:80]
    if len(t) < 22:
        raise HTTPException(404, NOT_FOUND)
    return t


@router.get("/api/public/questions/unsubscribe/{token}", response_class=HTMLResponse)
async def stop_emails_page(token: str, request: Request):
    t = _stop_token(token)
    _limit(request, "stop", write=False)
    return HTMLResponse(_STOP_PAGE.format(
        title="Stop these emails?",
        body=(f"<p>You won't get an email when your host replies. Answers still show on your invite.</p>"
              f"<form method=post action=\"{html.escape(t)}\"><button style=\"font:inherit;padding:.5rem 1rem\">Stop these emails</button></form>")))


@router.post("/api/public/questions/unsubscribe/{token}", response_class=HTMLResponse)
async def stop_emails(token: str, request: Request):
    t = _stop_token(token)
    _limit(request, "stop", write=True)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "update public.guest_threads set email_opt_in = false, guest_email = null where guest_token = $1", t)
    return HTMLResponse(_STOP_PAGE.format(
        title="You won't get these emails anymore",
        body="<p>Your host's answers still show on your invite.</p>"))
