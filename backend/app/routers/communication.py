"""Operational communication ledger — CLIENT + INTERNAL_TEAM channels.

Architecture: frontend -> this API -> Supabase Postgres -> Resend (email delivery).
No direct frontend DB writes. No realtime. This is a controlled ledger, not chat.

Sprint 58.2: general email delivery via Resend for any standard message when the
planner provides a recipient email + `deliver_email: true`.
"""
import json
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from ..db import get_pool
from ..config import APP_BASE_URL
from ..auth import require_planner
from ..emailer import send_approval_email, send_thread_email, is_email_configured

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
    # Sprint 58P.4c — portal-respond authorization
    portal_token: Optional[str] = None    # planner's event.portalToken; stored in metadata.portal_token
                                          # for approval_request messages so the public portal-respond
                                          # endpoint can authorize verdicts without a new table.


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

    An event belongs to a *studio*; any member of that studio may access it. The
    first authenticated touch claims the event for the caller's studio. There is
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
@router.get("/channels")
async def list_channels(event_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await _ensure_channels(conn, event_id)
        rows = await conn.fetch(
            "select * from event_channels where event_id=$1 order by channel_type", event_id)
        return [dict(r) for r in rows]


# ── 2. POST /channels/ensure ────────────────────────────────────────────────────
@router.post("/channels/ensure")
async def ensure_channels(event_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
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
    principal = None
    if channel_type == "INTERNAL_TEAM":
        principal = await require_planner(authorization, x_planner_token)  # internal never exposed to client/public
    pool = await get_pool()
    async with pool.acquire() as conn:
        if principal:
            await _assert_event_access(conn, event_id, principal)
        ch = await _channel(conn, event_id, channel_type)
        rows = await conn.fetch(
            """select * from event_messages
               where channel_id=$1 and deleted_at is null
               order by created_at desc limit $2""",
            ch["id"], limit,
        )
        return [dict(r) for r in rows]


# ── 4. POST /channels/{channel_type}/messages ──────────────────────────────────
@router.post("/channels/{channel_type}/messages")
async def create_message(
    event_id: str, channel_type: str, payload: MessageCreate,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    assert_channel_type(channel_type)
    # INTERNAL_TEAM is planner-only; any non-client author is a privileged write.
    principal = None
    if channel_type == "INTERNAL_TEAM" or payload.author_role != "client":
        principal = await require_planner(authorization, x_planner_token)

    if payload.message_type not in MESSAGE_TYPES:
        raise HTTPException(400, "invalid message_type")
    if payload.message_type == "approval_request":
        if not payload.approval_context:
            raise HTTPException(400, "approval_request requires approval_context")
    elif not (payload.body and payload.body.strip()):
        raise HTTPException(400, "body is required")

    approval_status = "pending" if payload.message_type == "approval_request" else None

    pool = await get_pool()
    async with pool.acquire() as conn:
        if principal:
            await _assert_event_access(conn, event_id, principal)
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
    if payload.deliver_email and payload.recipient_email and payload.message_type == "standard":
        # Build a minimal but readable HTML body
        body_text = payload.body or ""
        body_html = body_text.replace("\n", "<br>")
        sender = payload.author_name or "Your event planner"
        subj = payload.subject or f"Message from {sender}"
        greeting = f"<p>Hi{(' ' + payload.recipient_name) if payload.recipient_name else ''},</p>" if payload.recipient_name else ""
        html = f"{greeting}<div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;\">{body_html}</div><p style=\"margin-top:24px;font-size:13px;color:#888;\">— Sent via NGW Events</p>"

        delivery_result = await send_thread_email(
            to=payload.recipient_email,
            subject=subj,
            body_html=html,
            sender_name=sender,
            reply_to=payload.reply_to,
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
        }
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
        email_result = await send_approval_email(
            approval_recipient, event_id, payload.approval_context or "", link
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
    principal = None
    if channel_type == "INTERNAL_TEAM":
        principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if principal:
            await _assert_event_access(conn, event_id, principal)
        ch = await _channel(conn, event_id, channel_type)
        await conn.execute(
            """insert into channel_read_state (event_id, channel_id, reader_key, last_read_at, unread_count)
               values ($1,$2,$3, now(), 0)
               on conflict (channel_id, reader_key)
               do update set last_read_at=now(), unread_count=0, updated_at=now()""",
            event_id, ch["id"], payload.reader_key)
        return {"ok": True}

