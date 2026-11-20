"""Shared by the email-picture tests (not collected: no test_ prefix).

`pics` stands in for Supabase Storage the way the invite-card tests do: the
picture really is drawn, re-encoded and "stored" in a dict, and the public
route reads it back from there.
"""
import re

import pytest

import app.email_pictures as ep

PICTURE = re.compile(r'<img src="https://[^"]+/api/public/email-card/([0-9a-f]{32})" width="518" alt="([^"]*)"')


@pytest.fixture
def pics(monkeypatch):
    store = {}
    async def put(path, data): store[path] = data; return True
    async def get(path): return store.get(path)
    monkeypatch.setattr(ep, "_storage_configured", lambda: True)
    monkeypatch.setattr(ep, "_put", put)
    monkeypatch.setattr(ep, "_get", get)
    return store


def picture(html):
    """(token, alt) of the email's picture, or None."""
    m = PICTURE.search(html)
    return (m.group(1), m.group(2)) if m else None


def no_picture(html):
    return "/api/public/email-card/" not in html and "<img" not in html
