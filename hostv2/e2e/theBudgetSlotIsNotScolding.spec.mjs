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

  // ── AND THE POSITIVE ASSERTION IS SCOPED TO THE SLOT ──────────────────
  // As first written this read `expect(txt).toMatch(/suggested|proposed|
  // typical/i)` against document.body. TWO benches of the re-score board
  // independently red-proofed it and watched it PASS with the slot rendering
  // nothing at all — because the budget ASK on the same page already says
  // "typical lands near $13,200" and "Typical · est.". The positive half was
  // satisfied by text this fix did not write, leaving a negative assertion
  // as the only real guard, and a copy rename would have turned it green
  // with the defect fully present.
  // That is the identical vacuum the commit one earlier congratulated itself
  // for closing. Scoped to the tile now, so only the slot can satisfy it.
  const slot = await page.evaluate(() => {
    const label = [...document.querySelectorAll('*')]
      .find((el) => !el.children.length && /^BUDGET$/i.test((el.textContent || '').trim()));
    if (!label) return null;
    const tile = label.closest('button, .tile, [class*="tile"]') || label.parentElement;
    return tile ? (tile.innerText || '').replace(/\n+/g, ' | ') : null;
  });
  expect(slot, 'the BUDGET slot is on the plan surface').toBeTruthy();
  expect(slot).toMatch(/\$[\d,]+/);
  // Was /typical for an event this size/. The host asked whether "typical"
  // meant typical or median; it meant neither — it is the midpoint of an
  // authored band, and on right-skewed spend a midpoint sits above a median.
  // The slot shows that same figure, so it took the same correction.
  expect(slot).toMatch(/mid-range for an event this size/i);
  expect(slot).toMatch(/tap to use it or set your own/i);
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

// ── AND IT MUST NOT LOOK LIKE A NUMBER THE HOST AGREED TO ────────────────
// Bench C's re-score, 2026-10-06: the first cut rendered the proposed figure
// in byte-identical type to a committed budget. On a strip headed WHERE YOU
// STAND, the loudest element stated a number nobody had accepted, with an
// 11px subline carrying the whole distinction. Muted is this app's register
// for a figure that is not yet a fact.
test('A PROPOSAL LOOKS LIKE ONE: the suggested figure is not in committed ink', async ({ page }) => {
  await toPlan(page);
  const read = await page.evaluate(() => {
    const strip = [...document.querySelectorAll('*')]
      .find((el) => /WHERE YOU STAND/i.test(el.textContent || '') && el.querySelector('.t-num'));
    const nums = strip ? [...strip.querySelectorAll('.t-num')] : [];
    const budget = nums.find((n) => /^\$/.test((n.textContent || '').trim()));
    if (!budget) return null;
    const cs = getComputedStyle(budget);
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
    return { text: budget.textContent.trim(), color: cs.color, muted };
  });
  expect(read, 'the budget slot renders a figure on the plan surface').toBeTruthy();
  expect(read.text).toMatch(/^\$[\d,]+$/);
  // The honest assertion is that it is NOT the default ink. Comparing against
  // the resolved --muted token rather than a literal, so a palette change
  // cannot silently turn this green.
  const toRgb = (v) => v.replace(/\s/g, '');
  expect(toRgb(read.color)).not.toBe('rgb(255,255,255)');
  expect(read.muted.length).toBeGreaterThan(0);
});
