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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from ..auth import require_planner
from ..error_log import record_error

log = logging.getLogger("ngw.ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

OPENAI_KEY      = os.environ.get("OPENAI_API_KEY")
MAX_TOKENS      = int(os.environ.get("AI_MAX_TOKENS", "500"))
OPENAI_URL      = "https://api.openai.com/v1/chat/completions"
COMPLETIONS_MODEL = "gpt-4o-mini"   # fast + cheap for text completions
VISION_MODEL      = "gpt-4o"        # vision-capable for document extraction

# ── Sprint 2 · B2: grounded orchestrator (Claude tool-calling) ──────────────
# D1 decision: add a Claude tool-calling path ALONGSIDE the OpenAI feature proxy
# above (untouched). This route is a THIN, STATELESS relay for one Claude turn:
# the CLIENT owns the loop (it runs the pure lib/ engines as tools locally — they
# can't run here in Python) and posts the running conversation + tool schemas;
# the server injects the server-owned system prompt (below), keeps the key
# server-side, and returns Claude's raw content[] (text + tool_use). No engine
# runs here; no number originates here.
ANTHROPIC_KEY   = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_URL   = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
# Overridable per account (the exact valid Sonnet id depends on your Anthropic
# access). ONE model for every Claude route — host conversation and parse alike.
# Sonnet 5 rejects non-default temperature/top_p/top_k and budget_tokens with a
# 400 — this relay sends neither, so keep it that way if you extend the payload.
#
# WAS a two-model fork: this constant plus ORCHESTRATOR_HAIKU, with the vendor
# parser routed to Haiku per the plan's §02 "route parse/classify to the cheap
# model" rule. Collapsed 2026-07-17 — the rule is sound in general and wrong at
# THIS volume. It was never a routing strategy: exactly one call site each. The
# fork's whole saving is ~$0.005 a parse — call it a nickel across a whole event,
# on a $39 pass. §02's own line ("a whole event's drafts < $0.20" ON Haiku) caps
# the maximum conceivable win under twenty cents.
#
# What the nickel cost: Haiku is the WEAKER model at exactly what the parser does
# — verbatim-evidence extraction from messy vendor email, the P0 flagship, where a
# missed field is a wrong vendor record the host must catch by hand. Plus a second
# default to keep current as models ship, and a second capability profile to tune
# prompts against. The prompt is server-owned and identical either way, so there
# was never a Haiku-specific reason for the split.
#
# If parse volume ever makes a nickel matter, route THEN, with real usage numbers.
ORCHESTRATOR_MODEL      = os.environ.get("ORCHESTRATOR_MODEL", "claude-sonnet-5")
ORCHESTRATOR_MAX_TOKENS = int(os.environ.get("ORCHESTRATOR_MAX_TOKENS", "1024"))
ORCH_MAX_INPUT_CHARS    = int(os.environ.get("ORCH_MAX_INPUT_CHARS", "60000"))  # cap the relayed conversation
# The one server-owned system prompt. The grounding rule is enforced downstream
# by the client's post-check too, but it starts here.
ORCHESTRATOR_SYSTEM = (
    "You are Event Boss, a warm, honest planning copilot for a HOST (not a professional planner). "
    "Answer the host's question about THEIR event using the tools provided. "
    "HARD RULE: every figure — price, count, date, quantity — MUST come from a tool result. "
    "Never state or estimate a number from your own knowledge. If the tools can't answer, say so "
    "plainly and point the host to the right screen; never guess. Never auto-decide money, headcount, "
    "or host-only choices — surface them, don't settle them. Keep replies short, warm, and specific."
)

# ── Sprint 52B: secure server-side AI feature proxy ─────────────────────────
# Lets signed-in planners use AI features through a locked-down endpoint:
# auth-gated, feature-restricted (no freeform/system passthrough), input +
# output capped, per-user rate-limited, and logged. Uses the OpenAI key already
# configured on the server (OPENAI_API_KEY) — no key ever reaches the browser.
# See POST /api/ai/feature below.
AI_FEATURE_MODEL      = os.environ.get("AI_FEATURE_MODEL", COMPLETIONS_MODEL)
AI_FEATURE_MAX_TOKENS = int(os.environ.get("AI_FEATURE_MAX_TOKENS", "1024"))   # output cap
AI_MAX_INPUT_CHARS    = int(os.environ.get("AI_MAX_INPUT_CHARS", "8000"))      # input cap (per field)
AI_RATE_MAX           = int(os.environ.get("AI_RATE_MAX", "15"))               # requests
AI_RATE_WINDOW        = int(os.environ.get("AI_RATE_WINDOW", "60"))            # per N seconds

# Allow-listed features → server-built system prompts. There is NO way for the
# client to supply a system prompt or call an unrestricted endpoint.
FEATURE_SYSTEM_PROMPTS = {
    "event_brief":      "You are an event-planning assistant for a professional studio. Using ONLY the provided context, write a clear, concise event brief the planner can share. Never invent dates, names, prices, or vendor details. This is a draft for the planner to review and edit.",
    "vendor_followup":  "You are an event-planning assistant. Draft a short, polite, professional follow-up message to a vendor using ONLY the provided context. Never invent commitments, prices, or dates. The planner reviews and sends it themselves — never imply it was already sent.",
    "document_summary": "You are an event-planning assistant. Summarize the provided text into key dates, amounts, and action items the planner must handle, using ONLY the provided text. Flag anything uncertain. This is AI-generated — the planner must verify against the original document.",
    "checklist_help":   "You are an event-planning assistant. Help the planner complete the given checklist task with practical, specific, actionable steps based ONLY on the provided context. Be concise.",
    # Sprint 60D — dedicated features (same OPENAI_API_KEY; tuned system prompts so
    # output is on-task instead of borrowing a generic feature's voice).
    "proposal":         "You are an event-planning assistant. Draft a short, warm, professional client proposal using ONLY the provided context (event details + intake answers). Cover what the planner will do, how it addresses the client's specific needs, and clear next steps. Never invent prices, dates, or services not in the context. This is a draft the planner reviews, edits, and sends — never imply it was sent or accepted.",
    "budget":           "You are an event-planning assistant. Produce a realistic budget breakdown by category using ONLY the provided context (event type, guest count, total). When the planner's prompt asks for JSON, return ONLY valid JSON in exactly the requested shape — no prose, no code fences. Base allocations on typical norms; present sensible figures, never false precision or invented vendor quotes. The planner reviews and adjusts every number.",
    "schedule":         "You are an event-planning assistant. Draft a realistic event-day run-of-show / timeline using ONLY the provided context (event type, vendors, existing segments). When the prompt asks for JSON, return ONLY valid JSON in exactly the requested shape — no prose, no code fences — with sequential, realistic times. Include vendor arrivals, setup windows, key moments, and wind-down. Never invent vendors or commitments. The planner reviews and edits every cue.",
    "readiness":        "You are an event-planning assistant. Assess how ready this event is and what needs attention next, using ONLY the provided context. Be specific and prioritized. Never invent status, dates, confirmations, or vendor details. This is a draft assessment the planner verifies.",
    # "Do it for me" — polish a HOST's personal message (invite / vendor inquiry /
    # thank-you) they will send as-is. The honest template is the baseline; this only
    # warms the prose. The HARD RULE is no new facts (the host's trust depends on it).
    "message":          "You are helping a HOST (not a professional planner) polish a short personal message they will send as-is to people they know — an invitation, a vendor inquiry, or a thank-you. Rewrite it to read warmer and more natural while staying brief and ready-to-send. CRITICAL: do NOT add any fact that isn't already in the message — no new dates, times, addresses, places, prices, or names. If something isn't there, leave it out. Keep every concrete detail and the sign-off exactly as written, and keep a friendly emoji if present. Return ONLY the finished message text — no preamble, no quotes, no explanation.",
}

# In-memory per-user sliding-window rate limiter. Per-process (good enough for a
# single-worker beta); swap for Redis if the backend is scaled horizontally.
_ai_rate: dict[str, list] = {}


def _rate_check(user_id: str):
    """Returns (allowed: bool, retry_after_seconds: int)."""
    now = time.time()
    hits = [t for t in _ai_rate.get(user_id, []) if now - t < AI_RATE_WINDOW]
    if len(hits) >= AI_RATE_MAX:
        return False, int(AI_RATE_WINDOW - (now - hits[0])) + 1
    hits.append(now)
    _ai_rate[user_id] = hits
    return True, 0


def is_ai_configured() -> bool:
    return bool(OPENAI_KEY)


def is_orchestrator_configured() -> bool:
    """B2 key-presence check — is ANTHROPIC_API_KEY set? Never reads the value."""
    return bool(ANTHROPIC_KEY)


def openai_headers():
    return {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type":  "application/json",
    }


def anthropic_headers():
    return {
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type":      "application/json",
    }


@router.get("/status")
async def ai_status():
    return {
        "configured": is_ai_configured(),
        "provider":   "openai",
        "model":      COMPLETIONS_MODEL,
        # Sprint 52B — secure feature proxy availability (no key exposed).
        "feature_proxy": is_ai_configured(),
        "feature_model": AI_FEATURE_MODEL if is_ai_configured() else None,
        "features":      list(FEATURE_SYSTEM_PROMPTS.keys()),
        # Sprint 2 · B2 — grounded orchestrator (Claude); key-presence only.
        "orchestrator":       is_orchestrator_configured(),
        "orchestrator_model": ORCHESTRATOR_MODEL if is_orchestrator_configured() else None,
        # Which model the PARSE routes actually run (2026-07-17: the same one —
        # the Haiku fork is gone). Reported because it was previously unknowable
        # from outside: when the two-model fork collapsed, `orchestrator_model`
        # read "claude-sonnet-5" both before AND after, so /status could not tell
        # a deployed change from a stale one. A model this app pays for and makes
        # honesty claims about should be visible without reading the source.
        "parse_model": ORCHESTRATOR_MODEL if is_orchestrator_configured() else None,
    }


class FeatureRequest(BaseModel):
    feature: str
    prompt: str
    context: Optional[dict] = None


@router.post("/feature")
async def ai_feature(
    body: FeatureRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Sprint 52B — secure server-side AI feature proxy (OpenAI-backed).

    Flow: validate the signed-in planner → validate the requested feature →
    build a SERVER-OWNED system prompt → call OpenAI with the server's key →
    return ONLY the model's text. The API key never reaches the browser, there
    is no freeform/system-prompt passthrough, input/output are capped, and each
    user is rate-limited.
    """
    # 1. Auth — only signed-in planners (401 otherwise).
    principal = await require_planner(authorization, x_planner_token)
    user_id = principal.get("id") or "unknown"

    # 2. Configured? (graceful 503 so the frontend can fall back / hide the feature)
    if not is_ai_configured():
        raise HTTPException(status_code=503, detail="AI not configured — set OPENAI_API_KEY on the server")

    # 3. Feature must be allow-listed; its system prompt is server-owned.
    system = FEATURE_SYSTEM_PROMPTS.get(body.feature)
    if not system:
        raise HTTPException(status_code=400, detail=f"Unknown feature. Allowed: {', '.join(FEATURE_SYSTEM_PROMPTS)}")

    # 4. Validate + cap input.
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    prompt = prompt[:AI_MAX_INPUT_CHARS]
    ctx_str = ""
    if body.context:
        try:
            ctx_str = json.dumps(body.context, ensure_ascii=False)[:AI_MAX_INPUT_CHARS]
        except Exception:
            ctx_str = ""
    est_in_tokens = (len(prompt) + len(ctx_str)) // 4  # rough estimate for logging

    # 5. Per-user rate limit (429 with Retry-After).
    allowed, retry_after = _rate_check(user_id)
    if not allowed:
        log.warning("ai.feature RATE_LIMIT user=%s feature=%s est_in=%d", user_id, body.feature, est_in_tokens)
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly",
                            headers={"Retry-After": str(retry_after)})

    # 6. Build messages. The client supplies content ONLY as the user turn —
    #    never the system prompt.
    user_content = prompt if not ctx_str else f"{prompt}\n\nContext (JSON):\n{ctx_str}"
    payload = {
        "model":      AI_FEATURE_MODEL,
        "max_tokens": AI_FEATURE_MAX_TOKENS,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_content},
        ],
    }

    # 7. Call OpenAI; log user_id, feature, token estimate, and success/failure.
    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(OPENAI_URL, headers=openai_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        log.info(
            "ai.feature OK user=%s feature=%s est_in=%d in=%s out=%s",
            user_id, body.feature, est_in_tokens,
            usage.get("prompt_tokens"), usage.get("completion_tokens"),
        )
        # Return ONLY the model's text + usage. Never the key, never raw upstream.
        return {
            "ok":      True,
            "feature": body.feature,
            "text":    text,
            "usage":   {"input_tokens": usage.get("prompt_tokens"), "output_tokens": usage.get("completion_tokens")},
        }
    except httpx.HTTPStatusError as e:
        log.error(
            "ai.feature FAIL user=%s feature=%s est_in=%d status=%s body=%s",
            user_id, body.feature, est_in_tokens, e.response.status_code, (e.response.text or "")[:300],
        )
        await record_error("ai_proxy", f"AI service error ({e.response.status_code}) on {body.feature}",
                           context={"feature": body.feature, "status": e.response.status_code, "user": user_id})
        raise HTTPException(status_code=502, detail="AI service error — please try again")
    except httpx.RequestError as e:
        log.error("ai.feature UNAVAILABLE user=%s feature=%s err=%s", user_id, body.feature, e)
        await record_error("ai_proxy", f"AI service unavailable on {body.feature}: {e}",
                           context={"feature": body.feature, "user": user_id})
        raise HTTPException(status_code=503, detail="AI service unavailable — please try again")
    except Exception as e:
        log.error("ai.feature EXC user=%s feature=%s err=%s", user_id, body.feature, e)
        await record_error("ai_proxy", f"Unexpected AI error on {body.feature}: {e}",
                           context={"feature": body.feature, "user": user_id})
        raise HTTPException(status_code=500, detail="Unexpected error")


class OrchestrateRequest(BaseModel):
    # The running conversation (user turn, prior assistant tool_use turns, and
    # tool_result turns the CLIENT produced by running the engines locally).
    messages: list
    # The tool schemas the client offers (from orchestratorTools.toolSchemas()).
    tools: Optional[list] = None
    max_tokens: Optional[int] = None
    # B3 — stream Claude's SSE straight through instead of buffering the turn.
    # OPT-IN: default False keeps every existing caller byte-identical (same JSON
    # body, same shape), so shipping this changes nothing until a client asks.
    stream: Optional[bool] = False


@router.post("/orchestrate")
async def orchestrate(
    body: OrchestrateRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Sprint 2 · B2 — grounded orchestrator relay (Claude tool-calling).

    ONE stateless Claude turn. The client owns the loop: it posts the running
    conversation + tool schemas; we inject the server-owned system prompt, keep
    the key server-side, prompt-cache the system + tools, and return Claude's
    raw content[] (text and/or tool_use) for the client to act on. No engine
    runs here and no number originates here — grounding is enforced by the tools
    (which run client-side) plus the client's post-check.

    AUTH: require_planner verifies a valid Supabase token — ANY signed-in user,
    not a role gate — so a signed-in host is authorized exactly like a planner.
    An unauthenticated demo/preview session gets 401 (correct); the client only
    offers "Ask the Boss" when a session exists, so a host never hits a dead 401.
    """
    # 1. Auth (401 otherwise).
    principal = await require_planner(authorization, x_planner_token)
    user_id = principal.get("id") or "unknown"

    # 2. Configured? (graceful 503 so the client falls back to deterministic askPlan)
    if not is_orchestrator_configured():
        raise HTTPException(status_code=503, detail="Orchestrator not configured — set ANTHROPIC_API_KEY on the server")

    # 3. Validate input.
    if not isinstance(body.messages, list) or not body.messages:
        raise HTTPException(status_code=400, detail="messages must be a non-empty list")
    try:
        conv_len = len(json.dumps(body.messages, ensure_ascii=False))
    except Exception:
        raise HTTPException(status_code=400, detail="messages must be JSON-serializable")
    if conv_len > ORCH_MAX_INPUT_CHARS:
        raise HTTPException(status_code=413, detail="Conversation too large")

    # 4. Per-user rate limit (shares the feature-proxy limiter).
    allowed, retry_after = _rate_check(user_id)
    if not allowed:
        log.warning("ai.orchestrate RATE_LIMIT user=%s", user_id)
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly",
                            headers={"Retry-After": str(retry_after)})

    # 5. Build the Claude payload. System prompt is SERVER-OWNED (never client-
    #    supplied); system + tools carry cache_control so repeated turns are ~90%
    #    cheaper. The client's messages are the ONLY thing passed through.
    tools = body.tools if isinstance(body.tools, list) else []
    if tools:
        tools = [*tools[:-1], {**tools[-1], "cache_control": {"type": "ephemeral"}}]
    payload = {
        "model":      ORCHESTRATOR_MODEL,
        "max_tokens": min(int(body.max_tokens or ORCHESTRATOR_MAX_TOKENS), 4096),
        "system":     [{"type": "text", "text": ORCHESTRATOR_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        "messages":   body.messages,
    }
    if tools:
        payload["tools"] = tools

    # 6a. STREAMING (B3, opt-in): forward Claude's SSE verbatim. The relay stays
    #     thin in exactly the same sense as the buffered path — it re-frames
    #     nothing and originates no number; the client accumulates the deltas back
    #     into the identical content[] shape, so the tool-calling loop and the
    #     grounding check downstream are untouched. Errors are surfaced as an SSE
    #     `error` event rather than a status code, because by the time Anthropic
    #     fails we may already have sent 200 + headers.
    if body.stream:
        payload["stream"] = True

        async def _sse():
            try:
                async with httpx.AsyncClient(timeout=90) as client:
                    async with client.stream("POST", ANTHROPIC_URL, headers=anthropic_headers(), json=payload) as r:
                        if r.status_code != 200:
                            detail = (await r.aread()).decode("utf-8", "replace")[:300]
                            log.error("ai.orchestrate STREAM FAIL user=%s status=%s body=%s", user_id, r.status_code, detail)
                            await record_error("ai_orchestrate", f"Orchestrator stream error ({r.status_code})",
                                               context={"status": r.status_code, "user": user_id})
                            yield b"event: error\ndata: " + json.dumps({"error": "orchestrator_error", "status": r.status_code}).encode() + b"\n\n"
                            return
                        log.info("ai.orchestrate STREAM OPEN user=%s", user_id)
                        async for chunk in r.aiter_bytes():
                            yield chunk
            except httpx.RequestError as e:
                log.error("ai.orchestrate STREAM UNAVAILABLE user=%s err=%s", user_id, e)
                yield b"event: error\ndata: " + json.dumps({"error": "unavailable"}).encode() + b"\n\n"
            except Exception as e:  # noqa: BLE001 — never leak a traceback down the stream
                log.error("ai.orchestrate STREAM EXC user=%s err=%s", user_id, e)
                yield b"event: error\ndata: " + json.dumps({"error": "unexpected"}).encode() + b"\n\n"

        return StreamingResponse(_sse(), media_type="text/event-stream", headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # don't let a proxy buffer the stream into one blob
        })

    # 6b. Buffered: call Claude; return raw content[] + stop_reason for the client's loop.
    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(ANTHROPIC_URL, headers=anthropic_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
        usage = data.get("usage", {})
        log.info("ai.orchestrate OK user=%s stop=%s in=%s out=%s",
                 user_id, data.get("stop_reason"), usage.get("input_tokens"), usage.get("output_tokens"))
        return {
            "ok":          True,
            "content":     data.get("content", []),
            "stop_reason": data.get("stop_reason"),
            "usage":       {"input_tokens": usage.get("input_tokens"), "output_tokens": usage.get("output_tokens")},
        }
    except httpx.HTTPStatusError as e:
        log.error("ai.orchestrate FAIL user=%s status=%s body=%s",
                  user_id, e.response.status_code, (e.response.text or "")[:300])
        await record_error("ai_orchestrate", f"Orchestrator error ({e.response.status_code})",
                           context={"status": e.response.status_code, "user": user_id})
        raise HTTPException(status_code=502, detail="Orchestrator service error — please try again")
    except httpx.RequestError as e:
        log.error("ai.orchestrate UNAVAILABLE user=%s err=%s", user_id, e)
        await record_error("ai_orchestrate", f"Orchestrator unavailable: {e}", context={"user": user_id})
        raise HTTPException(status_code=503, detail="Orchestrator service unavailable — please try again")
    except Exception as e:
        log.error("ai.orchestrate EXC user=%s err=%s", user_id, e)
        await record_error("ai_orchestrate", f"Unexpected orchestrator error: {e}", context={"user": user_id})
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


# ── Agent Opportunity Audit P0 — inbound vendor-reply parser ─────────────────
# A vendor replies "we'll arrive at 2pm, deposit received, final count 85" and a
# human today reads that and hand-types ~15 fields. This endpoint extracts those
# fields from the reply TEXT so the planner reviews a diff and applies it — the
# sanctioned "Apply reviewed extraction" (06_AI_GROUNDING), never an auto-write.
#
# Same security posture as /feature: signed-in planner only, input-capped,
# per-user rate-limited, server-owned prompt (no client system-prompt passthrough).
#
# (key, hint) — keys MUST stay in sync with src/lib/vendorReplyParse.js FIELDS.
# Parity is PINNED by src/lib/__tests__/vendorReplyParse.test.js, which reads
# this file and asserts the key sets are identical — change both together.
#
# 2026-07-14 parser audit F2: all time fields state the output format — 24-hour
# "HH:MM" — because that is the app's stored contract (time inputs, ICS math).
# The frontend re-normalizes and DROPS anything that isn't parseable, so the
# hint and the coercion agree.
VENDOR_REPLY_FIELDS = [
    ("arrival_time",        "when they will arrive on site — output 24-hour HH:MM (e.g. '14:00')"),
    ("coverage_start",      "when their coverage/service begins — output 24-hour HH:MM (e.g. '13:30')"),
    ("coverage_end",        "when their coverage/service ends — output 24-hour HH:MM (e.g. '21:00')"),
    ("delivery_time",       "when they will deliver — output 24-hour HH:MM (e.g. '11:00')"),
    ("setup_start",         "when setup begins — output 24-hour HH:MM (e.g. '09:00')"),
    ("setup_end",           "when setup ends — output 24-hour HH:MM (e.g. '10:30')"),
    ("day_of_contact_name", "name of the on-site / day-of point of contact"),
    ("day_of_phone",        "phone number for the day-of contact"),
    ("email",               "an email address they give"),
    ("cost",                "total price/cost in dollars (number only)"),
    ("deposit_amount",      "deposit amount in dollars (number only)"),
    ("deposit_paid",        "true ONLY if they say the deposit was received/paid"),
    ("balance_paid",        "true ONLY if they say the balance was paid in full"),
    # 2026-07-14 parser audit F5: "yes, we're all set for Saturday" is the #1
    # real inbound reply. True-only; merely mentioning the date is NOT enough.
    ("reconfirmed",         "true ONLY when the vendor clearly confirms they are all set / confirmed for the event date — merely mentioning the date is not confirmation"),
    ("final_guest_count",   "a final headcount/guest count they confirm"),
    ("staff_count",         "how many staff they will bring"),
    ("passenger_count",     "passenger capacity/count (transport)"),
    ("guard_count",         "number of guards/officers (security)"),
]


class VendorReplyParseRequest(BaseModel):
    reply_text: str
    vendor_name: Optional[str] = None
    vendor_category: Optional[str] = None
    event_name: Optional[str] = None
    # B4 — 'openai' (default, unchanged) or 'claude' (Haiku via the orchestrator's
    # Anthropic infra). The prompt, filtering, and response shape are identical;
    # only the provider call differs, so the client's vendorReplyParse.js core is
    # untouched. Lets callers migrate to Claude without touching the OpenAI path.
    provider: Optional[str] = "openai"


@router.post("/parse-vendor-reply")
async def parse_vendor_reply(
    body: VendorReplyParseRequest,
    authorization: Optional[str] = Header(default=None),
    x_planner_token: Optional[str] = Header(default=None),
):
    """Extract structured vendor fields from a pasted vendor reply.

    Returns per-field {value, evidence}, an overall confidence, and a disclaimer.
    value is null for anything the reply does not state — the model must not
    infer, guess, or carry over context. evidence is a short verbatim quote from
    the reply. The planner reviews the diff and applies it; nothing here writes.
    """
    # 1. Auth — signed-in planner only.
    principal = await require_planner(authorization, x_planner_token)
    user_id = principal.get("id") or "unknown"

    # 2. Configured? (graceful 503 → frontend hides/falls back). Per provider.
    use_claude = (body.provider or "openai").lower() == "claude"
    if use_claude and not is_orchestrator_configured():
        raise HTTPException(status_code=503, detail="Claude not configured — set ANTHROPIC_API_KEY on the server")
    if not use_claude and not is_ai_configured():
        raise HTTPException(status_code=503, detail="AI not configured — set OPENAI_API_KEY on the server")

    # 3. Validate + cap input.
    reply = (body.reply_text or "").strip()
    if not reply:
        raise HTTPException(status_code=400, detail="Empty reply")
    # 2026-07-14 parser audit F8: don't trim silently — the response carries
    # `truncated` so the UI can tell the planner only the first part was read.
    truncated = len(reply) > AI_MAX_INPUT_CHARS
    reply = reply[:AI_MAX_INPUT_CHARS]

    # 4. Per-user rate limit.
    allowed, retry_after = _rate_check(user_id)
    if not allowed:
        log.warning("ai.parse_vendor_reply RATE_LIMIT user=%s", user_id)
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly",
                            headers={"Retry-After": str(retry_after)})

    # 5. Server-owned prompt. The reply is the ONLY source; unstated → null.
    field_lines = "\n".join(f'  "{k}": what to extract — {hint}' for k, hint in VENDOR_REPLY_FIELDS)
    json_template = ",\n".join(f'  "{k}": {{"value": null, "evidence": null}}' for k, _ in VENDOR_REPLY_FIELDS)
    ctx = f"Vendor: {body.vendor_name or 'Unknown'}"
    if body.vendor_category:
        ctx += f" (category: {body.vendor_category})"
    if body.event_name:
        ctx += f", Event: {body.event_name}"

    system = (
        "You extract structured facts from a single message a vendor sent an event host. "
        "Use ONLY what the message states. Never infer, assume, or fill from general knowledge. "
        "If the message does not clearly state a field, its value MUST be null. "
        "For each field you DO fill, set 'evidence' to a short verbatim quote from the message that "
        "supports it. Booleans are true only when the message explicitly asserts them; otherwise null "
        "(never false). Return money and counts as plain numbers. Return every time as 24-hour "
        "HH:MM (e.g. '14:00', never '2:00 PM'). Return ONLY valid JSON, no prose."
    )
    user_content = (
        f"{ctx}\n\n"
        f"Fields to extract:\n{field_lines}\n\n"
        f"Vendor message:\n\"\"\"\n{reply}\n\"\"\"\n\n"
        f"Return ONLY this JSON shape (value null where the message does not state it):\n"
        f"{{\n{json_template},\n  \"confidence\": \"high|medium|low\"\n}}"
    )

    try:
        async with httpx.AsyncClient(timeout=40) as client:
            if use_claude:
                # Same server-owned prompt; Claude via the orchestrator's key and
                # the orchestrator's model — one model for every Claude route.
                payload = {
                    "model":      ORCHESTRATOR_MODEL,
                    "max_tokens": AI_FEATURE_MAX_TOKENS,
                    "system":     system,
                    "messages":   [{"role": "user", "content": user_content}],
                }
                resp = await client.post(ANTHROPIC_URL, headers=anthropic_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text") or "{}"
            else:
                payload = {
                    "model":      AI_FEATURE_MODEL,
                    "max_tokens": AI_FEATURE_MAX_TOKENS,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user_content},
                    ],
                    "response_format": {"type": "json_object"},
                }
                resp = await client.post(OPENAI_URL, headers=openai_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"] or "{}"
        try:
            parsed = json.loads(raw_text)
        except Exception:
            import re
            match = re.search(r'\{[\s\S]+\}', raw_text)
            parsed = json.loads(match.group()) if match else {}

        allowed_keys = {k for k, _ in VENDOR_REPLY_FIELDS}
        confidence = parsed.get("confidence") if isinstance(parsed, dict) else None
        fields = {k: v for k, v in (parsed.items() if isinstance(parsed, dict) else [])
                  if k in allowed_keys}

        usage = data.get("usage", {})
        out_tok = usage.get("completion_tokens") or usage.get("output_tokens") or 0
        filled = sum(1 for v in fields.values()
                     if isinstance(v, dict) and v.get("value") not in (None, "", False))
        log.info("parse_vendor_reply user=%s provider=%s vendor=%s filled=%d confidence=%s out=%d",
                 user_id, ("claude" if use_claude else "openai"), body.vendor_name, filled, confidence, out_tok)

        return {
            "ok": True,
            "fields": fields,
            # Logged/diagnostic only — the UI must not present this as a
            # confidence claim (2026-07-14 parser audit F4, 06_AI_GROUNDING).
            "confidence": confidence if confidence in ("high", "medium", "low") else "low",
            "truncated": truncated,
            "disclaimer": "AI-extracted from the vendor's message — review each field against the original before applying.",
        }
    except httpx.HTTPStatusError as e:
        log.error("parse_vendor_reply %s error: %s — %s", ("claude" if use_claude else "openai"), e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="AI service error")
    except Exception as e:
        log.error("parse_vendor_reply error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
