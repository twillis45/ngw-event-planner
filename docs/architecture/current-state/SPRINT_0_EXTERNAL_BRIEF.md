# Sprint 0 — adversarial review request

**For a reviewer WITH repository access.** Every claim below carries a
`file:line` or a command. Do not take any of it on trust — the point of this
document is that each assertion is cheap to falsify.

**Repo:** `github.com/twillis45/ngw-event-planner` (public)
**Branch:** `main-2utz0n` · **Head:** `e69c223` · **Base:** `16a211c^`
**Date:** 2026-10-19

```bash
git clone https://github.com/twillis45/ngw-event-planner
cd ngw-event-planner && git checkout main-2utz0n
git log --oneline 16a211c^..HEAD        # the whole sprint, 11 commits
```

---

## 0. Orientation — the two facts that explain the shape of everything

1. **`src/lib/**` is the engine** (pure, jest-tested). **`hostv2/**` is the
   shipping shell, and jest cannot execute it.** Anything living in the shell
   has a Playwright test or has never been executed by any test. This is why
   several slices are browser-only.
2. **The architecture was found sound and was deliberately not changed.**
   Derive-on-read: one event object, pure authority modules, nothing cached, so
   nothing goes stale. No cache, no event bus, no invalidation layer was added.
   Verify: `src/lib/eventPlan` consumers, `src/lib/surfaceRegistry.js`.

Read these three first; they are where the sprint's reasoning lives:

```
docs/architecture/current-state/SPRINT_0_VERDICT.md            the verdict + GOLD/invariant re-run
docs/architecture/current-state/SPRINT_0_MIGRATION_LEDGER.md   one row per slice: before → change → invariant → tests → consumers → rollback
docs/architecture/current-state/CREATION_TRUTH_AND_INTAKE_AUDIT.md  §2 carries a ⚠ CORRECTED block — read it, it is the most instructive thing here
```

---

## 1. Reproduce the measurements

```bash
# Unit: expect 613 suites / 8,449 passed, 1 skipped
CI=true npx react-scripts test

# The six suites this sprint added
CI=true npx react-scripts test --testPathPattern \
  "aGuessIsNotADestination|anInventedCountDoesNotLeaveTheApp|oneAccessNeedOneAnswer|iHeardThisTooAndThenWhat|theTownAndTheColors|weNowNeedToKnow"

# Gates
npm run gate:cra          # 241 of 241 baselined warnings
cd hostv2 && npm run parity
```

**Browser suite — read this before running it, it cost me 33 false failures.**
`npm run build` in `hostv2` does **not** produce a bundle the suite can pass
against. The suite needs `REACT_APP_API_BASE_URL` baked so
`isUnfurlConfigured()` reads true; that requirement is documented *only* in a
comment in `hostv2/e2e/fixtures.mjs`:

```bash
cd hostv2
REACT_APP_API_BASE_URL=https://e2e-mock.invalid npx vite build
npx playwright test --project=desktop        # expect 527 passed
```

**This is itself a finding** — see §5.3.

---

## 2. The eight slices, with coordinates

