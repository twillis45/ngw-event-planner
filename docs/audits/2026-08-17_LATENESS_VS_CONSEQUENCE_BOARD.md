# Review Board — lateness vs consequence, and a conflict between two gates

Date: August 17, 2026 (10:4x)
Dimension: **Ranking** (5/10, leader Linear triage / Superhuman) — the lowest
score and the last reported-but-unfixed defect.

---

## The measurement

With the blocker now declaring `blocks` and the ladder wired, consequence and
lateness can finally be compared. They are not balanced:

| item | consequence | lateness boost | total |
|---|---|---|---|
| venue blocker — gates vendors, timeline, logistics; on time | 4.0 | 0 | **4.0** |
| guest-list domino — unlocks budget + food | 4.0 | 0 | **4.0** |
| a trivial thing **20 days** late | 0 | 6.0 | **6.0** |
| a trivial thing **1 day** late | 0 | 4.1 | **4.1** |

**Any late item outranks the venue gate, including one that is one day late and
gates nothing.** Two structural reasons:

1. `actionConsequence` clips unlocks: `Math.min(2, unlocks)`. A blocker gating
   THREE things scores identically to one gating two. Consequence therefore tops
   out at 4 without a `priorityScore`.
2. `latenessBoost` runs 4 → 6. Its FLOOR already exceeds most real consequence.

## THE CONFLICT — two gates want opposite things

- **`decisionSoundness`**: *"genuine lateness still leads — consequence does not
  bury a past-due item"*. Its fixture is a 6-day-late item with NO consequence
  signals beating a scheduled gate-holder. That guard is why the boost floor is 4
  (at 3 it lost by 0.14).
- **Rafanelli, on the venue**: *"You cannot order rentals, set a load-in, or brief
  a caterer against an address you do not have. It leads because everything
  downstream is fiction without it."*

Both cannot hold. This is not a constant to tune; it is a question about what the
ranking means.

---

## Design bench (first)

**Karri Saarinen.** "Lateness is evidence about a DEADLINE. Consequence is
evidence about DEPENDENCY. You have been adding them as though they were the same
currency, and then arguing about the exchange rate. They are not comparable, and
the reason the numbers keep fighting is that the model is wrong."

**Don Norman.** "Ask what the host does next. A one-day-late trivial task is
finished in a minute. The venue gate is a week of work that unblocks everything
else. Ranking the minute-long task first is defensible ONLY if you think the list
is a queue to drain, and it is not — it is advice about what matters."

**Edward Tufte.** "`Math.min(2, unlocks)` is throwing away your own measurement.
You went to the trouble of counting three dependents and then clipped it to two."

## Event bench (second — override authority)

**Bryan Rafanelli.** "Late and important are different words. A late napkin order
is late. No venue is a different category of problem."

**Mindy Weiss — OVERRIDES, and narrows the fix.** "Do not throw away lateness.
When something has a real date and that date has gone, I need to see it — that is
half my job. But it should not beat the thing the whole plan hangs on. Rank the
gate above the late trifle, and keep the late trifle above everything that is
merely scheduled."

**"Grandmother."** "If one thing has to happen before the others, put it first and
tell me why. Then show me what is late."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Saarinen is right that these are
different evidence, but a single ordered list needs one comparable number, so the
answer is not to split the model — it is to make the ceilings express the
priority we actually want.

Three changes, all small, none a new tier:

  a. **Stop clipping unlocks at 2.** Count what was counted. A gate on three
     things should outscore a gate on two — that is the entire point of having
     measured it.
  b. **Cap the lateness boost BELOW the reach of a real gate**, not above it. It
     may still exceed the consequence of an ordinary scheduled item — which is
     what `decisionSoundness` actually protects — without exceeding a
     multi-dependency gate.
  c. **Re-run `decisionSoundness` unmodified.** Its fixture is a gate-holder
     unlocking TWO. If (a) and (b) are set so a two-unlock gate still loses to a
     6-day-late item, that guard survives untouched and Weiss's ordering holds.

If those three cannot hold simultaneously, the fixtures genuinely disagree and it
comes back here. Do not edit either gate to make it fit."

**The Liability & Trust Reviewer.** "And whatever lands, an item that is late must
still SAY it is late wherever it sits. Demotion is not silence."

---

## RULING

1. **Remove the `Math.min(2, unlocks)` clip.** It discards a measurement the
   engine took deliberately.
2. **Cap `latenessBoost` below a multi-dependency gate's reach**, while leaving it
   above an ordinary scheduled item.
3. **`decisionSoundness` and `criticalBlockerLeads` pass UNMODIFIED.** If they
   cannot, the conflict is real and returns to this board rather than being
   resolved by editing a fixture.
4. **Lateness stays visible.** Rank moves; the label does not.

**Bar for done:** the venue gate (3 dependents) outranks a 20-day-late trivial
item, AND a 6-day-late trivial item still outranks a scheduled two-unlock
gate-holder. Both, measured, with neither existing gate touched.
