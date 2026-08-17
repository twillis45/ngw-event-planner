# The raise normalizer — inverted, and a correction to what I called the defect

Date: August 17, 2026 (11:5x)
Dimension: **Ranking** — and a live host-visible defect found on the way.

---

## A correction first

I recorded, in two commits and the Coverage rescore, that `'urgent'` was "a ninth
casualty of the explicit-field-list normalizer." **That is not right, and the
distinction matters.**

`surfaceRegistry.js:50` DECLARES the raise vocabulary: `severity: 'critical' |
'attention'`. `'urgent'` is not in it. The normalizer canonicalizing it down was
CORRECT behavior — the defect was a raiser authoring outside a declared
vocabulary with nothing watching. Two different bugs that happened to meet:

| | defect | fix |
|---|---|---|
| the field list | new fields silently erased | invert it — spread by default |
| `'urgent'` | authored outside the declared vocabulary, unwatched | a corpus gate |

`riskSeverity.js:33` had already written the doctrine down, in as many words:
*"If someone authors `severity: 'urgent'` tomorrow, a test fails; the host never
sees a guess."* That gate covers the RISK corpus. The RAISE corpus had the same
hole and no gate — and someone had in fact authored `'urgent'`.

## The inversion

The normalizer enumerated every field it copied. Its own comments recorded the
deaths one at a time: `sourceCategory` (called **"the fourth and last"**,
2026-07-22), then `priorityScore` / `gateHolder` / `unlocks` / `ask` (fifth
through eighth, 2026-07-31, each with a consumer already reading `undefined` — a
decision scored 308.5 arrived null and ranked 0).

Eight identical bugs in one place is a design verdict, not bad luck. Each was
fixed by naming one more field and pinning it with a test that named that field —
which is precisely why a ninth could still die. **A gate that names fields cannot
catch the field nobody thought of.**

Now: the raise spreads through whole, and only genuine coercions are hand-coded
(the vocabulary default, the surface's route as a fallback, the null-defaults
`decisionEvidence` pins, and the numeric guards that keep garbage out of the
ranker). `surface`/`label`/`domain` are stamped LAST so a raise cannot shadow its
own identity.

## THE LIVE DEFECT, found by doing it

`money-dates` carried three, all masked by the old normalizer:

1. **`because:` instead of `why:`** — the only raiser of 19 spelling it that way,
   and no consumer reads `.because` on a raise. **Every money-deadline raise has
   shipped with no reason at all.** The host saw "Final headcount in 3 days" with
   the exposure line — the part that says what it costs to miss it — silently
   dropped. The sibling raiser at ~:752 maps `r.because` INTO `why`, which is the
   convention this drifted from.
2. **`'urgent'`** — out of vocabulary, so the sharpening branch never had an
   effect for as long as it existed.
3. **no `dueInDays`** — a deadline 1 day out ranked identically to one 13 days
   out. The nearness this raiser is *entirely about* could not reach the ranker.

Worth naming plainly: #1 is the kind of defect the whole session's method exists
to find. It shipped, it was invisible from the outside, no test failed, and it
was found only by inverting the site that hid it.

## The gates

- **`raiseNormalizerPassesThrough`** — drives a synthetic surface authoring a
  field this repo has never seen. Deliberately NOT a named-field test, since
  that is the shape that let eight through.
- **`raiseVocabulary`** — two halves: a SOURCE scan (catches an out-of-vocabulary
  literal in a branch no fixture reaches — this is what would have caught
  `'urgent'`) and a RUNTIME scan across the countdown (catches a value computed
  at run time). Plus a `because:` scan, because with the spread in place a stray
  `because` would now SURVIVE and still never be read — a quieter version of the
  same bug.

Red-proofed, four faults, each confirmed applied to the intended line before
running (the lesson from this morning's false negative): drop the spread → red;
restore `'urgent'` → red; restore `because` → red; move the spread last so a
raise shadows its identity → 2 red.

## Score

**Ranking: 7/10** — held, not raised.

The `money-dates` `dueInDays` fix is a real ranking improvement (a whole surface
could not express nearness), and the normalizer closes a defect CLASS rather than
an instance. But neither adds a consequence signal, which is what the 7 is capped
on: producers still do not declare what their items block. That remains authoring
work, not engine work.
