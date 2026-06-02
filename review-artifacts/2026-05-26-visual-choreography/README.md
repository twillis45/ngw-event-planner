# Sprint 23 — Visual Choreography + Spatial Orchestration

Critical course correction sprint. The doctrine is strategically correct. The UI still feels too rigid, too assembled, too rectangular, too grid-obedient. This sprint transforms Planner OS from "premium operational software" into "spatial orchestration system."

## What this is

This is NOT a feature sprint. This is NOT analytics expansion. This is the creation of a visual choreography language — transforming how layouts feel from "assembled" to "orchestrated." Users should feel timing, movement, compression, release, pacing, and flow without consciously noticing why.

## Critical philosophy

The product should feel like:
- backstage movement at a luxury hotel
- fashion show orchestration
- film production sequencing
- gallery installation planning
- editorial wall pacing
- architectural review environments

NOT:
- productivity software
- business dashboards
- analytics systems
- workflow management tools

## Core design shift

STOP thinking in: cards, rows, columns, widgets, panels.
START thinking in: orchestration corridors, timing lanes, sequencing flow, visual tension, compression zones, release zones, directional movement.

## Figma pages created

| Page | Content |
|---|---|
| `58_Visual_Choreography_Doctrine` | Full doctrine: 7 sections (A-G) + expanded refusal doctrine |
| `59_Visual_Choreography_Surfaces` | 12 structured exploration surfaces |

### Doctrine sections (page 58)

- **A. Visual Choreography Doctrine** — 8 choreography systems (orchestration corridors, timing lanes, sequencing flow, visual tension, compression zones, release zones, directional movement, visual rhythm) + forbidden patterns callout
- **B. Spatial Cadence Doctrine** — 6 cadence domains (tight zones, breathing zones, pacing acceleration, visual decompression, staggered groupings, asymmetric hierarchy)
- **C. Orchestration Rhythm Doctrine** — 4 rhythm systems (rhythm variation, temporal stagger, layered depth, directional momentum) + musical score mental model
- **D. Compression / Release Systems** — 6 compression/release mechanisms (spacing, typography, border, layering — each with compression and release variants)
- **E. Hospitality Pacing Doctrine** — 6 hospitality targets (backstage movement, fashion show, film production, gallery installation, editorial wall, architectural review) + anti-target callout
- **F. Editorial Composition Doctrine** — 4 composition systems (asymmetric balance, intentional negative space, controlled tension, composed surfaces)
- **G. Mobile Orchestration Doctrine** — 6 mobile patterns (directional flow, glance-state chips, orchestration folding, progressive reveal, touch rhythm, field instrument feel) + anti-pattern callout

### Exploration surfaces (page 59)

| Surface | Viewport | Layout | Choreography principle |
|---|---|---|---|
| `01_Spatial_Orchestration_Desktop_1440` | 1440×900 | Asymmetric 3-zone (180/flex/360): narrow context rail + breathing center + wider timeline | Compression/release rhythm, staggered ribbon widths, variable spacing |
| `02_Layered_Topology_Desktop_1440` | 1440×900 | Thin event bar + asymmetric 3-zone (200/flex/240): vendor lanes + ribbon canvas + dependencies | Layered depth, directional momentum, temporal density strips |
| `03_Timing_Compression_Desktop_1440` | 1440×900 | Full-width: day rhythm strip + density lanes + pressure reading + fragile transitions | Spatial cadence in layout, variable-width phase blocks, density visualization |
| `04_Sequence_Choreography_Desktop_1440` | 1440×900 | Asymmetric 2-zone (900/540): connected sequence flow + handoff detail | Temporal stagger via variable connector weights, compression zone indication |
| `05_Asymmetric_Orchestration_Desktop_1440` | 1440×900 | Asymmetric 2-zone (880/560): dominant left field + structured right | Staggered ribbon widths (560/480/400), editorial negative space, receded nominal |
| `06_Hospitality_Pacing_Desktop_1440` | 1440×900 | Coordination header + left-heavy (960/480): phase blocks + area status | Backstage movement feel, variable density per phase, compressed freeze zone |
| `07_Editorial_Wall_Desktop_1440` | 1440×900 | Editorial header + asymmetric grid: large primary card + smaller cards + right column | Magazine-like pacing, dominant/subordinate card hierarchy, editorial composition |
| `08_Rapid_Orchestration_Tablet_1024` | 1024×768 | Asymmetric 2-zone (160/flex): narrow nav + orchestration flow with staggered ribbons | Compressed choreography, variable ribbon widths, inline sequence strip |
| `09_Walking_Coordination_Tablet_1024` | 1024×768 | Single column: NOW/NEXT cards + vendor chips + upcoming sequence | Progressive reveal, temporal hierarchy, field coordination pacing |
| `10_Orchestration_Flow_Mobile_390` | 390×844 | Single column: identity + readiness chips + outstanding + compressed sequence | Directional temporal flow, compression/release between sections, variable timeline spacing |
| `11_Progressive_Reveal_Mobile_390` | 390×844 | Single column: dominant NOW + medium NEXT + compressed AFTER + rest-of-day + glance strip | Progressive size reduction, temporal distance = visual receding, glance-state chips |
| `12_Field_Instrument_Mobile_390` | 390×844 | Status bar + coordination area: active attention card + confirmed list + next milestone | Luxury field instrument feel, action-oriented composition, compressed coordination |

