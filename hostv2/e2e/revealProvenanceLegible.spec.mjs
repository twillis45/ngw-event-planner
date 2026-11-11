// ─── THE REVEAL'S CONFIDENCE LINES ARE READABLE (stage-4 P1, M1) ────────────
//
// "HIGH CONFIDENCE · READY" under each reveal stage rendered at 9px, opacity
// .42 — about 2.0:1 — on the first screen every new host sees. WCAG 1.4.3.
// Measured on the rendered page at rest (.rv-spinewrap.resolved), in BOTH
// themes: the reveal stage stays carbon in light, so a moded token would pass
// dark and fail light (that is why the color is --carbon-ink-soft).
//
// The token itself is gated in hostv2/test/revealProvenanceToken.test.mjs and
// demo/src/theme/__tests__/revealProvenanceContrast.test.js; this pins the CSS.
import { test, expect } from './fixtures.mjs';

const SEED = 'Backyard cookout for 30 people on July 4 2027 in Annapolis';
// Brightest ground any line can sit on: both stage glows composited at full
// strength over the base (#0d1014). The vignette only darkens.
const GLOW_PEAK = [30, 39, 49];

for (const theme of ['dark', 'light']) {
  test(`reveal confidence lines are ≥12px, fully opaque and ≥4.5:1 (${theme})`, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
    await page.goto(`./?elegant=1&theme=${theme}`);
    await page.getByRole('button', { name: 'Start my event' }).first().click();
    await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
    await page.getByRole('button', { name: /^Put my plan together$/ }).click();
    await expect(page.locator('.rv-spinewrap.resolved')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(900);   // the .7s opacity/color transitions settle

    const rows = await page.locator('.rv-sprov').evaluateAll((els, peak) => {
      const lum = ([r, g, b]) => {
        const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const stage = document.querySelector('.reveal-stage');
      const base = rgb(getComputedStyle(stage).backgroundColor).slice(0, 3);
      return els.map((el) => {
        let op = 1;
        for (let n = el; n && n !== stage; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
        const [r, g, b, a = 1] = rgb(getComputedStyle(el).color);
        // Effective ink = text color composited by its alpha and every ancestor opacity.
        const ink = (ground) => [r, g, b].map((v, i) => v * a * op + ground[i] * (1 - a * op));
        return {
          text: el.innerText,
          px: parseFloat(getComputedStyle(el).fontSize),
          op,
          onBase: ratio(ink(base), base),
          onPeak: ratio(ink(peak), peak),
        };
      });
    }, GLOW_PEAK);

    expect(rows.length, 'premise: the reveal shows confidence lines').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.px, r.text).toBeGreaterThanOrEqual(12);
      expect(r.op, r.text).toBe(1);
      expect(r.onBase, r.text).toBeGreaterThanOrEqual(4.5);
      expect(r.onPeak, r.text).toBeGreaterThanOrEqual(4.5);
    }
  });
}
