# Sprint PC-1 — Platform Continuity

**Date:** 2026-07-04
**Status:** ⚠️ **CORE OBJECTIVE ACHIEVED, PROPAGATION PARTIAL** — the canonical Experience Context exists, is live-verified end-to-end, and closes HQ-3's #1 finding for the Reveal→Host Home seam specifically. Full propagation into Timeline/Budget/Guests/Food/Shopping/Vendors/Risks/Decisions/Day Of consuming the context directly is not yet done — scoped honestly below, per this sprint's own classification system (Execute/Test/Park/Delete).

---

# 1. Executive Summary

HQ-3 concluded the platform has enough intelligence; its problem is continuity. This sprint built the fix for the single most consequential continuity failure named in that audit: **Assemble Reveal computed real understanding and discarded it; Host Home re-derived identity using a different, older function with no compound/complexity concept.**

**What changed:** one new file, `lib/experienceContext.js`, exporting `buildExperienceContext(event, profile, foodPP)` — a pure composition function that calls the engines that already exist (`resolveEventIdentity`, the legacy meaning reader, `deriveDecisionBlockers`, `deriveTopRisks`, `buildAssembleRevealStages`) and assembles their outputs into one object. It is not a new engine — every field is a passthrough. `AssembleReveal` and `HostHome` now both call this same function. Live-verified: a compound event ("50th Birthday and Military Retirement from the Navy") shows its recognized compound status in Assemble Reveal, and — for the first time — **also shows it in Host Home, after the reveal modal has closed**, using the exact same words, because it's the exact same function call.

**What did not change this sprint (explicitly, not silently):** Timeline, Budget, Guests, Food, Shopping, Vendors, Risks, Decisions, and Day Of do not yet consume the Experience Context directly — they still read event fields and call their own engines as before. This sprint fixed the seam HQ-3 named as most consequential; it did not do a mechanical pass across all thirteen surfaces, because that is nine more scoped changes, each deserving its own live verification, not one afternoon's blast radius.

---

# 2. Continuity Architecture

## Before (per HQ-3, confirmed again at the start of this sprint — 🟡 Code Inspection)
```
AssembleReveal:
  evIdentity = resolveEventIdentity(...)     ← computed inline
  stages = buildAssembleRevealStages(...)    ← computed inline
  [modal closes — nothing written back to `ev`]

HostHome:
  id = eventIdentity(ev)                     ← DIFFERENT function, no compound concept
  [independently re-derives guest count, food plan, etc.]
```

## After (🟢 Runtime Verified this sprint)
```
lib/experienceContext.js
  buildExperienceContext(event, profile, foodPP)
      │
      ├─ eventIdentity      ← owner: resolveEventIdentity() [Sprint A / IS-1]
      ├─ humanContext       ← owner: legacy eventIdentity() meaning reader [unchanged]
      ├─ decisionBlockers   ← owner: deriveDecisionBlockers() [F4]
      ├─ activeRisks        ← owner: deriveTopRisks(), filtered by event.riskStatus [F4 / HQ-2]
      ├─ assembledState     ← owner: buildAssembleRevealStages() [F4 / IS-1 / HQ-2]
      ├─ compound/complexity/confidence/reasoning/assumptions ← derived from eventIdentity
      └─ persona            ← explicitly null (Sprint A's resolvePersona/resolveShell remain PARKED per IS-2)
              │
    ┌─────────┴─────────┐
    │                     │
AssembleReveal        HostHome
(calls it once,       (calls it once, surfaces
 derives its stages    ctx.reasoning in a new
 from ctx.assembledState) "What we recognized" card
                        when ctx.compound is true)
```

**The fix is structural, not cosmetic:** there is now exactly one code path that answers "what did we understand about this event," and both surfaces call it. There is no second derivation left to silently diverge from the first — the class of bug HQ-1 found in food pricing (two call sites disagreeing) cannot recur here, because there is only one call site's worth of logic, reused twice.

---

# 3. Canonical Experience Context

**File:** `src/lib/experienceContext.js`. Actual shape returned (🟢 Runtime Verified against the flagship event):