## Visual choreography systems introduced

- **Orchestration Corridors** — flowing bands that guide the eye through temporal sequences (replaces rigid panels)
- **Timing Lanes** — horizontal bands where width communicates available margin, stacking communicates congestion
- **Compression Zones** — areas where spacing tightens, typography intensifies, borders accent — pressure made visible
- **Release Zones** — breathing spaces after compression — wider margins, lighter type, calmer rhythm
- **Staggered Ribbons** — outstanding items at different widths (560/480/400px) creating visual rhythm instead of uniform cards
- **Asymmetric Balance** — left-heavy layouts (880/560, 900/540, 960/480) instead of centered/symmetric
- **Directional Movement** — eye follows orchestration flow left-to-right or top-to-bottom through temporal sequence
- **Visual Rhythm** — alternating tight/breathing zones create cadence — the layout has tempo, not just structure

## Compression / release mechanisms

| Mechanism | Compression | Release |
|---|---|---|
| Spacing | 3-6px gaps between elements | 24-32px margins, intentional silence |
| Typography | Semi Bold → Bold weight increase | Regular weight, smaller size, lower contrast |
| Borders | Left-border accents (amber/teal) | No accents, reduced border visibility |
| Layering | Stacked ribbons, adjacent cards, tight strips | Single element, generous surrounding space |
| Density | Multiple overlapping activities | Receded nominal state, opacity reduction |
| Information | Full detail, vendor names, status | Summary only, "all confirmed" compression |

## Specific problems addressed

| Problem | Before | After |
|---|---|---|
| Card repetition | Identical dark rectangles in uniform grids | Staggered widths (560/480/400), variable accent colors, rhythm variation |
| Spatial rhythm | Even spacing everywhere | Tight zones (3-6px) + breathing zones (24-32px), layout has tempo |
| Inert center panels | Large dark box with text | Directional flow, compression/release zones, layered orchestration |
| Rectangular obedience | Perfect grid alignment | Asymmetric rail widths, staggered items, editorial composition |
| Mobile collapsed desktop | Desktop cards stacked vertically | NOW/NEXT/AFTER progressive reveal, field instrument feel, directional temporal flow |

## Asymmetric layout proportions (breaking grid symmetry)

| Surface | Left | Center | Right | Traditional would be |
|---|---|---|---|---|
| 01 Spatial Orchestration | 180px | flex | 360px | 280/flex/280 |
| 02 Layered Topology | 200px | flex | 240px | 320/flex/320 |
| 04 Sequence Choreography | 900px | — | 540px | 720/720 |
| 05 Asymmetric Orchestration | 880px | — | 560px | 720/720 |
| 06 Hospitality Pacing | 960px | — | 480px | 720/720 |

## Mobile orchestration patterns (NOT stacked desktop)

