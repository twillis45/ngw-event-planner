// RENDER TOOL, NOT A TEST (cohesion batch E, 11/24/2026). Never merges.
// The After stage on the built-in Wanda sample, two days after the party
// (clock fixed at Mon, Mar 22, 2027 11:00), before and proposed, at 390, 834,
// 1024 and 1440, dsf 2, light. The proposed stage is the real app: the hero
// and the money card stay as they are; everything from "What carries forward"
// down is swapped for proposed markup in the app's own classes (.sect, .card,
// .line, .mini, .cta, .field, .shelf-label, .grounding, .done-fold). Guest
// names and plus-ones are read from the live gift rows.
// Run: node renders/cohesion-e/render.mjs   (vite preview on RENDER_PORT, default 7411)
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, goToStage, fullShot, measure, outDir } from '../_tools/lib.mjs';

const OUT = outDir('e');
const CLOCK = '2027-03-22T11:00:00';
const WIDTHS = (process.env.WIDTHS || '390,834,1024,1440').split(',').map(Number);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const readGuests = () => [...document.querySelectorAll('[data-gift-row]')].map((r) => {
  const nm = r.querySelector('.actions-row > span');
  const plus = nm.querySelector('.of');
  return { name: [...nm.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), plus: plus ? plus.textContent.trim() : '' };
});

// state: 'proposed' (as she lands) | 'preview' (the recap typed, preview open)
function build(guests, state) {
  const RECAP = 'What a night. Thank you all for coming out for Wanda in all black and gold — the slideshow is in the album below.';
  const ALBUM = 'https://photos.example.com/wanda-50th';
  const row = (g, k) => `
    <div class="r-thx" style="border-top:1px solid var(--line-soft);padding:8px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 8px">
      <span style="min-width:0;flex:1 1 150px">${esc(g.name)}${g.plus ? ` <span class="of">${esc(g.plus)}</span>` : ''}</span>
      <span style="display:flex;gap:6px;flex:none;margin-left:auto">
        <button class="mini" aria-pressed="false">Gift received</button>
        <button class="mini" aria-pressed="${k === 0 && state === 'preview'}" ${k === 0 && state === 'preview' ? 'style="color:var(--ok);background:var(--ok-tint)"' : ''}>${k === 0 && state === 'preview' ? '✓ Thanked' : 'Mark thanked'}</button>
      </span>
    </div>`;
  const thanked = state === 'preview' ? 1 : 0;
  const recapBlock = state === 'preview' ? `
      <div class="shelf-label" style="margin:0 0 6px">What guests will see on the invite link</div>
      <div class="card no-hover" style="margin:0 0 10px;padding:16px;border:1px dashed var(--line);background:var(--paper, var(--surface))">
        <div class="of" style="margin:0 0 6px">Preview · nothing is published yet</div>
        <p style="margin:0 0 10px;white-space:pre-wrap">${esc(RECAP)}</p>
        <a class="mini" href="#" style="text-decoration:none;display:inline-flex">See the photos</a>
      </div>
      <p class="grounding" style="margin:0 0 10px">Anyone who opens your invite link sees this, in place of the invitation. You can change it or take it down any time.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="mini" style="font-weight:700">Put it on the invite link</button>
        <button class="mini">Keep editing</button>
      </div>` : `
      <label style="display:block;margin:0 0 10px"><span class="of" style="display:block;margin:0 0 4px">A note to everyone</span>
        <textarea class="field" rows="3" style="width:100%;max-width:none;box-sizing:border-box;font-size:var(--t-input)" placeholder="“What a day. Thank you all for coming.”"></textarea></label>
      <label style="display:block;margin:0 0 10px"><span class="of" style="display:block;margin:0 0 4px">Photo album link</span>
        <input class="field" type="url" style="width:100%;max-width:none;box-sizing:border-box;font-size:var(--t-input)" placeholder="Google Photos, iCloud, a shared drive…"></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="mini">Write it for me</button>
        <button class="mini" disabled aria-disabled="true" style="opacity:.6">Preview what guests see</button>
      </div>
      <p class="grounding" style="margin:8px 0 0">Nothing goes on the invite link until you’ve seen the preview.</p>`;
  return `
  <div data-proposed>
    <div class="sect"><h2>How many came?</h2><div class="rule"></div><span class="when">75 planned</span></div>
    <div class="card no-hover"><div class="card-head" style="cursor:default">
      <label style="display:block"><span class="of" style="display:block;margin:0 0 4px">The final number</span>
        <span class="actions-row" style="align-items:center;display:flex;gap:8px">
          <input class="field" type="number" inputmode="numeric" style="max-width:110px;font-size:var(--t-input)" placeholder="75">
          <span class="of">of 75 planned</span>
          <button class="mini">Record it</button>
        </span></label>
      <p class="grounding" style="margin:6px 0 0">One number, once. Your next plan sizes the food and chairs from it.</p>
    </div></div>

    <div id="after-gifts">
      <div class="sect"><h2>Thank-yous &amp; gifts</h2><div class="rule"></div><span class="when">${thanked} of ${guests.length} thanked</span></div>
      <div class="card no-hover"><div class="card-head" style="cursor:default">
        <button class="cta" style="width:100%;margin:0 0 6px">Write the thank-yous</button>
        <p class="grounding" style="margin:0 0 12px;text-align:center">One at a time. Each note names what they gave. You send it from your phone.</p>
        ${guests.map(row).join('')}
        <p class="grounding" style="margin:10px 0 6px">A gift by mail, or from someone who couldn’t come:</p>
        <div class="actions-row" style="flex-wrap:wrap"><button class="mini">+ SFC Boyd + unit</button></div>
        <div class="line" style="margin-top:10px"><span>Cash and gift cards</span><span class="amt">$0</span></div>
        <p class="grounding" style="margin:8px 0 0">Your record, not a bank. “Mark thanked” only checks them off here; it sends nothing.</p>
      </div></div>
    </div>

    <div class="sect"><h2>The recap for guests</h2><div class="rule"></div><span class="when">${state === 'preview' ? 'not published' : 'not started'}</span></div>
    <div class="card no-hover"><div class="card-head" style="cursor:default">${recapBlock}</div></div>

    <div class="sect"><h2>For next time</h2><div class="rule"></div></div>
    <div class="card no-hover"><div class="card-head" style="cursor:default">
      <label style="display:block"><span class="of" style="display:block;margin:0 0 4px">The one thing you’d tell yourself</span>
        <textarea class="field" rows="2" style="width:100%;max-width:none;box-sizing:border-box;font-size:var(--t-input)" placeholder="Two bags of ice per cooler wasn’t enough — get three"></textarea></label>
      <div style="margin-top:8px"><button class="mini">Save it</button></div>
      <p class="grounding" style="margin:10px 0 0">It comes back the next time you plan a retirement party. Your guest list, vendors and every money line above stay saved with this plan.</p>
    </div></div>
  </div>`;
}

