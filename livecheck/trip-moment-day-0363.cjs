const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = 'https://twillis45.github.io/ngw-event-planner/';
  const TRIP = { id: 'E2E_TEST_mo-trip', type: 'Group Trip', name: 'E2E_TEST_ Trip', date: '2027-05-13', endDate: '2027-05-15', guestCount: 8, rosEdited: true,
    ros: [{ id: 'r1', day: 1, time: '11:00', segment: 'Check in' }, { id: 'r2', day: 2, time: '10:00', segment: 'Brunch' }, { id: 'r3', day: 2, time: '14:00', segment: 'Boat tour' }, { id: 'r4', day: 3, time: '10:00', segment: 'Check out' }], vendors: [], guests: [], budget: [], timeline: [] };
  const run = async (day, shell, addFirst) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST','PUT','PATCH','DELETE'].includes(rt.request().method()) ? rt.abort() : rt.continue());
    const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(new Date(day + 'T09:00:00-04:00'));
    const ev = addFirst ? { ...TRIP, ros: [...TRIP.ros, { id: 'm-groupPhoto', time: '', segment: 'Group photo' }] } : TRIP;
    await p.goto(R + shell + '/?noanalytics=1'); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed','1'); localStorage.setItem('ngw-v2-welcomed','1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
    await p.goto(R + shell + '/?noanalytics=1' + (shell==='hostv2'?'&elegant=1':''), { waitUntil: 'networkidle' }).catch(()=>{}); await p.waitForTimeout(1500);
    if (shell === 'hostv2') await p.locator('[data-tt-bar]').getByRole('button', { name: 'The Day', exact: true }).first().click();
    else await p.getByRole('tab', { name: 'The Day' }).first().click();
    await p.waitForTimeout(1500);
    if (shell === 'hostv4') { const o = p.locator('[data-open-run]').first(); if (await o.count()) { await o.click(); await p.waitForTimeout(600); } }
    const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    console.log(shell, day, 'GroupPhoto shown:', /Group photo/.test(t), '| suggest again:', /Worth a spot[^.]{0,40}Group photo/.test(t), '|', (t.match(/(Brunch|Check in|Check out|Boat tour|Group photo)/g)||[]).join(','));
    await ctx.close();
  };
  for (const d of ['2027-05-13','2027-05-14']) { await run(d, 'hostv2', true); await run(d, 'hostv4', true); }
  await b.close();
})();
