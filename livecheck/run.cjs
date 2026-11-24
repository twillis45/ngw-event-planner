#!/usr/bin/env node
// Live check of the main host journeys on the deployed hostv2 build.
// READ-ONLY: every POST/PUT/PATCH/DELETE is aborted, share/clipboard/window.open
// are stubbed, no sign-in, no replies. Made-up event only (Rosa's Harvest Dinner).
//
//   node livecheck/run.cjs [--out livecheck] [--only 390x844,1440x900] [--conc 3]
//
// Writes livecheck/<sha>/results.json, summary.md and shots/<vp>/<step>.jpg.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = 'https://twillis45.github.io/ngw-event-planner/hostv2/';
const Q = '?noanalytics=1&elegant=1';
const API = 'https://ngw-events-api.onrender.com';
const NOW = '2026-11-24T12:00:00-05:00';          // fixed clock: texts stay comparable run to run
const DAY = '2026-12-19T15:00:00-05:00';          // the event day, before an 18:00 start
const AFTER = '2026-12-21T10:00:00-05:00';        // two days after
const TZ = 'America/New_York';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(__dirname)));
const CONC = Number(arg('--conc', 3));
const VIEWPORTS = [
  { id: '390x844', width: 390, height: 844, touch: true },
  { id: '834x1194', width: 834, height: 1194, touch: true },
  { id: '1024x1366', width: 1024, height: 1366, touch: true },
  { id: '1194x834', width: 1194, height: 834, touch: true },
  { id: '1440x900', width: 1440, height: 900, touch: false },
].filter((v) => !arg('--only') || arg('--only').split(',').includes(v.id));

const EV = {
  id: 'lc-rosa', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', createdAt: '2026-11-01',
  date: '2026-12-19', startTime: '18:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 900,
  guests: [{ id: 'lc-g1', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'lc-g2', name: 'Ben Oak', rsvp: 'Maybe' }, { id: 'lc-g3', name: 'Cy Fern', rsvp: '' }],
  vendors: [{ id: 'lc-v1', name: 'Maple Table Catering', category: 'Catering', status: 'Considering', cost: 600, budgetCategory: 'Food' }],
  budget: [{ id: 'food', category: 'Food', budgeted: 600, actual: 0 }],
  timeline: [{ id: 'lc-t1', task: 'Confirm final headcount', week: 'This week' }],
};
const SENTENCE = 'Rosa’s harvest dinner for 12 friends at our home, 42 Elm Ct, Springfield, VA 22150, on Saturday December 19 at 6pm, budget $900';
const SECTIONS = ['Venue', 'Guests & invite', 'The spread & shopping', 'Your money', 'People you’re hiring',
  'Space, seats & helpers', 'Who sits where', 'Your checklist', 'Calendar', 'Calls to make', 'What could go wrong',
  'Messages', 'Split the costs', 'Make it yours', 'You & settings'];
const MENU_DOORS = new Set(['You & settings']);
const RSVP_CODE = 'test-two-days';

// ── page set-up: the guard and the stubs ─────────────────────────────────────
const STUBS = () => {
  try { Object.defineProperty(navigator, 'share', { value: async () => { window.__lcShare = (window.__lcShare || 0) + 1; }, configurable: true }); } catch {}
  try { Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true }); } catch {}
  const clip = { writeText: async () => { window.__lcClip = (window.__lcClip || 0) + 1; }, write: async () => {}, readText: async () => '', read: async () => [] };
  try { Object.defineProperty(navigator, 'clipboard', { value: clip, configurable: true }); } catch {}
  window.open = () => { window.__lcOpen = (window.__lcOpen || 0) + 1; return null; };
};
const seed = (e) => {
  if (sessionStorage.getItem('lc-seeded')) return; sessionStorage.setItem('lc-seeded', '1');
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
  localStorage.setItem('ngw-hostv2-last-event', e.id);
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
};

