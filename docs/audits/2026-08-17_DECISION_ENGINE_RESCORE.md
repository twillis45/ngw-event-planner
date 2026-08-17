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
