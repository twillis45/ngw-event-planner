// ─── A GUEST ASKS THE HOST, AND THE INVITE SAYS IT WAS OPENED (11/16/2026) ───
//
// Owner ruling A: narrow, not chat. From the invite link a guest asks the host
// a question, sees her own thread with the host's answers labeled "From your
// host", and may leave an email with a PROMINENT checkbox directly under it,
// unchecked by default; ticked, it promises an email when the host replies or
// posts an update, both of which are sent. Loading the invite tells the server it was opened (throttled
// there), and the page says so in plain words: never "read" or "seen".
//
// The guest is a stranger: empty storage, the invite from the (mocked) backend
// at the e2e bundle's fake host, as aGuestCanChangeOrDeleteHerReply does.
// Measured at 390px where layout matters. Everything here is synthetic.
import { test, expect, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'guest-asks-host-0001';
const EVENT_ID = 'ev-guest-asks';
const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'friendsgiving', date: dateIn(10),
  startTime: '16:00', venue: 'Pine Street Commons', rsvpCode: CODE, hostNames: 'Vida Ramos', goingCount: 4,
};

const serve = async (page, { thread = null, askStatus = 200 } = {}) => {
  const calls = { ask: [], email: [], mine: [], opened: [], del: [] };
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
  await page.route(`${API}/api/public/invite/${CODE}/opened`, (r) => {
    calls.opened.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, json: { ok: true } });
  });
  let current = thread;
  await page.route(`${API}/api/public/questions/${CODE}/mine`, (r) => {
    calls.mine.push(r.request().postDataJSON());
    return current ? r.fulfill({ status: 200, json: { ok: true, thread: current } }) : r.fulfill({ status: 404, json: { detail: 'none' } });
  });
  await page.route(`${API}/api/public/questions/${CODE}/ask`, (r) => {
    const body = r.request().postDataJSON();
    calls.ask.push(body);
    if (askStatus !== 200) return r.fulfill({ status: askStatus, json: { detail: 'nope' } });
    current = {
      guest_name: body.name, email: null, email_opt_in: false, closed: false,
      messages: [...((current && current.messages) || []), { author: 'guest', body: body.body, created_at: '2026-11-16T20:00:00Z' }],
    };
    return r.fulfill({ status: 200, json: { ok: true, thread: current } });
  });
  await page.route(`${API}/api/public/questions/${CODE}/email`, (r) => {
    calls.email.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, json: { ok: true, thread: current } });
  });
  await page.route(`${API}/api/public/questions/${CODE}/delete`, (r) => {
    calls.del.push(r.request().postDataJSON());
    current = null;
    return r.fulfill({ status: 200, json: { ok: true, deleted: true } });
  });
  return calls;
};

const open = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?rsvp=' + CODE);
  await expect(page.locator('[data-guest-ask]')).toBeVisible();
};

test('a guest asks; the question goes with her name and her device key, and the page says where it went', async ({ page }) => {
  const calls = await serve(page);
  await open(page);
  const ask = page.locator('[data-guest-ask]');
  await expect(ask.getByRole('heading', { name: 'Ask your host' })).toBeVisible();
  await ask.getByRole('textbox', { name: 'Name to sign your question' }).fill('Ana Ruiz');
  await ask.getByRole('textbox', { name: 'Your question for your host' }).fill('Is there parking nearby?');
  await ask.getByRole('button', { name: 'Send to your host' }).click();
  await expect(ask.locator('[data-ask-status]')).toHaveText('Sent to Vida’s plan. Vida’s answer shows here, on this invite.');
  expect(calls.ask).toHaveLength(1);
  expect(calls.ask[0]).toMatchObject({ name: 'Ana Ruiz', body: 'Is there parking nearby?' });
  expect(calls.ask[0].guest_key.length).toBeGreaterThanOrEqual(16);
  // No email given: nothing about email was sent.
  expect(calls.email).toHaveLength(0);
  await expect(ask.locator('.guest-msg')).toHaveCount(1);
  await expect(ask.locator('.guest-msg').first()).toContainText('You asked');
});

