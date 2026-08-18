# Decision Engine — re-measured against the running shell

Date: August 17, 2026 (19:4x)
Leader: a seasoned human planner. Dims: Grounding · Coverage · Prioritization ·
Adaptivity · Honesty.

**Why re-measure:** the last recorded score was **40/50, dated 2026-07-16** — a
month old, and carried in a memory note rather than a repo doc. Today already
proved my notes go stale (I quoted Ranking as 8 while its doc said 4). Nothing
below is inherited; every number was produced by running the corpus or the shell.

---

## Grounding — 5/10

`scripts/groundingCensus.mjs` over 541 priced items:

| verification status | count | share |
|---|---|---|
| researched / established-consensus / cited | **84** | **15.5%** |
| synthesized (honestly labelled estimate) | 364 | 67% |
| **unlabelled** | **93** | **17%** |

Two thirds of priced claims are the app's own synthesis, and it says so — that is
the honest shape, not a defect. What holds the score down is the **93 unlabelled**:
a priced item with no verification status makes no claim about where its number
came from, so a reader cannot tell synthesis from research. Concentrated in
anniversary (7), wedding (7), babyShower (6), bridalShower (6), dinnerParty (6),
engagementParty (6), juneteenthCookout (6).

Up from the 2026-07-15 cap ("priorityBasis 0/215 researched, cost 1/46") — the
August grounding passes were real. Not yet a planner's sourcing.

## Coverage — 7/10

Decisions surfaced per event, all 39 playbooks at T-45: **avg 5.3, min 1, max 9**,
three playbooks under four. The registry adds 16 raise surfaces across 6 domains
(measured earlier today: 827 raises over the corpus).

Capped by the thin tail — a board that offers one call is not a planner's board —
and by the decision-window gradient, which is authored unevenly across 39
playbooks and needs an event-pro bench, not an engine change.

## Prioritization — 7/10

Re-derived today and documented in `2026-08-17_RANKING_RESCORE.md`: blocker
precedence, the lateness/consequence balance, order determinism and late-gate
visibility are all gated and green (79 tests). Capped at 7 by consequence
COVERAGE — of four producing surfaces only `decisions` declares any (58 unlocks /
54 gateHolder of 827 raises). `risks` carrying zero is correct; the vendor
surfaces are the real gap and have no authored source, so it is boarded rather
than invented (`2026-08-17_VENDOR_CONSEQUENCE_BOARD.md`).

## Adaptivity — 5/10  ⬇ from a recorded 9

**The dimension has two axes. One is live; one is still inert in the shipping
shell — exactly as the July record warned, and it was never closed.**

| axis | engine | hostv2 |
|---|---|---|
| behavioural overwhelm (pile × runway) | fires: T-300/120/45 false → **T-14, T-5 true**, focusCount 9→4 | **wired** — `callsFocus` folds the calls list (HostShellV2 ~1591) |
| declared experience × capacity | honoured: `first_time`+`solo` → handHolding `standard`→**high** | **DEAD — `hostExperience` / `hostCapacity` appear in 0 files** |

So `handHolding` is permanently `standard` for every real host. The engine will
adapt to a first-time solo host; nothing ever tells it there is one.

Scoring this 9 was the error the record itself names, in its own words: *"an
engine re-score is NOT evidence the SURFACE does it — verify per-shell in the
browser, or the scoreboard credits a promise the host never receives."* That note
is dated 2026-07-16 and the wire is still missing today. **5/10** reflects one
working axis, not two.

## Honesty — 9/10

Seven enforcement gates present and green: `researchPolicyCompliance`,
`claimBasis`, `venueSourceProof`, `taskInferenceProof`, `ctaNamesTheAct`,
`raiseVocabulary`, `duesUnpricedRaise`. Today added the refusal to invent a
cost-sharing deadline, the refusal to claim a payment on a headcount row, and a
hero that never shows a placeholder.

Held off 10 by the 93 unlabelled priced items above: an unlabelled number is the
one place the product still lets a reader assume more rigour than exists.

---

## Total — 33/50 (was a recorded 40/50)

| dim | now | recorded 2026-07-16 |
|---|---|---|
| Grounding | 5 | 6 |
| Coverage | 7 | 7 |
| Prioritization | 7 | 8 |
| Adaptivity | **5** | 9 |
| Honesty | 9 | 10 |

