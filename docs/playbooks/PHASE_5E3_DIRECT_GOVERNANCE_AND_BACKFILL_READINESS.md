# Phase 5E.3 - Direct Governance Proof + Safe Research Backfill Readiness

**Date:** 2026-08-01. ASCII-only.
**Gates:** **299 suites / 4608 tests passing** (+21) . `gate:knowledge [OK]` . lint 0 errors.
**Governed artifacts:** restored to HEAD, clean.

---

# 1. Executive verdict

## **All three objectives complete and driven in the browser. One of them found that 5E.2's ownership contract contained the exact defect it was written to forbid.**

The headline result is the one this programme has been chasing since 5C: **a researched
number changed what a host is told to buy, and the playbook file was never edited.**

```
p_oldbay.qtyPerGuest

BEFORE (authored)   0.05 lb/guest  ->  1.1 lbs  .  $4-$10
AFTER  (governed)   0.08 lb/guest  ->  1.7 lbs  .  $7-$15
AUTHORED FILE       qtyPerGuest: 0.05   UNCHANGED
```

Verified in the hostv2 UI, not in a test: the Crab Feast shopping list renders
`Old Bay . 1.7 lbs . $7-$15 . 0.08 lb/guest x 21 guests`.

---

# 2. Objective 2 - the DIRECT-field host proof

`p_crabs` was excluded by instruction. `p_oldbay` was used: a DIRECT field, no engine
between the value and the line.

| # | Step | Result |
|---|---|---|
| 1 | Authored value captured | `qtyPerGuest: 0.05`, host `1.1 lbs / $4-$10` |
| 2 | Correction composed in Admin | `p_oldbay.qtyPerGuest = 0.08`, `typeof number` |
| 3 | Reason stated | two commercial sources put crab-boil seasoning near 0.08 lb/guest |
| 4 | Review | all three gates (SME / editorial / governance) |
| 5 | Publish | `status: published` |
| 6 | Export | `exportBase` + `serializePublishedExport` -> `publishedKcrs.json` |
| 7 | Bake | `npm run bake:knowledge` -> 3 entries, snapshot `4b9721f2` |
| 8 | Host | hostv2 :5199, Crab Feast -> The spread & shopping -> Food |

**Difference:** quantity +55%, cost range moved, basis line moved, authored file untouched.

## 2.1 Blocker found and fixed mid-proof

The Publishing inventory lists only fields **already published**, so `p_oldbay` was
unreachable - governing a field for the FIRST time is the normal case, and there was no
route to it. Added a purchase picker to the composer (16 Crab Feast items) and retargeted
`doCorrect` and every pre-fill/ownership lookup to the selected purchase.

---

# 3. The finding: `servingGuide` was governed with no consumer

## 3.1 What was wrong

5E.2 established the rule: *a value can only be governed if there is a verified runtime
consumer*. It then declared `governedBy: ['priceLadder', 'servingGuide']`.

`priceLadder` is genuinely consumed. **`servingGuide` was not.** The only read in the
entire tree was a truthiness check:

```js
// playbooks/index.js:150
if (!p.priceLadder || !p.servingGuide) return null;
```

Every serving number came from `crabsPerPicker()` / `crabsPerBushel()` -> `entryFor()` ->
the **frozen module constant** in `crabServing.js`, which `governedPurchase()` cannot
reach. Measured before the fix, with a guide claiming 20 crabs per picker and 12 per
bushel:

```
BEFORE {"qty":2,"unit":"bushels","totalUnits":84,"price":690}
AFTER  {"qty":2,"unit":"bushels","totalUnits":84,"price":690}
MOVED: false
```

Worse than a no-op: a falsy governed value would have **deleted** the bushel
recommendation entirely.

## 3.2 Why the existing gate could not catch it

`governedOwnership.test.js` asserts `RUNTIME_CONSUMED_FIELDS` matches
`GOVERNED_PURCHASE_FIELDS`. Both listed `servingGuide`, so both were wrong together.
**Two declarations agreeing is consistency, not consumption.** The only instrument that
could find this was OUTPUT, which cannot agree with itself.

## 3.3 The fix - wire the consumer, do not weaken the contract

Removing `servingGuide` from the governed set would have been honest and would have left
the ownership contract promising admins a route to correct the crab COUNT with only price
actually reachable. So the consumer was wired instead:

- `crabServing.js` - `entryFor(size, guide)` takes an override; `crabsPerPicker`,
  `crabsPerPickerRange`, `crabsPerBushel`, `crabServingProvenance` accept `opts.guide`.
