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

---

## Attempted fix, REVERTED — and what it proved (same session, 03:0x)

Tried the obvious next step: stamp `gateHolder` + `unlocks` onto foundational
dominoes, sourcing both from the ladder the repo ALREADY declares
(`_eventFoundationActions`, CommandCenter.jsx:1437, each rung stating in prose
what it gates). Not an invented score — arithmetic over a declared order.

**Two things went wrong, both caught by measuring rather than reasoning.**

1. **Stamping at push time made the order WORSE.** "Add your guest list." arrives
   as the ENGINE TOP, so it was already in `seen` and the foundation loop skipped
   it — the FIRST domino stayed ungated while budget and food got the boost, and
   guests fell from rank 1 to rank 3. Fixed by stamping in one post-pass keyed on
   the resolved domain (`CATEGORY_TO_DOMAIN`), so an action is gated for WHAT IT
   IS, not for which code path emitted it. That produced the right ladder:
   guests (unlocks 2) → budget (1) → food (0).

2. **Then four existing gates went red**, and they were right:
   - `a critical blocker leads the queue › it is nextActions[0] at every stage`
   - `every field the selector stamps survives into nextActions[0]`
   - `host and engine name the same next decision › both say the venue`

   The boosted dominoes outranked a Tier-0.6 BLOCKER ("Add the location"), which
   the engine requires to lead. A foundation domino is a gate; a blocker is a
   stop. Consequence alone cannot express the difference, and raising dominoes
   without also expressing blocker precedence trades one mis-rank for another.

**Reverted.** The measurement stands and is the point: the inputs really are
empty, the ladder really is declared, and wiring the two together is a genuine
improvement that CANNOT be done as a scoring tweak. It needs the blocker/gate
relationship stated first — which is a board question, not a constant.

Ranking stays **4/10**. The path to 5+ is now specific: express blocker-vs-gate
precedence, then wire the declared ladder into consequence behind it.
