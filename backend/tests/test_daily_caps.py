"""Daily caps the server keeps in the database (security self-test M2, M4).

M2: AI calls were limited to 15/min per user in process memory — about 21,600
a day per account, reset by every deploy and multiplied by workers. Now a
per-user and an all-users daily ceiling are counted in public.rate_counters.
M4: invite, remove, invite again re-sent the co-host email without limit (the
10-co-host cap counts current rows). Now invite emails per event per day are
counted, and past the cap the invite is refused before anything is sent.
"""
import sys
import types
import asyncio

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from fastapi import HTTPException

from app import rate_counter as rc


class Conn:
    def __init__(self, ready=True): self.n = {}; self.ready = ready
    async def fetchval(self, q, *a):
        if "to_regclass" in q: return "public.rate_counters" if self.ready else None
        if "insert into public.rate_counters" in q:
            self.n[a[0]] = self.n.get(a[0], 0) + 1
            return self.n[a[0]]
        raise AssertionError(q)


def test_under_the_cap_is_allowed_and_counted():
    c = Conn()
    assert all(asyncio.run(rc.bump(c, "k", 3)) for _ in range(3))
    assert c.n["k"] == 3


def test_past_the_cap_is_refused():
    c = Conn()
    for _ in range(3): asyncio.run(rc.bump(c, "k", 3))
    assert asyncio.run(rc.bump(c, "k", 3)) is False


def test_before_the_migration_lands_it_allows_and_does_not_break_the_app():
    assert asyncio.run(rc.bump(Conn(ready=False), "k", 0)) is True


def test_the_ai_routes_check_the_daily_budget(monkeypatch):
    import app.routers.ai as ai
    src = open(ai.__file__).read()
    # Every place that checks the per-minute limit also checks the day.
    assert src.count("_rate_check(user_id)") == src.count("await _daily_budget(user_id)") >= 4


def test_the_ai_daily_budget_refuses_past_the_per_user_cap(monkeypatch):
    import app.routers.ai as ai
    c = Conn()
    class Pool:
        def acquire(self):
            class Ctx:
                async def __aenter__(s): return c
                async def __aexit__(s, *a): return False
            return Ctx()
    async def gp(): return Pool()
    monkeypatch.setattr(ai, "get_pool", gp)
    monkeypatch.setattr(ai, "AI_DAILY_PER_USER", 2)
    asyncio.run(ai._daily_budget("u1")); asyncio.run(ai._daily_budget("u1"))
    with pytest.raises(HTTPException) as e:
        asyncio.run(ai._daily_budget("u1"))
    assert e.value.status_code == 429
    asyncio.run(ai._daily_budget("u2"))   # another host is not affected
