// ─── THE REASON WRAPS, IT IS NOT CUT (design audit batch 1, 11/20/2026) ─────
//
// The board's "Then, in order" rows carry one short reason beside the title
// (`.ef-why`). It was `nowrap` + `text-overflow: ellipsis` everywhere except
// the desktop rail, so at 390 the board read "past its w…", "Currently
// consid…", "0 of 5 confirmed gue…" — the reason cut mid-word while the title
// next to it wrapped to two full lines anyway. A reason a host cannot read is
// not a reason.
//
// Measured at every project size, and again after the device turns: every
// reason's text fits its box (scrollWidth <= clientWidth) and no reason is
// set to ellipsis.
import { test, expect, settled, dateIn } from './fixtures.mjs';

// Vendors at three stages, guests with no seats, and a near date — the seed
// that produced the four truncated reasons in the audit.
const EVENT = {
  id: 'reason-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Avery', phone: '(555) 010-0101', rsvp: 'Yes' },
    { id: 'g2', name: 'Riley Park', phone: '(555) 010-0102', rsvp: 'Yes' },
    { id: 'g3', name: 'Sam Lee', email: 'sam@example.com', rsvp: 'Maybe' },
    { id: 'g6', name: 'Morgan Diaz', email: 'morgan@example.com', rsvp: 'Yes' },
    { id: 'g8', name: 'Pat Quinn', phone: '(555) 010-0108', rsvp: 'Yes' },
    { id: 'g10', name: 'Jamie Fox', phone: '(555) 010-0110', rsvp: 'Yes' },
  ],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
    { id: 'v-ph', name: 'Lumen Photo', category: 'Photographer', status: 'Contacted', cost: 1200 },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }],
  timeline: [{ id: 't3', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
};

const reasons = (page) => page.locator('.ef-row .ef-why').evaluateAll((els) => els
  .filter((e) => e.getClientRects().length > 0)
  .map((e) => {
    const cs = getComputedStyle(e);
    return { text: e.textContent.trim(), sw: e.scrollWidth, cw: e.clientWidth, ellipsis: cs.textOverflow === 'ellipsis' };
  }));

const expectWhole = async (page, where) => {
  const rows = await reasons(page);
  // PREMISE: the seed puts reasons on the board, so "none are cut" is a claim.
  expect(rows.length, `no "Then, in order" reasons rendered ${where}`).toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.sw, `"${r.text}" is cut ${where} (${r.sw} > ${r.cw})`).toBeLessThanOrEqual(r.cw);
    expect(r.ellipsis, `"${r.text}" is set to ellipsis ${where}`).toBe(false);
  }
};

test('every "Then, in order" reason is shown whole', async ({ page }) => {
  await boot(page);
  await expectWhole(page, 'at load');
});

test('turning the device keeps every reason whole', async ({ page }) => {
  const vp = page.viewportSize();
  await boot(page);
  await expectWhole(page, 'before turning');
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(500);
  await expectWhole(page, `after turning to ${vp.height}x${vp.width}`);
});
