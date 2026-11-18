// ─── SECTIONS INSIDE A SHEET STAND OUT; TOTALS STAY ON ONE LINE ──────────────
// Owner ruling 11/18/2026 ("AB-1", chosen from rendered options). Measured at
// 390px before: section titles 11.5px under 15–16px rows, 38px above a title
// against 33px between rows (16px on Guests), no divider; and row totals broke
// at the edge ("$8–" / "$12", "still need" / "8").
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const seed = (page) => page.addInitScript((e) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
  localStorage.setItem('ngw-hostv2-last-event', e.id);
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
}, {
  id: 'e2e-sect', name: 'Game night', type: 'Game Night', date: dateIn(10), recordKind: 'host_event',
  venue: '271 Whitaker Rd, Pasadena MD', venueKind: 'home', venueConfirmed: true, venueCity: 'Pasadena',
  guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', totalBudget: 300,
  budget: [{ id: 'b1', category: 'Food', amount: 120 }], vendors: [], guests: [],
});

const open = async (page, name) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, name);
  await settled(page);
};

// Gaps between lines of TEXT, the way a reader sees them: rows carry their
// spacing as padding, so box edges touch while the words sit apart.
const titles = (page) => page.evaluate(() => {
  const ink = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  const hasText = (el) => el && el.textContent.trim() && el.getBoundingClientRect().height > 0;
  const sheet = [...document.querySelectorAll('.sheet')].pop();
  const out = [];
  for (const h of sheet.querySelectorAll('.shelf-label:not(.srail-t)')) {
    if (!h.getBoundingClientRect().height) continue;
    let prev = h.previousElementSibling; while (prev && !hasText(prev)) prev = prev.previousElementSibling;
    const n1 = h.nextElementSibling;
    let rows = null;
    if (n1 && n1.children.length >= 2) rows = [...n1.children].filter(hasText).slice(0, 2);
    else if (n1 && n1.nextElementSibling && !n1.nextElementSibling.classList.contains('shelf-label')) rows = [n1, n1.nextElementSibling].filter(hasText);
    out.push({
      text: h.textContent.trim().slice(0, 30),
      size: parseFloat(getComputedStyle(h).fontSize),
      line: getComputedStyle(h).borderBottomStyle !== 'none',
      above: prev ? Math.round(ink(h).top - ink(prev).bottom) : null,
      rowGap: rows && rows.length === 2 ? Math.round(ink(rows[1]).top - ink(rows[0]).bottom) : null,
    });
  }
  return out;
});

for (const name of ['Space, seats', 'Guests', 'Your money']) {
  test(`${name}: every section title is row-sized, ruled, with a real gap above it`, async ({ page }) => {
    await open(page, name);
    const heads = await titles(page);
    expect(heads.length).toBeGreaterThan(0);
    for (const h of heads) {
      expect(h.size, h.text).toBeGreaterThanOrEqual(15);
      expect(h.line, h.text).toBe(true);
      if (h.above != null && h.rowGap != null) expect(h.above, `${h.text}: ${h.above} vs ${h.rowGap}`).toBeGreaterThanOrEqual(1.5 * Math.max(h.rowGap, 8));
    }
  });
}

test('What to bring: every total stays on one line', async ({ page }) => {
  await open(page, 'Space, seats');
  const broken = await page.evaluate(() => [...document.querySelectorAll('.sheet .fstat-v')]
    .filter((v) => v.getBoundingClientRect().height)
    .filter((v) => { const r = document.createRange(); r.selectNodeContents(v); return r.getClientRects().length > 1 && new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1; })
    .map((v) => v.textContent.trim()));
  expect(broken).toEqual([]);
});
