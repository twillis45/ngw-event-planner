// RENDER TOOL, NOT A TEST (cohesion batch D, 11/24/2026). Never merges.
// "Your checklist" on the built-in Wanda sample, before and proposed, at 390,
// 834, 1024 and 1440, dsf 2, light. Clock fixed at Tue, Nov 24, 2026 10:00.
// The proposed sheet is the real app with the checklist's rows swapped for
// proposed markup built from the app's own classes (.frow, .fcheck, .f-name,
// .v-meta, .shelf-label, .done-fold, .later-row, .cta, .mini). The rows' words,
// dates, owners and actions are read from the live rows, not typed here.
// Run: node renders/cohesion-d/render.mjs   (vite preview on RENDER_PORT, default 7411)
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, openSection, fullShot, measure, outDir } from '../_tools/lib.mjs';

const OUT = outDir('d');
const CLOCK = '2026-11-24T10:00:00';
const WIDTHS = (process.env.WIDTHS || '390,834,1024,1440').split(',').map(Number);

// Read the live rows: lead, tags, detail, meta (due · owner) and the row's own
// action labels, in DOM order. Done steps are counted from the hero.
const readRows = () => {
  const sh = document.querySelector('.sheet');
  const rows = [...sh.querySelectorAll('button.frow')].filter((b) => !b.closest('[data-done-fold], .done-list'));
  return rows.map((b) => {
    const name = b.querySelector('.f-name');
    const lead = [...name.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const tags = [...name.querySelectorAll('.tag')].map((t) => t.textContent.trim());
    const metas = [...b.querySelectorAll(':scope > .f-main > .v-meta')].map((m) => m.textContent.trim());
    const meta = metas.pop() || '';
    const detail = metas.join(' ');
    const nxt = b.nextElementSibling && b.nextElementSibling.classList.contains('row-assign') ? b.nextElementSibling : null;
    const acts = nxt ? [...nxt.querySelectorAll('button, a')].map((x) => x.textContent.trim()) : [];
    return { lead, tags, detail, meta, acts };
  });
};

// When is each step due, as a date: "in 88 days", "Week of Feb 22", "1 month out".
const EVENT_DAY = new Date('2027-03-20T12:00:00');
const TODAY = new Date(CLOCK);
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const dueOf = (meta) => {
  let m = /in (\d+) days?/.exec(meta);
  if (m) { const d = new Date(TODAY); d.setDate(d.getDate() + Number(m[1])); return d; }
  m = /Week of (\w{3}) (\d+)/.exec(meta);
  if (m) return new Date(2027, MON[m[1]], Number(m[2]), 12);
  m = /(\d+) months? out/.exec(meta);
  if (m) { const d = new Date(EVENT_DAY); d.setMonth(d.getMonth() - Number(m[1])); return d; }
  m = /(\d+) weeks? out/.exec(meta);
  if (m) { const d = new Date(EVENT_DAY); d.setDate(d.getDate() - 7 * Number(m[1])); return d; }
  if (/today/.test(meta)) return TODAY;
  return EVENT_DAY;
};
const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
// The phases, in her words, each with its dates said once.
const PHASES = [
  { key: 'feb', label: 'By the end of February', until: new Date('2027-02-28T23:59') },
  { key: 'mar', label: 'Early March · Mar 1–13', until: new Date('2027-03-13T23:59') },
  { key: 'wk', label: 'The last week · Mar 14–19', until: new Date('2027-03-19T23:59') },
  { key: 'day', label: 'On the day · Sat, Mar 20', until: new Date('2027-03-20T23:59') },
  { key: 'after', label: 'After the party', until: new Date('2099-01-01') },
];
const HOST_FIRST = 'Wanda';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ownerOf = (meta) => { const p = meta.split(' · '); return p.length > 1 ? p[p.length - 1] : ''; };

function build(rows, { allOpen = false, doneN = 2 } = {}) {
  const steps = rows.map((r, i) => {
    const due = dueOf(r.meta);
    const owner = ownerOf(r.meta);
    const route = r.acts.find((a) => /→$/.test(a));
    return { ...r, i, due, owner, route: route ? route.replace(/\s*→$/, '') : null, inferred: r.tags.some((t) => /done by your plan/.test(t)) };
  }).sort((a, b) => a.due - b.due || a.i - b.i);
  const open = steps.filter((s) => !s.inferred);
  const next = open[0];
  const whoText = (s) => (!s.owner ? '' : s.owner === HOST_FIRST ? 'Yours' : s.owner);
  const dueText = (s) => {
    const m = /(\d+ days past its window|due today|in \d+ days)/.exec(s.meta);
    return fmt(s.due) + (m && /past|today/.test(m[1]) ? ` · ${m[1]}` : '');
  };
  // A closed row: the check (its own 44px target) and the row body, which
  // opens the step in place. No other buttons until it is open.
  const row = (s, opened) => `
    <div class="r-step${opened ? ' r-open' : ''}" style="display:flex;align-items:flex-start;gap:4px;border-bottom:${opened ? '0' : '1px solid var(--line)'}">
      <button class="r-ck" aria-label="Check off ${esc(s.lead)}" style="flex:none;width:44px;height:48px;display:grid;place-items:center;background:none;border:0;padding:0;cursor:pointer">
        <span class="fcheck" aria-hidden="true" style="position:static;margin:0"></span></button>
      <button class="r-body" aria-expanded="${opened}" style="flex:1;min-width:0;min-height:48px;text-align:left;background:none;border:0;padding:12px 0;cursor:pointer;display:flex;gap:8px;align-items:flex-start;color:inherit;font:inherit">
        <span class="f-main" style="flex:1;min-width:0;display:block">
          <span class="f-name" style="display:block">${esc(s.lead)}${s.inferred ? ' <span class="tag plan" style="color:var(--ok);background:var(--ok-tint)">your plan did this · confirm</span>' : ''}</span>
          <span class="v-meta" style="display:block;margin-top:3px">${esc([dueText(s), whoText(s)].filter(Boolean).join(' · '))}</span>
        </span>
        <span class="fg-chev" aria-hidden="true" style="flex:none;color:var(--faint);transform:${opened ? 'rotate(90deg)' : 'none'};margin-top:2px">▸</span>
      </button>
    </div>
    ${opened ? openBody(s) : ''}`;
  // One step, opened in place: labeled groups; its route is the step's one
  // action; hand-off and the check sit under it.
  const openBody = (s) => {
    const own = s.owner === HOST_FIRST || !s.owner;
    return `
    <div class="r-detail" style="margin:0 0 0 44px;padding:12px 14px 14px;border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--ink) 4%, transparent);border-radius:0 0 12px 12px">
      ${s.detail ? `<p class="grounding" style="margin:0 0 12px;color:var(--ink)">${esc(s.detail)}</p>` : ''}
      <div class="of" style="margin:0 0 4px">Who has it</div>
      <p class="v-meta" style="margin:0 0 10px;white-space:normal">${own ? 'You. Nobody else is on this yet.' : `${esc(s.owner)} · not told yet`}</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${s.route ? `<button class="mini">${esc(s.route)} →</button>` : ''}
        <button class="mini">${own ? 'Give this to someone' : 'Change who has it'}</button>
        ${own ? '' : `<button class="mini">Send ${esc(s.owner.split(' ')[0])} their job</button>`}
        <button class="mini">Check it off</button>
      </div>
    </div>`;
  };
  const up = next ? `
    <div class="r-next" style="margin:4px 0 22px">
      <div class="sect" style="display:flex;align-items:baseline;gap:10px;margin:0 0 10px"><h2 style="margin:0">Up next</h2><div class="rule" style="flex:1"></div><span class="when">${esc(fmt(next.due))}</span></div>
      <div class="card" style="padding:16px 16px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card, var(--surface))">
        <div class="f-name" style="display:block;font-size:17px;line-height:1.3">${esc(next.lead)}</div>
        ${next.detail ? `<p class="v-meta" style="margin:6px 0 0;white-space:normal">${esc(next.detail)}</p>` : ''}
        <p class="v-meta" style="margin:6px 0 12px">${esc(whoText(next) ? `Who has it: ${whoText(next)}` : 'Nobody has this yet')}</p>
        <button class="cta" style="width:100%">${esc(next.route || 'Check it off')}</button>
        <div style="display:flex;justify-content:center;gap:8px;margin-top:8px">
          ${next.route ? '<button class="mini">Check it off</button>' : ''}<button class="mini">Give this to someone</button>
        </div>
      </div>
    </div>` : '';
  const rest = steps.filter((s) => s !== next);
  let firstOpenDone = false;
  const groups = PHASES.map((ph, gi) => {
    const lo = gi ? PHASES[gi - 1].until : new Date(0);
    const mem = rest.filter((s) => s.due > lo && s.due <= ph.until);
    if (!mem.length) return '';
    const openNow = allOpen || gi === 0 || (!firstOpenDone && gi <= 1);
    if (gi <= 1) firstOpenDone = true;
    if (!openNow) {
      return `
      <button class="later-row r-fold" aria-expanded="false" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;background:none;border:0;border-bottom:1px solid var(--line);padding:10px 0;cursor:pointer;text-align:left;color:inherit;font:inherit">
        <span><span class="shelf-label" style="display:block;margin:0;border:0;padding:0">${esc(ph.label)}</span><span class="v-meta" style="display:block;margin-top:2px">${mem.length} step${mem.length === 1 ? '' : 's'}${mem.some((m) => m.owner && m.owner !== HOST_FIRST) ? ` · ${mem.filter((m) => m.owner && m.owner !== HOST_FIRST).length} handed off` : ''}</span></span>
        <span class="chev" aria-hidden="true" style="color:var(--faint)">▸</span>
      </button>`;
    }
    return `
      <div class="r-group" style="margin:0 0 18px">
        <div class="shelf-label" style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin:0 0 2px">
          <span>${esc(ph.label)}</span><span style="text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted)">${mem.length} left</span></div>
        ${mem.map((s, k) => row(s, !allOpen && gi === 0 && k === 1)).join('')}
      </div>`;
  }).join('');
  const done = `
    <button type="button" class="done-fold" data-done-fold aria-expanded="false" style="margin-top:14px">
      <span class="done-ck" aria-hidden="true">✓</span><span class="done-tx">${doneN} checked off</span><span class="fg-chev" aria-hidden="true">›</span>
    </button>`;
  return `<div data-proposed>${up}${groups}${done}</div>`;
}

const browser = await launch();
const report = {};
for (const w of WIDTHS) {
  for (const mode of ['before', 'proposed', 'proposed-all-groups-open']) {
    if (mode === 'proposed-all-groups-open' && w !== 390) continue;
    const { ctx, page } = await open(browser, w, { eventId: 'ev-x-wanda' }, { clock: CLOCK });
    await openSection(page, 'Your checklist');
    if (mode !== 'before') {
      const rows = await page.evaluate(readRows);
      const html = build(rows, { allOpen: mode === 'proposed-all-groups-open' });
      await page.evaluate((h) => {
        const sh = document.querySelector('.sheet');
        // every row, its action line, the dinner group and the done fold go;
        // the proposal takes the first row's place. The hero stays.
        const first = sh.querySelector('button.frow');
        const holder = document.createElement('div'); holder.innerHTML = h;
        first.parentElement.insertBefore(holder, first);
        sh.querySelectorAll('button.frow, .row-assign, [data-done-fold], [data-done-all], .dinner-steps').forEach((el) => { if (!holder.contains(el)) el.remove(); });
      }, html);
      await page.waitForTimeout(500);
    }
    const tag = `${mode}__checklist__Wanda-sample__${w}`;
    await page.screenshot({ path: path.join(OUT, `${tag}__screen.png`) });
    report[tag] = { ...(await measure(page, '.sheet', { touch: w !== 1440 })), buttons: await page.evaluate(() => document.querySelector('.sheet').querySelectorAll('button, a[href]').length), lit: await page.evaluate(() => [...document.querySelector('.sheet').querySelectorAll('.cta')].filter((b) => b.offsetParent).length) };
    await fullShot(page, path.join(OUT, `${tag}.png`), { contentSel: '.sheet .frow, .sheet [data-proposed]' });
    report[tag].fullHeight = await page.evaluate(() => document.querySelector('[data-r-scroller]')?.scrollHeight || null);
    await ctx.close();
  }
}
await browser.close();
{ const f = path.join(OUT, 'measure.json'); let prev = {}; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} fs.writeFileSync(f, JSON.stringify({ ...prev, ...report }, null, 2)); }
console.log(JSON.stringify(report, null, 1));
