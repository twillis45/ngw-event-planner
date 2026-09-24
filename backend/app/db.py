"""asyncpg connection pool (lazy, one shared pool per event loop).

── WHY THE LOOP IS PART OF THE CACHE KEY (2026-09-24) ───────────────────────

An asyncpg pool is bound to the event loop that created it. This module cached
one pool in a plain module global, which is correct under uvicorn — one
long-lived loop, one pool, six routers sharing it — and silently broken wherever
a second loop appears.

It was found by a demo that LIED. Driving `/api/shopping/kroger/search-list`
three times through `fastapi.testclient.TestClient` showed a price-observation
row count that stayed flat, which reads exactly like the idempotent id working.
It was not: TestClient runs each request in its own event loop, so the pool
created during the first request was bound to a loop that was dead by the
second, and every write after the first failed with

    price observation write skipped: Event loop is closed

The count was flat because nothing was written. The failure is silent by
construction — any caller that swallows write errors (as the observation writer
deliberately does, so a governance write cannot break a host's page) sees a
working system.

Production never hit this: uvicorn serves every request on one loop, so the
cached pool was always the right one. But "correct only under one caller" is not
a property this module stated, and six routers depend on it.

A pool whose loop has gone is ABANDONED rather than closed, because closing it
means awaiting on that dead loop. Its connections leak until the process exits —
the right trade for a branch that only executes where the alternative is a
failure, and one that stays unexecuted in production.
"""
import asyncio

import asyncpg

from .config import DATABASE_URL

_pool: asyncpg.Pool | None = None
_pool_loop: asyncio.AbstractEventLoop | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool, _pool_loop
    loop = asyncio.get_running_loop()
    # A pool from another loop, or one already closing, cannot serve this call.
    # Dropping the reference is deliberate — see the note above.
    if _pool is not None and (_pool_loop is not loop or _pool.is_closing()):
        _pool = None
        _pool_loop = None
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL / SUPABASE_DB_URL is not set")
        # Supabase requires SSL; the pooler runs pgbouncer, so disable asyncpg's
        # prepared-statement cache to avoid "prepared statement already exists".
        # UNCHANGED, deliberately: `ssl="require"` is about the deployed database
        # and has nothing to do with the loop defect above. asyncpg ignores it on
        # a unix socket, so a local demo connects without it being weakened here.
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1, max_size=5, command_timeout=15,
            ssl="require",
            statement_cache_size=0,
        )
        _pool_loop = loop
    return _pool


async def close_pool() -> None:
    global _pool, _pool_loop
    if _pool is not None:
        await _pool.close()
        _pool = None
        _pool_loop = None
