// ─── SEND THE DETAILS, FROM YOUR OWN PHONE; WHO'S CONFIRMED (11/15/2026) ────
//
// Owner + host board ruling: hosts keep texting from their own phones; the app
// makes that one tap and records the host's word. No Twilio, and the app never
// claims a text was sent — an sms: tap proves only that the composer opened.
//
// The words are pinned in jest (src/lib/__tests__/vendorDetailsMessage.test.js)
// and the counts in whoIsConfirmed.test.js. jest cannot run hostv2, so this
// proves the SHELL: the vendor card's "Send Marco the details" mints the link
// through the same gated path, and the Text link's sms: body carries the host,
// the event, the date, the job and that link; and the event home shows ONE
// "Who's confirmed" block with the right counts and the names still waiting,
// each part opening the section that owns it, with nothing wider than 390px.
//
// NOT COVERED HERE: a vendor's own "confirmed" / "flagged a problem". The read-
// back (fetchVendorConfirmations) needs a signed-in planner, and no e2e bundle
// with the brief API also has Supabase (see aContractLinkNeverGoesStale). The
// rule is pinned in whoIsConfirmed.test.js; here every vendor reads as
// "hasn't answered", which is the truth in a signed-out browser.
//
// Synthetic names only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'abcdefghij1234567890xy';

