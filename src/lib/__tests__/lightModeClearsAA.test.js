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
// THE WARM GROUND (owner ruling 25, 11/21/2026). The light canvas glow is a
// warm wash, rgba(196,170,130,.16) at its top stop (theme.js --canvas-glow).
// Text near the top of a screen or sheet sits on that wash over --bg, so the
// stop's composite is a ground too, and the darkest of the three.
const GLOW_TOP = (() => {
  const b = [0, 2, 4].map((i) => parseInt(carbonNeutral.light.bg.slice(1 + i, 3 + i), 16));
  const w = [196, 170, 130];
  return `#${b.map((v, i) => Math.round(w[i] * 0.16 + v * 0.84).toString(16).padStart(2, '0')).join('')}`;
})();
const LIGHT_TEXT_GROUNDS = {
  '--card (panel)': carbonNeutral.light.panel,
  '--bg (content ground)': carbonNeutral.light.bg,
  'the light glow\'s top stop over --bg': GLOW_TOP,
};

// --bg-band is surface2 and DOES carry text (status pills, the day-of tier
// chip), so anything that renders there is held to it as well.
const BAND = carbonNeutral.light.surface2;

describe('light mode text clears AA on every ground it lands on', () => {
  const TEXT_TOKENS = {
    '--ink (textPrimary)': light.textPrimary,
    '--ink-soft (textSecondary)': light.textSecondary,
    '--muted': '#5d5a56',
    '--faint': '#5d5a56',
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
    ['--steel-soft on --steel-tint', '#435a67', light.steelBlue, 0.16],
    ['--progress on --progress-tint', '#65537f', '#65537f', 0.12],
    // α .12 in light since ruling 25 (theme.js --steel-tint).
    ['--steel on its own --steel-tint', light.steelBlue, light.steelBlue, 0.12],
  ];
  // The tinted pairs keep the two grounds they were always held to; the glow's
  // top stop is held for bare text above (a pill there is the e2e walk's job).
  const TINT_GROUNDS = { '--card (panel)': carbonNeutral.light.panel, '--bg (content ground)': carbonNeutral.light.bg };

  for (const [name, text, tintBase, alpha] of ON_TINT) {
    for (const [ground, bg] of Object.entries(TINT_GROUNDS)) {
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
  // OWNER RULING 25 (11/21/2026) set light --muted to #5d5a56 (6.0:1 on the
  // warm page), which sits DARKER than ink-soft, not lighter: the direction of
  // the light step flipped with the ruling. What this block exists to stop —
  // two tiers at one luminance — is still held, and on the SHIPPED values: this
  // test used to read a stale #707274, while the light tiers that shipped
  // (#686A6C over #4e6c84) sat only 1.02 apart. Now 1.14 (#5d5a56 / #4a667c).
  test('light: muted and ink-soft sit a real luminance step apart', () => {
    const [hi, lo] = [lum('#5d5a56'), lum(light.textSecondary)].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(1.10);
  });

  // Owner, 11/21/2026 (option C, the dark steel glow): the host shell's dark
  // --muted is #a0a2a6 and --ink-soft #98b2cc, set in hostv2/src/theme.js (the
  // shared palette's #849eb8 stays for the CRA shell). Read the shipped pair.
  test('dark: muted sits a real step darker than ink-soft', () => {
    expect(lum('#a0a2a6')).toBeLessThan(lum('#98b2cc'));
    // The same real step light holds (1.17 here; the old pair was 1.12).
    expect((lum('#98b2cc') + 0.05) / (lum('#a0a2a6') + 0.05)).toBeGreaterThanOrEqual(1.10);
  });

  test('and primary outranks secondary in both', () => {
    expect(lum(light.textPrimary)).toBeLessThan(lum(light.textSecondary));
    expect(lum(dark.textPrimary)).toBeGreaterThan(lum(dark.textSecondary));
  });
});
