// #324: (a) the kit path's "Replies" counts a guest who replied, and the whole list when the invite went out by link
// (invitesSentAt set, no per-guest invitedAt); (b) signed out, Share the link says "Sign in and it saves." with a Sign in button.
//   node livecheck/replies-3d03.cjs <outdir>
// Signed out; seeded E2E_TEST_ plans in this browser only; writes aborted; Sign in is read, not used. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-replies'); fs.mkdirSync(OUT, { recursive: true });
const base = { name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150', guestMode: 'list', guestCount: 3, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: '2026-12-09', vendors: [], budget: [], timeline: [] };
const G = (r) => [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: r[0] }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: r[1] }, { id: 'g3', name: 'Cy Lark', phone: '(202) 555-0102', rsvp: r[2] }];
const PLANS = {
  linkOneYes: { ...base, id: 'E2E_TEST_rep-a', invitesSentAt: '2026-11-27T15:00:00.000Z', guests: G(['Yes', 'pending', 'pending']), want: /Replies\s*1 of 3/ },
  linkNone: { ...base, id: 'E2E_TEST_rep-b', invitesSentAt: '2026-11-27T15:00:00.000Z', guests: G(['pending', 'pending', 'pending']), want: /Replies\s*0 of 3/ },
  linkTwo: { ...base, id: 'E2E_TEST_rep-c', invitesSentAt: '2026-11-27T15:00:00.000Z', guests: G(['Yes', 'No', 'pending']), want: /Replies\s*2 of 3/ },
};
(async () => { const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of [[390, 844, true, 'dark'], [390, 844, true, 'light'], [1194, 834, true, 'dark']]) for (const [k, pl] of Object.entries(PLANS)) {
    const vp = `${w}x${h}-${scheme}`; const errs = [], blocked = []; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => { const m = rt.request().method(); if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) { blocked.push(m + ' ' + new URL(rt.request().url()).pathname); return rt.abort(); } return rt.continue(); });
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const { want, ...ev } = pl; const out = { vp, plan: k };
    try {
      await p.goto(U); await p.evaluate((e) => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
      await p.goto(U + '&elegant=1&guests=kit&theme=' + scheme, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800);
      if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click(); else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(400); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); }
      await p.waitForTimeout(1500);
      out.path = await p.evaluate(() => [...new Set([...document.querySelectorAll('.gk button, .gk [role=button], .gk li, .gk div')].filter((e) => e.childElementCount < 6 && e.getBoundingClientRect().width > 0 && /^(✓\s*)?(Your invite|Replies|The count)/.test(e.innerText.replace(/^[✓•\s]+/, ''))).map((e) => e.innerText.replace(/\s+/g, ' ').trim()))]);
      out.repliesOk = out.path.some((t) => want.test(t));
      if (k === 'linkNone') { await p.locator('.gk button').filter({ hasText: /^⋯$/ }).first().click(); await p.waitForTimeout(600); await p.locator('button').filter({ hasText: /^Share the link$/ }).first().click(); await p.waitForTimeout(1500);
        out.share = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? { text: d.innerText.replace(/\s+/g, ' ').slice(0, 400), buttons: [...d.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()) } : null; });
        out.shareOk = !!out.share && /Sign in and it saves/.test(out.share.text) && !/current app/.test(out.share.text) && out.share.buttons.includes('Sign in'); }
    } catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 160); }
    out.errs = errs; out.blocked = [...new Set(blocked)]; out.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => null);
    out.ok = !out.error && out.repliesOk && (k !== 'linkNone' || out.shareOk) && !errs.length && out.sideways <= 0;
    await p.screenshot({ path: path.join(OUT, `${vp}-${k}.jpg`), type: 'jpeg', quality: 60 }); res.push(out); console.log(JSON.stringify(out).slice(0, 700)); await ctx.close(); }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1)); })();
