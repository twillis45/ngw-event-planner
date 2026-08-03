# Phase 5F.6 - Operational Truth Report

**Date:** 2026-08-01. ASCII-only.
**Objective:** make NGW operable by another person without misleading them about the
state of knowledge.
**Method:** every number was computed from the live corpus and then confirmed in the
running admin console. Where a previously reported figure disagreed, the recomputation
wins and the disagreement is recorded.

---

# 1. Executive verdict

## READY WITH LIMITATIONS

**What is ready.** An operator opening the console now sees one denominator, the real
fate of every browser-only record, and the age of every source NGW stands on. Each of
those was previously either invisible or reported wrongly. Nothing an operator reads is
now known to be false.

**The limitations, stated plainly:**

1. **Seven browser-only records are surfaced and classified; none is reconciled.** That
   is by design - promotion is a human decision - but until someone makes those seven
   decisions the store and the corpus still disagree.
2. **394 of 498 outstanding lines have no source to cite.** The system is honest about
   this now. It does not make it smaller.
3. **Freshness warns but nothing is stale yet.** The oldest source is 29 days against a
   90-day horizon, so the warning system is unproven against a real stale source. Its
   only live finding today is 22 undated sources.

None of the three can put a false claim in front of a host, and none can now put a false
claim in front of an operator either. They are open work, visible as open work.

---

# 2. A correction to the phase brief

The brief - taking the figure from my own 5F.5 report - says **six** browser-only
records. **It is seven.** Eight published in the admin store, minus the one
(`Crab Feast p_crabs.provenance`) already serving from the snapshot.

The live console now reports `7 browser-only published record(s)`, independently of any
test fixture, and `governanceReconciliation.test.js` pins the count with the reason
written beside it. The 5F.5 document has been corrected in place with the correction
noted rather than silently applied.

**This is the exact failure this phase exists to prevent** - a wrong operational number,
propagated into a plan, believed. It is recorded rather than quietly fixed because the
mechanism that produced it matters more than the digit.

---

# 3. Workstream 1 - Browser-only record reconciliation

## 3.1 What was found

All seven, as measured in the live store:

| Asset / field | Value | Prior | Ev | Blocker | Recommended |
|---|---|---|---|---|---|
| Crab Feast `p_oldbay.qtyPerGuest` | 0.08 | **a provenance object** | 1 | `corrupt-prior` | archive |
| Crab Feast `p_paper.unitCostRange` | [24, 48] | **a provenance object** | 1 | `corrupt-prior` | archive |
| Crab Feast `p_ice.provenance` | researched / `reddy-ice-2026` | provenance | 1 | - | human decision |
| Fish Fry `p_ice.qtyPerGuest` | 1.5 -> 2 | 1.5 | 0 | `no-evidence` | human decision |
| Fish Fry `p_ice.provenance` | researched / `reddy-ice-2026` | null | 0 | `no-evidence` | human decision |
| Low Country Boil `p_ice.qtyPerGuest` | 1.5 -> 2 | 1.5 | 0 | `no-evidence` | human decision |
| Dinner Party `p_ice.provenance` | researched / `bar-provision-2026` | null | 0 | `no-evidence` | human decision |

## 3.2 Two findings that were not visible before

**Two records have a corrupted audit trail.** `p_oldbay.qtyPerGuest` and
`p_paper.unitCostRange` each recorded a **provenance object** as the prior value of a
quantity/cost field. That is a 5E-era cross-field artifact: the correction was opened
from an unrelated published row and inherited its "before".

The values may well be right. **The audit trail describes a change that did not happen**,
and that cannot be repaired after the fact - which is why the recommendation is archive,
not promote. Redoing them through the correct path costs 15 interactions each.

**Four of seven were published with zero evidence attached.** All four came through the
5F.2 first-governance path. It is reported per record and does not by itself decide a
fate - but an operator should know that four published records rest on a reason string
and nothing else.

**None of the seven fails today's publish gate.** Worth stating: the 5F.4 tier hazard is
genuinely closed, and these records are weak in their lineage and evidence, not in their
grounding honesty.

## 3.3 The rule the module enforces

`recommendFor()` **can never return `promote`.** There is a test asserting it for every
input. A machine may find a checkable defect; it may not conclude that a source's scope
reaches an event. `reconcile()` refuses to produce a decision without a stated reason -
including for `reject`, the case most likely to be waved through - and returns a frozen
record that keeps what the machine advised beside what the human chose.

