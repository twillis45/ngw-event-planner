// ─── WHAT HAS TO BE TRUE BEFORE THE DOORS OPEN ──────────────────────────────
//
// `playbookDayOfChecklist` has worked for months and had ZERO imports in
// hostv2. The frozen CRA rendered it; the shipping shell never did. So the one
// list that answers "what has to be true before the doors open" reached nobody
// — and this repo has now found three engines in that exact state, which is
// why the wiring gets a gate and not just a render.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page, type) => {
  await page.addInitScript((t) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'dayof-probe');
    const date = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
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
  }, type);
  await page.goto('?elegant=1');
  await settled(page);
  await toTheDay(page);
};

// In elegant mode the floating dock is retired (`.dock-retired{display:none}`)
// and the phase control lives in the eyebrow's nav sheet. Reaching for a
// top-level "The Day" button timed out against a dock that is not there.
const toTheDay = async (page) => {
  await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
  await page.locator('.navseg-b', { hasText: 'The Day' }).first().click({ timeout: 8000 });
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
  await rows.first().click();
  await settled(page);
  await expect(rows.first()).toHaveClass(/got/);

  await page.reload();
  await settled(page);
  await toTheDay(page);
  await expect(page.locator('.dayof-card .frow').first()).toHaveClass(/got/);
});

test('an unauthored type gets the floor AND is told it is the floor', async ({ page }) => {
  // 32 of 39 playbooks author no day-of list. Handing a board meeting a generic
  // safety floor is fine; presenting it as that event's own is not.
  await boot(page, 'Board Meeting');
  const card = page.locator('.dayof-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.borrowed-note')).toBeVisible();
  await expect(card.locator('.borrowed-note')).toContainText(/no day-of list written/i);
});
