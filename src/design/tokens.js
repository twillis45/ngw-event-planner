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

import { carbonNeutral } from '../theme/palette';

// ── Primitives (raw ramps) ──────────────────────────────────────────────
const primitive = {
  // Sprint 60.N: matte ramp realigned to mirror the locked App.js DARK
  // theme tiers (Mid Carbon doctrine). Previously the L4 specialist
  // surfaces (CommandCenter / CommunicationHub / Checklist / Timeline /
  // Client Intake / Vendor Planning) consumed color.surface.base = #0d0f12,
  // one tier deeper than the dashboard's Mid Carbon #111519 — a real
  // palette drift visible to the eye when moving Home → an event.
  // Mirror map:
  //   100 #111519 ← App.js DARK bg       (Mid Carbon page)
  //   150 #1c2227 ← App.js DARK surface  (Lifted Carbon card)
  //   200 #242b31 ← App.js DARK surface2 (banner / prominent card)
  //   250 #2e353d ← App.js DARK border   (interactive edge)
  // 050 stays at #070809 — deepest ambient ("entered the operating room").
  // 300/350/400 retain their ~12-lum-per-step ramp above 250.
  matte: {
    '050': '#070809', '100': '#111519', '150': '#1c2227', '200': '#242b31',
    '250': '#2e353d', '300': '#3a4250', '350': '#424b59', '400': '#4e5867',
  },
  steel: {
    '050': '#e4ecf3', '100': '#d0dce8', '200': '#b9cedf', '300': '#9eb3c4',
    '400': '#849eb8', '500': '#6a87a0', '600': '#527088', '700': '#3d5870', '800': '#2a4058',
  },
  // Sprint 49 calibration: status colors dropped to ~40-60% saturation to
  // sit in the same register as the steel/matte chroma rather than shouting
  // against it. Semantic meaning preserved; visual weight matched.
  // 400 unified to #ECA13F 2026-08-18 (D2 of the Figma/code reconciliation).
  // Three ambers were live: #d4904a here, #ECA13F in palette.js (what actually
  // rendered), and #b45309 on Figma page 66 tagged PROVEN but present in no code
  // at all — and measuring 3.65:1 as text on carbon, a WCAG AA failure, so its
  // "proven" tag was never earned. Consolidated on palette's #ECA13F: it was
  // already shipping, and it measures 8.50:1 against #d4904a's 6.89:1.
  // This reverses the Sprint 49 desaturation for the 400 stop specifically —
  // deliberate, chosen over keeping a token that disagreed with what rendered.
  amber: { '300': '#d99a59', '400': '#ECA13F', '500': '#b87a38' }, // was #d4904a; 300/500 unchanged
  green: { '200': '#8fbf9f', '300': '#5aa478', '400': '#3a8a62', '500': '#28704e' }, // calmer forest — was #7dcca0/#3eab6c/#298c52/#1b7040
  // Sprint 60.U.3 10+ red correction — pull the whole ramp toward fire-red.
  // Old values had B ≈ G (dusty crimson) and the 'bright' tier had B>G which
  // read as pink against the cool Mid Carbon surface. New ramp keeps R far
  // ahead of G, G ahead of B, so every tier reads as alarm/critical — no
  // rose-pink lean. Aligns with App.js DARK.danger = #E84036.
  red:   { '200': '#F08274', '300': '#E2604F', '400': '#E84036', '500': '#B82F26', 'bright': '#FF3525' },
  // Smoked graphite-teal atmosphere (Sprint 6 — environment only, never CTA)
  teal:  { '400': '#6ea6aa', '500': '#4b878b', '600': '#283639', '700': '#1d282a', '800': '#141d1f', '900': '#0c1213' },
  // Muted lavender — the IN-PROGRESS status tier. Promoted from hostv2 2026-08-18.
  // Origin (hostv2 Audit S1): steel was doing triple duty — identity, selection,
  // AND in-progress status (booked / renting / vendor-mid), so a host could not
  // tell a status pill from a selected chip. This frees steel to mean identity
  // and selection only. Violet on purpose: a warm slate read too close to steel.
  // Measured on carbon — 6.9 card, 5.4 tint-over-card, 4.9 band. All clear AA.
  lavender: { '400': '#B3A0CC' },
};

