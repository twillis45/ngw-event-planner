// Studio Matte doctrine wiring — every color below comes from the LOCKED
// palette source (demo/src/theme/palette.js) and the motion choreography
// system (demo/src/design/motion.js). No raw hex literals in this app:
// host surfaces = the palette's Light mode, The Day = the Dark carbon ramp,
// identity/CTAs = the locked steel-blue gradient. Change the doctrine file,
// this prototype follows.
//
// TYPE is NOT set here. The host-app type scale lives as static CSS custom
// properties (--t-*) in styles.css's :root block — that's the single type
// source (UX_01 type-scale table names the tokens). theme.js stays colors
// and motion only; do not mirror or move the type tokens into JS.
import { dark, light, carbonNeutral } from '@app/theme/palette';
import { durations, easings } from '@app/design/motion';
import { color as dsColor } from '@app/design/tokens';

// Alpha helper — tints derive from doctrine anchors, never new hues.
const tint = (hex, a) => {
  const s = String(hex).replace('#', '');
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

// ── LIGHT, AND HOW IT TURNS ON (host, 2026-09-28) ─────────────────────────
// Flipping ACTIVE_MODE never worked here because this file imported `dark`
// and `carbonNeutral.mid` by name — the mode bundle was never consulted, so
// the text went near-black and the surfaces stayed dark. Both ends are
// selected by mode now, and the surface ramp finally has a light step to
// select (palette.js carbonNeutral.light, added the same day).
//
// The switch is the URL and one stored key, not a rebuild: ?theme=light or
// ?theme=dark sets it and it persists. Read defensively — a blocked or empty
// store is dark, which is what every host has today.
export const THEME_KEY = 'ngw-theme';

export function currentTheme(search) {
  try {
    const q = new URLSearchParams(search != null ? search : window.location.search).get('theme');
    if (q === 'light' || q === 'dark') {
      try { localStorage.setItem(THEME_KEY, q); } catch (_) { /* private mode: this load still honours it */ }
      return q;
    }
  } catch (_) { /* no URL: fall through to the stored answer */ }
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (_) { return 'dark'; }
}

// Write the host's choice and make the page follow it immediately.
//
// THE URL HAS TO GO. currentTheme() reads the query string FIRST and only then
// the stored key — correct for a link someone opens, wrong the moment there is
// a control on screen: the only way a host can reach light today IS ?theme=,
// so their very first tap would be made with that parameter still in the
// address bar, and the next read would hand the old answer straight back. The
// toggle would work and then silently undo itself on reload. Dropping the
// param with replaceState leaves one source of truth — the stored key — and
// keeps the link behaviour intact for anyone arriving fresh.
export function setStoredTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* private mode: this session still follows it */ }
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has('theme')) {
      u.searchParams.delete('theme');
      window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch (_) { /* no history API: the stored key still wins on the next load */ }
  applyStudioMatte(t);
  return t;
}

