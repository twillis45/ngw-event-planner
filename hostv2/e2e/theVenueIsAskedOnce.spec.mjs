// ─── THE VENUE IS ASKED ONCE, AND "HELP ME FIND ONE" IS REAL (owner, 11/16/2026)
//
// "Make sure all 4 places are getting from single source and connected. App
// shouldn't ask for it if it's been provided. Make handle this for me
// functionally feasible in screens after creation."
//
// One event, the owner's: a 50th birthday in Anaheim for 60.
//   1. Named in the creation sentence, the venue is never asked for again.
//      (It was: "at House of Blues Anaheim in Anaheim, CA" kept the town and
//      dropped the venue — aVenueSheNamedIsKept.test.js.)
//   2. Saved in ANY one place, every other place stops asking and shows it.
//   3. Until then, the shared venue control carries the help the app can
//      actually give: a Google Maps search of the town, and the inquiry.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const SAID = "Jordan's 50th birthday party in Anaheim, CA on Saturday June 12, 2027 for 60 guests";
const SAID_WITH_VENUE = "Jordan's 50th birthday party at House of Blues Anaheim in Anaheim, CA on Saturday June 12, 2027 for 60 guests";

const create = async (page, sentence) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('fresh')) { try { localStorage.clear(); } catch { /* private */ } sessionStorage.setItem('fresh', '1'); } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(sentence);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click({ timeout: 20000 });
  await page.getByRole('button', { name: /^Open your plan$/ }).click({ timeout: 30000 });
  await settled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {});
// Everything visible that still ASKS for the venue.
const asks = (page) => page.evaluate(() => {
  const ok = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = [];
  for (const el of document.querySelectorAll('button, h3, input[data-venue-field]')) {
    if (!ok(el)) continue;
    const t = el.tagName === 'INPUT' ? 'venue box' : (el.innerText || '').trim().replace(/\s+/g, ' ');
    if (/^venue box$|name the venue|where is it happening|where is the event|pick the place|add the location/i.test(t)) out.push(t);
  }
  return out;
});

test('a venue named when the event was created is never asked for again', async ({ page }) => {
  test.setTimeout(90000);
  await create(page, SAID_WITH_VENUE);
  const e = await stored(page);
  expect([e.venue, e.venueKind, e.venueCity, e.venueState]).toEqual(['House of Blues Anaheim', 'venue', 'Anaheim', 'CA']);
  expect(await asks(page)).toEqual([]);
  await page.goto('./'); await settled(page);
  expect(await asks(page)).toEqual([]);
});

test('help me find one: a search of Anaheim, and an inquiry written from what she said', async ({ page }) => {
  test.setTimeout(90000);
  await create(page, SAID);
  const help = page.locator('[data-venue-help]:visible').first();
  await expect(help).toBeVisible();
  const link = help.locator('[data-venue-search]');
  await expect(link).toHaveText('Find venues near Anaheim · Google Maps');
  const u = new URL(await link.getAttribute('href'));
  expect(u.origin + u.pathname).toBe('https://www.google.com/maps/search/');
  expect(u.searchParams.get('query')).toBe('event venues near Anaheim, CA');
  expect(await link.getAttribute('target')).toBe('_blank');
  // One row, not two (live check, 11/17/2026): "I'll sort this" sits in the
  // help row beside the inquiry, on the same line at 390px.
  const tops = await help.evaluate((h) => ['[data-venue-inquiry]', 'button:not([data-venue-inquiry])']
    .map((q) => Math.round(h.querySelector(q).getBoundingClientRect().top)));
  expect(await help.getByRole('button', { name: 'I’ll sort this' }).count()).toBe(1);
  expect(tops[0]).toBe(tops[1]);
  await help.locator('[data-venue-inquiry]').click();
  const draft = page.locator('.sheet').last();
  await expect(draft).toContainText('venue inquiry');
  await expect(draft).toContainText('for about 60 guests in Anaheim, CA');
  await expect(draft).not.toContainText('help me find');
});

test('saved in one place, every place shows it and none asks again', async ({ page }) => {
  test.setTimeout(90000);
  await create(page, SAID);
  expect((await asks(page)).length).toBeGreaterThan(0);          // (premise) it does ask
  // Save it in the Venue SHEET…
  // The Venue sheet, from the section list (the board's duplicate "Name the
  // venue" row is gone — one place to answer it on the board itself).
  await openSectionByName(page, 'Venue');
  const box = page.locator('.sheet input[data-venue-field]:visible').first();
  await box.click(); await page.keyboard.type('House of Blues Anaheim', { delay: 5 });
  await box.locator('xpath=../..').getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(800);
  const e = await stored(page);
  expect([e.venue, e.venueKind || 'venue']).toEqual(['House of Blues Anaheim', 'venue']);
  // …and the sheet itself now reads it back from the same field.
  await expect(page.locator('.sheet').last()).toContainText('Currently: House of Blues Anaheim');
  // The help is for finding a place; once there is one, it is gone (50-host run).
  await expect(page.locator('.sheet').last().locator('[data-venue-help]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  // Closing a sheet pops the history entry it pushed (history.back(), so a
  // phone's Back gesture closes it). A goto sent before that back lands is
  // cancelled by it (net::ERR_ABORTED, tablet-tall, 11/25/2026): wait for the
  // sheet to close and its entry to be gone first.
  await expect(page.locator('.sheet')).toHaveCount(0);
  await page.waitForFunction(() => !(history.state && history.state.ngwOverlay));
  await page.goto('./?elegant=1'); await settled(page);
  expect(await asks(page)).toEqual([]);                           // the board card is gone
  await page.goto('./'); await settled(page);
  expect(await asks(page)).toEqual([]);                           // the standard view's hero too
  expect(await page.locator('[data-venue-help]:visible').count()).toBe(0);
});

// ── Calls 1 and 2 and the duplicate row (owner-approved 11/16/2026) ──────────
test('"in Anaheim" with no state: the board proposes Anaheim, CA for one tap, and then the search appears', async ({ page }) => {
  test.setTimeout(90000);
  await create(page, "Jordan's 50th birthday party in Anaheim on Saturday June 12, 2027 for 60 guests");
  expect((await stored(page)).venueCity || '').toBe('');
  const ask = page.locator('[data-town-propose]:visible').first();
  await expect(ask).toContainText('Town: Anaheim, CA?');
  await ask.getByRole('button', { name: 'That’s it' }).click();
  await page.waitForTimeout(600);
  const e = await stored(page);
  expect([e.venueCity, e.venueState]).toEqual(['Anaheim', 'CA']);
  await expect(page.locator('[data-town-propose]:visible')).toHaveCount(0);
  await expect(page.locator('[data-venue-search]:visible').first()).toHaveText('Find venues near Anaheim · Google Maps');
});

test('the board asks for the venue in one place, not a row and a card', async ({ page }) => {
  test.setTimeout(90000);
  await create(page, SAID);
  const rows = await page.locator('.then-fold button').allInnerTexts();
  expect(rows.filter((t) => /name the venue|add the location|pick the place/i.test(t))).toEqual([]);
  await expect(page.locator('article input[data-venue-field]:visible')).toHaveCount(1);
});
