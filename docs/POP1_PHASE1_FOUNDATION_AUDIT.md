# POP-1 / WOW-1 — Phase 1 Foundation Audit

Mode: Audit First · No Duplicate Work · Read-Only Before Behavior Change
No code changed this pass. Builds on [[hq3_platform_audit]], [[et1_hi1_cs1]], [[vendor_audit_continuation]] — verified fresh against running code, not assumed current.

---

## 1. Overlap Report

**Git state**: clean tree, `main` at `a9a4b5b`, no uncommitted/unpushed work, no stash. Checked all local + remote branches for unmerged work relevant to POP-1 (decision memory, event identity, vendor orchestration, milestone/priority naming): every branch with a name suggesting relevant WIP (`sprint-58c-decision-memory`, `sprint-57h-because-layer`, `sprint-60b-event-identity`, etc.) has **zero commits ahead of `main`** — already merged or empty. Only 12 branches have any unique commits, and each of those diverged from a pre-backend-refactor ancestor (huge unrelated diffs, e.g. `vendor-bank-intel` deletes hundreds of files that still exist on `main`) — genuinely stale, not usable, not hidden POP-1 work.

**The single largest correction to prior audits**: a central orchestration layer already exists and was NOT previously documented as such.

| Area | Status | Evidence |
|---|---|---|
| **Single next-action engine** | **Already Implemented** | `src/CommandCenter.jsx:1351` `eventPlan(event)` — documented in-code (line 1240) as "THE single source of truth for what to do next + progress." `selectEventNextAction()` (line 1420) is a thin wrapper. Verified callers across HostHome, event cards, per-tab heroes, auto-routing (`App.js:22779, 25591, 25698, 25883, 40775, 41380, 42267`) — all read the same function on the same `event`, so they structurally cannot disagree. |
| **Deep-link CTA engine** | **Already Implemented** | Route objects carry `{ tab, focusField, vendorSection, foodFocus, taskId, decisionId, commId, timelineId }` (`CommandCenter.jsx:1282-1306`). `App.js:42150` `handleTabChange` is the single normalizer; a dedicated effect (`App.js:42105-42122`) scrolls/focuses the literal target field. Verified true field-level deep links for date/guests/budget; the "food" domino is the one shallow (tab-only) case. |
| **Recommendation lifecycle (persisted status)** | **Partially Implemented** | One real, working, persisted dismiss lifecycle exists: `event.riskStatus[riskId]` — `WhatCouldGoWrongPanel` writes `'mitigated'|'acknowledged'|'dismissed'` via `onPatchEvent` (`App.js:9229-9276`), and `experienceContext.js:69-70` filters `deriveTopRisks()` through this same map, so a dismissed risk stays dismissed in the canonical `ctx` too. But this lifecycle is scoped ONLY to risks — `deriveDecisionBlockers`, the timeline/checklist ladder, and the primary next-action spine (`engineNextAction`/`eventPlan`) have no dismiss/snooze capability anywhere (grepped for `actionStatus`/`recommendationStatus` — zero matches); they only stop appearing when underlying event data changes. `taskEngine.js`'s `effectiveDone`/`taskSatisfied` is a real "ONE satisfaction predicate" (its own doctrine comment) but is derive-only, not dismissible, and scoped to timeline/checklist tasks. |
| **Completed-work suppression** | **Partially Implemented** | At least 6 independently-coded "nothing to do" strings exist across surfaces (studio settings `App.js:17486`, HostHome hero `:23007/23478/41520`, L1 board hero `:40859`, `nextActionRenderer.js:147-155`, `:41713`, `:43662`) — none silently missing, but no shared empty-state component. Budget-set and vendor-named "is this done" checks are independently re-implemented at 5-8+ call sites each with textually different formulas (`App.js:22802, 23763, 26945, 40005, 41097`; `assembleRevealEngines.js:230-241`; `taskEngine.js:24-37`; `disclosure.js:28`) — `taskEngine.js`'s canonical `hasNamedVendor`/`hasBudget` predicates are NOT imported by most of these, so a fix there would not propagate. **Concrete staleness bug confirmed**: `App.js:26945` seeds `budgetSet` via `useState(() => Number(totalBudget) > 0)` — a one-time initializer, not recomputed on update — while `assembleRevealEngines.js` and `disclosure.js` recompute live on every call, so it is architecturally possible for one surface to show "set your budget" after another already shows it satisfied. `App.js:23360-23382` documents a real, previously-shipped bug of exactly this class (three competing "NEEDS YOU" surfaces on HostHome), patched ad hoc (label/tab filtering), not structurally. |
| **Experience Context reach into the orchestrator** | **Missing Wiring** | `CommandCenter.jsx` never imports or reads `ExperienceContext`/`ctx` (confirmed via grep — zero matches). `eventPlan`'s only vendor-aware branch is a single hardcoded "caterer drift" tier; it has no concept of compound events, military/VFW signal, or anything `ctx.eventIdentity`/`ctx.compound` carries. |
| **Vendors tab priority vs. central orchestrator** | **Missing Wiring — genuine contradiction risk** | `EventVendorsTab` computes its own "Needs attention / Ready / All" bucketing entirely independently — confirmed no reference to `eventPlan`, `selectEventNextAction`, or `ctx` anywhere in that tab. It could show a vendor as "needs you" while HostHome's single `#1 action` says something unrelated is next — this is the exact "no surface contradicts another" gate item being violated today. |
| **Pricing explainability** | **Partially Implemented** | Stronger than initially found: `BudgetEstimateHint.jsx` (wired live, `App.js:15613/12261`) genuinely shows range + confidence chip (`estimatorConfidence`, `confidence.js:21-34`) + family-aware "Not included" list + a low-confidence coaching line, AND real cost-reduction guidance — the Sourcing card (`App.js:10396-10430`) shows tier-switch savings ("saves ~$X") wired from `sourcing.js`'s tier price deltas. Gap: the vendor-card price-range surface (`App.js:6390-6420`) is a bare range with no confidence/assumptions text, and duplicates its own inline `PER_HEAD_BY_TYPE` instead of importing `totalEstimate.js`'s. **Also found**: `becauseLayer.js`, `valueConfidence.js`, `confidenceGrammar.js`, `decisionConfidence.js` are fully orphaned — zero references anywhere in `App.js` despite `becauseLayer.js` describing itself as an active feature-flagged "exposure" layer. Dead code, not reaching runtime UI — flagged for Consolidate/Delete, not Execute. |
| **Procurement scaling (retail→commercial)** | **Genuine Missing Capability** | `sourcing.js` provides a real channel/tier choice (butcher vs. Costco-bulk vs. grocery, with differential pricing) and `foodApproach()`/`hostIsCooking()` (`playbooks/index.js:474-492`) is the single DIY-vs-caterer lever — but it's driven entirely by the host's own manual UI pick, never by `guestCount`. `quantityBasis.js` only does linear `qty × guests` scaling. No code path anywhere branches sourcing *strategy* on event scale (confirmed via grep for guest-count thresholds tied to sourcing — none found). A 120-guest and a 20-guest event get identical tier options. |
| **Vendor cross-sequencing, military-specific content** | Unchanged from [[vendor_audit_continuation]] | Still Actual Missing Capability, reconfirmed no new commits touch this area. |
| **Decision Memory wiring, `experienceContext.human`** | Unchanged from [[et1_hi1_cs1]] | Still orphaned / still unbuilt, reconfirmed no new commits touch this area. |

