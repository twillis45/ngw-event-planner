# Do the price paths compete? — measured 2026-09-26

Question put by the owner: the app has more than one way to get a price and more
than one way to describe where it came from. Do those paths compete, do they
make sense in a workflow, and is the admin console — which authors playbooks —
consistent with them?

Answer in one line: **the three PRICE layers are coherent and do not compete.
The PROVENANCE vocabularies do not agree, and the admin console's research run
is actively harmful on both of the systems it touches.**

---

## 1. The three price layers: coherent, and my earlier claim was wrong

I told the owner earlier today that there were "three vocabularies, no bridge."
That was wrong, and the correction matters because it is the difference between
an architecture problem and a data problem.

There IS a bridge. `priceLayers.js` defines a ranked ladder:

```
national  rank 0    "National average"
regional  rank 1    "Regional average"
store     rank 2    "Your store"
```

They do not compete for one slot, and the design says why:

- The **regional** factor is applied ONCE, by `playbookFoodPlan`, before the
  shell sees a line. `layerForLine` therefore never does band arithmetic — it
  reads `geoBasis` (recorded where the factor was chosen) and only NAMES the
  layer. The comment is explicit that re-running it would double-apply and
  produce "a silent ~12% error in the Northeast that never throws and never
  looks wrong."
- The **store** layer outranks the label but does not replace the number. It
  returns `range: null` on purpose — a shelf price is the store's package, the
  plan counts plan units — so nothing can multiply a shelf price into a fake
  line total.

That is a correct design, and it is well defended in its own comments.

### Where the store layer and the authored band are reconciled

`bandCheck` flags a shelf price more than 1.5x above, or 1/1.5 below, the
authored band, and tells the host in plain words. It runs inside
`storeLineTotal`, which requires a multipliable line.

Measured coverage over 502 corpus lines:

| | lines |
|---|---|
| multipliable → shelf price IS band-checked | **60** |
| search-only → shelf price shown, NO band check | **12** |
| no curated term → no shelf price at all | **430** |

So the "a price appears beside a band with nothing comparing them" population is
**12 lines**, not the whole corpus. Worth closing, but small, and the honest
read is that this layer is in better shape than I implied.

---

## 2. The provenance vocabularies do NOT agree — and this is the real finding

Three systems describe where a number came from, and they do not share a
dictionary.

| path | how it names its source | who reads it |
|---|---|---|
| authored playbook | `sources: ['bar-provision-2026']` — ids in `COST_SOURCES` / `QTY_SOURCES` | the host badge, the research ratchet |
| backend store | `product: "Harris Teeter White Hamburger Buns"`, `size` | the host, directly |
| backend regional | `source` + `month` | the geo note |

The backend store path is arguably the STRONGEST of the three: naming the actual
matched product is how the injera/shoe-insert mismatch became visible, and it is
better evidence than any badge. It simply is not the same kind of statement, and
nothing reconciles the two. `costProvenance` appears **zero times** in the
backend Python and **zero times** in `storePrices.js` / `priceLayers.js`.

That is a gap, not a contradiction. The contradiction is below.

---

## 3. The admin console research run degrades both systems at once

`AdminConsole.jsx:5224` — after a research run, for a `.unitCostRange` gap:

```js
updatedPlaybook.purchases[i].costProvenance = {
  ...existing,
  verificationStatus: 'researched',
  tier: 'researched',
  sources: result.providersUsed || [],
  researchedAt: asOf,
};
```

`providersUsed` is built at line 5107 as `usedFamilies.push(fam.label)` — the
**human-readable display label** of a provider family, not a source id.

Simulated with exactly that object and judged by both systems:

```
BADGE   isGroundedCost .............. false
BADGE   hostLabel ................... "Needs confirmation"
BADGE   source ids resolving ........ 0 of 2
RATCHET counts it as a claim ....... true
RATCHET uncorroborated (<2 src) .... true   (one provider family, the common case)
NO PROVIDERS -> still a claim ...... true, sources = []
```

Read that as a workflow. An admin opens the console, runs research on a price,
and it succeeds. The result:

1. **The host's badge gets WORSE.** `isGroundedCost` requires every source id to
   resolve in the cost registry. A display label resolves to nothing, so the row
   drops out of every sourced label and lands on **"Needs confirmation"** — the
   most doubtful thing the system can say — on a row that was *just researched*.
2. **The governance number gets worse.** `claimsResearch()` accepts
   `verificationStatus: 'researched'`, so the ratchet now counts the row as a
   research claim. With one provider family it has one "source", so it counts as
   **uncorroborated** and pushes `BASELINE_UNCORROBORATED` up.
3. **With no providers at all it still claims research**, with `sources: []`.

So the one workflow designed to IMPROVE grounding makes the host trust the row
less and makes the ratchet read worse. Nothing errors. Nothing looks wrong.

It also only fires `if (...costProvenance)` already exists — a purchase with no
cost block never gains one, silently.

### Why this was not caught

The badge and the ratchet both read `costProvenance.sources`, and both were
tested with hand-built fixtures using real registry ids. Nothing tested the
object the ADMIN CONSOLE actually writes. The authoring path and the reading
path were each correct against their own idea of the field.

This is the same shape as the UTC bug closed this morning: two halves of one
system, each internally consistent, disagreeing about what a value means, with
CI unable to see the disagreement because nothing exercised the seam.

---

## What I did not do, and why

I did not fix item 3. The code change is small; the CONTRACT is an owner
decision, and picking one quietly would be a product ruling wearing a bug fix's
clothes — the exact thing I was caught doing with the seafood band yesterday.

Three options, with what each costs:

**A. Register research results as real source entries.** A run mints a
`COST_SOURCES` entry per finding with its claim text and date, and writes those
ids. Correct and expensive: the registry is curated, and entries carry
`claim` and `sufficientWhen` prose a machine cannot write honestly.

**B. Write to a separate field.** Research results land in something like
`researchEvidence`, never in `sources`. Cheap, honest, and the badge is unmoved
— a research run stops pretending to be a citation. The host sees no change,
which is accurate, because no registered source was added.

**C. Stop claiming `verificationStatus: 'researched'`** when no id resolves.
Cheapest. Fixes the ratchet pollution and the false "Needs confirmation", and
leaves the run as an internal note.

My recommendation is **B**, with **C** folded in: the run records what it found,
under its own name, and does not touch a field two other systems read as a
citation. A is the right destination if admin research is ever meant to produce
publishable grounding, but it is a project, not a fix.

Whichever is chosen, the machine check is the same and it is the one that was
missing: **take the object the admin console writes, run it through
`isGroundedCost` and through `claimsResearch`, and assert the two agree about
whether it is a citation.** Red-proof by writing a display label into `sources`.

---

## Summary

| | verdict |
|---|---|
| Do the three price layers compete? | **No.** Ranked ladder, factor applied once, store price never replaces the band. Correct. |
| Is a shelf price checked against the authored band? | **For 60 of 502 lines.** 12 show a price with no check. 430 show no price. |
| Do the provenance vocabularies agree? | **No.** Registry ids vs product names vs source+month. A gap, not a contradiction. |
| Is the admin console consistent with what it sources? | **No — and it is the one real defect.** It writes display labels into a field two systems read as registry ids, making the host badge worse and the ratchet worse on every successful research run. |
| Fixed here? | No. Contract is an owner call; options A/B/C above, recommendation B+C. |
