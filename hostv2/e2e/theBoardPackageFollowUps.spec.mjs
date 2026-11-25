// ─── THE BOARD PACKAGE, FOLLOW-UPS (owner rulings, 11/24/2026) ───────────────
// Five rulings on the board package (theBoardPackage.spec.mjs). Four are
// measured here; the fifth (the street is not asked at home on the board) is
// already pinned by theNavigationPackage's city ask and, on the invite side,
// by nothingGoesOutWithAPlaceholder.test.js (inviteGaps asks for the street).
//
//   1  THE DESKTOP BOARD HAS A TITLE. At 1440x900 and 1280x800 the board wears
//      the same title block as the phone and the tall iPad (the date line, the
//      event's name, rename in place); the ☰ stays as the menu, and the name
//      is printed once.
//   3  A PAYOFF ADVANCES LIKE A DECISION. With work still open, clearing the
//      last insurance step (or the last vendor conflict) does not stop on "All
//      covered." with a "Next: …" link: the hero shows the next item under one
//      quiet line, "✓ All covered · Undo" — the decided line's path.
//   4  THE DESKTOP RENAME HINT. With a mouse, hovering the title shows a small
//      pencil and "Double-click to rename"; nothing until then, and the
//      press-and-hold tip stays a touch screen's.
//   5  DIETARY NEEDS COUNTS THE MEALS. The food page's "Dietary needs" row says
//      "N meals unanswered" while guests who answered have company who did not.
import { test, expect } from '@playwright/test';
import { settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const PHONE = { width: 390, height: 844 };
// iPad landscape too (owner, 11/24/2026: the 1000-1279 widths still wore the
// one-line eyebrow): every board layout wears the title block.
const DESKS = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1194, height: 834 }, { width: 1000, height: 690 }];

