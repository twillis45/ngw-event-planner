// ─── A HOLIDAY INSIDE A TRIP, AND THE DAYS A TRIP STILL OWES (11/22/2026) ────
//
// Owner rulings: "trip wins" and "dates first as the main ask".
//
// 1. "New Year's Eve trip to Nashville Dec 30 – Jan 2 for 12 friends" was
//    heard as a New Year's Eve Party: a one-night party over four days, with a
//    dinner card titled "My dinner" whose night read "not picked" although she
//    had said it. It is a Group Trip, and its dinner is the New Year's Eve
//    dinner on Thu, Dec 31.
// 2. "July 4th weekend trip to the lake" heard no occasion and never reached a
//    plan; typed by hand as a trip it led with "Set your budget." while its
//    last day was unknown. It is a Group Trip whose board asks for the range,
//    From – To, before anything else.
//
// The jest file of the same name covers the parser, the dinner record and the
// ranking. This drives the box a host types in.
import { test, expect, settled } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const NYE_TRIP = "New Year's Eve trip to Nashville Dec 30 – Jan 2 for 12 friends";
const LAKE = 'July 4th weekend trip to the lake';
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
const heroAsk = (page) => page.locator('.hero h2.ask').first();

const create = async (page, text) => {
  await page.route(API + '/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00'));
  await page.goto('?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(text);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click({ timeout: 15000 });
  await page.getByRole('button', { name: /^Open your plan$/ }).click({ timeout: 30000 });
  await settled(page);
};

test('a New Year’s Eve trip is a Group Trip, and its dinner is New Year’s Eve, Thu, Dec 31', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, NYE_TRIP);
  const ev = await savedEvent(page);
  expect([ev.type, ev.date, ev.endDate]).toEqual(['Group Trip', '2026-12-30', '2027-01-02']);
  expect(ev.celebration).toEqual({ night: '2026-12-31', occasion: 'New Year’s Eve' });

  const card = page.locator('[data-dinner-card]');
  await expect(card).toContainText('New Year’s Eve dinner');
  await expect(card).toContainText('Thu, Dec 31');
  await expect(card).not.toContainText('Night not picked');
  await expect(page.locator('body')).not.toContainText(/My dinner|new year's eve party/i);
});

test('a weekend trip with its last day owed asks for the range first, ahead of the budget', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, LAKE);
  let ev = await savedEvent(page);
  expect([ev.type, ev.date, ev.endDate, ev.datesToConfirm]).toEqual(['Group Trip', '2027-07-04', undefined, true]);

  await expect(heroAsk(page)).toHaveText('Which dates? From – to.');
  await expect(page.locator('body')).not.toContainText(/which day does it end|last day of the/i);

  // The range is given once, From – To, and the dates stop leading.
  const range = page.locator('[data-date-range]').first();
  await range.getByLabel('Event date').fill('2027-07-02');
  await range.getByLabel('Last day').fill('2027-07-05');
  await page.getByRole('button', { name: 'Move everything to these dates' }).first().click();
  await settled(page);
  ev = await savedEvent(page);
  expect([ev.date, ev.endDate, ev.datesToConfirm]).toEqual(['2027-07-02', '2027-07-05', null]);
  await expect(heroAsk(page)).not.toHaveText(/Which dates/);
});