async function newPage(browser, vp, { clock = NOW, seeded = true, rec }) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1, timezoneId: TZ, locale: 'en-US' });
  await ctx.route('**/*', (r) => {
    const m = r.request().method();
    if (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') { rec.blocked.push(`${m} ${r.request().url().split('?')[0]}`); return r.abort('blockedbyclient'); }
    return r.continue();
  });
  await ctx.addInitScript(STUBS);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(clock));
  if (seeded) await page.addInitScript(seed, EV);
  page.on('console', (m) => { if (m.type() === 'error') rec.console.push(m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) rec.http.push(`${r.status()} ${r.request().method()} ${r.url().split('?')[0].slice(0, 160)}`); });
  page.on('pageerror', (e) => rec.console.push('pageerror: ' + String(e.message || e).slice(0, 300)));
  return { ctx, page };
}

const settled = (page, timeout = 30_000) => page.waitForFunction(() => {
  const sp = document.querySelector('.splash');
  if (sp) { const cs = getComputedStyle(sp); if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false; }
  const app = document.querySelector('.app');
  return !!app && (app.innerText || '').trim().length > 120;
}, null, { timeout });
const sheetSettled = (page, timeout = 12_000) => page.waitForFunction(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  if (!sh) return false;
  const cs = getComputedStyle(sh);
  if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.99) return false;
  return (sh.innerText || '').trim().length > 40;
}, null, { timeout });
const closeSheets = async (page) => {
  for (let i = 0; i < 3 && await page.locator('.sheet').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); }
};
const revealBar = async (page) => {
  if (!(await page.locator('[data-tt-bar].is-hidden').count())) return;
  await page.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = 0; });
  await page.waitForTimeout(500);
};
const anyDoor = (page) => page.locator('.srail-row, [data-tt-bar], .ev-eyebrow').first().waitFor({ state: 'attached', timeout: 15_000 });

// The phases, wherever this viewport keeps them (as fixtures.mjs goToStage).
async function goToStage(page, label) {
  await anyDoor(page);
  const bar = page.locator('[data-tt-bar]');
  if (await bar.count()) { await closeSheets(page); await revealBar(page); await bar.getByRole('button', { name: label, exact: true }).click({ timeout: 8000 }); }
  else if (await page.locator('.srail [data-rail-stage]', { hasText: label }).count()) { await closeSheets(page); await page.locator('.srail [data-rail-stage]', { hasText: label }).first().click({ timeout: 8000 }); }
  else {
    if (!(await page.locator('.sheet .navseg-b').count())) { await closeSheets(page); await page.locator('.ev-eyebrow').first().click({ timeout: 8000 }); }
    await page.locator('.navseg-b', { hasText: label }).first().click({ timeout: 8000 });
  }
  await page.waitForTimeout(900);
  await closeSheets(page);
}

// The section list as this viewport's menu shows it.
async function listSections(page) {
  await anyDoor(page);
  if (await page.locator('.srail-row').count()) return { door: 'rail', names: await page.locator('.srail-row').evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, ' ').trim())) };
  if (await page.locator('[data-tt-bar]').count()) {
    await closeSheets(page); await revealBar(page);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click({ timeout: 8000 });
    await sheetSettled(page);
    const names = await page.locator('.sheet [data-door]').evaluateAll((es) => es.map((e) => e.innerText.split('\n')[0].trim()));
    await closeSheets(page);
    return { door: 'bar', names };
  }
  await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
  await page.locator('.sheet').last().getByText('Jump to a section').first().click({ timeout: 8000 });
  await page.waitForTimeout(500);
  const names = await page.locator('.sheet').last().evaluate((s) => [...s.querySelectorAll('button, [role=button], a')].map((e) => e.innerText.split('\n')[0].trim()).filter(Boolean));
  await closeSheets(page);
  return { door: 'eyebrow', names };
}

