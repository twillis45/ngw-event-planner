// #294 one count of open steps (hostv2), #291 weather on The Day (both shells, rain mocked), hostv4 The Day: phase, Now/Next, Today's run, counter mode.
//   node livecheck/day-31b2.cjs <outdir>
// Seeded E2E_TEST_ plans; GET /api/weather/* answered locally (rain); every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-day31'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const DAY = '2026-11-26'; const at = (hm) => new Date(DAY + 'T' + hm + ':00-05:00');
const sixAgo = new Date(at('10:00').getTime() - 6 * 864e5).toISOString();
const PARITY = { id: 'E2E_TEST_open-probe', type: 'Thanksgiving', name: 'E2E_TEST_ Open probe', date: DAY, createdAt: sixAgo, startTime: '15:00', startTimeSource: 'host', guestCount: 7, guests: [], vendors: [], budget: [],
  timeline: [['a', -14], ['b', -10], ['c', -5, true], ['d', -3], ['e', -2], ['f', -1], ['g', 0], ['h', 3]].map(([id, leadDays, done]) => ({ id: 'E2E_TEST_' + id, task: 'E2E_TEST_ step ' + id, leadDays, done: !!done })) };
const WX = { id: 'E2E_TEST_day-wx', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: DAY, startTime: '15:00', startTimeSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Washington', venueState: 'DC',
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', guests: [], vendors: [], budget: [], timeline: [] };
const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };
const floors = (p, touch) => p.evaluate((touch) => {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]');
  const tiny = touch ? [...document.querySelectorAll('button, a[href], [role=button], input, select, textarea')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(); return (b.width < 44 || b.height < 44) && b.bottom > 0 && b.top < innerHeight; })
    .map((e) => { const b = e.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height) + ' ' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24); }) : [];
  return { sideways: document.documentElement.scrollWidth - innerWidth, small: tiny.slice(0, 4), smallN: tiny.length };
}, touch);

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [], shared: 0 }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      const noon = at('12:00');
      await ctx.route('**/api/weather/geocode**', (rt) => rt.fulfill({ json: { result: { lat: 38.9, lon: -77.04 } } }));
      await ctx.route('**/api/weather/onecall**', (rt) => rt.fulfill({ json: { timezone_offset: -18000, hourly: [], daily: [{ dt: Math.floor(noon.getTime() / 1000), ...RAIN }] } }));
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => { window.__shared = (window.__shared || 0) + 1; }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(clock);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 300); }
      try { s.floors = await floors(cur.p, touch); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, shell, ev) => { await p.goto(ROOT + shell + '/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(ROOT + shell + '/?noanalytics=1' + (shell === 'hostv2' ? '&elegant=1' : ''), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500); };
    const v2Stage = async (p, label) => { const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: label, exact: true }).count()) return bar.getByRole('button', { name: label, exact: true }).first().click();
      const rail = p.locator('.srail [data-rail-stage]', { hasText: label }); if (await rail.count()) return rail.first().click();
      await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: label }).first().click(); };
    const v4Nav = async (p, name) => { const tab = p.getByRole('tab', { name }); if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
      const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
      await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click(); };
    const txt = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

    // 1 · #294
    cur = await mk(at('10:00'));
    await step('v2-one-count', async () => {
      const p = cur.p; await seed(p, 'hostv2', PARITY); await v2Stage(p, 'The Day'); await p.waitForTimeout(1200);
      const day = await txt(p); await v2Stage(p, 'Plan'); await p.waitForTimeout(1200); for (let i = 0; i < 20; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(80); }
      const all = day + ' || ' + await txt(p);
      const old = (all.match(/\d+ things? still open|\d+ plan steps? still open|\b\d+ overdue\b/g) || []);
      const past = [...all.matchAll(/(\d+)(?: steps?)? past (?:its|their) window/g)].map((m) => Number(m[1]));
      const left = (all.match(/(\d+) plan steps? left/) || [])[1];
      const lines = (all.match(/[^·.]{0,30}(past (?:its|their) window|plan steps? left)[^·.]{0,20}/g) || []).slice(0, 6);
      const out = { past, left: left ? Number(left) : null, old, lines };
      if (old.length || past.length < 2 || new Set(past).size !== 1 || !left || Number(left) < past[0]) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();

    // 2 · hostv2 weather
    cur = await mk(at('10:40'));
    await step('v2-weather-rain', async () => {
      const p = cur.p; await seed(p, 'hostv2', WX); await v2Stage(p, 'The Day'); await p.waitForTimeout(2000);
      const card = p.locator('[data-day-weather]').first(); await card.scrollIntoViewIfNeeded();
      const kind = await card.getAttribute('data-day-weather'); const text = (await card.innerText()).replace(/\s+/g, ' ');
      const checks = await card.locator('[data-wx-check]').evaluateAll((els) => els.map((e) => e.getAttribute('data-wx-check')));
      await card.locator('[data-wx-day-note]').click(); await p.waitForTimeout(600);
      const sheet = ((await p.locator('.sheet').last().innerText().catch(() => '')) + ' ' + (await p.locator('.sheet textarea').last().inputValue().catch(() => ''))).replace(/\s+/g, ' ');
      const umbrella = /bring an umbrella/.test(sheet);
      const shared = await p.evaluate(() => window.__shared || 0);
      const out = { kind, text: text.slice(0, 160), checks, umbrella, shared };
      if (kind !== 'rain' || !/Moderate rain · 48°–54°F · 100%/.test(text) || !checks.includes('wx-coats') || !umbrella || shared) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();

    // 3 · hostv4 The Day
    cur = await mk(at('10:40'));
    {
      const p = cur.p; let plan0;
      await step('v4-day', async () => {
        await seed(p, 'hostv4', WX); plan0 = await p.evaluate((k) => localStorage.getItem(k), KEY);
        await v4Nav(p, 'The Day'); await p.waitForTimeout(2000);
        const phase = await p.locator('[data-phase]').first().getAttribute('data-phase').catch(() => null);
        const now = (await p.locator('[data-now]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
        const wxEl = p.locator('[data-day-weather]').first(); const wx = await wxEl.getAttribute('data-day-weather').catch(() => null);
        const wxText = (await wxEl.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140);
        const list = await p.locator('[data-dayof-row]').count();
        const out = { phase, now, wx, wxText, listRows: list };
        if (!phase || !now || wx !== 'rain' || !/Moderate rain/.test(wxText)) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('v4-weather-note', async () => {
        const note = p.locator('[data-wx-note]').first(); await note.scrollIntoViewIfNeeded(); await note.click(); await p.waitForTimeout(600);
        const t = (await p.locator('[data-wx-note-text]').first().innerText().catch(() => '')) || (await p.locator('[role=dialog]').last().innerText().catch(() => ''));
        const shared = await p.evaluate(() => window.__shared || 0);
        const out = { note: t.replace(/\s+/g, ' ').slice(0, 160), shared };
        if (!/umbrella/.test(t) || shared) throw new Error(JSON.stringify(out));
        const sh = p.locator('[role=dialog][aria-label="Weather note to guests"]'); await sh.getByRole('button', { name: 'Done', exact: true }).first().click().catch(() => p.keyboard.press('Escape')); await p.waitForTimeout(400);
        if (await sh.isVisible().catch(() => false)) throw new Error('note sheet did not close');
        return out;
      });
      await step('v4-todays-run', async () => {
        const o = p.locator('[data-open-run]').first(); await o.scrollIntoViewIfNeeded(); await o.click(); await p.waitForTimeout(600);
        const states = await p.locator('[data-run] [data-state]').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')));
        const edit = await p.locator('[data-edit-run]').count();
        const out = { steps: states.length, states: [...new Set(states)], editLink: edit };
        if (!states.length || !edit) throw new Error(JSON.stringify(out));
        // Never tap "Done, what's next" (it ticks a step). Back is the "‹ The Day" link only.
        const back = p.locator('button:not(aside button)').filter({ hasText: /^\W*The Day$/ }).first(); if (await back.isVisible().catch(() => false)) await back.click(); else await v4Nav(p, 'The Day'); await p.waitForTimeout(400);
        return out;
      });
      await step('v4-counter-mode', async () => {
        let o = p.locator('[data-open-counter]').first(); if (!(await o.isVisible().catch(() => false))) { await v4Nav(p, 'The Day'); await p.waitForTimeout(800); o = p.locator('[data-open-counter]').first(); }
        await o.scrollIntoViewIfNeeded(); await o.click(); await p.waitForTimeout(700);
        const c = p.locator('[data-counter]').first(); const vis = await c.isVisible();
        const big = await p.locator('[data-counter] [data-big]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => null);
        const ctext = (await c.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
        const fl = await floors(p, touch);
        await p.getByRole('button', { name: 'Leave counter mode' }).click(); await p.waitForTimeout(400);
        const left = !(await p.locator('[data-counter]').first().isVisible().catch(() => false));
        const changed = (await p.evaluate((k) => localStorage.getItem(k), KEY)) !== plan0;
        const out = { visible: vis, bigFontPx: big, text: ctext, left, planChanged: changed, sideways: fl.sideways };
        if (!vis || !big || big < 28 || !left || changed || fl.sideways > 0) throw new Error(JSON.stringify(out));
        return out;
      });
    }
    await cur.ctx.close();

    if (w === 390) {
      for (const hm of ['07:30', '16:00', '20:10']) {
        cur = await mk(at(hm));
        await step('v4-phase-' + hm.replace(':', ''), async () => {
          const p = cur.p; await seed(p, 'hostv4', WX); await v4Nav(p, 'The Day'); await p.waitForTimeout(1800);
          const phase = await p.locator('[data-phase]').first().getAttribute('data-phase').catch(() => null);
          const t = (await txt(p)).slice(0, 220);
          if (!phase) throw new Error('no phase :: ' + t);
          return { phase, text: t };
        });
        await cur.ctx.close();
      }
    }
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} floors ${s.floors ? s.floors.sideways + '/' + s.floors.smallN : '-'}${s.error ? ' — ' + s.error : ''}`); }
})();
