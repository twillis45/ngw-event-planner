// ─── THE DATE POLL ASKS ON THE INVITE (owner pick B, 11/21/2026) ─────────────
//
// Group Trip's "Offer two or three date ranges…" opens Date & time on "Dates
// to offer". Guests tick every range that works on the invite, BEFORE the
// attendance question (the prototype asked after Yes), and the ticks ride the
// reply as `date_picks` (migration 034). The host sees "N can make it —
// names" per range; "Use these dates" sets the dates and checks the row off.
// Signed out, the sheet says the poll needs the account and counts nothing new.
// Jest twin: src/lib/__tests__/theDatePollAsksOnTheInvite.test.js.
import { test, expect, settled, sheetSettled, openSectionByName, checklistStepAction } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const STEP = 'Offer two or three date ranges and give everyone three days to answer';
const OPTS = [
  { id: 'd1', start: '2027-01-30', end: '2027-02-02' },
  { id: 'd2', start: '2027-02-13', end: '2027-02-16' },
  { id: 'd3', start: '2027-02-27', end: '2027-03-02' },
];
const EVENT = {
  id: 'e2e-dates', name: 'Gulf Shores girls trip', type: 'Group Trip', date: '', createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
  venue: 'Gulf Shores, AL', venueCity: 'Gulf Shores', venueState: 'AL', guestMode: 'list', guestEstimate: 6, guestCountSource: 'host',
  dateOptions: OPTS, vendors: [], budget: [], foodChoices: {},
  guests: [
    { id: 'g1', name: 'Ana Ruiz', rsvp: 'Yes', datePicks: ['d1', 'd2'] },
    { id: 'g2', name: 'Bree Cole', rsvp: 'Maybe', datePicks: ['d2'] },
    { id: 'g3', name: 'Cam Ito', rsvp: 'Yes', datePicks: ['d2', 'd3'] },
    { id: 'g4', name: 'Dee Park', rsvp: '' },
  ],
  timeline: [{ id: 'pbt-e2e-dates-t_dates', task: STEP, leadDays: 90, week: '3 months out', done: false, owner: '', category: 'planning', phase: 'planning' }],
};

const boot = async (page, e) => {
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.goto('?elegant=1');
  await settled(page);
};
const stored = (page, id) => page.evaluate((i) => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((x) => x.id === i) || {}), id);

test('the row opens Dates to offer: each range says who can make it, and "Use these dates" sets them and checks the row off', async ({ page }) => {
  await boot(page, EVENT);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const btn = (await checklistStepAction(page, 'Ask on the invite'));
  await expect(btn).toHaveCount(1);
  await btn.click();
  await sheetSettled(page);
  const poll = page.locator('.sheet').last().locator('[data-date-poll]');
  await expect(poll).toBeVisible();
  await expect(poll.locator('[data-date-option]')).toHaveCount(3);
  // Signed out (this build has no account): said plainly.
  await expect(poll).toContainText('Sign in to ask');
  const b = poll.locator('[data-date-option="d2"]');
  await expect(b).toContainText('B · Sat Feb 13 – Tue Feb 16');
  await expect(b.locator('[data-date-tally]')).toHaveText('3 can make it — Ana, Bree, Cam');
  await expect(poll.locator('[data-date-option="d1"] [data-date-tally]')).toHaveText('1 can make it — Ana');
  await b.getByRole('button', { name: 'Use these dates' }).click();
  await expect.poll(async () => { const s = await stored(page, EVENT.id); return [s.date, s.endDate, s.dateOptionUsed]; })
    .toEqual(['2027-02-13', '2027-02-16', 'd2']);
  await expect(b).toContainText('Your dates');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const row = page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Offer two or three date ranges' });
  await expect(row).toHaveClass(/\bgot\b/);
});

test('a host can add a range and take the poll off the invite', async ({ page }) => {
  await boot(page, { ...EVENT, id: 'e2e-dates-edit', dateOptions: [OPTS[0]], guests: [] });
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Ask on the invite')).click();
  await sheetSettled(page);
  const poll = page.locator('.sheet').last().locator('[data-date-poll]');
  await poll.getByRole('button', { name: 'Add another range' }).click();
  await poll.getByLabel('Range B starts').fill('2027-03-13');
  await poll.getByLabel('Range B ends').fill('2027-03-16');
  await expect.poll(async () => (await stored(page, 'e2e-dates-edit')).dateOptions).toEqual([OPTS[0], { id: 'd2', start: '2027-03-13', end: '2027-03-16' }]);
  await poll.getByRole('button', { name: 'Take it off the invite' }).click();
  await expect.poll(async () => (await stored(page, 'e2e-dates-edit')).dateOptions).toEqual([]);
});

const CODE = 'date-poll-invite-0001';
const PUBLIC = { id: 'ev-date-poll', name: 'Gulf Shores girls trip', type: 'Group Trip', venue: 'Gulf Shores, AL', rsvpCode: CODE, goingCount: 2, dateOptions: OPTS };

test('on the invite, the dates come before the attendance question, and the ticks ride the reply', async ({ page }) => {
  const sent = [];
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: PUBLIC } }));
  await page.route(`${API}/api/public/rsvp/${CODE}`, (r) => { sent.push(r.request().postDataJSON()); return r.fulfill({ status: 200, json: { ok: true, submitted_at: '2026-11-21T12:00:00Z' } }); });
  await page.goto('?rsvp=' + CODE);
  const yes = page.getByRole('radio', { name: /Yes, I.m in/i }).first();
  await expect(yes).toBeVisible();
  await page.waitForTimeout(2600);   // past the staged entrance
  const poll = page.locator('[data-invite-dates]');
  await expect(poll.getByRole('checkbox')).toHaveCount(3);
  const [pollBox, yesBox] = [await poll.boundingBox(), await yes.boundingBox()];
  expect(pollBox.y + pollBox.height).toBeLessThanOrEqual(yesBox.y);
  await poll.getByRole('checkbox', { name: 'Sat Feb 13 – Tue Feb 16' }).click();
  await poll.getByRole('checkbox', { name: 'Sat Feb 27 – Tue Mar 2' }).click();
  await expect(poll.getByRole('checkbox', { name: 'Sat Feb 13 – Tue Feb 16' })).toHaveAttribute('aria-checked', 'true');
  for (const box of await poll.getByRole('checkbox').all()) expect((await box.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await yes.click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Em Shah');
  await page.getByRole('button', { name: /^Send my reply$/ }).click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].date_picks).toEqual(['d2', 'd3']);
});

test('an invite with no ranges asks no date question', async ({ page }) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: { ...PUBLIC, dateOptions: undefined, date: '2027-02-13' } } }));
  await page.goto('?rsvp=' + CODE);
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await expect(page.locator('[data-invite-dates]')).toHaveCount(0);
});
