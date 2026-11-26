// #301 B6 who's here + at the table, hostv4 The Day.
//   node livecheck/here-9940.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. "Text" links are read, never tapped. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-here'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const T = (hm) => new Date('2026-11-26T' + hm + ':00-05:00');
const EV = { id: 'E2E_TEST_here', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [
    { id: 'g-ada', name: 'Ada Pine', rsvp: 'Yes', phone: '(202) 555-0101', diets: ['Vegetarian'] },
    { id: 'g-ben', name: 'Ben Oak', rsvp: 'Yes', allergens: ['Tree nuts'] },
    { id: 'g-cy', name: 'Cy Fern', rsvp: 'Yes', diets: ['Vegetarian'] },
    { id: 'g-dee', name: 'Dee Ash', rsvp: 'Maybe' },
    { id: 'g-eli', name: 'Eli Elm', rsvp: 'No', diets: ['Gluten-free'] },
  ] };
const COUNT = { ...EV, id: 'E2E_TEST_here-count', guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [] };

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
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60, fullPage: true }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const open = async (p, ev) => { await p.goto(ROOT + 'hostv4/?noanalytics=1'); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(ROOT + 'hostv4/?noanalytics=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
      const tab = p.getByRole('tab', { name: 'The Day' }); if ((await tab.count()) && (await tab.first().isVisible())) await tab.first().click();
      else { const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); } await p.locator('aside[aria-label="Places"] button', { hasText: 'The Day' }).first().click(); }
      await p.waitForTimeout(1800); };
    const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0], KEY);
    const body = async (p) => (await p.locator('main, body').first().innerText()).replace(/\s+/g, ' ');

    cur = await mk(T('15:20'));
    {
      const p = cur.p;
      await step('here-list', async () => {
        await open(p, EV);
        const t = await body(p);
        const head = (/Who[’']s here[^A-Z]{0,30}\d+ of \d+/.exec(t) || [])[0] || null;
        const rows = await p.locator('[data-here-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-here-row')));
        const texts = await p.locator('[data-here-text]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        const maybe = /Dee Ash/.test(t);
        const noGuestListed = rows.includes('g-eli');
        const needs = await p.locator('[data-table-need]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
        const out = { head, rows, textHrefs: texts, maybeNamed: maybe, needs };
        const bad = [];
        if (!head || !/0 of 3/.test(head)) bad.push('heading');
        if (rows.join() !== 'g-ada,g-ben,g-cy') bad.push('rows');
        if (noGuestListed) bad.push('a "no" guest listed');
        if (texts.length !== 1 || !/^sms:\+?1?2025550101$/.test(texts[0])) bad.push('text link');
        if (!maybe) bad.push('maybe not named');
        if (needs.some((x) => /Gluten/i.test(x) && /Eli/.test(x))) bad.push('a "no" guest at the table');
        if (!needs.some((x) => /Vegetarian/i.test(x) && /Ada/.test(x) && /Cy/.test(x))) bad.push('vegetarian group');
        if (!needs.some((x) => /nut/i.test(x) && /Ben/.test(x))) bad.push('nut need');
        if (bad.length) throw new Error(bad.join(', ') + ' :: ' + JSON.stringify(out));
        return out;
      });
      await step('tap-in-and-undo', async () => {
        await p.locator('[data-here-row="g-ada"] [data-tick]').click(); await p.waitForTimeout(600);
        const e1 = await stored(p); const ada1 = e1.guests.find((g) => g.id === 'g-ada');
        const t1 = await body(p); const headAfter = (/Who[’']s here[^A-Z]{0,30}\d+ of \d+/.exec(t1) || [])[0];
        const hereRow = await p.locator('[data-here-done]').innerText().catch(() => '');
        await p.locator('[data-here-done]').click(); await p.waitForTimeout(400);
        await p.locator('[data-here-row="g-ada"] [data-tick]').click(); await p.waitForTimeout(600);
        const e2 = await stored(p); const ada2 = e2.guests.find((g) => g.id === 'g-ada');
        const out = { checkedIn: ada1.checkedIn || null, headAfter, hereRow: hereRow.replace(/\s+/g, ' '), afterUndo: ada2.checkedIn || null, otherFieldsKept: ada2.phone === '(202) 555-0101' && e2.guests.length === 5 };
        if (!ada1.checkedIn || !/1 of 3/.test(headAfter || '') || !/1 here/.test(out.hereRow) || ada2.checkedIn || !out.otherFieldsKept) throw new Error(JSON.stringify(out));
        return out;
      });
    }
    await cur.ctx.close();
    cur = await mk(T('14:00'));
    await step('not-before-doors', async () => {
      const p = cur.p; await open(p, EV); const rows = await p.locator('[data-here-row]').count(); const t = await body(p);
      if (rows || /Who[’']s here/.test(t)) throw new Error('shown before 3 PM: rows=' + rows);
      return { rows };
    });
    await cur.ctx.close();
    cur = await mk(T('15:20'));
    await step('not-for-headcount', async () => {
      const p = cur.p; await open(p, COUNT); const rows = await p.locator('[data-here-row]').count(); const t = await body(p);
      if (rows || /Who[’']s here/.test(t)) throw new Error('shown for a headcount plan: rows=' + rows);
      return { rows };
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
