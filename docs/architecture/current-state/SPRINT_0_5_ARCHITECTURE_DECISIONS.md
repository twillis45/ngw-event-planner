# SPRINT 0.5 — ARCHITECTURE DECISIONS

**Measured 2026-10-19.** Four questions raised by `SPRINT_0_EXTERNAL_BRIEF.md`,
resolved against runtime and tests rather than module names.

No screens were redesigned. `CommandCenter.jsx` was not touched — no decision
below needed it. No second prioritisation engine exists: `eventPlan()` is still
the only ranker, and Decision 3 removed the one thing that looked like a rival.

**What Sprint 0.5 falsified in Sprint 0, up front**, because a sprint that only
confirms its predecessor is not a challenge:

| Sprint 0 said | Measured | Where |
|---|---|---|
| A canonical planning reader must be built (`attendanceFor`) | **It already existed.** `attendanceBand(event)` returns the exact proposed shape and the shell calls it "the canonical reader" | Decision 1 |
| 29 raw readers were "deliberately left, each defensible" | **One was not defensible** and would have written an app-invented count onto a contracted caterer | Decision 1 |
| `openQuestions` is a new, general consequence primitive | **A domain producer with a general name**, and the pattern predated it by months | Decision 3 |
| "No permit capability" would be a bounded gap | **The capability was inert, not absent** — the rule in Decision 4 rejects it | Decisions 3, 4 |

---

## DECISION 1 — ATTENDANCE SEMANTICS

### Evidence

Sprint 0 classified 32 raw headcount consumers, migrated 3, and left 29. The
brief's challenge was right to distrust that: the classification lived in a
document, and a document cannot stop consumer #33.

**The first finding inverted the question.** The brief asked whether we need
`attendanceFor(event)` with `confirmedCount` / `planningCount` / `source` /
`status`. We do not, because it is already there:

| Fact | Coordinate |
|---|---|
| `attendanceBand(event)` returns `{applicable, basis, low, high, planning, confirmed, maybe, pending, declined, kids, invited, band, because}` | `src/lib/playbooks/index.js:600` |
| The shell calls it **"the canonical reader"** | `hostv2/src/HostShellV2.jsx:3887` |
| …and says it **"owns the question"** | `:4040` |
| …and records a prior migration **to** it | `:4029` |
| `basis` already distinguishes `'rsvp'` / `'count'` / `'estimate'` | `playbooks/index.js:600+` |

Building `attendanceFor()` beside that would have been a second source of truth
created to make the architecture look cleaner — the thing the brief's own
working-style section forbids.

**Its real defect was provenance blindness.** Byte-identical output for a
headcount the host gave and a number the app substituted from a playbook
typical. That mattered more than it looks, because `attendanceBand` is also the
AI orchestrator's headcount tool (`src/lib/orchestratorTools.js:36`
`get_headcount`), so a model answering *"how many are coming?"* could not tell
whose number it was reading either.

**The genuine misclassification.** `src/lib/vendorAccountability/conflicts.js:167`
was filed under "operational planning" and left raw. It is not planning — it is
the outward/commitment boundary. Measured with `guestCountSource:
'playbook-typical'`, estimate 40, against a **CONTRACTED** caterer at 60:

```
severity:    high
explanation: "Caterer expects 60; guest tracker shows 40."
fix label:   "Match the guest tracker (40)"
patch:       { guestCount: 40 }   ← onto the vendor
receipt:     "Caterer set to 40 — it matches your guest tracker now."
```

The app offered to rewrite a contracted vendor's headcount to a number the host
never gave, and told her it now matched.

### Alternatives considered

| | Option | Rejected / chosen because |
|---|---|---|
| A | Leave all 29 raw | Rejected. The classification was right about 28 and wrong about one, and nothing would have caught the next one. |
| B | New `attendanceFor()` canonical API | **Rejected.** It exists. A second reader would duplicate truth and split 42 test files' worth of dependency. |
| C | Use the existing authority, add what it lacks | **CHOSEN.** `attendanceBand` gains provenance; no number anywhere changes. |
| D | Ban raw reads with a lint rule | Rejected as the whole answer. Most raw reads are correct, and "no raw reads" would break sizing before RSVPs — the failure mode the brief named explicitly. |

