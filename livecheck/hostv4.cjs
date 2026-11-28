// Per-deploy read-only check of /hostv4/ at the five live-check sizes.
//   node livecheck/hostv4.cjs <outdir>
// Writes to the network are aborted; share/clipboard/open are stubbed. The only
// writes are the app's own localStorage writes on a seeded E2E_TEST_ plan.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-hostv4'); fs.mkdirSync(OUT, { recursive: true });
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
const EV = { id: 'E2E_TEST_lc-v4', name: 'E2E_TEST_ Rosa’s Harvest Dinner', type: 'Birthday', date: '2026-12-19T18:00', guestEstimate: 25,
  location: '42 Elm Ct, Springfield, VA 22150', guests: [], vendors: [] };

async function floors(p, touch) {
  return p.evaluate((touch) => {
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]');
    const small = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.innerText.trim().slice(0, 30));
    const tiny = touch ? [...document.querySelectorAll('button, a[href], [role=button], [role=radio], input, select')].filter(vis).filter((e) => {
      const b = e.getBoundingClientRect(); if (b.width >= 44 && b.height >= 44) return false;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const hit = (x, y) => { const h = document.elementFromPoint(x, y); return h && (h === e || e.contains(h)); };
      return !(hit(cx - 21, cy - 21) && hit(cx + 21, cy + 21) && hit(cx - 21, cy + 21) && hit(cx + 21, cy - 21));
    }).filter((e) => !(e.tagName === 'A' && e.closest('p') && !e.closest('p').classList.contains('fine') === false && false)).map((e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)} ${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)}`; }) : [];
    return { sideways: document.documentElement.scrollWidth - innerWidth, smallText: small.length, smallTextEx: small.slice(0, 3), smallTargets: tiny.length, smallTargetsEx: tiny.slice(0, 4) };
  }, touch);
}
const screen = (p) => p.evaluate(() => {
  const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const t = (s) => { const e = document.querySelector(s); return e && vis(e) ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
  const words = (document.querySelector('.gk-app, .app') || document.body).innerText.split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w)).length;
  return { h1: t('h1'), sub: t('.sub'), q: t('.gk-q, .q'), budget: !!document.querySelector('[data-budget]'),
    choices: [...document.querySelectorAll('[role=radio]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim() + (e.getAttribute('aria-checked') === 'true' ? ' ✓' : '')),
    primary: [...document.querySelectorAll('.primary')].filter(vis).map((e) => e.innerText.trim() + (e.getAttribute('href') ? ' → ' + e.getAttribute('href') : '')),
    done: t('[data-done]'), alert: t('[role=alert]'), sample: t('[data-sample]'), words };
});
const stored = (p) => p.evaluate(([k, id]) => { try { const l = JSON.parse(localStorage.getItem(k) || '[]'); const e = l.find((x) => x.id === id); return e ? { found: true, totalBudget: e.totalBudget === undefined ? '(unset)' : e.totalBudget, n: l.length } : { found: false, n: l.length }; } catch (e) { return { err: String(e) }; } }, [KEY, EV.id]);

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], console: [], http: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
    await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {}, readText: async () => '' }, configurable: true }); } catch {} window.open = () => null; });
    const p = await ctx.newPage(); let n = 0;
    p.on('console', (m) => m.type() === 'error' && r.console.push(m.text().slice(0, 160)));
    p.on('pageerror', (e) => r.console.push('pageerror: ' + String(e.message).slice(0, 160)));
    p.on('response', (x) => x.status() >= 400 && r.http.push(x.status() + ' ' + x.url().split('?')[0].slice(0, 120)));
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 200); }
      try { s.floors = await floors(p, touch); await p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name.replace(/\W+/g, '-') + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); };
    const go = async () => { await p.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200); };

    // 1. Sample plan (new visitor)
    await step('sample-next', async () => { await go(); const s = await screen(p); if (!s.primary.length) throw new Error('no primary action on Next step (dead end)'); return { s }; });
    await step('sample-tabs', async () => { const out = {}; for (const t of ['Your plan', 'The Day', 'Next step']) { await navTo(p, t); await p.waitForTimeout(300); out[t] = await screen(p); } return { s: out }; });
    await step('sample-budget-not-saved', async () => {
      if (!(await screen(p)).budget) return { skipped: 'no budget question on sample' };
      await p.getByRole('radio').first().click(); const label = (await p.locator('.action .primary').innerText()).trim();
      await p.locator('.action .primary').click(); await p.waitForTimeout(300);
      const s = await screen(p); const st = await p.evaluate((k) => localStorage.getItem(k), KEY);
      if (st && st !== '[]') throw new Error('sample wrote saved events: ' + st.slice(0, 80));
      if (!/not saved/i.test(s.done || '')) throw new Error('no "not saved" line: ' + s.done);
      return { label, s };
    });
    await step('how-we-got-these', async () => {
      await go(); if (!(await screen(p)).budget) return { skipped: 'no budget question' };
      await p.getByRole('button', { name: 'How we got these' }).click(); await p.waitForTimeout(300);
      const d = await p.evaluate(() => { const s = document.querySelector('[role=dialog]'); return s ? { heads: [...s.querySelectorAll('h3')].map((e) => e.parentElement.innerText.replace(/\s+/g, ' ')), rows: s.querySelectorAll('.row').length, fine: [...s.querySelectorAll('.fine')].map((e) => e.innerText.slice(0, 140)), scrollable: s.scrollHeight > s.clientHeight, fits: s.getBoundingClientRect().bottom <= innerHeight + 1 } : null; });
      if (!d) throw new Error('sheet did not open');
      await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300);
      if (await p.locator('[role=dialog]').count()) throw new Error('Done did not close the sheet');
      return { d };
    });

    // 2. Seeded E2E_TEST_ plan: save, Undo clears, save again, survives reload
    await step('seeded-next', async () => {
      await p.evaluate(([k, l, ev]) => { localStorage.setItem(k, JSON.stringify([ev])); localStorage.setItem(l, ev.id); }, [KEY, LAST, EV]);
      await go(); const s = await screen(p); if (!/E2E_TEST_/.test(s.h1 || '')) throw new Error('seeded plan not shown: ' + s.h1); return { s, st: await stored(p) };
    });
    await step('seeded-save', async () => {
      if (!(await screen(p)).budget) return { skipped: 'no budget question' };
      await p.getByRole('radio').first().click(); const label = (await p.locator('.action .primary').innerText()).trim(); const want = Number(label.replace(/[^\d]/g, ''));
      await p.locator('.action .primary').click(); await p.waitForTimeout(400);
      const st = await stored(p); if (st.totalBudget !== want) throw new Error(`saved ${st.totalBudget}, wanted ${want}`);
      return { label, want, st, s: await screen(p) };
    });
    await step('seeded-undo', async () => {
      if (!(await p.getByRole('button', { name: 'Undo' }).count())) return { skipped: 'no Undo' };
      await p.getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(400);
      const st = await stored(p); if (!(st.totalBudget === '' || st.totalBudget === '(unset)')) throw new Error('Undo left totalBudget=' + st.totalBudget);
      return { st, s: await screen(p) };
    });
    await step('seeded-reload', async () => {
      if (!(await screen(p)).budget) return { skipped: 'no budget question after Undo' };
      await p.getByRole('radio').nth(1).click(); const want = Number((await p.locator('.action .primary').innerText()).replace(/[^\d]/g, ''));
      await p.locator('.action .primary').click(); await p.waitForTimeout(400);
      await go(); const st = await stored(p); if (st.totalBudget !== want) throw new Error(`after reload totalBudget=${st.totalBudget}, wanted ${want}`);
      return { want, st, s: await screen(p) };
    });
    await p.evaluate(([k, l]) => { localStorage.removeItem(k); localStorage.removeItem(l); }, [KEY, LAST]).catch(() => {});
    res.push(r); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) {
    console.log(`\n${r.vp}  console:${r.console.length} http:${r.http.length} blocked:${r.blocked.length}`);
    for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name}${s.skipped ? ' (skipped: ' + s.skipped + ')' : ''}${s.error ? ' — ' + s.error : ''}  floors ${s.floors ? `${s.floors.sideways}/${s.floors.smallText}/${s.floors.smallTargets}` : 'n/a'}`);
  }
  console.log('\nconsole:', [...new Set(res.flatMap((r) => r.console))]); console.log('http:', [...new Set(res.flatMap((r) => r.http))]); console.log('blocked:', [...new Set(res.flatMap((r) => r.blocked))]);
})();
