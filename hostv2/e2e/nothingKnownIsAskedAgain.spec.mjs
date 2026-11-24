// ─── NOTHING SHE TOLD US IS ASKED AGAIN (owner, 11/21/2026) ──────────────────
//
// "Don't keep asking host for the same information." Single source for every
// fact. The audit at 0bc6e20f, driven at 1024×1366: a playbook call counted as
// answered only when picked or when a BOOKED vendor answered it, so every call
// that restates one of the event's own fields asked again — the budget beside
// "Your budget $40,000", "Where is the party?" beside The Loft, "What time does
// dinner hit the table?" after "dinner at 4pm".
//
// Each test creates an event from the audit's sentence through the real
// creation flow, then reads the hero, Calls to make and the checklist: nothing
// known is asked, a half-known call asks only its missing part, and a
// deliberate confirm reads as one. Names and places are made up.
// Jest twins: src/lib/__tests__/nothingKnownIsAskedAgain.test.js and
// whatSheSaidIsWrittenDown.test.js.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const create = async (page, sentence) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('fresh')) { try { localStorage.clear(); } catch { /* private */ } sessionStorage.setItem('fresh', '1'); } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(sentence);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click({ timeout: 20000 });
  await page.getByRole('button', { name: /^Open your plan$/ }).click({ timeout: 30000 });
  await settled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {});
const hero = async (page) => (await page.locator('.hero').first().innerText()).replace(/\s+/g, ' ');
// Calls to make, split into what it still asks and what it holds as settled.
const calls = async (page) => {
  await openSectionByName(page, 'Calls to make');
  // The decided calls are one green row until reopened (DoneFold, owner 11/24/2026).
  const fold = page.locator('.sheet').last().locator('[data-done-fold]', { hasText: /Settled · all \d+ decided/ });
  if (await fold.count()) { await fold.click(); await page.waitForTimeout(300); }
  const t = (await page.locator('.sheet').last().innerText()).replace(/\r/g, '');
  const at = t.search(/\nSETTLED\n/i);
  return { asks: at < 0 ? t : t.slice(0, at), settled: at < 0 ? '' : t.slice(at) };
};
const checklist = async (page) => {
  await openSectionByName(page, 'Your checklist');
  return page.locator('.sheet').last().innerText();
};

test('the wedding’s $40,000 and 150 guests: only “who pays?” is asked', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Maya and Theo’s wedding on Saturday September 18, 2027 for 150 guests with a $40,000 budget');
  expect(await hero(page)).not.toMatch(/agree total budget/i);
  const c = await calls(page);
  expect(c.asks).toContain('Who pays?');
  expect(c.asks).toContain('From your plan: $40,000. Only this part is left.');
  expect(c.asks).not.toMatch(/Total budget \+ who pays|Guest-count target/);
  expect(c.asks).not.toMatch(/Waiting on total budget/i);
  expect(c.settled).toContain('From your plan: 150 guests');
  // The step asks the same one thing.
  const list = await checklist(page);
  expect(list).toContain('Agree who pays');
  expect(list).not.toMatch(/Agree total budget, who pays, and the guest-count target/);
  await openSectionByName(page, 'Calls to make');
  // The missing part answers in one tap, and reads beside the part she gave.
  const sheet = page.locator('.sheet').last();
  await sheet.getByText('Who pays?', { exact: true }).first().click();
  await sheet.getByRole('button', { name: 'The couple', exact: true }).first().click();
  await page.waitForTimeout(500);
  expect((await stored(page)).foodChoices.budget).toBe('The couple');
  await expect(sheet.getByText('$40,000 · The couple').first()).toBeVisible();
});

test('Sweet 16 at The Loft for 60 with 8 kids and a neon glow theme', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Ava’s Sweet 16 at The Loft on Saturday June 5, 2027 for 60 guests including 8 kids with a neon glow theme');
  const e = await stored(page);
  expect([e.theme, e.kidsCount]).toEqual(['neon glow', 8]);
  expect(await page.locator('body').innerText()).not.toMatch(/kids with a neon glow/i);
  const c = await calls(page);
  // The venue's kind and the adults are the only parts left of two calls.
  expect(c.asks).toContain('What kind of place is The Loft?');
  expect(c.asks).toContain('How many of the 60 are adults?');
  expect(c.asks).not.toMatch(/Where is the party\?|How many guests\?|Pick a theme/);
  expect(c.settled).toContain('From your plan: neon glow');
});

