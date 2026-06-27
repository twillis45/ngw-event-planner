"""NGW Events API — FastAPI entrypoint.
Run locally:  uvicorn app.main:app --reload --port 8000
"""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

import base64
import hashlib
import hmac
from .config import ALLOWED_ORIGINS, ALLOWED_ORIGIN_REGEX
from .db import close_pool
from .routers import communication
from .routers import docusign
from .routers import ai
from .routers import weather
from .routers import webhooks
from .routers import stripe_payments
from .routers import admin
from .routers import food_prices
from .routers import instacart
from .routers import kroger
from .routers import rsvp
from .emailer import is_email_configured
from .config import STRIPE_SECRET_KEY, RESEND_WEBHOOK_SECRET

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


@app.middleware("http")
async def _error_capture(request: Request, call_next):
    """Record unhandled exceptions to admin_error_log (A3-err), then re-raise so
    the normal 500 response is unchanged. Deliberate HTTPExceptions (4xx/5xx) do
    NOT reach here — they're handled by FastAPI and logged at their call site."""
    try:
        return await call_next(request)
    except Exception as e:  # noqa: BLE001 — record then re-raise; never swallow
        try:
            from .error_log import record_error
            await record_error("api", f"{request.method} {request.url.path}: {e}",
                               context={"path": request.url.path, "method": request.method})
        except Exception:  # noqa: BLE001 — capture must never mask the real error
            pass
        raise


@app.get("/health")
async def health():
    return {"ok": True, "service": "ngw-events-api"}


def _verify_resend_signature(body: bytes, svix_id: str, svix_timestamp: str, svix_signature: str) -> bool:
    """Verify a Resend/Svix webhook signature.

    Resend signs webhooks using Svix. The signed content is:
        "{svix_id}.{svix_timestamp}.{raw_body}"
    The signature header contains one or more "v1,<base64_hmac_sha256>" values
    separated by spaces.

    Returns True if any signature matches. Returns True unconditionally when
    RESEND_WEBHOOK_SECRET is not set (dev mode — document as security gap).
    """
    if not RESEND_WEBHOOK_SECRET:
        return True  # signature not verified — set RESEND_WEBHOOK_SECRET in production

    signed_content = f"{svix_id}.{svix_timestamp}.".encode() + body
    try:
        secret_bytes = base64.b64decode(RESEND_WEBHOOK_SECRET.removeprefix("whsec_"))
    except Exception:
        secret_bytes = RESEND_WEBHOOK_SECRET.encode()

    expected_mac = hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
    expected_b64 = base64.b64encode(expected_mac).decode()

    for sig_part in (svix_signature or "").split(" "):
        if "," not in sig_part:
            continue
        version, sig_b64 = sig_part.split(",", 1)
        if version == "v1" and hmac.compare_digest(sig_b64, expected_b64):
            return True
    return False


# Delivery status map — these are the Resend webhook event types as documented
# at resend.com/docs/api-reference/webhooks/introduction (verified 2026-06).
# Note: Resend does NOT currently emit a `email.delivery_delayed` event; it sends
# `email.bounced` for hard bounces and `email.complained` for spam complaints.
# If Resend adds new event types, add them here and redeploy.
_RESEND_STATUS_MAP = {
    "email.sent":              "email-accepted",   # Resend accepted for delivery
    "email.delivered":         "email-delivered",  # Receiving MTA confirmed delivery
    "email.opened":            "email-opened",
    "email.clicked":           "email-opened",
    "email.bounced":           "email-bounced",    # Hard or soft bounce
    "email.complained":        "email-complained", # Spam complaint — distinct from bounce
    "email.delivery_delayed":  "email-deferred",   # Temporary delivery failure; Resend will retry
}


@app.post("/api/resend-webhook")
async def resend_webhook(request: Request):
    """Resend delivery status webhooks → update event_messages.metadata.delivery.

    Configure in Resend Dashboard → Webhooks → Add endpoint:
      URL:    https://ngw-events-api.onrender.com/api/resend-webhook
      Events: email.sent, email.delivered, email.bounced,
              email.complained, email.delivery_delayed

    Signature verification: optional but strongly recommended in production.
    Set RESEND_WEBHOOK_SECRET (from Resend Dashboard → Webhooks → endpoint → Signing Secret).
    Without it, any caller can POST to this endpoint and spoof delivery status.

    Lookup key: metadata->'delivery'->>'resend_id' — set at send time.
    """
    log = logging.getLogger("ngw.resend_webhook")

    raw_body = await request.body()

    # Signature verification (Svix protocol used by Resend)
    svix_id        = request.headers.get("svix-id", "")
    svix_timestamp = request.headers.get("svix-timestamp", "")
    svix_signature = request.headers.get("svix-signature", "")

    if RESEND_WEBHOOK_SECRET and not _verify_resend_signature(raw_body, svix_id, svix_timestamp, svix_signature):
        log.warning("resend_webhook: invalid signature — rejected")
        from fastapi import Response
        return Response(status_code=401, content="invalid signature")

    if not RESEND_WEBHOOK_SECRET:
        log.warning("resend_webhook: RESEND_WEBHOOK_SECRET not set — signature not verified (set in production)")

    try:
        import json as _json
        payload = _json.loads(raw_body)
    except Exception:
        return {"ok": True}

    event_type = payload.get("type", "")
    data       = payload.get("data", {})
    resend_id  = data.get("email_id") or data.get("id")

    new_status = _RESEND_STATUS_MAP.get(event_type)
    if not new_status or not resend_id:
        log.debug("resend_webhook: unhandled event_type=%s resend_id=%s", event_type, resend_id)
        return {"ok": True}

    try:
        from .db import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Update the delivery status; also store the event type for audit
            result = await conn.execute(
                """update event_messages
                      set metadata = jsonb_set(
                              jsonb_set(coalesce(metadata,'{}'), '{delivery,status}', to_jsonb($1::text)),
                              '{delivery,provider_event}', to_jsonb($3::text)
                          ),
                          updated_at = now()
                    where metadata->'delivery'->>'resend_id' = $2""",
                new_status, resend_id, event_type,
            )
            log.info("resend_webhook: %s id=%s → %s (%s)", event_type, resend_id, new_status, result)
    except Exception as e:
        log.error("resend_webhook error: %s", e)

    return {"ok": True}

@app.get("/api/capabilities")
async def capabilities():
    """Tells the frontend what backend features are available.
    Never exposes secrets — only boolean flags."""
    return {
        "email_configured":  is_email_configured(),
        "stripe_configured": bool(STRIPE_SECRET_KEY),
        "service": "ngw-events-api",
    }

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
app.include_router(docusign.router)
app.include_router(ai.router)
app.include_router(weather.router)
app.include_router(webhooks.router)
app.include_router(stripe_payments.router)
app.include_router(admin.router)
app.include_router(food_prices.router)
app.include_router(instacart.router)
app.include_router(kroger.router)
app.include_router(rsvp.router)
