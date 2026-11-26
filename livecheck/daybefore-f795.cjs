// #295 the day before (hostv4 The Day, 4:00 PM the evening before) and the shared tick (lib/stepToggle) in both shells.
//   node livecheck/daybefore-f795.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; GET /api/weather/* answered locally; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-db'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const EVE = new Date('2026-11-25T16:00:00-05:00');
const TG = { id: 'E2E_TEST_db-tg', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', createdAt: '2026-11-01T12:00:00Z',
  guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', venueKind: 'home', venueCity: 'Washington', venueState: 'DC', guests: [], budget: [],
  vendors: [{ id: 'v1', name: 'E2E_TEST_ Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked' }],
  timeline: [
    { id: 'E2E_TEST_a', task: 'Cook the make-ahead dishes', leadDays: -1, done: false },
    { id: 'E2E_TEST_b', task: 'Do the shopping', leadDays: -1, done: false },
    { id: 'E2E_TEST_c', task: 'Order the turkey', leadDays: -14, done: true },
  ] };
const TG_LIST = { ...TG, id: 'E2E_TEST_db-tg2', guestMode: 'list', guestCount: undefined, guestEstimate: undefined, guestCountSource: undefined, guests: [{ id: 'g1', name: 'Ada Pine', rsvp: 'Pending' }] };
const GN = { id: 'E2E_TEST_db-gn', name: 'E2E_TEST_ Game Night', type: 'Game Night', date: '2026-11-30', createdAt: new Date(EVE.getTime() - 6 * 864e5).toISOString(),
  venue: 'Home', venueKind: 'home', venueConfirmed: true, venueCity: 'Baltimore', venueState: 'MD', startTime: '19:00', guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', vendors: [], guests: [],
  dietaryNoted: true, foodChoices: { game_type: 'Board games', food_model: 'Host provides snacks', drinks: 'Beer/wine/soda only', sourcing: 'cook' }, totalBudget: 400, budget: [], rainPlan: 'Indoors',
  timeline: [{ id: 'E2E_TEST_shop', task: 'Do the shopping', leadDays: -7, week: '1 week out', done: false, owner: '', category: 'planning', phase: 'food' }] };
const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.route('**/api/weather/geocode**', (rt) => rt.fulfill({ json: { result: { lat: 38.9, lon: -77.04 } } }));
      await ctx.route('**/api/weather/onecall**', (rt) => rt.fulfill({ json: { timezone_offset: -18000, hourly: [], daily: [{ dt: Math.floor(new Date('2026-11-26T12:00:00-05:00').getTime() / 1000), ...RAIN }] } }));
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(clock);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 320); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, shell, ev) => { await p.goto(ROOT + shell + '/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(ROOT + shell + '/?noanalytics=1' + (shell === 'hostv2' ? '&elegant=1' : ''), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500); };
    const v4Nav = async (p, name) => { const tab = p.getByRole('tab', { name }); if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
      const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
      await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click(); };
    const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY);
    const toastText = (p) => p.evaluate(() => [...document.querySelectorAll('[role=status], .toast, [aria-live]')].map((e) => e.innerText).join(' ').replace(/\s+/g, ' ').trim());

    // hostv4 the evening before
    cur = await mk(EVE);
    {
      const p = cur.p;
      await step('v4-evening-before', async () => {
        await seed(p, 'hostv4', TG); await v4Nav(p, 'The Day'); await p.waitForTimeout(2000);
        const subs = (await p.locator('.sub').allInnerTexts()).map((x) => x.trim()); const sub = subs.find((x) => /^Tomorrow/.test(x)) || subs.join(' | ');
        const tonight = await p.locator('[data-tonight] [data-check]').allInnerTexts();
        const btn = (await p.locator('.action .primary').first().innerText().catch(() => '')).trim();
        const rows = await p.locator('[data-before-tomorrow] [data-db-row]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-db-row'), tag: e.tagName, href: e.getAttribute('href'), text: e.innerText.replace(/\s+/g, ' ').slice(0, 60), underline: getComputedStyle(e).textDecorationLine })));
        const wx = (await p.locator('[data-day-weather]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90);
        const out = { sub, tonight, btn, rows, wx };
        const bad = [];
        if (sub !== 'Tomorrow · guests at 3:00 PM') bad.push('sub');
        if (tonight.join('|') !== 'Cook the make-ahead dishes|Do the shopping') bad.push('tonight');
        if (btn !== 'Done: cook the make-ahead dishes') bad.push('button');
        if (!rows.length) bad.push('no before-tomorrow rows');
        if (rows.some((x) => x.id !== 'count' && x.href !== '../hostv2/')) bad.push('a v2 row without ../hostv2/');
        if (rows.some((x) => /underline/.test(x.underline))) bad.push('underlined row');
        if (bad.length) throw new Error(bad.join(', ') + ' :: ' + JSON.stringify(out));
        return out;
      });
      await step('v4-tonight-ticks', async () => {
        await p.locator('.action .primary').first().click(); await p.waitForTimeout(700);
        const t1 = await toastText(p); const e1 = await stored(p);
        const shop = p.locator('[data-tonight] [data-check]', { hasText: 'Do the shopping' }).first(); await shop.scrollIntoViewIfNeeded(); await shop.click(); await p.waitForTimeout(700);
        const t2 = await toastText(p); const e2 = await stored(p);
        const got = Object.keys(e2.foodGot || {}).length;
        const out = { firstDone: e1.timeline[0].done, toast1: t1.slice(0, 120), shopDone: e2.timeline[1].done, foodGotMarked: got, toast2: t2.slice(0, 160), tonightLeft: await p.locator('[data-tonight]').count(), button: await p.locator('.action .primary').count() };
        if (!e1.timeline[0].done || !/Done: Cook the make-ahead/.test(t1) || !e2.timeline[1].done || !got || !/marked bought/.test(t2)) throw new Error(JSON.stringify(out));
        return out;
      });
    }
    await cur.ctx.close();

    cur = await mk(EVE);
    await step('v4-count-opens-guests', async () => {
      const p = cur.p; await seed(p, 'hostv4', TG_LIST); await v4Nav(p, 'The Day'); await p.waitForTimeout(1800);
      const c = p.locator('[data-db-row="count"]'); const text = (await c.innerText()).replace(/\s+/g, ' ');
      await c.scrollIntoViewIfNeeded(); await c.click(); await p.waitForTimeout(800);
      const guests = await p.locator('[data-view="guests"]').count();
      if (!/Final guest count/.test(text) || !guests) throw new Error(JSON.stringify({ text, guests }));
      return { text, guestsOpened: guests };
    });
    await cur.ctx.close();

    // hostv2: the board's "Mark done" on a late shopping step, through the moved toggle
    cur = await mk(EVE);
    await step('v2-tick-unchanged', async () => {
      const p = cur.p; await seed(p, 'hostv2', GN);
      const card = p.locator('[id="card-decision:E2E_TEST_shop"]'); await card.waitFor({ timeout: 10000 });
      await card.locator('[data-mark-step-done]').click(); await p.waitForTimeout(900);
      const e = await stored(p); const t = await toastText(p);
      const out = { done: e.timeline[0].done, foodGotMarked: Object.keys(e.foodGot || {}).length, toast: t.slice(0, 200), cardGone: !(await card.count()) };
      if (!out.done || !out.foodGotMarked || !out.cardGone) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
