// RENDER TOOL, NOT A TEST (cohesion batch B, 11/24/2026). Env-guarded.
// Draws the vendor detail as it is now ("before") and as proposed ("after")
// at 390, 834, 1024 and 1440, dsf 2, on a made-up plan. The "after" is the
// real app with the opened card's body swapped for the proposed markup, built
// from the app's own classes, so the sheet, rail and widths around it are real.
// Nothing here changes the app.
import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { previewUrl } from '../deployBase.mjs';

const OUT = process.env.RENDER_OUT;
// (built mode: renders the card as it now ships)
const iso = (days) => { const d = new Date('2026-12-01T10:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const EVENT = {
  id: 'render-b', name: 'Jordan’s Retirement Party', type: 'Retirement Party', createdAt: '2026-11-01',
  date: iso(45), startTime: '17:00', startTimeSource: 'host', venue: 'Elm Court Hall',
  venueAddress: '42 Elm Ct, Springfield, VA 22150', guestMode: 'count', guestEstimate: 60, guestCountSource: 'host',
  guests: [], budget: [], timeline: [],
  vendors: [
    { id: 'v1', name: 'Elm Court Catering', category: 'Catering', status: 'Quoted', cost: 1500, phone: '(555) 010-0142',
      email: 'events@elmcourtcatering.example', contactName: 'Dana Cole', arrivalTime: '15:30',
      briefNote: 'Load in through the side door on Elm Ct.' },
    { id: 'v2', name: 'Springfield Sound DJ', category: 'DJ', status: 'Deposit Paid', cost: 600, depositPaid: true, depositAmt: 200,
      phone: '(555) 010-0177', arrivalTime: '16:00' },
    { id: 'v3', name: 'Maple Street Rentals', category: 'Rentals', status: 'Considering' },
    { id: 'h1', name: 'Cousin Dana — folding tables', category: 'Rentals', isInformal: true, phone: '(555) 010-0199' },
  ],
};
const SIZES = [
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: '834', viewport: { width: 834, height: 1194 }, hasTouch: true },
  { name: '1024', viewport: { width: 1024, height: 1366 }, hasTouch: true },
  { name: '1440', viewport: { width: 1440, height: 900 } },
];

