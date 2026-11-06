import { test, expect, settled, openSectionByName } from './fixtures.mjs';

// Verbatim GOLD-01, docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md:474.
const GOLD01 = "Wanda's 50th birthday and 30-year Army retirement, about 75 guests in the Maryland/DC area, black and gold, formal Army recognition followed by a celebration, food, bar, DJ and photography, budget $5,000.";
const PROGRAM = 'formal Army recognition followed by a celebration';
const create = async (page, text) => {
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(text);
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeVisible();
};
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));

test('GOLD-01: the real cold start preserves intent and discloses the unapplied program', async ({ page }, testInfo) => {
  await create(page, GOLD01);
  await expect(page.getByText(/Vendor roles to consider:/)).toContainText('Catering');
  await expect(page.getByText(/These start as Considering/)).toBeVisible();
  await expect(page.getByText(`“${PROGRAM}”`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.rv-spinewrap')).not.toContainText('Guest list built');
  await expect(page.locator('.rv-spinewrap')).not.toContainText('RSVP tracking live');
  await expect(page.locator('.rv-spinewrap.resolved')).toBeVisible({ timeout: 12000 });
  expect((await page.getByRole('button', { name: /^Open your plan$/ }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  const ev = await savedEvent(page);
  expect(ev.createdFromText).toBe(GOLD01);
  expect(ev.honoree).toBe('Wanda');
  expect(ev.type).toBe('Retirement Party');
  expect(ev.secondaryType).toBe('Birthday');
  expect(ev.theme).toBe('black and gold');
  expect(ev.guestEstimate).toBe(75);
  expect(ev.totalBudget).toBe(5000);
  expect(ev.vendors.map((v) => v.category)).toEqual(['Catering', 'Mobile Bar', 'DJ', 'Photography']);
  expect(ev.vendors.every((v) => v.status === 'Considering' && !v.name)).toBe(true);
  expect(ev.guests).toEqual([]);
  await page.getByText('Your original description', { exact: true }).click();
  await expect(page.getByText(GOLD01, { exact: true })).toBeVisible();
  await expect(page.locator('.rv-spinewrap')).not.toContainText('nothing made up');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByText('Your original description', { exact: true }).click();
  await page.locator('.rv-seyebrow').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('gold01-reveal.png'), fullPage: true });
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);
  await expect(page.getByText(`“${PROGRAM}”`, { exact: true })).toBeVisible();
  await openSectionByName(page, 'Make it yours');
  await expect(page.locator('.sheet').last()).toContainText('U.S. Army');
  await expect(page.locator('.sheet').last()).toContainText(/color guard|honor guard/i);
  await page.screenshot({ path: testInfo.outputPath('gold01-army.png'), fullPage: true });
  await openSectionByName(page, 'Calls to make');
  for (const label of ['Who posts the Colors?', 'The shadowbox', 'Who reads the Retirement Order?', 'Who presides, and the official party?', 'Uniform of the day?', 'How to recognize the spouse / Family?']) {
    await expect(page.locator('.sheet').last()).toContainText(label.replace(/\?$/, ''));
  }
  await openSectionByName(page, 'People you’re hiring');
  for (const category of ['Catering', 'Mobile Bar', 'DJ', 'Photography']) {
    await expect(page.locator('.sheet').last()).toContainText(category);
  }
  await expect(page.getByRole('button', { name: /Booking status: Deciding/ })).toHaveCount(4);
});

test('a vendor possessive cannot become the person the event celebrates', async ({ page }) => {
  await create(page, "Grad party for Jake, Tony's BBQ is catering, 40 guests");
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.rv-spinewrap.resolved')).toBeVisible({ timeout: 12000 });
  const ev = await savedEvent(page);
  expect(ev.honoree).toBe('Jake');
  expect(ev.name).toMatch(/^Jake/);
  expect(ev.vendors).toEqual([expect.objectContaining({ category: 'Catering', name: "Tony's BBQ", status: 'Considering' })]);
});


test('correcting the honoree keeps one anniversary and no invented ceremony timing', async ({ page }) => {
  await create(page, 'Mom and Dad 50th anniversary, 40 guests, backyard');
  await page.getByRole('button', { name: /Who’s it for\?|^For / }).click();
  await page.getByRole('textbox', { name: 'Who is it for', exact: true }).fill('Mom and Dad');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 25000 });
  const reveal = page.locator('.rv-spinewrap');
  await expect(reveal).not.toContainText('Two milestones');
  await expect(reveal).not.toContainText('Ceremony Timing');
  await expect(reveal).not.toContainText('anniversary +');
  expect((await savedEvent(page)).honoree).toBe('Mom and Dad');
});
