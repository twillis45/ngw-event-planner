// Render-first capture for a board sitting (REVIEW_BOARD_ROSTER step 1).
// Not a gate — run on demand, output is gitignored review-artifacts/.
import { test } from './fixtures.mjs';
import fs from 'fs';

const OUT = new URL('../../review-artifacts/', import.meta.url).pathname;
const VIEWPORTS = [
  ['mobile-390', 390, 844],
  ['tablet-768', 768, 1024],
  ['tabletland-1024', 1024, 768],
  ['desktop-1440', 1440, 900],
  ['widescreen-1728', 1728, 1080],
];

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForTimeout(1600);
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
};

test('capture the surfaces this sitting judges', async ({ page }) => {
  // ── A CAPTURE IS NOT AN ASSERTION, SO IT MUST NOT RIDE THE GATE ───────────
  // This lives in e2e/ only because it needs ./fixtures.mjs, which means the
  // matrix would otherwise run it once PER PROJECT — six screenshot passes,
  // minutes of I/O, on a run that already takes ~16 and where nothing here can
  // meaningfully fail. `testIgnore` was tried first and rejected: it also
  // blocks running the file by explicit path, which makes the tool unusable.
  // An env guard keeps it one cheap skip per project and one command to run:
  //   BOARD_CAPTURE=1 npx playwright test e2e/_boardCapture.spec.mjs --project=desktop
  test.skip(!process.env.BOARD_CAPTURE, 'render-first capture — set BOARD_CAPTURE=1 to run');
  test.setTimeout(240000);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);

    // 1. the command surface — carries the primary CTA family
    await page.screenshot({ path: `${OUT}board-${name}-1-command.png` });

    // 2. the guest roster — the reply picker, collapsed
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first()
      .click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const guests = page.locator('.sheet').last().getByText('Guests', { exact: false }).first();
    if (await guests.count()) {
      await guests.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}board-${name}-2-guests-collapsed.png` });

      // 3. one guest open — the picker in its new home
      const trig = page.locator('.grow > button[aria-expanded]');
      if (await trig.count()) {
        await trig.last().click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}board-${name}-3-guest-open-picker.png` });
      }
    }
  }
  console.log('CAPTURED to ' + OUT);
  console.log(fs.readdirSync(OUT).filter((f) => f.startsWith('board-')).join('\n'));
});
