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
| 6. Post-fix re-score #2 (2026-07-15) | 4 NEW re-scorers vs 21b964a; proofs executed against the real engines | **3/5/3/6.** All wave-5 fixes CONFIRMED again — and the deeper layer they exposed scored worse than the shallower one they fixed: registry raises carry no leadDays (closed-window decisions snoozable again, one seam over), heroes are snooze-blind, no record-keyed dedup (3 food choices = 4 cards), 20 flat cards at T-1 is not triage; the stored-timeline schema (`offsetDays` + 19-key TitleCase) is unreadable by taskLead, converting "uniformly dead" into a live four-way disagreement; the NOW chip shipped for accessibility itself fails AA (3.76:1). |

Every wave-4 confirmed break is fixed (`639c3e8` + the four-agent parallel batch, landed and
live-verified in the running app: reconciliation counts agree with the queue on two events,
risk raises land on the focused row, calm fillers vanish beside real work, the T-72h
reconfirm raises per-vendor into the ranked list, and the shell banner no longer counts
informal helpers). Full suite: 197 suites / 2,874 tests. The lesson held four times:
**a green suite is not a working app, and a commit message is a claim.**

## The scoreboard

| Dimension | Leader | W1 | W2 claim | W4 | W5 | **W6 re-score** | What set the W6 score (lowest sub-dim wins) |
|---|---|---|---|---|---|---|---|
| Ranking | Linear triage / Superhuman | 3 | 7 | 5 | 4 | **3** | Wave-5 mechanics all confirmed on the ladder path — but registry raises carry NO leadDays, so closed-window decisions are snoozable again one seam over (proven: 4 past-window decisions offered "back Jul 20"); heroes read the pre-snooze head (snooze the #1 and the V1 spine keeps naming it); no record-keyed dedup (the 3 open food choices render as 4 cards); and a T-1 event is 20 flat same-band cards — volume the coverage win bought and triage never paid for. |
| Coverage | Linear inbox / Asana rollup | 3 | 6 | 5 | 4 | **5** | The one riser: ~18/20 producers now feed the ledger, badges consume raiseCounts(), the completeness test locks the exact bug class. Capped by routability: the helpers supply-class raise routes to a focusField no sheet handles (opens the wrong sheet silently), vendorSection is write-only, the completeness regex can be OR-bypassed, and reply-by dates pass silently before event day. |
| Over time | Things 3 / Google Calendar | 3 | 7 | 5 | 5 | **3** | The hard drop, and it is fair: stored timeline rows carry `offsetDays` + a 19-key TitleCase vocabulary taskLead cannot read, and CommandCenter keeps an 11-key subset mirror — so fixing ChecklistGenerator converted "all four surfaces agree on 0" into a live FOUR-WAY disagreement (checklist says "N need a look"; Plan-tab badge, hero, and day-of alert say nothing). TimelineBuilder's grid hides the entire T-3w→T-2d crunch band. Date-boundary work confirmed solid (7). |
| Visual | Slack badges / Apple HIG | 4 | 7 | 6 | 6 | **6** | Hold, net-neutral batch: ambers repaid and NOW/WATCH grayscale tiers real — but the NOW chip itself fails AA (3.76:1, danger-on-band; theme.js's 4.78:1 comment does not reproduce), the critical headline fails too (~4.18:1) — the more urgent, the less legible; NOW/WATCH is a 9th vocabulary; `tag plan` now means lens-identity AND recolorable status in one classname; lodging shows two amber numbers counting different things. |
| Hero intuitiveness | Things 3 home | — | — | 4 | 4 | **4** | Unchanged — **HOST CALL PENDING**: one status + one action; worries split out of the count; the reconciliation sentence deleted, not improved. The wave-6 volume finding (20 flat cards) makes this call MORE urgent, not less. |

W6 verification: every wave-5 fix survived the refute pass again; the re-scorers executed
their proofs against the real engines (esbuild probes of eventPlan/snooze on the shipped
fixtures), and the sharpest claims were live-verified in Chrome — the 20-card flat T-1
queue, the duplicate food-decision cards, and the split-brain snooze (V2's NEXT tile
updates; the milestone line and V1 heroes keep speaking the set-aside item).

The pattern across six waves is now unmistakable: every fix wave is CONFIRMED by the next
adversarial pass, and every adversarial pass finds the same bug classes one layer deeper.
The classes themselves are stable: identity (keys from text instead of records), policy
forks (N readers of one truth), and enforcement gaps (conventions instead of gates). 10+
is not more per-finding patches — it is closing those three classes structurally.

## W6's confirmed findings (the next fix queue — structural, not per-finding)

The three stable bug classes, with wave-6's instances:

**Identity (keys from text instead of records):**
- HIGH — registry itemKey falls back to titleKey for decisionId/guestId/focusField routes; a
  count-bearing title ("2 confirmed guests still need seats") mints a new snooze id every
  time the count moves. Key every action on the underlying record, all producers.
- HIGH — no record-level dedup between phaseProgress and the decisions surface: the same 3
  open food choices render as "Decide what you're serving · 3 open" PLUS 3 "Resolve …"
  cards. Dedup by record, not phrasing.

**Policy forks (N readers of one truth):**
- HIGH — registry raises carry no leadDays → the closed-window snooze refusal binds only on
  the ladder path (proven: 4 past-window decisions offered "back Jul 20"). Thread the
  board's own daysOut onto registry raises.
- HIGH — heroes are snooze-blind: selectEventNextAction and planningState read the
  unfiltered head. Apply snooze inside eventPlan so every reader sees one post-snooze truth.
- HIGH — taskLead cannot read the STORED timeline schema (`offsetDays` + 19-key TitleCase);
  CommandCenter keeps an 11-key subset mirror; App.js:1873 keeps a third policy. One
  exported overdue policy; make taskLead read `offsetDays` + the full vocabulary (or persist
  leadDays at both stored-timeline seams); parity test: checklist count == tab badge ==
  hero == dayAlerts on one seeded event.
- HIGH — TimelineBuilder places rows by string equality against 11 columns → the whole
  T-3w→T-2d crunch band is invisible in grid and mobile. Place by numeric lead.

**Enforcement gaps (conventions instead of gates):**
- HIGH — helpers supply-class raise routes to focusField 'space', which no sheet handles →
  wrong-sheet landing from a ranked CTA. Add the routeSheet branch + a test resolving EVERY
  registry route through the real routeSheet to sheet-kind + focus, not truthiness.
- MED — completeness regex is OR-bypassable (no end anchor); badge `n:` props unenforced.
- MED — NOW chip 3.76:1 and critical headline ~4.18:1 fail AA (theme.js's 4.78:1 comment
  does not reproduce) — fix danger-on-dark, add the pairs to the contrast test.
- MED — `tag plan` classname carries lens-identity AND recolorable status; split them.
- MED — aggregate-raise badges ("1") sit beside domain counts ("3 of 8") — one number per
  row, the risks row's own stated rule.
- Volume (host call adjacent): a T-1 event renders 20 flat same-band cards. Leader-grade
  triage bundles ("Reconfirm 3 vendors"), caps with "+N more", and orders band-1 by
  time-to-window. This intersects the pending hero redesign — one design pass, not two.

## What "10+" concretely requires now

**Buildable, no permission needed** (all traced to W5 findings — status as of `21b964a`,
2026-07-15, all live-verified in Chrome dev; scores move only on the next refute-me pass):
1. ✅ SHIPPED — Snooze integrity: per-item top-action ids, `leadDays` through six ladder
   tiers, overdue-decision top demoted to attention (cap binds; window-closed refuses —
   verified on 6 overdue decisions), calm fillers unsnoozeable, one #1 everywhere.
2. ✅ SHIPPED — Registry as the gate: 8 bypass producers registered (seating, lodging,
   travel-air/ground, helpers, per-item decisions/payments/COI; payment shadowing fixed),
   qidx tints + count badges read `raiseCounts()`, completeness test fails CI on any new
   hand-wired `attn:` boolean.
3. ✅ SHIPPED — Time bypasses: ChecklistGenerator + TimelineBuilder on taskLead (overdue
   fires there for the first time), lib/dateChips.js kills the UTC day-shifters, Extend
   local + capped at event−1d, milestones local, second T-Nd parser retired.
4. ✅ SHIPPED — Lens mapping: plain domains end-to-end; the Vendors and Guests lenses now
   exist and the #1 vendor critical files with its peers.
5. ⏳ REMAINING — one severity vocabulary across 8 chip families (own pass; day-of NOW/WATCH
   form tiers and the 4 amber repayments DID ship); dock badges (deliberate restraint —
   dock is navigation); aging escalation; TimelineBuilder grid placement still TitleCase
   (badges correct, playbook rows don't render as grid rows — follow-up defect, noted).

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
