"""NGW Events API — FastAPI entrypoint.
Run locally:  uvicorn app.main:app --reload --port 8000
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
from .db import close_pool
from .routers import communication
from .routers import docusign
from .routers import ai
from .routers import webhooks
from .emailer import is_email_configured

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


@app.post("/api/resend-webhook")
async def resend_webhook(request):
    """Fix #5: Resend delivery status webhooks → update message metadata.
    Configure in Resend → Webhooks → Add endpoint:
      URL: https://ngw-events-api.onrender.com/api/resend-webhook
      Events: email.sent, email.delivered, email.bounced, email.opened
    """
    import logging
    log = logging.getLogger("ngw.resend_webhook")
    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}

    event_type = payload.get("type", "")
    data       = payload.get("data", {})
    resend_id  = data.get("email_id") or data.get("id")

    if not resend_id:
        return {"ok": True}

    status_map = {
        "email.sent":       "email-sent",
        "email.delivered":  "email-delivered",
        "email.opened":     "email-opened",
        "email.bounced":    "email-bounced",
        "email.complained": "email-bounced",
        "email.clicked":    "email-opened",
    }
    new_status = status_map.get(event_type)
    if not new_status:
        return {"ok": True}

    try:
        from .db import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """update event_messages
                      set metadata = jsonb_set(coalesce(metadata,'{}'),'{delivery,status}',to_jsonb($1::text)),
                          updated_at = now()
                    where metadata->'delivery'->>'resend_id' = $2""",
                new_status, resend_id,
            )
            log.info("resend_webhook: %s id=%s → %s", event_type, resend_id, new_status)
    except Exception as e:
        log.error("resend_webhook error: %s", e)

    return {"ok": True}

@app.get("/api/capabilities")
async def capabilities():
    """Sprint 58.2: tells the frontend what backend features are available.
    Never exposes secrets — only boolean flags."""
    return {
        "email_configured": is_email_configured(),
        "service": "ngw-events-api",
    }

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
app.include_router(docusign.router)
app.include_router(ai.router)
app.include_router(webhooks.router)
