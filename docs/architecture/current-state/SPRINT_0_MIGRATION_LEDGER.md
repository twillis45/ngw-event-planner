# Sprint 0 — migration ledger

One row per change: **before behaviour → change → invariant → tests → affected
consumers → rollback risk.** Appended as each slice lands.

---

## P0-1 — Destination invariant

| Field | Detail |
|---|---|
| **Before behaviour** | `smartParseEvent` fires `isDestination: true` for any bare resolved city, marking it `destinationBasis: 'place-named'`. The ONLY thing preventing that guess from being persisted was `HostShellV2.jsx:1724-1726`, which downgraded it to `null` before calling `travelFieldsToPersist`. `travelFieldsToPersist` itself persisted any `effIsDestination === true` its caller handed it. |
| **Why it mattered** | `passGate.passVerdictAtCreation` reads `isDestination === true` as Model D door 2 and stamps the verdict **once**; the grandfather rule never recomputes it. A redesigned creation surface passing the parser's finding straight through would permanently and uncorrectably mark local parties as owing $39 — while looking correct. |
| **Change** | `src/lib/travelFieldsToPersist.js`: added `destinationIsGuess = destinationBasis === 'place-named' && manualIsDestination == null`, and `destinationAnswered` now requires `!destinationIsGuess`. The module no longer trusts its caller. |
| **Behaviour change** | **None.** Today's shell already passes `null` for a guess, so the persisted output is byte-identical. Proven by `the CURRENT shell composition (downgraded to null) also persists nothing`, which passed **before** the change. This is a safety net, not a behaviour edit. |
| **Shell left alone, deliberately** | `HostShellV2:1724` keeps its downgrade — the UI needs the tri-state for the chip's "unanswered" state. What moved is the **persistence** invariant, not the display logic. The shell is simply no longer the thing preventing the defect. |
| **Invariant** | #1 — *a guessed destination must not become a permanent destination/paywall fact* (planning package). Also reinforces #13 (*an event that began free stays free*). |
| **Tests** | New: `src/lib/__tests__/aGuessIsNotADestination.test.js` — 15 tests in 5 groups covering the four required properties (guess not confirmable · cannot trigger pass state · grounded evidence still commits · host answer and prior persisted decisions stay valid), plus a premise test that grounded and guessed differ only by basis. **Red first: 6 failed before the change, 9 passed (characterising existing behaviour), all 15 green after.** Existing `absenceIsNotAnAnswer`, `theHalfOfTheDayWasOurs`, `passGate`, `passEntitlement` all still green. |
| **Affected consumers** | `travelFieldsToPersist` has one runtime caller: `HostShellV2.jsx:8187`. `isDestination` itself is read by ~25 modules — none of their behaviour changes, because the persisted value is unchanged. |
| **Rollback risk** | **Very low.** Single pure function, one condition added, no caller signature change. Revert = delete one `&&` clause. The only way this changes live behaviour is if a caller *was* passing a guessed `true` — which the passing characterisation test proves today's caller does not. |
| **Regression suite** | Full jest **608 suites / 8,358 passed**, 1 skipped. |

---

## P0-2 — Guest-count authority

| Field | Detail |
|---|---|
| **Before behaviour** | A host who types eight words — *"Cookout on June 12, 2027"* — gets a **stored** `guestEstimate: 40`, substituted from the playbook's typical by the creation seam (`HostShellV2:8155`), which records the substitution honestly as `guestCountSource: 'playbook-typical'`. The provenance was written; almost nothing read it. Measured 2026-10-18: `guestCountIsConfirmed` had **exactly one** runtime consumer (`doItForMe`, fixed 2026-09-18 after `draftVendorOutreach` told a caterer "for about 40 guests"), while **32 files / 120 non-comment sites** read the headcount raw. |
| **Why it mattered** | This is a **gating** problem, not a data problem — which is what makes it cheap to fix and dangerous to leave. The redesign multiplies outward surfaces and money surfaces; every new one inherits the ungated read by default. |
| **Change 1 — OUTWARD** | `src/lib/webhookService.js`: `buildEventCreatedPayload.guests` is now `guestCountIsConfirmed(event) ? guestCountFor(event).count : null`. Also fixes a latent bug the line always had: it read **only** `guestEstimate`, so a LOCKED `guestCount` and a hand-entered roster — the two most reliable numbers in the event — were both sent as `null`. |
| **Change 2 — MONEY (budget)** | `src/lib/hostSpending.js:143`: `hasRealCount` is now `guestCountIsConfirmed(ev)`. The previously OR'd `guestCountResolved(ev).resolved` branch was **removed** — it answers *"are RSVPs settled?"*, and `playbooks/index.js:566` resolves an estimate-only event to `true`, which routed around the gate entirely. Enforces this module's own written rule: a guess *"must NOT become budget money."* |
| **Change 3 — MONEY (over-budget advisor)** | `src/lib/budgetRecovery.js:64`: same substitution, same dropped route-around. Its rule is *"say what's missing instead of inventing savings"* — and the one host whose count the app invented was the one host never told the count was missing. The right-sizing suggestion at `:200` is unaffected: it additionally requires a live roster, and a roster is the host by construction. |
| **Guard update** | `engineReachesTheShippingShell.test.js`: `guestCountFor` moved into the `hostLive` bucket. The guard computes `inHost` by **direct** hostv2 import; `guestCountFor` is reached transitively (hostv2 → `hostSpending` at `HostShellV2:156` → it) while `webhookService` gives it a CRA edge via `App.js:46394`, so it landed in `craOnly` unclassified. The comment records the route so the next reader does not re-derive it. |
| **Invariant** | *A number the app invented may not leave the app, and may not become money.* Companion to the established `startTimeIsConfirmed` pattern. |
| **Tests** | New: `src/lib/__tests__/anInventedCountDoesNotLeaveTheApp.test.js` — **15 tests in 4 groups**. Every assertion is **paired**: the invented fixture and the host fixture differ *only* in `guestCountSource`, and a premise test proves both resolve to the same number so a pass cannot come from the count being absent. Locked + roster controls prove the gate withholds inventions, not facts. **Red first: 4 of 11 failed before changes 1–2; 1 of 4 failed before change 3** (the three controls were already green, which is the point). |
| **Affected consumers** | Behaviour moves in exactly three places, all listed above. `doItForMe` was already gated. No signature changed; no caller was edited. |
| **Rollback risk** | **Low.** Three one-line predicate swaps in pure modules; revert = restore each expression. The widest blast radius is `hostSpending.hasRealCount`, which gates six downstream terms (`hasFood`, `foodBought`, `suppliesEstimate`, `suppliesBought`, `playbookCapacity`, `foodUnpriced`) — all of which now withhold money for an unconfirmed count, which is the intent. |
| **Regression suite** | Full jest **609 suites / 8,373 passed**, 1 skipped. |

### P0-2 classification — all 32 raw `guestEstimate` consumers

