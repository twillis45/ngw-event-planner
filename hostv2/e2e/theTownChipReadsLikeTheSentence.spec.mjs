import { test, expect, settled } from './fixtures.mjs';
import { readFileSync } from 'node:fs';
// Read as text, not imported: CI's Node loads src/lib as CommonJS (11/23/2026, shard 4).
const HERO_ASK_SRC = readFileSync(new URL('../../src/lib/heroAsk.js', import.meta.url), 'utf8');
const TOWN_ASK = /\btown:\s*'([^']+)'/.exec(HERO_ASK_SRC)[1];
const LOCATION_ASK = /\blocation:\s*'([^']+)'/.exec(HERO_ASK_SRC)[1];

// ─── THE TOWN CHIP READS A PLACE THE WAY THE SENTENCE DOES (live 11/24/2026) ──
// Live build 8d1807ea, phone. The sentence names her house and no town, so the
// chip asks "Which town?". She typed a full street address into it and pressed
// Enter; the chip read "… — which state?" with the state right there, and the
// saved event had venueCity '' and no street, so the hero asked "Add your city."
// The same address typed in the sentence saved all three. The chip now reads
// through the sentence's reader (lib/readPlace).
//
// The page clock is pinned to Monday 11/23/2026, so "Thursday 11/26" is three
// days out whenever CI runs.
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));

const typeTheTown = async (page, town) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: 'Which town?' }).click();
  const field = page.getByLabel('Town or ZIP');
  await expect(field).toHaveAttribute('placeholder', 'Street, city, state — or a city or ZIP');
  await field.fill(town);
  await field.press('Enter');
  // The chip shows what she typed as settled, and asks for nothing.
  const chip = page.getByRole('button', { name: town, exact: true });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /— which (state|town)\?$/ })).toHaveCount(0);
};

const createAndOpen = async (page) => {
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
  await expect(open).toBeVisible({ timeout: 25000 });
  const ev = await savedEvent(page);
  await open.click();
  await settled(page);
  return ev;
};

const heroDoesNotAskWhere = async (page) => {
  const ask = page.locator('h2.ask').first();
  await expect(ask).toBeVisible({ timeout: 15000 });
  await expect(ask).not.toHaveText(TOWN_ASK);
  await expect(ask).not.toHaveText(LOCATION_ASK);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
};

test('a full street address in the town chip saves the street, the city and the state', async ({ page }) => {
  await typeTheTown(page, '123 Maple St, Springfield, VA 22150');
  const ev = await createAndOpen(page);
  expect(ev.venueKind).toBe('home');
  expect(ev.venueAddress).toBe('123 Maple St');
  expect(ev.venueCity).toBe('Springfield');
  expect(ev.venueState).toBe('VA');
  expect(ev.date).toBe('2026-11-26');
  await heroDoesNotAskWhere(page);
});

test('"City, ST" in the town chip saves the city and no street', async ({ page }) => {
  await typeTheTown(page, 'Springfield, VA');
  const ev = await createAndOpen(page);
  expect(ev.venueKind).toBe('home');
  expect(ev.venueAddress || '').toBe('');
  expect(ev.venueCity).toBe('Springfield');
  expect(ev.venueState).toBe('VA');
  await heroDoesNotAskWhere(page);
});

test('a ZIP in the town chip saves the ZIP', async ({ page }) => {
  await typeTheTown(page, '22150');
  const ev = await createAndOpen(page);
  expect(ev.venueKind).toBe('home');
  expect(ev.venueAddress || '').toBe('');
  expect(ev.venueCity).toBe('22150');
  await heroDoesNotAskWhere(page);
});