const EVENT = {
  id: 'cust-send-details', name: 'Juniper’s Harvest Supper', type: 'Dinner Party', date: dateIn(30),
  startTime: '18:30', startTimeSource: 'host', venue: 'Fort Ward Park',
  hostName: 'Juniper Vale', guestCount: 40, guestMode: 'count', guestCountSource: 'host',
  dietCounts: { Vegetarian: 3, 'Nut allergy': 1 },
  passRequired: false, passReasons: [], budget: [],
  vendors: [
    { id: 'v-cat', name: 'Harbor Rotisserie', contactName: 'Marco Bell', category: 'Catering', phone: '(555) 010-2000' },
    { id: 'v-bake', name: '', category: 'Bakery' },
  ],
  timeline: [
    { id: 't-stuff', task: 'Stuffing', owner: 'Jordan', done: false },
    { id: 't-chairs', task: 'Folding chairs', owner: 'Avery', done: false },
  ],
  helperConfirmed: { 't-chairs': true },
  guests: [
    { id: 'g1', name: 'Ana Cole', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Diaz', rsvp: 'Yes' },
    { id: 'g3', name: 'Cy Evans', rsvp: 'Maybe' }, { id: 'g4', name: 'Di Fox', rsvp: 'No' },
  ],
};

// "Saturday, November 28" — the builder's own format, computed the same way.
const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const boot = async (page) => {
  const calls = { mint: 0 };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-custom-events')) return;   // seed once; reloads keep the host's edits
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route(`${API}/api/events/*/vendor-brief-links`, (route) => { calls.mint += 1; return route.fulfill({ status: 200, json: { ok: true, code: CODE } }); });
  await page.goto('?elegant=1');
  await settled(page);
  return calls;
};

const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'));

test('tap Send Marco the details: the Text link carries host, event, date, job and the minted link', async ({ page }) => {
  const calls = await boot(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await page.locator('.vcard', { hasText: 'Harbor Rotisserie' }).first().evaluate((c) => c.click());
  await page.getByRole('button', { name: 'Send Marco the details', exact: true }).click();

  const text = page.getByRole('link', { name: 'Text Marco', exact: true });
  await expect(text).toBeVisible();
  expect(calls.mint, 'the same mint the brief always used').toBe(1);
  const href = await text.getAttribute('href');
  expect(href.startsWith('sms:5550102000?&body=')).toBe(true);
  const body = decodeURIComponent(href.slice('sms:5550102000?&body='.length));
  expect(body).toContain('Hi Marco, it’s Juniper Vale.');
  expect(body).toContain('I’m hosting Juniper’s Harvest Supper on ' + longDate(EVENT.date) + ' at 6:30 PM at Fort Ward Park');
  expect(body).toContain('40 guests (3 vegetarian, 1 nut allergy)');
  expect(body).toContain('You’re doing the catering.');
  expect(body).toMatch(new RegExp('\\?vendor=' + CODE + '$'));
  expect(body).not.toMatch(/undefined|null|TBD/);
  // The message is on screen before it goes, word for word.
  await expect(page.locator('[data-send-details-body]')).toHaveText(body);
  expect(await overflowX(page), 'the send panel is wider than the phone').toBeLessThanOrEqual(0);

  // Nothing is recorded as sent until the host acts; the brief ledger is the
  // same one the gate reads.
  const before = (await stored(page)).find((e) => e.id === EVENT.id);
  expect(before.briefSharedVendorIds).toEqual(['v-cat']);
  const vBefore = before.vendors.find((v) => v.id === 'v-cat');
  expect(JSON.stringify(vBefore)).not.toMatch(/host-logged/);
  // "Mark it sent" is the host's word, recorded as theirs.
  await page.getByRole('button', { name: 'Mark it sent', exact: true }).click();
  await expect.poll(async () => JSON.stringify(((await stored(page)).find((e) => e.id === EVENT.id).vendors.find((v) => v.id === 'v-cat')))).toMatch(/host-logged/);
});

test('a vendor with no name, phone or email: "Send the details", no Text or Email link, and the card says what would make it one tap', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await page.locator('.vcard', { hasText: 'Bakery' }).first().evaluate((c) => c.click());
  await page.getByRole('button', { name: 'Send the details', exact: true }).click();
  await expect(page.locator('[data-send-details-body]')).toBeVisible();
  await expect(page.getByRole('link', { name: /^(Text|Email) / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy message', exact: true })).toBeVisible();
  await expect(page.getByText('Add their phone or email on this card to send it in one tap.')).toBeVisible();
});

test('Who’s confirmed: one block on the event home, right counts, names still waiting, each part opens its section', async ({ page }) => {
  await boot(page);
  const block = page.locator('[data-who-confirmed]');
  await expect(block).toBeVisible();
  await expect(block.locator('[data-who-part]')).toHaveText(['Vendors 0 of 2 confirmed', 'Helpers 1 of 2', 'Guests 2 yes, 1 maybe']);
  // The waiting names are rows now, at every width (cohesion #40, 11/24/2026).
  await expect(block.locator('[data-who-waiting]')).toHaveCount(0);
  await expect(block.locator('[data-who-group="vendors"] [data-who-row] .tt-row-t')).toHaveText(['Harbor Rotisserie', 'Bakery']);
  await expect(block.locator('[data-who-group="helpers"] [data-who-row]')).toHaveText([/^Stuffing\s*Jordan/]);
  await expect(block.locator('[data-who-flagged]')).toHaveCount(0);   // no vendor answered, so none flagged
  await expect(page.locator('[data-who-confirmed]')).toHaveCount(1);
  expect(await overflowX(page), 'the home is wider than the phone').toBeLessThanOrEqual(0);
  const box = await block.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  await block.locator('[data-who-part="guests"]').click();
  await expect(page.locator('#sheet-title')).toHaveText(/^Guest/);
});

test('Who’s confirmed reads the host’s confirm: with Jordan confirmed, the count moves and the name drops', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ ...e, helperConfirmed: { 't-chairs': true, 't-stuff': true } }]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  const block = page.locator('[data-who-confirmed]');
  await expect(block.locator('[data-who-part="helpers"]')).toHaveText('Helpers 2 of 2');
  await expect(block.locator('[data-who-group="vendors"] [data-who-row] .tt-row-t')).toHaveText(['Harbor Rotisserie', 'Bakery']);
  await expect(block.locator('[data-who-group="helpers"]')).toHaveCount(0);
});
