// hostv4 Guests swipe actions (#274) at the five live-check sizes.
//   node livecheck/hostv4-swipe.cjs <outdir>
// Seeded E2E_TEST_ plan, reseeded before every step; network writes aborted; share/clipboard/open stubbed.
// Saves land only in this browser's localStorage. Nothing sent.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-swipe'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const R = (n, rsvp) => ({ id: 'g' + n.replace(/\W/g, ''), name: n, rsvp });
const BASEGUESTS = [R('Ada Pine', 'Yes'), R('Ben Oak', 'Yes'), R('Cy Fern', 'Yes'), R('Dee Ash', 'Yes'), R('Eli Elm', 'Maybe'), R('Fay Yew', 'Maybe'),
  R('Gus Bay', ''), R('Hal Fir', ''), R('Ivy Box', ''), R('Jo Lime', ''), R('Kai Teak', 'No'), R('Lu Cedar', 'No')];
const mkEv = (over = {}) => ({ id: 'E2E_TEST_lc-v4s', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550,
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-25',
  guests: BASEGUESTS.map((g) => ({ ...g, ...(over[g.id] || {}) })), vendors: [] });
const GKEY = 'ngw-hostv4-open-group:E2E_TEST_lc-v4s';
const navTo = async (p, name) => {
  const tab = p.getByRole('tab', { name });
  if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
  const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
  await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click();
};
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); let n = 0;
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    await p.goto(BASE);
    const seed = async (over, group) => {
      await p.evaluate(([k, l, ev, gk, grp]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); localStorage.setItem(gk, grp); }, [KEY, LAST, mkEv(over), GKEY, group]);
      await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800);
      await navTo(p, 'Your plan'); await p.waitForTimeout(300);
      const prow = p.locator('[data-plan-row="guests"]'); if (await prow.count()) await prow.first().click(); else await navTo(p, 'Guests');
      await p.waitForSelector('[data-view="guests"]', { timeout: 8000 }); await p.waitForTimeout(500);
      const back = p.getByRole('button', { name: 'Back to Guests', exact: true }); if (await back.isVisible().catch(() => false)) { await back.click(); await p.waitForTimeout(300); }
    };
    const guests = () => p.evaluate((k) => (JSON.parse(localStorage.getItem(k) || '[]')[0] || {}).guests || [], KEY);
    const rsvpOf = async (id) => ((await guests()).find((g) => g.id === id) || {}).rsvp;
    const head = () => p.locator('[data-headcount]').getAttribute('aria-label');
    const row = (id) => p.locator(`[data-guest="${id}"]`);
    // dx > 0: start near the row's left edge; dx < 0: near its right edge, so the drag stays on screen.
    const drag = async (id, dx, dy = 0) => {
      // #278 put the path above the groups, so a row can sit under the bottom button: centre it first.
      await row(id).evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(150);
      const bb = await row(id).boundingBox(); if (!bb) throw new Error('no row ' + id);
      const x0 = dx >= 0 ? bb.x + 20 : bb.x + bb.width - 20; const y0 = bb.y + bb.height / 2;
      await p.mouse.move(x0, y0); await p.mouse.down();
      for (let i = 1; i <= 8; i++) await p.mouse.move(x0 + (dx * i) / 8, y0 + (dy * i) / 8);
      await p.mouse.up(); await p.waitForTimeout(400);
    };
    const btnState = (label) => p.evaluate((label) => {
      const e = document.querySelector(`[aria-label="${label}"]`); if (!e) return null; const bx = e.getBoundingClientRect();
      return { shown: !e.closest('[aria-hidden="true"]') && e.tabIndex !== -1, w: Math.round(bx.width), h: Math.round(bx.height), onScreen: bx.right <= innerWidth + 1 && bx.left >= -1 };
    }, label);
    const expectShown = async (labels, want = true) => {
      const out = {};
      for (const l of labels) { const s = await btnState(l); out[l] = s; if (!s || s.shown !== want) throw new Error(`${l}: ${JSON.stringify(s)} want shown=${want}`); if (want && (s.w < 44 || s.h < 44)) throw new Error(`${l} under 44px: ${s.w}x${s.h}`); }
      return out;
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 220); }
      try { s.sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); };

    await step('01-partial-right-reveals', async () => {
      await seed({}, 'pending'); const before = JSON.stringify(await guests());
      await drag('gGusBay', 90);
      const dirv = await row('gGusBay').evaluate((e) => e.parentNode.dataset.dir);
      if (dirv !== 'right') throw new Error('data-dir=' + dirv);
      const btns = await expectShown(['Mark Gus Bay coming', 'Mark Gus Bay maybe']);
      await expectShown(['Remove Gus Bay', 'Mark Gus Bay can’t make it'], false);
      if (JSON.stringify(await guests()) !== before) throw new Error('reveal saved something');
      return { btns };
    });
    await step('02-maybe-saves-and-moves', async () => {
      await p.getByRole('button', { name: 'Mark Gus Bay maybe', exact: true }).click(); await p.waitForTimeout(400);
      const rs = await rsvpOf('gGusBay'); if (rs !== 'Maybe') throw new Error('rsvp=' + rs);
      const hc = await head(); if (!/3 maybe/.test(hc) || !/3 no reply/.test(hc)) throw new Error('headcount ' + hc);
      if (await row('gGusBay').isVisible().catch(() => false)) throw new Error('Gus still shown in the open No reply group');
      return { head: hc };
    });
    await step('03-coming-saves', async () => {
      await seed({}, 'pending'); await drag('gHalFir', 90);
      await p.getByRole('button', { name: 'Mark Hal Fir coming', exact: true }).click(); await p.waitForTimeout(400);
      const rs = await rsvpOf('gHalFir'); if (rs !== 'Yes') throw new Error('rsvp=' + rs);
      return { head: await head() };
    });
    await step('04-partial-left-reveals', async () => {
      await seed({}, 'pending'); const before = JSON.stringify(await guests());
      await drag('gHalFir', -90);
      const dirv = await row('gHalFir').evaluate((e) => e.parentNode.dataset.dir);
      if (dirv !== 'left') throw new Error('data-dir=' + dirv);
      const btns = await expectShown(['Mark Hal Fir can’t make it', 'Mark Hal Fir no reply', 'Remove Hal Fir']);
      await expectShown(['Mark Hal Fir coming'], false);
      if (JSON.stringify(await guests()) !== before) throw new Error('reveal saved something');
      return { btns };
    });
    await step('05-cant-make-it-saves', async () => {
      await p.getByRole('button', { name: 'Mark Hal Fir can’t make it', exact: true }).click(); await p.waitForTimeout(400);
      const rs = await rsvpOf('gHalFir'); if (rs !== 'No') throw new Error('rsvp=' + rs);
      const hc = await head(); if (!/3 no reply/.test(hc)) throw new Error('headcount ' + hc);
      return { head: hc };
    });
    await step('06-no-reply-saves', async () => {
      await seed({}, 'maybe'); await drag('gEliElm', -90);
      await p.getByRole('button', { name: 'Mark Eli Elm no reply', exact: true }).click(); await p.waitForTimeout(400);
      const rs = await rsvpOf('gEliElm'); if (rs !== '') throw new Error('rsvp=' + JSON.stringify(rs));
      const hc = await head(); if (!/1 maybe/.test(hc) || !/5 no reply/.test(hc)) throw new Error('headcount ' + hc);
      return { head: hc };
    });
    await step('07-remove-is-a-tap-with-undo', async () => {
      await seed({}, 'pending'); await drag('gJoLime', -90);
      await p.getByRole('button', { name: 'Remove Jo Lime', exact: true }).click(); await p.waitForTimeout(400);
      const g = await guests(); if (g.length !== 11 || g.some((x) => x.id === 'gJoLime')) throw new Error('after remove: ' + g.length);
      const undo = p.getByRole('button', { name: /^Undo/ }).first(); const hasUndo = await undo.isVisible().catch(() => false);
      let restored = null; if (hasUndo) { await undo.click(); await p.waitForTimeout(400); restored = (await guests()).length; }
      if (!hasUndo) throw new Error('no Undo after Remove'); if (restored !== 12) throw new Error('Undo left ' + restored);
      return { hasUndo, restored };
    });
    await step('08-full-right-is-coming', async () => {
      await seed({}, 'pending'); await drag('gIvyBox', 260);
      const rs = await rsvpOf('gIvyBox'); if (rs !== 'Yes') throw new Error('rsvp=' + JSON.stringify(rs));
      return { head: await head() };
    });
    await step('09-full-left-is-cant-make-it', async () => {
      await seed({}, 'pending'); await drag('gJoLime', -260);
      const g = await guests(); const rs = (g.find((x) => x.id === 'gJoLime') || {}).rsvp;
      if (g.length !== 12) throw new Error('full left removed a guest: ' + g.length);
      if (rs !== 'No') throw new Error('rsvp=' + JSON.stringify(rs));
      return { head: await head() };
    });
    await step('10-vertical-drag-reveals-nothing', async () => {
      await seed({}, 'pending'); const before = JSON.stringify(await guests());
      await drag('gGusBay', 6, 120);
      await expectShown(['Mark Gus Bay coming', 'Mark Gus Bay maybe', 'Remove Gus Bay'], false);
      if (JSON.stringify(await guests()) !== before) throw new Error('vertical drag saved something');
    });
    await step('11-one-open-and-tap-closes', async () => {
      await seed({}, 'pending'); const before = JSON.stringify(await guests());
      const selected = () => p.locator('[data-guest][aria-selected="true"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-guest')).join());
      const sel0 = await selected();
      await drag('gGusBay', 90); await drag('gHalFir', -90);
      await expectShown(['Mark Gus Bay maybe'], false); await expectShown(['Remove Hal Fir']);
      // tap the part of the open row still on screen (left of its revealed buttons)
      const bb = await row('gHalFir').evaluate((e) => { e.parentNode.scrollIntoView({ block: 'center' }); const c = e.parentNode.getBoundingClientRect(); return { x: c.left + 24, y: c.top + c.height / 2 }; }); await p.mouse.click(bb.x, bb.y); await p.waitForTimeout(400);
      await expectShown(['Remove Hal Fir'], false);
      // Phone: nothing opens. Split layout: the pane stays on the guest it showed before (the tap does not select Hal).
      const sheet = await p.locator('[role=dialog]').count(); const sel1 = await selected();
      if (sheet) throw new Error('tap on an open row opened a dialog');
      if (sel1 !== sel0) throw new Error(`tap on an open row changed the selected guest: ${sel0 || '(none)'} -> ${sel1}`);
      if (JSON.stringify(await guests()) !== before) throw new Error('saved something');
      return { selected: sel0 || '(none)' };
    });
    await p.evaluate(() => localStorage.clear()).catch(() => {});
    res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) {
    console.log(`\n${r.vp} console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length}`);
    for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''}${s.head ? ' [' + s.head + ']' : ''} sideways ${s.sideways}`);
  }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]);
  console.log('blocked:', [...new Set(res.flatMap((r) => r.blocked))]);
})();
