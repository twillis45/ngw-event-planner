// hostv4 reply-by (PR #269) probe at a phone and an iPad size, on seeded E2E_TEST_ plans. Writes aborted.
//   node livecheck/hostv4-replyby.cjs <outdir>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-replyby'); fs.mkdirSync(OUT, { recursive: true });
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const base = { type: 'Birthday', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550, guestEstimate: 20, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', guests: [], vendors: [] };
const FAR = { ...base, id: 'E2E_TEST_rb-far', name: 'E2E_TEST_ Rosa’s 40th', date: '2027-01-04' };
const NEAR = { ...base, id: 'E2E_TEST_rb-near', name: 'E2E_TEST_ Soon Party', date: (() => { const d = new Date(Date.now() + 3 * 864e5); return d.toISOString().slice(0, 10); })() };
const navTo = async (p, name) => {
  const tab = p.getByRole('tab', { name });
  if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
  const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
  await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click();
};
const rb = (p, id) => p.evaluate(([k, id]) => { const e = JSON.parse(localStorage.getItem(k) || '[]').find((x) => x.id === id) || {}; return e.rsvpDeadline === undefined ? '(unset)' : e.rsvpDeadline; }, [KEY, id]);
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of [[390, 844, true], [1024, 1366, true]]) {
    const r = { vp: `${w}x${h}`, steps: [], console: [], blocked: [] };
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().url()), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => r.console.push('pageerror: ' + e.message.slice(0, 160)));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 220); } await p.screenshot({ path: path.join(OUT, r.vp + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }).catch(() => {}); r.steps.push(s); };
    const seedOpen = async (ev) => {
      await p.goto(BASE); await p.evaluate(([k, l, ev]) => { localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); }, [KEY, LAST, ev]);
      await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      await navTo(p, 'Your plan'); await p.waitForTimeout(300); await p.locator('[data-plan-row="guests"]').click(); await p.waitForSelector('[data-view="guests"]');
    };
    await step('picked-date-waits', async () => {
      await seedOpen(FAR);
      const q = await p.locator('[data-question]').getAttribute('data-question');
      if (q !== 'replyBy') throw new Error('question is ' + q);
      await p.locator('input[aria-label="Reply-by date"]').fill('2026-12-20'); await p.waitForTimeout(400);
      const afterPick = await rb(p, FAR.id);
      if (afterPick !== '(unset)' && afterPick !== '') throw new Error('saved on pick: ' + afterPick);
      const use = p.getByRole('button', { name: /^Use / }); const label = (await use.innerText()).replace(/\s+/g, ' ').trim();
      await use.click(); await p.waitForTimeout(400);
      const afterUse = await rb(p, FAR.id); if (afterUse !== '2026-12-20') throw new Error('after Use: ' + afterUse);
      return { afterPick, label, afterUse };
    });
    await step('no-reply-by-clears', async () => {
      await p.locator('[data-answers]').click(); await p.waitForSelector('[role=dialog]');
      await p.getByRole('button', { name: 'No reply-by date' }).click(); await p.waitForTimeout(400);
      const v = await rb(p, FAR.id); if (v && v !== '(unset)') throw new Error('still set: ' + v);
      await p.getByRole('button', { name: 'Done' }).click().catch(() => {}); await p.waitForTimeout(300);
      return { after: v, answers: (await p.locator('[data-answers]').innerText().catch(() => '')).replace(/\s+/g, ' '), question: await p.locator('[data-question]').getAttribute('data-question').catch(() => null) };
    });
    await step('too-close-no-question', async () => {
      await seedOpen(NEAR);
      const q = await p.locator('[data-question]').getAttribute('data-question').catch(() => null);
      if (q === 'replyBy') throw new Error('reply-by asked for a party on ' + NEAR.date);
      return { date: NEAR.date, question: q, answers: (await p.locator('[data-answers]').innerText().catch(() => '')).replace(/\s+/g, ' ') };
    });
    await p.evaluate(([k, l]) => { localStorage.removeItem(k); localStorage.removeItem(l); }, [KEY, LAST]).catch(() => {});
    res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(r.vp, 'pageerrors:', r.console.length, 'blocked:', r.blocked.length); for (const s of r.steps) console.log(' ', s.ok ? 'ok ' : 'FAIL', s.name, s.error || '', JSON.stringify({ ...s, name: undefined, ok: undefined, error: undefined }).slice(0, 300)); }
})();
