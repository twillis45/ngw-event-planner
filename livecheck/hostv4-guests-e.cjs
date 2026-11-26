// hostv4 Guests, option E (#272) + remembered open group, at the five live-check sizes.
//   node livecheck/hostv4-guests-e.cjs <outdir>
// Seeded E2E_TEST_ plan; network writes aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-v4e'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const R = (n, rsvp) => ({ id: 'g' + n.replace(/\W/g, ''), name: n, rsvp });
const GUESTS = [R('Ada Pine', 'Yes'), R('Ben Oak', 'Yes'), R('Cy Fern', 'Yes'), R('Dee Ash', 'Yes'), R('Eli Elm', 'Maybe'), R('Fay Yew', 'Maybe'),
  R('Gus Bay', ''), R('Hal Fir', ''), R('Ivy Box', ''), R('Jo Lime', ''), R('Kai Teak', 'No'), R('Lu Cedar', 'No')];
const EV = { id: 'E2E_TEST_lc-v4e', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550,
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-25', guests: GUESTS, vendors: [] };
const GKEY = 'ngw-hostv4-open-group:' + EV.id;
const navTo = async (p, name) => {
  const tab = p.getByRole('tab', { name });
  if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
  const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
  await p.locator('aside[aria-label="Places"] button', { hasText: name }).first().click();
};
const floors = (p, touch) => p.evaluate((touch) => {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]');
  const small = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length;
  const tiny = touch ? [...document.querySelectorAll('button, a[href], [role=button], [role=switch], input, select, textarea')].filter(vis).filter((e) => {
    const b = e.getBoundingClientRect(); if (b.width >= 44 && b.height >= 44) return false; if (b.bottom < 0 || b.top > innerHeight) return false;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const hit = (x, y) => { const h = document.elementFromPoint(x, y); return h && (h === e || e.contains(h)); };
    return !(hit(cx - 21, cy - 21) && hit(cx + 21, cy + 21) && hit(cx - 21, cy + 21) && hit(cx + 21, cy - 21));
  }).map((e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)} ${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)}`; }) : [];
  return { sideways: document.documentElement.scrollWidth - innerWidth, smallText: small, smallTargets: tiny.length, smallTargetsEx: tiny.slice(0, 5) };
}, touch);
const groups = (p) => p.locator('button[data-group]').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { k: e.getAttribute('data-group'), open: e.getAttribute('aria-expanded') === 'true', h: Math.round(b.height), w: Math.round(b.width), text: e.innerText.replace(/\s+/g, ' ').trim() }; }));
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [], threads: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); let n = 0;
    p.on('request', (q) => { if (/guest-threads/.test(q.url())) r.threads.push(q.method() + ' ' + q.url().split('?')[0]); });
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 220); }
      try { s.floors = await floors(p, touch); await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); };
    const planStr = () => p.evaluate((k) => localStorage.getItem(k), KEY);
    const openGuests = async () => {
      await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800);
      await navTo(p, 'Your plan'); await p.waitForTimeout(300);
      const row = p.locator('[data-plan-row="guests"]');
      if (await row.count()) await row.first().click(); else await navTo(p, 'Guests');
      await p.waitForSelector('[data-view="guests"]', { timeout: 8000 }); await p.waitForTimeout(500);
    };
    await p.goto(BASE); await p.evaluate(([k, l, ev]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); }, [KEY, LAST, EV]);
    const plan0 = await planStr();

    await step('01-open-guests', async () => {
      await openGuests();
      const head = await p.locator('[data-headcount]').getAttribute('aria-label');
      const g = await groups(p);
      if (g.length !== 4) throw new Error('groups=' + JSON.stringify(g));
      const small = g.filter((x) => x.h < 44); if (small.length) throw new Error('group under 44px: ' + JSON.stringify(small));
      return { head, groups: g, layout: await p.locator('[data-layout]').getAttribute('data-layout').catch(() => null), threads: [...r.threads] };
    });
    await step('02-each-group-flips', async () => {
      const out = [];
      for (const k of ['yes', 'maybe', 'pending', 'no']) {
        const btn = p.locator(`button[data-group="${k}"]`);
        if ((await btn.getAttribute('aria-expanded')) === 'true') { await btn.click(); await p.waitForTimeout(250); }
        await btn.click(); await p.waitForTimeout(300);
        const g = await groups(p); const open = g.filter((x) => x.open).map((x) => x.k);
        const names = await p.locator(`button[data-group="${k}"] ~ [data-names] [data-guest], [data-names] [data-guest]`).count();
        if (open.length !== 1 || open[0] !== k) throw new Error(`after opening ${k}, open=${open}`);
        out.push(`${k}: open alone, ${names} rows`);
      }
      // close the last one
      await p.locator('button[data-group="no"]').click(); await p.waitForTimeout(250);
      const after = (await groups(p)).filter((x) => x.open).map((x) => x.k);
      if (after.length) throw new Error('closing left open: ' + after);
      if ((await planStr()) !== plan0) throw new Error('plan changed');
      return { out, stored: await p.evaluate((k) => localStorage.getItem(k), GKEY) };
    });
    await step('03-open-survives-reload', async () => {
      await p.locator('button[data-group="maybe"]').click(); await p.waitForTimeout(300);
      const stored = await p.evaluate((k) => localStorage.getItem(k), GKEY);
      await openGuests();
      const open = (await groups(p)).filter((x) => x.open).map((x) => x.k);
      if (open.join() !== 'maybe') throw new Error(`stored=${stored}, after reload open=${open}`);
      if ((await planStr()) !== plan0) throw new Error('plan changed');
      return { stored, open };
    });
    await step('04-closed-survives-reload', async () => {
      await p.locator('button[data-group="maybe"]').click(); await p.waitForTimeout(300);
      const stored = await p.evaluate((k) => localStorage.getItem(k), GKEY);
      await openGuests();
      const open = (await groups(p)).filter((x) => x.open).map((x) => x.k);
      if (open.length) throw new Error(`stored=${stored}, after reload open=${open}`);
      if ((await planStr()) !== plan0) throw new Error('plan changed');
      return { stored, open };
    });
    await step('05-more-sheet', async () => {
      await p.getByRole('button', { name: 'More', exact: true }).click(); await p.waitForTimeout(300);
      const d = p.locator('[role=dialog][aria-label="More about guests"]');
      const t = (await d.innerText()).replace(/\s+/g, ' ');
      // #278 (c6e6c5a): the path moved Your answers, Your invite and Updates back onto the page; More keeps the utilities only.
      for (const want of ['Share the link', 'Download the list', 'Tell me when someone replies']) if (!t.includes(want)) throw new Error('More sheet missing ' + want);
      for (const gone of ['Your answers', 'Your invite']) if (t.includes(gone)) throw new Error('More sheet still has ' + gone);
      const fl = await floors(p, touch);
      await d.getByRole('button', { name: 'Done' }).click().catch(async () => { await p.keyboard.press('Escape'); }); await p.waitForTimeout(300);
      return { text: t.slice(0, 200), sheetFloors: fl };
    });
    await step('06-add-sheet', async () => {
      await p.getByRole('button', { name: 'Add names', exact: true }).click(); await p.waitForTimeout(300);
      const d = p.locator('[role=dialog][aria-label="Add names"]'); if (!(await d.count())) throw new Error('no Add names sheet');
      const has = await d.locator('#addname').count();
      await d.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
      if ((await planStr()) !== plan0) throw new Error('plan changed');
      return { addname: has };
    });
    r.planUnchanged = (await planStr()) === plan0;
    await p.evaluate(() => localStorage.clear()).catch(() => {});
    res.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) {
    console.log(`\n${r.vp} console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length} guest-threads:${r.threads.length} planUnchanged:${r.planUnchanged}`);
    for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''} floors ${s.floors ? `${s.floors.sideways}/${s.floors.smallText}/${s.floors.smallTargets}` : 'n/a'}`);
  }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]);
})();
