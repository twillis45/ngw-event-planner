"""Route tests for POST /api/ai/parse-vendor-reply (Agent Opportunity Audit P0).

No network: OpenAI's httpx client is faked. Auth + config are monkeypatched.
The endpoint must never invent — it only shapes/filters the model's JSON — so
these tests pin auth, validation, and that output is filtered to the allow-list.
"""
import json
import sys
import types

# Stub asyncpg at import time (C extension, not installed in test env)
if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.ai as ai_mod


# ── Fake OpenAI over httpx ────────────────────────────────────────────────────

class _Resp:
    def __init__(self, content):
        self._content = content
    def raise_for_status(self): return None
    def json(self):
        return {
            "choices": [{"message": {"content": self._content}}],
            "usage": {"completion_tokens": 42},
            "model": "gpt-4o-mini",
        }


class _FakeClient:
    def __init__(self, content):
        self._content = content
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False
    async def post(self, *a, **k): return _Resp(self._content)


def _client(monkeypatch, *, authed=True, configured=True, model_content=None):
    async def fake_require_planner(*a, **k):
        if not authed:
            raise HTTPException(401, "Unauthorized")
        return {"id": "planner-1", "email": "p@x.com"}

    monkeypatch.setattr(ai_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(ai_mod, "is_ai_configured", lambda: configured)
    if model_content is not None:
        monkeypatch.setattr(ai_mod.httpx, "AsyncClient", lambda *a, **k: _FakeClient(model_content))

    test_app = FastAPI()
    test_app.include_router(ai_mod.router)
    return TestClient(test_app, raise_server_exceptions=True)


def test_requires_auth(monkeypatch):
    client = _client(monkeypatch, authed=False)
    r = client.post("/api/ai/parse-vendor-reply", json={"reply_text": "arrive at 2"})
    assert r.status_code == 401


def test_503_when_unconfigured(monkeypatch):
    client = _client(monkeypatch, configured=False)
    r = client.post("/api/ai/parse-vendor-reply", json={"reply_text": "arrive at 2"})
    assert r.status_code == 503


def test_400_on_empty_reply(monkeypatch):
    client = _client(monkeypatch)
    r = client.post("/api/ai/parse-vendor-reply", json={"reply_text": "   "})
    assert r.status_code == 400


def test_happy_path_filters_to_allowlist(monkeypatch):
    # Model returns two valid fields, one bogus key, plus confidence.
    content = json.dumps({
        "arrival_time": {"value": "2:00 PM", "evidence": "we'll arrive at 2"},
        "deposit_paid": {"value": True, "evidence": "deposit received"},
        "made_up_field": {"value": "should be dropped"},
        "confidence": "high",
    })
    client = _client(monkeypatch, model_content=content)
    r = client.post("/api/ai/parse-vendor-reply", json={
        "reply_text": "we'll arrive at 2, deposit received",
        "vendor_name": "Captain Whites",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["confidence"] == "high"
    assert "disclaimer" in body
    assert set(body["fields"].keys()) == {"arrival_time", "deposit_paid"}  # bogus key dropped
    assert body["fields"]["arrival_time"]["value"] == "2:00 PM"


def test_tolerates_unparseable_model_output(monkeypatch):
    client = _client(monkeypatch, model_content="not json at all")
    r = client.post("/api/ai/parse-vendor-reply", json={"reply_text": "hello"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["fields"] == {}
    assert body["confidence"] == "low"


def test_field_keys_match_frontend_contract():
    # The prompt's key set is the SSOT shared with src/lib/vendorReplyParse.js.
    keys = [k for k, _ in ai_mod.VENDOR_REPLY_FIELDS]
    assert len(keys) == len(set(keys))
    for required in ("arrival_time", "deposit_paid", "day_of_contact_name", "final_guest_count"):
        assert required in keys
