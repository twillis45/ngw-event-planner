// ─── NO HERO DEAD-ENDS, ON ANY SAMPLE EVENT (Wanda audit P0-1, 11/22/2026) ───
//
// The board's one loud ask always carries a way to answer it. On Wanda's board
// the ceremony-timing ask rendered with the "in the full app" chip, no options
// and no button — a dead end the NEXT bar pointed at — two taps in.
//
// A census, not a single case: every sample event the host can open is booted,
// and its hero is walked forward the way a host would, taking the hero's own
// pick (or noting dietary needs) up to a fixed number of steps. At each step
// the hero card must not wear "in the full app" and must hold at least one
// visible button. A calm board (no hero card) is fine; it asks nothing.
// Failures are collected and reported together, one line per event and step.
import { test, expect, settled } from './fixtures.mjs';

const SAMPLES = [
  'ev-x-retirement-party', 'ev-x-wanda', 'ev-x-birthday', 'ev-x-graduation', 'ev-dmv-wedding', 'ev-x-repast',
  'my-crab-feast', 'test-day-of', 'test-two-days', 'test-multi-day', 'test-day-before-vendors',
  'test-roster-rsvp', 'test-roster-final-count',
];
const STEPS = 6;

const boot = async (page, id) => {
  await page.addInitScript((eid) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', eid);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, id);
  await page.goto('?elegant=1');
  await settled(page);
  await page.waitForTimeout(400);
};

for (const id of SAMPLES) {
  test(`${id}: every hero on the way carries an action, never "in the full app"`, async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, id);
    const misses = [];
    for (let step = 0; step < STEPS; step++) {
      const card = page.locator('.hero article.hero-card').first();
      if (!(await card.count())) break;                     // calm: nothing is asked
      const ask = ((await page.locator('.hero').first().innerText()) || '').replace(/\s+/g, ' ').slice(0, 140);
      if (await card.locator('.tag.plan', { hasText: 'in the full app' }).count()) misses.push(`step ${step}: "in the full app" — ${ask}`);
      if (!(await card.locator('button:visible').count())) misses.push(`step ${step}: no action — ${ask}`);
      // Walk on the way a host would: the hero's own pick, else note dietary needs.
      const pick = card.locator('.decopt.pick, .decopt').first();
      const noted = page.locator('.hero button').filter({ hasText: 'That’s everyone — noted' }).first();
      const next = (await pick.count()) ? pick : ((await noted.count()) ? noted : null);
      if (!next) break;
      await next.scrollIntoViewIfNeeded();
      await next.click();
      await page.waitForTimeout(900);
    }
    expect(misses, misses.join('\n')).toEqual([]);
  });
}
