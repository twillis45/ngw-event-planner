# Master Audit — every score, one document, the road to 10+

**Date:** 2026-07-14 (compiled end of day) · **Method:** house 10+ rule throughout — score
against a NAMED leader, dimension score = its LOWEST sub-dimension, every claim file:line,
verified against the running app. Findings inherited from a prior audit are never evidence;
this doc compiles FOUR audit waves, each of which re-derived (and repeatedly overturned)
the one before it.

## The four waves

| Wave | Who | What it found |
|---|---|---|
| 1. Attention audit (morning) | 4 parallel auditors vs Linear/Slack/Things/Asana | 3/3/3/4. "The engine that KNEW was not the engine that SPOKE." |
| 2. Fix sprint + recompute | this session | One ledger, real lead times, registry, snooze, criticals wired. Self-recomputed 7/6/7/7. |
| 3. Host board (afternoon) | everyday host, info-design, trust, planner pro, Grandmother, first-timer | Hero intuitiveness **4/10** — four competing "what's left" totals; "the app doing math at me." Ruling: never fold risks into the area denominator; a worry is not a chore. |
| 4. Fresh-eyes re-audit (evening, model change) | 4 adversarial re-auditors told to REFUTE wave 2 | **5/5/5/6 — wave 2's recompute was GENEROUS.** Criticals were snoozeable (dropped `level`), calm filler outranked criticals, one-raise-per-surface, derived hours leaked into 7 outward drafts, two jumbo-bushel counts, "one reader" claims false in two places. |
| 5. Post-fix re-score (night) | 4 NEW adversarial re-scorers vs 9a92d90; score-critical findings live-verified in Chrome | **4/4/5/6.** Every wave-4 fix CONFIRMED in code + tests — and lowest-sub-dimension scoring then bit on what the fixes sat next to: snooze's lead cap never binds where "not now" renders, the top action snoozes by CATEGORY, four qidx producers bypass the ledger, two legacy surfaces still run the dead PHASE_OFFSET gate, day-of alert tiers are hue-only. |

Every wave-4 confirmed break is fixed (`639c3e8` + the four-agent parallel batch, landed and
live-verified in the running app: reconciliation counts agree with the queue on two events,
risk raises land on the focused row, calm fillers vanish beside real work, the T-72h
reconfirm raises per-vendor into the ranked list, and the shell banner no longer counts
informal helpers). Full suite: 197 suites / 2,874 tests. The lesson held four times:
**a green suite is not a working app, and a commit message is a claim.**

## The scoreboard

| Dimension | Leader | W1 | W2 claim | W4 re-score | **W5 re-score** | What set the W5 score (lowest sub-dim wins) |
|---|---|---|---|---|---|---|
| Ranking | Linear triage / Superhuman | 3 | 7 | 5 (generous) | **4** | Ordering/calm/dedup are leader-shaped now — but snooze semantics scored 4: the lead cap never binds where "not now" renders (only unsnoozeable criticals carry `leadDays`), the top action snoozes by CATEGORY (snoozing "Confirm the DJ" later hides "Confirm the caterer"), and App.js heroes still read the pre-sort #1. |
| Coverage | Linear inbox / Asana rollup | 3 | 6 | 5 | **4** | Fix batch fully confirmed; score set by enforcement (4): the registry is a convention, not a gate — seating/lodging/flight/ride qidx rows are live hand-wired `attn` booleans whose dated deadlines never reach the list — and `raiseCounts()` still has zero badge consumers (4). Registry raises also vanish under a Vendors lens that doesn't even render (live-verified). |
| Over time | Things 3 / Google Calendar | 3 | 7 | 5 | **5** | taskLead chain verified end-to-end (author→persist→seed→rank→label) — but ChecklistGenerator + TimelineBuilder still run the dead TitleCase PHASE_OFFSET gate (never-overdue), legacy App.js keeps after-8pm UTC day-shifters (weekend chips, Extend writer), and hero-vs-board overdue policy forks (same task, two truths). |
| Visual | Slack badges / Apple HIG | 4 | 7 | 6 | **6** | Amber repayments + AA contrast all confirmed (muted-on-band genuinely closed). Held at 6 by: day-of alert tiers hue-only (critical ≈ warning in grayscale), 8 distinct status vocabularies with no unified scale, zero badge consumers. 4 minor amber drifts remain (sweep "drafting…", 3 identification tags). |
| Hero intuitiveness | Things 3 home | — | — | 4 (host board) | **4** | Unchanged — **HOST CALL PENDING**: one status + one action; worries split out of the count; the reconciliation sentence deleted, not improved. |