### Decision

1. **`attendanceBand` carries provenance** (`playbooks/index.js:600`)**.** Added `countSource` and
   `countFromHost`, spread into all three branches; the roster branch hardcodes
   `countSource: 'host', countFromHost: true`, because people entered one at a
   time are the host's by construction.
2. **The host is told, in her own language**, when the number is not hers:
   *"— not a number you gave, we filled that in from what this kind of event
   usually runs."* Appended to `because`, so every surface that already prints
   the reason prints the provenance too, with no new wiring.
3. **`conflicts.js` is gated.** The estimate term is now
   `guestCountFor(event).fromHost ? Number(event.guestEstimate) : 0` — an
   invented count produces no conflict, no fix button, and no patch.
4. **Raw reads stay, under a ratchet, not under a document.**
   `theHeadcountHasOneCanonicalReader.test.js` requires every file reading
   `guestCount` / `guestEstimate` / `guests.length` to declare WHICH semantic
   question it is asking and why the raw field answers it.

**That ratchet is the answer to "how do we make it difficult for consumer #33".**
Not a ban — a question #33 cannot avoid: *which of these are you asking?*
A reader that cannot name its category is a reader that has not thought about
provenance. The gate names the five canonical readers in its failure path, so
the fix is in front of whoever hits it.

### Affected consumers — the 29, grouped as the brief required

24 files read the raw field today (the 32 included duplicate sites in one file).
The brief's nine categories collapsed to seven, and the collapse is itself the
finding:

| Brief's category | Raw readers | Files |
|---|---|---|
| **Confirmed attendance required** | **0** | Every confirmed-attendance need already goes through `guestCountIsConfirmed` or `confirmedCovers`. There was nothing to migrate. |
| Canonical authority (the floor) | 4 | `guestCountFor`, `playbooks/index`, `confirmedCovers`, `perHead` |
| Applicability only — never the value | 6 | `phaseProgress`, `taskEngine`, `returnNarration`, `disclosure`, `appetite`, `intelEval` |
| Planning estimate / best-known count | 6 | `lodgingIntel`, `lodgingBasisLadder`, `crabPlan`, `cvbIntel`, `placeIntelligence`, `assembleRevealEngines` |
| Raw intake specifically required | 2 | `hostIntel`, `analyticsReader` (planned-vs-actual: the planned number IS the subject) |
| Sizing/calculation, labeled | 1 | `vendorPlan` |
| Outward + money/commitment | 3 | `doItForMe`, `budgetRecovery`, `vendorAccountability/conflicts` — **all three now gated in-file** |
| Display-only | 2 | `HostShellV2`, `LodgingCockpit` |
| Other | 0 | — |

"Best-known count" collapsed into planning (same read, same honesty
requirement). "Outward communication" and "money/commitment" collapsed into one
bucket because in this repo they are the same boundary — both require
`fromHost`.

### Tests

| Suite | Tests | Proves |
|---|---|---|
| `thePlanningCountKnowsWhoseItIs.test.js` | 16 | an estimate still drives planning; provenance rides along; the host is told |
| `anInventedCountIsNotAVendorConflict.test.js` | 7 (2 red first) | the measured defect, fixed |
| `theHeadcountHasOneCanonicalReader.test.js` | 5 | the ratchet, with a THE-GATE-BITES guard against a dead regex |

Acceptance, as specified: estimated attendance still drives planning (crab
coverage, lodging sizing, food plan — unchanged numbers) · confirmed attendance
still drives confirmation-sensitive behaviour · an invented count cannot reach
outward communications (`anInventedCountDoesNotLeaveTheApp`, 15) · an estimate
cannot become committed money (same suite) · **GOLD-07 intact** (9 boundaries,
re-run green).

### What survived falsification

Three Sprint 0 claims I tried to break and could not: crab cost is `qty ×`
host-entered `pricePerUnit`, so headcount drives only coverage advice;
`confirmed` is always 0 on an estimate-basis event, so the dangerous read was
always `planning`, never `confirmed`; the "Soft RSVPs" risk persisting is by
design (static contingencies).

---

## DECISION 2 — CLAUSE DERIVATION CONTRACT