- `usableRow()` - a governed row is used only if `withSides`, `mainOnly` and `perBushel`
  are all `[number, number]`. Malformed or partial degrades to the sourced table, never
  to NaN.
- `resolveBulkPurchase` passes `p.servingGuide` through.

Only two call sites existed outside the module, both extended safely.

## 3.4 Measured after

```
authored                     2 bushels . 84 crabs . $690
withSides [3,3]              1 bushel  . 63 crabs . $345   <- the COUNT moved
perBushel [30,30]            3 bushels . 84 crabs . $1035
malformed row                2 bushels . 84 crabs . $690   (falls back)
guide silent on chosen size  2 bushels . 84 crabs . $690   (falls back)
```

**This is the capability `qtyPerGuest` could not deliver.** 5E proved a governed
per-guest rate cannot move a bushel; `servingGuide` is the field that can, and until this
phase it was governed in name only.

---

# 4. Objective 1 - typed editors for `priceLadder` and `servingGuide`

Both are nested objects. A JSON textarea would have given the crab line - the costliest
item a host buys, and the one the ownership contract *sends admins to* - the least safe
editor in the console. Both are **row editors**: choose the size, edit named numeric
inputs, live value beside each box, untouched sizes ride through in the draft's `base`.

| | `priceLadder` | `servingGuide` |
|---|---|---|
| Row selector | medium / largeFemale / largeMale / xlFemale / xlMale / jumboMale | medium / large / xl / jumbo / colossal |
| Inputs | perDz, per2Dz, perHalfBushel, perBushel, approxPerBushel, approxPerHalfBushel | withSides, mainOnly, perBushel - each a low/high spread |
| Old -> new | `current: $345` beside each box | `current: 72-72` beside each box |
| Preserves | all other sizes, `servingKey`, `source`, `note` | all other sizes, `inches`, `tier`, `source`, `perBushelDissent` |

Two decisions worth stating:

- **Blank deletes the key, it does not write 0.** `jumboMale` legitimately has no
  `perBushel`, and `resolveBulkPurchase` branches on the field being falsy - a 0 would
  read as a free bushel.
- **All three serving fields are required.** `entryFor()` discards a partial row, so a
  half-filled correction would publish, pass every gate, and change nothing. Refused in
  the composer instead.

## 4.1 Browser proof (real pointer events, CRA admin :3000)

| # | Step | Result |
|---|---|---|
| 1 | FIELD row on `p_crabs` | `provenance` . `qtyPerGuest (engine-owned)` . `unitCostRange (engine-owned)` . **`priceLadder`** . **`servingGuide`** |
| 2 | Open `priceLadder`, size `medium` | 32 / 60 / 99 / 195 / 84 / 42 - matches the authored literal |
| 3 | Switch to `largeMale` | re-seeds 72 / 140 / 199 / 345 / 72 / 36 |
| 4 | **`perBushel` = `banana`, submit** | **`Blocked: perBushel: "banana" is not a number.`** - **0 KCRs created** |
| 5 | `perBushel` = 395, submit | correction created, `status: review` |
| 6 | Inspect record | all 6 sizes preserved . `largeMale.perBushel: 395` . `medium` verbatim . `source`/`note` kept |
| 7 | Open `servingGuide`, size `large` | withSides 4-4, mainOnly 5-6, perBushel 72-72 - matches `crabServing.js` |
| 8 | **Blank `mainOnly` low, submit** | **`Blocked: mainOnly low: A quantity is required.`** - **0 KCRs created** |
| 9 | `perBushel` 72 -> 60, submit | correction created, `status: review` |
| 10 | Inspect record | all 5 sizes preserved . `large.perBushel: [60,60]` . `tier: cited` and `inches` kept |

Both corrections stopped at Review. Neither self-approved.

## 4.2 Second defect found in the browser: a confirmation message that lied

Opening a correction printed **"(supersedes crab-feast-p-crabs-provenance-v1)"**
unconditionally - including when correcting a NEW field, where the record correctly
carried `correctionOf: null` and superseded nothing.

The lineage was right and the sentence was wrong, **which is the worse of the two**: an
admin can only act on the sentence, and this one said a live provenance record was about
to be retired. Now:

> Correction opened for p_crabs.servingGuide - a newly governed field, so it starts its
> own lineage and supersedes nothing. Awaiting review

Verified rendering in the browser.

---

# 5. Objective 3 - safe research backfill queue

`docs/playbooks/SAFE_RESEARCH_BACKFILL_QUEUE.md`. Grounded in a measured census, not an
estimate:

