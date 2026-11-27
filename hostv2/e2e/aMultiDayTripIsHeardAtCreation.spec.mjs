// ─── A MULTI-DAY TRIP IS HEARD AT CREATION (owner report, 11/21/2026) ───────
//
// "Multi day trip not being picked up at creation." Then: "Host should be
// asked for ranges not last day", and "Make sure dates are single source.
// Don't keep asking host for the same information."
//
// The jest file (aMultiDayTripIsHeardAtCreation / eventDatesAreOneSource)
// covers the parser and the one setter. This drives the box a host types in,
// because the defects were on screens: a trip with two dates had no occasion
// so "Put my plan together" never appeared; the reveal never named the span;
// Space kept a second date control; a weekend with no stated days was planned
// as one day and nothing asked which days.
//
// The clock is pinned to Saturday 11/21/2026, so "Dec 3" is this December and
// "next weekend" stays ambiguous whenever CI runs. setFixedTime, not install,
// so timers still run.
// Case-insensitive on the date line: the phone writes it in plain words
// (T2, owner 11/27/2026), wider screens in capitals; the words are the check.
import { test, expect, settled, openSectionByName, identityLine } from './fixtures.mjs';

const SANTA_FE = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights, dinner at an adobe courtyard, she uses a walker and the altitude is hard on her";
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
const DATE_ASKS = /Add the event date|Pick the date|Which dates\?|Which day does it end\?|Set the dates/;

const create = async (page, text) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(text);
  // The confirm screen, before the plan exists: what it heard and what it handed back.
  const confirm = page.locator('body');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 30000 });
  return confirm;
};
const revealCard = (page, title) => page.locator('.rv-snode', { has: page.locator('.rv-slabel', { hasText: title }) }).first();
const openPlan = async (page) => {
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);
};
const spaceDates = async (page) => {
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  // Space SHOWS the dates; it keeps no date input of its own.
  await expect(sheet.getByLabel('Last day of the event')).toHaveCount(0);
  await expect(sheet.locator('.day-crud')).toHaveCount(0);
  return sheet.locator('[data-space-dates]');
};
// Date & time is reached the way a host reaches it from Space: its "Change" link.
const openDates = async (page) => {
  const sd = await spaceDates(page);
  await sd.getByRole('button', { name: /dates in Date & time/ }).click();
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('#sheet-title')).toHaveText('Date & time');
  return sheet;
};
const closeSheet = async (page) => {
  await page.keyboard.press('Escape');
  await settled(page);
};

test('a trip with two dates is a group trip, and every screen says Dec 3–6', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'trip to Nashville Dec 3 – Dec 6 for 8');

  const ev = await savedEvent(page);
  expect([ev.type, ev.date, ev.endDate, ev.guestEstimate, ev.datesToConfirm]).toEqual(['Group Trip', '2026-12-03', '2026-12-06', 8, undefined]);
  await expect(revealCard(page, 'Your Event')).toContainText('Dec 3–6 (3 nights)');

  await openPlan(page);
  await expect(identityLine(page)).toContainText(/DEC 3–DEC 6/i, { useInnerText: true });
  await expect(await spaceDates(page)).toContainText('Dates · Dec 3–6 (3 nights)');
  await closeSheet(page);

  // Calendar: every one of the four days carries the event.
  await openSectionByName(page, 'Calendar');
  const cal = page.locator('[data-calendar]');
  await cal.getByRole('button', { name: 'Month', exact: true }).click();
  for (const d of ['2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']) {
    let cell = cal.locator(`.cal-cell[data-date="${d}"]:not(.is-out)`);
    if (!await cell.count()) { await cal.getByRole('button', { name: 'Next month' }).click(); cell = cal.locator(`.cal-cell[data-date="${d}"]:not(.is-out)`); }
    await expect(cell).toHaveClass(/has-event/);
  }
});

