// The existing sync harness has Supabase configuration and NO RSVP API base.
// Use it to exercise the actual configuration-free guest-submit branch.
import { test, expect } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const boot = async page => {
  await page.goto(previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244)) + '?rsvp=test-two-days');
  await expect(page.getByLabel(/Your name/i).first()).toBeVisible();
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await page.getByLabel(/Your name/i).first().fill('E2E local guest');
};

test('a reply with no API stays on this device and is never counted delivered', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /Send my reply/i }).click();
  await expect(page.locator('.inv2-ask')).toContainText('Saved on this device only');
  await expect(page.locator('.inv2-ask')).not.toContainText('You’re in');
  const hit = await page.evaluate(() => (window.__NGW_TRACK__ || []).find(row => row.event === 'invite_rsvp_submitted'));
  expect(hit).toMatchObject({ delivered: false });
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-rsvp-queue-test-two-days') || '[]'));
  expect(pending).toHaveLength(1);
});

test('a reply that cannot reach the API or local storage never claims to be saved', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('ngw-rsvp-queue-')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: /Send my reply/i }).click();
  await expect(page.getByRole('alert')).toContainText('Your reply was not sent or saved');
  await expect(page.getByRole('button', { name: /Send my reply/i })).toBeVisible();
  expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter(row => row.event === 'invite_rsvp_submitted'))).toEqual([]);
});