export function applyStudioMatte(override) {
  const r = document.documentElement.style;
  // setProperty stringifies whatever it is handed, so a palette key that does not
  // exist writes the literal string "undefined" as the token's value. That is not
  // an error anywhere: CSS parses it as an invalid value, the declaration is
  // dropped, and the element simply paints nothing — which reads on screen as a
  // design choice rather than a bug. --danger-solid shipped that way (2026-07-30).
  // Refuse the write instead, so the token falls back to its stylesheet default
  // and the console names the token that is missing.
  const set = (k, v) => {
    if (v == null || v === 'undefined') {
      console.warn('[theme] refusing to set ' + k + ' — palette value is missing');
      return;
    }
    r.setProperty(k, v);
  };

  // ── Host surfaces: the de-blued NEUTRAL CARBON ramp (the carbon gray the
  // production shell runs — palette.js carbonNeutral, user-locked 2026-06-23).
  // An explicit argument is the host tapping the control this instant; with no
  // argument this is a page load and the URL/stored answer stands.
  const theme = (override === 'light' || override === 'dark') ? override : currentTheme();
  const isLight = theme === 'light';
  // `mid` is the production default and stays the dark answer; `light` is the
  // step added 2026-09-28, built by inverting this ramp's own neutral
  // character rather than importing the blue-led Figma values.
  const c = isLight ? carbonNeutral.light : carbonNeutral.mid;
  // The text/status bundle has to move with the surfaces or the two disagree
  // — which is exactly the unreadable half-flip of 2026-09-27.
  const bundle = isLight ? light : dark;
  try {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('color-scheme', theme);
  } catch (_) { /* attribute is cosmetic; the vars below are the theme */ }
  set('--bg', c.bg);
  set('--bg-band', c.surface2);
  // ── --field: the ground BEHIND the stage at >=1024 (host, 2026-08-07) ──────
  // "need more of my carbon in the tablet, desktop, widescreens."
  //
  // It is the DEEPEST step of the same de-blued carbonNeutral ramp the shell
  // already runs — NOT the --carbon* family. Those are two different ramps:
  // carbonBody is blue-tinted (#070809/#121518) and carbonNeutral is de-blued
  // (#141518/#1E1F22), and styles.css:793 already records what mixing them
  // looks like ("a visible shift on a blue-grey pill"). A rail painted from the
  // blue ramp against a de-blued content ground is that same clash at the scale
  // of a whole screen, which is why this token exists rather than reusing
  // --carbon.
  //
  // Declared here AND bundled, deliberately: --danger-solid was declared in
  // TOKENS and never added to bundleForMode(), so it reached the DOM as the
  // literal string "undefined" and no layer treated that as an error.
  //
  // AND IT HAS TO FLIP (2026-09-29). This was the ONE token in the bundle that
  // did not branch on isLight — every line around it goes through `c` or
  // `bundle` and this one was pinned to the dark ramp. Below 1024 the body
  // takes --bg-band and light mode looked right; at 1024 and up the body takes
  // THIS, so light mode painted dark-page-with-light-content on tablet-land,
  // tablet-tall, desktop and wide. The exact unreadable half-flip the comment
  // eight lines up says this bundle exists to prevent, reintroduced by the one
  // line that opted out of it.
  //
  // The light value is the same relationship, inverted, in the ramp's own
  // steps and with no new colour: the field is the MOST RECESSIVE plane, which
  // on light is surface2 (#EDEEF1), and the composition still reads in three —
  // field #EDEEF1 -> content ground #F7F8FA -> panel #FFFFFF — exactly as deep
  // -> mid -> panel does in the dark.
  set('--field', isLight ? carbonNeutral.light.surface2 : carbonNeutral.deep.bg);
  set('--card', c.panel);
  set('--ink', bundle.textPrimary);
  set('--ink-soft', bundle.textSecondary);
  // --muted was aliased to the SAME textSecondary as --ink-soft (and both
  // sit in the steel-blue hue family) — indistinguishable from each other
  // and from the identity accent everywhere they appear together (e.g. the
  // home quiet-index rows' label/value, found 2026-07-11). textMuted is now
  // a genuinely de-blued neutral gray in the palette — use it here so
  // "de-emphasized" reads as a different tone, not a dimmer blue.
  // Color re-audit (path to 10): --muted (bundle.textMuted #9a9ca0, L 0.332) and
  // --ink-soft (#849eb8, L 0.328) had IDENTICAL luminance — the two text tiers
  // ranked by hue only, so in grayscale / for a colorblind host they read as one
  // tier. Darkened --muted to #909296 (L 0.287) so "de-emphasized meta" recedes a
  // real luminance step below "secondary body" (card 5.29 vs 5.94), still AA on
  // the tight band (4.85). Scoped to the host shell here — the shared palette is
  // left alone so nothing else shifts.
  //
  // AND IT IS THE SECOND TOKEN THAT OPTED OUT OF THE MODE (2026-09-29). Same
  // class as --field above: a literal, no isLight branch. On the light ground
  // it reads 2.93:1 and on a card 3.12:1, and it is the single cause of 52 of
  // the 57 sub-AA text nodes measured on the rendered light page — every rail
  // label, every shelf heading, every chevron. Dark measured zero.
  //
  // The light value is solved, not picked: the LIGHTEST neutral holding this
  // ramp's character (blue = red + 4) that still clears 4.5:1 on BOTH text
  // planes — 4.55 on --bg, 4.83 on --card. Lightest, because in light mode
  // de-emphasis runs upward, and this has to sit a real step ABOVE --ink-soft
  // (#527088, 4.90 on --bg) in exactly the way the dark value sits below it.
  set('--muted', isLight ? '#707274' : '#909296');
  // --faint carries small text (section labels, form-field labels, chevrons). A
  // tint of the now-darker --muted base; α 0.98 keeps it AA on the tight band
  // (≈4.7:1) while sitting a hair below --muted. (The 4.5:1 floor on the band
  // surface physically prevents three widely-spaced grey tiers — the important
  // fix is muted now ranking below ink-soft, above.)
  //
  // In light the alpha step is not available: --muted is already ON the floor
  // there, and α 0.98 over --bg lands at 4.35. So light runs TWO grey tiers,
  // not three — which is the same conclusion the parenthetical above reaches
  // for dark, stated outright instead of hidden behind an imperceptible 2%.
  // A third tier that fails AA is not a third tier.
  set('--faint', isLight ? '#707274' : tint('#909296', 0.98));
  set('--line', c.border);
  set('--line-soft', tint(c.border, 0.55));

  // ── Identity: locked steel-blue (mode-independent) + the CTA gradient ──
  set('--steel', bundle.steelBlue);
  set('--steel-dark', bundle.steelBlueDark);
  // --steel-soft carries vendor/logistics status pill TEXT on --steel-tint;
  // at the palette's #6F8794 that ran ≈3.8:1 (fails 4.5). Overridden here to a
  // lighter steel that clears 4.5 on the tint — set as a literal (not the
  // palette base) on purpose, so the shared --sheen material detail, which also
  // derives from steelBlueMuted, is left untouched (per-screen audit + brand-lock).
  //
  // "ON CARBON" IS THE WHOLE PROBLEM IN LIGHT (2026-09-29). The comment above
  // names its ground and it is a dark one; on the light page this literal read
  // 2.49:1. It is the fifth token that never branched on the mode, and the one
  // that survived the first sweep because the other four accounted for 54 of
  // the 57 failures and this one for 3.
  //
  // In light the correction runs the OTHER WAY. Legible-on-the-tint means
  // LIGHTER against carbon and DARKER against a pale steel tint (#dce1e5),
  // so light takes a deeper steel rather than a softer one. Measured 5.27:1
  // on the tint over --bg and 6.53:1 on --bg itself — chosen for margin, not
  // for the first value that squeaked past: the nearest passing candidate
  // cleared the tint by 0.02, which is a rounding error, not a floor.
  set('--steel-soft', isLight ? '#455d6a' : dsColor.text.onTint);
  set('--steel-tint', tint(bundle.steelBlue, 0.16));
  // Audit S1: steel was doing triple duty — identity, selection, AND the
  // "in progress" status tier (booked / renting / vendor-mid …), so a host
  // couldn't tell a status pill from a selected chip. --progress carries ONLY
  // the in-progress tier, freeing steel to mean identity + selection. A muted
  // LAVENDER (not a warm slate — that read too close to the steel blue): clearly
  // violet, distinct from steel/green/amber/red/grey, and matte enough for the
  // palette. Clears 4.5:1 on card (6.9), tint-over-card (5.4), and band (4.9).
  // Promoted to the design system 2026-08-18 as color.status.inProgress —
  // read from there rather than re-declaring the literal here, so the tier has
  // one source. The reasoning above stays: it is why the token exists.
  set('--progress', dsColor.status.inProgress);
  set('--progress-tint', tint(dsColor.status.inProgress, 0.12));
  // Overhead-light material response (brand direction, splash work 2026-07-11):
  // surfaces catch the canvas's top glow as a 1px top sheen. Derived from the
  // steel anchor — same light source as the .app background radial.
  set('--sheen', tint(bundle.steelBlueMuted, 0.10));
  // ── THE PRIMARY IS FLAT ────────────────────────────────────────────────────
  // Was linear-gradient(180deg, #4E6877 -> #3F5B6A) on every .cta and .tile-d;
  // now the flat top stop. The rule this follows — banned 180deg ramp, allowed
  // lateral sweep, --sheen unaffected — is doctrine, and lives in
  // docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md § "Gradients — the rule is
  // the ANGLE, not the idea", with its evidence in the 2026-08-04 Mobbin read.
  // It used to be stated here instead, which made a doctrine change visible only
  // to someone reading this file. Amend the standard, not this comment.
  set('--cta-grad', bundle.steelBlueGradientTop);

  // ── Status anchors (Dark calibrations) ──
  set('--ok', bundle.successGreen);
  // Dark green-ink for text ON the --ok fill (the all-quiet NEXT tile). Tokenized
  // (was a #0d2018 literal) — 6.2:1 on the green. (Color audit T2.)
  set('--on-ok', '#0d2018');
  // Status-pill TEXT (--ok on --ok-tint) ran 4.35:1 at α=0.14 — large-text-only.
  // Lightened the tint to α=0.10 (a subtler wash) → 4.64:1, clearing small-text
  // AA for the pill label without touching the green itself (2026-07-13 audit).
  set('--ok-tint', tint(bundle.successGreen, 0.10));
  set('--warn', bundle.amber);
  // Audit I2: was α 0.15 while --ok-tint/--danger-tint are 0.10 — amber chips
  // rendered visibly denser than green/red beside them. Normalized to 0.10.
  set('--warn-tint', tint(bundle.amber, 0.10));
  // --danger is the danger TEXT/accent color (severity tags, alert headlines,
  // risk labels, the danger pill). dangerRed was lightened in the palette so
  // this clears 4.5:1 on --danger-tint and on the card. --danger-solid keeps the
  // original deep red for the ONE place danger is a solid fill behind light text
  // (the alert banner) — lightening that fill would have dropped its white-text
  // contrast (per-screen audit cross-cutting fix).
  set('--danger', bundle.dangerRed);
  // Same small-text fix as --ok-tint: the tint dropped α 0.14 → 0.10 for the
  // danger pill/label text. WAVE-6 CORRECTION: the "4.42:1 → 4.78:1" figures
  // this comment used to carry did not reproduce. Measured (WCAG relative
  // luminance, dangerRed #F27A70, α=0.10 composited): 5.27:1 over --card,
  // 4.82:1 over --bg-band, 6.71:1 over --carbon — all clear 4.5:1.
  set('--danger-tint', tint(bundle.dangerRed, 0.10));
  set('--danger-solid', bundle.dangerSolid);
  // WAVE-6 AA REPAIR: danger TEXT on dark grounds gets its OWN token so text
  // legibility never rides on the fill anchors (--danger/--danger-solid are
  // fills/accents and stay untouched — dimming them would break the alert
  // banner's white-on-red). The day-of stack's critical text (the tier word
  // chip on --bg-band, the critical alert headline on --danger-tint) reads
  // this. A literal on purpose, one step lighter than dangerRed — same move
  // as --steel-soft above. Measured: 6.40:1 on --bg-band; on danger-tint(.10)
  // 6.01:1 over --card, 5.50:1 over --bg-band, 7.66:1 over --carbon — every
  // ground clears small-text AA (4.5:1) with margin.
  //
  // Every measurement in the paragraph above is a DARK measurement — --bg-band
  // and --carbon are dark grounds, and a literal chosen against them reads
  // 2.36:1 on the light page. Light takes the danger accent itself (5.11 on
  // --bg, 4.68 on --bg-band): the "one step lighter" refinement is a
  // dark-ramp move, and repeating it in light would soften the value in the
  // direction that costs contrast rather than the one that adds it.
  set('--danger-text', isLight ? bundle.dangerRed : '#F58B82');

  // ── The Day: Dark Standard Carbon ramp ──
  set('--carbon', bundle.carbonBody);
  set('--carbon-panel', bundle.carbonPanel);
  set('--carbon-line', bundle.carbonBorder);
  set('--carbon-text', bundle.textPrimary);
  set('--carbon-muted', bundle.textMuted);
  set('--steel-muted', bundle.steelBlueMuted);

  // ── Motion: choreography timings, no bounce ever ──
  set('--ease-out', easings.out || 'cubic-bezier(0,0,.2,1)');
  set('--ease-standard', easings.standard || 'cubic-bezier(.2,0,0,1)');
  set('--ease-in-out', easings.inOut || 'cubic-bezier(.45,0,.2,1)');
  set('--ms-press', (durations.press || 120) + 'ms');
  set('--ms-ambient', (durations.ambient || 220) + 'ms');
  set('--ms-sheet', (durations.sheetRise || 260) + 'ms');
  set('--ms-escalation', (durations.escalation || 230) + 'ms');
  // Interaction-duration scale (audit 2026-07-22): styles.css hardcoded 100/140/200/
  // 240/420ms across ~40 sites while only press/ambient/sheet/escalation were tokenized —
  // two scales drifting apart. These name the actual common values (value-preserving), so
  // styles.css can consume the scale instead of literals. Same numbers, one source now.
  set('--ms-micro', (durations.micro || 100) + 'ms');   // fastest micro-feedback
  set('--ms-fast', (durations.fast || 140) + 'ms');     // hover / tint / press transitions
  set('--ms-base', (durations.base || 200) + 'ms');     // standard row/state transition
  set('--ms-enter', (durations.enter || 240) + 'ms');   // panel / ask enter (askin)
  set('--ms-reveal', (durations.reveal || 420) + 'ms'); // moderate reveal / receipt
  // ── THE SLOW BAND, NAMED (motion audit 2026-08-21) ────────────────────────
  // The 2026-07-22 pass tokenized everything up to 420ms and stopped there, so
  // a whole speed band above it stayed literal: .38s/.5s/.55s/.6s on
  // disclosure, .7s/.9s on progress fills, at 20-plus sites. Unnamed values
  // drift by definition — nothing tells the next author which of six spellings
  // is the house one, so they add a seventh. Two rungs cover the band.
  //
  // These are NOT value-preserving everywhere, deliberately: the 900ms fill
  // comes down to 700 and the 380ms disclosure goes up to 550. They move
  // TOWARD each other, which is the whole point of a ladder — two rungs that
  // read as one speed beat six literals that read as noise.
  set('--ms-slow', (durations.slow || 550) + 'ms');     // disclosure / fold open
  set('--ms-fill', (durations.fill || 700) + 'ms');     // a bar travelling its track
  // A landing ring is not an interaction speed — it is a dwell, long enough to
  // find with the eye after a scroll lands. It gets its own name so nobody
  // "corrects" it down to a transition duration.
  set('--ms-land', (durations.land || 3200) + 'ms');
}