const seeded = async (browser, vp, ev, { touch = false } = {}) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./?elegant=1&noanalytics=1');
  await settled(page);
  await expect(page.locator('h2.ask').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
  return { ctx, page };
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const shown = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').length, sel);

const DINNER = { id: 'ev-desk-title', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', date: dateIn(24), startTime: '18:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'count', guestCount: 10, guestEstimate: 10, guestCountSource: 'host', totalBudget: 0, budget: [], vendors: [], guests: [], timeline: [] };

// ═══════════════════════ 1. THE DESKTOP BOARD HAS A TITLE ═══════════════════
for (const vp of DESKS) {
  test(`1: ${vp.width}x${vp.height} — the board wears the phone's title block; a double-click renames in place`, async ({ browser }) => {
    test.setTimeout(90_000);
    const { ctx, page } = await seeded(browser, vp, DINNER);
    await expect(page.locator('[data-tt-head]')).toBeVisible();
    await expect(page.locator('[data-tt-title] .tt-name')).toHaveText('Rosa’s Harvest Dinner');
    // The date line: the same values the phone's first row prints.
    await expect(page.locator('[data-tt-head] .tt-r1')).toContainText(/\d+ DAYS/, { useInnerText: true });
    // The name once: the ☰ no longer repeats it in capitals.
    const board = (await page.locator('.escreen.on').innerText()).toUpperCase();
    expect(board.split('ROSA’S HARVEST DINNER').length - 1, 'the name is printed once').toBe(1);
    // The ☰ is still the menu.
    expect(await shown(page, '.escreen.on .ev-eyebrow'), 'one ☰').toBe(1);
    await page.locator('.escreen.on .ev-eyebrow').click();
    await sheetSettled(page);
    await expect(page.locator('.sheet .navseg-b', { hasText: 'Plan' }).first()).toBeVisible();
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    // The title sits above the question, and the question is still in the first screen.
    const [t, ask] = [await page.locator('[data-tt-title]').boundingBox(), await page.locator('h2.ask').first().boundingBox()];
    expect(t.y + t.height, 'the title above the ask').toBeLessThanOrEqual(ask.y + 1);
    expect(ask.y + ask.height, 'the ask in the first screen').toBeLessThanOrEqual(vp.height);
    // Rename in place, the phone's field.
    await page.locator('[data-tt-title]').dblclick();
    const f = page.locator('[data-rename="title"] input');
    await expect(f).toBeVisible();
    await expect(f).toHaveValue('Rosa’s Harvest Dinner');
    expect(await page.locator('.sheet').count(), 'a double-click is not the events sheet').toBe(0);
    await f.fill('Rosa’s Autumn Dinner');
    await f.press('Enter');
    await expect(page.locator('[data-tt-title] .tt-name')).toHaveText('Rosa’s Autumn Dinner');
    expect((await stored(page)).name).toBe('Rosa’s Autumn Dinner');
    // One click is still the events sheet.
    await page.locator('[data-tt-title]').click();
    await sheetSettled(page);
    await expect(page.locator('#sheet-title')).toHaveText('Your events');
    await ctx.close();
  });
}

// ═══════════════════ 3. A PAYOFF ADVANCES LIKE A DECISION ═══════════════════
// Two on-site vendors who owe proof of insurance, every call made and the
// budget in hand, so the hero walks the insurance steps in place (coiFirst):
// ask, mark received, mark cleared, for each. The sixth tap clears the last
// one while the plan still has work open (dietary needs, seating).
//
// Measured, and why this is the insurance payoff and not the conflict one: the
// hero shows vendor conflicts only as a bundle of three or more, so its own
// taps never take conflicts to zero (after two fixes the bundle dissolves and
// the hero moves on). "All untangled" comes through the same code path when
// the last clash is cleared elsewhere.
const INSURE = {
  id: 'ev-covered-advances', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [
    { id: 'v-venue', name: 'The Ironwood Room', category: 'Venue', status: 'Booked', arrivalTime: '10:00 AM', contractSigned: true },
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Booked', arrivalTime: '10:30 AM', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-flo', name: 'Petal & Stem', category: 'Florist', status: 'Booked', arrivalTime: '11:00 AM' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Booked', arrivalTime: '11:30 AM' },
  ],
  totalBudget: 6000, budget: [{ id: 'food', category: 'Food', budgeted: 6000, actual: 0 }],
  foodChoices: { theme: 'Casual / no theme', food_style: 'Order pizza/trays', alcohol: 'Beer + wine', cake: 'Order a cake' },
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};
const hero = (page) => page.locator('.escreen.on');
const askText = async (page) => ((await hero(page).locator('h2.ask').count()) ? (await hero(page).locator('h2.ask').first().innerText()).trim() : '');
const coi = async (page) => JSON.stringify((await stored(page)).vendors.map((v) => [v.coiStatus || '', !!v.coiVerified]));

test('3: clearing the last insurance step with work open advances the hero under "✓ All covered · Undo"; no "Next: …"', async ({ browser }) => {
  test.setTimeout(120_000);
  const { ctx, page } = await seeded(browser, PHONE, INSURE, { touch: true });
  await expect(page.locator('h2.ask').first(), 'premise: the hero asks about insurance').toHaveText(/insurance/i);
  let before = null; let asked = '';
  for (let i = 0; i < 8 && /insur/i.test(await askText(page)); i++) {
    before = await coi(page); asked = await askText(page);
    await hero(page).locator('.hero-card .decopt').first().click();
    await page.waitForTimeout(1000);
  }
  expect(await coi(page), 'premise: both vendors cleared in the hero').toBe(JSON.stringify([['received', true], ['received', true], ['', false], ['', false]]));
  const t = await hero(page).innerText();
  expect(t, 'never stops on the payoff while work is open').not.toMatch(/All covered\.|Every vendor’s proof is on file/);
  expect(await page.locator('.allclear').count(), 'no payoff card').toBe(0);
  expect(await page.locator('.ac-next').count(), 'no "Next: …" link').toBe(0);
  const next = await askText(page);
  expect(next, 'the hero shows the next item').not.toBe('');
  expect(next).not.toMatch(/insur/i);
  const line = hero(page).locator('[data-decided]');
  await expect(line).toBeVisible();
  await expect(line).toHaveText('✓ All covered · Undo', { useInnerText: true });
  expect(await line.evaluate((l) => l.getBoundingClientRect().bottom <= document.querySelector('.escreen.on h2.ask').getBoundingClientRect().top + 1), 'above the ask').toBe(true);
  // The Undo is real: it puts back the last step, and the insurance ask comes back.
  await line.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(1000);
  expect(await coi(page), 'the last step is undone').toBe(before);
  await expect(hero(page).locator('[data-decided]')).toHaveCount(0);
  expect(await askText(page), 'the insurance step is asked again').toBe(asked);
  await ctx.close();
});

// ═══════════════════════ 4. THE DESKTOP RENAME HINT ═════════════════════════
test('4: with a mouse, hovering the title shows a pencil and "Double-click to rename"; nothing before; no touch tip', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seeded(browser, DESKS[0], { ...DINNER, id: 'ev-hover-hint' });
  const pencil = page.locator('[data-tt-title] [data-rename-pencil]');
  const hint = page.locator('[data-tt-title] [data-rename-hint]');
  await page.mouse.move(2, 2);
  await expect(pencil, 'no pencil until hover').toBeHidden();
  await expect(hint, 'no hint until hover').toBeHidden();
  expect(await page.locator('[data-rename-tip]').count(), 'the press-and-hold tip is a touch screen’s').toBe(0);
  await page.locator('[data-tt-title] .tt-name').hover();
  await expect(pencil).toBeVisible();
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('Double-click to rename');
  // On the title's own line, after the pencil (owner, 11/24/2026): under the
  // title it sat over the progress bar. It covers nothing on the board.
  const hb = await hint.boundingBox(); const tb = await page.locator('[data-tt-title] .tt-name').boundingBox(); const pb = await pencil.boundingBox();
  const mid = hb.y + hb.height / 2;
  expect(mid, 'the hint sits on the title line').toBeGreaterThan(tb.y);
  expect(mid, 'the hint sits on the title line').toBeLessThan(tb.y + tb.height);
  expect(hb.x, 'after the pencil').toBeGreaterThanOrEqual(pb.x + pb.width);
  const covered = await hint.evaluate((h) => {
    const r = h.getBoundingClientRect(); const hit = [];
    for (const e of document.querySelectorAll('.escreen.on *')) {
      if (h.contains(e) || e.contains(h) || e.children.length) continue;
      const q = e.getBoundingClientRect(); if (!q.width || !q.height) continue;
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) hit.push(e.className || e.tagName);
    }
    return hit;
  });
  expect(covered, 'the hint covers nothing on the board').toEqual([]);
  // A tooltip, not a banner: it covers nothing on hover-out and moves nothing.
  const ask0 = await page.locator('h2.ask').first().boundingBox();
  expect(await hint.evaluate((e) => getComputedStyle(e).position), 'floats over the board').toBe('absolute');
  await page.mouse.move(2, 2);
  await expect(hint).toBeHidden();
  const ask1 = await page.locator('h2.ask').first().boundingBox();
  expect(ask1.y, 'the board did not move').toBe(ask0.y);
  await ctx.close();
});

