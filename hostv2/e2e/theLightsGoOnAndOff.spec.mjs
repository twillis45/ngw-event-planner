// ─── LIGHT MODE, AND THE HALF-FLIP THAT MADE IT UNREADABLE ────────────────
//
// Host asked for light on/off. The first attempt (2026-09-27) flipped
// ACTIVE_MODE and nothing happened, because theme.js imported `dark` and
// `carbonNeutral.mid` BY NAME — the mode bundle was never consulted. Pointing
// only the text bundle at light then produced near-black type on a dark
// ground and was reverted on sight.
//
// Two things had to be true together: a light step had to exist in the
// surface ramp (carbonNeutral had four dark levels and none light), and BOTH
// ends — surfaces and text — had to select by the same mode. This gate exists
// because the failure mode is a half-flip that still "works" on one axis.
import { test, expect, settled } from './fixtures.mjs';

const lum = (c) => {
  const m = c.match(/[\d.]+/g).map(Number);
  const f = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const hexLum = (h) => {
  const m = String(h).replace('#', '');
  const n = m.length === 3 ? m.split('').map((x) => x + x) : m.match(/../g);
  return lum(`rgb(${n.map((x) => parseInt(x, 16)).join(',')})`);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const seed = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-theme', name: '50th at Disneyland', type: 'Birthday',
      date: '2027-11-06', endDate: '2027-11-11', isDestination: true,
      venueCity: 'Anaheim', state: 'CA', guestMode: 'count', guestCount: 16,
      totalBudget: 12000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-theme');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

const paint = (page) => page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  return {
    attr: document.documentElement.getAttribute('data-theme'),
    bg: cs.backgroundColor,
    ink: cs.color,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  };
});

test('dark is what a host gets without asking', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  const p = await paint(page);
  expect(p.attr).toBe('dark');
  expect(lum(p.bg)).toBeLessThan(0.2);
});

test('?theme=light turns it on, and BOTH ends move', async ({ page }) => {
  // The half-flip check. Surfaces come from carbonNeutral, text and status
  // from the mode bundle; light-on-light or dark-on-dark means one of the two
  // did not follow.
  await seed(page);
  await page.goto('?elegant=1&theme=light');
  await settled(page);
  const p = await paint(page);
  expect(p.attr).toBe('light');
  expect(lum(p.bg)).toBeGreaterThan(0.7);      // the page really is light
  expect(lum(p.ink)).toBeLessThan(0.1);        // …and the ink really is dark
  expect(ratio(p.ink, p.bg)).toBeGreaterThan(4.5);
  expect(p.scheme).toBe('light');              // native controls follow too
});

test('it persists without the parameter, and ?theme=dark takes it back', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1&theme=light');
  await settled(page);
  await page.goto('?elegant=1');               // no parameter this time
  await settled(page);
  expect((await paint(page)).attr).toBe('light');

  await page.goto('?elegant=1&theme=dark');
  await settled(page);
  const back = await paint(page);
  expect(back.attr).toBe('dark');
  expect(lum(back.bg)).toBeLessThan(0.2);
  expect(ratio(back.ink, back.bg)).toBeGreaterThan(4.5);
});

// ── THE WIDE GROUND IS ITS OWN PLANE, IN BOTH MODES ───────────────────────
//
// The half-flip came back on 2026-09-29 through the one token that opted out
// of the bundle. `--field` — the ground behind the stage at >=1024 — was
// pinned to carbonNeutral.deep.bg with no isLight branch, so below 1024 light
// mode was correct (the body takes --bg-band there) and at 1024 and up it
// painted light content on a dark page. Four projects failed; the two that
// pass a phone-width viewport did not, which is exactly how it survived a
// matrix and a reading.
//
// The test above catches the darkness. This one catches the SHAPE, which the
// darkness check cannot see: the composition claims three planes — field,
// content ground, panel — and a future edit that collapses any two of them
// (the easy mistake in either direction) leaves a page that is the right
// brightness and has lost its depth. Asserted in BOTH modes, because the
// whole lesson of this file is that one mode passing proves nothing about the
// other.
for (const mode of ['dark', 'light']) {
  test(`the wide ground reads in three planes — ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto(`?elegant=1&theme=${mode}`);
    await settled(page);

    const planes = await page.evaluate(() => {
      const rs = getComputedStyle(document.documentElement);
      const v = (n) => rs.getPropertyValue(n).trim();
      return { field: v('--field'), ground: v('--bg'), panel: v('--card') };
    });

    for (const [k, val] of Object.entries(planes)) expect(val, `--${k} is unset`).toBeTruthy();
    expect(new Set(Object.values(planes)).size, `planes collapsed: ${JSON.stringify(planes)}`).toBe(3);

    // And they are ORDERED, field furthest back and panel furthest forward.
    // Same direction in both modes, which is not a coincidence worth a branch:
    // the light step was built by inverting this ramp's tone while keeping its
    // structure ("bg recedes, panel comes forward"), so the panel is the
    // lightest value at both ends — #1E1F22 on dark, #FFFFFF on light.
    const [f, g, p] = [planes.field, planes.ground, planes.panel].map(hexLum);
    expect(f, 'the field must sit behind the content ground').toBeLessThan(g);
    expect(g, 'the panel must come forward of the ground').toBeLessThan(p);
  });
}