### Evidence

Sprint 0 fixed three false "we didn't use this" alarms by teaching
`unusedClauses` about the creation seam's three readers, passed as
`opts.alsoDerives`, and wrote the trap down instead of closing it:

> A CALLER WHO FORGETS `alsoDerives` SILENTLY GETS THE FALSE ALARMS BACK.

Silently, and looking like data: the host is told her sentence was not
understood, which is the one thing that list exists not to get wrong. The
requirement was recorded in a doc comment — the same shape as P0-2's provenance
field, written at every site and read by almost nothing.

### Alternatives considered

| Option | Verdict |
|---|---|
| Central derivation registry (register-on-import) | **Rejected.** Moves correctness from "remember an argument" to "depend on module load order" — the same bug, harder to see. |
| Required argument | Rejected. A required argument you can pass `[]` to is a default with extra steps. |
| Static / lint enforcement | Rejected as primary. Catches the shape, not the semantics, and this repo's lint budget is already a ratchet. |
| Parser-owned registration | **Rejected, and forbidden:** it would import the planning engine into the parser. |
| **Canonical entry point (composition root)** | **CHOSEN.** |

### Decision

`unusedClauses` stays exactly what it is — the differential mechanism, and a
good one. It stops being the public entry point. `heardClauses.js` becomes the
composition root: it imports the seam readers itself and supplies them, so the
only callable surface is one that cannot be called wrongly.

```js
const SEAM_READERS = [heardAccessNeeds, heardMustHaves, heardStayStyle];
export function clausesNotUsed(text) { … unusedClauses(t, { alsoDerives: SEAM_READERS }) … }
export function heardNotUsedFor(event) { … }
```

**There is no second argument to forget.** Adding a future seam consumer is one
line in `SEAM_READERS`.

**Why the root can live there, measured rather than assumed.** The guest invite
path (`InviteV2.jsx`, `inviteShared.js`) imports neither `heardClauses` nor the
parser, so composing the readers here adds nothing to the chunk a guest
downloads — the boundary `guestPayloadGate.spec.mjs` exists to protect. The
dependency points down, from root to parser, so no cycle is created.

### Enforcement

`theClauseReadersAreNotOptional.test.js` scans `src/lib` and `hostv2/src` for a
**call** or import of `unusedClauses` and fails on anything outside two allowed
files (the definition and the root). The repo's `CALLED_FROM_OUTSIDE` idiom,
with its THE-GATE-BITES companion asserting the scan still finds those two.

Block comments are stripped before line comments — the shell discusses this
mechanism in two JSX `{/* … */}` comments whose continuation lines carry no
marker, and a line-only strip reported the shell as a caller after it had
already been migrated.

### Tests

6 tests. The sharpest is the naive call: `clausesNotUsed(text)` with nothing
else, asserting none of the three measured clauses leaks — plus the inverse,
that a clause nothing consumes is *still* reported, so the mechanism was not
turned off to achieve it.

One existing test was **re-anchored, not weakened**, and the distinction is
recorded in place: `iHeardThisTooAndThenWhat`'s "a clause becomes canonical and
leaves the list on its own" simulated a future reader by passing one through
`heardNotUsedFor(ev, opts)`. That argument is gone on purpose, so the test now
asserts the property at `unusedClauses`, where it belongs — it is the
differential comparison that makes a new reader self-registering. Required
behaviour kept; obsolete implementation detail dropped.

---

## DECISION 3 — CONSEQUENCE / OPEN-QUESTION ABSTRACTION

### The three cases, from repository evidence

**CASE 1 (the reference) · Venue × access — two facts coexisting.**
P1-2 normalised "she uses a walker" and recorded `place` as deliberately not
reached. True of any unnamed venue; false the moment the host names one. The
answer lives at the venue.

**CASE A · Attendance × outdoors → a city permit — a derived number crossing a
line.** Materially different: not two facts meeting, but one number passing a
threshold. Below ~50 outdoors a permit is nobody's problem; above it, it is the
thing that can end the event.

