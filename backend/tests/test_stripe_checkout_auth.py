# ── MINTING A CHARGE WAS ANONYMOUS ──────────────────────────────────────────
#
# `POST /api/stripe/create-checkout-session` required nothing. Anyone who could
# reach the API could mint a real Stripe Checkout session on this account with
# any amount and any label.
#
# Nothing in production could reach it THROUGH the product — the CRA sits behind
# AuthGate, and the Pages workflow forces the demo profile to ship no API base —
# so the exposure was curl, from anywhere on the internet.
#
# The board's argument for closing it: the anonymous path cannot deliver the
# product. There is no server-side entitlement (feeSchedule is localStorage; the
# webhook only logs, with a `# Future:` where the write would go), so an
# anonymous purchase produces a charge and nothing the host can recover.
import asyncio

import pytest
import stripe
from fastapi import HTTPException

from app.routers import stripe_payments as SP

GOOD_SUCCESS = "https://twillis45.github.io/ngw-event-planner/?stripe_paid=1&fee_id=abc"
GOOD_CANCEL = "https://twillis45.github.io/ngw-event-planner/?stripe_cancel=1"


def body(**kw):
    base = dict(amount_cents=25_000, label="Booking retainer", fee_id="fee-1",
                success_url=GOOD_SUCCESS, cancel_url=GOOD_CANCEL)
    base.update(kw)
    return SP.CheckoutRequest(**base)


def call(**kw):
    return asyncio.run(SP.create_checkout_session(body(**kw.pop("body_kw", {})), **kw))


@pytest.fixture
def never_charges(monkeypatch):
    """Stripe must not be reached at all on a refused request."""
    def boom(*a, **k):
        raise AssertionError("Stripe was called for a request that should have been refused")
    monkeypatch.setattr(stripe.checkout.Session, "create", boom)


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")


@pytest.fixture
def signed_in(monkeypatch):
    async def ok(auth, tok):
        return {"id": "user-1", "via": "supabase"}
    monkeypatch.setattr(SP, "require_planner", ok)


def test_unauthenticated_never_reaches_stripe(configured, never_charges):
    with pytest.raises(HTTPException) as ei:
        call(authorization=None, x_planner_token=None)
    assert ei.value.status_code == 401


def test_auth_is_checked_before_configuration(monkeypatch, never_charges):
    # Below the _configured() check, an anonymous caller learns whether this
    # deployment has Stripe wired. Nothing else pins this ordering.
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "")
    with pytest.raises(HTTPException) as ei:
        call(authorization=None, x_planner_token=None)
    assert ei.value.status_code == 401, "401 before 503 — ordering regressed"


def test_a_signed_in_planner_gets_through_to_stripe(configured, signed_in, monkeypatch):
    # The premise guard: if everything were refused, every test above would pass
    # for the wrong reason.
    seen = {}

    class S:
        id, url = "cs_1", "https://checkout.stripe.com/c/pay/cs_1"
    def create(**kw):
        seen.update(kw); return S()
    monkeypatch.setattr(stripe.checkout.Session, "create", create)
    out = call(authorization="Bearer t", x_planner_token=None)
    assert out["session_id"] == "cs_1"
    assert seen["line_items"][0]["price_data"]["unit_amount"] == 25_000


def test_the_amount_ceiling_refuses_absurd_charges(configured, signed_in, never_charges):
    with pytest.raises(HTTPException) as ei:
        call(authorization="Bearer t", body_kw={"amount_cents": 999_999_999})
    assert ei.value.status_code == 400


def test_the_ceiling_still_clears_a_real_wedding_balance(configured, signed_in, monkeypatch):
    # The planner seat's condition. A ceiling that blocks a $25,000 balance is a
    # bug, not a control — so this is the other half of the guard.
    class S:
        id, url = "cs_2", "u"
    monkeypatch.setattr(stripe.checkout.Session, "create", lambda **k: S())
    assert call(authorization="Bearer t", body_kw={"amount_cents": 2_500_000})["session_id"] == "cs_2"


def test_a_label_cannot_carry_a_multiline_message():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        body(label="x" * 400)
    with pytest.raises(ValidationError):
        body(label="")


def test_a_newline_in_the_label_is_flattened(configured, signed_in, monkeypatch):
    # The label renders as product_data.name on a Stripe-branded page in this
    # account's business name — multi-line copy there is the other half of a
    # phishing kit.
    seen = {}

    class S:
        id, url = "cs_3", "u"
    monkeypatch.setattr(stripe.checkout.Session, "create",
                        lambda **k: (seen.update(k), S())[1])
    call(authorization="Bearer t", body_kw={"label": "Retainer\nURGENT: wire funds"})
    name = seen["line_items"][0]["price_data"]["product_data"]["name"]
    assert "\n" not in name and "\r" not in name
