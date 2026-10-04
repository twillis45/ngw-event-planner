# Review board - the regional food factor, on shrinking BLS coverage

**Convened 2026-10-04.** Six seats, confirmed by the owner. Scored against the
measured table in `2026-10-04_BLS_COVERAGE_AND_CADENCE.md`, not against
opinion: 35 of 35 series, 7 items x 5 areas, 2025-01 through 2026-08.

Seats: Monica Rogati (data layer) | Edward Tufte (honest presentation) | Don
Norman (does it lie) | "Grandmother" (the canary) | The Next Maintainer
(reads it cold) | Survey-methodology seat (archetype, index construction).

**The state under review.** `factor` is an UNWEIGHTED mean of per-item
region/US price ratios, clamped to 0.8-1.3, computed when at least 3 of 7
basket items resolve. Today: South 7 of 7, West 4 of 7, Northeast 4 of 7,
Midwest 4 of 7. Three of four regions lost items during 2025-2026 and the
trend is downward.

---

## Q1 - Is a floor of 3 of 7 still defensible?

**Ruling: NO, but raising the number alone is the wrong fix.**

The survey-methodology seat put the decisive point: **this is not an index,
it is an arithmetic mean of whatever survived.** BLS's own practice weights
items by expenditure. An unweighted mean over a set that differs by region is
not a weaker version of the same measurement - it is a DIFFERENT measurement
in each region, wearing one name.

Rogati sharpened it with the composition: the items that retired are eggs,
milk and ground beef - volatile, high-spend staples. What survives everywhere
is chicken, potatoes, bananas and (unevenly) bread. So the Northeast factor is
substantially "regional spread on poultry and produce", and it is presented as
the spread on groceries.

The Next Maintainer: 3 was chosen when the basket was 7 and healthy; it reads
as "a bit under half". Nobody has re-derived it since the basket shrank around
it, and the constant carries no comment saying what it is protecting.

Tufte: 1.087 renders identically whether it came from seven items or four.

**The board does not set the number.** Raising the floor to 5 silently
disables three of four regions, which is a product decision about reach, not a
data decision. That goes to the owner as B1.

## Q2 - Should a thin region fall back to the US baseline and say so?

**Ruling: YES on "say so". NO on quietly returning 1.0.**

Unanimous that the current silence is the worst available option: a computed
factor from four aging items is indistinguishable, at the point of use, from
one computed from seven current ones.

But Rogati dissented on the fallback VALUE, and the board adopted it:
**returning 1.0 is itself a claim** - "this region costs the same as the
national average" - and that is probably false for the Northeast. Replacing an
unreliable measurement with a confident wrong one is the same defect moved.

Grandmother decided the shape: she does not want a statistics lesson, and she
does not want a number she cannot trust. She wants to be told, in one line,
that the app is using national prices here because it does not have enough
local data - and then to be left alone.

So: use the national figure as the COMPUTATION, label it as national rather
than regional, and never present it as a measured local spread.

## Q3 - Replace the retired items?

**Ruling: not without versioning the basket, and not before the survey.**

The survey-methodology seat raised what nobody else had: **changing the basket
breaks comparability over time.** A factor computed from one set of items in
April and a different set in October is not two readings of the same quantity.
If this app ever shows a host how their estimate moved, a silent basket change
makes that movement partly an artifact of our own bookkeeping.

Replacement candidates were NOT investigated - we measured the seven we use,
not the APU catalogue. That is research, and it must come before any swap.

---

## Findings, ranked, tagged by who can move them

### (a) code - the builder can do these now

**A1. The factor must carry its own composition wherever it is shown.**
`items_used` already exists in the response and nothing surfaces it.
*Check:* a host-visible string naming the count whenever it is below the full
basket. *Red-proof:* seed a 4-of-7 region and assert the screen says so;
remove the line and watch it fail.

**A2. A region below the floor returns the national figure LABELLED as
national**, never a regional factor. Add a basis field - the vocabulary
already exists elsewhere in this codebase ('read' / 'looked-up' / 'typed' /
'unknown'). *Check:* a thin region returns basis 'national-fallback' and the
factor is not presented as local. *Red-proof:* drop a region below the floor
and assert the label changes, not just the number.

**A3. Version the basket.** Add `basket_version` to the response so two
factors are only comparable within a version. *Check:* a test that fails if
`_BASKET` changes without the version bumping - the same ratchet shape as
`PARSER_FIELDS` and `MAX_HOSTV2_TEXT_GATES`, both of which have already caught
a silent drift in this repo.

**A4. Give the floor a comment that says what it protects**, so the next
person inherits the reasoning rather than the number.

### (b) owner - these need a ruling, not a commit

**B1. What is the floor?** Raising it to 5 turns off three of four regions
today. That trades reach for honesty and only the owner can price that.

**B2. Is a regional factor worth keeping for NE/MW/West at all**, given the
trend is downward and the survivors are produce and poultry? The alternative
is national-only outside the South, stated plainly.

**B3. Weighted index, or capped claims?** Doing this properly means
expenditure weights - real work. The cheap alternative is to keep the
unweighted mean and never let it claim more than it is. The board recommends
the cheap option until someone can say the weighting changes a host decision.

### (c) real hosts - nobody at this table can answer

**C1. Does "based on 4 of 7 staples" reassure or alarm?** Grandmother's
instinct is that naming it builds trust, and she said plainly she is one
person and this is exactly the thing she gets wrong about other people. Needs
a real host, not a seat.

---

## What the board explicitly did NOT find

The month labels are now CORRECT. The Northeast reporting 2026-04 is not a
bug - bread genuinely last published there in April, and the figure contains
it. That was yesterday's fix working. The finding here is about composition,
not currency.

Nothing in this sitting changed any code.
