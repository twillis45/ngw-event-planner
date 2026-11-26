// #289: after the invite, nobody reachable -> bottom button "Add how to reach them" opens the first such guest, cursor in Phone; one guest with an email -> the nudge wins.
//   node livecheck/hostv4-reach-289.cjs <outdir>
// Seeded E2E_TEST_ plan; writes aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-289'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const NAMES = ['Ada Pine', 'Ben Oak', 'Cy Fern', 'Dee Ash', 'Eli Elm', 'Fay Yew', 'Gus Bay', 'Hal Fir', 'Ivy Box', 'Jo Lime'];
const RS = ['Yes', 'Yes', 'Yes', 'Yes', 'Maybe', 'Maybe', '', '', '', 'No'];
const ev = (reachIdx) => ({ id: 'E2E_TEST_lc-289', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550,
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-25', invitesSentAt: '2026-11-20T15:00:00Z', vendors: [],
  guests: NAMES.map((n, i) => ({ id: 'g' + i, name: n, rsvp: RS[i], invitedAt: '2026-11-20T15:00:00Z', ...(i === reachIdx ? { email: 'gus.bay@example.com' } : {}) })) });
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, blocked: [], errs: [] };
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(6000); p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
    const navTo = async (name) => { const tab = p.getByRole('tab', { name }); if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
      const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
      await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click(); };
    const open = async (e) => { await p.goto(BASE); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, e]);
      await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800); await navTo('Your plan'); await p.waitForTimeout(300);
      const row = p.locator('[data-plan-row="guests"]'); if (await row.count()) await row.first().click(); else await navTo('Guests'); await p.waitForSelector('[data-view="guests"]'); await p.waitForTimeout(500); };
    try {
      await open(ev(-1));
      const plan0 = await p.evaluate((k) => localStorage.getItem(k), KEY);
      const btn = p.locator('.action .primary').first(); r.button = (await btn.innerText()).trim();
      await btn.click(); await p.waitForTimeout(800);
      r.focus = await p.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName, type: a.type || null, label: a.getAttribute('aria-label') || (a.labels && a.labels[0] && a.labels[0].innerText) || null } : null; });
      r.sheetText = ((await p.locator('[role=dialog]').last().innerText().catch(() => '')) || (await p.locator('main').innerText().catch(() => ''))).replace(/\s+/g, ' ').slice(0, 120);
      r.firstUnreachable = /Ada Pine/.test(r.sheetText) ? 'Ada Pine' : (NAMES.find((n) => r.sheetText.includes(n)) || null);
      r.planUnchanged = (await p.evaluate((k) => localStorage.getItem(k), KEY)) === plan0;
      r.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      await p.screenshot({ path: path.join(OUT, vp + '-reach.jpg'), type: 'jpeg', quality: 60 });
      await open(ev(6));
      r.buttonWithOneReachable = (await p.locator('.action .primary').first().innerText()).trim();
      r.ok = r.button === 'Add how to reach them' && r.focus && r.focus.type === 'tel' && r.planUnchanged && r.sideways <= 0 && /Nudge|remind/i.test(r.buttonWithOneReachable);
    } catch (e) { r.ok = false; r.error = String(e.message).split('\n')[0].slice(0, 200); }
    console.log(vp, r.ok ? 'ok  ' : 'FAIL', JSON.stringify({ button: r.button, focus: r.focus, guest: r.firstUnreachable, one: r.buttonWithOneReachable, side: r.sideways, unchanged: r.planUnchanged, err: r.error, blocked: [...new Set(r.blocked)].length, pageErrors: r.errs.length }));
    res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
})();