async function openSection(page, name) {
  await anyDoor(page);
  await closeSheets(page);
  if (await page.locator('.srail-row').count()) {
    await page.locator('.srail-row', { hasText: name }).first().click({ timeout: 8000 });
  } else if (await page.locator('[data-tt-bar]').count()) {
    await revealBar(page);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click({ timeout: 8000 });
    await page.locator('.sheet').last().locator('[data-door]', { hasText: name }).first().click({ timeout: 8000 });
  } else if (MENU_DOORS.has(name)) {
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await page.locator('.navrow', { hasText: name }).first().click({ timeout: 8000 });
  } else {
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await page.locator('.sheet').last().getByText('Jump to a section').first().click({ timeout: 8000 });
    await page.locator('.sheet').last().getByText(name).first().click({ timeout: 8000 });
  }
  await sheetSettled(page);
  await page.waitForTimeout(300);
}

// ── measurements ─────────────────────────────────────────────────────────────
const measure = (page, touch) => page.evaluate((touch) => {
  const vis = (e) => {
    if (e.closest('[inert],[aria-hidden="true"]')) return false;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) < 0.05) return false;
    return true;
  };
  const sheet = [...document.querySelectorAll('.sheet')].pop();
  const scope = sheet || document.body;
  const desc = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.innerText || e.getAttribute('aria-label') || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '"');
  // text below 11px
  const small = [];
  const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    if (!t.textContent.trim()) continue;
    const e = t.parentElement; if (!e || seen.has(e)) continue; seen.add(e);
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 11 && vis(e)) small.push(`${fs}px ${desc(e)}`);
  }
  // touch targets below 44x44, probed the way everyTapIsFortyFourSquare does:
  // elementFromPoint outward from each control's centre, so a ::after hit area
  // counts and a clipped one does not. Inline links inside a sentence are exempt.
  const tiny = [];
  if (touch) {
    const PRESS = 'button, a[href], [role=button], [role=radio], summary, input:not([type=hidden]), select';
    const all = [...scope.querySelectorAll(PRESS)];
    const inlineInSentence = (el) => {
      if (getComputedStyle(el).display !== 'inline') return false;
      const p = el.parentElement;
      const text = [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (text.length < 12) return false;
      const r = el.getBoundingClientRect();
      return !all.some((o) => {
        if (o === el || o.contains(el) || el.contains(o) || !o.getClientRects().length) return false;
        const q = o.getBoundingClientRect();
        const dx = Math.max(0, q.left - r.right, r.left - q.right), dy = Math.max(0, q.top - r.bottom, r.top - q.bottom);
        return Math.hypot(dx, dy) < 24;
      });
    };
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.height < 4 || r.width < 4 || el.closest('[inert], [aria-hidden="true"]') || el.disabled) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const b = el.getBoundingClientRect();
      const cx = Math.round(b.left + b.width / 2), cy = Math.round(b.top + b.height / 2);
      const owns = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
      if (!owns(cx, cy)) continue;
      const walk = (dx, dy) => { let n = 0; while (n < 60 && owns(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
      const w = walk(-1, 0) + walk(1, 0) + 1, h = walk(0, -1) + walk(0, 1) + 1;
      if (w >= 44 && h >= 44) continue;
      if (inlineInSentence(el)) continue;
      tiny.push(`${w}x${h} ${desc(el)}`);
    }
    const app = document.querySelector('.app'); if (app) app.scrollTop = 0;
    if (sheet) for (const n of sheet.querySelectorAll('*')) if (n.scrollTop) n.scrollTop = 0;
  }
  const de = document.documentElement;
  const sideways = Math.max(de.scrollWidth, document.body.scrollWidth) - innerWidth;
  const app = document.querySelector('.app');
  const appSideways = app ? app.scrollWidth - app.clientWidth : 0;
  return { sideways: Math.max(0, sideways), appSideways: Math.max(0, appSideways), smallText: small.length, smallTextSamples: small.slice(0, 8), smallTargets: touch ? tiny.length : null, smallTargetSamples: tiny.slice(0, 8), scope: sheet ? 'sheet' : 'page' };
}, touch);

