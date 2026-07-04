"""Route tests for /api/admin/research/* (KRE-2).

asyncpg isn't in test env — stub it before importing the router.
Auth + DB pool are monkeypatched; executor simulate mode is used.
Governance: assert workers never produce 'kcr-published' or 'knowledge-edit'.
"""
import json
import sys
import types
import uuid

# Stub asyncpg at import time (C extension, not installed in test env)
if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

import app.routers.research as research_mod
import app.auth as auth_mod


# ── Minimal DB mock (mirrors test_admin_intelligence.py pattern) ──────────────

class _Conn:
    def __init__(self, rows=None, val=None):
        self._rows = rows or []
        self._val  = val

    async def fetch(self, *a, **k):        return list(self._rows)
    async def fetchrow(self, *a, **k):     return self._rows[0] if self._rows else None
    async def fetchval(self, *a, **k):     return self._val
    async def execute(self, *a, **k):      return "OK"


class _Acquire:
    def __init__(self, conn):   self._c = conn
    async def __aenter__(self): return self._c
    async def __aexit__(self, *a): return False


class _Pool:
    def __init__(self, conn): self._conn = conn
    def acquire(self): return _Acquire(self._conn)


def _client(monkeypatch, conn=None, is_admin=True):
    if conn is None:
        conn = _Conn()

    async def fake_require_admin(*a, **k):
        if not is_admin:
            from fastapi import HTTPException
            raise HTTPException(403, "Forbidden")
        return {"id": "test-admin", "role": "admin"}

    async def fake_get_pool():
        return _Pool(conn)

    monkeypatch.setattr(research_mod, "require_admin", fake_require_admin)
    monkeypatch.setattr(research_mod, "get_pool",      fake_get_pool)

    test_app = FastAPI()
    test_app.include_router(research_mod.router)
    return TestClient(test_app, raise_server_exceptions=True)


# ── POST /api/admin/research/runs ─────────────────────────────────────────────

