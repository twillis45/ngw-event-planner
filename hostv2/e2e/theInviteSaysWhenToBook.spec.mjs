// ─── THE DATE MOVED THREE MONTHS AND NEVER SAID WHY ───────────────────────
//
// `airTravelInviteFloor` pulls the invite to 88 days out on a destination
// event, so guests can buy inside the measured prime booking window instead of
// opening an invitation 18 days before a flight. That shipped 2026-09-23 and
// has been silent ever since: the milestone carried `airFloorBecause` and
// `airFloorSources`, the checklist task inherited the moved DATE, and grepped
// on 2026-10-06 the only reader of the reason anywhere in the tree was a unit
// test.
//
// So the host saw "Send invites" sitting three months out with no account of
// itself, and — the part that actually costs money — nothing to pass on to a
// guest about when to buy. The engine knew the window. Nobody was told.
//
// This spec gates the DELIVERY, not the string. A jest assertion on
// `airFloor.because` has been green the whole time the screen said nothing;
// that is the failure mode this file exists for.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

const openChecklist = async (page) => {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch { /* private mode */ }
  });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });
  // Take the proposed budget so the ask stops standing in front of the plan.
  await page.getByRole('button', { name: /^Use \$[\d,]+$/ }).click();
  await page.waitForTimeout(1200);
};

test('THE WINDOW REACHES THE HOST: the invite row explains its own date', async ({ page }) => {
  await openChecklist(page);

  // Reach the checklist by the host's own route rather than a seeded sheet —
  // a note that only renders on a surface nobody walks to is not delivered.
  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab')]
      .find((x) => /^checklist/i.test((x.innerText || '').trim()));
    if (!el) return false;
    el.click();
    return true;
  });
  expect(opened, 'the host can reach a Checklist surface').toBe(true);
  await page.waitForTimeout(1500);

  const txt = await page.evaluate(() => document.body.innerText || '');
  // The host's half: why this date and not the authored one.
  expect(txt).toMatch(/fares step up/i);
  // The guest's half: the dates to act on.
  expect(txt).toMatch(/74[–-]21 days/);
  expect(txt).toMatch(/42\b/);
  // Named, so it reads as measurement rather than opinion.
  expect(txt).toMatch(/CheapAir/i);
});

// ── AND THIS TEST WAS VACUOUS, WHICH A BOARD CAUGHT AND I DID NOT ─────────
// As first written this asserted only `not.toMatch(/fortnight/i)` and clicked
// the checklist with `if (el) el.click()` — no assertion that it opened.
// Bench E of the 2026-10-06 review board red-proofed it by suppressing the
// entire airFloor note and watched it PASS with the sentence it guards absent
// from the application. A negative assertion on a string that is not there is
// satisfied by the string never rendering at all, which is the exact shape of
// guard this repo keeps finding and this file was supposed to be better than.
//
// It now asserts the sentence is PRESENT and in US English, and the navigation
// is asserted rather than attempted — the same discipline the test above it
// already used.
test('US ENGLISH on the one sentence that reaches a screen', async ({ page }) => {
  await openChecklist(page);
  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab')]
      .find((x) => /^checklist/i.test((x.innerText || '').trim()));
    if (!el) return false;
    el.click();
    return true;
  });
  expect(opened, 'the host can reach a Checklist surface').toBe(true);
  await page.waitForTimeout(1500);
  const txt = await page.evaluate(() => document.body.innerText || '');
  // PREMISE FIRST: the sentence has to be on screen for its spelling to mean
  // anything. Without this line the assertion below is satisfied by absence.
  expect(txt).toMatch(/two weeks to decide/i);
  expect(txt).not.toMatch(/\bfortnight\b/i);
});
