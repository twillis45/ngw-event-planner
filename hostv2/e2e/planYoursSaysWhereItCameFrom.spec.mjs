// ─── "PLAN YOURS" SAYS WHERE IT CAME FROM ───────────────────────────────────
// Marketing & Pricing Review Board, 11/18/2026, step 1 ("this week"): every
// guest RSVP page and vendor brief carries a quiet "plan yours" line, and its
// link says where it came from. Before: the invite's line linked to the bare
// app (a generic start, nothing remembered), and the vendor brief had none.
// Now the invite link carries from=invite and the event KIND; the vendor
// brief's carries from=vendor; a host arriving that way sees an example for
// that kind, and the first event they create records where they came from.
// Never on a solemn event.
import { test, expect, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT = {
  id: 'cust-plan-yours', rsvpCode: 'public-plan-yours-code-01', name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(20), startTime: '16:00', guestEstimate: 12, guestMode: 'list', guests: [{ id: 'g1', name: 'Ana' }],
  vendors: [], budget: [], timeline: [],
};
const guest = async (page, ev) => {
  await page.route(API + '/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(API + '/api/public/invite/' + ev.rsvpCode, (r) => r.fulfill({ status: 200, json: { ok: true, event: ev } }));
  await page.route(API + '/api/public/invite/' + ev.rsvpCode + '/opened', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.goto('?rsvp=' + ev.rsvpCode);
};

test('the invite\'s "plan yours" link carries the invite and the event kind, nothing else', async ({ page }) => {
  await guest(page, EVENT);
  const link = page.locator('[data-plan-yours]');
  await expect(link).toHaveText(/Planning something of your own\?/);
  const href = new URL(await link.getAttribute('href'));
  expect(Object.fromEntries(href.searchParams)).toEqual({ from: 'invite', kind: 'Friendsgiving' });
  expect(href.search).not.toContain(EVENT.rsvpCode);
});

test('a repast invite carries no "plan yours" line', async ({ page }) => {
  await guest(page, { ...EVENT, rsvpCode: 'public-plan-yours-code-02', name: 'Repast for Mr. Lewis', type: 'Repast' });
  await expect(page.getByText(/Make it with/)).toHaveCount(0);
});

test('the vendor brief carries a "plan yours" line tagged as a vendor brief', async ({ page }) => {
  const CODE = 'abcdefghij1234567890pq';
  await page.route(`${API}/api/public/vendor-brief/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, brief: {
    vendorId: 'v1', vendorName: 'Capital Rotisserie Catering', category: 'Catering', eventId: 'e1', eventName: 'Vida’s Game Night',
    eventDate: dateIn(30), venue: 'Fort Ward Park', ros: [], hostName: 'Vida Reyes', guestCount: 40, confirmState: null } } }));
  await page.goto('?vendor=' + CODE);
  const link = page.locator('[data-plan-yours]');
  await expect(link).toHaveText(/Hosting something of your own\? Plan it free/);
  expect(Object.fromEntries(new URL(await link.getAttribute('href')).searchParams)).toEqual({ from: 'vendor' });
});

test('a host who arrives from an invite sees that kind\'s example, and her first event records it', async ({ page }) => {
  await page.goto('./?elegant=1&from=invite&kind=Friendsgiving');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Like “Friendsgiving for 20 people, Saturday at 4”.')).toBeVisible();
  await page.getByPlaceholder(/crab feast/i).first().fill('Birthday party for 20 people next Saturday');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
  expect(ev.acquisitionSource).toMatchObject({ from: 'invite', kind: 'Friendsgiving' });
  expect(Object.keys(ev.acquisitionSource).sort()).toEqual(['at', 'from', 'kind']);
  // spent: it does not stamp the next event too
  expect(await page.evaluate(() => localStorage.getItem('ngw-arrival'))).toBe(null);
});
