// NGW Operational Design Tokens — production convergence with the Figma
// "NGW Events — Operational Design System" (file CYlmJqDCXEaacCuz9wW3bd).
//
// This is the CANONICAL Studio Matte token source for new operational
// primitives. It mirrors the Figma NGW Color / Spacing / Typography
// variables 1:1 (Sprints 5–8). It does NOT replace the legacy DARK/LIGHT
// theme in App.js — convergence is incremental; new primitives consume
// these tokens, the monolith migrates later. No screen rebuilds here.
//
// Dark ("Studio Matte") is the canonical mode. Light is a deferred parity
// target (Sprint 8 finding) and intentionally omitted to avoid faking it.

// ── Primitives (raw ramps) ──────────────────────────────────────────────
const primitive = {
  matte: {
    '050': '#070809', '100': '#0d0f12', '150': '#121518', '200': '#171b1f',
    '250': '#1c2026', '300': '#232830', '350': '#2b3039', '400': '#343b45',
  },
  steel: {
    '050': '#e4ecf3', '100': '#d0dce8', '200': '#b9cedf', '300': '#9eb3c4',
    '400': '#849eb8', '500': '#6a87a0', '600': '#527088', '700': '#3d5870', '800': '#2a4058',
  },
  // Clean tungsten amber (Sprint 6 — engineered, not burnt)
  amber: { '300': '#f3a449', '400': '#ef962e', '500': '#df8116' },
  green: { '200': '#7dcca0', '300': '#3eab6c', '400': '#298c52', '500': '#1b7040' },
  // Clean alert red (Sprint 6 de-pink: 200 = #ef5757, not salmon)
  red:   { '200': '#ef5757', '300': '#e06868', '400': '#c03838', '500': '#9c2828', 'bright': '#e63946' },
  // Smoked graphite-teal atmosphere (Sprint 6 — environment only, never CTA)
  teal:  { '400': '#6ea6aa', '500': '#4b878b', '600': '#283639', '700': '#1d282a', '800': '#141d1f', '900': '#0c1213' },
};

// ── Semantic color (mirrors NGW Color collection, Studio Matte mode) ─────
export const color = {
  surface: {
    canvas:      primitive.matte['050'], // #070809 — ambient operational space
    base:        primitive.matte['100'],
    card:        primitive.matte['150'],
    elevated:    primitive.matte['200'],
    interactive: primitive.matte['250'],
    strong:      primitive.matte['300'], // raised key / P1 surface
    overlay:     primitive.matte['400'],
    dim:         '#3a3d4a',              // muted / inactive / disabled edge
  },
  border: {
    subtle:  primitive.matte['250'],
    default: primitive.matte['300'], // #232830
    strong:  primitive.matte['350'],
  },
  text: {
    primary:   '#e8edf2',
    secondary: primitive.steel['400'], // #849eb8 — DOCTRINE LOCKED
    tertiary:  primitive.steel['600'],
    disabled:  primitive.matte['400'],
    inverse:   primitive.matte['050'], // dark ink on bright fills
  },
  status: {
    confirmed:     primitive.green['400'],
    confirmedText: primitive.green['200'],
    confirmedBg:   '#0d2818',
    warning:       primitive.amber['400'], // #ef962e clean tungsten
    warningText:   primitive.amber['300'], // #f3a449
    warningBg:     '#1a1004',
    risk:          primitive.red['400'],   // #c03838 controlled
    riskText:      primitive.red['200'],   // #ef5757 clean alert (de-pinked)
    riskBright:    primitive.red['bright'], // #e63946 emergency tier
    riskBg:        '#1a0608',
    neutral:       primitive.steel['500'],
    neutralText:   primitive.steel['300'],
  },
  // Teal = environmental depth / live-state ONLY. Never an accent/CTA.
  atmosphere: {
    deep:       primitive.teal['900'],
    matte:      primitive.teal['800'],
    structural: primitive.teal['700'],
    spatial:    primitive.teal['600'],
    live:       primitive.teal['500'],
    intel:      primitive.teal['400'],
  },
};

// ── Spacing (NGW Spacing) ───────────────────────────────────────────────
export const space = { 0: 0, 1: 2, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32, 9: 40, 10: 48, 12: 64 };
export const radius = { none: 0, sm: 6, md: 10, lg: 14, xl: 20, full: 999 };

// ── Typography (NGW Typography) ─────────────────────────────────────────
export const type = {
  family: "'Inter', system-ui, -apple-system, sans-serif",
  size: { xs: 10, sm: 11, base: 13, md: 14, lg: 15, xl: 16, '2xl': 20, '3xl': 22 },
  weight: { regular: 400, medium: 500, semibold: 600 },
  leading: { tight: 1.2, normal: 1.4, relaxed: 1.55 },
  tracking: { label: '0.08em', normal: 0 },
};

// ── Motion (Sprint 8 hybrid matrix — source of truth) ───────────────────
// Easings: NO bounce/elastic/spring/overshoot. Cubic-bezier strings for CSS.
export const motion = {
  ease: {
    standard:    'cubic-bezier(0.2, 0, 0, 1)',     // weighted, decisive
    out:         'cubic-bezier(0.16, 1, 0.3, 1)',  // soft ease-out
    sharp:       'cubic-bezier(0.05, 0.7, 0.1, 1)',// sharp ease-out (emergency)
    inOut:       'cubic-bezier(0.45, 0, 0.2, 1)',  // ambient
  },
  duration: {
    ambient:    310, // ambient operational updates
    escalation: 230, // escalation surfacing
    emergency:  200, // emergency interrupt
    recovery:   360, // nervous-system decompression
    sheetRise:  300, // weighted bottom-sheet rise
    sheetDismiss: 360,
    press:      120, // tactile press
  },
};

// ── Elevation (restrained grounding shadows by depth plane) ─────────────
export const elevation = {
  none:        'none',
  base:        '0 1px 3px rgba(0,0,0,0.30)',
  elevated:    '0 2px 6px rgba(0,0,0,0.34)',
  active:      '0 3px 10px rgba(0,0,0,0.38)',
  escalation:  '0 3px 12px rgba(0,0,0,0.42)',
  interrupt:   '0 6px 24px rgba(0,0,0,0.50)',
  pressInset:  'inset 0 1px 4px rgba(0,0,0,0.40)',
};

// ── Legacy bridge ───────────────────────────────────────────────────────
// Maps the App.js DARK theme keys onto NGW values so the monolith can
// migrate key-by-key later WITHOUT a screen rewrite. Note the corrections:
// legacy accent (#4a90d9 blue) and accent2 (#14b8a6 neon teal) are BANNED;
// they converge to steel / smoked-teal. legacy warn -> clean tungsten.
export const legacyBridge = {
  bg:       color.surface.canvas,   // #0f0f11 -> #070809
  surface:  color.surface.card,
  surface2: color.surface.elevated,
  border:   color.border.default,
  accent:   color.text.secondary,   // blue #4a90d9 -> steel (no blue)
  accent2:  color.atmosphere.intel, // neon teal #14b8a6 -> smoked teal
  text:     color.text.primary,
  muted:    color.text.secondary,
  danger:   color.status.risk,      // #e63946 -> controlled #c03838
  success:  color.status.confirmed, // #22c55e -> #298c52
  warn:     color.status.warning,   // #f59e0b -> clean tungsten #ef962e
};

const tokens = { color, space, radius, type, motion, elevation, legacyBridge };
export default tokens;
