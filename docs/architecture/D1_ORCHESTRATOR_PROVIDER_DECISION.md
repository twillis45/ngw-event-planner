# D1 — Orchestrator provider decision (Sprint 2 prerequisite)

_Drafted 2026-07-16. Gates the whole Sprint 2 orchestrator build ([Sprint 1 Tail + Sprint 2](SPRINT_1_TAIL_AND_SPRINT_2_ORCHESTRATOR.md) §D1). This is an **owner decision** — it's a provider/cost/brand call, not something the code dictates. This memo makes it concrete and recommends._

> **DECIDED 2026-07-16 → Option A (Claude alongside OpenAI).** Owner chose the recommended path. The Sprint-61 rationale gate was not flagged as a hard constraint, so A proceeds; if a cost-ceiling/reliability reason for the OpenAI switch surfaces later, revisit before scaling. Sprint 2 builds `/api/ai/orchestrate` on Claude, leaving the existing OpenAI feature routes untouched.

## The question
The Sprint 2 orchestrator needs an LLM that can **call the engines as tools** ("every number from a tool call, never the model's head"). Which provider runs it?

## Grounded context (what's actually true today)
- **The server AI proxy is OpenAI, by a deliberate move.** `backend/app/routers/ai.py:2` — *"Backend AI proxy — Sprint 61 (switched to OpenAI)."* Uses `gpt-4o-mini` (text) + `gpt-4o` (vision). So this is **not** a greenfield provider pick — the team already chose OpenAI for the server, on purpose. **The Sprint-61 rationale isn't recorded here — confirm it before reversing** (if it was cost or a reliability issue, that reason may still hold).
- **Anthropic is already in the product**, frontend-side: *"Frontend BYOK (vendor copilot) still uses the planner's own Anthropic key"* (`ai.py:5`). So a Claude path isn't foreign to the codebase.
- **No SDK lock-in.** `requirements.txt` has neither `openai` nor `anthropic` — the backend calls the provider over **raw HTTP** (`OPENAI_URL` + a bearer header). Adding a second provider = another raw HTTP call + one env key. Cheap, reversible.
- **The proxy is feature-prompt-based, not tool-calling.** The orchestrator is a *new capability* either way — it is not a refactor of the existing `/feature` routes, which keep working untouched.
- **Standing brand directive:** `CLAUDE.md` — "default to the latest and most capable Claude models."

## Options

### Option A — Claude tool-calling *alongside* the OpenAI proxy  ✅ RECOMMENDED
Add a new `/api/ai/orchestrate` route on **Claude (Sonnet for the host conversation, Haiku for parse/classify)**; leave the existing OpenAI `/feature`, `/complete`, `/extract-document`, `/parse-vendor-reply` routes exactly as they are.
- **+** Tool-use is Claude's native strength — the "grounded, every-number-from-a-tool" doctrine is exactly what tool-calling is for.
- **+** Brand-aligned (`CLAUDE.md`), and Anthropic is already a configured provider (frontend BYOK).
- **+** No SDK migration; the working OpenAI features are untouched → zero regression risk.
- **+** Cost controls from the Execution Plan apply cleanly: prompt-cache the system prompt + tool defs (~90% off), Haiku for cheap turns, gate behind a paid event.
- **−** Two providers to key/monitor server-side (small ops surface).
- **−** Reverses part of the Sprint-61 direction — needs the "why did we leave Anthropic?" answer first.

### Option B — Tool-calling on OpenAI (stay single-provider)
Build the orchestrator on OpenAI function-calling; one provider, one key.
- **+** Consistent with the Sprint-61 decision; one ops surface.
- **−** Off the `CLAUDE.md` brand default.
- **−** Re-solves what Claude tool-use gives natively; the "warm host voice" is a Claude strength being left on the table.

### Option C — All-in on Claude (migrate the existing features too)
Move `/feature`/`/complete`/`/extract-document` to Claude as well, retire OpenAI.
- **+** One provider, fully brand-aligned.
- **−** Highest risk/scope — re-tests 8 working feature prompts + vision extraction for no Sprint-2 benefit. **Not now** (do it later, if ever, as its own migration).

## Recommendation
**Option A.** Add a Claude tool-calling orchestrator *alongside* the working OpenAI proxy. It's brand-aligned, plays to Claude's tool-use strength for the grounding doctrine, carries zero regression risk (existing routes untouched), and the raw-HTTP architecture makes a second provider cheap and reversible. Treat Option C (full migration) as a separate, later, optional cleanup — never a Sprint-2 blocker.

**One gate before committing:** get the **Sprint-61 rationale** for the OpenAI switch. If it was pure preference/availability, Option A proceeds. If it was a hard constraint (cost ceiling, a Claude reliability/latency issue at the time), weigh Option B.

## What A unblocks (Sprint 2, once decided)
`/api/ai/orchestrate` (Claude tool-loop, streaming, grounding guard) → wrap `lib/` engines as tools (B1) → ship the one grounded "ask the plan" surface on top of the deterministic `askPlan.js` (B3) → retrofit the vendor-reply parser + strongest feature prompts (B4).
