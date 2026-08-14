// ─── THE VOID ABOVE THE ASK ──────────────────────────────────────────────────
//
// styles.css:3546 records a specific defect and a specific measurement: the
// elegant hero centres itself vertically, which is right on a phone (the ask
// sits in the thumb's reading line) and wrong the moment the viewport is 1024px
// tall — it "strands ~230px of dead space above the headline, measured at
// 768x1024". The fix top-aligns the ask above mobile, with a deliberate offset
// so it still reads as composed rather than jammed to the ceiling.
//
// NOTHING MEASURED IT. `768x1024` appears in this directory only inside
// _boardCapture and _riskLaneCapture — both env-guarded capture scripts that
// write screenshots to the gitignored review-artifacts/ and assert nothing. So
// the rule that fixed it could be reverted, or quietly lost to a refactor of the
// data-bp selectors, and every gate in this suite would stay green while a
// quarter of the tablet hero went back to being empty.
//
// WHY GEOMETRY AND NOT `justify-content`. Asserting the property would pin the
// mechanism rather than the promise, and would pass for any future rule that
// sets flex-start while some other change re-opened the hole (a padding, a
// margin, an inserted wrapper). What the comment actually claims is a DISTANCE,
// so that is what this measures: the top of the hero screen to the top of the
// first content block.
//
// THE NUMBERS ARE MEASURED, NOT CHOSEN. At 768x1024 the healthy gap is 94px;
// reverting the rule to `center` puts it at 363px — a 269px void, which is the
// "~230px" the comment describes. The bound below sits between the two with
// room on both sides, so it discriminates without being brittle about the exact
// composed offset (which is a clamp and legitimately moves with viewport).
//
// One context, setViewportSize, no new project — the matrix already costs ~19
// minutes and this is two more page loads inside it.
import { test, expect } from './fixtures.mjs';

const EV = {
  id: 'E2E_TEST_herovoid', type: 'Birthday', name: 'Hero Void', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5, totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
};

/** Wait on the splash being gone, never on a timeout — see responsiveBaseline. */
const settled = (page) =>
  page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });

const measureVoid = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('.stagewrap');
    const escreen = document.querySelector('.hero.elegant .escreen.on');
    const ecenter = document.querySelector('.hero.elegant .escreen.on > .ecenter');
    // The first thing the host is meant to READ. `.hzone` carries the headline;
    // falling back to ecenter's first element keeps this honest if the internals
    // are renamed rather than silently measuring nothing.
    const first = document.querySelector('.hero.elegant .escreen.on .hzone')
      || (ecenter && ecenter.firstElementChild);
    return {
      bp: stage ? stage.getAttribute('data-bp') : null,
      elegant: !!escreen,
      // Guarded so a missing node fails loudly on the `elegant` assertion below
      // rather than producing a passing NaN comparison.
      gap: (escreen && first)
        ? Math.round(first.getBoundingClientRect().top - escreen.getBoundingClientRect().top)
        : null,
      justify: ecenter ? getComputedStyle(ecenter).justifyContent : null,
    };
  });

// 94px measured healthy at 768x1024, 363px with the rule reverted. 200 sits
// between them with >100px of clearance on the defect side.
const MAX_VOID = 200;

test.describe('the void above the ask', () => {
  test('768x1024 — the headline is not stranded below a quarter-screen hole', async ({ page }) => {
    await boot(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('./');
    await settled(page);
    const m = await measureVoid(page);
    expect(m.bp, 'the tablet regime, i.e. the rule under test applies').toBe('tablet');
    expect(m.elegant, 'the elegant hero is the surface this rule is about').toBe(true);
    expect(m.gap, `top of hero to top of headline (justify-content: ${m.justify})`)
      .toBeLessThanOrEqual(MAX_VOID);
  });

  // NO LANDSCAPE CASE, DELIBERATELY, and this is worth writing down because the
  // obvious instinct is to add one — the rule's selector covers `tablet-land`
  // too, so a matching 1024x768 test looks like free coverage.
  //
  // It is worse than free: it is a test that cannot fail. Measured with the rule
  // reverted to `center`, the landscape gap is 78px — nowhere near this bound,
  // because at 768px tall there is not enough slack left to strand any. The
  // defect the comment describes is a PORTRAIT defect; it needs a tall viewport
  // to exist at all. A landscape assertion here would have passed with the bug
  // reintroduced, which is the same failure as asserting toBeInViewport at a
  // geometry where the element is above the fold anyway.
  //
  // If the landscape half of that selector ever needs a guard, it needs a
  // different one, aimed at whatever it actually promises.
});
