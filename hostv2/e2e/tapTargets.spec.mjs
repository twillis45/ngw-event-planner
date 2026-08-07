// ─── THE 44px FLOOR IS A THUMB RULE (2026-08-06, board, mobile seat) ────────
// A live sweep on a real iPhone profile found 12+ interactive controls under
// UX_03's 44px minimum, including the hero Save that COMMITS the ask (56x30).
// The QA scorecard's own line: the tallest tap target should be the primary
// action, not the shortest.
//
// This measures the classes the floor covers, on a phone width, and reports
// every offender by label so a regression names itself.
import { test, expect } from '@playwright/test';

const EV = {
  id: 'E2E_TEST_taps', type: 'Birthday', name: 'Tap targets', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
};

test('covered controls clear 44px on a phone', async ({ page }) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('./');
  await page.waitForTimeout(2500);

  const small = await page.evaluate(() => {
    // EFFECTIVE TARGET = the box, or a ::after overlay that extends it.
    //
    // Three versions of this test were wrong before this one, which is the
    // point of writing it down:
    //   1. it named four CSS classes and asserted on those — none of them were
    //      ever under the floor, so it passed with the rule disabled;
    //   2. it measured raw box height — which forced .ev-eyebrow to GROW 12px,
    //      pushing the fold handle out of the 430px landscape viewport;
    //   3. it probed elementFromPoint — which returns the TOPMOST element, so
    //      any scrim above a control reported a false miss (.cta, already 46px,
    //      failed).
    // This reads the geometry directly: a control satisfies the rule if its own
    // box clears 44px OR it carries a ::after overlay that does. That is what
    // "a thumb can hit it" means, without depending on stacking order.
    const sel = 'button, a[href], [role=button], input';
    const afterH = (el) => {
      const cs = getComputedStyle(el, '::after');
      if (!cs || cs.content === 'none' || cs.position !== 'absolute') return 0;
      return parseFloat(cs.height) || 0;
    };
    return [...document.querySelectorAll(sel)]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.top >= -50; })
      .map((e) => ({ label: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 28),
                     cls: (e.className || '').toString().slice(0, 30),
                     h: Math.round(Math.max(e.getBoundingClientRect().height, afterH(e))) }))
      .filter((x) => x.h < 44);
  });
  expect({ under44: small }).toEqual({ under44: [] });
});
