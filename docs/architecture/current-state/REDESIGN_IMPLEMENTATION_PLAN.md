# Redesign implementation plan

Companion documents in this directory carry the evidence. This file carries the
sequence, the invariants, and the verdict.

---

## INVARIANTS THE REDESIGN MUST NOT BREAK

Seeded by the owner; extended by this audit. Each has a named enforcement point
so it is testable rather than aspirational.

| # | Invariant | Enforce at | Evidence |
|---|---|---|---|
| 1 | **A guessed destination must not become a permanent destination/paywall fact.** | New `committedDestination(parsed, profile)` beside the parser | `HostShellV2:1724-1726`; `passGate:78`; grandfather rule |
| 2 | **Explicit host statements outrank inference.** | Parser `*Basis` fields; `startTimeIsConfirmed` pattern | `overnightBasis:'said-so'`; `smartParseEvent` 2026-08-06 ruling |
| 3 | **Unused/unapplied clauses cannot silently disappear.** | `unusedClauses` + a resolution record | `HostShellV2:9491`; `itSaysWhatItDidNotUse` |
| 4 | **`eventPlan()` remains the sole final next-action authority.** | One import path; no second ranker | `CommandCenter:2042`; 42 jest files |
| 5 | **Estimates/quotes/intent cannot silently become committed/spent.** | `vendorMoney`, `hostSpending` | "Considering/Quoted are not money yet"; "an unpaid deposit is not a partial payment" |
| 6 | **External provider uncertainty/provenance must survive.** | `PRICE_LAYERS`, `priceVintage`, `lodgingBasisLadder` | `threeLayersOfPrice`, `sheKnowsItIsOld` |
| 7 | **Every working Host V2 capability needs a durable future door before its old door is retired.** | Parity manifest gate | 31 sheets + 4 stages |
| 8 | **A guessed headcount must not become money, or leave the app.** *(added)* | `hostSpending` `hasRealCount`; `guestCountFor` + `guestEstimateSource` | `guestCountFor.js` header: invented 40 reached "for about 40 guests" in vendor outreach |
| 9 | **No parallel math.** *(added)* | `hostSpending` reuses `playbookFoodPlan`; `budgetFor` owns "what is the budget" | "single source, no parallel math"; five readers had five rules |
| 10 | **Venue truth is read through `venueFor`, never raw fields.** *(added)* | `venueSourceProof.test.js` | ~250 raw reads across 15 modules before consolidation |
| 11 | **One vendor-status vocabulary.** *(added)* | `workstreams.isVendorBooked` | "money vanished from the ledger because two files disagreed on a word" |
| 12 | **The app must not invent a fact a venue has not supplied.** *(added)* | Derived-question item, not a default value | §6 alcohol-policy case |
| 13 | **An event that began free stays free.** *(added)* | `passVerdictAtCreation` stamped once | Model D grandfather rule |
| 14 | **Never infer a diagnosis from an accessibility statement.** *(added)* | Needs model carries tag + verbatim quote | `healthNoted` quote precedent |

---

## What should remain untouched

- **`eventPlan` as the prioritizer** — hypothesis confirmed. 42 test files.
- **`surfaceRegistry`'s raise shape** — pass-through by default, after eight
  recorded field-drop deaths. Do not re-introduce an explicit field list.
- **Derive-on-read.** Nothing is cached, so nothing goes stale. Do not add
  caching, an event bus, or an invalidation layer.
- **Provenance everywhere** — `*Basis`, `*Source`, `PRICE_LAYERS`,
  `priceVintage`, basis ladders.
- **`venueFor`, `budgetFor`, `vendorMoney`, `hostSpending`** — each exists
  because of a measured, documented failure. Consolidating them further is
  not an improvement.
- **The bookmarklet lodging path** — a deliberate never-build boundary, not a
  shortfall.

## What should be exposed differently

- Unused clauses + guessed type → one **"what I heard"** surface with
  resolution (Got it / Still need / I heard this too).
- Venue → a first-class **Place** door that can raise.
- Files, helpers, needs → real doors (today contextual or absent).
- Money → keep layer and vintage visible; they are truthfulness, not clutter.

## What needs repair

| Item | Why | Priority |
|---|---|---|
| Guest-count duplication (38 raw vs 3 via `guestCountFor`) | invented counts reach third parties | **P0** |
| Destination invariant trapped in the shell | a redesign silently re-breaks it | **P0** |
| `venueCity: "the"` | wrong city on a real phrasing | **P1** |
| Seating and rain have no browser proof | cannot verify parity | **P1** |
| Theme requires literal "theme" | silent loss | **P2** |

## What genuinely needs to be built

