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
