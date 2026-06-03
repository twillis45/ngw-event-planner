# AI Provider Reality

NGW Event Planner uses **two different AI providers** for two different
purposes. They are not interchangeable. They are not in drift. They are by
design — different surfaces have different constraints.

This file documents which provider is doing what, so nobody has to grep code
to learn which AI is behind which button.

---

## At-a-glance

| Surface | Where it runs | Provider | Model(s) | Key source | Trust level |
|---|---|---|---|---|---|
| **Document AI extraction** (contract / proposal vision parse) | Server (`POST /api/ai/extract-document`) | **OpenAI** | `gpt-4o` (vision) | Server env `OPENAI_API_KEY` | DRAFT-ONLY — planner reviews extracted fields. |
| **Server-side text completions** (`POST /api/ai/complete`) | Server | **OpenAI** | `gpt-4o-mini` | Server env `OPENAI_API_KEY` | DRAFT-ONLY. |
| **Vendor Copilot — drafting & readiness** | Browser (BYOK direct call) | **Anthropic (Claude)** | `claude-haiku-4-5` | Planner's own key from Studio Setup, stored in browser only | DRAFT-ONLY. |

Both providers return drafts. **No AI output is auto-applied**, ever. See
`docs/claude-skills/06_AI_GROUNDING_NO_FAKE_INTELLIGENCE.md`.

---

## Why two providers?

- **Vendor Copilot (browser)** was first. It uses **BYOK Anthropic** so each
  planner brings their own key — no server cost, no shared rate limit, no
  middleman between the planner's data and the model. The studio setup UI is
  explicit: "Anthropic API Key (BYOK)" with copy reading
  *"Stored in your browser only. Calls go directly to api.anthropic.com — never through our servers."*
  (`src/App.js` Studio Setup — Sprint 9 / S9.x).
- **Document AI (server)** came later for vision PDF/image extraction. PDFs in
  a browser BYOK loop are slow and rate-throttled, and we wanted a single
  vetted model + version. Running it server-side through OpenAI's
  Chat-Completions vision (`gpt-4o`) is the practical choice today.
  (`backend/app/routers/ai.py` — Sprint 61 / S62.)

If `OPENAI_API_KEY` is not set, the server routes return `503` and the
frontend's existing Anthropic BYOK path remains the only AI surface — there is
no silent degradation, and the frontend never falls back to a fake provider.

---

## Fallback matrix (what's actually visible)

| Server `OPENAI_API_KEY` | Planner `profile.anthropicKey` | Document AI behavior | Vendor Copilot behavior |
|---|---|---|---|
| set | set | OpenAI vision extracts; planner reviews. | Anthropic drafts via browser. |
| set | unset | OpenAI vision extracts; planner reviews. | Rule-based preview only — copy reads *"AI connection not enabled yet."* |
| unset | set | Document AI route returns `503`; UI surfaces honest "AI not configured on server." | Anthropic drafts via browser (unchanged). |
| unset | unset | No AI. UI says so. | Rule-based preview only. |

---

## What this file is NOT

- Not a roadmap for swapping providers.
- Not permission to silently change the wiring in either direction.
- Not a reason to rename one provider to look like the other in UI copy.

If a future sprint moves Vendor Copilot to the server, or the Document AI to
Claude (vision), update **this** file in the same sprint. Drift between code
and this file is the bug.

---

## Quick code refs (as of Sprint 58P.4a)

| What | Where |
|---|---|
| Server AI proxy | `backend/app/routers/ai.py` |
| Server AI status endpoint | `GET /api/ai/status` → `{ configured, provider: "openai", model }` |
| Server AI env vars | `OPENAI_API_KEY`, `AI_MAX_TOKENS` — see `docs/integrations/ENV_REFERENCE.md` |
| Browser BYOK Anthropic call | `src/App.js → askClaude()` |
| Browser BYOK key storage | `profile.anthropicKey` in localStorage (per-user; never synced) |
| Vendor Copilot wrapper | `src/lib/vendorCopilot.js` |
| Studio Setup UI for BYOK | `src/App.js` — "Claude AI — drafting & suggestions" tile |
