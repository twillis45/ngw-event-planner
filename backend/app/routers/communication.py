"""Operational communication ledger — CLIENT + INTERNAL_TEAM channels.

Architecture: frontend -> this API -> Supabase Postgres -> Resend (email delivery).
No direct frontend DB writes. No realtime. This is a controlled ledger, not chat.

Sprint 58.2: general email delivery via Resend for any standard message when the
planner provides a recipient email + `deliver_email: true`.
"""
import html as _html
import json
import re
import secrets
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from ..db import get_pool
from ..config import APP_BASE_URL, API_PUBLIC_BASE_URL
from ..auth import require_planner
from ..emailer import send_approval_email, send_thread_email, is_email_configured
from ..email_frame import frame, hue_for, paragraphs_html
from ..invite_email import compose_invite_email, invite_gaps
from .invite_cards import card_url, stored_card_version
from .rsvp import _assert_event_studio_read
from .. import host_email

router = APIRouter(prefix="/api/events/{event_id}/communication", tags=["communication"])

CHANNELS = {
    "CLIENT":        ("Client", "client"),
    "INTERNAL_TEAM": ("Internal Team", "internal"),
}
MESSAGE_TYPES = {"standard", "approval_request", "operational_update", "guest_impact_summary"}
AUTHOR_ROLES  = {"planner", "client", "system"}
APPROVAL_TRANSITIONS = {"approved", "rejected", "expired"}


# Planner authorization is provided by app.auth.require_planner — it prefers a
# valid Supabase access token (Authorization: Bearer) and falls back to the legacy
# X-Planner-Token during the auth rollout. See app/auth.py.
def assert_channel_type(channel_type: str) -> None:
    if channel_type not in CHANNELS:
        raise HTTPException(status_code=400, detail="channel_type must be CLIENT or INTERNAL_TEAM")


# ── Schemas ────────────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    message_type: Literal["standard", "approval_request", "operational_update", "guest_impact_summary"] = "standard"
    author_role: Literal["planner", "client", "system"] = "planner"
    author_name: Optional[str] = None
    body: Optional[str] = None
    approval_context: Optional[str] = None
    required_by: Optional[datetime] = None
    notify_email: Optional[str] = None   # recipient for approval_request emails (no clients table yet)
    # Sprint 58.2 — email delivery fields
    deliver_email: bool = False           # True → attempt Resend delivery (standard messages only)
    recipient_email: Optional[str] = None # Where to send the email
    recipient_name: Optional[str] = None  # Display name in the email
    subject: Optional[str] = None         # Email subject line (defaults to "Message from {author_name}")
    reply_to: Optional[str] = None        # Reply-to address (planner's email)
    invite: bool = False                  # the invite batch / one-guest send: the email is the invitation (11/19/2026)
    invite_card_version: Optional[str] = None   # the invitation picture the host just uploaded (invite_cards); used only if it is the stored one
    # Sprint 58P.4c — portal-respond authorization
    portal_token: Optional[str] = None    # planner's event.portalToken; stored in metadata.portal_token
                                          # for approval_request messages so the public portal-respond
                                          # endpoint can authorize verdicts without a new table.


# ── Email is to someone ON the event (security self-test, 11/17/2026, H1) ─────
# Any signed-in account could email any address from the product's domain:
# made-up event id, caller-chosen recipient/subject/From/reply-to, raw HTML, no
# limit. The host app's one use is "Email this vendor", whose address is saved
# on the event, so that is the rule: the event must be saved to the account
# (a public.events row, so _assert_event_access ran its strict studio check,
# never the first-touch claim), the recipient must be an address stored in that
# event exactly, and sends per event per day are counted in the database.
EMAIL_SENDS_PER_EVENT_PER_DAY = 40


def _addresses_in(node, out):
    if isinstance(node, dict):
        for v in node.values():
            _addresses_in(v, out)
    elif isinstance(node, list):
        for v in node:
            _addresses_in(v, out)
    elif isinstance(node, str) and "@" in node:
        out.add(node.strip().lower())
    return out


async def _assert_email_send_allowed(conn, event_id: str, recipient: str) -> dict:
    row = await conn.fetchrow("select data from public.events where id=$1", event_id)
    if row is None:
        raise HTTPException(409, "Save this event to your account before emailing from it.")
    data = row["data"]
    if isinstance(data, str):
        data = json.loads(data or "{}")
    if (recipient or "").strip().lower() not in _addresses_in(data or {}, set()):
        raise HTTPException(403, "Only an address saved on this event can be emailed.")
    # A co-host invite is recorded here too (Messages view, 11/20/2026) but it
    # has its own daily cap in cohosts.py, so it does not spend this one.
    n = await conn.fetchval(
        "select count(*) from event_messages where event_id=$1 and metadata ? 'delivery'"
        " and coalesce(metadata->'delivery'->>'intent', '') <> 'cohost_invite'"
        " and created_at > now() - interval '1 day'",
        event_id,
    )
    if (n or 0) >= EMAIL_SENDS_PER_EVENT_PER_DAY:
        raise HTTPException(429, "This event has sent its email for today. Try again tomorrow.")
    return data or {}


