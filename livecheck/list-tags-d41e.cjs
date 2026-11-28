// #328 kit list (hostv2 ?guests=kit): row tags [data-tags], household headings [data-household], the party line [data-party],
// and the find box from 8 names matching name, +1, group and email.
//   node livecheck/list-tags-d41e.cjs <outdir>
// Signed out; seeded E2E_TEST_ plan in this browser only; writes aborted. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-tags'); fs.mkdirSync(OUT, { recursive: true });
const G = (id, name, x = {}) => ({ id, name, rsvp: 'pending', invitedAt: '2026-11-27T15:00:00.000Z', ...x });
const ev = { id: 'E2E_TEST_tags', name: 'E2E_TEST_ Dinner', type: 'Dinner Party', date: '2026-12-19', startTime: '18:00', startTimeSource: 'host', venueKind: 'home', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150',
  guestMode: 'list', guestCount: 12, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-09', invitesSentAt: '2026-11-27T15:00:00.000Z', vendors: [], budget: [], timeline: [],
  guests: [G('g1', 'Ada Pine', { group: 'Family', plusOne: 'Sam Pine', email: 'ada.pine@example.com' }), G('g2', 'Bo Reed', { group: 'Family', kids: 2, diets: ['Vegetarian'] }), G('g3', 'Cy Lark', { group: 'Work', allergens: ['Peanut'] }),
    G('g4', 'Di Moss', { coupleId: 'c1' }), G('g5', 'Eli Moss', { coupleId: 'c1' }), G('g6', 'Fay Hart'), G('g7', 'Gus Bay'), G('g8', 'Hal Fir'), G('g9', 'Ivy Oak')] };
(async () => { const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of [[390, 844, true, 'dark'], [390, 844, true, 'light'], [1194, 834, true, 'dark'], [1440, 900, false, 'dark']]) {
    const vp = `${w}x${h}-${scheme}`; const errs = []; const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? rt.abort() : rt.continue());
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120))); await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const out = { vp };
    try {
      await p.goto(U); await p.evaluate((e) => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
      await p.goto(U + '&elegant=1&guests=kit&theme=' + scheme, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800);
      if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click(); else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(400); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); }
      await p.waitForTimeout(1500);
      if (!(await p.locator('[data-guest]').first().isVisible().catch(() => false))) { const grp = p.locator('.gk button[data-group]', { hasText: /No reply/ }); if (await grp.count()) { await grp.first().click(); await p.waitForTimeout(600); } }
      const read = () => p.evaluate(() => { const vis = (e) => e.getBoundingClientRect().width > 0;
        const rows = Object.fromEntries([...document.querySelectorAll('[data-guest]')].filter(vis).map((r) => [r.getAttribute('data-guest'), ((r.querySelector('[data-tags]') || {}).innerText || '').trim()]));
        return { rows, households: [...document.querySelectorAll('[data-household]')].filter(vis).map((e) => e.innerText.trim()), party: ((document.querySelector('[data-party]') || {}).innerText || '').trim(), find: !!document.getElementById('findguest') }; });
      Object.assign(out, await read());
      await p.screenshot({ path: path.join(OUT, vp + '-list.jpg'), type: 'jpeg', quality: 60 });
      out.search = {};
      if (out.find) for (const q of ['Sam', 'work', 'ada.pine@', 'moss']) { await p.locator('#findguest').fill(q); await p.waitForTimeout(400); out.search[q] = Object.keys((await read()).rows).sort().join(','); }
    } catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 160); }
    out.errs = errs; out.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => null);
    const r = out.rows || {}; const s = out.search || {};
    out.checks = { adaPlus: /\+1|Sam/.test(r.g1 || ''), boKidsDiet: /2 kids/.test(r.g2 || '') && /Vegetarian/.test(r.g2 || ''), cyAllergy: /Peanut allergy/.test(r.g3 || ''), couple: /with Eli/.test(r.g4 || '') && /with Di/.test(r.g5 || ''),
      households: JSON.stringify(out.households) === JSON.stringify(['Family · 2', 'Work · 1', 'Everyone else · 6']), party: /kids/.test(out.party || '') && /Food sizes kids lighter\./.test(out.party || ''), find: !!out.find,
      byPlusOne: s.Sam === 'g1', byGroup: s.work === 'g3', byEmail: s['ada.pine@'] === 'g1', byName: s.moss === 'g4,g5' };
    out.ok = !out.error && Object.values(out.checks).every(Boolean) && !errs.length && out.sideways <= 0;
    res.push(out); console.log(JSON.stringify(out).slice(0, 1100)); await ctx.close(); }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1)); })();
