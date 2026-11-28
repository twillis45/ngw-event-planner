// Signed-out pass of hostv2 ?guests=kit (f3b65ccb): Guests path, Your invite, Send, ⋯ More → Share the link / QR, Updates and questions.
//   node livecheck/signedout-kit-f3b6.cjs <outdir>
// No account. Seeded E2E_TEST_ Thanksgiving plan in this browser only; guests at example.com.
// Every POST/PUT/PATCH/DELETE aborted and recorded; share/clipboard/open stubbed and recorded; sms:/mailto: clicks stopped and recorded. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-so'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true, 'dark'], [390, 844, true, 'light'], [1194, 834, true, 'dark']];
const ev = { id: 'E2E_TEST_so-tg', name: 'E2E_TEST_ Thanksgiving', type: 'Thanksgiving', date: '2026-12-19', startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueAddress: '123 Example St, Springfield, VA 22150', venueKind: 'home', venueCity: 'Springfield, VA', guestMode: 'list', vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g1', name: 'Ada Pine', email: 'ada.pine@example.com', rsvp: 'pending' }, { id: 'g2', name: 'Bo Reed', email: 'bo.reed@example.com', phone: '(202) 555-0101', rsvp: 'pending' }, { id: 'g3', name: 'Cy Lark', phone: '(202) 555-0102', rsvp: 'pending' }] };
const T = (s) => (s || '').replace(/\s+/g, ' ').trim();
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch, scheme] of VPS) {
    const vp = `${w}x${h}-${scheme}`; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0;
    const r = { vp, steps: [], errs: [], blocked: [], reads: [], http4xx: [] };
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: scheme, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => { const q = rt.request(); const m = q.method(); const u = new URL(q.url());
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) { r.blocked.push(m + ' ' + u.host + u.pathname); return rt.abort(); }
      if (/\/api\//.test(u.pathname) || /supabase/.test(u.host)) r.reads.push(m + ' ' + u.host + u.pathname);
      return rt.continue(); });
    // hostv2 takes its theme from localStorage['ngw-theme'], not prefers-color-scheme.
    await ctx.addInitScript((sc) => { try { localStorage.setItem('ngw-theme', sc); } catch {} }, scheme);
    await ctx.addInitScript(() => { window.__out = { share: [], clip: [], open: [], nav: [] };
      try { Object.defineProperty(navigator, 'share', { value: async (d) => { window.__out.share.push(d); }, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__out.clip.push(t); }, write: async () => { window.__out.clip.push('[blob]'); } }, configurable: true }); } catch {}
      window.open = (u) => { window.__out.open.push(String(u)); return null; };
      document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^(sms|mailto|tel):/i.test(a.getAttribute('href'))) { window.__out.nav.push(a.getAttribute('href')); e.preventDefault(); } }, true); });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
    p.on('response', (x) => { if (x.status() >= 400) r.http4xx.push(x.status() + ' ' + x.request().method() + ' ' + new URL(x.url()).pathname); });
    p.on('framenavigated', (f) => { if (f !== p.mainFrame()) r.reads.push('FRAME ' + f.url().split('?')[0]); });
    await p.clock.setFixedTime(new Date('2026-11-28T10:00:00-05:00'));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 300); }
      try { s.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {}
      s.out = await p.evaluate(() => JSON.parse(JSON.stringify(window.__out))).catch(() => null); r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, JSON.stringify(s).slice(0, 900)); };
    const where = () => p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].map((e) => e.getAttribute('data-view')); return v[v.length - 1] || null; });
    const opts = () => p.evaluate(() => [...document.querySelectorAll('.gk button, .gk a, .gk [role=button], .gk [role=switch], .gk input, .gk textarea')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') ? `[${e.tagName.toLowerCase()} ${e.type || ''} "${e.placeholder || e.getAttribute('aria-label') || ''}"]` : (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    const viewText = () => p.evaluate(() => { const v = [...document.querySelectorAll('.gk [data-view]')].pop(); const dlg = [...document.querySelectorAll('[role=dialog], .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return { view: (v ? v.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 900), sheet: dlg ? dlg.innerText.replace(/\s+/g, ' ').trim().slice(0, 700) : null }; });
    const tap = async (re) => { const loc = p.locator('.gk button, .gk a, .gk [role=button], [role=dialog] button, [role=dialog] a, .gk-sheet button').filter({ hasText: re }); const c = await loc.count(); for (let i = 0; i < c; i++) { if (await loc.nth(i).isVisible()) { await loc.nth(i).click(); await p.waitForTimeout(900); return true; } } return false; };
    const toGuests = async () => { if (await p.locator('.srail-row', { hasText: /Guests/ }).count()) await p.locator('.srail-row', { hasText: /Guests/ }).first().click();
      else { await p.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click(); await p.waitForTimeout(500); await p.locator('[data-door]', { hasText: /Guest/ }).first().click(); } await p.waitForTimeout(1300); };
    const closeTop = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(500); };

    await p.goto(U); await p.evaluate((e) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id); }, ev);
    await p.goto(U + '&elegant=1&guests=kit', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800);

    await step('1-questions-path', async () => { await toGuests(); const asked = [];
      for (let i = 0; i < 10; i++) { const o = await opts(); if (o.some((t) => /^Review your invite|^Send|Your invite/.test(t)) && !o.some((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion/.test(t))) break;
        const q = await p.evaluate(() => [...document.querySelectorAll('.gk h1, .gk h2')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()).pop());
        const next = o.find((t) => /^Plan for \d+$|^Not this time$|^Adults only$|Our suggestion/.test(t)); if (!next) break; asked.push(q + ' → ' + next);
        await p.locator('.gk button, .gk a, .gk [role=button]').filter({ hasText: next.slice(0, 22) }).first().click(); await p.waitForTimeout(800); }
      const rows = await p.evaluate(() => [...document.querySelectorAll('.gk button, .gk [role=button]')].filter((e) => e.getBoundingClientRect().width > 0 && /^(✓\s*)?(Your answers|Names|Your invite|Replies|The count|Updates and questions)/.test(e.innerText.replace(/^[✓•\s]+/, ''))).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
      return { asked, pathRows: rows, buttons: await opts() }; });
    await step('2-your-invite', async () => { const ok = (await tap(/^Review your invite/)) || (await tap(/^Your invite/)); if (!ok) throw new Error('no way into Your invite');
      await p.waitForTimeout(1500); const v = await viewText();
      const frames = await p.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => ({ src: f.getAttribute('src'), w: Math.round(f.getBoundingClientRect().width), h: Math.round(f.getBoundingClientRect().height) })));
      const notReady = /isn.t ready|sign in/i.test(v.view); const voices = ['As written', 'Tighter', 'Warmer', 'Playful', 'Formal'].filter((x) => v.view.includes(x));
      return { view: await where(), notReadyNote: notReady ? (v.view.match(/[^.]*(isn.t ready|sign in)[^.]*\./i) || [''])[0] : null, frames, voices, text: v.view.slice(0, 600), buttons: await opts() }; });
    await step('3-send-invite', async () => { const sb = p.locator('.gk button').filter({ hasText: /^Send the invite/ }); let clickNote = null;
      try { await sb.last().click({ timeout: 4000 }); } catch (e) { clickNote = { err: String(e.message).split('\n').filter((l) => /intercept|visible|stable|enabled|scroll/.test(l)).slice(0, 4).join(' | ').slice(0, 400), n: await sb.count(), info: await sb.evaluateAll((els) => els.map((x) => { const q = x.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height), getComputedStyle(x).visibility, x.disabled]; })) }; await sb.last().evaluate((x) => x.click()); }
      await p.waitForTimeout(1200);
      const sheet = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); return d ? { text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200), buttons: [...d.querySelectorAll('button, a')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) } : null; });
      if (!sheet) throw new Error('no send sheet');
      // Signed out the sheet offers only "Sign in in the current app": that is sign-in, not a send, so it is read and not tapped.
      const goLabel = sheet.buttons.find((t) => /^Send/.test(t) && !/^Send the invite$/.test(t)) || null;
      let after = null; if (goLabel) { await p.locator('[role=dialog] button, .gk-sheet button').filter({ hasText: goLabel }).last().click(); await p.waitForTimeout(1500);
        after = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog], .gk-sheet')].filter((e) => e.getBoundingClientRect().width > 0).pop(); const toast = [...document.querySelectorAll('[role=status], [aria-live]')].map((e) => e.innerText.trim()).filter(Boolean); return { sheet: d ? d.innerText.replace(/\s+/g, ' ').trim().slice(0, 900) : null, live: toast }; }); }
      return { clickNote, sheet, tapped: goLabel, after }; });
    await closeTop();
    await step('4-more-share-qr', async () => { if (!(await where())) await toGuests(); if ((await where()) !== 'guests') { await tap(/^Guests$/); }
      if (!(await tap(/^⋯$/))) { const more = p.getByRole('button', { name: /More/i }); if (await more.count()) await more.first().click(); await p.waitForTimeout(700); }
      const menu = await viewText(); const b = await opts(); const shared = await tap(/Share the link/); await p.waitForTimeout(800); const afterShare = await viewText();
      const out = await p.evaluate(() => window.__out); await tap(/^Done$/);
      if (!(await tap(/^⋯$/))) {} const qrBtn = await tap(/QR/); const qr = await p.evaluate(() => { const links = [...document.querySelectorAll('a[href]')].filter((a) => /QR|qr/.test(a.innerText + a.className)).map((a) => a.href); const img = [...document.querySelectorAll('img, svg, canvas')].filter((e) => /qr/i.test((e.getAttribute('alt') || '') + (e.getAttribute('aria-label') || '') + e.className)).map((e) => e.getAttribute('alt') || e.getAttribute('aria-label')); return { links, img }; });
      const afterQr = await viewText(); const out2 = await p.evaluate(() => window.__out);
      return { menuButtons: b, menu: menu.sheet || null, shareTapped: shared, afterShare: afterShare.sheet || afterShare.view.slice(0, 600), shared: out.share, copied: out.clip, opened: out.open, qrTapped: qrBtn, qr, afterQr: afterQr.sheet || afterQr.view.slice(0, 300), openedAfterQr: out2.open }; });
    await closeTop();
    await step('5-updates-questions', async () => { if (!(await where())) await toGuests(); if ((await where()) !== 'guests') await tap(/^Guests$/); const ok = await tap(/^Updates and questions/); await p.waitForTimeout(1500);
      const v = await viewText(); const b = await opts(); const box = p.locator('.gk textarea, .gk input[type=text]').first(); let after = null;
      if (await box.count()) { await box.fill('E2E_TEST_ Parking is on the street. (not sent)'); await p.waitForTimeout(300); const sent = await tap(/^Send|^Post|^Share update/); await p.waitForTimeout(1200); after = { tapped: sent, ...(await viewText()) }; }
      return { opened: ok, view: await where(), text: v.view.slice(0, 700), sheet: v.sheet, buttons: b, after }; });
    r.blocked = [...new Set(r.blocked)]; r.reads = [...new Set(r.reads)]; r.http4xx = [...new Set(r.http4xx)]; res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) console.log(`\n${r.vp} pageErrors:${JSON.stringify(r.errs)}\n blocked:${JSON.stringify(r.blocked)}\n reads:${JSON.stringify(r.reads)}\n http>=400:${JSON.stringify(r.http4xx)}`);
})();
