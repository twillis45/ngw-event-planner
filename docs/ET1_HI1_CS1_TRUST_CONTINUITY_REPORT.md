# ET-1 / HI-1 / CS-1 — Explainable Trust, Human Intelligence Continuity, Continuity Stress Test

**Date:** 2026-07-04
**Type:** Audit + live stress test. No new AI, no new engines, no new recommendation systems, no redesign, no second explainability/human-intelligence model. `ExperienceContext` (PC-1/PC-2) is reused throughout, never duplicated.
**Evidence key:** 🟢 Runtime Verified (this sprint) · 🟡 Runtime Verified (prior sprint, re-cited) · ⚪ Code Inspection · ❓ Assumption (marked explicitly)

---

## PART A — Explainability Audit (ET-1)

### Recommendation Quality Matrix

Ranked **Excellent / Good / Weak / Blind / Invisible** against the target contract (What / Why / Status / Confidence / Assumptions / Next Decision). This consolidates and re-verifies HQ-1's original field-completeness table (🟡) against what PC-1/PC-2 actually shipped (🟢).

| Surface | What | Why | Status | Confidence | Assumptions | Next Decision | Rank |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Assemble Reveal — Identity** | ✅ | ✅ | ✅ | ✅ | ✅ (`missingClarifyingQuestions`) | ✅ | **Excellent** |
| **Assemble Reveal — Blockers** | ✅ | ✅ | ✅ ("Required") | ✅ | — | ✅ | **Excellent** |
| **Assemble Reveal — Domains** (Timeline/Food/etc. cards) | ✅ | ✅ | ✅ ("Assembled") | ✅ | — | ❌ always null | **Good** |
| **Risks (`WhatCouldGoWrongPanel`)** | ✅ | ✅ | ✅ (loop: Ack/Dismiss/Mitigate, HQ-2) | ✅ ("We think so") | — | ⚠️ mitigation text, not a decision prompt | **Good** |
| **Decisions (menu-type)** | ✅ | ✅ (`because` strings) | ✅ | ⚠️ status tier substitutes | — | ✅ (inline options) | **Good** |
| **Budget/Timeline/Food compound note** (PC-2) | ✅ | ✅ (`ctx.reasoning`) | — | — | — | — | **Weak** — carries only what/why, not the full contract; a continuity win, not an explainability win |
| **Vendor COI next-action** | ✅ | ✅ (real consequence line) | — | ❌ | — | ✅ (single CTA) | **Weak** |
| **Guests — attendance band** | ✅ | ✅ (`because` string) | — | ❌ | — | ⚠️ generic | **Weak** |
| **Decisions (non-menu)** | ✅ | ⚠️ | ⚠️ | ⚠️ | — | ❌ generic `{tab:'Planning'}` fallback | **Weak** |
| **Budget AI suggestion** | ✅ | ❌ | ✅ (HQ-2 Review/Accept/Dismiss gate) | ❌ | ❌ | ❌ | **Blind** — trust-gated (safe) but not explained |
| **Tasks (`taskSatisfied` inference)** | ✅ | ❌ | ❌ (looks identical to explicit checkoff) | ❌ | ❌ | ❌ | **Blind** |
| **Static Risk rows (pre-merge content itself)** | ✅ | ✅ (labeled "The fix:") | — | ⚠️ type-level only, not per-event | — | ⚠️ informational only | **Weak** |
| **Vendor category suggestions** | ✅ | ❓ not confirmed present | — | — | — | — | **Invisible-to-Weak** (unresolved since HQ-1) |
| **Day Of safety checklist** | ✅ | ✅ (`detail` field) | — | ❌ | — | ❌ check-off only | **Weak** |

**Net movement since HQ-1/HQ-2:** Risk moved from Weak→Good (HQ-2's loop + PC-2's merge). Budget/Timeline/Food gained a Weak-tier addition (the compound note) where they previously had **Invisible** — zero explainability of any kind. Nothing regressed.

---

## PART B — Human Intelligence Audit (HI-1)

