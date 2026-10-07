// ─── A $13,200 QUOTE AND "YOU HAVEN'T SET ONE YET" ON ONE SCROLL ──────────
//
// Found by Bench B of the 2026-10-06 review board, in the Sethi seat, and
// confirmed on the iOS Simulator the same evening. The WHERE YOU STAND strip
// renders the budget slot as an em-dash with the line "you haven't set one yet
// — tap to lock a number in" — directly beneath a plan that has just told the
// host, in 44px type, that this event typically lands near $13,200.
//
// The app knows a number. It is showing a blank and a reprimand. The em-dash
// in a slot labelled BUDGET reads as a deficiency the host is behind on, when
// the actual state is "we have a proposal and you have not accepted it yet" —
// which is not the same thing and is not the host's fault.
//
// THE FIX IS NOT TO PRETEND IT IS SET. The number is an estimate, it is
// ungrounded, and writing it into `money.planned` would be a lie with
// downstream consequences — every engine sizes off the committed budget. The
// slot shows the estimate AS a proposal, marked, and the invitation stays.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

const toPlan = async (page) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });
};

test('THE SLOT PROPOSES instead of scolding, when the app already has a number', async ({ page }) => {
  await toPlan(page);
  const txt = await page.evaluate(() => document.body.innerText || '');

  // (premise) the app really does hold an estimate on this screen — without
  // this the assertion below could pass on a plan that has nothing to offer.
  expect(txt).toMatch(/A number to plan around/i);
  expect(txt).toMatch(/\$[\d,]+/);

  // The reprimand is gone…
  expect(txt).not.toMatch(/you haven.t set one yet/i);
  // …and what replaces it names the number and whose move it is.
  expect(txt).toMatch(/suggested|proposed|typical/i);
});

test('AND IT STILL ASKS when there is genuinely nothing to propose', async ({ page }) => {
  // The other end, so the fix is not a deletion. An event with no type and no
  // headcount gives the estimator nothing, and the honest slot there IS an
  // invitation to set one.
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'e2e-nobudget', name: 'Bare event', type: 'Birthday', date: '2027-06-17',
        venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 0,
        budget: [], vendors: [], guests: [],
      }]));
      localStorage.setItem('ngw-hostv2-last-event', 'e2e-nobudget');
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    } catch { /* private */ }
  });
  await page.goto('./?elegant=1');
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).toMatch(/tap to lock a number in/i);
});
