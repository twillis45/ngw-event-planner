"""
Backend webhook relay — Sprint 68.

Receives { url, payload } from the NGW frontend and fires the payload
to the planner-configured webhook URL server-side, bypassing any CORS
restrictions on the receiving endpoint.

CTA truthfulness: DONE — the relay fires and logs the delivery status.
Retry logic is Phase 4.

Routes:
  POST /api/webhooks/relay  — relay payload to external URL (planner-only,
                              destination validated by safe_fetch)
  GET  /api/webhooks/status — confirm relay is operational
"""

import logging
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Any, Optional

from ..auth import require_planner
from ..safe_fetch import SafeFetchError, validate_public_url

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
async def relay_webhook(
    body: RelayRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """
    Relay a webhook payload to an external URL.

    Fires from the server side so the receiving endpoint never needs to
    set CORS headers to allow browser requests. Returns the HTTP status
    code returned by the destination — the frontend logs this for the
    planner's webhook delivery log.

    Timeout: 10s (aggressive — webhook receivers should ACK fast).
    No retry: Phase 4 concern.
    """
    # ── THIS WAS AN UNAUTHENTICATED SSRF (fixed 2026-08-07) ──────────────────
    # The endpoint took an arbitrary `url` from an unauthenticated request body
    # and POSTed to it from inside the server's own network, gated only by
    # `startswith("http")`. That accepted http://169.254.169.254/... (cloud
    # instance metadata, which hands out credentials), http://localhost:5432,
    # and any private-range address — turning the relay into a proxy into the
    # deployment's internals for anyone who could reach the API.
    #
    # This repo already had the guard: app/safe_fetch.py, written for exactly
    # this class and already applied at three other call sites. The relay was
    # never wired to it.
    #
    # Two changes: the caller must now be a planner, and the destination goes
    # through validate_public_url — https only, no embedded credentials, and
    # every resolved address must be global unicast.
    await require_planner(authorization, x_planner_token)

    if not body.url:
        raise HTTPException(status_code=400, detail="A webhook URL is required.")
    try:
        await validate_public_url(body.url)
    except SafeFetchError as e:
        raise HTTPException(status_code=e.status_code, detail=e.reason)

    try:
        # follow_redirects stays OFF — a 302 would move this POST to an address
        # that was never validated, which is the standard bypass for the check
        # above. httpx defaults to False; it is explicit here so nobody "fixes"
        # it later.
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
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
