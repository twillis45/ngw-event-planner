# Redesign Readiness Sprint 0 — verdict

**Date:** 2026-10-19 · **Branch:** `main-2utz0n` · **Head:** `3fbfbd3` + verdict commit

All eight slices landed. This re-runs the ten GOLD acceptance cases and the
fourteen redesign invariants from the planning package, and returns a verdict.

---

## VERDICT

# READY FOR REDESIGN IMPLEMENTATION

**Conditional on one thing, stated plainly:** ready for the **Guests → Attendance
→ Consequence** domain first, and **not yet** for Weather/Day-of or
failure-path surfaces, which still have no browser baseline. The condition is
not a hedge — it is the same rule P1-1 was commissioned to satisfy, applied
honestly to the surfaces P1-1 did not cover.

The two hard blockers the gate named are closed with measured evidence. One
capability gap remains and is **BOUNDED** under the rule adopted mid-sprint:
named, not implied by any surface, and covered by a test proving the app does
not claim what it lacks.

---

## The five gate blockers

| # | Blocker (verdict 2026-10-18) | State | Evidence |
|---|---|---|---|
| 1 | Destination invariant depends on `HostShellV2` | **CLOSED** | Invariant moved into `travelFieldsToPersist`; 15 tests, 6 red first; persisted output byte-identical |
| 2 | Guest-count authority: 1 gated consumer vs 32 raw readers | **CLOSED** | All consumers classified into the six required categories; 3 migrated (outward payload, budget money, over-budget advisor); 15 paired tests |
| 3 | No GOLD-07 cascade proof | **CLOSED** | `gold07RsvpCascade.spec.mjs` — 9 asserted boundaries, own bundle for the backend leg, red-proofed |
| 4 | No Seating/Rain browser baseline | **CLOSED** | `seatingAndRainBaseline.spec.mjs` — 9 characterisation tests + negative control |
| 5 | No normalized needs model | **CLOSED** | `accessNeeds.js` — one owner, one vocabulary; both prior consumers migrated; runtime proof |

---

## The ten GOLD cases, re-run

| ID | Event | Before | Now | Note |
|---|---|---|---|---|
| **01** | WANDA-A cold start | 5 blockers | **4 of 5 closed** | `venueCity:"the"` fixed · theme fixed · destination guess cannot persist. Programme + vendor-intent clauses have **identified destinations** (`event.ros`/`timeline`; `vendorCategoriesByType`) and are **wiring work for the redesign**, not readiness blockers |
| **02** | WANDA-B mature fixture | no acceptance spec | **OPEN** | Test-coverage gap. Not touched by Sprint 0; does not block the first domain |
| **03** | Anaheim multi-day | "2 excursions" dropped | **BOUNDED** | Verified: no truthful destination exists — a vendor row needs a vendor, a timeline row needs a day and a thing. Preserved as unapplied truth with an honesty test |
| **04** | Santa Fe accessibility | **hard blocker** | **CLOSED** | The only case the gate called a true capability gap. Normalized, wired to seating + lodging, proven on screen, and the unreached `place` domain now raises a question instead of going quiet |
| **05** | Backyard, venue decided | must not nag for a venue | **HELD — and strengthened** | The new raiser requires a **named** venue to fire, so it cannot structurally nag for one. `handlingTheVenueMyself` green |
| **06** | Watch party | weather has no e2e | **OPEN** | The gap behind the verdict's condition. Weather is unbaselined; a redesign touching it could regress it invisibly |
| **07** | Remote RSVP cascade | **hard blocker** | **CLOSED** | Full browser walk; the rerank boundary swaps one job for another as a consequence of replies |
| **08** | Price lifecycle | needs one spanning spec | **OPEN (low)** | Best-covered area; six specs exist, no single spanning one |
| **09** | Persistence | pass entitlement not in e2e | **OPEN (low)** | Entitlement verified in production manually during the pass work; not in a spec |
| **10** | Failure injection | no spec for invalid route / producer or write failure | **OPEN (medium)** | Second input to the verdict's condition |

**Closed: 04, 05, 07 · substantially closed: 01 · bounded: 03 · open: 02, 06, 08, 09, 10.**

Sprint 0 was scoped to remove *blockers*, not to make all ten pass. Five of the
remaining opens are test-coverage gaps; only **03** is a capability gap, and it
is bounded.

---

## The fourteen invariants

