// ─── THE INVITE WEARS THE HOST'S COLORS (owner-approved palettes, 11/24/2026) ─
//
// Driven in a real browser:
//   · in "Your invite", picking a palette, then an arrangement of it, recolors
//     the live preview: its computed paper, ink and accent change;
//   · after Save, the guest's invite shows the same colors on reload;
//   · "Match my event" resolves by occasion (a Thanksgiving wears Cloud & Clay);
//   · an existing event with a blank inviteStyle still renders today's cream,
//     with the contrast-passing rust.
// Made-up names and places only; every API request is answered here.
import { test, expect } from './fixtures.mjs';
import { dateIn, sheetSettled } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'invite-colors-code-0000001';
const EVENT = (over = {}) => ({
  id: 'cust-invite-colors', rsvpCode: CODE, name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving',
  date: dateIn(12), startTime: '18:00', startTimeSource: 'host',
  venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150', hostName: 'Dana Reyes',
  guestEstimate: 12, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [], ...over,
});
const seed = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.route(`${API}/**`, (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
};
const rgb = (h) => { const x = h.replace('#', ''); return `rgb(${[0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).join(', ')})`; };

// The sheet's own colors, as the browser computed them.
const colorsIn = (page, scope) => page.evaluate((sel) => {
  const root = sel ? document.querySelector(sel) : document;
  const sheet = root.querySelector('.inv2-sheet');
  const cs = getComputedStyle(sheet);
  return {
    pal: sheet.getAttribute('data-pal'),
    paper: cs.getPropertyValue('--stock-paper').trim().toLowerCase(),
    ink: getComputedStyle(root.querySelector('.inv2-name')).color,
    accent: getComputedStyle(root.querySelector('.inv2-mast')).color,
    background: cs.backgroundImage,
  };
}, scope);

const settledInvite = async (page) => {
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.inv2 .rv')].every((el) => getComputedStyle(el).opacity === '1')), { timeout: 10_000 }).toBe(true);
};

test('a palette, then an arrangement, recolors the live preview, and the guest sees the same after save', async ({ page }) => {
  await seed(page, EVENT({ inviteStyle: '' }));
  await page.goto('?open=invite');
  await expect(page.locator('#sheet-title')).toHaveText('Invite page', { timeout: 10_000 });
  await sheetSettled(page);
  const pv = '[data-invite-preview]';
  await expect(page.locator(`${pv} .inv2-sheet`)).toBeVisible();
  const before = await colorsIn(page, pv);
  expect(before.pal).toBe(null);

  const colors = page.getByRole('radiogroup', { name: 'Colors' });
  await expect(colors.getByRole('radio').first()).toHaveAccessibleName(/Match my event/);
  await expect(colors.getByRole('radio')).toHaveCount(9);
  await colors.getByRole('radio', { name: /Forest & Oxblood/ }).click();
  await expect(page.locator(`${pv} .inv2-sheet`)).toHaveAttribute('data-pal', 'forest-oxblood');
  const forest = await colorsIn(page, pv);
  expect(forest.paper).toBe('#f7f1e3');
  expect(forest.ink).toBe(rgb('#1f3a2c'));
  expect(forest.accent).toBe(rgb('#6e1f26'));
  expect(forest.ink).not.toBe(before.ink);

  const arrange = page.getByRole('radiogroup', { name: 'Arrange' });
  await expect(arrange.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await arrange.getByRole('radio', { name: 'Arrangement 2' }).click();
  await expect(page.locator(`${pv} .inv2-sheet`)).toHaveAttribute('data-pal', 'forest-oxblood:1');
  const swapped = await colorsIn(page, pv);
  expect(swapped.ink).toBe(rgb('#6e1f26'));      // the oxblood is now the words
  expect(swapped.accent).toBe(rgb('#1f3a2c'));   // and the forest the accent

  await page.getByRole('button', { name: 'Save your invite page' }).click();
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  const guest = await colorsIn(page, null);
  expect(guest).toMatchObject({ pal: 'forest-oxblood:1', paper: '#f7f1e3', ink: swapped.ink, accent: swapped.accent });
  await page.reload();
  await settledInvite(page);
  expect((await colorsIn(page, null)).pal).toBe('forest-oxblood:1');
});

test('"Match my event" dresses a Thanksgiving in Cloud & Clay', async ({ page }) => {
  await seed(page, EVENT({ inviteStyle: 'auto' }));
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  const c = await colorsIn(page, null);
  expect(c.pal).toBe('cloud-clay');
  expect(c.paper).toBe('#fbfaf7');
  expect(c.accent).toBe(rgb('#a3482a'));
});

test('an existing event with a blank inviteStyle still renders today’s cream', async ({ page }) => {
  await seed(page, EVENT({ inviteStyle: '' }));
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  const c = await colorsIn(page, null);
  expect(c.pal).toBe(null);
  expect(c.background).toContain('rgb(249, 244, 234)');   // #f9f4ea, today's paper
  expect(c.accent).toBe(rgb('#9c4426'));                    // the rust that clears 4.5:1
});
