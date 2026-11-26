// #281/#288 The Day, #284 still-open parity (hostv2), #283 framed guest page, #285 links, #286 Design this page (hostv4).
//   node livecheck/hostv4-day-9009.cjs <outdir>
// Seeded E2E_TEST_ plans only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-day'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const DAY = '2026-11-26';
const AT = new Date('2026-11-26T10:00:00-05:00'); // 10 AM EST, before the 3 PM start
const sixDaysAgo = new Date(AT.getTime() - 6 * 864e5).toISOString();
const plan = (type, extra = {}) => ({ id: 'E2E_TEST_day-' + type.replace(/\W/g, '').toLowerCase(), type, name: 'E2E_TEST_ ' + type, date: DAY, startTime: '15:00', startTimeSource: 'host',
  timezone: 'America/New_York', guestCount: 12, guestEstimate: 12, guestMode: 'list', guests: [], vendors: [], budget: [], createdAt: sixDaysAgo, ...extra });
// #284: steps with known windows. Two were due before the plan existed (6 days ago), so the old banner dropped them.
const TL = [['a', -14], ['b', -10], ['c', -5], ['d', -3], ['e', -2], ['f', -1], ['g', 0], ['h', 3]].map(([k, lead], i) => ({ id: 'E2E_TEST_step-' + k, label: 'E2E_TEST_ step ' + k, leadDays: lead, done: i === 2 }));
const TG = plan('Thanksgiving', { timeline: TL });
const OTHER_TYPES = ['Birthday', 'Housewarming', 'Baby Shower', "New Year's Eve Party", 'Graduation Party', 'Friendsgiving'];
const INV = { id: 'E2E_TEST_lc-inv', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550,
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-25',
  location: '12 Example Lane, Springfield', guests: [{ id: 'gAda', name: 'Ada Pine', rsvp: '' }], vendors: [] };

const smallLinks = (p) => p.evaluate(() => [...document.querySelectorAll('a[href], button.link, .link')].filter((e) => e.getClientRects().length && !e.closest('[inert],[aria-hidden="true"]'))
  .map((e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30) }; })
  .filter((x) => x.w < 44 || x.h < 44));
const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

