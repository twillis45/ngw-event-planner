# A GUEST CAN READ BACK AND DELETE HER OWN REPLY — AND NOTHING ELSE (11/11/2026)
#
# The invite collects allergies, diet rules and access needs. The two routes
# under test let the device that sent a reply read it back (to change it) and
# delete it. What must hold:
#   · the pair (rsvp_code, idempotency_key) is the only credential, and it is
#     in the SQL's WHERE clause, so a guest holding the shared code but another
#     guest's key reads nothing and deletes nothing;
#   · deleting wipes EVERY answer column, including the health fields, and
#     leaves rsvp NULL as the marker the host's app reads;
#   · a deleted reply no longer reads back;
#   · the host read-back says `withdrawn` for it, so the host clears its copy.
# DB-free, with a fake pool, like test_rsvp.py.
import asyncio
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import rsvp as R

CODE = "c" * 22
MINE = "key-mine"
THEIRS = "key-theirs"
NOW = datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc)

ANSWER_COLUMNS = [
    "rsvp", "meal", "needs", "plus_one", "plus_one_meal", "plus_one_needs", "note",
    "allergens", "diets", "access", "picks_crabs", "phone", "email",
    "mailing_address", "lodging_pick",
]


def reply(name, **over):
    row = {
        "guest_name": name, "rsvp": "Yes", "meal": "Vegetarian", "needs": "Peanuts",
        "plus_one": "Sam Rivera", "plus_one_meal": "Standard", "plus_one_needs": "Shellfish",
        "kids": 1, "note": "Running late", "allergens": ["Peanuts"], "diets": ["Vegetarian"],
        "access": ["Step-free"], "picks_crabs": True, "phone": "(410) 555-0100",
        "email": "guest@example.invalid", "mailing_address": "1 Test Lane",
        "lodging_pick": "lodge-1", "submitted_at": NOW, "updated_at": NOW,
    }
    row.update(over)
    return row


class FakeDb:
    """Holds rsvp_submissions rows keyed by (code, key) and answers the three
    statement shapes the routes issue, honoring their WHERE clauses."""

    def __init__(self):
        self.rows = {
            (CODE, MINE): reply("Avery Quinn"),
            (CODE, THEIRS): reply("Jordan Blake", needs="Gluten"),
        }
        self.sql = []

    async def fetchrow(self, sql, *args):
        self.sql.append(sql)
        if "from public.events" in sql:
            return {"id": "ev-1", "data": {"rsvpCode": CODE}} if args[0] == CODE else None
        key = (args[0], args[1])
        assert re.search(r"rsvp_code\s*=\s*\$1\s+and\s+idempotency_key\s*=\s*\$2", sql), \
            "the route must match on BOTH the code and the device's key"
        row = self.rows.get(key)
        if sql.lstrip().startswith("update"):
            if row is None:
                return None
            # Apply exactly the columns the statement sets to NULL.
            for col in re.findall(r"(\w+)\s*=\s*null", sql):
                row[col] = None
            if re.search(r"\bkids\s*=\s*0", sql):
                row["kids"] = 0
            return {"id": "row-1"}
        return dict(row) if row else None


@pytest.fixture
def db(monkeypatch):
    R._rate.clear()
    fake = FakeDb()

    @asynccontextmanager
    async def acquire():
        yield fake

    async def pool():
        return SimpleNamespace(acquire=acquire)

    monkeypatch.setattr(R, "get_pool", pool)
    yield fake
    R._rate.clear()


REQ = SimpleNamespace(headers={}, client=SimpleNamespace(host="10.0.0.9"))


def mine(key=MINE, code=CODE):
    return asyncio.run(R.public_rsvp_mine(code, R.RsvpOwnKey(idempotency_key=key), REQ))


def withdraw(key=MINE, code=CODE):
    return asyncio.run(R.public_rsvp_withdraw(code, R.RsvpOwnKey(idempotency_key=key), REQ))