---

# 4. Workstream 2 - The canonical denominator

## 4.1 Why the old numbers disagreed

| Counter | Reported | What it dropped |
|---|---|---|
| `groundingAudit.mjs` | "4% cited" | 65 of 245 records - all `researched` (64) and `partial` (1). **27% of the corpus** |
| `SAFE_RESEARCH_BACKFILL_QUEUE.md` | "237 Tier 1 lines" | the 97 lines that declare a tier and cite nothing |
| `acquisitionSummary()` | "1,605 governable fields" | nothing - but counts FIELD SLOTS, a different unit that cannot be compared to either |

Each was defensible on its own terms. The damage is that an operator reading any one of
them draws a false conclusion about how much is known.

## 4.2 The one inventory

```
TOTAL CANDIDATES   537      <- every authored purchase line, always
├── grounded            38      the host predicate passes; a "Sourced -" line renders
├── reviewed             1      governance published here, it does not ground
├── ambiguous            6      lists sources and does NOT ground
├── needs-source       124      declares a tier, cites nothing
├── needs-provenance   368      a value, nothing said about it
├── blocked              0      no governable field drives runtime
└── unsupported          0      no costed or quantified claim to ground
                                grounded share: 7.1%
```

**The rule, enforced by test: the denominator never shrinks because evidence is missing.**
`knowledgeInventory(ALL_PLAYBOOKS, [])` - every scrap of evidence removed - returns the
same 537. Missing evidence moves a line between states; it never removes one from the
count.

`ambiguous = 6` and `grounded` includes `Crab Feast p_crabs`, which reconciles with the
7 ratcheted lines in `authoredCorpusIntegrity.test.js`: six still ambiguous, one repaired
through governance.

Live in the Acquisition workspace, beside the old field-slot KPIs so both units are
visible and neither is mistaken for the other.

---

# 5. Workstream 3 - Freshness

## 5.1 What existed, and what ran

| Component | Verdict |
|---|---|
| `providerMonitor.js` | **Decorative.** Keyed off a `lastCheckedAt` map that is `useState({})` in AdminConsole with a setter that is **never called**. `overdueProviders({})` therefore returns every family as "never-checked" forever and can report nothing else. It also monitors provider FAMILIES, an abstract taxonomy, not the 112 real registered sources |
| `grounding-monitor.yml` | **Dead.** Lives at `ngw-event-planner/.github/`, one level ABOVE the git root (`demo/`). Untracked, so its monthly cron has never fired |
| `groundingAudit.mjs` | **Real, hand-run only.** Reports "lastVerified stamps found: 1" |
| `groundingSourceCatalog()` | **Freshness-blind.** Unions all 20 registries and reads title/publisher/tier - never a date |

Freshness was recorded in 90 places and surfaced in none.

## 5.2 What was built

`sourceFreshness.js` reads the actual registries and classifies each source by the
`fetched` date it already carries.

```
112 sources across 20 axes
  fresh    90
  aging     0
  stale     0
  undated  22      <- Military ceremony 12, Destination 7, Table & seating 2, Group rental 1
oldest: dmv-crab-2026 (Cost) 29 days, horizon 90
```

**Horizons are a declared editorial policy, not a measured decay rate**, and they are
differentiated because a single threshold would be dishonest in both directions - it
would call an FSIS cooking-temperature chart stale while a July crab price stayed fresh.

```
volatile (Cost, Quantity)   aging 60d   stale 90d
standard (everything else)  aging 270d  stale 365d
```

## 5.3 What it cannot do

Four tests exist solely to keep this a warning system:

- an ancient source **still grounds** - the clock is pushed to 2099 and `isGroundedItemQty`
  and `wouldGround` still return true
- computing freshness **does not mutate** the registries
- the module **exports no** `invalidate`, `expire`, `remove`, `fetch`, `refresh` or
  `withdraw`
- no row's text contains an instruction to delete or downgrade; the stale wording says
  *"It still grounds until a human says otherwise."*

**Honest limitation:** nothing is stale today, so the stale path is proven only by moving
the clock, not by a real aged source.

---

# 6. Workstream 4 - Backfill classification

```
498 lines need work of 537

  A  101   an approved source exists on this subject   -> safe review workflow
  B  394   no approved source on this subject          -> research needed
  C    3   a source exists, a RECORDED conflict applies -> manual decision
  D    0   nothing to ground / nothing reads it        -> leave ungrounded
```

