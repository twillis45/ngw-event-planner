# ─── /health SAYS WHICH CODE IS RUNNING (owner, 11/21/2026) ──────────────────
#
# "Why do we not track which code version is loaded, only health?" Render
# autodeploys from main, so after a merge the only way to know the new commit
# is live is to ask the process. /health now answers with the commit Render
# deployed (RENDER_GIT_COMMIT, set by Render for git-backed services) and the
# time this process started. `ok` and `service` are unchanged.
#
# Pinned: the commit comes from the env var; missing means "unknown", never a
# made-up value; and nothing else from the environment leaks into the body.
import sys
import types
from datetime import datetime

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi.testclient import TestClient

import app.main as main_mod


def _get(monkeypatch, commit=None):
    if commit is None:
        monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    else:
        monkeypatch.setenv("RENDER_GIT_COMMIT", commit)
    return TestClient(main_mod.app).get("/health")


def test_health_keeps_ok_and_service(monkeypatch):
    body = _get(monkeypatch, "abc1234def").json()
    assert body["ok"] is True
    assert body["service"] == "ngw-events-api"


def test_health_reads_the_commit_render_deployed(monkeypatch):
    sha = "0bc6e20f9a1b2c3d4e5f60718293a4b5c6d7e8f9"
    assert _get(monkeypatch, sha).json()["commit"] == sha


def test_health_says_unknown_without_the_env_var(monkeypatch):
    assert _get(monkeypatch).json()["commit"] == "unknown"
    assert _get(monkeypatch, "").json()["commit"] == "unknown"


def test_health_reports_process_start_in_utc_iso(monkeypatch):
    started = _get(monkeypatch).json()["started_at"]
    parsed = datetime.fromisoformat(started.replace("Z", "+00:00"))
    assert parsed.utcoffset().total_seconds() == 0
    # The process start, not the request time: two calls agree.
    assert _get(monkeypatch).json()["started_at"] == started


# The calendar version (owner, 11/22/2026): RELEASE_VERSION when the host sets
# it (vYYYY.MM.DD.N without the v, the name the Pages deploy tags), else
# "unknown". Render does not set it on its own, so "unknown" is the honest
# default until it is configured.
def test_health_reports_the_release_version(monkeypatch):
    monkeypatch.setenv("RELEASE_VERSION", "2026.11.22.3")
    assert _get(monkeypatch, "abc1234").json()["version"] == "2026.11.22.3"


def test_health_version_is_unknown_without_the_env_var(monkeypatch):
    monkeypatch.delenv("RELEASE_VERSION", raising=False)
    assert _get(monkeypatch).json()["version"] == "unknown"
    monkeypatch.setenv("RELEASE_VERSION", "")
    assert _get(monkeypatch).json()["version"] == "unknown"


def test_health_exposes_nothing_else(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://user:secret@host/db")
    body = _get(monkeypatch, "abc1234").json()
    assert set(body) == {"ok", "service", "commit", "version", "started_at"}
    assert "secret" not in str(body)