| Item | Size | Blocks |
|---|---|---|
| **Normalized needs model** | medium | **GOLD-04** |
| **Clause resolution record** | small | the "what I heard" experience |
| **Raisers for venue/food/money/schedule/tasks/weather** | medium, additive | next-action coverage |
| **Derived open-question item** in the raise shape | small | §6 alcohol-policy class |
| **GOLD-07 cascade spec** | small | the integration seam |

---

## Sequence

### P0 — before any redesign implementation
1. **GOLD-07 cascade spec.** Write it first; expect it to fail. It crosses the
   guest-count seam and will prove or disprove the duplication finding in the
   browser.
2. **Guest-count consolidation.** Adopt `guestCountFor` + `guestEstimateSource`
   across the 38 raw readers, starting with those that produce outward text.
3. **Extract the creation invariant.** `committedDestination(parsed, profile)`
   beside the parser, unit-tested without a shell. Shell calls it.
4. **Creation invariant suite** — one jest file asserting invariants 1, 2, 3
   against all three fixtures.

### P1 — before retiring any door
5. Browser proof for **seating** and **rain**.
6. **Needs model** + RSVP capture + at least one consuming surface.
7. `venueCity` fix.
8. Doors for **files**, **helpers**, **needs**.

### P2 — during redesign
9. **CommandCenter extraction** (below).
10. Raisers for the uncovered domains, one at a time, each with a spec.
11. Derived open-question item.
12. Remaining parser/schema items.

---

## CommandCenter extraction — proven, with the boundary

The owner asked for proof before a recommendation. Here it is.

| Lines | Content | React? |
|---|---|---|
| 1 – **~3744** | **Pure engine.** `eventPlan` (:2042), `selectEventNextAction` (:2890), `_selectEventNextActionInner` (:3047), `getEventReadiness` (:1018), `applicableReadinessAxes` (:1106), `deriveCommandCenterData` (:226), `actionConsequence` (:1899), `compareNextActions` (:2007), `latenessBoost` (:1952) | **none** |
| ~3745 – 4952 | UI helpers + sub-components — `useWindowWidth` (:3752), `useState` (:4084, :4153), `HOST_VENDOR_CHIP` (:4004) | yes |
| 4953 – 4993 | `CommandCenter` component | yes |

**Measured:** the only React usage below 4953 is at 3752/3753, 4084 and 4153 —
all in the UI half. The engine half imports no React and uses no hooks.

**Dependency direction is correct:** engine → lib. Nothing in the engine half
depends on the component.

**The seam is narrow where it matters.** `HostShellV2.jsx:37` imports exactly
two symbols — `eventPlan` and `applicableReadinessAxes` — **both above the
boundary**. 53 test files import from `CommandCenter`, but that is a
*mechanical* path update, not a behavioural risk.

**Recommendation:** move lines 1–~3744 behind `src/lib/plan/` (or similar) and
have `CommandCenter.jsx` re-export for compatibility, so the 53 test imports
keep working and can be migrated separately. **Tests that must stay green:** all
42 `eventPlan` files, `engineReachesTheShippingShell`, `ctaDeepLinks`,
`attentionRanksAndLands`, `criticalBlockerLeads`, `decisionSoundness`, plus the
hostv2 e2e hero specs. **Not during this gate.**

---

# VERDICT

## NOT READY FOR REDESIGN IMPLEMENTATION

The product direction is sound and the engine layer is in better shape than the
brief assumed — the consequence model works, provenance discipline is unusually
strong, and `eventPlan` is the right authority. The blockers are specific and
few.

**Exact reasons:**

1. **Two guest-count authorities are live** — 38 modules read `event.guestEstimate`
   raw against 3 using `guestCountFor`, and `guestEstimateSource` is referenced
   in exactly one file. The repo documents an invented count of 40 reaching a
   caterer in the host's name. Redesigning surfaces on top of a contested
   headcount multiplies the problem. **Fix before, not during.**

2. **A P0 correctness invariant lives only in the shell being replaced.**
   `HostShellV2:1724` is the sole thing preventing a guessed destination from
   becoming a permanent, grandfathered paywall stamp. A new creation surface
   that writes `parsed.isDestination` straight through looks correct and is
   not. This must move before the shell does.

3. **Two shipped surfaces have no browser proof** — seating and rain. Parity
   cannot be demonstrated for a surface whose current behaviour was never
   captured.

4. **GOLD-04 is blocked by a true capability gap.** There is no needs model
   anywhere; `rsvp.js` captures none. This is schema work, not parser work, and
   it is the only GOLD event blocked by absence rather than defect.

5. **GOLD-07 has no end-to-end spec**, and it crosses precisely the seam named
   in (1). Writing it is the cheapest way to convert that finding from a grep
   into a failing test.

**What would flip this to READY:** P0 items 1–4 complete, plus browser proof
for seating and rain. Items 2, 3 and 4 of the P0 list are days, not weeks. The
guest-count consolidation is the only substantial one, and it can be staged —
outward-facing producers first.

