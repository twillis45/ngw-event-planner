// RENDER TOOL, NOT A TEST (cohesion batch G, 11/24/2026). Never merges.
// The small sheets whose LAYOUT changes in batch G, on the built-in Wanda
// sample (clock Tue, Nov 24, 2026 10:00), light, dsf 2, at 390, 834, 1024 and
// 1440: Messages, Where everyone stays, What could go wrong, You & settings,
// Make it yours, Venue and Ask No Guesswork. Before is the live e2e build;
// proposed is the same sheet with the change applied to its DOM in the app's
// own classes (.brow, .f-name, .grounding, .mini, .of, .field, .done-fold,
// .shelf-label). The rest of batch G is wording only: see README.md's table.
// It also records one local fact for the README: what the Venue box saves when
// she types a bare "City, ST" (localStorage only; every non-GET is aborted).
// Run: node renders/cohesion-g/render.mjs   (vite preview on RENDER_PORT, default 7411)
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, openSection, fullShot, measure, outDir } from '../_tools/lib.mjs';

const OUT = outDir('g');
const CLOCK = '2026-11-24T10:00:00';
const WIDTHS = (process.env.WIDTHS || '390,834,1024,1440').split(',').map(Number);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SEED = { eventId: 'ev-x-wanda' };

const SHEETS = [
  {
    key: 'messages', door: 'Messages', full: false,
    // #27: "Below is only what this device recorded." with nothing below.
    propose: () => {
      const sh = document.querySelector('.sheet .sheet-body');
      const head = sh.querySelector('.sheet-head');
      [...sh.children].forEach((c) => { if (c !== head) c.remove(); });
      sh.insertAdjacentHTML('beforeend', `
        <div style="padding:2px 0 14px"><span class="of">Sent from this plan</span>
          <div style="font-size:44px;font-weight:750;letter-spacing:-.03em;line-height:1.08;color:var(--ink);margin-top:6px">Nothing yet</div>
          <p style="margin:14px 0 0;font-family:var(--serif-read);font-style:italic;font-size:var(--t-input);color:var(--ink-soft)">When you send the invite, a nudge or an update, it’s listed here: what went out, to whom, and when.</p></div>
        <div class="brow"><div class="f-name">Email history</div>
          <p class="grounding" style="margin:2px 0 0">Couldn’t reach it just now. Check your connection and reopen this. Anything sent from this device still shows here.</p></div>`);
    },
  },
  {
    key: 'where-everyone-stays', door: 'Travel & where everyone stays', full: false,
    // #28: link-blue names that go nowhere, the address said twice, nothing to do. #58: door ≠ title.
    // Stays are event.lodging rows ({ who, address, notes }); each opens in place to edit.
    propose: () => {
      const title = document.getElementById('sheet-title'); if (title) title.textContent = 'Travel & where everyone stays';
      const place = document.querySelector('.sheet .stay-place');
      const nameEl = place.querySelector('.stay-place-name');
      const one = document.querySelectorAll('.sheet .stay-place').length === 1;
      if (one && nameEl) nameEl.remove();
      for (const p of place.querySelectorAll('.stay-row')) {
        const who = p.querySelector('b').textContent.trim();
        const rest = p.textContent.replace(who, '').replace(/^\s*—\s*/, '').trim();
        const b = document.createElement('button');
        b.className = 'frow';
        b.style.cssText = 'display:flex;width:100%;align-items:flex-start;gap:8px;text-align:left;min-height:48px;background:none;border:0;border-top:1px solid var(--line-soft);padding:12px 0;color:inherit;font:inherit;cursor:pointer';
        b.innerHTML = `<span class="f-main" style="flex:1;min-width:0;display:block"><span class="f-name" style="display:block;color:var(--ink)">${who}</span><span class="v-meta" style="display:block;white-space:normal;margin-top:2px">${rest}</span></span><span class="chev" aria-hidden="true" style="color:var(--faint)">▸</span>`;
        p.replaceWith(b);
      }
      place.insertAdjacentHTML('beforeend', '<div style="margin:12px 0 0"><button class="mini">Add a stay</button></div><p class="grounding" style="margin:8px 0 0">Tap a stay to change who, where or the note.</p>');
    },
  },
  {
    key: 'what-could-go-wrong', door: 'What could go wrong', full: true,
    // #26: two equal buttons whose first one changes name card to card; #25/#60 wording.
    propose: () => {
      const body = document.querySelector('.sheet .sheet-body');
      const cards = [...body.querySelectorAll(':scope > .brow')];
      const groups = { 'Worth planning now': [], 'Keep an eye on it': [], Minor: [] };
      for (const c of cards) {
        const tag = c.querySelector('.tag'); const g = tag ? tag.textContent.trim() : 'Keep an eye on it';
        (groups[g] || groups['Keep an eye on it']).push(c);
        if (tag) tag.remove();
        const btns = c.querySelectorAll('.actions-row .mini');
        if (btns[0]) {
          // Where the risk routes (riskRouteFor), the button says so with ›;
          // where it doesn't, it records a checklist step. Same slot, same order.
          if (/Plan for this/.test(btns[0].textContent)) {
            btns[0].textContent = 'Plan for this ›';
          } else btns[0].textContent = 'Add it to my checklist';
        }
        if (btns[1]) btns[1].textContent = 'I’ve covered this';
      }
      // #25: the consultant line, in her words
      const f = cards[0] && cards[0].querySelector('.f-name');
      if (f && /formality will diverge/.test(f.textContent)) f.firstChild.textContent = 'Guests may not know if this is a formal ceremony or a party. ';
      const g0 = cards[0] && cards[0].querySelector('.grounding');
      if (g0 && /cascades/.test(g0.textContent)) g0.textContent = 'Say which it is on the invite: the dress, and when the ceremony part starts.';
      // #60: quantities say where they come from
      for (const p of body.querySelectorAll('.brow .grounding')) {
        if (/1\.5 lb ice\/guest/.test(p.textContent)) p.innerHTML = p.innerHTML.replace('Buy ~1.5 lb ice/guest day-of', 'Buy about 1.5 lb of ice a guest (est., your playbook) the day of');
        if (/1-1\.25 servings\/guest/.test(p.textContent)) p.innerHTML = p.innerHTML.replace('Plan ~1-1.25 servings/guest (buffet ~0.5 lb protein/guest)', 'Plan 1 to 1¼ servings a guest, about ½ lb of protein each at a buffet (est., your playbook)');
      }
      const anchor = cards[0];
      const holder = document.createElement('div'); anchor.before(holder);
      for (const [name, list] of Object.entries(groups)) {
        if (!list.length) continue;
        const open = name === 'Worth planning now';
        const h = document.createElement(open ? 'div' : 'button');
        if (open) {
          h.className = 'shelf-label'; h.style.cssText = 'display:flex;justify-content:space-between;margin:6px 0 4px';
          h.innerHTML = `<span>${name}</span><span style="text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted)">${list.length}</span>`;
          holder.append(h); list.forEach((c) => holder.append(c));
        } else {
          h.className = 'later-row'; h.type = 'button';
          h.style.cssText = 'width:100%;display:flex;justify-content:space-between;align-items:center;min-height:48px;background:none;border:0;border-top:1px solid var(--line);padding:10px 0;color:inherit;font:inherit;cursor:pointer;text-align:left';
          h.innerHTML = `<span><span class="shelf-label" style="display:block;margin:0;border:0;padding:0">${name}</span><span class="v-meta" style="display:block;margin-top:2px">${list.length} to know about</span></span><span class="chev" aria-hidden="true" style="color:var(--faint)">▸</span>`;
          holder.append(h); list.forEach((c) => c.remove());
        }
      }
    },
  },
  {
    key: 'you-and-settings', door: 'You & settings', full: true,
    // #41: name and area labeled only by a placeholder; #50: "On — tap to mute".
    propose: () => {
      const sh = document.querySelector('.sheet');
      const labelize = (input, text) => {
        const lab = document.createElement('label');
        lab.style.cssText = 'display:block;margin:0 0 10px;flex:1;min-width:0';
        lab.innerHTML = `<span class="of" style="display:block;margin:0 0 4px">${text}</span>`;
        input.replaceWith(lab); lab.append(input);
        input.style.width = '100%'; input.style.maxWidth = 'none'; input.style.boxSizing = 'border-box';
      };
      const name = sh.querySelector('input[aria-label="Your name"]');
      if (name) { name.placeholder = 'For example: Rosa Delgado'; labelize(name, 'Your name — it signs the notes we draft for you'); }
      const area = sh.querySelector('input[aria-label="Your area"]');
      if (area) { area.placeholder = 'For example: Springfield, VA'; labelize(area, 'Your town or city'); }
      for (const e of sh.querySelectorAll('*')) {
        if (e.children.length) continue;
        const t = e.textContent.trim();
        if (t === 'On — tap to mute') e.textContent = 'On';
        if (t === 'On — tap for dark') e.textContent = 'On';
        if (t === 'On — tap to turn off') e.textContent = 'On';
        if (t === 'Nothing remembered yet') e.textContent = 'Your setup';
        if (/^Tell it how you host and it stops asking twice/.test(t)) e.textContent = 'How you host, your area and your data. Nothing is guessed about you.';
        if (/^Everything lives on this device\. Accounts turn on/.test(t)) e.textContent = 'Your plans are saved on this device only.';
      }
    },
  },
  {
    key: 'make-it-yours', door: 'Make it yours', full: true,
    // Eight fields whose label is a <div>, not a <label>, and whose placeholder
    // reads like an answer; #52's "brief".
    propose: () => {
      const sh = document.querySelector('.sheet');
      for (const e of sh.querySelectorAll('p')) if (/^The day-before brief, the run of show/.test(e.textContent.trim())) e.textContent = 'Your words go into the run of show, the toast and the note we draft the day before. Nothing here is required.';
      for (const f of sh.querySelectorAll('input:not([type]), input[type=text], textarea')) {
        if (!f.placeholder) continue;
        if (!/^(For example|e\.g\.)/i.test(f.placeholder)) f.placeholder = 'For example: ' + f.placeholder.replace(/^Todd — or “Todd & Sarah”$/, 'Rosa — or “Rosa & Sam”');
        f.classList.add('r-ph-faint');
        // the visible words above it become its <label>
        const al = f.getAttribute('aria-label');
        const vis = al && [...sh.querySelectorAll('div, span, p, strong')].find((e) => e.children.length === 0 && e.textContent.trim() === al);
        if (vis) { f.id = f.id || 'r-f-' + Math.random().toString(36).slice(2, 8); const lab = document.createElement('label'); lab.className = vis.className; lab.style.cssText = vis.style.cssText; lab.style.display = 'block'; lab.textContent = vis.textContent; lab.htmlFor = f.id; vis.replaceWith(lab); }
      }
      const st = document.createElement('style');
      st.textContent = 'html body .sheet input.r-ph-faint::placeholder, html body .sheet textarea.r-ph-faint::placeholder{color:var(--faint)!important;font-weight:400!important;font-style:italic!important;opacity:1}';
      document.head.append(st);
    },
  },
  {
    key: 'venue', door: 'Venue', full: false,
    // One field labeled only by its placeholder.
    propose: () => {
      const f = document.querySelector('.sheet input[aria-label="Venue"]');
      f.placeholder = 'For example: Elm Court Hall, or 42 Elm Ct';
      const row = f.parentElement;
      const lab = document.createElement('label');
      lab.className = 'of'; lab.style.cssText = 'display:block;margin:10px 0 0';
      lab.textContent = 'The place’s name or street address';
      f.id = 'r-venue'; lab.htmlFor = 'r-venue';
      row.before(lab);
      row.style.marginTop = '4px';
    },
  },
  {
    key: 'ask', door: 'Ask No Guesswork', full: false,
    propose: () => {
      const f = document.querySelector('.sheet input[aria-label="Ask a question about your plan"]');
      f.placeholder = 'For example: will $2,000 cover it?';
      const row = f.parentElement;
      const lab = document.createElement('label');
      lab.className = 'of'; lab.style.cssText = 'display:block;margin:10px 0 4px';
      lab.textContent = 'Your question';
      f.id = 'r-ask'; lab.htmlFor = 'r-ask';
      row.before(lab);
    },
  },
];

