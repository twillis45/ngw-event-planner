// ─── A SHEET FILLS THE COLUMN FROM 1024, AND NEVER OUTGROWS THE SCREEN ──────
//
// Owner ruling 27, 11/21/2026, made from rendered sheet-size comparisons: "B".
//   · From 1024 wide, where the rail appears, every sheet fills the content
//     column: one shape across 1280. The 680px centered panel (1024-1279) and
//     the 860px tablet-landscape measure are gone.
//   · The sheet frame is capped to the screen, so its title and Close are
//     always visible. At 1280x654 the spread sheet used to open 1,298px tall
//     with the page scrolled 242px: title at y=-179, Close at y=-203.
//   · The page behind does not scroll while a sheet is open, even from code
//     (`overflow:clip`, never `hidden`).
//
// WHAT IS LEFT, AND IS ASSERTED AS SUCH: at 1280 the stage gains the desktop
// frame (24px each side, 20px above, 40px below), so the sheet box moves by
// that inset across 1279/1280. Width is held to within the frame's 2 x 24px,
// not to equality; the old panel jumped 330px (680 -> 1010).
//
// ON TOUCH THAT INSET IS GONE (owner ruling 28, 11/21/2026): a touch screen's
// frame is the screen at every width, so the sheet box is the same on both
// sides of 1280, and the screen-height cap is the screen itself.
//
// SELF-PINNED: every test sets its own viewport.
import { test, expect, settled, sheetSettled, dateIn } from './fixtures.mjs';

const EV = {
  id: 'E2E_TEST_sheet-column', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] }],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }, { id: 'music', category: 'Music', budgeted: 1000, actual: 300 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

const SIZES = [[1024, 768], [1279, 800], [1280, 800], [1280, 654], [1440, 900]];
const SHEETS = [['spread', 'The spread & shopping'], ['hiring', 'People you’re hiring']];
const FRAME_X = 24;   // the desktop frame's side inset (`width:min(100% - 48px, …)`)

const open = async (page, w, h, name) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('./?elegant=1');
  await settled(page);
  await page.locator('.srail-row', { hasText: name }).first().click({ timeout: 8000 });
  await sheetSettled(page);
  await page.waitForTimeout(400);
};

const measure = (page) => page.evaluate(() => {
  const B = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const seen = (el) => { if (!el) return false; const r = el.getBoundingClientRect();
    if (!(r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth)) return false;
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!t && (t === el || el.contains(t)); };
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const title = sh && sh.querySelector('#sheet-title');
  const close = sh && sh.querySelector('.sheet-x');
  return {
    vw: innerWidth, vh: innerHeight, scrollY: Math.round(scrollY),
    sheet: B(sh), app: B(document.querySelector('.stagewrap > .app')),
    title: B(title), close: B(close), titleSeen: seen(title), closeSeen: seen(close),
  };
});

const pushThePageFromCode = (page) => page.evaluate(() => {
  // Everything behind the sheet that a scrollIntoView or a stray script could
  // move: the document and the stage that holds the sheet.
  window.scrollTo(0, 600);
  document.scrollingElement.scrollTop = 600;
  const sw = document.querySelector('.stagewrap');
  if (sw) sw.scrollTop = 600;
});