// Cohesion G #57 (owner, 11/24/2026): the touch screen's one-time press-and-hold
// tip became a visible "✎ Rename" beside the title (theBoardPackage asserts it
// opens the rename). The hover hint still never shows on touch.
test('4: on a touch phone the hover hint never shows; the visible ✎ Rename does', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seeded(browser, PHONE, { ...DINNER, id: 'ev-touch-hint' }, { touch: true });
  await expect(page.locator('[data-rename-btn]')).toBeVisible();
  await expect(page.locator('[data-rename-btn]')).toHaveText('✎ Rename');
  await expect(page.locator('[data-rename-tip]')).toHaveCount(0);
  await page.locator('[data-tt-title] .tt-name').hover();
  await expect(page.locator('[data-tt-title] [data-rename-pencil]')).toBeHidden();
  await expect(page.locator('[data-tt-title] [data-rename-hint]')).toBeHidden();
  await ctx.close();
});

// ═══════════════════ 5. DIETARY NEEDS COUNTS THE MEALS ═════════════════════
const MEALS = {
  id: 'ev-meals-open', name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(20), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  // Four guests picked a meal; eight have not.
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes', ...(i < 4 ? { meal: 'Standard' } : null) })),
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  snoozed: { 'decision:dietary': dateIn(4) },
};

test('5: the Dietary needs row says how many meals are unanswered, and is not settled while they are', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seeded(browser, PHONE, MEALS, { touch: true });
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  await page.waitForTimeout(500);
  const row = page.locator('.sheet [data-food-section="choices"] .fstat', { hasText: 'Dietary needs' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('8 meals unanswered');
  expect(await row.locator('[data-status]').first().getAttribute('data-status'), 'open, not settled').not.toBe('settled');
  await ctx.close();
});