**Explicitly not blocking:** the missing raisers, the derived-question
primitive, the CommandCenter extraction, and every P2 parser item. Those are
redesign-era work and none of them is a prerequisite.

---
---

# SUPERSEDED 2026-10-19 — and what replaces it

The `NOT READY` verdict above is the **gate-time** verdict and is kept as that
record. All five of its reasons are closed:

| Gate reason | State | Evidence |
|---|---|---|
| 1 · Two guest-count authorities live | **CLOSED** | Sprint 0 P0-2 gated outward + both money paths; Sprint 0.5 D1 gave the existing canonical reader provenance and put a ratchet over the raw field. *(The reason's own numbers were wrong: `guestEstimateSource` does not exist — the field is `guestCountSource` — and `guestCountFor` had 1 runtime consumer, not 3.)* |
| 2 · A P0 invariant lives only in the shell | **CLOSED** | Moved into `travelFieldsToPersist`; persisted output byte-identical |
| 3 · Seating and rain have no browser proof | **CLOSED** | `seatingAndRainBaseline.spec.mjs`, 9 characterisation tests + a negative control |
| 4 · GOLD-04 blocked by a true capability gap | **CLOSED** | `accessNeeds.js`; the "no needs model anywhere" claim was one of three false absence claims — `accessibilityContext.js` existed |
| 5 · GOLD-07 has no end-to-end spec | **CLOSED** | `gold07RsvpCascade.spec.mjs`, 9 asserted boundaries |

---

# VERDICT (Sprint 0.5)

# READY FOR PEOPLE/ATTENDANCE REDESIGN

Narrower than "ready for the redesign", on purpose. The reasoning is in
`SPRINT_0_5_ARCHITECTURE_DECISIONS.md`; the boundary is here.

---

## IMPLEMENTATION BOUNDARY — first redesign slice

### Capabilities INCLUDED

1. **Attendance intake** — the count editor, the lock/reopen control, and
   switching between `guestMode: 'count'` and `'list'`.
2. **The roster** — add, edit, remove, kids, RSVP state.
3. **Attendance truth on screen** — the band, its basis, and its provenance:
   confirmed · planning · low/high · *whose number it is*.
4. **RSVP reply landing** — a public reply reaching the roster and re-ranking
   the plan (the GOLD-07 path end to end).
5. **Per-guest needs capture** that `accessNeeds.js` already owns — step-free,
   and the existing `access` array on a guest.
6. **The consequences attendance already raises**: the permit question
   (`placeQuestions`), seating tallies and the access instruction, food and
   supply sizing, per-head money.

### Capabilities EXPLICITLY EXCLUDED

| Excluded | Why |
|---|---|
| Weather / Day-of surfaces | No browser baseline. Parity cannot be demonstrated for behaviour never captured. |
| Failure-path surfaces (invalid route, producer failure, write failure) | GOLD-10 open at medium. |
| `CommandCenter.jsx` extraction | Untouched through two sprints and not required by any decision. Do not open it in this slice. |
| Place/Venue redesign | `placeQuestions` is *read* by this slice, not redesigned by it. The CRA permit-note reconciliation belongs to the Place slice. |
| Itinerary / excursions | Declared bounded gap. Do not build a destination for it to make the clause list shorter. |
| A second prioritiser, a consequence graph, a derivation registry | Ruled out with evidence in D2 and D3. |
| Backfilling `createdFromText` on existing events | Declared bounded gap #2. There is nothing to backfill from. |

### Canonical READERS — the redesigned surface may read attendance only through these

| Reader | Question it answers |
|---|---|
| `attendanceBand(event)` — `playbooks/index.js:600` | THE planning reader: confirmed / planning / low / high / basis / band / because / **countSource** / **countFromHost** |
| `guestCountFor(event)` — `guestCountFor.js` | The number and whose it is. Cheap, leaf, no playbook load. |
| `guestCountIsConfirmed(event)` | May this be stated outward? |
| `guestCountNotice(event)` | What to tell the host about a number the app supplied |
| `confirmedCovers(event)` | **Plates, not people** — catering and seating |
| `headsFor(event)` / `perHeadOf` | Who is in the number, for per-head division |
| `accessNeedsFor(event)` | Normalized needs + per-requirement reach |
| `heardNotUsedFor(event)` | What she said that the plan does not hold |
| `eventPlan(event)` | The ranked plan. **The only ranker.** |

A new raw read of `guestCount` / `guestEstimate` / `guests.length` must add an
entry to `theHeadcountHasOneCanonicalReader.test.js` with a semantic category
and a reason, or use a reader above. The gate will say so.

### Canonical WRITERS

| Writer | Owns |
|---|---|
| `patchEvent(obj, msg, opts)` — `HostShellV2.jsx:6792` | **THE one write path.** Generic undo is built here once; a write that bypasses it is a write with no undo. |
| `guestCountSource: 'host'` | Must be written beside any host-supplied count. `:7330` is the pattern. |
| `acknowledgeClausePatch` / `unacknowledgeClausePatch` | Clause answers |
| `answerPlaceQuestionPatch` | Place-question answers (`venueStepFree`, permit) |
| `assignGuestToTable` / `unassignGuest` | Seating assignment — patches, never mutations |

Every one returns or takes a **patch**. Nothing mutates the event in place.

### Routes

Three entry routes, code-split in `hostv2/src/main.jsx`:

- `?rsvp=CODE` → `InviteV2.jsx` — the public guest surface, **its own chunk**.
  The ~8,500-line host shell must never be downloaded for a guest;
  `guestPayloadGate.spec.mjs` enforces it.
- `?demo=lodging` → `LodgingCockpit.jsx`
- default (`?elegant=1`) → `HostShellV2.jsx`

In-shell surfaces are **sheets**, not URLs: `sheet.kind` of `guests`,
`seating`, `food`, `foodplan`, `budget`, `costshare`, `vendors`, `space`,
`venue`, `rain`, `tasks`, `decisions`, `risks`, `ask`, `qr`, `thanks` and the
rest. A redesign that introduces real URL routing for these is out of scope for
this slice.

### Persistence

| Key | Owner |
|---|---|
| `ngw-hostv2-custom-events` (`LS_CUSTOMS`) | `@app/lib/customEventStore` — **one definition, re-exported** by `eventPool.js`. Do not re-declare it; a 2026-09-02 board recorded what two owners for one bucket cost. |
| `ngw-hostv2-last-event` (`LS_LAST_EVENT`) | `eventPool.js` |
| `ngw-hostv2-deleted-events`, `ngw-hostv2-rail-min` | `HostShellV2.jsx:328,331` |
| `ngw-rsvp-queue-*`, `ngw-hostv2-wxseen-*`, `ngw-hostv2-wxnotify-*` | per-event, swept by `eventPool.js:112` |

Each event stores itself **whole** — no patch layer. Supabase sync is
additive and already covered by `crossDeviceSync.spec.mjs`.

### Consequence interactions the slice must keep working

| Change | Consequence that must follow |
|---|---|
| A reply lands | Roster → attendance band → food/supplies → seating → money → **rerank**. GOLD-07's 9 boundaries. |
| A host-given count crosses 50 outdoors | The permit question raises, answerable, naming the city |
| An **app-invented** count crosses 50 outdoors | **Nothing raises.** The sharpest assertion in the slice. |
| A step-free need + a named venue | The venue question raises; answering either way closes it and sticks |
| A count is locked | Outward surfaces may state it; before that they may not |
| A clause nothing consumed | Stays disclosed and answerable, through `heardNotUsedFor` |

### Required browser tests (must stay green, and are the parity contract)

`gold07RsvpCascade` · `seatingAndRainBaseline` · `theWalkerReachesThePlan` ·
`theClauseGetsAnAnswer` · `weNowNeedToKnow` · `guestPayloadGate` ·
`guestReplyPicker` · `guestTold` · `theCouplesSheSaidReachTheList` ·
`crossDeviceSync` · `closeItAndOpenItAgain` · `handlingTheVenueMyself`.

Command: `cd hostv2 && npm run e2e:build && npm run test:e2e`.

### Parity requirements

- `hostv2 npm run parity` clean — `e2e:build` runs it for you (3 kit atoms
  locked, 11 hero CSS selectors token-clean, nothing re-inlined outside
  `askKit.jsx`).
  **Not `npm run gate:hostv2`.** That byte-exact artifact gate is RETIRED:
  `/public/hostv2/` is gitignored (Model A), every release path builds it, and
  the gate rested on vite being reproducible across machines — which it is not.
  It failed continuously from 2026-08-01 and `checks.yml:499-512` carries the
  record. A local run of it reports drift against stale disk output and means
  nothing.
- `gate:cra` at **241 of 241** baselined warnings, verified **by exit code**.
- Ratchets are lower-never-raise: `textGateRatchet` (56), `spacingLadder` (269),
  `theHeadcountHasOneCanonicalReader`, `registryCompleteness` CONTRACT_IDS.
- All **14 redesign invariants** hold. Six are now enforced by named modules
  with tests; none may be returned to prose.
- `demo/src/App.js` stays **frozen** — donor-only.

### Surfaces that must remain reachable throughout the migration

Invariant 7: *every working capability needs a durable door before the old one
retires.* No door may close in this slice.

`?rsvp=CODE` invite · the guests sheet (count mode **and** list mode) · seating ·
food and the food plan · shopping · budget and cost-share · the ranked plan
board · the event switcher · the QR/share path · thank-yous · `?admin=1`
(internal) · `?demo=1` (QA chrome).
