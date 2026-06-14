# Sprint 55C-A — Event OS Runtime Audit

*No design, no build. Source-verified inventory of what already performs prioritization / next-action / risk / readiness / command / escalation / confidence. Verdict up front: **most of the Event OS runtime already exists and is active.** The 55B "four new engines" plan would largely recreate it.*

## Headline finding
There is already a working, deterministic **decision runtime**: `Solve → CommandCenter → (Budget confidence, Vendor accountability, Severity/Day-of)`, rendered live in the Home spine, the Client-Events portfolio rows, the event Command Center tab, and Day-of Mode. The genuinely-missing pieces are **data, not engines**: the operational playbook (what-to-buy/how-much), opportunity detection, contingencies, and the human (emotional/social) readiness + coaching content. There is also one **fully-built second next-action engine sitting hidden in shadow mode.**

---

## PART 1 — Existing Runtime Inventory

| File | Symbol | Inputs | Outputs | UI surface | Behavior |
|---|---|---|---|---|---|
| `lib/eventSolve.mjs` | `solve()` / `enginePreview()` | event (date, vendors, guests, timeline), asOf | `{ daysOut, readiness 0-100, flag, binding (next action), delivery, dateAtRisk, criticalChain }` | Home spine, portfolio rows (`engineNextAction`), EngineNextStep (shadow) | Backward-solve over a 29-family dependency graph → next action + readiness% + date-at-risk + critical chain |
| `lib/eventSolve.mjs` | `familyFor` / `solveFamilyFor` | event type | solve family or null | — | type→graph routing (via eventTaxonomy) |
| `CommandCenter.jsx` | `selectStudioCommand(events)` | all events | `{ level: critical\|attention\|neutral, category, title, consequence, … }` | Home next-step spine, Studio command grid, dashboard | **Cross-event prioritization** with escalation tiers (today-act → critical blocker → attention → neutral) |
| `CommandCenter.jsx` | `selectEventNextAction(event)` | one event | next-action `{ title, category, level, primaryRoute, primaryCta, owner }` | Spine, portfolio | **Per-event next action** (the "production Spine") |
| `CommandCenter.jsx` | `getEventReadiness(event)` | one event | 4 axes `{ decision, vendor, timeline, document }` each `{ status: ON_TRACK\|ATTENTION\|AT_RISK, label, note }` | portfolio row readiness, preview panel | **Event health score** across 4 axes |
| `CommandCenter.jsx` | `getEventAttention(event)` | one event | `{ decisions, approvals, approvalsAwaiting, requests, vendorIssues }` | portfolio KPIs, filters, rows | **Attention routing** (open-item counts) |
| `CommandCenter.jsx` | `getCrossEventAttention(events)` / `getCrossEventAttentionItems` | all events | sorted attention stream | Home "What needs attention" | Flat, ranked cross-event item feed |
| `CommandCenter.jsx` | `deriveCommandCenterData(event)` | one event | decisions/approvals/requests/timeline/vendors/docs bundle | event Command tab (Mobile/DesktopCommandCenter) | Assembles the per-event command center |
| `CommandCenter.jsx` | `getDocumentsReadiness` / `getDocStatusForKind` | event | doc readiness/status | Command tab doc pills | Document risk |
| `CommandCenter.jsx` | `nextStepOwner(na)` | next-action | `{ key: you\|vendor\|client, label }` | spine + "Waiting on" column | Owner routing |
| `lib/budgetEstimator/confidence.js` | `estimatorConfidence({hasType,hasDate,hasGuestCount,hasMarket,hasTimeOfDay,hasHistory})` | signal flags | `{ score, level: high\|medium\|low, spread, label }` | Budget estimate hint | **Confidence score** for the budget |
| `lib/vendorAccountability/derive.js` | `deriveVendorAccountability` / `deriveVendorMissingProof` / `deriveVendorNextAccountabilityAction` / `deriveVendorBriefReadiness` / `quickAccountabilityForVendor` | vendor, event, promises | accountability tier, missing proof, next action, brief readiness | Vendor detail / cockpit | **Vendor risk + accountability + proof + next action** |
| `lib/vendorAccountability/promiseModel.js` | `PROMISE_STATUS_SEVERITY`, `RISK_LEVELS` (none/watch/attention/critical), `transition` | promise | severity/risk per promise | Vendor promise rows | Promise-level risk scoring |
| `lib/vendorAccountability/conflicts.js` | `deriveVendorPromiseConflicts` | event, promises | conflicts list | Vendor surfaces | Cross-vendor conflict detection |
| `lib/vendorIntelligence.js` | `getVendorCOIState`, `coiNextAction` | vendor, event | COI risk state + next action | Vendor / Day-of dock | Insurance/COI risk + next action |
| `lib/readinessHistory.js` | `getReadinessHistory`, `recordReadiness`, `readinessScore` | eventId, score | readiness trend over time | Readiness trend | **Readiness history / trend** |
| `lib/severity.js` | `SEVERITY`, `SEVERITY_ORDER` (nominal→escalated→critical→emergency→recovery), `SUPPRESSION`, `AUTHORITY` | level | canonical severity + escalation | `EventDayMode.jsx` | **Formal escalation model** (day-of) |
| `components/EventDayMode.jsx` | Day-of Mode | event, severity | day-of issue board | Day-of Mode | **Day-of guidance + issue prioritization** |
| `components/EngineNextStep.jsx` | shadow comparator | event | logs `selectEventNextAction` vs `enginePreview.binding` agreement | **hidden** (`?enginePreview=1`) | A **second next-action engine** running in shadow, awaiting a promote decision |

