// ─── PEOPLE · INTERACTION & ACCESSIBILITY PROBE ─────────────────────────────
//
// OWNER §29: *"Do not rely on screenshot QA alone. Exercise the real
// interface."*  §30: *"Do not stop at contrast ratios."*
//
// This is a DIAGNOSTIC, not a gate. It drives the surface the way a host does
// and writes what it finds to `review-artifacts/.../interaction.json`, so the
// report quotes measurements rather than impressions. Invariants that must hold
// forever belong in `thePeopleZoneTellsTheTruth.spec.mjs`, not here — a probe
// that asserts is a gate nobody knew they had.
//
//   PEOPLE_QA=1 PW_CHROMIUM=/opt/pw-browsers/chromium \
//     npx playwright test e2e/_peopleInteractionQA.spec.mjs --project=desktop
import { test, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-10-20_people_art_direction/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.PEOPLE_QA, 'diagnostic — set PEOPLE_QA=1 to run');
test.describe.configure({ timeout: 600_000 });

const dateIn = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

const FIRST = ['Tonya', 'Ray', 'Denise', 'Marcus', 'Pat', 'Joe', 'Alma', 'Curtis', 'Nia', 'Hollis', 'Georgia', 'Dez', 'Imani', 'Bernard', 'Lourdes'];
const LAST = ['Brooks', 'Okafor', 'Hall', 'Reyes', 'Whitfield'];
const roster = (n) => Array.from({ length: n }, (_, i) => {
  const g = {
    id: 'r' + i,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    rsvp: ['Yes', 'Yes', 'Yes', '', '', 'Maybe', 'No'][i % 7],
    group: ['Family', 'Friends', 'Work', 'Neighbors', 'College'][i % 5],
  };
  if (i % 9 === 0) g.plusOne = FIRST[(i + 4) % FIRST.length];
  if (i % 11 === 0) g.kids = 2;
  if (i % 17 === 2) g.needs = 'no stairs';
  if (i % 6 === 0) g.coupleId = 'c' + i;
  if (i % 6 === 1) g.coupleId = 'c' + (i - 1);
  return g;
});

const EV = {
  big: {
    id: 'qa-big', name: "Wanda's 50th", type: 'Birthday', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 12000, budget: [], vendors: [],
    guestMode: 'list', guests: roster(75),
    accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
  },
  estimate: {
    id: 'qa-est', name: 'The Cookout', type: 'Cookout', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 4000, budget: [], vendors: [], guests: [],
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  },
};

const settle = async (page) => {
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) { const cs = getComputedStyle(sp); if (cs.display !== 'none' && parseFloat(cs.opacity) > 0.01) return false; }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(400);
};

const boot = async (page, ev, { w = 390, h = 844, theme = 'dark' } = {}) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    try {
      if (!localStorage.getItem('ngw-hostv2-custom-events')) {
        localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      }
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    } catch (_) { /* private mode */ }
  }, ev);
  await page.goto(`?elegant=1&people=1&theme=${theme}`);
  await settle(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.waitForTimeout(400);
};

const report = {};

