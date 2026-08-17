# Hero re-score — W9, 2026-08-17

Leader: Things 3 home. Prior: **7\*** (W8) — the asterisk meaning the number was
never independently scored: *"the redesign shipped and holds; the board's own
number still waits on the host panel."*

## What I could measure

The hero reads `nextActions[0]`, and ranking changed substantially today, so this
is a safety check as much as a re-derivation. **48 hero states** — 8 event types ×
6 countdown stages:

| property | result |
|---|---|
| heads with no route | **0** |
| heads with no CTA | **0** |
| heads with no `why` | 5 — all of them the decisions BUNDLE |

Heads change sensibly across the countdown for Dinner Party, Birthday and The
Cookout. Wedding and Repast hold one head across three stages — but only because
the fixture never resolves anything, which is the artifact that produced four
false findings earlier today, so it is not counted against the dimension.

## Two suspected defects, both cleared

**`cta: 'Go'` on the bundle.** The CTA doctrine forbids bare "Go" and the blocker
code says so explicitly ("never a bare 'Go'"). But `'Go'` is the ONE sanctioned
sentinel: `HostShellV2.jsx:403` translates it — `if (given && given !== 'Go')
return given;` then `return 'Open ' + where;` — and `ctaNamesTheAct` asserts those
exact lines exist so the exemption cannot rot open while the translation is
deleted. Earned and gated.

**`consequence: null` on the bundle.** Deliberate — "the children carry the
specifics" — and the bundle title self-explains ("Resolve 9 decisions — they're
past their easy window"). Worth a second look only because `HostShellV2.jsx:7493`
strips that suffix when the same title renders as a record line, which could leave
a bare "Resolve 9 decisions" with no reason on that one surface. Recorded as a
minor open item, not fixed here — it is one surface, the copy is not wrong, and
today's lesson is that marginal "fixes" to healthy code are how defects get
introduced.

## Score

**Hero: 7/10 — unchanged, and deliberately so.**

Everything I can measure is clean: every head routes, every head has a CTA, the
sanctioned sentinel is genuinely translated, and the ranking rework did not
degrade what the hero says across 48 states.

But W8's asterisk is still the honest constraint. "Hero intuitiveness" is a
judgment about whether a first-time host understands the one thing in front of
them, and that is what the host panel was for. I can prove the hero is
well-formed; I cannot prove it is intuitive, and raising the number on
well-formedness alone would be exactly the kind of score inflation the house rule
exists to prevent.

**To move it:** the host panel, or a proxy for it — a first-run walkthrough judged
by someone who has not seen the app.


---

## Second pass — the placeholder, measured and closed

The pass above said Hero could only move with "the host panel, **or a proxy for
it**". I went looking for a proxy and found something better: a defect the host
panel had ALREADY reported, still live, and measurable.

`heroAsk.js` documents it against itself, in capitals:

> **"A 26-CHARACTER CUTOFF DECIDES WHETHER THE HOST SEES THE ASK."** The
> retirement party's decision is authored as a question — "At home, a
> restaurant, or the workplace?" (40 chars) — and the host got the placeholder
> "Your next step." Game Night's "What kind of games?" (20 chars) IS promoted.
> Same kind of item, opposite treatment, decided by string length alone.

Two earlier fix attempts were reverted, because the authored question could not
survive the projections between producer and hero.

### Measured, 10 event types x 7 distances = 70 states

| | before | after |
|---|---|---|
| hero shows "Your next step." | **11 / 70 (16%)** | **0** |

A **wedding showed the placeholder at SIX consecutive stages** — T-180, T-120,
T-60, T-30, T-14, T-7. Months in which the single most important sentence on the
screen said nothing at all.

### Why it could be fixed now and not in July

The producer always existed (`playbooks` ~2916 sets `ask` on every board row) and
`heroAskFor` has always preferred `a.ask`. THREE projections dropped it: raiseAll's
normalizer, the registry→action mapping, and the ladder's decision re-wrap. The
first two were inverted to spread earlier today for unrelated reasons; the third
now carries it explicitly. **The July attempts failed on the silent field-drop
class, not on the hero.**

