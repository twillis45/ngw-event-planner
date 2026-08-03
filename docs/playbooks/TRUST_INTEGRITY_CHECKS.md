# Trust Integrity Checks

**Status:** REPORTING ONLY - no check gates CI, changes a predicate, or alters runtime.
**Built:** 2026-08-01 (Phase 5C.1) - ASCII-only.

**Code:** `src/lib/knowledge/trustIntegrityChecks.js` (pure functions)
**Harness:** `src/lib/knowledge/trustIntegrityChecks.test.js` (prints, asserts nothing about counts)
**Detail mode:** `TRUST_CHECK_DETAIL=1 CI=true npx react-scripts test --testPathPattern=trustIntegrityChecks --silent=false`

---

## Why these exist

`isGroundedCost` answers *"does this claim cite a source id that resolves?"* It cannot answer
*"does that source support this claim?"* Phase 5B-5 audited 40 claim legs by hand and found
**0 DIRECT / 4 DERIVED / 22 ANALOGOUS / 14 UNSUPPORTED**.

These checks mechanise the parts of that audit that do **not** require reading source prose, so
the next audit costs less than the last one did.

## Why they do not fail the build

Checks 3 and 4 flag **42** and **53** claims respectively on their first run. Wired to a gate on
day one, they would turn the build red immediately and be disabled within a week - which is how
an integrity check dies. They are inventory instruments first. Promotion to a gate is a Phase
5C.2 decision, taken after the numbers have been read at least once.

The logic is separated from the harness precisely so promotion needs no rewrite - only a new
assertion in the test file.

---

## Current report (2026-08-01)

```
=== TRUST INTEGRITY REPORT ===================================
  1 same source, same relationship, unexplained values : 7
  2 source claim-type mismatch                         : 0
  3 researched claim with no derivation recorded       : 42
  4 researched claim with no sufficiency verdict       : 53
==============================================================
```

---

## Check 1 - same source + same relationship + unexplained different values

**Rule:** if N claims cite source S for the same relationship and emit different values, at most
one can be DIRECT or DERIVED. The rest are ANALOGOUS by construction.

**The three-outcome design.** Variance is not automatically a defect, and a check that assumes it
is will be ignored. `bar-provision-2026` states *"~5-6 drinks/guest over a 4-5h event"*, so beer
at 1.5/guest for a housewarming and 6/guest for a bachelor party are **both** consistent with it -
the source parameterises by duration. So each group resolves to one of three outcomes and only
the third is a finding:

| Outcome | Meaning |
|---|---|
| `consistent` | all claims agree |
| `justified-variance` | they differ AND every differing claim records a `varianceReason` |
| **`unexplained-variance`** | **they differ and no reason is recorded - FINDING** |

**`varianceReason` does not exist on any provenance object today.** That is the point: the check
names the field authors need, and until it exists, honest variance and sloppy variance are
indistinguishable - which is the true current state.

### Findings

| Group | Claims | Distinct values | Spread |
|---|---|---|---|
| `catering-perperson-2026 :: caterer` | 12 | 1.1 / 1.15 / 1.3 / 1.35 / 1.4 / 1.5 | 1.36x |
| **`catering-perperson-2026 :: potluck`** | **12** | **0.45 / 0.5 / 0.55 / 0.6 / 0.7 / 0.75 / 0.9** | **2.0x** |
| `catering-perperson-2026 :: host-cooks` | 4 | 0.7 / 0.9 / 1.3 | 1.86x |
| `catering-perperson-2026 :: restaurant` | 4 | 1.15 / 1.4 / 1.5 | 1.30x |
| `bar-provision-2026 :: p_wine :: bottle` | 4 | 0.4 / 0.5 | 1.25x |
| `webstaurant-protein-2026 :: p_protein :: lb` | 4 | 0.4 / 0.5 | 1.25x |
| `eatlikenoone.com/... :: p_chicken :: lb` | 2 | 0.4 / 0.45 | 1.13x |

**Four of these seven were not found by the manual 5B-5 audit** - `caterer`, `host-cooks`,
`restaurant` and `p_protein`. The hand audit caught potluck and wine because it was looking for
them. The check found the rest because it was not looking for anything.

**Potluck remains the worst**: 12 claims, 7 values, 2x spread, and no cost source in NGW covers
potluck at all.

---

## Check 2 - source claim-type mismatch

**Rule:** a claim may not cite a source whose declared coverage excludes the claim's domain.

**Finding count: 0** - and that is a *result*, not an absence. Before Phase 5C.1 this check
returned **1**: Juneteenth Cookout `menu` cited `usda-meat-2026` (a meat series with no seafood)
for a "mixed grill + seafood" leg. Repair B withdrew that grounding, and the check now confirms
the repair.

**Enforceability caveat.** The check reads a `supports` / `excludes` coverage map. That map is
currently `PROPOSED_SOURCE_COVERAGE`, exported from the checks module and **read by nothing else** -
it is not in the source registry and no predicate consults it. Moving it into the registry is a
Phase 5C.2 decision. Until then, check 2 only sees the three cost sources described there.

---

## Check 3 - researched claim with no derivation recorded

**Rule:** a claim stating a number the source does not state verbatim is a *derivation*, and a
derivation nobody wrote down cannot be checked.

**Finding count: 42.**

The evidence for this rule is `crab_size`: it is the only decision in the corpus whose method was
recorded ("ratios use market midpoint, ~$85/dz Large Male as 1.0"), and consequently **the only
one whose arithmetic could be verified** - three of four legs reproduced, one did not. The other
claims cannot be checked at all, because they never say how their numbers were reached.

Detection is a keyword heuristic (`ratio`, `midpoint`, `multipl`, `calculat`, `derive`, `yields`,
`as 1.0`). It proves a method was *described*, not that the method is *correct*.

---

## Check 4 - researched claim with no sufficiency verdict

**Rule:** `sufficientWhen` states what evidence would justify a claim. Nothing records whether
that evidence was ever obtained.

**Finding count: 53**, in two outcomes:

| Outcome | Meaning |
|---|---|
| `criterion-never-evaluated` | `sufficientWhen` is populated and no verdict exists |
| `no-sufficiency-criterion` | not even a criterion was written |

Every grounded costFactor decision carries a populated, specific, actionable `sufficientWhen`
(*"2+ Lowcountry-boil caterer quotes in a comparable coastal market"*). **None has ever been
evaluated.** The proposed `sufficiencyMet` field is what closes this, and the research queue can
be generated from the existing criteria today.

---

## Investigated and dismissed

**12 URL-as-source-id occurrences** across Get-Together, The Cookout and Juneteenth Cookout -
purchases citing raw Costco price-guide URLs instead of registered source ids.

Check 1 surfaced one of these (`eatlikenoone.com :: p_chicken`). Verification found **all 12
carry `tier: 'trade-heuristic'` and all 12 return `grounded = false`.** They self-declare
honestly and no predicate treats them as grounded.

**This is registry hygiene, not a trust defect.** Recorded so it is not re-litigated as a finding
in a future audit.

---

## Promotion path (Phase 5C.2 decision, not taken here)

| Check | Ready to gate? | Blocker |
|---|---|---|
| 1 | **Closest** | Needs `varianceReason` to exist so justified variance can be recorded |
| 2 | Yes, once metadata lands | `supports`/`excludes` must move into the source registry |
| 3 | No | 42 findings - repair before gating, or it starts red |
| 4 | No | 53 findings - needs `sufficiencyMet` to exist first |

**Do not gate any check while its finding count is high.** A gate that starts red teaches the
team to route around it.
