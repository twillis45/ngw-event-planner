// ─── A REPLY TAPPED IN THE INVITE EMAIL ARRIVES PICKED (11/19/2026) ─────────
// The invite email is the invitation now (backend app/invite_email.py), and its
// "Yes, I'm in" / "Can't make it" / "Maybe" buttons open the invite with
// ?reply=. The page preselects that answer; nothing is sent until the guest
// adds a name and taps send. Anything else in ?reply= picks nothing.
import { test, expect, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'public-reply-from-email-01';
const EVENT = { id: 'cust-reply-email', rsvpCode: CODE, name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(12), startTime: '16:00', guestEstimate: 12, guestMode: 'list', guests: [{ id: 'g1', name: 'Ana' }], vendors: [], budget: [], timeline: [] };
const open = async (page, reply) => {
  const posts = [];
  await page.route(API + '/**', (r) => { if (r.request().method() === 'POST' && !/opened$/.test(r.request().url())) posts.push(r.request().url()); return r.fulfill({ status: 404, json: { detail: 'not found' } }); });
  await page.route(API + '/api/public/invite/' + CODE, (r) => r.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
  await page.route(API + '/api/public/invite/' + CODE + '/opened', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.goto('?rsvp=' + CODE + (reply ? '&reply=' + reply : ''));
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible({ timeout: 20000 });
  return posts;
};

for (const [reply, label] of [['Yes', /Yes, I.m in/i], ['No', /Can.t make it/i], ['Maybe', /^Maybe$/i]]) {
  test(`?reply=${reply} arrives with that answer picked, and nothing sent`, async ({ page }) => {
    const posts = await open(page, reply);
    await expect(page.getByRole('radio', { name: label }).first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByLabel(/Your name/i).first()).toBeVisible();
    expect(posts).toEqual([]);
  });
}

test('anything else in ?reply= picks nothing', async ({ page }) => {
  await open(page, 'Definitely');
  for (const label of [/Yes, I.m in/i, /Can.t make it/i, /^Maybe$/i]) {
    await expect(page.getByRole('radio', { name: label }).first()).toHaveAttribute('aria-checked', 'false');
  }
});