W5 verification: every wave-4 fix survived the refute pass (code + 23–90 targeted tests per
dimension); the score-critical NEW findings were live-verified in Chrome dev — the missing
Vendors lens on a vendor-heavy event, the pure half-runway "back Jul 25" snooze proposal on
a 22-day runway, the amber seating row beside a queue that never mentions seating.

## W5's confirmed new findings (the fix queue for the next round)

**Ranking (4):**
- HIGH — thread real `leadDays` + stable per-item ids through EVERY snoozeable action; top-action
  snooze id must come from the underlying record, not its category.
- MED — one #1 everywhere: `selectEventNextAction` must return the band-sorted head.
- LOW — registry domains (`surface:*`) need DOMAIN_LENS mapping; the lone calm filler shouldn't offer "not now".

**Coverage (4):**
- HIGH — register the bypass producers (seating, lodging, air, ground, helpers, per-item decisions,
  per-item COI/payments) and derive qidx tints FROM the ledger; add a completeness test so a new
  `attn:` boolean fails CI.
- MED — one-slot ladder producers shadow each other (two overdue payments → one card, or none).
- MED — ship `raiseCounts()` badges (dock/sections/lenses). LOW — reply-by passing has no producer;
  helper confirms never raise.

**Over time (5):**
- HIGH — kill the last two PHASE_OFFSET bypasses (ChecklistGenerator, TimelineBuilder); replace
  `today8601`/Extend writer UTC math with local ISO; cap Extend at the event date.
- MED — ONE overdue policy: fold compression forgiveness into taskLead so hero, board, labels,
  and alerts can never disagree. MED — milestones dueDate still UTC-sliced (UTC+ zones shift a day).

**Visual (6):**
- MED — encode day-of alert tier in form (tier word or 3px bar, the sweepcard pattern).
- LOW — last ambers: "drafting…" → `--progress`; day-of/diet/needs tags → neutral; one 4-level
  severity scale (calm/watch/needs-you/critical) across all 8 chip families.

## What "10+" concretely requires now

**Buildable, no permission needed** (all now traced to W5 findings, priority order):
1. Snooze integrity (Ranking's cap): per-item top-action ids + `leadDays` on every snoozeable
   action — the two HIGH bugs above are the same fix.
2. Registry as the *enforced* gate + the bypass producers registered + qidx tints derived
   from the ledger + a completeness test.
3. The last time bypasses: PHASE_OFFSET stragglers, legacy UTC day-shifters, one overdue
   policy.
4. `raiseCounts()` badges + `surface:*` lens mapping (fixes Ranking F-D and Coverage F-C at once).
5. One severity vocabulary + day-of tier form encoding; aging: an item untouched for N× its
   half-runway quietly escalates its `why`.

**Host calls (blocked on you):**
1. **The hero redesign** — the board's unanimous prescription: one status line, one next
   action, worries split into a heads-up lane, count = open areas only. Biggest single
   score move on the table (4 → leader-grade).
2. **Snooze custom date** — allow "pick a day" alongside the grounded proposal? (Doctrine
   note: the proposal must stay the default; a raw picker invites past-window snoozes.)
3. **Guest contact at RSVP** (makes the chase actionable) — data-model + privacy call.

**Gated (keys/infra, from the Launch-Gate punch list):** reminders channel (push/VAPID or
SendGrid/Twilio) — over-time is capped ~8 without it; receipt-OCR/voice parse endpoint;
AT + pentest passes; commerce go-live flag. These are the same seven gates as the
Launch-Gate artifact; nothing in this wave changed them.

## Standing invariants (now test-locked)

1. A presence predicate may never license a completion claim.
2. Zero may never read as done; unknown is not passing; missing data is not a risk.
3. A number is not single-sourced until the tokens derived from it are too.
4. An audit finding is not evidence — verify against the running thing.
5. A derived value is OURS until the host confirms it; it never leaves the app.
6. A worry is not a chore; calm filler is never counted as an ask.
7. Every raise routes to a row; a raise you cannot act on is not raised.
