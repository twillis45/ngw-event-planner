// NGW Event Boss — Studio Matte Locked Palette (Hybrid Token Source)
//
// Sprint Profile Settings Review · Hybrid Token Strategy
// ------------------------------------------------------------
// This file is the locked source of truth for the Studio Matte palette,
// approved brand presets, and the steel-blue CTA gradient. New code MUST
// import tokens from here instead of writing raw hex literals.
//
// Three modes are supported and locked:
//
//   Dark   — Standard Carbon ramp (#070809 … #1c2026)
//            Source: Figma "NGW Events — Operational Design System"
//            (file CYlmJqDCXEaacCuz9wW3bd) · mode "Studio Matte".
//            Used for deep day-of operational surfaces (Event Day Mode,
//            full-screen run-of-show, dark cockpit zones).
//
//   Mid    — Mid Carbon ramp (#111519 … #2E353D)  ← PRODUCTION DEFAULT
//            Source: production code (Sprint 60.L Carbon Tier Lock). The
//            current app shell uses these values. NOT yet written back to
//            Figma; see docs/token-debt.md (Figma Mid mode).
//
//   Light  — Light parity mode for studios that opt out of dark UI.
//            Source: Figma mode "Light". Currently surface-level only;
//            full app shell light theming is a deferred sprint.
//
// Coexistence rules:
//   • Does NOT replace src/design/tokens.js (Figma convergence layer).
//   • Does NOT replace the legacy App.js `DARK` object — `DARK` references
//     these tokens so values stay identical while the shell gains a
//     single source.
//   • Old raw-hex callsites are intentionally NOT migrated in this pass.
//     They will be swept opportunistically as each file is next touched.
//     Running list: docs/token-debt.md.
//
// Banned values — never re-introduce:
//   #1a6fba  (SaaS blue)             #14b8a6  (neon teal)
//   #f0bc44  #e08c38  (decorative warm gold — confidence accents)
//   Generic Tailwind reds / blues outside the locked ramps below.

// ── Mode-aware surface + status tokens ─────────────────────────────────
// Each token name maps to a value per mode. Use modeToken('carbonBody',
// 'mid') or import the `palette.mid.carbonBody` shortcut.

const TOKENS = {
  // Carbon surfaces ----------------------------------------------------
  carbonBody:     { dark: '#070809', mid: '#111519', light: '#e4ecf3' },
  carbonPanel:    { dark: '#121518', mid: '#1C2227', light: '#ffffff' },
  carbonSurface:  { dark: '#121518', mid: '#1C2227', light: '#ffffff' }, // alias
  carbonSurface2: { dark: '#171b1f', mid: '#242B31', light: '#d0dce8' },
  carbonBorder:   { dark: '#232830', mid: '#2E353D', light: '#b9cedf' },
  carbonStrong:   { dark: '#2b3039', mid: '#3A4250', light: '#9eb3c4' },

  // Steel-blue identity & CTA gradient ---------------------------------
  // Identity stays locked across modes — the steel-blue is the brand and
  // does not invert. Only carbon surfaces invert for Light mode.
  steelBlue:               { dark: '#4E6877', mid: '#4E6877', light: '#4E6877' },
  steelBlueDark:           { dark: '#3F5B6A', mid: '#3F5B6A', light: '#3F5B6A' },
  steelBlueMuted:          { dark: '#6F8794', mid: '#6F8794', light: '#6F8794' },
  steelBlueGradientTop:    { dark: '#4E6877', mid: '#4E6877', light: '#4E6877' },
  steelBlueGradientBottom: { dark: '#3F5B6A', mid: '#3F5B6A', light: '#3F5B6A' },

  // Status anchors -----------------------------------------------------
  dangerRed:    { dark: '#E84036', mid: '#E84036', light: '#c03838' },
  amber:        { dark: '#ECA13F', mid: '#ECA13F', light: '#ef962e' },
  successGreen: { dark: '#4FAE7A', mid: '#4FAE7A', light: '#298c52' },

  // Text ---------------------------------------------------------------
  textPrimary:   { dark: '#eef0f4', mid: '#e8edf2', light: '#0d0f12' },
  textSecondary: { dark: '#849eb8', mid: '#849eb8', light: '#527088' },
  textMuted:     { dark: '#849eb8', mid: '#849eb8', light: '#527088' },
};

// The production default mode. Until a user-level "Theme" toggle ships,
// the app shell runs the Dark Standard Carbon ramp (matte/050 #070809 page).
// Sprint 60.W — moved the whole-app canvas from Mid Carbon to the deepest
// Standard Carbon so cards earn their separation on a true matte-black page.
export const ACTIVE_MODE = 'dark';

// ── Default-mode named exports ─────────────────────────────────────────
// These are the values existing code imports directly. They resolve to
// the ACTIVE_MODE. Switching the shell to Dark or Light = change
// ACTIVE_MODE (and ship a follow-up sweep of static imports). For
// runtime mode switching, use palette.dark / palette.mid / palette.light.

export const carbonBody     = TOKENS.carbonBody[ACTIVE_MODE];
export const carbonPanel    = TOKENS.carbonPanel[ACTIVE_MODE];
export const carbonSurface  = TOKENS.carbonSurface[ACTIVE_MODE];
export const carbonSurface2 = TOKENS.carbonSurface2[ACTIVE_MODE];
export const carbonBorder   = TOKENS.carbonBorder[ACTIVE_MODE];
export const carbonStrong   = TOKENS.carbonStrong[ACTIVE_MODE];

