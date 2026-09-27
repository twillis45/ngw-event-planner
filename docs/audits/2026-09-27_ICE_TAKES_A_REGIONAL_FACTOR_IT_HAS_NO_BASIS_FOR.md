# A national-band item is being priced regionally

**Found 2026-09-27 by the full e2e matrix. Live on `origin/main`. NOT FIXED —
this needs a ruling, because the fix is in the pricing engine.**

## What fails

`e2e/aRateIsNotFree.spec.mjs`, two tests x seven viewports = 14 failures:

    Expected value: "$0.20-$0.40/lb"
    Received array: [... "$0.20-$0.39/lb" ...]

Ice is on the screen. It is not $0 (the defect that spec was written for). It
is one cent light at the top of the band.

## The mechanism, measured

`applyGeo([0.20, 0.40], 'ice', 'MD')` returns, unchanged:

    range  [0.2, 0.4]
    factor 1
    national true
    basis  'No BLS regional series for "ice" - this is the national band,
            not a south price.'

The corpus is explicit: **ice has no regional series, so it keeps the national
band.** The screen nevertheless shows $0.20-$0.39.

The other rates on the same sheet fit a single factor of 0.98 - $2.00 renders
$1.96, $1.00 renders $0.98, $0.50 renders $0.49. Ice's top does the same
(0.40 x 0.98 = 0.392, displayed $0.39) while its bottom rounds back to $0.20,
which is why only one end moved and why it reads as a rounding wobble rather
than what it is.

So a basket-mean regional factor is reaching an item that `geoCostIndex` has
already said must not take one.

## Why it appeared today

`f558376c` "The sheet asked for a state it then ignored" (2026-09-27 01:54,
**pushed**) made the state actually apply. Bisected: the specs pass at its
parent `2c813b00` and fail at it. Nothing about ice changed - the regional
path simply started running, and it runs over the per-item national flag.

The same commit exposed a second latent fault, which IS fixed: the corpus
price vintage was being suppressed whenever a regional `priceContext` existed,
so every regional plan lost its "est. prices <month>" stamp and kept only the
BLS index month. Two different claims, one of them silently substituted for
the other. See the handoff entry.

## Why this is not a stale spec

The tempting fix is to update the literal to $0.39 and move on. That would
write the defect into the gate. The spec's own title is "ICE IS TWENTY CENTS A
POUND, and the sheet now says so" - it exists because the row once read
"$0-$0/lb" and told a host the ice was free. A price that claims a regional
basis it does not have is the same class of untruth, one cent instead of
twenty.

## The ruling needed

Should an item flagged `national: true` be exempt from the basket-mean factor?

- **Exempt it** - the per-item flag means what it says, and a national band
  stays national. Restores the spec. Blast radius: every `national: true` item
  on every regionally-adjusted plan changes price slightly.
- **Keep scaling it** - argue the basket mean is a better estimate than the
  raw national band even for items with no series of their own. Then
  `geoAdjust`'s basis string is wrong and must stop saying "this is the
  national band", and the spec is updated to match with that reasoning
  recorded.

Either way something has to change: today the code and the basis string
contradict each other, and a host can read only the string.

---

# THE BOARD, 2026-09-27 — and the question changed twice before it sat

**Seats (confirmed by owner):** Don Norman; Monica Rogati; James Bach / Michael
Bolton; The Next Maintainer (mandatory, build); "Grandmother" (mandatory,
player); Mindy Weiss (practitioner override); a Maryland crab-house operator
(regional, added by the owner); The Price-Index Methodologist (archetype, not a
real person - no credential is claimed for this seat).

**Recorded against the process:** this board was proposed on a premise that did
not survive measurement, stood down, and then re-convened when a second
measurement revived it in a different form. The author took all measurements;
no seat re-ran them.

## What is actually true, measured

