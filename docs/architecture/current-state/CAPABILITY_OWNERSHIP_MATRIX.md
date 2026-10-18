# Capability / ownership matrix

**Classification discriminator, stated so it can be challenged:**

| Class | Evidence required |
|---|---|
| **PROVEN IN HOST** | hostv2 surface **and** a browser e2e exercising it |
| **WIRED** | hostv2 surface reached by a route, jest-covered, no browser proof |
| **ENGINE ONLY** | lib authority exists; little or no host consumption |
| **SPEC ONLY** | described in docs/comments; no runtime path |
| **BROKEN / CONTRADICTORY** | two authorities disagree, or a measured defect stands |
| **GAP** | not built |

**Depth honesty.** Rows marked ◐ were classified from surface + route + e2e
name + authority module, not from a full consumer/writer trace. They are
directionally reliable and **must not be treated as audited**. Rows marked ●
were traced to source in this pass.

hostv2 exposes **31 sheet kinds** and **4 stages** (`create`, `plan`, `day`,
`after`). 124 e2e specs.

---

| # | Capability | Class | Canonical reader/engine | Canonical writer | Host surface | Route | Persistence | Tests | Proposed home | Migration risk |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Creation / intake** | ● PROVEN IN HOST | `smartParseEvent.js:48 parseSmartEventText` | creation seam → event blob | create stage | `stage=create` | event blob | 33 jest; e2e `theCreationScreenSaysWhatToType`, `fiveNightsSurviveCreation`, `theSpanSurvivesACorrection`, `typingIsSubmitting` | Creation | **HIGH** — destination invariant lives in shell (see creation audit) |
| 2 | **Extraction receipt** (`unusedClauses`) | ● PROVEN IN HOST | `smartParseEvent.js:1711` | — (stateless) | "Didn't make it into the plan" `HostShellV2:9491` | within create | **none** | `itSaysWhatItDidNotUse`, `theParserSentencesItStillMisses` | Creation | Medium — no resolution record |
| 3 | **Guessed-type declaration** | ● PROVEN IN HOST | `parsed.typeBasis === 'generic'` | — | `HostShellV2:9485` | create | — | `oneTypoBoughtABirthday` | Creation | Low |
| 4 | **Clarification** | ◐ WIRED | heroAsk / askPlan | host answers → blob | ask sheet | `sheet=ask` | blob | `heroAsksSomething` | Your Event | Medium |
| 5 | **Reveal** | ◐ WIRED | `assembleRevealEngines.js` | — | reveal flow | create→plan | derived | `theRevealCountsTheWholeList` | Your Event | Medium |
| 6 | **Command centre / next action** | ● PROVEN IN HOST | **`CommandCenter.jsx:2042 eventPlan`** | — | hero | `stage=plan` | derived | 42 jest files; `heroAsksSomething`, `rankedReorder`, `everyActionIsReallyFortyFour` | **stays authority** | **HIGH** — engine lives in a `.jsx` |
| 7 | **Place / venue** | ● WIRED | `venueFor.js:21` (30 consumers) | `venueFor.js:189 setVenue` | venue sheet | `sheet=venue` | blob `venue*` | `venueSourceProof` (source), e2e `handlingTheVenueMyself`, `ryanWay` | Place | **HIGH** — no raiser; no derived-question primitive |
| 8 | **People / guests** | ● BROKEN / CONTRADICTORY | `guestCountFor.js` (3 consumers) **vs raw `event.guestEstimate` (38 consumers)** | roster, RSVP, creation | guests sheet | `sheet=guests` | blob | `guestChipsSizedToTheEvent`, `guestPayloadGate`, `guestTold`, `rosterToolbar`, `theCouplesSheSaidReachTheList` | People | **HIGHEST** — two paths; invented counts reach outward drafts |
| 9 | **Invitations / RSVP / QR** | ◐ WIRED | `rsvp.js`, `InviteV2.jsx` | public RSVP → backend | qr sheet, invite | `sheet=qr` | backend + blob | `theInviteSaysWhenToBook`, `twoGroupsOneLetter` | People | Medium |
| 10 | **RSVP follow-up / sweep** | ◐ WIRED | `surfaceRegistry` `rsvpchase` (:481) | — | sweep sheet | `sheet=sweep` | derived | registry tests | People | Low |
| 11 | **Seating** | ◐ WIRED | `surfaceRegistry` `seating` (:520) | seating edits | seating sheet | `sheet=seating` | blob | **no e2e found** | People | Medium — unproven in browser |
| 12 | **Food** | ● PROVEN IN HOST | `playbookFoodPlan`; kitchen gate | food edits | food/foodplan/bringing | `sheet=food` | blob | `noKitchenNoShoppingList`, `noOvenNoBakeItButton`, `theBarIsOnEveryFoodTab`, `dietaryHoldsTwo`, `whatTheHouseNeeds` | Food & Drink | Medium |
| 13 | **Shopping** | ● PROVEN IN HOST | `priceLayers.js`, `storePrices.js` | list edits | food sheet | `sheet=food` | blob | `shoppingTakeaway`, `instacartStepsTheList`, `twentyLinksIsARealSearch`, `pinnedTotalCountsWhatItPrices` | Food & Drink | Medium |
| 14 | **Specialty procurement** | ◐ WIRED | `crabPlan.js`, `marketFor.js` | — | crabs sheet | `sheet=crabs` | blob | `marketUnderTwoNames`, `whichRegionalAnswer` | Conditional | Low |
| 15 | **Travel (multi-day/dates)** | ● PROVEN IN HOST | `travelPlan.js`, `moneyDates.js`, `eventSpan` | — | air/ground sheets | `sheet=air` | blob | `multiDayDoor`, `twoDatesTwoLabels`, `moneyDateReason`, `ourDateArguesWithItsSource` | Travel & Stay | Medium |
| 16 | **Lodging** | ● PROVEN IN HOST | `lodgingIntel.js`, `lodgingFloor.js`, `lodgingBasisLadder` | host entry / bookmarklet | lodging sheet + `LodgingCockpit.jsx` | `sheet=lodging` | blob | `lodgingCockpit`, `lodgingSpendGuard`, `aRateIsNotFree`, `theRoomsReachTheBudgetScreen` | Travel & Stay | Medium |
| 17 | **Air** | ◐ WIRED | `airports.js`; registry `travel-air` (:705) | — | air sheet | `sheet=air` | blob | registry tests | Travel & Stay | Low |
| 18 | **Ground transport** | ◐ WIRED | registry `travel-ground` (:744) | — | ground sheet | `sheet=ground` | blob | registry tests | Travel & Stay | Low |
| 19 | **Experience / meaning** | ◐ WIRED | `experienceContext.js` | — | meaning sheet | `sheet=meaning` | blob | `oneMomentAndADoor` | Experience | Medium — **no raiser** |
| 20 | **Vendors** | ● PROVEN IN HOST | `workstreams.js`, `vendorIntelligence.js`; **7 registry surfaces** | vendor edits, email intake | vendors sheet | `sheet=vendors` | blob | `vendorCardFace`, `vendorDeskPanel`, `vendorEmailIntake`, `vendorObligationsWired`, `whereThisVendorStands` | Team & Services | Medium |
| 21 | **Helpers / internal team** | ◐ WIRED | registry `helpers` (:779) | — | — | — | blob | `helperConfirm`, `hostSignalsAreCollectable` | Team & Services | Low |
| 22 | **Money / budget / spending** | ● PROVEN IN HOST | `hostSpending.js:90`, `budgetFor.js`, `vendorMoney.js`, `priceLayers.js` | budget rows, vendor status | budget sheet | `sheet=budget` | blob | `ignitionBudget`, `theBudgetDropsTheGroceries`, `threeLayersOfPrice`, `priceVintageIsDerived`, `whatItActuallyPriced` | Money | **HIGH** — no parallel math allowed; depends on guest-count fix |
| 23 | **Cost sharing** | ◐ WIRED | `costSharing.js:77 costSharingSummary` | — | costshare sheet | `sheet=costshare` | blob | `theBudgetAskSaysWhoseMoney`, `repastCommunityAttribution` | Conditional | Low |
| 24 | **Decisions** | ● PROVEN IN HOST | registry `decisions` (:823); `decisionEvidence.js`, `decisionConfidence.js` | host choices | decisions sheet | `sheet=decisions` | blob | `decisionIdentity`, `checklistFollowsDecisions`, `rankedReorder` | Secondary | Medium |
| 25 | **Tasks / checklist** | ● PROVEN IN HOST | `taskEngine.js`, `taskLead.js`, `taskRoute.js` | check-offs | tasks sheet | `sheet=tasks` | blob | `taskOwnership`, `dayOfChecklist`, `checklistFollowsDecisions` | Secondary | Medium — **no raiser** |
| 26 | **Risks** | ● PROVEN IN HOST | registry `risks` (:104) | — | risks sheet | `sheet=risks` | derived | `_riskLaneCapture`, `theClosingWindowLeads`, `aDatedRiskWaitsForItsDate` | Secondary | Low |
| 27 | **Weather / rain** | ◐ WIRED | `weather.js` (reads `venueFor`) | — | rain sheet | `sheet=rain` | derived + API | **no e2e found** | Conditional | Medium — **no raiser**, unproven in browser |
| 28 | **Schedule / run of show** | ◐ WIRED | `itinerary.js`, `startTime.js` | host edits | space/day | `sheet=space` | blob | `startTime` jest | Schedule | Medium — **no raiser** |
| 29 | **The Day** | ● PROVEN IN HOST | registry `day-of` (:283) | day edits | day stage | `stage=day` | blob | `dayCrud`, `dayOfChecklist`, `whoseDayIsThisWrittenFor`, `theDayToldThemToCook` | The Day | Low |
| 30 | **After / event memory** | ◐ WIRED | `closeoutIntel.js` | — | thanks sheet, after stage | `stage=after` | blob | `whatSurvivedTheRetirement` | After | Medium |
| 31 | **Files / documents** | ◐ WIRED | `CommandCenter.jsx:651 getDocStatusForKind`, `:684 getEventDocCards`, `:690 getDocumentsReadiness` | uploads | — | — | blob/backend | jest only | Secondary | Medium — **no raiser**; engine in `.jsx` |
| 32 | **Ask NGW** | ◐ WIRED | `askVoice.js`, `askPlan.js` | — | ask sheet | `sheet=ask` | — | `heroAsksSomething` | Secondary | Low |
| 33 | **Settings / events / switch** | ◐ WIRED | — | profile | settings/events sheets | `sheet=settings` | localStorage + blob | `closeItAndOpenItAgain`, `herOwnEventIsFirst` | Utility | Low |
| 34 | **Billing / pass** | ● PROVEN IN HOST | `passGate.js`, `passEntitlement.js`, `event_passes` | Stripe webhook | pass sheet | `sheet=pass` | **Postgres** (only non-blob) | 15 jest (`passEntitlement`, `thePriceIsNotTheBrowsersToSend`); **no e2e** | Utility | Medium — dormant |
| 35 | **Persistence / sync** | ● PROVEN IN HOST | `saveCustomEvents`, Supabase sync | — | — | — | localStorage + Supabase | `closeItAndOpenItAgain`, `crossDeviceSync`, `aNewDeviceOwesNothing`, `prebootState` | — | **HIGH** |
| 36 | **Offline shell** | ● PROVEN IN HOST | `src/offline/` + sw | — | — | — | service worker | `theShellOpensWithoutSignal`, `theNoSignalBannerTellsTheTruth` | — | Medium |
| 37 | **Normalized needs / accessibility** | ● **GAP** | **none** (only `dietRows.js`) | — | — | — | — | `theAltitudeReachesThePlan` proves *altitude* only | People | **Blocks GOLD-04** |

---

## Cross-cutting findings

1. **Row 8 is the most serious.** Two guest-count paths, 38:3 in favour of the
   raw field, with a documented case of an invented count reaching a caterer.
2. **Row 6**: `eventPlan` is the right authority in the wrong file.
3. **Rows 7, 19, 22, 25, 27, 28, 31** have **no raiser** — they cannot produce
   a next action.
4. **Rows 11 and 27 have no browser proof.** Seating and weather are WIRED on
   jest + route only.
5. **Row 34 is the only capability persisting outside the event blob.**
6. **Row 37 is the only outright GAP** in the list.
