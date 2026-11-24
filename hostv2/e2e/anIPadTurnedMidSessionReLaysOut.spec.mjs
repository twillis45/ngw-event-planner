// ─── AN IPAD TURNED MID-SESSION RE-LAYS OUT (#236, owner's iPad, 11/22/2026) ──
// Chrome for iOS, live 27b4f740, "Mom's 80th Birthday". After a turn the page
// kept the OLD orientation's width:
//   · landscape after portrait: the rail and board filled the left 834pt and
//     the right third was bare page;
//   · portrait after landscape: the board was centered in ~1210pt and ran off
//     the right edge.
//
// WHAT THE SCREENSHOTS PROVE (pixel-sampled, not eyeballed). In the landscape
// shot the stage ends at exactly 1668px = 834pt, the portrait width, and the
// ground to its right is #25262A: --bg-band, which the body wears only while
// `(min-width:1024px)` is FALSE. In the same frame the rail is up, and the rail
// is drawn only when JS read innerWidth >= 1024. So the stylesheet saw the old
// 834pt layout viewport while window.innerWidth already reported the new
// 1210pt. On iOS innerWidth follows the visible area; media queries and block
// widths follow the layout viewport, and that one had not been updated.
//
// Playwright cannot rotate a real iPad. setViewportSize moves both widths at
// once, and in WebKit that rotation is clean (measured 13" and 11", the Wanda
// sample and a custom trip birthday, before this fix). So these tests put the
// page in the state the screenshots show: the layout viewport keeps the old
// width while innerWidth and visualViewport report the new one. They then
// check the two things the page can do about it:
//   1. its markup (data-bp, data-rail) agrees with its own stylesheet, never
//      with a number the stylesheet does not see;
//   2. it asks the engine to measure the layout viewport again, by
//      re-processing the viewport meta tag, once and only once per mismatch.
// Whether iOS then lays out at the new width cannot be proven here; the
// third test only checks that a normal turn rewrites nothing.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const MOM = {
  id: 'cust-mom80', name: 'Mom’s 80th Birthday', type: 'Birthday',
  date: '2027-06-18', endDate: '2027-06-21', guestCount: 30, totalBudget: 12000,
  lodgingOptions: [], budget: [], vendors: [], guests: [],
};

const seed = async (page, which) => {
  await page.addInitScript(([which, ev]) => {
    // The visible width iOS reports after a turn, while the layout viewport
    // has not moved. null = report the truth.
    window.__visible = window.__visibleAtLoad ?? null;
    const own = (o, k) => { for (let p = o; p; p = Object.getPrototypeOf(p)) { const d = Object.getOwnPropertyDescriptor(p, k); if (d) return d; } return null; };
    const iw = own(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', { configurable: true, get() { return window.__visible ?? iw.get.call(window); } });
    if (window.visualViewport) {
      const vw = own(window.visualViewport, 'width');
      Object.defineProperty(window.visualViewport, 'width', { configurable: true, get() { return window.__visible ?? vw.get.call(window.visualViewport); } });
    }
    // outerWidth is the web view's frame on iOS: the one witness that may still
    // be right when every width the page lays out with is stale.
    // The emulated stale state moves it with the visible width.
    const ow = own(window, 'outerWidth');
    Object.defineProperty(window, 'outerWidth', { configurable: true, get() { return window.__outerAtLoad ?? window.__visible ?? ow.get.call(window); } });
    // iOS reports the screen in portrait whatever the orientation. Playwright's
    // WebKit reports the viewport, so a test that needs the iPad's screen says so.
    if (window.__screenWH) {
      Object.defineProperty(screen, 'width', { configurable: true, get() { return window.__screenWH[0]; } });
      Object.defineProperty(screen, 'height', { configurable: true, get() { return window.__screenWH[1]; } });
    }
    window.__metaWrites = 0;
    document.addEventListener('DOMContentLoaded', () => {
      const m = document.querySelector('meta[name="viewport"]');
      if (m) new MutationObserver((rs) => { window.__metaWrites += rs.length; }).observe(m, { attributes: true, attributeFilter: ['content'] });
    });
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    if (which === 'mom') {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
      localStorage.setItem('ngw-hostv2-last-event', ev.id);
    } else localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [which, MOM]);
  await page.goto('./?elegant=1');
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 20_000 });
  await settled(page); await page.waitForTimeout(1200);
};

const state = (page) => page.evaluate(() => {
  const mq = (w) => matchMedia(`(min-width:${w}px)`).matches;
  const sw = document.querySelector('.stagewrap');
  // The tall iPad (owner, 11/22/2026): a tablet band held in portrait. Both
  // halves are the engine's own answers, as the band is.
  const cssTall = mq(640) && !mq(1280) && matchMedia('(orientation: portrait)').matches;
  return {
    cssBand: mq(1280) ? 'desktop' : mq(1024) ? 'tablet-land' : mq(640) ? 'tablet' : 'mobile',
    bp: sw.dataset.bp, rail: sw.dataset.rail, tall: sw.dataset.tall === '1', cssTall,
    // The rail from 1024 in either orientation: a portrait tablet that wide
    // keeps the tall board AND the rail (owner ruling 8, 11/23/2026).
    cssRail: mq(1024), metaWrites: window.__metaWrites,
  };
});