| Slice | Change | Where | Tests |
|---|---|---|---|
| **P0-1** destination invariant | guard moved into the engine; module no longer trusts its caller | `src/lib/travelFieldsToPersist.js:76,83,85` | `src/lib/__tests__/aGuessIsNotADestination.test.js` (15) |
| **P0-2** guest-count authority | 3 of 32 consumers gated on provenance | `webhookService.js:131` · `hostSpending.js:143` · `budgetRecovery.js:81` · gate at `guestCountFor.js:95` | `anInventedCountDoesNotLeaveTheApp.test.js` (15) |
| **P0-3** GOLD-07 cascade | 9-boundary browser walk, own bundle | `hostv2/e2e/gold07RsvpCascade.spec.mjs` · `.env.gold07` · webServer in `hostv2/playwright.config.mjs` | 2 browser |
| **P1-1** baselines | characterization of seating + rain | `hostv2/e2e/seatingAndRainBaseline.spec.mjs` | 9 browser |
| **P1-2** normalized needs | one owner module; 2 consumers migrated | `src/lib/accessNeeds.js:70,137,196,214` · `seatingPlan.js:49,190` · `lodgingIntel.js:2073` | `oneAccessNeedOneAnswer.test.js` (29) + 2 browser |
| **P1-3** clause resolution | 3 false alarms removed; sentence persisted | `smartParseEvent.js:1809` · `src/lib/heardClauses.js:85,100` · `HostShellV2.jsx:348,8257,9534,12119` | `iHeardThisTooAndThenWhat.test.js` (17) + 4 browser |
| **P1-4** creation defects | `venueCity:"the"`; colour-pair theme | `smartParseEvent.js:55,1004` (town) · `:1590,1598` (theme) | `theTownAndTheColors.test.js` (14) |
| **P1-5** consequence primitive | one rule, one raiser | `src/lib/placeQuestions.js:92,115` · `surfaceRegistry.js:67,545` · `HostShellV2.jsx:12086` | `weNowNeedToKnow.test.js` (26) + 7 browser |
| **D1** attendance provenance (0.5) | the canonical reader learns whose number it is | `playbooks/index.js:600` · `vendorAccountability/conflicts.js:8,167` | `thePlanningCountKnowsWhoseItIs` (16) · `anInventedCountIsNotAVendorConflict` (7) · `theHeadcountHasOneCanonicalReader` (5) |
| **D2** clause derivation contract (0.5) | the composition root; no argument to forget | `src/lib/heardClauses.js:87,95,132` | `theClauseReadersAreNotOptional.test.js` (6) |
| **D3** consequence abstraction (0.5) | two more cases; `openQuestions` → `placeQuestions` | `src/lib/placeQuestions.js:89,184` · `placeIntelligence.js:182` (the inert one) · `vendorAsks.js:82` | `weNowNeedToKnow.test.js` (26) + 7 browser |
| **D4** bounded-gap governance (0.5) | 8 conditions → 11, enforced | `src/lib/itinerary.js:155` (the pinned justification) | `aBoundedGapStaysBounded.test.js` (8) |

---

## 3. The five defects worth verifying yourself

### 3.1 `venueCity: "the"` — a one-character bug (`smartParseEvent.js:1004`)

The spelled-out-state matcher is `([A-Z][a-zA-Z…]+)\s+(<state names>)`. The
leading `[A-Z]` is a deliberate proper-noun test — the comment ~80 lines above
calls the capital *"a cheap proper-noun test standing between 'in the backyard'
and a fabricated destination event."* The pattern carries `i` so state names
can be typed in any case, `i` applies to the whole regex, so `[A-Z]` matched
lowercase and the test silently stopped happening.

```js
parseSmartEventText('40 guests in the Maryland/DC area', {}).venueCity
// before: "the"   after: null
```

Cost: that field feeds geocoding, weather, shopping, lodging search and maps.
`"the, MD"` geocodes to nothing and all of them go quiet with no error. The
file already owned the guard (`NOT_A_PLACE`, which lists `the`) and had declared
it **~100 lines below** the branch that needed it, where referencing it would
have been a TDZ throw. Moved to `:55`.

**Check:** does refusing the match (rather than salvaging a region) lose
anything a host stated? The argument is that `"Maryland/DC area"` is not a
`City, ST` and this file's standing rule is that a guessed location is worse
than asking.

### 3.2 One concept, two vocabularies (`src/lib/accessNeeds.js`)

The gate called accessibility a capability gap. It was not. Two consumers
already acted on an access need, reading different fields with different
vocabularies:

| Consumer | Read | Knew `walker`? |
|---|---|---|
| seating | structured array **and** free text | **no** |
| lodging | free text **only** | yes |

So the same guest got a ground-floor bedroom and no reachable seat, or the
reverse, depending on which box her need was typed into. `git show a92b525` has
both original regexes.

Two hard lines, both tested: **no diagnosis** (`oneAccessNeedOneAnswer.test.js`
asserts no clinical term appears in the output) and **no invented person**
(`"she"` names nobody the app knows; the owner stays `null`).

**Check `domainsFor` at `:196`.** My first cut claimed an intake-stated need
reached both seating and lodging. That is false: lodging is sized by a *count*
so an unnamed need reaches it honestly, but seating seats *people* — one tally
entry per roster row, naming the guest. A nameless need cannot reach seating
without inventing someone. Is per-requirement reach the right model, or should
reach be a property of the *question* rather than the requirement?

### 3.3 Three false alarms (`smartParseEvent.js:1809`)

