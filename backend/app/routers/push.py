"""Device notifications: turning them on and off for one browser (owner
decision "B", 11/20/2026).

  GET    /api/push/public-key   the VAPID public key the browser subscribes with;
                                503 while the server has no VAPID keys, which is
                                how the app knows to hide its settings row
  POST   /api/push/subscribe    signed in: keep this browser's subscription
  DELETE /api/push/subscribe    signed in: drop it (your own rows only)

WHAT IS SENT, AND WHEN, IS NOT DECIDED HERE: host_alerts.alert_host decides,
beside the email, and web_push delivers. These routes only keep the list of
devices (migration 033).

OWNERSHIP. A row belongs to the signed-in caller. Re-sending the same browser
address updates the caller's own row; an address already held by someone else
is taken over only by a caller who sends that subscription's auth secret too,
which only the browser that made it holds (a shared computer where a second
person signs in). Delete matches the caller's id in the WHERE clause, so nobody
can remove another person's device. Before 033 is applied both answer 503.
"""
import logging
from typing import Optional
from uuid import UUID

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .. import config, web_push
from ..auth import require_planner
from ..db import get_pool

router = APIRouter(prefix="/api/push", tags=["push"])

# The two statements, named so the real-PostgreSQL test runs these exact words.
# $1 is always the CALLER's id from require_planner, never anything in the body.
log = logging.getLogger("ngw.push")

SUBSCRIBE_SQL = """insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
       values ($1::uuid, $2, $3, $4)
       on conflict (endpoint) do update
          set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
        where push_subscriptions.user_id = excluded.user_id
           or push_subscriptions.auth = excluded.auth
       returning user_id::text"""
UNSUBSCRIBE_SQL = "delete from public.push_subscriptions where endpoint = $2 and user_id = $1::uuid"
# Her phone's time zone, beside the device (migration 035): it decides which
# day is the event day for alerts. A separate statement, so a server ahead of
# 035 still turns the device on and only skips the zone.
TZ_SQL = "update public.push_subscriptions set tz = $3 where endpoint = $2 and user_id = $1::uuid"


def clean_tz(tz) -> str | None:
    """Her phone's time zone, kept only when it is a real IANA zone (it decides
    the event day for alerts). Anything else is dropped, never stored."""
    if not isinstance(tz, str) or not tz or len(tz) > 64:
        return None
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        return None
    return tz


class Keys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_\-=]+$")
    auth: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_\-=]+$")


class Subscription(BaseModel):
    endpoint: str = Field(min_length=1, max_length=web_push.MAX_ENDPOINT)
    keys: Keys
    tz: Optional[str] = Field(default=None, max_length=200)


class Device(BaseModel):
    endpoint: str = Field(min_length=1, max_length=web_push.MAX_ENDPOINT)


def _off():
    raise HTTPException(status_code=503, detail="Device notifications are not set up on this server.")


def _caller_id(principal: dict) -> str:
    # Rows are keyed by the Supabase user id. The local dev token has no user.
    try:
        return str(UUID(str(principal.get("id"))))
    except (ValueError, TypeError):
        raise HTTPException(status_code=403, detail="Sign in to turn on notifications for this device.")


@router.get("/public-key")
async def public_key():
    if not web_push.is_configured():
        _off()
    return {"key": config.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(body: Subscription,
                    authorization: Optional[str] = Header(default=None),
                    x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    uid = _caller_id(principal)
    if not web_push.is_configured():
        _off()
    if not web_push.endpoint_allowed(body.endpoint):
        raise HTTPException(status_code=400, detail="That isn't a browser push address this app can use.")
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await web_push.table_ready(conn):
            _off()
        owner = await conn.fetchval(SUBSCRIBE_SQL, uid, body.endpoint, body.keys.p256dh, body.keys.auth)
        tz = clean_tz(body.tz)
        if owner == uid and tz:
            try:
                await conn.execute(TZ_SQL, uid, body.endpoint, tz)
            except Exception as e:  # noqa: BLE001 — before 035: the device is on, the zone waits
                log.warning("push zone not saved: %s", type(e).__name__)
    if owner != uid:
        raise HTTPException(status_code=409, detail="This device is turned on for another account.")
    return {"ok": True}


@router.delete("/subscribe")
async def unsubscribe(body: Device,
                      authorization: Optional[str] = Header(default=None),
                      x_planner_token: Optional[str] = Header(default=None)):
    principal = await require_planner(authorization, x_planner_token)
    uid = _caller_id(principal)
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not await web_push.table_ready(conn):
            _off()
        status = await conn.execute(UNSUBSCRIBE_SQL, uid, body.endpoint)
    try:
        removed = int(str(status).rsplit(" ", 1)[-1])
    except ValueError:
        removed = 0
    return {"ok": True, "removed": removed}
