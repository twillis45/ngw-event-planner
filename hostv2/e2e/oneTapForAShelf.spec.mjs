// ─── CHECKING OFF FOURTEEN LINES ONE AT A TIME, IN A SHOP ────────────────────
//
// Host, 2026-09-22: the shopping spread needs select-all, per store, undoable.
//
// The control is per SECTION and, in run mode, per STORE — the section's items
// are already filtered by the chosen store, so "I'm at Grocery" means the button
// checks off only what Grocery carries. Nothing global: one all-at-once button
// lets a stray tap erase a whole shop's worth of progress.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2, and because the last two attempts
// at this screen were written blind. The path, captured rather than guessed:
//
//   command board  ->  "Decide what you're serving"   (the food sheet)
//                  ->  "The list · N of M bought"     (the shopping list)
//                  ->  store chips: Caterer · Grocery · Liquor store
//                  ->  a section header (Food / Drinks / Supplies) expands
//
// A section is COLLAPSED by default, so the control only exists once its header
// is tapped — which is also why an earlier spec that read the landing page
// "proved" the list was absent. That test could not fail.
import { test, expect, settled, sheetSettled } from './fixtures.mjs';

// Click by visible text. `getByRole` cannot see these — the labels are
// multi-line and the accessible name does not match the innerText.
const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));

const openList = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const ev = {
      id: 'e2e-shelf', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      // "Beer + wine": Birthday's default is "No alcohol", and a dry pick buys
      // no bar (aDryPartyBuysNoBar), so the Liquor store line needs a pick that pours.
      foodChoices: { alcohol: 'Beer + wine' },
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-shelf');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  // A destination trip leads with its dinner and "Your days" (the dinner inside
  // the trip, 11/21/2026), so its board has no "what you're serving" door; the
  // food plan's own row opens the same spread.
  await page.getByRole('button', { name: /^Note dietary needs on the food plan$/ }).first().click();
  await sheetSettled(page);
  // The menu door opens the spread on Plan while the menu is open (owner's
  // iPad, 11/21/2026); the list is on Shop.
  await tapText(page, '^Shop$');
  await sheetSettled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await sheetSettled(page);
};

test('(premise) the shopping list really opens, with its sections and store chips', async ({ page }) => {
  // Without this the three tests below are asserting over a screen that never
  // rendered — which is exactly how the previous two attempts passed hollow.
  await openList(page);
  const l = await labels(page);
  expect(l.some((x) => /Drinks \d+ of \d+ bought/i.test(x))).toBe(true);
  expect(l.some((x) => /^Grocery$/i.test(x))).toBe(true);
});

test('a section offers one tap for the whole shelf, and it undoes', async ({ page }) => {
  await openList(page);
  // Sections start collapsed; the control lives inside an open one.
  await tapText(page, 'Drinks[\\s\\S]*bought');
  await page.waitForTimeout(900);

  expect((await labels(page)).some((x) => /^Check off all \d+/i.test(x))).toBe(true);

  await tapText(page, 'Check off all');
  await sheetSettled(page);
  // The section header is the independent witness — it counts from `foodGot`,
  // which is the same storage the row taps write.
  // A finished section is now one green row (DoneFold, owner 11/24/2026);
  // reopening it shows the section with its undo.
  const after = await labels(page);
  // Batch 4 (owner, 11/24/2026): Birthday's soft drinks split into soft drinks, juice and water: 3 -> 5.
  // The finished group folds to one line (main, 11/24); open it to read the rows.
  expect(after.some((x) => /Drinks · all 5 bought/i.test(x))).toBe(true);
  await tapText(page, 'Drinks · all 5 bought');
  await sheetSettled(page);
  expect((await labels(page)).some((x) => /Drinks all 5 bought/i.test(x))).toBe(true);
  // …and the button has flipped to its undo.
  expect((await labels(page)).some((x) => /^Uncheck all 5/i.test(x))).toBe(true);

  await tapText(page, 'Uncheck all');
  await sheetSettled(page);
  expect((await labels(page)).some((x) => /Drinks 0 of 5 bought/i.test(x))).toBe(true);
});

test('with a store chosen, the tap covers that store only', async ({ page }) => {
  // The reason this is per-store and not global: standing in one shop, "all"
  // must mean "all of what is here". MEASURED — choosing Liquor store filters
  // the whole sheet to the one line it carries, so the control is scoped by the
  // list itself and not by arithmetic of mine.
  await openList(page);
  await tapText(page, '^Liquor store$');
  await sheetSettled(page);

  const before = await labels(page);
  // The chip is now the active run: "I'm at Liquor store" (owner, 11/24/2026;
  // it read "At Liquor store").
  expect(before.some((x) => /^I’m at Liquor store$/i.test(x))).toBe(true);
  // One line, not three — and the label carries "here", which is how the host
  // knows the tap is scoped. Its absence would be the bug even with a right count.
  expect(before.some((x) => /^Check off all 1 here$/i.test(x))).toBe(true);
  // Food and Supplies are not on screen at all: this store does not stock them.
  expect(before.some((x) => /^F Food/i.test(x))).toBe(false);
  expect(before.some((x) => /^S Supplies/i.test(x))).toBe(false);

  await tapText(page, 'Check off all');
  await sheetSettled(page);
  const after = await labels(page);
  expect(after.some((x) => /Drinks all 1 bought/i.test(x))).toBe(true);
  expect(after.some((x) => /^Uncheck all 1$/i.test(x))).toBe(true);
});

// SKIP MOVED BACK INTO THE ITEM, ON PURPOSE (owner, 11/24/2026). The
// 9/22/2026 ruling put "skip it" on the row; the row's second tap now opens
// the item, and Skip sits alone at its bottom. Still two taps from the list
// (open, skip), still the same `foodSkip` write, still undone by tapping the row.
test('skip is the last control in the opened item, and the row restores it', async ({ page }) => {
  await openList(page);
  await tapText(page, 'Drinks[\\s\\S]*bought');
  await page.waitForTimeout(900);
  await settled(page);

  const before = await labels(page);
  expect(before.some((x) => /^skip it$/i.test(x)), 'no skip on the closed row').toBe(false);

  const row = page.locator('.fgroup', { has: page.locator('.fg-label', { hasText: /^Drinks/ }) }).locator('.frow').first();
  await row.locator('.f-body').click();
  const open = page.locator('[data-food-open]');
  await expect(open).toHaveCount(1);
  const skip = open.locator('.fo-skip button').last();
  await expect(skip).toHaveText(/^Skip /);
  await skip.click();
  await sheetSettled(page);
  const after = await labels(page);
  // The row says what happened, and the section count drops.
  expect(after.some((x) => /skipped — tap to restore/i.test(x))).toBe(true);
  expect(after.some((x) => /Drinks 0 of 2 bought/i.test(x))).toBe(true);
});