---

## 2. Foundation Gate Scorecard

| Gate item | Score | Note |
|---|---|---|
| Experience Context continuity (all surfaces) | ◐ | Wired into Budget/FoodPlan/Timeline/Risks; NOT into Vendors/Guests/Tasks/Decisions/Day-Of/CommandCenter itself |
| Human Intelligence continuity | ◐ | `ctx.humanContext`/`relationshipContext` exist and propagate where `ctx` reaches; `.human` expansion (7 supported fields) designed but unbuilt |
| Single Current Priority | ◐ | `eventPlan` genuinely is single-source for the surfaces that call it — but Vendors' internal bucketing sits outside it, so "single" is not yet true platform-wide |
| Single Next Milestone | ◐ | Same engine (`eventPlan`) produces this; same Vendors-carve-out caveat |
| Recommendation Lifecycle | ◐ | Derive-don't-store model works but only `taskEngine.js` has one true shared predicate; budget/guest completion each independently re-derived 3 ways |
| Completed recommendation suppression | ◐ | Works today by convention (pure recompute), not by guarantee; a real triple-completion-check bug class already occurred once (23360-23382) |
| Deep-link CTA engine | ✓ | Real, shared, field-level, self-verified this sprint |
| Workstream orchestration | ◐ | `eventPlan` ladders across foundation + reactive tiers, but vendor readiness (per-vendor cockpit state) isn't a tier input beyond the single caterer-drift check |
| Procurement intelligence (retail→commercial scaling) | ✗ | Genuine missing capability |
| Pricing explainability | ◐ | Confidence + assumptions + "not included" transparency strong; cost-reduction guidance absent |
| Vendor orchestration (sequencing/dependencies) | ✗ | Confirmed again this sprint, unchanged |
| Dependency graph (cross-workstream) | ✗ | No dependency concept beyond the retirement playbook's internal `dependsOn` chains (single-domain, not cross-surface) |
| Cross-surface consistency | ◐ | Structurally guaranteed wherever `eventPlan` is the source; structurally NOT guaranteed for Vendors (independent computation) or for budget/guest "is this done" (3 independent formulas) |

