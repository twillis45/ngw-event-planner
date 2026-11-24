// RENDER TOOL, NOT A TEST (cohesion batch F, 11/24/2026). Never merges.
// The board (Plan), its What's counted panel, its lower zone and a sheet's
// header on the built-in Wanda sample, clock fixed at Tue, Nov 24, 2026 10:00,
// light, dsf 2, at 390, 834, 1024, 1194 (iPad landscape) and 1440. Before is
// the live e2e build. Proposed is the same page with the change applied to its
// DOM using the app's own markup: the iPad landscape header is the desktop's
// own `header.tt-head`, and the phone and desktop "Who's confirmed" list is the
// tall iPad's own `.tt-who-g` rows. Nothing in the app was changed.
// Run: node renders/cohesion-f/render.mjs   (vite preview on RENDER_PORT, default 7411)
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, openSection, measure, outDir } from '../_tools/lib.mjs';

const OUT = outDir('f');
const CLOCK = '2026-11-24T10:00:00';
const WIDTHS = (process.env.WIDTHS || '390,834,1024,1194,1440').split(',').map(Number);
const SEED = { eventId: 'ev-x-wanda' };
const report = {};
const browser = await launch();

// The two pieces of the app's own markup the proposals borrow.
const borrow = async () => {
  const a = await open(browser, 1440, SEED, { clock: CLOCK });
  const head = await a.page.evaluate(() => document.querySelector('header.tt-head').outerHTML);
  await a.ctx.close();
  const b = await open(browser, 1024, SEED, { clock: CLOCK });
  const who = await b.page.evaluate(() => [...document.querySelectorAll('.who-confirmed .tt-who-g')].map((g) => g.outerHTML).join(''));
  await b.ctx.close();
  return { head, who };
};
const { head: TT_HEAD, who: WHO_LIST } = await borrow();

const scrollAppTo = (page, sel, pad = 70) => page.evaluate(({ sel, pad }) => {
  const el = document.querySelector(sel); if (!el) return false;
  const app = document.querySelector('.app');
  app.scrollTop += el.getBoundingClientRect().top - pad;
  return true;
}, { sel, pad });

// ── the board changes, all at once ───────────────────────────────────────────
const proposeBoard = (page) => page.evaluate(({ TT_HEAD, WHO_LIST }) => {
  const notes = [];
  // #17: iPad landscape demotes the title into the eyebrow. Use the desktop's header.
  const eb = document.querySelector('.escreen.on > button.ev-eyebrow');
  if (eb && innerWidth >= 1100 && innerWidth < 1300) {
    const t = document.createElement('div'); t.innerHTML = TT_HEAD;
    eb.replaceWith(t.firstElementChild); notes.push('#17 title restored');
  }
  // #14: one lit action on the board: our pick, said as a button.
  const pick = document.querySelector('.hero-card .decopt.pick');
  if (pick && !document.querySelector('[data-r-lit]')) {
    const name = pick.querySelector('.decopt-name').textContent.trim().replace(/\s*\/.*$/, '').toLowerCase();
    const b = document.createElement('button');
    b.className = 'cta'; b.setAttribute('data-r-lit', '1'); b.style.cssText = 'width:100%;margin:10px 0 2px';
    b.textContent = `Go with ${name}`;
    pick.after(b);
    const lead = document.querySelector('.hero-card .decopts-lead');
    if (lead) lead.textContent = 'Our pick is first. Tap another to choose it instead — nothing else changes.';
    notes.push('#14 lit pick');
  }
  // #15: one name for the food call: the call's own question, everywhere
  // (the part-by-part row and the desktop NEXT pill said "Decide what you're serving").
  {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let hit = 0;
    while (tw.nextNode()) {
      const t = tw.currentNode;
      if (/Decide what you're serving/.test(t.textContent)) { t.textContent = t.textContent.replace(/Decide what you're serving/g, 'How is the food handled?'); hit++; }
    }
    if (hit) notes.push(`#15 one name (${hit})`);
  }
  // #16: desktop's "Worth having a plan for" starts at the hero column, two columns wide.
  const watch = document.querySelector('.ef-watch');
  if (watch && getComputedStyle(watch).gridColumnStart === '2') { watch.style.gridColumn = '1 / 3'; notes.push('#16 worth aligned'); }
  // #40: the run-on "Still waiting: …" becomes the tall iPad's grouped list.
  const run = document.querySelector('.who-confirmed [data-who-waiting]');
  if (run) { const d = document.createElement('div'); d.innerHTML = WHO_LIST; d.setAttribute('data-r-who', '1'); run.replaceWith(d); notes.push('#40 list'); }
  // #47: the rail's "Narrow".
  for (const r of document.querySelectorAll('.srail-row.srail-min')) {
    for (const n of r.querySelectorAll('*')) if (n.children.length === 0 && n.textContent.trim() === 'Narrow') { n.textContent = 'Icons only'; notes.push('#47 Icons only'); }
  }
  // #48: the status line's engine words.
  for (const p of document.querySelectorAll('p.v-meta')) {
    if (/^Active planning/.test(p.textContent.trim())) { p.textContent = '4 of 7 handled. Food, vendors and 1 more still need you.'; notes.push('#48 status words'); }
  }
  return notes;
}, { TT_HEAD, WHO_LIST });