---

## PART 2 — Runtime Capability Matrix

`A` = exists & active · `B` = exists but hidden · `C` = partial · `D` = missing

| # | Capability | Class | Where |
|---|---|:--:|---|
| 1 | Next Action | **A** *(+ B duplicate)* | `selectEventNextAction` (active) **and** `enginePreview.binding` (shadow) |
| 2 | Top Risk | **A** | `dateAtRisk` + `AT_RISK` axes + critical tier in `selectStudioCommand` |
| 3 | Opportunity Detection | **D** | only risk/attention is surfaced (the solve `celebrate` rule is the nearest thing) |
| 4 | Readiness Assessment | **C** | operational readiness 🟢 (`getEventReadiness` 4-axis + solve `readiness%` + history); **human** (mental/physical/emotional/social) 🔴 |
| 5 | Vendor Risk | **A** | `vendorAccountability` (tiers, missing proof, RISK_LEVELS) + COI + readiness vendor axis |
| 6 | Budget Risk | **C** | `estimatorConfidence` + uncontracted/outstanding exist, but budget is **not** a readiness axis or a command signal |
| 7 | Timeline Risk | **A** | `getEventReadiness.timeline` + overdue tasks + `dateAtRisk` |
| 8 | Dependency Risk | **A** | solve graph `deps[]` → `criticalChain` (dependency-driven date-at-risk) |
| 9 | Escalation Logic | **A** | `severity.js` (nominal→emergency) in Day-of + `selectStudioCommand` tiers |
| 10 | Command Center Prioritization | **A** | `selectStudioCommand` (rendered in spine, grid, dashboard) |
| 11 | Event Health Score | **A** | `getEventReadiness` 4-axis + solve `readiness%` |
| 12 | Confidence Score | **A** | `estimatorConfidence` (budget) |
| 13 | Planner Guidance | **C** | `selectStudioCommand.consequence` / next-best-action exists; **coaching/reassurance voice** 🔴 |
| 14 | Day-Of Guidance | **A** | `EventDayMode` + `severity` + `today-act` tier |
| 15 | Contingency Suggestions | **D** | none (the 55B contingency data is unwired, audit-only) |

**Tally:** 10 × A · 3 × C · 2 × D · 1 × B (the shadow next-action). ~70% of the Event OS runtime is **already live**.

---

## PART 3 — Runtime Flow Map

```
RAW DATA (event: date, vendors[], guests[], timeline[], commClient[], docs, budget)
   │
   ├─► SOLVE ENGINE (eventSolve.mjs · solve)
   │     deps graph → readiness% · binding(next action) · flag · dateAtRisk · criticalChain
   │       └─► eventSolveAdapter ─► engineNextAction / enginePreview
   │             ├─► UI: Home Next-Step Spine (selectStudioCommand wraps it)
   │             ├─► UI: Client-Events portfolio rows
   │             └─► EngineNextStep.jsx (SHADOW — hidden, logs vs Spine)
   │
   ├─► COMMAND CENTER (CommandCenter.jsx)
   │     getEventAttention ─► counts ──┐
   │     getEventReadiness ─► 4 axes ──┤
   │     getDocumentsReadiness ────────┤
   │     selectEventNextAction ─► per-event next action
   │     getCrossEventAttentionItems ─► ranked stream
   │        └─► selectStudioCommand ─► {level, category, title, consequence}  ← PRIORITIZATION
   │              ├─► UI: Home spine (command=)
   │              ├─► UI: Studio command grid / dashboard
   │              └─► UI: event Command tab (deriveCommandCenterData → Desktop/MobileCommandCenter)
   │
   ├─► BUDGET (budgetEstimator) ─► estimatorConfidence ─► {score, level} ─► UI: Budget hint
   │
   ├─► VENDOR (vendorAccountability + vendorIntelligence)
   │     deriveVendorAccountability / missingProof / COI ─► RISK_LEVELS ─► UI: Vendor detail/cockpit, Day-of dock
   │
   └─► SEVERITY (severity.js · nominal→emergency) ─► UI: EventDayMode (day-of prioritization)

READINESS HISTORY (readinessHistory.js) records readinessScore over time ─► trend UI
```

