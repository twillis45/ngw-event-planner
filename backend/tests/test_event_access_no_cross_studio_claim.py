# ── A PLANNER FROM ANOTHER STUDIO MUST NOT BE ABLE TO CLAIM AN EVENT ─────────
#
# `_assert_event_access` (communication.py) used to create the event_owners row
# on first authenticated touch, for WHOEVER touched it, in the toucher's studio.
# event_owners is populated lazily (only comms writes it), so every event never
# opened in comms had no row — 58 in production on 10/11/2026. A signed-in
# planner from studio B who knew such an event's id could hit any comms route,
# become its recorded owner, and then pass the RSVP read-back as well, because
# `_assert_event_studio_read` fell back to event_owners when the caller was not
# a member of the event's real studio.
#
# public.events.studio_id is the tenant key (NOT NULL, stamped on every synced
# event). These tests pin that it wins wherever it exists.
#
# DB-free, asyncio.run style, matching tests/test_rsvp.py.
import asyncio
import sys
import types

import pytest
from fastapi import HTTPException

if "asyncpg" not in sys.modules:  # match the existing suite
    try:
        import asyncpg  # noqa: F401
    except ImportError:
        _stub = types.ModuleType("asyncpg")
        _stub.Pool = object
        sys.modules["asyncpg"] = _stub

from app.routers import communication as C
from app.routers import rsvp as R

STUDIO_A = "studio-a"
STUDIO_B = "studio-b"
ALICE = {"id": "user-alice", "email": "alice@a.test"}  # member of A
BOB = {"id": "user-bob", "email": "bob@b.test"}        # member of B


class FakeDB:
    """Just enough of asyncpg to answer the queries the two guards issue."""

    def __init__(self, events=None, owners=None):
        self.members = {(STUDIO_A, ALICE["id"]), (STUDIO_B, BOB["id"])}
        self.events = dict(events or {})   # event_id -> studio_id
        self.owners = dict(owners or {})   # event_id -> {"owner_id", "studio_id"}
        self.writes = []

    async def fetchval(self, sql, *args):
        s = " ".join(sql.split()).lower()
        if s.startswith("select studio_id from studio_members where user_id"):
            uid = args[0]
            hits = sorted(st for st, u in self.members if u == uid)
            return hits[0] if hits else None
        if s.startswith("select 1 from studio_members where studio_id"):
            return 1 if (args[0], args[1]) in self.members else None
        if "from public.events" in s:
            return self.events.get(args[0])
        raise AssertionError(f"unexpected fetchval: {sql}")

    async def fetchrow(self, sql, *args):
        s = " ".join(sql.split()).lower()
        if "from public.events" in s:
            st = self.events.get(args[0])
            return {"studio_id": st} if args[0] in self.events else None
        if "from event_owners" in s:
            row = self.owners.get(args[0])
            return dict(row) if row else None
        raise AssertionError(f"unexpected fetchrow: {sql}")

    async def execute(self, sql, *args):
        s = " ".join(sql.split()).lower()
        self.writes.append((s, args))
        if s.startswith("insert into event_owners"):
            event_id, owner_id, _email, studio_id = args
            self.owners.setdefault(event_id, {"owner_id": owner_id, "studio_id": studio_id})
        elif s.startswith("update event_owners set studio_id"):
            event_id, studio_id = args
            if self.owners.get(event_id, {}).get("studio_id") is None:
                self.owners[event_id]["studio_id"] = studio_id


def _comms(db, who, claim=True):
    return asyncio.run(C._assert_event_access(db, "ev-1", who, claim=claim))


def _rsvp(db, who):
    return asyncio.run(R._assert_event_studio_read(db, "ev-1", who))


# ── comms ─────────────────────────────────────────────────────────────────────
def test_other_studio_cannot_claim_an_event_that_has_no_owner_row():
    db = FakeDB(events={"ev-1": STUDIO_A})
    with pytest.raises(HTTPException) as e:
        _comms(db, BOB)
    assert e.value.status_code == 403
    assert "ev-1" not in db.owners, "a refused caller must not leave an ownership row behind"


def test_owning_studio_member_is_allowed_and_the_row_records_the_events_studio():
    db = FakeDB(events={"ev-1": STUDIO_A})
    _comms(db, ALICE)
    assert db.owners["ev-1"]["studio_id"] == STUDIO_A


def test_a_contradicting_owner_row_grants_nothing_to_the_studio_it_names():
    # The production shape of a past claim: owner row says B, the event says A.
    db = FakeDB(events={"ev-1": STUDIO_A},
                owners={"ev-1": {"owner_id": BOB["id"], "studio_id": STUDIO_B}})
    with pytest.raises(HTTPException) as e:
        _comms(db, BOB)
    assert e.value.status_code == 403
    _comms(db, ALICE)  # the event's real studio keeps access


def test_read_only_path_still_never_writes():
    db = FakeDB(events={"ev-1": STUDIO_A})
    _comms(db, ALICE, claim=False)
    assert db.writes == []


def test_event_not_yet_synced_keeps_the_legacy_first_touch_behavior():
    # No public.events row: there is no tenant key to check against, so the
    # pre-existing behavior stands. Once the event syncs, the tests above apply.
    db = FakeDB()
    _comms(db, ALICE)
    assert db.owners["ev-1"]["studio_id"] == STUDIO_A


# ── RSVP read-back ────────────────────────────────────────────────────────────
def test_rsvp_refuses_other_studio_even_with_an_owner_row_naming_it():
    db = FakeDB(events={"ev-1": STUDIO_A},
                owners={"ev-1": {"owner_id": BOB["id"], "studio_id": STUDIO_B}})
    with pytest.raises(HTTPException) as e:
        _rsvp(db, BOB)
    assert e.value.status_code == 403


def test_rsvp_allows_the_events_own_studio():
    _rsvp(FakeDB(events={"ev-1": STUDIO_A}), ALICE)


def test_rsvp_fallback_still_serves_events_with_no_public_row():
    db = FakeDB(owners={"ev-1": {"owner_id": "someone", "studio_id": STUDIO_A}})
    _rsvp(db, ALICE)
    with pytest.raises(HTTPException):
        _rsvp(db, BOB)
