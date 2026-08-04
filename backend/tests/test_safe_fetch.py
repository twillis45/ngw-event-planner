# ── OVERSIZE IS A CALLER'S DECISION, NOT A BLANKET REFUSAL ──────────────────
#
# Driven on 2026-08-04: every real Airbnb listing came back
# 400 "That document is too large to read." The unfurl route's cap already said
# what it meant — "a listing head is small; stop reading long before a full
# page" — and safe_get turned STOP READING into REFUSE, so a host who pasted a
# listing link got a row with no name, no price and no picture.
#
# The byte ceiling is identical in both modes: we stop reading and close the
# connection at the same point. Only what we do with the bytes already in hand
# differs, so truncation weakens no limit. Default stays refusal, because a
# truncated JSON body is not small JSON, it is corrupt JSON.
#
# Async style follows the rest of this suite (asyncio.run in a sync test) —
# pytest-asyncio is not configured here.
import asyncio

import httpx
import pytest

from app.safe_fetch import SafeFetchError, safe_get

HOSTS = ("www.airbnb.com",)
TYPES = ("text/html",)
URL = "https://www.airbnb.com/rooms/1"


def _serve(monkeypatch, body: bytes, headers=None):
    """Answer every request with `body`, leaving safe_get's own guards intact."""
    def handler(request):
        return httpx.Response(
            200, content=body,
            headers={"content-type": "text/html", **(headers or {})},
        )

    real = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)


def test_oversize_refuses_by_default(monkeypatch):
    _serve(monkeypatch, b"x" * 5000)
    with pytest.raises(SafeFetchError) as err:
        asyncio.run(safe_get(URL, allowed_hosts=HOSTS,
                             allowed_content_types=TYPES, max_bytes=1000))
    assert "too large" in str(err.value)


def test_truncate_keeps_the_head_and_stops(monkeypatch):
    _serve(monkeypatch, b"y" * 5000)
    body, ctype, final = asyncio.run(safe_get(
        URL, allowed_hosts=HOSTS, allowed_content_types=TYPES,
        max_bytes=1000, truncate_at_max=True))
    assert len(body) == 1000          # never more than the cap
    assert ctype == "text/html"


def test_truncate_ignores_an_oversized_content_length(monkeypatch):
    # The declared-length short circuit must not refuse a caller that truncates.
    _serve(monkeypatch, b"z" * 5000, {"content-length": "5000"})
    body, _, _ = asyncio.run(safe_get(
        URL, allowed_hosts=HOSTS, allowed_content_types=TYPES,
        max_bytes=1000, truncate_at_max=True))
    assert len(body) == 1000


def test_a_document_inside_the_cap_is_untouched(monkeypatch):
    _serve(monkeypatch, b"w" * 400)
    body, _, _ = asyncio.run(safe_get(
        URL, allowed_hosts=HOSTS, allowed_content_types=TYPES,
        max_bytes=1000, truncate_at_max=True))
    assert len(body) == 400
