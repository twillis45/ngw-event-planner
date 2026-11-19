"""A pass purchase reaches analytics from the server, with its amount and no
identity (owner, 11/19/2026: "Build the PostHog fixes"). app/analytics.py."""
import asyncio
import hashlib

from app import analytics


META = {"kind": "pass", "event_id": "ev-123", "studio_id": "st-1", "purchased_by": "user-abc",
        "sku": "one-event-pass", "came_from": "invite", "came_from_kind": "Friendsgiving"}


def test_the_purchase_carries_the_amount_and_a_hashed_buyer():
    p = analytics.pass_purchase_payload(META, 3900, "USD")
    assert p["event"] == "pass_purchased"
    assert p["distinct_id"] == "host_" + hashlib.sha256(b"user-abc").hexdigest()[:16]
    assert p["properties"]["amount_cents"] == 3900 and p["properties"]["currency"] == "usd"
    assert p["properties"]["event_id_hash"] == hashlib.sha256(b"ev-123").hexdigest()[:16]
    assert p["properties"]["came_from"] == "invite" and p["properties"]["came_from_kind"] == "Friendsgiving"


def test_nothing_identifying_is_sent():
    blob = repr(analytics.pass_purchase_payload(META, 3900, "usd"))
    for raw in ("user-abc", "ev-123", "st-1"):
        assert raw not in blob


def test_no_buyer_no_event():
    assert analytics.pass_purchase_payload({**META, "purchased_by": ""}, 3900, "usd") is None


def test_off_outside_render(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    sent = []

    class Boom:
        def __init__(self, *a, **k): sent.append(1)

    monkeypatch.setattr(analytics.httpx, "AsyncClient", Boom)
    asyncio.run(analytics.capture(analytics.pass_purchase_payload(META, 3900, "usd")))
    assert sent == []


def test_a_failed_capture_never_raises(monkeypatch):
    monkeypatch.setenv("RENDER", "true")

    class Down:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): raise RuntimeError("network down")

    monkeypatch.setattr(analytics.httpx, "AsyncClient", Down)
    asyncio.run(analytics.capture(analytics.pass_purchase_payload(META, 3900, "usd")))   # no exception