---

## 3. Recommended Implementation Order

The original three candidates (A: wire ctx into Vendors / B: build a Planning Orchestrator / C: Recommendation Lifecycle) were framed assuming no orchestrator exists. **That assumption is false** — `eventPlan`/`selectEventNextAction` already IS the single planning orchestrator for every surface that calls it. Building a second one (Candidate B as originally scoped) would itself violate the decision hierarchy ("reuse existing engines" outranks "new architecture") and would create the exact duplicate-orchestrator risk POP-1 exists to eliminate.

**Revised recommendation, in order:**

1. **Consolidate Vendors into the existing orchestrator** (not "wire ctx into Vendors" as a standalone act). Make `EventVendorsTab`'s "Needs attention" bucketing either (a) call `eventPlan`/`getEventAttention` for its top-line signal instead of computing independently, or (b) feed per-vendor readiness state back into `eventPlan` as an additional tier input. This directly closes the "no surface contradicts another" and "workstream orchestration" gate items using the engine that already exists — highest leverage, lowest risk, matches decision-hierarchy step 1 (wire existing intelligence together).
2. **Wire `ExperienceContext` into `eventPlan` itself** (once, at the orchestrator), rather than into each consuming surface individually. Every surface that already calls `eventPlan` would inherit compound/military/identity awareness for free — this is far cheaper than the "add ctx to 5 more components" framing from the prior sprint, and prevents the same wiring work from needing to be redone per-surface later.
3. **Consolidate the budget/guest "is this done" duplication** (confirmed 5-8+ independently-formula'd call sites, including one genuinely stale `useState` snapshot at `App.js:26945`) into the single-predicate model `taskEngine.js` already proved out (`taskSatisfied`/`hasBudget`/`hasNamedVendor`) — make `eventPlan`, the per-tab heroes, and `assembleRevealEngines` all import and call the one predicate instead of re-deriving it. Closes "completed recommendation suppression" using an engine that already exists, per decision-hierarchy step 1.
4. **Extend the existing `riskStatus` dismiss pattern** to `deriveDecisionBlockers` — a real, working, persisted dismiss lifecycle (`event.riskStatus[riskId]`, `App.js:9229-9276`, already flows into canonical `ctx` via `experienceContext.js:69-70`) already exists for risks; decision blockers have no equivalent. Reusing the same field shape for blockers is a smaller lift than building a new lifecycle concept.
5. **Delete or wire `becauseLayer.js`/`valueConfidence.js`/`confidenceGrammar.js`/`decisionConfidence.js`** — confirmed fully orphaned (zero references in `App.js`) despite `becauseLayer.js` presenting itself as an active feature-flagged layer. Per the decision hierarchy's "consolidate duplicate logic" step: these are either dead code to remove, or overlapping explainability engines that should replace ad hoc confidence copy elsewhere rather than sit unused. Needs a decision (Consolidate vs. Delete) before Phase 2, not urgent for Phase 1's orchestration focus.
6. **Defer** (Park until post-POP-1, per doctrine): procurement retail→commercial scaling strategy, vendor cross-sequencing/dependency graph, military-specific playbook content, `experienceContext.human` field additions, Decision Memory wiring, vendor-card price-range confidence copy. These are genuine missing capabilities or lower-leverage additions — correctly out of scope for "make existing intelligence coherent."

**Why this order minimizes rework**: if ctx were wired into Vendors first (old Candidate A) before Vendors is consolidated into `eventPlan`, the ctx wiring would need to be redone or duplicated once Vendors' priority logic moves to read from `eventPlan` — exactly the "if Vendors would need to be revisited after the orchestrator exists, don't do Vendors first" trap the prompt itself warned against. Step 1 (consolidate Vendors into eventPlan) and step 2 (wire ctx into eventPlan once) together achieve everything the old Candidate A wanted, without the rework.

---

## 4. Risk Analysis

- **Regression risk in `eventPlan`'s tier ladder**: the ladder is order-sensitive (brand-new → budget → caterer-drift → urgent decisions → …). Adding a new vendor-readiness tier or ctx-aware branch must be inserted at the correct priority rank, or it will either never fire (ranked too low) or wrongly outrank foundational dominoes like "add guests" (ranked too high). Requires the same live-verification discipline used in every prior sprint (test against the flagship event, not unit tests alone) — this sprint's own prior lesson (F4 validation) applies directly here.
- **Vendors-tab behavior change risk**: `EventVendorsTab`'s local bucketing is user-facing and has its own tests/UX (Needs attention / Ready / All tabs). Consolidating it into `eventPlan` risks changing what "needs attention" means for a vendor in ways hosts have already seen — needs a live before/after comparison on the flagship event, not just a code review.
- **`taskSatisfied` extension risk**: generalizing the single-predicate pattern from tasks to budget/guests means picking ONE of the three currently-competing formulas as canonical — whichever is chosen may change the completion moment (a few dollars/guests earlier or later than before) for the tab that used a different formula previously. Needs an explicit decision on which formula is authoritative, not an automatic merge.
- **Scope creep risk**: the doctrine explicitly says "if a proposed feature doesn't materially improve the flagship experience, PARK it." Procurement scaling and vendor sequencing are real, named gaps from the flagship audit — there will be pressure to fold them into POP-1's "first pass." Recommend holding the line: those are genuine new capabilities per the decision hierarchy, not orchestration fixes, and belong in a Phase 2 sprint.

---

## 5. Read-Only Orchestration Design (composition layer, if/when built)

Per the prompt's Step 4 instruction, but re-scoped to match what was actually found: rather than a *new* Planning Orchestrator, the design below extends the **existing** `eventPlan`/`selectEventNextAction` composition without replacing any of its inputs.

```
eventPlan(event, ctx?)                          // ctx becomes an optional 2nd arg, additive
  composes (unchanged):
    _eventFoundationActions(event)               // date/guests/budget/food dominoes
    _selectEventNextActionInner(event)            // reactive tier ladder
  composes (NEW, additive only):
    ctx?.compound / ctx?.eventIdentity            // read-only signal — may re-word an existing
                                                   // tier's copy (e.g. caterer-drift becomes
                                                   // "military-colleague headcount drift" when
                                                   // ctx signals a military compound event) —
                                                   // MUST NOT invent a new tier or reorder
                                                   // existing ones in Phase 1
    vendorReadinessSummary(vendors)                // NEW read-only input — a rollup of the
                                                   // existing per-vendor cockpit readiness
                                                   // state (already computed, just not
                                                   // currently surfaced to eventPlan)
  → nextActions[]                                  // UNCHANGED shape/contract
       { level, category, title, consequence,
         primaryCta, primaryRoute, contextLine }
```

Explicit non-replacement guarantees (per the prompt's guardrail):
- Does NOT replace `buildExperienceContext` — only reads its output.
- Does NOT replace `resolveEventIdentity` — ctx already carries its result.
- Does NOT replace the per-vendor cockpit engine — only reads its readiness rollup.
- Does NOT replace `_selectEventNextActionInner`'s existing tiers — only adds ctx as optional context for re-wording, and vendor-readiness as one additional signal a tier may check.

Output contract requested by the prompt (Current Priority / Current Workstream / Current Milestone / Next Milestone / Blocked Decisions / Recommendation Lifecycle / Deep-Link Target / Reasoning / Confidence) maps onto the existing `nextActions[0]` object as follows — **all fields already exist except Workstream and explicit Blocked Decisions grouping**:

| Requested field | Existing equivalent | Gap |
|---|---|---|
| Current Priority | `nextActions[0].title` | none |
| Current Workstream | — | **missing** — `category` exists (e.g. `'readiness'`, `'caterer'`) but isn't grouped into a named workstream concept (Budget/Vendors/Guests as workstreams) |
| Current Milestone / Next Milestone | `_eventFoundationActions` dominoes | none, already ladder-shaped |
| Blocked Decisions | `deriveDecisionBlockers()` (assembleRevealEngines.js) | exists but not composed INTO `eventPlan`'s output today — separate call site |
| Recommendation Lifecycle | `taskSatisfied`/`effectiveDone` (partial, tasks-only) | needs the extension named in §3 |
| Deep-Link Target | `primaryRoute` | none |
| Reasoning | `consequence` | none |
| Confidence | — | **missing** at the `eventPlan` level (confidence exists in Reveal/estimator, not in the ongoing next-action ladder) |

This is a materially smaller build than "design a new orchestrator" — it's three composition additions (ctx as read context, vendor-readiness rollup, decision-blockers composed in) plus two new fields (workstream label, confidence) on an object that already has the other seven.

---

## 6. Exact First Implementation Task (pending approval — not started)

**Task**: Add `vendorReadinessSummary(vendors)` as a new read-only input to `eventPlan()`, and change `EventVendorsTab`'s top-line "Needs attention" count to read from `getEventAttention(event)`/`eventPlan(event)` instead of its own independent bucketing — with the per-vendor detail cockpit (readiness banner, deliverables, contract, day-of sections) left completely untouched.

This is deliberately the smallest slice of recommendation #1 (§3): it fixes the one confirmed live contradiction risk (Vendors vs. HostHome disagreeing on priority) without touching pricing, procurement, ctx wiring, or the recommendation-lifecycle consolidation — each of which should land as its own reviewed pass per the doctrine's "prefer composition, verify live" discipline.

**Not started.** Awaiting approval per this sprint's explicit instruction: "Do not implement until the recommendation is approved."
