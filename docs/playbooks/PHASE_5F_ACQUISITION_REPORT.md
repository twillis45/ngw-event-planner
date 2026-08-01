# Phase 5F - Knowledge Acquisition Intelligence: Report

**Date:** 2026-08-01. ASCII-only.
**Baseline:** `7c53c551` (Phase 5E).
**Gates:** 300 suites / 4616 tests passing . `gate:knowledge [OK]` . `gate:hostv2` no drift.

---

# 1. Provider architecture status

## **C - partially connected, and presenting itself as A.**

Measured, not inferred:

```
hostv2 imports of provider modules   : NONE
playbooks engine imports             : NONE
knowledge runtime imports            : NONE
admin console imports                : all 9 modules
providers cited in the corpus        : 0 of 16
```

Full evidence in `PROVIDER_CAPABILITY_MATRIX.md`. Two findings outrank everything else.

## 1.1 The fetchers are simulated and labelled real

`providerIntegration.js` opens with `// Real data fetching from external APIs: FDA,
government data, retail pricing.` It makes **zero network calls**. All five fetchers return
hardcoded literals - **11 of them stamped `confidence: 'high'`** and attributed to
`opendata.fda.gov`, `ams.usda.gov/market-news`, `fisheries.noaa.gov`, `instacart.com`,
`restaurantdepot.com` and `reddit.com/r/maryland`.

One record it returns, verbatim: *"USDA Market News: Blue crabs (Maryland) seasonal average
June-July 2026: Large grade $7.92-$8.17/lb..."* Those prices were never fetched from USDA.

## 1.2 It has not caused harm only because another defect blocks it

`AdminConsole.handleMerge` - the button labelled "merge evidence into playbook" - sets React
state and writes nothing. No `upsertKCR`, no persistence. It then prints
**"OK Evidence merged into playbook... now marked as researched."**

So fabricated federal prices cannot reach a host. **The system is protected by a bug, not a
gate.** Repairing `handleMerge` without first removing the simulators would publish invented
USDA data under a USDA citation. **They must be fixed in one change, simulators first.**

---

# 2. The Reddy Ice loop - traced honestly

**The loop that worked did not use the provider subsystem at all.** Stating that plainly
because the phase brief describes Reddy Ice as a "provider source", and it is not one:
`reddy-ice-2026` lives in `QTY_SOURCES`, which shares zero ids with `providers.js`.

| # | Arrow | Status | Evidence |
|---|---|---|---|
| 1 | Provider -> research action | **UNKNOWN / bypassed** | No provider involved. I ran WebSearch + WebFetch by hand. `providers.js` was never called |
| 2 | Research action -> source capture | **PROVEN** | Fetched `reddyice.com/how-much-ice-you-need-for-a-party/`; captured the stated 1-2 lb/person and the worked outdoor example (50 guests = 15 x 7-lb bags = 105 lb = 2.1 lb/guest) |
| 3 | Source capture -> evidence object | **UNKNOWN / bypassed** | No `createEvidence` record exists. Store shows 0 observations, 0 evidence. Capture went straight into a registry entry |
| 4 | Evidence -> claim extraction | **PROVEN, manual** | Claim written by hand into `QTY_SOURCES['reddy-ice-2026'].claim`, including the disagreement between the page's prose range and its own arithmetic |
| 5 | Claim -> registry | **VERIFIED IN CODE** | `quantityProvenance.js` - a code change, not an admin action. This is the bottleneck |
| 6 | Registry -> KCR | **PROVEN in browser** | Authored in the Admin composer via the provenance editor built this phase; `fieldPath: p_ice.provenance`, `tier: researched`, `sources: ["reddy-ice-2026"]` |
| 7 | KCR -> approval | **PROVEN in browser** | SME + editorial + governance approved separately; correction stopped at Review and could not self-approve |
| 8 | Approval -> published artifact | **PROVEN** | Published -> export (5 records) -> `npm run bake:knowledge` -> snapshot `e0d6d879`, 5 entries |
| 9 | Published -> host rendering | **PROVEN in hostv2** | Crab Feast -> The spread & shopping -> The list -> Drinks -> Ice row renders `Sourced - Reddy Ice (packaged-ice manufacturer) publishes 1-2 lb of ice per...` |

