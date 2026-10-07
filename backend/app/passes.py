"""Server-side entitlement: who paid for what.

THE GAP THIS CLOSES, stated by the 2026-08-07 board ruling that is still
quoted in stripe_payments.py: "There is no server-side entitlement
(feeSchedule is localStorage and the webhook only logs), so an anonymous
purchase produces a charge and nothing the host can ever recover."

Stripe was configured in production the whole time. Nothing recorded a sale.

TWO PROPERTIES THIS MODULE EXISTS FOR, and both are about money:

  IDEMPOTENT. Stripe retries a webhook until it gets a 2xx, so the same
  checkout.session.completed arrives repeatedly as normal operation. The
  Stripe session id is the primary key, so a replay is `on conflict do
  nothing` -- a no-op by construction rather than by a flag somebody has to
  remember to check.

  IT NEVER INVENTS A PASS. Every failure path here returns "no pass", never
  "pass". A database outage must not hand out the product, and it must not
  take it away silently either -- `holds_pass` raising is the caller's
  signal, not something this module swallows into a confident False.
"""
from __future__ import annotations

import logging
from typing import Optional

from .db import get_pool

log = logging.getLogger("ngw.passes")

PAID = "paid"
REFUNDED = "refunded"


async def grant(
    *,
    session_id: str,
    user_id: str,
    event_id: Optional[str] = None,
    amount_cents: Optional[int] = None,
    currency: str = "usd",
    product_label: Optional[str] = None,
) -> bool:
    """Record a completed purchase. True when this call created the row.

    False means the row already existed -- a Stripe retry -- which is a
    SUCCESS, not a failure. The caller must still answer 2xx or Stripe keeps
    retrying forever.
    """
    if not session_id or not user_id:
        # Refusing is the honest answer: a pass with no owner cannot be read
        # back by anyone, so writing it would only look like success.
        log.warning("passes: refusing to grant without session_id and user_id")
        return False
    pool = await get_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            insert into passes (id, user_id, event_id, amount_cents, currency,
                                product_label, status)
            values ($1, $2, $3, $4, $5, $6, 'paid')
            on conflict (id) do nothing
            returning id
            """,
            session_id, user_id, event_id, amount_cents, currency, product_label,
        )
    created = row is not None
    log.info("passes: grant session=%s user=%s event=%s created=%s",
             session_id, user_id, event_id, created)
    return created


async def refund(session_id: str) -> bool:
    """Mark a pass refunded. The row stays -- the money moved either way."""
    if not session_id:
        return False
    pool = await get_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow(
            "update passes set status = 'refunded', updated_at = now() "
            "where id = $1 and status <> 'refunded' returning id",
            session_id,
        )
    return row is not None


async def holds_pass(user_id: str, event_id: Optional[str] = None) -> bool:
    """Does this user hold a PAID pass for this event?

    A refunded pass is not a pass. Scoped to the caller's own user_id by the
    endpoint above it -- this function never decides who is asking.
    """
    if not user_id:
        return False
    pool = await get_pool()
    async with pool.acquire() as con:
        if event_id:
            row = await con.fetchrow(
                "select 1 from passes where user_id = $1 and event_id = $2 "
                "and status = 'paid' limit 1",
                user_id, event_id,
            )
        else:
            row = await con.fetchrow(
                "select 1 from passes where user_id = $1 and status = 'paid' limit 1",
                user_id,
            )
    return row is not None


async def list_for_user(user_id: str) -> list[dict]:
    """Every pass this user holds, newest first. For a receipts view."""
    if not user_id:
        return []
    pool = await get_pool()
    async with pool.acquire() as con:
        rows = await con.fetch(
            "select id, event_id, status, amount_cents, currency, product_label, "
            "created_at from passes where user_id = $1 order by created_at desc",
            user_id,
        )
    return [dict(r) for r in rows]
