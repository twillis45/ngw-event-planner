// #317/#319 on 44ae2726: hostv4 Guests loads from src/guestsKit. The answers line never reads "about —"; panes at each size.
//   node livecheck/guests-kit-44ae.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; writes aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-gk'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const base = { name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', vendors: [], budget: [], timeline: [] };
const PLANS = {
  count: { ...base, id: 'E2E_TEST_gk-count', guestMode: 'count', guestCount: 12, guestEstimate: 12, guestCountSource: 'host', guests: [] },
  none: { ...base, id: 'E2E_TEST_gk-none', guests: [] },
  list: { ...base, id: 'E2E_TEST_gk-list', guestMode: 'list', guests: [
    { id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'yes', partySize: 2 },
    { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending' },
    { id: 'g3', name: 'Cy Lark', rsvp: 'no' } ] },
};
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) for (const [k, ev] of Object.entries(PLANS)) {
    const vp = `${w}x${h}`; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    const errs = [], blocked = [];
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (blocked.push(rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(7000); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const out = { vp, plan: k };
    try {
      await p.goto(BASE); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
      await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500);
      const navTo = async (name) => { const tab = p.getByRole('tab', { name }); if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
        const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
        await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click(); };
      await navTo('Your plan'); await p.waitForTimeout(300);
      const row = p.locator('[data-plan-row="guests"]'); if (await row.count()) await row.first().click(); else await navTo('Guests');
      await p.waitForSelector('[data-view="guests"]', { timeout: 8000 });
      await p.waitForTimeout(1500);
      Object.assign(out, await p.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 40 && r.height > 40 && r.right > 0 && r.left < innerWidth && cs.visibility !== 'hidden' && !e.closest('[inert]'); };
        const panes = [...document.querySelectorAll('aside, main, [role=complementary], [role=main]')].filter(vis).filter((e, i, a) => !a.some((o) => o !== e && o.contains(e))).map((e) => (e.getAttribute('aria-label') || e.tagName.toLowerCase()) + ' ' + Math.round(e.getBoundingClientRect().left) + '–' + Math.round(e.getBoundingClientRect().right));
        const t = document.body.innerText; const ans = (t.match(/[^\n]*(answer|replied|coming|about)[^\n]*/gi) || []).slice(0, 6);
        return { panes, aboutDash: /about\s*[—–-]\s*(\n|$|·)/i.test(t) || /about —/.test(t), answerLines: ans, pathSteps: (t.match(/\n(1|2|3|4)\n/g) || []).length, sideways: document.documentElement.scrollWidth - innerWidth };
      }));
    } catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 200); }
    out.errs = errs; out.blocked = [...new Set(blocked)]; out.ok = !out.error && !out.aboutDash && !errs.length && out.sideways <= 0;
    await p.screenshot({ path: path.join(OUT, `${vp}-${k}.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
    res.push(out); console.log(JSON.stringify(out)); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
})();