test('the host’s answer shows as "From your host" on the same phone', async ({ page }) => {
  await serve(page, { thread: { guest_name: 'Ana Ruiz', email: null, email_opt_in: false, closed: false, messages: [
    { author: 'guest', body: 'Is there parking nearby?', created_at: '2026-11-16T20:00:00Z' },
    { author: 'host', body: 'Street parking on Pine — the lot fills up by 4.', created_at: '2026-11-16T21:00:00Z' },
  ] } });
  // Her device key exists from an earlier visit.
  await page.addInitScript(([k]) => localStorage.setItem(k, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    [`ngw-rsvp-idemp-${EVENT_ID}:${CODE}`]);
  await open(page);
  const host = page.locator('[data-guest-ask] .guest-msg.from-host');
  await expect(host).toContainText('From your host');
  await expect(host).toContainText('Street parking on Pine');
});

test('the email checkbox is prominent, directly under the email, unchecked, and promises no email today', async ({ page }) => {
  const calls = await serve(page);
  await open(page);
  const ask = page.locator('[data-guest-ask]');
  const email = ask.getByRole('textbox', { name: 'Email for answers — optional' });
  const box = ask.locator('[data-email-optin]');
  const check = box.getByRole('checkbox');
  await expect(check).not.toBeChecked();
  await expect(box).toContainText('Email me when Vida replies or posts an update.');
  await expect(box).not.toContainText('coming soon');        // both are sent now: nothing is promised for later

  // Measured: directly under the email field, full width, a finger-sized target.
  // Both rects in ONE frame: two boundingBox() calls are two frames, and a
  // layout shift between them read as an 18px overlap on main (536d63a, desktop)
  // that the page never had. A real overlap still fails here.
  await expect(box).toBeVisible();
  const [e, b] = await page.evaluate(() => {
    const r = (el) => { const x = el.getBoundingClientRect(); return { x: x.x, y: x.y, width: x.width, height: x.height }; };
    const root = document.querySelector('[data-guest-ask]');
    return [r(root.querySelector('[aria-label="Email for answers — optional"]')), r(root.querySelector('[data-email-optin]'))];
  });
  expect(b.y - (e.y + e.height)).toBeGreaterThanOrEqual(0);
  expect(b.y - (e.y + e.height)).toBeLessThanOrEqual(12);
  expect(b.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(b.width - e.width)).toBeLessThanOrEqual(1);
  const c = await check.boundingBox();
  expect(c.width).toBeGreaterThanOrEqual(20);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // Ticked with an email: stored with the explicit opt-in.
  await ask.getByRole('textbox', { name: 'Name to sign your question' }).fill('Ana Ruiz');
  await ask.getByRole('textbox', { name: 'Your question for your host' }).fill('Can I bring a pie?');
  await email.fill('ana@example.test');
  await box.click();
  await expect(check).toBeChecked();
  await ask.getByRole('button', { name: 'Send to your host' }).click();
  await expect(ask.locator('[data-ask-status]')).toBeVisible();
  expect(calls.email).toHaveLength(1);
  expect(calls.email[0]).toMatchObject({ email: 'ana@example.test', email_opt_in: true });
  expect(calls.email[0].guest_key).toBe(calls.ask[0].guest_key);
});

test('opening the invite is recorded once, and the page says so — never "read" or "seen"', async ({ page }) => {
  const calls = await serve(page);
  await open(page);
  await expect(page.locator('[data-opened-disclosure]')).toHaveText('Your host can see when you last opened this invite.');
  await expect.poll(() => calls.opened.length).toBe(1);
  expect(calls.opened[0].device_id.length).toBeGreaterThanOrEqual(16);
  // A stranger with no reply yet is not identified.
  expect(calls.opened[0].guest_key).toBeUndefined();
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\b(read|seen) (it|your|this)/i);
});

test('a refused question says it did not send and keeps what she typed', async ({ page }) => {
  await serve(page, { askStatus: 503 });
  await open(page);
  const ask = page.locator('[data-guest-ask]');
  await ask.getByRole('textbox', { name: 'Name to sign your question' }).fill('Ana Ruiz');
  await ask.getByRole('textbox', { name: 'Your question for your host' }).fill('Is there parking nearby?');
  await ask.getByRole('button', { name: 'Send to your host' }).click();
  await expect(ask.getByRole('alert')).toContainText('didn’t send');
  await expect(ask.locator('[data-ask-status]')).toHaveCount(0);
  await expect(ask.getByRole('textbox', { name: 'Your question for your host' })).toHaveValue('Is there parking nearby?');
});

test('she can delete her own questions', async ({ page }) => {
  const calls = await serve(page, { thread: { guest_name: 'Ana Ruiz', email: null, email_opt_in: false, closed: false, messages: [
    { author: 'guest', body: 'Is there parking nearby?', created_at: '2026-11-16T20:00:00Z' },
  ] } });
  await page.addInitScript(([k]) => localStorage.setItem(k, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    [`ngw-rsvp-idemp-${EVENT_ID}:${CODE}`]);
  await open(page);
  const ask = page.locator('[data-guest-ask]');
  await ask.getByRole('button', { name: 'Delete my questions' }).click();
  await ask.getByRole('button', { name: 'Delete them' }).click();
  await expect(ask.locator('[data-ask-status]')).toHaveText('Your questions are deleted from your host’s plan.');
  expect(calls.del).toEqual([{ guest_key: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }]);
  await expect(ask.locator('.guest-msg')).toHaveCount(0);
});

// A REPLY COUNT SAYS REPLIES, NOT PEOPLE (audit 2 E P2-1, 11/22/2026). The
// server's goingCount counts yes REPLIES; one yes can bring a plus-one, and
// "4 going" sat beside the host's people count. The line says who said yes.
test('the invite counts yes replies as replies, not as people going', async ({ page }) => {
  await serve(page);
  await open(page);
  await expect(page.getByText('4 have said yes')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b4 going\b/);
});
