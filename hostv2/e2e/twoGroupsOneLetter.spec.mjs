// ─── A MONOGRAM THAT IDENTIFIES NOTHING ────────────────────────────────────
//
// Each group on the shopping list wears a square badge with its first letter.
// On a repast that meant Drinks and Dessert BOTH rendered "D", one above the
// other, so the badge told the host nothing at the exact moment two adjacent
// rows needed telling apart. The badge is `aria-hidden`, so this was never a
// screen-reader problem — it was a sighted host scanning a list.
//
// THE FIX EXTENDS ONLY WHAT CLASHES. Drinks and Dessert become "Dr" and "De";
// Food stays "F" and Supplies stays "S". It is computed from the groups
// actually on screen rather than a hand-kept map, so a playbook that adds a
// group is handled without anyone remembering to update anything — which is
// the failure mode a fixed map would have reintroduced the first time someone
// authored a "Decor" group.
//
// Driven on a repast 2026-09-27: F · Dr · S · De.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

// { 'Food': 'F', 'Drinks': 'Dr', … } — read off the rendered rows, pairing
// each badge with the label beside it so a failure names the group.
const badges = (page) => page.evaluate(() => {
  const out = {};
  for (const g of document.querySelectorAll('.fgroup')) {
    const b = g.querySelector('.fg-badge');
    const l = g.querySelector('.fg-label');
    if (b && l) out[(l.innerText || '').split('\n')[0].trim()] = (b.innerText || '').trim();
  }
  return out;
});

const openList = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-glyph') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-glyph', name: 'My repast', type: 'Repast', date: '2027-03-14',
      venueCity: 'Annapolis', state: 'MD',
      guestMode: 'count', guestCount: 40, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-glyph');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Plan the food|what you.?re serving|dietary needs on the food plan');
  await page.waitForTimeout(1500);
  await settled(page);
  await tapText(page, '^Shop$');
  await page.waitForTimeout(800);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await page.waitForTimeout(1500);
  await settled(page);
};

test('(premise) this event really does carry two D groups', async ({ page }) => {
  // Without this the uniqueness assertion below passes on any list that
  // happens to have no clash — which is most of them.
  await openList(page);
  const names = Object.keys(await badges(page));
  const ds = names.filter((n) => /^d/i.test(n));
  expect(ds.length, `expected two D groups, got ${JSON.stringify(names)}`)
    .toBeGreaterThan(1);
});

test('THE DEFECT: no two groups wear the same badge', async ({ page }) => {
  await openList(page);
  const map = await badges(page);
  const values = Object.values(map);
  expect(new Set(values).size, `duplicate badge in ${JSON.stringify(map)}`)
    .toBe(values.length);
});

test('and only the clashing ones are extended', async ({ page }) => {
  // The restraint half. Widening every badge to two letters would also pass
  // the test above and would be a worse screen.
  await openList(page);
  const m = await badges(page);
  expect(m.Food).toBe('F');
  expect(m.Supplies).toBe('S');
  expect(m.Drinks).toBe('Dr');
  expect(m.Dessert).toBe('De');
});
