"""Operational communication ledger — CLIENT + INTERNAL_TEAM channels.

Architecture: frontend -> this API -> Supabase Postgres -> Resend (approvals only).
No direct frontend DB writes. No realtime. This is a controlled ledger, not chat.
"""
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from ..db import get_pool
from ..config import APP_BASE_URL
from ..auth import require_planner
from ..emailer import send_approval_email

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


async def _assert_event_access(conn, event_id: str, principal: dict) -> None:
    """Enforce per-event ownership for an authenticated planner.

    Claim-on-first-touch: the first signed-in planner to take a gated action on an
    event becomes its owner (this also back-fills events created before Auth). Any
    other signed-in planner is denied. The shared dev-token path is single-planner
    by definition, so it skips ownership entirely.
    """
    if not principal or principal.get("via") == "dev_token":
        return
    uid = principal.get("id")
    if not uid:
        raise HTTPException(status_code=403, detail="Planner identity required")
    row = await conn.fetchrow("select owner_id from event_owners where event_id=$1", event_id)
    if row is None:
        await conn.execute(
            """insert into event_owners (event_id, owner_id, owner_email)
               values ($1, $2, $3) on conflict (event_id) do nothing""",
            event_id, uid, principal.get("email"))
        row = await conn.fetchrow("select owner_id from event_owners where event_id=$1", event_id)
    if row and row["owner_id"] != uid:
        raise HTTPException(status_code=403, detail="You don't have access to this event.")


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
        row = await conn.fetchrow(
            """insert into event_messages
               (event_id, channel_id, message_type, author_role, author_name, body,
                approval_status, approval_context, required_by)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *""",
            event_id, ch["id"], payload.message_type, payload.author_role,
            payload.author_name, payload.body, approval_status,
            payload.approval_context, payload.required_by,
        )

    # Resend notification — ONLY for approval requests in the CLIENT channel. Fail-soft.
    if payload.message_type == "approval_request" and channel_type == "CLIENT":
        link = f"{APP_BASE_URL}?event={event_id}"
        await send_approval_email(payload.notify_email, event_id, payload.approval_context or "", link)

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
