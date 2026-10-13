# ── THE PASS IS GRANTED BY THE WEBHOOK, OR IT IS NOT GRANTED ────────────────
#
# `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md` answered "can
# this sell the One-Event Pass?" with no, and named the reason in the words of
# the 2026-08-07 board ruling already in the router:
#
#   "There is no server-side entitlement (feeSchedule is localStorage and the
#    webhook only logs), so an anonymous purchase produces a charge and nothing
#    the host can ever recover."
#
# `public.event_passes` + the grant path in `stripe_payments.py` close that.
# These tests pin the properties that make the grant trustworthy, because every
# one of them is a way to turn a payment system into a liability:
#
#   · the PRICE cannot come from the caller          (audit gap #3)
#   · a completed-but-UNPAID session grants nothing  (async payment methods)
#   · a replayed webhook grants once, not twice      (Stripe retries)
#   · a FEE payment never grants a pass              (two products, one router)
#   · the purchase route cannot CLAIM an event       (PR #86 with a receipt)
#
# No database and no network: the pool is a fake that records the SQL it was
# handed, which is the thing under test.
import asyncio
import json

import pytest

from app.routers import stripe_payments as SP


# ─── fakes ───────────────────────────────────────────────────────────────────

class FakeRequest:
    def __init__(self, body: bytes):
        self._body = body

    async def body(self):
        return self._body


class FakeConn:
    """Records every statement. `vals`/`rows` are queued answers by substring."""

    def __init__(self, vals=None, rows=None):
        self.vals = vals or {}
        self.rows = rows or {}
        self.executed = []          # (sql, args)
        self.queried = []           # every sql seen, read or write

    def _answer(self, table, sql):
        for needle, value in table.items():
            if needle in sql:
                return value
        return None

    async def fetchval(self, sql, *args):
        self.queried.append(sql)
        return self._answer(self.vals, sql)

    async def fetchrow(self, sql, *args):
        self.queried.append(sql)
        return self._answer(self.rows, sql)

    async def execute(self, sql, *args):
        self.queried.append(sql)
        self.executed.append((sql, args))
        return "INSERT 0 1"


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        conn = self.conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *a):
                return False

        return _Ctx()


def _pool_of(conn, monkeypatch):
    async def _get_pool():
        return FakePool(conn)
    monkeypatch.setattr(SP, "get_pool", _get_pool)


def _webhook(payload: dict):
    body = json.dumps(payload).encode()
    return asyncio.run(SP.stripe_webhook(FakeRequest(body), stripe_signature=None))


def _completed(metadata, *, payment_status="paid", session_id="cs_pass_1",
               amount_total=3900, currency="usd"):
    return {
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": session_id,
            "amount_total": amount_total,
            "currency": currency,
            "payment_status": payment_status,
            "metadata": metadata,
        }},
    }


PASS_META = {
    "kind": "pass",
    "sku": "one-event-pass",
    "event_id": "cust-123",
    "studio_id": "11111111-1111-1111-1111-111111111111",
    "purchased_by": "user-abc",
}


@pytest.fixture
def dev_webhook(monkeypatch):
    """No webhook secret configured: the documented local-dev path.

    Used so these tests exercise the GRANT, not signature verification —
    which has its own suite in test_stripe_webhook_signature.py and must keep
    rejecting unsigned requests wherever a secret exists.
    """
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(SP, "STRIPE_WEBHOOK_SECRET", "")


def _inserts(conn):
    return [sql for sql, _ in conn.executed if "insert into public.event_passes" in sql]


# ─── the grant ───────────────────────────────────────────────────────────────

def test_a_paid_pass_session_writes_the_entitlement(dev_webhook, monkeypatch):
    conn = FakeConn()
    _pool_of(conn, monkeypatch)

    _webhook(_completed(PASS_META))

    assert len(_inserts(conn)) == 1, "a paid pass session must write exactly one row"
    sql, args = conn.executed[0]
    # The tenant key and the event travel through Stripe metadata because the
    # webhook has no principal — assert both land in the row.
    assert "cust-123" in args
    assert "11111111-1111-1111-1111-111111111111" in args
    assert "cs_pass_1" in args, "the session id is the idempotency key and must be stored"


def test_the_insert_is_idempotent_so_a_retry_cannot_double_grant(dev_webhook, monkeypatch):
    # Stripe redelivers until it gets a 2xx. Without ON CONFLICT the second
    # delivery is either a crash or a second row.
    conn = FakeConn()
    _pool_of(conn, monkeypatch)
    _webhook(_completed(PASS_META))
    sql = _inserts(conn)[0]
    assert "on conflict do nothing" in sql.lower()
    # Deliberately NO conflict target: it must cover BOTH unique constraints —
    # stripe_session_id (a redelivery) and event_id (a racing second session).
    assert "on conflict (" not in sql.lower().replace("on conflict do nothing", "")


def test_a_completed_but_unpaid_session_grants_nothing(dev_webhook, monkeypatch):
    # checkout.session.completed fires when the SESSION finishes; for async
    # payment methods that is before money moves.
    conn = FakeConn()
    _pool_of(conn, monkeypatch)

    _webhook(_completed(PASS_META, payment_status="unpaid"))

    assert _inserts(conn) == [], "unpaid must never produce an entitlement"


def test_a_fee_payment_never_grants_a_pass(dev_webhook, monkeypatch):
    # Two products share this router. An invoice to a host's client paying
    # $5,000 must not hand that host our $39 product.
    conn = FakeConn()
    _pool_of(conn, monkeypatch)

    _webhook(_completed({"fee_id": "fee-1"}, amount_total=500000))

    assert _inserts(conn) == [], "a fee milestone is not a pass purchase"


