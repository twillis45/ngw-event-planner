"""Device notifications: the sender (owner decision "B", 11/20/2026).

Web Push, as every desktop browser and Android Chrome speak it: the payload is
encrypted to the browser's own keys (RFC 8291, aes128gcm) and the request is
signed with this server's VAPID key (RFC 8292). Only the push service of the
browser's maker (Google, Mozilla, Apple, Microsoft) sees the request, and it
cannot read the payload.

THIS MODULE DECIDES NOTHING ABOUT WHO IS ALERTED OR WHEN. host_alerts.alert_host
is the one place that decides (the hour, the per-event off switch, the host);
it calls send_to_user beside the email. This file only delivers.

RULES
  · CRYPTO is pywebpush's encoder and py_vapid's signer (pinned in
    requirements.txt); the request itself goes out through httpx like every
    other outbound call here, so tests drive it with a MockTransport.
  · A 404 OR 410 from the push service means the browser dropped the
    subscription: the row is deleted, so it is never tried again.
  · ONLY KNOWN PUSH SERVICES are ever called. The routes refuse any other
    address, and the sender checks again, because a signed-in browser can also
    insert its own row directly (033's insert rule) and must not be able to
    point this server at an address of its choosing.
  · NEVER LOGGED: an endpoint, a key, a payload or a user id. Counts and the
    push service's status code only.
  · FAIL-SOFT, like the email: without the VAPID keys, or before 033 is
    applied, nothing is sent and nothing raises.
"""
import json
import logging
import time
from urllib.parse import urlsplit

import httpx
from py_vapid import Vapid02          # installed with pywebpush (requirements.txt)
from pywebpush import WebPusher

from . import config
from .db import get_pool

log = logging.getLogger("ngw.web_push")

# How long a push service may hold a notification for a device that is off.
TTL_SECONDS = 12 * 3600

# The push services of the four browsers the owner named (Opera and Samsung
# Internet, which are Chromium, use Google's too).
PUSH_HOSTS = (
    "fcm.googleapis.com",                 # Chrome, Android Chrome
    "updates.push.services.mozilla.com",  # Firefox
    "push.apple.com",                     # Safari on a Mac (web.push.apple.com)
    "notify.windows.com",                 # Edge (wns2-*.notify.windows.com)
)

MAX_ENDPOINT = 1024


def is_configured() -> bool:
    return bool(config.VAPID_PUBLIC_KEY and config.VAPID_PRIVATE_KEY and config.VAPID_SUBJECT)


def endpoint_allowed(endpoint) -> bool:
    """True only for an https address on a known push service."""
    if not isinstance(endpoint, str) or not endpoint or len(endpoint) > MAX_ENDPOINT:
        return False
    try:
        u = urlsplit(endpoint)
        port = u.port
    except ValueError:
        return False
    host = (u.hostname or "").lower()
    if u.scheme != "https" or not host or port not in (None, 443) or u.username or u.password:
        return False
    return any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)


async def table_ready(conn) -> bool:
    return bool(await conn.fetchval("select to_regclass('public.push_subscriptions')"))


def _vapid_headers(endpoint: str) -> dict:
    u = urlsplit(endpoint)
    claims = {"sub": config.VAPID_SUBJECT, "aud": f"{u.scheme}://{u.netloc}",
              "exp": int(time.time()) + TTL_SECONDS}
    return Vapid02.from_raw(config.VAPID_PRIVATE_KEY.encode()).sign(claims)


def encrypt(row, data: bytes) -> bytes:
    sub = {"endpoint": row["endpoint"], "keys": {"p256dh": row["p256dh"], "auth": row["auth"]}}
    return WebPusher(sub).encode(data, content_encoding="aes128gcm")["body"]


async def send_to_user(user_id: str, payload: dict, transport=None) -> dict:
    """Send `payload` (a small dict, JSON-encoded) to every device the user
    turned notifications on for. Returns counts; never raises."""
    counts = {"sent": 0, "gone": 0, "failed": 0}
    try:
        if not is_configured() or not user_id:
            return counts
        data = json.dumps(payload, separators=(",", ":")).encode()
        pool = await get_pool()
        async with pool.acquire() as conn:
            if not await table_ready(conn):
                log.warning("push: migration 033 (push_subscriptions) is missing; nothing sent")
                counts["blocked"] = "033_missing"
                return counts
            rows = await conn.fetch(
                "select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = $1::uuid",
                user_id)
            if not rows:
                return counts
            async with httpx.AsyncClient(timeout=10, transport=transport) as client:
                for r in rows:
                    if not endpoint_allowed(r["endpoint"]):
                        await conn.execute("delete from public.push_subscriptions where id = $1", r["id"])
                        counts["gone"] += 1
                        continue
                    try:
                        headers = {**_vapid_headers(r["endpoint"]), "TTL": str(TTL_SECONDS),
                                   "Content-Encoding": "aes128gcm",
                                   "Content-Type": "application/octet-stream", "Urgency": "normal"}
                        resp = await client.post(r["endpoint"], content=encrypt(r, data), headers=headers)
                    except Exception as e:  # noqa: BLE001 — one device never stops the rest
                        counts["failed"] += 1
                        log.warning("push: send failed error=%s", type(e).__name__)
                        continue
                    if resp.status_code in (404, 410):
                        await conn.execute("delete from public.push_subscriptions where id = $1", r["id"])
                        counts["gone"] += 1
                    elif 200 <= resp.status_code < 300:
                        await conn.execute(
                            "update public.push_subscriptions set last_ok_at = now() where id = $1", r["id"])
                        counts["sent"] += 1
                    else:
                        counts["failed"] += 1
                        log.warning("push: refused status=%s", resp.status_code)
        log.info("push: sent=%d gone=%d failed=%d", counts["sent"], counts["gone"], counts["failed"])
    except Exception as e:  # noqa: BLE001 — fail-soft by design
        log.error("push: failed error=%s", type(e).__name__)
    return counts
