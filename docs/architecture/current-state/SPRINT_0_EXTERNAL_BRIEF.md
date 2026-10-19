# NGW Event Planner — Redesign Readiness Sprint 0: external review brief

**Prepared for an outside reviewer with no access to the repository.** Everything
below is measured against the codebase, not estimated. Where a number is a
count, it was produced by running something.

**Date:** 2026-10-19 · **Branch:** `main-2utz0n` · **Head:** `af5cb79`

---

## 1. What the product is

A web app for planning real-world events (reunions, birthdays, cookouts,
retirement parties). The host types one sentence, the app parses it into an
event, and ~18 surfaces derive a plan from it: a guest roster, a food and
shopping plan, seating, lodging and travel, money, a day-of checklist, a risk
list, and a ranked "what needs you today" board.

Two front ends share one engine:

| | |
|---|---|
| `src/lib/**` | The engine. Pure modules, no I/O, no UI. Jest-tested. |
| `demo/src/App.js` | Legacy CRA shell. **Frozen**, donor-only. |
| `hostv2/**` | The shipping shell (React + Vite). **jest cannot execute it** — browser tests only (Playwright). |

That last line matters repeatedly below: anything that lives inside the shell
rather than the engine is unreachable by unit tests, so it either has a browser
test or it has never been executed by any test.

---

## 2. The architecture, stated accurately

The redesign planning gate was commissioned partly to find out whether the app
needed a new architecture. **It does not.** The measured findings:

**Derive-on-read is the consequence model.** One event object; pure authority
modules read it; nothing is cached. There is no staleness problem and therefore
no invalidation problem. The gate's recommendation was explicitly *do not add
caching, an event bus, or an invalidation layer.*

**Provenance is pervasive and load-bearing.** Fields carry how they were
learned: `typeBasis`, `destinationBasis`, `overnightBasis`, `startTimeBasis`,
`guestCountSource`, `themeBasis`, plus price layering (`PRICE_LAYERS`,
`priceVintage`). A paired idiom — `startTimeIsConfirmed`, `guestCountIsConfirmed`
— gates whether an app-derived value may be shown to a third party.

**One prioritizer.** `eventPlan()` is the sole authority for "what needs you
next"; ~18 surfaces in a `surfaceRegistry` contribute *raises*, and `eventPlan`
orders them. 42 test files depend on this.

**The repo's recurring defect, in its own words:** *"One field, two meanings"* /
*"A concept with eight implementations has no owner."* Nearly every bug Sprint 0
fixed is an instance: the capability existed, and two consumers disagreed about
it.

**The repo's own engineering culture is unusually strict**, and this constrained
the work: ratchet gates that may only fall (off-ladder spacing literals, CRA
build warnings baselined at 241), a registry contract list that refuses new
surfaces added "by side door", a guard that pins the exact set of parser output
fields, and a convention of recording *why* in the code rather than in a wiki.
Several of these caught my changes. All of them were correct to.

---

## 3. What Sprint 0 was asked to do

The prior gate returned **NOT READY FOR REDESIGN IMPLEMENTATION** with five
blockers. Sprint 0's mandate: remove the minimum set of blockers to flip that
verdict, **preserving existing behavior**, in eight ordered slices — and
explicitly:

- do not start the visual redesign;
- do not extract `CommandCenter.jsx` (4,993 lines) unless a change requires it;
- do not combine unrelated cleanup;
- tests before changes; focused + broad regression after each slice;
- maintain a migration ledger (before → change → invariant → tests → consumers
  → rollback risk);
- **where no truthful destination exists for a fact, do not pretend parsing
  solves it — preserve it as unapplied truth.**

---

## 4. What shipped

Eight slices, eight commits, each with its own tests and ledger row.

### P0-1 — Destination invariant

**Defect:** the parser sets `isDestination: true` for any bare resolved city
(`destinationBasis: 'place-named'`). The only thing stopping that guess from
being persisted was a downgrade in the shell. `passGate` reads
`isDestination === true` as one of three paywall doors and **stamps the verdict
once at creation; a grandfather rule never recomputes it.** A redesigned
creation surface passing the parser's finding straight through would
permanently and uncorrectably mark local parties as owing $39 — while looking
correct.

