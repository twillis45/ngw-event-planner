"""The server-only analytics events (owner, 11/20/2026: "Yes, build the six
events"), through app/analytics.py:

  · host_reminder_sent   — once per week-before email that went (host_reminders)
  · email_delivery       — once per Resend delivery-status CHANGE (main.resend_webhook)
  · pass_refunded / pass_disputed — on Stripe's refund and dispute webhooks

Each: the payload's shape, the studio owner's (or buyer's) HASHED label as
distinct_id and nothing identifying, nothing sent when analytics is off (no
POSTHOG_KEY, or not on Render), and a PostHog failure never fails the email,
the webhook or the block.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import asyncio
import hashlib
import json

import pytest

from app import analytics
import app.host_reminders as hr
import app.main as M
from app.routers import stripe_payments as SP

from test_week_before_reminder import Conn, Outbox, plan, TODAY
from test_stripe_pass_entitlement import FakeConn, FakePool, dev_webhook, _webhook  # noqa: F401 (fixture)

label = lambda uid: "host_" + hashlib.sha256(uid.encode()).hexdigest()[:16]  # noqa: E731


# ── PostHog, faked at the HTTP client: what capture() would have posted ─────

class Posted(list):
    pass


@pytest.fixture
def posthog(monkeypatch):
    """Analytics ON (Render, a key) with every POST recorded instead of sent."""
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setattr(analytics, "POSTHOG_KEY", "phc_test")
    posted = Posted()

    class Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json=None): posted.append(json)

    monkeypatch.setattr(analytics.httpx, "AsyncClient", Client)
    return posted


@pytest.fixture
def posthog_down(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setattr(analytics, "POSTHOG_KEY", "phc_test")

    class Down:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): raise RuntimeError("posthog down")

    monkeypatch.setattr(analytics.httpx, "AsyncClient", Down)


@pytest.fixture
def no_key(monkeypatch):
    """POSTHOG_KEY unset (empty) on Render: analytics_enabled() is false."""
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setattr(analytics, "POSTHOG_KEY", "")
    calls = []

    class Boom:
        def __init__(self, *a, **k): calls.append(1)

    monkeypatch.setattr(analytics.httpx, "AsyncClient", Boom)
    return calls


def no_pii(blob, *raw):
    s = json.dumps(blob)
    assert "@" not in s
    for r in raw:
        assert r not in s


# ── 4. host_reminder_sent ───────────────────────────────────────────────────

class OwnerConn(Conn):
    """The reminder query's rows now carry the owner's user id (the _DUE change)."""

    def __init__(self, events, owners):
        super().__init__(events)
        self.owners = owners

    async def fetch(self, q, *a):
        assert "owner_id" in q, "the due query must return the studio owner's id"
        rows = await super().fetch(q, *a)
        return [{**r, "owner_id": self.owners.get(r["id"])} for r in rows]


def remind(conn, out):
    return asyncio.run(hr.send_week_before(conn, today=TODAY, send=out))


def test_host_reminder_payload_shape():
    p = analytics.host_reminder_payload("user-owner-1")
    assert p == {"api_key": analytics.POSTHOG_KEY, "event": "host_reminder_sent",
                 "distinct_id": label("user-owner-1"), "properties": {"catch_up": False, "source": "server"}}
    assert analytics.host_reminder_payload("") is None


def test_one_host_reminder_sent_per_email_that_went(posthog):
    conn = OwnerConn({"e1": (plan(name="Ana Ruiz's 40th"), "ana@x.test"), "e2": (plan(), "b@x.test"),
                      "e3": (plan(), "c@x.test")}, {"e1": "user-ana", "e2": "user-b", "e3": "user-c"})
    out = Outbox(fail_for={"c@x.test"})
    counts = remind(conn, out)
    assert counts["sent"] == 2 and counts["failed"] == 1
    assert [p["event"] for p in posthog] == ["host_reminder_sent", "host_reminder_sent"]
    assert sorted(p["distinct_id"] for p in posthog) == sorted([label("user-ana"), label("user-b")])
    assert all(p["properties"] == {"catch_up": False, "source": "server"} for p in posthog)
    no_pii(posthog, "user-ana", "Ana Ruiz", "e1")


def test_a_catch_up_send_is_marked_catch_up(posthog):
    # e1 is 7 days out (on time); e2 is 6 days out, missed yesterday (catch-up).
    conn = OwnerConn({"e1": (plan(), "a@x.test"), "e2": (plan(date="2026-11-25"), "b@x.test")},
                     {"e1": "user-a", "e2": "user-b"})
    counts = remind(conn, Outbox())
    assert counts["sent"] == 2 and counts["catch_up"] == 1
    by_who = {p["distinct_id"]: p["properties"]["catch_up"] for p in posthog}
    assert by_who == {label("user-a"): False, label("user-b"): True}


def test_no_host_reminder_event_without_a_key(no_key):
    conn = OwnerConn({"e1": (plan(), "a@x.test")}, {"e1": "user-a"})
    out = Outbox()
    assert remind(conn, out)["sent"] == 1 and len(out.mail) == 1
    assert no_key == []


def test_posthog_down_never_fails_a_reminder(posthog_down):
    conn = OwnerConn({"e1": (plan(), "a@x.test"), "e2": (plan(), "b@x.test")}, {"e1": "user-a", "e2": "user-b"})
    out = Outbox()
    counts = remind(conn, out)
    assert counts["sent"] == 2 and counts["failed"] == 0 and len(out.mail) == 2


def test_the_open_your_plan_link_carries_the_tag_and_the_stop_link_does_not():
    _subject, body, text = hr.compose_week_before("Ana's 40th", TODAY, "tok123")
    assert hr.plan_url().endswith("/hostv2/?from=reminder")
    assert hr.plan_url() in text
    stop = [line for line in text.splitlines() if "tok123" in line]
    assert stop and all("from=reminder" not in line for line in stop)


# ── 5. email_delivery ───────────────────────────────────────────────────────

class _Req:
    def __init__(self, body: bytes):
        self._body, self.headers = body, {}

    async def body(self):
        return self._body


class HookConn:
    """event_messages rows by resend_id, each with its event's studio owner."""

    def __init__(self, rows):
        self.rows, self.updated, self.fetched = rows, [], 0

    async def fetch(self, q, *a):
        self.fetched += 1
        assert "studio_members" in q and "owner" in q
        return [{"delivery": json.dumps(r["delivery"]), "owner_id": r["owner_id"]}
                for r in self.rows if r["delivery"].get("resend_id") == a[0]]

    async def execute(self, q, *a):
        self.updated.append(a)
        for r in self.rows:
            if r["delivery"].get("resend_id") == a[1]:
                r["delivery"]["status"] = a[0]
        return "UPDATE 1"


