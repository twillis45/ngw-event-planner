// Render-first capture for the risk-lane board sitting (ROSTER step 1).
// Not a gate — env-guarded exactly like _boardCapture.spec.mjs, output is the
// gitignored review-artifacts/.
//
//   BOARD_CAPTURE=1 npx playwright test e2e/_riskLaneCapture.spec.mjs --project=desktop
//
// The question this feeds: three of five risks on the birthday playbook render
// ONLY "Handled — stop showing this" and no "Plan for this", because
// riskRouteFor (HostShellV2.jsx:1463) is a keyword regex over the risk's own
// prose and returns null on no match. The board is being asked whether
// dismissal-only is ever an acceptable act, and whether a risk should carry an
// authored route instead of one re-derived from its wording at render time.
//
// Both surfaces are captured because the finding spans them: the RAIL lane on
// the command surface, and the RISKS SHEET where the CTA row actually lives.
import { test } from './fixtures.mjs';
import fs from 'fs';

const OUT = new URL('../../review-artifacts/2026-08-08_risk_routing/', import.meta.url).pathname;
const VIEWPORTS = [
  ['mobile-390', 390, 844],
  ['tablet-768', 768, 1024],
  ['tabletland-1024', 1024, 768],
  ['desktop-1440', 1440, 900],
  ['widescreen-1728', 1728, 1080],
];

// The Santa Fe example, seeded the way LodgingCockpit's own button seeds it.
// A far-out date is the POINT: it is what exposed the contingency-as-fact read,
// and it keeps every risk unfired so the CTA row is judged on affordance alone.
const SANTA_FE = {
  id: 'cust-demo-santafe', demoSeed: true, name: 'Mom’s 80th Birthday', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10, totalBudget: 4800,
  lodgingMustHaves: ['stepfree', 'laundry', 'parking'],
  lodgingOptions: [], budget: [], vendors: [], guests: [],
};

const boot = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, SANTA_FE);
  await page.goto('?elegant=1');
  await page.waitForTimeout(1600);
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
};

test('capture the risk lane and the risks sheet', async ({ page }) => {
  test.skip(!process.env.BOARD_CAPTURE, 'render-first capture — set BOARD_CAPTURE=1 to run');
  test.setTimeout(240000);
  fs.mkdirSync(OUT, { recursive: true });

  for (const [name, w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);

    // 1. the command surface — the lane in context, beside "Then, in order"
    await page.screenshot({ path: `${OUT}risk-${name}-1-command.png`, fullPage: true });

    // 2. the risks sheet — where the CTA row lives and the finding is visible
    const door = page.getByText('What could go wrong', { exact: false }).first();
    if (await door.count()) {
      await door.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}risk-${name}-2-sheet.png`, fullPage: true });
    }
  }
  console.log('CAPTURED to ' + OUT);
  console.log(fs.readdirSync(OUT).join('\n'));
});
