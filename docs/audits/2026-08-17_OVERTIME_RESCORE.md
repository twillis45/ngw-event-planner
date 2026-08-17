# Over time re-score — W9, 2026-08-17

Leader: Things 3 / Google Calendar. Prior: **5/10** (W8, 2026-07-15).
House rule: lowest sub-dimension, re-derived against the running engine.

## W8's cap: the 7th overdue reader — CLOSED, and verified

W8 refuted its own POLICY-FORK gate: "a 7th overdue reader survives in hostv2
(`taskTimeStatus` via dates.js) that renders '· past due' on the calm hero for
snoozed/unreachable tasks … it survives because the scanner's SRC_ROOT is
`demo/src` and never walks hostv2."

Re-derived: **fixed.** `HostShellV2.jsx:1746` now reads

    const timeBucket = lead != null ? taskTimeStatus(-lead, dte) : 'unknown';
    const overdue = taskIsOverdue(t, event);

`timeBucket` is display-only; the STATE comes from the one policy. And that policy
is genuinely covered — `leadTimesAreReal` exercises snooze suppression, `done`,
and reachability against `taskIsOverdue` directly.

One suspected violation checked and cleared: `vendorAccountability/derive.js:35`
(`daysUntil(iso) < 0`) is a plain date comparison for vendor promise dates, not a
task-overdue policy, and its own comment shows it deliberately routes through the
single `daysUntil` reader.

## The countdown behaves

| distance | actions | head |
|---|---|---|
| T-400 | 3 | Decide what you're serving |
| T-200 … T-7 | 5–7 | Resolve "Ceremony type + officiant" |
| T-1 | 9 | the late-decisions bundle |
| **T-0, prepared** | 3 | **Reconfirm 6 vendors · Golden hour at 11:00** |
| T+1 and later | 0 | (correctly empty) |

Two things I flagged and then withdrew, both unprepared-fixture artifacts:

- *"On the wedding day the head is a planning decision."* Only when nothing is
  decided. With decisions made and vendors booked, the day-of surface takes over
  properly. And for a host who genuinely has no officiant on the day, that
  decision leading is arguably correct.
- *"The head never changes from T-200 to T-7."* Same cause — the same thing IS the
  most important until it is done.

That is the fourth finding today to dissolve under a realistic fixture. The
pattern is consistent enough to name: **an empty event is not a small event, it is
a different event**, and it produces confident-looking findings that are about the
fixture rather than the app.

## Score

**Over time: 6/10** (from 5).

Raised because the W8 cap is genuinely closed and verified rather than assumed,
the canonical policy is covered, and the countdown produces sensible, changing
content at every stage including post-event.

Capped at 6 by the lowest sub-dimension: **the class has no gate.** The
`policyForkEnforcement` scanner W8 refuted does not exist anywhere in the tree —
only in an archive doc and a comment in `dates.js` that references it as though it
runs. The seven-reader fork was closed BY HAND, and nothing stops an eighth
reader appearing. W8's own lesson was that a gate must span every tree and every
idiom; here there is no gate at all.

## What 10+ needs from here

- A guard that hostv2's `upNext.overdue` comes from `taskIsOverdue`, not from a
  display bucket. Behavioural (drive a snoozed and an unreachable task), not
  textual — an overdue policy fork has no clean textual signature the way a raw
  `event.venue` read does, so a `venueSourceProof`-style scanner would be noisy
  and weak here.
- Note the `dates.js` comment claiming `policyForkEnforcement` enforces idiom B.
  It does not exist. Fifth comment found today asserting behaviour the code does
  not have.
