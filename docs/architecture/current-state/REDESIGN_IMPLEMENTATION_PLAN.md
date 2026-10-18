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
