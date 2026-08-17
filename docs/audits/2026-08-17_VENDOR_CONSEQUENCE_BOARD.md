# Review Board — should a required-but-unbooked vendor declare what it blocks?

Date: August 17, 2026 (14:1x)
Dimension: **Ranking** (7/10) — capped by consequence coverage.

---

## The measurement

Across 827 raises from all 39 playbooks:

| surface | raises | declares consequence |
|---|---|---|
| risks | 432 | no — and correctly so, a worry gates nothing |
| decisions | 250 | YES (58 unlocks, 54 gateHolder) |
| vendor-coi | 78 | no |
| vendor-unbooked | 67 | no |

A wedding whose caterer is still unbooked 280 days past its authored window
raises correctly — and ranks as one more late item, indistinguishable from a
napkin order, because it declares nothing about what it holds up.

## Why this is a board question and not a commit

`blocks: [...]` IS authored — on DECISIONS, nine of them in wedding.js. Vendor
categories carry `category`, `required`, `altToDIY`, `when`, `costRange`,
`costUnit`. **Nothing states what a missing vendor blocks.** Writing
`blocks: ['food_plan', 'shopping']` into the caterer row in code would be me
inventing a dependency and dressing it as authored — the exact move this repo
gates against everywhere else (see the `blocks:['catering']` phantom comment that
sent an earlier board down a wrong path this morning).

## The question put to the bench

1. Should a required vendor category declare `blocks: [...]`, in the same shape
   decisions already use?
2. If so, is the dependency a FACT about running an event (authorable once per
   category) or does it vary by event type (39 playbooks x N categories)?
3. Or is a missing vendor better expressed as a BLOCKER — the venue's own shape —
   rather than as a gate-holder with unlocks?

## What is NOT in question

- `risks` staying at zero. A standing worry gates nothing.
- Inventing the edges in code. If the bench cannot state the dependency plainly,
  it does not get authored.

## Status

**OPEN — not built.** Recorded so the next pass starts from the measurement
rather than rediscovering it, and so the Ranking cap has a named owner.