The creation seam reads the host's sentence with three consumers the parser
knows nothing about (`HostShellV2.jsx:348`). The dropped-clause list only ever
re-parsed, so everything those consumed read as *dropped*:

```js
unusedClauses('family reunion in Deep Creek Lake, a house with a hot tub, 20 people', {})
// ["a house with a hot tub"]   ← consumed as a lodging requirement
```

Two were pre-existing; **P1-2 added the third** — the count grows by one with
every new seam consumer. This is the exact class that module's own comment says
it is biased against: *"a false alarm costs them the belief that the list means
anything."*

**Check the injection choice.** `alsoDerives` takes functions rather than
importing `lodgingIntel`, because the parser is on the guest invite's critical
chunk and `hostv2/e2e/guestPayloadGate.spec.mjs` exists because that import
graph has regressed once already. Is dependency injection the right call, or
does it just move the coupling to every call site? Note the consequence: a
caller that forgets `alsoDerives` silently gets the false alarms back.
`heardClauses.js:85` documents that; nothing enforces it.

### 3.4 The resolution model stores the sentence, not the list (`heardClauses.js`)

The brief asked for resolution so a clause does not *"endlessly resurface."*
Measured: the list has **one** render site, in creation, computed live, and the
sentence was never stored — so nothing resurfaced. The clause was shown **once**,
while the host was still typing the event into existence, then lost.

Persisting `createdFromText` (`HostShellV2.jsx:8257`) and recomputing means the
day a consumer starts reading a clause, the differential stops reporting it, on
every existing event, with nothing to backfill. A stored list would have frozen
the clause as dropped and needed a migration.

**Check:** is persisting the host's raw sentence on the event the right
trade-off? It is her own text and already in `localStorage`, but it is now also
a durable field on a synced record.

### 3.5 One raiser (`surfaceRegistry.js:545`, `placeQuestions.js:115`)

> **RENAMED 2026-10-19 (Sprint 0.5 D3).** `openQuestions.js` is now
> `placeQuestions.js`, with `openQuestionsFor` → `placeQuestionsFor`,
> `answerOpenQuestionPatch` → `answerPlaceQuestionPatch` and registry id
> `placequestions`. The coordinates in this section are the current ones; the
> reasoning is in `SPRINT_0_5_ARCHITECTURE_DECISIONS.md` § Decision 3. The
> module now holds a second rule (an outdoor permit question) of a materially
> different shape.

The mandate said explicitly not to add raisers for domain-count symmetry. This
one requires all three of: a named venue, somebody needing a step-free route,
and nobody having said whether that building has one. It cannot nag *for* a
venue — `placeQuestions.js:133` requires `venueName` truthy — which is what
GOLD-05 demands.

The app does not answer it and cannot; it holds no accessibility data for any
venue. `"No"` closes it as firmly as `"Yes"`.

---

## 4. Verdict, and what is open

**READY FOR REDESIGN IMPLEMENTATION**, scoped: ready for
**Guests → Attendance → Consequence** first, **not** for Weather/Day-of or
failure-path surfaces, which have no browser baseline. Full reasoning in
`SPRINT_0_VERDICT.md`.

5 of 5 gate blockers closed. 14 of 14 invariants hold, 6 moved from
asserted-in-prose to enforced-by-a-named-module-with-tests, none weakened.
GOLD: 3 closed, 1 substantially, 1 bounded, 5 open (4 are test-coverage gaps).
`CommandCenter.jsx` untouched, as instructed.

**One capability gap, bounded:** `"2 excursions"` has no truthful destination —
a vendor row needs a vendor, a timeline row needs a day and a thing, a bare
count of unnamed outings supplies neither. Carried into READY under a rule
adopted mid-sprint: a gap must be *named with evidence*, *implied by no
surface*, and **covered by a test proving the app does not claim what it
lacks**. The rule is at the end of `SPRINT_0_MIGRATION_LEDGER.md`.

---

## 5. What went wrong, and the pattern behind it

### 5.1 Three of my own planning-package claims were false

| Claim | Reality |
|---|---|
| a field named `guestEstimateSource` | does not exist; the real one does and is written at all three sites |
| the confirmation gate had 3 consumers | **1** — one of the three was a code comment, not an import |
| four clauses had "no canonical destination" | **three of four were wrong** |

