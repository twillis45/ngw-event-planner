# ── THE PASS PRICE TEST (plan item G86, owner approval 11/19/2026) ──────────
#
# "A $49 test (second Stripe price)". These pin the four things that make it
# safe to switch on:
#
#   · OFF BY DEFAULT — unset, empty, zero or malformed env charges $39;
#   · THE SPLIT IS THE SHARED RULE — the same vectors the browser's
#     src/lib/passPrice.js is held to (pass_price_vectors.json), so the price a
#     device was shown is the price its checkout charges;
#   · A MALFORMED KEY IS CHARGED $39, never refused and never a third price;
#   · THE SESSION CHARGES WHAT THE RULE SAYS, and its metadata says so too.
import asyncio
import json
import pathlib

import pytest

from app import config, main
from app.analytics import pass_purchase_payload
from app.routers import stripe_payments as SP

from test_stripe_pass_entitlement import FakeConn, _pool_of

VECTORS = json.loads((pathlib.Path(__file__).parent / "pass_price_vectors.json").read_text())


def _env(monkeypatch, cents, share):
    monkeypatch.setattr(config, "PASS_PRICE_TEST_CENTS", cents)
    monkeypatch.setattr(config, "PASS_PRICE_TEST_SHARE", share)


# ─── off by default ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("cents,share", [
    ("", ""), ("4900", ""), ("", "50"), ("4900", "0"), ("4900", "101"), ("4900", "-5"),
    ("3900", "50"),             # the control price is not a test
    ("99", "50"), ("50001", "50"), ("49.00", "50"), ("$49", "50"), ("4900", "50%"),
])
def test_the_test_is_off_unless_both_values_are_valid(monkeypatch, cents, share):
    _env(monkeypatch, cents, share)
    assert SP.pass_price_test() is None
    for row in VECTORS["keys"]:
        assert SP.pass_price_for(row["key"], SP.pass_price_test()) == (3_900, "control")


def test_the_deployed_default_is_off():
    # The module values as read from this process's environment, which sets neither.
    assert SP.pass_price_test() is None


def test_valid_values_turn_it_on(monkeypatch):
    _env(monkeypatch, "4900", "50")
    assert SP.pass_price_test() == {"cents": 4_900, "share": 50}
    _env(monkeypatch, "100", "100")
    assert SP.pass_price_test() == {"cents": 100, "share": 100}


def test_capabilities_reports_the_test_or_null(monkeypatch):
    _env(monkeypatch, "", "")
    assert asyncio.run(main.capabilities())["pass_price_test"] is None
    _env(monkeypatch, "4900", "25")
    assert asyncio.run(main.capabilities())["pass_price_test"] == {"cents": 4_900, "share": 25}


# ─── the shared rule ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("row", VECTORS["keys"], ids=lambda r: r["key"][:12])
def test_the_split_matches_the_shared_vectors(row):
    assert SP.pass_price_bucket(row["key"]) == row["bucket"]
    assert SP.pass_price_for(row["key"], VECTORS["test"]) == (row["cents"], row["variant"])


def test_the_vectors_cover_both_arms():
    # Premise: a vector file whose keys all landed on one side proves nothing.
    assert {r["variant"] for r in VECTORS["keys"]} == {"control", "test"}


@pytest.mark.parametrize("key", VECTORS["malformed"], ids=repr)
def test_a_malformed_key_gets_the_control_price(key):
    assert SP.pass_price_for(key, {"cents": 4_900, "share": 100}) == (3_900, "control")


# ─── the checkout ────────────────────────────────────────────────────────────

@pytest.fixture
def signed_in(monkeypatch):
    async def _require(authorization=None, x_planner_token=None):
        return {"id": "user-abc", "email": "host@example.com", "via": "supabase"}
    monkeypatch.setattr(SP, "require_planner", _require)
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")


def _checkout(monkeypatch, **body):
    conn = FakeConn(vals={"studio_id from public.events": "studio-1", "from studio_members": 1})
    _pool_of(conn, monkeypatch)
    captured = {}

    class _Session:
        id = "cs_new"
        url = "https://checkout.stripe.com/x"

    def _create(**kwargs):
        captured.update(kwargs)
        return _Session()

    monkeypatch.setattr(SP.stripe.checkout.Session, "create", staticmethod(_create))
    asyncio.run(SP.create_pass_session(SP.PassSessionRequest(
        event_id="cust-123",
        success_url="https://twillis45.github.io/ngw-event-planner/?paid=1",
        cancel_url="https://twillis45.github.io/ngw-event-planner/",
        **body,
    )))
    return captured["line_items"][0]["price_data"]["unit_amount"], captured["metadata"]


TEST_KEY = next(r["key"] for r in VECTORS["keys"] if r["variant"] == "test")
CONTROL_KEY = next(r["key"] for r in VECTORS["keys"] if r["variant"] == "control")


@pytest.mark.parametrize("key,cents,variant", [(TEST_KEY, 4_900, "test"), (CONTROL_KEY, 3_900, "control")])
def test_the_session_charges_what_the_rule_says(signed_in, monkeypatch, key, cents, variant):
    _env(monkeypatch, "4900", "50")
    unit, meta = _checkout(monkeypatch, price_key=key)
    assert unit == cents
    assert meta["price_cents"] == str(cents)
    assert meta["price_variant"] == variant


def test_with_the_test_off_even_a_test_key_pays_39(signed_in, monkeypatch):
    _env(monkeypatch, "", "")
    unit, meta = _checkout(monkeypatch, price_key=TEST_KEY)
    assert (unit, meta["price_cents"], meta["price_variant"]) == (3_900, "3900", "control")


@pytest.mark.parametrize("body", [{}, {"price_key": None}, {"price_key": "bad key"}, {"price_key": 4900},
                                  {"price_key": "x" * 500}])
def test_a_missing_or_malformed_key_is_charged_39_not_refused(signed_in, monkeypatch, body):
    _env(monkeypatch, "4900", "100")            # every WELL-FORMED key would pay 4900
    unit, meta = _checkout(monkeypatch, **body)
    assert (unit, meta["price_variant"]) == (3_900, "control")


def test_the_purchase_event_carries_the_arm():
    meta = {"purchased_by": "user-abc", "event_id": "cust-123", "price_variant": "test"}
    props = pass_purchase_payload(meta, 4_900, "usd")["properties"]
    assert props["amount_cents"] == 4_900
    assert props["price_variant"] == "test"
    # Anything else in that field is dropped, not forwarded.
    props = pass_purchase_payload({**meta, "price_variant": "free"}, 3_900, "usd")["properties"]
    assert "price_variant" not in props
