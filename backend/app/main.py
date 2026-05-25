"""NGW Events API — FastAPI entrypoint.
Run locally:  uvicorn app.main:app --reload --port 8000
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .db import close_pool
from .routers import communication

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="NGW Events API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

@app.get("/health")
async def health():
    return {"ok": True, "service": "ngw-events-api"}

# TEMP diagnostic — surfaces the real DB error to the browser. Remove after setup.
@app.get("/db-check")
async def db_check():
    from .db import get_pool
    from .config import DATABASE_URL
    host = "(unset)"
    try:
        # show only host:port so we can confirm pooler vs direct, never the password
        if DATABASE_URL and "@" in DATABASE_URL:
            host = DATABASE_URL.split("@", 1)[1].split("/", 1)[0]
    except Exception:
        pass
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            one = await conn.fetchval("select 1")
            tables = await conn.fetchval(
                "select count(*) from information_schema.tables where table_name in "
                "('event_channels','event_messages','pinned_decisions','channel_read_state')")
        return {"db": "ok", "select1": one, "comm_tables_found": tables, "host": host}
    except Exception as e:
        return {"db": "error", "type": type(e).__name__, "detail": str(e)[:400], "host": host}

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
