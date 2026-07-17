# Event Boss — Execution Plan & Cost

_Ported from artifact `6ece90b7-2d6a-4349-af71-1b4e9687d8d9` (https://claude.ai/code/artifact/6ece90b7-2d6a-4349-af71-1b4e9687d8d9) on 2026-07-16. **The artifact remains the editable original** — if you change one, change the other. Originally in the audits INDEX "deliberately NOT ported" list (plans were kept as living docs); ported on explicit request._

> **Kicker:** Execution plan · prioritization · genAI & genUI cost · light & fast · start now.

The buildable version of the plan: **which changes to make first, in which layer, when combining the best of V2 and legacy** — plus the honest pros, cons, and dollar cost of genAI and generative UI to the owner, the recipe to keep it light and fast, and the exact first commit. One rule governs everything: **V2 is the go-forward app; legacy is a donor for honesty patterns and mature engines.**

---

## STATUS LEDGER — what's done, what's left (as of 2026-07-16)

| Sprint | Scope | Status |
|---|---|---|
| **Sprint 0 — Stop the lies** (engines) | overdue-on-creation; reconcile contradictions (crab "no order yet", budget copy); input guardrails (pickers ≤ guests); + date-corruption guardrail, surprise-choreography gate, protein/bun mispricing hardening | ✅ **DONE** (2026-07-10) |
| **Sprint 1 — One app** (frontend) | transplant legacy honesty into V2: kids input, all four denominator captions, event disambiguation; host-appropriate vendor UI (already correct) | ✅ **DONE** (2026-07-10/11) — **except** the legacy *deletion* |
| — freeze & sunset legacy UI | stop fixing legacy, migrate its unique surfaces, retire it | 🟠 **FROZEN, NOT YET DELETED** (2026-07-16, `48134006`) — was "🔴 NOT STARTED", now stale. `src/App.js` carries the freeze header ("FROZEN — legacy CRA host shell. DONOR-ONLY… Do NOT add new host-facing features here"); CLAUDE.md carries the matching non-negotiable. The **migrate/drop audit is COMPLETE**: all 14 host-facing legacy surfaces are V2-parity or safely droppable — `EventDocumentsTab` resolved to DROP (it is substantially a *planner* surface; V2 already generates the host-facing equivalents), `VendorArrivalView` and `RSVPFormView` both verified covered. Nothing host-facing lives only in legacy. **Remaining is mechanical, not decisional:** the field-level parity diff on Event Details + Vendors as a pre-delete check, and the dated CRA-removal note. Deletion is scheduled post-Sprint-2 — which is now reachable. |
| — general error-recovery / undo | a universal undo beyond input guardrails (legacy's "Keep 75" revert is still the only undo pattern) | ✅ **DONE — and it was already built when this row was written** (was "🟠 PARTIAL (input guardrails only)"). The undo is not per-surface: it lives in the **single write path**. `patchEvent(obj, msg, opts)` (HostShellV2.jsx ~:2971) snapshots exactly the keys a write touches (`undoPrev`) on any write carrying a `msg`, and surfaces a green **Undo** toast that restores them through the same path; `{noUndo:true}` opts out writes that shouldn't reverse (e.g. a real guest reply landing). So it is universal for **any** `patchEvent`-with-message edit, not just the four highest-regret surfaces (headcount, date, budget total, vendor cost — all covered). Acceptance ("undo the last consequential change on ≥4 surfaces from one consistent control") met and **live-verified 2026-07-16** on the preview: a real RSVP mutation produced the Undo toast; clicking it reverted the exact prior value. |
| **Sprint 2 — The orchestrator, thin** (middleware) | wrap `lib/` engines as server-side tools; orchestrator skeleton (Claude tool-calling, streaming, guardrails, "every number from a tool"); ship one grounded "ask the plan" | ✅ **DONE** (2026-07-17) — was "🟠 PARTIAL — the true server-side tool-calling orchestrator does not exist yet", which is now false. All four parts exist and the acceptance passed **live against a real key**: (1) **tool layer** — 9 typed adapters over the pure engines (`src/lib/orchestratorTools.js`), holding the rule the whole thing rests on: *a tool never computes anything, it calls the engine*; (2) **loop** — `src/lib/orchestrator.js` runs Claude tool-calling to completion; (3) **relay + streaming** — `POST /api/ai/orchestrate` on the backend, SSE passthrough, default `claude-sonnet-5`; (4) **"ask the plan"** — shipped in the live shell (`HostShellV2.jsx` calls `runOrchestration`), not just in tests. **"Every number from a tool" is enforced, not aspirational**: `groundingCheck` fails an answer whose numbers don't trace to a tool result or the question. **One deviation from the plan as written, deliberate:** the tools run **client-side**, not server-side — the engines are pure JS already in the browser, so wrapping them server-side would have meant a round-trip per tool call for zero honesty gain (§04's "run engines client-side" rule). The server relays the Claude turn and holds the key; it does not hold the engines. |
| **Sprint 3–4 — The surfaces** | invitations generate · RSVP parse + predict · communication one-tap · vendors "order the crabs" + reply-parse — all on the orchestrator | 🟠 **BARELY STARTED** — closer to 🔴 than the "PARTIAL" this row claimed. Of the five payloads, **four do not exist in any form**: invitations-generate, RSVP-parse, communication one-tap, and "order the crabs" return **zero hits** across `src/lib/` and `hostv2/src/`. What shipped: the **vendor-reply parser** (real-AI, P0 flagship) — and **"RSVP predict" is arguably already met deterministically**, by `attendanceAdjustment` (`hostIntel.js:334`, gated + clamped + provenance-registered, and it does reach the live shell) — which is the §04 rule working as intended: if an engine can predict it, don't spend a token on it. **The correction that matters:** *"all on the orchestrator"* is **unmet even for the one AI surface that shipped**. The parser has its own route (`/api/ai/parse-vendor-reply`, via `aiProxy.js:80`); it does **not** go through `/api/ai/orchestrate`, so it doesn't inherit the tool layer or the grounding guard. It is real AI **beside** the orchestrator, not on it. Sprint 2 built the rails; nothing but "ask the plan" rides them yet. The open question this row should force: **consolidate the parser onto the orchestrator, or accept two AI paths on purpose?** (Related: the aiProxy-consolidation item already on the backlog.) |
| **Sprint 5–6 — Collaboration, genUI, commerce** | real-time multiplayer · selective generative UI · payments + social proof + virality loop | 🔴 **NOT STARTED** |

**One-line summary (corrected 2026-07-17):** **Sprints 0–2 are done; the real remaining build is Sprint 3–4, and it has barely begun.** Sprint 1 is done bar the legacy *deletion* (the freeze shipped; the undo was already universal when this ledger called it partial; what's left is a mechanical pre-delete diff, not a decision). **Sprint 2 is done** — the orchestrator exists, streams, enforces grounding, and answers live. **Sprint 3–4 is where the work actually is:** four of its five payloads don't exist, and the rails Sprint 2 built carry exactly one surface. Sprints 5–6 are untouched.

> **The correction worth reading twice (2026-07-17):** this ledger was wrong in *both* directions, and the pattern is the same one the product keeps hitting — **intelligence built, then one wire short of the host.** It undersold Sprint 1's undo and Sprint 2's orchestrator (both already built when marked partial), and it *oversold* Sprint 3–4 by writing "PARTIAL" over a row whose defining clause — *all on the orchestrator* — is unmet by every surface except "ask the plan." A row can name a shipped thing and still be false, because the claim isn't *"did we build AI here"* — it's *"is it on the rails."*
>
> **Verification standard for this ledger:** every row above was re-checked against the code (2026-07-17), and Sprint 2's against a live key — not against memory, and not against this document. A row is only as true as its last check; date any change you make here. **Sprint 5–6 has NOT been re-verified** — it was out of scope for this pass and its 🔴 is inherited, not confirmed.

---

## 01 · Prioritizing the three layers — the merge rule

_You don't merge two apps. You keep the better shell and transplant the good organs._

| Layer | Verdict | Detail |
|---|---|---|
| **Frontend** | Consolidate on V2 · retire legacy UI | V2's Vite shell is the go-forward chassis (faster, lighter, scored higher). Transplant legacy's honesty patterns — kids stepper, denominator captions ("sized for 66 instead of 75"), "Keep 75" revert, event disambiguation. Freeze legacy UI, migrate its few unique surfaces, then sunset. |
| **Backend / engines** | Already shared · harden in place | Both apps already run the same pure `lib/` engines — ~80% of the "backend" done and tested (2264 tests). Harden, don't rewrite: apply the audit fixes. Keep engines pure & deterministic — they're the source of every number and the tools the AI will call. |
| **Middleware** | Net-new · the only real build | Doesn't exist today. The orchestrator — the one genuinely new architectural piece. Sequence it **after** the fixes and FE consolidation: you can't ground an AI in engines that still lie. Build it thin first (one grounded "ask the plan"), then grow it into the surfaces. |

**Touch order:** ① harden engines (days, helps both apps) → ② consolidate FE on V2 + transplant honesty (2–3 weeks) → ③ build the orchestrator (6–10 weeks) → ④ surfaces, collaboration, commerce. Never build the AI before the engines are honest.

## 02 · genAI — pros, cons, and what it costs

**Pros:** the moat (warm conversation over honest math — no competitor has both); done-for-you (drafts, parsing, ordering, anticipation); reuses the engines as tools; compounds with the learning graph.
**Cons / risks:** variable per-use cost; latency (mitigated by streaming + model routing); hallucination risk (mitigated by grounding — engines are truth, never the model); new ops surface (keys, rate limits, monitoring).

| Cost line | Estimate | Notes & mitigation |
|---|---|---|
| LLM per planning event | **~$0.50–$3** | 20–50 grounded turns × ~5–20k tokens. Prompt caching cuts system-prompt/tool cost ~90%, landing most events near the low end. |
| LLM per draft / parse | **~$0.005–$0.03** | Route to **Haiku** (cheap/fast), not the host-facing model. A whole event's drafts < $0.20. |
| Infra (edge/serverless) | **~$0–$20/mo** | Vercel/Cloudflare free tier covers early scale; grows with usage. |
| Build cost (dev time) | **~6–10 wks** | The orchestrator is the one big lift. Fixes are days; FE consolidation 2–3 wks. |
| Margin check | **~85–95%** | At a **$39 one-event pass**, ~$1–5 AI cost = healthy margin. Gate genAI behind paid events; keep the free tier on the deterministic engines only. |

**Cost rule:** deterministic engines are free to run (client-side) — use them for everything they can do. Spend LLM tokens only where warmth or generation adds value, route cheap tasks to Haiku, cache aggressively, gate the expensive conversation behind a paid event.

## 03 · genUI — pros, cons, cost, and the honest recommendation

**Pros:** interface assembles for the moment (phase-aware, personal, less hand-built navigation); fewer bespoke screens to maintain; the "how did it know?" delight.
**Cons / risks:** higher upfront eng cost (a component-descriptor system + a vetted kit); extra LLM tokens per render; non-deterministic UI is harder to test, brand-QA, debug; over-used it feels unpredictable — the opposite of frictionless.

> **Recommendation: hybrid, not full genUI.** Keep the shell deterministic and phase-driven (the engines already know the phase — 2 weeks out vs day-of — so a hand-built adaptive layout gets 80% of "the right thing at the right time" with zero AI cost and full brand control). Use genUI **selectively** for the conversational answer surface — a cited number card, an action button, a draft — **from a closed component kit it can't break.** Don't genUI the whole app on day one.

## 04 · Keeping it light & fast — the playbook

| Lever | Why it's fast |
|---|---|
| Stay on Vite (V2) | Small bundle, instant dev, fast loads. Retire the heavier legacy CRA frame. |
| Run engines client-side | Pure JS, no round-trip — instant UI. Only call the orchestrator when you need genAI. |
| Optimistic UI (already there) | The patch layer updates before the network — perceived-instant. |
| Prompt caching | Cache the system prompt + tool defs — ~90% cheaper, lower latency every AI turn. |
| Model routing | Haiku for parse/classify/draft; Sonnet only for the host conversation. |
| Stream everything | First words in ~1s; the answer builds as she reads. No spinners. |
| Code-split the heavy bits | Lazy-load the invite stationery, crab sheet, charts. |
| Edge functions | Run the orchestrator close to the user; low round-trip latency globally. |

**Performance principle:** the fast path is local and deterministic; the AI is the slow, expensive path used sparingly and streamed. Most of what a host does never touches the network.

## 05 · The organized work — sprint by sprint

- **Sprint 0 — Stop the lies** _(✅ shipped 2026-07-10 · engines)_ — overdue-on-creation (the #1 lever); reconcile contradictions + input guardrails; bonuses found live: date-corruption guardrail, retirement surprise-choreography gate, sourcing.js protein/bun mispricing hardened.
- **Sprint 1 — One app** _(✅ shipped 2026-07-10/11 · frontend)_ — transplant legacy honesty into V2 (kids input, all four denominator captions, disambiguation); host-appropriate vendor UI verified already-correct. **Corrected 2026-07-17:** error-recovery is **not** partial — the undo is universal via the single `patchEvent` write path and was already so when this was written; legacy is **frozen** (`48134006`, donor-only header + CLAUDE.md non-negotiable) with the migrate/drop audit complete and nothing host-facing left behind. Only the **deletion** is outstanding, and it is mechanical: a pre-delete field diff on Event Details + Vendors, plus the dated removal note.
- **Sprint 2 — The orchestrator, thin** _(✅ shipped 2026-07-17 · middleware)_ — the tool layer (9 typed adapters, *a tool never computes*), the tool-calling loop, the server relay + SSE streaming, and one grounded "ask the plan" live in the shell; `groundingCheck` enforces "every number from a tool" rather than trusting the model to honour it. **Corrected 2026-07-17:** this was marked partial ("the orchestrator does not exist yet") after it existed. **Planned deviation:** the tools run **client-side** — the engines are pure JS already in the browser, so hosting them server-side buys a round-trip per tool call and no honesty (§04). The server holds the key and relays the turn; the engines stay where they are.
- **Sprint 3–4 — The surfaces** _(6–8 weeks · barely started — this is the remaining build)_ — invitations generate · RSVP parse + predict · communication one-tap · vendors "order the crabs" + reply-parse. **Corrected 2026-07-17:** four of the five don't exist at all; "RSVP predict" is arguably already met **deterministically** by `attendanceAdjustment` (no tokens — the §04 rule working); the vendor-reply parser shipped but rides **its own route**, not the orchestrator. So the sprint's actual clause — **"All on the orchestrator"** — is met by "ask the plan" and nothing else. Sequencing note: the rails now exist, so each surface here is a payload, not an architecture problem. **Decide first:** move the parser onto the orchestrator, or keep two AI paths deliberately.
- **Sprint 5–6 — Collaboration, genUI, commerce** _(8+ weeks)_ — real-time multiplayer · selective generative UI · payments + social proof + the virality loop.

### Shipped — Sprint 0, commit 1
The overdue-on-creation fix, live. A decision is only "overdue" if it was _reachable_ — if, when the event was created, there was still runway before its easy window closed. A fresh 2-day-out event now reads **"A good place to start"** instead of "5 decisions are past their easy window." New events stamp `createdAt`; the board reads it; the scold is gone. Shared engine → both apps, live-verified. Highest-impact, lowest-effort move on every audit.

---

_Grounded in the real system: V2 Vite shell, shared pure `lib/` engines (3322 tests / 237 suites, all green as of 2026-07-16 — up from the 2264 this plan first cited), Supabase + Render backend, thin direct-Claude drafting today. Cost figures are directional at current Claude pricing with prompt caching + model routing — validate against real usage. Related: [First-Timer's North Star](https://claude.ai/code/artifact/87675bf8-e7e2-4d71-ab8a-224a5f46e490) (the genAI vision/architecture), [Event Boss vs Market Leaders](2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md) ("AI-native / generative UX" scored axis)._
