# Review Board — portrait centring vs the heroVoid gate

Date: August 17, 2026 (19:2x)
Occasion: the host asked for "portraits float the hero on command in center."
Implementing it turned `heroVoid.spec.mjs` red. Two host statements, one gate,
and a changed condition between them.

---

## The conflict, stated fairly

**The gate (`heroVoid.spec.mjs`)** encodes an earlier host-reported defect: the
headline "stranded ~230px of dead space above" at 768x1024. It asserts the
distance from the top of the ask screen to the headline stays **<= 200px**. Its
own measurements: top-aligned = 94px healthy, centred = 363px defect.

**The host, today:** "portraits are supposed to float the hero on command in
center." Centring measures **345px** — inside the range the gate calls the bug.

Both statements come from the same person. Neither is wrong. What changed is
underneath them.

## What changed — measured, not argued

When that gate was written, `.escreen` was **collapsing to its content**: the
unguarded rail rule zeroed its min-height below 1280 (fixed today, `567dab47`).
The ask sat in a 646px box inside a 1024px screen, so "centred" meant *pushed
down inside a short box while the next section rode up beside it*. The original
defect had TWO symptoms, and the second one is now independently fixed:

| symptom | then | now |
|---|---|---|
| dead space above the headline | ~230px | 345px (centred, deliberate) |
| below-fold section intruding | **whole card in first screen** | **0px peek**, handle at 95-96% |

## The measurement that decides it

Headline position as a proportion of the ask area it sits in:

| surface | headline from top | ask area | proportion | gate's view |
|---|---|---|---|---|
| phone 430x860 | 247px | 788px | **31%** | exempt — never called stranded |
| tablet 768x1024 | 345px | 952px | **36%** | **fails, >200px** |
| iPad 1024x1366 | 502px | 1294px | **39%** | not covered |

**The phone the gate calls healthy has a 247px gap.** The bound is not a
universal void threshold — it is a tablet-only absolute written against a
collapsed box. Centring puts tablet within five points of the phone the product
already ships.

---

## Design bench (first)

**Edward Tufte.** "You are comparing an absolute to a proportion. 345 of 952 and
247 of 788 are the same composition; 345 of 646 was not. The number did not
change meaning — the denominator did, and the gate never had one."

**Karri Saarinen.** "The gate pinned a DISTANCE because the comment claimed a
distance. That was right at the time. It is now measuring the wrong noun: the
question is not how far down the headline starts, it is whether anything is
holding it down."

**Don Norman.** "The host complained about a hole. A hole is space with nothing
on the other side of it. Centred space has content below it — that is why the
phone version has never drawn a complaint at 247px."

**Julie Zhuo.** "Careful. 'The condition changed' is the most seductive reason to
retire a guard, and it is right about half the time. Whatever replaces it has to
fail on the ORIGINAL defect, or you have just deleted the gate."

## Event bench (second — override authority)

**Bryan Rafanelli.** "On a tablet I am showing this to someone across a table.
The one thing I want them to read should sit where the eye lands, which is not
jammed under the top edge."

**Mindy Weiss — OVERRIDES on scope.** "The host told you what they want twice,
and both times they were describing the same thing: the ask should look placed,
not dumped. Top-aligned in a full-height screen looks dumped. Do not re-litigate
the earlier complaint — it was about a hole with nothing under it, and you fixed
that separately today."

**"Grandmother."** "If the important thing is in the middle, that is fine. If it
is halfway down with nothing underneath, that is odd."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Zhuo's caveat is the whole job. The
replacement must be red on the original defect and green on centring, and I will
not accept a change that cannot show both.

The discriminator is available and cheap: **the ask area's own height**. Stranding
was a large gap inside a SHORT box (345 of 646 = 53%); centring is a proportional
gap inside a FULL box (345 of 952 = 36%). A proportional bound separates them; the
absolute one cannot, because it never knew the denominator.

Set the bound at 45%. Phone measures 31%, tablet 36%, iPad 39% — all clear with
room. The reverted-collapse case measures 53% — red with room. That is a real
gap on both sides, not a threshold tuned to today's pixels."

**The Liability & Trust Reviewer.** "And the file keeps its history. The comment
that records the original defect stays, with the new denominator explained
underneath it. A future reader must be able to see that this gate was retargeted,
not weakened."

---

## RULING

1. **Centring stands.** It is what the host asked for and it matches the phone
   composition the product already ships.
2. **The gate is RETARGETED, not deleted or loosened** — from an absolute
   distance to the headline's position as a **proportion of the ask area**,
   bound at **45%**.
3. **It must be red-proofed against the ORIGINAL defect**, not just against a
   number: restore the collapsed escreen and the gate must fail. If it cannot
   fail that way, the retarget is a deletion and comes back here.
4. **The original comment stays in the file**, with the change of denominator
   explained beneath it.
5. **Landscape is untouched** — it keeps flex-start; a 768px-tall stage has no
   height to give.

**Bar for done:** phone / tablet / iPad-13 all green at their measured 31-39%,
AND reverting the escreen collapse turns the gate red.