- **Surface 10 (Orchestration Flow)**: Directional temporal flow — sequence spacing compresses as ceremony approaches (12px → 8px → 4px → 3px → 8px)
- **Surface 11 (Progressive Reveal)**: NOW is dominant (large, teal border, full detail). NEXT is medium. AFTER is compressed + opacity reduced. Rest-of-day is text-only list.
- **Surface 12 (Field Instrument)**: Status bar + active attention card with call/message actions + compressed confirmed list. Not a phone app — a coordination instrument.

## Drift risks

1. **Card drift** — Staggered ribbons could become uniform cards again. The variable widths ARE the choreography.
2. **Grid drift** — Asymmetric layouts could snap back to centered/symmetric. The imbalance IS the editorial composition.
3. **Even-spacing drift** — Compression/release zones could become uniform padding. The variable spacing IS the temporal rhythm.
4. **Dashboard drift** — Editorial wall could become KPI tiles. It shows orchestration needs, not metrics.
5. **Calendar drift** — Sequence choreography could become a scheduling UI. It shows handoff fragility, not available slots.
6. **Mobile drift** — Progressive reveal could become stacked cards. The size reduction IS the temporal distance encoding.
7. **Symmetry drift** — Rail widths could equalize. The narrow context rail (180px) IS intentional — context recedes, orchestration dominates.
8. **Enterprise drift** — Hospitality pacing could become project management. The phase blocks show coordination movement, not task status.

## Enterprise drift analysis

| Pattern | Risk level | Mitigation |
|---|---|---|
| Staggered ribbons → uniform cards | HIGH | Ribbons have intentionally different widths. If they equalize, choreography dies. |
| Asymmetric rails → centered layout | HIGH | Rail proportions (180/360, 200/240) are compositional decisions, not accidents. |
| Compression zones → even spacing | MEDIUM | Variable spacing (3px → 32px) encodes temporal rhythm. Uniformity kills pacing. |
| Phase blocks → Gantt chart | HIGH | Phase blocks have no progress bars, no dates as swimlanes. They show movement, not status. |
| NOW/NEXT → notification cards | LOW | NOW/NEXT shows orchestration context, not alerts. Size encodes temporal priority. |
| Editorial wall → KPI dashboard | MEDIUM | Primary card is editorially composed, not a metric tile. No percentages. |

## Cognitive-load analysis

| Surface | Information density | Scan time | Cognitive model |
|---|---|---|---|
| Spatial Orchestration | MEDIUM — 3 outstanding + readiness + timeline | 3-5s for shape, 15s for detail | Musical score — compression/release zones guide the eye |
| Layered Topology | HIGH — 6 vendor lanes + ruler + dependencies | 5-10s for topology shape | Production timeline — density strips show where vendors overlap |
| Timing Compression | HIGH — rhythm strip + 6 density lanes + fragile transitions | 3-5s for rhythm, 20s for fragile spots | Tempo map — dense zones = pressure |
| Sequence Choreography | MEDIUM — temporal sequence + handoff detail | 5s following the connector flow | Call sheet — time flows top to bottom, each line is a cue |
| Asymmetric Orchestration | LOW-MEDIUM — staggered items + timeline | 3s for outstanding, 10s for timeline | Editorial page — dominant items surface, context recedes |
| Hospitality Pacing | MEDIUM — 6 phase blocks + 4 area cards | 5s for phase rhythm, 15s for coordination | Backstage call — phases flow, status is spatial |
| Editorial Wall | LOW — primary event + 2 secondary + pressure column | 2-3s for portfolio shape | Magazine spread — editorial hierarchy guides reading |
| Mobile Progressive Reveal | LOW — NOW/NEXT/AFTER | <2s glance | Progressive reveal — what matters right now at the top |
| Mobile Field Instrument | LOW — 1 active card + compressed lists | <2s for action needed | Stage manager calling script — what needs you NOW |

## What was intentionally refused

