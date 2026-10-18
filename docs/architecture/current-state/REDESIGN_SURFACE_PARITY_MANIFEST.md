# Redesign surface parity manifest

**Rule this manifest enforces:** no existing Host V2 door is retired until the
capability behind it has a **durable future route** and **automated parity
proof**. Every current surface below has at least one future door.

Inventory: **31 sheet kinds**, **4 stages** (`create`, `plan`, `day`, `after`)
in `hostv2/src/HostShellV2.jsx`.

---

## Stages

| Current | Future door | Parity proof required | Risk |
|---|---|---|---|
| `stage=create` | **Creation** (pre-IA flow) | Creation invariant tests (destination guess, unused clauses, guessed type) + `theCreationScreenSaysWhatToType`, `fiveNightsSurviveCreation`, `theSpanSurvivesACorrection` | **HIGH** |
| `stage=plan` | **Your Event** | `heroAsksSomething`, `rankedReorder`, `everyActionIsReallyFortyFour` | **HIGH** |
| `stage=day` | **The Day** | `dayCrud`, `dayOfChecklist`, `whoseDayIsThisWrittenFor` | Low |
| `stage=after` | **After** | `whatSurvivedTheRetirement` | Medium |

## Sheets → future doors

| # | Sheet kind | Future door | Existing proof | Risk |
|---|---|---|---|---|
| 1 | `venue` | **Place** | `handlingTheVenueMyself`, `ryanWay`, `venueSourceProof` | HIGH |
| 2 | `guests` | **People** | `rosterToolbar`, `rosterDetailPanel`, `guestChipsSizedToTheEvent` | HIGHEST |
| 3 | `seating` | **People → Seating** | ⚠️ **no e2e** | Medium |
| 4 | `qr` | **People → Invitations** | `twoGroupsOneLetter`, `theInviteSaysWhenToBook` | Medium |
| 5 | `sweep` | **People → Follow-up** | registry tests | Low |
| 6 | `food` | **Food & Drink** | `theBarIsOnEveryFoodTab`, `noKitchenNoShoppingList` | Medium |
| 7 | `foodplan` | **Food & Drink → Plan** | `whatTheHouseNeeds`, `theDayToldThemToCook` | Medium |
| 8 | `bringing` | **Food & Drink → Bringing** | `helperConfirm` | Low |
| 9 | `crabs` | **Conditional → Specialty** | `marketUnderTwoNames`, `whichRegionalAnswer` | Low |
| 10 | `lodging` | **Travel & Stay → Lodging** | `lodgingCockpit`, `lodgingSpendGuard`, `aRateIsNotFree` | Medium |
| 11 | `air` | **Travel & Stay → Air** | registry tests | Low |
| 12 | `ground` | **Travel & Stay → Ground** | registry tests | Low |
| 13 | `meaning` | **Experience** | `oneMomentAndADoor` | Medium |
| 14 | `vendors` | **Team & Services** | `vendorCardFace`, `vendorDeskPanel`, `whereThisVendorStands` | Medium |
| 15 | `budget` | **Money** | `ignitionBudget`, `threeLayersOfPrice`, `theBudgetDropsTheGroceries` | HIGH |
| 16 | `costshare` | **Conditional → Cost sharing** | `theBudgetAskSaysWhoseMoney` | Low |
| 17 | `decisions` | **Secondary → Decisions** | `decisionIdentity`, `checklistFollowsDecisions` | Medium |
| 18 | `tasks` | **Secondary → Checklist** | `taskOwnership` | Medium |
| 19 | `risks` | **Secondary → Risks** | `theClosingWindowLeads` | Low |
| 20 | `rain` | **Conditional → Rain** | ⚠️ **no e2e** | Medium |
| 21 | `space` | **Schedule** (+ Place overlap) | `startTime` jest | Medium |
| 22 | `ask` | **Secondary → Ask NGW** | `heroAsksSomething` | Low |
| 23 | `help` | **Utility → Help** | — | Low |
| 24 | `settings` | **Utility → Account** | `herOwnEventIsFirst` | Low |
| 25 | `events` | **Utility → Switch Event** | `closeItAndOpenItAgain` | Low |
| 26 | `pass` | **Utility → Pass/Billing** | 15 jest; ⚠️ no e2e | Medium |
| 27 | `date` | **Your Event → Date & time** | `twoDatesTwoLabels`, `ourDateArguesWithItsSource` | Medium |
| 28 | `nav` | dissolved into navigation | `oneWayOutOfASection` | Low |
| 29 | `sections` | **Event Details / directory** | `thePlanPartsReadAsEnglish` | **HIGH** — see note |
| 30 | `draft` | contextual (written-for-you) | `whereThisCameFrom` | Low |
| 31 | `thanks` | **After → Thank-yous** | `whatSurvivedTheRetirement` | Medium |

---

## Notes that constrain retirement

**`sections` (#29) is the escape hatch.** It is the directory through which
surfaces without a primary door remain reachable. The owner's rule — do not
retire the section directory until automated parity proves every capability
remains reachable — is **load-bearing**, because at least two capabilities
(files/documents, helpers) currently have **no sheet of their own** and are
reachable only contextually. Retiring `sections` before they have doors
strands them.

**Capabilities with no current sheet** (reachable only in context, so easiest
to lose silently):

| Capability | Today | Needs a future door |
|---|---|---|
| Files / documents | engine in `CommandCenter.jsx`, no sheet | **Secondary → Files** |
| Helpers / internal team | registry raiser only | **Team & Services → Helpers** |
| Normalized needs | does not exist | **People → Needs** |

**Two surfaces have no browser proof at all** — `seating` and `rain`. Both need
an e2e **before** their current door is touched, not after.

---

## Parity gate — required before any retirement

1. Every row above resolves to a durable route in the new IA.
2. `seating` and `rain` have browser coverage.
3. Files, helpers and needs have real doors.
4. A route-level test asserts every capability is reachable without
   `sections`.
5. The creation invariant suite (below) is green on the new creation surface.