**The drop is not a regression — it is the first honest measurement.** Adaptivity
carried four points it never earned in the shipping shell, and Grounding and
Prioritization are now scored against measured corpus numbers rather than an
impression. No code got worse; the scoreboard got true.

## What actually moves it

1. **Adaptivity 5→8**: give hostv2 a way to set `hostExperience` / `hostCapacity`.
   The engine is finished and tested (`playbooks/__tests__/overwhelm.test.js`,
   5 tests). This is one intake control, not an engine wave.
2. **Grounding 5→7 and Honesty 9→10, same fix**: label the 93. Each becomes
   `researched`, `established-consensus` or `synthesized` — labelling is not
   researching, and the honest label is usually `synthesized`.
3. **Prioritization 7→8**: author what a required vendor category blocks (boarded).
4. **Coverage 7→8**: the three thin playbooks, then the window gradient.

Items 1 and 2 are the cheap ones and together are worth five points.

---

## Attempt on lever 2 (label the 93) — RUN AND REVERTED, 2026-08-17 20:2x

Attempted, because the two detectors finally agree (both the codemod's walk and
`grounding:census` report **93**; the script's refusal was a stale hardcoded 372,
overridable with `EXPECT_UNLABELLED=93`) and because the documented root cause —
`enclosingObject` walking BACKWARD and mis-parsing the apostrophe in "Captain
White's" — is gone; the scanner is forward now.

It wrote all 93 across 29 files and the census read **541/541 labelled, 0
unlabelled**. Then its own post-write assertion refused the result:

    DUPLICATE provenance in juneteenthCookout.js at 19187
    DUPLICATE provenance in juneteenthCookout.js at 21232
    2 literals carry two provenance keys — REVERT.

Reverted. Tree clean, census back to 93.

**The remaining bug, located.** Both offsets are items carrying a NESTED object of
price ranges:

    sourcingPrices: { butcher: [2, 4], costco: [1, 2.5], grocery: [3, 5] }

The forward scanner resolves "which object owns this `unitCostRange`" incorrectly
when a SIBLING object inside the same item also holds ranges, so it wrote
`provenance` twice into one literal. The apostrophe bug is fixed; object-ownership
around nested price maps is not.

**A note on the instruments.** My own duplicate-key check reported "none — clean"
on the same files — its regex required no nested brace between the two keys, which
is exactly the shape that fails here. The script's assertion caught what mine
missed. Two detectors agreeing was never the standard; this file's header says so
already, and it was right twice.

Lever 2 stays open. Next attempt: fix ownership resolution for items containing
nested range objects, verify against juneteenthCookout specifically, and keep the
post-write duplicate assertion as the gate — it is the only thing that has ever
caught this class.

## Lever 2, second look — the ownership case identified (2026-08-17 20:2x)

The failing item, read in full:

    { id: 'p_chicken', ..., unitCostRange: [2, 5],
      sourcingPrices: { butcher: [2, 4], costco: [1, 2.5], grocery: [3, 5] },
      alternatives: [{ name: 'Chicken drumsticks', ..., unitCostRange: [1.5, 3] }, ...] }

The forward scanner itself is sound — it attributes every `unitCostRange` and every
`provenance` to `stack[stack.length - 1]`, the brace open at that moment, with no
lookback. What it does not handle is an item that owns a range AND contains
`alternatives[]` whose entries own their own ranges: several hits arise inside one
item, and the write step emits per HIT rather than per OWNING OBJECT, so one
literal can receive two `provenance` keys.

**The fix is in the write step, not the scanner:** group hits by `open` and emit at
most one `provenance` per owning object. The scanner already returns exactly the
grouping key needed (`hits[].open`).

Not attempted — this codemod has destroyed authored provenance twice, and its own
post-write assertion is the only instrument that has ever caught it. It deserves a
session with budget to fix, re-run, and put jest behind it, not the tail of a long
one.

---

## Grounding re-measured — 5 was wrong, the instrument was (2026-08-17 21:2x)

The 93 "unlabelled priced items" that set Grounding at 5/10 **do not exist**:

| of the 93 | |
|---|---|
| carry `costProvenance` — labelled in the OTHER slot | **89** |
| `alternatives[]` inheriting a labelled parent | 4 |
| **genuinely unlabelled** | **0** |