const litButtons = (page) => page.evaluate(() => {
  const p = document.createElement('div'); p.style.backgroundImage = 'var(--cta-grad)'; document.body.appendChild(p);
  const grad = getComputedStyle(p).backgroundImage; p.remove();
  if (!grad || grad === 'none') return [];
  return [...document.querySelectorAll('button, a, [role=button]')].filter((e) => {
    if (e.closest('[inert]')) return false;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    return getComputedStyle(e).backgroundImage === grad;
  }).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim() + (e.closest('.hero') ? ' [hero]' : '') + (e.closest('.sheet') ? ' [sheet]' : ''));
});

const boardTexts = (page) => page.evaluate(() => {
  const t = (s) => [...document.querySelectorAll(s)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const hero = document.querySelector('.hero');
  const ht = hero ? hero.innerText : '';
  const stand = /WHERE YOU STAND([\s\S]*)$/i.exec(ht);
  return {
    ask: t('h2.ask')[0] || null,
    progress: t('[data-pp-line], [data-pp-prog]')[0] || null,
    standing: stand ? stand[1].replace(/\s+/g, ' ').trim().slice(0, 400) : null,
    stage: t('button[aria-current="true"]').filter((x) => /^(Create|Plan|The Day|After)$/.test(x))[0] || null,
  };
});

const cueRead = (page) => page.evaluate(() => [...document.querySelectorAll('[data-cue]')].map((e) => {
  const cs = getComputedStyle(e);
  const field = /^(INPUT|TEXTAREA)$/.test(e.tagName);
  return { tag: e.tagName.toLowerCase(), label: (e.innerText || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 60), inHero: !!e.closest('.hero'),
    anim: cs.animationName, dur: cs.animationDuration, iter: cs.animationIterationCount,
    ring: field ? cs.boxShadow : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
}));
const keyframes = (page, names) => page.evaluate((ns) => {
  const out = {};
  for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch { continue; }
    for (const r of rules) if (r.type === 7 && ns.includes(r.name)) out[r.name] = [...r.cssRules].map((k) => k.cssText.replace(/\s+/g, ' '));
  }
  return out;
}, names);
const alphaOf = (s) => { const m = /(?:\/\s*|,\s*)([\d.]+)\)\s*(?:\d|$|[a-z])/i.exec(s || '') || /(?:\/\s*|,\s*)([\d.]+)\)/.exec(s || ''); return m ? Number(m[1]) : null; };
const peakPct = (frames) => { let max = null; for (const f of frames || []) for (const m of f.matchAll(/(\d+(?:\.\d+)?)%,\s*transparent/g)) max = Math.max(max ?? 0, Number(m[1])); return max; };

// ── the run ──────────────────────────────────────────────────────────────────
async function step(rec, vpRec, name, page, fn, shotDir) {
  const s = { name, ok: false, console: [], http: [], blocked: [], texts: {}, floors: null, error: null, shot: null };
  const c0 = rec.console.length, b0 = rec.blocked.length, h0 = rec.http.length;
  const t0 = Date.now();
  try { const extra = await fn(); if (extra) Object.assign(s.texts, extra); s.ok = s.ok || !s.error; }
  catch (e) { s.error = String(e.message || e).split('\n')[0].slice(0, 300); }
  if (page) {
    try { const f = path.join(shotDir, `${vpRec.steps.length.toString().padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-')}.jpg`); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 60, timeout: 15_000 }); s.shot = path.relative(OUT, f); } catch {}
    try { s.floors = await measure(page, vpRec.touch); } catch (e) { s.floors = { error: String(e.message).slice(0, 120) }; }
  }
  s.ok = !s.error;
  s.console = rec.console.slice(c0); s.blocked = rec.blocked.slice(b0); s.http = rec.http.slice(h0);
  s.ms = Date.now() - t0;
  vpRec.steps.push(s);
  console.log(`  [${vpRec.id}] ${s.ok ? 'PASS' : 'FAIL'} ${name}${s.error ? ' — ' + s.error : ''}`);
  return s;
}