def test_pass_metadata_missing_the_tenant_key_grants_nothing(dev_webhook, monkeypatch):
    # Signature-verified but unusable. An entitlement with no studio has no
    # tenant key, and guessing one is how PR #86's hole worked.
    conn = FakeConn()
    _pool_of(conn, monkeypatch)

    _webhook(_completed({**PASS_META, "studio_id": ""}))

    assert _inserts(conn) == []


# ─── the price ───────────────────────────────────────────────────────────────

def test_the_pass_request_has_no_price_field_at_all():
    """Audit gap #3, closed by shape rather than by validation.

    `create-checkout-session` takes amount_cents because a planner sets their
    own fee. For a fixed-price product that same property means a buyer can
    post one cent, so the pass request must not carry the field.
    """
    fields = set(SP.PassSessionRequest.model_fields)
    assert "amount_cents" not in fields
    assert "amount" not in fields
    assert "price" not in fields
    assert fields == {"event_id", "success_url", "cancel_url"}


def test_the_pass_price_is_a_server_constant():
    assert SP.PASS_AMOUNT_CENTS == 3_900           # $39, ruling 2026-08-18/19
    assert SP.PASS_SKU == "one-event-pass"


# ─── the purchase route ──────────────────────────────────────────────────────

@pytest.fixture
def signed_in(monkeypatch):
    async def _require(authorization=None, x_planner_token=None):
        return {"id": "user-abc", "email": "host@example.com", "via": "supabase"}
    monkeypatch.setattr(SP, "require_planner", _require)
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "sk_test_x")


def _req(event_id="cust-123"):
    return SP.PassSessionRequest(
        event_id=event_id,
        success_url="https://twillis45.github.io/ngw-event-planner/?paid=1",
        cancel_url="https://twillis45.github.io/ngw-event-planner/",
    )


def _call_create(monkeypatch, conn, captured=None):
    _pool_of(conn, monkeypatch)

    class _Session:
        id = "cs_new"
        url = "https://checkout.stripe.com/x"

    def _create(**kwargs):
        if captured is not None:
            captured.update(kwargs)
        return _Session()

    monkeypatch.setattr(SP.stripe.checkout.Session, "create", staticmethod(_create))
    return asyncio.run(SP.create_pass_session(_req()))


def test_the_created_session_charges_the_server_price(signed_in, monkeypatch):
    conn = FakeConn(vals={"studio_id from public.events": "studio-1",
                          "from studio_members": 1})
    captured = {}
    out = _call_create(monkeypatch, conn, captured)

    assert out["session_id"] == "cs_new"
    unit = captured["line_items"][0]["price_data"]["unit_amount"]
    assert unit == SP.PASS_AMOUNT_CENTS
    # The tenant key must be stamped at creation — the webhook has no principal
    # and cannot derive it later.
    assert captured["metadata"]["kind"] == "pass"
    assert captured["metadata"]["studio_id"] == "studio-1"
    assert captured["metadata"]["event_id"] == "cust-123"


def test_buying_a_pass_an_event_already_has_is_refused(signed_in, monkeypatch):
    conn = FakeConn(vals={
        "studio_id from public.events": "studio-1",
        "from studio_members": 1,
        "from public.event_passes": 1,            # already held
    })
    with pytest.raises(SP.HTTPException) as e:
        _call_create(monkeypatch, conn)
    assert e.value.status_code == 409


def test_an_unsynced_event_is_refused_and_says_so(signed_in, monkeypatch):
    # No public.events row => no authoritative tenant key. Refusing with
    # "no access" would be a lie: the host does own it.
    conn = FakeConn(vals={"from studio_members": 1})       # events lookup -> None
    with pytest.raises(SP.HTTPException) as e:
        _call_create(monkeypatch, conn)
    assert e.value.status_code == 409
    assert "synced" in e.value.detail.lower()


def test_a_non_member_cannot_buy_a_pass_for_someone_elses_event(signed_in, monkeypatch):
    conn = FakeConn(vals={"studio_id from public.events": "studio-OTHER"})  # membership -> None
    with pytest.raises(SP.HTTPException) as e:
        _call_create(monkeypatch, conn)
    assert e.value.status_code == 403


def test_the_money_route_never_claims_event_ownership(signed_in, monkeypatch):
    """PR #86's hole, which this route would repeat with a receipt attached.

    `communication._assert_event_access` claims an unowned event for the
    caller's studio on first touch — correct for comms, catastrophic on a route
    that then charges a card. This asserts the purchase path issues NO write
    before Stripe is called: no event_owners insert, no studio adoption.
    """
    conn = FakeConn(vals={"studio_id from public.events": "studio-1",
                          "from studio_members": 1})
    _call_create(monkeypatch, conn)

    writes = [sql for sql, _ in conn.executed]
    assert writes == [], f"the purchase path must not write before payment: {writes}"
    assert not any("event_owners" in sql for sql in conn.queried)


# ─── the read route ──────────────────────────────────────────────────────────

def test_the_read_route_reports_held_false_without_a_row(signed_in, monkeypatch):
    conn = FakeConn(vals={"studio_id from public.events": "studio-1",
                          "from studio_members": 1})
    _pool_of(conn, monkeypatch)
    out = asyncio.run(SP.get_pass(event_id="cust-123"))
    assert out == {"event_id": "cust-123", "held": False}


def test_the_read_route_is_studio_scoped(signed_in, monkeypatch):
    # A signed-in caller must not read another studio's entitlement by event id.
    conn = FakeConn(vals={"studio_id from public.events": "studio-OTHER"})
    _pool_of(conn, monkeypatch)
    with pytest.raises(SP.HTTPException) as e:
        asyncio.run(SP.get_pass(event_id="cust-123"))
    assert e.value.status_code == 403