```js
{
  eventIdentity: { primaryEventType, secondaryEventTypes, isCompound, complexity,
                   ceremonyComponents, participants, confidence, canonicalDescription,
                   missingClarifyingQuestions, ... },  // owner: resolveEventIdentity()
  persona: null,                                        // PARKED — see Section 11
  complexity: 'compound',                                // derived from eventIdentity
  compound: true,                                        // derived from eventIdentity
  humanContext: null | { reallyIs, forWhom, intent, success, mustHaveMoment, feeling }, // owner: legacy eventIdentity()
  relationshipContext: ['immediate-family', 'military-colleagues'], // from eventIdentity.participants
  currentGoals: [] | humanContext.success,
  currentPriorities: [] | [humanContext.mustHaveMoment],
  decisionBlockers: [ { type, urgency, reasoning }, ... ],   // owner: deriveDecisionBlockers()
  recommendations: [ /* same array as assembledState */ ],
  activeRisks: [ { type, severity, description, mitigation }, ... ], // owner: deriveTopRisks(), minus dismissed/mitigated
  reasoning: 'Birthday + retirement + military-retirement (compound event, requires merging)', // eventIdentity.canonicalDescription
  confidence: 0.92,                                      // eventIdentity.confidence
  assumptions: [ 'Will the ceremony and celebration happen same day or separate?', ... ], // eventIdentity.missingClarifyingQuestions
  nextActions: [ 'Ceremony timing affects vendors, timeline, guest experience', ... ], // decisionBlockers[].reasoning
  assembledState: [ /* the exact card array AssembleReveal renders */ ],
}
```

**This is runtime context, not persistence** — nothing is written to the event object or to storage. Calling it twice with the same `(event, profile, foodPP)` returns equivalent output (🧪 proven by test: "two independent calls... produce equivalent eventIdentity"). It is safe to call from any surface, any number of times, without a cache or store.

---

# 4. Ownership Matrix

| Category | Canonical Owner (unchanged by this sprint) | Consumed via Experience Context? |
|---|---|---|
| Event Identity (classification) | `resolveEventIdentity()` | Yes — `ctx.eventIdentity` |
| Persona | Sprint A's `resolvePersona()` | **No — explicitly not wired.** `ctx.persona` is hardcoded `null`. Wiring it would require resolving IS-2's shell-vocabulary mismatch first; doing so silently inside this sprint would repeat exactly the "computed but unused/misleading" pattern this sprint exists to eliminate. |
| Human Context (meaning, must-have moment) | Legacy `eventIdentity()` reader | Yes — `ctx.humanContext` |
| Decision Blockers | `deriveDecisionBlockers()` | Yes — `ctx.decisionBlockers` |
| Planning Priorities | `humanContext.mustHaveMoment` | Yes — `ctx.currentPriorities` |
| Confidence | `eventIdentity.confidence` | Yes — `ctx.confidence` |
| Reasoning | `eventIdentity.canonicalDescription` | Yes — `ctx.reasoning` |
| Recommendations | `buildAssembleRevealStages()` | Yes — `ctx.recommendations` / `ctx.assembledState` |
| Risks | `deriveTopRisks()`, filtered by `event.riskStatus` | Yes — `ctx.activeRisks` |
| Timeline | `effectiveRos()` | **Not yet routed through ctx** — Timeline still calls `effectiveRos()` directly, correctly (single source already), just not via the context object |
| Budget | Budget component's inline math + `suggestBudget()` | **Not yet routed through ctx** |
| Guests | `guestCountResolved()`/`attendanceBand()` | **Not yet routed through ctx** |
| Food | `playbookFoodPlan()` | **Not yet routed through ctx** — `ctx.assembledState` includes a Food card, but the Food *tab* itself still calls `playbookFoodPlan()` independently, correctly (HQ-2 already made this consistent) |
| Shopping | `foodShopItems()` | **Not yet routed through ctx** |
| Explainability (`what`/`why`/`confidence`/`nextDecision`) | `assembleRevealEngines.js`'s card builders | Yes, for the domains already in `assembledState`; not yet extended to Budget/Timeline/Vendor/Decision recommendations individually (that remains HQ-2's deferred item, unchanged this sprint) |

**No duplicate ownership was created.** Every category above has exactly one owner function, same as before this sprint — the change is that two consumers (Reveal, Host Home) now share one aggregation point instead of one of them reaching around it.

---

# 5. Continuity Failures (Ranked, Post-PC-1)

