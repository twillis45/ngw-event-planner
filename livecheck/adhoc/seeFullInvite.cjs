// Ad-hoc live check (owner report 11/24, iPad): "See the full invite" in the
// Invite page editor does not show the full preview. Read-only: writes aborted,
// share/clipboard stubbed; window.open is NOT stubbed here so the real new tab
// can be observed. Made-up event only.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const SITE = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1&elegant=1';
const OUT = path.join(__dirname, 'seeFullInvite-out'); fs.mkdirSync(OUT, { recursive: true });
const EV = { id: 'lc-inv', rsvpCode: 'lc-inv-code', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', createdAt: '2026-11-01',
  date: '2026-11-26', startTime: '18:00', startTimeSource: 'host', venue: 'Home', venueKind: 'home',
  venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 900,
  guests: [{ id: 'g1', name: 'Ada Pine', rsvp: '' }], vendors: [], budget: [], timeline: [] };
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const vp of [{ id: '1194x834', width: 1194, height: 834 }, { id: '1024x768', width: 1024, height: 768 }, { id: '390x844', width: 390, height: 844 }]) {
    const r = { vp: vp.id, console: [], blocked: [] };
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); });
    const p = await ctx.newPage();
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 200)));
    await p.clock.setFixedTime(new Date('2026-11-24T18:00:00-05:00'));
    await p.addInitScript((e) => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', 'x'); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); }, EV);
    await p.goto(SITE); await p.waitForTimeout(4500);
    r.version = await p.evaluate(() => [...document.scripts].map((s) => s.src).join(' ').slice(-60));
    // Open the Invite page editor: Guests & invite, then its "Invite page" door.
    if (await p.locator('.srail-row').count()) await p.locator('.srail-row', { hasText: 'Guests & invite' }).first().click();
    else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.locator('.sheet').last().locator('[data-door]', { hasText: 'Guests & invite' }).first().click(); }
    await p.waitForTimeout(1500);
    const sh = p.locator('.sheet').last();
    r.doors = await sh.locator('button').evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /invite page|your invite|design|look/i.test(t)).slice(0, 6));
    const door = sh.locator('button', { hasText: /Invite page|Your invite/ }).first();
    if (!(await door.count())) { r.error = 'no Invite page door in Guests & invite'; out.push(r); await ctx.close(); continue; }
    await door.scrollIntoViewIfNeeded(); await door.click(); await p.waitForTimeout(2500);
    r.sheetTitle = (await p.locator('#sheet-title').last().innerText().catch(() => '')).trim();
    const glance = p.locator('[data-invite-panel] [role=radio]', { hasText: 'At a glance' });
    if (await glance.count()) { await glance.click(); await p.waitForTimeout(1200); }
    r.preview = await p.evaluate(() => { const f = document.querySelector('[data-invite-preview]'); if (!f) return null;
      const s = f.closest('.ivd-pv'); const lay = f.querySelector('[data-invite-layout]');
      return { frameH: Math.round(f.getBoundingClientRect().height), contentH: f.scrollHeight, clipped: f.scrollHeight > f.clientHeight + 2,
        overflow: getComputedStyle(f).overflow, layout: lay && lay.getAttribute('data-invite-layout'), text: f.innerText.replace(/\s+/g, ' ').slice(0, 160) }; });
    await p.locator('.ivd-pv').first().scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: path.join(OUT, vp.id + '-editor.png') });
    // Tap "See the full invite" and watch what happens.
    const btn = p.getByRole('button', { name: 'See the full invite' });
    r.button = { count: await btn.count() };
    if (r.button.count) {
      const box = await btn.first().boundingBox(); r.button.box = box && { w: Math.round(box.width), h: Math.round(box.height) };
      const popP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      const urlBefore = p.url();
      await btn.first().click();
      const pop = await popP;
      r.afterTap = { newTab: !!pop, samePageUrlChanged: p.url() !== urlBefore };
      if (pop) {
        await pop.waitForLoadState('domcontentloaded').catch(() => {}); await pop.waitForTimeout(6000);
        r.afterTap.url = pop.url();
        r.afterTap.page = await pop.evaluate(() => ({ layout: (document.querySelector('[data-invite-layout]') || {}).getAttribute?.('data-invite-layout') || null,
          text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) }));
        await pop.screenshot({ path: path.join(OUT, vp.id + '-newtab.png'), fullPage: true });
      } else { await p.waitForTimeout(1000); await p.screenshot({ path: path.join(OUT, vp.id + '-after-tap.png') }); }
    }
    out.push(r); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
