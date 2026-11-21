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

// ── The host's first-run screens (owner, 11/21/2026: "host screens only") ──
// The welcome gate has no rail (data-rail="0"), so the frame rules above never
// reached it: measured before, at 1366x1024 with touch it was an inset
// 1280x900 card with a 48px phone bezel, and from 700 wide its boot splash
// painted 48px corners that the screen edge clipped. On touch both are now the
// screen, square, like the main frame. The guest pages (invite, helper, family,
// vendor brief) are not host screens and keep their framed card.
const firstRun = async (browser, w, h, hasTouch, { splash }) => {
  const ctx = await browser.newContext({
    baseURL: test.info().project.use.baseURL, viewport: { width: w, height: h }, hasTouch,
  });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  // A fresh profile: no event, not welcomed. Without the splash flag the boot
  // splash is up over the welcome; with it, the welcome itself is on screen.
  if (!splash) await page.addInitScript(() => localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()));
  await page.goto('./?elegant=1');
  await page.locator(splash ? '.splash' : '.content.welcome').first().waitFor({ state: 'visible', timeout: 15_000 });
  return { ctx, page };
};

const box = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
  return {
    x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
  };
});
const SQUARE = ['0px', '0px', '0px', '0px'];

test.describe('touch: the welcome screen and the boot splash are full-bleed', () => {
  for (const [w, h] of [[1180, 820], [1366, 1024]]) {
    test(`${w}x${h} with touch — the welcome`, async ({ browser }) => {
      const { ctx, page } = await firstRun(browser, w, h, true, { splash: false });
      await expect(page.locator('.stagewrap')).toHaveAttribute('data-rail', '0');
      const full = { x: 0, y: 0, w, h, radii: SQUARE };
      expect(await box(page, '.stagewrap'), 'welcome frame').toEqual(full);
      expect(await box(page, '.stagewrap > .app'), 'welcome screen').toEqual(full);
      await ctx.close();
    });

    test(`${w}x${h} with touch — the boot splash`, async ({ browser }) => {
      const { ctx, page } = await firstRun(browser, w, h, true, { splash: true });
      expect(await box(page, '.splash'), 'splash').toEqual({ x: 0, y: 0, w, h, radii: SQUARE });
      await ctx.close();
    });
  }
});

test.describe('mouse: the welcome screen and the splash are unchanged', () => {
  // Measured on the build before the touch rule; a mouse must not move them.
  const BEFORE = {
    1280: { frame: { x: 24, y: 20, w: 1232, h: 740, radii: SQUARE }, app: { x: 24, y: 20, w: 1232, h: 740, radii: ['48px', '48px', '48px', '48px'] } },
    1440: { frame: { x: 80, y: 20, w: 1280, h: 840, radii: SQUARE }, app: { x: 80, y: 20, w: 1280, h: 840, radii: ['48px', '48px', '48px', '48px'] } },
  };
  for (const [w, h] of MOUSE) {
    test(`${w}x${h} without touch`, async ({ browser }) => {
      const a = await firstRun(browser, w, h, false, { splash: false });
      expect(await box(a.page, '.stagewrap'), 'welcome frame').toEqual(BEFORE[w].frame);
      expect(await box(a.page, '.stagewrap > .app'), 'welcome screen').toEqual(BEFORE[w].app);
      await a.ctx.close();
      const b = await firstRun(browser, w, h, false, { splash: true });
      expect(await box(b.page, '.splash'), 'splash').toEqual(BEFORE[w].app);
      await b.ctx.close();
    });
  }
});

// The invite is designed as paper on a card, and the guest pages are out of
// the ruling: touch must not move the card or change its corners.
const INVITE = {
  id: 'cust-touch-frame-invite', rsvpCode: 'touch-frame-invite-code',
  name: 'My Game Night', type: 'Game Night', date: '2027-03-06', time: '19:00', venueName: 'Home',
  guestEstimate: 6, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [],
};
const inviteCard = async (browser, w, h, hasTouch) => {
  const ctx = await browser.newContext({
    baseURL: test.info().project.use.baseURL, viewport: { width: w, height: h }, hasTouch,
  });
  const page = await ctx.newPage();
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, INVITE);
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?rsvp=' + INVITE.rsvpCode);
  await expect(page.locator('.inv2-sheet').first()).toBeVisible();
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await page.waitForTimeout(600);   // past the entrance animation
  const m = { stage: await box(page, '.stagewrap'), card: await box(page, '.inv2-sheet') };
  await ctx.close();
  return m;
};

test.describe('touch: the guest invite keeps its card', () => {
  // From 1024 the invite is its own full-screen, square-cornered composition
  // (the 11/11 ruling); below it, a 22px paper card. Both stay as they are.
  for (const [w, h] of [[768, 1024], [1180, 820], [1366, 1024]]) {
    test(`${w}x${h} — the invite card is the same with touch as with a mouse`, async ({ browser }) => {
      const mouse = await inviteCard(browser, w, h, false);
      const touch = await inviteCard(browser, w, h, true);
      test.info().annotations.push({ type: 'invite', description: JSON.stringify({ mouse, touch }) });
      expect(touch).toEqual(mouse);
      if (w < 1024) expect(touch.card.radii, 'the paper card keeps its corners').toEqual(['22px', '22px', '22px', '22px']);
    });
  }
});
