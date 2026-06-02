# 04_threads — refinement evidence

Thread-rail refinements are captured INSIDE the orchestration screenshots
(richer cards visible at the right of `01_orchestration/01_cascade_refined_1440.png`).
The refinements are structural — adding an elapsed badge, last-action row,
trajectory strip, and comm-lock state per card — so they cannot be sensibly
isolated from the surface they live on.

## Refinements (target #3)
- **Elapsed badge** (top-right of card) — `+25m`, `+12m` in stone caps; how long the
  thread has been off-nominal.
- **LAST ACTION row** — channel + timestamp + read-state. Forensic, not chatty.
- **TRAJECTORY strip** — 6 micro-cells reading green → amber → red, with a
  one-word verdict (`holding` / `worsening`). Operator sees direction at a glance.
- **COMM LOCK row** — `sms · open`, `voice channel reserved`. Tells the operator
  which channel is being held for this thread.

## What was rejected
- ❌ Severity-tinted card backgrounds (turns the rail into Jira)
- ❌ Inline action buttons (rail must stay actionless / awareness only)
- ❌ Numeric scores or status percentages (analytics theater)
- ❌ Vendor logos / avatars (CRM drift)
- ❌ Drag-handles (kanban drift)

Result: richer parallel cognition, same quiet posture.
