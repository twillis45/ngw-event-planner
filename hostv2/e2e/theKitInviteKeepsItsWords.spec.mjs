// ─── YOUR INVITE IN THE KIT (G2c-2b step 4; owner, 11/28/2026: "Approved, go
// with your recommendations"; UX_12 §8a, render screen 4) ────────────────────
// What the old Guests sheet's invite card did, now in the kit's Your invite:
// edit the words (not only pick a voice) and keep the edit; copy the invite
// with the reply link (signed out, it says what stands in the way); what went
// out, read only; the guests added after it went out, named, with the button
// that invites only them; and a gift choice set before the three current ones
// shown as its own option with its detail (call D). Signed out, made-up names.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const SENT = new Date(Date.now() - 4 * 864e5).toISOString();
const EV = {
  id: 'gk-inv', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venue: '12 Elm St', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  giftWish: { mode: 'charity', detail: 'Springfield Food Bank' },
  invitesSentAt: SENT,
  invitesSentMessage: { subject: 'You’re invited — Thanksgiving at ours', body: 'Come for Thanksgiving at ours. Reply here: https://example.com/r', voice: 'warmer', at: SENT },
  vendors: [], budget: [], timeline: [],
  guests: [
    { id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com', invitedAt: SENT, invitedVia: 'email', rsvp: 'Yes' },
    { id: 'g1', name: 'Marcus Bell', phone: '(555) 010-0101', invitedAt: SENT, invitedVia: 'text' },
    { id: 'g2', name: 'Priya Shah', email: 'priya@example.com' },
    { id: 'g3', name: 'Dev Okafor', phone: '(555) 010-0102' },
  ],
};

const boot = async (page, w, h) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.locator('[data-guests-kit] [data-step="invite"]').click();
  const inv = page.locator('[data-guests-kit="invite"]');
  await expect(inv).toBeVisible();
  return inv;
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

for (const [w, h] of [[390, 844], [1194, 834]]) {
  test(`the late guests are named, and the button invites only them — ${w}x${h}`, async ({ page }) => {
    const inv = await boot(page, w, h);
    await expect(inv.locator('[data-late-guests]')).toHaveText('Priya Shah and Dev Okafor were added after your invite went out. They get the same message by email or text.');
    await expect(inv.locator('[data-open-send]')).toHaveText('Invite 2 new guests');
    await inv.locator('[data-open-send]').click();
    await expect(page.getByRole('dialog', { name: 'Send the invite' })).toBeVisible();
  });

  test(`what went out: when, the words, who got it, read only — ${w}x${h}`, async ({ page }) => {
    const inv = await boot(page, w, h);
    const row = inv.locator('[data-what-went-out]');
    await expect(row).toContainText(/· email to 1, text to 1$/);
    await row.click();
    const sheet = page.getByRole('dialog', { name: 'What went out' });
    await expect(sheet.locator('[data-sent-words]')).toContainText('Come for Thanksgiving at ours.');
    await expect(sheet.locator('[data-sent-guest]')).toHaveCount(2);
    await expect(sheet.locator('[data-sent-guest="g0"]')).toContainText('Replied yes');
    await expect(sheet.locator('[data-sent-guest="g1"]')).toContainText('Text, by you');
    await expect(sheet.locator('textarea, input')).toHaveCount(0);
  });

  test(`a gift choice set before keeps its own option and detail — ${w}x${h}`, async ({ page }) => {
    const inv = await boot(page, w, h);
    const gifts = inv.getByRole('group', { name: 'Gifts' });
    await expect(gifts.getByRole('button', { name: 'A donation' })).toHaveAttribute('aria-pressed', 'true');
    await expect(inv.getByLabel('Gift note detail')).toHaveValue('Springfield Food Bank');
    await gifts.getByRole('button', { name: 'Registry link' }).click();
    await expect.poll(async () => (await saved(page)).giftWish.mode).toBe('registry');
    await expect(gifts.getByRole('button', { name: 'A donation' })).toHaveCount(0);
  });
}

test('edit the words: the edit is kept and shown, and the reply link must stay', async ({ page }) => {
  const inv = await boot(page, 390, 844);
  await inv.locator('[data-edit-words]').click();
  const sheet = page.getByRole('dialog', { name: 'Edit the words' });
  const box = sheet.locator('[data-words]');
  const was = await box.inputValue();
  expect(was).toContain('[your reply link goes here]');
  await box.fill('Dinner at three. Bring a chair if you have one.');
  await expect(sheet.locator('[data-link-gone]')).toBeVisible();
  await expect(sheet.locator('[data-save-words]')).toBeDisabled();
  await box.fill('Dinner at three. Bring a chair if you have one.\n\nReply here: [your reply link goes here]');
  await sheet.locator('[data-save-words]').click();
  await expect(sheet).toHaveCount(0);
  await expect(inv.locator('[data-message]')).toContainText('Bring a chair if you have one.');
  await expect.poll(async () => (await saved(page)).inviteMessageDraft && (await saved(page)).inviteMessageDraft.edited).toBe(true);
});

test('copy the invite, signed out: it says sending needs the account and offers Sign in', async ({ page }) => {
  const inv = await boot(page, 390, 844);
  await inv.locator('[data-copy-invite] .link').click();
  const sheet = page.getByRole('dialog', { name: 'Copy the invite' });
  await expect(sheet.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(sheet.locator('[data-copy]')).toHaveCount(0);
});
