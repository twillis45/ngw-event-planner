# DOCTRINE PRESERVATION REPORT

Every doctrine layer the refinement pass could have eroded — and how it was held.

## Locked doctrines verified intact

| Doctrine | Source | Refinement pressure | Preservation result |
|---|---|---|---|
| Studio Matte restraint | Figma 42 + foundational palette | Whispers risked drifting decorative; emergency risked saturation | Whispers use ONE accent (whisperGold) only; emergency reduced its red footprint instead of expanding it |
| Heavier-not-wider containment | Figma 44 | New chrome added (concentration block, trajectory strips) could have expanded primaries | Primary widths unchanged (280 / 360 / 160); mass-via-density added via interior typography |
| Single P1 per surface | Figma 13, 14, 29 | Multiple new surface elements could have competed for primacy | Concentration block uses keyline-level type (9pt caps), thread cards stay actionless, command layer uses ink plane below P1 |
| Locked motion matrix (310/230/200/360) | `src/design/motion.js` | Tempting to animate the drift strip or whispers | Zero motion added anywhere. Drift strip is static. Whispers do not fade in. |
| No glow / pulse / gradient | Multiple doctrine pages | Easy escape valve for "make the red more urgent" | Red footprint REDUCED (containment); no gradient on any new surface; pressure ring is solid 1px stroke |
| Density collapse (severity rises → interface gets quieter) | Figma 30 | Adding richness to threads risks getting LOUDER under stress | At emergency, thread cards COMPRESS to 2 lines (no trajectory strip at emergency tier) |
| Forensic > analytical | Figma 11 | Friction review at risk of BI drift | Bars desaturated to stone; explicit "no grade" footer; whisper count tags read as forensic metadata, not scores |
| Memory is instrument, not museum | Figma 11 | Temporal weighting could turn into "highlights reel" theatrics | Pivots get type weight + left mark only; no animation, no callouts, no "key moment" badges |
| Three-zone spatial command | Figma 16, 26 | Adding richness could spill across zones | All refinements live INSIDE existing zones; no new zones added |
| No SaaS drift | Multiple | Largest pressure here — every refinement is one design choice from a SaaS attractor | Explicit drift-attractor table in REVIEW_REPORT.md §3 documents what was rejected |

## Doctrines reinforced (not just preserved)

| Doctrine | How this pass reinforced it |
|---|---|
| Channel narrowing under stress | Command layer now visualizes channel reservation (`SMS RESERVED` → `VOICE HELD`), making the page-07 doctrine visible at the orchestration level |
| Cascade radius as first-class operational entity | Page-08 doctrine ("affects: ceremony, dinner") moves from doctrine text to visible field in the escalation surface AND in mobile/tablet variants |
| Operational memory exists to change the next decision | Whisper section's visual elevation makes the doctrine self-evident in the interface |
| Emergency = focused pressure | Reduction of red footprint is the literal embodiment of "heavier, not wider" carried into color, not just width |

## What I refused to do (drift attractors I felt and rejected)

| Attractor | Why I felt it | What I did instead |
|---|---|---|
| "Add a small sparkline to the drift strip showing trend" | Felt like a natural data visualization | Kept 12 raw cells; trend lives in the cells themselves |
| "Show a confidence score on each whisper" | Felt useful to give operators a 'how certain are we' | Cut entirely — whispers are factual recall, not predictions |
| "Make the emergency action button glow subtly" | Felt urgent | Doubled down on negative space around it instead |
| "Add a 'view details' link on each thread card" | Felt incomplete without it | Thread cards stay actionless; clicking the card promotes (existing behavior) |
| "Show the operator's average response time on debrief" | Felt like useful self-knowledge | Cut — that's a score by another name |
| "Animate the whisper in with a soft fade" | Felt cinematic | Zero motion; the gravity is typographic |
| "Add color to the friction bars matching severity" | Felt informationally efficient | Stone only — severity is in the timeline, not in friction |

## Doctrines unchanged (intentionally untouched)

- React component architecture
- Backend tenancy model (Studios → Members → operational data)
- Runtime slice scope (vendor / desktop-density / debrief)
- Color tokens beyond two minor additions
- Spacing scale
- Type scale
- Animation timing curves
- Button primitive
- Surface primitive
- Operator gestures / keyboard shortcuts
- Observer instrumentation

## Verdict

**No doctrine eroded. Two doctrines (channel narrowing, cascade radius) became more visible at the orchestration level. The system is more refined and more disciplined than before this pass.**

## How to spot drift in future sprints

If a future sprint touches these surfaces, watch for:
1. Trajectory strip gains numerical scale ticks → BI drift
2. Whispers gain "AI" or "Suggestion" prefix → operational-trust violation
3. Drift strip gains hover tooltip with timestamps → dashboard drift
4. Cascade-radius box gains a "view affected" link → CRM drift
5. Command layer gains icons or avatars → app-nav drift
6. Friction bars gain percentile / "you're in the top X%" → gamification
7. Emergency red surface grows back beyond 15% of center column → wallpaper drift
8. Thread card gains an inline reply input → notification-center drift

Hold the line. Every one of these would be doctrine violation.
