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

// ── THE WIRE WAS 3 OF 8, AND THE COMMIT SAID OTHERWISE ────────────────────
// Bench B of the 2026-10-06 review board opened the first version of this
// wire and found it imported the raw 3-line TRAVEL_LOGISTICS_NOT_INCLUDED
// constant while its own comment claimed the exclusions were wired "in the
// engine's own words". For a destination Birthday `notIncludedFor` returns
// EIGHT lines; the host was shown three. The five missing ones were gifts and
// favors, outfits for the guest of honor, tips beyond service charge,
// pre- or post-event gatherings — and cake, which on an 80th birthday is the
// one that bites.
//
// Worse, the line was gated on `est.destinationAdjusted`, so every ordinary
// non-destination event in hostv2 got no exclusion disclosure at all and the
// frozen CRA stayed the only surface that had ever rendered the full list.
test('THE WHOLE LIST: a destination ask names every exclusion the engine holds', async ({ page }) => {
  await toBudget(page);
  const txt = await page.evaluate(() => document.body.innerText || '');
  // All eight, in the engine's own words. Named individually rather than
  // counted, so a regression says WHICH line went missing.
  for (const line of [
    /airfare and ground transfers/i,
    /lodging beyond the group block/i,
    /travel insurance, visas, or permits/i,
    /gifts, favors, and thank-you cards/i,
    /outfits and accessories for the guest of honor/i,
    /tips and gratuities beyond service charge/i,
    /cake \/ dessert when not included with catering/i,
    /pre- or post-event gatherings/i,
  ]) expect(txt).toMatch(line);
});

test('AND THE ORDINARY CASE TOO: a local event still hears what it excludes', async ({ page }) => {
  // The gate that hid this. A church-hall lunch has no airfare to disclose,
  // but it still has a cake and it still has tips.
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first()
    .fill("Mom's 80th birthday party on June 14 2027, about 45 people at the church hall in Baltimore, sit-down lunch");
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).toMatch(/cake \/ dessert when not included with catering/i);
  expect(txt).toMatch(/tips and gratuities beyond service charge/i);
  // …and it is NOT told about visas, which it does not need.
  expect(txt).not.toMatch(/travel insurance, visas, or permits/i);
});

test('EVERY TIER IS CHECKABLE, not just the middle one', async ({ page }) => {
  // Tufte, Bench B: the whole argument for the per-head figure is that the
  // total is not checkable and the per-head is. Lean and All-out are equally
  // uncheckable and were left that way, so the honesty reached one of three
  // numbers. Read off the screen rather than pinned, because the bands move.
  await toBudget(page);
  const txt = await page.evaluate(() => document.body.innerText || '');
  const guests = Number((txt.match(/For (\d+) at a/) || [])[1]);
  expect(Number.isFinite(guests) && guests > 0).toBe(true);
  const money = (re) => Number((txt.match(re) || [])[1]?.replace(/,/g, ''));
  const lean = money(/Lean \$([\d,]+)/);
  const allout = money(/All-out \$([\d,]+)/);
  expect(Number.isFinite(lean) && Number.isFinite(allout)).toBe(true);
  expect(txt).toMatch(new RegExp(`\\$${Math.round(lean / guests)}\\b`));
  expect(txt).toMatch(new RegExp(`\\$${Math.round(allout / guests)}\\b`));
});
