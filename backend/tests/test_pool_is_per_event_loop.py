"""A pool from a dead event loop must not be handed out again.

THE DEFECT THIS PINS. `db.py` cached one asyncpg pool in a module global. An
asyncpg pool is bound to the loop that created it, so any second loop got a pool
it could not use — and because the observation writer swallows write errors by
design (a governance write must never break a host's page), the failure was
silent. A demo driving the same route three times through TestClient reported a
flat row count as idempotency working; nothing had been written after the first
call.

These tests need no database: `get_pool` raises before it ever connects when
DATABASE_URL is unset, so the CACHE behaviour is observable without one. What is
asserted is which pool object comes back, and when a stale one is dropped.
"""
import asyncio

import pytest

from app import db


@pytest.fixture(autouse=True)
def _clean():
    db._pool = None
    db._pool_loop = None
    yield
    db._pool = None
    db._pool_loop = None


class _FakePool:
    def __init__(self):
        self._closing = False

    def is_closing(self):
        return self._closing


def test_the_same_loop_gets_the_same_pool():
    # The production path. Changing nothing here is the point of the fix.
    async def main():
        db._pool = _FakePool()
        db._pool_loop = asyncio.get_running_loop()
        first = await db.get_pool()
        second = await db.get_pool()
        assert first is second
        return first

    pool = asyncio.run(main())
    assert isinstance(pool, _FakePool)


def test_A_POOL_FROM_A_DEAD_LOOP_IS_NOT_REUSED():
    # The defect, reproduced: loop A creates a pool, loop A ends, loop B asks.
    # Before the fix the stale pool came straight back and every query on it
    # failed with "Event loop is closed" — silently, for any caller that
    # swallows errors.
    async def loop_a():
        db._pool = _FakePool()
        db._pool_loop = asyncio.get_running_loop()
        return db._pool

    stale = asyncio.run(loop_a())

    async def loop_b():
        # It must NOT return `stale`. With no DATABASE_URL the rebuild raises,
        # and that raise is the proof the stale pool was discarded rather than
        # handed back — the error names the missing config, not a dead loop.
        with pytest.raises(RuntimeError, match="DATABASE_URL"):
            await db.get_pool()
        assert db._pool is None
        assert db._pool_loop is None

    asyncio.run(loop_b())
    assert stale is not None  # the object still exists; it is simply abandoned


def test_A_CLOSING_POOL_ON_THE_SAME_LOOP_IS_ALSO_DROPPED():
    # The second staleness case: right loop, but the pool is shutting down.
    async def main():
        p = _FakePool()
        p._closing = True
        db._pool = p
        db._pool_loop = asyncio.get_running_loop()
        with pytest.raises(RuntimeError, match="DATABASE_URL"):
            await db.get_pool()
        assert db._pool is None

    asyncio.run(main())


def test_close_pool_clears_the_loop_too():
    # A cleared pool with a remembered loop would make the next get_pool compare
    # against a loop no pool belongs to. Cheap to get wrong, cheap to pin.
    class _Closable(_FakePool):
        async def close(self):
            self._closing = True

    async def main():
        db._pool = _Closable()
        db._pool_loop = asyncio.get_running_loop()
        await db.close_pool()
        assert db._pool is None
        assert db._pool_loop is None

    asyncio.run(main())
