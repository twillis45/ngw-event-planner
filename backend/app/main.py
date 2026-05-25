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

# TEMP diagnostic — reports ONLY booleans (no secrets) so we can confirm which env
# vars the running backend actually loaded. Remove after auth setup is confirmed.
@app.get("/auth-config")
async def auth_config():
    from .config import SUPABASE_URL, SUPABASE_ANON_KEY, PLANNER_DEV_TOKEN
    ref = ""
    if SUPABASE_URL:
        ref = SUPABASE_URL.replace("https://", "").replace("http://", "").split(".")[0][:6] + "…"
    return {
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_ANON_KEY),
        "supabase_url_set": bool(SUPABASE_URL),
        "supabase_anon_set": bool(SUPABASE_ANON_KEY),
        "supabase_url_ref_hint": ref,   # first chars of the project ref only
        "dev_token_set": bool(PLANNER_DEV_TOKEN),
    }

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
