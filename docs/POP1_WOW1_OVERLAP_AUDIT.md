# POP-1 / WOW-1 Overlap Audit &amp; Implementation Map

No code changed. All findings verified fresh against running code this turn.

---

## 1. Git / Branch Overlap Report

- **Tree**: clean, `main` at `9705952`, no uncommitted/unpushed work, no stash.
- **Local + remote branches**: every branch named for POP-1/WOW-1-relevant work (`sprint-58c-decision-memory`, `sprint-57h-because-layer`, `sprint-60b-event-identity`, `engine-spine-canonical-taxonomy`, etc.) has **zero commits ahead of `main`** — already merged or empty.
- **12 branches have unique commits** (`ai-feature-openai`, `anthropic-proxy`, `copy-confirm`, `dev-bypass-studio`, `estimator-v2`, `getting-started-guide`, `ios-input-zoom-fix`, `settings-collapse-guide`, `sprint-51b-comms-trust`, `sprint-52b-team-bridge`, `studio-settings-drawer`, `vendor-bank-intel`) — all diverged from a pre-backend-refactor ancestor (confirmed on a prior pass: huge unrelated diffs, e.g. deleting files that still exist on `main`). Genuinely stale, not usable, not hidden POP-1 work.
- **Conclusion**: no overlap risk from other branches. Everything relevant already lives on `main`.

---

## 2. Current Implementation State

| Concern | State |
|---|---|
| Event Identity | `resolveEventIdentity()` (`lib/eventIdentityEngine.js`) is the canonical classifier, feeding `ctx.eventIdentity`. A separate legacy `eventIdentity()` reader (`lib/eventIdentity.js`) handles "meaning" (must-have moment/honoree) — intentionally distinct, not a duplicate classifier. |
| Experience Context | `buildExperienceContext(event, profile, foodPP)` (`lib/experienceContext.js`) — pure, recomputed per render. Reaches: Budget/HostSpendingPlan, FoodPlan, HostRunOfShowTimeline, WhatCouldGoWrongPanel, `ExperienceContinuityNote`, and now `eventPlan()` (as of POP-1.1, one real call site: `App.js:42267`). Does NOT reach: Vendors' per-vendor cockpit, Guests, Tasks, Decisions panel, Day-Of Focus Mode. |
| CommandCenter / eventPlan() | Confirmed (again) as the sole planning orchestrator. `eventPlan(event, ctx)` composes: foundation dominoes, the reactive tier ladder (`_selectEventNextActionInner`), `workstreams`, `vendorReadiness`, and `planningState` (read-only mapping added in POP-1.1). `selectEventNextAction()` remains a thin wrapper around the SAME inner engine but does not itself call `eventPlan()` — its callers (HostHome per-event cards, portfolio previews) don't receive `workstreams`/`planningState`. Named, not fixed, in the last sprint's report. |
| Workstreams | `workstreamsFor()` (`lib/workstreams.js`) exists and has one real runtime call path (inside `eventPlan()`). Maps 7 workstream ids: `venue, food, photography, entertainment, decor, bar, guest_experience` (+ `other` fallback). **Gap vs. doctrine's flagship list, reverified this turn**: no `recognition_ceremony`, `recognition_slideshow`, or `military_display` id exists anywhere — because no vendor category maps to them (see §3). Photography is one combined workstream; doctrine separately lists "Portrait Photography" and "Event Photography." |
| Decision Memory | `lib/decisionMemory.js` — a real, working write+read system (`appendDecision`/`getDecisions`, gated by `decisionMemoryOn()`), surfaced via a standalone `DecisionHistory` component (`App.js:40936`) showing "why the calls were made" as a reverse-chronological log. **Confirmed again this turn: still fully separate from `ctx`/`eventPlan`/`planningState`** — `grep` for `decisionMemory` inside `CommandCenter.jsx` returns zero matches. Capture points exist at 3 sites: `budget_reallocation`, `vendor_selection`, `planner_override`. |
| Vendor readiness / no contradiction | Confirmed shipped and still live: Vendors tab reads `eventPlan(event).vendorReadiness` directly (`VendorPlanningWorkspace.jsx`); `getEventAttention().vendorIssues` derives from the same rollup. Live-verified again this turn on the flagship event: "1 booked · 8 to follow up," zero console errors. |
| Recommendation lifecycle | Only one domain has a persisted, dismissible lifecycle: `event.riskStatus[riskId]` (mitigated/acknowledged/dismissed), consumed by both `WhatCouldGoWrongPanel` and `ctx`'s risk filter. No other domain (decisions, tasks, budget, vendor, food) has a stored lifecycle state — all derive-only. |
| Completion logic | `taskEngine.js`'s `effectiveDone`/`taskSatisfied`/`hasBudget`/`hasNamedVendor` is the one genuine single-predicate model. Budget/guest "is this done" still independently re-derived 5-8+ ways elsewhere (confirmed in POP-1.1's report, unchanged since — no commits have touched those call sites). |
| Deep-link CTAs | Real, shared mechanism: route objects carry `{tab, focusField, vendorId, taskId, ...}`; `App.js`'s `handleTabChange` is the single normalizer; a dedicated effect scrolls/focuses the literal target. Confirmed field-level for date/guests/budget; the "food" domino remains tab-only (shallow), unchanged. |
| Explainability engines | `becauseLayer.js`/`valueConfidence.js`/`confidenceGrammar.js`/`decisionConfidence.js` are live, consumed inside `CommandCenter.jsx`'s `HealthList`/`HealthRow`, all default-ON. (This corrected an earlier "orphaned" finding last sprint — reconfirmed, not re-derived, this turn.) |

