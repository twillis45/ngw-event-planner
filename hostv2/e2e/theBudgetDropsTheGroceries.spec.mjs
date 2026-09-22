// ─── THE HEADROOM THAT GREW WHEN THE GROCERIES LEFT ──────────────────────────
//
// `hostSpending` now withdraws the grocery food and supplies estimates on a
// known-no-kitchen stay, because the shopping list they priced has already been
// withheld. The engine side is proved in
// src/lib/__tests__/theBudgetBoughtGroceriesForAHotel.test.js.
//
// THIS FILE EXISTS BECAUSE THE WITHDRAWAL MAKES THE HOST'S HEADROOM BIGGER.
// Measured on the Santa Fe 80th: committed $434 -> $101, headroom $3,566 ->
// $3,899. A host reading $3,899 of room when they will still be buying five
// days of restaurant meals is worse off than one reading the wrong basis — so
// the missing money owes them a sentence, and a sentence is a host-facing claim,
// and jest cannot execute hostv2. It gets driven.
//
// The two rows simply VANISH from the breakdown (hostSpendRows filters
// `est > 0 || got > 0`), which is the quiet failure this spec is aimed at.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

// `kitchenSignal` matches /house/ for the rental and /room block/ for the hotel.
const openBudget = async (page, pick) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((p) => {
    const ev = {
      id: 'e2e-budget', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      ...(p ? { foodChoices: { dest_lodging: p } } : {}),
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-budget');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, pick);
  await page.goto('?elegant=1');
  await settled(page);
  // The BUDGET tile on the command board — "$4,000 · $N spoken for (est.)".
  await tapText(page, 'BUDGET[\\s\\S]*spoken for');
  await page.waitForTimeout(1600);
  await settled(page);
};

test('(premise) a kitchen event really does show the food row and price it', async ({ page }) => {
  // Everything below asserts an absence. This is what makes the absence mean
  // something rather than meaning the sheet never opened.
  await openBudget(page, 'A house we rent for everyone');
  const t = await bodyText(page);
  expect(t).toMatch(/Food & drinks/i);
  expect(t).toMatch(/Supplies/i);
  expect(t).not.toMatch(/Food is not in this total/i);
});

test('a room block drops the grocery rows and SAYS the food is missing', async ({ page }) => {
  await openBudget(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  // The rows are gone…
  expect(t).not.toMatch(/Food & drinks/i);
  // …and the hole is named, rather than leaving a quietly smaller number.
  expect(t).toMatch(/Food is not in this total/i);
  expect(t).toMatch(/no kitchen the meals are eaten out/i);
});

test('the sentence says WHY, and gives the host the way to fix it', async ({ page }) => {
  // "Missing" is only half an answer. The host needs to know the app is
  // declining rather than forgetting, and what to do about it.
  await openBudget(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).toMatch(/only food prices this app has are grocery prices/i);
  expect(t).toMatch(/Add what you expect to spend on meals as your own budget line/i);
});

test('no restaurant number is invented anywhere on the sheet', async ({ page }) => {
  // The tempting fix is to keep the dollars and relabel them. If a food figure
  // reappeared under any name, something authored it.
  await openBudget(page, 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).not.toMatch(/eating out ~?\$/i);
  expect(t).not.toMatch(/Meals out \$/i);
  expect(t).not.toMatch(/Food & drinks/i);
});

test('NEGATIVE CONTROL: an UNTOLD kitchen keeps its food money', async ({ page }) => {
  // Same asymmetry the gate itself draws. Not being asked is not being told no.
  await openBudget(page, null);
  const t = await bodyText(page);
  expect(t).toMatch(/Food & drinks/i);
  expect(t).not.toMatch(/Food is not in this total/i);
});
