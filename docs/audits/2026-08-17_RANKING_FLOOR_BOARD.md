# Review Board — the Ranking floor (3/10), and what outranks what

Date: August 17, 2026
Dimension: **Ranking** — leader: Linear triage / Superhuman. Last score **3/10** (W8,
2026-07-15), the lowest on the board and therefore the cap on the whole scoreboard.

House rule applied: inherited findings are not evidence. The pathology below was
RE-DERIVED today against the running engine, not carried forward.

---

## The defect, stated precisely

`CommandCenter.jsx:1693` — `_rankOverdue` is a **boolean**: `dueInDays < 0`.

`CommandCenter.jsx:1708` puts that boolean **above** consequence:

```js
const oa = _rankOverdue(a), ob = _rankOverdue(b);
if (oa !== ob) return oa ? -1 : 1;            // ANY late beats ANY not-late
if (oa && ob && a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
const ca = actionConsequence(a), cb = actionConsequence(b);   // only reached if both same lateness class
```

So a binary "is it late" outranks "how much does it matter". Re-derived 2026-08-17:

| Rank | Item | dueInDays | consequence |
|---|---|---|---|
| 1 | COI from caterer | −29 | **0.4** |
| 2 | Pay balance | −1 | 2.0 |
| 3 | Reconfirm 3 vendors (gate-holder, unlocks 3, score 300) | +1 | **7.0** |

The engine scored the reconfirm **17× more consequential** and the comparator threw
that away because the COI was late. This is the shipping path: hostv2 → `eventPlan`
→ `nextActions`, sorted at `CommandCenter.jsx:2300`.

---

## Design bench (first)

**Karri Saarinen (Linear triage — the named leader).** "Linear does not rank by
age. Priority leads and date breaks ties, because a stale issue is evidence that
nobody thinks it is urgent, not evidence that it is. What you have is an ordering
where the least-actioned item is guaranteed the top slot forever. That is not
triage, it is a monument."

**Don Norman.** "The harm is not the ordering, it is the LEARNED IGNORING. The
host opens the app, sees the same dead row at #1 today, tomorrow, and in three
weeks, and stops reading position one. You then have no top action at all — you
have a decoration that happens to sit where the top action used to be."

**Edward Tufte.** "You compute a real number — consequence — and then discard it
behind a boolean. Rank on the measurement you already trust."

**Julie Zhuo.** "Do not solve it by hiding old items. A 29-day COI may be the
single most dangerous thing in the plan. Solve it by letting importance compete."

## Event bench (second — override authority)

**Bryan Rafanelli (run-of-show).** "Both matter, and the late one is not always
the bigger fire. A certificate 29 days late is a known, chronic problem the host
has probably already worked around. A vendor reconfirm due tomorrow closes a
window that will not reopen. Rank the closing window."

**Mindy Weiss — OVERRIDES on the direction.** "If the top of my screen is the
same thing every morning, the top of my screen is wallpaper. But do not bury the
old one either — the day it actually bites me I will want to know it was there.
Move it down; do not hide it."

**"Grandmother."** "If something is late I want to be told it is late, wherever it
sits. Not by it being first — by it saying so."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Do not reorder the clauses; that
just moves the pathology. Consequence-first would let a merely-scheduled item
bury a genuinely late critical one — the mirror-image bug, and you would be back
here in a month.

Make lateness a BOUNDED BOOST to the score you already compute, not a precedence
tier. Late is a strong signal, so the boost is large; it is bounded so staleness
cannot win forever. Then:

  dead COI          0.4 + boost  →  loses to a 7.0 due tomorrow      (fixed)
  late CRITICAL     6.0 + boost  →  still beats a 7.0 scheduled item (preserved)

Both directions hold with one number and no new tiers. And keep the runway
tiebreak — it is doing real work underneath."

**The Liability & Trust Reviewer.** "Whatever moves down must still be VISIBLE as
late. Demotion in rank is not permission to drop the overdue signal."

---

## RULING

**Lateness becomes a bounded boost to consequence, not an absolute precedence.**

1. **Rank on `actionConsequence` + a lateness boost.** The boost is large enough
   that a late item of equal consequence always leads, and bounded so that age
   alone cannot hold position one indefinitely.
2. **Bound it by how late, with a cap.** More-late is more urgent up to a point;
   past that point additional staleness buys nothing. A 29-day item and a 60-day
   item are the same kind of problem.
3. **Keep the runway tiebreak.** Soonest-first among equals, nulls last —
   unchanged, it is sound.
4. **Do not hide anything.** Rafanelli and Grandmother both: a demoted late item
   still renders its lateness. Rank moved, signal untouched.
5. **Bar for done:** the re-derived case inverts (reconfirm above the dead COI),
   AND a late critical item still outranks a scheduled one of higher raw
   consequence. Both directions, or the fix is half a fix.

**Dissent:** none on direction. Zhuo pressed that a chronically-late critical item
deserves an escalation of its own — a different treatment, not a ranking tweak —
and the board recorded that as future work rather than gating this on it.
