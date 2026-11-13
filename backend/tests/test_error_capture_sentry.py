# ─── HANDLED 500s REACH SENTRY (stage 7 board condition C2, 11/12/2026) ──────
#
# main._error_capture turns a route crash into a 500 and writes admin_error_log,
# which nothing alerts on. The board ruled those 500s must also reach Sentry.
# These tests pin: one capture per crash, beside the log write; no DSN means no
# client and nothing sent; and a failing capture never costs the 500 or the log.
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.error_log as error_log
import app.main as main_mod


def _crashing_client():
    """A bare app carrying the REAL middleware and one route that raises."""
    mini = FastAPI()
    mini.middleware("http")(main_mod._error_capture)

    @mini.get("/boom")
    async def boom():
        raise RuntimeError("route blew up")

    return TestClient(mini)


@pytest.fixture
def logged(monkeypatch):
    rows = []

    async def fake_record_error(source, message, level="error", context=None):
        rows.append((source, message, context))

    monkeypatch.setattr(error_log, "record_error", fake_record_error)
    return rows


def test_a_crash_returns_500_logs_it_and_captures_it_once(logged, monkeypatch):
    captured = []
    monkeypatch.setattr(main_mod.sentry_sdk, "capture_exception", lambda e=None: captured.append(e))

    r = _crashing_client().get("/boom")

    assert r.status_code == 500
    assert r.json() == {"detail": "Internal server error"}
    assert len(logged) == 1 and logged[0][0] == "api" and "GET /boom" in logged[0][1]
    assert len(captured) == 1, "the handled 500 must reach Sentry exactly once"
    assert isinstance(captured[0], RuntimeError)


def test_a_failing_capture_still_returns_the_500_and_the_log_row(logged, monkeypatch):
    def broken_capture(e=None):
        raise ConnectionError("sentry unreachable")

    monkeypatch.setattr(main_mod.sentry_sdk, "capture_exception", broken_capture)

    r = _crashing_client().get("/boom")

    assert r.status_code == 500
    assert len(logged) == 1


def test_no_dsn_means_no_init_and_nothing_sent(logged, monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    inits = []
    monkeypatch.setattr(main_mod.sentry_sdk, "init", lambda **kw: inits.append(kw))

    assert main_mod._init_sentry() is False
    assert inits == []
    # With no client, the real capture_exception is a no-op: nothing leaves the process.
    assert sentry_sdk.get_client().is_active() is False
    r = _crashing_client().get("/boom")
    assert r.status_code == 500
    assert len(logged) == 1


def test_with_a_dsn_init_sends_no_pii_no_bodies_no_locals_no_tracing(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://public@o0.ingest.sentry.io/0")
    inits = []
    monkeypatch.setattr(main_mod.sentry_sdk, "init", lambda **kw: inits.append(kw))

    assert main_mod._init_sentry() is True
    assert len(inits) == 1
    kw = inits[0]
    assert kw["dsn"] == "https://public@o0.ingest.sentry.io/0"
    assert kw["send_default_pii"] is False
    assert kw["max_request_body_size"] == "never"  # guest replies carry health data
    assert kw["include_local_variables"] is False
    assert kw["traces_sample_rate"] == 0
