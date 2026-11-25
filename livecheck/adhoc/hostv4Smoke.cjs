// Read-only smoke of the hostv4 shell (PR #263) at the five live-check sizes.
// Writes aborted; share/clipboard/open stubbed; no seeded data (what a new visitor sees).
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const URL = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.join(__dirname, 'hostv4-out'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const r = { vp: `${w}x${h}`, console: [], http: [], blocked: [] };
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage();
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    const resp = await p.goto(URL).catch((e) => null); r.status = resp && resp.status();
    await p.waitForTimeout(5000);
    r.m = await p.evaluate(() => {
      const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]');
      const small = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.innerText.trim().slice(0, 30));
      const tiny = [...document.querySelectorAll('button, a[href], [role=button], input, select')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).map((e) => `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} ${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)}`);
      return { title: document.title, sideways: document.documentElement.scrollWidth - innerWidth, textChars: document.body.innerText.trim().length, head: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), buttons: [...document.querySelectorAll('button')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 12), smallText: small.length, smallTextEx: small.slice(0, 4), smallTargetsBox: tiny.length, smallTargetsEx: tiny.slice(0, 5) };
    });
    await p.screenshot({ path: path.join(OUT, `${w}x${h}.jpg`), type: 'jpeg', quality: 60, fullPage: true });
    res.push(r); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
  for (const r of res) console.log(r.vp, r.status, JSON.stringify({ ...r.m, console: r.console, http: r.http, blocked: r.blocked.length }));
})();