def test_a_guest_reads_back_her_own_reply_and_only_hers(db):
    out = mine()
    assert out["reply"]["guest_name"] == "Avery Quinn"
    assert out["reply"]["allergens"] == ["Peanuts"]
    assert "Jordan" not in str(out)
    assert out["reply"]["submitted_at"] == NOW.isoformat()


def test_a_key_that_sent_nothing_reads_nothing(db):
    with pytest.raises(HTTPException) as e:
        mine(key="key-nobody")
    assert e.value.status_code == 404


def test_a_wrong_or_short_code_reads_nothing(db):
    with pytest.raises(HTTPException) as e:
        mine(code="d" * 22)
    assert e.value.status_code == 404
    with pytest.raises(HTTPException):
        mine(code="short")


def test_deleting_wipes_every_answer_and_leaves_the_other_guest_alone(db):
    assert withdraw() == {"ok": True, "withdrawn": True}
    gone = db.rows[(CODE, MINE)]
    for col in ANSWER_COLUMNS:
        assert gone[col] is None, f"{col} survived the delete"
    assert gone["kids"] == 0
    # The name stays on the tombstone so the host's app can find its copy.
    assert gone["guest_name"] == "Avery Quinn"
    # The other guest's reply is untouched.
    assert db.rows[(CODE, THEIRS)]["needs"] == "Gluten"
    assert db.rows[(CODE, THEIRS)]["rsvp"] == "Yes"


def test_every_answer_column_in_the_upsert_is_wiped_by_the_delete(db):
    # The guard against drift: a column added to the reply later must be added
    # to the delete too, or "delete my reply" leaves it behind.
    import inspect
    src = inspect.getsource(R.public_rsvp)
    inserted = re.search(r"insert into public\.rsvp_submissions\s*\(([^)]*)\)", src).group(1)
    cols = {c.strip() for c in inserted.split(",")} - {"event_id", "rsvp_code", "idempotency_key", "guest_name"}
    wsrc = inspect.getsource(R.public_rsvp_withdraw)
    wiped = set(re.findall(r"(\w+)\s*=\s*null", wsrc)) | ({"kids"} if re.search(r"\bkids\s*=\s*0", wsrc) else set())
    assert cols <= wiped, f"not wiped on delete: {sorted(cols - wiped)}"


def test_a_deleted_reply_no_longer_reads_back(db):
    withdraw()
    with pytest.raises(HTTPException) as e:
        mine()
    assert e.value.status_code == 404


def test_deleting_twice_or_deleting_nothing_is_still_ok(db):
    withdraw()
    assert withdraw()["ok"] is True
    assert withdraw(key="key-nobody") == {"ok": True, "withdrawn": False}


def test_both_routes_are_rate_limited_per_invite(db, monkeypatch):
    monkeypatch.setattr(R, "RSVP_CODE_MAX", 2)
    withdraw(key="key-nobody")
    withdraw(key="key-nobody")
    with pytest.raises(HTTPException) as e:
        mine()
    assert e.value.status_code == 429


def test_the_host_read_back_marks_a_deleted_reply_withdrawn(monkeypatch):
    rows = [reply("Avery Quinn", rsvp=None), reply("Jordan Blake")]
    rows = [{**r, "id": "r", "event_id": "ev-1", "rsvp_code": CODE} for r in rows]

    class Conn:
        async def fetch(self, sql, *a):
            return rows

    @asynccontextmanager
    async def acquire():
        yield Conn()

    async def pool():
        return SimpleNamespace(acquire=acquire)

    async def planner(*a):
        return {"id": "u", "via": "dev_token"}

    monkeypatch.setattr(R, "get_pool", pool)
    monkeypatch.setattr(R, "require_planner", planner)
    out = asyncio.run(R.list_rsvps("ev-1", "Bearer t", None))
    assert [r["withdrawn"] for r in out] == [True, False]
