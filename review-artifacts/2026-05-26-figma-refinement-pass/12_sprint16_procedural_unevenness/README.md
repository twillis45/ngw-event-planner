# Sprint 16 — Procedural Unevenness Runtime (page 49)

**Figma page:** `49_Procedural_Unevenness_Runtime`
**Master frame:** `284:3` · height 3224
**Degrades:** page 48 (which transitioned too synchronously)

## Files
| File | What it shows |
|---|---|
| `01_recovery_asymmetry_t30s_1440.png` | Recovery at t+30s — subsystems lag at different rates |
| `02_procedural_silence_emergency_1440.png` | Emergency pushed to peak compression — left rail 80px, right 60px, lineage/residue/containment hidden |
| `03_scar_tissue_22hr_1440.png` | 22 hours later — system remembers · PRD-04 carries permanent POST mark, prior-event drift strip persists, vendor elevated to WATCH |
| `04_partial_authority_release_4phases.png` | 4-phase authority decrement sequence (12 → 9 → 4 → 0 over ~45s) |

## Operational rationale

Sprint 48 produced a system where every subsystem updated at the same instant. That's animation-engine behavior, not distributed-infrastructure behavior. Operators trust systems that exhibit:

1. **Localized inconsistency** — different parts catch up at different rates
2. **Procedural lag** — the residue log shows an event before the visual surface reflects it
3. **Partial release** — authority returns in decrements, not a single flip
4. **Persistent scars** — institutional memory survives past the current session

## What was intentionally degraded

### [A] Recovery asymmetry t+30s
| Subsystem | State at t+30s |
|---|---|
| Center surface | recovered |
| Command trench | 3 of 4 slots released; 1 still SYSTEM HELD |
| Drift strip | 1 red cell remains · 2 warn-dim · 6 ok · 3 okDim |
| Left rail AV-08-OPR strike | still present · "clearing" tag |
| Suppressed fields footer | `· 1 field still suppressed` (was 3 during emergency) |
| Contamination wash | receded from left, still tints rightmost ~280px |
| Spine residue line | uneven — left 260px faint · middle 260 dim · right 920 full spine color |
| Residue log | new RELEASED lines visible · stale REFUSED/SUPPRESSED/INHERITED lines at 0.65 opacity |
| Authority indicator | `SYSTEM RELEASING · 9 → 4 · partial` |
| Right thread track | still compressed at 100px (didn't expand back to 320 yet) · DEC still locked with `stale` mark |

### [B] Partial authority release · 4 phases
- **Phase 1 (t+0, CONTAINED):** HOLD 12 of 14, drift still mostly red/crit, trench has 1 LIVE + 2 HELD
- **Phase 2 (t+15s, DECREMENT):** HOLD 9 of 14, drift clearing from left, 1 LIVE + 2 HELD
- **Phase 3 (t+33s, DECREMENT):** HOLD 4 of 14, drift mostly green with residue, 2 LIVE + 1 HELD
- **Phase 4 (t+46s, RELEASED):** OPERATOR 14 LIVE, drift all-green but right half dimmer (residue), all slots LIVE

Authority does not snap. Trust returns procedurally.

### [C] Procedural silence
Emergency pushed past page 48:
- Left rail collapses to 80px · codes only · no DRIFT label, no STATUS label
- Right rail collapses to 60px · only `· 2 SUP` visible
- Lineage hidden
- Residue log hidden
- Containment fact band hidden
- Center holds only: `EMERGENCY` tag · entity · cascade fact · single command
- Trench shows `EMPTY · NON-ESSENTIAL CONTROLS SUPPRESSED` in the dock
- Pressure cognitively narrows the surface to mission-critical

### [D] Scar tissue · 22 hours later
- Next event prep · 22 hours after the emergency cleared
- Drift TODAY all green
- **Prior-event drift strip persists** in left rail at 45% opacity — the climb is visible
- All vendors return to nominal **except PRD-04 which carries permanent `POST · 26 MAY` mark**
- Right rail elevates PRD-04 from NOM to **WATCH** — institutional memory triggers pre-emptive heightened monitoring
- Center holds archived residue panel at 70% opacity
- Authority indicator: `OPERATOR · 14 LIVE · 1 SCAR · ARCHIVED`

## What was intentionally preserved

| Layer | Preserved |
|---|---|
| Palette | No new colors; only dimmer variants of existing tokens (`okDim`, `critDim`, `emergSpineFaint`, etc.) |
| Motion doctrine | Zero animation. State IS, never transitions. |
| No glow / gradient / noise | Hard surfaces only |
| Mono typography | All procedural labels remain monospace caps |
| Bleed-spine doctrine | Spine persists across all severity states |
| Authority taxonomy | OPERATOR / SYSTEM / SHARED tags remain canonical |

## What was refused

| Pattern | Why refused |
|---|---|
| Animated cell-by-cell drift clear | Would read as transition, not state |
| "Glitch" effect on stale subsystems | Cyberpunk drift |
| Sparkline / chart of authority decrement | Telemetry porn |
| "System recovering…" loading state | Recovery is not loading |
| Particle effects on contamination clearing | Decorative atmosphere |
| Bright "RESOLVED!" badge at containment | Reward thinking |
| Toast on each authority decrement | Notification-center drift |
| "Operator confidence: 94%" or any score | Operator grading |
| Multi-color "phase indicator" graph | BI dashboard rhythm |
| Scanline / monitor flicker | Sci-fi aesthetic |

## Why unevenness increases credibility

A perfectly synchronized recovery reads as **a designer's idea of recovery**. An uneven recovery reads as **infrastructure under real load**.

The operator subconsciously registers:
- "the system has many parts"
- "each part has its own clock"
- "the residue log is faster than the visual surface"
- "authority returns when it's safe to return — not when it's pretty"
- "this event leaves marks on tomorrow"

This is the credibility the brief asked for. The system is no longer art-directed.

## Critical test (per brief)

> If the result looks like a cyberpunk concept piece, you failed.

The work is **cold, procedural, institutional**:
- No saturation increase under pressure
- No animation
- No noise / scanlines / particles
- No "designed instability"
- All unevenness is timing-based, not visually decorative
- The dimmed cells, the strike marks, the missing measurements — every one is a state, not a style
