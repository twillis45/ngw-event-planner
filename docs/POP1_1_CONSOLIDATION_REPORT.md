# POP-1.1 — Consolidate the Existing Planning Orchestrator

Mode: Runtime Truth · Composition First · No New Engines · No Duplicate Logic
Code shipped this sprint: commit `8229722` (builds on `0f33863`, `1a9e5bb`, `6c7fa9d`).

---

## 1. Runtime Call Chain

```
EventPlanner (App.js:41976)
  ctx = buildExperienceContext(event, profile, null)     // built ONCE, line 41993
  ...
  foundation-advance effect (line ~42260)
    → eventPlan(event, ctx)                               // NEW: ctx now passed, line 42267
        composes: _eventFoundationActions(event)
                  _selectEventNextActionInner(event)       // unchanged — ranking untouched
                  workstreamsFor(event, ctx, event.vendors)
                  workstreamReadinessRollup(event, ctx, event.vendors)
                  planningState { ... }                    // NEW, read-only mapping
        → { nextActions, progress, handled, vendorReadiness, workstreams, planningState }

VendorPlanningWorkspace.jsx (VendorStatusBar, host branch)
  → eventPlan(event).vendorReadiness                       // no ctx passed — doesn't need
                                                            // ctx-dependent fields; same function

HostHome per-event card (App.js:22779)
  → selectEventNextAction(ev)                              // thin wrapper, does NOT call
                                                            // eventPlan() or consume ctx — see
                                                            // "Updated Planning Architecture" below

CommandCenter.jsx (rendered as the "Command" tab, App.js:41880 / 42606)
  → HealthList → HealthRow
        confidencePersona(event) / confidenceFor()          // confidenceGrammar.js — LIVE, default-on
        becauseActive() / valueConfidenceActive()            // becauseLayer.js / valueConfidence.js — LIVE, default-on
        decisionsActive() → decisionConfidence()             // decisionConfidence.js — LIVE, default-on
```

**Correction to prior audits (Runtime Truth)**: `becauseLayer.js`, `valueConfidence.js`, and `decisionConfidence.js` were previously reported as "fully orphaned — zero references in App.js." That was true for `App.js` specifically but the conclusion was wrong — all three (plus `confidenceGrammar.js`) are imported AND called inside `CommandCenter.jsx`'s `HealthList`/`HealthRow`, which is itself live UI (the "Command" tab). All three gating flags (`becauseOn`, `valueConfidenceOn`, `decisionsOn`) default ON. This is corrected in the Explainability Inventory below — verifying against running code, not trusting a prior report, is exactly what this sprint's Rule Zero demands.

---

## 2. Updated Planning Architecture

`eventPlan(event, ctx)` in `CommandCenter.jsx` is confirmed (again) as the canonical planning authority. This sprint's change is additive composition only:

```
eventPlan(event, ctx = null)
  ├─ nextActions[]        (UNCHANGED — the reactive tier ladder + foundation dominoes)
  ├─ progress              (UNCHANGED)
  ├─ handled                (UNCHANGED)
  ├─ workstreams[]          (from POP-1/WOW-1 — groups vendors by workstream)
  ├─ vendorReadiness        (from POP-1/WOW-1 — sum of workstreams' readiness)
  └─ planningState          (NEW this sprint — read-only mapping, zero new logic)
        { currentPriority, currentWorkstream, currentMilestone, nextMilestone,
          blockedDecisions, recommendationLifecycle, deepLink, reasoning, confidence }
```

