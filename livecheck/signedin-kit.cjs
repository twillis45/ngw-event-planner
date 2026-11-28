// Signed-in Guests pass on hostv2 ?guests=kit with the demo account's saved session (passed as a file path; never committed).
//   node livecheck/signedin-kit.cjs <statefile> <outdir> <phase>   phase: host390d | host390l | host1194 | guest | verify | cleanup
// Writes allowed ONLY when the request carries the E2E_TEST_ plan id, plus Supabase auth. Anything that could reach a person
// (communication, invite batch, nudge, sms, email, send, broadcast) is aborted and recorded; sms:/mailto: clicks stopped; share/clipboard/open stubbed.
// Screenshots are skipped when the page shows the account address.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [STATE, OUTD, PHASE] = process.argv.slice(2);
const U0 = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1'; let U = U0;
let ID = (() => { try { return require('fs').readFileSync(require('path').join(process.argv[3], '.testid'), 'utf8').trim(); } catch { return 'E2E_TEST_signed-tg'; } })();
const known = new Set(); let eventsRead = false; // plan ids already in the account, read from its own GETs
const PEOPLE = /communication|\/invite|nudge|\/sms|\/email|\/send|broadcast|\/text|announcement|\/updates?\b|\/post\b/i;
const ev = { id: ID, name: 'E2E_TEST_ Thanksgiving (signed-in check)', type: 'Thanksgiving', date: '2026-12-19', startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150', venueKind: 'home', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'pending' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', rsvp: 'pending' }, { id: 'g3', name: 'Cy Lark', phone: '(202) 555-0102', rsvp: 'pending' }] };
const OUT = path.resolve(OUTD, PHASE); fs.mkdirSync(OUT, { recursive: true });
let PRIV = /$^/; // set from the session's own address at run time, so the address is never written into this file
(async () => {
  const st = JSON.parse(fs.readFileSync(STATE, 'utf8')); for (const o of st.origins) o.localStorage = o.localStorage.filter((x) => /auth-token/.test(x.name));
  try { const tok = st.origins.flatMap((o) => o.localStorage).find((x) => /auth-token/.test(x.name)); const em = JSON.parse(tok.value).user.email; const local = em.split('@')[0]; PRIV = new RegExp(local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('+')[0], 'i'); } catch {}
  const CLEAN = STATE + '.run'; fs.writeFileSync(CLEAN, JSON.stringify(st), { mode: 0o600 });
  const b = await chromium.launch(); const r = { phase: PHASE, steps: [], errs: [], net: [], nav: [] };
  const [w, h, scheme, signedIn] = { logout: [390, 844, 'dark', 1], fix: [390, 844, 'dark', 1], setup: [390, 844, 'dark', 1], rename: [390, 844, 'dark', 1], create: [390, 844, 'dark', 1], code: [390, 844, 'dark', 1], mint: [390, 844, 'dark', 1], host390d: [390, 844, 'dark', 1], host390l: [390, 844, 'light', 1], host1194: [1194, 834, 'dark', 1], guest: [390, 844, 'light', 0], verify: [390, 844, 'dark', 1], cleanup: [390, 844, 'dark', 1] }[PHASE];
  U = U0 + '&theme=' + scheme;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, colorScheme: scheme, timezoneId: 'America/New_York', ...(signedIn ? { storageState: CLEAN } : {}) });
  await ctx.route('**/*', (rt) => { const q = rt.request(); const m = q.method(); const u = new URL(q.url()); const tag = m + ' ' + u.host + u.pathname;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') { if (/onrender|supabase/.test(u.host)) r.net.push('GET  ' + u.host + u.pathname); return rt.continue(); }
    const body = q.postData() || ''; const qs = decodeURIComponent(u.search);
    let ids = []; try { const j = JSON.parse(body || 'null'); const rows = Array.isArray(j) ? j : j ? [j] : []; ids = rows.map((x) => x && (x.id || (x.data && x.data.id))).filter(Boolean); } catch {}
    const qid = (qs.match(/id=eq\.([^&]+)/) || [])[1]; if (qid) ids.push(qid);
    const isEvents = /supabase\.co$/.test(u.host) && /^\/rest\/v1\/events$/.test(u.pathname);
    const mine = isEvents ? (ids.length > 0 && ids.every((i) => i === ID)) : (u.pathname.includes('/' + ID + '/') || u.pathname.endsWith('/' + ID));
    const fresh = PHASE === 'create' && isEvents && eventsRead && ids.length > 0 && ids.every((i) => !known.has(i)) && /E2E_TEST_|Thanksgiving/.test(body);
    let ok = false;
    if (/sentry\.io/.test(u.host)) ok = false;
    else if (/studio_settings/.test(u.pathname)) ok = false;
    else if (PHASE === 'fix' && m === 'DELETE' && /announcement/.test(u.pathname) && u.pathname.includes('/' + ID + '/')) ok = true; // taking the test update back off
    else if (PHASE === 'guest' && /onrender\.com$/.test(u.host) && /^\/api\/public\/rsvp\/[A-Za-z0-9_-]+$/.test(u.pathname) && m === 'POST') ok = true; // the one approved guest reply
    else if (PEOPLE.test(u.pathname)) ok = false;
    else if (/supabase\.co$/.test(u.host) && /^\/auth\/v1\//.test(u.pathname)) ok = true;
    else if (mine && (/supabase\.co$/.test(u.host) || /onrender\.com$/.test(u.host))) ok = true;
    else if (fresh) { ok = true; r.created = ids[0]; }
    r.net.push((ok ? 'ALLOW ' : 'BLOCK ') + tag + (mine ? ' [test plan]' : fresh ? ' [new test plan]' : ''));
    return ok ? rt.continue() : rt.abort(); });
  await ctx.addInitScript((sc) => { try { localStorage.setItem('ngw-theme', sc); } catch {} window.__out = { share: [], clip: [], open: [], nav: [] };
    try { Object.defineProperty(navigator, 'share', { value: async (d) => { window.__out.share.push(d); }, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__out.clip.push(t); } }, configurable: true }); } catch {}
    window.open = (u) => { window.__out.open.push(String(u)); return null; };
    document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^(sms|mailto):/i.test(a.getAttribute('href'))) { window.__out.nav.push(a.getAttribute('href').split('?')[0]); e.preventDefault(); } }, true); }, scheme);
  const p = await ctx.newPage(); p.setDefaultTimeout(10000);
  p.on('response', async (x) => { try { if (/rest\/v1\/events/.test(x.url()) && x.request().method() === 'GET') { eventsRead = true; for (const row of [].concat(await x.json())) if (row && row.id) known.add(row.id); } } catch {} }); p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160))); let n = 0;
  const shot = async (name) => { const t = await p.evaluate(() => document.body.innerText).catch(() => ''); if (PRIV.test(t)) return 'skipped (shows the account address)'; await p.screenshot({ path: path.join(OUT, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); return 'saved'; };
  const scrub = (x) => JSON.parse(JSON.stringify(x).replace(/[A-Za-z0-9._%+-]+@gmail\.com/gi, '[account]').replace(/\?rsvp=[A-Za-z0-9_-]+/g, '?rsvp=…'));
  const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 300); }
    try { s.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); s.shot = await shot(name); s.out = await p.evaluate(() => window.__out); } catch {}
    const c = scrub(s); r.steps.push(c); console.log(PHASE, c.ok ? 'ok  ' : 'FAIL', name, JSON.stringify(c).slice(0, 1500)); };
  const where = () => p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].map((e) => e.getAttribute('data-view')); return v[v.length - 1] || null; });
  const vt = () => p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].pop(); const d = [...document.querySelectorAll('[role=dialog], .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return { view: v ? v.innerText.replace(/\s+/g, ' ').trim().slice(0, 900) : '', sheet: d ? d.innerText.replace(/\s+/g, ' ').trim().slice(0, 900) : null, sheetButtons: d ? [...d.querySelectorAll('button, a, [role=switch], input[type=checkbox]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.innerText || e.getAttribute('aria-label') || e.type).replace(/\s+/g, ' ').trim()) : [] }; });
  const opts = () => p.evaluate(() => [...document.querySelectorAll('.gk button, .gk a, .gk [role=button]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  const tap = async (re, scope = '.gk button, .gk a, .gk [role=button], [role=dialog] button, [role=dialog] a') => { const loc = p.locator(scope).filter({ hasText: re }); const c = await loc.count(); for (let i = c - 1; i >= 0; i--) if (await loc.nth(i).isVisible()) { await loc.nth(i).click(); await p.waitForTimeout(1200); return true; } return false; };
  const toGuests = async () => { if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click();
    else { await p.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; }); await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(500); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); } await p.waitForTimeout(1500); };
  const open = async () => { await p.goto(U + '&elegant=1&guests=kit', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500); };
  const title = () => p.evaluate(() => { const t = document.querySelector('[data-tt-title] .tt-name') || document.querySelector('[data-tt-title]'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : null; });
  const pickTest = async () => { await open(); await p.evaluate(() => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); });
    for (let i = 0; i < 2; i++) { if (/E2E_TEST_/.test((await title()) || '')) return;
      await p.locator('[data-tt-title]').first().click(); await p.waitForTimeout(900);
      const opt = p.locator('[role=dialog] button, .sheet button').filter({ hasText: /E2E_TEST_ Thanksgiving/ }).first(); if (await opt.count()) { await opt.click(); await p.waitForTimeout(1800); } else await p.keyboard.press('Escape'); }
    if (/E2E_TEST_/.test((await title()) || '')) return;
    throw new Error('test plan not selected; app shows ' + (await title())); };
  const guard = async () => { const t = await title(); const kitName = await p.evaluate(() => document.body.innerText.includes('E2E_TEST_')); if (!/E2E_TEST_/.test(t || '') && !kitName) throw new Error('GUARD: not on the test plan (' + t + ')'); };
  const stored = () => p.evaluate((id) => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((e) => e.id === id) || null), ID);
  const fs2 = (k, v) => fs.writeFileSync(path.join(OUTD, k), v);
  const fs2Link = (l) => fs2('.replylink', (String(l).match(/https?:\/\/\S+/) || [String(l)])[0]);

  if (PHASE.startsWith('host')) {
    await p.goto(U); await p.waitForTimeout(1500);
    try { await pickTest(); } catch (e) { console.log('ABORT', e.message); r.steps.push({ name: 'select', ok: false, error: e.message }); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(r, null, 1)); await b.close(); fs.unlinkSync(CLEAN); return; }
    await step('0-signed-in', async () => ({ signedIn: await p.evaluate(() => Object.keys(localStorage).some((k) => /auth-token/.test(k))), plans: await p.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length), testPlan: !!(await stored()), title: await p.evaluate(() => (document.querySelector('[data-tt-title]') || {}).innerText || null) }));
    await step('1-questions-path', async () => { await guard(); await toGuests(); const asked = [];
      for (let i = 0; i < 10; i++) { const o = await opts(); const next = o.find((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion/.test(t)); if (!next) break; asked.push(next); await p.locator('.gk button, .gk a, .gk [role=button]').filter({ hasText: next.split(' Our suggestion')[0] }).first().click(); await p.waitForTimeout(900); }
      const rows = await p.evaluate(() => [...document.querySelectorAll('.gk button, .gk [role=button], .gk li, .gk div')].filter((e) => e.childElementCount < 6 && e.getBoundingClientRect().width > 0 && /^(✓\s*)?(Your answers|Names|Your invite|Replies|The count|Updates and questions)/.test(e.innerText.replace(/^[✓•\s]+/, ''))).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
      if (!(await where())) throw new Error('kit not open'); return { asked, pathRows: [...new Set(rows)].slice(0, 8) }; });
    await step('2-your-invite', async () => { await guard(); if (!((await tap(/^Review your invite/)) || (await tap(/Your invite/)))) throw new Error('no Your invite');
      await p.waitForTimeout(2000); const v = await vt(); const frames = await p.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => ({ src: (f.getAttribute('src') || '').split('&')[0], h: Math.round(f.getBoundingClientRect().height), loaded: (() => { try { return f.contentDocument && f.contentDocument.body ? f.contentDocument.body.innerText.replace(/\s+/g, ' ').slice(0, 120) : null; } catch { return 'cross-origin'; } })() })));
      return { view: await where(), notReady: (v.view.match(/[^.]*(isn.t ready|sign in)[^.]*\./i) || [null])[0], voices: ['As written', 'Tighter', 'Warmer', 'Playful', 'Formal'].filter((x) => v.view.includes(x)), frames, text: v.view.slice(0, 500) }; });
    await step('3-send-sheet', async () => { await guard(); const sendBtns = await p.evaluate(() => [...document.querySelectorAll('.gk button')].filter((e) => e.getBoundingClientRect().width > 0 && /^(Send|Invite)/.test(e.innerText.trim())).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
      if (!sendBtns.length) throw new Error('no send button on Your invite :: ' + JSON.stringify((await opts()).slice(-8)));
      await p.locator('.gk button').filter({ hasText: sendBtns[sendBtns.length - 1] }).last().click(); await p.waitForTimeout(1500); const v = await vt();
      // Owner rule (11/28): stop at the send sheet, screenshot it, never tap send.
      return { opened: sendBtns[sendBtns.length - 1], sheet: v.sheet, sheetButtons: v.sheetButtons, tapped: null }; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    await step('4-share-link', async () => { await guard(); if (!(await where())) await toGuests(); if ((await where()) !== 'guests') await tap(/^Guests$/);
      await tap(/^⋯$/); const menu = await vt(); await tap(/Share the link/); await p.waitForTimeout(1500); const after = await vt(); const o = await p.evaluate(() => window.__out);
      const link = (o.share[0] && (o.share[0].url || o.share[0].text)) || o.clip[0] || null; if (link && PHASE === 'host390d') fs2('.replylink', String(link).match(/https?:\/\/\S+/) ? String(link).match(/https?:\/\/\S+/)[0] : String(link));
      return { menu: menu.sheet, menuButtons: menu.sheetButtons, afterShare: after.sheet, linkShape: link ? String(link).replace(/[?#].*/, '?…').slice(0, 120) : null, sharedVia: o.share.length ? 'share' : o.clip.length ? 'clipboard' : 'none' }; });
    await step('6-notify-toggle', async () => { await guard(); const state = () => p.evaluate(() => { const e = document.querySelector('[role=dialog] [role=switch], [role=dialog] [aria-checked], .gk-sheet [role=switch], .gk-sheet [aria-checked]'); return e ? e.getAttribute('aria-checked') : null; });
      const sw = () => p.locator('[role=dialog] [role=switch], [role=dialog] [aria-checked], .gk-sheet [role=switch], .gk-sheet [aria-checked]').first();
      const before = await state(); if (!(await sw().count())) throw new Error('no switch'); await sw().click(); await p.waitForTimeout(3000); const flipped = await state();
      await open(); await toGuests(); await tap(/^⋯$/); const afterReload = await state();
      await sw().click(); await p.waitForTimeout(3000); const restored = await state();
      if (afterReload !== flipped) throw new Error('did not persist :: ' + JSON.stringify({ before, flipped, afterReload }));
      return { before, flipped, afterReload, restored }; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    await step('5-updates-questions', async () => { await guard(); if (!(await where())) await toGuests(); if ((await where()) !== 'guests') await tap(/^Guests$/); if (!(await tap(/^Updates and questions/))) throw new Error('no Updates row');
      await p.waitForTimeout(2500); const v = await vt(); const box = p.locator('.gk textarea').first(); let after = null;
      if (await box.count()) { await box.fill('E2E_TEST_ Parking is on the street. (test, not sent)'); const ok = await tap(/^Post the update$/); await p.waitForTimeout(3000); after = { tapped: ok, ...(await vt()) }; if (/Not yet/.test(after.view + (after.sheet || ''))) { await tap(/^Not yet$/); after.confirmAnswered = 'Not yet'; } }
      return { view: await where(), text: v.view.slice(0, 700), after: after && { tapped: after.tapped, view: after.view.slice(0, 500), sheet: after.sheet } }; });
  }
  if (PHASE === 'create') {
    await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(3500);
    await step('c0-create', async () => { if (!eventsRead) throw new Error('account plans not read yet; refusing to create');
      await p.locator('[data-tt-bar]').getByRole('button', { name: 'Create', exact: true }).click(); await p.waitForTimeout(1200);
      const box = p.getByPlaceholder(/Try:/).first(); await box.fill('E2E_TEST_ Thanksgiving at our place for 12, December 19 at 3pm'); await box.press('Enter'); await p.waitForTimeout(6000);
      let t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      for (const lbl of [/^Keep this plan$/, /^Looks right$/, /^That's it$/, /^That’s it$/, /^Make the plan$/, /^Build my plan$/]) { const bt = p.getByRole('button', { name: lbl }); if (await bt.count()) { await bt.first().click(); await p.waitForTimeout(3000); } }
      const id = await p.evaluate(() => localStorage.getItem('ngw-hostv2-last-event')); const ttl = await title();
      return { newId: id, known: [...known].length, title: ttl, created: r.created || null, text: t.slice(0, 300) }; });
    const nid = await p.evaluate(() => localStorage.getItem('ngw-hostv2-last-event'));
    if (nid && !known.has(nid) && /^cust-/.test(nid)) { ID = nid; fs.writeFileSync(path.join(OUTD, '.testid'), nid); }
    await step('c1-rename', async () => { if (!ID || known.has(ID)) throw new Error('no new plan id'); const cur = await title();
      if (!/E2E_TEST_/.test(cur || '')) { const rn = p.getByRole('button', { name: /Rename|Name it/ }).first(); await rn.click(); await p.waitForTimeout(600); const inp = p.locator('[data-tt-head] input, input[aria-label*="name" i]').first(); await inp.fill('E2E_TEST_ Thanksgiving (signed-in check)'); await inp.press('Enter'); await p.waitForTimeout(3000); }
      const e = await p.evaluate((id) => { const all = [...JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'), ...JSON.parse(localStorage.getItem('ngw-events') || '[]')]; const x = all.find((y) => y && y.id === id); return x ? { name: x.name, hasCode: !!x.rsvpCode, guests: (x.guests || []).length } : null; }, ID);
      return { id: ID, title: await title(), plan: e }; });
  }
  if (PHASE === 'rename') {
    await p.goto(U); await p.evaluate((id) => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-last-event', id); }, ID);
    await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(3500);
    await step('r1-rename', async () => { const before = await title();
      await p.locator('[data-tt-title]').first().click(); await p.waitForTimeout(900);
      const rows = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? [...d.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6) : []; });
      if (!/current/.test(rows[1] || '') || /Friendsgiving/.test(rows[1] || '')) throw new Error('current plan is not the new one :: ' + JSON.stringify(rows));
      await p.locator('[role=dialog] button, .sheet button').filter({ hasText: /^Rename$/ }).first().click(); await p.waitForTimeout(700);
      const inp = p.locator('[role=dialog] input, .sheet input, [data-tt-head] input').first(); await inp.fill('E2E_TEST_ Thanksgiving (signed-in check)'); await inp.press('Enter'); await p.waitForTimeout(3000);
      return { before, rowsBefore: rows.slice(0, 3), after: await title(), id: await p.evaluate(() => localStorage.getItem('ngw-hostv2-last-event')) }; });
  }
  if (PHASE === 'setup') {
    await pickTest();
    await step('s1-answers', async () => { await guard(); await toGuests(); const asked = [];
      for (let i = 0; i < 10; i++) { const o = await opts(); const next = o.find((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion|^By name/.test(t)); if (!next) break; asked.push(next); await p.locator('.gk button, .gk a, .gk [role=button]').filter({ hasText: next.split(' Our suggestion')[0] }).first().click(); await p.waitForTimeout(900); }
      return { asked, buttons: (await opts()).slice(0, 14) }; });
    await step('s2-add-names', async () => { await guard(); if ((await opts()).some((t) => /Names 3 named/.test(t))) return { skipped: 'already 3 named' }; if (await tap(/^Switch to a list of names$/)) await p.waitForTimeout(1200);
      const o1 = await opts(); if (!(await tap(/^＋$|^Add names?$|^Add a name$|^Add guests$/))) throw new Error('no add button :: ' + JSON.stringify(o1.slice(0, 16))); const v = await vt();
      const ta = p.locator('[role=dialog] textarea, .gk-sheet textarea, .gk textarea').first(); if (!(await ta.count())) return { sheet: v.sheet, note: 'no textarea', buttons: (await opts()).slice(0, 16) };
      await ta.fill('Ada Pine\nBo Reed\nCy Lark'); const add = await tap(/^Add( them| \d+| these)?/); await p.waitForTimeout(1500); return { sheetBefore: v.sheet && v.sheet.slice(0, 300), add, buttons: (await opts()).slice(0, 16) }; });
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(500); if (!(await where())) await toGuests();
    for (const [nm, kind, val] of [['Ada Pine', 'email', 'ada.pine@example.com'], ['Bo Reed', 'email', 'bo.reed@example.com'], ['Cy Lark', 'tel', '(202) 555-0102']]) {
      await step('s3-reach-' + nm.split(' ')[0], async () => { await guard(); let row = p.locator('[data-guest]').filter({ hasText: nm }).first();
        if (!(await row.isVisible().catch(() => false))) { const g = p.locator('.gk button[data-group]'); for (let i = 0; i < await g.count(); i++) { await g.nth(i).click(); await p.waitForTimeout(400); if (await row.isVisible().catch(() => false)) break; } }
        await row.click(); await p.waitForTimeout(900); const inp = p.locator(`.gk input[type=${kind}]`).first(); if (!(await inp.count())) throw new Error('no ' + kind + ' field');
        const cur = await inp.inputValue(); if (cur !== val) { await inp.fill(val); await inp.press('Tab'); await p.waitForTimeout(1500); }
        await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(1200); if (!(await where())) await toGuests(); return { filled: kind, already: cur === val, view: await where() }; });
    }
    await step('s4-check', async () => { await guard(); const e = await p.evaluate((id) => { const all = [...JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'), ...JSON.parse(localStorage.getItem('ngw-events') || '[]')]; const x = all.find((y) => y && y.id === id); return x ? { hasCode: !!x.rsvpCode, guests: (x.guests || []).map((g) => g.name + (g.email ? ' ✉' : '') + (g.phone ? ' ☎' : '')), address: x.venueAddress || null, venue: x.venue || null } : null; }, ID); return { plan: e }; });
  }
  if (PHASE === 'fix') {
    await pickTest();
    await step('f1-take-update-off', async () => { await guard(); await toGuests(); if (!(await tap(/^Updates and questions/))) throw new Error('no Updates row'); await p.waitForTimeout(2000);
      const had = (await vt()).view.includes('E2E_TEST_ Parking'); if (had) { await tap(/^Take it off$/); await p.waitForTimeout(2500); const c = p.getByRole('button', { name: /^Take it off$|^Yes, take it off$|^Remove it$/ }); if (await c.count()) { await c.last().click(); await p.waitForTimeout(2500); } }
      const v = await vt(); return { had, stillThere: v.view.includes('E2E_TEST_ Parking'), text: v.view.slice(0, 300) }; });
    await step('f2-street-address', async () => { await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500); await guard();
      await p.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; }); await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(600); await p.locator('[data-door]', { hasText: /^Venue/ }).first().click(); await p.waitForTimeout(1500);
      const f = p.locator('.sheet input, [role=dialog] input').filter({ hasNot: p.locator('[type=checkbox]') }); const labels = await p.evaluate(() => [...document.querySelectorAll('.sheet label, [role=dialog] label, .sheet .field-label')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 10));
      const inp = p.locator('.sheet label, [role=dialog] label').filter({ hasText: /street|address/i }).locator('input').first(); if (!(await inp.count())) throw new Error('no address field :: ' + JSON.stringify(labels));
      await inp.fill('123 Example St, Springfield, VA 22150'); await p.locator('.sheet button, [role=dialog] button').filter({ hasText: /^Save$/ }).first().click(); await p.waitForTimeout(3500);
      const e = await p.evaluate((id) => { const all = [...JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'), ...JSON.parse(localStorage.getItem('ngw-events') || '[]')]; const x = all.find((y) => y && y.id === id); return x ? { venue: x.venue, venueAddress: x.venueAddress || null } : null; }, ID);
      return { labels, plan: e }; });
  }
  if (PHASE === 'del325') { // #325: a fresh browser (the plan loads only from the account) deletes it from the plan list
    await p.goto(U); await p.evaluate(() => { localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); });
    await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(3500);
    await step('d1-plan-loads-from-account', async () => { const st = await p.evaluate((id) => ({ customs: JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').map((x) => x && x.id), cache: JSON.parse(localStorage.getItem('ngw-events') || '[]').map((x) => x && x.id) }), ID);
      if (!st.cache.includes(ID)) throw new Error('test plan not loaded from the account :: ' + JSON.stringify(st)); return { inCustoms: st.customs.includes(ID), inCache: true }; });
    await step('d2-delete-from-list', async () => { await p.locator('[data-tt-title]').first().click(); await p.waitForTimeout(900);
      const rows = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? [...d.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.getAttribute('aria-label') || '') + ' | ' + e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 12) : []; });
      const del = p.locator('[role=dialog] button, .sheet button').filter({ hasText: /Delete/ }).and(p.locator('[aria-label^="Delete E2E_TEST_"], :text("Delete this event")')).first();
      const byLabel = p.locator('[aria-label="Delete ' + ev.name + '"]'); const target = (await byLabel.count()) ? byLabel.first() : del;
      if (!(await target.count())) throw new Error('no Delete for the synced test plan :: ' + JSON.stringify(rows));
      await target.click(); await p.waitForTimeout(700);
      const ask = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? (d.innerText.match(/Delete[^\n]{0,80}\?/) || [null])[0] : null; });
      const sure = p.locator('[aria-label="Delete ' + ev.name + ' for good"]'); const sure2 = p.locator('[role=dialog] button, .sheet button').filter({ hasText: /^Delete it$/ });
      if (await sure.count()) await sure.first().click(); else if (await sure2.count()) await sure2.first().click(); else throw new Error('no confirm :: ' + JSON.stringify(rows));
      await p.waitForTimeout(6000); return { rowsBefore: rows, asked: ask }; });
    await step('d3-gone-after-reload', async () => { await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(4000);
      const st = await p.evaluate((id) => ({ customs: JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').map((x) => x && x.id).includes(id), cache: JSON.parse(localStorage.getItem('ngw-events') || '[]').map((x) => x && x.id).includes(id), title: (document.querySelector('[data-tt-title]') || {}).innerText || null }), ID);
      await p.locator('[data-tt-title]').first().click().catch(() => {}); await p.waitForTimeout(800);
      const listed = await p.evaluate((n) => document.body.innerText.includes(n), ev.name);
      if (st.customs || st.cache || listed) throw new Error('still there after reload :: ' + JSON.stringify({ ...st, listed })); return { ...st, listed }; });
  }
  if (PHASE === 'code') { // a plan made in the app gets an rsvpCode at creation (mintRsvpToken); the seeded test plan lacked one
    await pickTest();
    await step('c1-add-rsvp-code', async () => { await guard(); const code = require('crypto').randomBytes(16).toString('base64url');
      const had = await p.evaluate(([id, c]) => { const k = 'ngw-events'; const a = JSON.parse(localStorage.getItem(k) || '[]'); const e = a.find((x) => x && x.id === id); if (!e) throw new Error('no test plan in cache'); const had = !!e.rsvpCode; if (!had) e.rsvpCode = c; localStorage.setItem(k, JSON.stringify(a)); return had; }, [ID, code]);
      await open(); await guard();
      // one in-app edit on the test plan so the app saves it whole (the plan's "Tell me when someone replies" switch, flipped and flipped back)
      await toGuests(); await tap(/^⋯$/); const sw = p.locator('[role=dialog] [role=switch], [role=dialog] [aria-checked]').first();
      if (await sw.count()) { await sw.click(); await p.waitForTimeout(2500); await sw.click(); await p.waitForTimeout(3000); }
      const cached = await p.evaluate((id) => { const e = (JSON.parse(localStorage.getItem('ngw-events') || '[]')).find((x) => x && x.id === id); return !!(e && e.rsvpCode); }, ID);
      return { hadCode: had, cachedHasCode: cached }; });
  }
  if (PHASE === 'cleanup') {
    await pickTest();
    await p.evaluate((id) => { const c = JSON.parse(localStorage.getItem('ngw-events') || '[]').find((x) => x && x.id === id); if (!c) return; const k = 'ngw-hostv2-custom-events'; const a = JSON.parse(localStorage.getItem(k) || '[]').filter((x) => x.id !== id); a.push(c); localStorage.setItem(k, JSON.stringify(a)); }, ID);
    await pickTest();
    await step('9-delete-test-plan', async () => { await guard(); await p.locator('[data-tt-title]').first().click(); await p.waitForTimeout(900);
      const del = p.getByRole('button', { name: 'Delete ' + ev.name, exact: true }); if (!(await del.count())) throw new Error('no delete row for the test plan');
      await del.first().click(); await p.waitForTimeout(600);
      const sure = p.getByRole('button', { name: 'Delete ' + ev.name + ' for good', exact: true }); if (!(await sure.count())) throw new Error('no confirm for the test plan');
      await sure.first().click(); await p.waitForTimeout(5000);
      const left = await p.evaluate((id) => { const a = JSON.parse(localStorage.getItem('ngw-events') || '[]').map((x) => x && x.id); const b2 = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').map((x) => x && x.id); return { cache: a, customs: b2 }; }, ID);
      return { left }; });
  }
  if (PHASE === 'logout') {
    await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500);
    await step('10-sign-out', async () => { await p.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; }); await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(600);
      await p.locator('[data-door]', { hasText: /You & settings/ }).first().click(); await p.waitForTimeout(1500);
      const so = p.locator('.sheet button, [role=dialog] button').filter({ hasText: /^(Sign out|Log out)/ }).first(); if (!(await so.count())) throw new Error('no sign-out button');
      await so.click(); await p.waitForTimeout(1500); const c = p.locator('.sheet button, [role=dialog] button').filter({ hasText: /^(Sign out|Yes, sign out|Log out)/ }); if (await c.count()) { await c.last().click().catch(() => {}); } await p.waitForTimeout(3000);
      return { tokenLeft: await p.evaluate(() => Object.keys(localStorage).some((k) => /auth-token/.test(k))) }; });
  }
  if (PHASE === 'mint') { // the kit says to open the plan once in the current app (no ?guests=kit) so its reply link is made
    await p.goto(U); await p.waitForTimeout(1200);
    const openOld = async () => { await p.goto(U + '&elegant=1', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500); };
    await openOld(); if (!/E2E_TEST_/.test((await title()) || '')) { await p.locator('[data-tt-title]').first().click(); await p.waitForTimeout(900); await p.locator('[role=dialog] button, .sheet button').filter({ hasText: /E2E_TEST_ Thanksgiving/ }).first().click(); await p.waitForTimeout(2500); }
    await step('m1-current-app-guests', async () => { await guard(); await toGuests(); await p.waitForTimeout(4000); const t = await p.evaluate(() => { const d = [...document.querySelectorAll('.sheet, [role=dialog]')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 900) : ''; }); return { text: t }; });
    await step('m2-kit-share', async () => { await p.goto(U + '&elegant=1&guests=kit', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(2500); await guard(); await toGuests(); await tap(/^⋯$/); await tap(/Share the link/); await p.waitForTimeout(1500);
      const o = await p.evaluate(() => window.__out); const link = (o.share[0] && o.share[0].url) || o.clip[0] || null; if (link) fs2Link(link); const v = await vt(); return { linkShape: link ? String(link).replace(/[?#].*/, '?…') : null, sharedVia: o.share.length ? 'share' : o.clip.length ? 'clipboard' : 'none', sheet: v.sheet }; });
  }
  if (PHASE === 'guest') {
    const link = fs.readFileSync(path.join(OUTD, '.replylink'), 'utf8').trim();
    await step('7a-guest-page', async () => { await p.goto(link, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(3000); const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      return { text: t.slice(0, 700), buttons: await p.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.innerText || e.placeholder || e.getAttribute('aria-label') || e.name || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30)) }; });
  }
  if (PHASE === 'guest') {
    await step('7b-guest-reply', async () => { await p.getByText(/^Yes, I.m in$/).first().click(); await p.waitForTimeout(1200);
      const nm = p.getByPlaceholder(/Your name/).first(); if (await nm.count()) { await nm.fill('Ada Pine'); }
      const btns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
      const go = btns.find((t) => /^(Send my reply|Send (it|reply)|Save my reply|Confirm|Done|That.s me|Reply)$/i.test(t));
      if (go) { await p.getByRole('button', { name: go, exact: true }).first().click(); await p.waitForTimeout(3500); }
      const t = (await p.locator('body').innerText()).replace(/\s+/g, ' '); const i = t.indexOf('THE FAVOR OF A REPLY');
      return { buttonsAfterYes: btns.slice(0, 12), tapped: go || null, after: t.slice(Math.max(0, i), i + 400) }; });
  }
  if (PHASE === 'verify') {
    await pickTest();
    await step('7c-host-sees-reply', async () => { await guard(); await toGuests(); await p.waitForTimeout(2500);
      const rows = await p.evaluate(() => [...new Set([...document.querySelectorAll('.gk button, .gk [role=button]')].filter((e) => e.getBoundingClientRect().width > 0 && /Replies|The count|Coming|No reply|Your invite/.test(e.innerText)).map((e) => e.innerText.replace(/\s+/g, ' ').trim()))].slice(0, 10));
      const ada = await p.evaluate((id) => { const all = [...JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]'), ...JSON.parse(localStorage.getItem('ngw-events') || '[]')]; const x = all.find((y) => y && y.id === id); const g = x && (x.guests || []).find((q) => q.name === 'Ada Pine'); return g ? g.rsvp : null; }, ID);
      return { rows, adaRsvp: ada }; });
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(scrub(r), null, 1));
  console.log('\nNET', PHASE); for (const l of [...new Set(r.net)]) if (!/^GET /.test(l)) console.log(' ', l); console.log('GETs', [...new Set(r.net.filter((l) => /^GET/.test(l)))].length, 'pageErrors', JSON.stringify(r.errs));
  if (signedIn) { const ns = await ctx.storageState(); for (const o of ns.origins) o.localStorage = o.localStorage.filter((x) => /auth-token/.test(x.name)); fs.writeFileSync(STATE, JSON.stringify(ns), { mode: 0o600 }); }
  await b.close(); try { fs.unlinkSync(CLEAN); } catch {}
})();
