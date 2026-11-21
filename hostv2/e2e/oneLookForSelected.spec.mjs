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
  { name: 'Guests', on: '.chip[aria-pressed="true"]', off: '.chip[aria-pressed="false"]' },
  { name: 'Who sits where', on: '.chip[aria-pressed="true"]', off: '.chip[aria-pressed="false"]' },
  { name: 'The spread & shopping', on: '.fmode.on', off: '.fmode:not(.on)' },
  { name: 'Calendar', on: '.cal-toggle .mini.on', off: '.cal-toggle .mini:not(.on)' },
  { name: 'You & settings', on: '.optrow.on', off: '.optrow:not(.on)', pick: '.optrow' },
  { name: '__jump', on: '.navseg-b.on', off: '.navseg-b:not(.on)' },
];

const read = ([on, off]) => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const vis = (e) => e && e.getClientRects().length;
  const a = [...sh.querySelectorAll(on)].find(vis);
  const b = [...sh.querySelectorAll(off)].find(vis);
  const res = (v) => { const p = document.createElement('div'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  const look = (e) => { if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, img: cs.backgroundImage, ink: cs.color, edge: `${cs.borderTopColor} ${cs.borderTopWidth} ${cs.boxShadow}`, label: (e.innerText || '').trim().slice(0, 20) }; };
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
    for (const s of SURFACES) {
      if (s.name === '__jump') {
        if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
        await page.locator('.ev-eyebrow').first().click();
      } else {
        await openSectionByName(page, s.name, { settle: 600 });
      }
      await sheetSettled(page);
      if (s.pick) { await page.locator('.sheet').last().locator(s.pick).first().click(); await page.waitForTimeout(400); }
      const r = await page.evaluate(read, [s.on, s.off]);
      const where = `${theme} · ${s.name === '__jump' ? 'Jump to' : s.name}`;
      expect(r.on, `${where}: premise, a selected ${s.on} renders`).not.toBeNull();
      expect(r.off, `${where}: premise, an unselected neighbor renders`).not.toBeNull();
      expect.soft(r.on.img, `${where}: selected is not a gradient`).toBe('none');
      expect.soft(r.on.bg, `${where}: selected is not the primary button's fill`).not.toBe(r.primary);
      expect.soft(r.status, `${where}: selected is not a status color`).not.toContain(r.on.bg);
      expect.soft(`${r.on.bg} ${r.on.edge}`, `${where}: selected differs from unselected`).not.toBe(`${r.off.bg} ${r.off.edge}`);
      seen.push({ where, bg: r.on.bg, ink: r.on.ink, label: r.on.label });
    }
    const looks = [...new Set(seen.map((s) => `${s.bg} / ${s.ink}`))];
    expect.soft(looks, `one selected look across ${seen.map((s) => `${s.where} "${s.label}" = ${s.bg} / ${s.ink}`).join('; ')}`).toHaveLength(1);
  });
}
