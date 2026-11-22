// ─── FRIENDS SPLIT THE COSTS (owner, 11/16/2026: "free, just the math") ─────
// A local Friendsgiving: Jordan bought the turkey ($60), Ana the drinks ($30),
// Sam nothing. The host adds the three who said yes, enters what was paid,
// and reads "Sam pays Jordan $30.00" — free, no pass, and nothing claims any
// money moved.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-split', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: dateIn(12), startTime: '16:00',
  guestMode: 'list', budget: [], vendors: [], timeline: [],
  guests: [{ id: 'g1', name: 'Jordan', rsvp: 'Yes' }, { id: 'g2', name: 'Ana', rsvp: 'Yes' }, { id: 'g3', name: 'Sam', rsvp: 'Yes' }, { id: 'g4', name: 'Lee', rsvp: 'No' }] };

const stored = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((e) => e.id === 'cust-split') || {}).costSplit || null);

test('three friends, two receipts: the app says who pays whom, for free', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    window.__clip = [];
    Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => ({ writeText: async (t) => { window.__clip.push(t); } }) });
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Split the costs');
  await settled(page);
  const sheet = page.locator('[data-cost-split]');
  await expect(sheet).toBeVisible();
  await expect(page.getByText('See the One-Event Pass')).toHaveCount(0);   // free: no pass wall

  // Add the three who said yes (not Lee, who said no).
  await sheet.locator('[data-split-add-yes]').click();
  await expect(sheet.locator('[data-split-people] li')).toHaveCount(3);
  await expect(sheet.locator('[data-split-people]')).not.toContainText('Lee');

  const add = async (who, what, amount) => {
    await sheet.getByLabel('Who paid').selectOption({ label: who });
    await sheet.getByLabel('What it was for').fill(what);
    await sheet.getByLabel('How much').fill(amount);
    await sheet.getByRole('button', { name: 'Add it' }).click();
  };
  await add('Jordan', 'the turkey', '60');
  await add('Ana', 'drinks', '$30.00');

  const result = sheet.locator('[data-split-result]');
  await expect(result).toContainText('$90.00 total, split 3 ways — $30.00 each');
  await expect(result.locator('[data-split-transfers] li')).toHaveText(['Sam pays Jordan $30.00']);
  const s = await stored(page);
  expect(s.people.map((p) => p.name)).toEqual(['Jordan', 'Ana', 'Sam']);
  expect(s.expenses.map((x) => x.amount)).toEqual([60, 30]);

  await result.locator('[data-split-copy]').click();
  await expect.poll(() => page.evaluate(() => window.__clip.length)).toBe(1);
  expect(await page.evaluate(() => window.__clip[0])).toContain('Sam pays Jordan $30.00.');

  // Nothing on the sheet claims money moved.
  await expect(sheet).not.toContainText(/\b(sent|charged|requested|paid you)\b/i);
  // Finger-sized controls, nothing off the side at 390px.
  const small = await page.evaluate(() => [...document.querySelectorAll('[data-cost-split] button, [data-cost-split] select, [data-cost-split] input')]
    .map((n) => n.getBoundingClientRect()).filter((r) => r.width && r.height < 44).length);
  expect(small).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

// ── A BROUGHT DISH IS NOT SHARED SPENDING (owner's iPad, 11/21/2026) ─────────
// `event.foodOwner` is the one record of who brings each dish, and Shop reads
// it through foodBringing's bringingRows. The split reads the same thing: a
// receipt for the mac and cheese a guest brings stays on the list, marked, and
// out of the total; the turkey the host side buys is split.
const TG = { id: 'cust-split-tg', name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(12), startTime: '16:00',
  guestMode: 'list', guestEstimate: 12, budget: [], vendors: [], timeline: [],
  foodChoices: { hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts' },
  guests: [{ id: 'g1', name: 'Jordan', rsvp: 'Yes' }, { id: 'g2', name: 'Ana', rsvp: 'Yes' }, { id: 'g3', name: 'Sam', rsvp: 'Yes' }] };

test('a receipt for a dish a guest brings is listed, marked, and not split', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, TG);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Split the costs');
  await settled(page);
  const sheet = page.locator('[data-cost-split]');
  await sheet.locator('[data-split-add-yes]').click();
  const add = async (who, what, amount) => {
    await sheet.getByLabel('Who paid').selectOption({ label: who });
    await sheet.getByLabel('What it was for').fill(what);
    await sheet.getByLabel('How much').fill(amount);
    await sheet.getByRole('button', { name: 'Add it' }).click();
  };
  await add('Ana', 'Turkey', '60');
  await add('Jordan', 'Mac and cheese', '30');

  const result = sheet.locator('[data-split-result]');
  await expect(result).toContainText('$60.00 total, split 3 ways — $20.00 each');
  await expect(result.locator('[data-split-brought-note]')).toHaveText('Left out: Mac and cheese ($30.00) — a brought dish isn’t shared spending.');
  await expect(result.locator('[data-split-transfers] li')).toHaveText(['Jordan pays Ana $20.00', 'Sam pays Ana $20.00']);
  await expect(sheet.locator('[data-split-expenses] li', { hasText: 'Mac and cheese' }).locator('[data-split-brought]')).toHaveText(' · brought, not split');
  await expect(sheet.locator('[data-split-expenses] li', { hasText: 'Turkey' }).locator('[data-split-brought]')).toHaveCount(0);
  // The receipt names its dish; whether it is brought is read, never stored.
  const s = await page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((e) => e.id === 'cust-split-tg') || {}).costSplit);
  expect(s.expenses.map((x) => x.dishId)).toEqual(['p_turkey', 'p_mac']);
  expect(s.expenses.some((x) => 'brought' in x)).toBe(false);
});
