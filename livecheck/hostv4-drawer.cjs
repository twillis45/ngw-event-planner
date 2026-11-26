const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [w, h, touch] of [[390,844,true],[834,1194,true],[1024,1366,true],[1194,834,true],[1440,900,false],[844,390,true],[932,430,true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    let writes = 0; await ctx.route('**/*', (rt) => ['POST','PUT','PATCH','DELETE'].includes(rt.request().method()) ? (writes++, rt.abort()) : rt.continue());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const show = p.getByRole('button', { name: 'Show places' });
    const hasShow = await show.isVisible().catch(() => false);
    const drawerState = () => p.evaluate(() => { const a = document.querySelector('aside[aria-label="Places"]'); if (!a) return null; const r = a.getBoundingClientRect(); return { inert: a.inert || !!a.closest('[inert]'), ariaHidden: a.getAttribute('aria-hidden'), onScreen: r.right > 0 && r.left < innerWidth && r.width > 0 }; });
    const before = await drawerState();
    // Tab through 40 stops, record whether focus ever lands inside the drawer
    let reached = 0; await p.locator('body').click({ position: { x: w - 5, y: h / 2 } }).catch(() => {});
    for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); if (await p.evaluate(() => !!document.activeElement.closest('aside[aria-label="Places"]'))) reached++; }
    let after = null, openWorks = null;
    if (hasShow) { await p.keyboard.press('Escape'); await show.click(); await p.waitForTimeout(500); after = await drawerState(); openWorks = after && !after.inert && after.onScreen;
      const btn = p.locator('aside[aria-label="Places"] button').first(); openWorks = openWorks && await btn.isVisible(); }
    out.push({ vp: `${w}x${h}`, hasShow, closed: before, tabStopsInDrawerWhileClosed: hasShow ? reached : `n/a (drawer always open, ${reached} stops)`, afterShow: after, openWorks, writes, errs: errs.length });
    await ctx.close();
  }
  await b.close(); console.log(JSON.stringify(out, null, 1));
})();
