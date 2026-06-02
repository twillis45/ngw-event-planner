# Sprint 24 — Contextual Polish Systems

Critical evolution sprint. The polish is strategically correct. The problem is NOT bad polish. The problem IS uniform polish — everything behaves too consistently. This sprint transforms Planner OS polish from "applied uniformly" to "responsive to orchestration context."

## What this is

This is NOT visual design iteration. This is NOT theming. This is the creation of a contextual polish system — where corners, borders, weights, spacing, and opacity respond to orchestration state. The UI should feel different when calm vs. under pressure, and the difference should be encoded in the polish itself, not in color alone.

## Critical philosophy

Polish should encode orchestration state:
- **Pre-event calm**: Wide margins, soft corners (8px), faint borders (0.5px), Regular weight, warm canvas
- **Building awareness**: Tighter spacing, medium corners (6px), visible borders (1px), Medium weight, amber accents
- **Compressed urgency**: Tight spacing (3-4px), sharp corners (2px), strong borders (1.5-2px), Bold weight, cool canvas
- **Ceremony stillness**: Minimal corners (0px), single-element focus, reduced information, spatial silence
- **Reflective release**: Generous spacing (32px+), soft corners (10px), fading borders (0.5px, low opacity), Regular weight, warm canvas

NOT:
- Uniform border-radius everywhere
- Consistent font weight across all states
- Even spacing regardless of pressure
- Same border treatment for calm and urgent items
- Identical containment for all orchestration contexts

## Figma pages created

| Page | Content |
|---|---|
| `60_Contextual_Polish_Doctrine` | Full doctrine: 10 sections (A-J) |
| `61_Contextual_Polish_Surfaces` | 11 structured exploration surfaces |

### Doctrine sections (page 60)

- **A. Contextual Polish Doctrine** — Core principle: polish varies with orchestration context. 6 emotional cadence phases with specific design parameters.
- **B. Emotional Cadence Framework** — Maps timing states (pre-event, day-before, event-day, ceremony, post-event) to specific corner radius, border weight, font weight, spacing, and canvas warmth values.
- **C. Spatial Rhythm Framework** — Variable spacing system: compression zones (3-6px) for urgency, breathing zones (24-32px) for calm, silence zones (48-64px) for post-event reflection.
- **D. Containment Variation System** — How card/frame containment changes: sharp + strong borders under pressure, soft + faint borders in calm, fading borders in release.
- **E. Typography Pacing** — Font weight as pressure indicator: Regular for calm, Medium for building, Semi Bold for active, Bold for urgent. Size variation encodes temporal priority.
- **F. Hierarchy Surge Analysis** — Momentary spike where one element demands attention through scale, weight, spatial, and border changes, then layout returns to resting rhythm.
- **G. Embedded Control Systems** — Actions at point of orchestration need: inline confirmation, sequence-docked actions, contextual mounts. Controls appear only when timing warrants.
- **H. Mobile Orchestration Polish** — Mobile-native polish patterns: progressive reveal with polish encoding temporal distance, field instrument feel with compressed urgency, release state with warm/soft treatment.
- **I. Drift Risk Analysis** — 8 drift risks identified with mitigation strategies.
- **J. Refusal Doctrine** — 14 categories of explicitly refused patterns.

### Exploration surfaces (page 61)

| Surface | Viewport | Emotional Phase | Polish Signature |
|---|---|---|---|
| `01_Anticipatory_Calm_Desktop_1440` | 1440 | Pre-event (3 days out) | 8px corners, 0.5px borders, Regular weight, 28px spacing, warm canvas #0a0b0c |
| `02_Building_Awareness_Desktop_1440` | 1440 | Day-before | 6px corners, 1px borders, Medium weight, 16px spacing, amber accents on priority items |
| `03_Compressed_Urgency_Desktop_1440` | 1440 | Event day pressure | 2px corners, 1.5-2px borders, Bold weight, 4px spacing, cool canvas #060708, hierarchy surge |
| `04_Reflective_Release_Desktop_1440` | 1440 | Post-event | 10px corners, 0.5px borders at 50% opacity, Regular weight, 32-48px spacing, warm canvas #0b0c0d |
| `05_Hierarchy_Surge_Desktop_1440` | 1440 | Surge demonstration | Normal items at 560/480/400px widths → SURGE item breaks to 700px with 2px amber border + Bold |
| `06_Embedded_Controls_Desktop_1440` | 1440 | Control patterns | 3 patterns: inline confirmation, sequence-docked action, contextual mount |
| `07_Orchestration_Pacing_Tablet_1024` | 1024 | Mixed phases | Single view showing urgency/building/calm zones stacked — polish varies within one screen |
| `08_Compressed_Coordination_Tablet_1024` | 1024 | Event day + surge | Walking/standing context — hierarchy surge with sequence timeline + detail panel |
| `09_Cadence_Reveal_Mobile_390` | 390 | Progressive reveal | NOW (urgency polish) → NEXT (building polish) → AFTER (calm polish) → REST (fading polish) |
| `10_Compressed_Urgency_Mobile_390` | 390 | Full urgency | Everything compressed: 2px corners, Bold weight, 4px gaps, strong borders, red pulse indicator |
| `11_Field_Instrument_Release_Mobile_390` | 390 | Post-event release | Warm canvas, 10px corners, 0.5px fading borders, 50% opacity vendors, silence zone, soft debrief |