Required by the slice brief: classify every raw consumer, **migrate only where
semantically correct.** The gate is not a style rule — reading the raw estimate
is *correct* in four of the six categories. Only **outward** and **budget
money** are places where an app substitution does real damage.

| # | Category | Modules | Verdict |
|---|---|---|---|
| **D** | **Outward communication** — a third party reads the number and quotes against it | `webhookService.js` · `doItForMe.js` | **GATED — complete.** `webhookService` migrated this slice; `doItForMe` gated 2026-09-18. Verified exhaustive: `vendorContact.js`, `vendorIntelligence.js`, `guestTold.js`, `InviteV2.jsx` build outward text and **none** embeds a headcount. `cvbIntel.js` reads a count but only to decide whether the room-block *ask* appears — the number is never printed into it. |
| **E** | **Money calculation** | `hostSpending.js` · `budgetRecovery.js` · `perHead.js` · `vendorPlan.js` | **2 of 4 migrated.** The two that produce **budget money** are gated. The two below are not, deliberately. |
| **A** | **Canonical attendance** — should resolve through `guestCountFor` | `assembleRevealEngines.js` · `disclosure.js` · `intelEval.js` · `analyticsReader.js` · `hostIntel.js` · `closeoutIntel.js` · `taskEngine.js` · `phaseProgress.js` · `returnNarration.js` | **Not migrated — correct as-is.** These ask *"is there a number at all?"* to decide whether a surface applies. Gating them would hide planning surfaces from the host who most needs them. Consolidating the duplicated expression is a **refactor**, not a correctness fix, and is out of Sprint 0 scope. |
| **B** | **Legitimately raw intake estimate** | `guestCountFor.js:63` (the reader itself) · `HostShellV2:7161/:7325` (the two host write sites) · `ClientIntakeFlow.jsx` (the intake form binding its own field) | **Correct by definition.** These *are* the estimate slot. |
| **C** | **Display-only** | `CommandCenter.jsx` (5 sites) · `HostShellV2:474` | **Not migrated.** In-app copy shown to the host about her own event, already hedged (*"Planning for 40 · no replies yet"*). The host knows what she did and did not type; withholding here would degrade the surface without protecting anyone. |
| **F** | **Operational planning** — sizing a plan the host reviews before acting | `playbooks/index.js` (9) · `crabPlan.js` (2) · `lodgingIntel.js` (5) · `cvbIntel.js` · `placeIntelligence.js` · `confirmedCovers.js` · `vendorAccountability/conflicts.js` | **Not migrated — this is what a playbook typical is FOR.** `playbooks/index.js:377` falls back to `typicalGuests.default` explicitly: sizing a shopping-list preview from a typical is the honest use of a typical. The protection is at the **boundary** (money, outward), not at every internal sizing step. |
| — | **Fixtures and seed data** | `eventPool.js` · `demoSeed.js` · `App.js:5126` · `data/repastSampleEvent.js` · `data/sampleHostPlaybookDemo.js` · `data/wandaGoldEvent.js` · `vendorAccountability/fixtures.js` · `testUtils/decisionSoundnessFixtures.js` | Not consumers. |

**The two money sites deliberately left ungated, with reasons:**

- **`perHead.js:28`** — divides real money by heads, so it is a genuine
  candidate. It is left alone because it **already carries provenance on a
  different axis**: `headsFor` returns `stated: false` and the basis string
  *"nobody said whether you are in this number"* when the host has not said
  whether she is counted. Adding a second, differently-shaped honesty flag to
  the same return without designing how a caller renders both is how a
  consequence surface accumulates contradictory hedges. **This belongs in P1-5
  (the open-question primitive), not here.**
- **`crabPlan.js:107/312`** — sizes the crab order, the single biggest cost on
  a Crab Feast. `hostSpending` only counts crab money when `ev.crabPlan`
  exists, i.e. the host has engaged the planner and entered her own prices, and
  the module already prefers explicit host numbers and real guest answers
  (`picksCrabs`) over the count. Gating the count would not change the money
  path, only the suggested quantity. **Measured, not assumed; recorded so the
  next pass does not re-derive it.**

**`App.js` (48 sites) is excluded by the A1 freeze** — donor-only, deletion
scheduled post-Sprint-2. No change was made there.

---

## P0-3 — GOLD-07, the RSVP cascade end to end

| Field | Detail |
|---|---|
| **Before behaviour** | Every hop of the cascade had coverage and the **cascade had none**: no spec in either suite walked `public RSVP → backend → read-back → canonical attendance → Food → Shopping → Seating → Money → ranked plan`. Seating had no e2e at all. Two structural reasons, both measured: jest cannot execute hostv2, so the read-back's 18-line snake_case→camelCase mapping (`HostShellV2:6893`) is unreachable from unit tests; and the shared e2e build bakes **no** `REACT_APP_API_BASE_URL` (the built index chunk's whole env object is `{NODE_ENV:"production"}`), so `isRsvpApiConfigured()` is false, `submitRsvp` throws before it fetches, and the read-back effect returns on its first line. The backend leg had never been executed by any test. |
| **Change** | **Test-only — no runtime code changed.** New spec `hostv2/e2e/gold07RsvpCascade.spec.mjs` (2 tests, 9 asserted boundaries). New bundle `dist-gold07` + `.env.gold07`, wired as a third `webServer` on port 5255, mirroring the sync harness's own bundle and for the same reason. Registered in `VIEWPORT_INDEPENDENT` (desktop only): it asserts text and payload fields, never a box, and is the most expensive spec in the suite per run. |
| **Why its own bundle** | Baking an API base into the SHARED bundle would change what all 126 specs run against. `fixtures.mjs` already records what happened the last time a truthy API base reached every surface at once: each one fired a request at a host that cannot resolve, and two specs asserting "no console errors" went red for reasons unrelated to them. |
| **What it pins** | 1 backend-resolved invite · 2 the POST body on the wire (`name`, `rsvp`, `kids: 2`, `allergens: ['Peanut']`, non-empty `idempotency_key`) · 3 the roster after the snake_case mapping · 4 canonical attendance (*5 said yes · likely 7 on the day · 2 kids*) · 5 Food sized `0–6 guests` → `7 guests` · 6 the shopping list gaining a line from a dietary answer · 7 Seating going from its empty state to `0 of 5`, `Kids 2`, `Veg 1` · 8 Money rising, food priced `across 7 guests` · 9 the ranked plan **swapping jobs**: *"6 guests still have not replied"* disappears and *"5 confirmed guests still need seats"* takes its place. |
| **Design — the guest is a stranger** | Her context has empty `localStorage`, so the invite cannot resolve from the local pool and must come back from the backend — which is what happens to every real guest tapping a link on their own phone. Seeding the event into the guest's browser would test the owner's demo device and call it a remote RSVP. Denise's read-back row is built **from the POST body captured off the wire**, not a hand-written fixture that happens to agree with it. |
| **Design — before and after in one run** | Every number is measured twice against the same bundle and the same price vintage. Asserting literal dollars would fail on the next price refresh for no product reason; asserting only "it changed" would pass if it changed to nonsense. |
| **Red-proof, and a defect it found in ITSELF** | Deleting `allergens: r.allergens` from the read-back mapping left the spec **GREEN**. The invite derives the free-text `needs` from the same selection, and the roster chip dedupes the structured array against `needs` (`HostShellV2:23629`), so that field's loss is invisible on a row where both carry the same word — exactly the data-loss class the code's own comment records. Fixed by giving one guest a structured allergen with no matching free text; the spec is now genuinely red when that line is removed, and green when it is restored. Both states verified. |
| **A finding that was NOT a defect** | *"Soft RSVPs across households — real count unknown"* persists after every guest has replied. Checked before asserting it: playbook risks are authored static contingencies, deliberately non-reactive (`surfaceRegistry:134` — *"a static contingency is not an emergency"*). Correct as built; not asserted as a failure. |
| **Invariant** | The cascade is the contract. A redesign may move any of these surfaces, but a reply must still reach all nine. |
| **Rollback risk** | **None to runtime.** Test-only. Reverting = delete one spec, one env file, three package scripts, and one webServer block. The only cost to the suite is ~9s of extra build and one more preview server per run. |
| **Verification** | `gold07RsvpCascade` 2 passed; neighbouring specs (`guestReplyPicker`, `noKitchenNoShoppingList`, `theCouplesSheSaidReachTheList`, `guestTold`) 15 passed; `npm run parity` clean; CRA jest `guestMerge`/`rsvp` 35 passed. Suite total 3,334 tests in 125 files, the new spec routed to `desktop` only. |
| **Harness note (environment, not repo)** | This container ships Playwright browser build 1194 while the repo pins a version wanting 1228. Worked around with a browsers-path shim in the scratchpad — **no repo file was changed for it**, and `npx playwright install` was not run. |

