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


# ═══ Phase 2A — vendor confirm-back ════════════════════════════════════════════
import datetime as _dt


class _ConfirmConn(_Conn):
    """Extends the dispatch mock with the confirmation queries."""
    def __init__(self, *a, confirm_count=0, is_resubmit=False, latest_state=None,
                 confirm_rows=None, **k):
        super().__init__(*a, **k)
        self.confirm_count = confirm_count
        self.is_resubmit = is_resubmit
        self.latest_state = latest_state
        self.confirm_rows = confirm_rows or []
        self.confirm_insert_args = None

    async def fetchrow(self, q, *a):
        if "insert into public.vendor_brief_confirmations" in q:
            self.confirm_insert_args = a
            return {"submitted_at": _dt.datetime(2026, 7, 6, 12, 0, tzinfo=_dt.timezone.utc)}
        if "count(*)" in q and "vendor_brief_confirmations" in q:
            return {"n": self.confirm_count, "is_resubmit": self.is_resubmit}
        if "select state from public.vendor_brief_confirmations" in q:
            return {"state": self.latest_state} if self.latest_state else None
        return await super().fetchrow(q, *a)

    async def fetch(self, q, *a):
        if "vendor_brief_confirmations" in q:
            return list(self.confirm_rows)
        return []


def _confirm_body(**over):
    body = {"idempotency_key": "idk-test-1", "state": "confirmed",
            "on_site_name": "Dana Whitfield", "on_site_phone": "(301) 555-0134",
            "note": "Side gate works"}
    body.update(over)
    return body


def test_confirm_succeeds_and_resolves_identity_server_side(monkeypatch):
    conn = _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"})
    c = _client(monkeypatch, conn)
    r = c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm", json=_confirm_body())
    assert r.status_code == 200
    body = r.json()
    # Minimal response: never echoes event/vendor data back to the public caller.
    assert set(body) == {"ok", "submitted_at"}
    # event_id/vendor_id come from the SERVER's link row, not the client.
    args = conn.confirm_insert_args
    assert args[1] == "e1" and args[2] == "v1"
    assert args[4] == "confirmed"


def test_confirm_idempotent_resubmit_and_state_change(monkeypatch):
    conn = _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"},
                        confirm_count=1, is_resubmit=True)
    c = _client(monkeypatch, conn)
    r1 = c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm", json=_confirm_body())
    r2 = c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
                json=_confirm_body(state="issue_reported", note="Gate code changed"))
    assert r1.status_code == 200 and r2.status_code == 200
    # Same idempotency key flows through both — the SQL upserts one row.
    assert conn.confirm_insert_args[3] == "idk-test-1"
    assert conn.confirm_insert_args[4] == "issue_reported"


def test_confirm_invalid_state_is_422(monkeypatch):
    c = _client(monkeypatch, _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"}))
    r = c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
               json=_confirm_body(state="maybe"))
    assert r.status_code == 422


def test_confirm_opaque_404s(monkeypatch):
    # unknown / revoked code (no link row) and short code — same opaque 404
    c = _client(monkeypatch, _ConfirmConn())
    assert c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
                  json=_confirm_body()).status_code == 404
    assert c.post("/api/public/vendor-brief/short/confirm",
                  json=_confirm_body()).status_code == 404


def test_confirm_lifetime_cap_blocks_new_but_not_resubmit(monkeypatch):
    at_cap = vb_mod.CONFIRM_CODE_MAX_TOTAL
    blocked = _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"},
                           confirm_count=at_cap, is_resubmit=False)
    c = _client(monkeypatch, blocked)
    assert c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
                  json=_confirm_body()).status_code == 429
    allowed = _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"},
                           confirm_count=at_cap, is_resubmit=True)
    c2 = _client(monkeypatch, allowed)
    assert c2.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
                   json=_confirm_body()).status_code == 200


def test_confirm_per_code_rate_limit(monkeypatch):
    conn = _ConfirmConn(link_row={"event_id": "e1", "vendor_id": "v1"})
    c = _client(monkeypatch, conn)
    codes = []
    for i in range(vb_mod.CONFIRM_CODE_MAX + 1):
        # rotate the IP bucket so the per-CODE window is what trips
        r = c.post(f"/api/public/vendor-brief/{GOOD_CODE}/confirm",
                   json=_confirm_body(),
                   headers={"x-forwarded-for": f"10.0.0.{i}"})
        codes.append(r.status_code)
    assert codes[-1] == 429 and all(s == 200 for s in codes[:-1])


def test_readback_requires_planner_auth(monkeypatch):
    conn = _ConfirmConn()
    c = _client(monkeypatch, conn)

    async def deny(*a, **k):
        from fastapi import HTTPException
        raise HTTPException(401, "Unauthorized")
    monkeypatch.setattr(vb_mod, "require_planner", deny)
    assert c.get("/api/events/e1/vendor-confirmations").status_code == 401


def test_readback_returns_rows_with_safe_fields_only(monkeypatch):
    rows = [
        {"vendor_id": "v1", "state": "issue_reported", "on_site_name": None,
         "on_site_phone": None, "note": "Gate code changed",
         "submitted_at": _dt.datetime(2026, 7, 6, 13, 0, tzinfo=_dt.timezone.utc),
         "updated_at": None},
        {"vendor_id": "v1", "state": "confirmed", "on_site_name": "Dana",
         "on_site_phone": "(301) 555-0134", "note": None,
         "submitted_at": _dt.datetime(2026, 7, 6, 12, 0, tzinfo=_dt.timezone.utc),
         "updated_at": None},
    ]
    c = _client(monkeypatch, _ConfirmConn(confirm_rows=rows))
    r = c.get("/api/events/e1/vendor-confirmations")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert set(data[0]) == {"vendor_id", "state", "on_site_name", "on_site_phone",
                            "note", "submitted_at", "updated_at"}
    assert data[0]["state"] == "issue_reported"  # newest first (per the mock order)


def test_resolve_includes_own_confirm_state_only(monkeypatch):
    conn = _ConfirmConn(event_row={"id": "e1", "data": dict(EVENT_DATA)},
                        link_row={"event_id": "e1", "vendor_id": "v1"},
                        latest_state="confirmed")
    c = _client(monkeypatch, conn)
    brief = c.get(f"/api/public/vendor-brief/{GOOD_CODE}").json()["brief"]
    assert brief["confirmState"] == "confirmed"
    # and still no private fields alongside it
    for k in ("notes", "cost", "depositAmt"):
        assert k not in brief