def hook(monkeypatch, conn, event_type, email_id="re_1"):
    monkeypatch.setattr(M, "RESEND_WEBHOOK_SECRET", None, raising=False)

    class Acq:
        async def __aenter__(self): return conn
        async def __aexit__(self, *a): return False

    class Pool:
        def acquire(self): return Acq()

    async def get_pool(): return Pool()
    import app.db as DB
    monkeypatch.setattr(DB, "get_pool", get_pool, raising=False)
    body = json.dumps({"type": event_type, "data": {"email_id": email_id}}).encode()
    return asyncio.run(M.resend_webhook(_Req(body)))


ROW = lambda **d: {"owner_id": "user-owner", "delivery": {"resend_id": "re_1", "status": "accepted",  # noqa: E731
                                                        "recipient_email": "ana.ruiz@x.test", "recipient_name": "Ana Ruiz",
                                                        "subject": "Ana's 40th", **d}}


@pytest.mark.parametrize("delivery, kind", [
    ({"intent": "email", "kind": "invite"}, "invite"),
    ({"intent": "email"}, "message"),
    ({"intent": "email", "kind": "helper"}, "helper"),
    ({"intent": "cohost_invite"}, "cohost"),
    ({"intent": "approval_email"}, "approval"),
    ({}, "other"),
])
def test_email_kind_from_what_the_row_knows(delivery, kind):
    assert analytics.email_kind(delivery) == kind


