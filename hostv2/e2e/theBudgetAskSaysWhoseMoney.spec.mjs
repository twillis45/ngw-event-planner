// ─── $13,200 IS A NUMBER UNTIL IT IS A NUMBER PER PERSON ──────────────────
//
// Driving the Santa Fe 80th on 2026-10-06, the budget ask read:
//
//   A number to plan around
//   $13,200                                        Typical · est.
//   For 30 at a birthday, typical lands near $13,200. …
//   These ranges run wider because guests are traveling in —
//   travel-scale costs are part of the numbers.
//   [ Use $13,200 ]  [ Change ]
//
// Two things are missing from the one screen that turns an estimate into the
// host's committed budget with a single tap.
//
// 1. THE PER-HEAD FIGURE. $13,200 across 30 people is $440 each. That is the
//    number a host can actually sanity-check against a dinner they have been
//    to; the total is the number they cannot. It is pure arithmetic on two
//    figures already on screen, so there is nothing to ground and nothing to
//    invent.
//
// 2. WHAT IT DOES NOT COVER. `notIncludedFor` has existed in the estimator
//    since the family-aware intake work and names, for a destination event,
//    "Airfare and ground transfers", "Lodging beyond the group block",
//    "Travel insurance, visas, or permits". Grepped 2026-10-06: its ONLY
//    reader in the tree is the CRA-side BudgetEstimateHint. The hostv2 ask
//    renders none of it, so the sentence a host gets instead is "travel-scale
//    costs are part of the numbers" — which, read plainly, says the opposite
//    of what the engine means. The engine's list is the shipped truth; a
//    stray comment in totalEstimate.js claiming the band "is meant to cover
//    airfare, lodging and insurance" contradicts it and is reported on its
//    own, not acted on here.
//
// Scoped: the exclusions line is for destination estimates only. A church
// hall lunch does not need to be told it excludes visas.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

const toBudget = async (page) => {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch { /* private mode */ }
  });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });
};

test('THE PER-HEAD FIGURE: the ask shows what the total is per person', async ({ page }) => {
  await toBudget(page);
  const txt = await page.evaluate(() => document.body.innerText || '');

  // Read the total off the screen rather than pinning $13,200 — the bands
  // move, the arithmetic does not, and a test that pins the band fails for a
  // reason that has nothing to do with what it is guarding.
  const total = Number((txt.match(/\$([\d,]+)/) || [])[1]?.replace(/,/g, ''));
  const guests = Number((txt.match(/For (\d+) at a/) || [])[1]);
  expect(Number.isFinite(total) && total > 0).toBe(true);
  expect(Number.isFinite(guests) && guests > 0).toBe(true);

  const perHead = Math.round(total / guests);
  expect(txt).toMatch(new RegExp(`\\$${perHead}\\b[^\\n]*a head|\\$${perHead} each`, 'i'));
});

test('WHOSE MONEY: a destination ask names what the host is NOT paying for', async ({ page }) => {
  await toBudget(page);
  const txt = await page.evaluate(() => document.body.innerText || '');
  // The engine's own words, not a paraphrase invented here.
  expect(txt).toMatch(/Airfare and ground transfers/i);
  expect(txt).toMatch(/Lodging beyond the group block/i);
});
