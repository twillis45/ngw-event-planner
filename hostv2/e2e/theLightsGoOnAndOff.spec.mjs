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
import { test, expect } from './fixtures.mjs';

const lum = (c) => {
  const m = c.match(/[\d.]+/g).map(Number);
  const f = m.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
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
  await page.waitForTimeout(1500);
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
  await page.waitForTimeout(1500);
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
  await page.waitForTimeout(1200);
  await page.goto('?elegant=1');               // no parameter this time
  await page.waitForTimeout(1200);
  expect((await paint(page)).attr).toBe('light');

  await page.goto('?elegant=1&theme=dark');
  await page.waitForTimeout(1200);
  const back = await paint(page);
  expect(back.attr).toBe('dark');
  expect(lum(back.bg)).toBeLessThan(0.2);
  expect(ratio(back.ink, back.bg)).toBeGreaterThan(4.5);
});
