// ─── DRIFT CAPTURE (Phase 5G-C1) ─────────────────────────────────────────────
//
// Captures the REAL current NGW mobile surfaces and the reference competitor at
// both widths, so a drift judgement is made against artefacts rather than memory.
// Not an assertion suite — its output is the PNGs.
import { test } from '@playwright/test';

const OUT = 'review-shots/drift';

async function settle(page) {
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(500);
}

test('NGW — current mobile surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('./');
  await page.waitForTimeout(2500);
  // Fresh context lands on welcome; take the sample event in.
  const sample = page.getByRole('button', { name: /Explore a sample first/i });
  if (await sample.count()) { await sample.first().click(); await page.waitForTimeout(1200); }
  await settle(page);
  await page.screenshot({ path: `${OUT}/ngw-mobile-1-command.png` });

  // Scroll to the see-all lane (Where you stand / Guests / Budget).
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/ngw-mobile-2-wherestand.png` });

  // Into the food plan, where the ice recommendation lives.
  const food = page.getByRole('button', { name: /Open the food plan|Decide what you.re serving|Food — still open/i });
  if (await food.count()) {
    await food.first().click();
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/ngw-mobile-3-food.png` });
  }
});

test('NGW — current desktop surface (baseline for drift)', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 950 });
  await page.goto('./');
  await page.waitForTimeout(2500);
  const sample = page.getByRole('button', { name: /Explore a sample first/i });
  if (await sample.count()) { await sample.first().click(); await page.waitForTimeout(1200); }
  await settle(page);
  await page.screenshot({ path: `${OUT}/ngw-desktop-1-command.png` });
});

test('Blink — desktop and mobile reference', async ({ page }) => {
  for (const [name, w, h] of [['desktop', 1512, 950], ['mobile', 430, 932]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('https://blink.global', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/blink-${name}-1-hero.png` });
    for (let i = 2; i <= 4; i++) {
      await page.mouse.wheel(0, h * 1.4);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/blink-${name}-${i}.png` });
    }
  }
});
