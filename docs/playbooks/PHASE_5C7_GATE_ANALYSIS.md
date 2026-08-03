# Phase 5C.7 - Phase 0 Gate Analysis (READ ONLY)

**Date:** 2026-08-01 - no code modified. ASCII-only.
**Verdict: the evidence gate ALLOWS correction of a published artifact. Proceed.**

## The gates, exactly as implemented

### `advanceKCR(kcr, toStatus)` - VERIFIED IN CODE

Enforces three things and **evidence is not one of them**:

```js
if (!legal.includes(toStatus))                 throw  // legal transition
if (toStatus === 'review' && !kcr.proposal)    throw  // proposal before review
if (toStatus === 'approved' && !(sme && editorial && governance)) throw
```

### `kcrGateStatus(kcr)` - the UI surfacer, NOT a gate

```js
case 'researching':
  return { next: 'grounded', blocked: kcr.evidence.length ? null : 'Add evidence first' };
```

**This blocks the button, not the function.** `advanceKCR(kcr, 'grounded')` succeeds with zero
evidence. The evidence requirement at `researching -> grounded` is presentational.

### `publishKCR(kcr)` - the one real evidence gate

```js
if (prov && prov.verificationStatus === 'cited' && !canReachCited(kcr))
  throw new Error('KCR: cannot publish a cited value without supporting evidence');
```

`canReachCited` needs one `kcr.evidence[]` item that is non-contradicting, has a `source` or
`url`, and whose `sourceType` is citation | primary | secondary | dataset.

## The four questions

### 1. Can a published KCR correction occur without Evidence records?

**Yes.** `advanceKCR` never consults evidence. Only `publishKCR` does, and only for `cited`
proposals - and it reads **`kcr.evidence[]`**, which travels with the KCR.

### 2. Does `correctPublishedKCR` require evidence?

**Not directly, and it does not need to.** It carries the prior KCR's evidence forward:

```js
const carried = evidence.length ? evidence : (prior.evidence || []);
```

A correction of a published artifact therefore inherits evidence that **already satisfied the
publish gate once**. Correct by construction: a reasoning fix cites the same sources.

### 3. Does normal publish require evidence?

**Only when the proposal is `cited`.** A `researched`/`synthesized` proposal publishes without it.

### 4. Is the current 0 Evidence state blocking?

**Only blocking new research-generated KCRs - and only at the UI button.**

The Studio counter reads the **Evidence workspace store** (`localStorage['ngw-kas-evidence']`),
which is a *different collection* from `kcr.evidence[]`. Conflating them was the risk flagged as
U2 in Phase 5C.6; it does not hold.

**All three published KCRs carry evidence that passes the gate:**

| KCR | evidence items | `canReachCited` | verificationStatus | publish gate |
|---|---|---|---|---|
| `...crab-feast-p-crabs-provenance` (v1) | 1 | **true** | cited | **PASS** |
| `...retirement-party-p-wine-provenance` (v1) | 1 | **true** | cited | **PASS** |
| `...retirement-party-p-wine-provenance-v2` (v2) | 1 | **true** | cited | **PASS** |

**Answer: informational for corrections, blocking only for the 227 research-generated drafts**
(whose `kcr.evidence[]` is empty, so their UI button is disabled at `researching -> grounded`).

## Consequence for the sprint

The correction loop is viable **without** creating evidence records, without an
EvidenceAssessment schema, and without touching the evidence store.

**One design constraint this analysis surfaces:** `correctPublishedKCR` records all three
reviews with `decision: 'approve'` by default and publishes in one call. Wiring that straight to
a UI button would **bypass human review**, which this sprint forbids. The correction action must
stop at `review` and hand off to the existing Review workflow.
