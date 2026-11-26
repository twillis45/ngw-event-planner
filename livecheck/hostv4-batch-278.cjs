// hostv4: #278 the path (start to finish), #276/#277 Updates signed out, #279 centering, #280 contact fields.
//   node livecheck/hostv4-batch-278.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; network writes aborted; share/clipboard/open stubbed. Nothing sent.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-278'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const CENTER_VPS = [[834, 1194, true], [844, 390, true], [1024, 768, true]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const NAMES = ['Ada Pine', 'Ben Oak', 'Cy Fern', 'Dee Ash', 'Eli Elm', 'Fay Yew', 'Gus Bay', 'Hal Fir', 'Ivy Box', 'Jo Lime'];
const RS = ['Yes', 'Yes', 'Yes', 'Yes', 'Maybe', 'Maybe', '', '', '', 'No'];
const base = (over) => ({ id: 'E2E_TEST_lc-278', name: 'E2E_TEST_ Rosa’s 40th', type: 'Birthday', date: '2027-01-04', startTime: '18:00', startTimeSource: 'derived', totalBudget: 550,
  guestEstimate: 12, guestCountSource: 'host', guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: '2026-12-25',
  guests: NAMES.map((n, i) => ({ id: 'g' + i, name: n, rsvp: RS[i] })), vendors: [], ...over });