test('an engagement party at Lucia’s Bistro is not asked where it is', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Engagement party at Lucia’s Bistro on Saturday May 8, 2027 for 40 guests');
  const c = await calls(page);
  expect(c.asks).not.toMatch(/At home or a venue/i);
  expect(c.asks).not.toMatch(/Waiting on the venue/i);
});

test('a gender reveal in our backyard is outside, not indoors', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Gender reveal in our backyard on Saturday April 10, 2027 for 30 guests');
  const c = await calls(page);
  expect(c.asks).not.toMatch(/Indoor or outdoor/i);
  expect(c.settled).toContain('From your plan: your place · outside');
  expect(c.settled).not.toMatch(/Indoor \(home or rented room\)/);
});

test('the reunion’s indoor/outdoor call reads the Space sheet’s answer', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Family reunion on Saturday July 17, 2027 for 60 guests');
  await openSectionByName(page, 'Space, seats');
  await page.locator('.sheet').last().locator('[data-indoor-outdoor="outdoor"]').first().click();
  await page.waitForTimeout(400);
  const c = await calls(page);
  expect(c.asks).not.toMatch(/Indoor or outdoor/i);
  expect(c.settled).toContain('From your plan: outside');
});

test('potluck Thanksgiving at 4pm, a nut allergy, 3 staying over', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Potluck Thanksgiving dinner at 4pm on Thursday November 25, 2027 for 14 guests, one guest has a nut allergy and 3 staying overnight');
  const e = await stored(page);
  expect(e.foodChoices.hosting_model).toMatch(/potluck/i);
  expect(e.dietCounts).toEqual({ 'Nut allergy': 1 });
  expect([e.overnightCount, e.timeOfDay]).toEqual([3, 'afternoon']);
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/Who has a food allergy\?/);
  const c = await calls(page);
  expect(c.asks).not.toMatch(/What time does dinner hit the table|How are guests staying|Is anyone staying overnight|cooking the whole meal, or is it a potluck/i);
  expect(c.settled).toContain('From your plan: 4 PM');
});

test('a group trip, everyone flying in, staying at an Airbnb', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Group trip to Nashville for 8 people June 10 to June 13, 2027, everyone flying in, staying at an Airbnb');
  const c = await calls(page);
  expect(c.asks).not.toMatch(/How many guests are traveling in|How are guests staying/i);
  expect(c.settled).toContain('From your plan: everyone is flying in');
  expect(c.settled).toContain('From your plan: staying at an Airbnb');
});

test('“we already booked a DJ and a photographer” is not asked band or DJ', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Priya and Sam’s wedding on Saturday October 9, 2027 for 120 guests, we already booked a DJ and a photographer');
  expect((await stored(page)).vendors.map((v) => [v.category, v.status])).toEqual([['DJ', 'Booked'], ['Photography', 'Booked']]);
  const c = await calls(page);
  expect(c.asks).not.toMatch(/Music — band or DJ/);
  expect(c.settled).toContain('Your DJ — booked');
});

test('BYOB at creation is the drinks pick', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Housewarming party on Saturday April 17, 2027 for 25 guests, BYOB');
  expect((await stored(page)).foodChoices.drinks).toBe('BYOB + host provides mixers/soda');
  const c = await calls(page);
  expect(c.asks).not.toMatch(/Drink plan/);
  expect(c.settled).toContain('BYOB + host provides mixers/soda');
});

test('a deliberate confirm reads as one, with her number', async ({ page }) => {
  test.setTimeout(120000);
  await create(page, 'Birthday party on Saturday March 20, 2027 for 30 guests');
  const c = await calls(page);
  expect(c.asks).toContain('Confirm 30 guests');
  expect(c.asks).not.toMatch(/Confirm guest count/);
});
