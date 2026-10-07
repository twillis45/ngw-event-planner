// ─── THE ENGINE TEST WENT GREEN WITH THE SCREEN STILL LYING ───────────────
//
// I wrote `theAllInPerHeadIsAllIn.test.js` first, it passed, and then I
// red-proofed by reverting the Shop hero to the food-only pair — and the jest
// file STAYED GREEN, because it asserts `playbookFoodPlan` and the defect is
// in the render. That is this repo's standing trap in its purest form: a
// tested value is not a rendered one, and the accessor existing proves nothing
// about which accessor the screen reads.
//
// So the real gate is here, and it asserts the arithmetic a HOST would do:
// take the two numbers off the screen and multiply.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard';

test('WHAT THE HOST MULTIPLIES COMES OUT RIGHT', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
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

  const txt = await page.evaluate(() => document.body.innerText || '');
  // The line that invites the multiplication, read exactly as it is written.
  const line = (txt.match(/estimate, all in · \$([\d,]+)–\$([\d,]+) a head · ([^\n]+?) guests/i) || []);
  expect(line.length, 'the all-in line is on screen').toBeGreaterThan(0);
  const [, phLow, phHigh, guestPhrase] = line;

  // The headline it sits under.
  const head = (txt.match(/\$([\d,]+)–\$([\d,]+)\s*\n\s*estimate, all in/i)
    || txt.match(/\$([\d,]+)–\$([\d,]+)[\s\S]{0,40}estimate, all in/i) || []);
  expect(head.length, 'the headline band is on screen above it').toBeGreaterThan(0);

  const n = (v) => Number(String(v).replace(/,/g, ''));
  const guests = n((guestPhrase.match(/(\d+)\s*$/) || guestPhrase.match(/(\d+)/) || [])[1]);
  expect(Number.isFinite(guests) && guests > 0).toBe(true);

  // A host multiplying the per-head by the guest count must land on the
  // headline. Rounding is per-head, so the product can miss by up to half a
  // guest either way; the defect this guards was 13% — $1,170 against $1,320.
  const tol = guests / 2 + 5;
  expect(Math.abs(n(phLow) * guests - n(head[1]))).toBeLessThanOrEqual(tol);
  expect(Math.abs(n(phHigh) * guests - n(head[2]))).toBeLessThanOrEqual(tol);
});
