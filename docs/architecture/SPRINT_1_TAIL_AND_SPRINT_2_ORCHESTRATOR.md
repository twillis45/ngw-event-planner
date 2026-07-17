# Sprint 1 Tail + Sprint 2 Orchestrator — scoped

_Drafted 2026-07-16. The go-forward slice of [Execution Plan & Cost](2026-07-11_EXECUTION_PLAN_AND_COST.md). Sprints 0–1 are essentially done; this scopes the two things that come next in order: **finish the Sprint 1 tail** (cheap, de-risks everything after), then **build the Sprint 2 orchestrator** (the load-bearing new piece)._

> **Governing rule (unchanged):** never build the AI before the engines are honest, and go **thin before wide** — one grounded orchestrator surface proven before fanning out.

---

## Grounding — what already exists (don't rebuild it)

A code pass on 2026-07-16 found Sprint 2 is **not greenfield**:

| Piece | File | State |
|---|---|---|
| Secure server-side AI proxy | `backend/app/routers/ai.py` | **Exists.** Routes: `/status`, `/feature`, `/complete`, `/extract-document`, `/parse-vendor-reply`. Rate-limited, key server-side. |
| Frontend AI client | `src/lib/aiProxy.js` | **Exists.** POSTs `{feature, prompt, context}`; 8 features (`event_brief`, `vendor_followup`, `document_summary`, `checklist_help`, `proposal`, `budget`, `schedule`, `readiness`). |
| "Ask the plan" Q&A | `src/lib/askPlan.js` | **Exists — deterministic, no LLM.** Maps a question to an answer COMPUTED from engine outputs, always naming its `basis`. This is the honest floor to build the LLM version *on top of*, not replace. |
| Vendor-reply parser | `src/lib/vendorReplyParse.js` + `/api/ai/parse-vendor-reply` | **Exists — real AI, null-unless-stated, evidence-quoted, manual apply.** |

**Two facts reshape Sprint 2:**
1. The existing proxy is **feature-prompt-based, not tool-calling** — the model gets a tuned system prompt, not the ability to *call the engines*. The orchestrator is the evolution of this into tool-calling.
2. The proxy uses **`OPENAI_API_KEY`**. The plan (and `CLAUDE.md`: "default to the latest and most capable Claude models") assumes **Claude tool-calling**. **This is a decision to make before Sprint 2 code** — see Decision D1.

---

## Part A — Sprint 1 tail (do first)

Small, and it removes divided effort that every later sprint would otherwise inherit.

### A1 · Freeze & begin sunsetting the legacy (CRA) UI  🟡 audit done 2026-07-16 — 1 real gap
The doctrine is "V2 is go-forward; legacy is a donor." Today legacy still receives real fixes — that's double-maintenance on every sprint after this.

**The migrate/drop audit ran 2026-07-16** (diffed legacy `HostEventShell`/host router in `src/App.js` — 46,972 lines — against the V2 `sheet.kind` render switch in `HostShellV2.jsx:5968` — 28 sheets). Result: **14 host-facing legacy surfaces; 11 already have V2 parity; ONE real gap; 2 to verify; 9 planner-only surfaces drop with legacy.** The sunset is nearly safe — nothing is lost *except one host file hub.*

**MIGRATE decision — RESOLVED 2026-07-16 → mostly DROP, one tiny deferred affordance.**
A content read of `EventDocumentsTab` (`App.js:40746`) revised the tentative "migrate the hub" verdict. The tab is **substantially a planner surface** — its own language is pro/planner throughout ("Needs client review", DocuSign envelopes, contract-signature tracking, "the planner most likely wants to act on"). Its six kinds resolve:
- **contract / mood_board** → planner/vendor artifacts; contracts are already **vendor-scoped in V2's vendor sheet**. DROP the planner doc-management (client-review/DocuSign) per the "host isn't a pro" doctrine ([[host-appropriate-vendor-ui]]).
- **menu / seating_chart / final_packet** → V2 already has the **host-facing equivalents, generated not uploaded**: food plan = menu, seating sheet = seating chart, the day-of run-of-show = final packet. No migration owed — a host builds these, doesn't file them.
- **floor_plan** → the one genuinely host-owned *file* a host might have been emailed. **Deferred, not built speculatively:** if a host actually asks to stash a floor-plan file, add a small "attach a link/file" affordance on the V2 `venue`/`space` sheet — a one-field add, not a document hub. Do not build ahead of the request (zero-speculation doctrine).

  **Net: `EventDocumentsTab` → DROP with legacy.** Nothing host-facing is lost; the only residual is an optional single-field venue attachment, deferred until requested. **The legacy freeze is no longer blocked.**