| Fact | Instrument |
|---|---|
| Ice has no BLS series; `geoAdjust` returns factor 1, `national: true` | the repo's own `applyGeo` |
| The plan engine imputes it the region's basket mean instead (~0.98) | `factorFor` in `playbooks/index.js:4383` |
| That produces $0.20-$0.39 against an authored $0.20-$0.40 | rendered rates array, driven |
| An honest per-line sentence EXISTS for exactly this case | `priceLayers.js:291` |
| It is rendered NOWHERE - the shell draws the layer only when it is 'store' | `HostShellV2.jsx:20106`, and a driven probe: `saysRegionalAverage: false` |
| The only regional claim a host sees is one global line | driven: "Adjusted for the South - BLS Aug 2026 - est. prices Aug 2026" |

**So the engine is honest, the unit suite is satisfied, and the screen is not.**
`threeLayersOfPrice.test.js:160` asserts that sentence and passes. Nobody can
read it.

## RULING - option A: render the disclosure. Not B.

Unanimous on A over C. **B carries real dissent, preserved below.**

**Bach/Bolton, and this is the finding of the sitting:** a green test on a
string no surface renders is a check that cannot fail on the thing that
matters. The composition was tested; the DELIVERY never was. Note also the
trap in the obvious fix - editing the spec's literal to $0.39 would encode
today's behaviour as intent. Acceptable only if the replacement also pins the
disclosure, which nothing currently does.

**The Price-Index Methodologist:** imputing an unpriced item from a related
basket is ordinary practice in official statistics - it is roughly how CPI
handles items it does not price directly. **So B is not the more accurate
answer, it is a different estimator**, and the board should not adopt it on
accuracy grounds. What official practice does NOT permit is publishing an
imputed figure under a label that implies direct measurement. That is precisely
the defect: not the 0.98, the unlabelled 0.98.

**Norman:** a single global signifier over heterogeneous provenance is the lie.
Two lines on the same sheet got two different qualities of answer and wear the
same badge.

**Rogati:** nothing needs to be authored. The data layer already carries
`scope`. The UI throws it away. Surface what exists.

**Grandmother:** "Adjusted for the South" over a number means, to her, that
someone found out what ice costs in the South. She cannot tell 2% from 200%,
and she should not have to.

**Mindy Weiss (override):** a planner quoting $0.39/lb and asked "why 39
cents?" has no answer. False precision costs credibility that a round number
with a stated basis keeps.

**The Next Maintainer:** two modules hold two policies for an unmapped item -
`geoAdjust` refuses to scale, `factorFor` imputes and labels. Neither file says
which is authoritative. That is unresolvable at 2am, and it is how this
morning's fault happened.

### DISSENT, preserved per the standing amendment

**The Maryland crab-house operator dissents and argues for B.** A 2% southern
basket factor on ice is noise against real local variation - the same bag runs
$1.50 to $3.00 across two Baltimore blocks. He would drop the regional claim on
ice entirely rather than explain it, on the grounds that an explanation of a
meaningless adjustment is still clutter. **The Methodologist's reply, which did
not persuade him:** dropping it makes the number no truer, only less labelled.

**He also raised a finding nobody else saw, and it may outrank the ruling:**
nobody buys ice by the pound. It is sold in 7lb and 20lb bags. A per-pound rate
for ice is a unit a host cannot shop with, and this repo already owns a
buyable-unit guardrail (`normalizeBuyable`) that is evidently not reaching this
line. **This is exactly why the regional seat was added.**

## Findings, ranked, tagged

| # | Finding | Tag | Check |
|---|---|---|---|
| 1 | The per-line regional disclosure is composed, unit-tested, and never rendered | **(a) code** | e2e asserts a basket-scoped line shows "no published price for this line itself"; red-proof by restoring the `L.layer !== 'store'` early return |
| 2 | Ice is priced per pound; it is sold in bags | **(a) code**, needs confirming | assert no rate renders `/lb` for a bagged commodity; red-proof by reverting the normalisation |
| 3 | `aRateIsNotFree` asserts the national band on a regional plan | **(a) code** | update to the adjusted band AND the disclosure; red-proof both |
| 4 | Two modules, two policies for an unmapped item, neither authoritative | **(a) code** | one exported policy, both call sites read it |
| 5 | Does a per-line disclosure earn its density on a 390px sheet? | **(b) owner** | taste call; Rams tension is real |
| 6 | Would a host rather see a rounded national band than a precise imputed one? | **(c) players** | nobody at this table can award it |