test('what the surface actually does', async ({ page }) => {
  // ── 1 · THE HIGHLIGHTED ROW ──────────────────────────────────────────────
  // Every roster capture since the row grammar landed has shown exactly one
  // row sitting on a lighter band, in a different position each time, and no
  // `.rrow` rule exists in the stylesheet. Rather than guess, ask the DOM which
  // rows differ from their neighbours and what put them there.
  await boot(page, EV.big);
  report.rowBands = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.people-roster .rrow')].slice(0, 12);
    return rows.map((r, i) => {
      const grow = r.querySelector('.grow');
      const cs = grow ? getComputedStyle(grow) : null;
      return {
        i,
        name: (r.querySelector('.pr-name') || {}).innerText || '',
        rowClass: r.className,
        growClass: grow ? grow.className : null,
        bg: cs ? cs.backgroundColor : null,
        height: Math.round(r.getBoundingClientRect().height),
        hasFocusWithin: !!r.querySelector(':focus'),
        active: r.contains(document.activeElement),
      };
    });
  });

  // ── 2 · TAP TARGETS on the roster row (UX_03 mobile floor is 44px) ────────
  report.tapTargets = await page.evaluate(() => {
    const out = [];
    const els = [...document.querySelectorAll('.people-roster .rrow button, #guests-invites-anchor button, .people-roster .rtool-lens button')];
    for (const el of els.slice(0, 24)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      out.push({ label: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out.filter((x) => x.h < 44);
  });

  // ── 3 · ACCESSIBLE NAMES on the roster ───────────────────────────────────
  report.unnamedControls = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.sheet button, .sheet [role="radio"]')) {
      const name = (el.getAttribute('aria-label') || el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      if (!name && (r.width || r.height)) out.push(el.className || el.tagName);
    }
    return out.slice(0, 20);
  });

  // ── 4 · HEADING SEMANTICS ────────────────────────────────────────────────
  report.headings = await page.evaluate(() => [...document.querySelectorAll('.sheet h1,.sheet h2,.sheet h3,.sheet [role="heading"]')]
    .map((h) => ({ level: h.getAttribute('aria-level') || h.tagName, text: (h.innerText || '').trim().slice(0, 60) })));

  // ── 5 · KEYBOARD PATH into the roster ────────────────────────────────────
  // Can a keyboard user reach a guest row and open it, and is the focus ring
  // actually visible when they do?
  await page.evaluate(() => {
    const b = document.querySelector('.people-roster .rrow .grow button');
    if (b) b.focus();
  });
  report.focusRing = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName, cls: el.className,
      outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow.slice(0, 80),
    };
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  report.enterOpensDetail = await page.evaluate(() => !!document.querySelector('.gdetail'));

  // ── 6 · CHANGING A REPLY, AND WHETHER IT PERSISTS A RELOAD ───────────────
  const changed = await page.evaluate(() => {
    const d = document.querySelector('.gdetail');
    if (!d) return null;
    const r = [...d.querySelectorAll('[role="radio"],button')].find((x) => /^Maybe$/i.test((x.innerText || '').trim()));
    if (!r) return null;
    r.click();
    return true;
  });
  await page.waitForTimeout(600);
  report.replyWrite = await page.evaluate(() => {
    try {
      const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0];
      return { clicked: true, first: ev.guests[0].rsvp };
    } catch { return null; }
  });
  if (changed) {
    await page.reload();
    await settle(page);
    await openSectionByName(page, 'Guests', { settle: 700 });
    report.replyAfterReload = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0].guests[0].rsvp; }
      catch { return null; }
    });
  }

  // ── 7 · SEARCH AND THE REPLY LENS at 75 guests ───────────────────────────
  report.search = await page.evaluate(async () => {
    const q = document.querySelector('.rtool-q');
    if (!q) return { toolbar: false };
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(q, 'whitfield');
    q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const rows = document.querySelectorAll('.people-roster .rrow').length;
    const chips = [...document.querySelectorAll('.rtool-lens button')].map((b) => (b.innerText || '').trim());
    set.call(q, '');
    q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    return { toolbar: true, rowsWhenFiltered: rows, chips, rowsAfterClear: document.querySelectorAll('.people-roster .rrow').length };
  });

  // ── 8 · THE ESTIMATE FLOW, DRIVEN ────────────────────────────────────────
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) { /* ignore */ } });
  await boot(page, EV.estimate);
  report.estimate = { before: await page.evaluate(() => (document.querySelector('.sheet') || {}).innerText.replace(/\s+/g, ' ').slice(0, 220)) };
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.sheet button')].find((x) => /Use a different number/.test(x.innerText || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(350);
  report.estimate.adjustRevealsStepper = await page.evaluate(() => {
    const el = document.getElementById('guests-entry-anchor');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.sheet button')].find((x) => /^Plan for \d+$/.test((x.innerText || '').trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(700);
  report.estimate.afterConfirm = await page.evaluate(() => {
    try {
      const ev = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0];
      return { source: ev.guestCountSource, count: ev.guestCount };
    } catch { return null; }
  });

  // ── 9 · DESKTOP: RAIL STATE A → B → BACK ─────────────────────────────────
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) { /* ignore */ } });
  await boot(page, EV.big, { w: 1440, h: 1024 });
  report.desktop = await page.evaluate(() => ({
    railVisible: !!document.querySelector('.people-rail'),
    railText: ((document.querySelector('.people-rail') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 160),
    detailOpen: !!document.querySelector('.gdetail'),
    tableHeaders: !!document.querySelector('.people-roster .ghead'),
    gridCols: getComputedStyle(document.querySelector('.people-grid') || document.body).gridTemplateColumns,
  }));
  await page.evaluate(() => {
    const b = document.querySelector('.people-roster .rrow .grow button');
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  report.desktopSelected = await page.evaluate(() => ({
    railVisible: !!document.querySelector('.people-rail'),
    detailInAside: !!document.querySelector('.people-aside .gdetail'),
    detailInRow: !!document.querySelector('.people-roster .rrow .gdetail'),
    detailTop: (() => { const d = document.querySelector('.gdetail'); return d ? Math.round(d.getBoundingClientRect().top) : null; })(),
  }));

  fs.writeFileSync(`${OUT}/interaction.json`, JSON.stringify(report, null, 2));
});
