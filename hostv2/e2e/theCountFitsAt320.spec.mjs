// ─── THE COUNT FITS AT 320 ───────────────────────────────────────────────────
//
// Run 2 (11/6/2026, R2-12): on a 320×640 phone the home progress line truncated
// to "3 of 7 plan par…" (the count itself lost) and the fold handle sat against
// "dated work needs you now". Measured, not looked at.
import { test, expect } from './fixtures.mjs';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('at 320×640 the progress labels are whole and the handle keeps a gap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript((d) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'E2E_320', type: 'Game Night', name: 'Game night', date: d, createdAt: new Date().toISOString(),
      guestMode: 'count', guestEstimate: 10, venueAddress: '12 Sample Rd', venueCity: 'Pasadena', venueState: 'MD',
      budget: [], vendors: [], guests: [], timeline: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'E2E_320');
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, day(1));
  await page.goto('./?elegant=1');
  // The progress moved on top as one line (owner ruling 3, 11/23/2026); the
  // same two claims, on it: the line is whole, and the handle keeps clear of
  // the text above it. And the pill fits 320 (ruling 4).
  await page.locator('[data-pp-line]').first().waitFor({ state: 'visible', timeout: 20000 });
  // Measure at rest: the hero's entrance moves its text for a moment (under
  // load the first run read a handle 14px "into" text that was still sliding).
  await page.waitForFunction(() => document.getAnimations()
    .filter((a) => { const t = a.effect && a.effect.getTiming(); return t && t.iterations !== Infinity && t.duration !== 'auto'; })
    .every((a) => a.playState !== 'running'));
  const m = await page.evaluate(() => {
    const line = document.querySelector('[data-pp-line]');
    const grab = document.querySelector('.efold-grab');
    const esc = document.querySelector('.escreen.on');
    const above = [...esc.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() && !e.closest('.efold') && e.getBoundingClientRect().height > 0);
    const lowest = Math.max(...above.map((s) => s.getBoundingClientRect().bottom));
    const lr = line.getBoundingClientRect();
    return {
      clipped: line.scrollWidth > line.clientWidth + 1 || lr.right > innerWidth,
      lines: (() => { const r = document.createRange(); r.selectNodeContents(line); return new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.bottom))).size; })(),
      text: line.innerText,
      gap: grab ? grab.getBoundingClientRect().top - lowest : null,
      pill: [...document.querySelectorAll('[data-tt-bar] button')].map((b) => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right }; }),
      sw: document.documentElement.scrollWidth, iw: innerWidth,
    };
  });
  expect(m.clipped, `the progress line is whole: "${m.text}"`).toBe(false);
  expect(m.lines, 'one line').toBe(1);
  expect(m.gap, 'the handle sits clear of the text').toBeGreaterThanOrEqual(8);
  expect(m.sw).toBeLessThanOrEqual(m.iw);
  for (const b of m.pill) { expect(b.w).toBeGreaterThanOrEqual(44); expect(b.h).toBeGreaterThanOrEqual(44); expect(b.right).toBeLessThanOrEqual(m.iw); }
});