```
39 playbooks . 537 purchase lines
  no provenance   368  (69%)
  legacy string    21
  structured      148
Tier-1 shaped (essential + costed + quantified + not delegated)  248
```

| Tier | Contents | Rule |
|---|---|---|
| **1** | 248 DIRECT purchase lines | safe now - proven by `p_oldbay`; sequenced by evidence PRIMITIVE, not by playbook, so one verified fact grounds ~35 lines instead of being copied 35 times |
| **2** | `priceLadder`, `servingGuide` | typed editor + named dated source + independent reviewer; blast radius is the costliest line |
| **3** | delegated fields, no-consumer fields, `xl` interpolated row, silent vendors | do not backfill - and Tier 3 is a WORK LIST, not a stable set |

The first Tier 2 job is already written down in the repo: `bySize.large` carries
`perBushelDissent: [48, 60]` against the 72 the shopping list plans on. The research
question exists; the answer has never been resolved.

---

# 6. Files changed

| File | Change |
|---|---|
| `src/lib/crabServing.js` | `entryFor(size, guide)` + `usableRow()`; four exports take `opts.guide` |
| `src/lib/playbooks/index.js` | `resolveBulkPurchase` passes `p.servingGuide` as the override |
| `src/lib/knowledge/governedFieldTypes.js` | **NEW** `priceLadder` + `servingGuide` type entries |
| `src/lib/knowledge/governedFieldTypes.test.js` | +17 tests |
| `src/lib/knowledge/governedOwnership.test.js` | +4 tests pinning the servingGuide wire and its fallbacks |
| `src/admin/AdminConsole.jsx` | purchase picker; two row editors; conditional field list; honest confirmation message |
| `docs/playbooks/SAFE_RESEARCH_BACKFILL_QUEUE.md` | **NEW** |

**Not changed:** resolver precedence, `canReachCited`, `isPublishable`, the publish gate's
approval rules, any knowledge VALUE, any playbook value.

---

# 7. Completion criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Typed editor for `priceLadder` | **PASS** - row editor, browser-driven, both paths |
| 2 | Typed editor for `servingGuide` | **PASS** - row editor, browser-driven, both paths |
| 3 | No JSON textarea | **PASS** |
| 4 | Old -> new comparison | **PASS** - `current:` beside every input |
| 5 | Validation refuses bad values | **PASS** - browser-proven, 0 KCRs on reject |
| 6 | Host proof on a DIRECT field, not crab | **PASS** - `p_oldbay`, visible in hostv2 |
| 7 | Full lifecycle 1-8 | **PASS** |
| 8 | Backfill queue with tiers | **PASS** |
| 9 | Tests pass | **PASS** - 4608 |
| 10 | `gate:knowledge` | **PASS** |

**10 of 10.**

---

# 8. Risks and what is NOT done

- **R1. Neither Tier 2 correction was carried to a host.** Both `priceLadder` and
  `servingGuide` corrections sit in Review in browser localStorage. The wire is proven by
  test (`690 -> 345`), and this programme has been burned before by treating a wire as a
  drive. **Wired and unit-proven. Not host-driven.**
- **R2. The two live corrections are in localStorage only.** Governed artifacts were
  restored to HEAD after the `p_oldbay` proof; nothing from Objective 1 is in the repo.
- **R3. The `servingGuide` defect class is not gated.** Nothing stops a future field from
  being added to `RUNTIME_CONSUMED_FIELDS` with no consumer - the drift test still only
  compares two declarations. The absurd-value test is written down in the backfill queue
  as a rule; **a rule is not a gate.** The next honest piece of work is a test that, for
  every field in the governed set, publishes an absurd value and fails if output does not
  move.
- **R4. Sanity ceilings (500 / 1,000,000) remain judgement, not sourced.**
- **R5. Deployment unverified.** Local PASS . Repository PASS . Deployment UNKNOWN.
- **R6. ~25 files uncommitted behind `909f5b9e`,** all gates green.

---

# 9. Recommendation

## **Commit, then close R3 before any research begins.**

1. **Commit.** Everything is green and the tree has been uncommitted across several
   phases; a parallel session has already swept uncommitted work in this repo once.
2. **Build the absurd-value gate (R3).** It is the only structural defence against the
   class of bug this phase found by hand, and the backfill queue is about to add fields
   to the governed set - exactly the moment the class recurs.
3. **Then Tier 1, job 1** (non-alcoholic servings per guest per hour), which grounds ~39
   lines from one primitive.

Do not start Tier 2 research until R1 is closed by driving one governing-field correction
to a host. The crab line is the costliest thing NGW tells anyone to buy, and its
governance route has never been walked end to end.