| # | Invariant | State | Where it is now enforced |
|---|---|---|---|
| 1 | A guessed destination must not become a permanent destination/paywall fact | **ENFORCED** | `travelFieldsToPersist` — no longer trusts its caller |
| 2 | Explicit host statements outrank inference | **HELD** | `*Basis` fields; `themeBasis` added this sprint keeps a colour-pair reading weaker than a stated one |
| 3 | Unused/unapplied clauses cannot silently disappear | **ENFORCED, and extended** | `heardClauses.js`. Was shown once at creation and discarded; the sentence now persists, the clause is answerable, and three **false alarms** were removed |
| 4 | `eventPlan()` remains the sole final next-action authority | **HELD** | P1-5 adds a *raiser*, not a ranker. One surface, declared in the registry contract |
| 5 | Estimates/quotes/intent cannot silently become committed/spent | **HELD, and tightened** | `hostSpending` and `budgetRecovery` now gate on confirmed provenance, not on a number existing |
| 6 | External provider uncertainty/provenance must survive | **HELD** | Untouched; `PRICE_LAYERS`/`priceVintage` specs green |
| 7 | Every working capability needs a durable door before the old one retires | **HELD** | Parity gate green; nothing retired this sprint |
| 8 | A guessed headcount must not become money, or leave the app | **ENFORCED** | The outward payload and both money modules; the route-around via `guestCountResolved` removed |
| 9 | No parallel math | **HELD, and improved** | No new math added. `accessNeeds` *removed* a parallel implementation (two vocabularies, two source fields) |
| 10 | Venue truth is read through `venueFor`, never raw fields | **HELD** | `openQuestions` reads `venueFor`; `venueSourceProof` green |
| 11 | One vendor-status vocabulary | **HELD** | Untouched |
| 12 | The app must not invent a fact a venue has not supplied | **ENFORCED** | P1-5 is this invariant made actionable: it asks, names who can answer, and refuses to guess — asserted by a no-hedging-verb test |
| 13 | An event that began free stays free | **ENFORCED** | Reinforced by #1; a guess can no longer reach `passVerdictAtCreation` |
| 14 | Never infer a diagnosis from an accessibility statement | **ENFORCED** | `accessNeeds` carries equipment + route + verbatim phrase; a test asserts no clinical term appears in the output |

**All fourteen hold. Six moved from "asserted in prose" to "enforced by a named
module with tests."** None was weakened.

---

## Which redesign domain first, and why

### Guests → Attendance → Consequence

**Not** Place/Venue, and not the Command Board shell.

1. **It is the only domain with an end-to-end browser proof.** GOLD-07 walks
   nine boundaries from a stranger's phone to the ranked plan. A redesign of
   this domain has a test that fails loudly if a reply stops reaching money or
   seating — no other domain has that.
2. **Its baselines exist.** Seating was the surface with *no* e2e at all; it now
   has characterisation tests covering tallies, the access instruction, and
   assignment. Rain is baselined beside it.
3. **Its authority seam is now single.** The guest count was the most duplicated
   derivation in the repo. It now has one gated path for outward and money use,
   with every other consumer classified and justified.
4. **It is where the redesign's value is most visible.** Attendance is what the
   host checks most and what the most surfaces derive from.
5. **It carries the lowest invention risk.** Every number in the domain traces to
   a host statement or a guest reply, with provenance — so a redesigned surface
   has a truthful thing to render at every point.

### Before a Weather/Day-of or failure-path redesign

Two things first, both small:
- a browser baseline for the weather surfaces (GOLD-06);
- failure-path specs for an invalid route, a producer failure and a write
  failure (GOLD-10).

Without them a redesign there would be changing surfaces nobody can prove the
current behaviour of — which is precisely what P1-1 existed to prevent, and the
reason this verdict is scoped rather than blanket.

---

## The one bounded gap, declared

**`"2 excursions"` has no truthful destination.** `Activities` is a canonical
vendor category, but a vendor row needs a vendor and a timeline row needs a day
and a thing; a bare count of unnamed outings supplies neither. Writing either
would fabricate structure the host never gave.

Bounded under the rule adopted 2026-10-18:
1. **Named** — with the evidence above, in the ledger and the intake audit.
2. **Un-implied** — no redesigned surface will claim an itinerary capability.
3. **Tested** — the clause stays visible and answerable via `heardClauses`, and
   `theClauseGetsAnAnswer.spec.mjs` proves it on screen.

It will leave the list on its own the day a consumer can read it, on every
existing event, with nothing to backfill.

---

## Three corrections this sprint made to its own planning package

Recorded because the package is still the redesign's reference, and a document
that quietly fixes its own findings is worse than one that was wrong once.