**`selectEventNextAction(event)` remains a separate thin wrapper** — it calls `_selectEventNextActionWithBadge`/`_selectEventNextActionInner` directly (the same underlying engine `eventPlan` uses) but does NOT go through `eventPlan()` and does not receive `ctx`. This is the one architectural seam this sprint did NOT close, flagged honestly rather than silently left: `selectEventNextAction` and `eventPlan` both derive from the same inner engine today, so they cannot disagree on the #1 action's *content* — but `selectEventNextAction`'s callers (HostHome's per-event cards, portfolio previews) do not receive `workstreams`/`vendorReadiness`/`planningState`, because they never call `eventPlan()` itself. No behavior changed here this sprint (explicitly out of scope: "Do NOT change behavior yet"), but it is the next natural consolidation step, named under Objective 1 follow-up in the Implementation Summary.

No new orchestration engine was created. No planning engine was duplicated.

---

## 3. Vendor Integration Report

Status: **complete**, shipped in the prior two sprints, reconfirmed unchanged this sprint.

- `EventVendorsTab`/`VendorPlanningWorkspace.jsx`'s `VendorStatusBar` (host branch) reads `eventPlan(event).vendorReadiness` — not a local filter.
- `getEventAttention().vendorIssues` reads through the same `workstreamReadinessRollup()` path.
- Regression tests (`vendorReadinessRollup.test.js`, `workstreams.test.js`) pin the exact contradiction that existed before (`Deposit Paid` vendor counted as an issue on one surface, booked on the other) and prove it can't recur.
- Live-verified this sprint again: flagship event, Vendors tab shows "1 booked · 8 to follow up," matching HostHome.
- Per-vendor detail cockpit (readiness banner, deliverables/contract/day-of sections) untouched — confirmed via screenshot this sprint.

---

## 4. Completion Logic Matrix

