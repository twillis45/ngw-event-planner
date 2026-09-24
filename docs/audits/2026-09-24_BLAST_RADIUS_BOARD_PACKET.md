# Board packet — the decision blast radius, and an inversion that is already shipping

Date: September 24, 2026
Status: **PACKET — no decision taken, no constant moved, nothing wired.**
Relates to: `docs/audits/2026-08-17_RANKING_FLOOR_BOARD.md` (the Ranking floor),
`docs/audits/2026-08-17_VENDOR_CONSEQUENCE_RULING.md`, and
`docs/audits/2026-09-23_CLOSING_WINDOW_RULING.md` (the most recent term added to
this same scorer, sized deliberately at 3.5 to stay under the lateness floor).

Standing guards: `src/lib/__tests__/howMuchOpensUp.test.js` pins every number
below; `src/lib/__tests__/theRulingsOwnBarIsUnmet.test.js` pins the scorer
constants they are measured against.

---

## 0. The short version

The board was going to be asked one question. The measurement found a second,
larger one underneath it, and the second one should be answered first.

- **The question I brought:** should a new "how much opens up" term feed the
  ranker? It computes cleanly and it is worth up to **+6**.
- **The question the measurement found:** **the existing `unlocks` term already
  outranks maximum lateness on a quarter of the corpus**, and no ruling ever
  sized it. The 2026-08-17 floor ruling fixed lateness at 4.0–4.9 and left
  `unlocks` unbounded beside it.

Adding the new term without answering the second question makes an unmeasured
inversion bigger. That is the whole packet.

---

## 1. What was built, and what it measures

`DECISION_SCHEMA_SPEC.md` has listed `blastRadius` as *"decision · number
(DERIVED from `blocks`/`dependsOn`) · graph → — → scorer · derivable now"* since
the spec was written. It had never been built.

Two different downstream signals live on a decision:

| field | names | counted today |
|---|---|---|
| `blocks` | the **surfaces** waiting on it (food, vendors, rentals…) | yes — `unlocks: blocks.length` |
| `dependsOn` | the **decisions** waiting on it | **no** |

The second is the only half that can be transitive: a surface does not unblock a
surface, but a decision unblocks a decision that unblocks a decision.

**Corpus health, measured.** 67 `dependsOn` entries, 28 distinct targets, **every
one resolves to a real decision id in its own playbook**, and the graph has
**zero cycles**. Nothing here is guessed or repaired.

**Distribution, all 260 decisions:**

| downstream decisions | count |
|---|---|
| 0 | 219 |
| 1 | 28 |
| 2 | 5 |
| 3 | 3 |
| 5 | 4 |
| 6 | 1 |

**41 of 260 (16%)** have anything waiting on them. The transitive walk earns its
keep at the top: the Gala's fundraising target has **4 direct** dependents and
**6** downstream — a first-order count under-reports the most load-bearing
decision in that playbook by a third.

---

## 2. THE FINDING THE BOARD DID NOT ASK FOR

`actionConsequence` adds `unlocks` to a row's score **unbounded**:

```
gateHolder            +2
closing window        +3.5     ruled 2026-09-23, deliberately BELOW the floor
lateness floor         4       ruled 2026-08-17
lateness ceiling       4.9     ruled 2026-08-17
unlocks               +N       never ruled, never bounded
```

A blocker that is a gate-holder and names three surfaces scores **2 + 3 = 5.00**.
The maximum a genuinely late item can ever reach is **4.90**.

**Measured across the corpus, scoring each decision as if it were a blocker
today, with no change from this work:**

| | |
|---|---|
| decisions already scoring above 4.90 on `unlocks` alone | **64 of 260 — 25%** |
| examples | `Dinner Party/format` 5.00 · `Birthday/theme` 5.00 · `Birthday/headcount` 5.00 · `Baby Shower/guestlist` 5.00 |

The 2026-08-17 ruling's direction — *"a late critical item still outranks a
scheduled one of higher raw consequence"* — is already not holding for a quarter
of the corpus. It was not broken by anything in this work; it appears never to
have been measured against `unlocks`.

**Caveat, stated plainly:** these are decisions scored *as if* each became a
blocker row. Not every decision becomes one on a given board, so 25% is the
exposure, not a count of live rows. The direction does not depend on the caveat.

---

## 3. What wiring the new term would do

Adding `allDecisions` to `unlocks` — the obvious wiring, since the spec says this
feeds the scorer:

| row | today | if wired |
|---|---|---|
| Fundraiser / Gala `target` | 6.00 | **12.00** |
| Wedding `budget` | 6.00 | **11.00** |
| Wedding `venue` | 5.00 | **8.00** |
| a 27-day-late item | 4.90 | 4.90 |
| a vendor reconfirm closing in 3 days | 5.50 | 5.50 |

Decisions scoring above the lateness ceiling: **64 → 76 (25% → 29%)**.

So the new term does not *create* the inversion. It **amplifies one that is
already shipping**, and it does so most on exactly the decisions that matter
most.

---

## 4. Why nothing was changed in this pass

The engine ships; the wiring does not. Three reasons, in order:

1. **A term larger than every other signal cannot be sized by an engineer.** +6
   exceeds the gate-holder term, the closing window, and the entire lateness
   band. Yesterday's closing-window ruling turned on sizing a term at 3.5 rather
   than 5 precisely so it would sit under the floor. Adding +6 beside it without
   a ruling would make that decision meaningless.
2. **The prior question is the board's.** If `unlocks` is already beating
   lateness on 25% of the corpus, the right move may be to bound `unlocks` —
   which changes today's shipping order — before adding anything to it.
3. **No ruled guard is currently red.** Nothing is on fire. This is a correctness
   question about a ruling's own direction, not an outage.

---

## 5. What the board is being asked

**Question A — the one that came first, and should be answered first.**
`unlocks` is unbounded and already outranks maximum lateness on a quarter of the
corpus. Three shapes:

- **A1 — Bound it.** Cap the `unlocks` contribution below the lateness floor, the
  way the closing window was capped. Restores the 2026-08-17 direction. **Changes
  today's shipping board order** on the 64 affected decisions.
- **A2 — Rule that it is correct as is**, and amend the 2026-08-17 ruling to say
  a high-consequence blocker may outrank a late item. Costs nothing but honesty,
  and closes a ruling that its own shipping path contradicts.
- **A3 — Leave it unmeasured.** Not recommended, and named only so the board is
  choosing rather than defaulting.

**Question B — only meaningful after A.** Should the decision blast radius feed
the ranker at all, and at what size?

- **B1 — Not at all.** It stays a reporting number, available to authoring tools
  and the roadmap, out of the scorer. Costs nothing; the work is not wasted.
- **B2 — Wire it bounded**, under whatever ceiling A sets. The signal reaches the
  host and cannot dominate.
- **B3 — Wire it raw.** Simplest; makes the section-2 inversion materially worse.

### One measurement for whoever takes B2

The distribution is **top-heavy and thin**: 219 of 260 decisions score zero and a
single decision scores 6. A bounded term would separate roughly **41 rows** from
the rest, and only **8** would feel a cap at all. Whatever ceiling is chosen, it
changes very few rows — which is an argument that it is safe, and equally an
argument that it is not worth much. Both readings are honest and the board should
have them together.

---

## 6. What is NOT being asked

Nothing here proposes moving a lateness constant, changing the closing-window
term ruled yesterday, or altering `blocks` authoring. The corpus is clean: every
`dependsOn` resolves and there are no cycles.