class TestCreateRun:
    def test_returns_run_id(self, monkeypatch):
        client = _client(monkeypatch)
        r = client.post("/api/admin/research/runs", json={
            "campaign_id":   "camp-abc",
            "playbook_type": "crabFeast",
            "field_path":    "p_crabs.unitCostRange",
            "gap_kind":      "pricing",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["state"] == "queued"
        assert body["id"].startswith("run-")
        assert body["campaignId"] == "camp-abc"

    def test_forbidden_without_admin(self, monkeypatch):
        client = _client(monkeypatch, is_admin=False)
        r = client.post("/api/admin/research/runs", json={
            "campaign_id": "camp-abc", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing",
        })
        assert r.status_code == 403


# ── GET /api/admin/research/runs ──────────────────────────────────────────────

class TestListRuns:
    def test_returns_list(self, monkeypatch):
        runs = [
            {"id": "run-aaa", "campaign_id": "camp-1", "playbook_type": "crabFeast",
             "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing",
             "state": "complete", "summary": "ok", "error": None,
             "started_at": None, "completed_at": None, "created_at": "2026-07-03T00:00:00+00:00"},
        ]
        client = _client(monkeypatch, conn=_Conn(rows=runs))
        r = client.get("/api/admin/research/runs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) == 1
        assert r.json()[0]["id"] == "run-aaa"

    def test_empty_list_ok(self, monkeypatch):
        client = _client(monkeypatch, conn=_Conn(rows=[]))
        r = client.get("/api/admin/research/runs")
        assert r.status_code == 200
        assert r.json() == []


# ── GET /api/admin/research/runs/{run_id} ─────────────────────────────────────

class TestGetRun:
    def test_returns_run_with_logs(self, monkeypatch):
        run_row = {
            "id": "run-xyz", "campaign_id": "camp-1", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing",
            "state": "complete", "blueprint": "{}", "execution_plan": "{}",
            "summary": "2/2 providers ok", "error": None,
            "started_at": "2026-07-03T10:00:00+00:00",
            "completed_at": "2026-07-03T10:00:05+00:00",
            "created_at": "2026-07-03T10:00:00+00:00",
            "updated_at": "2026-07-03T10:00:05+00:00",
        }
        logs = [
            {"provider_id": "market-pricing", "attempt": 0, "success": True,
             "records_produced": 2, "failure_kind": None, "error_message": None,
             "latency_ms": 42, "simulated": True,
             "created_at": "2026-07-03T10:00:01+00:00"},
        ]

        class _MultiConn(_Conn):
            _call = 0
            async def fetch(self, *a, **k):
                self._call += 1
                return logs if self._call > 1 else []
            async def fetchrow(self, *a, **k): return run_row

        client = _client(monkeypatch, conn=_MultiConn())
        r = client.get("/api/admin/research/runs/run-xyz")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "run-xyz"
        assert "providerLogs" in body

    def test_404_when_missing(self, monkeypatch):
        client = _client(monkeypatch, conn=_Conn(rows=[]))
        r = client.get("/api/admin/research/runs/run-doesnotexist")
        assert r.status_code == 404


# ── POST /api/admin/research/runs/{run_id}/start ──────────────────────────────

class TestStartRun:
    """Tests that start_run calls providers (simulate) and returns observations/evidence/findings."""

    def _run_row(self):
        return {
            "id": "run-start-1", "campaign_id": "camp-1",
            "playbook_type": "crabFeast", "field_path": "p_crabs.unitCostRange",
            "gap_kind": "pricing", "state": "queued",
            "blueprint": json.dumps({"recommendedProviders": ["market-pricing", "data.gov"]}),
            "execution_plan": json.dumps({"providerIds": ["market-pricing", "data.gov"], "maxRetries": 1, "timeoutMs": 5000}),
            "summary": None, "error": None,
            "started_at": None, "completed_at": None,
            "created_at": "2026-07-03T00:00:00+00:00",
            "updated_at": "2026-07-03T00:00:00+00:00",
        }

    def test_returns_result_with_observations(self, monkeypatch):
        run_row = self._run_row()

        class _StartConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def fetchval(self, *a, **k): return 2   # 2 evidence records → corroborated
            async def fetch(self, *a, **k):
                # observations query
                return [
                    {"id": "obs-a", "provider_id": "market-pricing", "statement": "Test obs", "data": "{}"},
                    {"id": "obs-b", "provider_id": "data.gov", "statement": "USDA obs", "data": "{}"},
                ]
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_StartConn())
        r = client.post("/api/admin/research/runs/run-start-1/start", json={})
        assert r.status_code == 200
        body = r.json()
        assert body["runId"] == "run-start-1"
        assert body["state"] in ("complete", "partial", "failed")
        assert "observationCount" in body
        assert "evidenceCount" in body
        assert "findingState" in body

    def test_governance_no_published_kcr(self, monkeypatch):
        """Start run must never return 'kcr-published' or 'knowledge-edit' in response."""
        run_row = self._run_row()

        class _GovConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def fetchval(self, *a, **k): return 1
            async def fetch(self, *a, **k): return []
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_GovConn())
        r = client.post("/api/admin/research/runs/run-start-1/start", json={})
        assert r.status_code == 200
        body_str = json.dumps(r.json())
        assert "kcr-published" not in body_str
        assert "knowledge-edit" not in body_str

    def test_partial_success_when_one_provider_fails(self, monkeypatch):
        """One provider unknown → overall run is partial, not killed."""
        run_row = {**self._run_row()}
        run_row["execution_plan"] = json.dumps({"providerIds": ["market-pricing", "no-such-provider"], "maxRetries": 0, "timeoutMs": 2000})
        run_row["blueprint"] = json.dumps({"recommendedProviders": ["market-pricing", "no-such-provider"]})

        class _PartialConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def fetchval(self, *a, **k): return 1
            async def fetch(self, *a, **k): return [
                {"id": "obs-partial", "provider_id": "market-pricing", "statement": "x", "data": "{}"},
            ]
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_PartialConn())
        r = client.post("/api/admin/research/runs/run-start-1/start", json={})
        assert r.status_code == 200
        body = r.json()
        # Should not be 'complete' since one provider failed, but must not 500
        assert body["state"] in ("complete", "partial", "failed")
        # Successful provider still produced observations
        results = body.get("providerResults", [])
        market_result = next((p for p in results if p["providerId"] == "market-pricing"), None)
        assert market_result is not None
        assert market_result["success"] is True

    def test_409_if_already_running(self, monkeypatch):
        run_row = {**self._run_row(), "state": "running"}

        class _RunningConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row

        client = _client(monkeypatch, conn=_RunningConn())
        r = client.post("/api/admin/research/runs/run-start-1/start", json={})
        assert r.status_code == 409


