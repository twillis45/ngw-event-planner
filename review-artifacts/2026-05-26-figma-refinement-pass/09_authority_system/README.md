# 09_authority_system — Page 46

**Page:** `46_Operational_Authority_System` in Figma file `CYlmJqDCXEaacCuz9wW3bd`
**Root frame:** `275:3` (2400×2573)
**Status:** DOCTRINE · supersedes the visual spec of page 45 · runtime CONCEPT

## Files
| File | What it shows |
|---|---|
| `01_page_46_full.png` | Whole page — all 7 sections |
| `02_machined_toggle.png` | §01 · refined toggle (5 states + DELTA log vs page 45) |
| `03_runtime_calibration_panel.png` | §03 · 3-group calibration panel at CRITICAL · 9 of 14 toggles HELD by system |
| `04_refusal_pattern.png` | §04 · operator clicked HELD toggle · REFUSED log line + HOLD ENFORCED status |
| `05_density_comparison.png` | §06 · 13-row 45→46 density delta table |

## What changed from page 45 to page 46

### Machined toggle
- Knob bevel REMOVED · was 2-stop (stone outer / white inner)
- Knob grip lines REMOVED · was 3 hairlines at 45%
- Corner radius 2px → 1px (tighter; machined)
- Knob outline 0.5px sharp edge added (defines without softness)
- LED indicator added · 2×2 corner LED · green ON / amber HELD / dark OFF
- HELD lockout bar added · physical-looking refusal mark under track
- State caps 7px → 6.5px monospace (printed-label feel)

### Density
- Section padding 56→48px (tighter)
- Row padding 12→10px (procedural density)
- Body font 12→11px (manual-grade)
- Section labels gain `[NN]` prefix (procedural numbering)
- Header gains REV / AUTHORITY / SUPERSEDES metadata (doctrine versioning)
- Header background ink-deep (was panel)
- Letter-spacing 8%→14% (authoritative)

### Authority (new this page)
- Every control declares authority via tag: `[ o ]` OPERATOR · `[ s ]` SYSTEM · `[ ~ ]` SHARED
- SHARED controls go HELD during severity; system refuses operator intent
- Refusal pattern documented: third-person log line appears under group; toggle does not move
- "HOLD ENFORCED" status replaces toggle's normal state badge during refusal

## Strongest moment
Section §04 (`04_refusal_pattern.png`) — the system literally refusing operator intent during critical state, with a third-person log line that does not apologize. That's the operational consequence surface the brief asked for. Authority is visible AND enforced.

## What is NOT in this page
- No motion (state IS)
- No icons (industrial typography only)
- No gradients · no glow · no glassmorphism
- No premium SaaS · no consumer settings UI
- No celebration on release · recovery is silent

## When page 46 ships to runtime
Implementation order:
1. Build `Toggle.jsx` primitive following the machined spec
2. Add `authority` prop: `'operator' | 'system' | 'shared'`
3. Wire `useEscalation()` consumption so SHARED toggles auto-HOLD at critical+
4. Add refusal log via the existing observer transcript channel
5. Settings surface (page 09) becomes the first host