**VERIFY before deleting — both RESOLVED 2026-07-16 → covered, safe to drop:**
- [x] `VendorArrivalView` (`App.js:38129`) — legacy = a standalone list of confirmed vendors with an `arrivalTime`. V2 folds arrival into **"The Day" stage vendor cues** (`arrivalAsk` @ `HostShellV2.jsx:66`, `arrivalClusters` from `travelPlan`, day-stage on-site cell + `tel:` link per graduation spec `81350b10`). **Covered — DROP safe.**
- [x] `RSVPFormView` (`App.js:29992`) — legacy = the guest RSVP form (+ host preview). In V2 that is **`InviteV2.jsx`** (the dedicated public invite/RSVP app, `?rsvp=` routed in `main.jsx`) + the host-side "Preview the RSVP" button. **Covered — DROP safe.**
- [ ] Field-level parity diff on **Event Details** and **Vendors** tabs remains advisable as a mechanical pre-delete check (spot-checked as parity, not field-diffed) — an execution step, not a blocker.

> **A1 decision status: COMPLETE.** All 14 legacy host surfaces are V2-parity or safely droppable; nothing host-facing is lost. Remaining A1 work is purely mechanical: freeze `src/App.js` (header + CI note), the pre-delete field diff, and the dated CRA-removal note.

**DROP with legacy (9 planner-only surfaces, not host gaps):** `StudioCommandPanel`, `MainDashboard` (planner CRM), Communication (`EventCommTab` — host shell has no comms branch by design), Client Intake, planner Decisions/Seating tabs, `CrewTab`/`CrewManifest`, `ProfileModal`/`MembersModal`, `GlobalCompose`. None belong in `HostShellV2`.

**Then:**
- [ ] **Resolve the Documents decision** (migrate slice or explicit scope-out) — the only blocker to a clean sunset.
- [ ] **Freeze legacy**: stop landing new fixes in `src/App.js` except security/data-loss; header comment + CI note so it's intentional.
- [ ] **Sunset plan**: dated note for when the CRA build leaves deploy.

**Acceptance:** the Documents gap resolved; the 2 review items verified; legacy marked frozen; no host-facing feature lives only in legacy.

