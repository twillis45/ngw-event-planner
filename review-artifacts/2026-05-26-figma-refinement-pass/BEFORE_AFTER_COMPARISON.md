# BEFORE vs AFTER — Figma Refinement Pass

Sprint 12 runtime screenshots = BEFORE.
Sprint 13 Figma concepts = AFTER.

For each surface, the structural change is described; the visual confirmation lives in the listed PNGs.

## 1. Command layer (top toolbar)

| | Before (Sprint 12 runtime) | After (Sprint 13 concept) |
|---|---|---|
| Visual | `02_desktop_density/03_density_nominal_1440.png` — top reads `DEMO DRIVER · Trigger 3 cascading delays · Cycle Catering · Cycle Florist · Cycle AV · Cycle Photo · Resolve all · Reset` | `07_command_layer/01_command_progression_4states.png` — top reads `LIVE · Hartwell Wedding · 13:45` + mode chips |
| Energy | Dev-tool / Storybook | Operational command console |
| Severity awareness | None — same toolbar at every state | Channels narrow with severity (3 chips → 2 → SMS RESERVED → VOICE HELD) |
| What was removed | "Trigger / Cycle / Reset" debug verbs | All of them |
| What was preserved | The ability for operators to drive state | (it doesn't — sessions now use URL state init `?state=cascade` etc) |

## 2. Center escalation surface — density

| | Before | After |
|---|---|---|
| Visual | `02_desktop_density/04_density_cascade_1280.png` — title + message + action | `01_orchestration/01_cascade_refined_1440.png` — title + message + 3-row concentration block + action |
| Cognitive density | Low — operator must invent the context | High — LAST OUTREACH, ESCALATION CONTACT, CASCADE RADIUS visible inline |
| New cards added | n/a | 0 — refinement is typographic, not structural |
| Reads as | Card with one big sentence | Operational intervention record |

## 3. Emergency surface — containment

| | Before | After |
|---|---|---|
| Visual | `02_desktop_density/07_density_emergency_1440.png` — full red plane fills the center surface | `02_escalation/01_emergency_refined_1440.png` — panel surface with thin red ring; deep red ONLY at cascade-radius box and the action |
| Red coverage | ~70% of center column | ~15% of center column (focused) |
| Pressure | Environmental wallpaper | Focused intervention pressure |
| Negative space | Compressed under red field | Dominant — silence around the action |
| Risk addressed | Red-as-wallpaper desensitization | Each red surface still feels significant |

## 4. Right thread rail — parallel cognition

| | Before | After |
|---|---|---|
| Visual | `02_desktop_density/04_density_cascade_1280.png` — right rail shows `Catering` and `Floral Co.` (one-line cards) | `01_orchestration/01_cascade_refined_1440.png` — each thread carries elapsed badge + last-action + trajectory strip + comm-lock |
| Information per card | 1 line (name) | 4 rows of forensic state |
| Operator can answer "what's happening on the other threads?" | partially | yes |
| Stays compressed | yes | yes |
| Stays actionless | yes | yes (no inline buttons, still awareness-only) |

## 5. Left context rail — temporal awareness

| | Before | After |
|---|---|---|
| Visual | `02_desktop_density/04_density_cascade_1280.png` — EVENT block + MODE block + VENDOR STATUS | `01_orchestration/01_cascade_refined_1440.png` — adds OPERATIONAL DRIFT (12-cell strip) + RECENT MEMORY whisper |
| Felt aliveness | Static record | Subtle rhythm (drift accumulating) |
| Animation introduced | n/a | None — the rhythm is visual, not motion |
| Memory introduced | n/a | One whisper line: "Last Hartwell-class event saw AV escalate at +90min." |

## 6. Whispers — psychological weight

| | Before | After |
|---|---|---|
| Visual | `03_debrief_surface/01_debrief_overview_1440.png` — "Whispers" reads as one card among four | `03_debrief/01_debrief_refined_1440.png` — ink-plane, thin gold side-mark, 14pt Medium body, meta tag per whisper |
| Reads as | Card | Section that matters |
| Theatrics added | n/a | None — no animation, no color hierarchy beyond a single gold accent |
| Information density | Same | Same content, more gravity |

## 7. Friction Review — anti-analytics

| | Before | After |
|---|---|---|
| Visual | `03_debrief_surface/01_debrief_overview_1440.png` — bars in default warning color when over 3s | `03_debrief/01_debrief_refined_1440.png` — bars are stone-coloured by default; only the slowest is warning-coloured |
| Risk addressed | BI-dashboard rhythm | Forensic observation |
| Footer added | n/a | "Note: no grade assigned. >3 s is worth investigating; not a score." |
| Behavior change | n/a | None — same hesitation values, just less chart-energy |

## 8. Debrief timeline — temporal texture

| | Before | After |
|---|---|---|
| Visual | `03_debrief_surface/01_debrief_overview_1440.png` — every row identical weight | `03_debrief/01_debrief_refined_1440.png` — pivots bold + left mark + larger dot; nominal entries blur |
| Memory shape | Even reconstruction | Asymmetric (matches how real memory works) |
| Pivot moments | Equal to nominal | Visually elevated |
| Silence rules | n/a | Thin separators between groups |

## 9. Mobile emergency

| | Before | After |
|---|---|---|
| Visual | `01_vendor_slice/10_vendor_emergency_390.png` (runtime) — works, contained, calm | `05_mobile/01_mobile_emergency_390.png` (concept) — adds cascade-radius fact box (deep red, focused) + command-layer indicator |
| Doctrine | Full-width CTA, mobile-correct | Same — full-width preserved; concept adds the focused-fact pattern from desktop |

## 10. Tablet portrait — orchestration consolidation

| | Before | After |
|---|---|---|
| Visual | (no runtime tablet-portrait capture under cascade) | `06_tablet/01_tablet_critical_768.png` — left rail collapses to inline header strip with drift indicator preserved |
| Two-pane | yes | yes |
| Temporal awareness preserved | unknown at this viewport | yes (drift strip stays) |
| Stretched-phone feel | risk | avoided |

## Aggregate

| Metric | Sprint 12 (runtime) | Sprint 13 (Figma concepts) |
|---|---|---|
| Surface count | 3 slices live | Same 3 surfaces refined |
| New components introduced | n/a | 0 — all refinements use existing primitives |
| New tokens introduced | n/a | 2 colors only (`emergDeep`, `whisperGold`) — both within Studio Matte restraint |
| New layout patterns | n/a | 0 — all refinements live inside existing grids |
| Doctrine pages added | 0 | 0 (refinement is application, not new doctrine) |
| SaaS-drift surface area | small | smaller (drift-attractor list explicitly documented) |
| Operator cognition assistance | structural only | structural + temporal + memory + parallel-thread richness |