---

## Verdict rule — what may be carried into READY (adopted 2026-10-18)

Sprint 0's P1-2 and P1-4 both instruct: *do not pretend parsing solves the
capability — preserve as unapplied truth until a canonical model exists.* That
is the right call, and it creates a hazard at the end of the sprint: a slice
can legitimately close with a recorded gap instead of code, and a single
boolean `READY` would hide it.

So `READY` is not a boolean over "everything works." A gap may be carried into
it only as **BOUNDED**, which requires all three:

1. **Named** — in this ledger, with the evidence for why no truthful
   destination exists. Not "we ran out of time"; "we looked, and here is what
   we found."
2. **Un-implied** — no redesigned surface will suggest the capability exists.
3. **Tested** — a test proves the app does not CLAIM what it lacks.

Anything failing any of the three is **BLOCKING**: the verdict stays NOT READY
until the gap is closed or the owner explicitly accepts it. **A gap with no
honesty test is automatically blocking** — that is the whole load-bearing
clause, because an untested non-claim is just an intention.

This is not a new mechanism. It is the rule the repo already applies to CTA
truthfulness (UX_07), to `BUILT_NOT_WIRED`, and to `unusedClauses` itself —
which exists precisely so the app can say "I did not use this" out loud instead
of silently dropping it. The verdict should be held to the same standard the
product is.

**Expected application, measured 2026-10-18:** one candidate
(`"2 excursions"`). The other three clauses previously classified as capability
gaps were re-traced and found to be wiring gaps with existing destinations —
see the CORRECTED table in `CREATION_TRUTH_AND_INTAKE_AUDIT.md` §2.

---

## P1-1 — Seating and Rain parity baselines

| Field | Detail |
|---|---|
| **Before behaviour** | Both surfaces had real unit coverage (`seatingPlan.test.js`, `rainPlanReadiness.test.js`, `rainAssist.test.js`) and **zero browser coverage**. jest cannot execute hostv2, so everything between the engine and the host — which control exists, what it is labelled, what a tap writes, what the sheet says when the answer is absent — was unmeasured. That is precisely the surface a redesign touches. |
| **Change** | **Test-only — no runtime code changed.** New `hostv2/e2e/seatingAndRainBaseline.spec.mjs`, 9 tests, added to `VIEWPORT_INDEPENDENT` (desktop only: all assertions are on text, stored state, or control presence; nine tests across six more geometries would buy 54 identical results). |
| **Framing** | **Characterisation, not specification.** Every assertion records what the surface DOES today. If one goes red during the redesign the first question is "did we mean to change that?", not "fix the test". |
| **Scope boundary** | Deliberately does not overlap GOLD-07, which owns seating's empty→populated transition as a consequence of replies. This file owns the populated surface's own behaviour. |
| **Seating — what is pinned** | Only confirmed guests are seated (`0 of 5` from six rows; the NO is absent entirely) · the three tallies, each traceable to one roster field — `Veg 1` from `meal`, `Kids 2` from `kids`, `Wheelchair 1` from `access` · the table suggestion explains itself (*"1 table — what a reunion this size usually needs"*) rather than appearing as an unarguable number · tap-name-then-table assigns for real on both sides (`Seated so far 1 of 5`, `Table 1 Veg 1 1 seated`), is reversible in place (`unseat`), and opens the table's own shape/capacity settings with it. |
| **Seating — the one most likely to be lost** | A structured `access` entry does not merely increment a counter; it produces a sentence naming who and what: **"Seat with easy access: Tonya Brooks — asked for a step-free spot."** A tally is not actionable while seating people; a named instruction is. |
| **Rain — what is pinned** | The ask reaches the ranked plan · the sheet states the ABSENCE as the state (*"Open sky and no backup named yet"*) instead of rendering an empty control · all six options exist, including **"Rain or shine"** — declining a backup is a real answer the surface accepts, not a gap it nags about · the written-for-you text is previewed BEFORE it is accepted · picking writes the host's words verbatim and advances to telling the guests, where the draft is **host-sent, never app-sent** (*"Mark it sent — I sent it myself"*) · `"Do it for me"` writes exactly what it previewed, compared on the visible (pre-ellipsis) substring · an answered event is not asked again. |
| **Rain — CTA truthfulness** | The forecast-watch offer states its own limit (*"While the app is open…"* / *"Lock-screen alerts land when the installable app ships"*) rather than claiming a push it cannot send. Pinned because a redesign rewriting this copy is exactly when a caveat goes missing (UX_07). |
| **Negative control** | A Birthday in a named ballroom is never asked for a rain plan — the gate is `phaseProgress.js:322` (`OUTDOOR_TYPE` on the event type, or `isLikelyOutdoor` on venue/notes). Without this the whole rain block could pass on an app that asks everyone. |
| **A discrepancy checked and dismissed** | `phaseProgress.js:12` says *"indoor events never count a rain plan"* while `:325` appeared to add the row unconditionally. Misread on my part — the row is gated by `outdoor && !noDate` at `:322`. The comment is accurate. Recorded so the next reader does not re-raise it. An earlier probe appearing to show an indoor event being asked used a fixture field (`indoor: true`) that does not exist in the app; the real field is `indoorVenue`. Not asserted. |
| **Invariant** | These are the behaviours the redesign must either preserve or change on purpose. |
| **Rollback risk** | **None to runtime.** Test-only; revert = delete one spec and one config entry. |
| **Verification** | 9 passed on first run and again on a full-project run (11 passed with GOLD-07 alongside); routing confirmed `desktop` only. |

