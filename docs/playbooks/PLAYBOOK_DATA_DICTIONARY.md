# Playbook Data Dictionary

**Date:** 2026-08-01 - **Repo:** `ngw-event-planner` - **Read-only audit. No code changed.**
**Scope:** 39 playbooks in `src/lib/playbooks/data/`, 215 decisions, 537 purchases.
**Method:** programmatic census of every key at every level, plus consumption tracing.

---

## Structure

```
src/lib/playbooks/
  index.js               engine + 14 knowledge-module imports
  playbookRegistry.js    registry
  playbookContract.test.js  the CONTRACT LINTER (hard invariants + ratcheted gaps)
  data/                  39 playbook files, one per event family
```

Runtime path: `data/*.js` -> `ALL_PLAYBOOKS` -> `playbookDecisionBoard()` / `playbookTasks()` /
`playbookChecklist()` -> `eventPlan()` -> `surfaceRegistry` raisers -> hostv2 render.

---

## A. Top-level playbook fields (n = 39)

| Field | Type | Present | Admin-editable | Runtime | Rec. engine | Reasoning engine | Status |
|---|---|---|---|---|---|---|---|
| `type` | string | 39/39 100% | No | Yes | Yes | Yes (`event_type`) | COMPLETE |
| `solveFamily` | string | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `family` | string | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `recordKind` | string | 39/39 100% | No | Yes | No | No | COMPLETE |
| `version` | string/num | 39/39 100% | No | No | No | No | COMPLETE |
| `meta` | object | 39/39 100% | No | Yes | No | No | COMPLETE |
| `heartMoments` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `decisions` | array | 39/39 100% | No | Yes | **Yes** | **Yes** | COMPLETE |
| `milestones` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `tasks` | array | 39/39 100% | No | Yes | **Yes** | **Yes** | COMPLETE |
| `purchases` | array | 39/39 100% | No | Yes | **Yes** | Indirect | COMPLETE |
| `rentalsGap` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `schedules` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `vendors` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `risks` | array | 39/39 100% | No | Yes | Yes | Consumer waiting* | COMPLETE |
| `contingencies` | array | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `knowledge` | object | 39/39 100% | No | Yes | Yes | No | COMPLETE |
| `vegMain` | string | **18/39 46%** | No | Yes | Yes | No | SPARSE |
| `dayOfChecklist` | array | **7/39 18%** | No | Yes | Yes | No | SPARSE |

\* `risks[].ifDelayed` is authored but reaches no action object -- `actionReason.js` has a
`risk` rung written for it that returns null. Consumer exists, producer does not.

---

## B. Decision fields (n = 215)

| Field | Type | Present | Runtime | Rec. engine | Reasoning | Status |
|---|---|---|---|---|---|---|
| `id` | string | 215 100% | Yes | Yes | Yes (decision identity) | COMPLETE |
| `label` | string | 215 100% | Yes | Yes | Yes (hero ask) | COMPLETE |
| `options` | array | 215 100% | Yes | Yes | Yes (settle panel) | COMPLETE |
| `default` | string | 215 100% | Yes | Yes | Yes ("our pick") | COMPLETE |
| `when` | string/num | 215 100% | Yes | Yes | Yes (due window) | COMPLETE |
| `weight` | string | 215 100% | Yes | **Yes (ranking)** | No | COMPLETE |
| `reversibility` | string | 215 100% | Yes | Yes | No | COMPLETE |
| `emotionalWeight` | string | 215 100% | Yes | Yes | No | COMPLETE |
| `difmCapable` | bool | 215 100% | Yes | Yes | No | COMPLETE |
| `priorityBasis` | string | 215 100% | Yes | **Yes** | No | COMPLETE |
| `why` | string | 215 100% | Yes | No | **Yes (evidence line)** | COMPLETE |
| `blocks` | array | 207 **96%** | Yes | Yes | No | near-complete |
| `costFactors` | object | 46 **21%** | Yes | Yes (pricing) | No | SPARSE (by design) |
| `costFactorProvenance` | object | 46 **21%** | No | No | No | matches `costFactors` 1:1 |
| `affects` | array | 46 21% | Yes | Yes | No | SPARSE (paired w/ costFactors) |
| `dependsOn` | array | 42 **20%** | No | No | Consumer waiting* | SPARSE |
| `deliversHeartMoment` | string | 19 9% | Yes | Yes | No | SPARSE |
| `culturalContext` | object | 11 **5%** | Yes | Yes | No | SPARSE |
| `standsDownWhen` | string | 9 4% | Yes | Yes | No | SPARSE |
| `costViaApproach` | bool | 6 3% | Yes | Yes | No | intentional marker |
| `noCostEffect` | bool | 6 3% | Yes | Yes | No | intentional marker |
| `optionGates` | object | 5 2% | Yes | Yes | No | SPARSE |
| `whenChoice` / `ladderKeys` / `optionNotes` / `defaultWhy` | mixed | 1 each | partial | partial | No | one-off |

