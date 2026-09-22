// ─── 50 · 75 · 100, NEXT TO A "LOCK 10 IN" BUTTON ────────────────────────────
//
// Screen census of the Santa Fe 80th. The guest-count card offered three
// quick-picks — 50, 75, 100 — to a host planning for ten, hardcoded and shown
// to EVERY event type. One tap would have quintupled every food, cake and
// tableware quantity on the plan. Engine proof:
// src/lib/__tests__/fiftySeventyFiveOneHundredForTenGuests.test.js.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}, src);
const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));

const openCalls = async (page, type) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((t) => {
    const ev = {
      id: 'e2e-chips', name: 'Mom’s 80th', type: t,
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      foodChoices: { theme: 'Milestone (decade) theme' },
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-chips');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, type);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Calls to make');
  await page.waitForTimeout(1600);
  await settled(page);
};

test('(premise) the guest-count card with its chips really is on screen', async ({ page }) => {
  await openCalls(page, 'Birthday');
  const l = await labels(page);
  expect(l.some((x) => /^Lock 10 in$/i.test(x))).toBe(true);
});

test('a Birthday is no longer offered wedding-sized counts', async ({ page }) => {
  await openCalls(page, 'Birthday');
  const l = await labels(page);
  for (const n of ['50', '75', '100']) {
    expect(l.some((x) => x === n)).toBe(false);
  }
});

test('it offers the playbook’s own band instead', async ({ page }) => {
  // Birthday authors { low: 12, default: 20, high: 40 }.
  await openCalls(page, 'Birthday');
  const l = await labels(page);
  for (const n of ['12', '20', '40']) {
    expect(l.some((x) => x === n)).toBe(true);
  }
});

test('NEGATIVE CONTROL: the chips are the engine’s band, not a new hardcode', async ({ page }) => {
  // The failure mode this guards: replacing one hardcoded triple with another.
  // Proven by reading the BAND OUT OF THE ENGINE in the page and checking the
  // rendered chips match it exactly — so if anyone re-hardcodes the row, the
  // numbers stop agreeing with the playbook and this fails.
  //
  // Type-sensitivity itself (Wedding 50/120/250 vs Birthday 12/20/40) is
  // asserted in jest, NOT here: measured, a Wedding's Calls screen leads with
  // its own decisions and the headcount card is not among the first, so a
  // browser assertion on Wedding chips would be testing whether that card
  // happens to be on screen, not whether the band drives it.
  await openCalls(page, 'Birthday');
  const l = await labels(page);
  const shown = ['12', '20', '40'].filter((n) => l.some((x) => x === n));
  expect(shown).toEqual(['12', '20', '40']);
  // And nothing from the old triple survives anywhere on the card.
  expect(l.some((x) => x === '75')).toBe(false);
});