**All three failed identically:** searching for a module *named* after a
concept, finding none, concluding the capability was absent.
`src/lib/knowledge/accessibilityContext.js`, `event.ros`/`event.timeline`, and
`src/lib/vendorCategoriesByType.js` all exist with live consumers. See the ⚠
CORRECTED block in `CREATION_TRUTH_AND_INTAKE_AUDIT.md` §2.

That third correction **changed the shape of two slices** — from "build a model"
to "connect what is already there."

### 5.2 A real defect in my own P1-2, found by the final pass

`heardAccessNeeds` split clauses on punctuation only. On the full source
sentence — *"…, she uses a walker and the altitude is hard on her"* — that
stored both halves as one requirement phrase. Two failures: a **health
statement inside an access requirement**, which that module's own hard line
forbids and which `healthNoted` (`smartParseEvent.js:1631`) owns separately;
and the P1-5 question then read *"you said 'she uses a walker and the altitude
is hard on her' needs a step-free route."*

My earlier tests put the walker clause at the end of the line, so none caught
it. Fixed at `accessNeeds.js:147-170`; 3 tests added.

### 5.3 An existing spec was asserting the pre-sprint truth

`hostv2/e2e/theAltitudeReachesThePlan.spec.mjs` required the walker to appear
under *"didn't make it into the plan."* Correct when written — nothing owned the
clause, and `smartParseEvent.js:1631` said so in as many words: a mobility aid
stays in the disclosure block *"because no slot exists for it and inventing one
would be the worse error."* P1-2 created the slot. Updated to assert that
**neither** clause is disclaimed, with the reasoning in place, and the stale
ruling at `:1634` corrected.

### 5.4 Also

33 browser failures traced to my own build mistake (§1). A stray debug file
committed by accident in `8b3303d`, removed in `af5cb79`.
`hostv2/review-shots/` baselines were overwritten by my capture runs and
**reverted** — they are the owner's visual reference, not a sprint artifact.

---

## 6. Where I most want to be wrong

Ranked by how much a redesign would be built on top of the answer.

**1 — P0-2's classification is the highest-judgment call in the sprint.**
32 consumers read the headcount raw; **3 were migrated, 29 deliberately left
alone**. The argument: protection belongs at the boundary (outward
communication, committed money), and gating internal sizing steps would hide
planning surfaces from the host who most needs them — a playbook typical sizing
a shopping-list preview is what a typical is *for*. The full table is in the
ledger's P0-2 row. **Is that the right line, or does leaving 29 raw readers
guarantee the next consumer gets it wrong too?**

**2 — Is "bounded gap" sound governance, or a loophole?** It lets READY ship
with a named, tested hole. The alternative is that any gap blocks the verdict,
which would have forced either inventing a schema for `"2 excursions"` or
reporting NOT READY on one clause.

**3 — Is one rule enough to validate a consequence primitive?** P1-5 ships a
single rule because the mandate warned against raisers for symmetry. A shape
generalized from one instance may be the wrong shape.

**4 — The `alsoDerives` contract is unenforced.** A caller that omits it
silently restores the false alarms. Documented, not guarded. Is a lint rule or a
required argument worth the friction?

**5 — Is there a structural fix for the error mode in §5.1?** Three claims, same
failure. The mitigation so far is a written warning in the audit. That feels
weak for something that changed two slices' scope.

---

## Appendix

```
e69c223  external brief
af5cb79  verdict: READY, scoped to one domain
3fbfbd3  P1-5  consequence primitive
8b3303d  P1-4  creation defects
69f4df3  P1-3  clause resolution + 3 false alarms
a92b525  P1-2  normalized needs v1
b281eca  P1-1  seating + rain baselines
a829c30  audit corrections + the bounded-gap rule
7fddabf  P0-3  GOLD-07 cascade
3f52d5f  P0-2  guest-count authority
16a211c  P0-1  destination invariant
```

Each commit message carries its full reasoning; `git log 16a211c^..HEAD` reads
as the sprint narrative. Each slice has a ledger row with rollback risk.

**Harness note:** this container shipped Playwright browser build 1194 against a
repo pinned to 1228. Worked around with a browsers-path shim outside the repo —
**no repo file was changed for it** and `playwright install` was not run. On a
normal machine the suite runs unmodified.
