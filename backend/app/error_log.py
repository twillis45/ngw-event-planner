"""Server-side error log (A3-err).

`record_error` appends a row to ``admin_error_log`` for failures that frontend
Sentry cannot see (AI-proxy, email, DocuSign, Stripe, unhandled API exceptions).
It is BEST-EFFORT and NEVER raises — a logging failure must not break the request
that triggered it. Read back via the admin console's Errors tab / GET
/api/admin/errors and counted into the Triage hero.
"""
import json as _json
import logging
from typing import Optional

from .db import get_pool

log = logging.getLogger("ngw.errorlog")

# Keep stored messages bounded so a giant traceback can't bloat the table.
_MAX_MESSAGE = 2000


async def record_error(
    source: str,
    message: str,
    level: str = "error",
    context: Optional[dict] = None,
) -> None:
    """Append an error row. Swallows all exceptions (logs at ERROR if the write
    itself fails, so gaps are visible rather than silent)."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """insert into admin_error_log (source, level, message, context)
                   values ($1, $2, $3, $4::jsonb)""",
                source,
                level if level in ("error", "warning") else "error",
                (message or "")[:_MAX_MESSAGE],
                _json.dumps(context or {}),
            )
    except Exception as e:  # noqa: BLE001 — telemetry must never break the request
        log.error("record_error write failed source=%s: %s", source, e)