The corpus uses a deliberate two-slot design and migrated cost claims to
`costProvenance`, VACATING `provenance` on those items —
`costProvenanceSlot.test.js` asserts the slot "is genuinely vacated". The census
read only the first slot.

    before   448 / 541 labelled   82.8%    cited 7
    after    537 / 541 labelled   99.3%    cited 96   (+4 inheriting = 541)

**Grounding: 8/10** (from a mis-measured 5). Sourced — cited + researched +
established-consensus — is **173 of 541 = 32%**; honestly-labelled synthesis is
364 = 67%; unlabelled is 0. Capped at 8 rather than 9 because a third sourced is
still short of a planner who can name a price's origin on demand, and the sourced
share is concentrated in food.

**What the bad number nearly cost.** Acting on it, the labelling codemod wrote
`provenance` into 89 slots the migration had emptied on purpose. jest caught it and
it was reverted. An instrument that under-reports coverage does not fail safe — it
commissions work that damages a corpus that was already complete.

### Corrected total — 39/50

| dim | now | earlier today | note |
|---|---|---|---|
| Grounding | **8** | 5 | instrument fixed, corpus was already complete |
| Coverage | 7 | 7 | thin tail + window gradient (authoring) |
| Prioritization | 7 | 7 | consequence coverage (authoring, boarded) |
| Adaptivity | 8 | 5 | profile wire shipped; click path undriven |
| Honesty | 9 | 9 | unchanged |

Two of the three remaining gaps are authoring, not engineering. The engineering
one is the Adaptivity click path.

---

## Grounding re-measured again — the "sourced share" was ALSO qty-only (2026-08-18)

The 8/10 above capped Grounding partly on "sourced is 173/541 = 32%, concentrated
in food." That figure — cited + researched + established-consensus — was read
from `provenance.verificationStatus` alone, same narrow slot the labelling bug
lived in three sections up. It never looked at `costProvenance`.

A full day's grounding pass (five research waves plus a targeted band-vs-evidence
review) moved the COST slot specifically: 233/498 cost-cited at the start of the
day to **501/505 (99.2%)** by the end, spanning bachelor party, birthday, bridal
shower, crawfish boil, gender reveal, game night, and the Ethiopian coffee
ceremony — not concentrated in one category the way the 08-17 measurement was.

**The correct combined figure is what `classifyClaim()` returns**, because that is
the function the host surface actually calls — not a re-derived proxy:

    for pb of ALL_PLAYBOOKS: pb.purchases.forEach(walk classifyClaim(provenance, costProvenance))
    SOURCED_LABELS = ['Directly sourced', 'Price directly sourced', 'Amount directly sourced']

    before (qty-slot only, 08-17)   173 / 541   32%
    after  (both slots, classifyClaim, 08-18)   487 / 548   88.9%

Label distribution: `Price directly sourced` 449, `Directly sourced` 38, `Planning
baseline` 37, `Cultural tradition` 23, `Practitioner guidance` 1.

**Grounding: 9/10** (from 8). Not 10 — 61 of 548 purchases (11.1%) are still
`Planning baseline` or a non-sourced tradition/guidance label, and boil-seasoning
specifically was deliberately left uncited today rather than force a single-source
claim (see `2026-08-18_BAND_VS_EVIDENCE.md`), which is the correct call but still
an open gap. The remaining 11% is thin-tail authoring work, the same shape as
Coverage's remaining gap, not a re-measurement error.

### Corrected total — 40/50

| dim | now | 2026-08-17 corrected | note |
|---|---|---|---|
| Grounding | **9** | 8 | cost-axis grounding pass; combined-slot measurement via `classifyClaim` |
| Coverage | 7 | 7 | unchanged — not touched today |
| Prioritization | 7 | 7 | unchanged — not touched today |
| Adaptivity | 8 | 8 | unchanged — not touched today |
| Honesty | 9 | 9 | unchanged — same 11% gap that caps Grounding also caps this |

**A second instance of the same instrument bug is worth naming as a pattern, not
a one-off.** Twice now a "sourced share" number was quoted from a single-axis
census when the corpus carries two parallel claim slots (quantity and cost) that
`classifyClaim()` already combines. Any future re-score should call
`classifyClaim()` directly rather than re-deriving a proxy from raw
`provenance`/`costProvenance` fields — the proxy is exactly where both
under-counts happened.
