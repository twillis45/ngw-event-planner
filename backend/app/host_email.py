"""Email to a HOST about their own account: plan reminders and promotions.

Owner ruling 11/19/2026 (plan G87): "Plan reminders go to all with one-click
unsubscribe; promotions only to people who tick an unchecked opt-in at
sign-up." The attorney confirms the wording.

Nothing sends either kind yet. This module is the gate every such sender must
go through, so the split holds from the first one:

  · REMINDERS (about the host's own plans) go to every host unless they stopped
    them.
  · PROMOTIONS (offers, news) go only to a host whose account carries the
    sign-up opt-in (`marketing_opt_in.at` in the account's metadata, set from
    the unticked box on the sign-in form, which Supabase stores only when the
    account is created), who has not stopped them, and only when a postal
    mailing address is configured for the footer (US CAN-SPAM). Without one,
    no promotion goes out.
  · EVERY such email carries its own stop link and a one-click
    List-Unsubscribe header. Stopping one kind never stops the other.

The stops live in `email_stops` (migration 031) under an event id that no
event can have: a route's `{event_id}` path segment cannot contain "/", and
only the message route and this module write that table.
"""
import os
import secrets
from typing import Optional

from .config import API_PUBLIC_BASE_URL

KINDS = ("reminders", "promotions")
STOP_KEY = {"reminders": "account/reminders", "promotions": "account/promotions"}
KIND_FOR_KEY = {v: k for k, v in STOP_KEY.items()}


def mailing_address() -> str:
    return " ".join(str(os.environ.get("NGW_MAILING_ADDRESS") or "").split())


def opted_in(meta) -> bool:
    """True when the account's metadata records the sign-up opt-in."""
    m = (meta or {}).get("marketing_opt_in") if isinstance(meta, dict) else None
    return isinstance(m, dict) and bool(str(m.get("at") or "").strip())


async def host_stop_token(conn, email: str, kind: str, meta=None) -> Optional[str]:
    """The stop token for an email of this kind to this host, or None when it
    must not be sent (stopped, no opt-in, no mailing address, or 031 absent)."""
    if kind not in KINDS:
        raise ValueError(kind)
    addr = (email or "").strip().lower()
    if not addr:
        return None
    if kind == "promotions" and (not opted_in(meta) or not mailing_address()):
        return None
    if not await conn.fetchval("select to_regclass('public.email_stops')"):
        return None                     # no way to stop it, so it is not sent
    key = STOP_KEY[kind]
    row = await conn.fetchrow(
        "select token, stopped_at from public.email_stops where event_id=$1 and email=$2", key, addr)
    if row is None:
        row = await conn.fetchrow(
            """insert into public.email_stops (event_id, email, token) values ($1, $2, $3)
               on conflict (event_id, email) do update set email = excluded.email
               returning token, stopped_at""",
            key, addr, secrets.token_urlsafe(24))
    return None if row["stopped_at"] else row["token"]


def stop_url(token: str) -> str:
    return f"{API_PUBLIC_BASE_URL.rstrip('/')}/api/public/email/stop/{token}"


def headers(token: str) -> dict:
    return {"List-Unsubscribe": f"<{stop_url(token)}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


STOP_WORDS = {
    "reminders": {
        "ask": "Stop plan reminders?",
        "explain": "You won't get reminder emails about your plans. Your plans, and emails your guests send you, are not affected.",
        "button": "Stop plan reminders",
        "done": "You won't get plan reminders anymore",
        "after": "Your plans are still in the app.",
    },
    "promotions": {
        "ask": "Stop offers and news?",
        "explain": "You won't get offers or news from No Guesswork. Plan reminders are separate.",
        "button": "Stop offers and news",
        "done": "You won't get offers or news anymore",
        "after": "Plan reminders are separate and have their own stop link.",
    },
}