async function runViewport(browser, vp, runDir, meta) {
  const vpRec = { id: vp.id, touch: vp.touch, steps: [] };
  const shotDir = path.join(runDir, 'shots', vp.id); fs.mkdirSync(shotDir, { recursive: true });
  const rec = { console: [], blocked: [], http: [] };

  // 1. NEW HOST
  {
    const { ctx, page } = await newPage(browser, vp, { seeded: false, rec });
    await step(rec, vpRec, 'new-create-screen', page, async () => {
      await page.goto(SITE + Q);
      await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 30_000 });
      await page.getByText(/what are we planning/i).first().waitFor({ timeout: 20_000 });
      await page.getByPlaceholder(/crab feast/i).first().fill(SENTENCE);
      await page.getByRole('button', { name: /^Put my plan together$/ }).waitFor({ timeout: 8000 });
      return { lit: await litButtons(page) };
    }, shotDir);
    await step(rec, vpRec, 'new-reveal', page, async () => {
      await page.getByRole('button', { name: /^Put my plan together$/ }).click({ timeout: 8000 });
      const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
      await open.waitFor({ timeout: 30_000 });
      await page.locator('.rv-spinewrap.resolved').waitFor({ timeout: 15_000 }).catch(() => {});
      return { openLabel: (await open.innerText()).trim(), lit: await litButtons(page) };
    }, shotDir);
    await step(rec, vpRec, 'new-plan-open', page, async () => {
      await page.getByRole('button', { name: /^Open (your|my) plan/ }).click({ timeout: 8000 });
      await settled(page);
      await page.locator('h2.ask').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(800);
      const saved = await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1) || {}; return { name: a.name, type: a.type, guests: a.guestEstimate ?? a.guestCount, budget: a.totalBudget, date: a.date }; });
      return { ...(await boardTexts(page)), lit: await litButtons(page), parsed: saved };
    }, shotDir);
    await ctx.close();
  }

  // 2. THE BOARD + 3. EVERY SECTION (one seeded session)
  {
    const { ctx, page } = await newPage(browser, vp, { rec });
    await step(rec, vpRec, 'board', page, async () => {
      await page.goto(SITE + Q);
      await settled(page);
      await page.locator('h2.ask').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(400);
      // The cue: count, its animation, keyframe peak, then its rest after the two breaths.
      const first = await cueRead(page);
      const frames = first.length ? await keyframes(page, first[0].anim.split(',').map((s) => s.trim())) : {};
      const breathe = Object.keys(frames).find((k) => /breathe/.test(k));
      const settle = Object.keys(frames).find((k) => /settle/.test(k));
      await page.waitForTimeout(3400);
      const rest = await cueRead(page);
      const cue = {
        count: first.length, restCount: rest.length,
        target: first[0] ? `${first[0].tag} "${first[0].label}"${first[0].inHero ? ' [hero]' : ''}` : null,
        anim: first[0]?.anim ?? null, dur: first[0]?.dur ?? null, iter: first[0]?.iter ?? null,
        peakPct: peakPct(frames[breathe]), settlePct: peakPct(frames[settle]),
        restRing: rest[0]?.ring ?? null, restAlpha: alphaOf(rest[0]?.ring),
      };
      if (cue.count !== 1) throw new Error(`expected exactly one [data-cue], found ${cue.count}`);
      return { ...(await boardTexts(page)), lit: await litButtons(page), cue };
    }, shotDir);

    await step(rec, vpRec, 'whats-counted', page, async () => {
      const panel = page.locator('#whats-counted');
      if (!(await panel.count())) throw new Error('#whats-counted not on the board');
      const openPanel = async () => {
        await closeSheets(page);
        if ((await panel.getAttribute('inert')) !== null) {
          await page.locator('[data-pp-line]:visible, [aria-controls="whats-counted"]:visible').first().click({ timeout: 8000 });
        }
        await page.waitForFunction(() => { const p = document.getElementById('whats-counted'); return p && !p.hasAttribute('inert') && p.getBoundingClientRect().height > 0; }, null, { timeout: 8000 });
        await page.waitForTimeout(700);
      };
      await openPanel();
      const parts = await page.locator('#whats-counted [data-plan-part]').evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
      const opened = {};
      const fails = [];
      for (let i = 0; i < parts.length; i++) {
        await openPanel();
        const row = page.locator('#whats-counted [data-plan-part]').nth(i);
        const label = parts[i].split(' ').slice(0, 3).join(' ');
        try {
          await row.scrollIntoViewIfNeeded();
          await row.click({ timeout: 6000 });
          await sheetSettled(page, 8000);
          opened[parts[i]] = (await page.locator('#sheet-title').last().innerText().catch(() => '?')).trim();
        } catch (e) { opened[parts[i]] = 'DID NOT OPEN'; fails.push(label); }
        await closeSheets(page);
      }
      await openPanel();
      if (!parts.length) throw new Error('no [data-plan-part] rows');
      if (fails.length) throw new Error('parts that did not open a section: ' + fails.join(', '));
      return { parts, opened };
    }, shotDir);

    let menu = { door: null, names: [] };
    await step(rec, vpRec, 'menu', page, async () => {
      await closeSheets(page);
      menu = await listSections(page);
      const missing = SECTIONS.filter((n) => !MENU_DOORS.has(n) && !menu.names.some((x) => x.includes(n)));
      if (missing.length) throw new Error('menu lacks: ' + missing.join(', '));
      return { door: menu.door, names: menu.names };
    }, null);

    for (const name of SECTIONS) {
      await step(rec, vpRec, 'section: ' + name, page, async () => {
        await openSection(page, name);
        const title = (await page.locator('#sheet-title').last().innerText().catch(() => '')).trim();
        const out = { title, lit: await litButtons(page) };
        if (name === 'The spread & shopping') {
          const sh = page.locator('.sheet').last();
          const item = sh.locator('button.fstat, button', { hasText: /^\s*Menu(?![a-z])/ }).first();
          if (await item.count()) {
            const lbl = (await item.innerText()).replace(/\s+/g, ' ').trim().slice(0, 60);
            const before = await sh.innerText();
            await item.scrollIntoViewIfNeeded(); await item.click({ timeout: 6000 }); await page.waitForTimeout(800);
            out.openedItem = lbl;
            const after = await page.locator('.sheet').last().innerText();
            if (after === before) throw new Error('tapping the spread item changed nothing');
            out.afterTitle = (await page.locator('#sheet-title').last().innerText().catch(() => '')).trim();
            const flat = after.replace(/\s+/g, ' ');
            const at = flat.search(/YOUR CHOICES/i);
            out.afterHead = flat.slice(at < 0 ? 0 : at, (at < 0 ? 0 : at) + 160).trim();
          } else throw new Error('no item to open in the spread');
        }
        if (name === 'People you’re hiring') {
          const sh = page.locator('.sheet').last();
          const card = sh.getByText('Maple Table Catering').first();
          await card.click({ timeout: 6000 }); await page.waitForTimeout(700);
          out.openedItem = 'Maple Table Catering';
          out.afterTitle = (await page.locator('#sheet-title').last().innerText().catch(() => '')).trim();
          out.expanded = /where this stands/i.test(await page.locator('.sheet').last().innerText());
          if (!out.expanded) throw new Error('vendor card did not open (no "Where this stands")');
        }
        if (name === 'You & settings') {
          const v = page.locator('[data-whats-new]');
          await v.scrollIntoViewIfNeeded({ timeout: 5000 });
          out.version = (await v.innerText()).split('\n')[0].replace(/\s*·\s*$/, '').trim();
          meta.version = meta.version || out.version;
        }
        return out;
      }, shotDir);
    }
    await closeSheets(page);
    await ctx.close();
  }

  // 4. THE DAY and AFTER
  for (const [label, when] of [['the-day', DAY], ['after', AFTER]]) {
    const { ctx, page } = await newPage(browser, vp, { clock: when, rec });
    await step(rec, vpRec, label, page, async () => {
      await page.goto(SITE + Q);
      await settled(page);
      await page.waitForTimeout(900);
      const t = await boardTexts(page);
      const want = label === 'the-day' ? 'The Day' : 'After';
      if (t.stage !== want) {
        // Not landed there by itself: step to it, and say so.
        t.landedOn = t.stage;
        await goToStage(page, want);
        await page.waitForTimeout(900);
        Object.assign(t, await boardTexts(page));
      }
      t.screen = await page.evaluate(() => { const h = document.querySelector('.escreen.on') || document.querySelector('.app'); return h ? h.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null; });
      t.lit = await litButtons(page);
      if (t.stage !== want) throw new Error(`stage is ${t.stage}, wanted ${want}`);
      return t;
    }, shotDir);
    await ctx.close();
  }

  // 5. THE GUEST INVITE PAGE (view only)
  {
    const { ctx, page } = await newPage(browser, vp, { seeded: false, rec });
    await step(rec, vpRec, 'guest-invite', page, async () => {
      await page.goto(SITE + Q + '&rsvp=' + RSVP_CODE);
      await page.locator('.inv2-ask, [class*=inv2]').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(800);
      const name = page.getByLabel(/Your name/i).first();
      return {
        title: await page.evaluate(() => (document.querySelector('h1, .inv2-title, [class*=inv2] h1, [class*=inv2] h2') || {}).innerText || null),
        nameField: await name.isVisible().catch(() => false),
        replyButtons: await page.locator('[class*=inv2] button').evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8)),
        lit: await litButtons(page),
      };
    }, shotDir);
    await ctx.close();
  }
  return vpRec;
}

