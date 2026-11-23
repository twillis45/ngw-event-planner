// ─── A TALL IPAD GETS ITS OWN BOARD (owner rulings, 11/22/2026) ───────────────
// The tall-iPad package, approved whole: on a tablet held in portrait the left
// rail and the ☰ eyebrow go; a header that is also the event switcher, a
// ribbon of the plan's parts, a full-width board, a focused first screen that
// ends at "The rest of your plan", and a docked bar (Create · Plan · The Day ·
// After · All sections · Search) take their place. Landscape keeps today's
// layout, rail included. Measured on the Wanda sample at 11" and 13", both
// themes. Reverses the 7/22 648px cap and the 8/17 "question fills the
// screen" for portrait tablets only.
import { test, expect } from '@playwright/test';
import { settled, sheetSettled } from './fixtures.mjs';

const SIZES = [
  ['11"', { width: 834, height: 1194 }, 48],
  ['13"', { width: 1024, height: 1366 }, 64],
];

const boot = async (browser, vp, theme) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript((th) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-theme', th);
  }, theme);
  await page.goto('./');
  await expect(page.locator('[data-tt-head]')).toBeVisible({ timeout: 20_000 });
  await settled(page); await page.waitForTimeout(900);
  return { ctx, page };
};

const visible = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
  .some((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }), sel);

