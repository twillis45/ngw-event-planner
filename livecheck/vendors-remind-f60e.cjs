// #305 B9 vendors on the day (hostv4 + hostv2 "They're here"), #306 reminders in the calendar (hostv4 .ics).
//   node livecheck/vendors-remind-f60e.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed.
// "Call" (tel:) and "Send the details" are read, never tapped. The .ics is saved to the run folder, not opened or imported. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-vr'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const AT = new Date('2026-11-26T13:30:00-05:00');
const EV = { id: 'E2E_TEST_vr', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [], budget: [], timeline: [],
  vendors: [
    { id: 'v-cat', name: 'E2E_TEST_ Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '13:00', phone: '(202) 555-0199', cost: 400 },
    { id: 'v-rent', name: 'E2E_TEST_ Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '14:30', cost: 150 },
  ] };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async () => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York', acceptDownloads: true });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => { window.__shared = (window.__shared || 0) + 1; }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(AT);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, shell) => { await p.goto(ROOT + shell + '/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, EV]);
      await p.goto(ROOT + shell + '/?noanalytics=1' + (shell === 'hostv2' ? '&elegant=1' : ''), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500); };
    const v4Day = async (p) => { const tab = p.getByRole('tab', { name: 'The Day' }); if ((await tab.count()) && (await tab.first().isVisible())) await tab.first().click();
      else { const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); } await p.locator('aside[aria-label="Places"] button', { hasText: 'The Day' }).first().click(); }
      await p.waitForTimeout(1800); };
    const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY);
    const closeSheet = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(400); };

    cur = await mk();
    {
      const p = cur.p;
      await step('v4-vendors', async () => {
        await seed(p, 'hostv4'); await v4Day(p);
        const rows = await p.locator('[data-vendor-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-vendor-row') + ': ' + e.innerText.replace(/\s+/g, ' ')));
        const calls = await p.locator('[data-vendor-call]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        const alert = (await p.locator('[data-alert]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const out = { rows, calls, alert };
        if (rows.length !== 2 || !rows[0].startsWith('v-cat') || calls.join() !== 'tel:2025550199') throw new Error(JSON.stringify(out));
        return out;
      });
      await step('v4-vendor-here-late', async () => {
        await p.locator('[data-vendor-row="v-cat"] [data-vendor-open]').click(); await p.waitForTimeout(500);
        const brief = await p.locator('[data-vendor-brief]').getAttribute('href').catch(() => null);
        await p.locator('[data-vendor-here]').click(); await p.waitForTimeout(600);
        await p.locator('[data-vendor-row="v-rent"] [data-vendor-open]').click(); await p.waitForTimeout(500);
        await p.locator('[data-vendor-late]').click(); await p.waitForTimeout(600);
        const e = await stored(p); const st = Object.fromEntries(e.vendors.map((v) => [v.id, v.arrivalStatus || null]));
        const rows = await p.locator('[data-vendor-row]').evaluateAll((els) => els.map((x) => x.innerText.replace(/\s+/g, ' ')));
        const alert = (await p.locator('[data-alert]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const callsLeft = await p.locator('[data-vendor-call]').count();
        const out = { briefHref: brief, status: st, rows, alertAfter: alert, callLinksAfter: callsLeft };
        if (st['v-cat'] !== 'arrived' || st['v-rent'] !== 'delayed' || brief !== '../hostv2/' || callsLeft !== 0) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('v4-reminders', async () => {
        const o = p.locator('[data-open-remind]').first(); await o.scrollIntoViewIfNeeded(); await o.click(); await p.waitForTimeout(500);
        const rows = await p.locator('[data-remind-row]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
        const btn = (await p.locator('[data-remind-add]').innerText()).trim();
        const n10 = Number((/Add (\d+)/.exec(btn) || [])[1]);
        const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-remind-add]').click()]);
        const f = path.join(dir, 'reminders-10.ics'); await dl.saveAs(f); const ics = fs.readFileSync(f, 'utf8');
        await p.locator('[data-remind-lead="0"]').click(); await p.waitForTimeout(200);
        const [dl0] = await Promise.all([p.waitForEvent('download'), p.locator('[data-remind-add]').click()]);
        const f0 = path.join(dir, 'reminders-0.ics'); await dl0.saveAs(f0); const ics0 = fs.readFileSync(f0, 'utf8');
        const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
        const trig10 = [...new Set(ics.match(/TRIGGER[^\r\n]*/g) || [])]; const trig0 = [...new Set(ics0.match(/TRIGGER[^\r\n]*/g) || [])];
        const starts = (ics.match(/DTSTART[^\r\n]*/g) || []);
        const sums = (ics.match(/SUMMARY:[^\r\n]*/g) || []).map((s) => s.slice(8));
        const sorted = starts.map((s) => s.replace(/\D/g, '').slice(-14)).every((v, i, a) => !i || a[i - 1] <= v);
        await closeSheet(p);
        const out = { button: btn, firstRows: rows, events, trig10, trig0, firstStarts: starts.slice(0, 3), lastStart: starts[starts.length - 1], summaries: sums.slice(0, 20), inTimeOrder: sorted, filename: dl.suggestedFilename(), arrivals: sums.filter((s) => /due|arriv|guest/i.test(s)) };
        // #311: steps already past (before 1:30 PM on the screen's clock) are left out.
        const past = starts.filter((x) => (x.replace(/\D/g, '').slice(-14)) < '20261126133000');
        out.pastIncluded = past;
        if (past.length) throw new Error('past steps included :: ' + JSON.stringify(out));
        if (!n10 || events !== n10 || !trig10.some((t) => /-PT10M/.test(t)) || trig0.some((t) => /10M/.test(t)) || !sorted) throw new Error(JSON.stringify(out));
        return out;
      });
    }
    await cur.ctx.close();

    cur = await mk();
    await step('v2-theyre-here', async () => {
      const p = cur.p; await seed(p, 'hostv2');
      const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: 'The Day', exact: true }).count()) await bar.getByRole('button', { name: 'The Day', exact: true }).first().click();
      else { const rail = p.locator('.srail [data-rail-stage]', { hasText: 'The Day' }); if (await rail.count()) await rail.first().click(); else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'The Day' }).first().click(); } }
      await p.waitForTimeout(1500);
      const btn = p.getByRole('button', { name: /They[’']re here/ }).first();
      const count = await p.getByRole('button', { name: /They[’']re here/ }).count();
      const ctx = (await btn.evaluate((e) => (e.closest('.card, .later-row, section, div') || e).innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => ''));
      await btn.click(); await p.waitForTimeout(800);
      const e = await stored(p);
      const out = { buttons: count, context: ctx, status: Object.fromEntries(e.vendors.map((v) => [v.id, v.arrivalStatus || null])) };
      if (!count || e.vendors.find((v) => v.id === 'v-cat').arrivalStatus !== 'arrived') throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
