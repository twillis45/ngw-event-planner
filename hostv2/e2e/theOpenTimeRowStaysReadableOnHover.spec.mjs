// ─── THE OPEN TIME ROW STAYS READABLE ON HOVER (11/21/2026) ──────────────────
//
// The board's time-conflict hero offers "Set a different time", which opens in
// place into `.confrow.confrow-open`. Its hover fill was a dark literal
// (#20242a) that applied in BOTH themes, so in light — white panels since owner
// ruling 25 — a pointer resting on the open row turned it dark gray under the
// light theme's dark --ink label. Measured here on the row's own label against
// the row's hovered ground, in light (the fault) and dark (the control, which
// must not move).
//
// On a touch project (mobile: hasTouch, hover:none) the hover fill is reset to
// `inherit` by the hover-parity block, so that project measures the resting
// row: still a valid floor, just not the pointer path.
import { test, expect, dateIn } from './fixtures.mjs';

// A venue that opens at 10:00 AM and three vendors booked to arrive before it:
// conflicts.js's arrival_before_access rule, the one that carries the
// `custom: { kind: 'time' }` fix the open row is built from. Three, because
// eventPlan only bundles a surface's raises at three or more, and only the
// bundle ("Untangle 3 conflicts…") becomes the grounded conflict hero.
const EVENT = {
  id: 'opentime-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [
    { id: 'v-venue', name: 'The Ironwood Room', category: 'Venue', status: 'Booked', arrivalTime: '10:00 AM', contractSigned: true },
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Booked', arrivalTime: '8:00 AM', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-flo', name: 'Petal & Stem', category: 'Florist', status: 'Booked', arrivalTime: '8:30 AM' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Booked', arrivalTime: '9:00 AM' },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// The label's color composited over every translucent layer down to the first
// opaque ground, the same composition nothingReadsDarkOnDarkInLight uses.
const measureLabel = () => {
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const rgba = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number); return m.length >= 3 ? [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]] : null; };
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3]));
  const el = document.querySelector('.hero.elegant .confrow.confrow-open > .t');
  if (!el) return null;
  const row = el.closest('.confrow-open');
  const layers = [];
  let ground = [255, 255, 255];
  for (let n = el; n; n = n.parentElement) {
    const b = rgba(getComputedStyle(n).backgroundColor);
    if (!b || b[3] === 0) continue;
    if (b[3] === 1) { ground = b.slice(0, 3); break; }
    layers.push(b);
  }
  for (const l of layers.reverse()) ground = over(l, ground);
  const c = rgba(getComputedStyle(el).color);
  const ink = over(c, ground);
  return {
    text: el.textContent.trim(),
    hovered: row.matches(':hover'),
    rowBg: getComputedStyle(row).backgroundColor,
    ink: getComputedStyle(el).color,
    ratio: Math.round(ratio(ink, ground) * 100) / 100,
  };
};

const boot = async (page, theme) => {
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [EVENT, theme]);
  await page.goto('?elegant=1');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1200);
};

for (const theme of ['light', 'dark']) {
  test(`the open "Set a different time" row stays readable on hover (${theme})`, async ({ page }) => {
    await boot(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const closed = page.locator('.hero.elegant .conflict-hero button.confrow', { hasText: 'Set a different time' });
    await expect(closed, 'premise: the time-conflict hero offers "Set a different time"').toBeVisible({ timeout: 10000 });
    await closed.click();

    const open = page.locator('.hero.elegant .confrow.confrow-open');
    await expect(open, 'premise: the row opened in place').toHaveCount(1);
    await expect(open.locator('input[type="time"]')).toBeVisible();

    await open.locator('> .t').hover();
    await page.waitForTimeout(500);   // the row's background transition settles

    const m = await page.evaluate(measureLabel);
    expect(m, 'premise: the open row\'s label was measured').not.toBeNull();
    expect(m.text).toBe('Set a different time');
    console.log(`[${theme}] hovered=${m.hovered} rowBg=${m.rowBg} ink=${m.ink} ratio=${m.ratio}`);
    expect(m.ratio, `open row label on its hovered ground (${theme}): ${m.ink} on ${m.rowBg}`).toBeGreaterThanOrEqual(4.5);
  });
}