| Category | A | B | C | D |
|---|---|---|---|---|
| food | 40 | 119 | 0 | 0 |
| beverage | 61 | 49 | 3 | 0 |
| logistics | 0 | **82** | 0 | 0 |
| decor | 0 | **78** | 0 | 0 |
| cleanup | 0 | **37** | 0 | 0 |
| rental | 0 | **29** | 0 | 0 |

**Type B is 79% of the backlog, and it is the largest class by a factor of four.** This
is asserted by test, not narrated: if it ever flips, the bottleneck has genuinely moved
and the plan should change with it.

**The backfill is an evidence-acquisition problem wearing a workflow problem's clothes.**
No queue, no batching and no speed reaches 394 lines that have nothing to cite.

Highest-leverage missing sources, by how many lines one would unlock:

```
p_cleanup 26 | p_tableware 18 | p_decor 15 | p_paper 13 | p_dessert 11
p_flowers 10 | p_cake 9 | p_favors 9 | p_coffee 8 | p_candles 8 | p_napkins 8
```

## Effort

| | Lines | Interactions |
|---|---|---|
| Reachable today (A) | 101 | **1,515** at the measured 15/correction |
| Blocked on research (B + C) | 397 | **deliberately not costed** - the research is the work, and its size is unknown until somebody looks for a source |
| Leave alone (D) | 0 | - |

The subject-to-source map is a **declared human claim** written in the open, because the
registries do not say which purchases they cover. A test asserts every source it names
actually exists.

**What this module refuses to do:** it sorts WORK, never evidence. A test asserts no
classification ever says a value is correct, verified, confirmed or ready to publish, and
that no action is `publish` or `approve`. Type A means *a source exists on this subject* -
never *this line is ready*.

---

# 7. Production readiness score update

| Dimension | 5F.5 | 5F.6 | Movement |
|---|---|---|---|
| Foundation | 88 | **88** | unchanged - no lint gate, monitor still stranded |
| Governance | 92 | **92** | unchanged - untouched this phase, by design |
| Runtime safety | 95 | **95** | unchanged; four new tests prove freshness cannot reduce it |
| **Operations** | 58 | **79** | divergence now has a resolution path with per-record dossiers; ONE denominator replaces three disagreeing counters; freshness visible for the first time. Still short of 90 because seven records remain unreconciled and 22 sources are undated |
| **Backfill readiness** | 45 | **72** | the backlog is now classified per line, reconciles with the inventory, and its effort is costed where costable and refused where not. Short of 90 because 79% of it is blocked on sources nobody has looked for yet |

---

# 8. Files changed

## New (Phase 5F.6)

| File | Purpose |
|---|---|
| `src/lib/knowledge/governanceReconciliation.js` | dossiers + `reconcile()` for browser-only records |
| `src/lib/knowledge/governanceReconciliation.test.js` | 22 tests |
| `src/lib/knowledge/knowledgeInventory.js` | the canonical 7-state inventory |
| `src/lib/knowledge/knowledgeInventory.test.js` | 20 tests |
| `src/lib/knowledge/sourceFreshness.js` | age, state and operator action per source |
| `src/lib/knowledge/sourceFreshness.test.js` | 15 tests |
| `src/lib/knowledge/backfillClassification.js` | A/B/C/D + effort |
| `src/lib/knowledge/backfillClassification.test.js` | 19 tests |
| `docs/playbooks/PHASE_5F6_OPERATIONAL_TRUTH_REPORT.md` | this report |

## Modified

| File | Change |
|---|---|
| `src/admin/AdminConsole.jsx` | 5 imports; inventory + classification block in Acquisition; reconciliation + freshness blocks in Publishing. No UI redesign |
| `docs/playbooks/PHASE_5F5_PRODUCTION_READINESS.md` | six -> seven, correction noted in place |

## Carried, uncommitted, from 5F.5 (still awaiting review)

`governanceDivergence.js` (+`firstGovernanceGuard`), its test, the AdminConsole wiring,
`authoredCorpusIntegrity.test.js`, and three 5F.5 docs.

---

# 9. Verification

