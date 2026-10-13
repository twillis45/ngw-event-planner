"""
Stripe Checkout integration — Sprint 64.

Creates hosted checkout sessions for planner fee milestones. The planner
shares the Stripe URL with the client; the client pays on Stripe's
PCI-compliant hosted page. The planner then verifies payment status and
the fee milestone is marked paid.

TWO PRODUCTS LIVE HERE, and conflating them is the mistake to avoid:

  1. A FEE MILESTONE — the planner invoices their own CLIENT. The caller sets
     the amount, because the planner decides the fee.
  2. THE ONE-EVENT PASS — the host buys our product, $39, fixed server-side.
     Added 2026-10-13, after the 2026-10-03 readiness audit found the Stripe
     integration "live, hardened and working — for a different job" (1) and
     unable to sell (2) at all. Separate route, separate grant path, no price
     parameter.

CTA truthfulness:
  POST /api/stripe/create-checkout-session → DONE  (real Stripe session created)
  POST /api/stripe/create-pass-session     → DONE  (real session, server-set price)
  GET  /api/stripe/pass                    → DONE  (reads the entitlement row)
  GET  /api/stripe/verify-session          → DONE  (actual Stripe payment_status)
  POST /api/stripe/webhook                 → DONE  (Stripe-signed; GRANTS the pass)

The entitlement table is `public.event_passes`
(`supabase/migrations/017_event_passes.sql`). Nothing else writes it, and no
client can: RLS is on with no policy, so only this service reaches it.

Setup (Render dashboard):
  STRIPE_SECRET_KEY     = sk_live_...  (or sk_test_... for test mode)
  STRIPE_WEBHOOK_SECRET = whsec_...    (from Stripe Dashboard → Webhooks)

Stripe webhook endpoint to configure:
  URL:    https://ngw-events-api.onrender.com/api/stripe/webhook
  Events: checkout.session.completed
"""

import json
import logging
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional
from ..config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from ..auth import require_planner
from ..app_origins import is_app_redirect
from ..db import get_pool

log = logging.getLogger("ngw.stripe")
router = APIRouter(prefix="/api/stripe", tags=["stripe"])

# ─── THE ONE-EVENT PASS — ONE PRICE, ONE SKU, SET HERE AND NOWHERE ELSE ──────
#
# `create-checkout-session` below takes `amount_cents` FROM THE CALLER, which is
# correct for what it does: a planner invoicing their own client sets the fee.
# The 2026-10-03 checkout-readiness audit named that same property a defect for
# a fixed-price product — "a buyer could post one cent" — and it is right.
#
# Both are true because they are two different products, so this is a SEPARATE
# ROUTE rather than a mode flag on that one. The pass route has no price
# parameter to abuse, and the invoicing contract the frozen CRA shell depends on
# is untouched. A flag would have put a fixed-price product one boolean away
# from a caller-priced one.
PASS_SKU = "one-event-pass"
PASS_AMOUNT_CENTS = 3_900          # $39, board ruling 2026-08-18, amended 08-19
PASS_LABEL = "No Guesswork Events — One-Event Pass"

# This number also ships as COPY on the pass sheet. If it ever changes, the
# sheet and this constant move in the same commit or the product quotes a price
# it will not charge; the fourth sitting's standing commitments (no vendor-side
# fees while that sentence ships) are governed the same way — copy first.
PASS_METADATA_KIND = "pass"        # how the webhook tells a pass from a fee


async def _studio_for_event(conn, event_id: str, principal: dict) -> str:
    """Resolve the event's OWNING studio, or refuse. Money-route strictness.

    This is deliberately STRICTER than `communication._assert_event_read_access`
    rather than a reuse of it, and the difference is the point: that helper
    falls back to the legacy `event_owners` table when `public.events` has no
    row, because comms and RSVP must keep working for events that predate the
    studio migration. A purchase has no such history to honour.

    So the rule here is: the event must have a `public.events` row, and the
    caller must be a member of the studio that row names. No fallback, no
    first-touch claim, and never the CALLER's own studio as a stand-in.

    That last clause is the one with scar tissue. PR #86 closed a hole where
    per-user ownership was consulted first, letting a planner from another
    studio claim an event by knowing its id — 58 events in production had no
    owner row on 2026-10-11. Claiming on a route that then CHARGES A CARD would
    be the same bug with a receipt attached.

    An event that has not synced to Postgres yet is refused with its own status
    and a message that says so, because "you don't have access" would be a lie:
    the host does own it, the server simply has never seen it.
    """
    # Local dev only, gated by ALLOW_DEV_TOKEN inside require_planner.
    if principal.get("via") == "dev_token":
        return "dev-studio"

    uid = principal.get("id")
    if not uid:
        raise HTTPException(status_code=403, detail="Signed-in identity required.")

    studio_id = await conn.fetchval(
        "select studio_id from public.events where id=$1", event_id)
    if studio_id is None:
        raise HTTPException(
            status_code=409,
            detail="This event has not synced to the server yet. Open it once while "
                   "signed in, then try again.",
        )

    member = await conn.fetchval(
        "select 1 from studio_members where studio_id=$1 and user_id=$2", studio_id, uid)
    if not member:
        raise HTTPException(status_code=403, detail="You don't have access to this event.")

    return str(studio_id)