### Human Intelligence Matrix — Where Introduced / Strengthened / Forgotten / Contradicted / Invisible

| HI Element | Introduced | Strengthened | Forgotten | Contradicted | Where It's Invisible Today |
|---|---|---|---|---|---|
| Why this event matters | Legacy `eventIdentity()` reader, at intake if captured | Never re-strengthened downstream | Nowhere it exists is it forgotten — but it never *reaches* Timeline/Budget/Food/Risks/Vendors/Tasks/Decisions/Day Of | No | All 5 PC-2 surfaces + Guests/Vendors/Tasks/Decisions/Day Of |
| Who matters most (honoree) | Intake (`honoree` field), Editorial Cover eyebrow | No | No | No | Timeline, Budget, Food, Shopping, Risks, Vendors, Tasks, Decisions, Day Of |
| Relationship context (participants) | Reveal's `eventIdentity.participants` → now `ctx.relationshipContext` | 🟢 Available platform-wide since PC-1 (data layer only) | Not forgotten, but not *rendered* anywhere new | No | Never rendered on any of the 13 surfaces despite being computed everywhere `ctx` runs |
| Celebration intent (`celebrationType`: ceremonial/casual/formal/mixed) | `resolveEventIdentity()` output, part of `ctx.eventIdentity` | No | Computed, never surfaced | No | Every surface |
| Traditions | Playbook-authored content only (e.g., Juneteenth Cookout, Ethiopian Coffee Ceremony playbooks) | No | Never enters `ctx` at all | No | Not applicable to `ctx` — lives entirely in playbook data, correctly separate |
| Special moments (must-have moment) | Legacy reader, Host Home's own "heart" card | No | No — persists correctly on Host Home | No | Timeline, Budget, Food, Shopping, Risks (the 5 PC-2 surfaces never read it) |
| Family dynamics | ❓ Not supported by any existing engine | — | — | — | Not capturable from current intake fields at all |
| Guest sensitivities (dietary, accessibility) | `event.guests[].needs`, dietary decision in Decisions panel | 🟡 Real cascade into Food (HQ-1 confirmed) | No | No | Not part of `ctx` — lives in raw event fields, correctly read directly by Food/Guests |
| Memory opportunities | Legacy reader's `success` bullets | No | No | No | Everywhere except where the legacy reader is directly called (Host Home) |
| Stress factors | ❓ No dedicated field; closest proxies are `ctx.decisionBlockers`/`ctx.activeRisks` | — | — | — | Not a distinct concept anywhere in the platform today |
| Decision rationale (`because` strings) | Decisions panel's own engine (`playbookDecisionBoard`) | No | Never reaches Timeline/Budget/Risks even when the decision affects them | No | Everywhere outside the Decisions panel itself |
| Host priorities (must-have moment) | Legacy reader → `ctx.currentPriorities` (PC-1) | 🟢 Available platform-wide since PC-1 (data layer only) | Not forgotten, not rendered anywhere new | No | Every surface except Host Home's pre-existing card |

### Proposed Canonical Structure — `experienceContext.human`

Per the instruction to **only include fields already supported by existing intelligence**, here is the honest mapping. Fields marked ✅ can be populated today, from data that already exists, with no new capture. Fields marked ❌ would require inventing new Human Intelligence and are excluded, per the sprint's explicit instruction not to create any.

