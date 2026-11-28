// #318 on 44ae2726: touch phone date line sits right under the name, "✎ Rename" after it; the weather pill ends on screen with an ellipsis.
//   node livecheck/header-44ae.cjs <outdir>
// Seeded E2E_TEST_ plan in this browser only; GET /api/weather/* answered locally; writes aborted; nothing renamed or sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const B = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-h44'); fs.mkdirSync(OUT, { recursive: true });
const NOW = new Date('2026-11-27T13:00:00-05:00'); const plus = (d) => new Date(NOW.getTime() + d * 864e5).toISOString().slice(0, 10);
const RAIN = { pop: 1, weather: [{ main: 'Rain', description: 'moderate rain', icon: '10d' }], temp: { min: 48, max: 54 } };
const ev = { id: 'E2E_TEST_h44', name: 'E2E_TEST_ Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20', date: plus(3), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield', venueState: 'VA', guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [] };
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of [[390, 844, true, 'light'], [390, 844, true, 'dark'], [390, 844, false, 'light'], [834, 1194, true, 'light'], [1024, 1366, true, 'light'], [1194, 834, true, 'light'], [1440, 900, false, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: scheme, timezoneId: 'America/New_York' });
    const blocked = []; const errs = [];
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (blocked.push(rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.route('**/api/weather/geocode**', (rt) => rt.fulfill({ json: { result: { lat: 38.8, lon: -77.2 } } }));
    await ctx.route('**/api/weather/onecall**', (rt) => rt.fulfill({ json: { timezone_offset: -18000, hourly: [], daily: [0, 1, 2, 3, 4, 5, 6, 7].map((d) => ({ dt: Math.floor(new Date(plus(d) + 'T12:00:00-05:00').getTime() / 1000), ...RAIN })) } }));
    // hostv2 takes its theme from localStorage['ngw-theme'], not prefers-color-scheme.
    await ctx.addInitScript((sc) => { try { localStorage.setItem('ngw-theme', sc); } catch {} }, scheme);
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160))); await p.clock.setFixedTime(NOW);
    await p.goto(B); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
    await p.goto(B + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const head = document.querySelector('[data-tt-head]'); const t = document.querySelector('[data-tt-title]'); const l = document.querySelector('[data-tt-head] .tt-r1');
      if (!head || !t || !l) return { missing: true };
      const tb = t.getBoundingClientRect(), lb = l.getBoundingClientRect();
      const ren = [...head.querySelectorAll('button, [role=button], span, a')].find((e) => /Rename/.test(e.textContent) && e.childElementCount <= 1);
      const rb = ren && ren.getBoundingClientRect();
      // weather pill: the leaf/ancestor whose text mentions the forecast
      const wxEl = [...document.querySelectorAll('body *')].filter((e) => /forecast for/i.test(e.textContent) && e.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0];
      let wx = null;
      if (wxEl) { let pill = wxEl; const chain = []; for (let e = wxEl; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); chain.push(e); if (cs.borderRadius && parseFloat(cs.borderRadius) >= 10 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { pill = e; break; } }
        const ell = chain.find((e) => getComputedStyle(e).textOverflow === 'ellipsis'); const pb = pill.getBoundingClientRect();
        wx = { text: wxEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 140), pillLeft: Math.round(pb.left), pillRight: Math.round(pb.right), vw: innerWidth, ellipsis: !!ell, clipped: ell ? ell.scrollWidth > ell.clientWidth : null }; }
      return { bp: (document.querySelector('.stagewrap') || {}).dataset?.bp || null, gap: Math.round(lb.top - tb.bottom), lineBelowName: lb.top >= tb.bottom - 1, line: l.innerText.replace(/\s+/g, ' ').slice(0, 80),
        rename: ren ? { text: ren.textContent.trim(), afterLine: rb.top >= lb.bottom - 1, betweenNameAndLine: rb.top >= tb.bottom - 1 && rb.bottom <= lb.top + 1 } : null, wx, sideways: document.documentElement.scrollWidth - innerWidth };
    });
    const vp = `${w}x${h}${touch ? '-touch' : ''}-${scheme}`; await p.screenshot({ path: path.join(OUT, vp + '.jpg'), type: 'jpeg', quality: 60 });
    const bad = [];
    if (r.missing) bad.push('no header');
    else { if (r.bp === 'mobile') { if (r.gap > 8 || !r.lineBelowName) bad.push('gap ' + r.gap); if (r.rename && r.rename.betweenNameAndLine) bad.push('Rename between name and date'); }
      if (r.wx && (r.wx.pillRight > r.wx.vw || r.wx.pillLeft < 0)) bad.push('pill off screen'); if (r.wx && r.wx.clipped && !r.wx.ellipsis) bad.push('pill cut without ellipsis'); if (r.sideways > 0) bad.push('sideways ' + r.sideways); }
    if (errs.length) bad.push('page errors');
    const out = { vp, ok: !bad.length, bad, ...r, errs, blocked: [...new Set(blocked)] }; res.push(out); console.log(JSON.stringify(out));
    await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
})();
