// #326 one-guest sheet in hostv2 ?guests=kit (live fe7b6960): rename in place (old name kept), Call/Text/Email links (read, never tapped),
// Group with its datalist, "Nudge <name>" row, and at 1024/1194/1440 whether the list pane's top button overlaps its back link.
//   node livecheck/guest-sheet-fe7b.cjs <outdir>
// Signed out; seeded E2E_TEST_ plan in this browser only; every POST/PUT/PATCH/DELETE aborted; sms:/mailto:/tel: never opened. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-gs'); fs.mkdirSync(OUT, { recursive: true });
const ev = { id: 'E2E_TEST_gs', name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150',
  guestMode: 'list', guestCount: 3, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: '2026-12-09', invitesSentAt: '2026-11-27T15:00:00.000Z', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', phone: '(202) 555-0101', rsvp: 'pending', invitedAt: '2026-11-27T15:00:00.000Z' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending', group: 'Family', invitedAt: '2026-11-27T15:00:00.000Z' }, { id: 'g3', name: 'Cy Lark', phone: '(202) 555-0102', rsvp: 'Yes', group: 'Work' }] };
(async () => { const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of [[390, 844, true, 'dark'], [390, 844, true, 'light'], [834, 1194, true, 'dark'], [1024, 1366, true, 'dark'], [1194, 834, true, 'dark'], [1440, 900, false, 'dark']]) {
    const vp = `${w}x${h}-${scheme}`; const errs = [], blocked = [], navs = []; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => { const m = rt.request().method(); if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) { blocked.push(m + ' ' + new URL(rt.request().url()).pathname); return rt.abort(); } return rt.continue(); });
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null;
      document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^(sms|mailto|tel):/i.test(a.getAttribute('href'))) e.preventDefault(); }, true); });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const out = { vp };
    try {
      await p.goto(U); await p.evaluate((e) => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
      await p.goto(U + '&elegant=1&guests=kit&theme=' + scheme, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800);
      if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click(); else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(400); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); }
      await p.waitForTimeout(1500);
      // the list pane's top: back link vs the primary action
      out.top = await p.evaluate(() => { const vis = (e) => e && e.getBoundingClientRect().width > 0; const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
        const back = [...document.querySelectorAll('.gk button, .gk a')].filter(vis).find((e) => /^‹?\s*Your plan$/.test(e.innerText.replace(/[‹<]/g, '').trim()));
        const prim = [...document.querySelectorAll('.gk button')].filter(vis).find((e) => /^Nudge the \d+/.test(e.innerText.trim())) || [...document.querySelectorAll('.gk button.primary')].filter(vis)[0];
        if (!back || !prim) return { back: back ? box(back) : null, primary: prim ? prim.innerText.trim() : null };
        const a = back.getBoundingClientRect(), c = prim.getBoundingClientRect(); const ov = !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
        return { back: box(back), primary: prim.innerText.replace(/\s+/g, ' ').trim(), primaryBox: box(prim), overlap: ov, overlapPx: ov ? Math.round(Math.min(a.right, c.right) - Math.max(a.left, c.left)) : 0 }; });
      await p.screenshot({ path: path.join(OUT, vp + '-list.jpg'), type: 'jpeg', quality: 60 });
      // open Ada
      let row = p.locator('[data-guest="g1"]').first(); if (!(await row.isVisible().catch(() => false))) { const g = p.locator('.gk button[data-group]'); for (let i = 0; i < await g.count(); i++) { await g.nth(i).click(); await p.waitForTimeout(300); if (await row.isVisible().catch(() => false)) break; } }
      await row.click(); await p.waitForTimeout(1000);
      out.sheet = await p.evaluate(() => { const vis = (e) => e && e.getBoundingClientRect().width > 0; const q = (s) => [...document.querySelectorAll(s)].filter(vis);
        const name = q('input[aria-label="Name"]')[0]; const links = q('[role=group] a[href]').map((a) => (a.innerText.trim() + '=' + a.getAttribute('href')));
        const grp = q('input[aria-label="Group"]')[0]; const dl = document.getElementById('gk-groups');
        const nudge = q('[data-nudge-one]')[0];
        return { name: name ? name.value : null, links, group: grp ? { list: grp.getAttribute('list'), placeholder: grp.placeholder } : null, datalist: dl ? [...dl.options].map((o) => o.value) : null, nudge: nudge ? nudge.innerText.replace(/\s+/g, ' ').trim() : null, helping: q('[data-helping]').length }; });
      await p.screenshot({ path: path.join(OUT, vp + '-ada.jpg'), type: 'jpeg', quality: 60 });
      // rename in place
      const nm = p.locator('input[aria-label="Name"]').first(); await nm.fill('Ada Pine-Smith'); await nm.press('Enter'); await p.waitForTimeout(900);
      out.renamed = await p.evaluate(() => { const e = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]; const g = e.guests.find((x) => x.id === 'g1'); const extra = Object.fromEntries(Object.entries(g).filter(([k]) => !['id', 'name', 'email', 'phone', 'rsvp'].includes(k))); delete extra.invitedAt; return { name: g.name, kept: extra }; });
    } catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 180); }
    out.errs = errs; out.blocked = [...new Set(blocked)]; out.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => null);
    const s = out.sheet || {}; const keptOld = out.renamed && /ada pine/i.test(JSON.stringify(out.renamed.kept));
    out.checks = { name: s.name === 'Ada Pine', call: (s.links || []).includes('Call=tel:2025550101'), text: (s.links || []).includes('Text=sms:2025550101'), email: (s.links || []).includes('Email=mailto:ada.pine%40example.com'), group: !!s.group && s.group.list === 'gk-groups' && (s.datalist || []).includes('Family') && (s.datalist || []).includes('Work'), nudge: /^Nudge Ada/.test(s.nudge || ''), rename: !!out.renamed && out.renamed.name === 'Ada Pine-Smith' && keptOld, noOverlap: !(out.top && out.top.overlap) };
    out.ok = !out.error && Object.values(out.checks).every(Boolean) && !errs.length && out.sideways <= 0;
    res.push(out); console.log(JSON.stringify(out).slice(0, 900)); await ctx.close(); }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1)); })();
