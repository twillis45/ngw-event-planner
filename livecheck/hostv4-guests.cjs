// hostv4 Guests / Your invite / Updates check (PR #266), five sizes, on a seeded E2E_TEST_ plan.
//   node livecheck/hostv4-guests.cjs <outdir>
// Network writes are aborted; share/clipboard/open stubbed. Nothing is sent, nudged or posted:
// the check never opens the send, nudge or lock sheets and never presses a post/reply button.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-hostv4-guests'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
// Tabs on phones; on iPad and wider (#268) the same places sit in the Places sidebar, behind "Show places" where it is folded.
const navTo = async (p, name) => {
  const tab = p.getByRole('tab', { name });
  if ((await tab.count()) && (await tab.first().isVisible())) return tab.first().click();
  const side = p.locator('aside[aria-label="Places"] button', { hasText: name }).first();
  // A folded sidebar can still report visible (slid off-screen), so open it whenever the menu button is showing.
  const show = p.getByRole('button', { name: 'Show places' }); if (await show.isVisible().catch(() => false)) { await show.click(); await p.waitForTimeout(400); }
  await side.click();
};
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const EV = { id: 'E2E_TEST_lc-v4g', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550, guests: [], vendors: [] };

const floors = (p, touch) => p.evaluate((touch) => {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]');
  const small = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.innerText.trim().slice(0, 30));
  const tiny = touch ? [...document.querySelectorAll('button, a[href], [role=button], [role=radio], [role=switch], input, select, textarea')].filter(vis).filter((e) => {
    const b = e.getBoundingClientRect(); if (b.width >= 44 && b.height >= 44) return false;
    if (b.bottom < 0 || b.top > innerHeight) return false;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const hit = (x, y) => { const h = document.elementFromPoint(x, y); return h && (h === e || e.contains(h)); };
    return !(hit(cx - 21, cy - 21) && hit(cx + 21, cy + 21) && hit(cx - 21, cy + 21) && hit(cx + 21, cy - 21));
  }).map((e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)} ${(e.innerText || e.getAttribute('aria-label') || e.placeholder || '').trim().slice(0, 30)}`; }) : [];
  return { sideways: document.documentElement.scrollWidth - innerWidth, smallText: small.length, smallTextEx: small.slice(0, 3), smallTargets: tiny.length, smallTargetsEx: tiny.slice(0, 5) };
}, touch);
const stored = (p) => p.evaluate(([k, id]) => { const l = JSON.parse(localStorage.getItem(k) || '[]'); const e = l.find((x) => x.id === id) || {}; return { guestEstimate: e.guestEstimate, guestMode: e.guestMode, plusOnePolicy: e.plusOnePolicy, kidsPolicy: e.kidsPolicy, rsvpDeadline: e.rsvpDeadline, guests: (e.guests || []).map((g) => g.name + (g.email ? ' <' + g.email + '>' : '')), invitesSentAt: e.invitesSentAt || null }; }, [KEY, EV.id]);
const txt = (p, sel) => p.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => null);

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { window.__lcShare = 0; try { Object.defineProperty(navigator, 'share', { value: async () => { window.__lcShare++; }, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {}, readText: async () => '' }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); let n = 0;
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 220); }
      try { s.floors = await floors(p, touch); await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); };
    const go = async () => { await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1000); };
    const openGuests = async () => { await navTo(p, 'Your plan'); await p.waitForTimeout(300); await p.locator('[data-plan-row="guests"]').click(); await p.waitForSelector('[data-view="guests"]', { timeout: 5000 }); };

    await go();
    await p.evaluate(([k, l, ev]) => { localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); }, [KEY, LAST, EV]);
    await go();

    await step('01-plan-guests-row', async () => { await openGuests(); return { q: await txt(p, '[data-question] .q'), sub: await txt(p, '.sub') }; });
    await step('02-questions', async () => {
      const seen = [];
      const qOf = () => p.locator('[data-question]').getAttribute('data-question').catch(() => null);
      let k = await qOf();
      if (k === 'count') { seen.push('count: ' + (await txt(p, '[data-question] .q'))); await p.locator('.action .primary').click(); await p.waitForTimeout(300); k = await qOf(); }
      if (k === 'mode') { seen.push('mode'); await p.getByRole('button', { name: /Yes, I.ll list names/ }).click(); await p.waitForTimeout(300); k = await qOf(); }
      if (k === 'plus') { seen.push('plus'); await p.getByRole('button', { name: /plus-ones are welcome/ }).click(); await p.waitForTimeout(300); k = await qOf(); }
      if (k === 'kids') { seen.push('kids'); await p.getByRole('button', { name: /Kids are welcome/ }).click(); await p.waitForTimeout(300); k = await qOf(); }
      let replyRow = null;
      if (k === 'replyBy') { replyRow = await txt(p, '[data-question] .row.go'); seen.push('replyBy'); await p.locator('[data-question] .row.go').first().click(); await p.waitForTimeout(300); k = await qOf(); }
      if (k) throw new Error('question still open: ' + k);
      if (seen.length !== 5) throw new Error('asked ' + seen.length + ' questions: ' + seen.join(', '));
      if (!/Christmas/i.test(replyRow || '')) throw new Error('reply-by row does not name Christmas: ' + replyRow);
      return { seen, replyRow, answers: await txt(p, '[data-answers]'), st: await stored(p) };
    });
    await step('03-add-names', async () => {
      await p.locator('#addname').fill('Ada Pine\nJohn and Nicole Smith'); await p.getByRole('button', { name: 'Add', exact: true }).click(); await p.waitForTimeout(400);
      const rows = await p.locator('[data-guest]').allInnerTexts();
      if (rows.length !== 3) throw new Error('rows=' + rows.length + ' ' + JSON.stringify(rows));
      return { rows: rows.map((t) => t.replace(/\s+/g, ' ')), couple: await txt(p, '[data-couple]'), sub: await txt(p, '.sub'), st: await stored(p) };
    });
    await step('04-guest-email-blur', async () => {
      // Phones open the guest in a sheet; iPad and wider (#268) open it in the detail pane.
      await p.locator('[data-guest]', { hasText: 'Ada Pine' }).click();
      const email = p.locator('input[aria-label="Email"]').first(); await email.waitFor({ state: 'visible', timeout: 8000 });
      const asSheet = (await p.locator('[role=dialog]').count()) > 0;
      await email.fill('ada.pine@example.com');
      const before = (await stored(p)).guests.find((g) => g.startsWith('Ada'));
      await email.press('Tab'); await p.waitForTimeout(400);
      const after = (await stored(p)).guests.find((g) => g.startsWith('Ada'));
      if (!/ada\.pine@example\.com/.test(after || '')) throw new Error('email not saved on blur: ' + after);
      if (/@/.test(before || '')) throw new Error('saved before blur: ' + before);
      const shot = { asSheet, heads: await p.locator(asSheet ? '[role=dialog] h3' : 'h3.lbl').allInnerTexts() };
      if (asSheet) { await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300); }
      return { before, after, ...shot };
    });
    await step('05-your-invite', async () => {
      // At 834 the guest fills the screen; its back button returns to Guests.
      // (The list stays in the DOM underneath and reports visible, so test for the back button instead.)
      const back = p.getByRole('button', { name: 'Back to Guests', exact: true });
      if (await back.isVisible().catch(() => false)) { await back.click(); await p.waitForTimeout(400); }
      await p.locator('[data-open-invite]').click(); await p.waitForSelector('[data-view="invite"]', { timeout: 5000 });
      const gaps = await p.locator('[data-gap]').evaluateAll((els) => els.map((e) => e.getAttribute('data-gap') + ': ' + e.innerText.replace(/\s+/g, ' ').trim()));
      const primary = await txt(p, '.action .primary');
      const time = gaps.find((g) => g.startsWith('time')) || '', place = gaps.find((g) => /^(place|venue|location)/.test(g)) || '';
      if (!/Not confirmed/.test(time)) throw new Error('time row: ' + time);
      if (!/Missing/.test(place)) throw new Error('place row: ' + place + ' | ' + gaps.join(' / '));
      if (primary !== 'Add what’s missing in the current app') throw new Error('primary: ' + primary);
      return { gaps, primary, href: await p.locator('.action .primary').getAttribute('href'), sendBtn: await p.locator('[data-open-send]').count() };
    });
    await step('06-updates-signed-out', async () => {
      await go(); await openGuests(); await p.locator('[data-open-updates]').click(); await p.waitForTimeout(1500);
      const body = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
      const a = /Sign in to post updates\./.test(body), q = /Sign in to see guests’ questions\./.test(body);
      if (!a || !q) throw new Error('signed-out lines missing: post=' + a + ' questions=' + q + ' | ' + body.slice(0, 200));
      return { body: body.slice(0, 300), postButtons: await p.locator('[data-update-post],[data-reply-send]').count() };
    });
    r.shareCalls = await p.evaluate(() => window.__lcShare).catch(() => null);
    await p.evaluate(([k, l]) => { localStorage.removeItem(k); localStorage.removeItem(l); }, [KEY, LAST]).catch(() => {});
    res.push(r); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) {
    console.log(`\n${r.vp}  console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length} share:${r.shareCalls}`);
    for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.error ? ' — ' + s.error : ''}  floors ${s.floors ? `${s.floors.sideways}/${s.floors.smallText}/${s.floors.smallTargets}` : 'n/a'}`);
  }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]); console.log('blocked:', [...new Set(res.flatMap((r) => r.blocked))]);
})();