| Gate | Result |
|---|---|
| Full suite | **312 suites / 4793 tests passing**, 1 skipped (was 308 / 4717) |
| `gate:knowledge` | `[OK]` snapshot up to date |
| `gate:hostv2` | no drift (12 files) |
| eslint | **0 errors** in product source |
| Governed artifacts | unchanged - this phase publishes nothing |

**+76 tests across 4 new suites.** Regression coverage added for each required area:
denominator accuracy (5 tests), browser/corpus divergence (5), freshness visibility (4
negative tests that it cannot invalidate), classification completeness (5 reconciliation
tests against the inventory).

**Driven live in the admin console**, not only in Jest:

```
KNOWLEDGE INVENTORY - 537 authored lines. 7.1% grounded.
grounded 38 . reviewed 1 . ambiguous 6 . needs-source 124 . needs-provenance 368 . blocked 0 . unsupported 0
498 lines need work of 537: 101 have a source (review), 394 need research, 3 need a
decision, 0 cannot be grounded. Classification sorts WORK, not evidence.

7 browser-only published record(s): 2 cannot be promoted as-is, 5 need a human decision.
Nothing is promoted or discarded automatically.
  archive - Crab Feast . p_oldbay.qtyPerGuest [corrupt-prior] . host impact: the quantity
            or cost on the host's shopping line changes
  requires-human-decision - Dinner Party . p_ice.provenance [no-evidence] . host impact:
            a "Sourced -" line appears on the host's shopping line; no number moves

Sources: 22 undated of 112. Freshness is a warning - no grounding is withdrawn automatically.
  undated - ada-clearance (Table & seating capacity) . No fetch date recorded - nobody can
            tell whether this is current. Add the date it was retrieved.
```

---

# 10. Findings

## Fixed

- **The denominator.** One inventory, seven states, 537 lines, provably invariant to how
  much evidence exists.
- **The browser-only records.** Detected, classified, dossiered, with a decision function
  that cannot delete without a reason and cannot recommend promotion.
- **Two corrupted audit trails** found that no prior check looked for.
- **Freshness surfaced** for the first time, with the machinery that pretended to do it
  identified as decorative.
- **The backfill shape.** 79% blocked on missing sources - now a tested assertion rather
  than an observation.

## Remaining

| Risk | Severity |
|---|---|
| Seven records still unreconciled - the decision function exists, no decisions made | **Medium** - store and corpus still disagree |
| 394 lines with no source | **High for the backfill**, zero for host truth |
| 22 undated sources cannot age | **Medium** - they will never warn |
| `providerMonitor.js` still wired to a dead input | **Low** - now documented as decorative; left in place rather than deleted mid-phase |
| `grounding-monitor.yml` still outside the repo | **Low** - one file move, deliberately not done here (it changes CI, which is outside this phase's scope) |
| No lint gate | **Low** |
| Stale path proven only by moving the clock | **Low** - nothing is stale yet |

## Unknown

- Whether `bar-provision-2026` legitimately grounds Dinner Party's ice. One of the seven
  cites a **drinks** source for an **ice** quantity, and 5F.3 recorded that no indoor/dry
  ice source exists. Flagged, not decided.
- Whether the four zero-evidence records can have evidence attached retroactively, or
  must be redone.
- Whether the 21 string-provenance lines carry recoverable claims - 8 are full sentences.

---

# 11. Recommendation

## Continue hardening - but the next step is human, not engineering

The engineering that makes NGW operable is done. What stands between here and a real
backfill is not more code:

| # | Work | Who | Why it is next |
|---|---|---|---|
| 1 | **Decide the seven.** Each dossier states its blocker and host impact | a human, ~30 min | Until these are decided, every count still has two answers. This is the last operational untruth |
| 2 | **Register two sources: disposable place settings, cleanup supplies** | research | ~68 lines move from B to A - the highest leverage available anywhere in the corpus |
| 3 | **Date the 22 undated sources** | ~1 hour | They can never warn until they can age |

**Do not build the review queue yet.** Its honest saving is ~5 of 15 interactions on
Type A work, and Type A is 101 lines. Best case it saves ~500 interactions against a
backlog whose real blocker is 394 lines with nothing to cite. Sources first, queue after -
otherwise a queue gets built to accelerate work that cannot start.

**Do not begin the backfill.** 101 lines are reachable, and the two source registrations
above would make it ~169 before anyone opens the composer. Starting now would do the
smaller half of the work first.

---

Stopping here per the phase's stop condition. No review queue, no backfill, no 5F.7.
