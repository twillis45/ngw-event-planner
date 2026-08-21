// ─── THE SECTION RAIL COLLAPSES, AND SURVIVES IT ────────────────────────────
//
// Host, twice: "since menu is on left (should be collapsible)" and "menus is
// supposed to be collapsible". The rail was built for this a fortnight before
// the switch existed — sectionIcons.jsx says so in its own header ("a rail that
// can drop to icons-only needs a mark per door that survives losing its label")
// and `.srail-l` is a separate element for no other reason. So the risk here is
// not that the collapse fails to narrow anything; it is the two ways a
// collapsed nav quietly stops being a nav:
//
//  1. THE ROWS GO NAMELESS. Hiding the label with display:none removes it from
//     the accessibility tree as well as the screen, so a row named only by its
//     text is anonymous exactly when its icon is the only thing left. That is
//     invisible in a screenshot and invisible to the person who made the
//     change; it is only visible to someone using a screen reader.
//  2. THE ROWS STOP BEING HITTABLE. 64px of rail minus padding has to still
//     clear the 44px tap floor — tablet-landscape is a touch device.
//
// It also pins that the choice PERSISTS, because a host who narrowed their nav
// said something about how they work, not about this page view.
import { test, expect, settled } from './fixtures.mjs';

const railWidth = (page) => page.locator('.srail').evaluate((n) => n.getBoundingClientRect().width);

// The rail only exists past the welcome gate, on a real event — a fresh profile
// lands on the one-time welcome screen, whose stagewrap is hard-coded
// data-rail="0". Same boot the roster spec uses.
const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

test.describe('section rail collapse', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'rail is only up at desktop widths');

  test('narrows to icons, keeps every door named and hittable, and remembers', async ({ page }) => {
    await boot(page);

    const wide = await railWidth(page);
    expect(wide).toBeGreaterThan(150);

    // Every door carries an accessible name BEFORE the collapse...
    const doors = page.locator('.srail-row:not(.srail-min)');
    const n = await doors.count();
    expect(n).toBeGreaterThan(5);

    await page.locator('.srail-min').click();
    await page.waitForFunction(() => document.querySelector('.stagewrap').dataset.railmin === '1');

    const narrow = await railWidth(page);
    expect(narrow).toBeLessThan(wide);
    expect(narrow).toBeLessThanOrEqual(72);

    // ...and still carries it after, when the label is gone from the tree.
    const labelsPainted = await page.locator('.srail-l').evaluateAll(
      (ns) => ns.filter((x) => getComputedStyle(x).display !== 'none').length);
    expect(labelsPainted).toBe(0);

    for (let i = 0; i < n; i++) {
      const d = doors.nth(i);
      const name = await d.getAttribute('aria-label');
      expect(name, `door ${i} has no accessible name while collapsed`).toBeTruthy();
      const h = await d.evaluate((x) => x.getBoundingClientRect().height);
      expect(h, `door "${name}" is under the 44px tap floor`).toBeGreaterThanOrEqual(44);
    }

    // The choice survives a reload — this is a preference, not a page state.
    await page.reload();
    await settled(page);
    expect(await page.locator('.stagewrap').getAttribute('data-railmin')).toBe('1');
    expect(await railWidth(page)).toBeLessThanOrEqual(72);

    // And it reverses.
    await page.locator('.srail-min').click();
    await page.waitForFunction(() => document.querySelector('.stagewrap').dataset.railmin === '0');
    expect(await railWidth(page)).toBeCloseTo(wide, 0);
  });

  test('the width the rail gives up is conserved, at every width', async ({ page }) => {
    // I wrote this assertion backwards first and the measurement corrected it.
    // The guess was "the frame narrows by the rail delta and content is
    // untouched" — true only where the one-frame formula is the binding
    // constraint. At 1440 it is not: min(100% - 48px, 1360 + rail + gap)
    // clamps on the VIEWPORT, so the frame is already as wide as the window
    // allows and cannot narrow. The 136px the rail gives up therefore lands in
    // the content column, which is the right answer anyway — collapsing the nav
    // to buy back reading width is the entire point of the gesture.
    //
    // So the invariant is conservation, not stillness: the outer frame is fixed
    // and the two columns split it. A future change that shrank the frame
    // instead would leave the content exactly as cramped as before while
    // looking like it had done something.
    // AND IT IS WIDTH-DEPENDENT, which is the part worth pinning. A reviewer
    // reading the CSS alone concluded the frame narrows and the content is
    // untouched; measuring at 1440 showed the opposite. Both are right, at
    // different widths — 1920 is wide enough for the formula to bind, 1440 is
    // not — so this runs at both rather than picking the one that flatters
    // whichever description got written down first.
    for (const width of [1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await boot(page);
      await page.evaluate(() => localStorage.setItem('ngw-hostv2-rail-min', '0'));
      await page.reload();
      await settled(page);

      const read = async () => ({
        frame: await page.locator('.stagewrap').evaluate((n) => n.getBoundingClientRect().width),
        app: await page.locator('#app').evaluate((n) => n.getBoundingClientRect().width),
        rail: await railWidth(page),
      });
      const before = await read();
      await page.locator('.srail-min').click();
      await page.waitForFunction(() => document.querySelector('.stagewrap').dataset.railmin === '1');
      const after = await read();

      // CONSERVATION is the invariant that holds at every width: whatever the
      // rail gives up is taken by the frame, the content column, or both —
      // never lost to a gap that grew.
      const freed = before.rail - after.rail;
      const absorbed = (after.app - before.app) + (before.frame - after.frame);
      expect(freed, `no width freed at ${width}`).toBeGreaterThan(100);
      expect(absorbed, `${freed}px freed at ${width}, ${absorbed}px absorbed`).toBeCloseTo(freed, 0);
      // And the content column never gets NARROWER for collapsing the nav,
      // which would make the gesture actively counterproductive.
      expect(after.app, `content shrank at ${width}`).toBeGreaterThanOrEqual(before.app - 1);
    }
  });
});