---

## 3. Existing Intelligence Already Present But Under-Surfaced

- **`workstreamsFor()`'s per-workstream `blocked` signal** (reuses `getVendorCOIState`'s critical-COI check) exists and is tested, but nothing in the UI currently surfaces "this workstream is blocked" — only the per-vendor cockpit shows it (`NEEDS YOU — Get the venue's insurance`). The workstream-level rollup of this signal is computed but not rendered anywhere.
- **`ctx.decisionBlockers`** is matched into each workstream's `nextDecision` field (`workstreamsFor`), but again — nothing renders `workstream.nextDecision` in any UI yet. It's composed, not surfaced.
- **`eventPlan().planningState`** (currentWorkstream/currentMilestone/nextMilestone/blockedDecisions/deepLink/reasoning) is fully computed but has zero UI consumers today — it exists purely as an exposed API surface for a future screen to read, per last sprint's explicit "expose and compose, don't change behavior" scope.
- **`event.riskStatus`'s dismiss pattern** is a working, real 3-state lifecycle that nothing outside Risks reuses — it's the correct template for extending to Decision Blockers, not yet done.
- **`DecisionHistory`'s captured rationale** (`decisionMemory.js`) is real, human-readable "why" data tied to specific decisions (budget reallocations, vendor selections, planner overrides) that never reaches `ctx.humanContext`/`planningState.reasoning` — a legitimate Human-Intelligence-survives gap, not a missing capability (the data already exists, it's just walled off).

---

## 4. Do-Not-Duplicate List

- **Do not build a second orchestrator.** `eventPlan()`/`selectEventNextAction()` remain canonical; any workstream/priority/milestone logic must compose into these, not stand beside them.
- **Do not build a second Experience Context.** `buildExperienceContext()` is the sole ctx source; `eventPlan(event, ctx)` is the one place it should be threaded into orchestration.
- **Do not build a new recommendation/lifecycle engine.** `event.riskStatus`'s pattern is the one to extend (to Decision Blockers) — not a new state machine.
- **Do not build a new vendor status vocabulary.** `BOOKED_STATUSES`/`hostStatusWord` are already unified (POP-1 Phase 1) — reuse, don't reintroduce a third definition.
- **Do not build a new Decision Memory.** It exists, works, and is intentionally separate from ctx per doctrine's "Human Intelligence must survive" — the fix (if pursued) is a read-only bridge into `ctx`/`planningState`, not a new capture system.
- **Do not build a new Workstream taxonomy engine.** `workstreamsFor()`'s `CATEGORY_TO_WORKSTREAM` map already exists — extending it with 2-3 new categories (Recognition Ceremony, Recognition Slideshow, Military Display) is a data change, not a new engine.
- **Do not touch `becauseLayer`/`valueConfidence`/`confidenceGrammar`/`decisionConfidence`.** Confirmed live and integrated — no consolidation action needed.

---

## 5. Recommended Smallest High-Value Slice

**Wire `event.riskStatus`'s existing dismiss pattern onto Decision Blockers.** This is the single highest-leverage, lowest-risk next step because:
- It reuses an already-shipped, already-tested field shape (`{status: 'mitigated'|'acknowledged'|'dismissed'}` keyed by id) — zero new architecture.
- It directly serves the doctrine's "Completed work should disappear from active planning" gate, which currently has zero coverage outside Risks.
- It's independently testable (regression tests can assert a dismissed blocker no longer appears in `ctx.decisionBlockers` or `planningState.blockedDecisions`) without touching `eventPlan`'s ranking, Vendors, or any UI redesign.

