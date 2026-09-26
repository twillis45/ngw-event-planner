# Consolidated ruling: de-stacking bundled food lines vs. the research ratchet

Board convened 2026-09-25. Eight seats across three panels, sitting in parallel
and scored independently. This file is the synthesis; the panels' own findings
are quoted rather than averaged, and where they contradict each other or
contradict me that is recorded as a disagreement, not smoothed.

Repo state at the sitting: `1ca2b2e2`, `BASELINE_UNCORROBORATED = 37`,
`BASELINE_UNDATED = 41`, 1,181 priced units, 588 research claims.

---

## The question put to the board

Repast's `p_protein` bundled "Fried or baked chicken & baked ham" into one row.
It was split so a coordinator can record a different bringer for each meat. The
children inherit the parent's provenance object verbatim, so the split moved
`36 -> 37` and `40 -> 41` on a gate whose header reads
`LOWER THESE, NEVER RAISE THEM`.

The pending change would split ~56 more bundled lines into ~154. Three options
were put:

1. Allow the raise and record it.
2. Split only rows already dated and corroborated, leaving the weak ones bundled.
3. Hold the whole split until the weak rows are re-researched.

---

## Corrections to the premises the board was given

Three of the facts I handed the board were wrong. They are first because
everything downstream of them moves.

**1. The ratchet has been raised ONCE, not twice, and it is DOWN 2 net since
the freeze.** I used `git log -S`, which counts occurrences of a string and
cannot see a digit change. `git log -p`:

| commit | date | uncorroborated | undated |
|---|---|---|---|
| `5e0bf3e9` | 2026-08-07 | — → 39 | — → 43 |
| `e1b8061e` | 2026-09-17 | 39 → **36** | 43 → **40** |
| `9f3bbf55` | 2026-09-24 | 36 → **37** | 40 → **41** |

The file's header documents the raise in detail and never mentions the
lowering, so the ledger it presents is incomplete in the direction that makes
the gate look worse-behaved than it is.

**2. The 96% / 12% store-match figure does not support de-stacking.** It is
*curated-term* vs *no-curated-term*, and the repast commit added no curated
terms. The split is a **precondition** for curating, not the lever. Weaker
argument than I gave.

**3. `KNOWN_BAND_DISAGREEMENTS` is not a set of research ties.** I froze three
rows this morning as standoffs between two cited bands, on the grounds that
picking a winner would be "a product decision wearing a bug fix's clothes." I
checked that both sides carried citations. I did not check what the citations
said. Two seats did — see the defect below.

---

## The live defects the board found

### D1 — A Costco shrimp guide is pricing eleven species

`CANONICAL_PROTEIN_PRICES.seafood` (`src/lib/sourcing.js:143`) spans crawfish,
crab, lobster, oyster, scallop and five fish at one band on **one** citation:
`eatlikenoone.com/costco-shrimp-guide.htm`.

Fetched 2026-09-25:

| Row | Authored | Table says | Sourced today |
|---|---|---|---|
| Live crawfish, by the sack | `[3, 7]`/lb | $8–14 | **$2.90–$6.00**/lb across 3 LA sources |
| Whiting / catfish / porgy | `[3, 7]`/lb | $9–14 | **$3.30–$5.99**/lb across 2 Baltimore counters |

Every crawfish price above $6 the seat could find was *boiled, sold by the
plate* — a prepared product, and the row says live. A third DMV counter does
not stock whiting, porgy, croaker or catfish at all; its cheapest fish is
$18.99. Fry fish and center-of-plate fish are sold by different businesses, and
the table is the arithmetic midpoint of two counters — 2x too high at one, 3x
too low at the other.

The authored bands were right. The table was wrong.

Machine check: `canonicalProteinPrice('Live crawfish (by the sack, ~30-35
lb/sack)', 'grocery')` returns `null`, and `Fresh fish (whiting, catfish,
porgies)` grocery high `<= 8`. Red-proof: restore the merged `seafood` row;
both go red naming the rows.

### D2 — A split orphans curated search terms — CORRECTED 2026-09-26, the board was wrong

The board reported: `TERMS` is keyed on `key(id, item)`, a split renames the
item, the term is lost, **"and no gate objects — the suite stays green."** The
mechanism is real. The conclusion was not.

Re-tested 2026-09-26 by renaming `The Cookout.p_buns` the way a split would:

```
✕ (premise) every search-only line REALLY EXISTS in the corpus, exactly as written
Full suite: 1 failed, 548 passed, 549 suites
```

**The gate exists and it fires.** `theUnitMap.test.js` already asserted that
every curated line is present in the corpus exactly as written, and a rename
trips it. 12 bundled lines are NOT silently exposed.

