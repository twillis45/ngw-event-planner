# THE DATE POLL RIDES THE GUEST'S OWN REPLY (owner pick 11/21/2026, migration 034)
#
# A Group Trip / Team Retreat host offers up to three date ranges
# (event.dateOptions); each guest ticks every range that works, on the invite,
# and the ticks ride the same per-guest upsert as everything else. What must
# hold:
#   · the invite carries the ranges, and only their id / start / end;
#   · a guest's ticks are stored only when they name a range THIS event offers
#     (a forged or stale id is dropped, never stored), at most three;
#   · she reads her ticks back, the host reads them back, and deleting her reply
#     wipes them (test_rsvp_guest_owns_reply pins the delete for every column).
# DB-free, with a fake pool, like test_rsvp.py.
import asyncio
import inspect
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.routers import rsvp as R

CODE = "c" * 22
NOW = datetime(2026, 11, 21, 12, 0, tzinfo=timezone.utc)
OPTIONS = [
    {"id": "d1", "start": "2027-01-30", "end": "2027-02-02"},
    {"id": "d2", "start": "2027-02-13", "end": "2027-02-16", "note": "host-only scribble"},
    {"id": "d3", "start": "2027-02-27", "end": "2027-03-02"},
    {"id": "d4", "start": "2027-03-13", "end": "2027-03-16"},
]


def _public(data):
    class Conn:
        async def fetchrow(self, sql, *a):
            return {"id": "ev-1", "data": data}
    return asyncio.run(R._resolve_event(Conn(), CODE))[1]


def test_the_invite_carries_the_offered_ranges_and_nothing_else_about_them():
    pub = _public({"name": "Gulf Shores girls trip", "dateOptions": OPTIONS})
    assert pub["dateOptions"] == [
        {"id": "d1", "start": "2027-01-30", "end": "2027-02-02"},
        {"id": "d2", "start": "2027-02-13", "end": "2027-02-16"},
        {"id": "d3", "start": "2027-02-27", "end": "2027-03-02"},
    ]


def test_no_ranges_offered_means_no_dateOptions_on_the_invite():
    assert "dateOptions" not in _public({"name": "n"})
    assert "dateOptions" not in _public({"name": "n", "dateOptions": "garbage"})
    assert "dateOptions" not in _public({"name": "n", "dateOptions": [{"id": "d1"}]})


def test_the_reply_model_keeps_the_guests_ticks():
    m = R.RsvpSubmit(idempotency_key="k", name="Ann", rsvp="Yes", date_picks=["d1", "d3"])
    assert m.date_picks == ["d1", "d3"]
    assert R.RsvpSubmit(idempotency_key="k", name="Ann", rsvp="Maybe").date_picks is None


class _Db:
    def __init__(self, options):
        self.options = options
        self.insert_args = None

    async def fetchrow(self, sql, *args):
        if "from public.events" in sql:
            return {"id": "ev-1", "data": {"rsvpCode": CODE, "dateOptions": self.options}}
        if "count(*)" in sql:
            return {"n": 0, "is_resubmit": False}
        if "insert into public.rsvp_submissions" in sql:
            self.insert_args = args
            return {"submitted_at": NOW}
        raise AssertionError(sql)


def _submit(options, picks):
    R._rate.clear()
    db = _Db(options)

    @asynccontextmanager
    async def acquire():
        yield db

    async def pool():
        return SimpleNamespace(acquire=acquire)

    orig = R.get_pool
    R.get_pool = pool
    try:
        payload = R.RsvpSubmit(idempotency_key="k-1", name="Ana Ruiz", rsvp="Yes", date_picks=picks)
        req = SimpleNamespace(headers={}, client=SimpleNamespace(host="10.0.0.7"))
        asyncio.run(R.public_rsvp(CODE, payload, req, SimpleNamespace(add_task=lambda *a, **k: None)))
    finally:
        R.get_pool = orig
        R._rate.clear()
    src = inspect.getsource(R.public_rsvp)
    cols = src.split("insert into public.rsvp_submissions")[1].split("(", 1)[1].split(")", 1)[0]
    names = [c.strip() for c in cols.split(",")]
    return dict(zip(names, db.insert_args))["date_picks"]


def test_a_guest_stores_the_ranges_she_ticked():
    assert _submit(OPTIONS[:3], ["d1", "d3"]) == ["d1", "d3"]


def test_a_tick_for_a_range_the_event_does_not_offer_is_dropped():
    # A forged id, a stale id from a range the host removed, a duplicate.
    assert _submit(OPTIONS[:2], ["d1", "d9", "d3", "d1", "<script>"]) == ["d1"]


def test_no_ticks_or_no_offered_ranges_store_nothing():
    assert _submit(OPTIONS[:3], []) is None
    assert _submit(OPTIONS[:3], None) is None
    assert _submit([], ["d1"]) is None


def test_the_guest_and_the_host_both_read_the_ticks_back():
    assert "date_picks" in R._OWN_FIELDS
    assert "date_picks" in inspect.getsource(R.list_rsvps)