// ── What's counted opens in place (#13), pills at 44 (#38) ──────────────────
const proposeCounted = (page) => page.evaluate(() => {
  const caret = [...document.querySelectorAll('[aria-controls="whats-counted"]')].find((c) => c.offsetParent);
  const panel = document.getElementById('whats-counted');
  // Phone and 11" iPad: under the "4 of 7 handled · What's counted" line.
  // Rail widths: the caret sits in the narrow Where you stand card, so the
  // panel opens under the hero's own "4 of 7 plan parts handled" line.
  let anchor = caret.closest('.pp-prog');
  if (!anchor && !caret.closest('.bento, aside, [class*=rail], [class*=stand]')) {
    anchor = caret; while (anchor.parentElement && anchor.getBoundingClientRect().width < 300) anchor = anchor.parentElement;
  }
  if (!anchor) {
    const leaf = [...document.querySelectorAll('.hero *')].find((e) => e.children.length === 0 && /\d+ of \d+ (plan parts )?handled/.test(e.textContent) && !e.closest('#whats-counted, .bento'));
    anchor = leaf; while (anchor && anchor.parentElement && !/next dated work/i.test(anchor.parentElement.textContent)) anchor = anchor.parentElement;
    anchor = anchor && anchor.parentElement ? anchor.parentElement : leaf;
  }
  anchor.after(panel);
  panel.classList.add('open');
  panel.removeAttribute('inert');
  panel.style.height = 'auto'; panel.style.maxHeight = 'none'; panel.style.overflow = 'visible'; panel.style.opacity = '1';
  caret.setAttribute('aria-expanded', 'true');
  for (const n of [caret, ...caret.querySelectorAll('*')]) if (n.children.length === 0 && /›\s*$/.test(n.textContent)) n.textContent = n.textContent.replace(/›\s*$/, '▾');
  for (const n of [caret, ...caret.querySelectorAll('*')]) if (n.children.length === 0 && /^▾/.test(n.textContent.trim()) && !caret.closest('.pp-prog')) n.textContent = n.textContent.replace('▾', '▴');
  const inner = panel.querySelector('.slidepanel-inner');
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.style.cssText = 'display:flex;width:100%;justify-content:space-between;align-items:center;min-height:44px;background:none;border:0;border-bottom:1px solid var(--line);padding:0;margin:4px 0 10px;color:inherit;font:inherit;cursor:pointer';
  bar.innerHTML = '<span class="shelf-label" style="margin:0;border:0;padding:0">What’s counted</span><span class="of">Close ▴</span>';
  inner.prepend(bar);
  const end = document.createElement('button');
  end.type = 'button'; end.className = 'later-row';
  end.style.cssText = 'width:100%;text-align:center;min-height:44px;background:none;border:0;border-top:1px solid var(--line);margin-top:10px;color:var(--faint);font:inherit;cursor:pointer';
  end.textContent = 'Close what’s counted ▴';
  inner.append(end);
  for (const p of panel.querySelectorAll('.pill')) { p.style.minHeight = '44px'; p.style.display = 'inline-flex'; p.style.alignItems = 'center'; }
});

