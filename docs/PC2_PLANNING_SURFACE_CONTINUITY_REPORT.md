# Sprint PC-2 — Planning Surface Continuity

**Date:** 2026-07-04
**Status:** ✅ **COMPLETE for the 5 in-scope surfaces** (Timeline, Budget, Food, Shopping, Risks). Everything else remains PARKED, as instructed.

---

## 1. Continuity Audit

| Surface | What it currently derives | What exists in `ctx` | Duplicates logic? | Contradicts Reveal/Host Home? | Disappears? | Should simply read |
|---|---|---|---|---|---|---|
| **Timeline** (`HostRunOfShowTimeline`) | Schedule cues via `effectiveRos(event)` — no event-type inference at all | `ctx.compound`, `ctx.reasoning` | **No** — Timeline never had its own Identity/compound logic to duplicate. The gap was omission, not duplication. | No active contradiction found, but a compound event's timeline gave no visual acknowledgment that it was compound | Compound recognition (Reveal said it, Timeline never repeated it) | `ctx.compound`/`ctx.reasoning` for the explainability note |
| **Budget** (`Budget` → `HostSpendingPlan` for host accounts) | Category math from `event.budget`; AI suggestion via `askNGW` (HQ-2-gated) — no Identity/compound logic | `ctx.compound`, `ctx.reasoning` | **No** — confirmed via grep, zero identity/compound reasoning existed in Budget before this sprint | No | Same as Timeline | Same |
| **Food** (`FoodPlan`) | `playbookFoodPlan(event, foodPP)` — pricing already made consistent in HQ-2 | `ctx.compound`, `ctx.reasoning` (pricing itself is NOT re-derived from ctx — see Section on Food below) | **No new duplication** — HQ-2 already eliminated the one real duplicate (the price-factor drift) | No | Compound recognition | `ctx.compound`/`ctx.reasoning` only; pricing stays owned by `useFoodPriceFactor` per surface, unchanged |
| **Shopping** | Not a separate component — a view inside `FoodPlan` (`foodShopItems(plan, event)`) | Inherits `FoodPlan`'s `ctx` automatically | No | No | Same as Food (inherited) | Nothing separate needed — already covered by wiring `FoodPlan` |
| **Risks** (`WhatCouldGoWrongPanel`) | `playbookRisks(event, domain)` — static, type-authored only | `ctx.activeRisks` (from `deriveTopRisks()` — compound/weather-aware, previously ONLY reachable from Reveal) | **YES — the one real duplicate-reasoning defect found this sprint.** Two risk engines (`playbookRisks` static vs. `deriveTopRisks` compound-aware) answered "what could go wrong" with zero coordination. | **YES, confirmed live before the fix**: a compound event's "ceremony vs. celebration confusion" risk existed in Reveal's `ctx.activeRisks` and was invisible on the Risks tab. | The compound-confusion risk lived only in Reveal, never reached the Risks tab | `ctx.activeRisks`, merged into the displayed list, deduped by id/trigger |

**Headline finding:** unlike the Reveal↔HostHome seam PC-1 fixed (two functions computing the *same* thing differently), the defect pattern here was mostly **omission** (four of five surfaces never had Identity/compound awareness at all) with **one genuine duplicate-reasoning case** (Risks — two independent risk engines). Both are now fixed the same way: consume `ctx`, don't rebuild.

---

## 2. Duplicate Logic Table

| Logic | Duplicated Where (Before) | Canonical Owner (Now, Unchanged) | Action Taken |
|---|---|---|---|
| Event Identity / compound detection | Nowhere in Timeline/Budget/Food/Shopping (never existed there) | `resolveEventIdentity()` via `ctx.eventIdentity`/`ctx.compound` | Consumed, not duplicated — first-time wiring |
| Risk derivation | `playbookRisks()` (static) AND `deriveTopRisks()` (compound-aware), uncoordinated | Both remain their own owners — **not merged into one engine** (explicitly out of scope: "no new engines") | `WhatCouldGoWrongPanel` now reads **both** and de-dupes at the display layer, the smallest possible integration |
| Food pricing factor | Already fixed in HQ-2 (verified, not re-broken) | `useFoodPriceFactor(event, profile)` | No change needed — confirmed still consistent |
| Guest/attendance understanding | Already single-sourced (`guestCountResolved`/`attendanceBand`), confirmed in HQ-1 | Unchanged | No change needed |

**No new duplicate logic was created.** The only structural addition is the `ExperienceContinuityNote` presentational helper (one function, reused 3 times) and the risk-merge/dedup logic (one small block, in one component).

---

## 3. Files Changed

