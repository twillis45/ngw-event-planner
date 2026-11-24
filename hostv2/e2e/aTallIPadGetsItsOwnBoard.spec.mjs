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
import { settled, sheetSettled, dateIn } from './fixtures.mjs';

// The 13" keeps the tall board but, since owner ruling 8 (11/23/2026), has the
// rail and no bar: its edges sit 48px inside the content column, and the
// bar-only checks below run at 11" (theNavigationPackage measures the 13").
const SIZES = [
  ['11"', { width: 834, height: 1194 }, 48],
  ['13"', { width: 1024, height: 1366 }, 48],
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
    const bar = vp.width < 1024;   // ruling 8: the 13" upright has the rail, not the bar
    test.describe(`${name} portrait, ${theme}`, () => {
      test(`${bar ? 'no rail' : 'the rail (ruling 8)'} and no eyebrow; the header names the event and its title opens the events sheet`, async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        expect(await visible(page, '.srail'), 'rail').toBe(!bar);
        expect(await visible(page, '[data-tt-bar]'), 'bar').toBe(bar);
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
        // ONE DATE ONCE (parent review, 11/23/2026): no date is printed twice.
        const dates = m.foot.match(/[A-Z][a-z]{2} \d{1,2}\b/g) || [];
        expect(new Set(dates).size, `dates on the line: ${dates.join(', ')}`).toBe(dates.length);
        expect(m.counted, 'no “what’s counted” toggle').toBe(0);
        expect(m.eprog, 'one copy of the parts').toBe(0);
        await ctx.close();
      });

      test(`every block shares two edges ${gut}px from the screen`, async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        const m = await page.evaluate(() => {
          const sels = ['[data-tt-head]', '[data-tt-ribbon]', '.hero.elegant .ask', '.escreen.on .hero-card, .escreen.on .opt-list, .escreen.on .ans-card', '.escreen.on .bento', '.ef-watch', '[data-who-confirmed]', '.tt-bar-in'];
          const out = {};
          // Measured from the content column (.app): the screen edge at 11", the rail's edge at 13".
          const app = document.querySelector('.app').getBoundingClientRect();
          for (const s of sels) { const e = document.querySelector(s); if (!e) continue; const r = e.getBoundingClientRect(); out[s] = [Math.round(r.left - app.left), Math.round(app.right - r.right)]; }
          return { out, iw: innerWidth, sw: document.documentElement.scrollWidth };
        });
        expect(m.sw, 'no sideways scroll').toBeLessThanOrEqual(m.iw);
        for (const [s, [l, r]] of Object.entries(m.out)) {
          expect(Math.abs(l - gut), `${s} left ${l}`).toBeLessThanOrEqual(2);
          // The ask is a headline, not a box: only its left edge is shared.
          if (s !== '.hero.elegant .ask') expect(Math.abs(r - gut), `${s} right ${r}`).toBeLessThanOrEqual(2);
        }
        expect(Object.keys(m.out).length).toBeGreaterThanOrEqual(bar ? 7 : 6);
        await ctx.close();
      });

      if (bar) test('the first screen ends at the fold, above the bar, and the rest follows it', async ({ browser }) => {
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
        // NO EMPTY BAND (owner ruling 9, extended to every tall portrait tablet
        // 11/23/2026): the handle no longer sits at the bar with the rest below
        // it; the rest of the plan follows the handle directly.
        // theTallBoardHasNoEmptyBand measures the hero-to-Where-you-stand gap.
        expect(m.nextTop, 'the next section follows the handle').toBeGreaterThanOrEqual(m.efoldBottom - 1);
        expect(m.nextTop - m.efoldBottom, 'no empty band after the handle').toBeLessThanOrEqual(64);
        expect(Math.round(m.barTop + m.barH)).toBe(m.ih);
        for (const h of m.buttons) expect(h).toBeGreaterThanOrEqual(44);
        await ctx.close();
      });

      // ── NOTHING SITS UNDER THE BAR, AND NO NEXT BAR (owner rulings 11/23) ──
      // The floating NEXT bar is not shown on a tall iPad; the bar is the one
      // docked thing. Text clipped by the scroller is what the eye sees; at
      // every depth, the end included, none of it may meet the bar.
      if (bar) test('no NEXT bar at any depth, and no visible text meets the bar, mid-scroll or at the end', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        let scrolledPastHero = false;
        for (const frac of [0.25, 0.5, 0.75, 1, 1]) {
          await page.evaluate((f) => { const a = document.querySelector('.app'); a.scrollTop = Math.round((a.scrollHeight - a.clientHeight) * f); }, frac);
          await page.waitForTimeout(500);
          const m = await page.evaluate(() => {
            const a = document.querySelector('.app'); const ar = a.getBoundingClientRect();
            const bar = document.querySelector('[data-tt-bar]').getBoundingClientRect();
            const hz = document.querySelector('.hzone');
            const hits = [];
            for (const el of a.querySelectorAll('*')) {
              if (el.children.length || !(el.textContent || '').trim()) continue;
              const r = el.getBoundingClientRect(); if (!r.height || !r.width) continue;
              const top = Math.max(r.top, ar.top), bottom = Math.min(r.bottom, ar.bottom);
              if (bottom - top <= 0.5) continue;
              if (r.right > bar.left && r.left < bar.right && bottom > bar.top + 0.5 && top < bar.bottom) hits.push(`"${el.textContent.trim().slice(0, 30)}"`);
            }
            return { hits, next: document.querySelectorAll('.next-bar').length, past: !!hz && hz.getBoundingClientRect().bottom < ar.top };
          });
          scrolledPastHero = scrolledPastHero || m.past;
          expect(m.next, `no NEXT bar at ${frac}`).toBe(0);
          expect(m.hits, `visible text under the bar at ${frac}`).toEqual([]);
        }
        expect(scrolledPastHero, 'premise: the question scrolled away (where the NEXT bar used to dock)').toBe(true);
        await ctx.close();
      });

      if (bar) test('Plan, tapped on Plan with the question scrolled away, goes back to the question', async ({ browser }) => {
        const { ctx, page } = await boot(browser, vp, theme);
        await page.evaluate(() => { const a = document.querySelector('.app'); a.scrollTop = a.scrollHeight; });
        await page.waitForTimeout(600);
        const inView = () => page.evaluate(() => { const hz = document.querySelector('.hzone').getBoundingClientRect(); const ar = document.querySelector('.app').getBoundingClientRect(); return hz.top >= ar.top - 1 && hz.top < ar.bottom; });
        expect(await inView(), 'premise: the question is scrolled away').toBe(false);
        await page.locator('[data-tt-bar]').getByRole('button', { name: 'Plan', exact: true }).click();
        await expect.poll(inView, { timeout: 5000 }).toBe(true);
        await expect(page.locator('[data-tt-bar]').getByRole('button', { name: 'Plan', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await ctx.close();
      });

      if (bar) test('the bar: phases, All sections, Search; the index lists every door once, with real icons', async ({ browser }) => {
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

// ── ONE DATE ONCE (parent review, 11/23/2026) ─────────────────────────────
// A cookout three weeks out: the shopping list opens a week before, and that
// same day is the plan's next dated work. The grow-note names it; the right
// side does not say it again. (Red without the rule: "…shopping starts Dec 6 /
// next dated work: Dec 6".)
test('when the next dated work is the day the count grows, the date is said once', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 834, height: 1194 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const ev = { id: 'cust-one-date', name: 'Block cookout', type: 'Cookout', date: dateIn(20), venueCity: 'Annapolis', venueState: 'MD', venue: 'Home', venueAddress: '1 Main St', startTime: '18:00', startTimeSource: 'host', guestMode: 'count', guestCount: 20, guestEstimate: 20, guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [] };
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./');
  const foot = page.locator('[data-tt-ribbon-foot]');
  await expect(foot).toContainText('shopping starts', { timeout: 20_000 });
  const text = await foot.innerText();
  const dates = text.match(/[A-Z][a-z]{2} \d{1,2}\b/g) || [];
  expect(dates, text).toHaveLength(1);
  expect(text).not.toContain('next dated work');
  await ctx.close();
});

// ── EVERY PORTRAIT IPAD FITS ITS FIRST SCREEN (parent review, 11/23/2026) ──
// Where you stand and the fold control end the first screen ABOVE the bar on
// each portrait iPad in use, the short ones included. Never by hiding content:
// the gaps, then the ask, then Where you stand's own padding give way first.
const KNOWN_OVER = { '768x1024': 32 };
for (const theme of ['dark', 'light']) {
  for (const [name, vp] of [
    ['iPad mini 6', { width: 744, height: 1133 }], ['iPad 9.7"', { width: 768, height: 1024 }],
    ['iPad 10.2"', { width: 810, height: 1080 }], ['iPad Air', { width: 820, height: 1180 }],
    // Not the 13" (1024x1366): it has no bar since owner ruling 8 (11/23/2026);
    // its first screen is measured in theNavigationPackage (ruling 9).
    ['iPad Pro 11"', { width: 834, height: 1194 }],
  ]) {
    test(`${name} ${vp.width}x${vp.height}, ${theme}: Where you stand and the fold sit above the bar`, async ({ browser }) => {
      const { ctx, page } = await boot(browser, vp, theme);
      const m = await page.evaluate(() => {
        const esc = document.querySelector('.escreen.on');
        const bar = document.querySelector('[data-tt-bar]').getBoundingClientRect();
        const b = esc.querySelector('.bento'); const f = esc.querySelector('.efold');
        const tapMin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap-min')) || 44;
        return { barTop: bar.top, bento: b && b.getBoundingClientRect().bottom, fold: f && f.getBoundingClientRect().bottom, foldH: f && f.getBoundingClientRect().height, tapMin, esc: esc.getBoundingClientRect().bottom };
      });
      // The fold control is a tap target: it never shrinks below the floor to fit.
      expect(m.foldH, `the fold control's tap box (${m.foldH}px)`).toBeGreaterThanOrEqual(m.tapMin);
      expect(m.bento, 'Where you stand is on the first screen').not.toBeNull();
      expect(m.fold, 'the fold control is on the first screen').not.toBeNull();
      expect(m.bento, `Where you stand ends above the bar (${Math.round(m.bento - m.barTop)}px over)`).toBeLessThanOrEqual(m.barTop);
      // 768x1024 IS THE ONE SIZE THAT DOES NOT FIT, AND THIS SAYS BY HOW MUCH.
      // With the gaps at their 24px floor, the ask at 40px and Where you stand
      // at its tightest, the fold control still ends ~30px under the bar's top
      // edge on Wanda (measured 29 dark, 31 light). Where you stand itself fits.
      // Reported to the owner rather than hidden; the bound stops it growing.
      const over = KNOWN_OVER[`${vp.width}x${vp.height}`] || 0;
      if (over) test.info().annotations.push({ type: 'known overflow', description: `fold control ${Math.round(m.fold - m.barTop)}px under the bar top (owner call)` });
      expect(m.fold, `the fold control ends above the bar (${Math.round(m.fold - m.barTop)}px over)`).toBeLessThanOrEqual(m.barTop + over);
      await ctx.close();
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
    // The title block is on every board layout now (owner, 11/24/2026: the iPad
    // in landscape showed only the one-line eyebrow); the bar is still tall-only.
    expect(m.head, `${where}: the title block`).toBe(true);
    expect(m.side, `${where}: sideways scroll`).toBe(false);
    expect(m.past, `${where}: past the edge`).toBe(0);
  }
  await ctx.close();
});

// ── THE WEATHER RIDES THE HEADER, IT DOES NOT FLOAT (owner ruling, 11/23/2026) ──
// On a tall iPad the weather pill (shown only near the event date) moves into
// the header's date line: the same glyph and forecast line, the same tap that
// opens it in place. Nothing floats over the board at any depth. Phones and
// landscape keep the floating pill.
const wxBoot = async (browser, ev, sky) => {
  const ctx = await browser.newContext({ viewport: { width: 834, height: 1194 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const noon = new Date(ev.date + 'T12:00:00');
  await page.route('**/api/weather/geocode**', (r) => r.fulfill({ json: { result: { lat: 38.8, lon: -76.98 } } }));
  await page.route('**/api/weather/onecall**', (r) => r.fulfill({ json: { timezone_offset: -noon.getTimezoneOffset() * 60, hourly: [],
    daily: [{ dt: Math.floor(noon.getTime() / 1000), ...sky }] } }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./');
  await expect(page.locator('[data-tt-head]')).toBeVisible({ timeout: 20_000 });
  await settled(page); await page.waitForTimeout(1200);
  return { ctx, page };
};
const WX_EV = { id: 'cust-tall-wx', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(3), startTime: '16:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Vida’s place', venueCity: 'Oxon Hill', venueState: 'MD', indoorOutdoor: 'indoor',
  guestMode: 'count', guestCount: 15, guests: [], vendors: [], budget: [], timeline: [] };
const SNOW = { pop: 0.6, weather: [{ main: 'Snow', description: 'snow', icon: '13d' }], temp: { min: 25, max: 33 } };
const floatingWx = (page) => page.evaluate(() => [...document.querySelectorAll('.wxpill')]
  .filter((e) => e.getBoundingClientRect().height > 0)
  .map((e) => ({ inHead: !!e.closest('[data-tt-head]'), pos: getComputedStyle(e).position })));

test('tall iPad: near the date, the weather sits in the header’s date line and opens in place; nothing floats', async ({ browser }) => {
  const { ctx, page } = await wxBoot(browser, WX_EV, SNOW);
  const wx = page.locator('[data-tt-head] .wxpill');
  await expect(wx).toBeVisible();
  await expect(wx).toContainText(/Snow forecast/);
  await expect(wx.locator('[data-wx-glyph="snow"]')).toHaveCount(1);
  // On the date line, beside the date.
  const line = await page.evaluate(() => {
    const r1 = document.querySelector('[data-tt-head] .tt-r1').getBoundingClientRect();
    const w = document.querySelector('[data-tt-head] .wxpill-head').getBoundingClientRect();
    return { r1Top: r1.top, r1Bottom: r1.bottom, wTop: w.top, wBottom: w.bottom };
  });
  expect(line.wTop).toBeGreaterThanOrEqual(line.r1Top - 1);
  expect(line.wBottom).toBeLessThanOrEqual(line.r1Bottom + 1);
  for (const frac of [0, 0.5, 1]) {
    await page.evaluate((f) => { const a = document.querySelector('.app'); a.scrollTop = Math.round((a.scrollHeight - a.clientHeight) * f); }, frac);
    await page.waitForTimeout(500);
    for (const w of await floatingWx(page)) {
      expect(w.inHead, `weather outside the header at ${frac}`).toBe(true);
      expect(['fixed', 'absolute', 'sticky'], `weather floats at ${frac}`).not.toContain(w.pos);
    }
  }
  await page.evaluate(() => { document.querySelector('.app').scrollTop = 0; });
  await wx.locator('.wxpill-head').click();
  await expect(wx.locator('.wxpill-head')).toHaveAttribute('aria-expanded', 'true');
  await expect(wx.locator('.wx-body')).toBeVisible();
  await wx.locator('[data-wx-travel-note]').click();
  await expect(page.locator('.sheet').last()).toContainText('the forecast shows snow.');
  await ctx.close();
});

test('tall iPad: with nothing to say about the weather, the header carries none', async ({ browser }) => {
  const { ctx, page } = await wxBoot(browser, WX_EV, { pop: 0.8, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 57 } });
  await expect(page.locator('.wxpill')).toHaveCount(0);
  await ctx.close();
});

test('tall iPad: an outdoor rain alert rides the header too', async ({ browser }) => {
  const { ctx, page } = await wxBoot(browser, { ...WX_EV, id: 'cust-tall-wx-out', type: 'Cookout', name: 'Block cookout', indoorOutdoor: 'outdoor', venue: 'Watkins Park' },
    { pop: 0.85, weather: [{ main: 'Rain', description: 'heavy rain', icon: '10d' }], temp: { min: 62, max: 74 } });
  await expect(page.locator('[data-tt-head] .wxpill')).toBeVisible();
  for (const w of await floatingWx(page)) expect(w.inHead).toBe(true);
  await ctx.close();
});
