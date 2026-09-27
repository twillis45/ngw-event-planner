// ─── A SPAN THE HOST TYPED SURVIVES HER CORRECTING THE START ───────────────
//
// HOST, 2026-09-27: "creation is not picking up multi day for begin and end
// date", and then, on her 50th: "Said overnight for destination".
//
// THE PARSER WAS INNOCENT. Ten phrasings probed — "July 10-13", "July 10 to
// 13", "July 10 through July 13", "7/10 - 7/13", "July 10th-13th", "June 4-6"
// — and nine return a correct endDate. A destination NEVER sets overnight by
// itself: `overnight = (endDate || saidOvernight) ? true : null`. So the 50th
// said overnight because the sentence carried a range, which is right.
//
// WHAT WAS WRONG WAS DOWNSTREAM, and it was two things at once.
//
//   1. THE SPAN VANISHED, WITH NOWHERE TO PUT IT BACK. `effEndDate` was
//      `parsed.endDate && effDate === parsed.date`, so ANY start edit dropped
//      the end — including one that leaves the span perfectly coherent. And
//      there was no `fEndDate` anywhere in creation: the date editor offered
//      one field. Driven on the sim: type the range, move the start 10 -> 11,
//      and the chip goes from "Jul 10 – Jul 13" to "Jul 11" with the host's
//      own sentence still reading July 10-13 two inches above.
//
//   2. THE OVERNIGHT CLAIM OUTLIVED THE SPAN IT CITED. `parsed` is a pure
//      function of the TEXT, so `parsed.overnight` stayed true after the span
//      was dropped. The chip kept saying "Staying overnight · from your
//      dates" over a single date — citing dates it was no longer showing.
//      Not cosmetic: overnight turns on the lodging and travel stack, so the
//      plan was built for a multi-night stay on a one-day event.
//
// R1 (2026-07-26) is kept, not reverted. Its reasoning — a corrected start
// cannot keep an end that no longer means anything — is right. What it lacked
// was a floor: an end is meaningless when it is no longer AFTER the start,
// which is what is tested now, and a host needs somewhere to re-enter one,
// which now exists.
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

// The two date inputs, in DOM order: [start, end]. Reading them by value is
// what proves the end has a HOME, not merely that a chip prints a range.
const dateInputs = (page) => page.evaluate(() =>
  [...document.querySelectorAll('input[type="date"]')].map((i) => i.value));

const setStart = (page, v) => page.evaluate((val) => {
  const el = document.querySelectorAll('input[type="date"]')[0];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, v);

// The route into creation, copied from ryanWay.spec.mjs rather than invented:
// there is no `?new=1`, you go through the splash. The first draft guessed a
// query param, found no text box, and failed five tests for a reason that had
// nothing to do with dates.
const openCreate = async (page, sentence) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* private mode */ } });
  await page.goto('./');
  await settled(page);
  await page.getByText('Start my event', { exact: false }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(sentence);
  await page.getByText('Say it', { exact: false }).first().click();
  await expect(page.getByText('Put my plan together', { exact: false }).first())
    .toBeVisible({ timeout: 15000 });
  await tapText(page, 'Jul \\d+|pick a day|No date yet');   // open the date editor
  await page.waitForTimeout(800);
  await settled(page);
};

test('(premise) a typed range is heard, and gets its own field', async ({ page }) => {
  await openCreate(page, '50th anniversary in Santa Fe July 10-13 for 30');
  // Without this the survival test below could pass because nothing was ever
  // parsed — the failure mode the whole spec exists to catch.
  expect(await dateInputs(page)).toEqual(['2027-07-10', '2027-07-13']);
});

test('THE BUG: moving the start keeps an end that still makes sense', async ({ page }) => {
  await openCreate(page, '50th anniversary in Santa Fe July 10-13 for 30');
  await setStart(page, '2027-07-11');
  await page.waitForTimeout(800);
  await settled(page);
  // Before: ['2027-07-11', ''] and the chip read "Jul 11".
  expect(await dateInputs(page)).toEqual(['2027-07-11', '2027-07-13']);
  expect(await bodyText(page)).toContain('Jul 11 – Jul 13');
});

test('…and an end that no longer makes sense is still dropped (R1 stands)', async ({ page }) => {
  await openCreate(page, '50th anniversary in Santa Fe July 10-13 for 30');
  await setStart(page, '2027-07-20');           // now AFTER the parsed end
  await page.waitForTimeout(800);
  await settled(page);
  // The end FIELD unmounts with the span, so there is one input again — which
  // is a stronger statement than an empty second box, and is why this asserts
  // the array rather than destructuring (the first draft read `undefined` and
  // called the product wrong).
  expect(await dateInputs(page)).toEqual(['2027-07-20']);
  // …and the host is not stuck: the way back to a span is on screen.
  expect(await bodyText(page)).toContain('Runs more than one day?');
});

test('THE FALSE CLAIM: overnight cannot cite dates that are gone', async ({ page }) => {
  await openCreate(page, '50th anniversary in Santa Fe July 10-13 for 30');
  expect(await bodyText(page)).toContain('Staying overnight · from your dates');
  await setStart(page, '2027-07-20');           // span dropped by the rule above
  await page.waitForTimeout(800);
  await settled(page);
  const txt = await bodyText(page);
  // THE POINT: the claim that cited a span does not outlive the span.
  expect(txt).not.toContain('from your dates');
  expect(txt).not.toContain('Staying overnight');
  // And it does not fall back to ASKING either, which surprised the first
  // draft of this test. The chip renders on `effIsDestination || effOvernight
  // !== null || effEndDate`, and with no home city on the profile the shell
  // deliberately leaves isDestination UNANSWERED and asks instead (the
  // 2026-09-17 "a guess is not an answer" ruling) — which is why "Local, or
  // folks traveling in?" is the chip on screen. No span, no said-so, no
  // settled destination: nothing to base the overnight question on, so it is
  // not raised. That is the same honesty rule, applied one level up.
  expect(txt).toContain('Local, or folks traveling in?');
  expect(txt).toContain('Runs more than one day?');
});

test('NEGATIVE CONTROL: a said-so overnight does NOT depend on any date', async ({ page }) => {
  // "hotel" is the host telling us directly. That fact must survive a date
  // edit, because it never came from a date — smartParseEvent's 2026-08-06
  // ruling that SAID beats DERIVED.
  await openCreate(page, '50th anniversary at a hotel in Santa Fe on July 10');
  await setStart(page, '2027-07-20');
  await page.waitForTimeout(800);
  await settled(page);
  expect(await bodyText(page)).toContain('Staying overnight · heard');
});
