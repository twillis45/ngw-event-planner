# Figma Frames — Sprint 60.I + 60.J Mobile Design Pass

PNGs exported from Figma file `CYlmJqDCXEaacCuz9wW3bd` (NGW Events — Operational Design System), page `Sprint 60.I — Mobile Hero States` (node `840:2`). All frames are 390×844 (iPhone 14 viewport).

Built during Sprints 60.I + 60.J as design references for the Mobile 10+ pass. Used to inform the React implementation in `src/App.js` and `src/plan/VendorPlanningWorkspace.jsx`.

## Frames

| File | Figma node | Surface / state |
|---|---|---|
| `frame_01_home_empty.png` | `840:3` | Mobile Home — empty / new user (CTA: "Plan your first event") |
| `frame_02_home_sample.png` | `841:2` | Mobile Home — sample data loaded (CTA: "Open sample event") |
| `frame_03_home_attention.png` | `841:12` | Mobile Home — critical attention (red accent, "Open Todd & Sarah's Wedding") |
| `frame_04_home_today.png` | `842:2` | Mobile Home — event today (amber LIVE badge, "Go to Day-of view") |
| `frame_05_home_multiple_calm.png` | `842:15` | Mobile Home — multiple events, all-clear (green tag, "Open next event") |
| `frame_06_pipeline_mobile.png` | `847:2` | Mobile Pipeline with dual-label chips (friendly + canonical tag) |
| `frame_08_vendor_detail.png` | `848:2` | Mobile Vendor detail — refined `MobileVendorSummary` + collapsed sections preview |
| `frame_09_dayof_right_now.png` | `849:2` | Day-of "Right now" — amber LIVE badge + plain-language headers |
| `frame_11_documents_empty.png` | `851:2` | Documents empty + attention — reusable `EmptyStateCard` pattern |

## Typography baseline (mobile 390)

- Hero tag: 11.5px Bold
- Hero h2 title: 24px Bold
- Hero subtitle: 14.5px Regular
- Primary CTA: 15px Bold (46px tall)
- Secondary CTA: 14px Medium

## Color discipline (Studio Matte Carbon)

- Page bg: `#070809` (canonical `matte['050']`)
- Carbon surface: `#121518` (canonical `matte['150']`)
- Border: `#1c2026` (canonical `matte['250']`)
- Steel text muted: `#849eb8` (canonical `steel['400']`)
- Amber: `#d4904a` (needs attention)
- Red: `#9a3a3a` (critical / blocked)
- Green: `#3a8a62` (ready / paid)
- Accent: steel blue `#1a6fba`

## What's already implemented from these frames

- Frame 1 / 2 / 5 hero states map to `selectStudioCommand` Tier 8 neutral
- Frame 3 hero state maps to `selectStudioCommand` Tier 1 critical
- Frame 6 mobile Pipeline dual-label landed in 60.J (`src/App.js` `LaneColumn` mobile branch)
- Frame 8 vendor cockpit `MobileVendorSummary` shipped in 60.H; "Files & contract" rename in 60.J
- Frame 11 reusable `EmptyStateCard` shipped in 60.K (Documents + Guests)

## What's NOT yet implemented

- Frames 4 / 9 — Day-of dedicated hero strip in `DayTaskView`
- Frame 11 — 5 more `EmptyStateCard` callsites (Vendors / Budget / Notes / Communication / Pipeline lane)
- Cross-frame: `ReadinessSnapshot` challenge-chip typography pass

See PR #1 for the full code progression Sprint 60.A–K.
