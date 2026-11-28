// #321 hostv2 ?guests=kit at five sizes: layout beside .srail, the path to Your invite → Design this page, the saved-answer line with Undo,
// Back page by page (in-page back, the phone/browser Back, an edge swipe on touch), and the old sheet without the flag.
//   node livecheck/v2kit-f3b6.cjs <outdir>
// Seeded E2E_TEST_ plan in this browser only (example.com guests); writes aborted; share/clipboard/open stubbed. Nothing sent, nothing saved to an account.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-v2kit'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true, 'dark'], [390, 844, true, 'light'], [834, 1194, true, 'dark'], [1024, 1366, true, 'dark'], [1194, 834, true, 'dark'], [1440, 900, false, 'dark']];
const ev = { id: 'E2E_TEST_v2kit', name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'yes' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending' }] };
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of VPS) {
    const vp = `${w}x${h}-${scheme}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: scheme, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    // hostv2 takes its theme from localStorage['ngw-theme'], not prefers-color-scheme.
    await ctx.addInitScript((sc) => { try { localStorage.setItem('ngw-theme', sc); } catch {} }, scheme);
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 300); }
      try { s.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (s.sideways > 0) { s.ok = false; s.error = (s.error || '') + ' sideways ' + s.sideways; } await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {}
      r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const where = () => p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].map((e) => e.getAttribute('data-view')); const hs = [...document.querySelectorAll('.gk h1')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()); return { gk: !!document.querySelector('.gk'), view: v[v.length - 1] || null, h1: hs[0] || null, hist: history.length }; });
    const seed = async (flag) => { await p.goto(U); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
      await p.goto(U + '&elegant=1' + (flag ? '&guests=kit' : ''), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800); };
    const openGuests = async () => { if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click();
      else { await p.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; }); await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(500); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); }
      await p.waitForTimeout(1300); };
    const opts = () => p.evaluate(() => [...document.querySelectorAll('.gk button, .gk a, .gk [role=button]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    const geo = () => p.evaluate(() => { const bx = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return q.width ? [Math.round(q.left), Math.round(q.right)] : null; }; return { srail: bx('.srail'), gk: bx('.gk'), listpane: bx('.gk .listpane'), detail: bx('.gk .gk-gdetail'), vw: innerWidth }; });
    const edgeSwipe = async () => { const c = await ctx.newCDPSession(p); const y = Math.round(h / 2);
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 6, y }] });
      for (let x = 30; x <= Math.min(w * 0.7, 320); x += 30) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await p.waitForTimeout(16); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(900); };

    await seed(true);
    await step('open-guests', async () => { await openGuests(); const g = await geo(); const at = await where();
      const split = w >= 1024; const out = { ...g, at };
      if (!at.gk || at.view !== 'guests') throw new Error('kit Guests not open :: ' + JSON.stringify(out));
      if (split && g.srail && (!g.gk || Math.abs(g.gk[0] - g.srail[1]) > 1)) throw new Error('kit not at the rail edge :: ' + JSON.stringify(out));
      out.panes = g.detail ? 'three' : 'one'; return out; });
    await step('answer-undo', async () => { const o = await opts(); const pick = o.find((t) => /^Plan for \d+$/.test(t)) || o.find((t) => /^Not this time$/.test(t));
      if (!pick) throw new Error('no question to answer :: ' + JSON.stringify(o.slice(0, 8)));
      await p.locator('.gk button').filter({ hasText: pick }).first().click(); await p.waitForTimeout(700);
      const u = await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => /^Undo$/.test(x.innerText.trim()) && x.getBoundingClientRect().width > 0); if (!e) return null; const q = e.getBoundingClientRect(); const box = e.parentElement.closest('div'); return { line: (box ? box.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 100), onScreen: q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth, top: Math.round(q.top), left: Math.round(q.left), inKit: !!e.closest('.gk') }; });
      if (!u || !u.onScreen) throw new Error('no saved-answer line with Undo on screen :: ' + JSON.stringify({ pick, u }));
      return { pick, undo: u }; });
    await step('path-to-invite', async () => { for (let i = 0; i < 8; i++) { const o = (await opts()).filter((t) => !/^(Your plan|Undo|Guests)$|^Why|^How|^More|^＋$|^⋯$/.test(t));
        if (o.some((t) => /^Review your invite/.test(t))) break; const next = o.find((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion/.test(t)) || o[o.length - 1];
        await p.locator('.gk button, .gk a, .gk [role=button]').filter({ hasText: next.slice(0, 22) }).first().click(); await p.waitForTimeout(800); }
      const line = await p.evaluate(() => { const e = [...document.querySelectorAll('.gk button, .gk [role=button]')].find((x) => /Your answers/.test(x.innerText)); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
      if (!line || /about\s*—/.test(line)) throw new Error('answers line :: ' + line); return { answersLine: line }; });
    await step('invite-design', async () => { await p.locator('.gk').getByText(/^Review your invite/).first().click(); await p.waitForTimeout(1000); const a = await where();
      await p.locator('.gk').getByText(/^Design this page/).first().click(); await p.waitForTimeout(1000); const d = await where();
      if (a.view !== 'invite' || d.view !== 'invite-design') throw new Error(JSON.stringify({ a, d })); return { invite: a, design: d }; });
    const clickBack = (label) => p.evaluate((label) => { const e = [...document.querySelectorAll('.gk button, .gk a, .gk [role=button]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 0 && q.top >= 0 && q.top < 90 && q.left < innerWidth; }).find((x) => x.innerText.replace(/[‹<\s]+/g, ' ').trim() === label); if (!e) return false; e.click(); return true; }, label);
    await step('back-in-page', async () => { const seen = [];
      for (const [label, want] of [['Your invite', 'invite'], ['Guests', 'guests']]) { if (!(await clickBack(label))) throw new Error('no back control "' + label + '" :: ' + JSON.stringify(seen)); await p.waitForTimeout(900); const at = await where(); seen.push(at.view); if (at.view !== want) throw new Error('back went to ' + JSON.stringify(seen)); }
      return { seen }; });
    // The phone / browser Back (popstate → closeSheet): from Design this page, one press should land on Your invite.
    await step('back-browser', async () => { await p.locator('.gk').getByText(/^Review your invite/).first().click(); await p.waitForTimeout(800); await p.locator('.gk').getByText(/^Design this page/).first().click(); await p.waitForTimeout(800);
      const before = await where(); const seen = [];
      for (let i = 0; i < 3; i++) { await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(1000); const at = await where(); seen.push(at.gk ? at.view : 'kit closed'); if (!at.gk) break; }
      const out = { before, seen, url: p.url().split('?')[1] };
      if (seen[0] !== 'invite' || seen[1] !== 'guests') throw new Error('not page by page :: ' + JSON.stringify(out)); return out; });
    if (touch) {
      await step('row-swipe', async () => { await seed(true); await openGuests();
        for (let i = 0; i < 8; i++) { const o = (await opts()); if (o.some((t) => /^Review your invite/.test(t))) break; const next = o.find((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion/.test(t)); if (!next) break; await p.locator('.gk button, .gk a, .gk [role=button]').filter({ hasText: next.slice(0, 22) }).first().click(); await p.waitForTimeout(700); }
        const t0 = Date.now(); let toastMs = null; for (let i = 0; i < 24; i++) { const up = await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Undo$/.test(x.innerText.trim()) && x.getBoundingClientRect().width > 0)); if (!up) { toastMs = Date.now() - t0; break; } await p.waitForTimeout(500); }
        const row = p.locator('[data-guest="g2"]');
        if (!(await row.isVisible().catch(() => false))) { const grp = p.locator('.gk button[data-group]', { hasText: /No reply/ }); if (await grp.count()) { await grp.first().click(); await p.waitForTimeout(500); } }
        await row.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); const bb = await row.boundingBox(); if (!bb) throw new Error('no row g2');
        const x0 = bb.x + bb.width - 20, y0 = bb.y + bb.height / 2; await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(x0 - (90 * i) / 8, y0); await p.mouse.up(); await p.waitForTimeout(400);
        const dir = await row.evaluate((e) => e.parentNode.dataset.dir).catch(() => null);
        const btn = p.getByRole('button', { name: 'Mark Bo Reed can’t make it', exact: true }); const shown = await btn.isVisible().catch(() => false);
        if (shown) { await btn.click(); await p.waitForTimeout(500); }
        const rsvp = await p.evaluate(() => ((JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests || []).find((g) => g.id === 'g2') || {}).rsvp);
        if (dir !== 'left' || !shown || rsvp !== 'No') throw new Error(JSON.stringify({ dir, shown, rsvp, toastGoneAfterMs: toastMs })); return { dir, rsvp, toastGoneAfterMs: toastMs }; });
    }
    await step('no-flag-old-sheet', async () => { await seed(false); await openGuests(); const o = await p.evaluate(() => ({ gk: !!document.querySelector('.gk'), sheetTitle: (document.querySelector('#sheet-title') || {}).innerText || null }));
      if (o.gk || !o.sheetTitle) throw new Error(JSON.stringify(o)); return o; });
    r.blocked = [...new Set(r.blocked)]; res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${r.blocked.join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''}`); }
})();