```js
experienceContext.human = {
  whyThisMatters:      ctx.humanContext?.reallyIs ?? null,        // ✅ from legacy eventIdentity() reader
  whoMattersMost:       ctx.humanContext?.forWhom ?? null,          // ✅ { name, story } — same reader
  relationshipContext:  ctx.relationshipContext,                    // ✅ already exists (PC-1), from eventIdentity.participants
  celebrationIntent:    ctx.eventIdentity?.celebrationType ?? null, // ✅ already computed by resolveEventIdentity(), never surfaced
  hostPriorities:       ctx.currentPriorities,                      // ✅ already exists (PC-1)
  emotionalGoals:       ctx.humanContext?.feeling ?? null,          // ✅ from legacy reader's feeling_words
  memoryGoals:          ctx.humanContext?.success ?? [],            // ✅ from legacy reader's successBullets

  // NOT INCLUDED — no existing intelligence supports these without new capture:
  // traditions:      would require promoting playbook-local content into ctx — a real
  //                  design decision (flagged in HQ-3), not a data-availability question
  // specialMoments:  overlaps hostPriorities/mustHaveMoment; not a distinct field today
  // stressFactors:   no dedicated engine; only loose proxies (decisionBlockers/activeRisks)
  // decisionHistory: exists as a SEPARATE system (lib/decisionMemory.js, referenced in
  //                  App.js imports) but has never been wired into ExperienceContext —
  //                  this is a real, nameable integration gap, not missing data
};
```

**This is the smallest correct expansion of `ExperienceContext`** — every included field is a rename/passthrough of data `buildExperienceContext()` already computes or could compute from functions it already calls (`legacyMeaningReader`, `resolveEventIdentity`). No new intelligence, no new store, no second model.

---

## PART C — Continuity Stress Test (CS-1)

**All findings below are 🟢 Runtime Verified this sprint** — a real event was created, mutated to simulate mid-planning changes, and every claim was confirmed via direct DOM query, not inferred from code.

### Scenario 1: Birthday → Birthday + Military Retirement (mid-stream)
**Method:** Created a plain "My Birthday" event (no compound signal). Verified baseline: no continuity note anywhere (🟢 confirmed absent in Budget). Then mutated the persisted event's `name` field to add "and Military Retirement from the Navy" — simulating a host editing their event description after initially creating a simple event — and reloaded.

**Result:** ✅ **Correct, immediate, contradiction-free update.**
- Budget: "What we recognized: Birthday + retirement + military-retirement (compound event, requires merging)" — appeared correctly. 🟢
- Timeline: same note appeared. 🟢
- Risks (Guests tab): count went from (baseline) to **3 things the pros plan for**, confirmed to include "Guest expectations for ceremony vs. celebration formality will diverge if not clarified early" — the compound-aware risk. 🟢
- Host Home: same note appeared, consistent wording across all three surfaces. 🟢
- **No stale state, no duplicate reasoning, no contradiction between any of the four surfaces checked.**

**Why this worked cleanly:** `buildExperienceContext()` is a pure function recomputed fresh on every render from the current event object — there is no cache, memo, or stored snapshot to invalidate. This is a direct, positive consequence of PC-1/PC-2's architecture choice (explicitly noted in PC-1's design as "not persistence... safe to call any number of times").

### Scenario 2: Guest count 30 → 90 (mid-stream, same event)
**Method:** Mutated the same event's `guestCount`/`guestEstimate` from 20 (its actual starting value) to 90.

**Result:** ✅ **Correct cascade, continuity preserved.**
- Budget: total re-estimated ($375–$860 → $1,570–$3,935), Food & Drink line re-estimated ($340–$775 → $1,480–$3,685) — 🟢 confirmed via screenshot.
- The compound-event continuity note **remained present and unchanged** — correctly unaffected by a guest-count-only change (no incorrect "forgetting" of the compound status, no incorrect re-triggering of unrelated logic). 🟢
- Host Home: "90 guests," "food's sized for 77–95" — consistent with Budget's own numbers. 🟢
- **No contradiction between Budget's guest count and Host Home's guest count after the change.**

### Scenarios Not Run This Sprint (❓ explicitly not tested)
Venue backyard→venue, DIY→caterer, no-DJ→DJ, outdoor→indoor, formal→casual, venue-cancelled, budget-doubled/cut, rain-forecast, vendor-unavailable, late-RSVP-spike, accessibility-added, dietary-added, childcare-added, family-conflict. **These were not run.** Given the two scenarios that were run both passed cleanly and both exercise the same underlying mechanism (a pure, uncached context function reacting to a changed event field), there is reasonable basis to expect the others would behave similarly — but that is an expectation, not a verified fact, and is explicitly not claimed as tested.

