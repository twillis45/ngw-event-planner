"""
DocuSign routes — Sprint 64

Routes:
  GET  /api/docusign/status          — check if DocuSign is configured
  GET  /api/docusign/connect         — start OAuth flow (redirect to DocuSign)
  GET  /api/docusign/callback        — OAuth callback, exchange code for tokens
  POST /api/docusign/send-envelope   — create envelope with contract + 2 signers
  GET  /api/docusign/envelope/{id}   — get envelope status
  POST /api/docusign/webhook         — receive DocuSign Connect event notifications

Token storage: access_token in Authorization header from frontend;
refresh_token stored in Supabase `planner_docusign_tokens` table
(created by migration 0005_docusign.sql).
For simplicity in the initial build, tokens are passed per-request from
the frontend (stored in the planner's profile in localStorage/Supabase).
"""

import json
import logging
import os
import secrets
import httpx
from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from ..docusign_client import (
    is_docusign_configured,
    get_oauth_url,
    exchange_code_for_token,
    refresh_access_token,
    get_user_info,
    create_envelope,
    get_envelope_status,
    get_envelope_document_url,
)
from ..config import APP_BASE_URL

log = logging.getLogger("ngw.docusign.routes")
router = APIRouter(prefix="/api/docusign", tags=["docusign"])


# ── Config status ─────────────────────────────────────────────────────────────
@router.get("/status")
async def docusign_status():
    """Returns whether DocuSign env vars are configured."""
    return {
        "configured": is_docusign_configured(),
        "sandbox": "demo.docusign.net" in (os.environ.get("DOCUSIGN_BASE_URL", "")),
    }


# ── OAuth: start ──────────────────────────────────────────────────────────────
@router.get("/connect")
async def docusign_connect():
    """Redirect the planner to DocuSign to authorize the integration."""
    if not is_docusign_configured():
        raise HTTPException(status_code=503, detail="DocuSign not configured")
    state = secrets.token_urlsafe(16)
    url = get_oauth_url(state)
    return RedirectResponse(url)


# ── OAuth: callback ───────────────────────────────────────────────────────────
@router.get("/callback")
async def docusign_callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """Receive the authorization code from DocuSign, exchange for tokens."""
    if error:
        return RedirectResponse(f"{APP_BASE_URL}?docusign_error={error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    try:
        tokens = await exchange_code_for_token(code)
        user_info = await get_user_info(tokens["access_token"])
        account = next((a for a in user_info.get("accounts", []) if a.get("is_default")),
                       (user_info.get("accounts") or [{}])[0])
        # Redirect back to frontend with tokens (frontend stores in profile)
        params = (
            f"docusign_connected=1"
            f"&docusign_access_token={tokens['access_token']}"
            f"&docusign_refresh_token={tokens.get('refresh_token', '')}"
            f"&docusign_expires_in={tokens.get('expires_in', 3600)}"
            f"&docusign_account_name={account.get('account_name', '')}"
        )
        return RedirectResponse(f"{APP_BASE_URL}?{params}")
    except Exception as e:
        log.error("DocuSign callback error: %s", e)
        return RedirectResponse(f"{APP_BASE_URL}?docusign_error=token_exchange_failed")


# ── Send envelope ─────────────────────────────────────────────────────────────
class SendEnvelopeRequest(BaseModel):
    contract_url: str            # Supabase Storage signed URL or public URL
    document_name: str           # e.g. "Petal & Stem — Wedding Contract.pdf"
    document_extension: str = "pdf"
    vendor_name: str
    vendor_email: str
    planner_name: str
    planner_email: str
    event_name: str
    event_id: str
    vendor_id: str
    access_token: str            # Planner's DocuSign access token (from profile)


@router.post("/send-envelope")
async def send_envelope(body: SendEnvelopeRequest):
    """
    Download the contract from storage, create a DocuSign envelope with
    two signers (vendor first, planner second), return the envelope ID.
    """
    if not is_docusign_configured():
        raise HTTPException(status_code=503, detail="DocuSign not configured on this server")

    # Fetch contract bytes from URL
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(body.contract_url)
            r.raise_for_status()
            doc_bytes = r.content
    except Exception as e:
        log.error("Could not fetch contract document: %s", e)
        raise HTTPException(status_code=400, detail=f"Could not fetch contract: {e}")

    subject = f"Contract for signature: {body.event_name} — {body.vendor_name}"

    try:
        result = await create_envelope(
            body.access_token,
            document_bytes=doc_bytes,
            document_name=body.document_name,
            document_extension=body.document_extension,
            envelope_email_subject=subject,
            vendor_name=body.vendor_name,
            vendor_email=body.vendor_email,
            planner_name=body.planner_name,
            planner_email=body.planner_email,
            event_name=body.event_name,
        )
        return {
            "ok": True,
            "envelope_id": result.get("envelopeId"),
            "status": result.get("status"),
            "uri": result.get("uri"),
        }
    except httpx.HTTPStatusError as e:
        log.error("DocuSign envelope creation failed: %s — %s", e.response.status_code, e.response.text)
        detail = "DocuSign API error"
        try:
            detail = e.response.json().get("message", detail)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)
    except Exception as e:
        log.error("Envelope creation exception: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Envelope status ───────────────────────────────────────────────────────────
@router.get("/envelope/{envelope_id}")
async def envelope_status(envelope_id: str, access_token: str):
    """Poll the status of a sent envelope."""
    if not is_docusign_configured():
        raise HTTPException(status_code=503, detail="DocuSign not configured")
    try:
        data = await get_envelope_status(access_token, envelope_id)
        signed_url = None
        if data.get("status") == "completed":
            signed_url = await get_envelope_document_url(access_token, envelope_id)
        return {
            "ok": True,
            "envelope_id": envelope_id,
            "status": data.get("status"),           # sent|delivered|completed|declined|voided
            "completed_date_time": data.get("completedDateTime"),
            "sent_date_time": data.get("sentDateTime"),
            "signed_document_url": signed_url,
        }
    except Exception as e:
        log.error("Envelope status error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


# ── Webhook (DocuSign Connect) ────────────────────────────────────────────────
@router.post("/webhook")
async def docusign_webhook(request: Request):
    """
    Receive DocuSign Connect event notifications.
    Configure in DocuSign Admin → Connect → Add Configuration:
      URL: https://ngw-events-api.onrender.com/api/docusign/webhook
      Trigger events: Envelope Completed, Envelope Declined, Envelope Voided

    On completion, the frontend should poll /envelope/{id} to get the
    signed document URL and update the vendor record.
    This endpoint returns 200 immediately so DocuSign doesn't retry.
    """
    try:
        body = await request.body()
        # DocuSign Connect sends XML or JSON depending on config
        # Log the event type for debugging
        content_type = request.headers.get("content-type", "")
        if "json" in content_type:
            data = await request.json()
            envelope_id = data.get("envelopeId") or data.get("data", {}).get("envelopeId")
            status = data.get("status") or data.get("data", {}).get("envelopeSummary", {}).get("status")
            log.info("DocuSign webhook: envelope=%s status=%s", envelope_id, status)
        else:
            # XML — just log receipt, frontend polls for status
            log.info("DocuSign webhook received (XML): %d bytes", len(body))
    except Exception as e:
        log.error("DocuSign webhook parse error: %s", e)
    # Always 200 — DocuSign retries on non-200
    return Response(status_code=200)