def test_email_delivery_payload_shape():
    p = analytics.email_delivery_payload("user-owner", "email-bounced", ROW(intent="email", kind="invite")["delivery"])
    assert p == {"api_key": analytics.POSTHOG_KEY, "event": "email_delivery", "distinct_id": label("user-owner"),
                 "properties": {"status": "bounced", "kind": "invite", "source": "server"}}
    no_pii(p, "Ana Ruiz", "user-owner", "re_1")
    assert analytics.email_delivery_payload("user-owner", "email-opened", {}) is None     # not an outcome
    assert analytics.email_delivery_payload("user-owner", "email-accepted", {}) is None
    assert analytics.email_delivery_payload(None, "email-delivered", {}) is None          # no owner: skip


@pytest.mark.parametrize("event_type, status", [
    ("email.delivered", "delivered"), ("email.bounced", "bounced"),
    ("email.complained", "complained"), ("email.delivery_delayed", "delayed"),
])
def test_one_email_delivery_per_status_change(monkeypatch, posthog, event_type, status):
    conn = HookConn([ROW(intent="email", kind="invite")])
    assert hook(monkeypatch, conn, event_type) == {"ok": True}
    assert len(conn.updated) == 1
    assert posthog == [{"api_key": "phc_test", "event": "email_delivery", "distinct_id": label("user-owner"),
                        "properties": {"status": status, "kind": "invite", "source": "server"}}]
    no_pii(posthog, "Ana Ruiz", "user-owner")
    # A replayed callback is not a change: the row already says so.
    hook(monkeypatch, conn, event_type)
    assert len(posthog) == 1 and len(conn.updated) == 2


def test_no_event_for_opened_or_accepted_or_an_ownerless_row(monkeypatch, posthog):
    conn = HookConn([ROW(intent="email")])
    hook(monkeypatch, conn, "email.opened")
    hook(monkeypatch, conn, "email.sent")
    assert posthog == [] and conn.fetched == 0 and len(conn.updated) == 2
    orphan = HookConn([{**ROW(intent="email"), "owner_id": None}])
    hook(monkeypatch, orphan, "email.delivered")
    assert posthog == [] and len(orphan.updated) == 1


def test_no_email_delivery_without_a_key_and_no_extra_query(monkeypatch, no_key):
    conn = HookConn([ROW(intent="email")])
    assert hook(monkeypatch, conn, "email.bounced") == {"ok": True}
    assert conn.fetched == 0 and len(conn.updated) == 1 and no_key == []


def test_posthog_down_never_fails_the_webhook_or_its_write(monkeypatch, posthog_down):
    conn = HookConn([ROW(intent="email")])
    assert hook(monkeypatch, conn, "email.delivered") == {"ok": True}
    assert conn.rows[0]["delivery"]["status"] == "email-delivered"


def test_a_failed_lookup_never_stops_the_write(monkeypatch, posthog):
    class Broken(HookConn):
        async def fetch(self, q, *a): raise RuntimeError("db hiccup")

    conn = Broken([ROW(intent="email")])
    assert hook(monkeypatch, conn, "email.delivered") == {"ok": True}
    assert len(conn.updated) == 1 and posthog == []


# ── 6. pass_refunded / pass_disputed ────────────────────────────────────────

def test_reversal_payload_shape():
    p = analytics.pass_reversal_payload("pass_refunded", "user-buyer", 1000, "USD", False)
    assert p == {"api_key": analytics.POSTHOG_KEY, "event": "pass_refunded", "distinct_id": label("user-buyer"),
                 "properties": {"amount_cents": 1000, "currency": "usd", "full_or_partial": "partial", "source": "server"}}
    assert analytics.pass_reversal_payload("pass_disputed", "user-buyer", 3900, "usd", True)["properties"]["full_or_partial"] == "full"
    assert analytics.pass_reversal_payload("pass_refunded", "", 3900, "usd", True) is None
    assert analytics.pass_reversal_payload("pass_purchased", "user-buyer", 3900, "usd", True) is None


