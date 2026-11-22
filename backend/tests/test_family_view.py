"""The read-only family link (owner, 11/16/2026). Synthetic names only.

Pins: the projection is an allow-list (no guest names, contacts, money, notes
or codes ever leave); a short or unknown code is the same opaque 404; the
lookup is by exact match on the saved code, so clearing it kills the link.
"""
import sys
import types
import json

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.routers.family_view as fv
import app.routers.rsvp as rsvp_mod

CODE = "fam-" + "a" * 28
EVENT = {
    "name": "Vida’s Friendsgiving", "type": "Friendsgiving", "date": "2026-11-21", "startTime": "16:00",
    "venue": "Pine Street Commons", "venueCity": "Alexandria", "venueState": "VA", "hashtag": "#VidasFriendsgiving2026",
    "familyCode": CODE, "rsvpCode": "invite-code-0000000001", "budget": [{"label": "Food", "amount": 400}],
    "notes": "secret host note", "hostContact": "555-0100",
    "guests": [{"name": "Ana Ruiz", "rsvp": "Yes", "email": "ana@example.test", "phone": "555-0111", "diet": "vegan"},
               {"name": "Leo Park", "rsvp": "No"}, {"name": "Mia Chen", "rsvp": "Maybe"}, {"name": "Sam Lee"}],
    "vendors": [{"id": "v1", "name": "Harvest Table Catering", "category": "Catering", "status": "Booked",
                 "price": 900, "deposit": 200, "contactEmail": "dana@example.test", "phone": "555-0122"}],
    "timeline": [{"id": "t1", "task": "Order the turkey", "done": True, "owner": "Vida"}, {"id": "t2", "task": "Buy chairs", "done": False}],
    "ros": [{"time": "16:00", "title": "Doors open", "owner": "Vida", "note": "private"}],
    "costSplit": {"people": [{"id": "p", "name": "Ana"}], "expenses": [{"id": "x", "who": "p", "amount": 60}]},
    "helperLinkIds": ["h1"],
}


class _Conn:
    def __init__(self, rows): self.rows, self.queries = rows, []
    async def fetchrow(self, q, *a):
        self.queries.append((q, a))
        for d in self.rows:
            if d.get("familyCode") == a[0]:
                return {"data": json.dumps(d)}
        return None


class _Pool:
    def __init__(self, c): self.c = c
    def acquire(self):
        c = self.c
        class Ctx:
            async def __aenter__(self): return c
            async def __aexit__(self, *a): return False
        return Ctx()


def client(monkeypatch, rows):
    conn = _Conn(rows)
    async def gp(): return _Pool(conn)
    monkeypatch.setattr(fv, "get_pool", gp)
    rsvp_mod._rate.clear()
    app = FastAPI(); app.include_router(fv.router)
    return TestClient(app), conn


def test_family_sees_the_plan_and_nothing_private(monkeypatch):
    c, conn = client(monkeypatch, [EVENT])
    r = c.get(f"/api/public/family/{CODE}")
    assert r.status_code == 200
    plan = r.json()["plan"]
    assert plan["name"] == "Vida’s Friendsgiving" and plan["venueCity"] == "Alexandria"
    assert plan["checklist"] == [{"task": "Order the turkey", "done": True}, {"task": "Buy chairs", "done": False}]
    assert plan["ros"] == [{"time": "16:00", "label": "Doors open"}]
    assert plan["vendors"] == [{"name": "Harvest Table Catering", "category": "Catering", "status": "Booked"}]
    assert plan["replies"] == {"yes": 1, "no": 1, "maybe": 1, "waiting": 1}
    blob = json.dumps(plan)
    for secret in ("Ana Ruiz", "Leo Park", "ana@example.test", "555-0", "vegan", "secret host note",
                   "400", "900", "200", "dana@example.test", CODE, "invite-code", "costSplit", "helperLinkIds", "private"):
        assert secret not in blob, secret
    assert "budget" not in plan and "guests" not in plan and "familyCode" not in plan and "rsvpCode" not in plan
    # Exact match on the saved code, never a prefix or the event id.
    assert "data->>'familyCode' = $1" in conn.queries[0][0]


def test_a_short_unknown_or_cleared_code_is_the_same_404(monkeypatch):
    c, conn = client(monkeypatch, [EVENT, {**EVENT, "familyCode": None, "name": "Off"}])
    assert c.get("/api/public/family/short").status_code == 404
    assert conn.queries == []                       # a short code never reaches the database
    assert c.get("/api/public/family/" + "z" * 30).status_code == 404


def test_the_apps_guessed_start_time_is_withheld():
    assert "startTime" not in fv.family_projection({**EVENT, "startTimeSource": "derived"})


def test_marked_surprises_never_reach_the_family_link():
    """Owner ruling 11/22/2026 ("Hide marked surprises"): a run-of-show row, a
    vendor or a checklist step the host marked as a surprise is left out of the
    family view. Unmarked rows still come through, and the playbook's own rows
    keep their flag so the page can tell hers from the app's."""
    data = dict(EVENT)
    data["ros"] = [
        {"time": "18:30", "label": "Doors"},
        {"time": "20:15", "label": "The singer’s dedication", "surprise": True},
        {"time": "21:00", "segment": "Cake", "generated": True},
    ]
    data["vendors"] = [
        {"name": "Harvest Table Catering", "category": "Catering", "status": "Booked"},
        {"name": "Church singer", "category": "Entertainment", "status": "Confirmed", "surprise": True},
    ]
    data["timeline"] = [
        {"task": "Order the turkey", "done": True},
        {"task": "Cue the singer with the DJ", "done": False, "surprise": True},
    ]
    out = fv.family_projection(data)
    assert [r["label"] for r in out["ros"]] == ["Doors", "Cake"]
    assert out["ros"][1].get("generated") is True
    assert "generated" not in out["ros"][0]
    assert [v["name"] for v in out["vendors"]] == ["Harvest Table Catering"]
    assert [t["task"] for t in out["checklist"]] == ["Order the turkey"]
    assert "singer" not in json.dumps(out).lower()
