# Review Board — blocker vs gate, and why the two collided

Date: August 17, 2026 (03:4x)
Occasion: an attempted Ranking fix was reverted after breaking four gates. This
is the ruling the next attempt needs.

---

## What was actually found (re-derived, not inherited)

Ranking's floor is empty inputs: over 163 raises, **52% score `actionConsequence`
0** and **`gateHolder` is true on none**. The obvious repair is to wire the
foundational ladder — which the repo already DECLARES, in priority order, each
rung stating in prose what it gates — into consequence.

That repair was built, measured, and reverted. It broke `criticalBlockerLeads`
and three siblings. The reason is the finding:

**"This leads" is expressed TWO different ways in one list.**

- **Positionally.** The Tier 0.6 blocker becomes the top action and is
  `push`ed first (`CommandCenter.jsx` ~1990). It stays first only because
  `Array.prototype.sort` is stable and nothing outscores it.
- **By score.** Everything else competes on `actionConsequence` + lateness.

At ~310 days out the venue blocker carries `urgency: 'medium'` — so it is band
**1**, not band 0 — with consequence ~0. Its own test header states the intent
plainly: *"POSITION AND TONE ARE DIFFERENT AXES. The venue gate leads at every
stage while its `level` rides the countdown."*

**So the blocker leads today only because consequence is empty for everything
else.** The instant consequence is populated — the exact fix Ranking needs — the
blocker stops leading. The floor is load-bearing for a different invariant, which
is why the two changes collided and why no constant could have reconciled them.

---

## Design bench (first)

**Karri Saarinen.** "Two mechanisms for one question is the bug, before any
number is argued about. Position expresses intent that scoring cannot see, so
every future scoring change is a coin flip against an invariant nobody restates."

**Don Norman.** "The failure mode is silent. Nothing throws; the gate simply
stops being first, and the host is told to plan a menu for a venue they have not
booked. Only a test noticed — and only because someone wrote that test."

**Edward Tufte.** "The blocker already declares `blocks: ['catering']`. You have
the measurement; you are ranking on its absence."

## Event bench (second — override authority)

**Bryan Rafanelli.** "A venue is not a task, it is the precondition. You cannot
order rentals, set a load-in, or brief a caterer against an address you do not
have. It leads because everything downstream is fiction without it — that is a
fact about the work, not a display preference."

**Mindy Weiss — OVERRIDES on framing.** "Do not make it a bigger red word. It
already escalates on the countdown and that ladder is right — an unsigned venue
ten months out is a normal plan, not an emergency. Keep the tone; fix the
position."

**"Grandmother."** "If one thing has to happen before the others can, say that.
Not louder — first, and with the reason."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Put blocker precedence in the SAME
currency as everything else, and source it from what the blocker already
declares.

A blocker states `blocks: [...]`. A domino states its position in a declared
ladder. Both are declarations of downstream dependency — the same fact, written
in two places. Feed both into consequence and the question answers itself without
a new tier, a new band, or a magic constant:

  - a blocker gating N downstream areas outscores a domino unlocking fewer
  - the tone ladder (`urgency`) stays exactly as it is — it drives LEVEL, never
    position, which is what the existing test already asserts

And it must be a REPLACEMENT of the positional mechanism, not an addition beside
it. Two mechanisms that agree today are two mechanisms that will disagree later;
the whole finding here is what that costs."

**The Liability & Trust Reviewer.** "Whatever lands, `criticalBlockerLeads` and
`hostEngineSelectionParity` stay green untouched. If a change needs those edited
to pass, the change is wrong — they encode a prior board's ruling."

---

## RULING

1. **Express blocker precedence as CONSEQUENCE, sourced from its declared
   `blocks: [...]`.** No new tier, no new band, no constant.
2. **Then wire the foundational ladder** into consequence behind it. Order of
   operations matters: blocker first, ladder second, or the same collision
   repeats.
3. **Retire the positional mechanism** once scoring carries the intent. Leaving
   both is the defect this ruling exists to remove.
4. **The tone ladder is untouched.** `urgency` drives level, never position
   (Weiss's override, and the existing test already says so).
5. **Bar for done:** `criticalBlockerLeads` and `hostEngineSelectionParity` pass
   WITHOUT modification, at every countdown stage they already cover, AND a
   populated-consequence event still puts the venue gate first. Both, or the
   collision is merely postponed.

**Not attempted tonight.** This is the attention path, it broke once already
today, and the ruling is worth more than a 4am implementation of it. Recorded so
the next attempt starts from the finding rather than rediscovering it.

---

## Attempt 2, REVERTED — the mechanism is not what either of us thought

Built the ruling on 2026-08-17 (09:0x–09:3x) as commit `93fef455`, then reset it.
Engine went 5863 green; **the matrix went 12 red**. Recording precisely, because
the next attempt should not re-derive any of this.

### What was built
1. **Pinned the selector's head** out of the sort and put it back, so scoring
   cannot overrule the tier ladder.
2. **Wired the declared foundational ladder** into consequence behind the pin.

Both directions of the bar measured GREEN at engine level:
- bare event: "Add your guest list." led, `gateHolder`, `unlocks: 2` (was rank 3)
- 310 days, consequence populated: head still "Venue"
- `criticalBlockerLeads` + `hostEngineSelectionParity` passed UNMODIFIED

### What broke
`decisionIdentity.spec.mjs` — "Solemn repast · a real open decision still
renders, aligned with its ask". Attributed conclusively by bisecting the one
file:

    without the change   6 passed
    with the change      2 failed, 4 passed

    Expected pattern: /who provides the food/i
    Received string:  "Set your budget."

### A CORRECTION TO THIS BOARD'S PREMISE, which I supplied
I told the board blocker precedence was **positional** — "pushed first, held by
sort stability". It is not. `_selectEventNextActionInner` picks the head through a
TIER ladder (Tier 0 → 0.5 → 0.6), and `hostEngineSelectionParity` +
`criticalBlockerLeads` require `nextActions[0]` to BE that choice. The ruling's
"express precedence as consequence" was reasoning from a wrong description.

### Two mechanisms guessed, both WRONG
1. *"`nextActions[0] === topAction` fails because the phase splice lands
   something ahead of it."* Re-pinned by `indexOf` identity instead — **still 2
   failed**.
2. *"The stamp's spread copy breaks an identity comparison downstream."* Not
   verified either way; the run above rules out the index theory only.

The Repast case could not be reproduced from the sample event directly: the
committed `REPAST_SAMPLE_EVENT` is dated in the past, and forcing it future gives
selector head "Buy sweet tea…", not the food decision the spec asserts. **The e2e
harness state differs from the raw sample in some way that matters**, and finding
that difference is step one for whoever picks this up.

### For the next attempt
- The repro is cheap and exact: `npx playwright test e2e/decisionIdentity.spec.mjs
  --project=mobile` — 15 seconds, no full matrix needed.
- Start by instrumenting what `readHero` actually reads on that state, rather
  than reasoning about `nextActions[0]`. Both failed guesses assumed the hero
  reads the sorted head; that assumption is now the prime suspect.
- The engine suite is NOT sufficient cover for this change class. It passed at
  5863 while the hero was showing the wrong ask on a real seeded event.
