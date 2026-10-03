// EVERY LIGHT TEXT VALUE, ON EVERY GROUND IT CAN LAND ON.
//
// Light mode shipped 2026-09-28 and was measured on 2026-09-29 by walking
// every rendered text node at 1440 and 390. Fifty-seven sat below WCAG AA.
// Dark, same walk, same page: zero. The gap was never taste — it was that
// three token values never branched on the mode and two more were tuned
// against the wrong ground:
//
//   --muted / --faint   literals from a dark-mode contrast fix, 2.93:1 on --bg
//   --danger-text       a literal measured only on --bg-band and --carbon
//   --steel-soft        a literal whose own comment names its ground: carbon
//   amber / successGreen / dangerRed  tuned against #ffffff, the CARD, while
//                         most body text sits on --bg — and a status pill's
//                         text sits on a 10% wash of its own colour
//
// WHY A TOKEN TEST AND NOT ONLY THE SCREEN WALK. The e2e audit can only fail
// on what is on screen in the states it visits. No danger text was rendered in
// either viewport, so --danger-text at 2.36:1 was invisible to it — and would
// have stayed invisible until a host hit a critical alert in light mode. A
// token is on every surface that uses it, including the ones no test opens
// yet, so the value is where the class actually closes. The screen walk stays
// as the delivery check; this is the coverage one.
import { light, dark, carbonNeutral } from '../../theme/palette';

const lum = (hex) => {
  const h = String(hex).replace('#', '');
  const f = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const AA = 4.5;

// The grounds text actually lands on, measured rather than assumed: every
// rendered text node in both viewports sat on --card or --bg. --field
// (surface2) is the >=1024 gutter behind the stage and carries none, so
// holding tokens to it would be inventing a requirement — the same mistake as
// tuning to #ffffff, pointed the other way.
const LIGHT_TEXT_GROUNDS = {
  '--card (panel)': carbonNeutral.light.panel,
  '--bg (content ground)': carbonNeutral.light.bg,
};

// --bg-band is surface2 and DOES carry text (status pills, the day-of tier
// chip), so anything that renders there is held to it as well.
const BAND = carbonNeutral.light.surface2;

describe('light mode text clears AA on every ground it lands on', () => {
  const TEXT_TOKENS = {
    '--ink (textPrimary)': light.textPrimary,
    '--ink-soft (textSecondary)': light.textSecondary,
    '--muted': '#707274',
    '--faint': '#707274',
    '--ok (successGreen)': light.successGreen,
    '--warn (amber)': light.amber,
    '--danger (dangerRed)': light.dangerRed,
    '--steel (steelBlue)': light.steelBlue,
  };

  for (const [token, value] of Object.entries(TEXT_TOKENS)) {
    for (const [ground, bg] of Object.entries(LIGHT_TEXT_GROUNDS)) {
      test(`${token} on ${ground}`, () => {
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
        const r = ratio(value, bg);
        expect(`${token} on ${ground}: ${r.toFixed(2)}:1`)
          .toBe(`${token} on ${ground}: ${Math.max(r, AA).toFixed(2)}:1`);
      });
    }
  }

  test('--danger-text renders on --bg-band, so it is held to that too', () => {
    expect(ratio(light.dangerRed, BAND)).toBeGreaterThanOrEqual(AA);
  });
});

describe('text on a TINT clears AA too — the ground the first sweep missed', () => {
  // Status pills put colored text on a 10-16% wash of their own colour, so the
  // real ground is the composite, not the page. --steel-soft was the last of
  // the five opted-out tokens precisely because it lives here: it read 2.49:1
  // on the light page while the four louder ones were being fixed.
  //
  // The tint is COMPUTED from the token rather than written down, so it cannot
  // go stale when a base colour moves — which it did in this same change, when
  // steelBlue.light shifted to clear its own derived tint.
  const overlay = (fg, bg, a) => {
    const p = (h) => [0, 2, 4].map((i) => parseInt(String(h).replace('#', '').slice(i, i + 2), 16));
    const [f, b] = [p(fg), p(bg)];
    return `#${f.map((v, i) => Math.round(v * a + b[i] * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
  };

  const ON_TINT = [
    ['--ok on --ok-tint', light.successGreen, light.successGreen, 0.10],
    ['--warn on --warn-tint', light.amber, light.amber, 0.10],
    ['--danger on --danger-tint', light.dangerRed, light.dangerRed, 0.10],
    ['--steel-soft on --steel-tint', '#455d6a', light.steelBlue, 0.16],
    ['--steel on its own --steel-tint', light.steelBlue, light.steelBlue, 0.16],
  ];

  for (const [name, text, tintBase, alpha] of ON_TINT) {
    for (const [ground, bg] of Object.entries(LIGHT_TEXT_GROUNDS)) {
      test(`${name}, over ${ground}`, () => {
        const r = ratio(text, overlay(tintBase, bg, alpha));
        expect(`${name} over ${ground}: ${r.toFixed(2)}:1`)
          .toBe(`${name} over ${ground}: ${Math.max(r, AA).toFixed(2)}:1`);
      });
    }
  }
});

describe('the gray tiers rank by luminance, not by hue', () => {
  // The defect this repo already paid for once in dark: --muted and --ink-soft
  // had identical luminance and differed only in hue, so in grayscale — or for
  // a host who cannot separate those hues — they read as ONE tier. Light has
  // to hold the same property, running the other way: de-emphasis is lighter.
  test('light: muted sits a real step lighter than ink-soft', () => {
    expect(lum('#707274')).toBeGreaterThan(lum(light.textSecondary));
  });

  test('dark: muted sits a real step darker than ink-soft', () => {
    expect(lum('#909296')).toBeLessThan(lum(dark.textSecondary));
  });

  test('and primary outranks secondary in both', () => {
    expect(lum(light.textPrimary)).toBeLessThan(lum(light.textSecondary));
    expect(lum(dark.textPrimary)).toBeGreaterThan(lum(dark.textSecondary));
  });
});