async function weather() {
  const url = `${API}/api/weather/geocode?q=Springfield%2C%20VA&state=VA`;
  const t0 = Date.now();
  try {
    const r = await fetch(url);
    const j = await r.json().catch(() => null);
    const st = j && j.result && j.result.state;
    return { name: 'weather-geocode', ok: r.status === 200 && st === 'Virginia', status: r.status, state: st || null, result: j && j.result, ms: Date.now() - t0 };
  } catch (e) { return { name: 'weather-geocode', ok: false, error: String(e.message || e), ms: Date.now() - t0 }; }
}

(async () => {
  const started = Date.now();
  const tmp = path.join(OUT, '_run-' + process.pid);
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const meta = { site: SITE + Q, startedAt: new Date().toISOString(), clock: { now: NOW, day: DAY, after: AFTER, tz: TZ }, version: null };
  const head = await fetch(SITE + Q).then((r) => r.status).catch(() => 0);
  meta.siteStatus = head;
  if (head !== 200) { console.error('site status', head); }
  const browser = await chromium.launch();
  const results = [];
  const queue = [...VIEWPORTS];
  await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, async () => {
    while (queue.length) { const vp = queue.shift(); console.log('viewport', vp.id); results.push(await runViewport(browser, vp, tmp, meta)); }
  }));
  await browser.close();
  results.sort((a, b) => VIEWPORTS.findIndex((v) => v.id === a.id) - VIEWPORTS.findIndex((v) => v.id === b.id));
  meta.weather = await weather();
  const m = /\(([0-9a-f]{6,40})\)/i.exec(meta.version || '');
  meta.sha = m ? m[1] : 'unknown-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '');
  meta.finishedAt = new Date().toISOString();
  meta.seconds = Math.round((Date.now() - started) / 1000);
  const runDir = path.join(OUT, meta.sha);
  fs.rmSync(runDir, { recursive: true, force: true });
  fs.renameSync(tmp, runDir);
  // screenshot paths were relative to OUT via the temp dir; rewrite them.
  for (const v of results) for (const s of v.steps) if (s.shot) s.shot = s.shot.replace(/^_run-\d+\//, meta.sha + '/');
  const out = { meta, viewports: results };
  fs.writeFileSync(path.join(runDir, 'results.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(runDir, 'summary.md'), require('./summary.cjs').summary(out));
  console.log(`\n${meta.sha}: ${results.flatMap((v) => v.steps).filter((s) => !s.ok).length} failing steps; weather ${meta.weather.ok ? 'ok' : 'FAIL'}; ${meta.seconds}s → ${path.relative(process.cwd(), runDir)}`);
})();
