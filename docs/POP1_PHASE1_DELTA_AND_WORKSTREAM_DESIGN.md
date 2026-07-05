# POP-1 / WOW-1 — Phase 1 Delta & Read-Only Workstream Design

Mode: Audit First · No Duplicate Work · Read-Only Before Behavior Change
This is a **delta** on `POP1_PHASE1_FOUNDATION_AUDIT.md` (commit `8d76a2f`) — that report already answered Steps 1-3 for the codebase as it stood then. Git is clean, no commits from any other source since; the only change is the one fix this session already shipped. Re-running the full grep sweep against unchanged code would duplicate work the doctrine explicitly forbids. This document covers what's actually new and gives Step 4's design against the right target: the WOW-1 Workstream model, which arrived after the prior audit and changes what "first implementation pass" should mean.

---

## 1. Overlap Report (delta only)

| Since `8d76a2f` | What happened |
|---|---|
| `vendorIssues` status-vocabulary mismatch (Phase 1's exact first task) | **Shipped** — commit `0f33863`. `getEventAttention()` now uses the same "Booked" status set (`Confirmed`/`Booked`/`Deposit Paid`/`Contracted`) as the host-facing Vendors tab's `hostStatusWord()`. Live-verified on the flagship event: fixed formula now agrees with the Vendors tab's own count (8 = 8) where it previously disagreed (9 vs. 8). 806/806 tests pass. |
| Everything else in the `8d76a2f` overlap table | **Unchanged** — no commits touched `eventPlan`, `ExperienceContext`, `EventVendorsTab`/`VendorPlanningWorkspace`, `taskEngine.js`, or the orphaned explainability engines since that audit. Re-verified via `git log --oneline -8` and `git diff --stat` (clean). |
| **New input**: WOW-1 doctrine (Workstream model, dependency graph, 7-state lifecycle) | Arrived as a standing doctrine after `8d76a2f`, saved to memory (`project_pop1_wow1_doctrine`). Not yet reconciled against the codebase — this is the actual new work Step 1-3 need to account for. |

**Conclusion**: nothing to re-audit in the code. The open question is architectural: does WOW-1's Workstream model change what the *next* Phase 1 task should be, given the "don't do X first if X gets revisited once Y exists" rule this very prompt states.

---

## 2. Foundation Gate Scorecard (delta)

Only the item touched by the shipped fix changes; all others are unchanged from `8d76a2f`:

| Gate item | `8d76a2f` score | Now | Why |
|---|---|---|---|
| Cross-surface consistency | ◐ | ◐ (narrower gap) | The one *confirmed* contradiction (vendor status vocabulary between `getEventAttention` and the Vendors tab) is fixed. The larger gap — Vendors' own bucketing computed independently of `eventPlan` rather than reading from it — is unchanged; the fix corrected the *data* both sides use, not the *architecture* (two independent computations still exist, they just now agree on this one input). |

Every other row (Single Current Priority ◐, Recommendation Lifecycle ◐, Workstream orchestration ◐, Procurement intelligence ✗, Vendor orchestration ✗, Dependency graph ✗, etc.) is **unchanged** — see `POP1_PHASE1_FOUNDATION_AUDIT.md` §2 for full detail, still current.

**New gate items from WOW-1** (not in the original 9-item gate, now added per the expanded doctrine):
- "Vendor relationships become Workstream relationships" — ✗, not started, this is the doctrine's core re-model
- Full 7-state recommendation lifecycle (Discovered→Recommended→Accepted→Working→Blocked→Completed→Archived) — ✗ beyond the narrow `riskStatus` 3-state pattern already confirmed
- Workstream dependency graph (Venue→Layout→Decor→Lighting→Photography→Reception, etc.) — ✗, confirmed nothing beyond the retirement playbook's single-domain `dependsOn` chains exists

---

## 3. Recommended Implementation Order (revised for WOW-1)

The prior report's step 1 ("consolidate Vendors' bucketing into `eventPlan`") is now the case this prompt's own Step 3 warns against: **Vendors would be revisited again** once a Workstream layer exists, because under WOW-1, Vendors stop being the top-level object entirely — they become line items inside a Workstream (Photography, Venue, etc.). Consolidating Vendors-as-such into `eventPlan` now, then re-consolidating again once Workstreams exist, is exactly the double-work this prompt says to avoid.

**Revised order:**

1. **(Done)** Ship the narrow, low-risk data-consistency fix (`0f33863`) — this was safe under either model since it only fixed a status-vocabulary mismatch, not an architectural boundary. Correctly sequenced first.
2. **(This document, Step 4 below)** Produce a **read-only Workstream design** — the data shape a Workstream would need to compose Vendors/Decisions/Risks/Timeline/Procurement, without writing any code. This is what Step 4 of this prompt asks for, and it's the right next step precisely because it lets us check, before touching code again, whether the *next* real consolidation pass (Vendors → `eventPlan`, or ctx → `eventPlan`) should target today's `EventVendorsTab`/`getEventAttention` shape or the future Workstream shape.
3. **Only after the design is reviewed**: pick the next code task — either (a) continue the original Phase 1 order if the Workstream design turns out to be additive/non-breaking to today's functions, or (b) restructure around Workstream first if it isn't.

This is a genuine "don't implement until reconciled" checkpoint, not a stall — the doctrine's own decision hierarchy (extend existing models before introducing new ones) requires knowing what the target model looks like before deciding whether today's `eventPlan`/`EventVendorsTab` extension work would survive it.

---

## 4. Risk Analysis (delta)

- **Risk of proceeding straight to Vendor/eventPlan consolidation without the Workstream design**: would very likely require rework once Workstreams exist — e.g. `getEventAttention`'s `vendorIssues` field would need to become `workstreamIssues` grouped by workstream, not a flat vendor count. Avoided by sequencing the design first.
- **Risk of the Workstream design itself**: it's tempting to scope it as a full rewrite. Per doctrine ("must NOT replace Experience Context / Human Intelligence / Event Identity / existing planning engines... should compose them"), the design below is deliberately a thin composition/grouping layer over what already exists (vendors, `dependsOn` chains, `eventPlan`, `ctx`) — not a new data store or a new engine.
- **Risk of scope creep into full implementation**: this prompt explicitly says "Everything should be read-only during Phase 1. No behavior changes yet" and "Do not implement until the recommendation is approved." No code is touched in this document.

---

## 5. Read-Only Workstream Design (composition layer, per Step 4)

A Workstream is **not a new stored entity** — it's a computed grouping over data that already exists, the same "derive, don't store" pattern already proven by `taskEngine.js` and `eventPlan`.

```
workstreamsFor(event, ctx)                         // NEW pure function, read-only
  groups (unchanged inputs, just re-keyed):
    event.vendors                                   // existing vendor records — grouped by
                                                      // workstream via a category→workstream
                                                      // map (e.g. 'Photography'/'Photo Booth'
                                                      // → Photography; 'Mobile Bar' → Bar)
    event.timeline items tagged to that category     // existing timeline/ROS cues
    deriveDecisionBlockers(event) filtered by category
    ctx?.activeRisks filtered by category
    vendorReadinessSummary (per-vendor cockpit state, already computed)
  → Workstream[] :
    {
      key,                      // 'photography' | 'venue' | 'recognition_ceremony' | ...
      label,                    // 'Photography'
      decisions: [...],         // from deriveDecisionBlockers, category-filtered
      deliverables: [...],      // vendor + timeline items in this category
      dependencies: [],         // NEW — see below, mostly empty until Phase 2
      risks: [...],             // from ctx.activeRisks, category-filtered
      vendors: [...],           // the existing vendor records, unchanged shape
      completionState,          // derived, same predicate-not-store pattern as taskEngine.js
    }

eventPlan(event, ctx?, workstreams?)                 // additive 3rd arg, optional
  — unchanged internals — but a workstream-aware tier
    MAY reference workstreams[i].completionState
    instead of (or alongside) the single hardcoded
    caterer-drift check it has today
```

**Dependency graph — read-only design, not yet wired to any UI:**

The three example chains in this sprint's doctrine (Venue→Layout→Decor→Lighting→Photography→Reception; Guest Count→Food Quantities→Budget→Shopping→Procurement; Recognition Ceremony→Portrait Session→...→Album Delivery) are **authored knowledge, not derived from event data** — no existing engine can infer "photography depends on decor" from an event object. This must be a new, small, static data table (a graph of workstream-key → prerequisite workstream-keys), analogous to how `retirementParty.js` already authors its internal `dependsOn` chains, just promoted to cross-workstream scope instead of single-playbook scope. This is the one piece of the design that is a **genuine new (small) capability**, not a composition of something that already exists — flagged honestly rather than glossed over.

**Explicit non-replacement guarantees** (per this prompt's Step 4 guardrail):
- Does NOT replace `ExperienceContext` — `workstreamsFor` takes `ctx` as an input and filters its existing `activeRisks`/`decisionBlockers`, never recomputes them.
- Does NOT replace Human Intelligence — nothing here touches `ctx.humanContext`/`relationshipContext`; a Workstream's "why it matters" would read from ctx, not invent its own.
- Does NOT replace Event Identity — workstream labels come from a static category map, not a new classifier.
- Does NOT replace `eventPlan`/existing planning engines — `workstreams` is proposed as an *additional optional input*, same pattern as the `vendorReadinessSummary` addition already designed in the prior audit.

**Requested output fields, mapped**:

| Requested (this prompt) | Source |
|---|---|
| Current Priority | `eventPlan().nextActions[0].title` — unchanged |
| Current Workstream | **NEW** — `workstreamsFor()[i].key` for whichever workstream the current priority's category belongs to |
| Current Milestone / Next Milestone | `_eventFoundationActions` dominoes — unchanged |
| Blocked Decisions | `workstreamsFor()[i].decisions` (already-existing `deriveDecisionBlockers`, now grouped) |
| Recommendation Lifecycle | Still only the `riskStatus` 3-state pattern (Phase 1 finding, unchanged) — extending it to the full 7-state chain is separate work, not part of this design |
| Deep-Link Target | `primaryRoute` — unchanged, would gain a `workstreamKey` field for workstream-level routing |
| Reasoning | `consequence` — unchanged |
| Confidence | Still missing at the `eventPlan` level (Phase 1 finding, unchanged) |

---

## 6. Exact Next Implementation Task (pending approval — not started)

**Task**: Add `workstreamsFor(event, ctx)` as a new, standalone, read-only function (no call sites wired yet) that groups existing vendor/timeline/decision/risk data by a static category→workstream map. Do not change `eventPlan`, `EventVendorsTab`, or any rendered UI in this pass — ship it as an inert, tested pure function first (unit tests against the flagship event's 9 vendor categories), so its output shape can be reviewed before anything consumes it.

This mirrors how `ExperienceContext` itself was introduced in [[pc1_continuity_fix]] — build the composition function first, verify its output live/in tests, wire it into one surface second, expand later. Avoids the exact rework risk named in §3.

**Not started.** Awaiting approval, per this sprint's explicit instruction.
