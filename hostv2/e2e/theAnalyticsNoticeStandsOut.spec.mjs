// ─── THE ONE-TIME NOTICE STANDS OUT (owner, 11/16/2026) ──────────────────────
//
// "These toasts need better attention formatting. It blends right in." Owner
// pick: all three treatments where each fits. Every toast wears the lit steel
// edge; a toast given a title shows it as an eyebrow; a one-time notice dims
// the page behind it. The analytics notice is the one-time notice.
//
// Analytics is off on localhost, which is why this notice was never under test.
// The browser resolves a made-up host to the local preview, so the bundle sees
// a real hostname and the notice runs exactly as it does in production.
// PostHog is blocked: nothing leaves the machine.
import { test, expect, settled } from './fixtures.mjs';

test.use({ launchOptions: {
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
  args: ['--host-resolver-rules=MAP ngw.test 127.0.0.1'],
} });

const arrive = async (page, baseURL, w, h) => {
  await page.setViewportSize({ width: w, height: h });
  await page.route(/posthog\.com/, (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto(baseURL.replace('127.0.0.1', 'ngw.test') + '?elegant=1');
  await settled(page);
};

for (const [w, h] of [[390, 844], [1440, 900]]) {
  test(`at ${w}px the privacy notice is titled, lit, and the page dims behind it`, async ({ page, baseURL, isMobile }) => {
    test.skip(isMobile && w > 500, 'desktop width on a desktop project only');
    await arrive(page, baseURL, w, h);
    const toast = page.locator('.toast', { hasText: 'We count which parts of the app' });
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast.locator('[data-toast-title]')).toHaveText('A note about privacy');
    await expect(page.locator('[data-toast-dim]')).toHaveCount(1);
    // Lit: a steel glow, not a flat card.
    expect(await toast.evaluate((t) => getComputedStyle(t).boxShadow)).toMatch(/28px/);
    // The dim never takes a tap: the plan stays usable while the note is up.
    expect(await page.locator('[data-toast-dim]').evaluate((d) => getComputedStyle(d).pointerEvents)).toBe('none');
    // The dim covers the whole frame inside its border (the rail too, on desktop).
    const inner = await page.locator('.stagewrap').evaluate((f) => f.clientWidth);
    const dim = await page.locator('[data-toast-dim]').boundingBox();
    expect(Math.round(dim.width)).toBe(inner);
    // ...and sits over the rail, not under it (the rail keeps z-index 60).
    // (elementsFromPoint skips a pointer-events:none layer, so compare stacking.)
    const railDimmed = await page.evaluate(() => {
      const rail = document.querySelector('.srail'); if (!rail || !rail.offsetParent) return true;
      const z = (e) => Number(getComputedStyle(e).zIndex) || 0;
      return z(document.querySelector('[data-toast-dim]')) > z(rail);
    });
    expect(railDimmed, 'the rail stayed bright above the dim').toBe(true);
    await page.screenshot({ path: test.info().outputPath(`notice-${w}.png`) });
    // Turning it off answers with a plain toast: no title, no dim.
    await toast.getByRole('button', { name: 'Turn this off' }).click();
    const after = page.locator('.toast', { hasText: 'Analytics off' });
    await expect(after).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: test.info().outputPath(`plain-${w}.png`) });
    await expect(after.locator('[data-toast-title]')).toHaveCount(0);
    await expect(page.locator('[data-toast-dim]')).toHaveCount(0);
  });
}