const STATES = {
  question: base({ guestCountSource: undefined, guestEstimate: undefined, guestMode: undefined, plusOnePolicy: undefined, kidsPolicy: undefined, rsvpDeadline: undefined, guests: [] }),
  noNames: base({ guests: [] }),
  named: base({}),
  sent: base({ invitesSentAt: '2026-11-20T15:00:00Z', guests: NAMES.map((n, i) => ({ id: 'g' + i, name: n, rsvp: RS[i], invitedAt: '2026-11-20T15:00:00Z' })) }),
  pastReplyBy: base({ rsvpDeadline: '2026-11-24', invitesSentAt: '2026-11-10T15:00:00Z', guests: NAMES.map((n, i) => ({ id: 'g' + i, name: n, rsvp: RS[i], invitedAt: '2026-11-10T15:00:00Z' })) }),
};
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
(async () => {
  const b = await chromium.launch(); const res = { path: [], updates: [], center: [], contact: [] };
  const ctxFor = async (w, h, touch, log) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (log.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); p.setDefaultTimeout(5000);
    p.on('request', (q) => { if (/announcements|guest-threads|invite-opens|guest-photos|communication\/sent|stripe\/pass/.test(q.url())) log.reqs.push(q.method() + ' ' + q.url().split('?')[0].replace(/.*\/api\//, '')); });
    p.on('response', (x) => x.status() >= 400 && log.http.push(x.status() + ' ' + x.url().split('?')[0].replace(/.*\/api\//, '')));
    p.on('pageerror', (e) => log.errs.push(String(e.message).slice(0, 120)));
    await p.goto(BASE);
    return { ctx, p };
  };
  const seedGuests = async (p, ev) => {
    await p.evaluate(([k, l, ev]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); }, [KEY, LAST, ev]);
    await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800);
    await navTo(p, 'Your plan'); await p.waitForTimeout(300);
    const row = p.locator('[data-plan-row="guests"]'); if (await row.count()) await row.first().click(); else await navTo(p, 'Guests');
    await p.waitForSelector('[data-view="guests"]', { timeout: 8000 }); await p.waitForTimeout(600);
    const back = p.getByRole('button', { name: 'Back to Guests', exact: true }); if (await back.isVisible().catch(() => false)) { await back.click(); await p.waitForTimeout(300); }
  };
  const BUTTON_FOR = { names: /Add names/i, invite: /invite/i, count: /Lock the count/i, replies: /Nudge|remind|Add how to reach them/i }; // #289 (697f8d9b): no one reachable -> "Add how to reach them"

  // ── #278 the path ──
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const log = { blocked: [], reqs: [], http: [], errs: [] }; const { ctx, p } = await ctxFor(w, h, touch, log); const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const row = { vp, states: {} };
    for (const [name, ev] of Object.entries(STATES)) {
      const s = {};
      try {
        await seedGuests(p, ev);
        s.question = await p.locator('[data-question]').getAttribute('data-question').catch(() => null);
        s.heading = await p.getByRole('heading', { name: 'Your guests, start to finish' }).count();
        s.steps = await p.locator('[data-path] [data-step]').evaluateAll((els) => els.map((e) => e.getAttribute('data-step') + ':' + (e.getAttribute('data-state') || '-')));
        s.lit = await p.locator('[data-path] [aria-current="step"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-step')));
        s.button = (await p.locator('.action .primary').first().innerText().catch(() => '')).trim() || null;
        s.answersRow = await p.locator('[data-path] [data-step="answers"]').count();
        // lit step must match the bottom button
        if (name === 'question') { s.ok = !!s.question && s.heading === 0 && s.steps.length === 0; }
        else {
          const lit = s.lit[0];
          s.ok = s.heading === 1 && s.lit.length <= 1 && (!lit ? !s.button : (BUTTON_FOR[lit] ? BUTTON_FOR[lit].test(s.button || '') : !!s.button));
        }
        if (name === 'named') {
          s.floors = await floors(p, touch);
          if (w === 390) s.measure = await p.evaluate(() => {
            const m = document.querySelector('[data-view="guests"]'); const vis = (e) => e.getClientRects().length && !e.closest('[inert],[aria-hidden="true"]');
            const controls = [...m.querySelectorAll('button, a[href], input, textarea, select, [role=switch]')].filter(vis).length;
            return { screens: +(m.scrollHeight / innerHeight).toFixed(2), controls };
          });
          await p.screenshot({ path: path.join(dir, 'named.jpg'), type: 'jpeg', quality: 60, fullPage: true });
          await p.getByRole('button', { name: 'More', exact: true }).click(); await p.waitForTimeout(300);
          const t = (await p.locator('[role=dialog]').first().innerText()).replace(/\s+/g, ' ');
          s.more = { hasShare: /Share the link/.test(t), hasDownload: /Download the list/.test(t), hasAlerts: /Tell me when someone replies/.test(t), hasAnswers: /Your answers/.test(t), hasInvite: /Your invite/.test(t) };
          s.ok = s.ok && s.more.hasShare && s.more.hasDownload && s.more.hasAlerts && !s.more.hasAnswers && !s.more.hasInvite;
          await p.keyboard.press('Escape'); await p.locator('[role=dialog] >> text=Done').first().click().catch(() => {}); await p.waitForTimeout(300);
        } else await p.screenshot({ path: path.join(dir, name + '.jpg'), type: 'jpeg', quality: 60 });
      } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 200); }
      row.states[name] = s; console.error(vp, name, s.ok ? 'ok' : 'FAIL', s.error || '');
    }
    row.blocked = log.blocked; row.errs = log.errs; res.path.push(row); await ctx.close();
  }

  // ── #276/#277 Updates signed out (plan not on an account) ──
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const log = { blocked: [], reqs: [], http: [], errs: [] }; const { ctx, p } = await ctxFor(w, h, touch, log); const r = { vp };
    try {
      await seedGuests(p, STATES.named); log.reqs.length = 0; log.http.length = 0;
      await p.locator('[data-path] [data-step="updates"]').click(); await p.waitForSelector('[data-view="updates"]', { timeout: 8000 }); await p.waitForTimeout(2500);
      r.text = (await p.locator('[data-view="updates"]').innerText()).replace(/\s+/g, ' ').slice(0, 300);
      r.reqs = [...log.reqs]; r.http = [...log.http]; r.floors = await floors(p, touch);
      r.ok = r.reqs.length === 0 && r.http.filter((x) => x.startsWith('401')).length === 0;
      await p.screenshot({ path: path.join(OUT, vp, 'updates.jpg'), type: 'jpeg', quality: 60 });
    } catch (e) { r.ok = false; r.error = String(e.message).split('\n')[0].slice(0, 200); }
    console.error('upd', vp, r.ok, r.error || ''); r.blocked = log.blocked; res.updates.push(r); await ctx.close();
  }

  // ── #279 centering (compact layout) ──
  for (const [w, h, touch] of CENTER_VPS) {
    const vp = `${w}x${h}`; const log = { blocked: [], reqs: [], http: [], errs: [] }; const { ctx, p } = await ctxFor(w, h, touch, log); const r = { vp };
    try {
      await seedGuests(p, STATES.named);
      r.geo = await p.evaluate(() => {
        const m = document.querySelector('[data-view="guests"]'); const kids = [...m.querySelectorAll(':scope > *, section > *')].filter((e) => e.getClientRects().length);
        const L = Math.min(...kids.map((e) => e.getBoundingClientRect().left)), R = Math.max(...kids.map((e) => e.getBoundingClientRect().right));
        const edge = (sel) => { const e = document.querySelector(sel); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right) }; };
        return { vw: innerWidth, colLeft: Math.round(L), colRight: Math.round(R), leftMargin: Math.round(L), rightMargin: Math.round(innerWidth - R),
          back: edge('[data-view="guests"] .back, [data-view="guests"] a.back, [data-view="guests"] button.back'), menu: edge('button[aria-label="Show places"]'), more: edge('button[aria-label="More"]') };
      });
      r.ok = Math.abs(r.geo.leftMargin - r.geo.rightMargin) <= 2;
      r.floors = await floors(p, touch);
      await p.screenshot({ path: path.join(OUT, `center-${vp}.jpg`), type: 'jpeg', quality: 60 });
    } catch (e) { r.ok = false; r.error = String(e.message).split('\n')[0].slice(0, 200); }
    console.error('ctr', vp, r.ok, r.error || ''); res.center.push(r); await ctx.close();
  }

  // ── #280 contact fields (hostv4 guest sheet/pane) ──
  for (const [w, h, touch] of [[390, 844, true], [1024, 1366, true], [1440, 900, false]]) {
    const vp = `${w}x${h}`; const log = { blocked: [], reqs: [], http: [], errs: [] }; const { ctx, p } = await ctxFor(w, h, touch, log); const r = { vp };
    try {
      await seedGuests(p, STATES.named);
      const g = p.locator('button[data-group="pending"]'); if ((await g.getAttribute('aria-expanded')) !== 'true') { await g.click(); await p.waitForTimeout(300); }
      await p.locator('[data-guest="g6"]').click(); await p.waitForTimeout(500);
      const phone = p.locator('input[type="tel"]').first(); const email = p.locator('input[type="email"]').first();
      const saved = () => p.evaluate((k) => (JSON.parse(localStorage.getItem(k))[0].guests.find((x) => x.id === 'g6') || {}), KEY);
      await phone.fill(''); await phone.pressSequentially('2025550134', { delay: 20 }); r.phoneTyped = await phone.inputValue();
      await phone.blur(); await p.waitForTimeout(300); r.phoneSaved = (await saved()).phone; r.phoneProblem = await p.locator('[data-contact-problem="phone"]').count();
      await phone.fill(''); await phone.pressSequentially('202555', { delay: 20 }); await phone.blur(); await p.waitForTimeout(300);
      r.shortProblem = (await p.locator('[data-contact-problem="phone"]').innerText().catch(() => null)); r.shortInvalid = await phone.getAttribute('aria-invalid');
      await email.fill('bad@'); await email.blur(); await p.waitForTimeout(300);
      r.emailProblem = (await p.locator('[data-contact-problem="email"]').innerText().catch(() => null)); r.emailInvalid = await email.getAttribute('aria-invalid');
      await email.fill('  ada.pine@example.com  '); await email.blur(); await p.waitForTimeout(300);
      r.emailSaved = JSON.stringify((await saved()).email); r.emailProblemAfter = await p.locator('[data-contact-problem="email"]').count();
      r.floors = await floors(p, touch);
      r.ok = /\(202\) 555-0134|202-555-0134|202\.555\.0134/.test(r.phoneTyped) && !!r.shortProblem && r.shortInvalid === 'true' && !!r.emailProblem && r.emailInvalid === 'true' && r.emailSaved === '"ada.pine@example.com"' && r.emailProblemAfter === 0;
      await p.screenshot({ path: path.join(OUT, `contact-${vp}.jpg`), type: 'jpeg', quality: 60 });
    } catch (e) { r.ok = false; r.error = String(e.message).split('\n')[0].slice(0, 200); }
    console.error('con', vp, r.ok, r.error || ''); r.blocked = log.blocked; r.errs = log.errs; res.contact.push(r); await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, (k, v) => (k === 'smallTargetsEx' && !v.length ? undefined : v), 1));
})();