# ── A STOP LINK ON EVERY EMAIL (owner ruling 11/19/2026, decision 7) ──────────
# One random token per (event, address), migration 031. The link only SHOWS a
# button (mail scanners open links, and must never stop anyone); the button and
# a mail app's one-click List-Unsubscribe (RFC 8058) POST. Once stopped, this
# route will not email that address about that event again. Before 031 the
# table is absent and email goes out exactly as before, without the link.
async def _email_stop_token(conn, event_id: str, recipient: str) -> Optional[str]:
    if not await conn.fetchval("select to_regclass('public.email_stops')"):
        return None
    addr = (recipient or "").strip().lower()
    row = await conn.fetchrow(
        "select token, stopped_at from public.email_stops where event_id=$1 and email=$2", event_id, addr)
    if row and row["stopped_at"]:
        raise HTTPException(410, "This person asked not to get emails about this event. Text them instead.")
    if row:
        return row["token"]
    row = await conn.fetchrow(
        """insert into public.email_stops (event_id, email, token) values ($1, $2, $3)
           on conflict (event_id, email) do update set email = excluded.email
           returning token, stopped_at""",
        event_id, addr, secrets.token_urlsafe(24))
    return row["token"]


def email_stop_url(token: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/email/stop/{token}"


def _one_line(s: Optional[str]) -> str:
    return " ".join(str(s or "").split())


_GREETING = re.compile(r"^\s*(hi|hello|hey|dear|good (morning|afternoon|evening))\b", re.I)


def compose_message_email(ev: dict, body: str, recipient_name, sender: str, stop_url):
    """(html, text): one message from the host to one person on the event, in
    the shared frame. Its title is the event's SAVED name; nothing else from
    the event is stated (the host's words carry the facts they chose)."""
    ev = ev or {}
    name = " ".join(str(ev.get("name") or "").split())
    who = _one_line(recipient_name)
    words = str(body or "")
    # A draft opens with its own greeting (lib/draftVoice); a second "Hi Rosa,"
    # above it would read twice.
    greets = bool(_GREETING.match(words))
    return frame(
        hue=hue_for(ev.get("type"), name), greeting=f"Hi {who}," if who and not greets else None,
        eyebrow=f"A message from {sender}", title=name or None,
        blocks=[(paragraphs_html(words), words)],
        footer=f"Sent by {sender} with No Guesswork Events.", stop_url=stop_url)


class PortalResponse(BaseModel):
    """Sprint 58P.4c: client portal approval verdict payload.

    The portal_token in the body is the credential — there is no Authorization
    header on this endpoint. The token must match the
    metadata.portal_token stored on the target approval_request message.
    """
    portal_token: str
    response: Literal["approved", "rejected"]
    comment: Optional[str] = None
    responder_name: Optional[str] = None
    responder_email: Optional[str] = None

class MessagePatch(BaseModel):
    body: Optional[str] = None
    approval_status: Optional[Literal["approved", "rejected", "expired"]] = None

class PinReq(BaseModel):
    pinned_by: Optional[str] = None
    label: str = "Decision"

class ReadMark(BaseModel):
    reader_key: str


# ── Helpers ──────────────────────────────────────────────────────────────────
async def _ensure_channels(conn, event_id: str):
    for ctype, (label, visibility) in CHANNELS.items():
        await conn.execute(
            """insert into event_channels (event_id, channel_type, label, visibility)
               values ($1, $2, $3, $4)
               on conflict (event_id, channel_type) do nothing""",
            event_id, ctype, label, visibility,
        )

async def _channel(conn, event_id: str, channel_type: str):
    row = await conn.fetchrow(
        "select * from event_channels where event_id=$1 and channel_type=$2",
        event_id, channel_type,
    )
    if not row:
        await _ensure_channels(conn, event_id)
        row = await conn.fetchrow(
            "select * from event_channels where event_id=$1 and channel_type=$2",
            event_id, channel_type,
        )
    return row


async def _assert_event_access(conn, event_id: str, principal: dict, *, claim: bool = True) -> None:
    """Authorize an authenticated planner for an event — studio-scoped access only.

    An event belongs to a *studio*; any member of that studio may access it. When
    public.events has the event, its studio_id alone decides access and no other
    studio can claim it. Only an event with no public.events row (not yet synced)
    is still claimed on first authenticated touch for the caller's studio. There is
    no per-user fallback — auth.uid() is identity only, never the tenant boundary
    for operational data. The shared dev-token path (local dev only, gated by
    ALLOW_DEV_TOKEN in require_planner) skips ownership entirely.

    claim (default True): the legacy/write behavior — claim an unowned (or
    pre-studio) event for the caller's studio on first touch. The comms/write
    paths rely on this and MUST keep claim=True. Read-only callers that must
    NEVER mutate ownership (e.g. the RSVP host read-back, where a stranger with
    an invite link could otherwise auto-claim someone else's event and read all
    guest PII) MUST pass claim=False — see _assert_event_read_access below.
    """
    if not principal or principal.get("via") == "dev_token":
        return
    uid = principal.get("id")
    if not uid:
        raise HTTPException(status_code=403, detail="Planner identity required")

    # TENANT KEY FIRST. public.events.studio_id is NOT NULL and stamped on every
    # synced event; when it exists it alone decides access. event_owners used to
    # be consulted first and created for whoever touched an event first, so a
    # planner from another studio who knew an event id could claim it (58 events
    # had no owner row in production on 10/11/2026). An owner row that names a
    # different studio than the event grants nothing.
    event_studio = await conn.fetchval(
        "select studio_id from public.events where id=$1", event_id)
    if event_studio is not None:
        member = await conn.fetchval(
            "select 1 from studio_members where studio_id=$1 and user_id=$2", event_studio, uid)
        if not member:
            raise HTTPException(status_code=403, detail="You don't have access to this event.")
        if claim:
            # Record the event's OWN studio, never the caller's.
            await conn.execute(
                """insert into event_owners (event_id, owner_id, owner_email, studio_id)
                   values ($1,$2,$3,$4) on conflict (event_id) do nothing""",
                event_id, uid, principal.get("email"), event_studio)
        return

    # No public.events row (not yet synced): no tenant key exists, so the
    # legacy first-touch behavior below still applies. Once the event syncs,
    # the check above governs.
    # Resolve caller's studio (identity → tenant).
    studio = await conn.fetchval(
        "select studio_id from studio_members where user_id=$1 order by (role='owner') desc limit 1", uid)
    if studio is None:
        raise HTTPException(status_code=403, detail="No studio for this user.")

    row = await conn.fetchrow("select studio_id from event_owners where event_id=$1", event_id)
    if row is None:
        if not claim:
            # Read-only path: an unowned event is NOT readable. Never create an
            # event_owners row here (that would be a silent ownership claim).
            raise HTTPException(status_code=404, detail="Event not found.")
        # Claim for the caller's studio. owner_id is kept as audit attribution only;
        # it is NOT used for access decisions (studio_id is the tenant key).
        await conn.execute(
            """insert into event_owners (event_id, owner_id, owner_email, studio_id)
               values ($1,$2,$3,$4) on conflict (event_id) do nothing""",
            event_id, uid, principal.get("email"), studio)
        return

    owning_studio = row["studio_id"]
    if owning_studio is None:
        if not claim:
            # Read-only path: a pre-studio (unbound) row has no tenant key, so the
            # caller cannot prove membership. Do NOT adopt/bind it on a read.
            raise HTTPException(status_code=403, detail="You don't have access to this event.")
        # Pre-studio row in the table (migration artifact) — adopt the caller's
        # studio so future checks have the tenant key. Access is still gated by
        # studio membership: only the caller (who is a member of their own studio)
        # can adopt the row, which has the effect of binding it to that studio.
        await conn.execute(
            "update event_owners set studio_id=$2 where event_id=$1 and studio_id is null",
            event_id, studio)
        return

    # Studio-scoped: caller must be a member of the event's owning studio.
    member = await conn.fetchval(
        "select 1 from studio_members where studio_id=$1 and user_id=$2", owning_studio, uid)
    if not member:
        raise HTTPException(status_code=403, detail="You don't have access to this event.")


async def _assert_event_read_access(conn, event_id: str, principal: dict) -> None:
    """Read-only, NON-claiming ownership check.

    Identical authorization to _assert_event_access but it NEVER creates or mutates
    an event_owners row. Use this on read-back paths reachable by a caller who only
    holds a public invite link: without this, the first authenticated touch would
    silently claim someone else's event (and expose all guest PII). An event that is
    not already owned by — or whose owning studio the caller is not a member of —
    raises 404/403 instead.
    """
    await _assert_event_access(conn, event_id, principal, claim=False)


# ── 1. GET /channels (idempotently ensures both exist) ──────────────────────────
# GATED 2026-08-21 (stage-5 sweep, finding #8 resolved). This read was public
# on the theory that the client portal needed it — but the portal viewer reads
# from LOCAL event data and calls only portal-respond; listChannels/listMessages
# have no anonymous consumer anywhere in either shell. Meanwhile hostv2 event
# ids are timestamp-derived (guessable), and this route even WRITES
# (_ensure_channels inserts rows for any event_id it is handed). Every comm
# read is now signed-in, ownership-checked — same as the writes.
@router.get("/channels")
async def list_channels(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        await _ensure_channels(conn, event_id)
        rows = await conn.fetch(
            "select * from event_channels where event_id=$1 order by channel_type", event_id)
        return [dict(r) for r in rows]


# ── 2. POST /channels/ensure ────────────────────────────────────────────────────
# GATED 2026-08-07. This is a WRITE, and it was anonymous. `_ensure_channels`
# inserts into event_channels for whatever `event_id` string it is handed, and
# migrations/0001_communication.sql declares that column `text not null` with NO
# foreign key to events — so any caller could create two rows per arbitrary
# string, without limit and without owning anything.
#
# Safe to gate: the only caller is commApi.ensureChannels, and commApi's `req()`
# already attaches plannerAuthHeaders to every request, which is how the eight
# already-gated routes in this same file work today.
#
# The GET beside it is deliberately left public — `list_messages` shows this
# module intends unauthenticated reads for the client portal (it requires a
# planner only for INTERNAL_TEAM), so quietly gating a read could break that
# portal. That one is recorded in the audit instead of changed here.
@router.post("/channels/ensure")
async def ensure_channels(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        await _ensure_channels(conn, event_id)
        rows = await conn.fetch(
            "select * from event_channels where event_id=$1 order by channel_type", event_id)
        return [dict(r) for r in rows]


# ── 3. GET /channels/{channel_type}/messages ────────────────────────────────────
@router.get("/channels/{channel_type}/messages")
async def list_messages(
    event_id: str, channel_type: str,
    limit: int = Query(100, le=500),
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    assert_channel_type(channel_type)
    # GATED 2026-08-21 (finding #8): reads were public for non-INTERNAL
    # channels; no anonymous consumer exists (see list_channels note), so
    # every read is signed-in + ownership-checked now.
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        ch = await _channel(conn, event_id, channel_type)
        rows = await conn.fetch(
            """select * from event_messages
               where channel_id=$1 and deleted_at is null
               order by created_at desc limit $2""",
            ch["id"], limit,
        )
        return [dict(r) for r in rows]


# ── 3b. GET /sent — the host's Messages view (owner, 11/20/2026) ──────────────
# READ-ONLY. Every email the app sent on this event's behalf (any row carrying
# metadata.delivery: an invite, the one-guest email, "Send it to" a vendor, a
# co-host invite), newest first, with the delivery status the Resend webhook
# last wrote. Plus, for the HOST only, the event's co-host invitations.
#
# Why not list_messages above: it is one channel at a time, it CLAIMS an
# unowned event on a read (_assert_event_access, claim=True), it admits no
# co-host, and it returns the whole row (portal_token, resend_id). This uses
# the shared non-claiming read check (_assert_event_studio_read): the event's
# own studio, or a claimed co-host of this one event, and nobody else.
_SENT_DELIVERY_KEYS = ("intent", "status", "recipient_name", "recipient_email", "subject", "kind", "provider_event")


def _as_dict(v) -> dict:
    if isinstance(v, str):
        try:
            v = json.loads(v or "{}")
        except ValueError:
            v = {}
    return v if isinstance(v, dict) else {}


@router.get("/sent")
async def list_sent(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_studio_read(conn, event_id, principal)
        rows = await conn.fetch(
            """select id, created_at, updated_at, metadata->'delivery' as delivery
                 from event_messages
                where event_id=$1 and deleted_at is null and metadata ? 'delivery'
                order by created_at desc limit 300""",
            event_id,
        )
        emails = []
        for r in rows:
            d = _as_dict(r["delivery"])
            emails.append({
                "id": str(r["id"]),
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
                "delivery": {k: d.get(k) for k in _SENT_DELIVERY_KEYS if d.get(k) is not None},
            })
        # Co-host invitations: the host's to see (cohosts.list_cohosts is
        # host-only too); a co-host reading this gets null, not someone's list.
        cohosts = None
        uid = (principal or {}).get("id")
        if uid and (principal or {}).get("via") != "dev_token" and await conn.fetchval(
                "select to_regclass('public.event_cohosts') is not null"):
            studio = await conn.fetchval("select studio_id from public.events where id=$1", event_id)
            if studio is not None and await conn.fetchval(
                    "select 1 from studio_members where studio_id=$1 and user_id=$2", studio, uid):
                crow = await conn.fetch(
                    "select email, created_at, accepted_at from public.event_cohosts where event_id=$1 order by created_at",
                    event_id)
                cohosts = [{
                    "email": c["email"],
                    "invited_at": c["created_at"].isoformat() if c["created_at"] else None,
                    "joined_at": c["accepted_at"].isoformat() if c["accepted_at"] else None,
                } for c in crow]
    return {"emails": emails, "cohosts": cohosts}


# ── 4. POST /channels/{channel_type}/messages ──────────────────────────────────
@router.post("/channels/{channel_type}/messages")
async def create_message(
    event_id: str, channel_type: str, payload: MessageCreate,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    assert_channel_type(channel_type)
    # GATED 2026-08-21 (finding #8): the author_role=="client" carve-out let
    # ANYONE post into any event's client channel with no credential at all —
    # and no anonymous writer exists (the portal writes only via
    # portal-respond, which authorizes on the message's portal_token). Every
    # message write is a signed-in write now; if a client-composed message
    # path ever ships, it authorizes like portal-respond does, not by naming
    # an author_role.
    principal = await require_planner(authorization, x_planner_token)

    if payload.message_type not in MESSAGE_TYPES:
        raise HTTPException(400, "invalid message_type")
    if payload.message_type == "approval_request":
        if not payload.approval_context:
            raise HTTPException(400, "approval_request requires approval_context")
    elif not (payload.body and payload.body.strip()):
        raise HTTPException(400, "body is required")

    approval_status = "pending" if payload.message_type == "approval_request" else None

    standard_email = bool(payload.deliver_email and payload.recipient_email and payload.message_type == "standard")
    approval_email_to = (payload.recipient_email or payload.notify_email) if (
        payload.message_type == "approval_request" and channel_type == "CLIENT") else None
    # Replies may only be routed to the sender's own (session) address.
    own = (principal or {}).get("email") or ""
    reply_to = payload.reply_to if (payload.reply_to and own and payload.reply_to.strip().lower() == own.strip().lower()) else None

    pool = await get_pool()
    async with pool.acquire() as conn:
        if principal:
            await _assert_event_access(conn, event_id, principal)
        event_data = {}
        if standard_email or approval_email_to:
            event_data = await _assert_email_send_allowed(conn, event_id, payload.recipient_email if standard_email else approval_email_to)
        # An invite never goes out without the day, the hour and the place
        # (owner, 11/19/2026), read from the SAVED event before anything is sent.
        if payload.invite and standard_email:
            missing = invite_gaps(event_data)
            if missing:
                words = {"date": "the date", "time": "the start time", "place": "the place"}
                raise HTTPException(422, "This invite is missing " + " and ".join(words[m] for m in missing)
                                    + ". Add it in the app, then send again.")
        stop_token = await _email_stop_token(conn, event_id, payload.recipient_email) if standard_email else None
        ch = await _channel(conn, event_id, channel_type)

        # Build initial metadata. Sprint 58.2: delivery intent is recorded here
        # so the frontend can read it back. The actual delivery result is patched
        # in after the Resend call below.
        # Sprint 58P.4c: approval_request messages also carry the planner's
        # event.portalToken so the public portal-respond endpoint can authorize
        # verdicts on a per-message basis without a new table.
        metadata = {}
        if payload.deliver_email:
            metadata["delivery"] = {
                "intent": "email",
                "recipient_email": payload.recipient_email,
                "recipient_name": payload.recipient_name,
                "status": "pending",
            }
        if payload.message_type == "approval_request" and payload.portal_token:
            metadata["portal_token"] = payload.portal_token

        row = await conn.fetchrow(
            """insert into event_messages
               (event_id, channel_id, message_type, author_role, author_name, body,
                approval_status, approval_context, required_by, metadata)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *""",
            event_id, ch["id"], payload.message_type, payload.author_role,
            payload.author_name, payload.body, approval_status,
            payload.approval_context, payload.required_by,
            json.dumps(metadata) if metadata else "{}",
        )

    msg_id = row["id"]

    # ── Email delivery ─────────────────────────────────────────────────────────
    # Sprint 58.2: general email delivery for standard messages.
    # The message is already persisted — email is a best-effort sidecar.
    if standard_email:
        # IN THE SHARED FRAME (email_frame, owner 11/20/2026: "And other
        # comms"): the invite's cream card, the event's hue and name, the
        # host's words, "Sent by <host> with No Guesswork Events" and the stop
        # link. Named "<host> via No Guesswork" with a plain-text part, like
        # the emails that arrive (live alias check, 11/19/2026: the invite
        # batch landed in Spam under the bare typed name, HTML only).
        body_text = payload.body or ""
        sender = _one_line(payload.author_name) or "Your host"
        subj = _one_line(payload.subject) or f"Message from {sender}"
        stop_headers = None
        if stop_token:
            stop = email_stop_url(stop_token)
            stop_headers = {"List-Unsubscribe": f"<{stop}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}
        html, body_plain = compose_message_email(
            event_data, body_text, payload.recipient_name, sender,
            email_stop_url(stop_token) if stop_token else None)
        # THE INVITE IS IN THE EMAIL (owner, 11/19/2026). An invite send is the
        # Studio Matte invitation itself, its facts read from the event saved on
        # the server (event_data), never from the request. Its own footer carries
        # the stop link. Every other email wears the message frame above.
        if payload.invite:
            # The host's invitation as a picture, when one is stored (invite_cards).
            code = str((event_data or {}).get("rsvpCode") or "").strip()
            want = str(payload.invite_card_version or "").strip()
            v = await stored_card_version(event_id) if (code and want) else None
            v = v if v and v == want else None   # never a stale picture
            html, body_plain = compose_invite_email(
                event_data, body_text, payload.recipient_name, sender,
                email_stop_url(stop_token) if stop_token else None,
                card_url=card_url(code, v) if v else None)
        delivery_result = await send_thread_email(
            to=payload.recipient_email,
            subject=subj,
            body_html=html,
            body_text=body_plain,
            sender_name=f"{sender} via No Guesswork",
            reply_to=reply_to,
            headers=stop_headers,
        )

        # Patch the message metadata with the delivery result.
        # Status is "accepted" (Resend accepted for delivery) NOT "delivered".
        # The Resend webhook at /api/resend-webhook updates status to
        # "delivered", "bounced", "complained", or "deferred" when those
        # events arrive. Until then, "accepted" is the honest state.
        delivery_meta = {
            "intent":          "email",
            "recipient_email": payload.recipient_email,
            "recipient_name":  payload.recipient_name,
            "status":          "accepted" if delivery_result.get("ok") else "failed",
            "provider":        delivery_result.get("provider"),
            # What it was, for the Messages view (11/20/2026). The subject was
            # sent and never kept, so earlier rows cannot say; these can.
            "subject":         subj,
        }
        if payload.invite:
            delivery_meta["kind"] = "invite"
        if delivery_result.get("ok"):
            delivery_meta["resend_id"] = delivery_result.get("resend_id")
        else:
            delivery_meta["error"] = delivery_result.get("error")

        pool2 = await get_pool()
        async with pool2.acquire() as conn2:
            row = await conn2.fetchrow(
                """update event_messages set metadata = jsonb_set(
                       coalesce(metadata, '{}'), '{delivery}', $2::jsonb
                   ) where id=$1 returning *""",
                msg_id, json.dumps(delivery_meta),
            )

    # Approval request email notification.
    # Uses recipient_email (Sprint 58.2 field) with notify_email as legacy fallback.
    # Stores delivery result in metadata so the planner can see whether the
    # approval email was accepted, failed, or not attempted.
    # Sprint 58P.4c: send_approval_email now returns the same dict shape as
    # send_thread_email, so resend_id is captured and the existing Resend
    # webhook (/api/resend-webhook) can update delivered/bounced/complained
    # statuses for approval emails too.
    elif payload.message_type == "approval_request" and channel_type == "CLIENT":
        # Resolve the best available recipient address
        approval_recipient = payload.recipient_email or payload.notify_email

        link = f"{APP_BASE_URL}?event={event_id}"
        # The event's SAVED name titles the email (found 11/20/2026: the id was
        # passed here, so the client read the id as the title).
        ev_name = " ".join(str((event_data or {}).get("name") or "").split()) or "your event"
        email_result = await send_approval_email(
            approval_recipient, ev_name, payload.approval_context or "", link
        )

        # Build delivery metadata so the planner can see notification status
        if approval_recipient:
            if email_result.get("ok"):
                approval_delivery = {
                    "intent": "approval_email",
                    "recipient_email": approval_recipient,
                    "status": "accepted",
                    "provider": "resend",
                }
                if email_result.get("resend_id"):
                    approval_delivery["resend_id"] = email_result["resend_id"]
            elif email_result.get("error") == "email_not_configured" or not is_email_configured():
                approval_delivery = {
                    "intent": "approval_email",
                    "recipient_email": approval_recipient,
                    "status": "provider_not_configured",
                }
            else:
                approval_delivery = {
                    "intent": "approval_email",
                    "recipient_email": approval_recipient,
                    "status": "failed",
                    "provider": "resend",
                    "error": email_result.get("error", "send_failed"),
                }
        else:
            approval_delivery = {
                "intent": "approval_email",
                "status": "no_recipient",
            }

        pool3 = await get_pool()
        async with pool3.acquire() as conn3:
            row = await conn3.fetchrow(
                """update event_messages set metadata = jsonb_set(
                       coalesce(metadata, '{}'), '{delivery}', $2::jsonb
                   ) where id=$1 returning *""",
                msg_id, json.dumps(approval_delivery),
            )

    return dict(row)


# ── 5. PATCH /messages/{message_id} ─────────────────────────────────────────────
@router.patch("/messages/{message_id}")
async def update_message(
    event_id: str, message_id: str, payload: MessagePatch,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        cur = await conn.fetchrow(
            "select * from event_messages where id=$1 and event_id=$2 and deleted_at is null",
            message_id, event_id)
        if not cur:
            raise HTTPException(404, "message not found")
        if payload.approval_status is not None:
            if cur["message_type"] != "approval_request":
                raise HTTPException(400, "only approval_request messages have a status")
            if cur["approval_status"] != "pending":
                raise HTTPException(409, "approval already resolved")
            if payload.approval_status not in APPROVAL_TRANSITIONS:
                raise HTTPException(400, "invalid approval transition")
        row = await conn.fetchrow(
            """update event_messages set
               body            = coalesce($3, body),
               approval_status = coalesce($4, approval_status),
               updated_at      = now()
               where id=$1 and event_id=$2 returning *""",
            message_id, event_id, payload.body, payload.approval_status,
        )
        return dict(row)


# ── 5b. DELETE /messages/{message_id} (soft delete) ─────────────────────────────
@router.delete("/messages/{message_id}")
async def delete_message(
    event_id: str, message_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        cur = await conn.fetchrow(
            "select id from event_messages where id=$1 and event_id=$2 and deleted_at is null",
            message_id, event_id)
        if not cur:
            raise HTTPException(404, "message not found")
        # Soft delete (recoverable) + drop any pinned-decision reference.
        await conn.execute(
            "update event_messages set deleted_at=now(), pinned=false, pinned_at=null, pinned_by=null where id=$1 and event_id=$2",
            message_id, event_id)
        await conn.execute(
            "delete from pinned_decisions where message_id=$1 and event_id=$2", message_id, event_id)
        return {"ok": True, "deleted": True}


# ── 6. POST /messages/{message_id}/pin ──────────────────────────────────────────
@router.post("/messages/{message_id}/pin")
async def pin_message(
    event_id: str, message_id: str, payload: PinReq,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        msg = await conn.fetchrow(
            "select * from event_messages where id=$1 and event_id=$2 and deleted_at is null",
            message_id, event_id)
        if not msg:
            raise HTTPException(404, "message not found")
        await conn.execute(
            """update event_messages set pinned=true, pinned_at=now(), pinned_by=$3
               where id=$1 and event_id=$2""",
            message_id, event_id, payload.pinned_by)
        await conn.execute(
            """insert into pinned_decisions (event_id, channel_id, message_id, label, pinned_by)
               values ($1,$2,$3,$4,$5)
               on conflict (channel_id, message_id) do nothing""",
            event_id, msg["channel_id"], message_id, payload.label, payload.pinned_by)
        return {"ok": True, "pinned": True}


# ── 7. DELETE /messages/{message_id}/pin ────────────────────────────────────────
@router.delete("/messages/{message_id}/pin")
async def unpin_message(
    event_id: str, message_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        await conn.execute(
            "update event_messages set pinned=false, pinned_at=null, pinned_by=null where id=$1 and event_id=$2",
            message_id, event_id)
        await conn.execute(
            "delete from pinned_decisions where message_id=$1 and event_id=$2", message_id, event_id)
        return {"ok": True, "pinned": False}


# ── POST /messages/{message_id}/portal-respond (PUBLIC) ────────────────────────
# Sprint 58P.4c — client portal approval verdict path.
# Public endpoint: no Authorization / X-Planner-Token. The portal_token in the
# body is the credential — it must match metadata.portal_token persisted on the
# target approval_request message when the planner sent it. This keeps approval
# verdicts cross-device durable in event_messages.metadata.approval instead of
# the legacy per-device localStorage write that this sprint replaces.
@router.post("/messages/{message_id}/portal-respond")
async def portal_respond(event_id: str, message_id: str, payload: PortalResponse):
    pool = await get_pool()
    async with pool.acquire() as conn:
        cur = await conn.fetchrow(
            "select * from event_messages where id=$1 and event_id=$2 and deleted_at is null",
            message_id, event_id,
        )
        if not cur:
            raise HTTPException(status_code=404, detail="approval request not found")
        if cur["message_type"] != "approval_request":
            raise HTTPException(status_code=400, detail="not an approval request")
        if cur["approval_status"] not in (None, "pending"):
            raise HTTPException(status_code=409, detail="approval already resolved")

        # metadata.portal_token is the per-message credential set at create time.
        meta = cur["metadata"] or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        stored_token = (meta or {}).get("portal_token")
        if not stored_token or stored_token != payload.portal_token:
            # Generic 401 — do not leak which check failed.
            raise HTTPException(status_code=401, detail="portal token invalid for this approval request")

        approval_meta = {
            "response":        payload.response,           # "approved" | "rejected"
            "responded_at":    datetime.utcnow().isoformat() + "Z",
            "source":          "client_portal",
            "synced":          True,
            "comment":         payload.comment,
            "responder_name":  payload.responder_name,
            "responder_email": payload.responder_email,
        }

        row = await conn.fetchrow(
            """update event_messages
                  set approval_status = $3,
                      metadata = jsonb_set(coalesce(metadata, '{}'), '{approval}', $4::jsonb)
                where id=$1 and event_id=$2
              returning *""",
            message_id, event_id, payload.response, json.dumps(approval_meta),
        )
    return dict(row)


# ── 8. POST /channels/{channel_type}/read ───────────────────────────────────────
@router.post("/channels/{channel_type}/read")
async def mark_read(
    event_id: str, channel_type: str, payload: ReadMark,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    assert_channel_type(channel_type)
    # GATED 2026-08-21 (finding #8): this is a WRITE into channel_read_state
    # keyed on caller-supplied reader_key; it had the same anonymous
    # non-INTERNAL carve-out as the reads, with the same zero anonymous
    # consumers. Signed-in + ownership-checked, like everything else here.
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _assert_event_access(conn, event_id, principal)
        ch = await _channel(conn, event_id, channel_type)
        await conn.execute(
            """insert into channel_read_state (event_id, channel_id, reader_key, last_read_at, unread_count)
               values ($1,$2,$3, now(), 0)
               on conflict (channel_id, reader_key)
               do update set last_read_at=now(), unread_count=0, updated_at=now()""",
            event_id, ch["id"], payload.reader_key)
        return {"ok": True}



# ── THE STOP PAGE (public) ────────────────────────────────────────────────────
public_router = APIRouter(tags=["communication-public"])
_STOP_PAGE = ("<!doctype html><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">"
              "<title>{title}</title><body style=\"font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem\">"
              "<h1 style=\"font-size:1.25rem\">{title}</h1>{body}</body>")


def _token(token: str) -> str:
    t = (token or "")[:80]
    if len(t) < 22:
        raise HTTPException(404, "Not found")
    return t


async def _account_kind(t: str) -> Optional[str]:
    """'reminders' / 'promotions' when the token is a host's own account stop
    (app/host_email.py), else None. An unknown token reads as an event stop."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await conn.fetchval("select to_regclass('public.email_stops')"):
            return None
        key = await conn.fetchval("select event_id from public.email_stops where token = $1", t)
    return host_email.KIND_FOR_KEY.get(key or "")


@public_router.get("/api/public/email/stop/{token}", response_class=HTMLResponse)
async def email_stop_page(token: str):
    t = _token(token)
    kind = await _account_kind(t)
    if kind:
        w = host_email.STOP_WORDS[kind]
        return HTMLResponse(_STOP_PAGE.format(
            title=w["ask"],
            body=(f"<p>{w['explain']}</p>"
                  f"<form method=post action=\"{_html.escape(t)}\"><button style=\"font:inherit;padding:.5rem 1rem\">{w['button']}</button></form>")))
    return HTMLResponse(_STOP_PAGE.format(
        title="Stop emails about this event?",
        body=(f"<p>You won't get emails from your host about this event. The invite link still works.</p>"
              f"<form method=post action=\"{_html.escape(t)}\"><button style=\"font:inherit;padding:.5rem 1rem\">Stop emails about this event</button></form>")))


@public_router.post("/api/public/email/stop/{token}", response_class=HTMLResponse)
async def email_stop(token: str):
    t = _token(token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if await conn.fetchval("select to_regclass('public.email_stops')"):
            await conn.execute(
                "update public.email_stops set stopped_at = now() where token = $1 and stopped_at is null", t)
    kind = await _account_kind(t)
    if kind:
        w = host_email.STOP_WORDS[kind]
        return HTMLResponse(_STOP_PAGE.format(title=w["done"], body=f"<p>{w['after']}</p>"))
    # The same answer whether or not the token matched: no oracle.
    return HTMLResponse(_STOP_PAGE.format(
        title="You won't get emails about this event anymore",
        body="<p>Your host can still reach you another way. The invite link still works.</p>"))