for (const w of WIDTHS) {
  const touch = w !== 1440;
  // 1. the board, first screen
  for (const mode of ['before', 'proposed']) {
    const { ctx, page } = await open(browser, w, SEED, { clock: CLOCK });
    const notes = mode === 'proposed' ? await proposeBoard(page) : [];
    await page.waitForTimeout(400);
    const tag = `${mode}__board__Wanda-sample__${w}`;
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    report[tag] = { notes, ...(await measure(page, '.app', { touch })), lit: await page.evaluate(() => [...document.querySelectorAll('.app .cta')].filter((b) => b.offsetParent && !b.disabled).length) };
    // 2. the lower zone: "Worth having a plan for" and "Who's confirmed"
    if (w === 390 || w === 1440 || w === 834) {
      for (const [name, sel] of [['worth', '.ef-watch'], ['whos-confirmed', '.who-confirmed']]) {
        if (!(await scrollAppTo(page, sel))) continue;
        await page.waitForTimeout(500);
        if (mode === 'proposed') { await proposeBoard(page); await page.waitForTimeout(200); }
        const t2 = `${mode}__board-${name}__Wanda-sample__${w}`;
        await page.screenshot({ path: path.join(OUT, `${t2}.png`) });
        report[t2] = await page.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { x: Math.round(r.x), width: Math.round(r.width), height: Math.round(r.height) }; }, sel);
      }
    }
    await ctx.close();
  }
  // 3. What's counted, opened (where it is a caret on the board: phone and 11" iPad)
  for (const mode of ['before', 'proposed']) {
    const { ctx, page } = await open(browser, w, SEED, { clock: CLOCK });
    const caret = page.locator('[aria-controls="whats-counted"]:visible');
    if (!(await caret.count())) { await ctx.close(); break; }
    const y0 = await caret.first().evaluate((e) => Math.round(e.getBoundingClientRect().y));
    if (mode === 'before') { await caret.first().click(); await page.waitForTimeout(1500); }
    else { await proposeBoard(page); await proposeCounted(page); await page.waitForTimeout(500); await proposeBoard(page); await page.waitForTimeout(200); }
    const tag = `${mode}__whats-counted-open__Wanda-sample__${w}`;
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    report[tag] = {
      caretYBeforeTap: y0,
      ...(await page.evaluate(() => {
        const c = document.querySelector('[aria-controls="whats-counted"]'); const p = document.getElementById('whats-counted');
        return { caretYAfter: Math.round(c.getBoundingClientRect().y), panelY: Math.round(p.getBoundingClientRect().y), pillHeights: [...p.querySelectorAll('.pill')].map((x) => Math.round(x.getBoundingClientRect().height)) };
      })),
      ...(await measure(page, '#whats-counted', { touch })),
    };
    await ctx.close();
  }
  // 4. a sheet's header: "‹ Sections" beside the rail (#46) and its tap size
  for (const mode of ['before', 'proposed']) {
    const { ctx, page } = await open(browser, w, SEED, { clock: CLOCK });
    await openSection(page, 'Your money');
    const rail = await page.locator('.srail-row').count();
    if (mode === 'proposed') {
      await page.evaluate((rail) => {
        const back = [...document.querySelectorAll('.sheet button, .sheet a')].find((b) => /Sections/.test(b.textContent) && /‹/.test(b.textContent));
        if (!back) return;
        if (rail) back.remove();
        else { back.style.minHeight = '44px'; back.style.minWidth = '44px'; back.style.display = 'inline-flex'; back.style.alignItems = 'center'; }
        const close = [...document.querySelectorAll('.sheet button')].find((b) => b.textContent.trim() === 'Close');
        if (close) { close.style.minHeight = '44px'; close.style.minWidth = '64px'; }
      }, rail);
      await page.waitForTimeout(300);
    }
    const tag = `${mode}__sheet-header__Wanda-sample__${w}`;
    await page.screenshot({ path: path.join(OUT, `${tag}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(page.viewportSize().height, 420) } });
    report[tag] = { rail: !!rail, ...(await page.evaluate(() => {
      const hits = [...document.querySelectorAll('.sheet button, .sheet a')].filter((b) => /^(‹ Sections|Close)$/.test(b.textContent.trim())).map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()} ${Math.round(r.width)}×${Math.round(r.height)}`; });
      return { headerControls: hits };
    })) };
    await ctx.close();
  }
}
await browser.close();
{ const f = path.join(OUT, 'measure.json'); let prev = {}; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} fs.writeFileSync(f, JSON.stringify({ ...prev, ...report }, null, 2)); }
console.log(JSON.stringify(report, null, 1));
