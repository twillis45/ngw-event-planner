// ─── WANDA'S HERO: EVERY ASK IS HERS, ANSWERABLE, AND UNDONE IN ONE TAP ──────
//
// The Wanda audit (11/22/2026, `ev-x-wanda`, build 5c5a2815) walked her board
// the way she would and found four defects in the one loud ask:
//
//   P0-1  After Drop-off catering and "That's everyone — noted" the hero read
//         "Choose the timing." over "Ceremony Timing — When does the ceremony
//         happen?", with the "in the full app" chip, no options and no button,
//         and the NEXT bar pointing at it. The three picks were authored; the
//         hero denied a blocker its own decision panel.
//   P1-1  …and her run of show already answers it: the retirement presentation
//         is at 7:45 PM, between doors and the dance floor. When it IS asked,
//         it is asked in her words ("the retirement presentation").
//   P0-2  "You chose 'Drop-off catering / buffet'… a caterer is not booked
//         yet." printed under the allergy ask, and "Currently quoted…" after
//         Host cooks: the engine's lead reason under the shell's other item.
//   P0-3  Undo after "Host cooks" restored the checklist and kept the pick.
import { test, expect, settled } from './fixtures.mjs';

const ID = 'ev-x-wanda';
const PATCH = 'ngw-hostv2-patch-' + ID;

const boot = async (page, patch) => {
  await page.addInitScript(([id, key, p]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', id);
    if (p) localStorage.setItem(key, JSON.stringify(p));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [ID, PATCH, patch || null]);
  await page.goto('?elegant=1');
  await settled(page);
  await page.waitForTimeout(400);
};

const card = (page) => page.locator('.hero article.hero-card').first();
const heroText = async (page) => (await page.locator('.hero').first().innerText()).replace(/\s+/g, ' ');
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), PATCH);
const tap = async (page, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); await page.waitForTimeout(700); };

// The path the audit took: settle the food, then note dietary needs.
const dropOffThenNoted = async (page) => {
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Drop-off catering' }).first());
  await expect(page.locator('.hero')).toContainText('Who has a food allergy?');
  await tap(page, page.locator('.hero button').filter({ hasText: 'That’s everyone — noted' }).first());
};

// A calm board (no hero card) asks nothing; a hero card always carries an action.
const expectAnswerable = async (page) => {
  if (!(await card(page).count())) return;
  await expect(card(page).locator('.tag.plan', { hasText: 'in the full app' })).toHaveCount(0);
  const buttons = card(page).locator('button:visible');
  expect(await buttons.count(), 'the hero card carries an action').toBeGreaterThan(0);
};

test('the timing her run of show answers is never asked, and the hero keeps an action', async ({ page }) => {
  await boot(page);
  await dropOffThenNoted(page);
  const t = await heroText(page);
  expect(t).not.toMatch(/Ceremony Timing|Choose the timing|When does the (ceremony|retirement presentation) happen/);
  await expectAnswerable(page);
});

test('with no schedule of her own, it is asked in her words, with its three picks, and one settles it', async ({ page }) => {
  // Timing waits on the official-ceremony question for a military retirement
  // (owner: "Ask once", 11/22/2026); this case answers it as part of the party.
  await boot(page, { ros: [], officialCeremony: 'this-party' });
  await dropOffThenNoted(page);
  await expect(page.locator('.hero')).toContainText('When does the retirement presentation happen?');
  const t = await heroText(page);
  expect(t).not.toMatch(/Ceremony Timing|Choose the timing/);
  expect(t.split('When does the retirement presentation happen?').length - 1, 'the question is asked once').toBe(1);
  await expectAnswerable(page);
  const picks = card(page).locator('.decopt');
  await expect(picks.filter({ hasText: 'Before the celebration' })).toHaveCount(1);
  await expect(picks.filter({ hasText: 'After the celebration' })).toHaveCount(1);
  await tap(page, picks.filter({ hasText: 'During the celebration' }).first());
  expect((await stored(page)).ceremonyTiming).toBe('during');
  await expect(page.locator('.hero')).not.toContainText('When does the retirement presentation happen?');
});

test('a reason prints only under the item it belongs to', async ({ page }) => {
  await boot(page);
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Drop-off catering' }).first());
  await expect(page.locator('.hero')).toContainText('Who has a food allergy?');
  // The engine's lead (the unbooked caterer) is not the allergy ask.
  expect(await heroText(page)).not.toMatch(/a caterer is not booked yet/);
});

test('…and after Host cooks, the caterer’s quote does not print under the allergy ask', async ({ page }) => {
  await boot(page);
  await tap(page, card(page).locator('.decopt-disc').first());
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Host cooks' }).first());
  await expect(page.locator('.hero')).toContainText('Who has a food allergy?');
  expect(await heroText(page)).not.toMatch(/Currently quoted/);
});

test('one Undo after a pick undoes the pick and the checklist that followed it', async ({ page }) => {
  await boot(page);
  const before = await stored(page);
  await tap(page, card(page).locator('.decopt-disc').first());
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Host cooks' }).first());
  await page.waitForTimeout(800);
  const after = await stored(page);
  expect(after.foodChoices && after.foodChoices.food_style).toBe('Host cooks');
  await tap(page, page.locator('.hero button').filter({ hasText: /^Undo$/ }).first());
  await page.waitForTimeout(800);
  const undone = await stored(page);
  expect((undone.foodChoices || {}).food_style, 'the pick is undone').toBeUndefined();
  expect(Array.isArray(before.timeline), 'premise: the boot catch-up stored her checklist').toBe(true);
  expect(JSON.stringify(after.timeline)).not.toBe(JSON.stringify(before.timeline));
  expect(JSON.stringify(undone.timeline), 'the checklist is back too').toBe(JSON.stringify(before.timeline));
  await expect(page.locator('.hero')).toContainText('How is the food handled?');
});