for (const [slug, name] of SHEETS) {
  for (const [w, h] of SIZES) {
    test(`${slug} ${w}x${h} — fills the content column, inside the screen`, async ({ page }) => {
      await open(page, w, h, name);
      const m = await measure(page);
      test.info().annotations.push({ type: 'sheet box', description: JSON.stringify(m.sheet) });
      // The column: the sheet's edges are the board column's edges.
      expect(Math.abs(m.sheet.x - m.app.x), `sheet left ${m.sheet.x} vs column left ${m.app.x}`).toBeLessThanOrEqual(2);
      expect(Math.abs((m.sheet.x + m.sheet.w) - (m.app.x + m.app.w)), 'sheet right vs column right').toBeLessThanOrEqual(2);
      // The screen: the frame starts on it and ends on it.
      expect(m.sheet.y, 'sheet top').toBeGreaterThanOrEqual(0);
      expect(m.sheet.y + m.sheet.h, 'sheet bottom').toBeLessThanOrEqual(m.vh);
      expect(m.titleSeen, `title fully visible (${JSON.stringify(m.title)})`).toBe(true);
      expect(m.closeSeen, `Close fully visible (${JSON.stringify(m.close)})`).toBe(true);
    });

    test(`${slug} ${w}x${h} — the page behind does not scroll, even from code`, async ({ page }) => {
      await open(page, w, h, name);
      const before = await measure(page);
      await pushThePageFromCode(page);
      await page.waitForTimeout(150);
      const after = await measure(page);
      expect(after.scrollY, 'document scroll while a sheet is open').toBe(0);
      expect(after.sheet.y, `sheet moved from y=${before.sheet.y}`).toBe(before.sheet.y);
      expect(after.titleSeen && after.closeSeen, 'title and Close still visible').toBe(true);
    });
  }

  test(`${slug} — one shape across 1280: 1279x800 and 1280x800 differ only by the frame`, async ({ browser }) => {
    const box = {};
    for (const w of [1279, 1280]) {
      const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
      const page = await ctx.newPage();
      await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
      await open(page, w, 800, name);
      box[w] = (await measure(page)).sheet;
      await ctx.close();
    }
    test.info().annotations.push({ type: 'boxes', description: JSON.stringify(box) });
    expect(Math.abs(box[1279].w - box[1280].w), `width ${box[1279].w} at 1279 vs ${box[1280].w} at 1280`)
      .toBeLessThanOrEqual(2 * FRAME_X);
    expect(Math.abs(box[1279].x - box[1280].x), `left ${box[1279].x} at 1279 vs ${box[1280].x} at 1280`)
      .toBeLessThanOrEqual(FRAME_X + 1);
  });
}

// ── Touch (ruling 28): no desktop inset at 1280 and up ─────────────────────
test.describe('with touch', () => {
  test.use({ hasTouch: true });
  for (const [slug, name] of SHEETS) {
    for (const [w, h] of [[1366, 1024], [1280, 800]]) {
      test(`${slug} ${w}x${h} touch — fills the column, title and Close on the screen`, async ({ page }) => {
        await open(page, w, h, name);
        const m = await measure(page);
        test.info().annotations.push({ type: 'sheet box', description: JSON.stringify(m.sheet) });
        expect(Math.abs(m.sheet.x - m.app.x), `sheet left ${m.sheet.x} vs column left ${m.app.x}`).toBeLessThanOrEqual(2);
        expect(Math.abs((m.sheet.x + m.sheet.w) - (m.app.x + m.app.w)), 'sheet right vs column right').toBeLessThanOrEqual(2);
        expect(m.sheet.y, 'sheet top').toBeGreaterThanOrEqual(0);
        expect(m.sheet.y + m.sheet.h, 'sheet bottom').toBeLessThanOrEqual(m.vh);
        expect(m.titleSeen, `title fully visible (${JSON.stringify(m.title)})`).toBe(true);
        expect(m.closeSeen, `Close fully visible (${JSON.stringify(m.close)})`).toBe(true);
        await pushThePageFromCode(page);
        await page.waitForTimeout(150);
        const after = await measure(page);
        expect(after.scrollY, 'document scroll while a sheet is open').toBe(0);
        expect(after.sheet.y, `sheet moved from y=${m.sheet.y}`).toBe(m.sheet.y);
      });
    }

    test(`${slug} touch — one shape across 1280: 1279x800 and 1280x800 boxes match`, async ({ browser }) => {
      const box = {};
      for (const w of [1279, 1280]) {
        const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, hasTouch: true });
        const page = await ctx.newPage();
        await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
        await open(page, w, 800, name);
        const s = (await measure(page)).sheet;
        box[w] = { x: s.x, y: s.y, right: w - (s.x + s.w), h: s.h };
        await ctx.close();
      }
      test.info().annotations.push({ type: 'boxes', description: JSON.stringify(box) });
      expect(box[1280]).toEqual(box[1279]);
    });
  }
});