---

## P1-2 — Normalized Needs v1

| Field | Detail |
|---|---|
| **Before behaviour** | A host types *"…sit-down lunch, she uses a walker"* and the clause has nowhere to live. The gate called this a downstream capability gap and claimed no accessibility module existed — **false**, and corrected in the intake audit. The real defect is smaller and worse: **two consumers, two vocabularies, two source fields, no owner.** `seatingPlan.guestNeedsAccessibleSeat` read `access[]` AND `needs` against `/wheel\|accessib\|ada\|step-free\|mobility/` — **blind to "walker"**. `lodgingIntel`'s step-free must-have read `needs` ONLY against `/wheelchair\|step-free\|stairs\|mobility\|walker\|cane\|elder/` — **blind to the structured invite answer**. So the same guest got a ground-floor bedroom and no reachable seat, or the reverse, depending on which box her need was typed into. `confirmedCovers.js` already named this shape: *"A concept with eight implementations has no owner."* |
| **Change** | New `src/lib/accessNeeds.js` — one owner holding the vocabulary **and** the rules that read it, per `dietRows.js`'s recorded lesson that splitting those is how they came apart last time. v1 carries exactly **one** kind (`step-free`), because one is what the evidence supports. Dietary is NOT folded in: it has its own owner and answers a different question. |
| **Vocabulary** | The union of both old regexes plus `walker`, word-bounded so `"walking tacos"` and `"hurricane"` are not access needs. Neither consumer loses a word it had. `elder` is kept and marked `basis: 'inferred'` — it is the one term that infers from age rather than a stated need, retained only because lodging already acted on it and silently dropping a working behaviour would be worse. |
| **Consumers migrated** | `seatingPlan.guestNeedsAccessibleSeat` → now sees "walker". `lodgingIntel` access count → now sees the structured array, and also the host's intake-stated need. |
| **Intake** | `heardAccessNeeds(text)` at the creation seam (`HostShellV2:8224`) — the same seam, shape and rule as `lodgingWants` immediately above it. **The parser is untouched**: `smartParseEvent` owns the event's skeleton and an operational need is not part of it. Clause-level, so `"she uses a walker"` is kept without dragging in `"sit-down lunch"`. |
| **Two hard lines, both tested** | **No diagnosis** — the output names equipment and a route, never a condition; a test asserts the serialized requirement contains none of `disab / impair / condition / diagnos / patient / illness / elderly`. **No invented person** — `"she"` names nobody this app knows, so `who` stays `null` rather than being resolved to whichever roster row seems likeliest. |
| **The five domains, measured** | `seating` **WIRED** (already tallied and named the guest) · `lodging` **WIRED** (already steered the search) · `place` **NOT** — no venue-accessibility data exists to check a step-free requirement against · `ground` **NOT** — only a per-guest free-text passthrough (`travelPlan.js:278`), no consumer would act on a derived requirement · `the-day` **NOT** — nothing. The three unwired are **reported, not hidden**: `notYetApplied` is computed so a surface can say "recorded, and here is where it has not reached." |
| **An overclaim I caught and corrected mid-slice** | The first cut reported `appliedTo: ['seating','lodging']` for every requirement. Wrong for an intake-stated one: lodging is sized by the **count** of people needing a step-free route, so an unnamed need reaches it honestly; seating seats **people** — one tally entry per roster row, and its instruction names the guest. A nameless need cannot reach seating without inventing someone to attach it to. Each requirement now reports its own reach, and `seating` is listed in `notYetApplied` for a host-said need. |
| **Invariant** | One access need, one answer, reaching every domain that can act on it truthfully and none that cannot. |
| **Tests** | `src/lib/__tests__/oneAccessNeedOneAnswer.test.js` — **26 tests** red-first (module absent, then the two consumer blind spots). Vocabulary asserted as a table rather than a loop, because jest takes no message argument and a bare `toBe(true)` in a loop cannot name the failing word. Browser: `hostv2/e2e/theWalkerReachesThePlan.spec.mjs` — 2 tests proving the need reaches the screen (*"✓ Step-free access / Someone asked about stairs"*), with a negative control that **caught a real imprecision**: every must-have renders as a choosable option, so a bare `/Step-free access/` assertion passed on an event with no need. The ✓ is the discriminator. |
| **Affected consumers** | `seatingPlan` (8 call sites via the unchanged exported name), `lodgingIntel` (one count), `HostShellV2` (one creation-seam field). |
| **Rollback risk** | **Low-moderate.** The vocabulary broadened, so seating now counts guests it previously missed — that is the fix, and it can change a visible tally on existing events. Revert = restore the two inline regexes and drop the new module. |
| **Regression** | Full jest **610 suites / 8,399 passed**, 1 skipped. Browser: walker 2, seating/rain 9, GOLD-07 2, `lodgingCockpit` 20 — all green. |
| **Found, not fixed here — sizes P1-3** | Every clause consumed at the CREATION SEAM is still reported to the host as *"Didn't make it into the plan"*, because `unusedClauses` is a pure function of the PARSER's output. Measured: `"a house with a hot tub"` → consumed as `lodgingWants`, reported unused · `"resort spa"` → consumed as `lodgingStyle`, reported unused · `"she uses a walker"` → now consumed as `accessNeeds`, reported unused. Three false alarms in the exact class that module says it is biased against (*"a false alarm costs them the belief that the list means anything"*). Pre-existing for two of the three; P1-2 adds the third. **P1-3 fixes the class, not the instance.** |

---

## P1-3 — `unusedClauses` resolution

