// #303 B7 moments: hostv4 The Day "Worth a spot" (time defaults to the next step, Add saves it timed), and hostv2's "Add it" on day 2 of a trip keeps the other days.
//   node livecheck/moments-0363.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-moments'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const TG = { id: 'E2E_TEST_mo-tg', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [] };
const TRIP = { id: 'E2E_TEST_mo-trip', type: 'Group Trip', name: 'E2E_TEST_ Trip', date: '2027-05-13', endDate: '2027-05-15', guestCount: 8, rosEdited: true,
  ros: [{ id: 'r1', day: 1, time: '11:00', segment: 'Check in' }, { id: 'r2', day: 2, time: '10:00', segment: 'Brunch' }, { id: 'r3', day: 2, time: '14:00', segment: 'Boat tour' }, { id: 'r4', day: 3, time: '10:00', segment: 'Check out' }],
  vendors: [], guests: [], budget: [], timeline: [] };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(clock);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, shell, ev) => { await p.goto(ROOT + shell + '/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(ROOT + shell + '/?noanalytics=1' + (shell === 'hostv2' ? '&elegant=1' : ''), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500); };
    const v4Day = async (p) => { const tab = p.getByRole('tab', { name: 'The Day' }); if ((await tab.count()) && (await tab.first().isVisible())) await tab.first().click();
      else { const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); } await p.locator('aside[aria-label="Places"] button', { hasText: 'The Day' }).first().click(); }
      await p.waitForTimeout(1800); };
    const v2Day = async (p) => { const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: 'The Day', exact: true }).count()) return bar.getByRole('button', { name: 'The Day', exact: true }).first().click();
      const rail = p.locator('.srail [data-rail-stage]', { hasText: 'The Day' }); if (await rail.count()) return rail.first().click();
      await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'The Day' }).first().click(); };
    const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY);

    cur = await mk(new Date('2026-11-26T15:08:00-05:00'));
    await step('v4-moment', async () => {
      const p = cur.p; await seed(p, 'hostv4', TG); await v4Day(p);
      const row = p.locator('[data-moment]').first(); const label = (await row.innerText()).replace(/\s+/g, ' ');
      const next = ((await p.locator('[data-now]').first().innerText().catch(() => '')).match(/Next at (\d+:\d+ [AP]M)/) || [])[1] || null;
      await row.scrollIntoViewIfNeeded(); await row.click(); await p.waitForTimeout(600);
      const time = await p.locator('[data-moment-time]').inputValue();
      await p.locator('[data-moment-add]').click(); await p.waitForTimeout(800);
      const e = await stored(p); const added = (e.ros || []).filter((x) => /^m-/.test(String(x.id)));
      const runText = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      const out = { label, nextStep: next, defaultTime: time, added: added.map((x) => ({ id: x.id, time: x.time, seg: (x.segment || x.title || '').slice(0, 30) })), rosEdited: !!e.rosEdited, rowGoneOrNext: (await p.locator('[data-moment]').first().innerText().catch(() => '(none)')).replace(/\s+/g, ' ') };
      if (!/Worth a spot/.test(label) || !time || added.length !== 1 || added[0].time !== time || !e.rosEdited) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();

    cur = await mk(new Date('2027-05-14T09:00:00-04:00'));
    await step('v2-trip-day2-add', async () => {
      const p = cur.p; await seed(p, 'hostv2', TRIP); await v2Day(p); await p.waitForTimeout(1500);
      const row = p.locator('.later-row', { hasText: 'Worth a spot on the schedule' }).first();
      const label = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (!label) throw new Error('no "Worth a spot" row on trip day 2');
      await row.getByRole('button', { name: 'Add it' }).click(); await p.waitForTimeout(900);
      const e = await stored(p); const ids = (e.ros || []).map((x) => x.id);
      const out = { label, ids, kept: ['r1', 'r2', 'r3', 'r4'].every((id) => ids.includes(id)), added: (e.ros || []).filter((x) => /^m-/.test(String(x.id))).map((x) => x.id + ' day ' + x.day) };
      if (!out.kept || out.added.length !== 1) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
