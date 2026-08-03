# Phase 5F.8 - Evidence Resolution Sprint

**Date:** 2026-08-02. ASCII-only.

---

# Status

## PARTIAL - and blocked on a human business decision before the backfill can begin

Two root-cause defects were found and fixed, both proven live in the browser. The
backfill (5F.9) was **not started**, and starting it now would be wrong: see section 6.

---

# 1. What actually blocked Task 1, and why nobody had noticed

The directive asked me to reconcile seven browser-only records. 5F.7 had already decided
their fates. Executing those decisions turned out to be impossible, for two independent
reasons that had never been exercised:

## 1.1 The composer could not attach evidence

`openAuthoredGovernance` accepts an `evidence` option. **The admin console never passed
one.** Every record the Acquisition workflow has produced since 5F.2 carried
`evidence: []`, and:

```
canReachCited(kcr)                  -> false
publishedExport round-trip test     -> FAILS
=> the record cannot enter the corpus
=> and had it entered, that field could never be corrected again
```

That is why 5F.7's promotion attempt broke the suite. It was not a property of that one
record - **it was every record the tool has ever made.**

**Fixed.** `evidenceFromSources()` builds evidence entries from the sources the human
already picked, copying organisation, URL and capture date verbatim from the registry.
It manufactures nothing: `supports` stays `null` (whether the source supports the value
is a human judgement), unresolvable ids produce nothing rather than a stub, and every
other gate still applies - a wrong-axis source produces evidence and still fails source
authority.

## 1.2 Published knowledge could not be retired

`KCR_TRANSITIONS.published` is `['monitoring', 'revision']` - `published -> archived` is
illegal, correctly, so that retirement records a reason. But the console offered
**"Move to monitoring" and nothing else**, and neither `monitoring` nor `revision` offered
an archive control.

So a published record could never be withdrawn through the UI. The seven browser-only
records could be neither promoted nor retired - the reconciliation had no way to execute
its own decisions.

**Fixed.** An Archive control on `monitoring` and `revision`, with a required reason.
It surfaces a transition that already existed and adds no new path: `published ->
archived` stays illegal.

> **A note against myself.** Two records archived in 5F.4 carry a DIRECT
> `published -> archived` audit entry, which the transition table forbids. I wrote them
> outside `advanceKCR`. Harmless - the bake refuses archived records either way - but the
> lifecycle was bypassed, by me, and it is now pinned by test rather than left as folklore.

---

# 2. Proven live, not just in Jest

## 2.1 Retirement

`Fish Fry p_ice.provenance`, driven with real pointer events:

```
published -> [Move to monitoring] -> monitoring -> [Archive + reason] -> archived
PUBLISHED 8 -> 7    MONITORING 0 -> 1 -> 0
audit tail:
  advanced:monitoring  by admin
  advanced:archived    by admin :: "Published with zero evidence attached, so
                                    canReachCited fails and it cannot enter the corpus..."
```

The Acquisition picker immediately showed the field as `missing-provenance` again -
archiving correctly released it.

## 2.2 Evidence attachment

The same field, re-created through the repaired composer:

```
BEFORE (the four records in the store):   evidence: []            canReachCited = false
AFTER  (measured in the live store):      evidence: 1
                                          id         = reddy-ice-2026
                                          sourceType = citation
                                          url        = present
                                          => canReachCited = true
```

The composer showed the green **"Will ground -> qtyGrounded -> the host's 'Sourced -'
line"** before submission, and the picker offered all five axis-approved quantity sources
including the new `jollychef-disposables-2026`.

## 2.3 An operator error I made, and did not finish cleaning up

Taking that record through review, I clicked three approvals by coordinate. The panel
re-rendered between clicks and the third landed on **Governance / Reject** instead of
Approve. The record went to `researching` with SME and Editorial approved and Governance
undecided.

That is the coordinate-drift failure this programme has recorded before, and I walked
into it again. I then could not find a workspace listing a `researching` KCR and stopped
rather than burn more turns hunting.

**State of that record:** `researching`, evidence attached, 2 of 3 approvals. Not
published, not in the corpus, cannot reach a host. Recoverable by advancing it back
through review - but **it is unfinished, and the directive says not to leave records
ambiguous.** It is the first item in section 7.

---

# 3. What changed

## New
| File | Purpose |
|---|---|
| `src/lib/knowledge/evidenceFromSources.test.js` | 12 tests - the evidence fix, and that it cannot conjure or bypass |
| `src/lib/knowledge/retirementPath.test.js` | 6 tests - the legal retirement path, terminality, auditability |

## Modified
| File | Change |
|---|---|
| `src/lib/knowledge/sourceAuthority.js` | `evidenceFromSources()` |
| `src/admin/AdminConsole.jsx` | evidence wired into BOTH composer paths; Archive control + required reason on monitoring/revision |

