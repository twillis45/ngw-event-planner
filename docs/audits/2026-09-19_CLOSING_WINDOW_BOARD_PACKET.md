# Board packet — the closing window, and why the Ranking floor ruling is half-landed

Date: September 19, 2026
Status: **PACKET — no decision taken, no constant moved.**
Relates to: `docs/audits/2026-08-17_RANKING_FLOOR_BOARD.md` (the Ranking floor,
3/10) and `docs/audits/2026-08-17_VENDOR_CONSEQUENCE_RULING.md` (its sibling,
same board, same day).

Standing guard for everything below: `src/lib/__tests__/theRulingsOwnBarIsUnmet.test.js`
records these numbers as facts and fails if any of them moves.

---

## 1. The bar the board set, and which half landed

The Ranking floor ruling closed with:

> **Bar for done:** the re-derived case inverts (reconfirm above the dead COI),
> AND a late critical item still outranks a scheduled one of higher raw
> consequence. **Both directions, or the fix is half a fix.**

**The second direction holds.** The first does not.

Measured on a wedding three days out, vendors booked, on the shipping board:

| rank | row | consequence | lateness | total | dueInDays |
|---|---|---|---|---|---|
| 1 | Resolve 9 decisions — past their window | 10.14 | 4.90 | **15.04** | −362 |
| 2 | 4 key vendors are still not booked | 2.00 | 4.90 | **6.90** | −297 |
| 3 | **Ask Ironwood about insurance.** | 0.00 | 4.90 | **4.90** | **−27** |
| 4 | Ask Fired Up about insurance. | 0.00 | 4.90 | 4.90 | −27 |
| 5 | Buy day-of emergency kit | 0.00 | 0.00 | 0.00 | 0 |
| 6 | **Reconfirm Ironwood for the day** | 0.00 | 0.00 | **0.00** | **+3** |
| 7 | Reconfirm Fired Up for the day | 0.00 | 0.00 | 0.00 | +3 |

Rows 3 and 6 are the board's own re-derived case — a dead certificate against a
vendor reconfirm whose window closes. It did not invert.

## 2. Why it did not

The ruling's arithmetic assumed the reconfirm carried **7.0** ("gate-holder,
unlocks 3, score 300"). The shipping raise does not produce that row.

`surfaceRegistry.js#vendor-reconfirm` emits `severity`, `title`, `why`, `route`,
`key`, `dueInDays: 3`, `leadDays: 0` — and **no consequence signal of any kind**.
So `actionConsequence` returns 0.00, and `latenessBoost` returns 0 because the
row is not late. **It scores zero on both axes.**

The fix was calibrated against a row the corpus does not produce. That is the
same defect class this repo has been finding all week — a premise nobody
re-checked because the verdict on top of it was right.

## 3. It cannot be reached by retuning — measured, candidate by candidate

| candidate | reconfirm becomes | vs the COI | ruled guards broken |
|---|---|---|---|
| **A** — `gateHolder: true, unlocks: 0` on the reconfirm raise | 2.00 | loses to 4.90 | none |
| **B** — drop `latenessBoost`'s floor 4 → 2.5 | 0.00 | — | **4** |
| **B** — floor → 1.5 | 0.00 | — | **4** |
| **A + B** at floor 1.5 | 2.00 | loses to 2.40 | **4** |
| **A + B** at floor 1.0 | 2.00 | **inverts** (1.90) | **4** |

The four guards are the same four at every floor, and **every one of them is the
ruling's other direction**:

- `both directions, or it is half a fix › a barely-late trivial item still leads a scheduled gate-holder`
- `lateness is bounded BELOW a real gate › but a 6-day-late trifle STILL outranks an ordinary scheduled gate-holder`
- `lateness is bounded BELOW a real gate › the boost ceiling sits in the gap between those two gates`
- `rule 4 — ranked for consequence › genuine lateness still leads`

**So the two directions cannot both hold under the current model.** Buying the
first costs the second. This is not a tuning problem.

## 4. The missing term the board already named

`latenessBoost` pays for being **past** a window. Nothing in the scoreboard pays
for a window that is **about to close and will not reopen** — which is precisely
the sentence that decided the ruling's direction:

> **Bryan Rafanelli (ruling seat).** "A certificate 29 days late is a known,
> chronic problem the host has probably already worked around. A vendor reconfirm
> due tomorrow closes a window that will not reopen. **Rank the closing window.**"

The lateness half of that sentence was implemented. The closing-window half was
not. A reconfirm at `dueInDays: +3, leadDays: 0` is the canonical instance and it
earns nothing.

## 5. Why nothing was changed in this pass

The obvious precedent is the sibling ruling from the same board and the same day:
`2026-08-17_VENDOR_CONSEQUENCE_RULING.md` let the unbooked-vendor raise declare
`gateHolder: true, unlocks: 0` on the reasoning that "the plan cannot proceed as
written" and that `unlocks` would be a lie because a missing caterer frees
nothing. The reconfirm is the same shape.

But **rule 3 of that ruling bounds it**: "Bounded to `required: true`, past
`when`, genuinely unmatched." A reconfirm vendor is **booked**, and its window is
the 0–3 day reconfirm window, not an authored `when`. Extending a ruling's scope
is the board's to do.

## 6. What the board is being asked

One decision, three shapes, in increasing order of how much they change:

1. **Extend the vendor-consequence ruling's scope** to a closing window, so the
   reconfirm declares `gateHolder: true, unlocks: 0`. Costs nothing in guards;
   moves the reconfirm 0.00 → 2.00 and above the other day-of rows. **Does not
   meet the Ranking floor bar** — the dead COI still leads.
2. **Add a closing-window term** to `actionConsequence`, bounded the way
   `latenessBoost` is, for a row with `leadDays === 0` and a small non-negative
   `dueInDays`. This is the axis Rafanelli named. Sizing it is the decision; any
   size that meets the bar has to clear 4.90, which is above an ordinary
   gate-holder (4.0) and at the multi-dependency gate (5.0) — so the board would
   also be ruling on whether a closing window outranks a venue blocker.
3. **Accept that the bar is half-met** and amend the 2026-08-17 ruling to say so,
   rather than leaving a closed ruling whose own bar the shipping path fails.

Option 3 is a real answer and costs nothing but honesty. Option 1 is cheap and
partial. Option 2 is the one that matches what the event bench actually said, and
is the only one that meets the bar as written.

### Two measurements for whoever takes option 2

**The predicate is narrow on the real corpus.** Sweeping the shipping board at
T-3 for `leadDays === 0 && 0 <= dueInDays <= 3` returns **exactly one row** — the
reconfirm. So the term does not quietly lift a crowd of day-of chores.

**But it is not self-limiting.** A trial implementation (`c += 5` on that
predicate) turned the recording guard's own negative control red: a synthetic
gate-holder at `dueInDays: 3, leadDays: 0, gateHolder: true, unlocks: 2` sits in
the same window and would score 9.00, overtaking a genuinely late item. Whether
that is correct is itself a ruling — a gate-holder whose window closes in three
days is arguably exactly what should lead — but it must be decided, not
discovered. The predicate as written is a DATE window, not a closing-window
predicate; it does not know the difference between "this cannot be done later"
and "this happens to be due soon."

`theRulingsOwnBarIsUnmet.test.js` fails on any such implementation, by design:
whoever adds the axis is forced through this packet rather than past it.

**Not in scope of any option:** hiding or demoting the late certificate. Both the
Liability & Trust Reviewer and "Grandmother" ruled on that — "whatever moves down
must still be VISIBLE as late", "if something is late I want to be told it is
late, wherever it sits."
