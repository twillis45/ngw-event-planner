// ─── EVERY CONTROL, NOT A LIST OF CLASSES ───────────────────────────────────
//
// `tapTargets.spec.mjs` already checks the 44px floor, but it enumerates a
// NAMED LIST of classes. A sweep on 2026-08-07 found two offenders it could not
// see, because neither was on the list:
//
//   ‹ Sections   67 x 16 px — on EVERY sheet, and it is how a host leaves one
//   .navseg-b    85 x 37 px — on the sheet that IS the mobile navigation
//
// This spec sweeps everything instead. Two measurement rules make it honest,
// both learned by getting them wrong first:
//
//  1. `cursor: pointer` INHERITS, so every span inside a button looks tappable.
//     Only the OUTERMOST control counts.
//  2. Several controls here meet the floor via an absolutely-positioned
//     ::after hit-area expander rather than their own box — that is the
//     deliberate fix where padding would move the layout (adding min-height to
//     .ev-eyebrow pushed the fold peek off-screen on 2026-08-06). The effective
//     hit box is the element UNIONED with its pseudo-elements, so `.sheet-back`
//     legitimately measures 16px tall and 44px tappable.
import { test, expect } from '@playwright/test';

const EV = {
  id: 'E2E_TEST_tapfloor', type: 'Birthday', name: 'Tap floor', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 12, guestCount: 12, totalBudget: 4000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const FLOOR = 44;

// ── KNOWN-OPEN, NAMED RATHER THAN SILENTLY SKIPPED ──────────────────────────
// `.pill` status chips are real routing buttons and measure 267x28. They are
// NOT fixed here, and the reason is measured, not assumed: in a stacked list
// the gap between consecutive pills is 7px, so giving each a 44px ::after hit
// area — the technique used for .sheet-back — would overlap its neighbour by
// 8px and let one row steal the next row's taps. Closing it properly means
// raising the pill's real height and the list's rhythm together (28+7 -> e.g.
// 36+8), which changes a core Studio Matte atom used across many surfaces.
// That is a design ruling, not a test fix.
//
// Listed here so it is a DECISION with a reason rather than an omission. Any
// OTHER control under the floor still fails.
const KNOWN_OPEN = [/(^|\s)pill(\s|$)/];
const surprising = (offenders) => offenders.filter(o => !KNOWN_OPEN.some(re => re.test(o.cls)));

const sweep = (page) => page.evaluate((FLOOR) => {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('button, a, [role=button]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;         // retired/hidden controls
    if (el.parentElement && el.parentElement.closest('button,a,[role=button]')) continue;
    let top = box.top, bot = box.bottom, left = box.left, right = box.right;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps || ps.content === 'none' || ps.position !== 'absolute') continue;
      const ph = parseFloat(ps.height), pw = parseFloat(ps.width);
      if (Number.isFinite(ph)) { const cy = box.top + box.height / 2; top = Math.min(top, cy - ph / 2); bot = Math.max(bot, cy + ph / 2); }
      if (Number.isFinite(pw)) { const cx = box.left + box.width / 2; left = Math.min(left, cx - pw / 2); right = Math.max(right, cx + pw / 2); }
    }
    const h = Math.round(bot - top), w = Math.round(right - left);
    if (h >= FLOOR && w >= FLOOR) continue;
    const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28);
    const key = `${el.className}|${label}|${h}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ cls: String(el.className).slice(0, 34) || el.tagName, label, w, h });
  }
  return out;
}, FLOOR);

async function boot(page) {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test('the known-open pill is still really under the floor (premise)', async ({ page }) => {
  // If the pill is ever fixed, this fails and the KNOWN_OPEN entry above must
  // be deleted — so the exception cannot quietly outlive the defect.
  await boot(page);
  const pills = await page.evaluate(() => [...document.querySelectorAll('button.pill')]
    .map(p => Math.round(p.getBoundingClientRect().height)).filter(h => h > 0));
  if (!pills.length) test.skip(true, 'no pill buttons on this surface');
  expect(Math.min(...pills)).toBeLessThan(FLOOR);
});

test('the home surface clears the 44px floor', async ({ page }) => {
  await boot(page);
  // Premise: an empty result must mean "measured and clean", never "measured
  // nothing". A trivial DOM is how the first version of this sweep reported a
  // spotless mobile experience while looking at the welcome screen.
  expect(await page.locator('button').count()).toBeGreaterThan(5);
  expect(surprising(await sweep(page))).toEqual([]);
});

test('the section directory clears it too — including the phase segments', async ({ page }) => {
  await boot(page);
  // The dock is `dock-retired` (0x0 buttons); mobile navigates by the eyebrow.
  await page.locator('.ev-eyebrow').first().click();
  await page.waitForTimeout(1500);
  await expect(page.locator('.navseg-b').first()).toBeVisible();
  expect(surprising(await sweep(page))).toEqual([]);
});

test('the back control on a sheet is tappable, without moving the layout', async ({ page }) => {
  await boot(page);
  await page.locator('.ev-eyebrow').first().click();
  await page.waitForTimeout(1500);
  // Walk rows until one opens a sheet that renders the back control. Some rows
  // (Search) close the directory instead of opening a sheet.
  let opened = false;
  for (const i of [5, 3, 4, 1, 0]) {
    const row = page.locator('.navrow').nth(i);
    if (!(await row.count())) continue;
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (await page.locator('.sheet-back').count()) { opened = true; break; }
    await page.locator('.ev-eyebrow').first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  expect(opened, 'no sheet rendered the back control').toBe(true);

  const m = await page.evaluate(() => {
    const el = document.querySelector('.sheet-back');
    const b = el.getBoundingClientRect();
    const ps = getComputedStyle(el, '::after');
    const ph = parseFloat(ps.height);
    return { box: Math.round(b.height), pseudo: Number.isFinite(ph) ? Math.round(ph) : null };
  });
  // The box stays small ON PURPOSE — padding here would push the sheet title
  // down. The hit area comes from the expander.
  expect(m.pseudo).toBeGreaterThanOrEqual(FLOOR);
  expect(surprising(await sweep(page))).toEqual([]);
});
