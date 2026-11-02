# Creation truth & intake audit

**Status: evidence complete.** Every claim below is RUNTIME OUTPUT from
`parseSmartEventText` (`src/lib/smartParseEvent.js:48`), captured by a temporary
jest harness run against the three gate fixtures and then deleted. Nothing here
is read off the implementation.

Parser: 1,829 lines, 33 jest test files, two exports —
`parseSmartEventText` (:48) and `unusedClauses` (:1711).

---

## 1. What the parser actually produced

### WANDA-A

```
type            "Retirement Party"   typeBasis "named"
secondaryType   "Birthday"                         ← dual event, correctly held
guests          75          milestone "50th"       honoree "Wanda"
budget          5000
isDestination   true        destinationBasis "place-named"
venueCity       "the"       venueState "MD"        ← DEFECT
theme           null                               ← "black and gold" lost
unusedClauses   ["black", "gold",
                 "formal Army recognition followed by a celebration",
                 "food", "bar", "photography"]
```

### ANAHEIM

```
type Birthday   milestone "50th"
guests 16       guestPairs 8                       ← "8 couples" → 16. correct
monthYear       { year 2027, month 10, label "Nov 2027" }   ← month is 0-indexed
nights 5        lodgingKind "rental"               ← airbnb → rental
isDestination true  destinationBasis "landmark-named"
venueCity "Anaheim"  venueState "CA"               ← Disneyland → Anaheim. correct
overnight true  overnightBasis "said-so"
unusedClauses   ["2 excursions"]
```

### SANTA FE

```
type Birthday   milestone "80th"   honoree "Mom"
guests 30       date "2027-06-14"  endDate "2027-06-17"   nights 3
isDestination true  destinationBasis "travel-language"
travelMode "fly"    overnight true  overnightBasis "said-so"
timeOfDay "evening"                                ← from "dinner"
venueCity "Santa Fe"  venueState "NM"
healthNoted     { yes: true, quote: "the altitude is hard on her" }
unusedClauses   ["she uses a walker"]
```

**The §4 hypothesis is confirmed exactly.** Altitude is captured. The walker
statement is not — it lands in `unusedClauses`.

---

## 2. Classification of every dropped clause

The brief asked that these not all be treated as parser bugs. They are not.

> ### ⚠ CORRECTED 2026-10-18 — three of these classifications were WRONG
>
> The first version of this table claimed four of the six clauses had no
> canonical destination. **Three of those four claims were false, and all three
> failed the same way:** I searched for a module *named after the concept*,
> found none, and concluded the capability did not exist. Each one exists under
> a different name.
>
> The corrected rows are below. The honest summary of the error: this table
> reported a **capability gap** where the repo has a **wiring gap** — the
> structure is there and intake does not write to it. That is the same shape as
> the guest-count finding in the gate (the provenance was written; nothing read
> it), and it is good news: wiring closes with code, capability gaps need
> product decisions.
>
> Recorded rather than silently edited, because a planning artifact that
> quietly changes its own findings is worse than one that was wrong once.