1. Charts / graphs / trend lines / sparklines / axes of any kind
2. KPI tiles / scorecards / metric grids / gauges / progress bars
3. Dashboards / executive surfaces / BI views / analytics panels
4. AI summaries / predictive widgets / smart insights / copilot
5. Gantt charts / kanban boards / project management patterns
6. CRM / pipeline / deal tracking / funnel views / lead scoring
7. Traffic lights / RAG status / stoplight indicators / health scores
8. Flowcharts / org charts / mind maps / node diagrams
9. Rigid uniform grid systems / identical card repetition
10. Enterprise admin UI / startup SaaS patterns / productivity tools
11. Even spacing everywhere / symmetrical layouts / centered everything
12. Generic responsive patterns / stacked desktop for mobile
13. UI-kit assembled appearance / component-library aesthetics
14. Corporate presentation styling / slide-deck layouts

## Screenshots

| File | Content |
|---|---|
| `01_doctrine_page_58.png` | Full Visual Choreography Doctrine (page 58) |
| `02_spatial_orchestration_desktop_1440.png` | Spatial orchestration with compression/release — desktop asymmetric 3-zone |
| `03_layered_topology_desktop_1440.png` | Layered topology with vendor ribbon lanes — desktop asymmetric 3-zone |
| `04_timing_compression_desktop_1440.png` | Timing compression with day rhythm + density lanes — desktop full-width |
| `05_sequence_choreography_desktop_1440.png` | Sequence choreography with temporal flow — desktop asymmetric 2-zone |
| `06_asymmetric_orchestration_desktop_1440.png` | Asymmetric orchestration with staggered ribbons — desktop 2-zone |
| `07_hospitality_pacing_desktop_1440.png` | Hospitality pacing with phase blocks — desktop left-heavy |
| `08_editorial_wall_desktop_1440.png` | Editorial wall with portfolio composition — desktop editorial grid |
| `09_rapid_orchestration_tablet_1024.png` | Rapid orchestration with compressed flow — tablet 2-zone |
| `10_walking_coordination_tablet_1024.png` | Walking coordination NOW/NEXT — tablet single column |
| `11_orchestration_flow_mobile_390.png` | Orchestration flow with directional sequence — mobile |
| `12_progressive_reveal_mobile_390.png` | Progressive reveal NOW/NEXT/AFTER — mobile |
| `13_field_instrument_mobile_390.png` | Field instrument with action cards — mobile |

## What is NOT validated

- No real planner has reviewed these surfaces. All content is synthetic.
- The choreography principles (compression/release, asymmetric balance, staggered ribbons) are hypotheses.
- Whether staggered ribbon widths actually communicate priority better than uniform cards is unknown.
- Whether asymmetric layouts feel "intentional" or "broken" requires real user feedback.
- The hospitality pacing metaphor has not been tested with planners who work in luxury hospitality.
- Mobile field instrument feel has not been tested with planners during live events.
- None of these surfaces exist in code yet. They are Figma explorations.

## Honest read

This sprint attacks the single biggest remaining aesthetic gap: the layouts feel assembled, not orchestrated. The key innovations are: (1) compression/release zones — tight 3-6px spacing in pressure areas, generous 24-32px breathing in release areas — giving the layout temporal rhythm; (2) staggered ribbon widths — outstanding items at 560/480/400px instead of uniform cards — creating visual hierarchy through width variation; (3) asymmetric rail proportions — 180/flex/360 instead of 280/flex/280 — context rail narrows, orchestration dominates; (4) variable timeline spacing — ceremony-approach spacing compresses from 12px to 3px, then releases after ceremony. Whether these feel "orchestrated" rather than "broken" to real planners is the open question. The risk is real: asymmetry can feel intentional or accidental, and there is no way to know which without field sessions. The mobile surfaces genuinely break from stacked-desktop — the progressive reveal (NOW large, NEXT medium, AFTER compressed) and field instrument patterns are mobile-native choreography, not responsive compromises. But whether a planner walking backstage at an event actually wants a "field instrument" instead of "quick info" is unknown.

## Also rebuilt in this sprint

- **Page 52 (Planner OS Doctrine)** — 8 sections (A-H) rebuilt due to Figma Plugin API persistence issue
- **Page 53 (Planner OS Explorations)** — 4 surfaces rebuilt due to same persistence issue
