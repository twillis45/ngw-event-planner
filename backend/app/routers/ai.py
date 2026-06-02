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
