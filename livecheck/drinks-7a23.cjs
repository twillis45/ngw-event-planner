// #292 Thanksgiving "What are you pouring?": each answer's shopping list (wine / cider) and the day's sober-ride row; the question itself.
//   node livecheck/drinks-7a23.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-drinks'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const NOW = new Date('2026-11-27T13:00:00-05:00');
const OPTS = { wine: 'Wine with dinner, sparkling cider for everyone', bring: 'Guests bring the wine; host provides cider and water', none: 'No alcohol: sparkling cider and water' };
const MENU = { hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts', turkey_method: 'Roasted in the oven', dietary_table: 'Nobody — the traditional menu works for everyone', service_style: 'Sit-down — everyone at the table', serve_time: 'Late afternoon, around 4 or 5', overnight_guests: 'No — everyone is local' };
const ev = (id, date, drinks) => ({ id, name: 'E2E_TEST_ Our Thanksgiving', type: 'Thanksgiving Hosting', date, startTime: '16:00', startTimeSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [], budget: [], vendors: [], timeline: [], createdAt: '2026-11-20T12:00:00Z',
  foodChoices: drinks ? { ...MENU, drinks } : { ...MENU }, choiceSource: drinks ? { drinks: 'host' } : {} });

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(8000); await p.clock.setFixedTime(clock || NOW);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, e) => { await p.goto(BASE); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, e]);
      await p.goto(BASE + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800); };
    const openSpread = async (p) => {
      if (await p.locator('.srail-row').count()) await p.locator('.srail-row', { hasText: /spread/i }).first().click();
      else if (await p.locator('[data-tt-bar]').count()) {
        await p.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; }); await p.waitForTimeout(400);
        await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click();
        await p.locator('.sheet').last().locator('[data-door]', { hasText: /spread/i }).first().click();
      } else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.sheet').last().locator('[data-door]', { hasText: /spread/i }).first().click(); }
      await p.waitForTimeout(1500);
    };
    // The list's groups start folded ("Drinks · 0 of 5 bought ›"): open Drinks, then read the sheet from "THE LIST" down.
    const listText = async (p) => {
      const sh = p.locator('.sheet').last();
      const head = sh.getByText(/^Drinks$/).first();
      if (await head.count()) { await head.scrollIntoViewIfNeeded(); await head.click(); await p.waitForTimeout(700); }
      return p.evaluate(() => { const sh = [...document.querySelectorAll('.sheet')].pop(); if (!sh) return null; const t = sh.innerText; const i = t.indexOf('THE LIST'); return i < 0 ? null : t.slice(i).replace(/\s+/g, ' '); });
    };
    const rideRow = (p) => p.evaluate(() => /sober way home/i.test(document.body.innerText));

    for (const [k, pick] of Object.entries(OPTS)) {
      cur = await mk();
      await step('list-' + k, async () => {
        const p = cur.p; await seed(p, ev('E2E_TEST_dr-' + k, '2026-12-17', pick)); await openSpread(p);
        const t = await listText(p);
        const drinksCount = ((t || '').match(/Drinks (\d+ of \d+) bought/) || [])[1] || null; const wineShop = /SHOPPING AT[^]*?Wine shop/.test(t || '');
        const out = { drinksCount, wineShop, pick, red: /Red wine/i.test(t || ''), white: /White wine/i.test(t || ''), cider: /Sparkling cider/i.test(t || ''), listFound: t != null, wineLines: ((t || '').match(/[^·]{0,30}wine[^·]{0,30}/gi) || []).slice(0, 4) };
        const wantWine = k === 'wine';
        if (!t || out.red !== wantWine || out.white !== wantWine || !out.cider) throw new Error(JSON.stringify(out));
        return out;
      });
      await cur.ctx.close();
      cur = await mk(new Date('2026-12-17T10:00:00-05:00'));
      await step('rides-' + k, async () => {
        const p = cur.p; await seed(p, ev('E2E_TEST_dr-day-' + k, '2026-12-17', pick));
        const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: 'The Day', exact: true }).count()) await bar.getByRole('button', { name: 'The Day', exact: true }).first().click();
        else { const rail = p.locator('.srail [data-rail-stage]', { hasText: 'The Day' }); if (await rail.count()) await rail.first().click(); else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'The Day' }).first().click(); } }
        await p.waitForTimeout(1500);
        const has = await rideRow(p); const want = k !== 'none';
        if (has !== want) throw new Error(JSON.stringify({ pick, soberRideRow: has }));
        return { soberRideRow: has };
      });
      await cur.ctx.close();
    }

    cur = await mk();
    await step('question-pick-none', async () => {
      const p = cur.p; await seed(p, ev('E2E_TEST_dr-q', '2026-12-17', null)); await openSpread(p);
      const sheetText = (await p.locator('.sheet').last().innerText()).replace(/\s+/g, ' ');
      // The question lives under Your choices → Menu ("1 open").
      const menu = p.locator('.sheet').last().getByText(/^Menu$/).first(); if (await menu.count()) { await menu.click(); await p.waitForTimeout(1000); }
      const q = p.locator('.sheet').last().getByText(/What are you pouring\?/).first();
      const hasQ = await q.count();
      let opened = null, picked = null, after = null;
      if (hasQ) {
        await q.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
        const sh = p.locator('.sheet').last(); opened = (await sh.innerText()).replace(/\s+/g, ' ').slice(0, 400);
        const opt = sh.getByText(OPTS.none, { exact: false }).first();
        if (await opt.count()) { await opt.click(); await p.waitForTimeout(900); }
        const e = await p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY); picked = e.foodChoices && e.foodChoices.drinks;
        for (let i = 0; i < 3; i++) { if (await p.locator('[data-food-section="list"]').count()) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        if (!(await p.locator('[data-food-section="list"]').count())) await openSpread(p);
        const t = await listText(p); after = { red: /Red wine/i.test(t || ''), white: /White wine/i.test(t || ''), cider: /Sparkling cider/i.test(t || '') };
      }
      const out = { questionShown: hasQ, inChoices: /What are you pouring|pouring/i.test(sheetText), opened, picked, listAfter: after };
      if (!hasQ || picked !== OPTS.none || !after || after.red || after.white || !after.cider) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
