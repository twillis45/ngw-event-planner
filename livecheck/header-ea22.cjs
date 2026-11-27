// #316 the phone header (T2): name first 28/700, the date line under it in plain words; tablet/desktop unchanged (caps above).
// Also: the Sample tag, the weather pill, a trip's span and "Day 1 of 4", and the rename long-press opening in place.
//   node livecheck/header-ea22.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; GET /api/weather/* answered locally; every POST/PUT/PATCH/DELETE aborted. Rename is opened and cancelled, never saved. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-head'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const NOW = new Date('2026-11-27T13:00:00-05:00');
const plus = (d) => new Date(NOW.getTime() + d * 864e5).toISOString().slice(0, 10);
const TG = { id: 'E2E_TEST_head', name: 'E2E_TEST_ Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20', date: plus(3), startTime: '15:00', startTimeSource: 'host',
  venue: 'Our place', venueKind: 'home', venueCity: 'Springfield', venueState: 'VA', guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [] };
const TRIP = { id: 'E2E_TEST_head-trip', type: 'Group Trip', name: 'E2E_TEST_ Trip', date: '2026-12-03', endDate: '2026-12-06', guestCount: 8, vendors: [], guests: [], budget: [], timeline: [] };
const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.route('**/api/weather/geocode**', (rt) => rt.fulfill({ json: { result: { lat: 38.8, lon: -77.2 } } }));
      await ctx.route('**/api/weather/onecall**', (rt) => rt.fulfill({ json: { timezone_offset: -18000, hourly: [], daily: [0, 1, 2, 3, 4, 5, 6, 7].map((d) => ({ dt: Math.floor(new Date(plus(d) + 'T12:00:00-05:00').getTime() / 1000), ...RAIN })) } }));
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(clock || NOW);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, ev) => { await p.goto(BASE); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); if (e) { localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); } }, [KEY, LAST, ev]);
      await p.goto(BASE + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2200); };
    const head = (p) => p.evaluate(() => {
      const q = (s) => document.querySelector(s); const nm = q('[data-tt-title] .tt-name') || q('[data-tt-title]'); const line = q('[data-tt-head] .tt-r1'); const t = q('[data-tt-title]');
      if (!nm || !line || !t) return null; const cs = getComputedStyle(nm); const ls = getComputedStyle(line); const tb = t.getBoundingClientRect(); const lb = line.getBoundingClientRect();
      return { name: nm.innerText, nameFs: parseFloat(cs.fontSize), nameFw: cs.fontWeight, line: line.innerText.replace(/\s+/g, ' '), lineFs: parseFloat(ls.fontSize), lineTt: ls.textTransform,
        lineBelowName: lb.top >= tb.bottom - 1, gap: Math.round(lb.top - tb.bottom), lineAboveName: lb.bottom <= tb.top + 1, bp: (document.querySelector('.stagewrap') || {}).dataset?.bp || null,
        wx: !!line.querySelector('[data-tt-wx], .tt-wx, [data-weather], .wx') || /°|rain/i.test(line.innerText), sample: !!document.querySelector('[data-tt-head] [data-sample-event]') };
    });

    cur = await mk();
    await step('header', async () => {
      const p = cur.p; await seed(p, TG); const hd = await head(p);
      const mobile = hd && hd.bp === 'mobile';
      const long = new Date(TG.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const bad = [];
      if (!hd) bad.push('no header');
      else if (mobile) {
        if (hd.nameFs !== 28 || hd.nameFw !== '700') bad.push('name size');
        if (!hd.line.startsWith(long + ' · ')) bad.push('plain date');
        if (!/· 3 days/.test(hd.line)) bad.push('days');
        if (hd.lineFs !== 15 || hd.lineTt !== 'none' || !hd.lineBelowName || hd.gap > 8) bad.push('line style/place');
      } else {
        if (!/\d+ DAYS/.test(hd.line.toUpperCase()) || !hd.lineAboveName) bad.push('desktop/tablet header changed');
      }
      if (bad.length) throw new Error(bad.join(', ') + ' :: ' + JSON.stringify(hd));
      const { name: evName, ...rest } = hd; return { ...rest, evName, expectedPlain: mobile ? long : null };
    });
    await step('rename-longpress', async () => {
      const p = cur.p; if (!touch) return { skipped: 'not touch' };
      const t = p.locator('[data-tt-title]'); const bx = await t.boundingBox();
      const cdp = await p.context().newCDPSession(p);
      const pt = { x: bx.x + Math.min(60, bx.width / 2), y: bx.y + bx.height / 2 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] }); await p.waitForTimeout(750);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(600);
      const field = await p.evaluate(() => { const a = document.activeElement; const inp = document.querySelector('[data-tt-head] input, .tt-head input, input[data-event-name], input[aria-label*="name" i]'); return { active: a && a.tagName, inHeader: !!(a && a.closest('[data-tt-head], .tt-head')), value: inp ? inp.value : null, selected: a && a.selectionEnd - a.selectionStart, dialog: !!document.querySelector('.sheet') }; });
      const stored = await p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0].name, KEY);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      const after = await p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0].name, KEY);
      const out = { field, nameUnchanged: stored === TG.name && after === TG.name };
      if (field.active !== 'INPUT' || field.dialog || !out.nameUnchanged) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();

    cur = await mk();
    await step('sample-tag', async () => {
      const p = cur.p; await seed(p, null);
      const s = await p.locator('[data-tt-head] [data-sample-event]').count(); const hd = await head(p);
      if (!s) throw new Error('no Sample tag :: ' + JSON.stringify(hd));
      return { sample: s, line: hd && hd.line, bp: hd && hd.bp };
    });
    await cur.ctx.close();

    cur = await mk(new Date('2026-11-27T13:00:00-05:00'));
    await step('trip-ahead', async () => {
      const p = cur.p; await seed(p, TRIP); const hd = await head(p);
      if (!hd || !/Dec 3\s*[–-]\s*Dec 6/i.test(hd.line)) throw new Error(JSON.stringify(hd));
      return { line: hd.line, bp: hd.bp };
    });
    await cur.ctx.close();
    cur = await mk(new Date('2026-12-03T10:00:00-05:00'));
    await step('trip-day1', async () => {
      const p = cur.p; await seed(p, TRIP);
      // On the day the app opens on The Day (no header there); the date line is the Plan board's.
      const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: 'Plan', exact: true }).count()) await bar.getByRole('button', { name: 'Plan', exact: true }).first().click();
      else { const rail = p.locator('.srail [data-rail-stage]', { hasText: 'Plan' }); if (await rail.count()) await rail.first().click(); else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'Plan' }).first().click(); } }
      await p.waitForTimeout(1200);
      const hd = await head(p);
      if (!hd || !/Day 1 of 4/i.test(hd.line)) throw new Error(JSON.stringify(hd));
      return { line: hd.line, bp: hd.bp };
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