// ─── THE RAIL STAYS PUT ──────────────────────────────────────────────────────
//
// Host, 2026-08-21: "the menu on desktop actually is jumping. dizzying."
//
// Measured at 1440, walking five sections: the rail's y went 21 -> -80 -> -194
// -> -299 and never came back, while `window.scrollY` stayed 0 the whole way.
// The scroll was on `.stagewrap` itself, which carried `overflow:hidden` —
// and `hidden` does not mean "cannot scroll", it means "no scrollbar". The box
// was still a scroll container, so every row-level landing's `scrollIntoView`
// scrolled the FRAME instead of the list inside it, and with no scrollbar the
// host had no way to put it back. Persistent navigation walked off the top of
// the app one section at a time.
//
// Two rules declared it and only the later one counted; fixing the first
// changed nothing, which is exactly the kind of half-fix that ships. This
// asserts the OUTCOME — the rail does not move — rather than the declaration,
// so it holds no matter which rule a future change touches.
test.describe('the rail does not drift', () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1280, 'desktop-only surface');

  test('walking every section leaves the rail exactly where it started', async ({ page }) => {
    await boot(page);
    const railY = () => page.locator('.srail').evaluate((n) => n.getBoundingClientRect().y);
    const start = await railY();

    // SECTION doors only. The "Elsewhere" group's rows are not sections: Search
    // opens the command palette, an overlay that swallows the next click, so
    // walking the whole rail blind hung on a click timeout that looked nothing
    // like the drift this test is about.
    const doors = page.locator('.srail-g:not(:last-child) .srail-row:not(.srail-min)');
    const n = await doors.count();
    expect(n).toBeGreaterThan(8);

    for (let i = 0; i < n; i++) {
      const door = doors.nth(i);
      const label = await door.getAttribute('aria-label');
      await door.click();
      await settled(page);
      expect(Math.abs((await railY()) - start), `the rail drifted after opening "${label}"`)
        .toBeLessThanOrEqual(1);
    }

    // And the frame is not a scroll container at all — the property that made
    // the drift possible, asserted directly so the cause cannot come back
    // wearing a different rule.
    const scrolled = await page.locator('.stagewrap').evaluate((n) => n.scrollTop);
    expect(scrolled).toBe(0);
  });
});
