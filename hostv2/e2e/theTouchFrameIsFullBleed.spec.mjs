// ─── ON A TOUCH SCREEN THE FRAME IS THE SCREEN ──────────────────────────────
//
// Owner ruling 28, 11/21/2026, from the owner's iPad: "In tablet some of
// columns are rounded on different screens." Measured before the fix: the
// `.stagewrap` carried a 20px radius at every width.
//   · 1024-1279 (an 11" iPad): the frame filled the screen at 0,0, so its
//     rounded corners were clipped by the screen edge.
//   · 1280 and up (a 13" iPad in landscape, 1366x1024): the frame was inset
//     24px at the sides, 20px above and 40px below, as a floating card.
// Two iPads, two shapes.
//
// The rule: every `(pointer: coarse)` screen gets an edge-to-edge frame with
// square corners and no desktop inset, at any width and in either
// orientation. A mouse at 1280 and up keeps the inset card with 20px corners.
// The inner layout does not change: the rail is still 200px and the board is
// still beside it.
//
// SELF-PINNED: every test opens its own context, with its own viewport and
// its own touch setting.
import { test, expect, settled } from './fixtures.mjs';

const TOUCH = [[1024, 768], [1180, 820], [1024, 1366], [1279, 800], [1366, 1024], [1280, 800]];
const MOUSE = [[1280, 800], [1440, 900]];
const INSET = { x: 24, top: 20, bottom: 40 };   // the desktop card's margins

const open = async (browser, w, h, hasTouch) => {
  const ctx = await browser.newContext({
    baseURL: test.info().project.use.baseURL, viewport: { width: w, height: h }, hasTouch,
  });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('./?elegant=1');
  await settled(page);
  return { ctx, page };
};

const measure = (page) => page.evaluate(() => {
  const B = (el) => { const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const sw = document.querySelector('.stagewrap');
  const cs = getComputedStyle(sw);
  return {
    vw: innerWidth, vh: innerHeight, coarse: matchMedia('(pointer: coarse)').matches, rail: sw.dataset.rail,
    frame: B(sw),
    radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
    srail: B(document.querySelector('.srail')), board: B(sw.querySelector(':scope > .app')),
  };
});

// The inner layout, which the ruling leaves alone: a 200px rail, and the board
// to its right on the same row.
const innerLayoutHolds = (m) => {
  expect(m.rail, 'the rail is up').toBe('1');
  expect(m.srail.w, 'rail width').toBe(200);
  expect(m.board.x, `board starts right of the rail (${JSON.stringify(m.board)})`).toBeGreaterThanOrEqual(m.srail.x + m.srail.w);
  expect(m.board.y, 'board on the rail’s row').toBe(m.srail.y);
  expect(m.board.w, 'board width').toBeGreaterThan(400);
};

test.describe('touch: the frame is full-bleed with square corners', () => {
  for (const [w, h] of TOUCH) {
    test(`${w}x${h} with touch`, async ({ browser }) => {
      const { ctx, page } = await open(browser, w, h, true);
      const m = await measure(page);
      test.info().annotations.push({ type: 'frame', description: JSON.stringify({ frame: m.frame, radii: m.radii }) });
      expect(m.coarse, 'the context reports a coarse pointer').toBe(true);
      expect(m.frame, 'frame at 0,0, the size of the screen').toEqual({ x: 0, y: 0, w: m.vw, h: m.vh });
      expect(m.radii, 'all four corners square').toEqual(['0px', '0px', '0px', '0px']);
      innerLayoutHolds(m);
      await ctx.close();
    });
  }

  test('one shape across 1280: 1279x800 and 1280x800 frames match', async ({ browser }) => {
    const seen = {};
    for (const w of [1279, 1280]) {
      const { ctx, page } = await open(browser, w, 800, true);
      const m = await measure(page);
      seen[w] = { x: m.frame.x, y: m.frame.y, right: m.vw - (m.frame.x + m.frame.w), h: m.frame.h, radii: m.radii, rail: m.srail.w };
      await ctx.close();
    }
    expect(seen[1280]).toEqual(seen[1279]);
  });
});

test.describe('mouse: the desktop card is unchanged', () => {
  for (const [w, h] of MOUSE) {
    test(`${w}x${h} without touch`, async ({ browser }) => {
      const { ctx, page } = await open(browser, w, h, false);
      const m = await measure(page);
      expect(m.coarse).toBe(false);
      expect(m.frame.x, 'left inset').toBe(INSET.x);
      expect(m.vw - (m.frame.x + m.frame.w), 'right inset').toBe(INSET.x);
      expect(m.frame.y, 'top inset').toBe(INSET.top);
      expect(m.vh - (m.frame.y + m.frame.h), 'bottom inset').toBe(INSET.bottom);
      expect(m.radii).toEqual(['20px', '20px', '20px', '20px']);
      innerLayoutHolds(m);
      await ctx.close();
    });
  }
});
