// ─── THE VENDOR PAGE LIVES IN THE NEW APP (11/13/2026) ──────────────────────
//
// A vendor's brief link (?vendor=TOKEN) used to be redirected out of hostv2 to
// the frozen CRA shell (App.js VendorBriefView, A1 freeze, scheduled for
// deletion). It now renders here, in VendorBriefV2. These tests pin the move
// and the three board findings it fixed (board 2026-11-12, follow-up 1):
//   1. no guest count, so a caterer could not size the order;
//   2. "Coordinated by your event planner" to a host who is not a planner;
//   3. the day-of contact was always the host.
//
// RED-PROOF: route ?vendor= back to the old page in main.jsx and every test in
// the first block fails — the redirect leaves the hostv2 bundle, so the brief
// surface never appears.
//
// The brief API is mocked at the e2e bundle's fake host (fixtures.mjs). The
// mock deliberately returns fields the whitelist never sends — money, private
// notes, another vendor — so "the page renders only the whitelist" is checked
// against a server that misbehaves, not one that is polite.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'abcdefghij1234567890xy';
const BRIEF_URL = `${API}/api/public/vendor-brief/${CODE}`;

const CATERER = {
  vendorId: 'v1', vendorName: 'Capital Rotisserie Catering', contactName: 'Dana Whitfield', category: 'Catering',
  arrivalTime: '14:30', briefNote: 'Load in through the side gate.',
  eventId: 'e1', eventName: 'Vida’s Game Night', eventDate: dateIn(30), venue: 'Fort Ward Park',
  ros: [{ time: '14:30', segment: 'Caterer load-in', location: 'Side gate', notes: 'Ask for Sam' },
    { time: null, rel: '1h before guests arrive', segment: 'Buffet set', location: null, notes: null }],
  hostName: 'Vida Reyes', briefContactName: '', briefContactPhone: '',
  guestCount: 40, dietCounts: { Vegetarian: 3, 'Nut allergy': 1 }, confirmState: null,
  // ── never on the whitelist; a misbehaving server must still not show them ──
  notes: 'PRIVATE: deposit $800 paid; they miscounted last time',
  cost: 2400, depositAmt: 800, otherVendors: [{ name: 'Spin Cycle DJ' }],
};

const mockBrief = async (page, brief, calls = {}) => {
  await page.route(BRIEF_URL, (route) => route.fulfill({ status: 200, json: { ok: true, brief } }));
  await page.route(`${BRIEF_URL}/confirm`, (route) => {
    calls.confirm = (calls.confirm || []).concat([route.request().postDataJSON()]);
    return route.fulfill({ status: 200, json: { ok: true, submitted_at: new Date().toISOString() } });
  });
  return calls;
};

const openBrief = async (page, token = CODE) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?vendor=' + encodeURIComponent(token));
  await expect(page.locator('[data-surface="vendor-brief-v2"]')).toBeVisible();
};

const bodyText = (page) => page.evaluate(() => document.body.innerText);

