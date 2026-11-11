// ─── A GUEST CAN CHANGE OR DELETE HER OWN REPLY (11/11/2026) ─────────────────
//
// The invite collects allergies, diet rules and access needs. The guest who
// shared them can now, from the same phone:
//   · delete her reply — the server is told with HER device key, the screen
//     says it is deleted only once the server confirmed, and the form is blank;
//   · come back later and see what she sent, then change it (the form is
//     filled from the server's copy, not retyped);
//   · and if the delete fails, she is told so and her reply stays.
// The guest is a stranger: empty storage, the invite comes from the (mocked)
// backend, like a real guest tapping a link on her own phone.
import { test, expect } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'guest-owns-reply-0001';   // 16+ characters, like a real invite code
const EVENT_ID = 'ev-guest-owns-reply';
const EVENT = {
  id: EVENT_ID, name: 'Margaret Adeyemi’s Retirement Dinner', type: 'Retirement Party',
  date: '2027-03-06', startTime: '19:00', venue: 'The Willow Room', rsvpCode: CODE, goingCount: 3,
};

const serve = async (page, { mine = null, withdrawStatus = 200 } = {}) => {
  const calls = { submit: [], withdraw: [], mine: [] };
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
  await page.route(`${API}/api/public/rsvp/${CODE}`, (r) => {
    calls.submit.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, json: { ok: true, submitted_at: '2026-11-11T12:00:00Z' } });
  });
  await page.route(`${API}/api/public/rsvp/${CODE}/mine`, (r) => {
    calls.mine.push(r.request().postDataJSON());
    return mine ? r.fulfill({ status: 200, json: { ok: true, reply: mine } }) : r.fulfill({ status: 404, json: { detail: 'none' } });
  });
  await page.route(`${API}/api/public/rsvp/${CODE}/withdraw`, (r) => {
    calls.withdraw.push(r.request().postDataJSON());
    return withdrawStatus === 200
      ? r.fulfill({ status: 200, json: { ok: true, withdrawn: true } })
      : r.fulfill({ status: withdrawStatus, json: { detail: 'down' } });
  });
  return calls;
};

const reply = async (page) => {
  await page.goto('?rsvp=' + CODE);
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await page.waitForTimeout(2600);   // past the staged entrance
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Avery Quinn');
  await page.getByRole('button', { name: /^Add dietary or access needs$/ }).click();
  await page.getByRole('group', { name: 'Allergies' }).getByRole('button', { name: /^Peanut$/ }).click();
  await page.getByRole('button', { name: /^Send my reply$/ }).click();
  await expect(page.getByRole('button', { name: /^Delete my reply$/ })).toBeVisible();
};

test('a guest deletes her reply: the server is told with her key, then the form is blank', async ({ page }) => {
  const calls = await serve(page);
  await reply(page);
  expect(calls.submit).toHaveLength(1);
  const key = calls.submit[0].idempotency_key;
  expect(calls.submit[0].allergens).toEqual(['Peanut']);   // PREMISE: there was something to delete

  await page.getByRole('button', { name: /^Delete my reply$/ }).click();
  const ask = page.locator('[data-delete-reply]');
  await expect(ask).toContainText('allergies');
  await ask.getByRole('button', { name: /^Delete it$/ }).click();

  await expect(page.locator('[data-reply-deleted]')).toBeVisible();
  expect(calls.withdraw).toEqual([{ idempotency_key: key }]);
  // Back to a fresh invite: no answer picked, and the name is gone once she picks one.
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('');
  await expect(page.getByRole('button', { name: /^Delete my reply$/ })).toHaveCount(0);
});

test('a failed delete says so, and her reply stays', async ({ page }) => {
  const calls = await serve(page, { withdrawStatus: 503 });
  await reply(page);
  await page.getByRole('button', { name: /^Delete my reply$/ }).click();
  await page.locator('[data-delete-reply]').getByRole('button', { name: /^Delete it$/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'not deleted' })).toBeVisible();
  expect(calls.withdraw).toHaveLength(1);
  await expect(page.locator('[data-reply-deleted]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Change my answer$/ })).toBeVisible();
});

test('a guest who comes back sees what she sent and changes it, filled from her saved reply', async ({ page }) => {
  await page.addInitScript(([tag]) => {
    localStorage.setItem('ngw-rsvp-idemp-' + tag, 'key-from-last-week');
  }, [EVENT_ID + ':' + CODE]);
  const calls = await serve(page, {
    mine: {
      guest_name: 'Avery Quinn', rsvp: 'Yes', meal: 'Vegetarian', needs: 'Peanut, no stairs please',
      allergens: ['Peanut'], diets: [], access: [], plus_one: null, kids: 0, note: null,
    },
  });
  await page.goto('?rsvp=' + CODE);
  await expect(page.getByRole('button', { name: /^Change my answer$/ })).toBeVisible({ timeout: 10_000 });
  expect(calls.mine).toEqual([{ idempotency_key: 'key-from-last-week' }]);
  await page.getByRole('button', { name: /^Change my answer$/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Avery Quinn');
  await expect(page.getByRole('textbox', { name: 'Other needs' })).toHaveValue('no stairs please');
  await expect(page.getByRole('group', { name: 'Allergies' }).getByRole('button', { name: /^Peanut$/ })).toHaveAttribute('aria-pressed', 'true');

  // Changing it re-sends with the SAME key, so the server updates her row.
  await page.getByRole('button', { name: /^Send my reply$/ }).click();
  await expect(page.getByRole('button', { name: /^Delete my reply$/ })).toBeVisible();
  expect(calls.submit.at(-1).idempotency_key).toBe('key-from-last-week');
  expect(calls.submit.at(-1).allergens).toEqual(['Peanut']);
});
