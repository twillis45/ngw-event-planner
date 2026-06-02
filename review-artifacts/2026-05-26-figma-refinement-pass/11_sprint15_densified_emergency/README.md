# Sprint 15 — Emergency Densification + Recovery (page 48)

**Figma page:** `48_Sprint15_Emergency_Densification`
**Master frame:** `280:3` · height 3035
**Refines:** page 47 emergency state (which produced a "hero void" after solving the hero-card problem)

## Files
| File | What it shows |
|---|---|
| `01_densified_emergency_1440.png` | New emergency state — burdened with 12 procedural traces, no widgets, no graphs, no glow |
| `02_recovery_1440.png` | Post-emergency state — silent decompression with residue |

## Densified emergency — what was added

| Trace | Where it lives | Operational function |
|---|---|---|
| Escalation lineage | Top of center, 4 timestamped severity steps with mono `→` arrows | Operator sees the climb without asking "how did this happen" |
| Containment band | Below title, 3 columns (cascade radius · authority · containment age) | Replaces single fact box with 3 forensic dimensions in one row |
| Operational residue log | Below containment band, 5 timestamped traces (`PROMOTED` / `REFUSED` / `SUPPRESSED` / `INHERITED` / `LOCKED`) | Operator reads what the system has already done · no scrolling |
| Spine tick marks | 5 hairline ticks at 120px intervals on the bleed-spine | Spine becomes architecture, not a stripe |
| Empty dock label | `· EMPTY DOCK ·` placeholder at the right of the trench | Operator understands command slots exist; spine is dockable |
| F-key codes | `F1` / `F2` mono marks under each command label | Hard-mounted keyboard parity; refuses app-button feel |
| Authority badges | `OPERATOR` / `SYSTEM` tags per command | Page 46 authority taxonomy made visible per-button |
| Override / strike | `AV-08-OPR` with strikethrough + `· OVRD` tag | Shows withdrawn operator authority; subtle, not glitch |
| Suppressed-fields footer | 3 strikethrough field names at bottom of left rail | Tells operator what's hidden without showing it |
| Missing-cell skip | One `textHard` cell in the drift strip | Shows degradation under pressure |
| Thread lock suffix | `· lck` next to each thread code | Threads are not just compressed — they are procedurally locked |
| Command trench | Recessed channel with hard-mounted buttons, no gaps | Primary action is MOUNTED INTO the environment, not floating |

## What was reduced

- Title scale **64pt → 44pt** (declared, not advertised)
- Spacing collapsed throughout — title to subtitle 16 → 6 · subtitle to fact band 32 → 16
- Bleed-spine gains procedural ticks (was: plain stripe)
- Containment fact box swelled from 1 fact to 3 forensic columns
- Center vertical breathing room replaced by residue log

## Recovery state — quiet decompression

- Bleed-spine **removed** — replaced by a 1px residual hairline
- Drift strip cells where emergency occurred become **`okDim`** (recovered but visibly different)
- Title is "All clear" at 28pt — quiet, not celebratory
- Vendor PRD-04 carries a permanent `post-incident` mark
- Vendors that escalated get `· recovered` mark
- Right thread track shows `REC` / `POST` suffixes per thread
- Incident summary panel holds 5 timestamped forensic lines
- Footer: `· residue holds in drift strip · vendor PRD-04 carries post-incident mark · debrief available at /slice=debrief`
- Authority indicator: `OPERATOR · 14 LIVE · CONTAINED 14:42` (system released, but contained time persists)

## What was refused

- Real-time graphs / sparklines / charts
- Animated severity transitions
- Glowing overlays · neon · scanlines · noise
- Toast notifications (events live in the residue panel)
- "AI insights" / recommended actions
- Saturation increase to "intensify" emergency
- Mini-map of affected systems (cascade radius is 4 words)
- Operator stats / scores / efficiency metrics
- Soft elevation around primary action (it's MOUNTED IN the trench)
- "Take control" / "Resolve emergency" CTAs (primary verb is `CONTACT NOW`)
- Celebration on recovery (recovery is silence)
