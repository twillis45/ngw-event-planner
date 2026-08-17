# Coverage re-score — W9, 2026-08-17

Leader: Linear inbox / Asana rollup. Prior: **5/10** (W8, 2026-07-15).
House rule: lowest sub-dimension, re-derived against the running engine, never
inherited.

## W8's three caps, re-derived

| W8 cap | Verdict |
|---|---|
| the missing reply-by / silent-guest PRODUCER | **was real, now CLOSED** (`26f434ad`) |
| callsPill vs decisions — two thresholds | **real but practically closed** |
| booking-progress bypasses the ledger | **real, still open, and worse than stated** |

**Silent guests.** Confirmed still open five weeks on: a hard reply-by five days
past with three of five guests silent produced fourteen raises, none about the
silence. Closed with a raiser; every other piece already existed.

**Two thresholds.** Technically true — the pill counts `decisionBoard.open`, the
raiser filters `status === 'overdue'`. Measured, the divergence is at most ONE
decision and only at T-180; from T-90 inward the two agree exactly. Not worth a
change on its own.

**Booking progress.** Re-derived and confirmed — the shell documents it against
itself at `HostShellV2.jsx:9189`: *"no SURFACES id covers 'not yet booked'… add a
real raiser before adding another."*

Measured across the countdown with a Caterer at `Shortlisted` and a DJ at
`Contacted`:

| distance | raises | anything about the unbooked vendors |
|---|---|---|
| T-120d | 14 | none |
| T-45d | 14 | none |
| T-20d | 15 | none |
| T-7d | 15 | none |
| **T-3d** | 20 | **none** |

The only matches at any distance are the two standing risk cards ("Outdoor
ceremony…", "A key vendor cancels…"), which render identically whether every
vendor is booked or none is. So a wedding THREE DAYS OUT with no caterer booked
says nothing about it in the ranked list.

**The threshold for a fix already exists and does not need inventing.** Playbooks
author a booking lead per vendor category — `{ category: 'Caterer', required:
true, when: 'T-300d' }` (wedding.js:114) — so "should have been booked by now" is
a declared fact, in the same shape as the reply-by date that closed the
silent-guest cap. What is missing is again only the raiser.

Not built in this pass: matching authored CATEGORY to the host's actual vendor
`role` across 39 playbooks is real work, and this is the attention path, which
already took one revert tonight from moving quickly.

## THE NEW FINDING — RETRACTED, see the correction below

## (retracted) the overdue signal is saturated at one end and silent at the other

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


---

## CORRECTION — the saturation finding was WRONG, both halves (2026-09-5x)

I set out to fix this and could not, because there is nothing broken. Both halves
of the finding above are artifacts of my own fixtures. Retracting them here rather
than leaving a false record for someone to build on.

### Half one: "Dinner Party and Birthday never fire at all" — FALSE

I swept T-540 down to T-60 and saw 0/3 at every stop. Their authored windows are
`T-21d, T-14d, T-14d, T-14d, T-2d, T-10d` — **my sweep stopped before the first
window opens.** Measured properly:

| type | T-60 | T-25 | T-14 | T-7 | T-2 |
|---|---|---|---|---|---|
| Dinner Party | 0/3 | 0/6 | 1/6 | **5/6** | 5/6 |
| Birthday | 0/3 | 0/6 | 1/6 | 3/6 | **6/6** |

The gradient EXISTS and it is well shaped: nothing early, one rung at T-14, most
by T-7. That is exactly the ramp I said was missing.

### Half two: "Wedding saturates at T-120" — an artifact of an empty fixture

My wedding had ZERO decisions resolved. A wedding 120 days out with nothing
decided IS behind — the authored windows are T-365d…T-180d, so a 12-month norm
puts all nine past. That is an accurate reading, not a dead signal.

And resolving them clears them, which I never checked:

    nothing decided   open 9, overdue 9, locked 3
    four decided      open 5, overdue 5, locked 7

The first attempt to test this used `decisionPicks`, a field that does not exist
(the real one is `event.foodChoices`), and I nearly recorded "resolving does not
clear" as a second false defect on top of the first.

### What this costs the Ranking finding

`85e535ce` reported that decision bundles crowd the top because they "saturate to
overdue permanently". That is overstated for the same reason: they saturate only
for a host who has decided nothing. The bundle still outranks the guest list
whenever ANY decision is overdue — which is real, and still worth looking at —
but it is not the permanent, information-free signal I described.

### The lesson, since it is the third time today

A sweep that stops short and a fixture in an unrealistic state produce findings
that look rigorous and are not. The PREMISE-test habit caught this class three
times (a p_beer line that did not exist, a `decisionPicks` field that did not
exist, a range that never reached the windows) — but only when I remembered to
ask what would make the measurement vacuous. Here I published first and asked
second.

**Coverage stays 5/10.** The score is unchanged, but one of its two stated
reasons is withdrawn: the remaining gap is the unbooked-vendor producer, not a
missing gradient.


---

## Second pass (11:0x) — last cap closed, post-event verified, new gap found

**All three W8 caps are now closed** (enforcement, silent guests, unbooked
vendors — the last in `5e85a17d`).

**Post-event verified CORRECT**, having first misread it. `eventPlan().nextActions`
is EMPTY after the event, which looked like a hole; every raiser gates on
`isPastEvent` by design, because the wrap-up ledger owns that phase. It orders
properly:

| state | what the host is told |
|---|---|
| vendor cost recorded, unpaid | **"Settle up with Acme"** (priority 1) |
| vendor cost recorded, paid | "Send thank-yous · 12 left" |
| **no cost recorded**, unpaid | "Send thank-yous" — correctly refuses to claim a debt it has no amount for |

That last row is the honest one: with no recorded cost, asserting money is owed
would be fabrication.

## THE NEW GAP — cost sharing cannot raise at all

`grep -c costSharing src/lib/surfaceRegistry.js` → **0**.

`costSharing` is read by its own engine, by `sectionDirectory`, and by the shell —
and by NOTHING that can raise. So a host collecting pooled dues whose guests have
not paid is told nothing by the ranked list, at any distance, ever. The roster
carries a seat for precisely this failure mode: *The Trench Organizer — the cousin
who actually collects the money; organizer exposure, partial/cash payments, the
11pm chase roster.*

**It is not buildable without a ruling.** `costSharingSummary` returns amounts
(`lowestDue`, `highestDue`) and no DATE. Every producer added today rested on an
authored threshold — the reply-by for silent guests, `when: 'T-300d'` for unbooked
vendors. Cost sharing has none, so "when is a share late?" would be a number I
invented, and inventing a deadline to nag a host's friends about money is the
worst possible place to guess.

**Board question for the next pass:** what makes a pooled due late — an authored
`dueDate` on the cost-sharing record (new field, host-set, same shape as
`rsvpDeadline`), or a derived offset from the event date? The first is honest and
needs UI; the second is cheap and invents a promise nobody made.

## Score

**Coverage: 7/10** (from 6).

Raised: the last W8 cap is closed and gated, and post-event closeout is verified
correct rather than assumed — including its refusal to invent a debt.

Capped at 7 by the cost-sharing gap: a whole domain with a sheet, an engine, and
no way to raise. Guest money is not a minor surface.
