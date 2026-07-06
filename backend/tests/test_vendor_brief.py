"""Route tests for Vendor Brief v2 Phase 1 (tokenized live resolve).

asyncpg isn't in test env — stub it before importing the router (mirrors
test_research_routes.py). Auth + DB pool are monkeypatched.

Pins:
  - mint returns a short unguessable code; reuses the existing active code
    deterministically; 404s for a vendor not on the SERVER's event.
  - public resolve returns the CURRENT whitelisted brief and reflects a later
    event edit (no frozen snapshot).
  - resolve NEVER exposes private fields (notes/money/contract/reliability).
  - missing / revoked / too-short codes → the same opaque 404.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

import app.routers.vendor_brief as vb_mod


# ── DB mock: dispatches on query text; event blob is mutable between calls ────

class _Conn:
    def __init__(self, event_row=None, link_row=None, existing_code=None):
        self.event_row = event_row          # {'id':…, 'data':…} or None
        self.link_row = link_row            # {'event_id':…,'vendor_id':…} or None
        self.existing_code = existing_code  # active code for mint-reuse
        self.inserted = None

    async def fetchrow(self, q, *a):
        if "from public.events" in q:
            return self.event_row
        if "from public.vendor_brief_links" in q:
            return self.link_row
        return None

    async def fetchval(self, q, *a):
        if "insert into public.vendor_brief_links" in q:
            self.inserted = a[0]
            return a[0]
        if "from public.vendor_brief_links" in q:
            return self.existing_code
        return None


class _Acquire:
    def __init__(self, conn):   self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, conn): self._conn = conn
    def acquire(self): return _Acquire(self._conn)


PRIVATE_VENDOR = {
    "id": "v1",
    "name": "Capital Rotisserie Catering — Silver Spring, MD",
    "contactName": "Dana Whitfield",
    "category": "Catering",
    "arrivalTime": "14:30",
    "briefNote": "Load in through the side gate.",
    # host-private — must NEVER resolve publicly
    "notes": "PRIVATE: deposit $800 paid; they miscounted last time",
    "cost": 2400,
    "depositAmt": 800,
    "payDueDate": "2026-07-03",
    "backup": "Fork & Flower as fallback",
    "contractUrl": "https://private.example/contract.pdf",
    "onTimeRate": 71,
    "log": [{"date": "2026-06-01", "text": "Negotiated price down"}],
}

EVENT_DATA = {
    "name": "Army Retirement Celebration",
    "date": "2026-07-10",
    "venue": "VFW Post 1503 — Dale City, VA",
    "totalBudget": 5000,
    "vendors": [PRIVATE_VENDOR],
    "ros": [
        {"time": "14:30", "segment": "Caterer load-in", "location": "Side gate",
         "notes": "Ask for Dana", "vendorName": PRIVATE_VENDOR["name"]},
        {"time": "18:00", "segment": "Cake cutting", "vendorName": "Someone Else"},
    ],
}


def _client(monkeypatch, conn):
    async def fake_require_planner(*a, **k):
        return {"id": "planner-1", "via": "dev_token"}

    async def fake_assert(*a, **k):
        return None

    async def fake_get_pool():
        return _Pool(conn)

    monkeypatch.setattr(vb_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(vb_mod, "_assert_event_studio_read", fake_assert)
    monkeypatch.setattr(vb_mod, "get_pool", fake_get_pool)
    vb_mod._rate.clear()

    app = FastAPI()
    app.include_router(vb_mod.router)
    return TestClient(app)


# ── Mint ───────────────────────────────────────────────────────────────────────

def test_mint_returns_short_unguessable_code(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT_DATA)})
    c = _client(monkeypatch, conn)
    r = c.post("/api/events/e1/vendor-brief-links", json={"vendor_id": "v1"})
    assert r.status_code == 200
    code = r.json()["code"]
    assert code == conn.inserted
    assert 16 <= len(code) <= 64  # short enough for a crisp QR, long enough to be unguessable


def test_mint_reuses_existing_active_code(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT_DATA)},
                 existing_code="EXISTINGCODE12345678ab")
    c = _client(monkeypatch, conn)
    r1 = c.post("/api/events/e1/vendor-brief-links", json={"vendor_id": "v1"})
    r2 = c.post("/api/events/e1/vendor-brief-links", json={"vendor_id": "v1"})
    assert r1.json()["code"] == r2.json()["code"] == "EXISTINGCODE12345678ab"
    assert conn.inserted is None  # never minted a second


def test_mint_404_when_vendor_not_on_server_event(monkeypatch):
    conn = _Conn(event_row={"id": "e1", "data": dict(EVENT_DATA)})
    c = _client(monkeypatch, conn)
    r = c.post("/api/events/e1/vendor-brief-links", json={"vendor_id": "nope"})
    assert r.status_code == 404


# ── Public resolve ─────────────────────────────────────────────────────────────

GOOD_CODE = "abcdefghij1234567890xy"


def _resolving_conn(data=None):
    return _Conn(event_row={"id": "e1", "data": data or dict(EVENT_DATA)},
                 link_row={"event_id": "e1", "vendor_id": "v1"})


def test_public_resolve_returns_current_whitelisted_brief(monkeypatch):
    c = _client(monkeypatch, _resolving_conn())
    r = c.get(f"/api/public/vendor-brief/{GOOD_CODE}")
    assert r.status_code == 200
    brief = r.json()["brief"]
    assert brief["vendorName"] == PRIVATE_VENDOR["name"]
    assert brief["briefNote"] == "Load in through the side gate."
    assert brief["venue"] == "VFW Post 1503 — Dale City, VA"
    # ros slice: only this vendor's cues, cue-level fields only
    assert [x["segment"] for x in brief["ros"]] == ["Caterer load-in"]
    assert set(brief["ros"][0]) == {"time", "segment", "location", "notes"}


def test_public_resolve_reflects_latest_event_edit(monkeypatch):
    conn = _resolving_conn()
    c = _client(monkeypatch, conn)
    assert c.get(f"/api/public/vendor-brief/{GOOD_CODE}").json()["brief"]["venue"] == \
        "VFW Post 1503 — Dale City, VA"
    # host edits venue + this vendor's ROS cue → same code resolves NEW data
    new_data = dict(EVENT_DATA)
    new_data["venue"] = "Fort Belvoir Officers' Club — Fort Belvoir, VA"
    new_data["ros"] = [{"time": "13:00", "segment": "Early load-in",
                        "vendorName": PRIVATE_VENDOR["name"]}]
    conn.event_row = {"id": "e1", "data": new_data}
    brief = c.get(f"/api/public/vendor-brief/{GOOD_CODE}").json()["brief"]
    assert brief["venue"] == "Fort Belvoir Officers' Club — Fort Belvoir, VA"
    assert [x["segment"] for x in brief["ros"]] == ["Early load-in"]


def test_public_resolve_never_exposes_private_fields(monkeypatch):
    c = _client(monkeypatch, _resolving_conn())
    body = c.get(f"/api/public/vendor-brief/{GOOD_CODE}").text
    for needle in ("PRIVATE: deposit", "2400", "contract.pdf", "Fork & Flower",
                   "Negotiated price", "onTimeRate", "totalBudget", "payDueDate"):
        assert needle not in body
    brief = c.get(f"/api/public/vendor-brief/{GOOD_CODE}").json()["brief"]
    for k in ("notes", "cost", "depositAmt", "backup", "contractUrl", "log"):
        assert k not in brief


def test_public_resolve_opaque_404s(monkeypatch):
    # missing / revoked link (fetchrow returns None either way — same opaque 404)
    c = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": dict(EVENT_DATA)}))
    assert c.get(f"/api/public/vendor-brief/{GOOD_CODE}").status_code == 404
    # too-short code rejected before touching the DB
    assert c.get("/api/public/vendor-brief/short").status_code == 404
    # vendor deleted from event since minting
    gone = dict(EVENT_DATA); gone["vendors"] = []
    c2 = _client(monkeypatch, _Conn(event_row={"id": "e1", "data": gone},
                                    link_row={"event_id": "e1", "vendor_id": "v1"}))
    assert c2.get(f"/api/public/vendor-brief/{GOOD_CODE}").status_code == 404