| Field | Detail |
|---|---|
| **The brief's premise, corrected** | The slice asked for resolution so a clause does not *"endlessly resurface"*. Measured: `unusedClauses` has exactly **one** render site (`HostShellV2:9504`), in the creation flow, computed live from the text in the box — and the text was never stored. Nothing resurfaced. The clause was shown **once**, while the host was still typing the event into existence, and then lost for good. *"Worth keeping in mind yourself"* was the app's last word on it. The real gap is persistence and an answer, not suppression. |
| **Defect 1 — three false alarms** | The creation seam reads the same sentence with three consumers the parser knows nothing about (`heardMustHaves`, `heardStayStyle`, `heardAccessNeeds` at `:8222-8224`) and writes real fields from them. `unusedClauses` only ever re-parsed, so everything they consumed read as unused: `"a house with a hot tub"` → `lodgingWants:['hottub']`, `"resort spa"` → `lodgingStyle`, `"she uses a walker"` → `accessNeeds`. All three reported *"Didn't make it into the plan"*. Two pre-existing; **P1-2 added the third**, which is how the pattern surfaced — the count grows by one with every new seam consumer. |
| **Fix 1** | `unusedClauses(text, { alsoDerives })`. The differential mechanism is **unchanged** — it still asks "does removing this clause change what we derived?" — only "what we derived" now means everything creation derives, not just the parse. **Injected, not imported**: reaching for `lodgingIntel` from the parser would drag it onto the guest invite's critical chunk, which `guestPayloadGate.spec.mjs` exists because it has regressed once already. A seam reader that throws contributes a constant rather than silently restoring the alarm it was added to remove. |
| **Fix 2 — the resolution model** | New `src/lib/heardClauses.js`. **It stores her SENTENCE (`createdFromText`), not the list derived from it**, and that single choice is what keeps it from becoming the parallel system the brief forbids: the day a consumer starts reading a clause, the differential stops reporting it — on every existing event, with nothing to backfill. A stored list would have frozen the clause as dropped and needed a migration to unfreeze. Acknowledgement is one entry in a status map keyed by clause, in the same shape `riskStatus` already uses (`surfaceRegistry.js:80`) — not a new idiom. |
| **The two exits stay distinguishable** | **Canonical write** needs no control at all and no host involvement. **Acknowledged** records "I know, I'll handle it" and is explicitly **not deletion** — it stays in `clauseStatus` and is undoable, because a host who dismissed something by accident should not have to retype her sentence to recover it. |
| **Runtime** | Creation now persists `createdFromText` and passes `SEAM_READERS` (declared once, so the creation screen and the post-creation list cannot drift). The post-creation block sits beside the plan-parts count — the block that already answers "what does the app know about my event", where an honest answer includes what it heard and cannot hold. |
| **Invariant** | The app never reports as unheard something it acted on, and never asks twice about something already answered. |
| **Tests** | `src/lib/__tests__/iHeardThisTooAndThenWhat.test.js` — 17 tests, including a **premise test that reproduces all three false alarms** with the old call shape, so the three suppression assertions cannot pass for an unrelated reason, and a test proving a clause leaves the list when a consumer starts reading it *without anything being acknowledged*. Browser: `hostv2/e2e/theClauseGetsAnAnswer.spec.mjs` — 4 tests. |
| **Two harness errors this slice caught in its own tests** | (1) A page-wide `not.toMatch(/“sit-down lunch”/)` after tapping Noted **failed against working code** — the confirmation toast quotes the clause back, so the test was reading the app's own acknowledgement of what it had just done. The write had persisted correctly. Assertions now scope to the block heading. (2) `page.reload()` re-runs `addInitScript`, which re-seeded the pristine event and erased the acknowledgement — making the survives-a-reload test fail against correct behaviour. `lodgingCockpit.spec.mjs` records the same trap from the other direction. The seed is now conditional. |
| **Also fixed** | `hostSpending.js` carried an orphaned `guestCountResolved` import from P0-2's route-around removal — caught by `gate:cra` (242 warnings against a 241 baseline), now back to 241 of 241. |
| **Rollback risk** | **Low.** `alsoDerives` is opt-in and absent callers behave exactly as before. The new field and module are additive; removing them restores the previous behaviour with no data migration, since nothing was written that the old code reads. |
| **Regression** | Full jest **611 suites / 8,416 passed**, 1 skipped. Browser: 17 across the four new specs. `gate:cra` clean. |

---

## P1-4 — Creation defects

