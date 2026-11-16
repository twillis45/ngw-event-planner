// ─── THE HOST ANSWERS GUESTS' QUESTIONS FROM THE GUEST LIST (11/16/2026) ─────
//
// Owner ruling A. Host side: a "Questions & updates" section INSIDE the
// existing Guest list sheet (no new tab), unanswered first, reply, block; one
// line in the event home's "Who's confirmed" block — "N guest questions
// waiting" — only when N > 0, opening that section; and "Ana last opened the
// invite Nov 16, 8:42 PM" plus anonymous daily totals. Never "read"/"seen".
//
// The API is mocked at the e2e bundle's fake host, as aHelperGetsTheirJobByLink
// does. Everything here is synthetic.
import { test, expect, settled, sheetSettled, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT_ID = 'gq-e2e';
const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';

const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', startTime: '16:00', startTimeSource: 'host', hostName: 'Vida Ramos',
  rsvpCode: 'gq-e2e-code-000000001',
  guests: [{ id: 'g1', name: 'Ana Ruiz', rsvp: 'Yes' }, { id: 'g2', name: 'Sam Lee', rsvp: 'Yes' }],
  vendors: [], budget: [], timeline: [],
};

test.use({ timezoneId: 'America/New_York' });

const boot = async (page, date = dateIn(10)) => {
  await page.addInitScript(([ev, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
  }, [EVENT, date]);
};

const ROWS = [
  { id: T2, guest_name: 'Sam Lee', unanswered: false, blocked: false, last_guest_at: '2026-11-15T15:00:00Z', last_host_at: '2026-11-15T16:00:00Z',
    created_at: '2026-11-15T15:00:00Z', last_author: 'host', last_body: 'Yes, bring the folding chairs.', message_count: 2, email_notices: false },
  { id: T1, guest_name: 'Ana Ruiz', unanswered: true, blocked: false, last_guest_at: '2026-11-16T20:00:00Z', last_host_at: null,
    created_at: '2026-11-16T20:00:00Z', last_author: 'guest', last_body: 'Is there parking nearby?', message_count: 1, email_notices: false },
];

const mock = async (page, rows = ROWS) => {
  const calls = { reply: [], block: [] };
  let blocked = false;
  await page.route(`${API}/api/events/${EVENT_ID}/guest-threads`, (r) => r.fulfill({ status: 200, json: rows }));
  await page.route(`${API}/api/events/${EVENT_ID}/guest-threads/${T1}`, (r) => r.fulfill({ status: 200, json: {
    ok: true, thread: { ...rows.find((x) => x.id === T1), blocked },
    messages: [{ author: 'guest', body: 'Is there parking nearby?', created_at: '2026-11-16T20:00:00Z' }] } }));
  await page.route(`${API}/api/events/${EVENT_ID}/guest-threads/${T1}/reply`, (r) => {
    calls.reply.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, json: { ok: true, message: { author: 'host', body: 'x', created_at: '2026-11-16T21:00:00Z' } } });
  });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-threads/${T1}/block`, (r) => {
    calls.block.push(r.request().postDataJSON());
    blocked = r.request().postDataJSON().blocked;
    return r.fulfill({ status: 200, json: { ok: true, thread: {} } });
  });
  await page.route(`${API}/api/events/${EVENT_ID}/invite-opens`, (r) => r.fulfill({ status: 200, json: {
    ok: true,
    guests: [{ guest_name: 'Ana Ruiz', last_opened_at: '2026-11-17T01:42:00Z', rsvp_id: 1, thread_id: T1 }],
    days: [{ day: '2026-11-16', opens: 5, distinct_devices: 3 }, { day: '2026-11-15', opens: 1, distinct_devices: 1 }],
  } }));
  return calls;
};

const home = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
};

test('"1 guest question waiting" on the event home opens the Guest list at Questions & updates', async ({ page }) => {
  await boot(page);
  await mock(page);
  await home(page);
  const line = page.locator('[data-who-questions]');
  await expect(line).toHaveText('1 guest question waiting');
  // A tap target a thumb can hit.
  expect((await line.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await line.click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText(/Guest list|People/);
  const section = page.locator('[data-host-questions]');
  await expect(section).toBeVisible();
  await expect(section).toBeInViewport();
  // Unanswered first.
  const rows = section.locator('[data-thread]');
  await expect(rows.first()).toHaveAttribute('data-unanswered', 'true');
  await expect(rows.first()).toContainText('Ana Ruiz');
  await expect(rows.first()).toContainText('Waiting on your answer');
  await expect(rows.nth(1)).toContainText('Sam Lee');
});

test('no line at all when nothing is waiting', async ({ page }) => {
  await boot(page);
  await mock(page, [ROWS[0]]);
  await home(page);
  await expect(page.locator('[data-who-confirmed]')).toBeVisible();
  await expect(page.locator('[data-who-questions]')).toHaveCount(0);
});

test('the host replies and can block; with no opt-in the page claims no email', async ({ page }) => {
  await boot(page);
  const calls = await mock(page);
  await home(page);
  await page.locator('[data-who-questions]').click();
  await sheetSettled(page);
  const section = page.locator('[data-host-questions]');
  await section.getByRole('button', { name: 'Answer Ana' }).click();
  await expect(section.locator('.guest-msg')).toContainText('Is there parking nearby?');
  await expect(section.locator('[data-reply-email]')).toHaveText('It shows on Ana’s invite. Ana didn’t ask for email.');
  const box = section.getByRole('textbox', { name: 'Your reply to Ana Ruiz' });
  await box.fill('Street parking on Pine — the lot fills up by 4.');
  await section.getByRole('button', { name: 'Send reply' }).click();
  await expect(section.locator('[data-reply-status]')).toHaveText('Sent — it shows on Ana’s invite.');
  expect(calls.reply).toEqual([{ body: 'Street parking on Pine — the lot fills up by 4.' }]);
  await expect(section).not.toContainText(/emailed (to|her|him|them)|delivered/i);

  await section.getByRole('button', { name: 'Block Ana’s questions' }).click();
  await expect(section.locator('[data-reply-status]')).toHaveText('Ana can’t send more questions.');
  expect(calls.block).toEqual([{ blocked: true }]);
  await expect(section.getByRole('button', { name: 'Unblock Ana' })).toBeVisible();

  // Geometry at 390: nothing in the section runs off the side.
  const overflow = await page.evaluate(() => {
    const s = document.querySelector('[data-host-questions]');
    return [...s.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().right > window.innerWidth + 0.5).length;
  });
  expect(overflow).toBe(0);
});

test('"Ana last opened the invite Nov 16, 8:42 PM" and the anonymous daily totals', async ({ page }) => {
  await boot(page);
  await mock(page);
  await home(page);
  await page.locator('[data-who-questions]').click();
  await sheetSettled(page);
  const opens = page.locator('[data-invite-opens]');
  await expect(opens.locator('[data-opened-guest]')).toHaveText(['Ana last opened the invite Nov 16, 8:42 PM']);
  await expect(opens.locator('[data-opened-day]')).toHaveText(['Nov 16: opened 5 times on 3 devices', 'Nov 15: opened once on 1 device']);
  await expect(opens).not.toContainText(/\bread\b(?! )|\bseen\b/);
  await expect(opens).toContainText('Opening isn’t reading.');
});


// Reply notices (#151, 11/16/2026): a guest who ticked "email me" gets the
// reply by email, and the host is told so, before and after sending.
test('when the guest asked for email, the host is told the reply is emailed', async ({ page }) => {
  await boot(page);
  await mock(page, ROWS.map((r) => (r.id === T1 ? { ...r, email_notices: true } : r)));
  await home(page);
  await page.locator('[data-who-questions]').click();
  await sheetSettled(page);
  const section = page.locator('[data-host-questions]');
  await section.getByRole('button', { name: 'Answer Ana' }).click();
  await expect(section.locator('[data-reply-email]')).toHaveText('It shows on Ana’s invite, and Ana gets it by email.');
  await section.getByRole('textbox', { name: 'Your reply to Ana Ruiz' }).fill('See you at 4.');
  await section.getByRole('button', { name: 'Send reply' }).click();
  await expect(section.locator('[data-reply-status]')).toHaveText('Sent — it shows on Ana’s invite, and Ana gets it by email.');
});
