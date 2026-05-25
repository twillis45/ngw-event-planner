"""asyncpg connection pool (lazy, single shared pool)."""
import asyncpg
from .config import DATABASE_URL

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL / SUPABASE_DB_URL is not set")
        # Supabase requires SSL; the pooler runs pgbouncer, so disable asyncpg's
        # prepared-statement cache to avoid "prepared statement already exists".
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1, max_size=5, command_timeout=15,
            ssl="require",
            statement_cache_size=0,
        )
    return _pool

async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