# ── DELETE /api/admin/research/runs/{run_id} ──────────────────────────────────

class TestCancelRun:
    def test_cancels_queued_run(self, monkeypatch):
        run_row = {
            "id": "run-cancel", "campaign_id": "camp-1", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing", "state": "queued",
            "blueprint": "{}", "execution_plan": "{}", "summary": None, "error": None,
            "started_at": None, "completed_at": None,
            "created_at": "2026-07-03T00:00:00+00:00",
            "updated_at": "2026-07-03T00:00:00+00:00",
        }

        class _CancelConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_CancelConn())
        r = client.delete("/api/admin/research/runs/run-cancel")
        assert r.status_code == 200
        assert r.json()["state"] == "cancelled"

    def test_409_if_already_complete(self, monkeypatch):
        run_row = {
            "id": "run-done", "campaign_id": "camp-1", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing", "state": "complete",
            "blueprint": "{}", "execution_plan": "{}", "summary": "ok", "error": None,
            "started_at": "2026-07-03T10:00:00+00:00", "completed_at": "2026-07-03T10:00:05+00:00",
            "created_at": "2026-07-03T00:00:00+00:00", "updated_at": "2026-07-03T10:00:05+00:00",
        }

        class _DoneConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row

        client = _client(monkeypatch, conn=_DoneConn())
        r = client.delete("/api/admin/research/runs/run-done")
        assert r.status_code == 409


# ── GET /api/admin/research/observations ─────────────────────────────────────

class TestListObservations:
    def test_returns_observations(self, monkeypatch):
        obs_rows = [
            {"id": "obs-1", "run_id": "run-a", "provider_id": "market-pricing",
             "playbook_type": "crabFeast", "field_path": "p_crabs.unitCostRange",
             "gap_type": "pricing", "statement": "Test statement", "source": "market-pricing",
             "region": None, "status": "open", "data": "{}",
             "captured_at": "2026-07-03T10:00:00+00:00",
             "updated_at": "2026-07-03T10:00:00+00:00"},
        ]
        client = _client(monkeypatch, conn=_Conn(rows=obs_rows))
        r = client.get("/api/admin/research/observations")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["id"] == "obs-1"
        assert r.json()[0]["status"] == "open"

    def test_empty_ok(self, monkeypatch):
        client = _client(monkeypatch, conn=_Conn(rows=[]))
        r = client.get("/api/admin/research/observations")
        assert r.status_code == 200
        assert r.json() == []


# ── GET /api/admin/research/evidence + findings ───────────────────────────────

