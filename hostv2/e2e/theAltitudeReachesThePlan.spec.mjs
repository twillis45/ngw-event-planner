// ─── DRIVEN, BECAUSE A FIELD ON AN OBJECT IS NOT A PLAN ───────────────────
//
// The jest file beside this one proves the parse hears the clause, the
// recommendation proposes Yes, and the pacing task fires. All of that is true
// of an object. This drives the host's own route — type the sentence, assemble
// the plan, open the checklist — because the whole defect was that a fact
// reached an object and stopped there, and a gate on the object could never
// have caught it. That is this repo's standing law and it is the reason this
// file exists rather than one more jest assertion.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
  + 'she uses a walker and the altitude is hard on her';

test('THE ALTITUDE REACHES THE PLAN: the pacing task is on the host\'s checklist', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);

  // BEFORE assembling: the altitude clause is no longer disclaimed as dropped,
  // and the walker still is — the app should keep saying what it genuinely
  // cannot carry.
  const creation = await page.evaluate(() => document.body.innerText || '');
  expect(creation).toMatch(/didn.t make it into the plan/i);
  expect(creation).toMatch(/walker/i);
  expect(creation).not.toMatch(/altitude/i);

  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await expect(page.getByText(/A number to plan around/i)).toBeVisible({ timeout: 20000 });

  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab')]
      .find((x) => /^checklist/i.test((x.innerText || '').trim()));
    if (!el) return false;
    el.click();
    return true;
  });
  expect(opened, 'the host can reach a Checklist surface').toBe(true);
  await page.waitForTimeout(1500);

  // ── AND THE ASSERTION HAS TO NAME THE TASK ────────────────────────────
  // This first read `expect(txt).toMatch(/pace|rest|doctor/i)` and I
  // red-proofed it by cutting the creation seam: it PASSED with the whole
  // chain severed, because the plan surface says "the rest can wait till
  // Jun 7" and "The rest of your plan". A three-word alternation over the
  // whole body matched furniture, not the finding.
  // It names the authored copy of `dest_t_health` now — the one string that
  // can only be on screen if the clause survived the parse, the creation
  // seam, the fact, the recommendation and the whenChoice gate.
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).toMatch(/Pace the schedule for the guests who need it/i);
  expect(txt).toMatch(/build in real rest/i);
});
