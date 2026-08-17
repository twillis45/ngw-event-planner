# Ranking re-score — W9, 2026-08-17

Leader: Linear triage / Superhuman. Prior: **3/10** (W8, 2026-07-15).
Method: house rule — score against a named leader, dimension = its LOWEST
sub-dimension, every claim `file:line`, re-derived against the running engine.
Inherited findings are not evidence.

## The three W8 caps: all closed, all gated, all red-proved

| W8 cap | State | Gate |
|---|---|---|
| T-1 pathology — a 29-day-dead COI ranks #0 above tomorrow's reconfirm | **closed** | `rankingFloor.test.js` |
| band-0 criticals unordered by overdue-ness | **closed** | `rankingFloor.test.js` (via `compareBandedActions`) |
| W7-F1 snooze-boundary divergence | **closed** | `snoozeBoundaryParity.test.js` |

Each was re-derived before being fixed, and each red-proof lands on its own test.

## THE NEW FLOOR — the comparator is sound; its inputs are mostly empty

Measured over **163 raises**, 5 event types x 4 event distances, driving the real
`raiseAll` + `actionConsequence`:

| consequence input | coverage |
|---|---|
| `priorityScore` finite | 47.9% |
| `unlocks > 0` | 11.7% |
| `gateHolder === true` | **0.0%** |
| **`actionConsequence(r) === 0`** | **52.1%** |

Two findings, and the second is the floor.

**1. `gateHolder` is a dead term.** `actionConsequence` (CommandCenter.jsx:1700)
adds +2 for it and NO producer in the codebase ever sets it true. The registry
normalizer (`surfaceRegistry.js`) writes `gateHolder: i.gateHolder === true`, so
it is uniformly `false`. A quarter of the consequence formula never fires.

**2. Over half of all raises carry NO consequence signal at all.** For those,
ranking reduces to the lateness boost — which is exactly the pathology closed this
morning, standing one layer further out. This is the W8 lesson recurring for the
third time: *a gate on one axis cannot lift a dimension floored on another.* The
comparator now ranks correctly on consequence; 52% of the list has none to rank on.

## Score

**Ranking: 4/10** (from 3).

Raised one point, not more, and the reason is the house rule itself. Three real
caps closed and each is gated — that is genuine movement. But the score is the
LOWEST sub-dimension, and the lowest is now "the ranking inputs are absent for
half the queue", which is a bigger structural hole than any of the three fixed.
A comparator that reasons well over missing data is not a ranked list; it is a
sorted one.

## What 10+ needs from here

- **Producers must declare consequence where the fact is real.** The doctrine is
  explicit — "consequence from signals the raisers already declare, no new scores
  and no invented precision" — so this is authoring, not inference. A COI raise
  genuinely gates load-in (a vendor can be turned away at the dock); that is a
  real `gateHolder`, not a guessed one.
- **Which raises genuinely gate is a judgment call**, so it wants a board before
  it is authored. Marking things as gates because it improves a score is how the
  formula stops meaning anything.
- Until then Ranking cannot honestly exceed 4: half its input is silent.