> **The app has said this all along and nobody could act on it.**
> `src/lib/placeIntelligence.js:182` has pushed exactly this sentence as a
> `notes` entry since long before P1-5 existed. `derivePlaceIntelligence` is not
> in `surfaceRegistry`, so it never raised, could not be answered, and never
> resolved — and the only surface that renders `pi.notes` is `src/App.js:41420`,
> the **frozen** CRA shell, inside a card collapsed by default. In the shipping
> shell it was not rendered at all. **Found inert, not absent.**

Now a raised, answerable question, gated on provenance: it reads
`attendanceBand().countFromHost`, so an app-invented typical count cannot
manufacture a consequence. A fabricated consequence is worse than a missing one
— it would send a host to a city office over a number she never gave.

**CASE B · Vendor × schedule window — and the finding is that it was already
done.** `src/lib/vendorAsks.js:82` raises an arrival-time ask through
`surfaceRegistry:62`, and has since before P1-5 was written. **Deliberately not
moved into the new module.** Moving it would have manufactured evidence for the
abstraction by relocating a working rule into it.

### Resulting architecture

The three cases produced **two owners and zero need for a central one**.

| Question | Answer | Evidence |
|---|---|---|
| Does `openQuestions` remain the right abstraction? | **No — not as a general one.** Narrowed. | It was a fifth domain producer wearing a general name |
| Should it be renamed? | **Yes, and the name already collided** with `CommunicationHub.jsx:1349` | `openQuestions.js` → `placeQuestions.js` |
| Does the raiser belong where it is? | **Yes.** One `surfaceRegistry` surface; `eventPlan()` still the only ranker | 18 surfaces contribute raises; nothing ranks twice |
| Are question generation and attention raising separate concerns? | **Yes — and the repo already separates them.** Generation is domain-local and pure; raising is one registry entry | Case B generates in `vendorAsks`, raises via the registry |
| Should consequences stay domain-specific with a shared result contract? | **Yes.** `surfaceRegistry` IS that contract | Case B predates the primitive and needed nothing from it |

Renames: `openQuestionsFor` → `placeQuestionsFor`, `answerOpenQuestionPatch` →
`answerPlaceQuestionPatch`, `OPEN_QUESTION_FIELDS` → `PLACE_QUESTION_FIELDS`,
registry id `openquestions` → `placequestions`. Migrated in place — first rule,
both rules' tests, the registry contract entry and the shell — with no parallel
model left behind.

**The rule that survived all three cases:**

> **A consequence belongs to the domain where its ANSWER lives, not the domain
> that triggered it.**

Case A is triggered by attendance and answered by a city, so it lives with
place, beside the venue rule. That is why `placeQuestions` holds two rules of
different shapes and is still coherent.

### What remains provisional

- **Two rules is not a proven abstraction.** `placeQuestions` is a module with
  two rules that happen to share a `{question, because, askWho, field}` result
  shape. If a third place-answered consequence does not arrive, that shape is
  convention, not contract — and should stay un-extracted.
- **No cross-domain consequence propagation exists, and none is proposed.**
  Derive-on-read is untouched: no cache, no event bus, no invalidation.
- **Case B was not migrated.** If a future slice gives the vendor domain a
  second ask of this shape, the question of whether `vendorAsks` wants the same
  result shape reopens. It is not open now.
- **One deliberate non-fix, recorded so it is not read as an oversight.** The
  CRA permit *note* stays ungated while the permit *question* is gated, because
  they are not the same statement: a hedged, numberless nudge to check is honest
  on any basis, while a ranked job quoting a derived number back to the host is
  not. Withholding "you might need a permit" from a host whose event is probably
  60 people would be the "no confirmed count → useless planning" failure the
  brief forbids. This is where provenance gating correctly stops.

### Tests

26 unit (`weNowNeedToKnow.test.js`) · 7 browser
(`hostv2/e2e/weNowNeedToKnow.spec.mjs`). Both rules, both negative controls
each, independence (both can be owed at once; answering one leaves the other
open), and the composition assertion:

> `DECISION 1 COMPOSED IN — an app-invented count cannot manufacture a permit`

paired with *"…and a real roster of 60 yeses DOES raise it"*, so the refusal is
proven to be about provenance rather than about the number.

---

## DECISION 4 — BOUNDED-GAP GOVERNANCE

### The list, challenged

