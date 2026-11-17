"""The public Kroger price route cannot rewrite the price record (security
self-test, 11/17/2026, M3).

/api/shopping/kroger/search-list is public by design (it prices a host's list
before sign-in), and it records each priced line as a KAS observation whose id
is deterministic: obs-price-{asset}-{purchaseId}-{store}-{month}. The write was
an UPSERT, so anyone could POST "term: caviar, purchaseId: ice-10lb" and replace
this month's real observation — resetting an admin-reviewed record to `open`
and wiping its audit trail. And `items` had no limit, one Kroger call each.
Now the first observation of the month stands (insert-if-absent), and a list is
capped.
"""
import sys
import types
import asyncio

if "asyncpg" not in sys.modules:
    _stub = types.ModuleType("asyncpg")
    _stub.Pool = object
    sys.modules["asyncpg"] = _stub

import pytest
from pydantic import ValidationError

import app.routers.kroger as kr


def test_an_existing_observation_is_never_overwritten(monkeypatch):
    seen = []
    class Conn:
        async def execute(self, q, *a): seen.append(q)
        def transaction(self):
            class T:
                async def __aenter__(s): return s
                async def __aexit__(s, *a): return False
            return T()
    class Pool:
        def acquire(self):
            class Ctx:
                async def __aenter__(s): return Conn()
                async def __aexit__(s, *a): return False
            return Ctx()
    async def gp(): return Pool()
    import app.db as db
    monkeypatch.setattr(db, "get_pool", gp)
    n = asyncio.run(kr._persist_observations([{"id": "obs-price-get-together-ice-10lb-01400943-2026-11", "assetId": "Get-Together"}]))
    assert n == 1 and len(seen) == 1
    q = " ".join(seen[0].split()).lower()
    assert "on conflict (id) do nothing" in q and "do update" not in q


def test_a_list_is_capped():
    ok = kr.SearchListRequest(items=[{"name": f"item {i}"} for i in range(kr.MAX_LIST_ITEMS)])
    assert len(ok.items) == kr.MAX_LIST_ITEMS
    with pytest.raises(ValidationError):
        kr.SearchListRequest(items=[{"name": f"item {i}"} for i in range(kr.MAX_LIST_ITEMS + 1)])