What was genuinely wrong is narrower and now fixed: the assertion was
`expect(real.has(key)).toBe(true)` per line, so the failure printed
`Expected: true / Received: false` and named nothing. A maintainer got a red
build and no worklist. It now collects the orphans and asserts the list is
empty, so the failure reads:

```
+   "p_buns · Burger + hot dog buns / bread",
```

Red-proofed both ways.

**Why this correction matters beyond the one finding.** The board caught me
twice for arguing from a mechanism I had not measured. This is the same error
in the other direction: a real mechanism, a plausible consequence, and no run
to confirm the consequence. A subagent's finding is a hypothesis, including
when it is inconvenient to me — and this one was convenient, because it
supported holding the split.

### D3 — A single-source undated price and a corroborated dated one say the
same words to the host

`claimBasis.js:309-313` branches on *which axis* is cited, never on how many
sources or whether dated:

```js
hostLabel = (qtyCited && costCited) ? DIRECTLY_SOURCED
  : costCited ? PRICE_SOURCED : AMOUNT_SOURCED;
```

Measured: the 37 uncorroborated rows render `Directly sourced` ×36 and
`Price directly sourced` ×1. The corroborated *and dated* rows render
`Price directly sourced` ×478, `Directly sourced` ×46. Same words. Whichever
way the ratchet is ruled, the host's screen does not change.

And the split makes it worse: three children inheriting tier `researched` off a
number **divided evenly** read as three checked facts. One checked fact cut in
three. Confidence multiplies; evidence stays flat.

### D4 — The ratchet counts provenance SLOTS, not rows, and nothing says so

1,181 slots. `Fish Fry · p_fish` is simultaneously dated+corroborated in
`costProvenance` and undated+single-sourced in `provenance`. A reader costing
the split from a row count is wrong by up to 2x. **Option 2 as written does not
name the slot, so it would green-light half-green rows.**

### D5 — The gate cannot name its own debt

On failure it prints a count and `slice(0, 5)`. A maintainer under a red build
has a number and no worklist. The 41 are 41 named rows.

---

## What the board measured that nobody had

**Only ~19 dirty parents exist.** Option 2 captures **~90% of the split at
exactly zero ratchet movement**, on both heuristics. Independently, a second
seat censused the corpus: **289 bundled priced lines**, of which only **16**
claim research and **15** are the weak kind that move the counters. Holding the
split to protect the counter stops ~274 harmless splits to protect a number
from 15 lines.

**The rate is flat while the count rises** — 6.3% → ~6.1%. The ratchet is
row-shaped; the asset is claim-shaped.

**The cultural-neutrality question, measured.** Corpus-wide the disproportion
is not there — cultural playbooks 7.8% undated vs generic 7.5%, and claim
*rates* are identical (52.3% vs 52.5%). The two worst offenders in the corpus
are Vow Renewal and Anniversary, neither culturally specific. **But on food
lines alone it is 12.0% vs 4.9%**, and food is the slice being split. The seat
declined to call 13-of-108 a pattern and declined to wave it off. Its bucketing
was, by its own account, biased toward finding the disproportion and still
mostly did not.

**The roster discipline is working and the gate cannot see it.**
`claimsResearch()` returns false for `verificationStatus: 'synthesized'`, so a
row authored the roster's way — synthesized, `sources: []`, no fabricated
citation — contributes nothing to either baseline. 40.8% of cultural food
provenance objects are synthesized vs 36.5% generic.

---

## Verdicts

Eight seats. **Nobody endorses raising the number under the current metric.**
All three engineering seats reject option 3; the cultural seat rules for it in
a narrow form. That is the one real split and it is recorded, not averaged.

| Seat | Verdict |
|---|---|
| Bach / Bolton (test architecture) | Reject 3. A guard satisfiable by editing either side is a logbook, not a gate. |
| Rogati (metrics) | Reject 3. 37→42 is not degradation; the metric is mis-shaped. |
| Forsgren (delivery) | Reject 3, dissent on sequencing: ship the free 90% now, do not block it on a metric rewrite. |
| Next Maintainer | Neither 1 nor 2 as stated. Fix the counter; the split becomes structurally free. |
| "Grandmother" (host) | Split — three lines means three names — but not until D3 is fixed. |
| Toups (crawfish) | Does not vote on 1/2/3. Authored band right, table wrong, band needs a season dimension. |
| DMV crab-house operator | Does not vote on 1/2/3. Split the `seafood` key; `KNOWN_BAND_DISAGREEMENTS` is not symmetric and should say which side is thinner. |
| Cultural & Community | Option 3 narrowly — 41 named rows is a worklist, not a research programme. Option 2 unusable until it names the slot. |

