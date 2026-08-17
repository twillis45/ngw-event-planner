# Coverage re-score — W9, 2026-08-17

Leader: Linear inbox / Asana rollup. Prior: **5/10** (W8, 2026-07-15).
House rule: lowest sub-dimension, re-derived against the running engine, never
inherited.

## W8's three caps, re-derived

| W8 cap | Verdict |
|---|---|
| the missing reply-by / silent-guest PRODUCER | **was real, now CLOSED** (`26f434ad`) |
| callsPill vs decisions — two thresholds | **real but practically closed** |
| booking-progress bypasses the ledger | not yet re-derived |

**Silent guests.** Confirmed still open five weeks on: a hard reply-by five days
past with three of five guests silent produced fourteen raises, none about the
silence. Closed with a raiser; every other piece already existed.

**Two thresholds.** Technically true — the pill counts `decisionBoard.open`, the
raiser filters `status === 'overdue'`. Measured, the divergence is at most ONE
decision and only at T-180; from T-90 inward the two agree exactly. Not worth a
change on its own.

## THE NEW FINDING — the overdue signal is saturated at one end and silent at the other

Measuring what the pill/raiser actually say across the countdown surfaced
something neither W8 cap describes:

| type | T-540 | T-400 | T-300 | T-240 | T-180 | T-120 | T-60 |
|---|---|---|---|---|---|---|---|
| Wedding | 0/9 | 0/9 | 4/9 | 6/9 | 8/9 | **9/9** | **9/9** |
| Dinner Party | 0/3 | 0/3 | 0/3 | 0/3 | 0/3 | 0/3 | **0/3** |
| Birthday | 0/3 | 0/3 | 0/3 | 0/3 | 0/3 | 0/3 | **0/3** |

**Wedding saturates at T-120.** For the final four months — the entire period a
host is actually working — every one of nine decisions reads "past its easy
window". A signal that is always on carries no information, and it trains the
host to stop reading the phrase before the one that matters arrives. This is the
same LEARNED IGNORING that floored Ranking, in a different surface.

**Dinner Party and Birthday never fire at all.** 0 of 3 overdue at every
distance including T-60. For those types the "past its easy window" signal does
not exist, so the ranked list has nothing to say about unmade decisions no matter
how close the event gets.

So the authored decision windows are aggressive for weddings and absent for
simple events. Neither produces a usable gradient, which is what Linear's triage
and Asana's rollup both trade on: a signal that means something *because* it is
not always true.

## Score

**Coverage: 5/10** — held, not raised.

A real producer was added, which is genuine movement. But the score is the lowest
sub-dimension, and the lowest is now the QUALITY of what is surfaced rather than
its presence: a saturated signal on the largest event type and a dead one on the
common types. Adding a producer while the existing signals carry no gradient does
not lift the dimension.

## What 10+ needs from here

- **Author decision windows as a gradient**, not a cliff — the wedding ladder
  should still have unfired rungs at T-120, and simple types should have any
  rung at all inside T-30.
- That is corpus authoring across 39 playbooks and a judgment about each event
  type's real rhythm, so it wants the event-pro bench, not a constant.
- `booking-progress bypasses the ledger` remains un-re-derived; Coverage cannot
  move above 5 until it is.
