// Render-only (renders/cohesion-a, never merges): The Day stage before/after
// the batch A layout proposal. Made-up data, clock fixed on the event day.
import { test } from './fixtures.mjs';
import { EVENTS, MOMENTS, boot, openStage } from './theDayStageFixture.mjs';
test.use({ deviceScaleFactor: 2 });
const OUT = process.env.RENDER_OUT;
const TAG = process.env.RENDER_TAG;
for (const ev of EVENTS) for (const w of [390, 834, 1024, 1440]) for (const stage of ['Plan'])
test(`render ${TAG} ${ev.label} ${w}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: w, height: 900 });
  await boot(page, ev, MOMENTS.dayBeforeFirstCue, 'light');
  await openStage(page, stage);
  // Grow the window to the board's full length so one image shows all of it.
  const h = await page.evaluate(() => Math.max(...[document.scrollingElement, ...document.querySelectorAll('*')]
    .filter((el) => el && el.scrollHeight > el.clientHeight + 4 && (el === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(el).overflowY)))
    .map((el) => el.scrollHeight), 900));
  await page.setViewportSize({ width: w, height: Math.min(h + 40, 7000) });
  await page.waitForTimeout(700);
  const slug = ev.label.replace(/\s+/g, '-');
  await page.screenshot({ path: `${OUT}/${TAG}__day-board__${slug}__${w}.png` });
});