def _configured() -> bool:
    return bool(STRIPE_SECRET_KEY)


@router.get("/status")
async def stripe_status():
    """Tells the frontend whether Stripe is configured on this server.

    `webhook_verified` is the operator-visible answer to "can this deployment
    honour a purchase?", added 2026-10-13 when the webhook started writing
    entitlements. Until then the only consequence of a missing signing secret
    was an unverified log line; now it is the difference between a paid pass
    being recorded and the grant being refused outright (see the webhook).

    IT IS HERE BECAUSE NOTHING COULD ANSWER IT. `STRIPE_WEBHOOK_SECRET` is read
    from the environment and is **not declared in render.yaml**, so no file in
    this repo can say whether it was ever set by hand — the same blind spot
    `/api/food-prices/status` exists for, and it was logged as "unattested" in
    `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md` for exactly
    this reason. One curl now answers it instead of a dashboard login.

    Booleans only, never the values. Public like the other operator probes: the
    grant is gated on verification, so learning that a secret is absent buys an
    attacker nothing it can act on.
    """
    return {
        "configured": _configured(),
        "webhook_verified": bool(STRIPE_WEBHOOK_SECRET),
        # Both must be true before a purchase can be honoured end to end.
        "can_honour_purchases": bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET),
    }


# A per-charge sanity ceiling, NOT a business limit — the planner seat's note
# was that it has to clear a real wedding balance, so $100k rather than $5k.
MAX_AMOUNT_CENTS = 10_000_000


class CheckoutRequest(BaseModel):
    amount_cents: int           # must be > 0 (smallest Stripe unit = 1 cent)
    # `label` is rendered as product_data.name on a Stripe-hosted page carrying
    # this account's business name, so it is attacker-controlled display copy on
    # a genuine payment page. Bounded and single-line; the redirect check below
    # closes the other half of that kit.
    label: str = Field(min_length=1, max_length=120)
    fee_id: str                 # feeSchedule item id — echoed back in success_url + verify
    event_id: Optional[str] = None
    client_name: Optional[str] = None
    success_url: str            # app URL to redirect after payment (may include {CHECKOUT_SESSION_ID})
    cancel_url: str             # app URL to redirect on cancel


