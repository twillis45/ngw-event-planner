// #323: hostv2 ?guests=kit — the saved line + Undo sit inside the page (no floating toast), and Escape on "Import a list" closes that sheet back to Guests.
//   node livecheck/import-esc-1d8a.cjs <outdir>
// Signed out; seeded E2E_TEST_ plan in this browser only; writes aborted; nothing imported or sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-imp'); fs.mkdirSync(OUT, { recursive: true });
const ev = { id: 'E2E_TEST_imp', name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'yes' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending' }] };
(async () => { const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of [[390, 844, true, 'dark'], [390, 844, true, 'light'], [1194, 834, true, 'dark'], [1440, 900, false, 'dark']]) {
    const vp = `${w}x${h}-${scheme}`; const errs = []; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? rt.abort() : rt.continue());
    await ctx.addInitScript((sc) => { try { localStorage.setItem('ngw-theme', sc); } catch {} }, scheme);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    await p.goto(U); await p.evaluate((e) => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
    await p.goto(U + '&elegant=1&guests=kit&theme=' + scheme, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800);
    if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click(); else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(400); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); }
    await p.waitForTimeout(1300); const out = { vp };
    try {
      await p.locator('.gk button').filter({ hasText: /^Plan for \d+$/ }).first().click(); await p.waitForTimeout(700);
      out.saved = await p.evaluate(() => { const u = [...document.querySelectorAll('button')].find((x) => /^Undo$/.test(x.innerText.trim()) && x.getBoundingClientRect().width > 0); if (!u) return null; const q = u.getBoundingClientRect(); const floating = [...document.querySelectorAll('.toast, [class*=toast]')].filter((t) => t.getBoundingClientRect().width > 0 && getComputedStyle(t).position === 'fixed').length;
        const rows = [...document.querySelectorAll('.gk button, .gk [role=button]')].filter((e) => e !== u && !e.contains(u) && e.getBoundingClientRect().width > 0); const hit = rows.filter((e) => { const r = e.getBoundingClientRect(); return !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom); }).length;
        const line = u.parentElement.innerText.replace(/\s+/g, ' ').trim(); return { inKit: !!u.closest('.gk'), line: line.slice(0, 80), onScreen: q.top >= 0 && q.bottom <= innerHeight, floatingToasts: floating, overlapsControls: hit }; });
      for (let i = 0; i < 6; i++) { const o = await p.evaluate(() => [...document.querySelectorAll('.gk button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').trim())); if (o.includes('⋯')) break; const nx = o.find((t) => /^Not this time$|^Adults only$|Our suggestion/.test(t)); if (!nx) break; await p.locator('.gk button').filter({ hasText: nx.split(' Our suggestion')[0] }).first().click(); await p.waitForTimeout(700); }
      await p.locator('.gk button').filter({ hasText: /^⋯$/ }).first().click(); await p.waitForTimeout(600);
      const imp = p.locator('button').filter({ hasText: /^Import a list$/ }).first(); out.importButton = await imp.count() > 0;
      if (out.importButton) { await imp.click(); await p.waitForTimeout(1000);
        out.importOpen = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .sheet, .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 160) : null; });
        await p.screenshot({ path: path.join(OUT, vp + '-import.jpg'), type: 'jpeg', quality: 60 });
        await p.keyboard.press('Escape'); await p.waitForTimeout(900);
        out.afterEsc = await p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].map((e) => e.getAttribute('data-view')); const d = [...document.querySelectorAll('[role=dialog], .sheet, .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0 && /Import/.test(e.innerText)); return { kitView: v[v.length - 1] || null, importStillOpen: d.length > 0 }; }); }
    } catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 160); }
    out.errs = errs; out.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    out.ok = !out.error && out.saved && out.saved.inKit && out.saved.onScreen && out.saved.floatingToasts === 0 && out.saved.overlapsControls === 0 && out.afterEsc && out.afterEsc.kitView === 'guests' && !out.afterEsc.importStillOpen && !errs.length && out.sideways <= 0;
    await p.screenshot({ path: path.join(OUT, vp + '-after.jpg'), type: 'jpeg', quality: 60 }); res.push(out); console.log(JSON.stringify(out)); await ctx.close(); }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1)); })();