| Recommendation type | "Done" computed by | Duplicate formulas found | Stale-snapshot risk | Classification |
|---|---|---|---|---|
| Budget | `hostSpending()` (App.js:41239 hero), raw category sum (`assembleRevealEngines.js:230`), `taskEngine.js:37` boolean, plus inline checks at `App.js:22802/23763/26945/40005/41097` | **5-8+ independently-written formulas** | **Confirmed**: `App.js:26945` seeds `budgetSet` via `useState(() => Number(totalBudget) > 0)` — a one-time initializer never recomputed on update, while other surfaces recompute live | **Consolidate** — onto `taskEngine.js`'s `hasBudget` |
| Guests | `guestsHeroContent` (attendanceBand-based), `deriveDecisionBlockers`'s `resolvedGuestCount`, `taskEngine.js`'s `hasGuests` | **3 independently-written formulas** | Not confirmed stale, but no shared import | **Consolidate** — onto `taskEngine.js`'s `hasGuests` |
| Vendor | `vendorReadinessRollup`/`workstreamReadinessRollup` (single source, this sprint's fix) vs. `hasNamedVendor` (`taskEngine.js:24`) vs. inline `.some(v => v.name.trim())` at `App.js:22794/33862`, `disclosure.js:28` | **Vendor readiness is now single-sourced (Objective 3); vendor-NAMED (has any vendor at all) is a separate, still-duplicated check** | Not confirmed stale | **Consolidate** — `hasNamedVendor` is a different question than readiness and was out of this sprint's scope; flag for next pass |
| Task/Timeline | `effectiveDone`/`taskSatisfied` (`taskEngine.js`) | **None** — this is the one domain with a genuine single predicate already | N/A | **Already canonical** — the model to extend, not touch |
| Food | `playbookFoodPlan(event, foodPP)` presence check | Not independently duplicated elsewhere found this sprint | Not assessed this sprint | **Park** — not audited to the same depth as Budget/Guests/Vendor this sprint |
| Shopping | Derived from food plan's checked-off items | Not independently duplicated elsewhere found this sprint | Not assessed this sprint | **Park** |
| Risk | `event.riskStatus[riskId]` (persisted) | N/A — this is a real stored field, not a derived "done" | N/A | **Already canonical** for dismissal; not a completion formula in the same sense |

**Recommended canonical source** (per objective 5's request, not yet implemented — audit only): `taskEngine.js`'s `hasBudget`/`hasGuests`/`hasNamedVendor` predicates, since they already exist, are already imported in at least one place, and match the "derive, don't store" pattern the rest of the architecture uses. The concrete next step is importing them into the other 5-8+ call sites rather than writing new formulas — not done this sprint (Rule Zero: "Do NOT rewrite yet").

---

## 5. Recommendation Lifecycle Matrix

Requested stages: Discovered → Recommended → Accepted → Working → Blocked → Completed → Archived.

| Recommendation type | Persisted lifecycle state? | Stages actually present | Classification |
|---|---|---|---|
| Risk | **Yes** — `event.riskStatus[riskId]` | Recommended (default) → Accepted/Working (`acknowledged`) → Archived (`mitigated`/`dismissed`). No explicit Discovered/Blocked distinction, but the closest thing to the full chain that exists anywhere. | **Already canonical** for its 3 states — this is the pattern to extend, not replace |
| Decision blockers (`deriveDecisionBlockers`) | No | Recommended only — recomputed fresh every call, no stored status, no dismiss | **Integrate** — extend the `riskStatus` pattern (same field shape) to decisions, per the delta doc's earlier recommendation |
| Task/Timeline | No (derive-only) | Effectively Recommended → Completed (binary, inferred) — no Accepted/Working/Blocked distinction, and no Archived (a completed task doesn't disappear from history, it just stops being "next") | **Park** — `taskEngine.js`'s binary model is intentional and correct for its scope; a fuller lifecycle isn't clearly needed here |
| Vendor | No | Vendor `status` field (Considering/Quoted/Deposit Paid/Confirmed/Booked/Contracted) is itself a rough lifecycle, but it's a vendor-workflow status, not a recommendation-lifecycle status — no "this platform recommended vendor X" object exists at all | **Park** — out of scope; the vendor status field already serves this need adequately for vendors specifically |
| Budget | No | Pure derive — a budget recommendation (e.g. "$2,885–$7,605") is never marked accepted/rejected | **Park** |
| Timeline (ROS cues) | No | Pure derive | **Park** |
| Shopping | No | Checked-off state exists (`item.got`) — this IS effectively a 2-state lifecycle (Recommended → Completed) for shopping items specifically | **Already sufficient** for its scope |
| Food | No | Pure derive (menu presence) | **Park** |
| Guest | No | RSVP status (`yes`/`no`/`maybe`/blank) is a guest-response lifecycle, not a recommendation lifecycle | **Park** — different concept, correctly not conflated |

**Conclusion**: no domain has the full 7-stage chain. `riskStatus` is the most complete (3 of 7 stages, real and working) and is the correct pattern to extend — not a new lifecycle engine. This matches Rule Zero: "Determine which lifecycle already exists. Do NOT invent another."

---

## 6. Explainability Inventory

| Engine | File | Consumed? | Where | Default state |
|---|---|---|---|---|
| Because Layer | `lib/becauseLayer.js` | **Live** (correction to prior audit) | `CommandCenter.jsx:2296`, `HealthRow`, gated by `becauseActive()` | ON by default |
| Value Confidence | `lib/valueConfidence.js` | **Live** (correction) | `CommandCenter.jsx:2284`, `HealthRow`, gated by `valueConfidenceActive()` | ON by default |
| Confidence Grammar | `lib/confidenceGrammar.js` | **Live** (correction) | `CommandCenter.jsx:2248/2272`, `HealthList`/`HealthRow` (`confidencePersona`/`confidenceFor`) | ON by default |
| Decision Confidence | `lib/decisionConfidence.js` | **Live** (correction) | `CommandCenter.jsx:3148`, gated by `decisionsActive()` | ON by default |
| `nextDecision` (this sprint's `workstreamsFor`) | `lib/workstreams.js` | **Live**, new this cycle | Matched from `ctx.decisionBlockers` by type prefix | N/A — always on, additive |
| `status`/`reasoning`/`deepLink` (this sprint's `planningState`) | `CommandCenter.jsx` | **Live**, new this cycle | `eventPlan().planningState` | N/A |

**Correction, stated plainly**: the prior sprint's report (`ET1_HI1_CS1_TRUST_CONTINUITY_REPORT.md`, and repeated in `POP1_PHASE1_DELTA_AND_WORKSTREAM_DESIGN.md`) called these four engines "fully orphaned" based on a grep scoped to `App.js` only. They are genuinely consumed in `CommandCenter.jsx`. **Recommendation revised**: no Delete action is warranted — these are Integrate/Already-Integrated, not dead code. The earlier "Consolidate or Delete" recommendation is withdrawn.

**What remains genuinely unaddressed**: `confidence` at the `eventPlan()`/`planningState` level (the ongoing next-action ladder) still has no signal to compose from — the four engines above operate on `CommandCenter`'s own `HealthRow` list (Timeline/Vendors/Guests/Budget/Documents/Capacity/Reality Check health rows), a different, narrower surface than the cross-tab `nextActions[0]`. This is why `planningState.confidence` is honestly `undefined` this sprint rather than wired to one of these four — doing so would require deciding whether a `HealthRow`-scoped confidence number honestly generalizes to the whole-event next-action, which is a design decision, not a wiring task, and is correctly parked.

---

## 7. Implementation Summary

**Shipped this sprint** (commit `8229722`):
1. `eventPlan(event, ctx)` — `ctx` now threaded through from `EventPlanner`'s single real call site, additive only, proven not to change `nextActions`/`progress` (regression test).
2. `planningState` — read-only composed object on `eventPlan()`'s return, mapping `currentPriority`/`currentWorkstream`/`currentMilestone`/`nextMilestone`/`blockedDecisions`/`deepLink`/`reasoning` from fields that already existed; `confidence`/`recommendationLifecycle` left honestly `undefined`.
3. Corrected the Explainability Inventory (Runtime Truth) — 4 engines previously called "orphaned" are confirmed live in `CommandCenter.jsx`.
4. Completion Logic Matrix and Recommendation Lifecycle Matrix — audited, classified, not rewritten (per Rule Zero).

**No new engines, no new orchestrator, no duplicate recommendation system, no behavior change to `nextActions` ranking.** Tests: 841/841 pass (7 new this sprint). Build clean. Live-verified on the flagship event: HostHome and Vendors agree, unchanged from before.

**Classified findings, for the next sprint**:

| Finding | Classification |
|---|---|
| `selectEventNextAction` doesn't route through `eventPlan()`, so its callers never get `workstreams`/`vendorReadiness`/`planningState` | **Integrate** — natural next step, not started |
| Budget/Guest completion still duplicated 5-8+ ways, including one confirmed stale `useState` snapshot | **Consolidate** — onto `taskEngine.js`'s existing predicates |
| Decision blockers have no persisted dismiss lifecycle | **Integrate** — extend `riskStatus`'s pattern/field shape |
| `becauseLayer`/`valueConfidence`/`confidenceGrammar`/`decisionConfidence` | **Already Integrated** (correction — previously miscategorized as orphaned) |
| `planningState.confidence` has no source signal | **Park** — design decision (does a `HealthRow`-scoped number generalize to the whole event?), not a wiring gap |
| Full 7-stage recommendation lifecycle | **Park** — no domain needs more than `riskStatus`'s 3-state pattern yet; extend that pattern before inventing more stages |
| Vendor "has any vendor named" duplication (distinct from readiness) | **Consolidate** — same `taskEngine.js` pattern, not done this sprint |
| Procurement scaling, dependency graph, military playbook content | **Park** — unchanged, correctly out of scope |

---

## 8. Addendum — SSOT #1: the COUNT was single-sourced, the CLAIM was not

Date: 2026-07-14 · Commits `867af98` (source) + `48f6414` (build sync)

### What Section 3 got wrong

Section 3 above declared vendor integration **"complete"** on the strength of a real fix: `vendorReadinessRollup`/`workstreamReadinessRollup` became the one source for the vendor *number*, and the pinned regression (`Deposit Paid` counted as an issue on one surface, booked on the other) genuinely cannot recur.

That claim was **true of the count and false of the language**. `isVendorBooked` (Considering→Quoted→**Contracted**→**Deposit Paid**→Confirmed, where the last three are "booked") answers *"is this vendor secured for the day?"*. It does **not** answer *"is there anything left for the host to do with this vendor?"* — a Deposit-Paid vendor is secured but still owes a confirm. Five surfaces used the booked predicate to license the **word "confirmed"** or a **green state**, so the app could tell the host:

> "Everyone's locked in — confirms, times, and paperwork all set."

…on the same event where the readiness dot was grey and a **"Confirm vendor"** action was still live. One number, two contradictory stories. The single-source fix consolidated the arithmetic and left the claim un-audited.

### Before → after, per surface

| Surface | Before (booked predicate) | After (`isVendorConfirmed`) |
|---|---|---|
| CommandCenter vendor health chip | "3 of 5 confirmed" | "3 of 5 booked · 2 to confirm" |
| `getEventReadiness` vendor axis | "3 confirmed" | "all booked · 2 to confirm" |
| HostShellV2 vendor-sheet hero | "Everyone's locked in — confirms, times, and paperwork all set." | "All booked — 2 still to confirm before the day." |
| HostShellV2 "People you're hiring" row | "5 of 5 booked" | "all booked · 2 to confirm" |
| HostShellV2 status pill | green on **any** booked status | green **only** when fully locked in |
| `dayBefore` vendors row | "Everyone you hired is locked in" (0 open) | booked-not-confirmed still counts open |

The `dayBefore` row is the one this sprint **found**, not just ported — it was outside the four surfaces the fix originally touched, and it is the worst place to over-claim, since it fires the night before the event.

### The rule that now governs

**`isVendorBooked` sizes the day. `isVendorConfirmed` licenses the claim.** A green state or the word "confirmed" may only be spoken by `isVendorConfirmed` — the same predicate the readiness dot (`phaseProgress`) and the "Confirm vendor" action already used. Wherever the real concern *is* day-of readiness (arrival times, COI, day-alerts, attention items), `isVendorBooked` keeps its correct meaning and was left alone.

Corollary, generalized past vendors: **consolidating a number does not consolidate the sentence built on it.** Any surface that turns a count into a claim ("all", "everyone", "locked in", "set") needs its own source-of-truth pass. Section 3's "complete" is the shape of that mistake.

### Score, recomputed

| | Before | After |
|---|---|---|
| Vendor *count* single-sourced | ✅ (as Section 3 said) | ✅ unchanged |
| Vendor *claim* single-sourced | ❌ — 5 surfaces over-claimed off the booked predicate | ✅ all 6 read `isVendorConfirmed` |
| Green state can coexist with an open confirm | ❌ yes (the bug) | ✅ no — impossible by construction |
| Tests | 841/841 at time of writing; **2675/2675 (175 suites)** at this sprint's start | **2676/2676 (175 suites)** — +1 `dayBefore` guard that fails against the old predicate |

Section 3's status is therefore revised from **complete** to **complete (count) · closed this sprint (claim)**.

Live-verified in the hostv2 dev server, not just unit-tested: staged all 5 vendors booked with 4 unconfirmed → hero reads "All booked — 4 still to confirm before the day", Deposit-Paid/Agreed pills render lavender not green, and home still reads "4 of 5 areas handled" with "Follow up with Maplewood" as the next action. One caveat stated plainly: the `dayBefore` vendors row could **not** be driven live — no sample event is both inside the 0–2 day window and has vendors (the "day of" Cookout has none). That surface is covered by the new unit test only.