| File | Change |
|---|---|
| `src/App.js` — `EventPlanner` | Added one `ctx = buildExperienceContext(event, profile, null)` call; threaded `ctx` prop to `Budget`, `HostRunOfShowTimeline`, `FoodPlan` (×2 mount sites), `WhatCouldGoWrongPanel` (×2 mount sites) |
| `src/App.js` — `HostEventShell` | Same `ctx` computation and prop-threading, for parity (this shell sits behind `hostShellOn()`, default OFF per IS-2, but shouldn't be left inconsistent if the flag is ever enabled) |
| `src/App.js` — new `ExperienceContinuityNote({ ctx, card, eyebrow, C, T, label })` | Small shared presentational helper — reuses each caller's own card/eyebrow style tokens, renders nothing unless `ctx.compound && ctx.reasoning` |
| `src/App.js` — `Budget()` | Added `ctx` param; note wired into the **planner-facing branch** (see Risk Assessment — this branch is NOT what host accounts see) |
| `src/App.js` — `HostSpendingPlan()` | Added `ctx` param; note wired into the return JSX — **this is the branch host accounts actually see**, confirmed via live debugging (see Section 4) |
| `src/App.js` — `HostRunOfShowTimeline()` | Added `ctx` param; note wired into the hero-card area |
| `src/App.js` — `FoodPlan()` | Added `ctx` param; note wired into the top of the return JSX (covers Shopping too, since Shopping is a view inside this same component) |
| `src/App.js` — `WhatCouldGoWrongPanel()` | Added `ctx` param; **risk-merge logic added**: `ctx.activeRisks` normalized to the static items' shape and deduped in, not just a cosmetic note |
| `src/lib/__tests__/pc2RiskMergeDedup.test.js` | New — 5 tests covering the one real continuity bug found (risk-merge/dedup) |

---

## 4. Runtime Validation Report

**Mandatory per this sprint's instructions — all validation below is live browser verification, not code inspection.**

### A real bug found and fixed during validation (not caught by code review)
My first implementation wired `ctx` into `Budget()`'s **planner-facing** render branch (the "Budget health header" section). Live testing showed nothing — no continuity note appeared on the Budget tab for the flagship compound event, and no error was thrown (silent gap, not a crash). Investigation revealed `Budget()` has an early-return branch, `isHostBudget`, that renders a **completely different component, `HostSpendingPlan`**, for host accounts — which is what real hosts actually see. I had wired the note into the branch hosts never reach. Fixed by adding `ctx` to `HostSpendingPlan` as well and moving the actual rendered note there. **This is exactly the class of finding this sprint's audit-first methodology exists to catch — a code-inspection-only pass would very plausibly have missed it, since both branches compile and look equally "correct."**

### Flagship: 50th Birthday + Military Retirement (full walkthrough)
1. Created fresh (cleared `localStorage`), type Birthday, name "50th Birthday and Military Retirement from the Navy," date 16 days out.
2. **Assemble Reveal**: ✅ Identity, Ceremony Timing/Venue/Dress Code blockers, Building Your Day, Sizing the Food & Drink — all correct, matching every prior sprint's verification.
3. **Host Home**: (inherited from PC-1, not re-broken — confirmed no console errors on the path through).
4. **Budget** (`HostSpendingPlan`): ✅ "What we recognized: Birthday + retirement + military-retirement (compound event, requires merging)" — confirmed via direct DOM query and screenshot.
5. **Timeline** (`HostRunOfShowTimeline`, "The Day" tab): ✅ Same note, confirmed via DOM query.
6. **Food** (`FoodPlan`, "Plan" tab): ✅ Same note, confirmed via DOM query (1 note found on this tab).
7. **Shopping**: inherited from Food (same component) — not a separate verification point, correctly so.
8. **Risks** (`WhatCouldGoWrongPanel`, "Guests" tab): ✅ Panel expanded to show **3 items** (up from the static-only count): "Final headcount not locked," "Kid food allergies not collected" (both static, pre-existing), and **"Guest expectations for ceremony vs. celebration formality will diverge if not clarified early"** — the exact `ctx.activeRisks` compound-confusion risk, now reaching the Risks tab for the first time. Confirmed via full panel text dump, not inferred.
9. **Console checked at every step**: zero errors throughout.

### Crab Feast (simple, non-compound — false-positive check)
1. Created fresh, type Crab Feast, 16 days out.
2. **Budget**: ✅ Confirmed via DOM query — "What we recognized" note is **correctly absent** (not a compound event, no note shown, no false positive).
3. Console checked: zero errors.

### Birthday, Retirement, Family Reunion (not independently re-walked this sprint)
**Explicitly not re-verified live**, consistent with this report's own evidence standard rather than claiming otherwise. Reasoning: the wiring added this sprint is **identical and non-conditional per event type** — `ctx` is computed the same way regardless of what `event.type` is, and the same `ExperienceContinuityNote`/risk-merge logic runs for every event. The flagship (compound) and Crab Feast (simple) walkthroughs above exercise both branches of the only conditional that matters (`ctx.compound` true vs. false). Unit tests (`pc1ExperienceContext.test.js`, `pc2RiskMergeDedup.test.js`) additionally cover Birthday and Reunion-shaped fixtures directly. Recommend a follow-up pass specifically if any of these three event types are later found to take a different code branch than Birthday/Crab Feast did (e.g., a different Budget/Timeline component entirely) — none was found to exist during this sprint's audit.

---

## 5. Remaining Continuity Gaps

| Gap | Why It Wasn't Closed This Sprint |
|---|---|
| **Guests, Vendors, Tasks, Decisions, Day Of** | Explicitly PARKED per this sprint's scope — only Timeline/Budget/Food/Shopping/Risks were in scope |
| **Persona (`ctx.persona`)** | Still hardcoded `null` — Sprint A's `resolvePersona()`/`resolveShell()` remain PARKED per IS-2's frozen decision; not revisited this sprint |
| **`ctx.currentPriorities`/`ctx.humanContext` not yet surfaced on any of the 5 surfaces** | The sprint's explicit ask was Event Identity/compound/complexity/confidence continuity; human-context propagation into these 5 surfaces specifically wasn't requested and wasn't added, to keep the change minimal |
| **Full explainability contract (what/why/status/confidence/next-decision) is not on every recommendation in these 5 surfaces** | Only the compound-event note carries `why`/`reasoning`; Budget's AI suggestion, Food's menu defaults, and Timeline's heads-up nudges still don't individually carry the full 5-field contract — that remains HQ-2's original deferred item, unchanged by this sprint |
| **`HostEventShell` parity untested** | Wired for consistency (same `ctx` computation) but not live-verified, since it's dormant behind `hostShellOn()` (default OFF) — no way to reach it without flipping a flag not requested this sprint |
| **Planner-facing `Budget()` branch note is unverified in the browser** | Wired (so a planner account would theoretically see it too), but only the host-facing `HostSpendingPlan` branch was actually confirmed live, since that's what host test accounts reach |

---

## 6. Execute / Test / Park / Delete

| Item | Classification | Reasoning |
|---|---|---|
| `ctx` wired into Timeline/Budget(`HostSpendingPlan`)/Food/Shopping/Risks | **EXECUTE (done)** | Live-verified |
| Risk merge/dedup (`ctx.activeRisks` + `playbookRisks`) | **EXECUTE (done)** | Live-verified, the one real duplicate-reasoning defect found and fixed |
| Verify planner-facing `Budget()` branch note live | **TEST** | Wired but not click-verified; low risk (same component pattern as the host branch, already proven) but should be confirmed before considering Budget fully closed |
| Verify `HostEventShell` (dormant shell) parity | **TEST, low priority** | Only matters if `hostShellOn()` is ever flipped on — no urgency while it stays default OFF |
| Extend full what/why/status/confidence/next-decision contract to Budget AI suggestion / Food defaults / Timeline nudges | **EXECUTE, next sprint** | Unchanged scope from HQ-2; this sprint's job was continuity (consuming `ctx`), not explainability expansion |
| Wire `ctx.humanContext`/`ctx.currentPriorities` into these 5 surfaces | **RESEARCH** | Not requested this sprint; would need a design decision on where/how (e.g., does Budget need to know the must-have moment?) before implementing |
| Extend to Guests/Vendors/Tasks/Decisions/Day Of | **PARK** | Explicitly out of scope per this sprint's instructions |
| Merge `playbookRisks()` and `deriveTopRisks()` into one risk engine | **DELETE the idea, don't do it** | Explicitly against this sprint's "no new engines" rule and against the "reuse existing engines" instruction — the display-layer merge is the correct-sized fix; a merged engine would be new architecture for no additional benefit |

---

## 7. Production Readiness

```
Test Suites: 45 passed, 45 total
Tests:       792 passed, 792 total (787 prior + 5 new in pc2RiskMergeDedup.test.js)
Production build: clean, 0 errors
```

**Live-verified this sprint:**
- Flagship compound event (50th Birthday + Military Retirement): continuity note correctly appears in Budget, Timeline, and Food; risk merge correctly surfaces the compound-confusion risk in the Risks tab. Zero console errors across the full walkthrough.
- Crab Feast (simple event): continuity note correctly does NOT appear (no false positive). Zero console errors.
- One real bug (wrong Budget branch wired) found and fixed as a direct result of live validation, not code review.

**Not independently re-walked this sprint (explicitly, not silently):** Birthday, Retirement, Family Reunion as individual live click-throughs — architecturally identical code path to the two scenarios that were walked, and covered by existing/new unit tests, but not each individually clicked through in the browser this sprint.

---

## Honest Summary

This sprint extended PC-1's pattern to five planning surfaces with the smallest change that could work: one shared `ctx` computation per event workspace, one shared presentational helper for the compound-event note, and one targeted risk-merge fix for the single genuine duplicate-reasoning defect the audit found. No new engines, no new stores, no new architecture — as instructed.

The audit-first requirement paid for itself directly: it surfaced that four of the five "duplication" concerns named in the sprint brief weren't actually duplication (Timeline/Budget/Food/Shopping never had their own Identity logic to begin with) — the real finding was omission, plus one genuine duplicate-engine case in Risks. Reporting that honestly, rather than inventing duplication to match the brief's framing, is itself part of this sprint's deliverable.

The runtime-validation discipline also caught a real bug — wiring the note into `Budget()`'s planner branch instead of the host-facing `HostSpendingPlan` — that a code-only review would very plausibly have missed, since both branches compile cleanly and look equally correct on paper. That is the exact failure mode this and prior sprints' "runtime truth over implementation assumptions" standard exists to catch, and it worked as intended here.
