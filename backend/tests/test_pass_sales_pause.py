# ─── PASS_SALES_PAUSED: A STOP THAT DISABLES NO CONTROL ─────────────────────
#
# Stage 9 work order #9 (11/11/2026). Before this flag the only stop-selling
# lever was removing STRIPE_SECRET_KEY, which also makes
# vendor_brief._billing_live() false — so _brief_blocked_reason returns None
# and every vendor brief becomes free. Nobody pulls a stop that disables a
# control. These tests pin that the pause stops NEW pass checkouts and nothing
# else: the brief gate, the webhook grant and the read route keep working.
import asyncio

import pytest

import app.main as main_mod
import app.routers.vendor_brief as vb_mod
from app import config
from app.routers import stripe_payments as SP

from test_stripe_pass_entitlement import (  # noqa: F401  (fixtures)
    FakeConn, PASS_META, _completed, _inserts, _pool_of, _call_create,
    _webhook, dev_webhook, signed_in,
)


@pytest.fixture
def paused(monkeypatch):
    monkeypatch.setattr(config, "PASS_SALES_PAUSED", True)


def _member_conn():
    return FakeConn(vals={"studio_id from public.events": "studio-1",
                          "from studio_members": 1})


# ─── what the pause stops ────────────────────────────────────────────────────

def test_a_paused_deployment_refuses_a_new_pass_checkout_with_503(signed_in, paused, monkeypatch):
    created = {}
    with pytest.raises(SP.HTTPException) as e:
        _call_create(monkeypatch, _member_conn(), created)
    assert e.value.status_code == 503
    assert "Pass sales are paused" in e.value.detail
    assert created == {}, "no Stripe session may be created while paused"


def test_unpaused_the_same_checkout_still_goes_through(signed_in, monkeypatch):
    monkeypatch.setattr(config, "PASS_SALES_PAUSED", False)
    out = _call_create(monkeypatch, _member_conn())
    assert out["session_id"] == "cs_new"


def test_capabilities_reports_paused_and_cannot_honour(paused, monkeypatch):
    # Both Stripe keys present: without the pause this deployment CAN sell.
    monkeypatch.setattr(main_mod, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(main_mod, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    caps = asyncio.run(main_mod.capabilities())
    assert caps["pass_sales_paused"] is True
    assert caps["stripe_can_honour_purchases"] is False
    # The pause is not a configuration fact; Stripe is still wired.
    assert caps["stripe_configured"] is True


def test_capabilities_unpaused_is_unchanged(monkeypatch):
    monkeypatch.setattr(config, "PASS_SALES_PAUSED", False)
    monkeypatch.setattr(main_mod, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(main_mod, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    caps = asyncio.run(main_mod.capabilities())
    assert caps["pass_sales_paused"] is False
    assert caps["stripe_can_honour_purchases"] is True


# ─── what the pause must NOT stop ────────────────────────────────────────────

class _BriefConn:
    """Another vendor already holds a live brief link; no pass is held."""

    async def fetchval(self, q, *a):
        return None                          # no event_passes row

    async def fetch(self, q, *a):
        if "from public.vendor_brief_links" in q:
            return [{"vendor_id": "v1"}]
        return []


def test_a_paused_sale_still_blocks_an_unpaid_second_vendor_brief(paused, monkeypatch):
    # The whole point of the work order: the pause is NOT key removal. With the
    # billing keys present the brief gate stays live and refuses vendor two.
    monkeypatch.setattr(config, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(config, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    assert vb_mod._billing_live() is True
    reason = asyncio.run(vb_mod._brief_blocked_reason(_BriefConn(), "e1", "v2", {}))
    assert reason == "second-vendor"


def test_a_paused_deployment_still_grants_a_paid_pass_from_the_webhook(dev_webhook, paused, monkeypatch):
    # A buyer who paid just before the pause must still receive the pass.
    conn = FakeConn()
    _pool_of(conn, monkeypatch)
    _webhook(_completed(PASS_META))
    assert len(_inserts(conn)) == 1


def test_a_paused_deployment_still_answers_the_read_route(signed_in, paused, monkeypatch):
    conn = FakeConn(vals={"studio_id from public.events": "studio-1",
                          "from studio_members": 1},
                    rows={"from public.event_passes": {
                        "sku": "one-event-pass", "amount_cents": 3900,
                        "currency": "usd", "purchased_at": None}})
    _pool_of(conn, monkeypatch)
    out = asyncio.run(SP.get_pass(event_id="cust-123"))
    assert out["held"] is True
