// ─── "COOKOUT AT 5" WENT TO THE CATERER AS A CONFIRMED 5:00 PM ───────────────
//
// `smartParseEvent` grades a spoken clock three ways and marks 'said-hour-only'
// the weakest, because the NUMBER is the host's and the half of the day is the
// app's reading of it. The creation seam wrote `startTimeSource: 'host'` for all
// three and dropped the grade — and `startTimeIsConfirmed` (= source !==
// 'derived') gates the invite, the vendor brief and the run-of-show clock.
//
// The unit suite proves the rule. It cannot prove the two things that actually
// reach a host — what the CREATE FLOW writes when she types the sentence, and
// what the day screen then says about it. jest does not execute hostv2, and this
// path starts at a text input, so it has to be driven.
//
// MEASURED here, 390px, through the real create flow:
//
//   "…on Nov 14 at 5pm"   -> 5:00 PM  src=host      basis=said-exact
//                            …and NO ask on the day screen. Her time, untouched.
//   "…on Nov 14 at 5"     -> 5:00 PM  src=derived   basis=said-hour-only
//                            "We read the half of the day / You said 5 — we read
//                             it as PM. Confirm it, or set the time yourself."
//
// The second sentence exists because the shell's standing derived copy is "We
// pencilled in 5:00 PM — not you", which is true of a time built from a bucket
// and FALSE of one whose number she typed. Trading one inaccuracy for another is
// not a fix.
import { test, expect, settled } from './fixtures.mjs';

const create = async (page, text) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  // The bottom-nav Create door, then the host's own sentence. `fill` races the
  // controlled input here and leaves it empty, so this types.
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')].find((x) => /^\s*Create\s*$/i.test(x.innerText || ''));
    if (el) el.click();
  });
  await settled(page);
  await page.locator('#smart-text-input').click();
  await page.locator('#smart-text-input').pressSequentially(text, { delay: 5 });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Put my plan together/i }).click({ force: true });
  await page.waitForTimeout(1200);
  await settled(page);

  return page.evaluate(() => {
    // The created event lands in the custom-events book; read it by its fields
    // rather than guessing a key, which is how a probe reports "nothing
    // happened" for a change that worked.
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k !== 'ngw-hostv2-custom-events') continue;
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        const e = [...arr].reverse().find((x) => x && x.startTime);
        if (e) return { startTime: e.startTime, src: e.startTimeSource ?? null, basis: e.startTimeBasis ?? null };
      } catch (_e) { /* not ours */ }
    }
    return null;
  });
};

const openTheDay = async (page) => {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((x) => /^\s*The Day\s*$/i.test(x.innerText || ''));
    if (el) el.click();
  });
  await page.waitForTimeout(600);
  await settled(page);
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
};

test('a time she stated is hers, and nothing asks her again', async ({ page }) => {
  const stored = await create(page, 'Cookout for 20 on Nov 14 at 5pm');
  expect(stored).toEqual({ startTime: '5:00 PM', src: 'host', basis: 'said-exact' });
  const day = await openTheDay(page);
  expect(day).not.toMatch(/You said 5/);
  expect(day).not.toMatch(/We read the half of the day/);
});

test('a time whose half of the day we read says exactly that, and asks', async ({ page }) => {
  const stored = await create(page, 'Cookout for 20 on Nov 14 at 5');
  // The NUMBER is kept — dropping it is the defect this feature was built to fix.
  expect(stored).toEqual({ startTime: '5:00 PM', src: 'derived', basis: 'said-hour-only' });
  const day = await openTheDay(page);
  expect(day).toMatch(/You said 5 — we read it as PM\. Confirm it, or set the time yourself\./);
  // …and NOT the sentence that would be false here.
  expect(day).not.toMatch(/We pencilled in .* — not you/);
});
