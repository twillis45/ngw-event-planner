"""
Backend webhook relay — Sprint 68.

Receives { url, payload } from the NGW frontend and fires the payload
to the planner-configured webhook URL server-side, bypassing any CORS
restrictions on the receiving endpoint.

CTA truthfulness: DONE — the relay fires and logs the delivery status.
Retry logic is Phase 4.

Routes:
  POST /api/webhooks/relay  — relay payload to external URL
  GET  /api/webhooks/status — confirm relay is operational
"""

import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

log = logging.getLogger("ngw.webhooks")
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class RelayRequest(BaseModel):
    url: str   # destination webhook URL (planner-configured)
    payload: Any   # the webhook body dict


@router.get("/status")
async def webhook_status():
    """Confirm the relay endpoint is reachable."""
    return {"ok": True, "relay": "ready"}


@router.post("/relay")
async def relay_webhook(body: RelayRequest):
    """
    Relay a webhook payload to an external URL.

    Fires from the server side so the receiving endpoint never needs to
    set CORS headers to allow browser requests. Returns the HTTP status
    code returned by the destination — the frontend logs this for the
    planner's webhook delivery log.

    Timeout: 10s (aggressive — webhook receivers should ACK fast).
    No retry: Phase 4 concern.
    """
    if not body.url or not body.url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid webhook URL — must start with http/https")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                body.url,
                json=body.payload,
                headers={
                    "Content-Type":  "application/json",
                    "User-Agent":    "NGW-Event-Planner-Webhook/1.0",
                    "X-NGW-Source":  "ngw-event-planner",
                },
            )

        log.info(
            "webhook_relay url=%s event=%s status=%d",
            body.url,
            body.payload.get("event", "unknown") if isinstance(body.payload, dict) else "?",
            resp.status_code,
        )
        return {
            "ok":          resp.status_code < 400,
            "status_code": resp.status_code,
            "destination": body.url,
        }

    except httpx.TimeoutException:
        log.warning("webhook_relay timeout url=%s", body.url)
        raise HTTPException(status_code=504, detail="Webhook receiver timed out (>10s)")

    except Exception as e:
        log.error("webhook_relay error url=%s: %s", body.url, e)
        raise HTTPException(status_code=502, detail=f"Webhook delivery error: {e}")
