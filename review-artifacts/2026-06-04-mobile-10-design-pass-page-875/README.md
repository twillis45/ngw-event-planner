# Mobile 10+ Design Pass — Full Page Export (875:2)

Exported from Figma file `CYlmJqDCXEaacCuz9wW3bd` (NGW Events — Operational Design System), page **`875:2 — "SPRINT 60.I — Mobile 10+ Design Pass"`**. All frames are 390×844 (iPhone 14 viewport).

This page is the canonical design pass for the mobile 10+ work that informed Sprints 60.I → 60.K. 28 frames across 5 sections.

## Section 0 — Grandmother Journey (5 frames)

Non-planner can plan a birthday, graduation, or reunion. Every screen answers: *Where am I? What needs my attention? What do I tap next? How do I get back?*

| File | Figma node | Surface |
|---|---|---|
| `gj1_home_tap_your_event.png` | `877:6` | Home — Tap your event |
| `gj2_event_command_center.png` | `877:40` | Your event — Command center |
| `gj3_people_vendors_guests.png` | `877:81` | People — Vendors and guests |
| `gj4_money_payments.png` | `877:126` | Money — Payments |
| `gj5_complete_action_mark_paid.png` | `877:161` | Complete one action — Mark paid |

## Section 1 — Mobile Home Hero States (6 frames)

6 states of the Home screen from empty to fully loaded.

| File | Figma node | Surface |
|---|---|---|
| `f1_home_no_events.png` | `860:2` | No events |
| `f2_home_sample_data.png` | `863:2` | Sample data |
| `f3_home_needs_attention.png` | `863:43` | Needs attention |
| `f4_home_event_today.png` | `863:93` | Event today |
| `f5_home_multiple_events.png` | `865:2` | Multiple events |
| `f6_home_all_clear.png` | `865:58` | All clear |

## Section 2 — Mobile Workflow Screens (10 frames)

F7-F16: Pipeline, vendors, day-of mode, documents, budget, event details, new event.

| File | Figma node | Surface |
|---|---|---|
| `f7_pipeline.png` | `865:98` | Pipeline |
| `f8_vendor_list.png` | `866:2` | Vendor list |
| `f9_vendor_detail.png` | `866:91` | Vendor detail |
| `f10_dayof_right_now.png` | `866:150` | Day-of — Right now |
| `f11_dayof_whos_arriving.png` | `867:2` | Day-of — Who's arriving |
| `f12_documents_empty.png` | `867:83` | Documents — Empty |
| `f13_documents_attention.png` | `867:138` | Documents — Attention |
| `f14_budget_payments.png` | `868:2` | Budget — Payments |
| `f15_event_details_venue.png` | `868:91` | Event Details — Venue |
| `f16_new_event_starter_kit.png` | `868:153` | New Event — Starter Kit |

## Section 4 — Refined Screens (v2, 3 frames)

Improved hierarchy, plain language, grandmother-readable type scale.

| File | Figma node | Surface |
|---|---|---|
| `fh_v2_home_hero_event_loaded.png` | `880:6` | Home Hero — Event loaded |
| `fp_v2_pipeline_plain_language.png` | `880:43` | Pipeline — Plain language |
| `fv_v2_vendor_detail_fix_first.png` | `880:86` | Vendor detail — Fix first |

## Section 5 — Day-of Mode Screens (4 frames)

Plain screen titles. Real-time arrivals, schedule progress, team messages.

| File | Figma node | Surface |
|---|---|---|
| `dof1_right_now.png` | `882:6` | Right now |
| `dof2_whos_arriving.png` | `882:58` | Who's arriving |
| `dof3_todays_schedule.png` | `882:126` | Today's schedule |
| `dof4_messages.png` | `882:189` | Messages (audited + partly implemented in Sprint 60.K-figma) |

## Sections not exported

The page also contains 3 documentation/notes sections (Section 3 — Mobile Design Notes, Section 6 — EmptyStateCard System, Section 7 — Engineering Handoff Notes). Those are rectangle + text annotations, not designed screens, so they're not exported as PNGs. See the Figma file directly for those notes.

## What's implemented from this page in code

| Figma → Code | Status |
|---|---|
| F1 / F2 / F5 / F6 (Home hero states) | Implemented via `selectStudioCommand` tiers + StudioCommandPanel typography (60.I + K) |
| F3 (Critical attention) | Implemented — matches Tier 1 critical output |
| F4 (Today's event) | Partial — LIVE badge not yet in code |
| F7 / FP-v2 (Pipeline plain language) | Implemented as dual-label chips (60.J) |
| F9 / FV-v2 (Vendor detail Fix-first) | Implemented as MobileVendorSummary (60.H) + Files & contract rename (60.J) |
| F10 (Day-of Right now) | Friendly header hint (60.H); dedicated hero strip not yet |
| F12 (Documents empty) | Implemented as EmptyStateCard (60.K) |
| F14 (Budget) | Carry from 59C SoT lock + 60.B section-focus; no new |
| DOF4 (Messages) | Implemented as LegacyTabHeader hint on Day-of Communication (60.K-figma) |

## What's NOT yet in code

- F4 LIVE badge on Today's event hero
- F8 Vendor list "Start with X" callout treatment
- F11 / DOF2 grouped arrival statuses ("Already here / On the way / Late / No arrival time yet")
- F13 Documents attention row visual hierarchy
- F15 Event Details / Venue field icons
- F16 New Event Starter Kit copy ("Wedding Timeline · 14 of 14 tasks" → "We'll add 14 wedding planning tasks for you")
- EmptyStateCard callsites for Vendors / Budget / Notes / Communication / Pipeline-lane (5 of 7 surfaces remain)
- Section 3 — Mobile Design Notes annotations
- Section 6 — EmptyStateCard System spec annotations
- Section 7 — Engineering Handoff Notes

See PR #1 for the full code progression Sprint 60.A–K-figma.
