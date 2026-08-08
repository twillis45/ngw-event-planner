// ─── THE TWO-COLUMN SPLIT MUST ALSO FIT (2026-08-06, board P0) ─────────────
//
// At 1024x768 landscape the ask/answer split fired into a ~680px content column
// while asking for a FIXED 440px answer column plus an 88px gap — leaving ~152px
// for a 64px headline. That breaks one word per line and reads as the ask
// overprinting the card beside it. Measured pre-fix: `.ask` = 152x261 at 64px,
// at every width in the range.
//
// The orientation guard above the media query was right and not sufficient: it
// added a SHAPE test (landscape) where a SIZE test was also needed. 1024x768 is
// item 5 in UX_03's own testing protocol; the portrait fix was verified and
// landscape was never re-driven after it.
//
// THE ASSERTION IS DELIBERATELY NOT BOX INTERSECTION. The two boxes sit side by
// side and never geometrically overlap, so an overlap test passes while the
// screen is visibly broken — the first version of this spec did exactly that and
// passed against the unfixed CSS. What fails is the TYPE: a 56px+ headline needs
// a column it can actually set in.
//
// Mutation-verified: restoring the old gate (min-width:1024) with the rigid
// `flex:0 0 440px` fails all four widths with "64px headline in a 152px column".
import { test, expect } from '@playwright/test';

// No guest count — that state renders an ask board with an option card, which is
// the shape the `:has(> .eanswer .card)` gate requires. A readiness hero has no
// card and never fires the split, which is why the first fixture proved nothing.
const EV = {
  id: 'E2E_TEST_tablet-split', type: 'Birthday', name: 'Split probe', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  totalBudget: 2000, budget: [], guests: [], vendors: [], timeline: [],
};

const WIDTHS = [[1024, 768], [1194, 834], [1200, 800], [1279, 800]];

for (const [w, h] of WIDTHS) {
  test(`the ask has a column it can set in at ${w}x${h}`, async ({ page }) => {
    await page.addInitScript((ev) => {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
      localStorage.setItem('ngw-hostv2-last-event', ev.id);
      localStorage.setItem('ngw-v2-splash-seen', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    }, EV);
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./');
    await page.waitForTimeout(2200);

    const r = await page.evaluate(() => {
      const ask = document.querySelector('.ask');
      if (!ask) return { found: false };
      const a = ask.getBoundingClientRect();
      return {
        found: true,
        askW: Math.round(a.width),
        fs: getComputedStyle(ask).fontSize,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(r.found).toBe(true);
    // A big headline in a narrow column is the failure. 340px is the floor the
    // fixed CSS actually delivers (360 at the split, 648 single-column).
    if (parseInt(r.fs, 10) >= 56) {
      expect(r.askW, `${w}x${h}: ${r.fs} headline in a ${r.askW}px column`).toBeGreaterThanOrEqual(340);
    }
    expect(r.docOverflow, `${w}x${h}: horizontal overflow`).toBeLessThanOrEqual(1);
  });
}
