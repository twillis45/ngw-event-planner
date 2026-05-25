"""NGW Events API — FastAPI entrypoint.
Run locally:  uvicorn app.main:app --reload --port 8000
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
from .db import close_pool
from .routers import communication

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="NGW Events API", version="0.1.0")

# "*" in ALLOWED_ORIGINS opens it to any origin (CORS isn't the security boundary
# here — the Supabase JWT + per-event ownership are). Otherwise allow the explicit
# list plus anything matching ALLOWED_ORIGIN_REGEX (localhost / LAN by default).
_cors = dict(
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)
if "*" in ALLOWED_ORIGINS:
    _cors["allow_origins"] = ["*"]
else:
    _cors["allow_origins"] = ALLOWED_ORIGINS
    if ALLOWED_ORIGIN_REGEX:
        _cors["allow_origin_regex"] = ALLOWED_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **_cors)

@app.get("/health")
async def health():
    return {"ok": True, "service": "ngw-events-api"}

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