| Dropped | Classification | Evidence |
|---|---|---|
| `"she uses a walker"` (Santa Fe) | **WIRING GAP** (was: downstream capability gap) | ~~No accessibility/mobility module anywhere in `src/lib`.~~ **False.** `src/lib/knowledge/accessibilityContext.js` (119 lines) is a grounded accessibility axis with real dated sources (ADA National Network temporary-events guide, MPI ADA mobility guide, inclusive-seating guidance), consumed by `playbooks/index.js:93,3634` so every decision carries `accessibilityContext` + `accessibilityGrounded`. Guest-level need is already structured too: `guest.access[]` rides the RSVP wire (`api/rsvp.js:188`), merges at `guestMerge.js:98`, and is READ by `seatingPlan.js:182`. `lodgingIntel` carries a `stepfree` must-have. **What is actually missing is narrow:** an EVENT-level operational need stated at intake (about the honoree, not a guest who RSVPs) has no home. That is P1-2's real scope. |
| `"2 excursions"` (Anaheim) | **UNCONFIRMED — the one still open** | Candidate destinations exist (`event.timeline` / `event.ros` segments; an `Activities` vendor category appears in `vendorCategoriesByType`), but neither has been traced to a consumer that would read an excursion truthfully. **Not asserted either way.** To be resolved in P1-4 before the parser is touched. |
| `"formal Army recognition followed by a celebration"` | **WIRING GAP** (was: missing normalized schema) | ~~No schema for ordered programme segments.~~ **False.** `event.ros` and `event.timeline` are both ordered segment arrays on the event blob, read by `vendorQuestions.js:243,372,435`, `rosOverlap.js`, and `dayPhases.js:123` (`programmeDays`). A two-part programme has a home; intake does not write to it. |
| `"food"`, `"bar"`, `"photography"` | **WIRING GAP** (was: missing normalized schema) | ~~No schema for vendor intent.~~ **False.** `vendorCategoriesByType.js` defines a per-event-type canonical vocabulary in which `Catering`, `Mobile Bar` and `Photography` are all first-class, and `event.vendors[].category` is where they live. The `"DJ"` asymmetry noted below is therefore not evidence of a missing schema — all four share one. |
| `"black"`, `"gold"` | **PARSER DEFECT** | `theme` requires the literal word. Reproduced: `"black and gold theme"` → `theme: "black and gold"`; `"black and gold"` → `null`. |
| `venueCity: "the"` | **PARSER DEFECT** | Reproduced in isolation: `"40 guests in the Maryland/DC area"` → `venueCity "the"`. The `<token> <STATE>` match takes the word before the state abbreviation. Note `"in the Phoenix area"` → `null/null`, so the fault is specific to the slash + state-abbreviation form. |

**Severity note (revised).** Two parser defects, small and local. Three wiring
gaps whose destinations are named above. **One genuinely open question**
(excursions). The walker case is no longer a capability gap and is no longer
the hardest item here — P1-2 narrows to normalising an intake-stated need and
connecting it to consumers that already exist.

**Why the original error matters beyond these six rows.** It is the third
correction this planning package has needed, and the second of the same kind
(after `guestEstimateSource`/`guestCountSource` and the `guestCountFor` consumer
count). All three came from reasoning about the repo by name rather than by
trace. Treat any remaining unverified "X does not exist" claim in these
documents as unproven until someone greps for the capability instead of the
word.

---

## 3. The composition invariant (P0)

Full chain, traced:

```
smartParseEvent.js:48   parseSmartEventText(text)
                        → isDestination true for ANY bare resolved city,
                          destinationBasis 'place-named'
                          (deliberate: "a miss silently deletes the whole travel stack")
HostShellV2.jsx:1724    destinationIsGuess = destinationBasis === 'place-named'
HostShellV2.jsx:1726    effIsDestination = fIsDestination ?? (destinationIsGuess ? null : !!parsed.isDestination)
                        → a GUESS becomes null (unanswered), not true
                        → 'travel-language' and 'place-differs-from-your-area' still commit
[creation write]        event.isDestination
passGate.js:78          if (ev.isDestination === true) reasons.push('destination')
                        → door 2 of Model D, STAMPED ONCE at creation
                        → grandfather rule: never recomputed
persistence             stored on the event blob, permanent
```

**Verified runtime behaviour:** `"birthday party, 40 guests in Bethesda MD"` →
parser says `isDestination: true / place-named`; the shell downgrades it to
`null`. Santa Fe's `travel-language` correctly commits.

**Why this is P0.** `passGate.js:72` documents the contract as "`isDestination`
— heard at intake, never inferred." That sentence is true **only because
HostShellV2 makes it true**. The engine alone infers. A redesigned creation
surface that writes `parsed.isDestination` straight through — the obvious,
innocent-looking thing to do — permanently stamps local events as
destination/pass-required, and the grandfather rule means it can never be
corrected. The UI would look perfectly correct while doing it.

**Smallest correct home for the rule.** Not HostShellV2, and not `passGate`
(which sees only the final boolean). It belongs **adjacent to the parser**, as a
named export that converts a parse result into committed event truth — e.g.
`committedDestination(parsed, profile)` in or beside `smartParseEvent.js`,
returning `true | false | null` with the three bases encoded. Then the shell
calls one function, the rule is unit-testable without a shell, and a new shell
cannot bypass it by accident. **Not to be moved during this gate.**

---

## 4. `unusedClauses` — the extraction receipt

