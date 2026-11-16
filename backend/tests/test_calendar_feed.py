"""The calendar subscription feed (owner, 11/16/2026). Synthetic data only.

Pins: the feed is the host app's saved list, formatted (no date rules here);
it parses as iCalendar; a short, unknown or cleared code is the same 404; it
never carries guests, money or notes.
"""
import sys
import types
import json
from datetime import datetime, timezone

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.routers.calendar_feed as cf
import app.routers.rsvp as rsvp_mod

CODE = "cal-" + "c" * 28
EVENT = {
    "name": "Vida’s Friendsgiving, at Pine; Street", "calendarCode": CODE,
    "calendarFeed": [
        {"id": "event-1", "date": "2026-11-21", "kind": "event", "label": "Vida’s Friendsgiving"},
        {"id": "task-t2", "date": "2026-11-11", "kind": "task", "label": "Order the turkey"},
        {"id": "vendor-v1-p", "date": "2026-11-14", "kind": "vendor", "label": "Harvest Table: confirm headcount"},
        {"id": "bad", "date": "not a date", "kind": "task", "label": "dropped"},
    ],
    "guests": [{"name": "Ana Ruiz", "email": "ana@example.test"}], "budget": [{"amount": 400}], "notes": "secret host note",
}


class _Conn:
    def __init__(self, rows): self.rows, self.queries = rows, []
    async def fetchrow(self, q, *a):
        self.queries.append(q)
        for d in self.rows:
            if d.get("calendarCode") == a[0]:
                return {"id": "e1", "data": json.dumps(d)}
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
    monkeypatch.setattr(cf, "get_pool", gp)
    rsvp_mod._rate.clear()
    app = FastAPI(); app.include_router(cf.router)
    return TestClient(app), conn


def test_the_feed_is_the_saved_list_as_icalendar(monkeypatch):
    c, conn = client(monkeypatch, [EVENT])
    r = c.get(f"/api/public/calendar/{CODE}.ics")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/calendar")
    body = r.text
    assert body.count("BEGIN:VEVENT") == 3                     # the malformed row is dropped
    assert "DTSTART;VALUE=DATE:20261111\r\nDTEND;VALUE=DATE:20261112" in body
    assert "SUMMARY:To do: Order the turkey" in body and "SUMMARY:Vendor: Harvest Table: confirm headcount" in body
    assert "UID:e1-task-t2@ngw-plan" in body
    assert "REFRESH-INTERVAL;VALUE=DURATION:PT6H" in body
    assert all(len(l.encode()) <= 75 for l in body.split("\r\n"))
    for secret in ("Ana Ruiz", "ana@example.test", "400", "secret host note", CODE):
        assert secret not in body, secret
    assert "data->>'calendarCode' = $1" in conn.queries[0]


def test_a_short_unknown_or_cleared_code_is_the_same_404(monkeypatch):
    c, conn = client(monkeypatch, [EVENT, {**EVENT, "calendarCode": None}])
    assert c.get("/api/public/calendar/short.ics").status_code == 404
    assert conn.queries == []
    assert c.get("/api/public/calendar/" + "z" * 30 + ".ics").status_code == 404


def test_it_parses_as_icalendar():
    icalendar = __import__("pytest").importorskip("icalendar")
    cal = icalendar.Calendar.from_ical(cf.feed_ics({**EVENT, "id": "e1"}, datetime(2026, 11, 16, tzinfo=timezone.utc)).encode())
    got = [(str(e.get("dtstart").dt), str(e.get("summary"))) for e in cal.walk("VEVENT")]
    assert got[0] == ("2026-11-21", "Vida’s Friendsgiving")
    assert str(cal.get("X-WR-CALNAME")) == "Vida’s Friendsgiving at Pine Street — plan"