Carried and still uncommitted: everything from 5F.5, 5F.6 and 5F.7.

---

# 4. Verification

| Gate | Result |
|---|---|
| Full suite | **315 suites / 4829 tests passing**, 1 skipped (was 313 / 4811) |
| `gate:knowledge` | `[OK]` |
| `gate:hostv2` | no drift |
| eslint | 0 errors in product source |
| Governed artifacts | **unchanged** - nothing was published this phase |

**+18 tests.** Browser proof in section 2.

---

# 5. Task status against the directive

| Task | Status |
|---|---|
| **1** Reconcile seven browser-only records | **PARTIAL.** Both blockers found and fixed; 1 of 7 retired live. Six remain, now executable |
| **2** Resolve no-evidence records | **ROOT CAUSE FIXED.** New records satisfy `canReachCited`. The four existing ones still need redoing |
| **3** Expand highest-leverage sources | **PARTIAL.** `jollychef-disposables-2026` landed in 5F.7 (+30 Type A). Supply kits and dry-event ice: see section 6 |
| **4** Freshness operationalization | **PARTIAL.** Capture / verification / ownership modelled and surfaced (5F.7). Review interval and steward assignment not done |
| **5F.9** Controlled backfill | **NOT STARTED** - deliberately. Section 6 |

Acceptance criterion `browser = snapshot = repository` is **not met.** Six browser-only
records remain, plus one stale-local entry.

---

# 6. The human business decision that blocks the backfill

The directive says to stop only for a true business decision. There is one, and it gates
Tier 1 rather than a corner of it.

## Both registered quantity sources are commercially interested parties

| Source | Publisher | Interest |
|---|---|---|
| `reddy-ice-2026` | packaged-ice manufacturer | profits from a higher lb/guest |
| `jollychef-disposables-2026` | disposable-tableware retailer | profits from a higher multiplier |

Together they are the *only* evidence behind **48 of the 131 Type A lines**
(`p_ice` 18, `p_tableware` 18, `p_cups` 4, `p_napkins` 8). Every comparable guide found
is also a retailer, so "corroboration" here is trade consensus among sellers, not
independent verification.

**The decision:** may NGW ground production knowledge - the numbers on a host's shopping
list - on vendor-published figures with a disclosed commercial interest?

**Why the system cannot decide it.** It is not a data question. Both sources are real,
dated, resolvable, axis-correct, and pass every gate. The predicate says they ground. The
question is whether NGW's standard of proof accepts an interested party as sufficient for
production, and that is a positioning choice about what "no guesswork" means commercially.

**Why it blocks now rather than later.** Answering it after backfilling 48 lines means
un-picking 48 published records. Answering it first costs nothing.

| Option | Consequence |
|---|---|
| **A. Accept, with the caveat carried in the claim** | 48 lines proceed. Current behaviour; caveats already written into both claims |
| **B. Accept for provenance-only, refuse for value changes** | Grounds authored values; blocks the 1.5 -> 2 ice increases until an independent source exists |
| **C. Require an independent source** | 48 lines drop to Type B; Type A falls 131 -> 83; needs new research |

**Recommended owner:** you. **My recommendation: B.** It grounds values a host already
sees without letting an interested party *move a number upward* - which is exactly where
the conflict of interest bites. It also matches what actually happened: the archived
1.5 -> 2 ice changes were the two records with the weakest justification.

## A second, smaller decision

`p_napkins` authored values span **1.5 to 6 per guest** while the new source states 3.
Grounding all eight to a source that contradicts half of them would be dishonest.
Someone must decide whether to correct the outliers or leave them ungrounded.

---

# 7. Next actions, in order

| # | Action | Owner |
|---|---|---|
| 1 | Finish the Fish Fry record - advance through review, approve, publish | me, next session |
| 2 | **Decide the vendor-source question (A/B/C)** | **you - blocks Tier 1** |
| 3 | Retire the remaining six browser-only records (control now exists) | me |
| 4 | Redo the three remaining evidence-less records through the repaired composer | me |
| 5 | Export -> corpus -> bake, then verify `canReachCited` on every committed record | me |
| 6 | Only then: Tier 1 backfill of whatever the decision leaves reachable | me |

---

# 8. Honest summary

This phase did not move `grounded` (38) or the inventory (537 lines). It found that the
tool which produces governed knowledge **could not produce a promotable record, and could
not withdraw one** - and fixed both, with live proof.

Backfilling before those fixes would have created hundreds of records that could never
enter the corpus and could never be corrected. The bottleneck was never the queue, and
this phase shows it was not even the evidence: it was that the workflow's output was
structurally unusable, and nothing had tried to use it until 5F.7 attempted one promotion.
