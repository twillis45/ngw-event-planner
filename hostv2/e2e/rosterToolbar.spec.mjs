// ─── FILTERING MUST NOT RENUMBER THE PEOPLE ─────────────────────────────────
// Mobbin tier read 2026-08-07: 6/6 web and 5/5 iOS leaders put search + filter
// above a list of people. We shipped none, so at 40 guests scanning was the
// whole cost of the surface.
//
// The dangerous part is not the control, it is the indexes. Every writer on
// this roster — setRsvpValue, writeGuest, removeGuest — is INDEX-BASED against
// `event.guests`. Filter the array before mapping and every guest below a
// hidden one is renumbered, so an edit silently lands on the wrong person and
// NOTHING on screen says so. The code indexes first and filters the {g,i}
// pairs; this proves it, because a unit test cannot see the rendered list and
// a bug here is invisible until a host has already written the wrong fact.
import { test, expect } from './fixtures.mjs';

const ROSTER = Array.from({ length: 12 }, (_, k) => ({
  id: 'g-t' + k,
  name: 'Person ' + String(k).padStart(2, '0'),
  rsvp: k % 4 === 0 ? 'Yes' : k % 4 === 1 ? 'No' : k % 4 === 2 ? 'Maybe' : '',
}));

const boot = async (page) => {
  await page.addInitScript((guests) => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-hostv2-patch-test-two-days', JSON.stringify({ guests }));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ROSTER);
  await page.goto('?elegant=1');
  await page.waitForTimeout(1600);
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
};

const openGuests = async (page) => {
  await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
  await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
  const g = page.locator('.sheet').last().getByText('Guests', { exact: false }).first();
  if (await g.count() === 0) { test.skip(true, 'no guests section'); return false; }
  await g.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  return true;
};

const names = (page) => page.locator('.grow > button:first-of-type').allTextContents();

test.describe('the roster toolbar', () => {
  test('search narrows the list, and the empty state names the filter', async ({ page }) => {
    await boot(page);
    if (!await openGuests(page)) return;

    await expect(page.locator('.rtoolbar')).toHaveCount(1);
    expect((await names(page)).length, '12 seeded guests all render').toBe(12);

    await page.locator('.rtool-q').fill('Person 03');
    await page.waitForTimeout(250);
    const hit = await names(page);
    expect(hit.length).toBe(1);
    expect(hit[0]).toContain('Person 03');

    // a filter that empties the list must SAY so, not just vanish
    await page.locator('.rtool-q').fill('zzzznobody');
    await page.waitForTimeout(250);
    expect(await names(page)).toHaveLength(0);
    await expect(page.locator('.roster')).toContainText('No one on your list matches');
    await page.locator('.roster').getByText('Show everyone').click({ timeout: 5000 });
    await page.waitForTimeout(250);
    expect((await names(page)).length, 'the way back works').toBe(12);
  });

  test('each lens chip states its own count, and shows exactly that many', async ({ page }) => {
    await boot(page);
    if (!await openGuests(page)) return;

    // seeded 12 on a k%4 cycle: 3 Yes, 3 No, 3 Maybe, 3 no-reply
    for (const [label, want] of [['Coming', 3], ['No reply', 3], ['Maybe', 3], ['Can’t make it', 3]]) {
      // Locate by exact leading label, not `hasText`. "Coming" is a SUBSTRING of
      // the decline chip, so a contains-match resolved to two elements — which is
      // also why that chip is now "Can't make it": if a matcher confuses two
      // filters, a host scanning them can too. Read the texts and pick the one
      // that STARTS with the label; no regex escaping, and the apostrophe in
      // "Can't" stays a non-issue.
      const texts = await page.locator('.rtool-lens .chip').allTextContents();
      const at = texts.findIndex((t) => t.trim().startsWith(label));
      expect(at, `a chip labelled ${label} exists`).toBeGreaterThan(-1);
      const chip = page.locator('.rtool-lens .chip').nth(at);
      expect(texts[at].trim(), `${label} chip states its count`).toBe(`${label} ${want}`);
      await chip.click({ timeout: 5000 });
      await page.waitForTimeout(250);
      expect((await names(page)).length, `${label} shows exactly its stated count`).toBe(want);
    }
  });

  test('editing a FILTERED row writes to that person, not to their old position', async ({ page }) => {
    await boot(page);
    if (!await openGuests(page)) return;

    // Person 07 is seeded '' (7 % 4 === 3). Filter to it so every guest above it
    // is hidden — the exact condition that renumbers a naively-filtered list.
    await page.locator('.rtool-q').fill('Person 07');
    await page.waitForTimeout(300);
    expect(await names(page)).toHaveLength(1);

    await page.locator('.grow > button[aria-expanded]').first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator('[role="radiogroup"]').first().locator('[role="radio"]', { hasText: /^Yes$/ }).click({ timeout: 5000 });
    await page.waitForTimeout(400);

    // clear the filter and read the WHOLE roster back
    await page.locator('.rtool-q').fill('');
    await page.waitForTimeout(350);
    const rows = await page.locator('.grow').evaluateAll((els) => els.map((e) => ({
      name: (e.querySelector('button') || {}).textContent || '',
      reply: (e.querySelector('button[aria-expanded] .tag') || {}).textContent || '',
    })));
    expect(rows.length).toBe(12);

    const seven = rows.find((r) => r.name.includes('Person 07'));
    expect(seven, 'Person 07 is still on the list').toBeTruthy();
    expect(seven.reply.trim(), 'the edit landed on Person 07').toBe('Yes');

    // and nobody else moved: the k%4 cycle is unchanged for every other row
    const expected = { 0: 'Yes', 1: 'No', 2: 'Maybe', 3: 'No reply' };
    for (const r of rows) {
      const k = Number(r.name.match(/Person (\d+)/)[1]);
      if (k === 7) continue;
      expect(r.reply.trim(), `Person ${k} was not touched`).toBe(expected[k % 4]);
    }
  });
});