// The proposed opened vendor, in the app's classes. One lit action, labeled
// groups, the name editable at the top, contact as tel:/sms:/mailto: links,
// Remove alone at the bottom naming what it removes.
const proposed = (v) => {
  const dig = (v.phone || '').replace(/[^+\d]/g, '');
  const group = (label, state, body) => `
    <div class="vd-group" style="margin:0 0 18px">
      <div class="shelf-label" style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <span>${label}</span>${state ? `<span style="text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted)">${state}</span>` : ''}
      </div>${body}</div>`;
  const field = (label, value, attrs = '') => `
    <label style="display:block;margin:0 0 10px"><span class="of" style="display:block;margin:0 0 4px">${label}</span>
      <input class="field" style="width:100%;max-width:none;box-sizing:border-box;font-size:var(--t-input)" value="${value || ''}" ${attrs}></label>`;
  const pills = ['Deciding', 'Got a price', 'Deposit paid', 'Agreed', 'Locked in'].map((s) => {
    const cur = s === 'Got a price';
    return `<button class="vc-pill" style="min-height:var(--tap-min);display:inline-flex;align-items:center;${cur ? 'color:var(--steel-soft);background:var(--steel-tint);' : ''}" aria-pressed="${cur}">${s}</button>`;
  }).join('');
  return `
  <div data-proposed style="padding-top:6px">
    ${group('Who they are', '', `
      ${field('Name', v.name)}
      ${field('What they do', v.category)}
      <button class="chip" aria-pressed="false" style="margin:0 0 4px">Friend or family helping — not hired</button>`)}
    ${group('Where it stands', 'Got a price', `
      <div class="vc-statuspick" role="group" style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px">${pills}</div>
      <p class="grounding" style="margin:0;color:var(--ink)">Got a price — your call to book them or pass.</p>`)}
    ${group('Reach them', 'No record of reaching out yet', `
      ${field('Phone', v.phone, 'type="tel"')}
      ${field('Email', v.email, 'type="email"')}
      ${field('Your contact there', v.contactName)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 8px">
        <a class="mini" href="tel:${dig}">Call</a><a class="mini" href="sms:${dig}">Text</a>${v.email ? `<a class="mini" href="mailto:${v.email}">Email</a>` : ''}
        <button class="mini">I reached out</button>
      </div>
      <p class="grounding" style="margin:0">Call, Text and Email open your phone’s own apps. Nothing is sent from here.</p>`)}
    ${group('The day', 'Arrives 3:30 PM', `
      ${field('Arrives', v.arrivalTime, 'type="time"')}
      <label style="display:block;margin:0 0 10px"><span class="of" style="display:block;margin:0 0 4px">A note for them, sent with the details</span>
        <textarea class="field" rows="2" style="width:100%;max-width:none;box-sizing:border-box;font-size:var(--t-input)">${v.briefNote || ''}</textarea></label>
      <button class="chip vendor-surprise" aria-pressed="false">Is this a surprise?</button>`)}
    ${group('Money', 'Nothing paid or due on file yet', `
      ${field('Agreed to pay', '$1,500', 'inputmode="decimal"')}
      ${field('Balance due', '', 'type="date"')}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="chip" aria-pressed="false">Mark deposit paid</button><button class="chip" aria-pressed="false">Mark paid in full</button><button class="mini">Draft a payment note</button></div>`)}
    ${group('Paperwork', 'Insurance still needed', `
      <div class="fstat-list" style="margin:0">
        <div class="fstat"><span class="fstat-l">Insurance</span><button class="mini">Mark asked</button></div>
        <div class="fstat"><span class="fstat-l">Signed contract</span><button class="mini">Attach file</button></div>
        <div class="fstat"><span class="fstat-l">Final guest count · due Mar 13</span><button class="mini">Mark done</button></div>
        <div class="fstat"><span class="fstat-l">Final menu · due Mar 6</span><button class="mini">Mark done</button></div>
      </div>
      <p class="vc-detail" style="margin:6px 0 0">+5 more open — the details you send them list the rest.</p>`)}
    ${group('What they said', '', `
      <button class="mini">Paste their email or text</button>`)}
    <div style="margin:4px 0 18px">
      <button class="cta" style="width:100%">Send ${v.name} the details</button>
      <p class="grounding" style="margin:8px 0 0;text-align:center">You read it first, then send it from your phone. <button class="mini" style="display:inline-flex">Draft a note instead</button></p>
    </div>
    <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:6px">
      <button class="mini" style="width:100%;color:var(--danger-text, var(--danger))">Remove ${v.name} from this event</button>
      <p class="grounding" style="margin:6px 0 0;text-align:center">Their status, money and notes go with them. Undo for a few seconds after.</p>
    </div>
  </div>`;
};

test.describe('cohesion batch B renders', () => {
  test.skip(!OUT, 'render tool: set RENDER_OUT');
  test('vendor detail, before and after', async () => {
    test.setTimeout(240_000);
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
    for (const size of SIZES) {
      for (const mode of ['built']) {
        const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2, isMobile: !!size.isMobile, hasTouch: !!size.hasTouch, baseURL: previewUrl(5233) });
        const page = await ctx.newPage();
        await page.clock.setFixedTime(new Date('2026-12-01T10:00:00'));
        await page.addInitScript((e) => {
          if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
          localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
          localStorage.setItem('ngw-hostv2-last-event', e.id);
          localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
          localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
        }, EVENT);
        await page.route('**/*', (r) => (r.request().method() === 'GET' ? r.fallback() : r.abort()));
        await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
        await page.goto('?elegant=1');
        await page.waitForFunction(() => (document.querySelector('.app')?.innerText || '').length > 120, null, { timeout: 30_000 });
        await page.waitForTimeout(1200);
        // the sections door for this width
        if (await page.locator('.srail-row').count()) await page.locator('.srail-row', { hasText: 'People you’re hiring' }).first().click();
        else if (await page.locator('[data-tt-bar]').count()) {
          await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click();
          await page.locator('.sheet').last().locator('[data-door]', { hasText: 'People you’re hiring' }).first().click();
        } else {
          await page.locator('.ev-eyebrow').first().click();
          await page.locator('.sheet').last().getByText('Jump to a section').first().click();
          await page.locator('.sheet').last().getByText('People you’re hiring').first().click();
        }
        await page.waitForTimeout(1200);
        if (mode !== 'list') {
          const card = page.locator('.sheet .vcard[data-vid="v1"]');
          await card.locator('.vc-name').click();
          await expect(card).toHaveClass(/\bopen\b/);
          if (mode === 'built') { /* the shipped card, untouched */ } else {
            await page.evaluate((html) => {
              const c = document.querySelector('.sheet .vcard[data-vid="v1"]');
              const more = c.querySelector(':scope > .vc-more');
              more.innerHTML = html;
              more.style.maxHeight = 'none'; more.style.opacity = '1';
              const head = c.querySelector(':scope > .vc-head');
              head.style.position = 'sticky'; head.style.top = '0'; head.style.zIndex = '2'; head.style.background = 'inherit';
            }, proposed(EVENT.vendors[0]));
          }
          await page.waitForTimeout(700);
          await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
          await page.waitForTimeout(400);
          // the sheet as she sees it, then the whole card at full length: the
          // window grows to the card's height so the sheet's scroller clips nothing
          await page.screenshot({ path: path.join(OUT, `vendor-detail-${mode}-screen__${size.name}.png`) });
          const h = await card.evaluate((el) => el.scrollHeight);
          await page.setViewportSize({ width: size.viewport.width, height: Math.max(size.viewport.height, h + 360) });
          await page.waitForTimeout(600);
          await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
          await page.waitForTimeout(300);
          await card.screenshot({ path: path.join(OUT, `vendor-detail-${mode}__${size.name}.png`) });
        } else {
          await page.screenshot({ path: path.join(OUT, `vendor-list-now__${size.name}.png`) });
        }
        await ctx.close();
      }
    }
    await browser.close();
  });
});
