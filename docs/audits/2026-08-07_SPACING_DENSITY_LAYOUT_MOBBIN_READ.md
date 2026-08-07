# Spacing, density and layout — where the leaders are and where we are

_Read 2026-08-07. Platform: web. Five leaders on the pattern our guest roster is:
a dense list of people with per-row status and a record detail._

Screens read:
[Dovetail](https://mobbin.com/screens/aac9827e-b12f-4fe5-908a-2efd0acfcc11) ·
[Twenty](https://mobbin.com/screens/806b70c1-22a1-4278-a736-e5abb6d77f43) ·
[Navattic](https://mobbin.com/screens/79a31934-4ca2-4700-86a5-c180fa735404) ·
[Revolut Business](https://mobbin.com/screens/2edfdf44-7d01-44ee-9e45-0535908b1ae3) ·
[Squarespace](https://mobbin.com/screens/0cbf303d-fa3d-48cf-b2f3-470cc1ddf946)

---

## The headline: 5 of 5 put the detail in a RIGHT PANEL. None expands the row.

Every leader read here solves "show me this person's fields" the same way — the list
stays exactly where it is, full height, and the record opens in a persistent right-hand
panel with its own close control. Not one uses an inline accordion.

We use an inline accordion. That is the single biggest structural difference, and it is
the same thing the 2026-08-07 board sitting reached independently from our own pixels
(Tufte: *"the edit surface should be beside the list, not inside it"*; Norman's panel
measured 283px of injected reflow per open).

**Two independent methods, opposite directions, same answer.** That is the strongest
signal in this read, and it retires the Tufte/Saarinen split recorded as unresolved: the
argument was accordion-vs-inline-grid, and the leaders picked neither.

## Row height — we are 1.5x to 3x taller than every leader

| | approx row height |
|---|---|
| Twenty | ~18px |
| Revolut Business | ~32px |
| Dovetail | ~37px |
| **NGW guest roster** | **55px** (measured live, all rows) |

Ours is 55px because it carries a 28px avatar plus 13px of vertical padding. Leaders that
keep an avatar (Revolut, Navattic) run it at ~20px inside a ~32px row. Density is not
achieved by cramming — it is achieved by **not spending vertical space on decoration**.

## What every leader has that we have ZERO of

**A list toolbar.** All five:

- Dovetail — `Sort` `Fields` `Filter`
- Twenty — `Filter` `Sort` `Options`
- Navattic — `Search` `Filter (1)` `Add filter` `Clear`
- Revolut — search, `Filters`, `Settings`, `Invite`
- Squarespace — `Search`

We have none of these on the roster. At 40 guests, scanning IS the operation — which is
what Saarinen's seat said before this read, and 5/5 now confirms it.

**Row selection.** 4 of 5 carry a leading checkbox column for bulk action. We have no way
to act on more than one guest at a time.

**A footer that states the set.** Dovetail `Count 20`; Twenty `Calculate · Unique of
Emails 6 · Empty of Phone 17%`; Navattic `25 rows per page`; Squarespace `10 per page`.
Ours ends the list with nothing.

## Status treatment — ours is the loudest in the set

Revolut renders status as **plain text** (`Active`). Dovetail reserves chips for tags and
puts them in the DETAIL panel, not in rows. Twenty's row chips are small and icon-led.

Ours is a filled tinted pill on every row, and until today it was rendering 258–311px
wide. It is now 96px — but the leaders suggest the honest end state for a resting value
is lighter still: **text, with colour reserved for the exception**. That agrees with our
own `UX_02` colour budget, which we are currently spending on the resting state.

## Where this leaves the 33% dead space at 1920

It reframes it. The board said HOLD the cap because the app cannot use 1440 yet. This
read says the same thing with a mechanism: **the width is not missing a third work lane,
it is missing the detail panel.** Dovetail, Twenty, Navattic and Revolut all spend their
right third on exactly that, permanently. Our "Where you stand" column currently holds a
chip cloud and two static readouts and then ~400px of nothing — the pane exists, it is
just holding the wrong thing.

That also resolves the standing ruling (*"rail + main + on-demand detail: extra width buys
measure and density, NEVER a permanent third pane"*) without breaking it: the third column
becomes ON-DEMAND DETAIL, which the ruling explicitly permits, instead of a permanent
static pane, which it forbids. **The fix and the doctrine want the same thing.**

---

## Sequenced

1. **Move the guest editor into the right column.** Converts the 283px reflow, the 33%
   dead space, and the third-pane violation in one move. Highest value in the read.
2. **Roster toolbar: search/filter first.** 5/5 have it; at 40 guests it is the operation.
3. **Bring the row to ~40px.** Avatar to 20px, padding to --sp-2. Do not cram — remove.
4. **Status to text, colour for the exception only.** Matches UX_02's own budget rule.
5. **A count/summary footer.** Cheapest item here.
6. **Row selection + bulk.** Real, but it is a feature, not a layout fix — sequence last.

Items 1–3 are the ones standing between the host's 7.5 and a 9.

---

## Appendix — item 1 was ATTEMPTED, and what it found (2026-08-07)

Built, driven, and then REVERTED rather than shipped. Recording it because the attempt
produced the one fact the next attempt needs.

**The mechanism works.** `.roster` as a two-column grid, with `display:contents` on the
per-row (`.rrow`) and per-group (`.rgroup`) wrappers so `.grow` and `.gdetail` become grid
items of `.roster` itself, and `.gdetail` pinned `grid-row:1 / span 9999` so it sits at the
TOP of column 2 regardless of which guest is open. Driven at 1728: the editor rendered
beside the list and the list did not reflow. That is a CSS change, not a JSX restructure —
worth knowing, because it is much cheaper than it looks.

**What stopped it: the roster's container is capped at roughly 820px, and nobody knows by
what.** The sheet itself spans ~1300px at 1728, but the grid only had ~820 to divide, so a
340px detail column left column 1 at ~460px — and the `MEAL` / `DIETARY` headers, whose
tracks are sized from `--gt-*`, overflowed underneath the panel. The list was squeezed
instead of the empty canvas being used, which is the exact opposite of the point.

**So the blocking question is not layout, it is: what owns the roster's width?** It is NOT
`:282` (`.escreen ~ *` at 68ch — that is the command surface) and NOT `:3521`
(`max-width:860px`, which is gated to `data-bp` tablet / tablet-land, and widescreen is
`desktop`). Find the real owner by measuring `offsetParent` chain widths in the live DOM
from `.roster` upward — do not grep for it, three candidate rules were eliminated by
reading and all three were wrong.

Once that is known, item 1 is small. Until it is known, item 1 will keep squeezing the
list, and a squeezed list is worse than the accordion it replaces.