**Not ruled:** whether to adopt B anyway on simplicity grounds. That is the
owner's, and the operator's dissent is the argument for it.

---

# CORRECTION, same day — finding #4 is WITHDRAWN

**It was mine, and it was wrong.** The board recorded that `geoCostIndex.geoAdjust`
and `playbooks.factorFor` hold two different policies for an unmapped item with
nothing saying which is authoritative, and the Next Maintainer seat called it
unresolvable at 2am.

Measured afterwards: `geoItemForPurchase` returns **null** for ice. The
allowlist is eleven entries - beer, wine, bread. `priceLayers` only calls
`applyGeo` when that lookup yields a key, so **ice never reaches the index at
all**, and only `factorFor` ever prices the line.

The "no BLS regional series for ice - this is the national band" string that
the whole two-policy story rested on came from a probe calling
`geoAdjust('ice', 'MD')` **directly, with a string that is not a key in the
map**. Production never makes that call. The modules do not disagree; they
operate on disjoint inputs by construction.

**This is the fourth claim this session built by measuring an adjacent
mechanism** - after a matrix "slowdown" that did not exist, a "1.96 multiplier"
that was 2.00 x 0.98, and a geo scaling that turned out to be factor 1. The
pattern is consistent enough to name: reaching for the nearest function that
sounds like the one in question, and reading its answer as the system's.

**What replaced it.** The disjointness was a real invariant that nothing wrote
down, so it is now a gate:
`src/lib/knowledge/__tests__/unmappedLinesNeverReachTheIndex.test.js`. It walks
every priced line in every playbook and asserts that any key the map yields is
one the index can answer without disclaiming. Red-proofed by adding ice to the
allowlist against a key with no series - 2 of 3 fail, which is precisely the
defect the withdrawn finding imagined. If anyone ever makes it real, it is
caught.

**Finding #1 is unaffected.** That one was verified by driving the surface, not
by probing a function: the disclosure was genuinely absent from the screen and
is now rendered.

## Queue status after this correction

| # | Finding | State |
|---|---|---|
| 1 | Per-line regional disclosure never rendered | **FIXED + gated + red-proofed** |
| 2 | Ice priced per pound; sold in bags | **OPEN - blocked on a grounded bag size, see below** |
| 3 | `aRateIsNotFree` asserted a national band on a regional plan | **FIXED** - literals replaced by the rules they stood for |
| 4 | Two modules, two policies | **WITHDRAWN** - never true; invariant gated instead |
| 5 | Does the disclosure earn its density? | **RULED by owner** - approved, then built small (two words per row, sentence once) |
| 6 | Rounded national band vs precise imputed one | still (c) - only real hosts can award it |

## Why #2 is not being built

The regional seat is right that nobody buys 46 pounds of ice; it is sold in
bags. Implementing it means choosing a bag size, and **that is authoring data,
not fixing code**. Common retail sizes are 7lb, 10lb, 16lb and 20lb, and which
one a host meets depends on the store - picking one to make the arithmetic
tidy would fabricate a fact, which is the thing this corpus most consistently
refuses to do.

`normalizeBuyable` also does NOT cover it by oversight: it fires only on the
banned `slice` unit, and its comment says it is "intentionally narrow ... to
avoid over-reach on legitimate serving units like 'serving' / 'piece' / 'lb'".

**What it needs:** a grounded bag size with a source, the same as any other
priced fact here. Then the conversion is mechanical and preserves the total,
the way the pizza/loaf/cake conversions already do.
