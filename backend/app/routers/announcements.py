"""Announcements — the host posts one update to everyone (owner ruling
11/16/2026, "go with recommendations"; migration 027).

  POST   /api/events/{event_id}/announcements        — host or co-host: post one.
  GET    /api/events/{event_id}/announcements        — host or co-host: the list and the limits.
  DELETE /api/events/{event_id}/announcements/{id}   — host or co-host: take it off the invite.
  GET    /api/public/announcements/{rsvp_code}       — the invite: body and time only.

Limits, counted in the database so a restart cannot reset them: 3 in any 24
hours and 20 per event. A removed post still counts (removing must not buy
another send). Each post shows on the invite and is emailed once to every
guest who ticked the opt-in (guest_notices.notify_guests_of_announcement);
removing it later takes it off the invite, but an email already sent stays sent,
and the host is told so.

Every route answers 503 until 027 exists. The public route resolves the event
from the invite code server-side, exactly as the RSVP routes do, and returns no
id, author, or anything about the host.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel, field_validator

from ..auth import require_planner
from ..db import get_pool
from ..guest_notices import notify_guests_of_announcement
from .guest_messages import MAX_BODY, MAX_CODE, NOT_FOUND, _limit, _plain
from .rsvp import _assert_event_studio_read, _resolve_event

router = APIRouter(tags=["announcements"])

PER_DAY = 3
PER_EVENT = 20


class AnnouncementIn(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _plain(v, MAX_BODY, multiline=True)


async def _ready(conn) -> bool:
    return bool(await conn.fetchval("select to_regclass('public.event_announcements') is not null"))


def _iso(t):
    return t.isoformat() if t else None


async def _counts(conn, event_id: str) -> dict:
    r = await conn.fetchrow(
        """select count(*) filter (where created_at > now() - interval '24 hours') as day,
                  count(*) as total
             from public.event_announcements where event_id = $1""", event_id)
    return {"today": r["day"], "total": r["total"], "per_day": PER_DAY, "per_event": PER_EVENT}


async def _host_list(conn, event_id: str):
    rows = await conn.fetch(
        """select id, body, created_at, removed_at from public.event_announcements
            where event_id = $1 order by created_at desc""", event_id)
    return [{"id": str(r["id"]), "body": r["body"], "created_at": _iso(r["created_at"]),
             "removed": r["removed_at"] is not None} for r in rows]


async def _opted_in(conn, event_id: str) -> int:
    return await conn.fetchval(
        """select count(distinct lower(guest_email)) from public.guest_threads
            where event_id = $1 and email_opt_in and guest_email is not null and blocked_at is null""",
        event_id) or 0


@router.get("/api/events/{event_id}/announcements")
async def list_announcements(event_id: str, authorization: Optional[str] = Header(default=None),
                             x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _ready(conn):
            raise HTTPException(503, "Updates aren't switched on yet.")
        await _assert_event_studio_read(conn, event_id, principal)
        return {"ok": True, "announcements": await _host_list(conn, event_id),
                "limits": await _counts(conn, event_id), "email_guests": await _opted_in(conn, event_id)}


@router.post("/api/events/{event_id}/announcements")
async def post_announcement(event_id: str, payload: AnnouncementIn, background: BackgroundTasks,
                            authorization: Optional[str] = Header(default=None),
                            x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _ready(conn):
            raise HTTPException(503, "Updates aren't switched on yet.")
        await _assert_event_studio_read(conn, event_id, principal)
        async with conn.transaction():
            # One post at a time per event, so two quick taps cannot both pass the count.
            await conn.execute("select pg_advisory_xact_lock(hashtext($1))", "ann:" + event_id)
            c = await _counts(conn, event_id)
            if c["total"] >= PER_EVENT:
                raise HTTPException(429, f"You've posted the most updates this event allows ({PER_EVENT}).")
            if c["today"] >= PER_DAY:
                raise HTTPException(429, f"You've posted {PER_DAY} updates in the last day — try again tomorrow.")
            by = principal.get("id") if principal and principal.get("via") != "dev_token" else None
            row = await conn.fetchrow(
                """insert into public.event_announcements (event_id, body, posted_by)
                   values ($1, $2, $3::uuid) returning id, created_at""", event_id, payload.body, by)
        emailing = await _opted_in(conn, event_id)
        background.add_task(notify_guests_of_announcement, row["id"])
        return {"ok": True, "announcement": {"id": str(row["id"]), "body": payload.body,
                                             "created_at": _iso(row["created_at"]), "removed": False},
                "limits": await _counts(conn, event_id), "emailing": emailing}


@router.delete("/api/events/{event_id}/announcements/{announcement_id}")
async def remove_announcement(event_id: str, announcement_id: str,
                              authorization: Optional[str] = Header(default=None),
                              x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    try:
        aid = uuid.UUID(announcement_id)
    except (ValueError, TypeError):
        raise HTTPException(404, NOT_FOUND)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await _ready(conn):
            raise HTTPException(503, "Updates aren't switched on yet.")
        await _assert_event_studio_read(conn, event_id, principal)
        done = await conn.fetchval(
            """update public.event_announcements set removed_at = coalesce(removed_at, now())
                where id = $1 and event_id = $2 returning id""", aid, event_id)
        if not done:
            raise HTTPException(404, NOT_FOUND)
        return {"ok": True, "announcements": await _host_list(conn, event_id)}


@router.get("/api/public/announcements/{rsvp_code}")
async def public_announcements(rsvp_code: str, request: Request):
    code = (rsvp_code or "")[:MAX_CODE]
    _limit(request, code, write=False)
    pool = await get_pool()
    async with pool.acquire() as conn:
        resolved = await _resolve_event(conn, code)
        if not resolved:
            raise HTTPException(404, NOT_FOUND)
        if not await _ready(conn):
            return {"ok": True, "announcements": []}
        rows = await conn.fetch(
            """select body, created_at from public.event_announcements
                where event_id = $1 and removed_at is null order by created_at desc limit 20""", resolved[0])
        return {"ok": True, "announcements": [{"body": r["body"], "created_at": _iso(r["created_at"])} for r in rows]}