// ── Semantic color (mirrors NGW Color collection, Studio Matte mode) ─────
// SURFACES + BORDERS are bridged to the app's PRODUCTION carbon ramp
// (theme/palette `carbonNeutral.mid` — the de-blued Mid Carbon the DARK theme
// actually renders). This makes CommandCenter and any tokens consumer share ONE
// surface source with App.js `C.*`, so a tab can never drift to the old #070809
// Standard Carbon again (the 2026-06-23 "Your Event bg doesn't match" bug).
const _cn = carbonNeutral.mid; // { bg, panel, surface2, border }
export const color = {
  surface: {
    canvas:      _cn.bg,        // = App.js C.bg (#141518) — was #070809 (drift)
    base:        _cn.bg,
    card:        _cn.panel,     // = C.surface
    elevated:    _cn.surface2,  // = C.surface2
    interactive: _cn.border,
    strong:      primitive.matte['300'], // raised key / P1 surface
    overlay:     primitive.matte['400'],
    dim:         '#3a3d4a',              // muted / inactive / disabled edge
  },
  border: {
    subtle:  _cn.border,        // = C.border (#313338)
    default: primitive.matte['300'],
    strong:  primitive.matte['350'],
  },
  text: {
    primary:   '#e8edf2',
    secondary: primitive.steel['400'], // #849eb8 — DOCTRINE LOCKED
    // Lifted steel 600 → 500 (#6a87a0) 2026-06-24 per the board: tertiary text was
    // reading as DISABLED on the dark Pulse (caption/secondary below the legibility
    // floor). Still a notch under secondary so the tier ladder holds. `disabled`
    // below stays the genuinely-inert faint tier.
    tertiary:  primitive.steel['500'],
    disabled:  primitive.matte['400'],
    inverse:   primitive.matte['050'], // dark ink on bright fills
    // Text-legible steel for use ON a steel tint — promoted from hostv2's
    // --steel-soft 2026-08-18. Deliberately its own value rather than a steel
    // ramp stop: steelBlueMuted (#6F8794) is the material anchor --sheen derives
    // from, and lifting that to clear 4.5:1 on tint would have changed the sheen
    // everywhere. Two needs, two values, on purpose.
    onTint:    '#8AA3B0',
  },
  status: {
    confirmed:     primitive.green['400'],
    confirmedText: primitive.green['200'],
    confirmedBg:   '#0d2818',
    // The IN-PROGRESS tier — promoted from hostv2 2026-08-18 (see primitive.lavender).
    // Distinct from `confirmed` (done) and `warning` (needs attention): this is
    // "underway, nothing required of you." It exists because steel could not
    // carry it and identity/selection at the same time.
    inProgress:    primitive.lavender['400'], // #B3A0CC
    warning:       primitive.amber['400'], // #ECA13F — unified with palette.amber (D2, 2026-08-18)
    warningText:   primitive.amber['300'], // #d99a59
    warningBg:     '#1a1004',
    // Red parity (board 2026-06-10): unified to the single canonical fire red.
    // The plan/ layer read primitive.red['400'] (#b04848 dignified crimson) while
    // the rest of the app used #E84036 — two different reds on screen. One red
    // for the FILL now: this token.
    //
    // CORRECTION 2026-08-18: this comment used to read "#E84036 = palette.js
    // dangerRed = C.danger", which was true when it was written and is not now.
    // A later WCAG pass split danger into TWO tokens, deliberately:
    //   palette.dangerRed   #F27A70 — danger TEXT/accent. #E84036 measured
    //                                 ≈3.6–4.1:1 as text on the danger tint/card
    //                                 and FAILED AA; lightened to ≈4.9:1 / ≈6:1.
    //   palette.dangerSolid #E84036 — solid FILL only (alert banner, white text
    //                                 on top), where the deep red is legible.
    // `risk` below is a fill/accent role, so it correctly matches dangerSolid.
    // Do NOT "reunify" these by setting dangerRed to #E84036 — that reintroduces
    // the contrast failure the split exists to fix. Two reds is the fix, not drift.
    risk:          '#E84036',              // canonical fire red — matches palette.dangerSolid
    riskText:      '#f0897e',              // lighter fire tint for text-on-dark
    riskBright:    primitive.red['bright'], // #c93f4a emergency tier (day-of only)
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
// Card/panel radius unified to 12 to match App.js s.card (the dominant card
// system) — the plan/ components were rendering panels at 6/10/14, reading as
// "different-shaped" surfaces. md = the canonical CARD radius; sm stays small
// for chips/inputs/compact buttons.
export const radius = { none: 0, sm: 8, md: 12, lg: 12, xl: 20, full: 999 };

// ── Typography (NGW Typography) ─────────────────────────────────────────
export const type = {
  family: "'Inter', system-ui, -apple-system, sans-serif",
  // Scale extended (2026-06-24) so CommandCenter's dense data UI tokenizes with no
  // rounding gaps: caption(12) fills the old 11→13 dead zone; 2xs(9) for micro-labels;
  // 4xl/5xl for the event-title + countdown hero numerals. Edit a value here → it
  // propagates to every tokenized fontSize (the point of tokenizing).
  // `section` (17) = the SECTION-TITLE tier (board 2026-06-24), mirrors App.js TYPE_SCALE.section.
  // A card/section NAME sits here: above body (base 13 / lg 15), below the 20+ hero — so the
  // name leads its content by SIZE, never inverted into the caption/eyebrow tier.
  size: { '2xs': 9, xs: 10, sm: 11, caption: 12, base: 13, md: 14, lg: 15, xl: 16, section: 17, '2xl': 20, '3xl': 22, '4xl': 26, '5xl': 30 },
  weight: { regular: 400, medium: 500, semibold: 600 },
  leading: { tight: 1.2, normal: 1.4, relaxed: 1.55 },
  tracking: { label: '0.08em', normal: 0 },
};

// ── Motion (Sprint 8 hybrid matrix — source of truth) ───────────────────
// Easings: NO bounce/elastic/spring/overshoot. Cubic-bezier strings for CSS.
export const motion = {
  ease: {
    standard:    'cubic-bezier(0.2, 0, 0, 1)',     // weighted, decisive
    // THE one curve (Magic Moments motion language, Figma 1428 · "carry into code"):
    // ease-out cubic-bezier(.22,1,.36,1) everywhere. Propagates to escalation/recovery/
    // sheetDismiss/press (all read ease.out) so reveals, collapses, and presses share it.
    out:         'cubic-bezier(.22, 1, .36, 1)',   // soft ease-out — the standard curve
    sharp:       'cubic-bezier(0.05, 0.7, 0.1, 1)',// sharp ease-out (emergency alarms only)
    inOut:       'cubic-bezier(0.45, 0, 0.2, 1)',  // ambient (breathing loops)
  },
  duration: {
    ambient:    310, // ambient operational updates
    escalation: 230, // escalation surfacing
    emergency:  200, // emergency interrupt
    recovery:   360, // nervous-system decompression
    sheetRise:  300, // weighted bottom-sheet rise
    sheetDismiss: 360,
    press:      120, // tactile press
    // ── Interaction scale ────────────────────────────────────────────────
    // The 2026-07-22 audit named these so styles.css could stop hardcoding
    // 100/140/200/240/420 across ~40 sites, and hostv2/theme.js was wired to
    // read them — but they were never added here. Every read fell through to
    // its `|| <literal>` fallback for a month while the comment there claimed
    // "one source now." Nothing errored: a fallback makes a missing token and
    // a present one indistinguishable at runtime.
    // Values are the fallbacks that have been shipping, so adding them changes
    // nothing on screen — it just makes the claimed source real. Guarded by
    // hostv2/src/parity/check-parity.mjs, which fails the build if theme.js
    // ever reads a duration this block does not define.
    micro:      100, // fastest micro-feedback
    fast:       140, // hover / tint / press transitions
    base:       200, // standard row/state transition
    enter:      240, // panel / ask enter (askin)
    reveal:     420, // moderate reveal / receipt
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
  // The canonical CARD shadow — top-edge highlight + tight contact + deep lift.
  // == App.js DARK.cardShadow (single source so every card matches everywhere).
  card:        'inset 0 1px 0 0 rgba(255,255,255,0.09), 0 2px 5px rgba(0,0,0,0.45), 0 18px 38px -12px rgba(0,0,0,0.74)',
};

// Metallic card EDGE — the highlight→border→shadow gradient run used by metalEdge.
// Tokenized so the gradient values aren't magic numbers scattered across files.
export const edge = {
  hi:  'rgba(255,255,255,0.22)', // top highlight
  lo:  'rgba(0,0,0,0.30)',       // bottom shadow
  mid: 0.46,                     // border-color stop position (fraction → use as `${edge.mid*100}%`)
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