export const steelBlue               = TOKENS.steelBlue[ACTIVE_MODE];
export const steelBlueDark           = TOKENS.steelBlueDark[ACTIVE_MODE];
export const steelBlueMuted          = TOKENS.steelBlueMuted[ACTIVE_MODE];
export const steelBlueGradientTop    = TOKENS.steelBlueGradientTop[ACTIVE_MODE];
export const steelBlueGradientBottom = TOKENS.steelBlueGradientBottom[ACTIVE_MODE];

export const dangerRed    = TOKENS.dangerRed[ACTIVE_MODE];
export const amber        = TOKENS.amber[ACTIVE_MODE];
export const successGreen = TOKENS.successGreen[ACTIVE_MODE];

export const textPrimary   = TOKENS.textPrimary[ACTIVE_MODE];
export const textSecondary = TOKENS.textSecondary[ACTIVE_MODE];
export const textMuted     = TOKENS.textMuted[ACTIVE_MODE];

// ── Per-mode bundles ───────────────────────────────────────────────────
// Use these when a component needs to render multiple modes side-by-side
// (e.g., theme preview tiles in Profile Settings) or to programmatically
// switch the active mode at runtime.

const bundleForMode = (mode) => ({
  carbonBody:     TOKENS.carbonBody[mode],
  carbonPanel:    TOKENS.carbonPanel[mode],
  carbonSurface:  TOKENS.carbonSurface[mode],
  carbonSurface2: TOKENS.carbonSurface2[mode],
  carbonBorder:   TOKENS.carbonBorder[mode],
  carbonStrong:   TOKENS.carbonStrong[mode],
  steelBlue:               TOKENS.steelBlue[mode],
  steelBlueDark:           TOKENS.steelBlueDark[mode],
  steelBlueMuted:          TOKENS.steelBlueMuted[mode],
  steelBlueGradientTop:    TOKENS.steelBlueGradientTop[mode],
  steelBlueGradientBottom: TOKENS.steelBlueGradientBottom[mode],
  dangerRed:    TOKENS.dangerRed[mode],
  amber:        TOKENS.amber[mode],
  successGreen: TOKENS.successGreen[mode],
  textPrimary:   TOKENS.textPrimary[mode],
  textSecondary: TOKENS.textSecondary[mode],
  textMuted:     TOKENS.textMuted[mode],
});

export const dark  = bundleForMode('dark');
export const mid   = bundleForMode('mid');
export const light = bundleForMode('light');

// ── De-blued (neutral) carbon ramp ─────────────────────────────────────
// The Standard/Mid carbon ramps are "Studio Steel" — deliberately blue-led (blue
// channel ~8 over red). User (2026-06-23) preferred a NEUTRAL carbon: most of the blue
// removed (blue ~3 over red), still a hair warm-cool-balanced, never steel. Four darkness
// levels between the deepest dark and the light theme, each {bg, panel, surface2, border}.
// App.js DARK picks one level via CARBON_LEVEL. Single source — never hardcode these hexes.
export const carbonNeutral = {
  deep:   { bg: '#0D0E10', panel: '#161719', surface2: '#1C1D20', border: '#282A2E' }, // dark↔mid
  mid:    { bg: '#141518', panel: '#1E1F22', surface2: '#25262A', border: '#313338' }, // de-blued mid (default)
  soft:   { bg: '#1C1D20', panel: '#26272A', surface2: '#2D2F33', border: '#3B3D43' }, // mid↔light
  softer: { bg: '#242529', panel: '#2E2F33', surface2: '#36383D', border: '#46484F' }, // lighter still
};

// ── Approved brand-color presets ───────────────────────────────────────
// Shown in the Profile Settings Brand Color picker. Every preset sits in
// the Studio Matte register — no SaaS blue, no neon teal, no decorative
// warm gold. Order = visual ramp from canonical steel out toward neutral.
// These presets are MODE-INDEPENDENT: brand color is identity, not
// surface, and stays consistent whether the shell renders dark or light.
export const brandPresets = [
  { value: '#4E6877', label: 'Studio Steel'     },
  { value: '#3F5B6A', label: 'Carbon'           },
  { value: '#566F7D', label: 'Slate'            },
  { value: '#3A4250', label: 'Graphite'         },
  { value: '#8BA0AA', label: 'Soft Silver Blue' },
  { value: '#3A8A62', label: 'Muted Evergreen'  },
];

export const defaultBrandColor = '#4E6877'; // Studio Steel

// ── Aggregated export ─────────────────────────────────────────────────
export const palette = {
  // Active-mode shortcuts
  carbonBody, carbonPanel, carbonSurface, carbonSurface2, carbonBorder, carbonStrong,
  steelBlue, steelBlueDark, steelBlueMuted,
  steelBlueGradientTop, steelBlueGradientBottom,
  dangerRed, amber, successGreen,
  textPrimary, textSecondary, textMuted,
  // Brand presets
  brandPresets, defaultBrandColor,
  // Per-mode bundles
  dark, mid, light,
  // Meta
  ACTIVE_MODE,
  modes: ['dark', 'mid', 'light'],
};

export default palette;
