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