Produced at `src/lib/smartParseEvent.js:1711`. Test:
`src/lib/__tests__/itSaysWhatItDidNotUse.test.js`. Also
`theParserSentencesItStillMisses.test.js`.

Traced against the brief's six questions:

| Question | Finding |
|---|---|
| How is it produced? | **Differential re-parsing**, not string diffing. Its own comment: "re-parsing without each clause and keeping only the ones that change NOTHING — the parser's own behaviour as the measurement, so this can never tell a host their headcount was missed when it was read." Pure function of the text. |
| Does Host V2 expose it? | **YES — PROVEN IN HOST.** `HostShellV2.jsx:203` imports it; `:9491-9500` renders the list under the heading **"Didn't make it into the plan."** |
| Why was it built? | `HostShellV2.jsx:9455` records the motivating defect verbatim: a host typed "…sit-down lunch, she uses a walker" and "BOTH vanished without a word — for an 80th, mobility is the constraint that decides venue access, seating and where the cake table goes." **The Santa Fe case in this audit is the case this feature was built for.** |
| Does it persist? | **No.** Recomputed from text each render. Nothing writes it to the event. |
| Can the host resolve a clause? | **No.** No write-back path found. The copy is explicit that this is "not an apology and not a promise. It hands the fact back so the host carries it themselves." |
| Is resolved info reparsed or canonically written? | N/A — no resolution path exists. |
| Can the same clause reappear after resolution? | **Yes, necessarily** — pure function of the original text, so the list is stable forever. |

**Architectural conclusion — the foundation is stronger than assumed.** This is
not a stub. It is rendered, honestly worded, and **differentially measured**
against the parser's own behaviour, which means it structurally cannot produce a
false "we missed this." Do not build a second mechanism.

What the proposed **Got it / Still need / I heard this too** experience needs is
exactly **one** new thing: a **per-clause resolution record on the event**, keyed
by clause text, that the recomputed list is filtered against. The
recompute-from-text property is a *feature* — it never drifts from the host's
original words — provided resolution is stored separately and subtracted at
read time.

**A related mechanism to reuse, not re-invent.** The same block
(`HostShellV2.jsx:9485`) declares a guessed event *type*: "Reading this as a
birthday because you said 'party'." It exists because of a measured finding —
deleting one character from the type word makes **35 of 45 playbook types
resolve to Birthday** ("Graduaton party", "Bridl Shower", "Retiement Party").
Unused clauses and guessed type are two instances of one pattern: *declare what
was inferred or dropped, one tap from correction.* The redesign should treat
them as one surface, not two.

---

## 5. What Creation does well, and must not be lost

Recorded because a redesign is likelier to destroy these than to notice them.

- **Dual-event typing** — WANDA-A produced `type: Retirement Party` +
  `secondaryType: Birthday`. Test: `dualEventNeedsAJoiner.test.js`.
- **Pairs arithmetic** — "8 couples" → `guests 16, guestPairs 8`. Test:
  `aCoupleIsTwoPeople.test.js`.
- **Landmark → city/state** — "Disneyland" → Anaheim, CA.
  `knowledge/landmarkGazetteer.js`; tests `theParkIsNotTheTown.test.js`,
  `aCityNicknameIsADataRuling.test.js`.
- **Basis fields everywhere** — `typeBasis`, `destinationBasis`,
  `overnightBasis`, `startTimeBasis`. Provenance is first-class at intake. This
  is what makes the destination guard possible at all.
- **Said-so beats derived** — `overnightBasis: "said-so"` outranks inference.
- **Honest non-use** — `unusedClauses` names what it dropped.

---

## 6. Carried into the implementation plan

| Item | Class | Priority |
|---|---|---|
| Destination composition invariant needs a non-shell home | composition/wiring | **P0** |
| `unusedClauses` → resolution record (Got it / Still need / I heard this too) | capability extension | **P0/P1** |
| Walker → normalized need | downstream capability gap | **P1** (blocks GOLD-04) |
| `venueCity: "the"` | parser defect | **P1** |
| theme without the literal word | parser defect | **P2** |
| "2 excursions" | missing schema | **P2** |
| Programme/recognition structure | missing schema | **P2** |
| food/bar/photography vendor intent; and why "DJ" differs | missing schema + inconsistency | **P2** |
