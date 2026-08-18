// ─── THE HOST CAN ACTUALLY SAY IT, ON A REAL SCREEN ─────────────────────────
//
// `computeHostAdaptation` has taken `experience` and `capacity` since July and
// genuinely uses them — a first-time solo host gets a smaller starting focus set,
// derivable defaults pre-proposed, reassurance on. It read them off the EVENT and
// nothing in hostv2 ever wrote them: measured 2026-08-17, `hostExperience` and
// `hostCapacity` appeared in ZERO files under hostv2/src. So `handHolding` was
// permanently 'standard' for every real host, while the decision-engine scoreboard
// carried Adaptivity at 9/10 for a month on an axis no host could reach.
//
// The engine wire is gated at unit level (hostSignalsReachTheBoard.test.js). THIS
// file is the half that failed there before: the record's own lesson, logged as
// happening a FOURTH time, is that "an engine re-score is NOT evidence the SURFACE
// does it — verify per-shell in the browser, or the scoreboard credits a promise
// the host never receives."
//
// The controls were first written against a GUESSED askKit API ({id, selected,
// onSelect}); the real one is {options, value, onPick} with option.value. Because
// OptionList falls back to `o.label` when `value` is absent, the rows RENDERED
// PERFECTLY and every click threw on an undefined onPick. It looked built. Only
// reading localStorage after a click showed `{}`. That is precisely the failure
// this spec exists to make impossible to ship again.
//
// Reached the way a phone reaches it — eyebrow, then the "You &" directory row —
// copied from mobileTapFloor.spec.mjs, which already drives this panel every run.
import { test, expect } from './fixtures.mjs';

const EV = 'test-day-before-vendors';

const boot = async (page) => {
  await page.addInitScript((id) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.removeItem('ngw-profile');
  }, EV);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !document.querySelector('.splash'), null, { timeout: 15_000 });
};

const openAccountPanel = async (page) => {
  await page.locator('.ev-eyebrow').first().click();
  await page.waitForTimeout(1200);
  await page.locator('.navrow', { hasText: /^You &/ }).first().click();
  await expect(page.locator('#sheet-title')).toBeVisible();
};

const profile = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('ngw-profile') || '{}'); } catch { return {}; }
});

test('PREMISE — the panel opens and the two questions are on it', async ({ page }) => {
  // Without this, a passing click assertion could be measuring a screen that
  // never rendered the controls.
  await boot(page);
  await openAccountPanel(page);
  await expect(page.getByText('How you plan')).toBeVisible();
  await expect(page.getByText(/first time hosting something like this/i)).toBeVisible();
  await expect(page.getByText(/planning this on my own/i)).toBeVisible();
  expect(await profile(page)).toEqual({});          // nothing declared yet
});

test('SAYING IT WRITES IT — first-time + solo reach the profile', async ({ page }) => {
  // The assertion that would have caught the undefined-onPick bug on the day it
  // was written: the rows rendered, and nothing was stored.
  await boot(page);
  await openAccountPanel(page);

  await page.getByText(/first time hosting something like this/i).click();
  await page.waitForTimeout(400);
  expect((await profile(page)).hostExperience).toBe('first_time');

  await page.getByText(/planning this on my own/i).click();
  await page.waitForTimeout(400);
  const p = await profile(page);
  expect(p.hostExperience).toBe('first_time');
  expect(p.hostCapacity).toBe('solo');
});

test('and picking the same answer again CLEARS it', async ({ page }) => {
  // Both are optional. A host who taps by accident must be able to take it back,
  // or the app has made a permanent claim about them from one stray tap.
  await boot(page);
  await openAccountPanel(page);

  const firstTime = page.getByText(/first time hosting something like this/i);
  await firstTime.click();
  await page.waitForTimeout(400);
  expect((await profile(page)).hostExperience).toBe('first_time');

  await firstTime.click();
  await page.waitForTimeout(400);
  expect((await profile(page)).hostExperience ?? null).toBeNull();
});

test('the other answer replaces, never accumulates', async ({ page }) => {
  await boot(page);
  await openAccountPanel(page);
  await page.getByText(/first time hosting something like this/i).click();
  await page.waitForTimeout(300);
  await page.getByText(/I have done this before/i).click();
  await page.waitForTimeout(400);
  expect((await profile(page)).hostExperience).toBe('experienced');
});
