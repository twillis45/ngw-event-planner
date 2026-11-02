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

---

## RE-MEASURED 2026-11-02 (production-readiness pass)

`hostv2/e2e/` is now **135** spec files. Two more rows move. The 2026-10-19
block above stands unchanged.

| ID | Then | Now | Evidence |
|---|---|---|---|
| **GOLD-09** | *"pass entitlement (Postgres) not in any e2e"* | **CLOSED.** Seven tests on their own bundle walk the shell's half of the money path: the ask fires on event open, the `isUserCreatedEvent` guard holds for samples, `held:true` unlocks, `held:false` locks, and the webhook/redirect race does not revoke a host who paid seconds ago. | `thePassSurvivesTheWebhookRace.spec.mjs` · `.env.passgate` · port 5266 |
| **GOLD-10** | *"no spec for invalid route, producer failure, or write failure"* | **CLOSED, all three.** Write failure and invalid route in `aFailedSaveIsNotSilent`; producer failure in `noForecastBeatsAWrongOne`, which is the same assertion as the weather baseline read from the other side. | `aFailedSaveIsNotSilent.spec.mjs` · `noForecastBeatsAWrongOne.spec.mjs` |
| **GOLD-06** | *"weather has no e2e"* — the row the Sprint 0 verdict cites as the reason both verdicts are scoped | **CLOSED.** The contract under test is the module's own: *"a configured app shows live weather or nothing — a fabricated fallback could contradict the real sky."* | `noForecastBeatsAWrongOne.spec.mjs` |

### Why GOLD-09 survived two green unit suites, measured

`passGate.js` answers "allowed" at every gate while `isBillingLive()` is
false, and that predicate needs BOTH a truthy `REACT_APP_API_BASE_URL` and an
explicit `REACT_APP_BILLING_LIVE === '1'`. The shared e2e bundle carries
neither. Driven against it on 5233, the pass sheet reads **"fully unlocked
right now"** — so a spec written there passes having executed none of the
entitlement path. `passGate.test.js` and `passEntitlement.test.js` drive the
MODULES; nothing drove the SHELL. Hence a harness bundle, and hence a premise
test that fails if that bundle ever loses the switch.

### The race, red-proofed

A green test that cannot fail is worse than no test, so the central claim was
differentially measured rather than observed once:

| Scenario | Asks | Ends |
|---|---|---|
| blob claims a pass, server answers F, F, T | **3** (ladder ran) | **unlocked** |
| claim REMOVED, same answers | **1** | **locked** |

Remove the claim and the retry ladder does not run and the test goes red, so
it measures the claim-driven retry rather than the happy path.

### GOLD-10: what is closed and what is not

**Write failure — closed.** `Storage.prototype.setItem` is made to throw
`QuotaExceededError` for `ngw-hostv2-patch-*` only, which is what a full disk
does to the key that carries photos. Measured on a real boot: **2 failed write
attempts, exactly 1 notice**, naming both the cause and the remedy. The
"told once" dedupe is asserted separately because it is the regression-prone
half — the obvious fix to a silent failure is a toast in the catch, which on a
full disk fires on every patch change and buries the surface it warns about.
The control arm counts writes too, so silence there proves the shell wrote and
stayed quiet rather than never writing at all.

**Invalid route — closed.** A pointer to an event id that does not exist (a
stale `ngw-hostv2-last-event`, or a link to an id this device never had) must
not white-screen: no page error, real text, something actionable.

**Producer failure — STILL OPEN.** Not attempted here and not claimed.
`theNoSignalBannerTellsTheTruth`, `aRateIsNotFree` and `sheKnowsItIsOld` cover
parts of it; a provider returning 5xx mid-plan does not have a guard.

### An instrumentation note worth keeping

The save-failure toast auto-dismisses, and it arrives inside a re-rendered
subtree rather than as a direct added node. **Sampling at the end finds
nothing, and a MutationObserver on `addedNodes` also finds nothing** — both
were tried here and both reported a clean run against a shell that was in fact
warning correctly. An 80ms poll across the whole run is what sees it. A
failure-path spec that cannot see the evidence reports the opposite of the
truth.

### GOLD-06 and the producer third of GOLD-10, which turned out to be one contract

Weather IS a producer, so "does the weather surface tell the truth" and "what
happens when a producer fails" are the same question. The failure it prevents
is specific: an app wired to a real forecast, whose provider is down, quietly
showing a SAMPLE the host reads as the real sky — and then planning a
30-person outdoor party against invented rain.

**No new bundle was needed.** `isWeatherConfigured()` is
`Boolean(REACT_APP_OPENWEATHER_KEY || REACT_APP_API_BASE_URL)`, so the shared
e2e bundle (5233) is the UNCONFIGURED arm and the GOLD-09 passgate bundle
(5266) is the CONFIGURED one. Same event, same fixture, same boot —
configuration is the only variable, which is what makes these a differential
rather than two anecdotes.

| Arm | Provider called | Sample label |
|---|---|---|
| Unconfigured (5233) | **never** | **shown** — and it must say "Sample forecast" |
| Configured, provider 500 (5266) | **yes** (`geocode`) | **absent** — it stays quiet |

The provider-call assertion in the configured arm is not decoration. Without
it, "no sample appeared" could equally mean the fixture never triggered
weather at all — and that is not hypothetical: the venue NAME comes from
`ev.venue`, not `ev.venueName` (`venueFor.js:39`), and the first run of this
spec used the wrong key, which made `isLikelyOutdoor` false, returned the
effect early, and read CLEAN ON BOTH ARMS AT ONCE. A false pass on both sides
of a differential is the worst possible outcome for a test like this, and the
call count is what makes it impossible.
