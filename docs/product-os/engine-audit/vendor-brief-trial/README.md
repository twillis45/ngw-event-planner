# Vendor Brief Trial Packet (TENPLUS-2)

Purpose: collect the real-usage evidence that decides whether Vendor Brief +
Vendor Confirmation earn their 10+ candidate upgrade. The product is built and
deployed; this trial tests whether it changes real coordination behavior.
Parent plan: [../VENDOR_BRIEF_10PLUS_PROOF_PLAN.md](../VENDOR_BRIEF_10PLUS_PROOF_PLAN.md).

## Pass/fail threshold

- **Pass:** ≥80% of trial rows pass, with **ZERO privacy issues** and **ZERO
  manual workarounds**, across **≥3 vendor categories**, with **both**
  response paths (confirmed AND issue) exercised at least once each.
- One privacy leak fails the entire trial regardless of every other number,
  and triggers a fatal-flaw review. Leaks are never averaged away.
- Stand-in runs count at reduced weight (see TRIAL_SCORECARD.md).

## How to run the trial

1. Open the app with demo tools armed (`?demo=1` once; the toolbar persists).
2. Seed the flagship demo event (Seed demo event = delete + reseed → fresh
   brief codes, zero confirmation rows). Add up to 2 more disposable events
   if you want variety. Never use a real event or the protected Oxon Hill
   Manor link.
3. For each vendor (5–10 total): open the vendor's cockpit row → copy the
   brief link.
4. Send the link using the matching message in VENDOR_TRIAL_SCRIPT.md, over
   the channel that vendor actually uses (SMS/email).
5. Watch silently. Record what happens in EVIDENCE_TRACKER.csv — one row per
   vendor run.
6. When the response lands, open the cockpit, apply the offered action(s),
   and screenshot before/after.
7. Score the trial with TRIAL_SCORECARD.md, then fill
   POST_TRIAL_REVIEW_TEMPLATE.md.

## What NOT to coach

- Do not explain what the page is, what the button does, or what "confirm"
  means. Comprehension without explanation IS the test.
- Do not pre-open the link to "check it works." Fresh open on their device.
- Only intervene if the vendor is fully blocked — and when you do, record
  exactly where they got stuck as the confusion point, and mark
  `understood_without_help = no`.

## Privacy failure rule

If a vendor sees ANY of: budget numbers, other vendors' names or costs, the
guest list, internal/planner notes, AR/fee data — mark `privacy_issue = yes`,
capture a screenshot, stop the trial, and file it as a repair slice. This is
an automatic overall FAIL.

## Screenshots / logging checklist (per run)

- [ ] Vendor's view of the brief (their device if possible)
- [ ] The confirm/issue form as they saw it
- [ ] Cockpit confirmation row BEFORE host action
- [ ] Cockpit row AFTER action (button cleared, status/log updated)
- [ ] Note the log source in the tracker (server confirmation row, vendor
      log entry, Decision Memory record)

## What counts as pass / fail (per row)

A row PASSES only if all are true: opened without help · understood without
help · responded without login or coaching · host action offered, taken, and
self-cleared · state and readiness/action surface updated · no privacy issue ·
no manual workaround. Anything else is a FAIL with the reason recorded — a
failed row is evidence too, not an embarrassment to hide.
