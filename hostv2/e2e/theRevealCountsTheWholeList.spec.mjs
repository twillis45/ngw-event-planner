// ─── "4 ITEMS, READY TO CHECK OFF" FOR AN EIGHT-ROW LIST ──────────────────
//
// The reveal's shopping stage sits on the screen that closes with "All of
// this came straight from your answers — nothing made up", and it undercounted
// the host's shopping list by half.
//
// The jest file beside this proves the engine now answers `shoppingCount`.
// That is true of an object. This drives the host's own route, because the
// whole defect was a fix that reached three readouts and not the fourth — and
// a gate on the engine could not have caught that either, for exactly the
// reason the fourth site was missed: it lives in a module the shell's memo
// cannot see.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

test('THE REVEAL COUNTS THE WHOLE LIST, not just the food', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();

  // The reveal, before the plan opens — this is the surface that was lying.
  await expect(page.getByText(/Writing Your Shopping List/i)).toBeVisible({ timeout: 20000 });
  const reveal = await page.evaluate(() => document.body.innerText || '');
  const shown = Number((reveal.match(/(\d+)\s+items?,\s*ready to check off/i) || [])[1]);
  expect(Number.isFinite(shown) && shown > 0).toBe(true);

  // Now the food/shop surface, which has counted the whole list correctly
  // since 2026-09-27. The two describe ONE list and must agree — asserted
  // against each other rather than against a pinned number, because the
  // playbook's contents are allowed to change and their agreement is not.
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });
  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab')]
      .find((x) => /^(food|shop)/i.test((x.innerText || '').trim()));
    if (!el) return false;
    el.click();
    return true;
  });
  expect(opened, 'the host can reach the food/shopping surface').toBe(true);
  await page.waitForTimeout(1500);

  const shop = await page.evaluate(() => document.body.innerText || '');
  const listed = Number((shop.match(/(\d+)\s+items?,\s*ready to check off/i)
    || shop.match(/All\s+(\d+)\s+items?/i)
    || shop.match(/(\d+)\s+items?/i) || [])[1]);
  expect(Number.isFinite(listed) && listed > 0).toBe(true);
  expect(shown).toBe(listed);
});
