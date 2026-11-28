// ─── ONE GUEST: THE REST OF IT (G2c-2b-1; owner, 11/28/2026: "Approved, go
// with your recommendations"; UX_12 §8a, render screen 2) ────────────────────
// The old Guests sheet's one-guest editor did five things the kit's did not:
// rename in place (the old name kept so replies still match), call / text /
// email, a group, nudge this one guest (with how the last nudge went) and
// "Helping with". Each is here now, in the shared kit, so hostv4 has them too.
// Made-up names; nothing is sent (Call, Text and Email only open the phone's
// apps, and the nudge stops at the sign-in it needs).
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'gk-one', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  invitesSentAt: '2026-11-24T15:00:00.000Z', vendors: [], budget: [],
  timeline: [{ id: 't-pies', task: 'Bring the pies', owner: 'Ava Lane' }],
  guests: [
    { id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com', rsvp: 'Yes', invitedAt: '2026-11-24T15:00:00.000Z' },
    { id: 'g1', name: 'Bo Reed', email: 'bo@example.com', invitedAt: '2026-11-24T15:00:00.000Z' },
    { id: 'g2', name: 'Ava Lane', email: 'ava@example.com', phone: '(555) 010-0123', invitedAt: '2026-11-24T15:00:00.000Z',
      nudgedAt: '2026-11-25T15:00:00.000Z', nudgedVia: 'text' },
  ],
};

const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  const kit = page.locator('[data-guests-kit]');
  await kit.locator('[data-group="pending"]').click();
  await kit.locator('[data-guest="g2"]').click();
  const sheet = kit.locator('.gk-sheet[aria-label="Ava Lane"]');
  await expect(sheet).toBeVisible();
  return { kit, sheet };
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('rename in place keeps the old name, so her replies still match', async ({ page }) => {
  const { sheet } = await boot(page);
  const name = sheet.getByRole('textbox', { name: 'Name', exact: true });
  await expect(name).toHaveValue('Ava Lane');
  await name.fill('Ava Lane-Ross');
  await name.press('Enter');
  await expect.poll(async () => (await saved(page)).guests[2].name).toBe('Ava Lane-Ross');
  expect((await saved(page)).guests[2].aka).toContain('ava lane');
});

test('Call, Text and Email open the phone’s own apps, with her number and address', async ({ page }) => {
  const { sheet } = await boot(page);
  await expect(sheet.getByRole('link', { name: 'Call Ava' })).toHaveAttribute('href', 'tel:5550100123');
  await expect(sheet.getByRole('link', { name: 'Text Ava' })).toHaveAttribute('href', 'sms:5550100123');
  await expect(sheet.getByRole('link', { name: 'Email Ava' })).toHaveAttribute('href', 'mailto:ava%40example.com');
});

test('a group, with the groups already used offered', async ({ page }) => {
  const { sheet } = await boot(page);
  const group = sheet.getByRole('combobox', { name: 'Group' });
  await group.fill('Family');
  await group.blur();
  await expect.poll(async () => (await saved(page)).guests[2].group).toBe('Family');
});

test('Helping with names her job; the nudge row says how the last one went and opens the nudge for her alone', async ({ page }) => {
  const { kit, sheet } = await boot(page);
  await expect(sheet.locator('[data-helping]')).toHaveText('Helping with: Bring the pies');
  const nudge = sheet.locator('[data-nudge-one]');
  await expect(nudge).toContainText('Nudge Ava');
  await expect(nudge).toContainText(/Nudged Nov 25 · texted by you/);
  await nudge.click();
  const ns = kit.locator('.gk-sheet[data-nudge-only="g2"]');
  await expect(ns).toBeVisible();
  await expect(ns.locator('h2')).toHaveText('Nudge Ava');
});

test('NEGATIVE CONTROL: a guest who replied has no nudge row', async ({ page }) => {
  const { kit } = await boot(page);
  await kit.locator('.gk-sheet .sheethead .link', { hasText: 'Done' }).click();
  await kit.locator('[data-group="yes"]').click();
  await kit.locator('[data-guest="g0"]').click();
  await expect(kit.locator('.gk-sheet[aria-label="Rosa Lane"]')).toBeVisible();
  await expect(kit.locator('[data-nudge-one]')).toHaveCount(0);
});

test('on an iPad in landscape the guest pane has them too, and Nudge opens over it — 1194x834', async ({ page }) => {
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  const kit = page.locator('[data-guests-kit]');
  await kit.locator('[data-group="pending"]').click();
  await kit.locator('[data-guest="g2"]').click();
  const pane = kit.locator('.gk-gdetail');
  await expect(pane.locator('.dhead')).toHaveText('Ava Lane');
  await expect(pane.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Ava Lane');
  await expect(pane.getByRole('link', { name: 'Call Ava' })).toBeVisible();
  await expect(pane.locator('[data-helping]')).toHaveText('Helping with: Bring the pies');
  await pane.locator('[data-nudge-one]').click();
  await expect(kit.locator('.gk-sheet[data-nudge-only="g2"] h2')).toHaveText('Nudge Ava');
  await expect(pane.locator('.dhead')).toHaveText('Ava Lane');   // the pane stays
});
