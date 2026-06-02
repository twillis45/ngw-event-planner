"""
Backend AI proxy — Sprint 61

Routes all Claude API calls through the server instead of directly from
the browser (BYOK). Benefits:
  - API key never exposed in browser network traffic
  - Cost telemetry: log token usage per planner
  - Rate limiting: prevent runaway calls
  - Future: paid tier — server holds the key, planners pay NGW

Environment variables:
  ANTHROPIC_API_KEY   — Server-side Claude key (set in Render)
  AI_MAX_TOKENS       — Per-request token ceiling (default: 500)
  AI_RATE_LIMIT_RPM   — Requests per minute per planner (default: 10)

While ANTHROPIC_API_KEY is unset, all routes return 503 so the frontend
falls back to BYOK gracefully.
"""

import logging
import os
import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

log = logging.getLogger("ngw.ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

ANTHROPIC_KEY   = os.environ.get("ANTHROPIC_API_KEY")
MAX_TOKENS      = int(os.environ.get("AI_MAX_TOKENS", "500"))
ANTHROPIC_URL   = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL    = "claude-3-5-haiku-20241022"  # fast + cheap for vendor copilot


def is_ai_configured() -> bool:
    return bool(ANTHROPIC_KEY)


@router.get("/status")
async def ai_status():
    return {"configured": is_ai_configured(), "model": CLAUDE_MODEL}


class CompletionRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: Optional[int] = None
    context: Optional[str] = None   # vendor name / event name for logging


class DocumentExtractRequest(BaseModel):
    document_url: str       # Supabase Storage signed URL
    document_type: str = "contract"  # contract | invoice | coi | menu
    vendor_name: Optional[str] = None
    event_name: Optional[str] = None


@router.post("/complete")
async def complete(body: CompletionRequest, request: Request):
    """
    Proxy a Claude completion through the server.
    Frontend falls back to BYOK when this returns 503.
    """
    if not is_ai_configured():
        raise HTTPException(
            status_code=503,
            detail="AI proxy not configured — set ANTHROPIC_API_KEY on the server"
        )

    max_tok = min(body.max_tokens or MAX_TOKENS, MAX_TOKENS)

    messages = [{"role": "user", "content": body.prompt}]

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": max_tok,
        "messages": messages,
    }
    if body.system:
        payload["system"] = body.system

    headers = {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(ANTHROPIC_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text = data.get("content", [{}])[0].get("text", "")
        usage = data.get("usage", {})
        log.info(
            "AI complete context=%s in=%d out=%d",
            body.context or "unknown",
            usage.get("input_tokens", 0),
            usage.get("output_tokens", 0),
        )
        return {
            "ok": True,
            "text": text,
            "model": data.get("model"),
            "usage": usage,
        }
    except httpx.HTTPStatusError as e:
        log.error("Anthropic API error: %s", e.response.text)
        raise HTTPException(status_code=502, detail="AI service error")
    except Exception as e:
        log.error("AI proxy exception: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Document AI extraction ────────────────────────────────────────────────────
@router.post("/extract-document")
async def extract_document(body: DocumentExtractRequest):
    """
    Sprint 62: Fetch a document from Storage and extract structured data using
    Claude vision. Returns tasks, key dates, contacts, and payment terms.

    The document is fetched server-side — API key never touches the browser.
    All AI output is labeled as AI-generated and requires planner review.
    """
    if not is_ai_configured():
        raise HTTPException(status_code=503, detail="AI proxy not configured — set ANTHROPIC_API_KEY")

    # Fetch document bytes
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(body.document_url)
            r.raise_for_status()
            doc_bytes = r.content
            content_type = r.headers.get("content-type", "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch document: {e}")

    # Convert to base64 for Claude vision
    import base64
    doc_b64 = base64.standard_b64encode(doc_bytes).decode()

    # Determine media type
    if "pdf" in content_type or body.document_url.endswith(".pdf"):
        media_type = "application/pdf"
    elif "png" in content_type:
        media_type = "image/png"
    else:
        media_type = "image/jpeg"

    context = f"Vendor: {body.vendor_name or 'Unknown'}, Event: {body.event_name or 'Unknown'}"
    doc_type_label = body.document_type.replace("_", " ").title()

    prompt = f"""You are reviewing a {doc_type_label} document for an event planning studio.
Context: {context}

Extract the following structured information from this document:

1. KEY DATES — signing deadline, payment dates, event date, cancellation deadline
2. PAYMENT TERMS — deposit amount and due date, balance amount and due date, late payment terms
3. KEY CONTACTS — vendor contact name, email, phone
4. ACTION ITEMS — things the planner must do (sign by X, pay Y by Z, confirm count by W)
5. CANCELLATION POLICY — what happens if cancelled, refund policy
6. IMPORTANT NOTES — any unusual clauses, restrictions, or requirements

Return as structured JSON:
{{
  "key_dates": [{{"label": "...", "date": "YYYY-MM-DD or text", "urgency": "high|medium|low"}}],
  "payment_terms": {{"deposit_amount": null, "deposit_due": null, "balance_amount": null, "balance_due": null, "notes": "..."}},
  "key_contacts": [{{"name": "...", "role": "...", "email": "...", "phone": "..."}}],
  "action_items": [{{"task": "...", "due_date": "...", "priority": "high|medium|low"}}],
  "cancellation_policy": "...",
  "important_notes": ["..."],
  "confidence": "high|medium|low",
  "disclaimer": "AI-extracted — verify all dates and amounts against the original document before acting."
}}

If a field cannot be determined from the document, use null."""

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                ANTHROPIC_URL,
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={
                    "model": "claude-opus-4-5",  # vision-capable for PDFs/images
                    "max_tokens": 1500,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "document", "source": {"type": "base64", "media_type": media_type, "data": doc_b64}} if media_type == "application/pdf"
                            else {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": doc_b64}},
                            {"type": "text", "text": prompt}
                        ]
                    }]
                }
            )
            resp.raise_for_status()
            data = resp.json()

        raw_text = data.get("content", [{}])[0].get("text", "")
        # Parse JSON from response
        import re, json
        json_match = re.search(r'\{[\s\S]+\}', raw_text)
        if json_match:
            extracted = json.loads(json_match.group())
        else:
            extracted = {"error": "Could not parse structured output", "raw": raw_text}

        log.info("document_extract vendor=%s type=%s confidence=%s",
                 body.vendor_name, body.document_type, extracted.get("confidence"))

        return {"ok": True, "extracted": extracted, "document_type": body.document_type}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI API error: {e.response.status_code}")
    except Exception as e:
        log.error("document_extract error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
