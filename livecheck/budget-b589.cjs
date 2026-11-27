// #309 hostv2 budget question (light + dark), "A different amount" → the Change drawer; #310 the hero ask is steel in dark too.
//   node livecheck/budget-b589.cjs <outdir>
// Seeded E2E_TEST_ plans in this browser only; every POST/PUT/PATCH/DELETE aborted; share/clipboard/open stubbed. "Plan with" is never tapped. Nothing sent.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1';
const OUT = path.resolve(process.argv[2] || 'livecheck/_run-budget'); fs.mkdirSync(OUT, { recursive: true });
const VPS = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];
const KEY = 'ngw-hostv2-custom-events', LAST = 'ngw-hostv2-last-event';
const NOW = new Date('2026-11-27T10:00:00-05:00');
const plus = (d) => new Date(NOW.getTime() + d * 864e5).toISOString().slice(0, 10);
const TG = { id: 'E2E_TEST_budget', name: 'E2E_TEST_ Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20', date: plus(10), startTime: '15:00', startTimeSource: 'host',
  venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA', guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [] };
const PAST = { id: 'E2E_TEST_past', name: 'E2E_TEST_ 40th Birthday', type: 'Birthday', createdAt: '2026-11-01', date: plus(-3), startTime: '18:00', startTimeSource: 'host',
  venue: 'Example Room', venueCity: 'Annapolis, MD', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Oak', rsvp: 'Yes' }], vendors: [], budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }], timeline: [] };

(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [w, h, touch] of VPS) {
    const vp = `${w}x${h}`; const r = { vp, steps: [], errs: [], blocked: [] }; const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true }); let n = 0; let cur;
    const mk = async () => {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, timezoneId: 'America/New_York' });
      await ctx.route('**/*', (rt) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(rt.request().method()) ? (r.blocked.push(rt.request().method() + ' ' + rt.request().url().split('?')[0]), rt.abort()) : rt.continue());
      await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: async () => {}, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {} window.open = () => null; });
      const p = await ctx.newPage(); p.setDefaultTimeout(7000); await p.clock.setFixedTime(NOW);
      p.on('pageerror', (e) => r.errs.push(String(e.message).slice(0, 160)));
      return { ctx, p };
    };
    const step = async (name, fn) => { const s = { name, ok: true }; try { Object.assign(s, (await fn()) || {}); } catch (e) { s.ok = false; s.error = String(e.message).split('\n')[0].slice(0, 400); }
      try { s.sideways = await cur.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await cur.p.screenshot({ path: path.join(dir, String(++n).padStart(2, '0') + '-' + name + '.jpg'), type: 'jpeg', quality: 60 }); } catch {} r.steps.push(s); console.log(vp, s.ok ? 'ok  ' : 'FAIL', name, s.error || ''); };
    const seed = async (p, ev, q) => { await p.goto(BASE); await p.evaluate(([k, l, e]) => { localStorage.clear(); localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1'); localStorage.setItem(k, JSON.stringify([e])); localStorage.setItem(l, e.id); }, [KEY, LAST, ev]);
      await p.goto(BASE + q, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1800); };

    for (const theme of ['light', 'dark']) {
      cur = await mk();
      const p = cur.p;
      await step('budget-' + theme, async () => {
        await seed(p, TG, '&elegant=1&theme=' + theme);
        const hero = p.locator('.hero').first(); await hero.scrollIntoViewIfNeeded();
        const text = (await hero.innerText()).replace(/\s+/g, ' ');
        const rows = await hero.locator('.optrow').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { t: e.innerText.replace(/\s+/g, ' '), h: Math.round(b.height), w: Math.round(b.width), on: e.getAttribute('aria-checked') }; }));
        const plan = hero.locator('[data-budget-plan]'); const planText = (await plan.innerText()).trim();
        const room = await plan.evaluate((e) => { const b = e.getBoundingClientRect(); const hero = e.closest('.hero'); const hb = hero.getBoundingClientRect(); return Math.round(hb.bottom - b.bottom); });
        const headline = (/(\$[\d,]+)/.exec(text.slice(text.indexOf('How much do you want to spend?'))) || [])[1];
        const perHeads = rows.map((x) => (/\$[\d,]+ a head/.exec(x.t) || [null])[0]);
        const fold = await hero.getByText(/How we got these/).count();
        const out = { headline, planText, rows, perHeads, fold, roomBelowPlan: room };
        const bad = [];
        if (!/How much do you want to spend\?/.test(text)) bad.push('question');
        if (!headline || planText !== 'Plan with ' + headline) bad.push('headline != Plan with');
        const tiers = rows.filter((x) => /Lean|Mid[-\u2011]range|All-out/.test(x.t));
        if (tiers.length !== 3 || tiers.some((x) => !/a head/.test(x.t))) bad.push('tiers or per-head');
        if (!rows.some((x) => /A different amount/.test(x.t))) bad.push('different amount');
        if (rows.some((x) => x.h < 44)) bad.push('row under 44');
        if (!fold) bad.push('no How we got these');
        if (room < 16) bad.push('room below Plan with ' + room);
        if (bad.length) throw new Error(bad.join(', ') + ' :: ' + JSON.stringify(out));
        return out;
      });
      await step('budget-pick-' + theme, async () => {
        const hero = p.locator('.hero').first();
        await hero.locator('.optrow', { hasText: 'Lean' }).first().click(); await p.waitForTimeout(400);
        const planText = (await hero.locator('[data-budget-plan]').innerText()).trim();
        const text = (await hero.innerText()).replace(/\s+/g, ' ');
        const headline = (/(\$[\d,]+)/.exec(text.slice(text.indexOf('How much do you want to spend?'))) || [])[1];
        const fold = hero.getByText(/How we got these/).first(); await fold.click(); await p.waitForTimeout(400);
        const after = (await hero.innerText()).replace(/\s+/g, ' ');
        const out = { planText, headline, foldOpened: after.length > text.length, foldSnippet: after.slice(after.indexOf('How we got these'), after.indexOf('How we got these') + 200) };
        if (planText !== 'Plan with ' + headline || !/Lean/.test(text)) throw new Error(JSON.stringify(out));
        return out;
      });
      await step('budget-different-' + theme, async () => {
        const hero = p.locator('.hero').first();
        await hero.locator('.optrow', { hasText: 'A different amount' }).first().click(); await p.waitForTimeout(700);
        // The Change drawer opens inline on the board (not a sheet): Lean / Mid-range / All-out, "Your own number", "Use it".
        const own = p.getByPlaceholder(/Your own number/i).first(); await own.waitFor({ timeout: 5000 });
        const drawer = await own.evaluate((el) => { let d = el; for (let i = 0; i < 8 && d.parentElement; i++) { d = d.parentElement; if (/Change your budget/.test(d.innerText)) break; } const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
          const ctl = [...d.querySelectorAll('button, input, a[href]')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.placeholder || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; });
          return { text: d.innerText.replace(/\s+/g, ' ').slice(0, 300), controls: ctl }; });
        await own.scrollIntoViewIfNeeded(); const box = await own.boundingBox();
        const small = drawer.controls.filter((c) => c.h < 44 || c.w < 44);
        const changed = await p.evaluate((k) => JSON.parse(localStorage.getItem(k))[0].totalBudget ?? null, KEY);
        const out = { drawer: drawer.text, controls: drawer.controls, small, ownInputInView: !!box && box.y >= 0 && box.y + box.height <= (await p.evaluate(() => innerHeight)), totalBudgetSaved: changed,
          drawerPerHead: /a head/.test(drawer.text), drawerPick: (/(Lean|Mid[-\u2011]range|All-out)\s*·\s*our pick/.exec(drawer.text) || [])[1] || null };
        if (!/Change your budget/.test(drawer.text) || small.length || !out.ownInputInView || changed != null) throw new Error(JSON.stringify(out));
        return out;
      });
      await cur.ctx.close();
    }

    cur = await mk();
    await step('steel-ask-dark', async () => {
      const p = cur.p; await seed(p, PAST, '&theme=dark');
      const bar = p.locator('[data-tt-bar]'); if (await bar.count() && await bar.getByRole('button', { name: 'Plan', exact: true }).count()) await bar.getByRole('button', { name: 'Plan', exact: true }).first().click();
      else { const rail = p.locator('.srail [data-rail-stage]', { hasText: 'Plan' }); if (await rail.count()) await rail.first().click(); else { await p.locator('.ev-eyebrow').first().click(); await p.locator('.navseg-b', { hasText: 'Plan' }).first().click(); } }
      await p.waitForTimeout(1200);
      const cta = p.locator('.hero.elegant .cta', { hasText: 'Save what worked' }).first(); await cta.waitFor();
      const look = await cta.evaluate((e) => { const cs = getComputedStyle(e); const root = getComputedStyle(document.documentElement);
        const probe = document.createElement('div'); document.body.appendChild(probe); const res = (prop, v) => { probe.style[prop] = v; const out = getComputedStyle(probe)[prop]; probe.style[prop] = ''; return out; };
        const out = { shadow: cs.boxShadow, bg: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 120) : cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
          ctaGrad: res('backgroundImage', 'var(--cta-grad)').slice(0, 120), onSteel: res('color', 'var(--on-steel)'), steelSoft: res('borderTopColor', 'var(--steel-soft)'), theme: document.documentElement.getAttribute('data-theme') };
        probe.remove(); return out; });
      const contrast = await cta.evaluate((e) => { const px = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number); const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const cs = getComputedStyle(e); const grad = cs.backgroundImage.match(/rgba?\([^)]+\)/g) || [cs.backgroundColor]; const fg = L(px(cs.color));
        return grad.map((c) => { const bg = L(px(c)); const [a, b2] = fg > bg ? [fg, bg] : [bg, fg]; return Math.round(((a + 0.05) / (b2 + 0.05)) * 100) / 100; }); });
      const out = { ...look, contrastPerStop: contrast };
      const bad = [];
      if (look.bg !== look.ctaGrad) bad.push('not the steel gradient');
      if (look.color !== look.onSteel) bad.push('label not on-steel');
      if (!/0px 0px 0px 1px/.test(look.shadow || '')) bad.push('no 1px edge ring');
      if (Math.min(...contrast) < 4.5) bad.push('label contrast < 4.5');
      if (bad.length) throw new Error(bad.join(', ') + ' :: ' + JSON.stringify(out));
      return out;
    });
    await cur.ctx.close();
    res.push(r);
  }
  await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  for (const r of res) { console.log(`\n${r.vp} pageErrors:${r.errs.length} blocked:${[...new Set(r.blocked)].join(',')}`); for (const s of r.steps) console.log(`  ${s.ok ? 'ok ' : 'FAIL'} ${s.name} side ${s.sideways}${s.error ? ' — ' + s.error : ''}`); }
})();