---

## PART 4 — Duplicate Logic (call-outs)

1. **TWO next-action systems (the big one).** `selectEventNextAction` (CommandCenter "production Spine") **and** `enginePreview.binding` (eventSolve engine). `EngineNextStep.jsx` literally runs both and logs whether they agree — it is a shadow-mode comparator built to drive a "which one wins" promote decision *that was never made*. This is competing priority logic, intentional but unresolved.
2. **TWO readiness computations.** `getEventReadiness` (CommandCenter, 4-axis ON_TRACK/ATTENTION/AT_RISK) **and** solve `readiness%` (eventSolve). Both answer "how ready." Reconciled by comments, but distinct math feeding different surfaces.
3. **FOUR severity vocabularies.** solve `flag` (behind/approaching/on-track) · `getEventReadiness.status` (ON_TRACK/ATTENTION/AT_RISK) · `severity.js` (nominal/escalated/critical/emergency/recovery) · `promiseModel.RISK_LEVELS` (none/watch/attention/critical). Four scales for "how bad" across four surfaces — no single canonical severity.
4. **Attention vs Readiness overlap.** `getEventAttention` (counts) and `getEventReadiness` (axes) both derive from the same timeline-overdue + vendor-status inputs — adjacent computations of the same truth.

---

## PART 5 — Gap Analysis

**Already built (active):** Next Action, Top Risk, Timeline/Dependency/Vendor Risk, Escalation, Command Prioritization, Event Health, Confidence (budget), Day-of guidance, readiness history. *The decision runtime exists.*

**Partially built:** Readiness (operational axes only — no human/emotional/social), Budget Risk (data exists but isn't a command/readiness signal), Planner Guidance (picks the one action but has no coaching/reassurance voice).

**Hidden:** the **engine's next-action (`enginePreview.binding`)** — a complete second next-action engine running only in shadow behind `?enginePreview=1`, with an agreement-logging harness waiting on a promote decision.

**Truly missing (data, not engines):**
- **Operational Playbook data** — what to buy / how much / where / cooking-setup-cleanup schedules (the 55A gap). *The `eventOS`/playbook JSONs exist only in `engine-audit/` and are NOT imported by `src/`.*
- **Opportunity Detection** (capability #3).
- **Contingency Suggestions** (capability #15).
- **Human readiness + coaching + experience-knowledge** content (the 55B Readiness/Experience/Mindset *content*, not new engines).

---

## PART 6 — Recommendation

### ✅ EXECUTE — but **reuse the runtime; do not build the four engines.**

The 55B plan to build Playbook / Readiness / Experience / Host-Mindset as **new engines** is **PARKED** — Readiness, Experience-detection, and Mindset-prioritization already exist as `getEventReadiness` / the risk+severity systems / `selectStudioCommand`. Building parallel engines would create a *fifth* priority system on top of the two we already can't reconcile. The only thing genuinely missing is **DATA + a thin reader feeding the existing runtime.**

### Smallest possible Sprint 55C scope (reuse-first)

1. **Wire ONE operational playbook into the existing next-action.** Add a tiny `lib/playbooks/` reader and the **Dinner Party** playbook data (already authored in `engine-audit/`); have `selectStudioCommand` / `selectEventNextAction` surface the playbook's next *operational* step ("buy ice — ~1.5 lb/guest", "lock the menu") **through the surfaces that already render** (spine, Command tab). No new UI. This proves the Playbook layer feeds the live runtime.
2. **Resolve the dual next-action.** Read the shadow agreement log (`EngineNextStep`) and either **promote** the engine binding or **retire** the shadow — collapse two next-action systems into one. This pays down the #1 duplication and is a prerequisite for cleanly attaching playbook steps.

Explicitly **out of scope for 55C:** building Readiness/Experience/Mindset engines (extend the existing ones with data later), Opportunity Detection, Contingencies, persona-scaling UI. Author the remaining four Phase-1 playbooks as *data* only after step 1 proves the wiring.

**One sentence:** the runtime is built — Sprint 55C should *connect the operational-playbook data to it and unify the two next-action systems*, not stand up a parallel Event OS.