**Fix:** the invariant moved into `travelFieldsToPersist`, which no longer
trusts its caller. 15 tests (6 red first). Persisted output byte-identical —
proven by a characterization test that passed *before* the change.

### P0-2 — Guest-count authority

**Defect:** the creation seam substitutes a playbook typical when the host gives
no count, and records that honestly as `guestCountSource: 'playbook-typical'`.
The provenance was written; **almost nothing read it.** Measured: the confirmation
gate had **1** runtime consumer while **32 files / 120 sites** read the headcount
raw. This had already caused a measured incident — an invented "40" reached a
caterer in the host's name.

**Fix:** all consumers classified into the six requested categories; **3
migrated**, the rest left raw with written reasons:

| Category | Verdict |
|---|---|
| Outward communication | **Gated.** Webhook payload migrated; vendor outreach already gated. Verified exhaustive — no other outward path embeds a headcount. |
| Money | **Gated** where it becomes budget money (`hostSpending`, `budgetRecovery`). |
| Canonical attendance / display / intake / operational planning | **Left raw, deliberately.** These ask "is there a number at all?" to decide whether a surface applies, or size a preview from a playbook typical — which is what a typical is *for*. Protection belongs at the boundary, not at every internal step. |

Both money modules had been OR-ing in a second predicate that answered a
different question ("are RSVPs settled?") and resolved estimate-only events to
true — routing around the gate entirely. Removed.

### P0-3 — GOLD-07, the RSVP cascade end to end

**Defect:** every hop had coverage and the cascade had none. No spec walked
`public RSVP → backend → readback → attendance → Food → Shopping → Seating →
Money → ranked plan`. Seating had **no browser test at all**. Two structural
causes: jest cannot execute the shell, so the readback's 18-line field mapping
was unreachable; and the shared e2e build bakes no API base, so the entire
backend leg was unreachable from the browser suite.

**Fix:** a new browser spec with **9 asserted boundaries**, on its own bundle so
the backend leg actually executes. The guest is a stranger — empty
`localStorage`, so the invite must resolve from the server, as it does for every
real guest. The host then reads back **the POST body the spec captured off the
wire**, not a fixture that happens to agree with it. Every number is measured
twice in one run against the same price vintage, so a price refresh cannot fail
it for free.

**The cascade is healthy.** It propagates at all nine boundaries, including the
ranked plan *swapping* jobs: *"6 guests still have not replied"* disappears and
*"5 confirmed guests still need seats"* takes its place.

### P1-1 — Seating and Rain parity baselines

Both surfaces had unit tests and **zero** browser coverage. 9 characterization
tests recording what they do today, so a redesign that changes any of it fails
on purpose. Includes a negative control (an indoor-typed event is never asked
for a rain plan) without which the whole block could pass on an app that asks
everyone.

### P1-2 — Normalized Needs v1

**The gate called this a capability gap. It was wrong, and the truth is worse:**
two consumers already acted on an access need, with two vocabularies reading two
fields.

| Consumer | Read | Knew "walker"? |
|---|---|---|
| Seating | structured array **and** free text | **No** |
| Lodging | free text **only** | Yes |

So the same guest got a ground-floor bedroom and no reachable seat, or the
reverse, depending on which box her need was typed into.

**Fix:** one owner module holding the vocabulary *and* the rules that read it.
Two hard lines, both tested: **no diagnosis** (the output names equipment and a
route, never a condition) and **no invented person** ("she" names nobody the app
knows, so the owner stays null rather than being resolved to a likely roster
row).

**The five domains, measured:** seating and lodging **wired**; `place`, `ground`
and `the-day` **not** — no venue-accessibility data exists to reason from, and
wiring them would fabricate consequences. Those three are **reported**, not
hidden.

### P1-3 — `unusedClauses` resolution

**The brief's premise was backwards.** It asked for resolution so a clause does
not "endlessly resurface". Measured: the disclosure list has **one** render site,
in creation, computed live — and the sentence was never stored. Nothing
resurfaced. The clause was shown **once**, while the host was still typing the
event into existence, and then lost for good.

