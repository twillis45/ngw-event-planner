// ─── ONE LOOK FOR "SELECTED" (design audit round 1 #2, batch 4, 11/21/2026) ──
//
// The audit measured five different selected treatments, one of them the
// primary button's own fill:
//   - .chip pressed: solid steel, the .cta's color ("By list", "List");
//   - .navseg-b.on: a neutral raised slab with a drop shadow (Jump to);
//   - .fmode.on: an inverted light fill with dark text (Plan / Shop);
//   - .cal-toggle .mini.on: the card color plus a hairline (Week / Month);
//   - .optrow.on: a radio dot only (the option lists; measured here on
//     You & settings' "How much you have done this", picked first).
// They now read one tokenized selected state (--sel-bg, --sel-line,
// --sel-ink). Measured here in both themes, on the surfaces the audit named:
//   - every selected control paints the SAME background and text color;
//   - that state is not the primary button's fill, and not a status tint
//     (a choice selected is not "done" or "at risk");
//   - a selected control differs from its unselected neighbor.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'one-sel', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [], budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }], timeline: [],
};

const boot = async (page, theme) => {
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [EVENT, theme]);
  await page.goto('?elegant=1');
  await settled(page);
};

// Where each treatment lives, and the selector for its selected and unselected forms.
const SURFACES = [
  // The invite rules' chips wear their own owner-approved look (render 10,
  // 11/24/2026: a green outline and a check, no fill), so the guest list's
  // one-look check reads its other chips.
  { name: 'Guests', on: '.chip[aria-pressed="true"]:not(.invite-rules .chip)', off: '.chip[aria-pressed="false"]:not(.invite-rules .chip)' },
  { name: 'Who sits where', on: '.chip[aria-pressed="true"]', off: '.chip[aria-pressed="false"]' },
  // One food page (owner, 11/24/2026): the Plan / Shop tabs are gone; the
  // spread's selected control is now the menu's chips, behind its Menu row.
  { name: 'The spread & shopping', on: '.chip[aria-pressed="true"]', off: '.chip[aria-pressed="false"]', pick: '[data-food-section="choices"] .fstat' },
  { name: 'Calendar', on: '.cal-toggle .mini.on', off: '.cal-toggle .mini:not(.on)' },
  { name: 'You & settings', on: '.optrow.on', off: '.optrow:not(.on)', pick: '.optrow' },
  { name: '__jump', on: '.navseg-b.on', off: '.navseg-b:not(.on)' },
];

const read = ([on, off, scope]) => {
  const sh = scope ? document.querySelector(scope) : [...document.querySelectorAll('.sheet')].pop();
  const vis = (e) => e && e.getClientRects().length;
  const a = [...sh.querySelectorAll(on)].find(vis);
  const b = [...sh.querySelectorAll(off)].find(vis);
  const res = (v) => { const p = document.createElement('div'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  // The stage label's own bar (the nav's underline, owner 11/24/2026).
  const under = (e) => { const l = e.querySelector('.nav-l, .srail-l'); if (!l) return 'none'; const a = getComputedStyle(l, '::after'); return a.content === 'none' || a.content === 'normal' ? 'none' : `${a.width} ${a.height}`; };
  const look = (e) => { if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, img: cs.backgroundImage, ink: cs.color, edge: `${cs.borderTopColor} ${cs.borderTopWidth} ${cs.boxShadow}`, ring: (cs.borderTopColor !== 'rgba(0, 0, 0, 0)' && parseFloat(cs.borderTopWidth) > 0) || cs.boxShadow !== 'none', under: under(e), label: (e.innerText || '').trim().slice(0, 20) }; };
  return {
    on: look(a), off: look(b),
    primary: res('var(--steel)'),
    status: ['var(--ok)', 'var(--ok-tint)', 'var(--warn)', 'var(--warn-tint)', 'var(--danger-tint)'].map(res),
  };
};

for (const theme of ['dark', 'light']) {
  test(`every selected control wears one look — ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, theme);
    const seen = [];
    const selInk = [];
    for (const s of SURFACES) {
      // A tall iPad's phase switch is the docked bar, not a sheet (11/22/2026);
      // a phone's is its pill, and a 13" iPad's the rail's Your event group
      // (owner rulings 4 and 8, 11/23/2026).
      const inBar = s.name === '__jump' && await page.locator('[data-tt-bar]').count() > 0;
      const inRail = s.name === '__jump' && !inBar && await page.locator('.srail [data-rail-stage]').count() > 0;
      if (s.name === '__jump') {
        if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
        if (!inBar && !inRail) await page.locator('.ev-eyebrow').first().click();
      } else {
        await openSectionByName(page, s.name, { settle: 600 });
      }
      if (!inBar && !inRail) await sheetSettled(page);
      if (s.pick) { await page.locator('.sheet').last().locator(s.pick).first().click(); await page.waitForTimeout(400); }
      const sel = inRail ? ['.srail-stage.is-stage', '.srail-stage:not(.is-stage)', '.srail'] : [s.on, s.off, inBar ? '[data-tt-bar]' : null];
      const r = await page.evaluate(read, sel);
      const where = `${theme} · ${s.name === '__jump' ? (inBar ? 'the bar' : inRail ? 'the rail' : 'Jump to') : s.name}`;
      expect(r.on, `${where}: premise, a selected ${s.on} renders`).not.toBeNull();
      expect(r.off, `${where}: premise, an unselected neighbor renders`).not.toBeNull();
      expect.soft(r.on.img, `${where}: selected is not a gradient`).toBe('none');
      expect.soft(r.on.bg, `${where}: selected is not the primary button's fill`).not.toBe(r.primary);
      expect.soft(r.status, `${where}: selected is not a status color`).not.toContain(r.on.bg);
      // THE PHASE IS UNDERLINED, NOT FILLED OR OUTLINED, on the phone's pill,
      // the tall bar and the 13" rail (owner rulings 4 and 8, 11/23/2026: no
      // fill on the nav; owner 11/24/2026, renders 1a and 7: "no circle,
      // outline or box", a 2px bar under the label). Held to that, and to the
      // one selected ink; the one-fill rule below holds everywhere else.
      // (Every tall iPad's bar too, owner 11/23/2026: no fill on any nav.)
      const underlined = inBar || inRail;
      if (underlined) {
        expect.soft(r.on.bg, `${where}: the phase has no fill`).toBe('rgba(0, 0, 0, 0)');
        expect.soft(r.on.ring, `${where}: the phase has no outline (${r.on.edge})`).toBe(false);
        expect.soft(r.on.under, `${where}: the phase is underlined`).not.toBe('none');
        expect.soft(r.off.under, `${where}: an unselected phase is not`).toBe('none');
        selInk.push(r.on.ink);
        continue;
      }
      expect.soft(`${r.on.bg} ${r.on.edge}`, `${where}: selected differs from unselected`).not.toBe(`${r.off.bg} ${r.off.edge}`);
      seen.push({ where, bg: r.on.bg, ink: r.on.ink, label: r.on.label });
    }
    for (const ink of selInk) expect.soft(ink, 'the underlined phase wears the one selected ink').toBe(seen[0] && seen[0].ink);
    const looks = [...new Set(seen.map((s) => `${s.bg} / ${s.ink}`))];
    expect.soft(looks, `one selected look across ${seen.map((s) => `${s.where} "${s.label}" = ${s.bg} / ${s.ink}`).join('; ')}`).toHaveLength(1);
  });
}