The eight proposed conditions are kept. Repository evidence adds three and
sharpens two; nothing was removed, because every one of the eight does work.

**ADDED 9 · ABSENT, NOT INERT.** The capability must be genuinely missing — not
present-but-unreachable. *Why:* Decision 3 found the permit truth sitting in
`placeIntelligence.js:182`, rendered as a note in the frozen shell behind a
collapsed card, unraised, unanswerable and unresolvable. Sprint 0 would have
filed "no permit capability" as a bounded gap. It was not a gap: it was a
consequential sentence shown to the host with no way to act on it, record an
answer, or stop being asked — a **false implication** (condition 3) wearing a
gap's clothes, and strictly worse than silence.

**ADDED 10 · THE JUSTIFICATION IS PINNED BY A TEST, NOT A PARAGRAPH.** Every
bounded gap is bounded *because* of a measured fact about the destination that
would have to receive the information. Pin that fact. *Why:* the CLAUDE.md
surfaces table — the first thing read every session — stated a gate status that
had been false for six weeks. Prose rots, and this repo has a metered example of
exactly how long it takes.

**ADDED 11 · THE GAP CANNOT GROW SILENTLY.** A gap whose size is a function of
future work needs a ratchet, not a note. *Why:* Sprint 0 measured the
false-alarm count growing by one *the moment P1-2 added a fourth seam consumer*.
The repo's native mechanism for exactly this is the lower-never-raise ratchet
(`textGateRatchet`, `spacingLadder`), not a paragraph.

**SHARPENED 2 · the evidence must come from the destination's own writer or
validator — never from a failed name search.** *Why:* Sprint 0 made three false
"missing schema" claims and all three failed identically: search for a module
*named* after a concept, find none, conclude the capability is absent.
`accessibilityContext.js`, `event.ros`/`timeline` and `vendorCategoriesByType.js`
all existed with live consumers, and correction 3 changed the shape of two whole
slices.

**SHARPENED 5 · the honesty test must assert at the reader the SURFACE calls,
and must be red-proofed.** *Why:* Sprint 0's destination invariant lived in
`HostShellV2` and `travelFieldsToPersist` trusted its caller; a test pinned to a
mechanism a wrapper has since replaced passes while the screen goes quiet. The
excursions honesty test is pinned at `unusedClauses`, which Decision 2 made
non-public — so Decision 4 added the assertion at `clausesNotUsed`, the reader
the shell actually calls.

### The final rule

A capability gap is **NON-BLOCKING** only when **all eleven** hold:

| # | Condition |
|---|---|
| 1 | The gap is explicitly named. |
| 2 | Repository evidence proves the capability does not exist — **evidence from the destination's own writer or validator, never from a failed name search.** |
| 3 | No current UI/runtime behaviour falsely implies that it exists. |
| 4 | The product handles the missing capability honestly. |
| 5 | A regression test prevents accidental false claims — **asserted at the reader the surface calls, and red-proofed.** |
| 6 | The gap has an explicit future disposition: planned · intentionally unsupported · deferred pending product decision · superseded. |
| 7 | The gap does not violate a core product invariant (the named 14). |
| 8 | The gap does not corrupt event truth, money, attendance, persistence, routing or external communication. |
| **9** | **The capability is ABSENT, not INERT** — not present-but-unreachable, and not stated on screen with no way to act on it. |
| **10** | **The justification is pinned by a test**, so the day the destination changes, the stale excuse fails instead of standing. |
| **11** | **The gap cannot grow silently** — if its size is a function of future work, it carries a ratchet. |

Fail any one → **REDESIGN BLOCKER**, or not a bounded gap at all (see the
third outcome below). The rule is enforced where it can be:
`src/lib/__tests__/aBoundedGapStaysBounded.test.js`, 8 tests. Conditions 1 and 6
are document conditions and stay here, with a measurement date — a test that
greps a markdown file for its own paragraph is theatre.

**The rule has three outcomes, not two.** Sprint 0.5's most useful finding is
that most things called gaps are not capability gaps at all, and a two-way rule
would have forced them into the wrong bucket.

### Worked examples

#### 1 · `"2 excursions"` → **ACCEPTABLE BOUNDED GAP**