### What CS-1 Proves and Does Not Prove
**Proves:** for the two dimensions tested (compound-signal change, guest-count change), the platform does not contradict itself, does not forget prior understanding, and does not produce duplicate reasoning across Host Home, Budget, Timeline, and Risks.
**Does not prove:** behavior under the ~14 other named scenarios, behavior for Retirement/Family Reunion/Wedding-type events specifically, or behavior for changes that might affect `ctx.decisionBlockers`' venue/dress-code logic (venue-cancelled, formal→casual) — these touch different code paths than the two tested and should not be assumed safe without their own live pass.

---

## Trust Scorecard

*(Not averaged into one number, per this sprint's own standard and HQ-3's precedent — dimensions are independent.)*

| Dimension | Score | Basis |
|---|---|---|
| Explainability coverage | Uneven — Excellent on Reveal, Good on Risk/Decisions, Weak-to-Blind on 7 of 13 surfaces | ET-1 matrix above |
| Human Intelligence propagation | Low — data centralized (PC-1), rendering still concentrated on 2 surfaces (Reveal, Host Home) | HI-1 matrix above |
| Continuity under change (tested dimensions only) | High | 🟢 CS-1 Scenarios 1–2, zero contradictions found |
| Continuity under change (untested dimensions) | Unknown | Explicitly not claimed |
| Cross-surface consistency (identity/compound) | High | 🟢 4-surface confirmation in CS-1 |
| Cross-surface consistency (guest count) | High | 🟢 confirmed, matches HQ-1's original single-source-of-truth finding |

---

## Cross-Surface Drift Report

No drift found in anything tested this sprint. Specifically checked and confirmed **not** drifting:
- Compound-event wording (byte-identical string across Budget/Timeline/Risks/Host Home, both before and after the guest-count change).
- Guest count (Budget's "Estimated for 90 guests" matches Host Home's "90 guests").

