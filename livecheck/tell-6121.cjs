// #304 B4 tell your guests (hostv4 The Day): Send the details, Parking note (only with a place), Updates; editable draft; Copy off while [ ] blanks remain; every sheet closes on Escape.
//   node livecheck/tell-6121.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. Copy and Updates are never tapped. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = 'https://twillis45.github.io/ngw-event-planner/';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-tell'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const BASE = { name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g-ada', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'g-ben', name: 'Ben Oak', rsvp: 'Pending' }] };
const PLACE = { ...BASE, id: 'E2E_TEST_tell', venue: '12 Example Lane, Springfield', venueAddress: '12 Example Lane, Springfield' };
const NOPLACE = { ...BASE, id: 'E2E_TEST_tell-noplace' };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async (clock) => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => { window.__shared = (window.__shared || 0) + 1; }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { window.__copied = (window.__copied || 0) + 1; } }, configurable: true }); } catch {} window.open = () => null; });
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
      await p.waitForTimeout(1800); };
    const sheets = (p) => p.locator('[role=dialog]:visible').count();

    cur = await mk(new Date('2026-11-26T09:00:00-05:00'));
    {
      const p = cur.p; let plan0;
      await step('tell-sheet', async () => {
        await open(p, PLACE); plan0 = await p.evaluate((k) => localStorage.getItem(k), KEY);
        const t = p.locator('[data-tell]').first(); await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(500);
        const out = { brief: await p.locator('[data-tell-brief]').count(), parking: await p.locator('[data-tell-parking]').count(), updates: await p.locator('[data-tell-updates]').count() };
        if (!out.brief || !out.parking || !out.updates) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('parking-draft', async () => {
        await p.locator('[data-tell-parking]').click(); await p.waitForTimeout(500);
        const ta = p.locator('[data-tell-text]'); const v0 = await ta.inputValue();
        const blanks0 = (v0.match(/\[[^\]]*\]/g) || []);
        const dis0 = await p.locator('[data-tell-copy]').isDisabled();
        const filled = v0.replace(/\[[^\]]*\]/g, 'the driveway');
        await ta.fill(filled); await p.waitForTimeout(300);
        const dis1 = await p.locator('[data-tell-copy]').isDisabled();
        const out = { draft: v0.replace(/\s+/g, ' ').slice(0, 200), blanks: blanks0, copyDisabledWithBlanks: dis0, copyDisabledAfterFill: dis1, copied: await p.evaluate(() => window.__copied || 0) };
        if (!blanks0.length || !dis0 || dis1 || out.copied) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('escape-closes', async () => {
        const before = await sheets(p); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
        let after = await sheets(p); let presses = 1;
        while (after > 0 && presses < 3) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); after = await sheets(p); presses++; }
        const changed = (await p.evaluate((k) => localStorage.getItem(k), KEY)) !== plan0;
        const out = { sheetsBefore: before, sheetsAfter: after, escapes: presses, planChanged: changed, shared: await p.evaluate(() => window.__shared || 0) };
        if (before < 1 || after !== 0 || changed || out.shared) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('brief-draft', async () => {
        await p.locator('[data-tell]').first().click(); await p.waitForTimeout(400);
        await p.locator('[data-tell-brief]').click(); await p.waitForTimeout(1500);
        const ta = p.locator('[data-tell-text]'); const v = await ta.inputValue().catch(() => '');
        const sheetText = (await p.locator('[role=dialog]:visible').last().innerText()).replace(/\s+/g, ' ');
        await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
        const out = { draft: v.replace(/\s+/g, ' ').slice(0, 220), sheet: sheetText.slice(0, 220), copyDisabled: await p.locator('[data-tell-copy]').isDisabled().catch(() => null), openSheets: await sheets(p) };
        // Signed out (no account here), the details wait for the reply link: the sheet says to sign in in the current app. That is correct.
        if (!v && !/Sign in once in the current app/.test(sheetText)) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('other-sheets-escape', async () => {
        const res2 = {};
        for (const [name, sel] of [['run', '[data-open-run]'], ['counter', '[data-open-counter]']]) {
          const o = p.locator(sel).first(); if (!(await o.count())) { res2[name] = 'absent'; continue; }
          await o.scrollIntoViewIfNeeded(); await o.click(); await p.waitForTimeout(500);
          await p.keyboard.press('Escape'); await p.waitForTimeout(500);
          res2[name] = { dialogsOpen: await sheets(p), counterOpen: await p.locator('[data-counter]').first().isVisible().catch(() => false) };
          const back = p.locator('button:not(aside button)').filter({ hasText: /^\W*The Day$/ }).first(); if (await back.isVisible().catch(() => false)) { await back.click(); await p.waitForTimeout(400); }
          const leave = p.getByRole('button', { name: 'Leave counter mode' }); if (await leave.isVisible().catch(() => false)) { await leave.click(); await p.waitForTimeout(300); }
        }
        return { res: res2 };
      });
    }
    await cur.ctx.close();
    cur = await mk(new Date('2026-11-26T09:00:00-05:00'));
    await step('no-place-no-parking', async () => {
      const p = cur.p; await open(p, NOPLACE); await p.locator('[data-tell]').first().click(); await p.waitForTimeout(400);
      const out = { parking: await p.locator('[data-tell-parking]').count(), brief: await p.locator('[data-tell-brief]').count() };
      if (out.parking || !out.brief) throw new Error(JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
