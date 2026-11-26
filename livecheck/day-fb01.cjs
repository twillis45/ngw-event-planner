// fb017d49: #296 day crew, #297 indoor day-before has no rain row, #298 running late, #299 alerts + outdoor weather, #300 shopping tick = Still to get. hostv4 The Day.
//   node livecheck/day-fb01.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; GET /api/weather/* answered locally (rain); every POST/PUT/PATCH/DELETE aborted;
// share/clipboard/open stubbed. Never taps Send, Email, Text, Copy or "Tell your guests". Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-fb01'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const T = (d, hm) => new Date(d + 'T' + hm + ':00-05:00');
const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };
const base = { type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', createdAt: '2026-11-01T12:00:00Z', venueCity: 'Washington', venueState: 'DC', budget: [] };
const TG_EVE = { ...base, id: 'E2E_TEST_fb-eve', name: 'E2E_TEST_ Thanksgiving', venueKind: 'home', guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [],
  vendors: [{ id: 'v1', name: 'E2E_TEST_ Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked' }],
  timeline: [{ id: 'E2E_TEST_a', task: 'Cook the make-ahead dishes', leadDays: -1, done: false }, { id: 'E2E_TEST_b', task: 'Do the shopping', leadDays: -1, done: false }] };
const CRAB_EVE = { ...TG_EVE, id: 'E2E_TEST_fb-crab', type: 'Crab Feast', name: 'E2E_TEST_ Crab Feast', timeline: [] };
const TG_DAY = { ...base, id: 'E2E_TEST_fb-day', name: 'E2E_TEST_ Thanksgiving', venue: '12 Example Lane', venueKind: 'home', guestMode: 'list', vendors: [],
  guests: [{ id: 'g-ada', name: 'Ada Pine', phone: '(202) 555-0101', rsvp: 'Yes' }, { id: 'g-ben', name: 'Ben Oak', email: 'ben.oak@example.com', rsvp: 'Yes' }, { id: 'g-cy', name: 'Cy Fern', rsvp: 'Pending' }],
  timeline: [{ id: 'E2E_TEST_ice', task: 'Drinks and ice', owner: 'Ada Pine', done: false }, { id: 'E2E_TEST_coats', task: 'Coats and parking', owner: 'Ben Oak', done: false }],
  helperLinkIds: ['g-ben'] };
const CRAB_DAY = { ...base, id: 'E2E_TEST_fb-crabday', type: 'Crab Feast', name: 'E2E_TEST_ Crab Feast', venueKind: 'park', venue: 'Example Park Pavilion', guestMode: 'count', guestCount: 20, guestEstimate: 20, guestCountSource: 'host', guests: [], vendors: [], timeline: [] };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.route('**/api/weather/geocode**', (rt) => rt.fulfill({ json: { result: { lat: 38.9, lon: -77.04 } } }));
      await ctx.route('**/api/weather/onecall**', (rt) => rt.fulfill({ json: { timezone_offset: -18000, hourly: [], daily: [{ dt: Math.floor(T('2026-11-26', '12:00').getTime() / 1000), ...RAIN }] } }));
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => { window.__shared = (window.__shared || 0) + 1; }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(clock);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const open = async (p, ev) => { await p.goto(ROOT + 'hostv4/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(ROOT + 'hostv4/?noanalytics=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
      const tab = p.getByRole('tab', { name: 'The Day' }); if ((await tab.count()) && (await tab.first().isVisible())) await tab.first().click();
      else { const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); } await p.locator('aside[aria-label="Places"] button', { hasText: 'The Day' }).first().click(); }
      await p.waitForTimeout(2000); };
    const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY);
    const txt = async (p, sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const backToDay = async (p) => { const back = p.locator('button:not(aside button)').filter({ hasText: /^\W*The Day$/ }).first(); if (await back.isVisible().catch(() => false)) await back.click(); await p.waitForTimeout(500); };

    // #300 + #297 the evening before (Thanksgiving at home, unanswered: indoor guess)
    cur = await mk(T('2026-11-25', '16:00'));
    await step('eve-shop-matches', async () => {
      const p = cur.p; await open(p, TG_EVE);
      const rows = await p.locator('[data-before-tomorrow] [data-db-row]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-db-row'), text: e.innerText.replace(/\s+/g, ' ') })));
      const shopRow = (rows.find((x) => x.id === 'shopping') || {}).text || '';
      const stillTo = Number((/(\d+) items?/.exec(shopRow) || [])[1]);
      const shop = p.locator('[data-tonight] [data-check]', { hasText: 'Do the shopping' }).first(); await shop.scrollIntoViewIfNeeded(); await shop.click(); await p.waitForTimeout(800);
      const e = await stored(p); const marked = Object.keys(e.foodGot || {}).length;
      const after = await p.locator('[data-before-tomorrow] [data-db-row]').evaluateAll((els) => els.map((x) => x.getAttribute('data-db-row') + ': ' + x.innerText.replace(/\s+/g, ' ')));
      const out = { before: rows.map((x) => x.id + ': ' + x.text), stillToGetItems: stillTo, markedBought: marked, after, rainRow: rows.some((x) => x.id === 'rain') };
      // 28 earlier = food lines + 4 rentals; the tick buys food only, so after it only rentals may remain.
      const left = after.find((x) => x.startsWith('shopping')) || '';
      if (out.rainRow) throw new Error('indoor Thanksgiving still asks for a rain backup :: ' + JSON.stringify(out));
      if (!marked || /\d+ items?/.test(left)) throw new Error('shopping not cleared :: ' + JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    cur = await mk(T('2026-11-25', '16:00'));
    await step('eve-crab-asks-rain', async () => {
      const p = cur.p; await open(p, CRAB_EVE);
      const rows = await p.locator('[data-before-tomorrow] [data-db-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-db-row')));
      if (!rows.includes('rain')) throw new Error('crab feast at home, unanswered, has no rain row :: ' + rows);
      return { rows };
    });
    await cur.ctx.close();

    // #299 alerts + #296 crew + #298 running late on the day, 1:05 PM
    cur = await mk(T('2026-11-26', '13:05'));
    {
      const p = cur.p; let plan0;
      await step('day-alerts', async () => {
        await open(p, TG_DAY); plan0 = JSON.stringify(await stored(p));
        const line = await txt(p, '[data-alert]');
        const now = await txt(p, '[data-now]');
        const order = await p.evaluate(() => { const a = document.querySelector('[data-alert]'); const n = document.querySelector('[data-now]'); return a && n ? !!(a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) : null; });
        let all = [];
        const go = p.locator('[data-alert]').first(); if (await go.count()) { await go.click(); await p.waitForTimeout(600); all = await p.locator('[data-alert-row]').allInnerTexts();
          const sh = p.locator('[role=dialog]').filter({ hasText: 'Needs you today' }).last(); await sh.getByRole('button', { name: 'Done', exact: true }).first().click(); await p.waitForTimeout(500);
          if (await sh.isVisible().catch(() => false)) throw new Error('Needs you today did not close'); }
        const out = { line: line.slice(0, 140), aboveNow: order, rows: all.map((x) => x.replace(/\s+/g, ' ').slice(0, 80)), now: now.slice(0, 80) };
        if (!line || order !== true || !all.length) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('day-crew', async () => {
        const row = p.locator('[data-open-crew]').first(); const rowText = await txt(p, '[data-open-crew]');
        await row.scrollIntoViewIfNeeded(); await row.click(); await p.waitForTimeout(800);
        const crew = await p.locator('[data-crew-row]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 90)));
        const sends = await p.locator('[data-crew-send], [data-crew-text], [data-crew-email]').count();
        const brief = (await txt(p, '[data-crew-brief]')).slice(0, 120);
        const print = await p.locator('[data-crew-print]').getAttribute('href').catch(() => null);
        const shared = await p.evaluate(() => window.__shared || 0);
        await backToDay(p);
        const out = { row: rowText, crew, sendButtons: sends, brief, printHref: print, shared, blockedSoFar: [...new Set(r.blocked)] };
        if (!/day crew/i.test(rowText) || crew.length < 2 || shared) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('running-late', async () => {
        const beforeNext = await txt(p, '[data-now]');
        const late = p.locator('[data-late]').first(); await late.scrollIntoViewIfNeeded(); await late.click(); await p.waitForTimeout(600);
        const opts = await p.locator('[data-late-by]').allInnerTexts();
        const preview = (await txt(p, '[data-late-preview]')).slice(0, 260);
        const unchanged = JSON.stringify(await stored(p)) === plan0;
        await p.locator('[data-late-go]').first().click(); await p.waitForTimeout(900);
        const e = await stored(p);
        const arrival = (e.ros || []).find((x) => /arriv/i.test(x.segment || x.title || x.label || '')) || null;
        const tell = await p.locator('[data-late-tell]').count();
        const after = await txt(p, '[data-now]');
        const shared = await p.evaluate(() => window.__shared || 0);
        const out = { options: opts, preview, savedBeforeGo: !unchanged, rosEdited: !!e.rosEdited, arrival: arrival && (arrival.time + ' ' + (arrival.segment || '').slice(0, 30)), tellRow: tell, nowBefore: beforeNext.slice(0, 80), nowAfter: after.slice(0, 80), shared };
        if (!unchanged || !e.rosEdited || !opts.length || !preview || (arrival && arrival.time !== '15:00') || shared) throw new Error(JSON.stringify(out));
        return out;
      });
    }
    await cur.ctx.close();
    cur = await mk(T('2026-11-26', '13:05'));
    await step('counter-late', async () => {
      const p = cur.p; await open(p, TG_DAY);
      await p.locator('[data-open-counter]').first().click(); await p.waitForTimeout(600);
      const has = await p.locator('[data-counter] [data-late], [data-counter] button', { hasText: /Running late/ }).count();
      await p.getByRole('button', { name: 'Leave counter mode' }).click();
      if (!has) throw new Error('no Running late in counter mode');
      return { runningLateInCounter: has };
    });
    await cur.ctx.close();

    // #299 outdoor weather impact
    cur = await mk(T('2026-11-26', '10:00'));
    await step('outdoor-weather', async () => {
      const p = cur.p; await open(p, CRAB_DAY);
      const card = await txt(p, '[data-day-weather]');
      const impact = await txt(p, '[data-wx-impact]');
      const rp = await p.locator('[data-wx-rainplan]').count();
      const out = { card: card.slice(0, 200), impact: impact.slice(0, 160), setRainPlan: rp };
      if (!impact || !rp) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
