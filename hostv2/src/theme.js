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
  // ── LIGHT IS WARM LINEN (owner, 11/22/2026: "Let's go with B with the C
  // touches") ─────────────────────────────────────────────────────────────
  // Direction B of the light theme study ("Warm Linen, Refined"). Ruling 25's
  // warm canvas, made one warm-neutral system:
  //   - two surfaces, not four: page = band #F1EEE8, warm-white panels #FFFEFB
  //     with a real edge (#D9D1C4) and an umber lift;
  //   - one secondary steel (--ink-soft = --steel-soft: they were ΔE 5.6
  //     apart, one visible color under two names). The study's #3F5866 sat at
  //     the meta gray's luminance (1.01:1), which the tier rule forbids
  //     (lightModeClearsAA: two tiers a real luminance step apart, >=1.10), so
  //     it is one step deeper, #34495A (1.23 from the meta gray);
  //   - attention is umber on a HONEY chip, #5A3606 on #F2D894 (7.65:1). The
  //     old #884E0B on its 10% tint sat at the meta text's lightness (1.03:1)
  //     and read as dirty beige; the honey sits far above the canvas in
  //     chroma, and the umber far below the meta in lightness;
  //   - risk is a solid brick fill, #9B2A22 under white (7.64:1);
  //   - steel stays the accent (ruling 25), --cta-grad untouched (ruling 29).
  // Every value is gated by test/statusInkClearsItsTint.test.mjs.
  const LINEN = {
    page: '#F1EEE8', field: '#ECE8E0', panel: '#FFFEFB', line: '#D9D1C4',
    ink: '#1B1814', steelInk: '#34495A', muted: '#5A534A',
    ok: '#24603D', warn: '#5A3606', honey: '#F2D894', brick: '#9B2A22', progress: '#5E4E78',
  };
  // ── DARK STATUS INKS UNDER THE STEEL GLOW (audit 2, lane F, P1-1) ─────────
  // Ruling 30 brightened dark's gray text for the glow's top stop and left
  // the colored inks: the green, red and steel labels on their own tints read
  // 3.72 / 3.83 / 4.08:1 there (the RSVP "Yes", "Worth planning now", the
  // board pills, the filter chips). Each is the same hue and saturation one
  // HSL lightness step up, to the first value clearing 4.6 on its tint over
  // every ground and glow stop. Surfaces and tints do not move.
  const DARK_STATUS = { ok: '#77c198', danger: '#f59891', steelSoft: '#b1c2cb', progress: '#c0b1d5' };
  try {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('color-scheme', theme);
  } catch (_) { /* attribute is cosmetic; the vars below are the theme */ }
  set('--bg', isLight ? LINEN.page : c.bg);
  // Light: the band IS the page (linen, B): two surfaces, not four.
  set('--bg-band', isLight ? LINEN.page : c.surface2);
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
  set('--field', isLight ? LINEN.field : carbonNeutral.deep.bg);
  set('--card', isLight ? LINEN.panel : c.panel);
  // ── PANELS ON A GROUND (owner ruling 25, 11/21/2026: "W1") ────────────────
  // In light a sheet's ground is the page (--bg) and each section sits on a
  // white --card panel with a soft warm shadow. Dark keeps its sheet on --card
  // and casts no panel shadow, so dark renders as it did.
  // PANELS IN DARK TOO (owner, 11/22/2026: "screen section panel parity from
  // the light theme in the dark theme too"): a dark sheet's ground is now the
  // canvas --bg, and its sections sit on the raised --card it always had, the
  // same structure light has. The canvas itself does not move.
  set('--sheet-ground', isLight ? LINEN.page : c.bg);
  // Linen (B): a real edge plus an umber lift, so a panel reads as an object.
  set('--panel-shadow', isLight ? `0 1px 0 ${tint('#46341E', 0.05)}, 0 8px 18px -12px ${tint('#46341E', 0.22)}` : 'none');
  set('--ink', isLight ? LINEN.ink : bundle.textPrimary);
  // DARK UNDER THE STEEL GLOW (owner, 11/21/2026, option C "brighter secondary
  // text"): every stop of --canvas-glow is a ground. At its top stop
  // (α .30 steel over the sheet's #1E1F22) #849eb8 read 4.26, and 3.59 on the
  // amber chip tint; #98b2cc is 5.40 and 4.54. Host shell only: the shared
  // palette's textSecondary (CRA, DOCTRINE LOCKED in tokens.js) is untouched.
  set('--ink-soft', isLight ? LINEN.steelInk : '#98b2cc');
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
  // ── TUNED FOR THE BAND, USED ON THE CARD (measured 2026-09-30) ──────────
  // #707274 was chosen against --bg-band and clears there. It does NOT clear
  // on .lc-card, whose background is a translucent rgba(...,0.1) over the page
  // — a lighter ground in light mode — where it measures 4.04:1. That is not
  // new and it is not the provenance block's doing: .lc-pv-src and
  // .lc-card-was have sat at 4.04 on that card since they shipped. It only
  // came to light because a gate finally composited the alpha instead of
  // reading the translucent layer as opaque.
  //
  // #686A6C measures 4.54:1 on the same composited ground — headroom over the
  // floor rather than sitting on it. Darkening can only raise contrast, so no
  // existing >=4.5 gate can regress on it.
  //
  // WARM GROUND (owner ruling 25, 11/21/2026): light --muted is #5d5a56, a warm
  // gray at 6.03:1 on the new --bg #F2F0EC, 5.66 on --bg-band, 5.46 on the light
  // glow's top stop. #686A6C was solved against the old cool --bg.
  // DARK UNDER THE STEEL GLOW (owner, 11/21/2026, option C): #909296 read 3.80
  // at the glow's top stop over a sheet, 4.21 over the board; #a0a2a6 is 4.63
  // and 5.13. It still sits a real step under the new --ink-soft #98b2cc
  // (1.17 by luminance, was 1.12).
  // Linen (B): #5A534A, 6.54:1 on the page, 7.51 on a panel.
  const mutedInk = isLight ? LINEN.muted : '#a0a2a6';
  set('--muted', mutedInk);
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
  // ...and in light it is LITERALLY --muted, which is why it moves with it.
  // It was written out as #707274 rather than referencing the base, so
  // darkening --muted above silently split the two apart and left --faint
  // alone at 4.04:1 on the card. Same value, stated once.
  set('--faint', isLight ? mutedInk : tint(mutedInk, 0.98));
  set('--line', isLight ? LINEN.line : c.border);
  set('--line-soft', isLight ? tint(LINEN.line, 0.7) : tint(c.border, 0.55));
  // The one secondary button's edge in light (Linen, B), a step deeper than
  // a panel's so a recessed button reads on its panel. Dark has no such
  // recipe; it is --line there so the token is never undefined.
  set('--line-strong', isLight ? '#CBC1B1' : c.border);
  // ── The segmented switch (Jump to's Create / Plan / The Day / After) ──
  // Its track and lit segment were hex in styles.css (#17181b, #33363b), so
  // light theme kept a dark track under moded ink: "Plan" 1.58:1, the rest
  // 3.27:1 (design audit 2, 11/20/2026). Both come from the neutral ramp now.
  // Dark is within a step of what it painted; light is the recessive surface2
  // track. The lit segment wears the one selected state (--sel-bg, styles.css;
  // design batch 4), so --seg-on is gone.
  set('--seg-track', isLight ? LINEN.field : carbonNeutral.deep.panel);
  // The one selected state (styles.css :root --sel-*). Linen (B): selection
  // is a warm-white chip with a steel line, never the steel wash an ordinary
  // button wears, so the selected tab and "Copy the list" stop looking alike.
  set('--sel-bg', isLight ? LINEN.panel : 'var(--steel-tint)');
  set('--sel-line', isLight ? bundle.steelBlue : 'var(--steel-soft)');

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
  // Warm ground (ruling 25): #455d6a read 4.45 on its tint over the light
  // glow's top stop; #435a67 is 4.62 there, 6.36 on --bg.
  // Dark (owner, 11/21/2026, option C): #8AA3B0 read 4.48 at the steel glow's
  // top stop over a sheet; one unit up, #8BA4B1, is 4.53. Only --steel-soft
  // moves: dsColor.text.onTint stays for its other consumers.
  // Linen (B): one secondary steel, the same value as --ink-soft. Dark: see
  // DARK_STATUS (#8BA4B1 read 4.08 on its tint under the glow's top stop).
  set('--steel-soft', isLight ? LINEN.steelInk : DARK_STATUS.steelSoft);
  // Light takes a lighter wash (owner ruling 25, warm ground): the identity
  // steel on its own α .16 tint read 4.31:1 over the warm --bg; α .12 is 4.55
  // there and 5.14 on a white panel. The steel itself does not move.
  set('--steel-tint', tint(bundle.steelBlue, isLight ? 0.10 : 0.16));
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
  // LIGHT THEME (live axe 11/13/2026): the same lavender measured 2.18:1 on
  // light surfaces — the one token PR #117's light pass missed. A deeper
  // violet of the same hue clears 5.5:1 there; dark keeps the system value.
  // Warm ground (ruling 25): #6E5A8A read 4.12 on its own tint over the light
  // glow's top stop; #65537f is 4.61 there.
  const progress = isLight ? LINEN.progress : DARK_STATUS.progress;
  set('--progress', progress);
  set('--progress-tint', tint(progress, isLight ? 0.10 : 0.12));
  // Overhead-light material response (brand direction, splash work 2026-07-11):
  // surfaces catch the canvas's top glow as a 1px top sheen. Derived from the
  // steel anchor — same light source as the canvas glow (--canvas-glow).
  set('--sheen', tint(bundle.steelBlueMuted, 0.10));
  // ── THE CANVAS GLOW (owner ruling 11/20/2026; design batch 3, 11/21/2026) ──
  // One steel glow from the top of the screen, sized to the screen height.
  // Doctrine: docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md § Canvas glow
  // and § Gradients. .app paints it on every stage and .sheet lets it read
  // through. It is the board's glow as it shipped (styles.css .app-elegant,
  // 150% x 500px at a 844px-tall phone); 500px became 59vh so it scales with
  // the screen. The hue is that glow's own steel, #56748C. The Day and the
  // ?elegant=0 board used a weaker 300px glow and now take this one too.
  //
  // LIGHT IS A WARM WASH (owner ruling 25, 11/21/2026, "W1"): the light canvas
  // is warm, and its glow is a faint warm wash in the same one token. Dark keeps
  // the steel glow above.
  set('--canvas-glow', isLight
    ? 'radial-gradient(150% 59vh at 50% -80px, rgba(196,170,130,.10) 0%, rgba(196,170,130,.03) 45%, transparent 75%)'
    : `radial-gradient(150% 59vh at 50% -70px, ${tint('#56748C', 0.30)} 0%, ${tint('#56748C', 0.09)} 40%, transparent 74%)`);
  // ── THE PRIMARY IS LIT FROM THE TOP (owner, 11/20/2026) ─────────────────────
  // The owner chose this over the flat fill from a rendered comparison on the
  // live site. Doctrine: docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md
  // § "Gradients — exactly three, each a named token". Amend the standard, not
  // this comment. --cta-lift is its edge: a top highlight and a small shadow.
  set('--cta-grad', `linear-gradient(180deg, ${bundle.steelBlueCtaLight} 0%, ${bundle.steelBlueGradientTop} 52%, ${bundle.steelBlueCtaDeep} 100%)`);
  set('--cta-lift', `inset 0 1px 0 ${tint(dark.textPrimary, 0.14)}, 0 1px 2px ${tint(bundle.carbonBody, 0.35)}`);
  // The LABEL on any steel fill (--cta-grad, --steel). Both fills are the same
  // in both themes, so their label must be too: the moded --carbon-text / --ink
  // went to #0d0f12 in light and read 3.26:1 on the primary (3.17 on --steel).
  // Dark's textPrimary, the value dark already painted: 5.16 on #4E6877, 5.31
  // on #4c6675, 5.32 under the .cta hover's brightness(1.07) (measured).
  set('--on-steel', dark.textPrimary);

  // ── Status anchors (Dark calibrations) ──
  set('--ok', isLight ? LINEN.ok : DARK_STATUS.ok);
  // Dark green-ink for text ON the --ok fill (the all-quiet NEXT tile). Tokenized
  // (was a #0d2018 literal) — 6.2:1 on the green. (Color audit T2.)
  set('--on-ok', '#0d2018');
  // ── THE PROGRESS STRIPS (owner, 11/22/2026: "Green should pop more for the
  // progress") ──────────────────────────────────────────────────────────────
  // The seven strips under the board's ask ("5 of 7 · Food and Vendors open")
  // were --ok at .95 for done and --steel-soft at .75 for open: in dark both
  // sat near one lightness, so done and open differed by hue alone. Done is
  // now a fuller green (green = done only), open a recessive neutral that
  // still shows the denominator. Gate: statusInkClearsItsTint (done 3:1 on
  // every ground, 2:1 against open; open 1.3:1 on its ground).
  set('--seg-done', isLight ? '#1F8A4C' : '#4FD08A');
  set('--seg-open', tint(mutedInk, isLight ? 0.30 : 0.35));
  // Status-pill TEXT (--ok on --ok-tint) ran 4.35:1 at α=0.14 — large-text-only.
  // Lightened the tint to α=0.10 (a subtler wash) → 4.64:1, clearing small-text
  // AA for the pill label without touching the green itself (2026-07-13 audit).
  // Dark α .10 -> .07: the meta gray on the green "Free while in preview"
  // panel read 4.39:1 at the glow's top stop (lane F re-run, 11/22/2026).
  set('--ok-tint', isLight ? tint(LINEN.ok, 0.08) : tint(bundle.successGreen, 0.07));
  set('--warn', isLight ? LINEN.warn : bundle.amber);
  // Audit I2: was α 0.15 while --ok-tint/--danger-tint are 0.10 — amber chips
  // rendered visibly denser than green/red beside them. Normalized to 0.10.
  // Light: the honey chip is OPAQUE, so it reads the same on a panel and on
  // the page (Linen, B). Dark keeps the 10% wash.
  set('--warn-tint', isLight ? LINEN.honey : tint(bundle.amber, 0.10));
  // WEATHER GLYPH TONES (owner, 11/18/2026: "Color on light is dirty or
  // muted", then "Still a bit dark"; picked B from a four-step ladder). The
  // glyphs first borrowed --warn and --steel-soft, which light mode darkens
  // for TEXT (4.5:1): a brown amber and a slate steel. On light they now take
  // the same two hues bright: #E89A2C amber (2.17:1 on --bg) and #5294BF steel
  // (3.11:1). The amber sits under the 3:1 graphics floor (WCAG 1.4.11) on
  // purpose: the color is not what carries the meaning — every glyph is
  // aria-hidden beside words that say the forecast, and its cloud and
  // outlines stay in --muted (5.11:1), so the shape reads without the color.
  // Dark keeps the amber and the light steel it already reads in (8.46 /
  // 6.91 on --bg). Glyphs only: never text, never a status fill.
  set('--wx-sun', isLight ? '#E89A2C' : bundle.amber);
  set('--wx-fall', isLight ? '#5294BF' : dsColor.text.onTint);
  // --danger is the danger TEXT/accent color (severity tags, alert headlines,
  // risk labels, the danger pill). dangerRed was lightened in the palette so
  // this clears 4.5:1 on --danger-tint and on the card. --danger-solid keeps the
  // original deep red for the ONE place danger is a solid fill behind light text
  // (the alert banner) — lightening that fill would have dropped its white-text
  // contrast (per-screen audit cross-cutting fix).
  set('--danger', isLight ? LINEN.brick : DARK_STATUS.danger);
  // Same small-text fix as --ok-tint: the tint dropped α 0.14 → 0.10 for the
  // danger pill/label text. WAVE-6 CORRECTION: the "4.42:1 → 4.78:1" figures
  // this comment used to carry did not reproduce. Measured (WCAG relative
  // luminance, dangerRed #F27A70, α=0.10 composited): 5.27:1 over --card,
  // 4.82:1 over --bg-band, 6.71:1 over --carbon — all clear 4.5:1.
  set('--danger-tint', isLight ? tint(LINEN.brick, 0.08) : tint(bundle.dangerRed, 0.10));
  // Light: risk is SOLID brick under white (Linen, B), 7.64:1.
  set('--danger-solid', isLight ? LINEN.brick : bundle.dangerSolid);
  // THE HONEY CHIP, ONE VALUE IN BOTH THEMES (owner, 11/22/2026): where a
  // warning sits inside calm copy (the create screen's type guess), the
  // signal is an umber-on-honey chip, not orange body text. 7.65:1.
  set('--honey', LINEN.honey);
  set('--on-honey', LINEN.warn);
  // The "9" count badge in "Then, in order": dark's own #1a2228 (unchanged),
  // and warm black under a warm-white label in light, where the dark literal
  // read 2.22:1 (Linen, B).
  set('--count-badge', isLight ? LINEN.ink : '#1a2228');
  // The sheet and search scrims. Dark keeps its black washes; light's are a
  // warm umber, so a scrim over linen reads warm, not gray (owner, 11/22).
  set('--scrim', isLight ? tint('#2E2214', 0.42) : 'rgba(0,0,0,.42)');
  set('--scrim-deep', isLight ? tint('#2E2214', 0.55) : 'rgba(6,9,12,.55)');
  // The label on that solid risk fill: warm white, 7.6:1 on brick. Dark's
  // banner already labels its fill with --ink, which is this value there.
  set('--on-danger', isLight ? LINEN.panel : bundle.textPrimary);
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
  set('--danger-text', isLight ? LINEN.brick : DARK_STATUS.danger);

  // ── The Day: Dark Standard Carbon ramp ──
  // Light: The Day reads linen too (owner, 11/22/2026: "Light theme is
  // blue"). The carbon ramp's light step was cool (#e4ecf3 page, #b9cedf
  // edge); it now takes the same page, panel and edge as every other view.
  set('--carbon', isLight ? LINEN.page : bundle.carbonBody);
  set('--carbon-panel', isLight ? LINEN.panel : bundle.carbonPanel);
  set('--carbon-line', isLight ? LINEN.line : bundle.carbonBorder);
  set('--carbon-text', bundle.textPrimary);
  // Light: The Day's eyebrows and "ongoing" read #6b6f74 on the light carbon
  // body #e4ecf3, 4.24:1 (design audit 2). They take --muted's light ink,
  // 4.55:1 there; dark is unchanged.
  set('--carbon-muted', isLight ? mutedInk : bundle.textMuted);
  // ── THE CARBON PANEL (doctrine 02 § Gradients, the third of exactly three;
  // design batch 3, 11/21/2026). Was written inline on .day-node. It reads
  // the two carbon tokens above, so it follows the theme with them.
  set('--carbon-panel-grad', 'linear-gradient(150deg, var(--carbon-panel) 0%, var(--carbon) 70%)');
  set('--steel-muted', bundle.steelBlueMuted);
  // Secondary text ON A FIXED CARBON STAGE — the creation reveal, whose ground
  // is #0d1014 in BOTH themes. Deliberately not moded: every moded text token
  // goes dark in light and lands ~2.7-3.5:1 there. 6.87:1 on the stage base,
  // 5.44:1 on its glow peak (stage-4 P1, M1).
  set('--carbon-ink-soft', dsColor.text.secondary);
  // The rest of the reveal's text, on the same fixed stage and for the same
  // reason. Both are the values dark already painted, so dark is unchanged and
  // light stops painting dark ink on carbon (name 1.01:1, buttons 2.75-3.26:1).
  set('--carbon-ink', dark.textPrimary);          // event name, primary button label
  set('--carbon-steel-soft', dsColor.text.onTint); // eyebrow, quiet button labels

  // ── FIXED VALUES, NAMED AT WHAT THEY PAINT TODAY (design batch 3b, 11/21/2026)
  // Each was a literal repeated across styles.css and the JSX, in one role. They
  // are named at their exact values, so nothing on screen moved, and none is
  // moded: every one painted the same in light and dark before it had a name.
  // Change a value here and every site follows; do not add a near value beside
  // one of these, snap to it.
  //
  // The shadow scale: black at the four alphas the drop and inner shadows use.
  set('--shadow-40', 'rgba(0,0,0,.4)');
  set('--shadow-50', 'rgba(0,0,0,.5)');
  set('--shadow-55', 'rgba(0,0,0,.55)');
  set('--shadow-60', 'rgba(0,0,0,.6)');
  // White hairlines: a 1px light line or top highlight on a dark surface.
  set('--hair-05', 'rgba(255,255,255,.05)');
  set('--hair-07', 'rgba(255,255,255,.07)');
  set('--hair-08', 'rgba(255,255,255,.08)');
  set('--hair-14', 'rgba(255,255,255,.14)');
  // The raised key's dark bottom edge (the board's primary and the pick).
  set('--key-edge', '#06080b');
  // The fixed carbon stage the welcome, the creation reveal and the error
  // screen sit on, and the reveal's two quiet text tiers on it (the tier the
  // color audit T1 kept as a locked brand surface: named, not changed).
  set('--stage', '#0d1014');
  set('--carbon-ink-quiet', '#9aa7b2');
  set('--carbon-ink-faint', '#7a8792');
  // The reveal's bead: its unlit surface and its two shadows, at rest and lit.
  set('--bead', '#0a0d10');
  set('--bead-rest-shadow', '-1.7px -2.5px 3.4px rgba(255,255,255,.05), 2.5px 3.4px 5px rgba(0,0,0,.5)');
  set('--bead-lit-shadow', '-2.5px -3.4px 5.1px rgba(255,255,255,.3), 3.4px 5.1px 7.7px rgba(10,14,17,.44), 0 0 10px rgba(111,147,168,.32), 0 0 19px rgba(78,104,119,.18)');
  // Text and controls on a photo, in the full-screen photo viewer.
  set('--on-photo', '#f4f2ee');
  // The opaque stop of an edge-fade mask. A mask reads alpha only; the color
  // is never painted.
  set('--mask-solid', '#000');

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
