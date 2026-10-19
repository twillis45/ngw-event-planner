# GOLD end-to-end acceptance matrix

Current coverage assessed against the 124 specs in `hostv2/e2e/`. "Existing
cover" means a spec that already exercises part of the path — **not** that the
GOLD event passes today.

---

| ID | Event | Existing cover | Gaps that block it | Blocking dependency |
|---|---|---|---|---|
| **GOLD-01** | WANDA-A cold start | `theCreationScreenSaysWhatToType`, `typingIsSubmitting`, `theSubmitSurvivesTheKeyboard`, `whatSurvivedTheRetirement` | `venueCity:"the"` defect; theme dropped; recognition/programme dropped; food/bar/photography intent dropped; **destination guess must stay unanswered** | Creation P0 + P1 defects |
| **GOLD-02** | WANDA-B mature fixture | `whatSurvivedTheRetirement`, vendor + money specs | No single fixture-driven acceptance spec | Fixture definition |
| **GOLD-03** | Anaheim multi-day | `multiDayDoor`, `fiveNightsSurviveCreation`, `twoDatesTwoLabels`, `lodgingCockpit`, `theCouplesSheSaidReachTheList` | "2 excursions" dropped — no activity schema | Excursion schema (P2) |
| **GOLD-04** | Santa Fe destination + accessibility | **`theAltitudeReachesThePlan`** ✅, `_eightiethAudit`, `theRoomsReachTheBudgetScreen`, `noKitchenNoShoppingList` | **Walker → no normalized need exists** | **Needs model — hard blocker** |
| **GOLD-05** | Backyard, venue decided | `handlingTheVenueMyself`, `ryanWay`, `whatTheHouseNeeds` | Must prove NGW does **not** nag for a venue — assertion of absence | Venue raiser design must not regress this |
| **GOLD-06** | Watch party | **`watchPartyMajorEvent`** ✅, `theBarIsOnEveryFoodTab`, `noOvenNoBakeItButton` | TVs/parking/game-timing coverage unverified; **weather has no e2e** | Weather browser proof |
| **GOLD-07** | Remote RSVP cascade | `guestPayloadGate`, `guestReplyPicker`, `guestTold`, `theCouplesSheSaidReachTheList`, `crossDeviceSync` | **No single spec walks public RSVP → attendance → Food → Shopping → Seating → Money → rerank.** Seating has no e2e at all | Row 8 (guest-count duplication) + seating e2e |
| **GOLD-08** | Price lifecycle | `threeLayersOfPrice`, `priceVintageIsDerived`, `sheKnowsItIsOld`, `whatItActuallyPriced`, `pinnedTotalCountsWhatItPrices`, `theEstimateDoesNotCoverIt` | **Best-covered GOLD event.** Needs one spec spanning estimate→shelf→selected→bought→actual→spent | Low |
| **GOLD-09** | Persistence | `closeItAndOpenItAgain`, `crossDeviceSync`, `aNewDeviceOwesNothing`, `prebootState`, `theShellOpensWithoutSignal` | Pass entitlement (Postgres) not in any e2e | Low |
| **GOLD-10** | Failure injection | `theNoSignalBannerTellsTheTruth`, `aRateIsNotFree`, `sheKnowsItIsOld` | No spec for invalid route, producer failure, or write failure | Medium |

---

## Reading of this matrix

**GOLD-08 and GOLD-09 are close to passing.** Price provenance and persistence
are the two best-instrumented areas in the repo.

**GOLD-04 cannot pass without new schema.** It is the only GOLD event blocked
by a true capability gap rather than a defect or a missing test.

**GOLD-07 is the integration test the repo most lacks.** Each hop has
coverage; the cascade has none — and it crosses the exact seam (guest count)
where two authorities disagree. This is the single most valuable spec to write
**before** redesign, because it would fail today for a real reason.

**GOLD-05 requires asserting an absence**, which is the hardest kind of test
and the easiest to lose. Adding a venue raiser (recommended elsewhere) could
break it by producing "choose a venue" on an event that already has one. The
raiser must read `venueFor().addressSettled` — the verdict that already exists.

---

## RE-MEASURED 2026-10-19 (after Sprint 0 and Sprint 0.5)

The table above is the **gate-time** assessment and is kept as that record. Four
rows have materially changed; the rest stand. `hostv2/e2e/` is now **129** spec
files (counted, not estimated).

| ID | Then | Now | Evidence |
|---|---|---|---|
| **GOLD-03** | *"'2 excursions' dropped — no activity schema"* | **BOUNDED, and the blocking dependency was named wrong.** It is not "excursion schema (P2)". The schema exists (`event.itinerary`, read by `itinerary.js`); what the host gave does not satisfy it. `itinerary.js:155` drops a programme row with no thing named, so a count of unnamed outings has nowhere truthful to go and inventing `"Excursion 1"` would fabricate it. Disclosed and answerable instead. | D4 ACCEPT · `aBoundedGapStaysBounded` |
| **GOLD-04** | **hard blocker** — no normalized needs model | **CLOSED.** `accessNeeds.js` owns one vocabulary; wired to seating and lodging; the deliberately-unreached `place` domain now raises an answerable question instead of going quiet. | P1-2, P1-5 · `theWalkerReachesThePlan.spec.mjs` |
| **GOLD-07** | *"no single spec walks the cascade"* | **CLOSED.** `gold07RsvpCascade.spec.mjs` walks public RSVP → attendance → food → shopping → seating → money → rerank, 9 asserted boundaries, on its own bundle for the backend leg. Seating/rain baselined beside it. | P1-1 · `seatingAndRainBaseline.spec.mjs` |
| **GOLD-06** | weather has no e2e | **STILL OPEN, and it is the reason both verdicts are scoped.** Under D4 this is **not a capability gap**: weather ships, the baseline is missing. A coverage risk is handled by narrowing the verdict, never by bounding a gap. | D4 example 5 |

**New browser specs since the gate:** `gold07RsvpCascade` (2 tests / 9
boundaries) · `seatingAndRainBaseline` (9) · `theWalkerReachesThePlan` (2) ·
`theClauseGetsAnAnswer` (4) · `weNowNeedToKnow` (7). All routed desktop-only via
`VIEWPORT_INDEPENDENT`.

**Run them with** `cd hostv2 && npm run e2e:build && npm run test:e2e` — not
`npm run build`, which bakes no `REACT_APP_*` and costs 33 false failures. See
Sprint 0.5 ledger row D5.
