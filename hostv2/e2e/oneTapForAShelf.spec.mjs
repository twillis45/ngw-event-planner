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
import { test, expect, settled } from './fixtures.mjs';

// Click by visible text. `getByRole` cannot see these — the labels are
// multi-line and the accessible name does not match the innerText.
const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
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
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-shelf');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving");
  await page.waitForTimeout(1600);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await page.waitForTimeout(1600);
  await settled(page);
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
  await page.waitForTimeout(1500);
  await settled(page);
  // The section header is the independent witness — it counts from `foodGot`,
  // which is the same storage the row taps write.
  const after = await labels(page);
  expect(after.some((x) => /Drinks all 3 bought/i.test(x))).toBe(true);
  // …and the button has flipped to its undo.
  expect(after.some((x) => /^Uncheck all 3/i.test(x))).toBe(true);

  await tapText(page, 'Uncheck all');
  await page.waitForTimeout(1200);
  await settled(page);
  expect((await labels(page)).some((x) => /Drinks 0 of 3 bought/i.test(x))).toBe(true);
});

test('with a store chosen, the tap covers that store only', async ({ page }) => {
  // The reason this is per-store and not global: standing in one shop, "all"
  // must mean "all of what is here". MEASURED — choosing Liquor store filters
  // the whole sheet to the one line it carries, so the control is scoped by the
  // list itself and not by arithmetic of mine.
  await openList(page);
  await tapText(page, '^Liquor store$');
  await page.waitForTimeout(1200);
  await settled(page);

  const before = await labels(page);
  // The chip is now the active run: "At Liquor store".
  expect(before.some((x) => /^At Liquor store$/i.test(x))).toBe(true);
  // One line, not three — and the label carries "here", which is how the host
  // knows the tap is scoped. Its absence would be the bug even with a right count.
  expect(before.some((x) => /^Check off all 1 here$/i.test(x))).toBe(true);
  // Food and Supplies are not on screen at all: this store does not stock them.
  expect(before.some((x) => /^F Food/i.test(x))).toBe(false);
  expect(before.some((x) => /^S Supplies/i.test(x))).toBe(false);

  await tapText(page, 'Check off all');
  await page.waitForTimeout(1400);
  await settled(page);
  const after = await labels(page);
  expect(after.some((x) => /Drinks all 1 bought/i.test(x))).toBe(true);
  expect(after.some((x) => /^Uncheck all 1$/i.test(x))).toBe(true);
});

test('skip sits on the row, not behind it', async ({ page }) => {
  // It used to live inside the tune panel: open the row, scroll past the
  // quantity stepper and the price controls, tap again. Three taps to say no to
  // one thing. This proves it is reachable with the row merely expanded.
  await openList(page);
  await tapText(page, 'Drinks[\\s\\S]*bought');
  await page.waitForTimeout(900);
  await settled(page);

  const before = await labels(page);
  expect(before.some((x) => /^skip it$/i.test(x))).toBe(true);

  await tapText(page, '^skip it$');
  await page.waitForTimeout(1300);
  await settled(page);
  const after = await labels(page);
  // The row says what happened, and the section count drops — the same
  // `foodSkip` storage the tune-panel control writes.
  expect(after.some((x) => /skipped — tap to restore/i.test(x))).toBe(true);
  expect(after.some((x) => /Drinks 0 of 2 bought/i.test(x))).toBe(true);
});