\* `dependsOn` -- 42 authored edges; `actionReason.js` has a `dependency` rung that returns
null because no action carries the field. Same producer/consumer gap as `risks.ifDelayed`.

---

## C. Purchase fields (n = 537)

| Field | Type | Present | Runtime | Rec. engine | Status |
|---|---|---|---|---|---|
| `id` | string | 537 100% | Yes | Yes | COMPLETE |
| `item` | string | 537 100% | Yes | Yes | COMPLETE |
| `category` | enum | 537 100% | Yes | Yes | COMPLETE (linter-enforced set) |
| `unit` | string | 537 100% | Yes | Yes | COMPLETE |
| `where` | string | 537 100% | Yes | Yes | COMPLETE |
| `unitCostRange` | tuple | 537 100% | Yes | **Yes (budget)** | COMPLETE |
| `essential` | bool | 537 100% | Yes | Yes | COMPLETE |
| `buyAt` | string | 537 100% | Yes | Yes | COMPLETE |
| `note` | string | 442 82% | Yes | No | partial |
| `qtyPerGuest` | number | 312 58% | Yes | Yes | partial |
| `qtyFlat` | number | 225 42% | Yes | Yes | complementary to above |
| **`provenance`** | object | **169 31%** | No | No | **SPARSE -- the backfill target** |
| `alternatives` | array | 132 25% | Yes | Yes | SPARSE |
| `qtyPer` | object | 50 9% | Yes | Yes | SPARSE |
| `dependsOnDecision` | string | 9 2% | Yes | Yes | SPARSE |
| `sourcingPrices` | array | 6 1% | Yes | Yes | SPARSE |
| `whenChoice`/`badge`/`whenRegion`/`substitutes`/`priceLadder` | mixed | 1-4 each | partial | partial | one-off |

### Provenance schema (where present)

```js
provenance: {
  tier:               'primary' | 'researched' | 'trade-heuristic' | 'norm' | 'estimate' |
                      'consensus' | 'community' | 'cultural-tradition' | 'culture-bearer' |
                      'matriarch' | 'host-coaching' | 'heuristic',
  confidence:         'high' | 'medium' | 'med' | 'low',
  verificationStatus: 'cited' | 'researched' | 'established-consensus' | 'synthesized',
  sources:            [string],       // source ids or free text
  note:               string,
}
```

### Provenance completeness -- the headline number

```
purchases                     537
with a provenance object      169   (31%)
with at least one source id    45   ( 8%)
verificationStatus = 'cited'    7   ( 1.3%)
playbooks with ZERO priced provenance   7 of 39
```

**Tier distribution (n=169):** trade-heuristic 53 - researched 38 - cultural-tradition 17 -
estimate 12 - norm 8 - host-coaching 7 - consensus 3 - heuristic 3 - culture-bearer 3 -
matriarch 2 - primary 1 - community 1 - **(no tier) 21**

**Data-quality defects visible in the census:**
- `confidence` uses both `medium` (82) and `med` (18) -- two spellings for one value.
- 21 provenance objects carry no `tier`, and 21 carry no `confidence` or
  `verificationStatus` -- the object exists but is empty of grading.
- `sources` is sometimes an id (`'webstaurant-protein-2026'`) and sometimes free prose
  (`"Captain White's Seafood (Oxon Hill, MD -- LEFT the Maine Ave Fish Market...)"`). Two
  shapes in one field.

---

## D. Admin editability -- the single most important row in this document

**No playbook field is editable in Admin. Not one.**

The 39 playbooks are static ES modules under `src/lib/playbooks/data/`, imported at build
time into `ALL_PLAYBOOKS`. There is no database table, no override layer, and no write path
from the Admin console to a playbook field. Changing any value in this dictionary requires a
code edit, a build and a deploy.

This is a FACT confirmed in code, and it is the constraint that shapes the backfill plan.