**Drift risks named in prior sprints, not re-tested here (carried forward, not re-verified):**
- `isDayOf` computed independently in Host Home and `RunOfShow` (HQ-1) — architecturally identical risk class to the food-pricing bug HQ-2 fixed; still unresolved.
- Two Event Identity readers (legacy vs. Sprint A) still coexist — PC-1 gave them one shared caller, but the underlying duality itself (HQ-3's #1 architectural finding) is unchanged.

---

## Top 20 Remaining Trust Gaps

1. Budget AI suggestion has no visible why/evidence/confidence (Blind, ET-1).
2. Task completion inference is indistinguishable from explicit confirmation (Blind, ET-1) — helper exists (`effectiveDoneDetail`, HQ-2) but UI unwired.
3. Human Intelligence (`whyThisMatters`, `whoMattersMost`, `relationshipContext`, etc.) computed everywhere, rendered almost nowhere.
4. `traditions` has no path into `ExperienceContext` at all.
5. `decisionHistory` (Decision Memory) exists as a separate system, never wired into `ctx`.
6. Non-menu Decisions still dead-end into a generic `{tab:'Planning'}` fallback.
7. Static Risk confidence is indistinguishable from live Risk confidence (both say "We think so"; weather risk deserves better).
8. Vendor category suggestions' "why" still unconfirmed present (open since HQ-1).
9. `isDayOf` duplicate computation — latent drift risk, unresolved since HQ-1.
10. Two Event Identity readers (legacy/Sprint A) still architecturally separate, not reconciled (only shared-caller-wrapped).
11. Three persona/routing mechanisms remain unreconciled (unchanged since IS-2/HQ-3).
12. Planner-facing `Budget()` branch's continuity note wired but never live-verified (PC-2 gap, still open).
13. `HostEventShell` (dormant shell) continuity wiring never live-verified.
14. Guests, Vendors, Tasks, Decisions, Day Of still don't consume `ctx` at all (PC-2 scope boundary, unchanged).
15. Compound note carries only what/why, never status/confidence/assumptions/next-decision on the 5 PC-2 surfaces.
16. CS-1's ~14 other evolution scenarios (venue change, vendor unavailable, budget cut, etc.) untested.
17. Retirement, Family Reunion, Wedding, Corporate Event scenarios not live-walked since HQ-3/PC-2 (only flagship + one simple type tested each round).
18. Professional/planner scale (10–30 clients) still entirely unverified (HQ-3's largest named risk, untouched by three consecutive continuity sprints).
19. Family dynamics and guest sensitivities beyond dietary/accessibility have no representation in Human Intelligence at all.
20. Stress factors have no dedicated concept — only loose proxies via `decisionBlockers`/`activeRisks`.

---

## Execute / Test / Park / Delete

| Item | Classification | Reasoning |
|---|---|---|
| Add `experienceContext.human` (the 7 supported fields above) | **EXECUTE** | Smallest correct expansion; every field is a rename/passthrough of data already computed |
| Wire `experienceContext.human` into at least one new surface (e.g., Timeline or Budget) | **EXECUTE, next sprint, one surface at a time, live-verified each** | Matches PC-2's own proven methodology |
| Wire `decisionHistory` (existing Decision Memory system) into `ctx` | **TEST first** | The data/engine already exists (`lib/decisionMemory.js`) — this is a wiring question, not a new-intelligence question, but needs its own audit of what Decision Memory actually contains before assuming it maps cleanly |
| Add confidence/status/next-decision (not just what/why) to the PC-2 compound note | **EXECUTE** | Cheap — `ctx` already carries `ctx.confidence`; just needs rendering |
| Distinguish static vs. live Risk confidence labeling | **EXECUTE** | Cheap, cosmetic, high trust value |
| Run the remaining ~14 CS-1 scenarios | **TEST** | Mandatory before claiming continuity broadly proven; two scenarios is a start, not a completion |
| Live-verify Retirement/Family Reunion/Wedding/Corporate Event | **TEST** | Named gap since HQ-3, still open |
| Test professional scale (10–30 clients) | **TEST, high priority** | Three sprints running without addressing HQ-3's largest named risk |
| `traditions` as a queryable `ctx` field | **PARK** | Requires a design decision (promote playbook-local data vs. keep separate) before implementation, not a quick wiring fix |
| `stressFactors` / `familyDynamics` as new Human Intelligence fields | **DELETE the idea for now** | No existing intelligence supports these — adding them would require new capture, explicitly against this sprint's guardrails |
| A unified Event Identity reader (merge legacy + Sprint A) | **PARK** | Named by HQ-3 as the single biggest architectural fix; still correctly deferred pending a real design decision, not a small patch |
| Persona/shell reconciliation | **PARK** | Unchanged since IS-2's frozen decision |

---

## Honest Summary

**Explainability (ET-1):** uneven, but not regressed — Reveal remains Excellent, Risk improved to Good via HQ-2/PC-2, and Budget/Timeline/Food gained a Weak-tier continuity note where they previously had nothing. The core gap — Budget's AI suggestion and Task inference remaining Blind — is unchanged and named again here rather than allowed to fade from view.

**Human Intelligence (HI-1):** the proposed `experienceContext.human` structure is real and buildable today from existing data — seven fields, zero new capture. Whether to render it anywhere new is the next decision, not a data problem.

**Continuity Stress Test (CS-1):** two realistic mid-planning mutations were run live, both passed cleanly across four surfaces with zero contradictions — a genuine trust signal about the architecture's stability under change. But two scenarios out of roughly sixteen named in the brief is a start, not a completion, and this report says so plainly rather than extrapolating confidence it hasn't earned.

**Where the platform is closest to "one experienced planner who has been present the whole time":** the compound-event thread, verified now across intake → Reveal → Home → Budget → Timeline → Risks, surviving a live guest-count change without losing its footing. **Where it is furthest:** everything the host actually told the platform about *why* the event matters to them, which the platform still only remembers in the one room it was first said in.
