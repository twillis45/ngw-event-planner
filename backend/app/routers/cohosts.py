"""Per-event co-hosts (owner ruling 11/16/2026: "per-event co-host").

A host invites someone by email to ONE event. When that person signs in with
the same, CONFIRMED email, the invite is theirs: they can see and change that
event (database rules, migration 026) and read its guest replies, questions
and photos like the host (rsvp._assert_event_studio_read). They cannot delete
it, invite others, or reach any other event.

Only the host (a member of the event's own studio) can invite, list or remove
co-hosts; a co-host can remove themselves. The claim binds to the email in
auth.users and only once it is confirmed, never an email the browser sends.
"""
import html
import json
import logging
import re
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..auth import require_planner
from ..config import APP_BASE_URL
from ..db import get_pool
from ..emailer import _send_via_resend, failure_reason, is_email_configured
from ..rate_counter import bump

router = APIRouter(tags=["cohosts"])
log = logging.getLogger("ngw.cohosts")

MAX_COHOSTS = 10
# Invite EMAILS per event per day (security self-test M4, 11/17/2026): the
# co-host cap counts current rows, so invite-remove-invite re-sent without limit.
INVITE_EMAILS_PER_EVENT_PER_DAY = 20
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,63}$")


class CohostInvite(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


async def _table_ready(conn) -> bool:
    return bool(await conn.fetchval("select to_regclass('public.event_cohosts') is not null"))


async def _assert_host(conn, event_id: str, principal: dict) -> dict:
    """The event's own studio, and the caller in it. Co-hosts are not hosts here."""
    if not principal or principal.get("via") == "dev_token":
        raise HTTPException(403, "Sign in as the host to manage co-hosts.")
    ev = await conn.fetchrow("select studio_id, data->>'name' as name from public.events where id=$1", event_id)
    if not ev:
        raise HTTPException(404, "Save this plan first — co-hosts can only join a saved plan.")
    member = await conn.fetchval(
        "select 1 from studio_members where studio_id=$1 and user_id=$2::uuid", ev["studio_id"], principal.get("id"))
    if not member:
        raise HTTPException(403, "Only the host can manage co-hosts.")
    return ev


def _view(r) -> dict:
    return {"id": str(r["id"]), "email": r["email"], "status": "joined" if r["accepted_at"] else "invited"}


async def _list(conn, event_id):
    rows = await conn.fetch(
        "select id, email, accepted_at from public.event_cohosts where event_id=$1 order by created_at", event_id)
    return [_view(r) for r in rows]


# ── THE INVITE EMAIL IS RECORDED (Messages view, owner 11/20/2026) ───────────
# The send was never kept anywhere: only the event_cohosts row, which says who
# was invited and whether they joined, not whether an email went. It is now
# written where every other email the app sends is written (event_messages,
# metadata.delivery), with Resend's id, so the delivery webhook updates it the
# same way. Recorded at send time only; nothing earlier is back-filled.
# Fail-soft: a record that cannot be written never undoes the invite.
async def _record_invite_email(event_id: str, email: str, subject: str, ok: bool, result) -> None:
    from .communication import _channel   # late: communication imports rsvp, and so on
    delivery = {"intent": "cohost_invite", "recipient_email": email, "subject": subject,
                "status": "accepted" if ok else "failed", "provider": "resend"}
    if ok and isinstance(result, dict) and result.get("id"):
        delivery["resend_id"] = result["id"]
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            ch = await _channel(conn, event_id, "INTERNAL_TEAM")
            await conn.execute(
                """insert into event_messages (event_id, channel_id, message_type, author_role, body, metadata)
                   values ($1, $2, 'operational_update', 'system', $3, $4)""",
                event_id, ch["id"], subject, json.dumps({"delivery": delivery}))
    except Exception as e:  # noqa: BLE001
        log.error("cohost invite record failed event=%s error=%s", event_id, failure_reason(e))


@router.get("/api/events/{event_id}/cohosts")
async def list_cohosts(event_id: str, authorization: Optional[str] = Header(default=None),
                       x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _table_ready(conn):
            raise HTTPException(503, "Co-hosts aren't switched on yet.")
        await _assert_host(conn, event_id, principal)
        return {"ok": True, "cohosts": await _list(conn, event_id)}


@router.post("/api/events/{event_id}/cohosts")
async def invite_cohost(event_id: str, payload: CohostInvite, authorization: Optional[str] = Header(default=None),
                        x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "That doesn't look like an email address.")
    if email == str(principal.get("email") or "").strip().lower():
        raise HTTPException(422, "That's your own email — you're already the host.")
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _table_ready(conn):
            raise HTTPException(503, "Co-hosts aren't switched on yet.")
        ev = await _assert_host(conn, event_id, principal)
        n = await conn.fetchval("select count(*) from public.event_cohosts where event_id=$1", event_id)
        if (n or 0) >= MAX_COHOSTS:
            raise HTTPException(429, f"An event can have up to {MAX_COHOSTS} co-hosts.")
        created = await conn.fetchval(
            """insert into public.event_cohosts (event_id, email, invited_by) values ($1, $2, $3::uuid)
               on conflict (event_id, email) do nothing returning id""",
            event_id, email, principal.get("id"))
        # Each NEW invite sends an email; count them per event per day in the
        # database (security self-test M4). Past the cap the invite is undone.
        if created and not await bump(conn, f"cohost-invite:{event_id}", INVITE_EMAILS_PER_EVENT_PER_DAY):
            await conn.execute("delete from public.event_cohosts where id=$1", created)
            raise HTTPException(429, "This event has sent today's co-host invites. Try again tomorrow.")
        cohosts = await _list(conn, event_id)
    emailed = False
    if created and is_email_configured():
        name = (ev["name"] or "an event").strip()
        subject = f"You're invited to co-host {name[:80]}"
        result = None
        try:
            result = await _send_via_resend(
                to=email,
                subject=subject,
                html=(f"<p>You've been invited to co-host <strong>{html.escape(name)}</strong> on No Guesswork Events.</p>"
                      f"<p><a href=\"{html.escape(APP_BASE_URL)}\">Open the app</a> and sign in with this email address "
                      f"({html.escape(email)}). The plan will be there for you to see and change.</p>"
                      "<p style=\"color:#666\">If you weren't expecting this, ignore it. Nothing happens unless you sign in.</p>"),
            )
            emailed = True
        except Exception as e:  # noqa: BLE001 — the invite stands; the host can tell them directly
            log.error("cohost invite email failed event=%s error=%s", event_id, failure_reason(e))
        await _record_invite_email(event_id, email, subject, emailed, result)
    return {"ok": True, "cohosts": cohosts, "emailed": emailed, "already_invited": not created}


@router.delete("/api/events/{event_id}/cohosts/{cohost_id}")
async def remove_cohost(event_id: str, cohost_id: str, authorization: Optional[str] = Header(default=None),
                        x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _table_ready(conn):
            raise HTTPException(503, "Co-hosts aren't switched on yet.")
        if cohost_id == "me":   # a co-host leaving: their own row, found by who they are
            row = await conn.fetchrow(
                "select id, user_id from public.event_cohosts where user_id=$1::uuid and event_id=$2",
                principal.get("id"), event_id)
        else:
            row = await conn.fetchrow(
                "select id, user_id from public.event_cohosts where id::text=$1 and event_id=$2", cohost_id, event_id)
        if not row:
            raise HTTPException(404, "not found")
        is_self = row["user_id"] is not None and str(row["user_id"]) == str(principal.get("id"))
        if not is_self:
            await _assert_host(conn, event_id, principal)
        await conn.execute("delete from public.event_cohosts where id=$1", row["id"])
        return {"ok": True, "removed": True}


@router.post("/api/cohosts/claim")
async def claim_cohost_invites(authorization: Optional[str] = Header(default=None),
                               x_planner_token: Optional[str] = Header(default=None)):
    """On sign-in: make every invite to this person's CONFIRMED email theirs.
    Returns the events they co-host. Idempotent."""
    principal = await require_planner(authorization, x_planner_token)
    if principal.get("via") == "dev_token":
        return {"ok": True, "events": []}
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _table_ready(conn):
            return {"ok": True, "events": []}
        user = await conn.fetchrow(
            "select lower(email) as email, email_confirmed_at from auth.users where id=$1::uuid", principal.get("id"))
        if user and user["email"] and user["email_confirmed_at"]:
            await conn.execute(
                """update public.event_cohosts set user_id=$1::uuid, accepted_at=now()
                   where email=$2 and user_id is null""",
                principal.get("id"), user["email"])
        rows = await conn.fetch(
            "select event_id from public.event_cohosts where user_id=$1::uuid and accepted_at is not null",
            principal.get("id"))
    return {"ok": True, "events": [r["event_id"] for r in rows]}
