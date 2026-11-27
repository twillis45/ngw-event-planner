// ─── THE HEADER WEARS T2 (owner, 11/27/2026: "T2 applied version is fine") ────
//
// The approved render's header on the phone:
//   Thanksgiving at the Lanes ▾          28px · 700 · tracking −0.02em
//   Thursday, December 17 · 21 days      15px, muted, sentence case, UNDER the name
// It supersedes the 11/23/2026 phone header (date line in capitals above the
// name). Everything the date line carries still rides on it: the "Sample" tag
// and the weather. The desktop header is not part of this decision and stays
// as it was; the last test pins that. Made-up names only.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 't2-head', name: 'Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(21), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
};

const open = async (page, w, h) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await expect(page.locator('[data-tt-head]')).toBeVisible();
};

const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

test('the phone header: the name, then the date in plain words under it — 390x844', async ({ page }) => {
  await open(page, 390, 844);
  const name = page.locator('[data-tt-title] .tt-name');
  await expect(name).toHaveText('Thanksgiving at the Lanes');
  const n = await name.evaluate((el) => { const cs = getComputedStyle(el); return { fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing }; });
  expect(parseFloat(n.fs)).toBe(28);
  expect(n.fw).toBe('700');
  expect(parseFloat(n.ls)).toBeCloseTo(-0.56, 2);   // the −0.02em floor

  const line = page.locator('[data-tt-head] .tt-r1');
  // Sentence case as the host reads it, not capitals.
  const days = await page.locator('[data-tt-urgency]').innerText();
  expect(days).toMatch(/^\d+ days$/);
  await expect(line).toHaveText(`${longDate(EVENT.date)} · ${days}`, { useInnerText: true });
  const l = await line.evaluate((el) => { const cs = getComputedStyle(el); return { fs: cs.fontSize, tt: cs.textTransform, ls: cs.letterSpacing }; });
  expect(parseFloat(l.fs)).toBe(15);
  expect(l.tt).toBe('none');
  expect(parseFloat(l.ls) || 0).toBe(0);

  // Under the name, and the question under both.
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return { t: b('[data-tt-title]'), d: b('[data-tt-head] .tt-r1'), q: b('h2.ask') };
  });
  expect(r.d.top).toBeGreaterThanOrEqual(r.t.bottom - 1);
  expect(r.d.top - r.t.bottom, 'the date sits close under the name').toBeLessThanOrEqual(8);
  expect(r.q.top).toBeGreaterThan(r.d.bottom);
});

test('the desktop header is not part of this decision — 1440x900', async ({ page }) => {
  await open(page, 1440, 900);
  const line = page.locator('[data-tt-head] .tt-r1');
  await expect(line).toContainText(/\d+ DAYS/, { useInnerText: true });
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return { t: b('[data-tt-title]'), d: b('[data-tt-head] .tt-r1') };
  });
  expect(r.d.bottom).toBeLessThanOrEqual(r.t.top + 1);
});
