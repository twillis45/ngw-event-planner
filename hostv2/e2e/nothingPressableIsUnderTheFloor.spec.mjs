// ─── THE 44px FLOOR, PROBED RATHER THAN COMPUTED ──────────────────────────
//
// UX_03 sets 44px and styles.css honoured it in a dozen places as a raw
// literal, so nothing could state the rule, sweep it, or catch a surface
// that never got it. One did: the lodging cockpit runs its own .lc-* CSS
// with, by its own header, "zero overlap with this app's styles.css", and
// every ruling from the 2026-09-26 Shop-sheet redesign stopped at that
// boundary. Measured 2026-09-27: five stage tabs at 42–43, two buttons at 34
// — the same 34 that 334896ad had already fixed on the Shop sheet, called
// there "ten pixels under, on three buttons a host reaches for on the way
// out of the door."
//
// IT PROBES elementFromPoint AND NEVER getBoundingClientRect. A 44px
// ::after computes as 44 and passes any geometry assertion while being
// clipped to nothing by a parent's overflow — which is exactly what happened
// when the first fix here gave the tabs the sanctioned expander and the hit
// stayed 42. `.lc-rail` sets overflow-x:auto, which computes overflow-y to
// auto as well. Only a real probe saw it.
import { test, expect, settled } from './fixtures.mjs';

// ── WHERE THE FLOOR APPLIES, AND IT IS NOT EVERYWHERE ─────────────────────
// UX_03 states 44px under "Mobile (< 640px)" — rule 2 — and repeats it for
// tablet: "touch targets still 44px minimum." It says nothing of the kind for
// desktop or wide, and the standard it comes from is a TOUCH standard.
//
// The first version of this file judged all seven viewports and failed on
// desktop and wide, where the shell renders .chip at 32 and .frow / .mini /
// .pill at 41. Those are real numbers and they are NOT violations of this
// rule: a pointer is not a thumb, and WCAG's pointer-target minimum is 24.
// Asserting 44 there would have invented a standard and then enforced it,
// which is worse than not checking — it makes a gate that fails for reasons
// doctrine does not support, and gates like that get disabled.
//
// Recorded rather than hidden: desktop and wide DO carry sub-44 controls. If
// the bar should rise there, that is a ruling to take, not a test to widen.
const TOUCH_ONLY = /mobile|landscape|tablet/;

const EVENT = {
  id: 'e2e-tap', name: 'DC 70th', type: 'Birthday', date: '2027-06-18',
  endDate: '2027-06-21', isDestination: true, venueCity: 'Washington', state: 'DC',
  guestMode: 'count', guestCount: 10, totalBudget: 6000, budget: [], vendors: [], guests: [],
};

const seed = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
};

// Every pressable thing on screen, measured by walking outward from its
// centre until elementFromPoint stops answering with it.
const underFloor = (page) => page.evaluate(() => {
  const hit = (el) => {
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const owns = (x, y) => {
      const t = document.elementFromPoint(x, y);
      return !!t && (t === el || el.contains(t) || t.contains(el));
    };
    if (!owns(cx, cy)) return -1;          // covered or off-screen: not judged here
    let u = 0, d = 0;
    while (u < 40 && owns(cx, cy - u - 1)) u++;
    while (d < 40 && owns(cx, cy + d + 1)) d++;
    return u + d + 1;
  };
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], [role=button], summary')) {
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 4) continue;
    const h = hit(el);
    if (h >= 0 && h < 44) {
      out.push({
        cls: String(el.className).slice(0, 30) || el.tagName,
        label: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 24),
        hit: h,
      });
    }
  }
  return out;
});

test('PREMISE: there are pressable controls to judge', async ({ page }) => {
  // Without this the two assertions below pass over an empty page, which is
  // the shape of false green this repo keeps finding.
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  const n = await page.evaluate(() => document.querySelectorAll('button, a[href], [role=button]').length);
  expect(n).toBeGreaterThan(10);
});

test('the host shell has nothing under the floor', async ({ page }, testInfo) => {
  test.skip(!TOUCH_ONLY.test(testInfo.project.name), 'UX_03 scopes the 44px floor to touch viewports');
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await page.waitForTimeout(1200);
  expect(await underFloor(page)).toEqual([]);
});

test('AND NEITHER DOES THE COCKPIT, which runs its own CSS', async ({ page }, testInfo) => {
  test.skip(!TOUCH_ONLY.test(testInfo.project.name), 'UX_03 scopes the 44px floor to touch viewports');
  // The surface the floor had never reached. Folds are opened so the
  // controls inside them are judged too — a closed <details> hides its
  // buttons from elementFromPoint entirely, and an unmeasured control is
  // not a passing one.
  await seed(page);
  await page.goto('?demo=lodging');
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(600);
  expect(await underFloor(page)).toEqual([]);
});