1. **`guestEstimateSource` → `guestCountSource`.** The field I searched for was
   not the field that exists. The real one is written at all three sites.
2. **`guestCountFor` had 1 runtime consumer, not 3.** `HostShellV2:8153` is a
   comment, not an import.
3. **Three of four "missing schema" classifications were wrong** — all failing
   the same way: searching for a module *named* after a concept, finding none,
   and concluding the capability was absent. `accessibilityContext.js`,
   `event.ros`/`timeline` and `vendorCategoriesByType.js` all exist with live
   consumers.

**The standing lesson, now in the audit:** treat any unverified *"X does not
exist"* claim in these documents as unproven until someone greps for the
**capability** rather than the **word**. Correction 3 changed the shape of two
whole slices — from "build a model" to "connect what is there."

---

## Measured state

| | |
|---|---|
| Unit tests | **613 suites / 8,449 passed**, 1 skipped (from 607 / 8,330 at gate close) |
| Browser, desktop project | **527 passed** on the full run · the 33 failures it showed were traced to MY build mistake, not the code — see below |
| New unit suites | 6 — destination, guest count, access needs, clause resolution, creation defects, consequence |
| New browser suites | 5 — GOLD-07 cascade, seating/rain baselines, walker, clause answer, consequence |
| CRA build gate | **241 of 241** baselined warnings — clean |
| hostv2 parity gate | clean |
| Migration ledger | one row per slice: before → change → invariant → tests → consumers → rollback risk |
| Runtime changes | 7 engine modules, 2 new modules, 1 shell seam, 2 shell blocks |
| `CommandCenter.jsx` | **untouched**, as instructed |

---

## Three things the final pass itself found

Recorded because a verdict that hides what its own verification turned up is
worth less than no verdict.

### 1. A real defect in P1-2, found by the sentence the feature was built for

`heardAccessNeeds` split clauses on punctuation only. On the full Santa Fe seed
— *"…, she uses a walker and the altitude is hard on her"* — that kept both
halves as one clause, so the stored requirement's phrase carried the altitude
sentence inside it. Two distinct failures: it puts a **health statement inside
an access requirement**, which the module's own hard line forbids and which
`healthNoted` owns separately; and the P1-5 question then read *"you said 'she
uses a walker and the altitude is hard on her' needs a step-free route"*,
conflating two facts in a sentence shown to the host.

The earlier tests put the walker clause at the end of the line, so none of them
caught it. `and` is now a clause boundary, with at most one requirement per
punctuated clause — *"step-free and a ground floor room"* is one person's need
said twice, not two people, and two requirements would read as two in lodging's
*"N people asked about stairs."* Three tests added, including the full seed.

### 2. An existing spec was asserting the pre-sprint truth

`theAltitudeReachesThePlan` asserted that the creation screen lists the walker
under *"didn't make it into the plan"* — correct when written, because nothing
owned the clause. P1-2 gave it a slot and P1-3 stopped reporting consumed
clauses, so measured on that seed the dropped list went from
`["she uses a walker"]` to `[]`. The spec now asserts that **neither** clause is
disclaimed, with the reasoning recorded in place. That is the outcome
`smartParseEvent#healthNoted` predicted in writing: a mobility aid stays in the
disclosure block *"because no slot exists for it"* — and one now does.

### 3. 33 browser failures that were mine, not the code's

The first full desktop run showed 33 failures, all in lodging/unfurl specs.
Cause: `fixtures.mjs` records that the e2e build bakes
`REACT_APP_API_BASE_URL=https://e2e-mock.invalid` so `isUnfurlConfigured()`
reads true — and plain `npm run build` does **not** bake it. I had rebuilt
`dist` with plain `npm run build`. Rebuilt with the documented env var, **54 of
those 55 tests pass**; the one that did not was finding #2 above, which is a
real and intended behaviour change.

**Worth fixing separately, not in Sprint 0:** `npm run build` in `hostv2` does
not produce a bundle the e2e suite can pass against, and nothing in
`package.json` says so. The knowledge lives only in a comment in
`fixtures.mjs`. That is a trap with a countdown on it for the next person who
runs the suite locally.

### Also cleaned up

A stray debug file (`src/__dbg__/p14.test.js`) was committed by accident in the
P1-4 commit — `git add -A` caught it before I deleted it. Removed here. The
`hostv2/review-shots/` baselines were overwritten by my capture-spec runs and
have been **reverted**: they are the owner's visual reference, not a Sprint 0
artifact.

---

**Do not begin the redesign until separately authorized.**