(async () => {
  const b = await chromium.launch(); const res = [];
  const mk = async (r, w, h, touch) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(6000);
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    return { ctx, p };
  };
  const seed = async (p, base, evs, last) => { await p.goto(base); await p.evaluate(([k, l, evs, last]) => { localStorage.clear();
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem(k, JSON.stringify(evs)); localStorage.setItem(l, last); }, [KEY, LAST, evs, last]); };
  // hostv2 stage navigation, mirroring hostv2/e2e/fixtures goToStage.
  const goToStage = async (p, label) => {
    const bar = p.locator('[data-tt-bar]');
    if (await bar.count()) { const btn = bar.getByRole('button', { name: label, exact: true }); if (await btn.count()) { await btn.first().click(); return 'bar'; } }
    const rail = p.locator('.srail [data-rail-stage]', { hasText: label }); if (await rail.count()) { await rail.first().click(); return 'rail'; }
    if (!(await p.locator('.sheet .navseg-b').count())) await p.locator('.ev-eyebrow').first().click();
    await p.locator('.navseg-b', { hasText: label }).first().click(); return 'menu';
  };
  const dayView = async (p, ev) => {
    await p.clock.setFixedTime(AT);
    await seed(p, ROOT + 'hostv2/?noanalytics=1', [ev], ev.id);
    await p.goto(ROOT + 'hostv2/?noanalytics=1&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
    const how = await goToStage(p, 'The Day'); await p.waitForTimeout(1200);
    const card = p.locator('.dayof-card');
    const cardText = (await card.count()) ? (await card.first().innerText()).replace(/\s+/g, ' ') : '';
    const rows = (await card.count()) ? await card.first().locator('.frow').evaluateAll((els) => els.map((e) => e.innerText.split('\n')[0].trim())) : [];
    const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    const moment = (/Worth a spot on the schedule: ([^]+?)(?: Add it|$)/.exec(body) || [])[1] || null;
    const stillOpen = (/(\d+) things? still open/.exec(body) || [])[1] || null;
    return { how, hasCard: !!cardText, eyebrow: cardText.slice(0, 40), rows, moment, stillOpen: stillOpen && Number(stillOpen), sideways: await sideways(p) };
  };

  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    let n = 0; let cur;
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 220); }
      try { await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };

    // ── hostv2 The Day ──
    cur = await mk(r, w, h, touch);
    await step('01-tg-the-day', async () => {
      const d = await dayView(cur.p, TG);
      const bad = [];
      if (!/Before guests arrive/.test(d.eyebrow)) bad.push('no "Before guests arrive" card');
      if (!d.rows.some((x) => /sober way home/i.test(x))) bad.push('no sober-way-home row');
      d.incident = await cur.p.evaluate(() => [...document.querySelectorAll('details')].map((e) => e.textContent.replace(/\s+/g, ' ')).filter((t) => /If something goes wrong/.test(t)).join(' ').slice(0, 900));
      if (!/Grease or grill fire/.test(d.incident)) bad.push('no "Grease or grill fire" under If something goes wrong');
      if (d.sideways > 0) bad.push('sideways ' + d.sideways);
      if (bad.length) throw new Error(bad.join('; ') + ' :: ' + JSON.stringify(d).slice(0, 400));
      r.tgDay = d; return d;
    });
    await step('02-still-open-parity', async () => {
      const p = cur.p; const day = r.tgDay ? r.tgDay.stillOpen : null;
      await goToStage(p, 'Plan'); await p.waitForTimeout(1200);
      for (let i = 0; i < 25; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(100); }
      const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      const m = /(\d+) still open(?: · (\d+) already handled)?/.exec(body.replace(/\d+ things? still open/g, ''));
      const lines = (body.match(/[^.]{0,40}(still open|nothing open|\d+ left)[^.]{0,40}/g) || []).slice(0, 6);
      const out = { theDay: day, checklist: m ? Number(m[1]) : null, handledByPlan: m && m[2] ? Number(m[2]) : 0, seededPastWindow: 6, lines };
      if (day == null || out.checklist == null) throw new Error('could not read both counts ' + JSON.stringify(out));
      if (day !== out.checklist) throw new Error('mismatch ' + JSON.stringify(out));
      return out;
    });
    if (w === 390) {
      await step('03-every-type', async () => {
        const out = {}; const bad = [];
        for (const t of OTHER_TYPES) {
          const d = await dayView(cur.p, plan(t));
          out[t] = { card: d.eyebrow.slice(0, 22), moment: d.moment, rides: d.rows.some((x) => /sober way home|ride/i.test(x)), fire: d.rows.some((x) => /grease|grill fire/i.test(x)), rows: d.rows.length };
          if (!d.hasCard) bad.push(t + ': no card');
        }
        out.Thanksgiving = { moment: r.tgDay && r.tgDay.moment };
        const ms = Object.values(out).map((x) => x.moment).filter(Boolean);
        if (new Set(ms).size < Math.min(ms.length, 4)) bad.push('moments mostly the same: ' + JSON.stringify(ms));
        if (bad.length) throw new Error(bad.join('; ') + ' :: ' + JSON.stringify(out).slice(0, 500));
        return { types: out };
      });
    }
    await cur.ctx.close();

    // ── hostv4 Your invite (#283, #285, #286) ──
    cur = await mk(r, w, h, touch);
    {
      const p = cur.p; const BASE = ROOT + 'hostv4/?noanalytics=1';
      await seed(p, BASE, [INV], INV.id);
      const plan0 = await p.evaluate((k) => localStorage.getItem(k), KEY);
      const navTo = async (name) => { const tab = p.getByRole('tab', { name }); if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
        const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
        await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click(); };
      await step('04-your-invite-framed', async () => {
        await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800);
        await navTo('Your plan'); await p.waitForTimeout(300);
        const row = p.locator('[data-plan-row="guests"]'); if (await row.count()) await row.first().click(); else await navTo('Guests');
        await p.waitForSelector('[data-view="guests"]'); await p.waitForTimeout(400);
        const inv = p.locator('[data-path] [data-step="invite"]'); await inv.scrollIntoViewIfNeeded(); await inv.click(); await p.waitForTimeout(500);
        if (!(await p.locator('iframe[data-invite-preview]').count())) { const b2 = p.getByRole('button', { name: /Your invite/ }); if (await b2.count()) { await b2.first().click(); await p.waitForTimeout(500); } }
        const fr = p.locator('iframe[data-invite-preview]'); await fr.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
        const src = await fr.getAttribute('src');
        const f = p.frames().find((x) => /invite-preview=/.test(x.url()));
        if (!f) throw new Error('frame not loaded, src=' + src);
        await f.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
        const ftext = (await f.locator('body').innerText()).replace(/\s+/g, ' ');
        const fside = await f.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        const showsPlan = /Rosa/.test(ftext);
        const nothing = /nothing to preview/.test(ftext);
        if (!showsPlan || nothing) throw new Error('frame does not show the plan: ' + ftext.slice(0, 200));
        if (fside > 0) throw new Error('frame sideways ' + fside);
        return { src, frameText: ftext.slice(0, 160), frameSideways: fside, pageSideways: await sideways(p), smallLinks: await smallLinks(p) };
      });
      await step('05-see-full-invite', async () => {
        const btn = p.getByRole('button', { name: 'See the full invite' }); if (!(await btn.count())) return { skipped: 'no See the full invite' };
        await btn.click(); await p.waitForTimeout(500);
        const full = await p.locator('[data-preview-frame]').getAttribute('data-full');
        await p.getByRole('button', { name: 'Show less' }).click(); await p.waitForTimeout(300);
        return { full, smallLinks: await smallLinks(p), pageSideways: await sideways(p) };
      });
      await step('06-design-this-page', async () => {
        const d = p.locator('[data-open-design]'); await d.scrollIntoViewIfNeeded(); await d.click(); await p.waitForTimeout(700);
        const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
        if (!/Design this page/.test(body)) throw new Error('Design this page did not open');
        const back = await p.locator('button, a').filter({ hasText: /^‹?\s*Your invite$/ }).count();
        const links = await smallLinks(p); const side = await sideways(p);
        const changed = (await p.evaluate((k) => localStorage.getItem(k), KEY)) !== plan0;
        if (changed) throw new Error('opening Design this page changed the plan');
        return { text: body.slice(0, 220), backSaysYourInvite: back > 0, smallLinks: links, pageSideways: side };
      });
      await step('07-links-44', async () => {
        const all = [];
        for (const name of ['Your plan', 'Next step']) { try { await navTo(name); await p.waitForTimeout(500); all.push(...(await smallLinks(p)).map((x) => name + ': ' + JSON.stringify(x))); } catch {} }
        for (const s of r.steps) for (const x of (s.smallLinks || [])) all.push(s.name + ': ' + JSON.stringify(x));
        if (all.length) throw new Error('links under 44: ' + all.slice(0, 6).join(' | '));
        return { checked: 'invite, full invite, design, plan, next step' };
      });
      r.planUnchanged = (await p.evaluate((k) => localStorage.getItem(k), KEY)) === plan0;
    }
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) {
    console.log(`\n${r.vp} console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length} planUnchanged:${r.planUnchanged}`);
    for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''}`);
  }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]); console.log('blocked:', [...new Set(res.flatMap((r) => r.blocked))]);
})();
