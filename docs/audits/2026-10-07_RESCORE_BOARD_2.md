# Re-score board, second sitting

Date: October 7, 2026
Commit scored: `a158f613` (benches A, B, C), with `2218a203` verified by bench C
mid-sitting after the tree moved under it.
Benches seated: 3 of 5. Benches D and E were never dispatched.

Doctrine applied: the builder never scores its own work; no claim is credited
that a bench did not open; every (a) item names its machine check and the fault
that turns that check red.

## 1. Claims the board rejected or narrowed

These are corrections to statements I made in commit messages. Each was opened
by a bench and then re-verified independently before being recorded here.

### REJECTED: "the real CTA is above the fold with the keyboard up"

The most serious of the three, because the claim was inferred from an edit
rather than measured on a screen, and it was false in the opposite direction.

| build | submit bottom at 390x844 | vs the 508px keyboard-up fold |
|---|---|---|
| before the mic was demoted | 576px | 68px below |
| after | 618px | 110px below |

Benches A and C measured this separately and agreed. The mic sat BESIDE the
field (`.create-inputrow` is `align-items:stretch`, and the control took the
field's own radius), so deleting it freed zero vertical space, while the
replacement link line added `marginTop 8 + paddingBlock 8x2 + an 18px line` =
exactly 42px. I made the defect 42px worse and reported it fixed.

The diagnosis had been correct and was already written down. The comment above
the input in `HostShellV2.jsx` says the submit "sits below the keyboard-reduced
fold at 390px". The remedy routed around that with a hidden Enter path instead
of moving the control, and the commit message then described the control as
moved.

### REJECTED: "hoisted the map to module scope"

Nothing was hoisted. The original in-render `areaLabel` was still in place and
what I had added was a SECOND map; the built bundle carried "Where it happens"
twice. The two agreed on every shared key, which is why nothing looked wrong,
but the in-render copy had 15 keys against the module map's 18 - so `lodging`,
`budget` and `moment` fell through the capitalize fallback and rendered as
"Lodging" / "Budget" / "Moment" on the chip row. Raw engine ids as host copy:
the exact defect C3 was written to remove, still shipping one screen from the
fix.

### REJECTED: the money row "reconciles there"

The row prints `~$835` beside `= $17-$39 a head x 30 guests`. $835 is the
MIDPOINT of 510-1170, not an endpoint. The band brackets the printed figure; it
does not multiply to it. A host multiplying there lands on neither number. The
decision not to widen the field survives - widening would break the bracket
too - but the stated reason was false, and the row carries the same defect C2
was fixed for, cited in the fix's own comment as the reason not to fix it.

### NARROWED: the "Typical" rename covered four sites

Three hero sites were renamed. Two were missed:

- `LABELS_C` in the create-flow budget tier rows still read `Typical`, so the
  same band read "Mid-range" on one screen and "Typical" on the next.
- The WHERE YOU STAND slot read "mid-range for an event this size", which
  implies a distribution OF EVENTS and places the host inside it - the very
  claim the hero one surface over explicitly disclaims ("not an average of real
  events and not a quote").

### NARROWED: "a sweep over every labelled button"

The Label-in-Name sweep iterates `button[aria-label]` only, and the control it
was written for no longer HAS an `aria-label` - so the original site now sits
outside its own gate. It misses `aria-labelledby` and `[role=button]`. It is a
real gate for the class it covers; it is not "every labelled button".

### REJECTED as a green claim: C5 shipped red

`a158f613` committed a test it had never run. The guest-stepper BOTH-axes gate
failed on the tree as committed - `{cls:"chip", label:"12", w:41, h:46}` -
because the ruling was applied to `.mini` and the guest quick-picks are chips.
The commit message read "artifact gate green". Closed by `2218a203`.

## 2. Settled in the builder's favor

Bench C stopped inferring and served a three-field probe to real iOS Safari on
an iPhone 17 Pro simulator: a `type=number` input with `appearance:auto` forced
as a CONTROL paints no stepper either. iOS Safari does not render a spinner on
number inputs at all, so there was never anything for C4's rule to suppress or
to break. The refusal to claim the platform was correct, and the claim can now
be widened.

Also upheld and red-proofed by a bench rather than by me: Enter submitting
under the button's own two conditions (deleting the handler in a rebuilt copy
turns it red); WCAG 2.5.3 on the voice control; the exclusions fold, measured
at 136px in a 433px column before and 40px closed in a 354px column after -
a 70.6% reduction carrying eight exclusions where the run-on carried three.

## 3. Scores

| Seat | First audit | Re-score 1 | Re-score 2 |
|---|---|---|---|
| Ramit Sethi | 6 | 7 | 8 |
| Susan Kare | 6 | 6 | 7 |
| Edward Tufte | 4 | 6 | 7 |
| Monica Rogati | 4 | 7 | 7 |
| Luke Wroblewski | 3 | 3 | 6 |
| Don Norman | 3 | 5 | 6 |
| Michal Kowalski | 5 | 5 | 6 |
| Dieter Rams | 4 | 3 | 5 |
| The Next Maintainer | 4 | 4 | 4 |
| The Market Realist | 3 | 3 | 3 |

Nothing is at 9. Two seats did not move, and both said why in terms that name
the work rather than the taste.

## 4. The two seats that did not move

**The Next Maintainer, 4.** The commit messages are the strongest artifact in
the set - they name the failed first attempts, the gates the builder admits
were useless, the platform limits, the rejected remedies. That is cancelled
exactly by one fact: HEAD could not pass its own suite. Seven references to a
control the commit deleted survived in five committed specs, and the repair
existed only in an uncommitted working tree. At 2am that maintainer greps the
name, finds seven hits against a control that does not exist, and cannot tell a
deletion from a regression.

**The Market Realist, 3, third sitting.** This seat's refusal is structural and
it measured the thing that makes it so. `budget.perHeadByFamily` - the record
behind every figure in this review - states that four of its five families have
zero dated per-head figures, and names `travel_led` as "the worst of the five -
it is unsourced AND it is the band the destination blend raises other types
toward". Santa Fe is a destination birthday. Its $13,200 is reached by blending
toward exactly that row.

So the single most load-bearing number in the product, on the screen where one
tap commits, has no external basis at all. Every item in these commits improves
how truthfully the product DESCRIBES that number. None changes where it comes
from. Meanwhile `belowLodgingFloor` computes the contradiction between a
vendor's published price and our invented one, is asserted seven times in test,
and tells the host nothing.

Two things would move the seat and nothing short of them will: ground the band
to its own `sufficientWhen` bar, or wire `belowLodgingFloor` to a surface. The
second needs no research and no new number - only a field that already exists,
read and said out loud.

## 5. Owner rulings the board asked for

1. `travel_led` - single-day or multi-day scope. Unanswerable from the repo:
   the band has zero sources.
2. `location` - "Place" (`eventOrientation.js`) or "Where it happens"
   (`AREA_LABELS`). Two modules, one id, different words. No engineer can pick.
3. "our pick" on the Change picker - keep it and accept that it asserts a
   recommendation with no basis, or drop it.
4. `belowLodgingFloor` - ship the contradiction to the host, or delete the field
   and its seven assertions. Today is the worst of both: carrying cost, no value.
5. The two secondary doors on the creation screen are now 16px and 14px, same
   color, 50px apart. The 16px is an owner ruling ("slightly bigger") and was
   kept deliberately rather than equalised; the mismatch is open.
6. The CRA deletion date, which is what blocks retiring `presentationLabels.js`.
7. Which of the two shard remedies to keep - a fourth shard AND a 40-minute
   ceiling both landed for the same timeout.

## 6. What no bench could verify

- The full matrix. Bench B ran 14 targeted jest tests; bench C ran six specs on
  one project. A green subset is not a green suite, and all three said so.
- Any physical iOS handset. Bench C's spinner result is a simulator.
- Whether iOS shrinks the layout viewport or overlays the keyboard. The 42px
  delta between builds is unaffected either way; the absolute "110px below" is
  not, and on a device the honest number comes from `visualViewport.height`.
- Whether any host opens the exclusions fold. If the open rate is near zero the
  fold traded burial for invisibility and the honesty is nominal.