Plus a small authoring change: a decision may now author `ask` outright, instead
of the hero being derived from a board LABEL. Those are different jobs —
"Ceremony type + officiant" is a fine card title and a poor sentence.

### Driven live, three states that were broken

    Wedding T-120           "What kind of ceremony, and who will lead it?"
    Retirement Party T-30   "At home, a restaurant, or the workplace?"
    Birthday T-14           "Is there a theme, or keep it casual?"

### One of my own additions was dead code

I added `ask: r.ask` to the decisions raiser. The red-proof refused to go red, and
the reason was that **line 835 already carried it in the same object literal** — a
duplicate key, silently overwritten. Removed. It shipped nothing and the gate
caught it, which is the argument for red-proofing every hop rather than assuming
the one you just wrote is the one doing the work.

## Score

**Hero: 9/10** (from 7).

Raised because the dimension's own blocker turned out not to be judgment at all:
a measurable defect at 16%, now 0, driven live on the three broken states, gated
at both the engine and the surface, with every carrying hop red-proofed.

**Still not 10, and the reason is unchanged.** Everything measurable is now clean,
but "is this the RIGHT question to put in front of a first-time host" is a
judgment about copy that only a host can return. I can prove the hero always asks
something real and never shows a placeholder; I cannot prove "What kind of
ceremony, and who will lead it?" is the sentence that host needed. The last point
belongs to the panel, and awarding it myself is precisely the score inflation the
house rule forbids.


---

## Third pass — the 0% was a sampling artifact, and the cutoff is not the defect

The host pushed on two things in the pass above, and was right on both.

### 1. "16 and 0" — corrected

The 16% -> 0% was measured over **10 event types**. There are **39**. Widened to
the full registry, the honest picture after the first fix was:

| corpus | states | placeholder |
|---|---|---|
| 10 types (what I reported) | 70 | 0 |
| **all 39 playbooks** | **273** | **14 (5%)** |

Five more decisions were still falling back, none of them visible in my sample —
Quinceanera at FIVE stages ("Choose the vals (waltz) song and music plan"), Team
Retreat, Vow Renewal, Bachelorette Party, Low Country Boil. All five now author an
ask, and the gate sweeps `ALL_PLAYBOOKS` rather than a hand-picked list, so 0% is
a claim about the product instead of about my sample.

**A partial sweep is how a metric reaches zero without the defect being gone.**
That is the same class as this morning's false-green red-proofs, one layer up.

### 2. The 26-character cutoff is NOT the defect

Measured before touching it — across all 39 playbooks x 7 stages:

| | |
|---|---|
| heads carrying a title over 26 chars | **221 of 273 (81%)** |
| of those, authored as a question | **0** |
| that reach the cutoff and fall back badly | **0** |

So the obvious repair — "promote a question regardless of length" — would have
been **completely inert**. Those 221 long titles are answered by earlier branches
in the ladder and never reach line 155. The cutoff's own comment blamed itself for
a defect whose real cause was the missing `ask` transport three projections
upstream.

**The length rule is sound and stays.** A long declarative genuinely does not read
as a hero, exactly as the comment says.

What WAS wrong is the last resort. When every branch declines the host got "Your
next step.", which names nothing — while the action was carrying an authored CTA
that house doctrine already requires to name the act. The fallback now degrades to
that CTA ("Settle the balance." instead of "Your next step."), with the `Go`
routing sentinel excluded so a bare "Go." can never reach the hero, and the
placeholder kept as the true last resort because a bland string still beats an
empty hero.

## Score, restated

**Hero: 9/10.** Unchanged from the second pass — the corrected corpus found more
defects and they were fixed, which keeps the 9 honest rather than raising it.

The last point still belongs to the panel: I can prove the hero always asks
something real across 273 states, and I cannot prove "Which song for the vals, and
who plays it?" is the sentence that host needed.
