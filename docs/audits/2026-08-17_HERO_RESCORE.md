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
