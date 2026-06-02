# 08_toggle_doctrine — Page 45 in Figma

**Page:** `45_Operational_Toggle_Doctrine` in `CYlmJqDCXEaacCuz9wW3bd`
**Root frame:** `255:3`
**Type:** DOCTRINE · **Runtime:** CONCEPT (no host surface yet) · **Authority:** LOCKED for the day toggles ship

## What's locked

| Layer | Decision |
|---|---|
| Shape | Square-radius track (2px), block knob (1px) — NOT iOS pill |
| Motion | Instant state change · zero animation · zero spring |
| Color | Plane elevation between OFF and ON; warning track when severity-held |
| Group | Toggles never float — they live in an operational group with a band label |
| Behavior under stress | Critical toggles auto-HOLD during critical/emergency; release silently on recovery |
| Labels | Operational nouns ("Voice channel reserved", "Override SMS hold") — never personal preference ("Dark mode", "Notifications") |

## Five toggle states drawn in the visual spec
1. **OFF · nominal** — panel-hi track, knob left
2. **ON · nominal** — elevated track, knob right
3. **OFF · disabled** — 40% knob, not-allowed cursor
4. **ON · severity-held** — warning track, warning stroke, knob right (system refuses to toggle off)
5. **OFF · severity-held** — same warning treatment, knob left

## Why this is doctrine but not runtime
- No host surface uses toggles yet
- Settings surface (page 09 doctrine) is the natural first host
- Building Toggle.jsx without a host would violate "evolve through validation, not invention"
- This page exists so when toggles do land, the decisions are pre-locked and a future PR cannot drift into iOS / consumer / smart-home aesthetics

## Drift defense
If a future PR introduces any of these, it violates this page and must be rejected:
- iOS pill track with fully-rounded edges
- Sliding/spring/bounce animation on the knob
- Green-success or teal "ON" color
- Decorative knob icons (sun/moon, check/cross)
- Standalone floating toggle without operational group label
- "Dark mode" / "Notifications" / "Sound effects" — personal-preference labels
- Drop-shadow / glow / haptic feedback / sound

## Companion page
Page 44 (`44_Desktop_Containment_Rules`) defines button canonical widths.
Page 45 defines toggle canonical states.
Together they cover every input primitive's structural rule set.
