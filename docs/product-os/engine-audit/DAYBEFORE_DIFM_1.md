# DAYBEFORE-DIFM-1 — The day-before plan (2026-07-07)

## Executive verdict
Shipped the compression HOST-DIFM-AUDIT-1 identified as the product: from two
days out through the event, the host Command tab leads with ONE calm card —
"N things still matter before tomorrow" — composing five existing canonical
sources: open plan steps (timeline) · still-to-get (food plan + supplies) ·
people you're counting on (explicit vendor gaps, first-undone ordered) ·
weather backup (rainPlanStatus) · how tomorrow starts (first three real
run-of-show cues) · a LINK to the written guest final-details note. Derived
helper (`lib/dayBefore.js`), not an engine; DayBeforePlanCard renders it.

## Acceptance bar — met
- Compresses open tasks, vendor gaps, unbought items, rain readiness, and
  tomorrow's cues: yes, all five, from their real single sources.
- No guest-message copy leaked: the guest note is a routed LINK
  (guests-invites anchor), never embedded (test-pinned).
- Nothing pretended done: sections show OPEN counts only; settled sections
  read as explicit permission ("Nothing open. Stop worrying about the
  plan."); headline reflects the true open count (test-pinned).
- Deep-link doctrine: every routed row carries an anchor or row id — tasks →
  '__compressed__' do-now list, shopping → food-plan, vendors → first-gap
  vendorId (else none), rain → rain-plan, cues → ros-now, guests →
  guests-invites-<id> (test-pinned).

## Behavior details
Window: T-2 → T-0 (`DAY_BEFORE_WINDOW`); hidden under the day-of FOCUS
takeover (that surface owns the day). Vendor section suppressed entirely for
vendorless events (never a failure). Vendor gap = explicit fields only
(unbooked status / unpaid explicit deposit / COI required / no arrival time).

## Fixes shipped alongside (found during verification)
1. `__compressed__` do-now fallback: custom tasks carry no playbook phase,
   so compression ranked nothing and the promised landing rendered empty —
   it now falls back to every undone task (a do-now promise never lands on
   nothing while open tasks exist).
2. The long-parked duplicate-key `venue` watch item, flushed out by console
   audit (240 errors): several playbooks author a decision id 'venue' that
   collided with the settle board's foundation rows as React keys.
   Foundation rows are now namespaced (f-date / f-venue / f-headcount);
   verified post-fix with a console marker — zero new occurrences.

## Tests & runs
7 contract tests (time gate · honest open counts + stop-worrying copy ·
vendorless suppression + first-undone routing · rain shared target · guest
note is a link, marker-banned · deep-link doctrine sweep · never-done
language). Frontend 2010/2010 · backend 97/97 · build clean. Live-verified:
T-1 Crab Feast rendered "24 things still matter before tomorrow" with real
task names; the tasks row landed on the do-now list naming "Pick up the
bushel".

## Parked
Moment context line (MOMENT-PROTECT-1's job) · any day-before notification.

## Recommendation
Accept. Next per the accepted order: WCGW-ROUTE-1, then MOMENT-PROTECT-1,
then HARD STOP for the real vendor trial / demo feedback loop.