const browser = await launch();
const report = {};
for (const w of WIDTHS) {
  const modes = ['before', 'proposed', ...(w === 390 || w === 1440 ? ['proposed-recap-preview'] : [])];
  for (const mode of modes) {
    const { ctx, page } = await open(browser, w, { eventId: 'ev-x-wanda' }, { clock: CLOCK });
    await goToStage(page, 'After');
    await page.locator('[data-gift-row]').first().waitFor({ timeout: 15_000 });
    if (mode !== 'before') {
      const guests = await page.evaluate(readGuests);
      const html = build(guests, mode === 'proposed' ? 'proposed' : 'preview');
      await page.evaluate((h) => {
        const head = [...document.querySelectorAll('.sect')].find((s) => /What carries forward/.test(s.textContent));
        const sec = head.parentElement;
        let n = head;
        const holder = document.createElement('div'); holder.innerHTML = h;
        sec.insertBefore(holder, head);
        while (n) { const nx = n.nextSibling; n.remove(); n = nx; }
      }, html);
      await page.waitForTimeout(500);
      if (mode === 'proposed-recap-preview') {
        await page.evaluate(() => {
          const r = [...document.querySelectorAll('.sect')].find((s) => /The recap for guests/.test(s.textContent));
          const sc = (function f(el) { while (el && el !== document.body) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; } return document.scrollingElement; })(r);
          sc.scrollTop += r.getBoundingClientRect().top - 80;
        });
        await page.waitForTimeout(400);
      }
    }
    const tag = `${mode}__after__Wanda-sample__${w}`;
    await page.screenshot({ path: path.join(OUT, `${tag}__screen.png`) });
    report[tag] = {
      ...(await measure(page, '.app', { touch: w !== 1440 })),
      lit: await page.evaluate(() => [...document.querySelectorAll('.app .cta')].filter((b) => b.offsetParent && !b.closest('.sheet')).length),
    };
    if (mode !== 'proposed-recap-preview') await fullShot(page, path.join(OUT, `${tag}.png`), { contentSel: '#after-gifts' });
    await ctx.close();
  }
}
await browser.close();
{ const f = path.join(OUT, 'measure.json'); let prev = {}; try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} fs.writeFileSync(f, JSON.stringify({ ...prev, ...report }, null, 2)); }
console.log(JSON.stringify(report, null, 1));
