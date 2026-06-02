# Sprint 12 — Validation Artifacts

Captured 2026-05-26 from live runtime via headless Chrome.

## Capture method
- Source: `npm start` dev server at `http://localhost:3000`
- Tool: `Google Chrome --headless --virtual-time-budget=2500`
- All screenshots are **real runtime** — no mock overlays, no presentation chrome
- Reproducibility: every state-driven shot uses URL params (e.g. `?slice=vendor&state=emergency`)

## How to reproduce locally
```bash
cd demo && npm start
# then visit any of:
#   http://localhost:3000/?slice=vendor
#   http://localhost:3000/?slice=vendor&state=escalation
#   http://localhost:3000/?slice=vendor&state=emergency
#   http://localhost:3000/?slice=desktop-density
#   http://localhost:3000/?slice=desktop-density&state=cascade
#   http://localhost:3000/?slice=desktop-density&state=emergency
#   http://localhost:3000/?slice=debrief
# add &observe=1 to any slice to enable observer instrumentation
```

## Directory map

| Folder | Contents | Classification |
|---|---|---|
| `00_audit/` | System hardening audit (markdown) | doctrine |
| `01_vendor_slice/` | 10 PNGs · nominal/escalation/emergency × 390 / 768 / 1024 / 1280 / 1440 | PROVEN |
| `02_desktop_density/` | 9 PNGs · nominal/cascade/emergency × 1024 / 1280 / 1440 | PROVEN |
| `03_debrief_surface/` | 4 PNGs · debrief overview × 768 / 1024 / 1280 / 1440 | PROVEN (synthesized data unless observer transcript present in `window.__ngwSession`) |
| `04_toggle_system/` | (intentionally empty) | NO RUNTIME — toggles remain CONCEPT-tier per Figma stubs |
| `05_action_system/` | (covered by 01/02) | PROVEN via 01/02 |
| `06_tablet/` | (covered by 01/02 @ 1024) | PROVEN |
| `07_desktop/` | (covered by 01/02 @ 1280/1440) | PROVEN |
| `08_motion/` | (intentionally empty) | static screenshots cannot prove motion — runtime probe via observer transcript only |
| `09_figma_parity/` | (this README + audit cover it) | PROVEN via 44_Desktop_Containment_Rules ↔ measured widths |

## Classification key
- **PROVEN** — runtime validated, screenshot evidence in this folder
- **HYBRID** — partial runtime / partial concept
- **CONCEPT** — Figma doctrine only, no runtime surface
- **DEPRECATED** — explicitly not canonical

## Sprint 12 validation matrix
| Screenshot group | Runtime | Conceptual | Proven | Drift risk |
|---|---|---|---|---|
| 01_vendor_slice | ✅ live | — | ✅ all states | none |
| 02_desktop_density | ✅ live | — | ✅ all states | none |
| 03_debrief_surface | ✅ live | data is SYNTHESIZED unless `?observe=1` ran first | ✅ structure | none |
| 04_toggle_system | — | ✅ Figma stubs only | NO runtime exists yet | low — intentional |
| 05_action_system | ✅ widths measured at runtime | — | ✅ via 01/02 | none |
| 06_tablet | ✅ 1024 in 01/02 | — | ✅ post-polish 3-zone | none |
| 07_desktop | ✅ 1280/1440 in 01/02 | — | ✅ | none |
| 08_motion | — | spec lives in `design/motion.js` | static capture insufficient | low — locked matrix |
| 09_figma_parity | doctrine matrix ↔ measured widths agree | — | ✅ | none |