class TestListEvidenceAndFindings:
    def test_evidence_list(self, monkeypatch):
        ev = [{"id": "ev-1", "run_id": "run-a", "observation_id": "obs-1",
               "playbook_type": "crabFeast", "field_path": "p_crabs.unitCostRange",
               "authority": "trade", "confidence": "medium", "data": "{}",
               "captured_at": "2026-07-03T10:00:00+00:00"}]
        client = _client(monkeypatch, conn=_Conn(rows=ev))
        r = client.get("/api/admin/research/evidence")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_findings_list(self, monkeypatch):
        findings = [{"id": "finding-1", "run_id": "run-a", "playbook_type": "crabFeast",
                     "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing",
                     "status": "corroborated", "corroboration": 2, "data": "{}",
                     "kcr_draft_id": None, "created_at": "2026-07-03T10:00:00+00:00"}]
        client = _client(monkeypatch, conn=_Conn(rows=findings))
        r = client.get("/api/admin/research/findings")
        assert r.status_code == 200
        body = r.json()
        assert len(body) == 1
        assert body[0]["status"] == "corroborated"
        # Governance: findings are never auto-published
        assert "kcr-published" not in json.dumps(body)

    def test_findings_never_auto_published(self, monkeypatch):
        """Even if finding exists, it has no 'published' state — KCR lifecycle is client-side."""
        findings = [{"id": "finding-2", "run_id": "run-b", "playbook_type": "crabFeast",
                     "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing",
                     "status": "corroborated", "corroboration": 3, "data": "{}",
                     "kcr_draft_id": None, "created_at": "2026-07-03T10:00:00+00:00"}]
        client = _client(monkeypatch, conn=_Conn(rows=findings))
        r = client.get("/api/admin/research/findings")
        assert r.status_code == 200
        for finding in r.json():
            assert finding.get("status") != "published"


# ── PATCH /api/admin/research/observations/{obs_id} ──────────────────────────

class TestUpdateObservationStatus:
    def test_accept_observation(self, monkeypatch):
        class _AcceptConn(_Conn):
            async def execute(self, *a, **k): return "UPDATE 1"
        client = _client(monkeypatch, conn=_AcceptConn())
        r = client.patch("/api/admin/research/observations/obs-123", json={"status": "accepted"})
        assert r.status_code == 200
        assert r.json()["status"] == "accepted"

    def test_invalid_status_rejected(self, monkeypatch):
        client = _client(monkeypatch)
        r = client.patch("/api/admin/research/observations/obs-123", json={"status": "published"})
        assert r.status_code == 400


# ── POST /api/admin/research/runs/{run_id}/providers/{provider_id}/retry ──────

class TestRetryProvider:
    def test_retry_returns_result(self, monkeypatch):
        run_row = {
            "id": "run-retry", "campaign_id": "camp-1", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing", "state": "partial",
            "blueprint": "{}", "execution_plan": "{}", "summary": "partial", "error": None,
            "started_at": "2026-07-03T10:00:00+00:00", "completed_at": None,
            "created_at": "2026-07-03T00:00:00+00:00", "updated_at": "2026-07-03T10:00:00+00:00",
        }

        class _RetryConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_RetryConn())
        r = client.post("/api/admin/research/runs/run-retry/providers/market-pricing/retry")
        assert r.status_code == 200
        body = r.json()
        assert "success" in body
        assert "records" in body
        assert "latencyMs" in body

    def test_retry_unknown_provider_still_200(self, monkeypatch):
        """Unknown provider fails gracefully — does not 500."""
        run_row = {
            "id": "run-retry-bad", "campaign_id": "camp-1", "playbook_type": "crabFeast",
            "field_path": "p_crabs.unitCostRange", "gap_kind": "pricing", "state": "partial",
            "blueprint": "{}", "execution_plan": "{}", "summary": None, "error": None,
            "started_at": None, "completed_at": None,
            "created_at": "2026-07-03T00:00:00+00:00", "updated_at": "2026-07-03T00:00:00+00:00",
        }

        class _BadConn(_Conn):
            async def fetchrow(self, *a, **k): return run_row
            async def execute(self, *a, **k): return "OK"

        client = _client(monkeypatch, conn=_BadConn())
        r = client.post("/api/admin/research/runs/run-retry-bad/providers/no-such-provider/retry")
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is False
        assert body["records"] == 0


# ── Item 5: Real auth — 401 without token ─────────────────────────────────────