test('the Santa Fe 80th: the dates are set once at creation and nothing asks for them again', async ({ page }) => {
  test.setTimeout(150000);
  await create(page, SANTA_FE);

  // Every field the creation audit lists reaches the saved event.
  const ev = await savedEvent(page);
  expect(ev).toMatchObject({
    type: 'Birthday', honoree: 'Mom', name: 'Mom’s 80th Birthday', guestEstimate: 30,
    date: '2027-06-14', endDate: '2027-06-17',
    isDestination: true, travelMode: 'fly', guestsStayOvernight: true,
    timeOfDay: 'evening', venueCity: 'Santa Fe', venueState: 'NM',
    healthNoted: { yes: true, quote: 'the altitude is hard on her' },
  });
  // One copy of the length: the span is the dates, not a second night count.
  expect(ev.statedNights).toBeUndefined();
  expect(ev.datesToConfirm).toBeUndefined();

  // "she uses a walker" was the audit's one unused clause. Since 10/18/2026
  // (Sprint 0 P1-2) it is READ: it reaches the event as an access need, and
  // her whole sentence is kept for the original-description view.
  expect(JSON.stringify(ev.accessNeeds || [])).toMatch(/walker|mobility/i);
  expect(ev.createdFromText).toBe(SANTA_FE);

  // The reveal names the span and the stay counts its nights.
  await expect(revealCard(page, 'Your Event')).toContainText('Jun 14–17 (3 nights)');
  await expect(revealCard(page, 'Where Everyone Stays')).toContainText('3 nights to cover');

  await openPlan(page);
  await expect(identityLine(page)).toContainText(/JUN 14–JUN 17/i, { useInnerText: true });

  // The board: no hero, chip or card asks for the date again.
  await expect(page.locator('body')).not.toContainText(DATE_ASKS);

  // Checklist: no row asks for the date.
  await openSectionByName(page, 'Your checklist');
  await expect(page.locator('.sheet').last()).not.toContainText(DATE_ASKS);
  await closeSheet(page);

  // Space shows the same range and links to the one place that sets it.
  const sd = await spaceDates(page);
  await expect(sd).toContainText('Dates · Jun 14–17 (3 nights)');
  await expect(sd.getByRole('button', { name: /Change the dates/ })).toBeVisible();
  await closeSheet(page);

  // Calendar spans Jun 14–17.
  await openSectionByName(page, 'Calendar');
  const cal = page.locator('[data-calendar]');
  await cal.getByRole('button', { name: 'Month', exact: true }).click();
  for (let i = 0; i < 12 && !await cal.locator('.cal-cell[data-date="2027-06-14"]:not(.is-out)').count(); i += 1) {
    await cal.getByRole('button', { name: 'Next month' }).click();
  }
  for (const d of ['2027-06-14', '2027-06-15', '2027-06-16', '2027-06-17']) {
    await expect(cal.locator(`.cal-cell[data-date="${d}"]:not(.is-out)`)).toHaveClass(/has-event/);
  }
  await expect(cal.locator('.cal-cell[data-date="2027-06-18"]:not(.is-out)')).not.toHaveClass(/has-event/);
});

test('the range is set in Date & time, From – To, and Space follows it', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, SANTA_FE);
  await openPlan(page);
  const sheet = await openDates(page);
  const range = sheet.locator('[data-date-range]');
  await expect(range.getByLabel('Event date')).toHaveValue('2027-06-14');
  await expect(range.getByLabel('Last day')).toHaveValue('2027-06-17');
  await expect(sheet).toContainText('Dates · Jun 14–17 (3 nights)');

  await range.getByLabel('Last day').fill('2027-06-18');
  await sheet.getByRole('button', { name: 'Move everything to these dates' }).click();
  await settled(page);
  expect((await savedEvent(page)).endDate).toBe('2027-06-18');
  await closeSheet(page);
  await expect(await spaceDates(page)).toContainText('Dates · Jun 14–18 (4 nights)');
});

test('a weekend with no stated days asks for the range, never guesses the last day', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'family reunion July 4th weekend');
  let ev = await savedEvent(page);
  // July 4, 2027 is a Sunday: the start she said stands, the end is owed.
  expect([ev.date, ev.endDate, ev.statedNights, ev.datesToConfirm]).toEqual(['2027-07-04', undefined, undefined, true]);
  // Asked as the range, never the last day alone (owner 11/22/2026).
  await expect(revealCard(page, 'Your Event')).toContainText('which dates? Set the first and last day.');
  await expect(revealCard(page, 'Your Event')).not.toContainText('which day does it end?');

  await openPlan(page);
  const sheet = await openDates(page);
  await expect(sheet.locator('[data-dates-owed]')).toHaveText('Which dates? Set the first and last day.');
  await sheet.locator('[data-date-range]').getByLabel('Event date').fill('2027-07-02');
  await sheet.locator('[data-date-range]').getByLabel('Last day').fill('2027-07-05');
  await sheet.getByRole('button', { name: 'Move everything to these dates' }).click();
  await settled(page);
  ev = await savedEvent(page);
  expect([ev.date, ev.endDate, ev.datesToConfirm]).toEqual(['2027-07-02', '2027-07-05', null]);
  await expect(sheet.locator('[data-dates-owed]')).toHaveCount(0);
  await closeSheet(page);
  await expect(await spaceDates(page)).toContainText('Dates · Jul 2–5 (3 nights)');
});