test.describe('the brief a vendor opens renders in hostv2', () => {
  test('?vendor=CODE renders the hostv2 brief page, not the CRA one and not the host shell', async ({ page }) => {
    await mockBrief(page, CATERER);
    await openBrief(page);
    expect(new URL(page.url()).pathname).toMatch(/\/hostv2\/$/);   // never sent one directory up
    await expect(page.locator('h1')).toHaveText('Vida’s Game Night');
    await expect(page.getByText('Capital Rotisserie Catering', { exact: true })).toBeVisible();
    await expect(page.getByText('2:30 PM').first()).toBeVisible();
    await expect(page.getByText('1h before guests arrive')).toBeVisible();   // a relative cue, never a made-up clock
    await expect(page.locator('.splash')).toHaveCount(0);                    // no host chrome
    await expect(page.locator('.tabbar, .next-bar')).toHaveCount(0);
  });

  test('the whitelist holds: no money, no private notes, no other vendor in the DOM', async ({ page }) => {
    await mockBrief(page, CATERER);
    await openBrief(page);
    const text = await bodyText(page);
    for (const needle of ['PRIVATE', 'deposit', '$800', '2400', '800', 'miscounted', 'Spin Cycle']) {
      expect(text, `"${needle}" reached the vendor`).not.toContain(needle);
    }
    await expect(page.getByText('Load in through the side gate.')).toBeVisible();   // briefNote does render
  });

  test('confirm posts to /confirm and shows the confirmed state', async ({ page }) => {
    const calls = await mockBrief(page, CATERER);
    await openBrief(page);
    await page.getByRole('button', { name: 'All good — I\'m confirmed', exact: true }).click();
    await expect(page.getByLabel('On-site contact name')).toHaveValue('Dana Whitfield');   // prefilled
    await page.getByLabel('On-site phone').fill('5550102000');
    await page.getByLabel('Note').fill('Bringing two chafers.');
    await page.getByRole('button', { name: 'Send to Vida Reyes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('You’re confirmed — thanks.');
    expect(calls.confirm).toHaveLength(1);
    expect(calls.confirm[0]).toMatchObject({ state: 'confirmed', on_site_name: 'Dana Whitfield', on_site_phone: '(555) 010-2000', note: 'Bringing two chafers.' });
    expect(calls.confirm[0].idempotency_key).toBeTruthy();
  });

  test('a failed confirm says so and keeps the form — never a fake success', async ({ page }) => {
    await mockBrief(page, CATERER);
    await page.route(`${BRIEF_URL}/confirm`, (route) => route.fulfill({ status: 500, json: { detail: 'nope' } }));
    await openBrief(page);
    await page.getByRole('button', { name: 'Something\'s off', exact: true }).click();
    await page.getByLabel('Note').fill('Wrong date?');
    await page.getByRole('button', { name: 'Send to Vida Reyes', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('That didn’t go through.');
    await expect(page.getByLabel('Note')).toHaveValue('Wrong date?');
  });

  test('a code that does not resolve is a dead link, said plainly', async ({ page }) => {
    await page.route(BRIEF_URL, (route) => route.fulfill({ status: 404, json: { detail: 'brief not found' } }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?vendor=' + CODE);
    await expect(page.getByRole('heading', { name: 'This link isn’t live anymore' })).toBeVisible();
    expect(await bodyText(page)).not.toMatch(/event planner/i);
  });
});

test.describe('board 2026-11-12: what the brief says', () => {
  test('the host’s name appears, never "your event planner"', async ({ page }) => {
    await mockBrief(page, CATERER);
    await openBrief(page);
    await expect(page.getByText('From Vida Reyes').first()).toBeVisible();
    const contact = page.locator('[data-brief="day-of-contact"]');
    await expect(contact).toContainText('Vida Reyes');           // with no one named, the host is the contact
    expect(await bodyText(page)).not.toMatch(/planner/i);
  });

  test('with no name anywhere it says "From the host"', async ({ page }) => {
    await mockBrief(page, { ...CATERER, hostName: '' });
    await openBrief(page);
    await expect(page.getByText('From the host').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'All good — I\'m confirmed', exact: true })).toBeVisible();
    expect(await bodyText(page)).not.toMatch(/planner/i);
  });

  test('the guest count appears for a caterer, with the dietary tally', async ({ page }) => {
    await mockBrief(page, CATERER);
    await openBrief(page);
    await expect(page.locator('[data-brief="guest-count"]')).toHaveText('40 guests');
    await expect(page.locator('[data-brief="diet"]')).toHaveText('3 vegetarian · 1 nut allergy');
  });

  test('…and not for a DJ', async ({ page }) => {
    await mockBrief(page, { ...CATERER, vendorName: 'Spin Cycle', category: 'DJ' });
    await openBrief(page);
    await expect(page.getByText('Spin Cycle', { exact: true })).toBeVisible();
    await expect(page.locator('[data-brief="guest-count"]')).toHaveCount(0);
    await expect(page.locator('[data-brief="diet"]')).toHaveCount(0);
    expect(await bodyText(page)).not.toContain('40 guests');
  });

  test('rentals get the count but not the dietary tally', async ({ page }) => {
    await mockBrief(page, { ...CATERER, vendorName: 'Party Rentals Co', category: 'Rentals' });
    await openBrief(page);
    await expect(page.locator('[data-brief="guest-count"]')).toHaveText('40 guests');
    await expect(page.locator('[data-brief="diet"]')).toHaveCount(0);
  });

  test('a day-of contact the host named replaces the host', async ({ page }) => {
    await mockBrief(page, { ...CATERER, briefContactName: 'Sam Ortiz', briefContactPhone: '(555) 010-3000' });
    await openBrief(page);
    const contact = page.locator('[data-brief="day-of-contact"]');
    await expect(contact).toContainText('Sam Ortiz');
    await expect(contact.getByRole('link', { name: '(555) 010-3000' })).toHaveAttribute('href', 'tel:5550103000');
    await expect(contact).not.toContainText('Vida Reyes');
  });
});

test('the legacy self-contained link still renders, with no confirm form and no private notes', async ({ page }) => {
  // The whole brief in the link, as App.js and eventPool encode it (UTF-8 safe
  // base64). No server is involved: the board ruled it cannot be gated.
  const legacy = {
    vendorName: 'Sweet Crumb Bakery — Alexandria', category: 'Cake', arrivalTime: '16:00',
    eventName: 'Retirement Cookout', eventDate: dateIn(20), venue: 'VFW Post 1503',
    plannerName: 'Todd', plannerPhone: '555-0100', plannerBusiness: '',
    notes: 'PRIVATE: balance due 7/3', briefNote: 'Cake table by the door.',
    ros: [{ time: '16:00', segment: 'Cake drop-off' }],
  };
  const token = await page.evaluate((s) => {
    const bytes = new TextEncoder().encode(s);
    let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }, JSON.stringify(legacy));
  let apiCalls = 0;
  await page.route(`${API}/api/public/vendor-brief/**`, (route) => { apiCalls += 1; return route.fulfill({ status: 404, json: {} }); });
  await openBrief(page, token);
  await expect(page.getByText('Sweet Crumb Bakery — Alexandria', { exact: true })).toBeVisible();
  await expect(page.getByText('From Todd').first()).toBeVisible();
  await expect(page.getByText('Cake table by the door.')).toBeVisible();
  expect(await bodyText(page)).not.toContain('PRIVATE');
  await expect(page.getByRole('button', { name: 'All good — I\'m confirmed', exact: true })).toHaveCount(0);
  expect(apiCalls, 'a self-contained link never asks the server').toBe(0);
});

test('the host names a day-of contact in the share panel, and it is saved on the event', async ({ page }) => {
  const EVENT = { id: 'cust-brief-dayof', name: 'Backyard Birthday', type: 'Birthday Party', date: dateIn(40),
    guestEstimate: 20, guestMode: 'count', guestCountSource: 'host', passRequired: false, passReasons: [],
    budget: [], guests: [], timeline: [], vendors: [{ id: 'v-cat', name: 'Capital Rotisserie', category: 'Catering' }] };
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-custom-events')) return;   // seed once; reloads keep the host’s edits
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route(`${API}/api/events/*/vendor-brief-links`, (route) => route.fulfill({ status: 200, json: { ok: true, code: CODE } }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await page.locator('.vcard', { hasText: 'Capital Rotisserie' }).first().evaluate((c) => c.click());
  await page.getByRole('button', { name: 'Share the vendor brief', exact: true }).click();
  await expect(page.getByText('?vendor=' + CODE)).toBeVisible();
  await page.getByLabel('Day-of contact name for vendor briefs').fill('Sam Ortiz');
  await page.getByLabel('Day-of contact phone for vendor briefs').fill('5550103000');
  await expect.poll(async () => {
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'));
    const ev = stored.find((x) => x.id === EVENT.id) || {};
    return [ev.briefContactName, ev.briefContactPhone];
  }).toEqual(['Sam Ortiz', '(555) 010-3000']);
});