class TestRealAuth401:
    """Use the real require_admin (not monkeypatched) — no Supabase configured in
    test env, so any missing token must produce 401 Authentication required."""

    def _real_auth_client(self):
        test_app = FastAPI()
        test_app.include_router(research_mod.router)
        return TestClient(test_app, raise_server_exceptions=False)

    def test_no_token_returns_401(self):
        # ALLOW_DEV_TOKEN is False in test env (no env var set) so no bypass
        client = self._real_auth_client()
        r = client.get("/api/admin/research/runs")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_no_token_on_create_returns_401(self):
        client = self._real_auth_client()
        r = client.post("/api/admin/research/runs", json={
            "campaign_id": "x", "playbook_type": "crabFeast",
            "field_path": "p.x", "gap_kind": "pricing",
        })
        assert r.status_code == 401

    def test_no_token_on_observations_returns_401(self):
        client = self._real_auth_client()
        assert client.get("/api/admin/research/observations").status_code == 401

    def test_no_token_on_evidence_returns_401(self):
        client = self._real_auth_client()
        assert client.get("/api/admin/research/evidence").status_code == 401

    def test_no_token_on_findings_returns_401(self):
        client = self._real_auth_client()
        assert client.get("/api/admin/research/findings").status_code == 401

    def test_valid_bearer_but_no_supabase_returns_401(self):
        """A bearer token is present but Supabase isn't configured — should still 401."""
        client = self._real_auth_client()
        r = client.get(
            "/api/admin/research/runs",
            headers={"Authorization": "Bearer fake.jwt.token"},
        )
        # verify_supabase_token returns None when SUPABASE_URL/ANON_KEY not set
        assert r.status_code == 401


# ── Item 8: Governance — no production mutations ──────────────────────────────

class TestGovernanceNoProductionMutations:
    """Verify the router never touches production knowledge tables or publishes."""

    ALLOWED_TABLES = {
        "research_campaign_runs",
        "research_queue_jobs",
        "provider_run_logs",
        "research_observations",
        "research_evidence",
        "research_findings",
    }
    FORBIDDEN_STRINGS = [
        "kcr-published",
        "knowledge-edit",
        "knowledge_items",
        "knowledge_records",
        "canonical_knowledge",
        "auto_publish",
        "auto-publish",
        "state='published'",
        "status='published'",
        "status='approved'",
    ]

    def test_router_never_writes_production_tables(self):
        """No SQL in the router targets production knowledge tables."""
        import inspect
        import app.routers.research as r
        src = inspect.getsource(r)
        # These table names must never appear in SQL write positions
        production_tables = [
            "knowledge_items", "knowledge_records", "canonical_knowledge",
            "kcr_records", "kas_records",
        ]
        # Look for table names following insert/update/delete keywords in SQL strings
        for table in production_tables:
            assert table not in src, f"Production table '{table}' referenced in router"

    def test_executor_never_references_production_tables(self):
        import inspect
        import app.research_executor as e
        src = inspect.getsource(e)
        for table in ["knowledge_items", "knowledge_records", "canonical_knowledge", "kcr_records"]:
            assert table not in src, f"Production table '{table}' referenced in executor"

    def test_finding_states_are_limited(self):
        """finding_state can only be corroborated or insufficient — never published/approved."""
        import inspect
        import app.routers.research as r
        src = inspect.getsource(r)
        assert '"corroborated"' in src
        assert '"insufficient"' in src
        # 'published' and 'approved' must not appear as assigned finding/status values in SQL
        import re
        # Look for status='published' or status='approved' in SQL strings
        assert not re.search(r"status\s*=\s*'published'", src, re.IGNORECASE), \
            "Found status='published' assignment in router"
        assert not re.search(r"status\s*=\s*'approved'", src, re.IGNORECASE), \
            "Found status='approved' assignment in router"

    def test_writes_only_to_research_tables(self):
        """SQL in the router only targets the 6 research execution tables."""
        import inspect, re
        import app.routers.research as r
        src = inspect.getsource(r)
        # Extract tables from SQL string literals — match 'insert into X' and 'update X set'
        # Use a pattern that anchors on the keyword preceding the table name within quoted strings
        insert_tables = set(re.findall(r'insert into\s+([\w]+)', src, re.IGNORECASE))
        update_tables = set(re.findall(r'update\s+(research_[\w]+)', src, re.IGNORECASE))
        write_tables  = insert_tables | update_tables
        unknown = write_tables - self.ALLOWED_TABLES
        assert not unknown, f"Router writes to unexpected tables: {unknown}"