| # | Failure | Status After PC-1 |
|---|---|---|
| 1 | Duplicate Event Identity derivation (Reveal vs. Host Home) | ✅ **FIXED** — both call `buildExperienceContext`; live-verified |
| 2 | Reveal computes understanding, discards it | ✅ **FIXED** for classification/compound/reasoning specifically — `ctx.reasoning` now persists into Host Home |
| 3 | Lost context (compound detection invisible after Reveal closes) | ✅ **FIXED** — "What we recognized" card, live-verified |
| 4 | Recommendation drift (Budget/Food/Timeline computing reasoning independently) | ⚠️ **UNCHANGED** — these surfaces don't consume `ctx.recommendations` yet |
| 5 | Human Intelligence loss (must-have moment not read outside Host Home) | ⚠️ **PARTIALLY ADDRESSED** — `ctx.humanContext`/`ctx.currentPriorities` exist and are available to any future consumer, but no new surface was wired to read them this sprint beyond Host Home's existing "heart" card (unchanged) |
| 6 | Explainability loss (confidence/why absent outside Reveal + Risk) | ⚠️ **UNCHANGED** — this was HQ-2's deferred item; PC-1 didn't extend it further |
| 7 | Confidence loss (same as above) | ⚠️ **UNCHANGED** |
| 8 | Contradictory recommendations across surfaces | ⚠️ **NOT NEWLY INTRODUCED, NOT FULLY ELIMINATED** — the specific contradiction pattern HQ-1 found (Reveal says "Timeline done," Host Home doesn't) was not re-tested this sprint; PC-1's fix targets identity/reasoning specifically, not every prior contradiction |
| 9 | Vendor/Budget/Timeline "drift" (independent computation of the same fact) | ⚠️ **UNCHANGED for these three** — HQ-2 already fixed Food's price-factor drift; Vendor/Budget/Timeline were never found to have an equivalent drift bug in HQ-1, so none was fixed here because none was confirmed to exist |

---

# 6. Human Intelligence Continuity

**Tracked, per the sprint's request:** why this event matters, relationship context, emotional context, traditions, milestones, decision rationale, host priorities.

| Element | Before PC-1 | After PC-1 |
|---|---|---|
| Why this event matters (`humanContext.reallyIs`) | Host Home only (legacy reader) | **Unchanged** — still Host Home only; `ctx.humanContext` makes it *available* to any future surface, but no new surface reads it this sprint |
| Relationship context (participants) | Reveal only (`eventIdentity.participants`), discarded after | **NOW AVAILABLE via `ctx.relationshipContext`** in Host Home too — not yet rendered anywhere new, but no longer trapped in Reveal's local state |
| Emotional context (feeling words) | Host Home only | Unchanged |
| Traditions | Playbook data, read by Food/Planning surfaces directly | Unchanged — not part of `eventIdentity` or `humanContext`, so not yet in `ctx` at all. **This is a real gap**: PC-1's context object has no `traditions` field, because no existing engine currently owns one as a distinct concept (HQ-3 flagged this as existing only inside specific playbook data, e.g. Juneteenth Cookout, not as a queryable field). Recommend a future sprint decide whether this belongs in `ctx` or remains playbook-local. |
| Milestones (compound detection) | Reveal only, discarded | **NOW PERSISTS via `ctx.compound`/`ctx.eventIdentity.secondaryEventTypes`** — live-verified reaching Host Home |
| Decision rationale (`because` strings on Decisions panel) | Decisions panel only | Unchanged — `ctx.decisionBlockers` carries Reveal's blocker reasoning, but the Decisions *panel's* own `because` strings (a separate, richer reasoning system per HQ-1) were not merged into `ctx` this sprint |
| Host priorities (must-have moment) | Host Home only | Available via `ctx.currentPriorities`, not newly surfaced elsewhere |

**Where continuity still breaks, precisely:** everywhere except the Reveal→HostHome identity/compound/reasoning seam. This sprint fixed one seam correctly and completely; it did not fix the others, and this report does not claim it did.

---

# 7. Explainability Continuity

| Field | Exposed Before PC-1 | Exposed After PC-1 |
|---|---|---|
| What | Reveal cards only | Unchanged (same cards, now also referenceable via `ctx.assembledState`) |
| Why | Reveal cards, Risk (post-HQ-2), Decisions (`because` strings) | Unchanged — `ctx.reasoning` adds ONE new why-string surfaced in Host Home (the compound-recognition line); does not add why to Budget/Timeline/Vendor |
| Confidence | Reveal only, Risk (post-HQ-2, "We think so") | `ctx.confidence` now exists as a queryable number, but is not newly rendered anywhere beyond what Reveal already showed |
| Evidence | Weather Risk (strongest), Food menu defaults, Vendor COI | Unchanged |
| Status | Reveal cards ("Required"/"Assembled"), Risk (Acknowledge/Dismiss/Mitigated) | Unchanged |
| Next Decision | Reveal blockers, Decisions (menu-type) | `ctx.nextActions` now exists as an aggregated array (blocker reasonings), available for a future surface to consume; not yet rendered anywhere new |

**Honest assessment:** PC-1 made explainability *data* more available (by centralizing it in one object) without yet making it more *visible* beyond the one Host Home card added. This is a legitimate, scoped first step — the remaining work (HQ-2's deferred item: extend the full contract to Budget/Food/Timeline/Shopping/Vendor/Decisions) is now easier to do, because a future surface can pull `ctx.confidence`/`ctx.reasoning` from one place instead of computing its own, but doing that pull is not yet done for those six surfaces.

---

# 8. Runtime Validation (Mandatory — Not Code Inspection)

All validation below was performed by creating real events in the running application, not inferred from code.

## Flagship: 50th Birthday + Military Retirement
1. Created via intake with name "50th Birthday and Military Retirement from the Navy," type Birthday, date 16 days out (deliberately avoiding the Focus Mode date-proximity branch — see Finding below).
2. **Assemble Reveal** (🟢 verified): Identity card shows "A birthday + retirement + military-retirement. Two milestones, one event," Ceremony Timing / Venue / Dress Code blockers, Building Your Day, "High confidence."
3. Navigated Reveal → Editorial Cover → **Host Home** (portfolio dashboard — see navigation finding below).
4. **Host Home shows a new card, "What we recognized": "Birthday + retirement + military-retirement (compound event, requires merging)"** — 🟢 confirmed via direct DOM query, not inferred. Same reasoning string Reveal displayed, now visible after the modal closed.
5. Console checked: no errors at any step.

## Unplanned but Valuable Finding: Focus Mode Is a Third Render Branch
While validating, I initially created a test event whose date resolved to "today" (a pre-existing date-picker artifact carried over from prior sprints' testing, not a PC-1 defect). This caused `HostHome` to take its `isFocus`/`isDayOf` early-return branch (the dim "THE ONE THING TODAY" view) instead of the normal layout — a **third render path**, distinct from both the normal Host Home layout and the event-detail workspace, that this sprint's new card is not wired into. **This is not a regression** (the card was never claimed to appear in Focus Mode), but it's worth naming explicitly: Focus Mode is yet another place "what we understood about this event" could vanish for a host on the day of, or the two days before, their event — arguably the moment they'd most want the reminder. Recommend as a follow-up, not fixed here.

## Navigation structure clarified during validation
Confirmed live (not previously this precisely documented): after creating an event, a host passes through up to three distinct screens before reaching the portfolio Host Home — `AssembleReveal` (modal) → `EditorialCover` (per-event hero) → `HostHome` (portfolio list). Each is a separate component; this sprint's fix targets the first and third.

## Other scenarios (Birthday, Retirement, Crab Feast, Family Reunion, Wedding, Corporate Event)
**Not independently re-walked this sprint (❓ explicitly not claimed as verified).** These were live-verified for Reveal/routing correctness in IS-1 and are architecturally unaffected by PC-1's change (the new context-building logic is the same free-text/foodPP logic already proven for all of them in IS-1/HQ-2, just relocated into one shared function — confirmed by the regression test suite, which covers simple non-compound events explicitly and passes). Re-running all five live was not done given time constraints; the flagship walkthrough above exercises the identical code path each of them would use.

---

# 9. Implementation Plan (What Was Actually Done)

**Minimum implementation, as instructed — no new engines, no new stores, no new AI:**

1. New file `src/lib/experienceContext.js` — pure composition function, ~100 lines, zero new logic (every field is a call to an existing function).
2. `src/App.js` — `AssembleReveal`: replaced inline `resolveEventIdentity()` + `buildAssembleRevealStages()` calls with one `buildExperienceContext()` call; `evIdentity` and `stages` now derive from its return value.
3. `src/App.js` — `HostHome`: added one `buildExperienceContext()` call (plain function, not a hook, to respect existing hook-order constraints — see Risk Assessment) and one new conditionally-rendered card reusing the exact existing card/eyebrow styling tokens (no new design system).
4. `src/lib/__tests__/pc1ExperienceContext.test.js` — 8 new tests, all passing.

**Total new/changed code:** one new ~100-line file, ~35 lines changed in `App.js` (net simplification in `AssembleReveal` — it now has *less* inline logic than before, not more).

---

# 10. Risk Assessment

| Risk | Likelihood | Mitigation Taken |
|---|---|---|
| Hooks-order violation (found and fixed during this sprint) | Realized once, caught by build | Initially wrote `ctx` as a `useMemo` in `HostHome`, which sits after an early return — production build correctly failed with a rules-of-hooks error before this ever reached runtime. Fixed by using a plain function call (matching the existing `id`/`na` pattern in the same component), which is safe because `buildExperienceContext` is cheap (no async work, no state). |
| `AssembleReveal`'s stage generation silently breaking | Low | Existing try/catch fallback (empty stage array) preserved exactly; regression suite (139 tests) confirms no behavior change for existing fixtures |
| New card appearing for the wrong events (false positives) | Low | Gated strictly on `ctx.compound === true` — verified false-positive-free by both the IS-1-era name-echo regression test (still passing) and this sprint's own compound/non-compound test pair |
| Focus Mode branch not receiving the fix | Confirmed, not a regression | Documented in Section 8 as a known, pre-existing gap, not silently left out of this report |
| Performance (an extra function call per render in two components) | Negligible | `buildExperienceContext` does the same work `AssembleReveal` was already doing inline (no new computation), and adds one additional call in `HostHome` that HQ-1 already flagged as calling similar engines multiple times per render regardless — not a new performance class of problem |

---

# 11. Execute / Test / Park / Delete

| Item | Classification | Reasoning |
|---|---|---|
| `buildExperienceContext()` core function | **EXECUTE (done)** | Built, tested, live-verified |
| Reveal + Host Home consuming it | **EXECUTE (done)** | Live-verified |
| Wiring `resolvePersona()`/`resolveShell()` into `ctx.persona` | **PARK** | Per IS-2's frozen decision — the shell-vocabulary mismatch (6 values, 2 real shells) is unresolved; wiring it here would repeat the "computed but architecturally premature" pattern |
| Extending `ctx` consumption to Timeline/Budget/Guests/Food/Shopping/Vendors | **TEST, then EXECUTE one at a time** | Each needs its own live verification pass, per this sprint's own methodology — do not batch them |
| Adding a `traditions` field to `ctx` | **RESEARCH** | No existing engine currently owns this as a distinct, queryable concept (it lives inside playbook data only) — needs a design decision before it can be added, not just a wiring change |
| Fixing Focus Mode's lack of continuity-card equivalent | **TEST** | Confirm whether a host actually needs this reminder in the compressed, single-card Focus Mode UI, or whether that UI's own design (single most-important-thing framing) makes it appropriately irrelevant there — a UX judgment call, not purely technical |
| Re-validating Budget/Timeline/Vendor/Decision explainability gaps (HQ-2's deferred item) | **EXECUTE, next sprint** | Unchanged scope from HQ-2's own recommendation; PC-1 did not add to or reduce this backlog |
| Merging the Decisions panel's `because`-string reasoning into `ctx` | **RESEARCH** | HQ-3 identified this as a duplicate/parallel reasoning system to `eventIdentity`'s own reasoning; whether to merge or keep separate is a design decision, flagged here rather than decided unilaterally |

---

# 12. Production Readiness

```
Test Suites: 6 passed (139 tests, up from 131 before this sprint)
Production build: clean, 0 errors
Bundle size delta: negligible
```

**Live-verified:** flagship compound scenario, end-to-end, Reveal → Host Home, with the specific defect this sprint targeted (identity understanding vanishing after Reveal closes) directly observed as fixed via DOM query and screenshot, not inferred from code.

**Not re-verified this sprint (explicitly):** Birthday, Retirement, Crab Feast, Family Reunion, Wedding, Corporate Event as individual live walkthroughs (architecturally unaffected, per Section 8's reasoning, but not independently re-clicked-through).

---

# Honest Summary

This sprint did exactly one thing correctly and completely: it gave the platform one canonical place to answer "what do we understand about this event," and made the two surfaces that most needed to agree — Assemble Reveal and Host Home — both ask that one place instead of each answering separately. That is a real, load-bearing, live-verified fix to HQ-3's single most important finding.

It did not make the platform "think as one system" across all thirteen Host surfaces — that remains nine more scoped consumption changes, each deserving the same discipline this sprint applied to the first one. The Experience Context now exists to make that future work easier (one object to read from, not nine independent derivations to build), but reading from it is future work, not this sprint's work, and this report does not claim otherwise.
