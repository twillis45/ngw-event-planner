"""The PostHog relay: forwards only to PostHog, byte-for-byte, without cookies or auth."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import analytics_relay

seen = []


def _handler(request: httpx.Request) -> httpx.Response:
    seen.append(request)
    return httpx.Response(200, json={"status": 1}, headers={"set-cookie": "x=1"})


@pytest.fixture(autouse=True)
def mock_upstream(monkeypatch):
    seen.clear()
    monkeypatch.setattr(analytics_relay, "_client", httpx.AsyncClient(transport=httpx.MockTransport(_handler)))


client = TestClient(app)


def test_event_batch_forwards_to_posthog_ingestion_unchanged():
    body = b"\x1f\x8b gzip-ish bytes"
    r = client.post(
        "/api/relay/e/?compression=gzip-js&ver=1.2",
        content=body,
        headers={"content-type": "text/plain", "x-forwarded-for": "203.0.113.9, 10.0.0.1"},
    )
    assert r.status_code == 200 and r.json() == {"status": 1}
    up = seen[0]
    assert str(up.url).startswith("https://us.i.posthog.com/e/?")
    assert up.url.params["compression"] == "gzip-js"
    assert up.content == body
    assert up.headers["x-forwarded-for"] == "203.0.113.9"  # the visitor, for country lookup


def test_static_assets_go_to_the_asset_host():
    client.get("/api/relay/static/array.js")
    assert str(seen[0].url) == "https://us-assets.i.posthog.com/static/array.js"


def test_cookies_and_authorization_never_forward_and_no_cookie_comes_back():
    r = client.post(
        "/api/relay/i/v0/e/",
        content=b"{}",
        headers={"authorization": "Bearer secret", "cookie": "sb=1", "content-type": "application/json"},
    )
    up = seen[0]
    assert "authorization" not in up.headers and "cookie" not in up.headers
    assert "set-cookie" not in r.headers


@pytest.mark.parametrize("path", ["..%2F..%2Fetc", "a%2F..%2Fb", "e/%0d%0aHost:evil"])
def test_unsafe_paths_are_refused_without_an_upstream_call(path):
    r = client.get(f"/api/relay/{path}")
    assert r.status_code == 404
    assert seen == []


def test_oversized_body_is_refused():
    r = client.post("/api/relay/e/", content=b"x" * (analytics_relay.MAX_BODY + 1))
    assert r.status_code == 413 and seen == []


def test_other_methods_are_not_relayed():
    assert client.delete("/api/relay/e/").status_code == 405
    assert seen == []


def test_upstream_down_is_a_502_not_a_crash(monkeypatch):
    def boom(request):
        raise httpx.ConnectError("down")
    monkeypatch.setattr(analytics_relay, "_client", httpx.AsyncClient(transport=httpx.MockTransport(boom)))
    assert client.post("/api/relay/e/", content=b"{}").status_code == 502