@pytest.fixture
def pass_row(monkeypatch):
    conn = FakeConn(rows={"from public.event_passes": {"purchased_by": "user-buyer", "amount_cents": 3900}})
    async def pool(): return FakePool(conn)
    monkeypatch.setattr(SP, "get_pool", pool)
    listed = SP.stripe.ListObject.construct_from(
        {"object": "list", "has_more": False, "url": "/v1/checkout/sessions",
         "data": [{"id": "cs_pass_1", "object": "checkout.session"}]}, "sk_test_x")
    monkeypatch.setattr(SP.stripe.checkout.Session, "list", lambda **kw: listed)
    return conn


@pytest.mark.parametrize("obj, event, amount, full", [
    ({"payment_intent": "pi_pass_1", "amount": 3900, "amount_refunded": 1000, "refunded": False, "currency": "usd"},
     "pass_refunded", 1000, "partial"),
    ({"payment_intent": "pi_pass_1", "amount": 3900, "amount_refunded": 3900, "refunded": True, "currency": "usd"},
     "pass_refunded", 3900, "full"),
])
def test_refunds_are_counted_full_or_partial(dev_webhook, pass_row, posthog, obj, event, amount, full):  # noqa: F811
    assert _webhook({"id": "evt_r", "type": "charge.refunded", "data": {"object": obj}}) == {"ok": True}
    assert posthog == [{"api_key": "phc_test", "event": event, "distinct_id": label("user-buyer"),
                        "properties": {"amount_cents": amount, "currency": "usd", "full_or_partial": full, "source": "server"}}]
    no_pii(posthog, "user-buyer", "pi_pass_1")


@pytest.mark.parametrize("amount, full", [(3900, "full"), (1500, "partial")])
def test_disputes_are_counted(dev_webhook, pass_row, posthog, amount, full):  # noqa: F811
    obj = {"payment_intent": "pi_pass_1", "amount": amount, "currency": "usd", "reason": "fraudulent"}
    _webhook({"id": "evt_d", "type": "charge.dispute.created", "data": {"object": obj}})
    assert [p["event"] for p in posthog] == ["pass_disputed"]
    assert posthog[0]["properties"] == {"amount_cents": amount, "currency": "usd", "full_or_partial": full, "source": "server"}
    assert posthog[0]["distinct_id"] == label("user-buyer")


def test_a_payment_with_no_pass_sends_nothing(dev_webhook, monkeypatch, posthog):  # noqa: F811
    conn = FakeConn()           # no event_passes row: a fee, or a pass never granted
    async def pool(): return FakePool(conn)
    monkeypatch.setattr(SP, "get_pool", pool)
    _webhook({"id": "evt_r", "type": "charge.refunded", "data": {"object": {"payment_intent": "pi_fee", "amount_refunded": 500}}})
    assert posthog == []


def test_unverified_refunds_are_not_counted(monkeypatch, pass_row, posthog):
    monkeypatch.setattr(SP, "STRIPE_SECRET_KEY", "test")
    monkeypatch.setattr(SP, "STRIPE_WEBHOOK_SECRET", "")
    _webhook({"type": "charge.refunded", "data": {"object": {"payment_intent": "pi_pass_1", "refunded": True,
                                                             "amount_refunded": 3900}}}, stripe_signature=None)
    assert posthog == []


def test_no_reversal_event_without_a_key(dev_webhook, pass_row, no_key):  # noqa: F811
    _webhook({"id": "evt_r", "type": "charge.refunded", "data": {"object": {
        "payment_intent": "pi_pass_1", "amount_refunded": 3900, "refunded": True, "currency": "usd"}}})
    assert no_key == []
    assert not any("event_passes" in q and "purchased_by" in q for q in pass_row.queried)


def test_posthog_down_never_fails_the_refund_webhook_or_its_block(dev_webhook, pass_row, posthog_down):  # noqa: F811
    out = _webhook({"id": "evt_r", "type": "charge.refunded", "data": {"object": {
        "payment_intent": "pi_pass_1", "amount_refunded": 3900, "refunded": True, "currency": "usd"}}})
    assert out == {"ok": True}
    assert any("insert into public.pass_payment_blocks" in sql for sql, _ in pass_row.executed)
