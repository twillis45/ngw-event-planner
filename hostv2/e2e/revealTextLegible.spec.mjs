// ─── EVERY LINE OF THE REVEAL IS READABLE IN BOTH THEMES (2026-11-11) ───────
//
// The creation reveal paints a fixed carbon stage (#0d1014) in light and dark,
// but its event name, eyebrow and buttons read moded tokens (--ink,
// --steel-soft, --carbon-text) that go dark in light. Measured in light on the
// built bundle at 390x844: the event name 1.01:1, the eyebrow 1.94:1, "Open
// your plan" 3.26:1, the two quiet buttons 2.75:1. The eyebrow was 4.09:1 in
// dark too (opacity .7). They now read the fixed --carbon-ink and
// --carbon-steel-soft (theme.js), beside --carbon-ink-soft.
//
// revealProvenanceLegible.spec.mjs pins the confidence lines; this one walks
// EVERY visible text element on the stage at rest, so a role added later on a
// moded token fails here without anyone having to remember to list it.
import { test, expect } from './fixtures.mjs';

const SEED = 'Backyard cookout for 30 people on July 4 2027 in Annapolis';

for (const theme of ['dark', 'light']) {
  test(`every reveal text element meets the contrast floor (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
    await page.goto(`./?elegant=1&theme=${theme}`);
    await page.getByRole('button', { name: 'Start my event' }).first().click();
    await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
    await page.getByRole('button', { name: /^Put my plan together$/ }).click();
    await expect(page.locator('.rv-spinewrap.resolved')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);   // .7s transitions and the CTA glow settle

    const rows = await page.locator('.reveal-stage').evaluate((stage) => {
      const lum = ([r, g, b]) => {
        const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const out = [];
      for (const el of stage.querySelectorAll('*')) {
        const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
          .map((n) => n.textContent.trim()).join(' ');
        if (!text) continue;
        const box = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!box.width || !box.height || cs.visibility === 'hidden') continue;
        let op = 1;
        for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
        if (op < 0.02) continue;   // fully faded out = not shown
        // Ground = the first opaque background walking up (the stage, or a filled button).
        let ground;
        for (let n = el; n && !ground; n = n.parentElement) {
          const b = rgb(getComputedStyle(n).backgroundColor);
          if (b.length >= 3 && (b[3] === undefined || b[3] === 1)) ground = b.slice(0, 3);
        }
        const [r, g, b, a = 1] = rgb(cs.color);
        const ink = [r, g, b].map((v, i) => v * a * op + ground[i] * (1 - a * op));
        const px = parseFloat(cs.fontSize);
        const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
        out.push({ what: `${String(el.className).split(' ')[0] || el.tagName} "${text.slice(0, 30)}"`,
          ratio: ratio(ink, ground), floor: large ? 3 : 4.5 });
      }
      return out;
    });

    // Premise: the walk found the roles this spec exists for.
    const names = rows.map((r) => r.what).join('\n');
    for (const role of ['rv-seyebrow', 'rv-sname', 'rv-slabel', 'rv-sprov', 'cta "Open your plan"', 'cta "Change an answer"']) {
      expect(names, `premise: ${role} is on the reveal`).toContain(role);
    }
    for (const r of rows) expect(r.ratio, `${r.what} (${theme})`).toBeGreaterThanOrEqual(r.floor);
  });
}
