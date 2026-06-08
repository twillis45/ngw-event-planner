"""
Backend AI proxy — Sprint 61 (switched to OpenAI)

Routes AI calls through the server using OpenAI GPT-4o.
Frontend BYOK (vendor copilot) still uses the planner's own Anthropic key
directly in the browser — that path is unchanged.

This server-side proxy handles:
  - General completions (/api/ai/complete) via gpt-4o-mini
  - Document AI extraction (/api/ai/extract-document) via gpt-4o (vision)

Environment variables (set in Render dashboard):
  OPENAI_API_KEY    — OpenAI API key (platform.openai.com → API Keys)
  AI_MAX_TOKENS     — Per-request token ceiling (default: 500)

While OPENAI_API_KEY is unset, routes return 503 so the frontend
falls back to BYOK gracefully.
"""

import json
import logging
import os
import time
import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ..auth import require_planner

log = logging.getLogger("ngw.ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

OPENAI_KEY      = os.environ.get("OPENAI_API_KEY")
MAX_TOKENS      = int(os.environ.get("AI_MAX_TOKENS", "500"))
OPENAI_URL      = "https://api.openai.com/v1/chat/completions"
COMPLETIONS_MODEL = "gpt-4o-mini"   # fast + cheap for text completions
VISION_MODEL      = "gpt-4o"        # vision-capable for document extraction

# ── Sprint 52B: server-side Anthropic proxy ─────────────────────────────────
# Lets signed-in planners use Claude-powered features WITHOUT the API key ever
# touching the browser. The key lives only in the Render env (ANTHROPIC_API_KEY).
# Auth-gated, feature-restricted (no freeform endpoint), input/output capped,
# and rate-limited per user. See POST /api/ai/anthropic below.
ANTHROPIC_KEY             = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL           = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
ANTHROPIC_URL             = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MAX_TOKENS      = int(os.environ.get("ANTHROPIC_MAX_TOKENS", "1024"))      # output cap
ANTHROPIC_MAX_INPUT_CHARS = int(os.environ.get("ANTHROPIC_MAX_INPUT_CHARS", "8000")) # input cap (per field)
ANTHROPIC_RATE_MAX        = int(os.environ.get("ANTHROPIC_RATE_MAX", "15"))          # requests
ANTHROPIC_RATE_WINDOW     = int(os.environ.get("ANTHROPIC_RATE_WINDOW", "60"))       # per N seconds

# Allow-listed features → server-built system prompts. There is NO way for the
# client to supply a system prompt or call an unrestricted endpoint.
ANTHROPIC_FEATURES = {
    "event_brief":      "You are an event-planning assistant for a professional studio. Using ONLY the provided context, write a clear, concise event brief the planner can share. Never invent dates, names, prices, or vendor details. This is a draft for the planner to review and edit.",
    "vendor_followup":  "You are an event-planning assistant. Draft a short, polite, professional follow-up message to a vendor using ONLY the provided context. Never invent commitments, prices, or dates. The planner reviews and sends it themselves — never imply it was already sent.",
    "document_summary": "You are an event-planning assistant. Summarize the provided text into key dates, amounts, and action items the planner must handle, using ONLY the provided text. Flag anything uncertain. This is AI-generated — the planner must verify against the original document.",
    "checklist_help":   "You are an event-planning assistant. Help the planner complete the given checklist task with practical, specific, actionable steps based ONLY on the provided context. Be concise.",
}

# In-memory per-user sliding-window rate limiter. Per-process (good enough for a
# single-worker beta); swap for Redis if the backend is scaled horizontally.
_ai_rate: dict[str, list] = {}


def _anthropic_configured() -> bool:
    return bool(ANTHROPIC_KEY)


def _anthropic_headers():
    return {
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }


def _rate_check(user_id: str):
    """Returns (allowed: bool, retry_after_seconds: int)."""
    now = time.time()
    hits = [t for t in _ai_rate.get(user_id, []) if now - t < ANTHROPIC_RATE_WINDOW]
    if len(hits) >= ANTHROPIC_RATE_MAX:
        return False, int(ANTHROPIC_RATE_WINDOW - (now - hits[0])) + 1
    hits.append(now)
    _ai_rate[user_id] = hits
    return True, 0


def is_ai_configured() -> bool:
    return bool(OPENAI_KEY)


def openai_headers():
    return {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type":  "application/json",
    }


@router.get("/status")
async def ai_status():
    return {
        "configured": is_ai_configured(),
        "provider":   "openai",
        "model":      COMPLETIONS_MODEL,
        # Sprint 52B — server-side Anthropic proxy availability (no key exposed).
        "anthropic_configured": _anthropic_configured(),
        "anthropic_model":      ANTHROPIC_MODEL if _anthropic_configured() else None,
        "anthropic_features":   list(ANTHROPIC_FEATURES.keys()),
    }


class AnthropicRequest(BaseModel):
    feature: str
    prompt: str
    context: Optional[dict] = None


@router.post("/anthropic")
async def anthropic_proxy(
    body: AnthropicRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Sprint 52B — secure server-side Claude proxy.

    Flow: validate the signed-in planner → validate the requested feature →
    build a SERVER-OWNED system prompt → call Anthropic with the server's key →
    return ONLY the model's text. The API key never reaches the browser, there
    is no freeform/system-prompt passthrough, input/output are capped, and each
    user is rate-limited.
    """
    # 1. Auth — only signed-in planners (401 otherwise).
    principal = await require_planner(authorization, x_planner_token)
    user_id = principal.get("id") or "unknown"

    # 2. Configured? (graceful 503 so the frontend can fall back / hide the feature)
    if not _anthropic_configured():
        raise HTTPException(status_code=503, detail="AI not configured — set ANTHROPIC_API_KEY on the server")

    # 3. Feature must be allow-listed; its system prompt is server-owned.
    system = ANTHROPIC_FEATURES.get(body.feature)
    if not system:
        raise HTTPException(status_code=400, detail=f"Unknown feature. Allowed: {', '.join(ANTHROPIC_FEATURES)}")

    # 4. Validate + cap input.
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    prompt = prompt[:ANTHROPIC_MAX_INPUT_CHARS]
    ctx_str = ""
    if body.context:
        try:
            ctx_str = json.dumps(body.context, ensure_ascii=False)[:ANTHROPIC_MAX_INPUT_CHARS]
        except Exception:
            ctx_str = ""
    est_in_tokens = (len(prompt) + len(ctx_str)) // 4  # rough estimate for logging

    # 5. Per-user rate limit (429 with Retry-After).
    allowed, retry_after = _rate_check(user_id)
    if not allowed:
        log.warning("ai.anthropic RATE_LIMIT user=%s feature=%s est_in=%d", user_id, body.feature, est_in_tokens)
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly",
                            headers={"Retry-After": str(retry_after)})

    # 6. Build the user message. The client supplies content ONLY as the user
    #    turn — never the system prompt.
    user_content = prompt if not ctx_str else f"{prompt}\n\nContext (JSON):\n{ctx_str}"
    payload = {
        "model":      ANTHROPIC_MODEL,
        "max_tokens": ANTHROPIC_MAX_TOKENS,
        "system":     system,
        "messages":   [{"role": "user", "content": user_content}],
    }

    # 7. Call Anthropic; log user_id, feature, token estimate, and success/failure.
    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(ANTHROPIC_URL, headers=_anthropic_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        usage = data.get("usage", {})
        log.info(
            "ai.anthropic OK user=%s feature=%s est_in=%d in=%s out=%s",
            user_id, body.feature, est_in_tokens,
            usage.get("input_tokens"), usage.get("output_tokens"),
        )
        # Return ONLY the model's text + usage. Never the key, never raw upstream.
        return {
            "ok":      True,
            "feature": body.feature,
            "text":    text,
            "usage":   {"input_tokens": usage.get("input_tokens"), "output_tokens": usage.get("output_tokens")},
        }
    except httpx.HTTPStatusError as e:
        log.error(
            "ai.anthropic FAIL user=%s feature=%s est_in=%d status=%s body=%s",
            user_id, body.feature, est_in_tokens, e.response.status_code, (e.response.text or "")[:300],
        )
        # Don't leak upstream error bodies to the client.
        raise HTTPException(status_code=502, detail="AI service error — please try again")
    except httpx.RequestError as e:
        log.error("ai.anthropic UNAVAILABLE user=%s feature=%s err=%s", user_id, body.feature, e)
        raise HTTPException(status_code=503, detail="AI service unavailable — please try again")
    except Exception as e:
        log.error("ai.anthropic EXC user=%s feature=%s err=%s", user_id, body.feature, e)
        raise HTTPException(status_code=500, detail="Unexpected error")


class CompletionRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: Optional[int] = None
    context: Optional[str] = None


class DocumentExtractRequest(BaseModel):
    document_url: str
    document_type: str = "contract"
    vendor_name: Optional[str] = None
    event_name: Optional[str] = None


@router.post("/complete")
async def complete(body: CompletionRequest):
    """
    Proxy a text completion through OpenAI gpt-4o-mini.
    Frontend falls back to BYOK when this returns 503.
    """
    if not is_ai_configured():
        raise HTTPException(
            status_code=503,
            detail="AI proxy not configured — set OPENAI_API_KEY on the server"
        )

    max_tok = min(body.max_tokens or MAX_TOKENS, MAX_TOKENS)

    messages = []
    if body.system:
        messages.append({"role": "system", "content": body.system})
    messages.append({"role": "user", "content": body.prompt})

    payload = {
        "model":      COMPLETIONS_MODEL,
        "max_tokens": max_tok,
        "messages":   messages,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(OPENAI_URL, headers=openai_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()

        text  = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        log.info(
            "AI complete context=%s in=%d out=%d",
            body.context or "unknown",
            usage.get("prompt_tokens", 0),
            usage.get("completion_tokens", 0),
        )
        return {
            "ok":    True,
            "text":  text,
            "model": data.get("model"),
            "usage": usage,
        }
    except httpx.HTTPStatusError as e:
        log.error("OpenAI API error: %s — %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="AI service error")
    except Exception as e:
        log.error("AI proxy exception: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-document")
async def extract_document(body: DocumentExtractRequest):
    """
    Sprint 62: Fetch a document from Storage and extract structured data
    using GPT-4o vision. Returns tasks, key dates, contacts, payment terms.

    All AI output is labeled as AI-generated and requires planner review.
    """
    if not is_ai_configured():
        raise HTTPException(status_code=503, detail="AI proxy not configured — set OPENAI_API_KEY")

    # Fetch document bytes
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            r = await client.get(body.document_url)
            r.raise_for_status()
            doc_bytes = r.content
            content_type = r.headers.get("content-type", "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch document: {e}")

    import base64
    doc_b64 = base64.standard_b64encode(doc_bytes).decode()

    # Determine how to send this document to GPT-4o.
    # OpenAI vision (image_url) supports: JPEG, PNG, GIF, WebP.
    # PDFs must be sent via the "file" content block (Chat Completions v1 with gpt-4o).
    is_pdf = "pdf" in content_type or body.document_url.lower().endswith(".pdf")

    if "png" in content_type:
        image_media_type = "image/png"
    else:
        image_media_type = "image/jpeg"

    context        = f"Vendor: {body.vendor_name or 'Unknown'}, Event: {body.event_name or 'Unknown'}"
    doc_type_label = body.document_type.replace("_", " ").title()

    prompt = f"""You are reviewing a {doc_type_label} document for an event planning studio.
Context: {context}

Extract the following structured information:

1. KEY DATES — signing deadline, payment dates, event date, cancellation deadline
2. PAYMENT TERMS — deposit amount/due date, balance amount/due date, late payment terms
3. KEY CONTACTS — vendor contact name, email, phone
4. ACTION ITEMS — things the planner must do (sign by X, pay Y by Z, confirm count by W)
5. CANCELLATION POLICY — what happens if cancelled, refund policy
6. IMPORTANT NOTES — unusual clauses, restrictions, or requirements

Return ONLY valid JSON:
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

Use null for fields that cannot be determined."""

    # Build message content based on document type.
    # PDFs: use the "file" content block (gpt-4o native PDF support).
    # Images: use image_url with base64.
    if is_pdf:
        content = [
            {"type": "text", "text": prompt},
            {
                "type": "file",
                "file": {
                    "filename": body.document_url.split("/")[-1] or "document.pdf",
                    "file_data": f"data:application/pdf;base64,{doc_b64}",
                },
            },
        ]
    else:
        content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{image_media_type};base64,{doc_b64}"}},
        ]

    payload = {
        "model":      VISION_MODEL,
        "max_tokens": 1500,
        "messages":   [{"role": "user", "content": content}],
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(OPENAI_URL, headers=openai_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()

        import json, re
        raw_text = data["choices"][0]["message"]["content"] or ""
        try:
            extracted = json.loads(raw_text)
        except Exception:
            match = re.search(r'\{[\s\S]+\}', raw_text)
            extracted = json.loads(match.group()) if match else {
                "error": "Could not parse output",
                "raw": raw_text[:500] if raw_text else "empty response",
                "confidence": "low",
                "disclaimer": "AI-extracted — verify all dates and amounts against the original document before acting.",
            }

        log.info(
            "document_extract vendor=%s type=%s confidence=%s model=%s",
            body.vendor_name, body.document_type,
            extracted.get("confidence"), data.get("model"),
        )
        return {"ok": True, "extracted": extracted, "document_type": body.document_type}

    except httpx.HTTPStatusError as e:
        log.error("OpenAI vision error: %s — %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail=f"AI API error: {e.response.status_code}")
    except Exception as e:
        log.error("document_extract error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
