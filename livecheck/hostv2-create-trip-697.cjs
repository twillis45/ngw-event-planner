// #287 Create builds an event from a sentence (lib/eventFromSentence), #290 day 2 of a trip has its alerts. hostv2.
//   node livecheck/hostv2-create-trip-697.cjs <outdir>
// localStorage only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Made-up names. Nothing sent.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-create'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const SENTENCES = [
  { s: 'Baby shower for my sister Ada on March 20 2027 for 30 people', type: /Baby Shower/, date: '2027-03-20', n: 30 },
  { s: 'Thanksgiving dinner on November 25 2027 for 12', type: /Thanksgiving/, date: '2027-11-25', n: 12 },
  { s: 'Crab feast on July 10 2027 for 40 guests', type: /Crab Feast/, date: '2027-07-10', n: 40 },
  { s: 'Birthday party for Ben Oak on January 4 2027 for 25 people', type: /Birthday/, date: '2027-01-04', n: 25 },
];
const TRIP = { id: 'E2E_TEST_trip-alerts', type: 'Group Trip', name: 'E2E_TEST_ Trip', date: '2027-05-13', endDate: '2027-05-15', guestCount: 8, rosEdited: true,
  ros: [{ id: 'r1', day: 1, time: '11:00', segment: 'Check in' }, { id: 'r2', day: 2, time: '10:00', segment: 'Brunch' }, { id: 'r3', day: 2, time: '14:00', segment: 'Boat tour' }, { id: 'r4', day: 3, time: '10:00', segment: 'Check out' }],
  vendors: [{ id: 'vb', name: 'E2E_TEST_ Harbor Boats', category: 'Activities', status: 'Booked', cost: 600, balancePaid: false, payDueDate: '2027-05-14' }], guests: [], budget: [], timeline: [] };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0;
    const mk = async () => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(8000);
      p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
      p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
      p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
      return { ctx, p };
    };
    let cur;
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 260); }
      try { await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };

    const list = w === 390 ? SENTENCES : SENTENCES.slice(0, 1);
    for (const [i, c] of list.entries()) {
      cur = await mk();
      await step('create-' + (i + 1), async () => {
        const p = cur.p;
        await p.goto(BASE); await p.evaluate(() => localStorage.clear());
        await p.goto(BASE + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {});
        await p.getByRole('button', { name: 'Start my event' }).first().click();
        await p.getByPlaceholder(/crab feast/i).first().fill(c.s); await p.waitForTimeout(400);
        await p.getByRole('button', { name: /^Put my plan together$/ }).click();
        const open = p.getByRole('button', { name: 'Open my plan (not saved yet)' });
        await open.waitFor({ timeout: 20000 });
        const reveal = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
        await open.click(); await p.waitForTimeout(2500);
        const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
        const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length);
        const [y, m, d] = c.date.split('-').map(Number);
        const mon = new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short' });
        const monLong = new Date(y, m - 1, d).toLocaleString('en-US', { month: 'long' });
        const dateRe = new RegExp('(' + mon + '|' + monLong + ')\\w*\\.? ' + d + '\\b', 'i');
        const got = { typeOnReveal: c.type.test(reveal), guestsOnReveal: new RegExp('\\b' + c.n + ' guests').test(reveal), dateOnPlan: dateRe.test(body), typeOnPlan: c.type.test(body), guestsOnPlan: new RegExp('\\b' + c.n + '\\b').test(body), savedInThisBrowser: stored };
        const bad = Object.entries(got).filter(([k, v]) => k !== 'savedInThisBrowser' && !v).map(([k]) => k);
        // A new plan is kept in this browser before Keep (local only; Keep asks to sign in). Informational.
        const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (side > 0) bad.push('sideways ' + side);
        if (bad.length) throw new Error(c.s + ' → ' + bad.join(', ') + ' :: ' + body.slice(0, 300));
        return { sentence: c.s, got, sideways: side };
      });
      await cur.ctx.close();
    }

    cur = await mk();
    await step('trip-day2-alerts', async () => {
      const p = cur.p;
      await p.clock.setFixedTime(new Date('2027-05-14T09:00:00-04:00'));
      await p.goto(BASE); await p.evaluate((t) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
        localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([t])); localStorage.setItem('ngw-hostv2-last-event', t.id); }, TRIP);
      await p.goto(BASE + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
      const bar = p.locator('[data-tt-bar]');
      if (await bar.count() && await bar.getByRole('button', { name: 'The Day', exact: true }).count()) await bar.getByRole('button', { name: 'The Day', exact: true }).first().click();
      else { const rail = p.locator('.srail [data-rail-stage]', { hasText: 'The Day' }); if (await rail.count()) await rail.first().click(); else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'The Day' }).first().click(); } }
      await p.waitForTimeout(1500);
      const brunch = await p.getByRole('heading', { name: 'Brunch', level: 2 }).count();
      const pay = await p.getByText('Payment due today: E2E_TEST_ Harbor Boats').count();
      const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (!brunch || !pay || side > 0) throw new Error(JSON.stringify({ brunchHeading: brunch, paymentAlert: pay, sideways: side }));
      return { brunchHeading: brunch, paymentAlert: pay, sideways: side };
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''}`); }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]); console.log('blocked:', [...new Set(res.flatMap((r) => r.blocked))]);
})();