const browser = await launch();
const report = {};
for (const s of SHEETS) {
  if (ONLY && !ONLY.includes(s.key)) continue;
  for (const w of WIDTHS) {
    for (const mode of ['before', 'proposed']) {
      const { ctx, page } = await open(browser, w, SEED, { clock: CLOCK });
      await openSection(page, s.door);
      if (mode === 'proposed') { await page.evaluate(s.propose); await page.waitForTimeout(400); }
      const tag = `${mode}__${s.key}__Wanda-sample__${w}`;
      await page.screenshot({ path: path.join(OUT, `${tag}${s.full ? '__screen' : ''}.png`) });
      report[tag] = {
        ...(await measure(page, '.sheet', { touch: w !== 1440 })),
        unlabeledFields: await page.evaluate(() => [...document.querySelectorAll('.sheet input:not([type=hidden]):not([type=file]), .sheet textarea')].filter((f) => !f.closest('label') && !(f.id && document.querySelector(`label[for="${f.id}"]`))).map((f) => f.getAttribute('aria-label') || f.placeholder)),
      };
      if (s.full) await fullShot(page, path.join(OUT, `${tag}.png`), { contentSel: '.sheet .sheet-head' });
      await ctx.close();
    }
  }
}

// The Venue box, typed "Springfield, VA" on a made-up plan with no venue:
// what lands in the plan (read back from localStorage). Local only.
if (!ONLY || ONLY.includes('venue-city')) {
  const EVENT = { id: 'render-g', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', createdAt: '2026-11-01', date: '2027-01-16', startTime: '18:00', guestMode: 'count', guestEstimate: 20, guests: [], vendors: [], budget: [], timeline: [] };
  const { ctx, page } = await open(browser, 390, { event: EVENT }, { clock: CLOCK });
  await openSection(page, 'Venue');
  const f = page.locator('.sheet input[aria-label="Venue"]');
  await f.fill('Springfield, VA');
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('.sheet button', { hasText: /^Save$/ }).first().click();
  await page.waitForTimeout(800);
  report['venue-city-typed'] = await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {};
    return { typed: 'Springfield, VA', venue: e.venue, venueName: e.venueName, venueCity: e.venueCity, venueState: e.venueState, venueAddress: e.venueAddress, venueKind: e.venueKind };
  });
  await page.screenshot({ path: path.join(OUT, 'before__venue-city-typed__own-plan__390.png') });
  await ctx.close();
}
await browser.close();
{ const f = path.join(OUT, 'measure.json'); let prev = {}; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} fs.writeFileSync(f, JSON.stringify({ ...prev, ...report }, null, 2)); }
console.log(JSON.stringify(report, null, 1));