**Also found: three false alarms.** The creation seam reads the host's sentence
with three consumers the parser knows nothing about. The disclosure list only
ever re-parsed, so everything those consumed read as *dropped*:

| Host typed | Actually consumed as | Host was told |
|---|---|---|
| `a house with a hot tub` | a lodging requirement | "Didn't make it into the plan" |
| `resort spa` | the stay style | "Didn't make it into the plan" |
| `she uses a walker` | an access need (new) | "Didn't make it into the plan" |

Two pre-existing; P1-2 added the third — the count grows by one with every new
seam consumer. This is the exact failure class that module's own comment says it
is biased against: *"a false alarm costs them the belief that the list means
anything."*

**Fix:** the differential mechanism is preserved and now compares *everything
creation derives*, not just the parse (injected, not imported, to keep the
parser off the guest invite's critical chunk). And the model **stores her
sentence, not the list** — so the day a consumer starts reading a clause, the
differential stops reporting it, on every existing event, with nothing to
backfill. Acknowledgement is one entry in a status map, is not deletion, and is
undoable.

### P1-4 — Creation defects

**`venueCity: "the"`** from *"40 guests in the Maryland/DC area"*. One character
causes it: the matcher's leading `[A-Z]` is a deliberate proper-noun test, but
the pattern carries an `i` flag so state names can be typed in any case — and a
case-insensitive `[A-Z]` matches lowercase, so the test silently stopped
happening. It costs more than a wrong string: that field feeds geocoding,
weather, the shopping list, lodging search and maps, and `"the, MD"` geocodes to
nothing, taking all of them quietly down. The file already owned the right guard
and had declared it ~100 lines *below* the branch that needed it, where
referencing it would have thrown.

**A colour pair now reads as a theme.** `"black and gold theme"` worked;
`"black and gold"` — the commoner phrasing — set nothing and reported both words
as dropped.

**Canonical destinations identified before touching the parser**, as required:
the programme-sequence and vendor-intent clauses **have** destinations (ordered
segment arrays; a per-event-type vendor category vocabulary) and are wiring work
for the redesign. **`"2 excursions"` has none** — a vendor row needs a vendor, a
timeline row needs a day and a thing, and a bare count of unnamed outings
supplies neither. Preserved as unapplied truth rather than parsed into something
invented.

### P1-5 — The narrow consequence primitive

Derive-on-read answers *"given everything known, what is true?"* It has no way to
say *"answering that has made a different question relevant, and nobody has asked
it."*

**One rule, and the reference case is real.** P1-2 recorded `place` as a domain
it deliberately does not reach. That is honest about an *unnamed* venue — and
stops being the whole story the moment the host names one:

> *Is there a step-free way into The Lodge at Santa Fe?*
> You named The Lodge at Santa Fe, and you said "she uses a walker" needs a
> step-free route. **Ask the venue.**

The app does not answer it and cannot — it holds no accessibility data for any
venue. It names the unknown, names who can settle it, records the answer, and
stops asking. "No" closes it as firmly as "Yes", because *there are steps* is
information, not an open question. One raiser; `eventPlan()` remains the
prioritizer.

---

## 5. Verdict

# READY FOR REDESIGN IMPLEMENTATION

**Conditional, and the condition is substantive:** ready for the
**Guests → Attendance → Consequence** domain first; **not yet** for
Weather/Day-of or failure-path surfaces, which still have no browser baseline.
Redesigning those would mean changing surfaces whose current behavior nobody can
prove — exactly what P1-1 existed to prevent.

| | |
|---|---|
| Gate blockers | **5 of 5 closed** |
| Redesign invariants | **14 of 14 hold**; 6 moved from asserted-in-prose to enforced-by-a-named-module-with-tests; none weakened |
| GOLD cases | 3 closed · 1 substantially closed · 1 bounded · 5 open (all but one are test-coverage gaps) |
| Unit tests | 613 suites / **8,449 passed**, 1 skipped |
| Browser tests | **527 passed** (desktop project); 42 across every spec this sprint touched |
| Build gates | CRA warnings 241 of 241 baselined; shell parity gate clean |
| `CommandCenter.jsx` | **untouched** |

**First domain rationale:** it is the only domain with an end-to-end browser
proof; its baselines now exist where seating had none; its authority seam is
single for the first time; it is what the host checks most and what the most
surfaces derive from; and every number in it traces to a host statement or a
guest reply with provenance, so a redesigned surface has something truthful to
render at every point.

---

## 6. Open items, declared

**One capability gap, bounded:** `"2 excursions"` has no truthful destination.
Bounded under a rule adopted mid-sprint — a gap may enter READY only if it is
*named with evidence*, *implied by no surface*, and **covered by a test proving
the app does not claim what it lacks**. An untested non-claim is just an
intention.

**Five open GOLD cases**, four low/medium-severity test-coverage gaps plus the
bounded one. Two of them (weather baseline, failure-path specs) are the
verdict's condition and are roughly 1.5 hours of work.

**One infrastructure trap worth separate work:** `npm run build` in the shell
package does not produce a bundle the browser suite can pass against — the
required env var is documented only in a code comment. This cost me 33 false
failures before I traced it.

---

## 7. Corrections this sprint made to its own planning package

Stated plainly because the package is still the redesign's reference document,
and because the pattern is instructive.

| Claim | Reality |
|---|---|
| A field named `guestEstimateSource` | Does not exist. The real field does, and is written at all three sites. |
| The confirmation gate had 3 consumers | **1.** One of the three was a code comment, not an import. |
| Four clauses had "no canonical destination" | **Three of four were wrong.** |

**All of them failed the same way:** searching for a module *named* after a
concept, finding none, and concluding the capability was absent. An
accessibility knowledge module, ordered programme arrays, and a vendor-category
vocabulary all exist with live consumers. The audit now carries a standing
warning: *treat any unverified "X does not exist" claim as unproven until
someone greps for the capability rather than the word.*

That third correction **changed the shape of two whole slices** — from "build a
model" to "connect what is already there."

**The final verification pass also found a real defect in my own P1-2 work.**
The clause splitter used punctuation only, so the full source sentence stored
*"she uses a walker and the altitude is hard on her"* as one access requirement
— putting a health statement inside a statement about a route, which that
module's own hard line forbids. My earlier tests had put the walker clause at
the end of the line, so none of them caught it. The sentence the feature was
built for did.

---

## 8. Where an outside read would be most useful

1. **Is the scoped READY the right call,** or should the verdict be withheld
   until the weather and failure-path baselines exist (~1.5h) so it can be
   unconditional? The scoped version lets redesign start now on the
   best-evidenced domain; the unconditional version is simpler to govern.

2. **Is "bounded gap" a sound governance primitive,** or does any carried gap
   erode the meaning of READY regardless of how it is tested?

3. **The six-category classification in P0-2 is the highest-judgment call in the
   sprint.** 3 of 32 consumers were migrated; 29 were deliberately left reading
   the raw value. The argument is that protection belongs at the boundary
   (outward communication, committed money) and that gating internal sizing
   steps would hide planning surfaces from the host who most needs them. Is that
   the right line?

4. **P1-5 adds one raiser.** The instruction was explicitly not to add raisers
   for domain-count symmetry. One rule that earns its place was the deliverable
   — but a consequence primitive with a single rule may be too small to validate
   the shape. Is one enough to generalize from?

5. **The repeated error mode is worth a second opinion:** three of my own
   planning-package claims were wrong in the same direction — asserting absence
   from a failed name search. The mitigation so far is a written warning in the
   document. Is there a stronger structural fix?

---

## Appendix — commits

```
af5cb79  Sprint 0 verdict: READY, scoped to one domain
3fbfbd3  P1-5  the narrow consequence primitive
8b3303d  P1-4  creation defects (venueCity "the", colour-pair theme)
69f4df3  P1-3  unusedClauses resolution + three false alarms removed
a92b525  P1-2  normalized needs v1
b281eca  P1-1  seating + rain browser baselines
a829c30  audit corrections + the READY gap rule
7fddabf  P0-3  GOLD-07 cascade e2e
3f52d5f  P0-2  guest-count authority
16a211c  P0-1  destination invariant
```

Each commit carries its full reasoning in the message, and each slice has a row
in `SPRINT_0_MIGRATION_LEDGER.md` recording before behavior → change →
invariant → tests → affected consumers → rollback risk.