| # | Holds? | Evidence |
|---|---|---|
| 1 | ✓ | Named here, in the ledger, in the intake audit |
| 2 | ✓ | **From the destination's own validator:** `itinerary.js:155` `if (!title) return null` — a programme row with no thing named is dropped by the module that would have to hold it. A vendor row needs a vendor. A bare count of unnamed outings supplies neither. |
| 3 | ✓ | No surface claims an itinerary capability; `guestItinerary` on an event with nothing returns `{relevant:false, rows:[]}` |
| 4 | ✓ | The clause is disclosed and answerable, in her words |
| 5 | ✓ | Asserted at `clausesNotUsed` (the shell's reader) **and** `heardNotUsedFor` on a saved event; red-proofed |
| 6 | ✓ | **Superseded, mechanically:** it leaves the list on its own the day a consumer reads it, on every existing event, with nothing to backfill |
| 7 | ✓ | Invariant 3 is the reason it is disclosed at all |
| 8 | ✓ | No money, attendance, persistence, routing or outward path touches it |
| 9 | ✓ | Absent, not inert — the parser writes no `itinerary`/`ros`/`timeline`/`activities`/`vendors` field from that sentence |
| 10 | ✓ | `THE JUSTIFICATION IS PINNED` — if `normRow` ever accepts a nameless row, the test fails and says to re-adjudicate |
| 11 | ✓ | Fixed size: one clause, one sentence, one host |

#### 2 · Pre-existing events have no stored sentence → **ACCEPTABLE BOUNDED GAP**

A different shape, which is why it is here: not a missing destination but a
missing *history*. P1-3 made the sentence survive creation; it cannot be
backfilled, because events created before that slice never stored what the host
typed and nothing can reconstruct it.

Honest handling is **silence** — `heardNotUsedFor` returns `[]`, not a guess and
not an error the host has to read. Disposition **superseded**, and the test
proves the supersession is real rather than asserted: a new event created today
does carry the list.

#### 3 · The permit truth, as Sprint 0 would have filed it → **BLOCKER (fixed)**

Fails **9** outright, and **3** with it: the app put a consequential sentence in
front of the host with no way to answer it, no record that she had, and no path
to the ranked plan. This is the example that proves the rule bites, and it is
not hypothetical — Decision 3 found it and fixed it.

#### 4 · An estimate reaching money through `guestCountResolved` → **BLOCKER (fixed in Sprint 0)**

`playbooks/index.js:564-567` resolves an estimate-only event to `resolved: true`
— correct for its own question ("has the host given a number / are RSVPs
settled?"), fatal as a provenance gate. `hostSpending` and `budgetRecovery` OR'd
it beside the real gate, so money routed around confirmation. Fails **8**
(money) and **7** (invariants 5 and 8). Sprint 0 removed both branches. The
function remains, with every surviving consumer in the frozen CRA shell, where
it is a progress indicator and not a gate.

#### 5 · GOLD-06 weather and GOLD-10 failure injection → **NOT A CAPABILITY GAP**

The rule's third outcome, and the proof it cannot be used as a loophole. These
fail condition **2** immediately: the capability **does** exist and ships. What
is missing is a browser baseline, which is a **coverage risk**, not a gap — and
coverage risk is handled by *scoping the verdict*, which is why Sprint 0's
READY excluded Weather/Day-of and the failure paths and why this verdict is
narrower still. A bounded-gap rule that accepted "no test" as "no capability"
would launder unbaselined code into READY. This one refuses at the first
condition.

#### 6 · The CRA permit note beside the new permit question → **NOT A GAP (debt, outside this slice)**

Two statements of one truth, one provenance-gated and one not — the repo's named
recurring defect shape ("one field, two meanings"). It is not a capability gap:
the capability exists and has an owner. It is not a duplicate surface in the
shipping shell either, because `pi.notes` is rendered only by the frozen CRA
shell. Recorded in the implementation boundary as a Place-slice reconciliation,
with the reasoning for the deliberate non-fix in Decision 3 above.

---

## THE SPRINT 0 GAINS, RE-RUN (brief §5)

Each one re-executed on 2026-10-19 at the close of Sprint 0.5, not inferred
from a full-suite total.

| Gain to preserve | Re-run | Result |
|---|---|---|
| Destination invariant | `aGuessIsNotADestination` | 15 ✓ |
| Guest-count outward / money protection | `anInventedCountDoesNotLeaveTheApp` | 15 ✓ |
| **GOLD-07** | `gold07RsvpCascade` on its own bundle (rebuilt) | 2 tests / 9 boundaries ✓ |
| Seating / Rain characterisation | `seatingAndRainBaseline` | 9 ✓ (inside a 24-spec run) |
| Normalized access needs | `oneAccessNeedOneAnswer` + `theWalkerReachesThePlan` | 29 + 2 ✓ |
| Heard-clause resolution | `iHeardThisTooAndThenWhat` + `theClauseGetsAnAnswer` | 17 + 4 ✓ |
| Creation repairs | `theTownAndTheColors` | 14 ✓ |
| Venue open-question behaviour | `weNowNeedToKnow` (unit + browser) | 26 + 7 ✓ |
| The guest-payload chunk boundary (D2's constraint) | `guestPayloadGate` | ✓ |
| Reply → roster, pairings, persistence, venue non-nagging | `guestReplyPicker` · `theCouplesSheSaidReachTheList` · `closeItAndOpenItAgain` · `handlingTheVenueMyself` | ✓ |
| Cross-device sync | `crossDeviceSync` on the synctest bundle (rebuilt) | 4 ✓ |
| **All 14 redesign invariants** | re-read against the current tree | **all hold; none weakened** |

**Browser total re-run today: 43 tests across 11 spec files, all passing** (13 +
24 + 2 + 4). No matrix: this container ships chromium 1194 against the repo's
pinned 1228, so the runs used a session-local `PLAYWRIGHT_BROWSERS_PATH` shim —
**no repo file changed and `playwright install` was never run.**

**One test changed, and the distinction was written before the change** (brief
§5's requirement): `iHeardThisTooAndThenWhat`'s canonical-write-path test was
re-anchored from `heardNotUsedFor(ev, opts)` to `unusedClauses`, because D2
removed that options argument *on purpose* and the property being asserted
belongs to the differential mechanism, not to the entry point. Required
behaviour kept; obsolete implementation detail dropped. Nothing else was
touched, and nothing was weakened to accommodate an API change.

---

## MEASURED STATE

| | |
|---|---|
| Unit tests | **618 suites / 8,502 passed**, 1 skipped (from 613 / 8,449 at Sprint 0 close) |
| The four decisions' own suites | 6 suites / **68 tests**, all green; 2 red-first (`anInventedCountIsNotAVendorConflict`, and Decision 2's guard, which really did report the shell as a caller), 1 red-proofed after the fact (`aBoundedGapStaysBounded`'s pinned justification) |
| Sprint 0 + 0.5 suites together | 11 suites / **159 tests** |
| `gate:cra` | **241 of 241** baselined — verified by exit code, not a piped tail |
| hostv2 parity gate | clean — `hostv2 ▸ check-parity.mjs`, exit 0. (Not `gate:hostv2`: that byte-exact artifact gate is retired, `/public/hostv2/` is gitignored, and a local run of it reports drift against stale disk output.) |
| `CommandCenter.jsx` | **untouched** |
| New runtime modules | 0 — Decision 1 extended an existing authority, Decision 3 renamed one |
| Ratchets bumped | `textGateRatchet` 54 → 56, each with written justification |

### Test / build reproducibility (brief §6)

The browser suite needs `REACT_APP_API_BASE_URL` baked into the Host V2 bundle.
That fact lived in **three places that disagreed**: `fixtures.mjs` said "the e2e
build bakes it" (nothing local did), `playwright.config.mjs` said to run `npm run
build` first (which bakes no `REACT_APP_*` at all), and the only real definition
was a CI `env:` block. Following the local comments produced a bundle the suite
was never written against — 33 specs failed on it and the failures read as code
defects.

**Fixed as a script, not a paragraph:**

```
hostv2 ▸ npm run e2e:build && npm run test:e2e
```

`e2e:build` runs the parity gate and bakes the fake host; `checks.yml` now calls
the same script instead of carrying its own copy of the value, so local and CI
cannot drift apart again. Both misleading comments now point at it.
