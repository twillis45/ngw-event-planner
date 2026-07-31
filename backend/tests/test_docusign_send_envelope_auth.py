"""Auth + fetch-guard gates for POST /api/docusign/send-envelope.

Before 2026-07-30 this route was unauthenticated and downloaded ANY caller
supplied `contract_url` — the same SSRF primitive as /api/ai/extract-document,
with the network error echoed back to the caller.

Fully offline: DocuSign is never contacted (envelope creation is stubbed and
asserted to stay uncalled), DNS is stubbed, and no request leaves the machine.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import app.routers.docusign as ds_mod
from app import safe_fetch


BODY = {
    "access_token": "ds-token",
    "contract_url": "https://files.example-project.supabase.co/contract.pdf",
    "document_name": "Contract.pdf",
    "vendor_name": "Lena Kim Photography",
    "vendor_email": "lena@example.com",
    "planner_name": "Planner",
    "planner_email": "planner@example.com",
    "event_name": "Reunion",
    "event_id": "ev-1",
    "vendor_id": "v-1",
}


class _EnvelopeSpy:
    calls = 0


def _client(monkeypatch, *, authed=True, allowlist=("files.example-project.supabase.co",)):
    _EnvelopeSpy.calls = 0

    async def fake_require_planner(authorization=None, x_planner_token=None, *a, **k):
        if not authed:
            raise HTTPException(401, "Planner authentication required")
        return {"id": "planner-1", "email": "p@x.com"}

    async def fake_create_envelope(*a, **k):
        _EnvelopeSpy.calls += 1
        raise AssertionError("DocuSign was contacted — this test must stay offline")

    async def fake_resolve(host):
        import ipaddress
        return [ipaddress.ip_address("93.184.216.34")]

    monkeypatch.setattr(ds_mod, "require_planner", fake_require_planner)
    monkeypatch.setattr(ds_mod, "is_docusign_configured", lambda: True)
    monkeypatch.setattr(ds_mod, "create_envelope", fake_create_envelope)
    monkeypatch.setattr(ds_mod, "storage_allowed_hosts", lambda: list(allowlist))
    monkeypatch.setattr(safe_fetch, "_resolve_all", fake_resolve)

    test_app = FastAPI()
    test_app.include_router(ds_mod.router)
    return TestClient(test_app)


def test_send_envelope_requires_authentication(monkeypatch):
    r = _client(monkeypatch, authed=False).post("/api/docusign/send-envelope", json=BODY)
    assert r.status_code == 401
    assert _EnvelopeSpy.calls == 0


def test_send_envelope_refuses_a_contract_url_outside_the_allowlist(monkeypatch):
    """Authenticated is not enough — the contract must come from approved storage."""
    client = _client(monkeypatch)
    body = dict(BODY, contract_url="https://169.254.169.254/latest/meta-data/")
    r = client.post("/api/docusign/send-envelope", json=body)
    assert r.status_code == 400
    assert _EnvelopeSpy.calls == 0
    assert "169.254" not in r.json()["detail"]        # no SSRF oracle in the error


def test_send_envelope_refuses_a_non_https_contract_url(monkeypatch):
    client = _client(monkeypatch)
    body = dict(BODY, contract_url="http://files.example-project.supabase.co/c.pdf")
    r = client.post("/api/docusign/send-envelope", json=body)
    assert r.status_code == 400
    assert _EnvelopeSpy.calls == 0


def test_send_envelope_fails_closed_with_no_allowlist(monkeypatch):
    client = _client(monkeypatch, allowlist=())
    r = client.post("/api/docusign/send-envelope", json=BODY)
    assert r.status_code == 503
    assert _EnvelopeSpy.calls == 0


def test_the_authenticated_happy_path_reaches_the_fetch(monkeypatch):
    """An authenticated planner with an approved URL is NOT blocked by these
    guards — proving the gates reject abuse, not legitimate callers."""
    client = _client(monkeypatch)

    async def fake_safe_get(url, **kw):
        return b"%PDF-1.7", "application/pdf", url

    monkeypatch.setattr(ds_mod, "safe_get", fake_safe_get)
    r = client.post("/api/docusign/send-envelope", json=BODY)
    # It got PAST auth and past the fetch guard, and died only at the stubbed
    # DocuSign call — which is exactly how far an offline test can go.
    assert r.status_code != 401
    assert r.status_code != 400
    assert _EnvelopeSpy.calls == 1
