# Board ruling — the closing window

Date: September 23, 2026
Status: **DECIDED. Option 2, with the packet's own objection fixed rather than overridden.**
Authority: the owner (Todd Willis), under the standing delegation recorded in
`HANDOFF.md` and exercised previously for the Stage 7 gate on 2026-09-02.
Packet: `docs/audits/2026-09-19_CLOSING_WINDOW_BOARD_PACKET.md`
Amends the scope of: `docs/audits/2026-08-17_VENDOR_CONSEQUENCE_RULING.md`
Closes the bar set by: `docs/audits/2026-08-17_RANKING_FLOOR_BOARD.md`
Guard: `src/lib/__tests__/theRulingsOwnBarIsUnmet.test.js` — rewritten from
recording the failure to recording this decision, keeping every negative control.

---

## The decision

**Option 2 of the packet: add the closing-window axis.** Option 1 was cheap and
did not meet the bar; option 3 amended the bar away rather than meeting it.

The axis exists because `latenessBoost` pays for being PAST a window and nothing
paid for a window about to close and not reopen — which is the half of the
ruling seat's sentence that was never implemented:

> **Bryan Rafanelli (ruling seat, 2026-08-17).** "A certificate 29 days late is a
> known, chronic problem the host has probably already worked around. A vendor
> reconfirm due tomorrow closes a window that will not reopen. **Rank the closing
> window.**"

## The packet's objection was right, and is answered rather than overruled

The packet's two measurements for whoever took option 2 said the naive predicate
would not hold:

> "The predicate as written is a DATE window, not a closing-window predicate; it
> does not know the difference between 'this cannot be done later' and 'this
> happens to be due soon.'"

It proved it: a trial `c += 5` on `leadDays === 0 && 0 <= dueInDays <= 3` turned
the recording guard's own negative control red, because a synthetic scheduled
gate-holder sits in exactly that date window.

**So the term is paid on a DECLARED `closingWindow`, not an inferred one.** A
raise knows whether its window reopens; the scorer cannot see that from two
dates. This is the same principle the whole September programme has been
applying — the fact is owned by the accessor that knows it, and is declared
rather than re-derived by the consumer beside it.

Measured consequence of the declared form, on the shipping board at T-3:

| row | before | after | why |
|---|---|---|---|
| Reconfirm Ironwood for the day | 0.00 | **5.50** | declares the window |
| Ask Ironwood about insurance (−27d) | 4.90 | 4.90 | untouched |
| Buy day-of emergency kit (due 0, lead 0) | 0.00 | **0.00** | declares nothing |
| synthetic scheduled gate-holder (due 3, lead 0) | 4.00 | **4.00** | declares nothing |

The last two rows are the objection, answered by measurement rather than by
argument.

## What was changed

1. **`CommandCenter.jsx#actionConsequence`** gains `CLOSING_WINDOW_BOOST = 3.5`,
   paid when `closingWindow === true` AND `0 <= dueInDays <= 7`. Outside the
   window it pays nothing; past due, `latenessBoost` takes over, so the two
   never stack.
2. **`surfaceRegistry.js#vendor-reconfirm`** declares `closingWindow: true`,
   `gateHolder: true`, `unlocks: 0`.

No lateness constant moved. That is asserted as its own negative control,
because the entire argument for adding a term rather than retuning was that
every retune broke four ruled guards.

## The sizing, and what it rules on

**3.5 is below the lateness floor of 4.** A closing window that declares nothing
else still loses to a genuinely late item — the ruling's other direction, held
by arithmetic.

**With the reconfirm's own `gateHolder: true, unlocks: 0` it totals 5.50**, which
clears the dead certificate's 4.90 and inverts the re-derived case.

That 5.50 also passes a scheduled multi-dependency gate at 5.0, and the packet
was explicit that taking this option means ruling on it. **The ruling is that it
should.** A venue blocker that is neither late nor closing can wait a day; a
reconfirm window cannot be reopened. A venue blocker that IS late still leads it
comfortably (5.0 + 4.9 = 9.9).

## Scope, deliberately narrow

Only the vendor reconfirm declares a closing window today. Other raises may opt
in, and each one is a judgement about whether its window genuinely does not
reopen — not a date test. Adding the declaration to a raise whose window merely
happens to be soon would reintroduce exactly the failure the packet measured.

## Not in scope, and unchanged

Hiding or demoting the late certificate. Both the Liability & Trust Reviewer and
"Grandmother" ruled on that — "whatever moves down must still be VISIBLE as
late", "if something is late I want to be told it is late, wherever it sits."
The certificate moved from rank 3 to rank 5 and still carries its full lateness;
a negative control asserts it.

## The four ruled guards

All four pass unchanged. They were the reason retuning was refused, and they are
the reason this shape was chosen:

- `both directions, or it is half a fix › a barely-late trivial item still leads a scheduled gate-holder`
- `lateness is bounded BELOW a real gate › but a 6-day-late trifle STILL outranks an ordinary scheduled gate-holder`
- `lateness is bounded BELOW a real gate › the boost ceiling sits in the gap between those two gates`
- `rule 4 — ranked for consequence › genuine lateness still leads`
