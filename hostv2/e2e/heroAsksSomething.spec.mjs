// ─── THE HERO MUST ASK SOMETHING, NOT "YOUR NEXT STEP." ─────────────────────
//
// heroAsk.js documented this hole at length and could not close it:
//
//   "A 26-CHARACTER CUTOFF DECIDES WHETHER THE HOST SEES THE ASK ... the
//    retirement party's open decision is authored as a question — 'At home, a
//    restaurant, or the workplace?' (40 chars) — and the host got the
//    placeholder 'Your next step.' Game Night's 'What kind of games?' (20
//    chars) IS promoted. Same kind of item, opposite treatment, decided by
//    string length alone."
//
// Two earlier fix attempts were reverted because the authored question could not
// survive the projections between producer and hero. Measured before this fix:
// 16% of hero states across 10 event types showed the placeholder, and a WEDDING
// showed it for SIX consecutive stages (T-180 through T-7) — months of the one
// sentence on the screen saying nothing.
//
// The engine gate proves the rate is 0. This file proves a HOST sees it, on the
// three states that were broken, because "the engine returns the right string"
// has never been the same claim as "the screen shows it".
import { test, expect } from './fixtures.mjs';

const EV = 'test-day-before-vendors';
const isoIn = (d) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

const CASES = [
  ['a wedding four months out', { type: 'Wedding', date: isoIn(120) }, /what kind of ceremony/i],
  ['a retirement party a month out', { type: 'Retirement Party', date: isoIn(30) }, /at home, a restaurant, or the workplace/i],
  ['a birthday two weeks out', { type: 'Birthday Party', date: isoIn(14) }, /is there a theme/i],
];

const boot = async (page, patch) => {
  await page.addInitScript(([id, p]) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-hostv2-patch-' + id, JSON.stringify(p));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [EV, patch]);
  await page.goto('?elegant=1');
  await page.waitForTimeout(3500);
};

const heroText = (page) => page.evaluate(() => {
  const h = document.querySelector('.hero-card, .hero');
  return (h && h.innerText) || '';
});

for (const [name, patch, expected] of CASES) {
  test(`${name} is asked a real question`, async ({ page }) => {
    await boot(page, patch);
    const hero = await heroText(page);
    // PREMISE — the hero rendered at all. Without this the placeholder check
    // below passes on an empty node.
    expect(hero.length).toBeGreaterThan(20);
    expect(hero).toMatch(expected);
    expect(hero).not.toMatch(/your next step/i);
  });
}

test('the placeholder is absent from the whole screen', async ({ page }) => {
  await boot(page, { type: 'Wedding', date: isoIn(120) });
  const body = await page.evaluate(() => document.body.innerText || '');
  expect(body).not.toMatch(/your next step/i);
});
