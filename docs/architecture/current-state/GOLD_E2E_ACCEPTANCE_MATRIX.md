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