for (const theme of ['dark', 'light']) {
  for (const [name, vp, gut] of SIZES) {
    test.describe(`${name} portrait, ${theme}`, () => {
      test('no rail and no eyebrow; the header names the event and its title opens the events sheet', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        expect(await visible(page, '.srail'), 'rail').toBe(false);
        expect(await visible(page, '.ev-eyebrow'), 'eyebrow').toBe(false);
        await expect(page.locator('[data-tt-title]')).toContainText('Wanda’s 50th');
        await expect(page.locator('[data-tt-head] [data-sample-event]')).toBeVisible();
        await page.locator('[data-tt-title]').click();
        await sheetSettled(page);
        await expect(page.locator('#sheet-title')).toHaveText('Your events');
        await ctx.close();
      });

      test('the ribbon is the plan parts: seven, the board’s handled set, one NOW on the hero’s part', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const parts = page.locator('[data-tt-ribbon] [data-part]');
        await expect(parts).toHaveCount(7);
        const m = await page.evaluate(() => {
          const ps = [...document.querySelectorAll('[data-tt-ribbon] [data-part]')];
          return {
            done: ps.filter((p) => p.dataset.state === 'done').map((p) => p.dataset.part),
            now: ps.filter((p) => p.dataset.state === 'now').map((p) => p.dataset.part),
            heroPart: (document.querySelector('[data-hero-part]') || {}).dataset?.heroPart || null,
            foot: (document.querySelector('[data-tt-ribbon-foot]') || {}).innerText || '',
            counted: [...document.querySelectorAll('.counted-caret')].filter((e) => e.getBoundingClientRect().width > 0).length,
            eprog: [...document.querySelectorAll('.eprog')].filter((e) => e.getBoundingClientRect().height > 0).length,
          };
        });
        // Wanda: date & time, place, address and guests are handled.
        expect(m.done).toEqual(['datetime', 'location', 'venueaddress', 'headcount']);
        expect(m.now).toEqual(['food']);
        expect(m.now[0]).toBe(m.heroPart);
        expect(m.foot).toMatch(/^4 of 7 handled/);
        // The count's denominator grows a week out, when shopping joins the
        // plan (audit C P1-8; owner wording: "starts"): the line says so rather than changing silently.
        expect(m.foot).toMatch(/^4 of 7 handled · shopping starts Mar 13/);
        expect(m.counted, 'no “what’s counted” toggle').toBe(0);
        expect(m.eprog, 'one copy of the parts').toBe(0);
        await ctx.close();
      });

      test(`every block shares two edges ${gut}px from the screen`, async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const m = await page.evaluate(() => {
          const sels = ['[data-tt-head]', '[data-tt-ribbon]', '.hero.elegant .ask', '.escreen.on .hero-card, .escreen.on .opt-list, .escreen.on .ans-card', '.escreen.on .bento', '.ef-watch', '[data-who-confirmed]', '.tt-bar-in'];
          const out = {};
          for (const s of sels) { const e = document.querySelector(s); if (!e) continue; const r = e.getBoundingClientRect(); out[s] = [Math.round(r.left), Math.round(innerWidth - r.right)]; }
          return { out, iw: innerWidth, sw: document.documentElement.scrollWidth };
        });
        expect(m.sw, 'no sideways scroll').toBeLessThanOrEqual(m.iw);
        for (const [s, [l, r]] of Object.entries(m.out)) {
          expect(Math.abs(l - gut), `${s} left ${l}`).toBeLessThanOrEqual(2);
          // The ask is a headline, not a box: only its left edge is shared.
          if (s !== '.hero.elegant .ask') expect(Math.abs(r - gut), `${s} right ${r}`).toBeLessThanOrEqual(2);
        }
        expect(Object.keys(m.out).length).toBeGreaterThanOrEqual(7);
        await ctx.close();
      });

      test('the first screen ends at the fold, above the bar, and nothing sits under the bar', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const m = await page.evaluate(() => {
          const bar = document.querySelector('[data-tt-bar]').getBoundingClientRect();
          const esc = document.querySelector('.escreen.on');
          const kids = [...esc.children].filter((c) => c.getBoundingClientRect().height > 0);
          const last = kids[kids.length - 1];
          const efold = esc.querySelector('.efold');
          const bento = esc.querySelector('.bento');
          let n = esc.nextElementSibling; while (n && !n.getBoundingClientRect().height) n = n.nextElementSibling;
          return {
            barTop: bar.top, barH: bar.height, ih: innerHeight,
            bentoBottom: bento ? bento.getBoundingClientRect().bottom : null,
            efoldBottom: efold ? efold.getBoundingClientRect().bottom : null,
            lastIsFold: !!efold && (last === efold || last.contains(efold)),
            nextTop: n ? n.getBoundingClientRect().top : null,
            buttons: [...document.querySelectorAll('[data-tt-bar] button')].map((b) => Math.round(b.getBoundingClientRect().height)),
          };
        });
        expect(m.bentoBottom, 'Where you stand is on the first screen').not.toBeNull();
        expect(m.bentoBottom).toBeLessThanOrEqual(m.barTop);
        expect(m.lastIsFold, 'the fold control is the last first-screen item').toBe(true);
        expect(m.efoldBottom).toBeLessThanOrEqual(m.barTop);
        expect(m.efoldBottom).toBeGreaterThanOrEqual(m.barTop - 40);
        expect(m.nextTop, 'the next section starts below the bar').toBeGreaterThanOrEqual(m.barTop - 1);
        expect(Math.round(m.barTop + m.barH)).toBe(m.ih);
        for (const h of m.buttons) expect(h).toBeGreaterThanOrEqual(44);
        // Scroll to the end: no text under the bar, anywhere along the way.
        for (const frac of [0.33, 0.66, 1]) {
          const under = await page.evaluate((f) => {
            const a = document.querySelector('.app'); a.scrollTop = Math.round((a.scrollHeight - a.clientHeight) * f);
            const bar = document.querySelector('[data-tt-bar]').getBoundingClientRect();
            // What the eye sees of a scrolled element is its box clipped by the
            // scroller; anything floating over the scroller (the next bar) is
            // measured as it is.
            const clip = a.getBoundingClientRect().bottom;
            const inApp = [...a.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim())
              .map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0 && r.top < clip && Math.min(r.bottom, clip) > bar.top + 0.5).length;
            const floating = [...document.querySelectorAll('.next-bar')].map((e) => e.getBoundingClientRect())
              .filter((r) => r.height > 0 && r.bottom > bar.top + 0.5).length;
            return inApp + floating;
          }, frac);
          expect(under, `text under the bar at ${frac}`).toBe(0);
        }
        await ctx.close();
      });

      test('the bar: phases, All sections, Search; the index lists every door once, with real icons', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const bar = page.locator('[data-tt-bar]');
        await expect(bar.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-pressed', 'true');
        for (const t of ['Create', 'The Day', 'After', 'All sections', 'Search']) await expect(bar.getByRole('button', { name: t })).toBeVisible();
        await bar.getByRole('button', { name: 'All sections' }).click();
        await sheetSettled(page);
        const m = await page.evaluate(() => {
          const sheet = document.querySelector('.sheet');
          const labels = [...sheet.querySelectorAll('[data-door]')].map((e) => e.getAttribute('data-door'));
          const dots = [...sheet.querySelectorAll('[data-door] svg')].filter((s) => s.children.length === 1 && s.children[0].tagName === 'circle' && s.children[0].getAttribute('r') === '2.2').length;
          return { labels, dots, search: !!sheet.querySelector('[data-tt-index-search]'), pass: (sheet.querySelector('[data-door="pass"]') || {}).innerText || '' };
        });
        for (const k of ['venue', 'guests', 'food', 'budget', 'vendors', 'space', 'seating', 'tasks', 'calendar', 'decisions', 'risks', 'messages', 'split', 'meaning', 'family', 'cohosts', 'ask', 'help', 'pass', 'settings']) {
          expect(m.labels.filter((l) => l === k), `door ${k} once`).toHaveLength(1);
        }
        expect(new Set(m.labels).size).toBe(m.labels.length);
        expect(m.dots, 'no dot-only icons').toBe(0);
        expect(m.search).toBe(true);
        expect(m.pass).toMatch(/One-Event Pass/);
        await ctx.close();
      });

      test('Who’s confirmed: the row groups count what the chips count', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const m = await page.evaluate(() => {
          const sec = document.querySelector('[data-who-confirmed]');
          const chip = (k) => (sec.querySelector(`[data-who-part="${k}"]`) || {}).innerText || '';
          const grp = (k) => sec.querySelector(`[data-who-group="${k}"]`);
          const n = (k) => { const g = grp(k); return g ? { head: g.querySelector('[data-who-count]').innerText, rows: g.querySelectorAll('[data-who-row]').length } : null; };
          return { v: chip('vendors'), h: chip('helpers'), vg: n('vendors'), hg: n('helpers'), sentence: !!sec.querySelector('[data-who-waiting]') };
        });
        const of = (s) => { const r = /(\d+) of (\d+)/.exec(s); return r ? Number(r[2]) - Number(r[1]) : null; };
        expect(m.sentence, 'the sentence became rows').toBe(false);
        expect(m.vg.rows).toBe(of(m.v)); expect(m.vg.head).toContain(`${of(m.v)} not confirmed`);
        expect(m.hg.rows).toBe(of(m.h)); expect(m.hg.head).toContain(`${of(m.h)} not confirmed`);
        expect(m.vg.rows).toBe(6); expect(m.hg.rows).toBe(6);
        await ctx.close();
      });
    });
  }
}

test('turning an 11" iPad: rail and no bar in landscape, bar and no rail in portrait, nothing off screen', async ({ browser }) => {
  const P = { width: 834, height: 1194 }; const L = { width: 1194, height: 834 };
  const { ctx, page } = await boot(browser, P, 'dark');
  for (const [vp, where, tall] of [[L, 'landscape', false], [P, 'portrait', true], [L, 'landscape again', false], [P, 'portrait again', true]]) {
    await page.setViewportSize(vp); await settled(page); await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getBoundingClientRect().width > 0);
      const inStrip = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
      return {
        rail: vis('.srail'), bar: vis('[data-tt-bar]'), head: vis('[data-tt-head]'),
        side: document.documentElement.scrollWidth > innerWidth + 1,
        past: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !inStrip(e); }).length,
      };
    });
    expect(m.rail, `${where}: rail`).toBe(!tall);
    expect(m.bar, `${where}: bar`).toBe(tall);
    expect(m.head, `${where}: header`).toBe(tall);
    expect(m.side, `${where}: sideways scroll`).toBe(false);
    expect(m.past, `${where}: past the edge`).toBe(0);
  }
  await ctx.close();
});
