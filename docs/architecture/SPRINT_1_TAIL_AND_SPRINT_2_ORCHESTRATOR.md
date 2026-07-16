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

**MIGRATE (the one real gap):**
- [ ] **`EventDocumentsTab` — event-wide document hub** (`App.js:40746/40769`): host-owned files — floor plan, menu, mood board, seating chart, final packet. **V2 only has vendor-scoped documents; host-owned files have NO V2 home.** Decide: migrate a lightweight host "Files" surface, or explicitly rule these file kinds out of the host product before sunset. This is the only item where "nothing is lost" is not yet true.

**VERIFY before deleting (NEEDS-REVIEW — likely folded, not line-verified):**
- [ ] `VendorArrivalView` day-of arrivals tracker (`App.js:38129`) — confirm the V2 day stage reproduces any host-facing arrival controls.
- [ ] `RSVPFormView` host RSVP preview/editor (`App.js:29992`) — confirm V2 `qr`→RSVP + `InviteV2` fully covers it.
- [ ] Field-level parity diff on **Event Details** and **Vendors** tabs before physically deleting (spot-checked as parity, not field-diffed).

**DROP with legacy (9 planner-only surfaces, not host gaps):** `StudioCommandPanel`, `MainDashboard` (planner CRM), Communication (`EventCommTab` — host shell has no comms branch by design), Client Intake, planner Decisions/Seating tabs, `CrewTab`/`CrewManifest`, `ProfileModal`/`MembersModal`, `GlobalCompose`. None belong in `HostShellV2`.

**Then:**
- [ ] **Resolve the Documents decision** (migrate slice or explicit scope-out) — the only blocker to a clean sunset.
- [ ] **Freeze legacy**: stop landing new fixes in `src/App.js` except security/data-loss; header comment + CI note so it's intentional.
- [ ] **Sunset plan**: dated note for when the CRA build leaves deploy.

**Acceptance:** the Documents gap resolved; the 2 review items verified; legacy marked frozen; no host-facing feature lives only in legacy.

### A2 · One general undo pattern  🟠 partial
Today only input guardrails exist (pickers ≤ guests, date-corruption). Legacy's "Keep 75" revert is the only true undo anywhere.

- [ ] Generalize the revert pattern into one shared primitive (a last-value stash + "Undo" affordance) reusable by any host mutation via `patchEvent`.
- [ ] Wire it to the highest-regret mutations first: headcount, budget total, date change, vendor cost.

**Acceptance:** a host can undo the last consequential change on ≥4 surfaces from one consistent control; live-verified.

---

## Part B — Sprint 2 — the orchestrator, thin (do second)

**Goal:** one genuinely grounded LLM surface where the model *calls the real engines as tools* and narrates only their returned numbers — the hard rule being **every figure in a reply comes from a tool call, never the model's head.** Ship exactly one surface ("ask the plan"), proven, before any fan-out.

### D1 · DECISION — Claude vs the existing OpenAI proxy  ⚠️ decide before coding
The proxy is OpenAI; the plan + brand want Claude tool-calling. Options:
- **(Recommended)** Add a **Claude tool-calling path** alongside the existing feature proxy (don't rip out the working OpenAI features). New route `/api/ai/orchestrate`, Claude Sonnet for the host conversation, Haiku for parse/classify.
- Retrofit tool-calling onto OpenAI. (Works, but off-brand and re-solves what Claude tool-use gives natively.)

**Owner call needed.** Everything below assumes the recommended Claude path.

### B1 · Wrap the pure `lib/` engines as server-callable tools
The engines are already pure/deterministic (2264 tests) — the source of every number. Expose a **thin, typed tool layer** over the real functions (no new logic):

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

### B2 · Orchestrator skeleton
- [ ] `/api/ai/orchestrate` (Claude tool-calling loop) — streaming, per-user rate limit (reuse `_rate_check` from `routers/ai.py`), server-owned system prompt.
- [ ] **Grounding guard:** the system prompt forbids stating any figure not returned by a tool; a post-check flags a reply containing a number with no matching tool call (log + soft-fail to the deterministic answer).
- [ ] **Guardrails carried in:** pickers ≤ guests, sanity caps, never auto-fill `needs-host`/money/headcount (mirror the danger-zone rules from the decision-engine roadmap).
- [ ] Cost controls from the plan: **prompt-cache** the system prompt + tool defs (~90% cheaper), **route** parse/classify to Haiku, **stream** first tokens (~1s), **gate** the conversation behind a paid event.

### B3 · Ship ONE surface — "ask the plan" (LLM tier)
`askPlan.js` already answers deterministically. Layer the LLM *on top*, not instead:
- [ ] Try the deterministic `answerPlanQuestion` first; if it matches, the LLM only warms the phrasing around the computed number + `basis`.
- [ ] If it doesn't match, the orchestrator plans a tool sequence, calls the engines, and narrates — same honesty (names assumptions, "I can't answer that from your plan" when truly ungroundable).
- [ ] Render: streamed warm reply **with the cited number card inline** + a deep-link/action to the surface that owns it.

**Acceptance:** on the flagship event, "will $2,000 cover crabs for 50?" returns a streamed, warm, **engine-cited** answer; a question with no grounding is honestly declined; no figure appears that isn't traceable to a tool call (verified in logs).

### B4 · Retrofit the two already-shipped real-AI features onto the orchestrator
They shipped standalone ahead of the orchestrator — re-home them so Sprints 3–4 have one foundation:
- [ ] **Vendor-reply parser** (`vendorReplyParse.js`) → a tool/route under the orchestrator, keeping null-unless-stated + evidence-quoted + manual apply.
- [ ] Fold the 8 `aiProxy` feature prompts into orchestrator tools where tool-calling beats a static prompt (proposal/budget/schedule/readiness are prime candidates — they should *read the engines*, not just prompt over context).

**Acceptance:** both run through `/api/ai/orchestrate`; behavior unchanged or better; the old feature routes remain until callers migrate.

---

## Order of execution (this slice)

1. **A1 legacy freeze/migrate ledger** → **A2 undo primitive** _(cheap, removes double-maintenance)_
2. **D1 decision** (Claude path) — a prerequisite, not code
3. **B1 tool layer** → **B2 orchestrator skeleton** → **B3 one grounded surface** → **B4 retrofit**
4. _then_ Sprint 3–4 (surfaces on the orchestrator), per the parent plan

**Do not** start B before A: the whole point of thin-before-wide is one honest, single-maintenance foundation before the AI fans out.

---

_Related: [Execution Plan & Cost](2026-07-11_EXECUTION_PLAN_AND_COST.md) (parent), [First-Timer's North Star](https://claude.ai/code/artifact/87675bf8-e7e2-4d71-ab8a-224a5f46e490) (the genAI architecture vision), decision-engine danger-zone rules (never auto-fill money/headcount/needs-host)._
