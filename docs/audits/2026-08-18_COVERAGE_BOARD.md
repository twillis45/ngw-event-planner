# Board — Coverage, measured against the surface that ships

**Date:** 2026-08-18 · **Dimension:** Coverage, recorded at 7, then 8
**Question:** what caps Coverage, and is the residue a gap or correct restraint?

## The record, and why it was wrong twice

The rescore recorded Coverage as capped by "the thin tail (min 1 decision at
T-45) and the decision-window gradient, authored unevenly across 39 playbooks."

**Both were measurement artifacts:**

- The window gradient does not exist. All 215 authored decisions carry a `T-Nd`.
  Three regexes against the data files gave 0%, 84.7% and 100%; only the third
  asked the module.
- "min 1 at T-45" came from applying a horizon cut that no consumer implements.

A third measurement then found empty decision boards in every phase (planning
9/39, research 7, booking 5, purchasing 6, preparation 9) via `resolveDecisions`,
and that gap was fixed and gated (`nothingDueStillSaysWhatsNext`).

**That fix is real but it is not the host's board.** `composeExperience` has
exactly one consumer: `src/admin/AdminConsole.jsx`. The test asserting it
"reaches the screen" has been renamed to say which screen — an admin projection.
An admin surface rendering silence is still worth fixing; it was never the
host-facing cap the audit had recorded.

## The surface that ships

`playbookDecisionBoard(event, asOf, profile)` — `lib/playbooks/index.js:2551`,
consumed by hostv2 and CommandCenter. Returns `{open, locked, deferred,
headcount, hostDifficulty, heartAtRisk}` and carries its own overdue path
(`decisionOverdueDays`, aging, tiers, host-voiced reasons: "3 days past its
window").

Measured across all 39 playbooks, one event per type, guests 30:

| horizon | open avg | min open | empty boards | deferred avg |
|---|---|---|---|---|
| T-60 | 3.2 | 0 | 4 / 39 | 2.1 |
| T-45 | 5.1 | 0 | 1 / 39 | 0.2 |
| T-30 | 5.3 | **3** | **0 / 39** | 0.0 |
| T-21 | 5.3 | **3** | **0 / 39** | 0.0 |
| T-14 | 5.3 | **3** | **0 / 39** | 0.0 |
| T-7  | 5.3 | **3** | **0 / 39** | 0.0 |
| T-3  | 5.3 | **3** | **0 / 39** | 0.0 |

The four T-60 boards with nothing open are Game Night, Card Party, Housewarming
and Crab Feast — and each carries 3–5 **deferred** rows plus 2–3 locked. The host
is not shown silence; they are shown "Comes up closer to the date", which for a
game night two months out is the correct answer and not a gap.

## RULING — Coverage 9/10

On the shipping board there is **no empty board at any horizon from T-45 inward,
a floor of 3 open decisions, and an average of 5.3.** The far-horizon case is
handled by an honest deferred bucket rather than by padding.

**Not 10.** The leader is a seasoned planner, who at T-60 for a small event still
raises the two or three calls that are cheap now and expensive later — venue
hold, date conflicts with the guests who matter. The board's deferred bucket is
honest, but honesty about "not yet" is a floor, not the ceiling. Closing that
needs authored early-window calls on the small-event playbooks, not an engine
change.

**Recorded for the next auditor:** measure the dimension against the surface the
host opens. Two of this dimension's three recorded caps were artifacts of
measuring the data files or an admin-only module, and each commissioned work
that the shipping path did not need.