**Runner-up, smaller still**: add the 3 missing vendor categories (`Recognition Slideshow`, `Military Display`, split `Portrait Photography`/`Event Photography`) to `vendorCategoriesByType.js`'s Retirement Party entry, plus corresponding `CATEGORY_TO_WORKSTREAM` entries in `workstreams.js`. Pure data addition, no logic change, directly closes the flagship-workstream-coverage gap named in §2.

Both are compositions over existing systems; neither requires new architecture, per the hard guardrails.

---

## 6. Exact Files to Change If Approved

For the recommended slice (Decision Blocker dismiss lifecycle):
- `src/lib/assembleRevealEngines.js` — `deriveDecisionBlockers(event, eventIdentity)` needs each blocker to carry a stable `id` (currently only `type`/`urgency`/`reasoning` — `type` could serve as the id if unique per event, needs verification before assuming)
- `src/App.js` — wherever `WhatCouldGoWrongPanel`'s `setRiskStatus`/`onPatchEvent` pattern is defined (~`App.js:9229-9276`), a parallel `event.decisionBlockerStatus[type]` write path would need a UI trigger (not yet identified — likely the Decisions panel or Reveal's blocker card)
- `src/lib/experienceContext.js` — filter `decisionBlockers` through the new status map, mirroring how `deriveTopRisks()` is filtered through `riskStatus` (lines 69-70)

For the runner-up (vendor category additions):
- `src/lib/vendorCategoriesByType.js` — add categories to the `'Retirement Party'` array
- `src/lib/workstreams.js` — add corresponding `CATEGORY_TO_WORKSTREAM` / `WORKSTREAM_LABELS` entries (e.g. `recognition_ceremony`, or fold Recognition Slideshow/Military Display into `guest_experience` if a dedicated workstream isn't warranted — a judgment call, not yet made)

**Neither has been started. No code changed this turn.**

---

## 7. Tests to Run (if either slice proceeds)

- Existing: `src/lib/__tests__/eventPlan.test.js`, `workstreams.test.js`, `vendorReadinessRollup.test.js`, `pc1ExperienceContext.test.js`, `pc2RiskMergeDedup.test.js` — must continue passing unmodified in shape (or with additive-only assertion updates, same pattern as the last 3 sprints).
- New, for the recommended slice: a test proving a dismissed decision blocker disappears from `ctx.decisionBlockers` and `eventPlan().planningState.blockedDecisions`, mirroring the existing `pc2RiskMergeDedup.test.js` pattern for risks.
- Full suite baseline confirmed passing this turn: **841/841**, 48 suites.

---

## 8. Risks / Unknowns

- **Unknown**: whether `deriveDecisionBlockers`'s `type` field is guaranteed unique/stable per event (needed as a dismiss-key) — not verified this turn, must check before implementing the recommended slice.
- **Unknown**: where a host would actually trigger "dismiss this blocker" in the UI — no existing card/button was found for decision blockers the way `WhatCouldGoWrongPanel` has Mark Mitigated/Acknowledge/Dismiss buttons for risks. This may require a small UI addition, which pushes against "no UI redesign" if not scoped carefully.
- **Risk**: extending `CATEGORY_TO_WORKSTREAM` touches a file with a live runtime call path (`eventPlan()`) — low risk (additive map entries), but must be live-verified on the flagship event per this session's standing discipline, not assumed safe from a diff alone.
- **Not verified this turn** (explicitly, per "no fake verification"): whether any other screen already has partial UI for decision-blocker dismissal that a grep might have missed — a targeted search for "blocker" + "dismiss"/"acknowledge" across `App.js` was not exhaustively run this pass; recommend running it before implementation, not assuming absence.

---

## 9. Execute / Park / Kill Recommendation

- **Execute** (pending approval, not started): extend the `riskStatus` dismiss pattern to Decision Blockers — highest leverage, smallest architecture footprint, directly closes a named doctrine gate.
- **Execute** (pending approval, smaller, independent): add the 3 missing flagship vendor categories to the Retirement Party seed list + workstream map — pure data, closes the flagship-coverage gap.
- **Park**: `selectEventNextAction()` not routing through `eventPlan()` (named last sprint, unchanged) — real gap, but changes behavior for HostHome's per-event cards, needs its own scoped/approved pass.
- **Park**: bridging Decision Memory's captured rationale into `ctx`/`planningState` — legitimate Human-Intelligence gap, but is a design decision (what subset of rationale, on which surfaces) not a wiring task.
- **Park**: budget/guest 5-8x duplicate completion formulas — audited twice now, not yet consolidated; still correctly sequenced behind smaller, more isolated slices.
- **Kill**: nothing. No dead-end or wrong-direction work was found this turn requiring reversal.
