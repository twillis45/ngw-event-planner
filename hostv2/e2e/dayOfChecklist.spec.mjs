// ─── WHAT HAS TO BE TRUE BEFORE THE DOORS OPEN ──────────────────────────────
//
// `playbookDayOfChecklist` has worked for months and had ZERO imports in
// hostv2. The frozen CRA rendered it; the shipping shell never did. So the one
// list that answers "what has to be true before the doors open" reached nobody
// — and this repo has now found three engines in that exact state, which is
// why the wiring gets a gate and not just a render.
import { test, expect, settled, dateIn, goToStage } from './fixtures.mjs';

const boot = async (page, type) => {
  await page.addInitScript(([t, SEED_DATE]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'dayof-probe');
    const date = SEED_DATE;   // LOCAL, from fixtures.dateIn — toISOString is UTC
    // GUARDED, and this guard is the whole lesson of this file.
    //
    // `addInitScript` re-runs on EVERY navigation, including `reload()`. With
    // an unconditional seed, reloading rewrote the pristine event over the top
    // of the host's confirmation before the app booted — so the confirmation
    // "vanished", and I wrote it up as a data-loss defect in how custom events
    // persist. It was not. Driven with this guard in place, the confirmation
    // survives; a 39-field event round-trips a boot with all 39 intact,
    // including a control key nothing in the repo reads. The harness was
    // eating the data and blaming the app.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'dayof-probe', type: t, name: `${t} probe`, date, guestCount: 30,
        guests: [], vendors: [], budget: [], timeline: [],
      }]));
    }
  }, [type, dateIn(10)]);
  await page.goto('?elegant=1');
  await settled(page);
  await toTheDay(page);
};

// In elegant mode the floating dock is retired (`.dock-retired{display:none}`)
// and the phase control lives in the eyebrow's nav sheet. Reaching for a
// top-level "The Day" button timed out against a dock that is not there.
const toTheDay = async (page) => {
  await goToStage(page, 'The Day');
  await settled(page);
};

test('an authored type gets its own day-of list, and a confirmation survives a reload', async ({ page }) => {
  await boot(page, 'Cookout');
  const card = page.locator('.dayof-card');
  await expect(card).toBeVisible();
  const rows = card.locator('.frow');
  expect(await rows.count()).toBeGreaterThan(4);
  // Authored, so it must NOT carry the generic-default caveat.
  await expect(card.locator('.borrowed-note')).toHaveCount(0);

  // Confirming one sticks ACROSS A RELOAD. Asserting the write alone would
  // have been the weaker test and is what let a false defect stand: the write
  // lands even when the value is about to be destroyed, so the assertion has
  // to straddle a boot.
  // (The rain row is not a plain tick: it reads the saved rain plan and opens
  // the rain editor — oneRainPlanOnTheDay. Confirm the first ordinary row.)
  // A finished check folds into "1 done" (finishedChecksFoldAway); open the
  // fold to see it ticked.
  const plain = '.frow:not([data-dayof-item="weather"])';
  const key = await card.locator(plain).first().getAttribute('data-dayof-item');
  await card.locator(plain).first().click();
  await settled(page);
  await card.locator('[data-dayof-done]').click();
  await expect(card.locator(`[data-dayof-item="${key}"]`)).toHaveClass(/got/);

  await page.reload();
  await settled(page);
  await toTheDay(page);
  await page.locator('.dayof-card [data-dayof-done]').click();
  await expect(page.locator(`.dayof-card [data-dayof-item="${key}"]`)).toHaveClass(/got/);
});

// UPDATED (audit 2 lane A P0-6, 11/22/2026). This pinned the old floor: a
// playbook with no authored day-of list showed only the generic safety basics
// under "no day-of list written" — on a board meeting whose own checklist holds
// "Take minutes…" on the day. The list is now derived from the playbook's own
// day-of rows, with the basics as an addition; only an event with no playbook
// rows at all still gets the floor, and is still told so.
test('an unauthored playbook gets its own day-of steps, not the floor', async ({ page }) => {
  await boot(page, 'Board Meeting');
  const card = page.locator('.dayof-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText(/Take minutes/);
  await expect(card).toContainText('Emergency basics');
  await expect(card.locator('.borrowed-note')).toHaveCount(0);
});

test('an event with no playbook rows gets the floor AND is told it is the floor', async ({ page }) => {
  await boot(page, 'Kite Festival');
  const card = page.locator('.dayof-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.borrowed-note')).toBeVisible();
  await expect(card.locator('.borrowed-note')).toContainText(/no day-of list written/i);
});

// ONE TICK (audit 2 lane A P0-6): a day-of row derived from the checklist's own
// day-of step IS that step — ticking it on The Day ticks the checklist row.
test('ticking a derived day-of row ticks the checklist step it came from', async ({ page }) => {
  const stepId = 'pbt-dayof-step-t_dayof';
  await page.addInitScript(([id, date]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'dayof-step');
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
        id: 'dayof-step', type: 'Wedding', name: 'Wedding probe', date, guestCount: 80,
        guests: [], vendors: [], budget: [],
        timeline: [{ id, task: 'Hair/makeup → first look → ceremony → cocktail → reception → toasts → first dance → cake → send-off', leadDays: 0, week: 'Day of', done: false }],
      }]));
    }
  }, [stepId, dateIn(10)]);
  await page.goto('?elegant=1');
  await settled(page);
  await toTheDay(page);
  const row = page.locator(`.dayof-card [data-dayof-item="${stepId}"]`);
  await expect(row).toBeVisible();
  await row.click();
  await settled(page);
  await page.locator('.dayof-card [data-dayof-done]').click();
  await expect(row).toHaveClass(/\bgot\b/);
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].timeline[0].done);
  expect(done).toBe(true);
});