### The two metric replacements proposed

**Next Maintainer:** count **distinct weak provenance objects**, not rows —
`new Set(weakRows.map(r => r.prov)).size`. Splitting shares an object, so it
moves nothing; authoring a new weak block moves it. Red-proof both directions.
The gate stops being satisfiable by merging rows.

**Cultural & Community:** count **coverage** — uncited priced food rows as a
share of all priced food rows — and demote 37/41 to secondary. Grounds: the
cheapest way to satisfy the current metric is to relabel a dated single-sourced
`cited` row as `synthesized`, which fabricates nothing and **deletes a real
citation to get under a number**. For an insider-authored playbook whose one
hard-won source is a community cookbook, that is the loss. The test's own
header predicts this outcome and calls it worse than the problem.

These are compatible. Distinct-objects fixes what the gate *counts*; coverage
fixes what it *rewards*.

---

## Recommended sequence

Ordered so nothing ships behind a decision it does not need.

1. **D1** — split `crawfish` and the fry fish out of the `seafood` key. Not a
   tie, and it is live on every non-default sourcing tier. Unblocks the
   sourcing-default change, which is the host's stated priority #1.
2. **D2** — gate the orphaned search term before any further split.
3. **D3** — a single-source undated price stops using the host-facing words a
   corroborated dated one uses. Two seats independently make this a
   precondition of splitting.
4. **D4 + D5** — the gate prints slots vs rows and names every offender.
5. **Metric ruling (owner)** — distinct-objects, coverage, or both.
6. **The split** — free under either replacement metric.

Steps 1–5 are all (a)-code except the metric ruling.

---

## Owner items

- **The metric.** Distinct provenance objects, coverage, both, or keep 37/41
  and rule on the raise. Changes what the build fails on.
- **If option 2 survives:** it must read "already dated and corroborated **in
  the slot being inherited**," per row-half.
- **Seasonal pricing.** Crawfish moved $6.00 (January) → under $3.00 (April)
  inside one 2026 season, and the season closed around Father's Day. Today a
  host opening Crawfish Boil is shown a band for a product that is not being
  harvested. May a budget say "not in season"?
- **Does the table get a grade axis** (whole / dressed / fillet), or is
  per-item `sourcingPrices` the right home for anything the table cannot price
  honestly? The operator seat leans the latter: 6 lines already use it, and the
  file's own measurement says 0 lines fall through to the blanket factor.
- **Beverage bundles, teamRetreat category split, one commit or four** — still
  open from the start of phase 2.

---

## What the board could not check, in its own words

- **Captain White's and Jessie Taylor publish no prices online.** The DMV fish
  band comes from two other retailers, so it is Mid-Atlantic-general rather
  than DMV-specific.
- **Giant, Safeway and Walmart** returned bot walls or 404s. Mass-market
  grocery fry-fish prices are unverified.
- **WGNO's Crawfish Price Index** returned 403. No current-week tracker number.
  The Acadia sack list carries no date stamp on the page.
- **Any September live-crawfish price.** The season is closed. That absence is
  itself the finding.
- **The 56 → 154 projection and the 42/48 resulting baselines** are my numbers,
  not reproduced. The mechanism (children inherit the slot verbatim; splits add
  slots) and the current state (37/41) were both verified.
- **`latestcost.com`**, the source behind the shipped `crawfish-sack-2026`
  citation, is an aggregator whose own registry entry admits figures are "read
  from search results." The Acadia fetch is stronger and should replace or join
  it.
- **The 96%/12% figure** was handed to the player panel and no repo instrument
  was run to reproduce it.

## The caution this board is required to carry

**Seating an insider lens is not community consent.** The cultural seat is a
lens on this board — not a community, not a review, not permission. Nothing
here has been seen by anyone who hosts a repast, a Juneteenth cookout, or a
Kwanzaa gathering. The Repast row that started this concerns a **funeral
meal**, and the roster's Program Red Team standing rule is *no synthesized
content on grief*. That rule is stricter than anything a ratchet enforces and
is not satisfied by having measured something.

**Composition gap.** The food panel ruled on test architecture and ratchet
design (D4, D5, and the coverage proposal) without a Next Maintainer seat,
which the roster requires on any build question. Those four findings are
seconded by the engineering panel, which did sit — but the food panel flagged
its own incompleteness and that flag stands.

---

## Separate, non-blocking, not from this work

Five CRA tests fail nightly after 8pm Eastern —
`vendorStatusReadersReadOneVocabulary` and `theRulingsOwnBarIsUnmet`. Verified
pre-existing via `git stash`. They are clock-dependent: local 23:37 is 03:37
UTC the next day.
