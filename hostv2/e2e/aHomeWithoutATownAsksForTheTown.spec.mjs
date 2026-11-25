import { test, expect, settled } from './fixtures.mjs';
// The one sentence for this ask, read from where the app reads it, so a change
// of wording is a change in one place (heroAsk's ASK_KINDS.town).
import { readFileSync } from 'node:fs';
// Read as text, not imported: CI's Node loads src/lib as CommonJS (11/23/2026, shard 4).
const HERO_ASK_SRC = readFileSync(new URL('../../src/lib/heroAsk.js', import.meta.url), 'utf8');

const TOWN_ASK = /\btown:\s*'([^']+)'/.exec(HERO_ASK_SRC)[1];

// ─── AT HOME WITH NO TOWN, THE HERO ASKS FOR THE TOWN (live 11/23/2026) ──────
// The owner's sentence, typed the way a host types it. It is at her house and
// names no town. The hero read "Add the location." while the card under it was
// the town card ("Your town" / "The place is set."). At home her place is set;
// the town is what is missing, so the ask is the town (ASK_KINDS.town).
//
// The head of the queue here is the venue gate eventPlan promotes into the hero
// (CommandCenter's critical-blocker tier), not the checklist's location row: a
// unit test on that row passed while this screen stayed wrong.
//
// The page clock is pinned to Monday 11/23/2026, so "Thursday 11/26" is three
// days out whenever CI runs. Timers still run (setFixedTime, not install).
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));

test('a Thanksgiving at home with no town asks for the town over the town card', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
  await expect(open).toBeVisible({ timeout: 25000 });

  // The premise: at home, no town.
  const ev = await savedEvent(page);
  expect(ev.venueKind).toBe('home');
  expect(String(ev.venueCity || ev.city || '').trim()).toBe('');
  expect(ev.date).toBe('2026-11-26');

  await open.click();
  await settled(page);

  const ask = page.locator('h2.ask').first();
  await expect(ask).toBeVisible({ timeout: 15000 });
  await expect(ask).toHaveText(TOWN_ASK);
  // The card under it is the town card: it and the ask are about one thing.
  // Its title ("Your town") is not spoken a second time under an ask that
  // already names the town (heroRecord's dedup); its line is.
  const body = page.locator('.ecenter').filter({ has: ask }).first();
  // One address ask (owner, render 11, 11/24/2026). Were "Your home is set —
  // weather and shopping need the city." and "City, state or ZIP".
  await expect(body).toContainText('Guests, weather and shopping all use it — a city or ZIP works too.');
  // Labeled, with a made-up example (cohesion G, every input has a visible label).
  await expect(body.getByLabel('Your street, city and state')).toHaveAttribute('placeholder', 'For example: 42 Elm Ct, Springfield, VA');
  await expect(body).not.toContainText('location');
  expect((await page.title()).startsWith(TOWN_ASK)).toBe(true);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
