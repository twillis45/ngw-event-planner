# Playbook Doctrine — the contract for every event playbook

_Standing rule for every file in `src/lib/playbooks/data/*.js`. Established 2026-07-02._
_Enforced by `src/lib/playbooks/playbookContract.test.js` (the linter). Monitored in the Admin console._

## Why this exists
A playbook is the grounded domain truth for one event type (a bushel feeds 8–12; ~3 drinks/guest over
an afternoon). The whole app — next-steps, food plan, budget, tasks, decisions — is a **projection of
this data**. So the data has ONE shape, and adding or updating a playbook is filling in that shape, never
inventing a new structure. This doc is the shape. The linter proves compliance; the Admin "Playbooks"
tab monitors it. **Authoring stays in code** (versioned, tested) — there is no DB/CMS editor by design,
because the moat is the tested, grounded data, not an editing UI.

## Where playbooks live
- Data files: `src/lib/playbooks/data/<type>.js`, each `export default` a single object.
- Registered in `ALL_PLAYBOOKS` (`src/lib/playbooks/index.js`) → keyed into `REGISTRY` by `norm(type)`.
- Resolved by `getPlaybook(eventType)` — exact normalized match, then canonical-taxonomy fallback, else
  `null` (the caller keeps its universal fallback). Adding a file to `ALL_PLAYBOOKS` is what makes it live.

## Top-level shape
Required: `type` (string — the canonical event type), `meta`, `heartMoments`, `decisions[]`,
`milestones[]`, `tasks[]`, `purchases[]`, `vendors[]`, `risks[]`, `contingencies[]`, `schedules`,
`knowledge`, plus `version` (integer, bump on change).
Optional: `vegMain` (veg default for the food model), `dayOfChecklist`, `rentalsGap`, `solveFamily`,
`family`, `recordKind`.

## `decisions[]` — the host's calls
Every decision:
| field | rule |
|---|---|
| `id` | short, unique within the playbook, no prefix (e.g. `crab_size`) |
| `label` | the question shown to the host |
| `options` | array of **strings** (never objects) |
| `default` | one of `options` (the safe/typical pick). Avoid `null` — a decision with no default and empty options is a stub, not a decision |
| `when` | `T-Nd` timing |
| `blocks` | array of domains this gates: `food` · `beverage` · `logistics` · `rental` · `vendor_team` … |
| `why` | one grounded paragraph |
| `dependsOn` | *(optional)* array of prerequisite decision ids |

### Cost effect — REQUIRED when `blocks` includes `food` or `beverage`
A choice that changes what's on the table MUST re-cost it. Declare the effect **in the data**; the engine
(`choiceFactorFor` in `playbookFoodPlan`) applies it generically — no per-playbook code.
```js
{ id: 'crab_size', options: ['Mediums (value)', 'Larges (the sweet spot)', 'Jumbos (showpiece)'],
  default: 'Larges (the sweet spot)', blocks: ['food'],
  costFactors: { 'Mediums (value)': 0.78, 'Jumbos (showpiece)': 1.4 }, // default option omitted ⇒ 1.0
  affects: ['p_crabs'] }                                                // purchase ids this re-prices
```
Rules: `costFactors` keys ⊆ `options`; factors are positive numbers; **omit the default option** so it
stays 1.0 (baselines + tests don't move); `affects` lists real `purchases[].id`s. This is the ONE
mechanism — beverage/sourcing tiers are migrating onto it (do not add new one-off factor functions).

### Escape valves & caveats (learned from verification)
- **`noCostEffect: true`** — a food/beverage decision that legitimately does NOT change cost (a payment
  split, a guest-count band already scaled by headcount, an event-scope/framing call). Mark it explicitly:
  silence reads as *missing* costFactors; an explicit flag reads as a *decision*. Empty-option decisions
  (`options: []`) are exempt automatically.
- **Unique decision ids** — two decisions sharing an `id` collide on the same `event.foodChoices[id]` key.
  Enforced as a hard invariant.
- **⚠ `affects` must name a line that stays a DISTINCT costed item.** Some playbooks route food through a
  `foodApproach` model that COLLAPSES the itemized purchases into one derived line (e.g. `fa-catering`) when
  the host picks a catering option. A `costFactors` on a raw purchase id that gets collapsed **silently
  no-ops** — it's well-formed but never lands. So: item-level menu / size / seasoning choices (crab size →
  `p_crabs`) are the right fit; food-*APPROACH* decisions (cook vs cater vs order) are re-priced by the
  foodApproach model itself, NOT by a per-item factor. Mark those **`costViaApproach: true`** (instead of
  costFactors) so the linter records them as model-handled, not missing. Verify a real costFactor with the
  *effectiveness* audit (`_costAudit.test.js` — does the total actually move, in the right direction?), not
  just the well-formed check. Empirically ~87% of factors were correct; the ~13% that weren't were all
  food-approach decisions now marked costViaApproach.

## `purchases[]` — the shopping/cost model
Every purchase:
| field | rule |
|---|---|
| `id` | **`p_`-prefixed**, unique (e.g. `p_crabs`). Never `p-` |
| `item` | human name |
| `category` | one of the **fixed taxonomy** below — never a vendor name |
| `unitCostRange` | `[low, high]` USD, `low ≤ high`. **Required on every `food`/`beverage` item** (or it can't be costed) |
| `unit` | 'lb', 'crab', 'set', … |
| quantity | exactly one model: `qtyPerGuest: <n>` **or** `qtyFlat: <n>` (+ optional `qtyPer: <k>` = one unit per k guests). **Never mix** `qtyPerGuest` with `qtyFlat` |
| `where` | array of store/source types |
| `essential` | boolean |
| `buyAt` | `T-Nd` \| `T0` |
| `note`, `provenance`, `alternatives` | optional but encouraged; `provenance` carries the grounding tier |

### Category taxonomy (fixed)
`food` · `beverage` · `decor` · `rental` · `cleanup` · `logistics`.
Vendor types (Florist, Caterer, Baker, DJ…) belong in **`vendors[]`**, never in `purchases[].category`.

## Adding a new playbook — checklist
1. Copy the closest existing file in `data/`; set `type` to the canonical type; bump/ set `version`.
2. Author `decisions[]` — give every `food`/`beverage` decision its `costFactors` + `affects`.
3. Author `purchases[]` — `p_`-prefixed ids, taxonomy categories, `unitCostRange` on all food/bev, one qty model.
4. Author `tasks`/`milestones`/`risks`/`vendors`/`knowledge` following a sibling.
5. Add the import to `ALL_PLAYBOOKS` in `index.js`.
6. Add the identity glyph per `docs/GLYPH_STANDARD.md` (icon + hue + glass shape) so the mark renders.
7. Run the suite — `playbookContract.test.js` must be green (no new contract gaps).

## The guardrail
`src/lib/playbooks/playbookContract.test.js` asserts the hard invariants and **ratchets** the known
rollout gaps (missing `costFactors`, id-prefix drift, category drift) toward zero — the baseline can only
go DOWN. It also prints the current gap list (the red→green checklist the Admin "Playbooks" tab reads).