**Before:** `qtyGrounded: false`, `provenance: null`, no Sourced line.
**After:** `qtyGrounded: true`, `sources: ["reddy-ice-2026"]`, Sourced line rendering.
**Authored playbook file: unchanged** (`provenance` still `null` on disk).

## 2.1 What the governance engine got right

The first publish attempt **correctly failed to ground**. `isGroundedItemQty` requires every
cited source to resolve in `QTY_SOURCES`; `reddy-ice-2026` did not exist yet, so
`qtyGrounded` stayed `false` and hostv2 would not have rendered the line. The system refused
to call an unregistered source grounded. **That is the provider contract already working** -
and it is why arrow 5 is the real bottleneck rather than a formality.

## 2.2 What had to be built to make arrow 6 possible

`governedFieldTypes.provenance` has carried `format`/`parse`/`validate` since 5E, and the
composer rendered typed inputs for every other field **but not provenance**. Selecting it
left the draft null and `doCorrect` fell through to `newValue = entry.value` - the correction
re-published the existing provenance unchanged. **An administrator could not author a source
attribution at all**; every provenance block in the corpus got there by a developer editing a
file. A provenance editor (source ids / claim note / confidence) now exists.

---

# 3. Provider matrix

`PROVIDER_CAPABILITY_MATRIX.md`. Every one of the 16 rows is `Runtime Impact: none`.

The registry that *does* have runtime impact is `QTY_SOURCES`, with **four** entries -
`webstaurant-protein-2026`, `webstaurant-portions-2026`, `bar-provision-2026` (cited x25, the
most-used source in NGW) and `reddy-ice-2026` (added this phase). It is invisible to the
provider UI that admins actually use.

---

# 4. Next backfill candidate

## **`p_ice.qtyPerGuest` across the remaining 28 playbooks.**

| Requirement | Met |
|---|---|
| non-crab | yes |
| direct runtime ownership | yes - `drivesRuntime: true`, `editable: true`, no delegation |
| host-visible | yes - moves `qty`, `basis`, `low`/`high` on a rendered row |
| simple economics | yes - lb/guest x guests x $/lb, no thresholds |
| **repeatable provider pattern** | **yes - needs no new research** |

`p_ice` appears in **29 playbooks and renders in all 29**, carrying **five different authored
values** - 1.0, 1.25, 1.5, 2.0, 2.5 lb/guest - of which 6 have no provenance at all.

The spread is not incoherent: it tracks indoor(1.0-1.5) vs outdoor(2.0-2.5), which is
defensible. What is missing is grounding. **Two registered sources now bracket it:**

- `bar-provision-2026` states ice **~1.5 lb/guest** (12-15 bags per 100) - the general case
- `reddy-ice-2026` supports **~2 lb/guest** for the outdoor case

So 28 lines can be grounded from sources **already in the registry**, with zero new research
and zero new code. That is what makes it the correct repeatability test: it proves the loop
runs a second time *without* another developer registry change.

**Known live defect it will fix:** `Fish Fry` is explicitly an outdoor propane-fryer event
(66 outdoor signals in the playbook - outdoor, propane, fryer, backyard, tent, canopy) yet
carries **1.5 lb/guest with `provenance: null`**, while every comparable outdoor cook in the
corpus is at 2.0-2.5.

**Blocked by:** the correction composer has **no asset picker**. It is anchored to a row in
the live published inventory, so only the 2 currently-governed assets (Crab Feast,
Retirement Party) are reachable. **37 of 39 playbooks cannot be corrected at all.** That is
the single change standing between one proof and a repeatable process.

---

# 5. Research backfill architecture decision

## **A - human-driven research campaigns. Not B, and nowhere near C.**

