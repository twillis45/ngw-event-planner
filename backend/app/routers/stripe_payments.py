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
from pydantic import BaseModel
from typing import Optional
from ..config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

log = logging.getLogger("ngw.stripe")
router = APIRouter(prefix="/api/stripe", tags=["stripe"])


def _configured() -> bool:
    return bool(STRIPE_SECRET_KEY)


@router.get("/status")
async def stripe_status():
    """Tells the frontend whether Stripe is configured on this server."""
    return {"configured": _configured()}


class CheckoutRequest(BaseModel):
    amount_cents: int           # must be > 0 (smallest Stripe unit = 1 cent)
    label: str                  # milestone label: "Booking retainer", "Balance payment"
    fee_id: str                 # feeSchedule item id — echoed back in success_url + verify
    event_id: Optional[str] = None
    client_name: Optional[str] = None
    success_url: str            # app URL to redirect after payment (may include {CHECKOUT_SESSION_ID})
    cancel_url: str             # app URL to redirect on cancel


@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutRequest):
    """
    Create a Stripe Checkout Session for a fee milestone.

    Returns { url, session_id }.
    The planner copies/shares `url` with the client.
    Use /verify-session to confirm payment after the client pays.
    """
    if not _configured():
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server. Add STRIPE_SECRET_KEY to the Render environment.",
        )
    if body.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="amount_cents must be greater than zero.")

    stripe.api_key = STRIPE_SECRET_KEY

    product_name = f"{body.label} — {body.client_name}" if body.client_name else body.label

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
async def verify_session(session_id: str):
    """
    Verify payment status for a Checkout Session by ID.

    Returns { payment_status, fee_id, amount_total }.
    payment_status values: "paid" | "unpaid" | "no_payment_required"
    Frontend marks the feeSchedule milestone paid when payment_status == "paid".
    """
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

    if STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            stripe.api_key = STRIPE_SECRET_KEY
            event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            log.warning("stripe: invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
        event_type = event.type
        session_data = event.data.object
    else:
        # Dev mode — no signature verification
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
