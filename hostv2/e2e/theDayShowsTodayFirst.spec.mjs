// ─── ON THE DAY, TODAY'S LIST COMES FIRST (cohesion batch A, owner-approved ──
// renders 11/24/2026, `renders/cohesion-a`)
//
// Audit P1 #2: on the event day the board ran every planning card under the
// run-of-show hero — about ten equal buttons. Owner ruling, approved from the
// renders:
//   • the list under the hero holds only what is due today plus anything
//     critical, headed "Still to do today · N left";
//   • everything else folds behind "N more from planning, if there's time ▸",
//     which opens in place;
//   • "Run the day" stays the one lit action;
//   • a past-window item that is not critical folds; a critical item never.
//
// Each card carries the engine's own `dueInDays` and `level` as data
// attributes, so the test reads what the board was given, not its wording.
// Self-pinned (playwright.config.mjs) to the four approved widths.
import { test, expect } from './fixtures.mjs';
import { EVENTS, MOMENTS, boot, openStage } from './theDayStageFixture.mjs';

const WIDTHS = [390, 834, 1024, 1440];

const cards = () => [...document.querySelectorAll('[data-queue-card]')]
  .filter((e) => e.getClientRects().length && !e.closest('.sheet'))
  .map((e) => ({ id: e.id, level: e.dataset.level, due: e.dataset.dueInDays === '' ? null : Number(e.dataset.dueInDays) }));
const today = (c) => c.level === 'critical' || c.due === 0;

const litCount = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return [...document.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('.sheet, [inert], [aria-hidden="true"]')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => (e.innerText || '').trim());
};

for (const ev of EVENTS)
for (const w of WIDTHS)
test(`on the day, today’s list comes first — ${ev.label}, ${w}`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: w, height: 900 });
  await boot(page, ev, MOMENTS.dayBeforeFirstCue, 'light');
  // A host's own plan opens on The Day on its day; the board is a tap away.
  await openStage(page, 'Plan');

  // The list holds exactly the due-today and critical items.
  const shown = await page.evaluate(cards);
  expect(shown.filter((c) => !today(c)), 'a card on the day that is neither due today nor critical').toEqual([]);
  const head = page.locator('#actionsAnchor');
  if (shown.length) {
    await expect(head).toContainText('Still to do today');
    await expect(head).toContainText(`${shown.length} left`);
  }

  // One lit action, and it is the hero's.
  expect(await page.evaluate(litCount)).toEqual(['Run the day']);

  // The fold row counts what it folds, and opens in place.
  const fold = page.locator('[data-day-fold]');
  await expect(fold, 'premise: something is folded on this board').toHaveCount(1);
  const n = Number((await fold.innerText()).match(/(\d+) more from planning/)[1]);
  await fold.scrollIntoViewIfNeeded();
  const before = await fold.boundingBox();
  await fold.click();
  await page.waitForTimeout(400);
  const all = await page.evaluate(cards);
  const opened = all.filter((c) => !shown.some((s) => s.id === c.id));
  expect(opened.length, 'the fold row’s count equals the folded items').toBe(n);
  // In place: the first folded card appears where the row was, not a scroll away.
  const firstTop = await page.locator(`[id="${opened[0].id}"]`).boundingBox();
  expect(Math.abs(firstTop.y - before.y), 'the folded items open where the row was').toBeLessThan(900);

  // A critical item never folds; nothing due today folds either.
  expect(opened.filter(today), 'a folded card that is critical or due today').toEqual([]);
  if (ev.label === 'Wanda sample') expect(shown.some((c) => c.level === 'critical'), 'premise: Wanda has a critical card').toBe(true);
});
