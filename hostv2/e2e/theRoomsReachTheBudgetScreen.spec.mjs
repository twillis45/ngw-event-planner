// ─── THE ROOMS, ON THE SCREEN WHERE THE MONEY IS COMMITTED ──────────────────
//
// `belowLodgingFloor` was computed 2026-09-22 and read by no UI for fifteen
// days. It was asserted seven times in jest the whole time, which is exactly
// why this spec exists and why it is an e2e: a field with seven green unit
// assertions and zero readers is the precise shape of the defect, and another
// unit test would have reproduced it rather than closed it.
//
// The numbers are the host's own — the six Santa Fe listings this app actually
// showed her, at their captured prices. The cheapest is $2,180 against a
// $2,000-$6,000 party range, so it does NOT trip the boolean, and that is the
// DEFAULT case. Wiring the boolean alone would have left the real shortlist
// silent on the screen where one tap commits.
import { test, expect, settled } from './fixtures.mjs';

const SANTA_FE = [
  { name: 'Private backyard with BBQ near the Plaza', priceShown: 2180, url: 'https://www.airbnb.com/rooms/1' },
  { name: 'Spectacular views from a 5-acre estate', priceShown: 4371, url: 'https://www.airbnb.com/rooms/2' },
  { name: 'Secluded estate with hot tub and views', priceShown: 5400, url: 'https://www.airbnb.com/rooms/3' },
  { name: 'Mountain views from 6 secluded acres', priceShown: 6211, url: 'https://www.airbnb.com/rooms/4' },
  { name: '3-unit compound 2 blocks from the Plaza', priceShown: 6984, url: 'https://www.airbnb.com/rooms/5' },
  { name: 'Rooftop jacuzzi with panoramic mountain views', priceShown: 9040, url: 'https://www.airbnb.com/rooms/6' },
];

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const openBudget = async (page, over = {}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([opts, extra]) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-rooms', name: "Mom's 80th", type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
      guestMode: 'count', guestCount: 10,
      lodgingOptions: opts,
      guests: [], budget: [], vendors: [], timeline: [],
      ...extra,
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-rooms');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [SANTA_FE, over]);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Set your budget');
  await page.waitForTimeout(1200);
  await settled(page);
  return bodyText(page);
};

test('(premise) the budget proposal is on screen with its one-tap chip', async ({ page }) => {
  // Without this, every assertion below could pass over a sheet that never
  // opened — and an absent string is not a passing one.
  const t = await openBudget(page);
  expect(t).toMatch(/the middle of the range is \$4,000/);
  expect(t).toMatch(/Use \$4,000/);
});

test('THE ROOMS REACH THE HOST — her own cheapest listing, in dollars', async ({ page }) => {
  const t = await openBudget(page);
  expect(t).toMatch(/The rooms are on top of this/);
  expect(t).toMatch(/\$2,180 for the stay/);
  expect(t).toMatch(/Private backyard with BBQ near the Plaza/);
  // The relationship, not just the two numbers side by side.
  expect(t).toMatch(/this range covers the party/i);
  expect(t).toMatch(/not the stay, the flights, or travel insurance/i);
  // $2,180 < $6,000, so the boolean is false and the stronger clause must be
  // absent. A sentence that always says "more than the top" would be wrong here.
  expect(t).not.toMatch(/more than the \$6,000 top/);
});

test('AND THE FLAG ITSELF SPEAKS when the picked place outruns the band', async ({ page }) => {
  const t = await openBudget(page, { lodging: { hotelName: 'Rooftop jacuzzi with panoramic mountain views' } });
  expect(t).toMatch(/\$9,040 for the stay/);
  expect(t).toMatch(/the place you chose/i);
  expect(t).toMatch(/more than the \$6,000 top of this range/);
});

test('IT SITS BETWEEN THE ESTIMATE AND THE BUTTON, which is the point', async ({ page }) => {
  // The same reading-order rule the sibling note is held to: a true sentence
  // below the one-tap chip would not have informed the tap.
  const t = await openBudget(page);
  const estimate = t.search(/the middle of the range is \$4,000/);
  const rooms = t.search(/The rooms are on top of this/);
  const chip = t.search(/Use \$4,000/);
  expect(estimate).toBeGreaterThan(-1);
  expect(rooms).toBeGreaterThan(estimate);
  expect(chip).toBeGreaterThan(rooms);
});

test('NEGATIVE CONTROL: no shortlist, no sentence — and never a zero', async ({ page }) => {
  // lodgingFloor refuses to guess a price, so a host with no shortlist must
  // get silence here rather than "$0 for the stay".
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  const t = await openBudget(page, { lodgingOptions: [] });
  expect(t).toMatch(/the middle of the range is/);        // premise: still the budget screen
  expect(t).not.toMatch(/The rooms are on top of this/);
  expect(t).not.toMatch(/\$0 for the stay/);
});
