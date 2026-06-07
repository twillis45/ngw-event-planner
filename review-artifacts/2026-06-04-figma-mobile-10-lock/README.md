# NGW MOBILE 10+ LOCK — Figma source of truth

Figma file: `CYlmJqDCXEaacCuz9wW3bd`
Page: **`NGW MOBILE 10+ LOCK`** (`898:2`) — created Sprint 60.L Figma pass.

This page consolidates the existing working frames on pages
`Sprint 60.I — Mobile Hero States` (`840:2`, 9 frames) and
`SPRINT 60.I — Mobile 10+ Design Pass` (`875:2`, 28 frames)
into a single production lock with:

- Locked design tokens (colors / typography / spacing / touch targets)
- Engineering mapping (App.js / VendorPlanningWorkspace.jsx anchors)
- Scorecard with verdict per dimension
- ACCEPT / MODIFY / REJECT / MISSING audit table over all 28 existing frames
- New locked frames for the 3 surfaces that didn't exist (Event Home / Budget / Empty State System)

## Frames on the lock page

| File | Figma node | Surface | Purpose |
|---|---|---|---|
| `01_tokens_handoff.png` | `898:3` | Section 12 — Tokens & Handoff | Carbon palette, typography, spacing, engineering mapping |
| `02_scorecard.png` | `899:2` | Mobile Scorecard (Sprint 60.L) | 20 dimensions scored 1–10, overall 8.2/10, STAY DRAFT verdict |
| (audit table) | `900:2` | Frame Audit | ACCEPT/MODIFY/REJECT/MISSING for all 28 existing frames on `875:2` |
| `03_s2_event_home_390.png` | `903:2` | S2 — Event Home / Command (mobile 390) | Locked event command center with LIVE pill + 6-card work grid |
| `04_s6_budget_390.png` | `904:2` | S6 — Budget / Payments (mobile 390) | Locked budget with totals + grouped payment rows (Overdue/Due/Paid) |
| `05_s10_empty_state_system.png` | `905:2` | S10 — Empty State System | Component anatomy + 7 wired callsites |

## What's NOT on the lock page (and where to find it)

The 28 existing frames on page `875:2` and 9 frames on `840:2` are not duplicated here.
The audit table classifies each as ACCEPT (locked as-is), MODIFY (small update needed to
match shipped code), or MISSING (built on this page).

### MODIFY frames — code is shipped, Figma frame should be refreshed in a future pass

| Frame | Node | What changed in code (Sprint 60.L) |
|---|---|---|
| F4 Event today | `863:93` | LIVE chip + "Enter Day-of mode" CTA |
| F8 Vendor list | `866:2` | "Start with X" callout typography bump |
| F13 Documents attention | `867:138` | Amber-tinted "Needs attention" banner |
| DOF2 Who's arriving | `882:58` | Grouped sections: Late / On site / En route / Coming up |
| F15 Event Details venue | `868:91` | Heads-up callout + Call/Email/Maps quick actions |
| F16 New Event Starter Kit | `868:153` | "What we'll set up for you" + "We'll add N tasks" copy |

These can be refreshed in a follow-up Figma pass; the code is authoritative.

## How to use this lock page

1. **Engineering implementing a surface** — open the audit table (`900:2`), find the
   surface, follow the node link to the locked Figma frame, implement against it.
2. **Designer iterating on a screen** — work in `875:2` or this page; if the change
   should be locked, update both this lock and the audit table verdict.
3. **PM checking readiness** — open the scorecard (`899:2`).
