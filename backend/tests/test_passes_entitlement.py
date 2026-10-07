"""Server-side entitlement -- the gap the 2026-10-03 Stripe audit named.

The 2026-08-07 board ruling, still quoted in stripe_payments.py: "There is no
server-side entitlement (feeSchedule is localStorage and the webhook only
logs), so an anonymous purchase produces a charge and nothing the host can
ever recover."

Two properties carry the money, and both are tested here rather than assumed.
"""
import asyncio

import pytest
from app import passes


class _Con:
    """One asyncpg connection, backed by a dict -- and FAITHFUL TO THE SQL.

    THE FIRST VERSION OF THIS WAS VACUOUS, and the red-proof caught it. It
    hard-coded `if sid in store: return None`, so it tested its own
    self-consistency: deleting `on conflict (id) do nothing` from passes.py
    changed nothing and all six tests stayed green. A fake that reimplements
    the behaviour under test proves only that the fake agrees with itself.

    So it READS the statement it is given. Conflict-skipping happens only
    when the SQL says `on conflict`; the paid filter applies only when the
    SQL says `status = 'paid'`. Remove either from passes.py and these tests
    go red, which is the whole point of having them.
    """
    def __init__(self, store): self.store = store

    async def fetchrow(self, sql, *args):
        s = " ".join(sql.split()).lower()
        if s.startswith("insert into passes"):
            sid = args[0]
            if sid in self.store:
                # Only the clause makes a replay a no-op. Without it, the
                # insert overwrites -- which is what a real table WITHOUT the
                # constraint would do to the row's created_at and status.
                if "on conflict" in s:
                    return None
            self.store[sid] = {
                "id": sid, "user_id": args[1], "event_id": args[2],
                "amount_cents": args[3], "currency": args[4],
                "product_label": args[5], "status": "paid",
            }
            return {"id": sid}
        if s.startswith("update passes set status = 'refunded'"):
            row = self.store.get(args[0])
            guarded = "status <> 'refunded'" in s
            if not row or (guarded and row["status"] == "refunded"):
                return None
            row["status"] = "refunded"
            return {"id": args[0]}
        if s.startswith("select 1 from passes"):
            paid_only = "status = 'paid'" in s
            by_event = "event_id = $2" in s
            for r in self.store.values():
                if r["user_id"] != args[0]:
                    continue
                if by_event and r["event_id"] != args[1]:
                    continue
                if paid_only and r["status"] != "paid":
                    continue
                return {"?column?": 1}
            return None
        raise AssertionError("unexpected sql: " + s[:80])

    async def fetch(self, sql, *args):
        return [r for r in self.store.values() if r["user_id"] == args[0]]


class _Pool:
    def __init__(self, store): self.store = store
    def acquire(self):
        con = _Con(self.store)
        class _Ctx:
            async def __aenter__(s): return con
            async def __aexit__(s, *a): return False
        return _Ctx()


@pytest.fixture
def store(monkeypatch):
    data = {}
    async def fake_pool(): return _Pool(data)
    monkeypatch.setattr(passes, "get_pool", fake_pool)
    return data


# ── THE PROPERTY THAT CARRIES THE MONEY ───────────────────────────────────
# Stripe retries a webhook until it gets a 2xx, so the SAME
# checkout.session.completed arrives repeatedly as normal operation. The
# session id is the primary key precisely so a replay is a no-op by
# construction rather than by a flag somebody has to remember to check.
def test_a_stripe_retry_cannot_grant_twice(store):
    first = asyncio.run(passes.grant(session_id="cs_1", user_id="u1", event_id="e1", amount_cents=3900))
    again = asyncio.run(passes.grant(session_id="cs_1", user_id="u1", event_id="e1", amount_cents=3900))
    assert first is True
    assert again is False, "a retry must not create a second pass"
    assert len(store) == 1
    # And the host still holds exactly the one thing they bought.
    assert asyncio.run(passes.holds_pass("u1", "e1")) is True


def test_a_pass_is_scoped_to_its_event(store):
    asyncio.run(passes.grant(session_id="cs_1", user_id="u1", event_id="e1"))
    assert asyncio.run(passes.holds_pass("u1", "e1")) is True
    # It is a ONE-EVENT pass. Paying for one event is not paying for all.
    assert asyncio.run(passes.holds_pass("u1", "e2")) is False


def test_a_pass_is_scoped_to_its_owner(store):
    asyncio.run(passes.grant(session_id="cs_1", user_id="u1", event_id="e1"))
    assert asyncio.run(passes.holds_pass("u2", "e1")) is False


# A refunded pass is not a pass -- but the row stays, because "did this
# person ever pay?" is the question support actually asks.
def test_a_refund_revokes_access_and_keeps_the_record(store):
    asyncio.run(passes.grant(session_id="cs_1", user_id="u1", event_id="e1"))
    assert asyncio.run(passes.refund("cs_1")) is True
    assert asyncio.run(passes.holds_pass("u1", "e1")) is False
    assert store["cs_1"]["status"] == "refunded"
    # Refunding twice is not an error, and not a second event either.
    assert asyncio.run(passes.refund("cs_1")) is False


# ── IT MUST NEVER INVENT A PASS ───────────────────────────────────────────
def test_a_pass_with_no_owner_is_refused(store):
    assert asyncio.run(passes.grant(session_id="cs_1", user_id="")) is False
    assert store == {}, "a pass nobody owns can never be read back; writing it only looks like success"


def test_no_user_holds_nothing(store):
    assert asyncio.run(passes.holds_pass("")) is False
