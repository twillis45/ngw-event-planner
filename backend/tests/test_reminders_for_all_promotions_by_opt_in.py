"""Plan reminders go to every host; promotions only to a host who opted in.

Owner ruling 11/19/2026 (plan G87): "Plan reminders go to all with one-click
unsubscribe; promotions only to people who tick an unchecked opt-in at
sign-up." app/host_email.py is the gate every host-facing sender goes through.
"""
import sys
import types

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import asyncio
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.host_email as he
import app.routers.communication as cm

HOST = "Host@Example.test"
OPTED = {"marketing_opt_in": {"at": "2026-11-19T15:00:00Z", "text": "v1"}}


class Conn:
    def __init__(self, stops): self.stops = stops
    async def fetchval(self, q, *a):
        if "to_regclass('public.email_stops')" in q:
            return "email_stops"
        if "select event_id from public.email_stops where token" in q:
            return next((k[0] for k, r in self.stops.items() if r["token"] == a[0]), None)
        raise AssertionError(q)
    async def fetchrow(self, q, *a):
        if "from public.email_stops where event_id" in q:
            return self.stops.get((a[0], a[1]))
        if "insert into public.email_stops" in q:
            self.stops.setdefault((a[0], a[1]), {"token": a[2], "stopped_at": None})
            return self.stops[(a[0], a[1])]
        raise AssertionError(q)
    async def execute(self, q, *a):
        if "update public.email_stops set stopped_at" in q:
            for r in self.stops.values():
                if r["token"] == a[0]:
                    r["stopped_at"] = "now"
            return "UPDATE 1"
        raise AssertionError(q)


class Pool:
    def __init__(self, c): self.c = c
    def acquire(self):
        c = self.c
        class Ctx:
            async def __aenter__(self): return c
            async def __aexit__(self, *a): return False
        return Ctx()


@pytest.fixture
def env(monkeypatch):
    stops = {}
    conn = Conn(stops)
    async def gp(): return Pool(conn)
    monkeypatch.setattr(cm, "get_pool", gp)
    monkeypatch.setenv("NGW_MAILING_ADDRESS", "No Guesswork Systems LLC, PO Box 1, Anytown, ST 00000")
    app = FastAPI(); app.include_router(cm.public_router)
    return types.SimpleNamespace(stops=stops, conn=conn, c=TestClient(app))


def tok(env, kind, meta=None, email=HOST):
    return asyncio.run(he.host_stop_token(env.conn, email, kind, meta))


def test_every_host_gets_reminders_with_a_stop_link(env):
    t = tok(env, "reminders")
    assert t and len(t) >= 22
    assert ("account/reminders", "host@example.test") in env.stops      # one row per address, lowercased
    h = he.headers(t)
    assert h["List-Unsubscribe"] == f"<{he.stop_url(t)}>" and h["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert tok(env, "reminders") == t                                    # the same token every time


def test_no_promotion_without_the_sign_up_opt_in(env):
    assert tok(env, "promotions") is None
    assert tok(env, "promotions", {"marketing_opt_in": {}}) is None
    assert tok(env, "promotions", {"marketing_opt_in": True}) is None
    assert tok(env, "promotions", OPTED)


def test_no_promotion_without_a_mailing_address(env, monkeypatch):
    monkeypatch.delenv("NGW_MAILING_ADDRESS")
    assert tok(env, "promotions", OPTED) is None
    assert tok(env, "reminders")                                         # reminders do not need one


def test_stopping_one_kind_never_stops_the_other(env):
    r, p = tok(env, "reminders"), tok(env, "promotions", OPTED)
    page = env.c.get(f"/api/public/email/stop/{p}")
    assert "Stop offers and news?" in page.text and "<form method=post" in page.text
    assert tok(env, "promotions", OPTED) == p                            # opening the link stops nothing
    done = env.c.post(f"/api/public/email/stop/{p}")
    assert "You won't get offers or news anymore" in done.text
    assert tok(env, "promotions", OPTED) is None
    assert tok(env, "reminders") == r


def test_the_reminder_stop_page_says_reminders(env):
    r = tok(env, "reminders")
    assert "Stop plan reminders?" in env.c.get(f"/api/public/email/stop/{r}").text
    env.c.post(f"/api/public/email/stop/{r}")
    assert tok(env, "reminders") is None


def test_an_account_stop_key_cannot_be_an_event_route_id():
    # The message route keys its stops by the {event_id} path segment, which
    # cannot contain "/"; the account keys all do, so the two never collide.
    assert all("/" in k for k in he.STOP_KEY.values())


def test_an_unknown_kind_is_a_bug():
    with pytest.raises(ValueError):
        asyncio.run(he.host_stop_token(None, HOST, "newsletter"))
