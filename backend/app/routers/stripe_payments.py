"""
Stripe Checkout integration — Sprint 64.

Creates hosted checkout sessions for planner fee milestones. The planner
shares the Stripe URL with the client; the client pays on Stripe's
PCI-compliant hosted page. The planner then verifies payment status and
the fee milestone is marked paid.

CTA truthfulness:
  POST /api/stripe/create-checkout-session → DONE  (real Stripe session created)
  GET  /api/stripe/verify-session          → DONE  (actual Stripe payment_status)
  POST /api/stripe/webhook                 → DONE  (Stripe-signed event, logged)

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

log = logging.getLogger("ngw.stripe")
router = APIRouter(prefix="/api/stripe", tags=["stripe"])


def _configured() -> bool:
    return bool(STRIPE_SECRET_KEY)


@router.get("/status")
async def stripe_status():
    """Tells the frontend whether Stripe is configured on this server."""
    return {"configured": _configured()}


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
        fee_id  = (session_data.get("metadata") or {}).get("fee_id")
        sess_id = session_data.get("id")
        amount  = session_data.get("amount_total")
        log.info("stripe: payment completed fee_id=%s session=%s amount=%s", fee_id, sess_id, amount)
        # Future: update Supabase client record here when feeSchedule moves server-side.

    return {"ok": True}