| Field | Detail |
|---|---|
| **Defect 1 — `venueCity: "the"`** | `"40 guests in the Maryland/DC area"` committed `venueCity: "the"`. **One character causes it.** The spelled-out-state matcher (`smartParseEvent.js:968`) is written `([A-Z][a-zA-Z…]+)\s+(<state names>)`, and that leading `[A-Z]` is load-bearing — the comment eighty lines above calls the capital *"a cheap proper-noun test standing between 'in the backyard' and a fabricated destination event."* But the pattern carries `i` so state names can be typed in any case, and `i` applies to the whole regex, so `[A-Z]` matches lowercase and the test silently stopped happening. |
| **Why it mattered** | `venueCity` feeds geocoding, weather, the shopping list, lodging search and maps. `"the, MD"` geocodes to nothing and every one of those goes quiet with no error — the exact silent failure `cityText.js` exists to prevent. |
| **Fix 1** | The file already owned the right vocabulary: `NOT_A_PLACE` lists `the`, `our`, `my`, every month and weekday. It was declared ~100 lines **below** this branch, so referencing it there would have been a temporal-dead-zone throw — the branch could never have had a guard. Moved to module scope and applied. The `i` flag stays (the state half genuinely needs it); the guard is by name instead. Commits **nothing** rather than guessing a better city: `"Maryland/DC area"` is a region, not a `City, ST`, and this file's standing rule is that a guessed location is worse than asking. |
| **Defect 2 — the theme needed its own name** | `"black and gold theme"` → `theme: "black and gold"`. `"black and gold"` → `null`, with both words reported to the host as dropped. The commonest phrasing was the one that failed. |
| **Fix 2** | A colour-pair reading, deliberately narrow: **two or more** colours, from a **closed vocabulary**, in a run containing colours and separators and nothing else. So `"black tie optional"` is a dress code and `"red velvet cake"` is a cake, both still null — asserted. Recorded as `themeBasis: 'colors'` against `'stated'`, because reading a pair as a decision is a weaker claim than the host naming it, and flattening the two would lose that. |
| **A stale ruling this corrected** | `smartParseEvent#healthNoted` (2026-10-06) records: *"A MOBILITY AID. A walker is not a cardiopulmonary condition. 'She uses a walker' stays in the disclosure block, honestly declared, **because no slot exists for it and inventing one would be the worse error**."* P1-2 created the slot. The comment now records that, and records that a walker still never reaches `healthNoted` — that field answers whether altitude or a heart/lung problem puts someone at risk, and a mobility aid is not evidence of either. Two questions, two slots, neither borrowing the other's meaning. Left uncorrected it would have read as a standing refusal of work already done. |
| **Canonical destinations, identified BEFORE touching the parser** (the brief's precondition) | |
| → `"formal Army recognition followed by a celebration"` | **Destination exists** — `event.ros` / `event.timeline`, ordered segment arrays read by `vendorQuestions.js:243,372,435`, `rosOverlap.js` and `dayPhases.js:123`. A **wiring** gap, not a schema gap. Not wired in Sprint 0: parsing a programme sequence into ordered segments is a new capability, not a defect repair. |
| → `"food"`, `"bar"`, `"photography"` | **Destination exists** — `vendorCategoriesByType.js` makes `Catering`, `Mobile Bar` and `Photography` first-class per event type, and `event.vendors[].category` is their home. A **wiring** gap. Not wired in Sprint 0 for the same reason; also the `"DJ"` asymmetry noted in the audit is explained by this — all four share one schema, so it was never evidence of a missing one. |
| → `"2 excursions"` | **NO TRUTHFUL DESTINATION — the one real gap.** `Activities` is a canonical vendor category for Reunion, but a vendor row needs a vendor; `event.timeline` needs a day and a thing. A bare count of unnamed outings gives neither. Writing either would fabricate structure the host did not provide, which is precisely what the brief forbids. **Preserved as unapplied truth** via P1-3: the sentence persists, the clause stays visible and answerable, and it will leave the list on its own the day a consumer can read it. |
| **Gap classification (verdict rule)** | `"2 excursions"` is **BOUNDED**: named with evidence above · no redesigned surface implies the capability · and the honesty test exists — P1-3's block shows the clause and `theClauseGetsAnAnswer.spec.mjs` proves it on screen. The two wiring gaps are **not gaps in the verdict sense**: the destinations exist and are reachable; connecting intake to them is redesign work, not a readiness blocker. |
| **Invariant** | The parser commits nothing it cannot name, and declares what it could not place. |
| **Tests** | `src/lib/__tests__/theTownAndTheColors.test.js` — 14 tests, red-first (8 failed before). The two CONTROLs (`"in Santa Fe New Mexico"` and the lowercase whitelist path) and both NEGATIVEs passed **before** the change, so the repairs are proven not to have bought their fix with a regression. `parseCorpus.mjs` `PARSER_FIELDS` updated — the guard that caught the new field doing its job. |
| **Rollback risk** | **Low.** Two local parser changes; revert = drop one guard clause and one matcher. The new field is additive. The town fix can only ever commit *less*, never something different. |
| **Regression** | Full jest **613 suites / 8,431 passed**, 1 skipped. Browser 18 passed. `gate:cra` clean at 241 of 241. |

---

## P1-5 — The narrow consequence / open-question primitive

| Field | Detail |
|---|---|
| **The gap, stated precisely** | Derive-on-read answers *"given everything known, what is true?"* and answers it well — a single event blob, pure authority modules, nothing cached, so nothing can go stale. It has no way to say *"answering that question has made a DIFFERENT question relevant, and nobody has asked it."* Those are not the same, and the gap shows up as a fact the host told us sitting recorded and inert because the thing that would have made it actionable arrived later. |
| **Change** | New `src/lib/openQuestionsFor` (`src/lib/openQuestions.js`) — **pure, one rule**. Plus **one** raiser (`surfaceRegistry` id `openquestions`) so `eventPlan()` ranks it like every other job. Not a dependency graph, not a rules engine; derive-on-read is untouched. |
| **The reference case is real, not an illustration** | P1-2 normalised `"she uses a walker"` into a step-free requirement, wired it to the two domains that could act truthfully (seating, lodging), and recorded `place` as **deliberately not reached** — a step-free requirement cannot be checked against a venue the app knows nothing about. That is still the honest answer about an *unnamed* venue. It stops being the whole story the moment the host names one: now there is a specific building, a specific unknown, and exactly one party who can settle it. |
| **What it produces** | *"Is there a step-free way into The Lodge at Santa Fe?"* · because *"You named The Lodge at Santa Fe, and you said 'she uses a walker' needs a step-free route."* · ask **the venue**. The `because` is not decoration: a question that cannot say what made it relevant is indistinguishable from a form field nobody asked for. |
| **It does not answer itself** | The app holds no accessibility data for any venue and will not invent any. It names the unknown, names who can settle it, records what she finds out, and stops asking. A test asserts the output contains no hedging verb (`probably`, `likely`, `should be`, `we think`, `appears`). |
| **Both halves required** | A venue with no access need asks nothing — otherwise this becomes a checklist. A need with no venue asks nothing — there is no building to ask about. Both negative controls are asserted in unit **and** browser tests; without them the positive tests would pass on an app that asks every host about every venue. |
| **"No" closes it as firmly as "Yes"** | *"There are steps"* is information the plan can use, not an unanswered question. Re-asking it would be exactly the resurfacing P1-3 had just finished removing from the clause list. |
| **ONE raiser, and why it earns its place** | The brief warns against raisers added for domain-count symmetry. This one has a real, narrow attention condition requiring all three of: a named venue · somebody needing a step-free route · nobody having said whether that building has one. Severity `attention`, never `critical` — a thing to find out is not an emergency, the same line the risks surface draws. `eventPlan()` remains the final prioritisation authority; this only raises. |
| **Invariant** | A decision that makes something newly unknown says so, names who can answer it, and never answers it itself. |
| **Tests** | `src/lib/__tests__/weNowNeedToKnow.test.js` — 16 tests (16/16 first run). Browser: `hostv2/e2e/weNowNeedToKnow.spec.mjs` — 4 tests including both negative controls and the survives-a-reload check, which also asserts `venueStepFree` on the stored event rather than only its absence from the screen. |
| **A guard that worked** | `registryCompleteness.test.js` failed on the new surface id — its contract list exists so *"a brand-new id arrives by expanding the contract consciously (and wiring its consumer), not by side door."* Declared with the reasoning, as the gate asks. |
| **Rollback risk** | **Low.** One pure module, one raiser, one additive field, one UI block. Revert = remove the surface entry and the import; nothing else reads `venueStepFree`. |
| **Regression** | Full jest **614 suites / 8,447 passed**, 1 skipped. Browser 4 passed. `gate:cra` 241 of 241. `parity` clean. |

---
---

# Sprint 0.5 — architecture challenge

Same format. Four decisions, recorded 2026-10-19. Full reasoning, alternatives
and worked examples: `SPRINT_0_5_ARCHITECTURE_DECISIONS.md`.

**A rename that reaches back into this document.** P1-5's row above describes
`src/lib/openQuestions.js` and registry id `openquestions`. Decision 3 renamed
both (`placeQuestions.js`, `placequestions`). The row is left as written —
it records what P1-5 did — and this note is the forwarding address.

---

## D1 — Attendance provenance

| Field | Detail |
|---|---|
| **Before behaviour** | `attendanceBand(event)` — which `HostShellV2:3887` calls *"the canonical reader"* and `:4040` says *"owns the question"* — returned **byte-identical output** for a headcount the host gave and a number the app substituted from a playbook typical. It is also the AI orchestrator's headcount tool (`orchestratorTools.js:36` `get_headcount`), so a model answering *"how many are coming?"* could not tell whose number it was reading either. |
| **What Sprint 0 got wrong** | It planned to BUILD this authority (`attendanceFor()`). It already existed, returning the exact shape the challenge proposed — `{applicable, basis, low, high, planning, confirmed, maybe, pending, declined, kids, invited, band, because}`. **No new module was created.** A second reader would have duplicated truth across 42 dependent test files to make the architecture look tidier. |
| **The genuine misclassification** | `vendorAccountability/conflicts.js` was filed under "operational planning" and left raw. It is the **outward/commitment boundary**. Measured with `guestCountSource: 'playbook-typical'` 40 against a CONTRACTED caterer at 60: severity `high`, *"Caterer expects 60; guest tracker shows 40."*, fix *"Match the guest tracker (40)"*, patch `{guestCount: 40}` onto the vendor, receipt *"Caterer set to 40 — it matches your guest tracker now."* The app offered to rewrite a contracted vendor's headcount to a number the host never gave. |
| **Change** | (a) `playbooks/index.js:600` — `attendanceBand` gains `countSource` + `countFromHost` from `guestCountFor`, spread into all three branches; the roster branch hardcodes host, because people entered one at a time are hers by construction. (b) The `because` string gains *"— not a number you gave, we filled that in from what this kind of event usually runs"*, so every surface already printing the reason prints the provenance, with no new wiring. (c) `conflicts.js:167-170` gates the estimate term on `guestCountFor(event).fromHost`. |
| **Numbers changed** | **None.** `guestCountFor`'s resolution order is the order every existing reader already used. Only the fact of whose number it is was added. |
| **Raw reads: A, B or C** | **C — use the existing authority** for the one misclassified consumer. **A — keep raw** for the other 23, under a gate rather than a document. Mass migration was explicitly ruled out and would have broken sizing before RSVPs land. |
| **How #33 is stopped** | `theHeadcountHasOneCanonicalReader.test.js` — a lower-never-raise ratchet over every file reading `guestCount`/`guestEstimate`/`guests.length`. A new reader must declare WHICH of seven semantic questions it asks and why the raw field answers it, or use a canonical reader; the failure path names all five canonical readers. Not a ban — a question #33 cannot avoid. Carries a THE-GATE-BITES guard against a dead regex and a staleness check, because a list that over-claims is a list that lies. |
| **Invariant** | #8 (*a guessed headcount must not become money, or leave the app*) — now also enforced at the vendor-commitment boundary. #5 tightened. None weakened. |
| **Tests** | `thePlanningCountKnowsWhoseItIs.test.js` (16) · `anInventedCountIsNotAVendorConflict.test.js` (7, **2 red first**) · `theHeadcountHasOneCanonicalReader.test.js` (5). GOLD-07's 9 boundaries re-run green. |
| **Affected consumers** | `attendanceBand`: 2 additive fields, no existing field changed — every current caller is unaffected. `conflicts.js`: an invented count now produces no conflict row, no fix button and no patch. |
| **Rollback risk** | **Low.** Two additive fields and one guard clause. Revert = drop `_provFields` from three spreads and one ternary. |
| **A build I broke and how** | `npm run gate:cra 2>&1 \| tail -2 && git commit` — a pipeline's exit status is the LAST command's, so `tail` succeeding let a commit land on a gate that had printed *"This is a real build error"*. Root cause: `import { guestCountFor } from '../guestCountFor'` extensionless, in the one directory where webpack is strict ESM. Fixed with `.js` (`b8ea88c`), and every gate since is verified **by exit code**. |
| **Regression** | Full jest **616 suites / 8,480 passed**. `gate:cra` 241 of 241, by exit code. |

---

## D2 — The clause derivation contract

| Field | Detail |
|---|---|
| **Before behaviour** | `unusedClauses(text, { alsoDerives })` was the public entry point. A caller who omitted `alsoDerives` silently got three false *"we didn't use this"* alarms back — the host told her sentence was not understood, which is the one thing that list exists not to get wrong. The requirement was documented in a doc comment: the same shape as P0-2's provenance field, written everywhere and read by almost nothing. |
| **Change** | `heardClauses.js` becomes the **composition root**: it imports `heardAccessNeeds`, `heardMustHaves`, `heardStayStyle` itself as `SEAM_READERS` and supplies them. `clausesNotUsed(text)` and `heardNotUsedFor(event)` take no options. **There is no second argument to forget.** `unusedClauses` is unchanged and still exported — its own tests drive it to reproduce the defect. |
| **Rejected alternatives** | A register-on-import registry (moves correctness from "remember an argument" to "depend on load order" — same bug, harder to see) · a required argument you can pass `[]` to · parser-owned registration, which would import the planning engine into the parser and is forbidden. |
| **Chunk boundary, measured not assumed** | `InviteV2.jsx` and `inviteShared.js` import neither `heardClauses` nor the parser, so the root adds nothing to the chunk a guest downloads — the boundary `guestPayloadGate.spec.mjs` protects. Dependency points down, root → parser: no cycle. |
| **Enforcement** | `theClauseReadersAreNotOptional.test.js` — the repo's `CALLED_FROM_OUTSIDE` idiom: a scan of `src/lib` + `hostv2/src` for a *call or import* of `unusedClauses`, failing on anything outside the definition and the root, with a THE-GATE-BITES companion. Block comments stripped before line comments, because the shell discusses this mechanism in two JSX `{/* … */}` comments whose continuation lines carry no marker — a line-only strip reported the shell as a caller after it had already been migrated. |
| **Future seam consumers** | One line in `SEAM_READERS`. The differential behaviour is untouched, so a new reader still removes its clause from the list on every existing event with nothing to backfill. |
| **Invariant** | #3 (*unused clauses cannot silently disappear*) — correctness no longer optional. |
| **Tests** | `theClauseReadersAreNotOptional.test.js` (6). **One existing test re-anchored, not weakened**, with the distinction recorded in place: `iHeardThisTooAndThenWhat`'s canonical-write-path test simulated a future reader through the removed `heardNotUsedFor(ev, opts)` argument; it now asserts the same property at `unusedClauses`, where the differential comparison actually lives. Required behaviour kept, obsolete implementation detail dropped. |
| **Affected consumers** | `HostShellV2.jsx` — two call sites, both already using the root. No product surface calls the mechanism. |
| **Rollback risk** | **Very low.** Two wrappers and one import list. |
| **Regression** | Full jest green; `gate:cra` 241 of 241 by exit code. |

---

## D3 — The consequence primitive, challenged with two more cases

| Field | Detail |
|---|---|
| **Before behaviour** | One rule (`openQuestions.js`), one raiser, and an open question about whether the abstraction was right. |
| **CASE A · attendance × outdoors → a permit** | A materially different shape: not two facts coexisting but a **derived number crossing a line**. And the app had said it all along — `placeIntelligence.js:182` pushes exactly this sentence as a `notes` entry, `derivePlaceIntelligence` is **not** in `surfaceRegistry`, and the only renderer of `pi.notes` is `src/App.js:41420`, the **frozen** CRA shell, in a card collapsed by default. Unraised, unanswerable, unresolvable, and absent entirely from the shipping shell. **Found inert, not absent.** |
| **CASE B · vendor × schedule window** | `vendorAsks.js:82` raises an arrival-time ask through `surfaceRegistry:62` — and did so before P1-5 was written. **Deliberately NOT moved.** Relocating a working rule into the new module would have manufactured evidence for the abstraction. |
| **What the three cases proved** | Consequence generation was **already domain-specific**, with `surfaceRegistry` as the shared result contract and `eventPlan` as the only ranker. `openQuestions` was a fifth domain producer wearing a general name — one that **already collided** with `CommunicationHub.jsx:1349`. |
| **Change** | Narrowed, not generalised. `git mv openQuestions.js placeQuestions.js`; `openQuestionsFor` → `placeQuestionsFor`; `answerOpenQuestionPatch` → `answerPlaceQuestionPatch`; `OPEN_QUESTION_FIELDS` → `PLACE_QUESTION_FIELDS`; registry id `placequestions`. Case A added as the module's second rule with `PERMIT_THRESHOLD = 50`. |
| **The rule that survived** | **A consequence belongs to the domain where its ANSWER lives, not the domain that triggered it.** Case A is triggered by attendance and answered by a city, so it lives with place. |
| **D1 composed in** | The permit rule reads `attendanceBand().countFromHost`: an app-invented typical count cannot manufacture a consequence. A fabricated consequence is worse than a missing one — it would send a host to a city office over a number she never gave. Asserted in unit and browser, paired with *"a real roster of 60 yeses DOES raise it"* so the refusal is proven to be about provenance, not the number. |
| **A deliberate non-fix** | The CRA note stays ungated while the question is gated. They are not the same statement: a hedged, numberless nudge to check is honest on any basis; a ranked job quoting a derived number back to the host is not. Withholding *"you might need a permit"* from a host whose event is probably 60 people would be the "no confirmed count → useless planning" failure the brief forbids. |
| **Invariant** | #4 (*`eventPlan()` is the sole final next-action authority*) — HELD; one surface, two rules, no second ranker. #12 (*the app must not invent a fact a venue has not supplied*) — extended to a city. |
| **Tests** | `weNowNeedToKnow.test.js` 26 (7 new) · `hostv2/e2e/weNowNeedToKnow.spec.mjs` 7 (3 new). `registryCompleteness`'s contract entry records the rename reason, as that gate asks. |
| **Affected consumers** | `surfaceRegistry.js`, `HostShellV2.jsx`, `registryCompleteness.test.js`, `weNowNeedToKnow.test.js` — all migrated; no parallel model left. |
| **Rollback risk** | **Low.** A rename plus one pure rule. Revert = `git mv` back and drop the rule. |
| **Regression** | Full jest **617 suites / 8,494 passed**; `gate:cra` GATE_OK by exit code; hostv2 build OK. |

---

## D4 — Bounded-gap governance

| Field | Detail |
|---|---|
| **Before behaviour** | Sprint 0 adopted a **three-condition** rule mid-sprint (named · un-implied · tested) and recorded it in a paragraph of `SPRINT_0_VERDICT.md`. The implementer was also the judge. |
| **Change** | The brief's eight conditions, kept in full, **plus three added and two sharpened from repository evidence** — the full rule and six worked examples are in `SPRINT_0_5_ARCHITECTURE_DECISIONS.md`. Added: **9 · ABSENT, NOT INERT** · **10 · the justification is pinned by a test** · **11 · the gap cannot grow silently**. Sharpened: **2** (evidence from the destination's own writer or validator, never a failed name search) · **5** (the honesty test asserts at the reader the SURFACE calls, and is red-proofed). |
| **Why each addition exists, measured** | **9** — Decision 3 found the permit truth inert; Sprint 0 would have filed it as a bounded gap, and it was a false implication wearing a gap's clothes. **10** — CLAUDE.md's surfaces table stated a gate status that had been false for six weeks while being the first thing read every session. **11** — the false-alarm count grew by one *the moment P1-2 added a fourth seam consumer*; a gap whose size is a function of future work needs a ratchet, which is already how this repo handles exactly that. **2 sharpened** — Sprint 0 made three false "missing schema" claims, all by searching for a module NAMED after a capability. **5 sharpened** — the excursions honesty test was pinned at `unusedClauses`, which D2 then made non-public. |
| **THE RULE HAS THREE OUTCOMES, not two** | The most useful finding: most things called gaps are not capability gaps at all. A two-way rule forces a coverage risk into one of the two buckets, and "no test" would launder unbaselined code into READY. |
| **Applied** | **ACCEPT** — `"2 excursions"` (all 11, with condition 2 now proved from `itinerary.js:155`'s own validator: a programme row with no thing named is dropped) · **ACCEPT** — pre-existing events have no stored sentence (a missing *history*, un-backfillable, honestly silent, superseded going forward and proven to be) · **BLOCKER (fixed)** — the inert permit truth, fails 9 and 3 · **BLOCKER (fixed in Sprint 0)** — an estimate reaching money via `guestCountResolved`, fails 8 and 7 · **NOT A GAP** — GOLD-06 weather / GOLD-10 failure injection: the capability ships, the baseline is missing, and that is handled by scoping the verdict · **NOT A GAP** — the CRA note beside the new question: debt in a domain outside this slice. |
| **Enforcement** | `aBoundedGapStaysBounded.test.js` (8). Asserts the two halves a test can honestly hold: the host is still told (through the reader the SHELL calls, not the mechanism underneath) and the justification is pinned. **Red-proofed**: patching `normRow` to accept a nameless row turns the pinned-justification test red, which is the point — the day the destination changes, the stale excuse fails instead of standing. Conditions 1 and 6 stay in the document, with a date: a test that greps a markdown file for its own paragraph is theatre. |
| **Invariant** | None changed. #3 is why the excursions clause is disclosed at all. |
| **Rollback risk** | **None** — one new test file, no runtime change. |
| **Regression** | Full jest **618 suites / 8,502 passed**, 1 skipped. |

---

## D5 — Test / build reproducibility (brief §6)

| Field | Detail |
|---|---|
| **Before behaviour** | The browser suite needs `REACT_APP_API_BASE_URL` baked into the Host V2 bundle, and that fact lived in **three places that disagreed**: `e2e/fixtures.mjs:3` said *"the e2e build bakes"* it (nothing local did), `playwright.config.mjs:239` said to run `npm run build` first (which bakes no `REACT_APP_*` at all — its own comment at :277 says so), and the only real definition was `checks.yml`'s `env:` block. Following the local comments produced a bundle the suite was never written against: 33 specs failed and the failures read as code defects. |
| **Change** | `hostv2/package.json` gains `e2e:build` — the parity gate plus `REACT_APP_API_BASE_URL=https://e2e-mock.invalid vite build`. `checks.yml` now **calls that script** instead of carrying its own copy of the value. Both misleading comments point at it, with what following them used to cost. |
| **The canonical command** | `cd hostv2 && npm run e2e:build && npm run test:e2e` |
| **Why a script and not a paragraph** | Local and CI cannot drift apart when there is one definition, and the fake host is a never-resolving RFC 2606 `.invalid` name intercepted by `fixtures.mjs`'s global catch-all — nothing touches a network. |
| **Verified** | `npm run e2e:build` exits 0 and the value is present in four built chunks (`HostShellV2`, `eventIdentityEngine`, `index`, `inviteShared`). |
| **Rollback risk** | **Very low.** One script; CI calls it. Revert = restore the `env:` block. |