## Contextual polish parameters

| Phase | Canvas | Corner Radius | Border Weight | Border Opacity | Font Weight | Item Spacing | Feeling |
|---|---|---|---|---|---|---|---|
| Anticipatory Calm | #0a0b0c (warm) | 8px | 0.5px | 100% | Regular | 20-28px | Unhurried, spacious |
| Building Awareness | #070809 (standard) | 6px | 1px | 100% | Medium | 10-16px | Focused, preparing |
| Compressed Urgency | #060708 (cool) | 2px | 1.5-2px | 100% | Bold | 3-4px | Tight, decisive |
| Ceremony Stillness | #070809 | 0px | 0px | 0% | Regular | 0px | Silent, singular |
| Reflective Release | #0b0c0d (warm) | 10px | 0.5px | 40-50% | Regular | 20-32px | Decompressing, soft |

## Hierarchy surge mechanics

A hierarchy surge is a momentary spike where one element demands attention through simultaneous changes:

| Dimension | Resting State | Surge State | Return |
|---|---|---|---|
| Width | 560px (staggered) | 700px (dominant) | 480px → 400px (receding) |
| Corner Radius | 6px | 2px (sharp) | 6px → 8px (softening) |
| Border Weight | 0.5px | 2px (strong) | 0.5px |
| Border Color | #1e2530 (neutral) | #d9a94e (amber) | #1e2530 |
| Font Weight | Regular | Bold | Regular |
| Spacing Before | 8px | 20px (breathing room) | 8px |

The surge creates visual disruption that resolves — the layout has a heartbeat, not a flatline.

## Embedded control patterns

| Pattern | When | How | Polish |
|---|---|---|---|
| Inline Confirmation | Immediate decision needed | Confirm/Skip buttons within the card | Urgent polish: amber border, action-colored buttons |
| Sequence-Docked | Action tied to timeline position | Button docked to the sequence row | Appears only on active/problematic sequence items |
| Contextual Mount | Timing-dependent action | Control surfaces when orchestration context warrants | Soft polish: teal border, appears 45 min before relevant moment |

## Specific problems addressed

| Problem | Before | After |
|---|---|---|
| Uniform corners | 6px everywhere | 2px (urgent) → 6px (building) → 8px (calm) → 10px (release) |
| Consistent borders | 1px everywhere | 2px (urgent) → 1px (building) → 0.5px (calm) → 0.5px/40% (release) |
| Same font weight | Medium everywhere | Bold (urgent) → Medium (building) → Regular (calm/release) |
| Even spacing | 12px everywhere | 4px (urgent) → 12px (building) → 24px (calm) → 48px (silence zones) |
| Static containment | Same card treatment | Sharp/strong cards under pressure, soft/faint cards in calm, fading in release |
| Actions disconnected | Separate action panels | Inline confirmation, sequence-docked, contextual mount at point of need |

## Mobile contextual polish (NOT uniform mobile)

- **Surface 09 (Cadence Reveal)**: NOW zone uses urgency polish (2px corners, 2px amber border, Bold). NEXT uses building polish (6px corners, 1px border, Medium). AFTER uses calm polish (text-only, 45% opacity). REST is barely visible (20% opacity). Polish IS the temporal distance encoding.
- **Surface 10 (Compressed Urgency)**: Full urgency state — everything sharp (2px), Bold, compressed (4px gaps), strong borders (2px). Red pulse indicator. This is what mobile looks like when everything is happening now.
- **Surface 11 (Field Instrument Release)**: Post-event — warm canvas, 10px soft corners, vendor list at 55% opacity, silence zone (empty 36px frame), debrief prompt at 40% opacity. The UI is exhaling.

## Drift risks

| Pattern | Risk Level | Mitigation |
|---|---|---|
| Uniform corners returning | HIGH | Corner radius MUST vary by phase: 2/6/8/10px. If everything is 6px, contextual polish is dead. |
| Consistent border weight | HIGH | Border weight encodes pressure. 2px = urgent, 0.5px = calm. Uniformity kills the signal. |
| Same font weight everywhere | MEDIUM | Bold is reserved for urgency. If everything is Medium, there's no weight-based hierarchy surge. |
| Even spacing throughout | HIGH | 4px vs 48px is the difference between compressed urgency and reflective silence. Uniform 12px kills both. |
| Surge becoming permanent | MEDIUM | Hierarchy surge is momentary — one item surges, the rest stay resting. If everything surges, nothing does. |
| Embedded controls always visible | LOW | Contextual mount pattern: controls appear only when timing warrants. Permanent controls = toolbar, not orchestration. |
| Release state looking broken | MEDIUM | Fading borders and reduced opacity ARE intentional — they encode decompression, not neglect. |
| Mobile defaulting to desktop patterns | HIGH | Mobile has its own polish vocabulary: progressive cadence reveal, field instrument compression, release breathing. |

