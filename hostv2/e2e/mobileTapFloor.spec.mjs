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
    // A COMPUTED PSEUDO-ELEMENT IS NOT A TAP TARGET (2026-08-15).
    //
    // The block above used to be the whole story, and it credited geometry that
    // getComputedStyle reports but a finger can never reach. `.spread-link` got
    // a 44px `::after` that computed as position:absolute / height:44px and was
    // clipped to nothing by an `overflow:clip` ancestor whose box ended at the
    // button's exact bottom edge. This sweep would have called it 44px and moved
    // on — certifying a control that was dead to touch.
    //
    // So expansion now has to survive a hit test: probe just inside each grown
    // edge and keep the growth only where the probe actually resolves to this
    // element. Where it does not, fall back to the element's own box, which is
    // the honest number. This is the same reason `spreadLinkTapFloor.spec.mjs`
    // clicks a real coordinate instead of asserting a computed one.
    // `hit.contains(el)` must NOT count here, however natural it looks. The
    // clipped expander's own ancestor is what elementFromPoint returns at the
    // dead coordinate, so accepting ancestors makes every clipped pseudo-element
    // "reachable" and turns this probe back into the geometry check it replaces.
    // Only the element itself or something inside it means a tap lands on it.
    const reaches = (x, y) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit));
    };
    const cx = Math.min(Math.max((left + right) / 2, 1), window.innerWidth - 1);
    const cy = Math.min(Math.max((top + bot) / 2, 1), window.innerHeight - 1);
    if (top < box.top && !reaches(cx, top + 2)) top = box.top;
    if (bot > box.bottom && !reaches(cx, bot - 2)) bot = box.bottom;
    if (left < box.left && !reaches(left + 2, cy)) left = box.left;
    if (right > box.right && !reaches(right - 2, cy)) right = box.right;
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

test('the home surface with the food decision UNSETTLED clears it too', async ({ page }) => {
  // THE STATE BLIND SPOT (2026-08-15). `EV` above has food settled, and a whole
  // family of controls — `.spread-link` among them — renders only while it is
  // not. That is how a 187x17 control lived on the home surface while this file
  // was green: the sweep was honest, and the offender was never on screen.
  //
  // A sweep is only as complete as the STATES its fixture reaches. This boots
  // the same surface in the other state rather than trusting one fixture to
  // stand for the surface.
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    // `EV` above cannot be reused as-is: it has no `venue` and is a destination
    // event, so the venue blocker owns the hero and the food decision never
    // surfaces at all. Reusing it made this test pass against a KNOWN-BROKEN
    // control — it was measuring a surface the control was not on, which is the
    // exact failure this test exists to end. Hence the venue, and hence the
    // premise assertion below.
  }, { ...EV, id: 'E2E_unsettled', name: 'Unsettled', venue: 'The Lodge',
       isDestination: false, endDate: undefined });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // The splash sits over the page after load and makes every hit test report the
  // overlay — which silently turns the sweep's new reachability probe into a
  // machine that finds nothing. Wait it out before measuring anything.
  await page.waitForFunction(() => !document.querySelector('.splash'), null, { timeout: 15_000 });
  // Premise, same as above: empty must mean measured-and-clean. Plus the one
  // this test was added for — the unsettled-only control must actually BE here,
  // or the sweep below is measuring the wrong screen and reporting a clean bill.
  expect(await page.locator('button').count()).toBeGreaterThan(5);
  await expect(page.locator('button.spread-link')).toHaveCount(1);
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
