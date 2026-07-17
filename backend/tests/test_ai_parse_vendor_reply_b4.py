"""B4 — the vendor-reply parser's Claude provider path.

No network: Anthropic's httpx client is faked. Verifies provider='claude' routes
to the orchestrator's Anthropic infra (Haiku), returns the SAME filtered
{fields, confidence, disclaimer} shape as OpenAI (so the client core is
untouched), gates on ANTHROPIC_API_KEY, and leaves the OpenAI default unchanged.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.ai as ai_mod


CLAUDE_JSON = (
    '{"cost": {"value": 1500, "evidence": "$1,500 total"}, '
    '"deposit_paid": {"value": true, "evidence": "deposit received"}, '
    '"made_up_field": {"value": "x", "evidence": "y"}, '  # not in allow-list → must be dropped
    '"confidence": "high"}'
)


class _ClaudeResp:
    def raise_for_status(self): return None
    def json(self):
        return {"content": [{"type": "text", "text": CLAUDE_JSON}], "usage": {"output_tokens": 30}, "model": "claude-haiku"}


class _OpenAIResp:
    def raise_for_status(self): return None
    def json(self):
        return {"choices": [{"message": {"content": '{"cost": {"value": 900, "evidence": "$900"}, "confidence": "low"}'}}], "usage": {"completion_tokens": 20}}


class _FakeClient:
    """Returns a provider-shaped response based on the URL the route posts to."""
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False
    async def post(self, url, headers=None, json=None):
        return _ClaudeResp() if "anthropic" in url else _OpenAIResp()


def _client(monkeypatch, *, authed=True, openai_cfg=True, claude_cfg=True):
    async def fake_require_planner(*a, **k):
        if not authed:
            raise HTTPException(401, "Unauthorized")
        return {"id": "planner-1"}
    monkeypatch.setattr(ai_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(ai_mod, "is_ai_configured", lambda: openai_cfg)
    monkeypatch.setattr(ai_mod, "is_orchestrator_configured", lambda: claude_cfg)
    monkeypatch.setattr(ai_mod, "ANTHROPIC_KEY", "sk-ant-test" if claude_cfg else None)
    monkeypatch.setattr(ai_mod.httpx, "AsyncClient", lambda *a, **k: _FakeClient())
    app = FastAPI(); app.include_router(ai_mod.router)
    return TestClient(app, raise_server_exceptions=True)


BODY = {"reply_text": "We'll do it for $1,500 total, deposit received.", "vendor_name": "Semper Catering"}


def test_claude_path_returns_same_filtered_shape(monkeypatch):
    c = _client(monkeypatch)
    r = c.post("/api/ai/parse-vendor-reply", json={**BODY, "provider": "claude"})
    assert r.status_code == 200
    out = r.json()
    assert out["ok"] is True
    # allow-list filtering held: real fields kept, off-list field dropped
    assert out["fields"]["cost"]["value"] == 1500
    assert out["fields"]["deposit_paid"]["value"] is True
    assert "made_up_field" not in out["fields"]
    assert out["confidence"] == "high"
    assert "review each field" in out["disclaimer"]


def test_claude_path_503_when_anthropic_unconfigured(monkeypatch):
    c = _client(monkeypatch, claude_cfg=False)
    r = c.post("/api/ai/parse-vendor-reply", json={**BODY, "provider": "claude"})
    assert r.status_code == 503
    assert "ANTHROPIC_API_KEY" in r.json()["detail"]


def test_default_provider_still_openai_unchanged(monkeypatch):
    c = _client(monkeypatch)
    r = c.post("/api/ai/parse-vendor-reply", json=BODY)  # no provider → openai
    assert r.status_code == 200
    out = r.json()
    assert out["fields"]["cost"]["value"] == 900   # the OpenAI-shaped fake
    assert out["confidence"] == "low"


def test_openai_default_503_when_openai_unconfigured(monkeypatch):
    c = _client(monkeypatch, openai_cfg=False)
    r = c.post("/api/ai/parse-vendor-reply", json=BODY)
    assert r.status_code == 503
    assert "OPENAI_API_KEY" in r.json()["detail"]


def test_auth_still_required(monkeypatch):
    c = _client(monkeypatch, authed=False)
    r = c.post("/api/ai/parse-vendor-reply", json={**BODY, "provider": "claude"})
    assert r.status_code == 401
