// ─── THE RUNNING TOTAL COVERS NO ACTION IT CANNOT GIVE BACK (audit 2, 11/20/2026)
//
// The spread's "0 of 8 bought" bar is pinned to the foot of the sheet. At
// 844x390, 1024x768, 1133x744 and 1180x820 the audit found "+ Add an item
// you're bringing" and "Copy the shopping list" under it at load. A pinned bar
// over a scrolling list always has SOMETHING under it at rest; what it must
// never do is keep an action there. So, measured on both tabs:
//   - the total is on screen at load, at the foot of the sheet;
//   - every action, when it takes focus (keyboard, or a scroll-to), lands
//     wholly above the bar: the sheet's scroll padding is the bar's own
//     height, read from the --ftotal-h token, not a 64px guess;
//   - scrolled to the end, every action sits clear of the bar.
// Then the phone turns and all three hold again.
import { test, expect, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'ftotal-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [], budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }], timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
};

// Runs in the page: the three measurements, on the sheet as it is now.
const measure = () => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const bar = sh.querySelector(':scope > .ftotal');
  if (!bar) return { bar: null };
  const controls = [...sh.querySelectorAll('button, a[href], input, select, textarea')]
    .filter((e) => !bar.contains(e) && !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'
      && !e.closest('.sheet-head, [inert], [aria-hidden="true"]'));
  const label = (e) => (e.innerText || e.getAttribute('aria-label') || e.placeholder || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 30);
  sh.scrollTop = 0;
  const b0 = bar.getBoundingClientRect(), s0 = sh.getBoundingClientRect();
  const atLoad = { top: b0.top, bottom: b0.bottom, sheetBottom: Math.min(s0.bottom, innerHeight), vh: innerHeight, text: bar.innerText };
  const underOnFocus = [];
  for (const e of controls) {
    e.focus();
    const r = e.getBoundingClientRect(), b = bar.getBoundingClientRect();
    if (document.activeElement === e && r.bottom > b.top + 0.5 && r.top < b.bottom) underOnFocus.push(`${label(e)} (bottom ${Math.round(r.bottom)} vs bar ${Math.round(b.top)})`);
  }
  sh.scrollTop = sh.scrollHeight;
  const be = bar.getBoundingClientRect();
  const underAtEnd = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > be.top + 0.5 && r.top < be.bottom; }).map(label);
  sh.scrollTop = 0;
  if (document.activeElement && sh.contains(document.activeElement)) document.activeElement.blur();
  return { bar: atLoad, n: controls.length, underOnFocus, underAtEnd };
};

const check = (m, where) => {
  expect(m.bar, `${where}: the running total is on the sheet`).not.toBeNull();
  expect(m.bar.text, `${where}: premise, it is the total`).toMatch(/bought|cart|bringing|of \d/i);
  expect(m.bar.bottom, `${where}: the total is on screen at load`).toBeLessThanOrEqual(m.bar.vh + 0.5);
  expect(m.bar.top, `${where}: the total is on screen at load`).toBeGreaterThanOrEqual(0);
  expect(Math.abs(m.bar.bottom - m.bar.sheetBottom), `${where}: the total sits at the foot of the sheet`).toBeLessThanOrEqual(2);
  expect(m.n, `${where}: premise, actions were measured`).toBeGreaterThan(2);
  expect(m.underOnFocus, `${where}: actions that land under the total when focused`).toEqual([]);
  expect(m.underAtEnd, `${where}: actions under the total at the end of the sheet`).toEqual([]);
};

const walkTabs = async (page, where) => {
  for (const tab of ['Plan', 'Shop']) {
    const t = page.locator('.sheet').last().getByRole('button', { name: tab, exact: true }).first();
    if (await t.count()) { await t.click(); await page.waitForTimeout(600); }
    check(await page.evaluate(measure), `${where} · ${tab}`);
  }
};

test('the spread’s running total stays on screen and never keeps an action under it', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'The spread & shopping', { settle: 900 });
  await walkTabs(page, 'as opened');
});

test('turning the phone: the total and the actions still clear each other', async ({ page }) => {
  const vp = page.viewportSize();
  await boot(page);
  await openSectionByName(page, 'The spread & shopping', { settle: 900 });
  // Portrait -> landscape (or the reverse, if this project starts landscape).
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(500);
  await walkTabs(page, 'turned');
});
