"""INTEL-QA-1 Stage 1C — route tests for GET /api/admin/intelligence.

asyncpg (a C extension) isn't installed in this test env, so we stub it before importing the router
(db.py imports asyncpg at module load). Auth + the DB pool are monkeypatched; the aggregation itself
is the real pure function. Capture only — asserts NO scoring and NO PII.
"""
import json
import sys
import types

# Stub asyncpg so `app.routers.admin` (→ app.db) imports without the native extension.
if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.testclient import TestClient   # noqa: E402

import app.routers.admin as admin_mod       # noqa: E402


class _Conn:
    def __init__(self, rows): self._rows = rows
    async def fetch(self, *a, **k): return self._rows


class _Acquire:
    def __init__(self, conn): self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, rows): self._rows = rows
    def acquire(self): return _Acquire(_Conn(self._rows))


def _client(monkeypatch, rows, is_admin=True):
    async def fake_require_admin(*a, **k):
        if not is_admin:
            raise HTTPException(status_code=403, detail="not admin")
        return {"id": "admin1", "via": "test"}

    async def fake_get_pool():
        return _Pool(rows)

    async def fake_audit(*a, **k):
        return None

    monkeypatch.setattr(admin_mod, "require_admin", fake_require_admin)
    monkeypatch.setattr(admin_mod, "get_pool", fake_get_pool)
    monkeypatch.setattr(admin_mod, "audit", fake_audit)
    app = FastAPI()
    app.include_router(admin_mod.router)
    return TestClient(app)


def _rec(**over):
    r = {
        "id": "R1:cf1", "version": 1, "readerId": "R1",
        "metadata": {"domain": "attendance", "source": "attendance-memory", "readerVersion": 1},
        "recommendation": {"from": 40, "to": 34, "because": "size for 34", "confidence": "Medium"},
        "baseline": {"value": 40},
        "lifecycle": [{"state": "created"}, {"state": "presented"}, {"state": "accepted"}],
        "actual": {"value": 36}, "evaluation": {"status": "pending"},
    }
    r.update(over)
    return r


def _row(eid, evals, etype="Crab Feast", date="2026-06-01", gc=40, extra=None):
    data = {"type": etype, "date": date, "guestCount": gc, "intelEvaluations": evals}
    if extra:
        data.update(extra)
    return {"id": eid, "data": json.dumps(data)}  # asyncpg returns jsonb as a string


def test_authorized_returns_contract_shape(monkeypatch):
    c = _client(monkeypatch, [_row("cf1", [_rec()])])
    r = c.get("/api/admin/intelligence")
    assert r.status_code == 200
    body = r.json()
    assert body["provenance"]["source"] == "server" and body["provenance"]["scope"] == "admin"
    a = body["audit"]
    assert a["totals"]["records"] == 1 and a["totals"]["accepted"] == 1 and a["totals"]["actualsAttached"] == 1
    assert body["summary"]["totalRecommendationRecords"] == 1
    assert a["records"][0]["eventLabel"].startswith("Crab Feast · cf1")
    assert any(f["stage"] == "eligible" and f["available"] is False for f in a["funnel"])


def test_unauthorized_blocked(monkeypatch):
    c = _client(monkeypatch, [_row("cf1", [_rec()])], is_admin=False)
    assert c.get("/api/admin/intelligence").status_code == 403


def test_events_with_no_intel_evaluations(monkeypatch):
    c = _client(monkeypatch, [{"id": "e1", "data": json.dumps({"type": "X", "date": "2026-06-01"})}])
    a = c.get("/api/admin/intelligence").json()["audit"]
    assert a["scannedEvents"] == 1 and a["eventsWithEvaluations"] == 0 and a["totals"]["records"] == 0


def test_malformed_and_duplicate_and_missing(monkeypatch):
    dup = _rec()
    rows = [
        _row("cf1", [None, "garbage", _rec()]),
        _row("cf2", [dup, dict(dup)]),
        _row("cf3", [_rec(baseline=None)]),
        _row("cf4", [_rec(actual=None, id="R1:cf4")]),  # accepted, no actual, past event
    ]
    a = _client(monkeypatch, rows).get("/api/admin/intelligence").json()["audit"]
    assert a["totals"]["malformed"] == 2
    assert a["totals"]["duplicateWarnings"] == 1
    codes = {i["code"] for i in a["integrity"]}
    assert {"malformed", "duplicate_id", "missing_baseline", "missing_actual"}.issubset(codes)


def test_response_has_no_pii(monkeypatch):
    row = _row("cf1", [_rec()], extra={"name": "Ada's Feast", "guests": [{"name": "Ada Lovelace", "email": "ada@x.com", "address": "10 Downing"}]})
    body = _client(monkeypatch, [row]).get("/api/admin/intelligence").text.lower()
    for pii in ("ada lovelace", "ada@x.com", "downing", "email", "@", "guests"):
        assert pii not in body


def test_records_capped(monkeypatch):
    rows = [_row(f"cf{i}", [_rec(id=f"R1:cf{i}")]) for i in range(5)]
    body = _client(monkeypatch, rows).get("/api/admin/intelligence?limit=2").json()
    assert body["provenance"]["recordCap"] == 2
    assert len(body["audit"]["records"]) == 2
    assert body["provenance"]["truncated"] is True
    assert body["audit"]["totals"]["records"] == 5  # totals count ALL, only the record LIST is capped


def test_no_stage2_scoring_in_response(monkeypatch):
    body = _client(monkeypatch, [_row("cf1", [_rec()])]).get("/api/admin/intelligence").json()
    s = json.dumps(body).lower()
    assert "grade" not in s and "accuracy" not in s and "score" not in s