### A2 · One general undo pattern  ✅ ALREADY BUILT — universal (stale claim corrected 2026-07-16)
The plan carried A2 as "partial — only input guardrails, no general undo." A code read found that **stale**: the undo is already implemented, and more thoroughly than the plan assumed — not per-surface, but built into the **single write path** (build-map #8).

- **`patchEvent(obj, msg, opts)` @ `HostShellV2.jsx:2971`, undo at :3009** — every host edit funnels through this one function. On any write with a `msg` (and not `{noUndo:true}`), it snapshots exactly the keys the write touches (`undoPrev`) and surfaces a green **"Undo"** toast that restores them via the same path (`patchEvent(undoPrev, 'Undone.', {noUndo:true})`). `noUndo` opts out writes that shouldn't reverse — e.g. a real guest reply landing (`announceReplies` :3027).
- **All four highest-regret surfaces covered:** headcount (`:3226/:3231`, generic), date (`confirmDate :3261`, generic), budget total (`setB :3484`, bespoke toast undo), vendor cost (`:1745`, bespoke toast undo). **And beyond the four** — undo is universal for any `patchEvent`-with-message edit, from one consistent control.

**Acceptance ("undo the last consequential change on ≥4 surfaces from one consistent control"):** met and **LIVE-VERIFIED 2026-07-16** on the local preview (5199, Wanda dual event). A real RSVP mutation via the generic path produced the green **Undo** toast; clicking the real Undo button reverted the exact prior value (`before "Yes" → mid "No" → Undo → after "Yes"`, reverted=true). Demo patch cleared after. A2 is closed.

**Optional consolidation (not needed):** budget + vendor cost use a *bespoke* toast undo (they pass no `msg` to `patchEvent`, then toast manually) — a second implementation of the same idea, kept only for custom restore copy. They could drop it and pass a `msg` to reuse the generic path; low value, cosmetic.

---

## Part B — Sprint 2 — the orchestrator, thin (do second)

**Goal:** one genuinely grounded LLM surface where the model *calls the real engines as tools* and narrates only their returned numbers — the hard rule being **every figure in a reply comes from a tool call, never the model's head.** Ship exactly one surface ("ask the plan"), proven, before any fan-out.

### D1 · DECISION — Claude vs the existing OpenAI proxy  ✅ DECIDED 2026-07-16 → Option A
Owner chose **Claude tool-calling alongside the existing OpenAI proxy** (full memo: [D1_ORCHESTRATOR_PROVIDER_DECISION.md](D1_ORCHESTRATOR_PROVIDER_DECISION.md)). New route `/api/ai/orchestrate` on Claude (Sonnet for the host conversation, Haiku for parse/classify); the 8 working OpenAI feature routes stay untouched (zero regression). No SDK migration — the backend calls providers over raw HTTP, so a second provider is one env key + one call. Soft flag: if the Sprint-61 OpenAI switch turns out to have had a hard cost/reliability reason, revisit before scaling. Everything below proceeds on this path.

### B1 · Wrap the pure `lib/` engines as tools  ✅ BUILT 2026-07-16
Shipped `src/lib/orchestratorTools.js` (+ `orchestratorTools.test.js`, 9 tests green). **Client-side, not Python** — the engines are pure JS and the light-and-fast doctrine says run them client-side, so the tool layer is a JS dispatch module: the server orchestrator emits `tool_use` naming a read, the client runs the engine and returns `tool_result` (no round-trip, engines never ported). Exports `TOOLS`, `toolSchemas()` (Claude tool defs, empty `input_schema` — the model names the read, never supplies the data), and `runTool(name, ctx)` (verbatim passthrough; honest `unknown_tool`/`no_event`/`engine_error`, never a guessed value). The load-bearing invariant is **test-locked**: a tool's output deep-equals the direct engine call. Params like `priceFactor`/`profile` ride in via ctx (server-invisible), so the model can't fabricate them.

The nine tools over the real functions (no new logic):

| Tool | Backs onto (real export) | Returns |
|---|---|---|
| `get_money` | `hostSpending` (`src/lib/`) | planned / committed / spent |
| `get_food_plan` | `playbookFoodPlan` | food $ band, per-head, sized-for guests |
| `get_crab_plan` | `buildCrabPlan` | crabs/person, order lines, cost |
| `get_headcount` | `attendanceBand` | resolved count + honest band |
| `get_decisions` | `playbookDecisionBoard` | open / locked / next |
| `get_budget_recovery` | `buildBudgetRecoveryPlan` | over-budget math, safe cuts |
| `get_travel_plan` | `buildTravelPlan` | lodging/air/ground rollups (destination) |
| `get_vendor_plan` | `buildVendorPlan` + `vendorPricingHint` | vendor readiness, pricing basis |
| `get_run_of_show` | `effectiveRos` | the day-of timeline |

**Rule:** a tool is a thin adapter — it calls the engine and returns its output verbatim. No number originates in the tool layer or the model.

### B2 · Orchestrator skeleton  ✅ BUILT 2026-07-16 (against a mock)
Two pieces, both testable with no key/backend/network:
- **Client loop** — `src/lib/orchestrator.js` (+ test, 7 green). Because the engines are client-side JS (B1), the LOOP is client-side: send `{messages, tools}` via an injectable transport → on `tool_use`, run `runTool()` locally and feed the `tool_result` back → repeat until a final answer. **Grounding guard** (`groundingCheck`) is enforced, not just prompted: every number in the answer must trace to a tool result or the host's question; a fabricated `$91,317` is flagged `ungrounded` (test-locked). Honest `max_turns` termination.
- **Backend relay** — `POST /api/ai/orchestrate` in `backend/app/routers/ai.py` (+ `test_ai_orchestrate.py`, 6 green). A thin, stateless one-turn Claude relay: `require_planner` auth, `is_orchestrator_configured()` → **503 when `ANTHROPIC_API_KEY` unset**, shared `_rate_check`, **server-owned system prompt** (client cannot inject one — test-locked), **prompt-cache** `cache_control` on system + last tool, key stays server-side, returns Claude's `content[]` verbatim. Added to `/status` (`orchestrator`, `orchestrator_model`). Model env-overridable (`ORCHESTRATOR_MODEL`, default `claude-sonnet-4-5`).

**Deferred (real-key work, not mockable):** streaming to the client; Haiku routing for parse/classify; gating behind a paid event. All additive on top of this route.
**Follow-up flagged:** the route reuses `require_planner`; a host-scoped auth gate is a B3/integration decision.
> **RESOLVED 2026-07-17 — no gate needed; closing the flag.** A code read (not a guess) found `require_planner`
> **authenticates, it does not authorize a role**: any valid Supabase token passes, so a signed-in host is already
> authorized exactly like a planner. There is no planner role and nothing checks for one (`require_admin` is the only
> real role gate). Nor is there anything to scope: `/api/ai/orchestrate` is **stateless** — the engines run
> client-side (B1), so the route relays the caller's OWN conversation and never fetches stored event data. A host's
> numbers exist only in their browser, so user A cannot reach user B's plan through it. That's why the data routes
> (`rsvp.py`, `vendor_brief.py`) pair `require_planner` with their own studio-scoped `_assert_event_access` and this
> one correctly doesn't — there is no stored record to scope to. Docstrings in `auth.py` corrected, since the *name*
> was the only thing claiming a role check. **Residual, tracked elsewhere:** any signed-in user can spend orchestrator
> tokens (per-user rate-limited) — that's a COST concern, and it's the already-deferred "gating behind a paid event",
> not an access-control hole.

### B3 · Ship ONE surface — "ask the plan" (LLM tier)
`askPlan.js` already answers deterministically. Layer the LLM *on top*, not instead:
- [ ] Try the deterministic `answerPlanQuestion` first; if it matches, the LLM only warms the phrasing around the computed number + `basis`.
- [ ] If it doesn't match, the orchestrator plans a tool sequence, calls the engines, and narrates — same honesty (names assumptions, "I can't answer that from your plan" when truly ungroundable).
- [ ] Render: streamed warm reply **with the cited number card inline** + a deep-link/action to the surface that owns it.

**Acceptance:** on the flagship event, "will $2,000 cover crabs for 50?" returns a streamed, warm, **engine-cited** answer; a question with no grounding is honestly declined; no figure appears that isn't traceable to a tool call (verified in logs).

### B4 · Retrofit the vendor-reply parser onto the orchestrator (Claude)  ✅ BUILT 2026-07-16
The parser splits cleanly: `src/lib/vendorReplyParse.js` is the **pure, provider-agnostic honesty core** (null-unless-stated, no-downgrade, coercion, evidence, allow-list) — the backend route only does the raw LLM extraction. So the retrofit is a **provider swap**, core untouched.
- **Backend** (`/api/ai/parse-vendor-reply`): added a `provider` field — `'openai'` (default, unchanged) or `'claude'`. The Claude path reuses the orchestrator's Anthropic infra (`anthropic_headers`, `ANTHROPIC_KEY`) on **Haiku** (the plan's "route parse/classify to Haiku"), with the **same server-owned prompt, same JSON parse, same allow-list filter, same response shape** — so `vendorReplyParse.js` is byte-for-byte untouched. Gated: `provider:'claude'` → 503 if `ANTHROPIC_API_KEY` unset; the OpenAI default is fully preserved.
- **Tests** (`test_ai_parse_vendor_reply_b4.py`, 5): Claude path returns the same filtered shape (off-list field dropped, unstated→null), 503-when-Anthropic-unconfigured, OpenAI default unchanged, auth still required. **22 backend AI-route tests green, no regression.**
- **Client migration:** the caller opts in by sending `provider:'claude'`; left on the OpenAI default until the key is confirmed live (a one-line flip). This satisfies "old feature routes remain until callers migrate."

Not done (folding the 8 `aiProxy` feature prompts into orchestrator tools) — a separate, lower-urgency consolidation; the vendor parser was the flagship real-AI feature to re-home.

---

## Order of execution (this slice)

1. **A1 legacy freeze/migrate ledger** → **A2 undo primitive** _(cheap, removes double-maintenance)_
2. **D1 decision** (Claude path) — a prerequisite, not code
3. **B1 tool layer** → **B2 orchestrator skeleton** → **B3 one grounded surface** → **B4 retrofit**
4. _then_ Sprint 3–4 (surfaces on the orchestrator), per the parent plan

**Do not** start B before A: the whole point of thin-before-wide is one honest, single-maintenance foundation before the AI fans out.

---

_Related: [Execution Plan & Cost](2026-07-11_EXECUTION_PLAN_AND_COST.md) (parent), [First-Timer's North Star](https://claude.ai/code/artifact/87675bf8-e7e2-4d71-ab8a-224a5f46e490) (the genAI architecture vision), decision-engine danger-zone rules (never auto-fill money/headcount/needs-host)._
