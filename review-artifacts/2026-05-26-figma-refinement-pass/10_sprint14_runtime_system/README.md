# Sprint 14 — Operational Runtime System (page 47)

**Figma page:** `47_Operational_Runtime_System` in file `CYlmJqDCXEaacCuz9wW3bd`
**Master frame:** `277:3` · height 3951
**Three live screens at desktop 1440 demonstrating the SAME layout at different severity tiers.**

## Files
| File | Severity | What changed |
|---|---|---|
| `01_nominal_1440.png` | NOMINAL | Calm monitoring posture. Empty state preserved. Restraint intact. |
| `02_critical_1440.png` | CRITICAL | Asymmetric layout. Rails compress. Center expands. Hard-edged segmented command strip — no card containment. Vendor names + codes. SYSTEM HOLD 9 OF 14. |
| `03_emergency_1440.png` | EMERGENCY | **14px vertical bleed-spine on left edge**. Title 64pt brutalist. Left rail collapses to 200px and vendor names compress to codes only. Right thread track collapses to 80px vertical strip. Background outside containment darkens to ink. Primary action lives inside the spine zone. Secondary actions get HELD by system. SYSTEM HOLD 12 OF 14. |

## Behavioral compression matrix (every dimension changes with severity)

| Dimension | Nominal | Critical | Emergency |
|---|---|---|---|
| Left rail width | 280 | 220 | 200 |
| Right rail width | 360 | 280 | 80 |
| Center title size | n/a (empty) | 36pt | **64pt brutalist** |
| Command-rail plane | panel | panel | **ink (deepest)** |
| Center background | bg | bg | **contamination wash** |
| Action containment | n/a | hard-edged segmented | **14px bleed-spine + anchored cmd** |
| Primary action color | n/a | structural ink-on-light | **RED irreversible** |
| Vendor names | full | name + code | **CODE ONLY** |
| Thread surface | 7 ambient lines | 2 compressed cards | **2 codes in vertical track** |
| Severity label | (none) | CRITICAL 13pt | **EMERGENCY 18pt mono caps** |
| Authority indicator | OPERATOR 14 LIVE | SYSTEM HOLD 9 OF 14 | **SYSTEM HOLD 12 OF 14** |

## Consumer / SaaS patterns intentionally removed

| Was | Now |
|---|---|
| Hero-card emergency (centered red rounded card with elevation) | **14px vertical bleed-spine on left edge**; content flush against the spine; action surfaces ANCHORED to the spine, not floating |
| App-button CTAs (rounded soft elevation) | **Hard-edged segmented strips**, 1px corner radius, 2px hairline gaps, 1px stroke instead of shadow |
| Tasteful balanced layout (symmetric gutters) | **Asymmetric severity-driven widths** — rails compress while center expands |
| Polite typography (12pt body / 16pt title) | **Aggressive monospace operational labels at 8–9pt + 64pt brutalist emergency title** |
| Healthy identical thread cards | **Threads compress to compressed cards at critical → vertical code-track at emergency** |
| Art-directed beautiful red emergency environment | **Contamination wash on bg outside the bleed-spine**; environment darkens |
| Static informative left rail (same content at every severity) | **Vendor names → name+code → CODE ONLY**; drift strip terminates in red at emergency |
| Friendly empty state (illustration / celebratory copy) | `ALL CLEAR · No active escalations. MONITORING.` in stone-grey caps |
