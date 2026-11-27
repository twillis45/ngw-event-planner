const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const B = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
  const ev = { id: 'E2E_TEST_gap', name: 'E2E_TEST_ Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20', date: '2026-12-18', startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA', guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [] };
  for (const touch of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST','PUT','PATCH','DELETE'].includes(rt.request().method()) ? rt.abort() : rt.continue());
    const p = await ctx.newPage(); await p.clock.setFixedTime(new Date('2026-11-27T13:00:00-05:00'));
    await p.goto(B); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed','1'); localStorage.setItem('ngw-v2-welcomed','1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
    await p.goto(B + '&elegant=1', { waitUntil: 'networkidle' }).catch(()=>{}); await p.waitForTimeout(2000);
    const t2 = await p.evaluate(() => { const fs = (e) => e ? getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight : null; const hero = document.querySelector('.hero'); const q = hero && [...hero.querySelectorAll('*')].find(e => e.childElementCount === 0 && /How much do you want to spend/.test(e.textContent)); const fig = hero && [...hero.querySelectorAll('*')].find(e => e.childElementCount === 0 && /^\$[\d,]+$/.test(e.textContent.trim())); const cov = hero && [...hero.querySelectorAll('*')].find(e => e.childElementCount === 0 && /Covers your plan/.test(e.textContent)); const radio = hero && hero.querySelector('.optrow [role=radio], .optrow .radio, .optrow input, .optrow .dot'); return { question: fs(q), figure: fs(fig), covers: cov && getComputedStyle(cov).color, yourBudgetH3: !!(hero && [...hero.querySelectorAll('h3')].some(h => /Your budget/.test(h.textContent))), radio: radio && Math.round(radio.getBoundingClientRect().width) }; }); console.log('T2', JSON.stringify(t2));
    const r = await p.evaluate(() => { const t = document.querySelector('[data-tt-title]').getBoundingClientRect(); const l = document.querySelector('[data-tt-head] .tt-r1').getBoundingClientRect(); const between = [...document.querySelectorAll('[data-tt-head] *')].filter(e => { const b = e.getBoundingClientRect(); return b.top >= t.bottom - 1 && b.bottom <= l.top + 1 && e.childElementCount === 0 && e.innerText.trim(); }).map(e => e.innerText.trim()); return { gap: Math.round(l.top - t.bottom), between }; });
    console.log('touch', touch, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
