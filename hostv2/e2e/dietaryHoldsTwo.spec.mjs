// ─── THE SECOND ALLERGY MUST SURVIVE, ON THE ACTUAL SCREEN ───────────────────
//
// The unit tests prove the builder accumulates. This proves the HOST can get
// two restrictions in, which is the half that failed here — TWICE, in one
// afternoon, in the same change.
//
// MEASURED 2026-09-18 against the built bundle in Chromium:
//
//   before the fix   tap Vegetarian -> stored "Vegetarian"
//                    tap Nut allergy -> stored "Nut allergy"   (the first is gone)
//
//   after the engine fix, before this one:
//                    tap Vegetarian -> stored ["Vegetarian"]  ✓ engine correct
//                    …and the row FOLDED to "Vegetarian · Change", so the nut
//                    allergy had nowhere to go. The store held a list; the
//                    screen had closed over it. Jest was green for both.
//
// That is the defect class this repo keeps paying for: an engine that is right
// and a surface that never shows it. jest cannot execute hostv2, so this guard
// has to live here or it does not exist.
//
// Pinned to 390px — the dietary picker is the mobile-flagship surface and this
// is the geometry the behaviour was driven at. Running it at six viewports
// would buy six identical results.
import { test, expect, settled } from './fixtures.mjs';

const EV = 'my-crab-feast';

const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-last-event', ev);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./');
  await settled(page);
  // The board's own next-action row, then the choices drill-in — the host's
  // real path, not a hand-seeded sheet.
  await page.getByText('Plan the food', { exact: false }).first().click();
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await sheet.getByText('Your choices', { exact: false }).first().click();
  await settled(page);
  return sheet;
};

// The dietary answer wherever the shell stores it. Guessing the key is how a
// probe reports "nothing happened" for a change that worked: the sample events
// live under ngw-hostv2-patch-<id>, not ngw-hostv2-custom-events.
const storedDietary = (page) => page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i += 1) {
    const raw = localStorage.getItem(localStorage.key(i)) || '';
    if (!raw.includes('dietary')) continue;
    try {
      const j = JSON.parse(raw);
      if (j && j.foodChoices && 'dietary' in j.foodChoices) return j.foodChoices.dietary;
    } catch (_e) { /* not ours */ }
  }
  return null;
});

const chip = (sheet, label) =>
  sheet.locator('button.chip', { hasText: new RegExp(`^${label}$`) }).first();

test('a table with a vegetarian AND a nut allergy can say both', async ({ page }) => {
  const sheet = await boot(page);

  await chip(sheet, 'Vegetarian').click();
  await settled(page);
  // THE LIST STAYS OPEN. This is the assertion that would have caught the
  // half-inert fix: the store was already right at this point.
  await expect(chip(sheet, 'Nut allergy')).toBeVisible();

  await chip(sheet, 'Nut allergy').click();
  await settled(page);

  expect(await storedDietary(page)).toEqual(['Vegetarian', 'Nut allergy']);
  // Both still read as on, so the host can see what they have recorded.
  await expect(chip(sheet, 'Vegetarian')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(sheet, 'Nut allergy')).toHaveAttribute('aria-pressed', 'true');
});

test('the folded line prints the list with a space, never bare', async ({ page }) => {
  // React renders an array by concatenation: a bare `{picked}` would read
  // "VegetarianNut allergy". Folding happens when another decision takes the
  // open slot, which is how a host actually leaves the row.
  const sheet = await boot(page);
  await chip(sheet, 'Vegetarian').click();
  await settled(page);
  await chip(sheet, 'Nut allergy').click();
  await settled(page);
  await chip(sheet, 'Order steamed for pickup').click();
  await settled(page);

  await expect(sheet.getByText('Vegetarian, Nut allergy', { exact: false })).toBeVisible();
});

test('a mis-tap is correctable, and an emptied list claims nothing', async ({ page }) => {
  const sheet = await boot(page);
  await chip(sheet, 'Vegetarian').click();
  await settled(page);
  await chip(sheet, 'Vegetarian').click();
  await settled(page);

  // Stored as '' and not [] — `[]` is TRUTHY, and this value is read by ~80
  // `if (foodChoices[id])` gates across the tree. A host who took their only
  // restriction back off would have read as ANSWERED at every one of them.
  expect(await storedDietary(page)).toBe('');
  await expect(chip(sheet, 'Vegetarian')).toHaveAttribute('aria-pressed', 'false');
});

test('NEGATIVE CONTROL: a pick-one decision still folds on one tap', async ({ page }) => {
  // The multi behaviour must not leak. If the sourcing question stopped folding,
  // every pick-one in the app would have become a toggle list.
  const sheet = await boot(page);
  await chip(sheet, 'Order steamed for pickup').click();
  await settled(page);
  await expect(chip(sheet, 'Steam them myself')).toHaveCount(0);
});