// iOS turns: `resize` and `orientationchange` both fire, the layout viewport
// does not move.
const staleTurn = async (page, visible) => {
  await page.evaluate((w) => {
    window.__visible = w;
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));
    if (window.visualViewport) window.visualViewport.dispatchEvent(new Event('resize'));
  }, visible);
  await page.waitForTimeout(1500);
};

for (const [size, P, L] of [
  ['11"', { width: 834, height: 1140 }, { width: 1194, height: 780 }],
  ['13"', { width: 1024, height: 1290 }, { width: 1366, height: 950 }],
]) {
  test.describe(`iPad ${size}, touch`, () => {
    test.use({ isMobile: true, hasTouch: true, colorScheme: 'dark' });

    test('landscape after portrait, layout viewport left behind: the markup follows the stylesheet and the page asks for a re-measure', async ({ page }) => {
      await page.setViewportSize(P);
      await seed(page, 'mom');
      expect((await state(page)).metaWrites, 'nothing rewritten on a settled load').toBe(0);
      await staleTurn(page, L.width);
      const s = await state(page);
      expect(s.bp, 'data-bp names the band the stylesheet is laying out').toBe(s.cssBand);
      expect(s.rail === '1', 'the rail is up only where the stylesheet has room for it').toBe(s.cssRail);
      expect(s.tall, 'the tall-iPad layout follows the engine’s band and shape').toBe(s.cssTall);
      expect(s.metaWrites, 'the viewport meta is re-processed').toBeGreaterThan(0);
      expect(s.metaWrites, 'once per mismatch, not in a loop').toBeLessThanOrEqual(2);
    });

    test('portrait after landscape, layout viewport left behind: the markup follows the stylesheet and the page asks for a re-measure', async ({ page }) => {
      await page.setViewportSize(L);
      await seed(page, 'wanda');
      await staleTurn(page, P.width);
      const s = await state(page);
      expect(s.bp).toBe(s.cssBand);
      expect(s.rail === '1').toBe(s.cssRail);
      expect(s.metaWrites).toBeGreaterThan(0);
      expect(s.metaWrites).toBeLessThanOrEqual(2);
    });

    test('a landscape reload that comes up at the portrait width: the markup follows the stylesheet and the page asks for a re-measure', async ({ page }) => {
      // Owner's reload screenshot (7:31 PM): a fresh landscape load laid out
      // at 834pt, no rail, --bg-band beside it. The visible width is wrong
      // from the first frame, before any resize.
      await page.setViewportSize(P);
      await page.addInitScript((w) => { window.__visibleAtLoad = w; }, L.width);
      await seed(page, 'mom');
      const s = await state(page);
      expect(s.bp).toBe(s.cssBand);
      expect(s.rail === '1').toBe(s.cssRail);
      expect(s.metaWrites, 'the viewport meta is re-processed at load').toBeGreaterThan(0);
      expect(s.metaWrites).toBeLessThanOrEqual(2);
    });

    test('a landscape reload where only the web view frame knows the width: the page still asks for a re-measure', async ({ page }) => {
      // The reload screenshot has no rail, so there innerWidth said < 1024
      // too: every width the page lays out with may be the stale 834.
      await page.setViewportSize(P);
      await page.addInitScript(([w, scr]) => { window.__outerAtLoad = w; window.__screenWH = scr; }, [L.width, [P.width, L.width]]);
      await seed(page, 'mom');
      const s = await state(page);
      expect(s.bp).toBe(s.cssBand);
      expect(s.metaWrites, 'the viewport meta is re-processed at load').toBeGreaterThan(0);
      expect(s.metaWrites).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => document.querySelector('meta[name="viewport"]').content)).toContain(`width=${L.width}`);
    });

    test('a clean turn, both ways, rewrites nothing and fills the screen', async ({ page }) => {
      await page.setViewportSize(P);
      await seed(page, 'mom');
      for (const vp of [L, P, L]) {
        await page.setViewportSize(vp);
        await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
        await page.waitForTimeout(1200);
        const s = await state(page);
        const m = await page.evaluate(() => {
          const r = document.querySelector('.stagewrap').getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right), iw: innerWidth, side: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        expect(s.bp, `${vp.width}: band`).toBe(s.cssBand);
        expect(s.metaWrites, `${vp.width}: no rewrite on a clean turn`).toBe(0);
        expect(m.side, `${vp.width}: sideways scroll`).toBe(false);
        // Full-bleed below 1280, a centered frame above it: either way the
        // stage sits in the middle of the screen and inside it, which is what
        // both of the owner's screenshots break.
        expect(m.right, `${vp.width}: the stage stays inside the screen`).toBeLessThanOrEqual(m.iw + 1);
        expect(Math.abs(m.left - (m.iw - m.right)), `${vp.width}: the stage is centered`).toBeLessThanOrEqual(2);
      }
    });
  });
}