## What was intentionally refused

1. CSS effects / shadows / glow / glassmorphism / blur
2. Gradients / color transitions / spectrum treatments
3. Decorative motion / animation / transition effects
4. Visual noise / texture / pattern overlays
5. Trendy aesthetic patterns / neumorphism / bento grids
6. Uniform border-radius across all states
7. Consistent font weight regardless of pressure
8. Even spacing everywhere
9. Charts / graphs / dashboards / KPI tiles
10. AI summaries / predictive widgets / smart insights
11. Gantt charts / kanban boards / project management patterns
12. Traffic lights / RAG status indicators
13. Enterprise admin UI / startup SaaS patterns
14. Themed color variations / dark/light mode switching

## Cognitive-load analysis

| Surface | Information Density | Scan Time | Why Polish Matters |
|---|---|---|---|
| Anticipatory Calm | LOW | 3-5s | Wide spacing + Regular weight = "nothing is urgent, browse at will" |
| Building Awareness | MEDIUM | 5-8s | Amber accents + Medium weight = "things are happening, pay attention to these" |
| Compressed Urgency | HIGH | 2-3s for surge | Bold + 2px borders + tight spacing = "act now, this item demands attention" |
| Reflective Release | LOW | 5s then done | Fading borders + reduced opacity = "it's over, decompress, nothing needs you" |
| Hierarchy Surge | MEDIUM with spike | 1s for surge item | Scale + weight + border change = instant attention capture then return to rhythm |
| Mobile Cadence | LOW per section | <2s for NOW | Progressive polish reduction = "this is what matters, this is next, this is later" |

## What is NOT validated

- No real planner has reviewed these surfaces. All content is synthetic.
- Whether corner radius variation actually communicates urgency vs. calm is a hypothesis.
- Whether border weight changes are perceptible at 0.5px vs. 1px vs. 2px on actual screens is unknown.
- Whether font weight variation (Regular vs. Bold) reads as "pressure level" or just "emphasis" needs testing.
- Whether variable spacing feels "orchestrated" or "inconsistent" requires field sessions.
- The hierarchy surge concept — whether a momentary scale/weight spike then return to resting rhythm actually guides attention — is untested.
- Embedded controls (inline confirmation, sequence-docked, contextual mount) have not been tested with planners during live events.
- The post-event release state (fading borders, silence zones, debrief prompt) may feel "broken" rather than "decompressing."

## Honest read

This sprint attacks the next aesthetic gap after choreography: uniform polish. The key insight is that corners, borders, weights, and spacing are not decorative — they're orchestration signals. A 2px corner with a 2px amber border MEANS something different than an 8px corner with a 0.5px faint border. The risk is real: subtle polish variation can read as "inconsistent design" rather than "contextual intelligence." Users might not consciously parse "this card has 2px corners because it's urgent" — they might just think "these cards look different for no reason." The hierarchy surge concept is the most novel and risky: a single item temporarily breaking the visual rhythm through scale + weight + border change. If it works, it creates the attention-capture equivalent of a stage manager's voice cutting through backstage chatter. If it doesn't, it looks like a layout bug. The embedded controls are the most practically valuable: actions at point of need instead of separate action panels. But whether planners want inline confirmation during a ceremony sequence — or whether that adds cognitive load at the worst possible moment — is unknown. The mobile surfaces are genuinely contextual: Surface 09 shows four different polish treatments in a single scroll, encoding temporal distance through visual polish alone. Whether a planner walking backstage actually registers "this section has softer corners so it's less urgent" is the open question.

## Screenshots

| File | Content |
|---|---|
| `01_doctrine_page_60.png` | Full Contextual Polish Doctrine (page 60) |
| `02_anticipatory_calm_desktop_1440.png` | Pre-event calm: wide margins, 8px corners, 0.5px borders — desktop |
| `03_building_awareness_desktop_1440.png` | Day-before: tighter, amber accents, Medium weight — desktop |
| `04_compressed_urgency_desktop_1440.png` | Event day: 2px corners, Bold, 2px borders, hierarchy surge — desktop |
| `05_reflective_release_desktop_1440.png` | Post-event: 10px corners, fading borders, silence zones — desktop |
| `06_hierarchy_surge_desktop_1440.png` | Surge mechanics: 560→700→480→400px staggered with weight/border variation — desktop |
| `07_embedded_controls_desktop_1440.png` | Three control patterns: inline, sequence-docked, contextual mount — desktop |
| `08_orchestration_pacing_tablet_1024.png` | Mixed phases in single view: urgency/building/calm zones — tablet |
| `09_compressed_coordination_tablet_1024.png` | Event day surge with sequence timeline + detail panel — tablet |
| `10_cadence_reveal_mobile_390.png` | NOW/NEXT/AFTER/REST with progressive polish reduction — mobile |
| `11_compressed_urgency_mobile_390.png` | Full urgency: compressed, Bold, sharp corners, red pulse — mobile |
| `12_field_instrument_release_mobile_390.png` | Post-event release: warm, soft, fading, silence zone — mobile |