| Option | Verdict |
|---|---|
| **A. Human-driven** | **Choose this.** The one loop that worked was fully human: a person read a page, judged what it supported, and wrote the claim - including the caveat that a packaged-ice vendor profits from a higher number. No automation would have written that caveat |
| **B. Assisted recommendations** | Already exists (`researchBlueprint` recommends providers per gap) and is **actively misleading**: it recommends from the 16 providers that are never cited and whose fetchers are simulated. Assistance built on a fabricated data layer is worse than no assistance |
| **C. Automated provider intelligence** | **Do not.** The subsystem currently manufactures federal citations. Automating it would industrialise exactly the failure this programme has spent five phases eliminating |

**The smallest viable architecture is what already half-exists and needs finishing:**

1. An **asset picker** in the composer (unblocks 37 playbooks).
2. A **provenance editor** (built this phase).
3. **`providerNormalizers.js`** - the genuinely useful module: it normalizes *pasted* records
   from a human's own research. This is the honest shape of "assisted": the human fetches,
   the tool structures.
4. **Registry entry remains a code change** - and should, until there is a review path for
   adding a source. A source is a durable claim about who may be believed.

---

# 6. What remains manual - and should

| Step | Why manual |
|---|---|
| Reading the source | Reddy Ice's prose says 1-2 lb; its own worked example computes 2.1. Only a human noticed the page contradicts itself |
| Judging what a source supports | The search summary attributed "double it for outdoor" to Easy Ice. **That page publishes no per-guest figure at all** - the same fabrication mode as the Cameron's citation. A crawler would have propagated it |
| Recording interest | "A packaged-ice manufacturer is not disinterested about buying more ice" is a judgement no fetcher makes |
| Registering a source | Deciding who may be believed is a governance act |
| Approving the correction | Three separate gates, already enforced |

---

# 7. What must never be automated yet

1. **Fetching that writes citations.** Until `providerIntegration.js` stops inventing FDA and
   USDA records, nothing downstream of it may be trusted or connected.
2. **`handleMerge`.** Making it real before deleting the simulators turns a silent no-op into
   a publisher of fabricated federal data.
3. **Confidence scoring.** 11 fabricated facts are already stamped `confidence: 'high'`.
   Machine-assigned confidence on unverified input is how the corpus acquires false certainty.
4. **Batch gap closure.** `handleBatchGapClosure` exists and would multiply every problem above
   across a playbook in one click.

---

# 8. Phase 5G recommendation

## **Phase 5G - Make Acquisition Repeatable and Make the Research Layer Honest**

In order:

1. **Delete the simulated fetchers** (or reduce `providerIntegration.js` to accepting pasted
   records). Highest-severity item in the repo. One change, with `handleMerge`.
2. **Make `handleMerge` honest** - either it opens a real KCR into Review, or its label tells
   the truth.
3. **Add the asset picker** to the correction composer. Unblocks 37 of 39 playbooks and is the
   single largest unlock for acquisition throughput.
4. **Run the `p_ice` backfill** (section 4) - 28 lines, two registered sources, no new
   research. This is the repeatability proof.
5. **Then** decide whether assisted research is worth building, with a real data layer under it.

**Do not begin the 237-line Tier 1 backfill until 1-3 are done.** Not because the research is
hard, but because today it would have to be published through a composer that can reach two
playbooks, citing a registry only a developer can extend, alongside a research tool that
fabricates its sources.

---

# 9. Separate task - not done here

**CTA-1** (deliberately excluded from this phase, per instruction):

- `.cta stay` - 3 buttons carry a class with **zero CSS rules**; they render as plain
  primaries. Same failure the stylesheet already documents from the 2026-07-11 typography
  audit, when `cta big` had no matching rule.
- `.confrow` is styled only under `.hero.elegant`; bare anywhere else.
- Add a semantic CTA contract test: every class token applied to a `<button>` must resolve to
  at least one CSS rule.

Full inventory and specimens: `docs/audits/` artifact published 2026-08-01.
