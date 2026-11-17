"""Daily counters the server keeps in the database (security self-test, 11/17/2026).

One row per (key, day) in public.rate_counters (migration 030), which no browser
role can read or write. Used where a limit held in process memory reset on every
deploy and multiplied by workers (AI calls), or where none existed (co-host
invite emails). Before 030 reaches a database the table is absent; the counter
then allows and logs, so a migration lag never takes a feature down.
"""
import logging

log = logging.getLogger("ngw.rate_counter")


async def bump(conn, key: str, limit: int) -> bool:
    """Count one use of `key` today. True while today's count is within `limit`."""
    if not await conn.fetchval("select to_regclass('public.rate_counters')"):
        log.warning("rate_counters missing (migration 030 not applied); allowing %s", key.split(":", 1)[0])
        return True
    n = await conn.fetchval(
        """insert into public.rate_counters (key, day, n) values ($1, current_date, 1)
           on conflict (key, day) do update set n = public.rate_counters.n + 1
           returning n""",
        key,
    )
    return (n or 0) <= limit