@router.post("/create-checkout-session")
async def create_checkout_session(
    body: CheckoutRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """
    Create a Stripe Checkout Session for a fee milestone.

    Returns { url, session_id }.
    The planner copies/shares `url` with the client.
    Use /verify-session to confirm payment after the client pays.
    """
    # ── THIS WAS ANONYMOUS (board ruling, 2026-08-07) ────────────────────────
    # Anyone who could reach the API could mint a real Stripe Checkout session
    # on this account with any amount and any label. Nothing in production could
    # reach it THROUGH the product — the CRA sits behind AuthGate and the demo
    # profile ships no API base — so the exposure was curl, from anywhere.
    #
    # The argument that settled it: the anonymous path cannot deliver the
    # product. There is no server-side entitlement (feeSchedule is localStorage
    # and the webhook only logs), so an anonymous purchase produces a charge and
    # nothing the host can ever recover. Keeping it open preserved a flow that
    # would be a support incident if anyone used it.
    #
    # AUTH BEFORE CONFIGURATION, deliberately: below the _configured() check an
    # anonymous caller learns whether this deployment has Stripe wired.
    await require_planner(authorization, x_planner_token)

    if not _configured():
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server. Add STRIPE_SECRET_KEY to the Render environment.",
        )
    if body.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="amount_cents must be greater than zero.")
    if body.amount_cents > MAX_AMOUNT_CENTS:
        raise HTTPException(status_code=400, detail="Amount exceeds the per-charge ceiling.")

    # The redirect targets were accepted unvalidated, which let a caller produce
    # a GENUINE Stripe page on this account that redirects anywhere on
    # completion. The allowlist is the CORS one — it already exists, already has
    # a safe non-empty default, and already gates every browser caller.
    for field, value in (("success_url", body.success_url), ("cancel_url", body.cancel_url)):
        if not is_app_redirect(value):
            # Names the field, never the allowlist: the caller learns it was
            # refused, not what would have been accepted.
            raise HTTPException(status_code=400, detail=f"{field} must point at this application.")

    stripe.api_key = STRIPE_SECRET_KEY

    # Single-line: a newline here becomes multi-line copy on a Stripe-branded page.
    safe_label = body.label.replace("\n", " ").replace("\r", " ").strip()
    product_name = f"{safe_label} — {body.client_name}" if body.client_name else safe_label

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": product_name},
                    "unit_amount": body.amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            metadata={
                "fee_id":     body.fee_id,
                "event_id":   body.event_id   or "",
                "client_name": body.client_name or "",
            },
        )
        log.info(
            "stripe: session created id=%s fee_id=%s amount=%d",
            session.id, body.fee_id, body.amount_cents,
        )
        return {"url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        log.error("stripe: create-checkout-session error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


class PassSessionRequest(BaseModel):
    event_id: str
    success_url: str            # app URL (may include {CHECKOUT_SESSION_ID})
    cancel_url: str
    # NOTE what is absent: no amount, no label. Both are set server-side. The
    # caller names WHICH EVENT it is buying for and nothing about the price.


@router.post("/create-pass-session")
async def create_pass_session(
    body: PassSessionRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Start checkout for the One-Event Pass on a specific event.

    Returns { url, session_id }. The pass is GRANTED by the webhook below, never
    by this route and never by the browser's return trip — see the webhook's own
    note on why the redirect is not evidence of payment.
    """
    # AUTH BEFORE CONFIGURATION, for the reason the route above states: below
    # the _configured() check an anonymous caller learns whether this deployment
    # has Stripe wired.
    principal = await require_planner(authorization, x_planner_token)

    if not _configured():
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server. Add STRIPE_SECRET_KEY to the Render environment.",
        )

    for field, value in (("success_url", body.success_url), ("cancel_url", body.cancel_url)):
        if not is_app_redirect(value):
            raise HTTPException(status_code=400, detail=f"{field} must point at this application.")

    pool = await get_pool()
    async with pool.acquire() as conn:
        studio_id = await _studio_for_event(conn, body.event_id, principal)

        # ALREADY PAID? Refuse rather than take the money. The pass is per-event
        # and one row can exist, so a second purchase could only ever be a
        # double charge for something the host already owns.
        held = await conn.fetchval(
            "select 1 from public.event_passes where event_id=$1", body.event_id)
        if held:
            raise HTTPException(
                status_code=409,
                detail="This event already has a pass. Nothing more to buy.",
            )

    stripe.api_key = STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": PASS_LABEL},
                    "unit_amount": PASS_AMOUNT_CENTS,     # server-set, not caller-set
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            # ── WHY THE TENANT KEY TRAVELS THROUGH STRIPE ────────────────────
            # The webhook has NO authenticated principal: it arrives from
            # Stripe carrying a signature and this metadata, and nothing else.
            # So the two facts needed to write an entitlement — which event and
            # which studio — have to be stamped HERE, where a principal exists
            # and membership has just been checked, and read back there.
            #
            # They are not caller-supplied in any meaningful sense: studio_id
            # came from public.events a moment ago, and the signature proves
            # Stripe is handing back metadata we ourselves wrote.
            metadata={
                "kind":        PASS_METADATA_KIND,
                "sku":         PASS_SKU,
                "event_id":    body.event_id,
                "studio_id":   studio_id,
                "purchased_by": principal.get("id") or "",
            },
        )
        log.info(
            "stripe: pass session created id=%s event=%s studio=%s",
            session.id, body.event_id, studio_id,
        )
        return {"url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        log.error("stripe: create-pass-session error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pass")
async def get_pass(
    event_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Does this event hold a pass? The server's answer, for `passGate`.

    Studio-scoped: the same membership check the purchase route runs, so a
    signed-in caller cannot read another studio's entitlements by event id.

    This route does NOT require Stripe to be configured — an entitlement is a
    row in our database, and whether it can be read has nothing to do with
    whether new ones can currently be sold.
    """
    principal = await require_planner(authorization, x_planner_token)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await _studio_for_event(conn, event_id, principal)
        row = await conn.fetchrow(
            """select sku, amount_cents, currency, purchased_at
                 from public.event_passes where event_id=$1""",
            event_id,
        )

    if row is None:
        return {"event_id": event_id, "held": False}
    return {
        "event_id":     event_id,
        "held":         True,
        "sku":          row["sku"],
        "amount_cents": row["amount_cents"],
        "currency":     row["currency"],
        "purchased_at": row["purchased_at"].isoformat() if row["purchased_at"] else None,
    }


@router.get("/verify-session")
async def verify_session(
    session_id: str,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """
    Verify payment status for a Checkout Session by ID.

    Returns { payment_status, fee_id, amount_total }.
    payment_status values: "paid" | "unpaid" | "no_payment_required"
    Frontend marks the feeSchedule milestone paid when payment_status == "paid".

    SECURITY (2026-08-21, stage-5 sweep): the client has sent signed-in auth
    here since 2026-08-07 — the backend just never required it, leaving
    payment_status/fee_id/amount readable by anyone holding a session id.
    Session ids are unguessable, but the 2026-08-07 ruling said every stripe
    route is signed-in-only; now the server enforces what the client claimed.
    """
    await require_planner(authorization, x_planner_token)
    if not _configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured.")

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "session_id":     session.id,
            "payment_status": session.payment_status,
            "amount_total":   session.amount_total,
            "currency":       session.currency,
            "fee_id":         session.metadata.get("fee_id"),
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Stripe session not found.")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    """
    Receive Stripe webhook events (checkout.session.completed).

    Configure in Stripe Dashboard → Webhooks:
      URL:    https://ngw-events-api.onrender.com/api/stripe/webhook
      Events: checkout.session.completed

    The frontend uses /verify-session for immediate status checks.
    This endpoint logs completions and is the hook point for future
    Supabase writes when the data model moves server-side.
    """
    if not _configured():
        return {"ok": True}

    payload = await request.body()

    # ── A MISSING SIGNATURE USED TO BE A FREE PASS (fixed 2026-08-07) ────────
    # The condition here was `if STRIPE_WEBHOOK_SECRET and stripe_signature:`,
    # with an else branch commented "Dev mode — no signature verification" that
    # json.loads()'d the body and trusted it.
    #
    # Both halves of that `and` were attacker-controlled in effect: a caller who
    # simply OMITTED the stripe-signature header fell straight into the
    # unverified branch, even on a deployment where the secret WAS configured.
    # Forging a checkout.session.completed was a request with no header.
    #
    # Today the handler only logs, so the blast radius is a false payment record
    # in the logs — but the docstring names this the hook point for Supabase
    # writes when feeSchedule moves server-side, and at that point the same
    # request marks a fee paid.
    #
    # The rule now: if a secret is configured, the signature is REQUIRED. The
    # unverified path survives only for a deployment with no secret at all,
    # which is a genuine local dev box, and it says so in the log.
    # ── THE COMMENT ABOVE CAME TRUE ON 2026-10-13 ────────────────────────────
    # "Today the handler only logs, so the blast radius is a false payment
    #  record in the logs — but the docstring names this the hook point for
    #  Supabase writes when feeSchedule moves server-side, and at that point the
    #  same request marks a fee paid."
    #
    # That point arrived. `_grant_pass` below writes `public.event_passes`, so
    # on a deployment with STRIPE_SECRET_KEY set and STRIPE_WEBHOOK_SECRET
    # UNSET, an unauthenticated POST to this route would mint a One-Event Pass
    # for any event in any studio — every fact the grant needs (event_id,
    # studio_id, payment_status) comes out of the body. Yesterday that request
    # produced a log line; today it would produce an entitlement.
    #
    # STRIPE_WEBHOOK_SECRET is not declared in render.yaml, so nothing in this
    # repo can say whether it is set in production. That makes "it is probably
    # configured" the only thing standing between this route and free passes,
    # which is not a control.
    #
    # So the grant is now gated on VERIFICATION, not on environment: the
    # unverified path still exists for a genuine local dev box, still says so,
    # and still logs the event — it simply cannot hand out an entitlement. A
    # dev who needs to exercise the grant runs `stripe listen`, which issues a
    # real whsec_ and is the documented way to do it anyway.
    verified = False
    if STRIPE_WEBHOOK_SECRET:
        if not stripe_signature:
            log.warning("stripe: webhook rejected — no stripe-signature header")
            raise HTTPException(status_code=400, detail="Missing Stripe signature.")
        try:
            stripe.api_key = STRIPE_SECRET_KEY
            event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            log.warning("stripe: invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
        event_type = event.type
        session_data = event.data.object
        verified = True
    else:
        # No secret configured — local dev only. Unverified, and loud about it.
        log.warning(
            "stripe: STRIPE_WEBHOOK_SECRET is unset — accepting an UNVERIFIED webhook. "
            "This must never be the case on a deployed environment."
        )
        data = json.loads(payload)
        event_type   = data.get("type", "")
        session_data = data.get("data", {}).get("object", {})

    log.info("stripe: webhook %s", event_type)

    if event_type == "checkout.session.completed":
        meta    = session_data.get("metadata") or {}
        sess_id = session_data.get("id")
        amount  = session_data.get("amount_total")

        if meta.get("kind") == PASS_METADATA_KIND:
            # AN ENTITLEMENT IS NEVER GRANTED FROM AN UNVERIFIED BODY. See the
            # note above the verification block: this is the one branch here
            # with real blast radius, and `verified` is false only where no
            # signing secret exists at all.
            if not verified:
                log.error(
                    "stripe: REFUSING to grant a pass from an UNVERIFIED webhook "
                    "(event=%s session=%s). Set STRIPE_WEBHOOK_SECRET on this "
                    "deployment — until it is set, no purchase can be honoured here.",
                    meta.get("event_id"), sess_id,
                )
            else:
                await _grant_pass(meta, session_data, sess_id, amount)
        else:
            fee_id = meta.get("fee_id")
            log.info("stripe: payment completed fee_id=%s session=%s amount=%s", fee_id, sess_id, amount)
            # Future: update Supabase client record here when feeSchedule moves server-side.

    return {"ok": True}


async def _grant_pass(meta: dict, session_data, sess_id, amount) -> None:
    """Write the entitlement. THE ONLY PLACE A PASS IS EVER GRANTED.

    ── WHY NOT ON THE BROWSER'S RETURN TRIP ────────────────────────────────────
    `success_url` carries `{CHECKOUT_SESSION_ID}` and the app calls
    /verify-session with it, which is how the UI learns the payment landed. That
    is a good UX signal and a bad grant: the user controls when (and whether)
    their browser comes back, so a closed tab would mean a charge with no pass.
    The webhook arrives regardless, is signature-verified, and retries until we
    acknowledge it. So: the redirect informs, the webhook entitles.

    ── WHY THIS ONE REFUSES TO SWALLOW ITS ERRORS ──────────────────────────────
    The fee branch above logs and returns {"ok": True} whatever happens, which
    is right for a log line. It is wrong here. If this write fails and we still
    answer 2xx, Stripe considers the event delivered and never retries — and a
    customer has paid for a pass that does not exist, with no mechanism left to
    repair it. That is precisely the "charge and nothing the host can ever
    recover" the 2026-08-07 ruling refused.

    So an exception here propagates to a 500 and Stripe redelivers. A failed
    grant must look like a failure. `db.py` carries a sibling lesson worth
    naming: a writer that swallowed its errors (the price-observation path) made
    a broken pool look like a working system for exactly this reason.
    """
    # ASYNC PAYMENT METHODS COMPLETE UNPAID. `checkout.session.completed` fires
    # when the session finishes, which for some methods is before money moves;
    # only `payment_status == "paid"` means paid. We request card only, so this
    # should not trigger — "should not" is why it is checked rather than assumed.
    status = session_data.get("payment_status")
    if status != "paid":
        log.warning(
            "stripe: pass session %s completed but payment_status=%s — no grant written",
            sess_id, status,
        )
        return

    event_id  = meta.get("event_id")
    studio_id = meta.get("studio_id")
    if not event_id or not studio_id:
        # Signature-verified but missing what an entitlement needs. Loud, and
        # NOT retried: redelivering identical metadata cannot fix it.
        log.error(
            "stripe: pass session %s has kind=pass but event_id=%r studio_id=%r — no grant",
            sess_id, event_id, studio_id,
        )
        return

    pool = await get_pool()
    async with pool.acquire() as conn:
        # `on conflict do nothing` WITHOUT a target, covering BOTH unique
        # constraints: stripe_session_id (the same event redelivered — Stripe
        # retries until acknowledged) and event_id (a second session for an
        # event that already has a pass, which the purchase route refuses but a
        # race could still produce). Either way the first grant stands and the
        # replay is a no-op rather than a crash or a second row.
        await conn.execute(
            """insert into public.event_passes
                   (event_id, studio_id, sku, amount_cents, currency,
                    stripe_session_id, purchased_by)
               values ($1, $2, $3, $4, $5, $6, $7)
               on conflict do nothing""",
            event_id,
            studio_id,
            meta.get("sku") or PASS_SKU,
            amount if amount is not None else PASS_AMOUNT_CENTS,
            (session_data.get("currency") or "usd"),
            sess_id,
            meta.get("purchased_by") or None,
        )

    log.info(
        "stripe: PASS GRANTED event=%s studio=%s session=%s amount=%s",
        event_id, studio_id, sess_id, amount,
    )
