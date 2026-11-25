// ─── A HELPER GETS THEIR JOB BY LINK, AND THEIR ANSWER COMES BACK ───────────
//
// Owner-approved 11/15/2026, free. A host who gave Jordan a job used to tap
// "Confirm with Jordan" by hand. Now:
//   1. the host taps "Send Jordan their job" — the host's OWN Messages app gets
//      a text saying who is asking, what, when, where, and why, with the link;
//      the app says the phone sends it, never that it was sent;
//   2. Jordan opens the link with no sign-in and sees the job and two answers;
//   3. "I've got it" or "I can't" (with a note) lands back on the host's row.
//
// The API is mocked at the e2e bundle's fake host, as the vendor-page spec
// does. Everything here is synthetic.
import { test, expect, settled, openSectionByName, dateIn, revealChecklistStep, openAllPhases } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'helpercodeabcdef123456';
const EVENT_ID = 'hl-e2e';

const EVENT = {
  id: EVENT_ID, name: 'Friendsgiving at Pine Street', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', venueAddress: '12 Pine Street, Springfield',
  startTime: '16:00', startTimeSource: 'host', hostName: 'Casey Morgan',
  guests: [
    { id: 'g-jordan', name: 'Jordan Avery', phone: '(555) 010-0101', rsvp: 'Yes' },
    { id: 'g-riley', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] },
  ],
  vendors: [], budget: [],
  timeline: [
    { id: 't-chairs', task: 'Bring folding chairs', owner: 'Jordan Avery', week: 'Week of' },
  ],
};

const boot = async (page) => {
  await page.addInitScript(([ev, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Casey Morgan' }));
  }, [EVENT, dateIn(20)]);
};

const mockHost = async (page, answers = []) => {
  const calls = { mint: [] };
  await page.route(`${API}/api/events/${EVENT_ID}/helper-links`, (route) => {
    calls.mint.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, json: { ok: true, code: CODE, helper_key: 'g-jordan' } });
  });
  await page.route(`${API}/api/events/${EVENT_ID}/helper-confirmations`,
    (route) => route.fulfill({ status: 200, json: answers }));
  return calls;
};

const openChecklist = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await settled(page);
  // The helper's step, with its controls on screen: Up next shows them, else
  // the step opens in place (cohesion batch D, 11/24/2026).
  await revealChecklistStep(page, 'Bring folding chairs');
};

test.describe('the host sends it', () => {
  test('"Send Jordan their job" writes who / what / why into the host’s own Messages', async ({ page }) => {
    await boot(page);
    const calls = await mockHost(page);
    await openChecklist(page);

    // A call goes straight to the helper's number (owner, 11/20/2026).
    await expect(page.getByRole('link', { name: 'Call Jordan', exact: true })).toHaveAttribute('href', 'tel:5550100101');
    const send = page.getByRole('button', { name: 'Send Jordan their job', exact: true });
    await expect(send).toBeVisible();
    await send.click();

    const handoff = page.locator('.helper-handoff');
    await expect(handoff).toBeVisible();
    // The phone sends it; the app says so and claims nothing else.
    await expect(handoff).toContainText('Nothing is sent from here');
    await expect(handoff).not.toContainText(/\bsent\b(?! from here)|delivered/);
    expect(calls.mint).toEqual([{ helper_name: 'Jordan Avery' }]);

    const href = await handoff.getByRole('link', { name: 'Text Jordan' }).getAttribute('href');
    expect(href.startsWith('sms:5550100101?&body=')).toBe(true);
    const body = decodeURIComponent(href.split('&body=')[1]);
    // WHO
    expect(body).toMatch(/^Hi Jordan — it's Casey\./);
    // WHAT
    for (const s of ['Friendsgiving at Pine Street', '4:00 PM', 'Pine Street Commons', '12 Pine Street, Springfield', 'Bring folding chairs']) {
      expect(body, s).toContain(s);
    }
    // WHY + the link, on this app's own origin
    expect(body).toMatch(/Tap to say yes, or tell me if you can't: https?:\/\/\S+\?helper=helpercodeabcdef123456$/);
    // never another guest
    expect(body).not.toContain('Riley');
    // a chair job is not food: no allergy note
    expect(body).not.toMatch(/allergic/);
  });
});

test.describe('the helper answers', () => {
  const HELPER = {
    helperName: 'Jordan Avery', hostName: 'Casey Morgan', eventName: 'Friendsgiving at Pine Street',
    eventDate: dateIn(20), startTime: '16:00', venue: 'Pine Street Commons', venueAddress: '12 Pine Street, Springfield',
    jobs: [{ kind: 'task', label: 'Bring folding chairs' }], answer: null,
  };
  const mockHelper = async (page, helper = HELPER) => {
    const calls = { answer: [] };
    await page.route(`${API}/api/public/helper/${CODE}`, (route) => route.fulfill({ status: 200, json: { ok: true, helper } }));
    await page.route(`${API}/api/public/helper/${CODE}/answer`, (route) => {
      calls.answer.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, json: { ok: true, submitted_at: new Date().toISOString() } });
    });
    return calls;
  };
  const openHelper = async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?helper=' + CODE);
    await expect(page.locator('[data-surface="helper-link-v2"]')).toBeVisible();
  };

  test('the page shows who is asking, the event, the job, and two answers — and no host shell', async ({ page }) => {
    await mockHelper(page);
    await openHelper(page);
    await expect(page.locator('h1')).toHaveText('Friendsgiving at Pine Street');
    await expect(page.getByText('From Casey Morgan').first()).toBeVisible();
    await expect(page.locator('[data-helper="jobs"]')).toContainText('Bring folding chairs');
    await expect(page.getByRole('button', { name: 'I’ve got it', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'I can’t', exact: true })).toBeVisible();
    await expect(page.locator('.tabbar, .next-bar, .splash')).toHaveCount(0);
  });

  // Audit 2, lane E (P1-1, P0-4): every day of a weekend, and the one place
  // line, street, City, ST ZIP, as the host's app prints it.
  test('the page reads every day of the weekend and the whole address', async ({ page }) => {
    await mockHelper(page, { ...HELPER, eventDate: '2027-12-13', endDate: '2027-12-15', venue: 'The Boathouse',
      venueAddress: '9 Dock Rd', venueCity: 'Annapolis', venueState: 'MD', venueZip: '21401', venueKind: 'venue' });
    await openHelper(page);
    await expect(page.locator('.vb2-when')).toHaveText('Monday, December 13 – Wednesday, December 15 · 4:00 PM');
    await expect(page.locator('[data-helper="where"]')).toHaveText('The Boathouse · 9 Dock Rd, Annapolis, MD 21401');
  });

  // Audit 2, lane E P2-4: the email's "I can't" opens the page on that answer.
  test('the email’s "I can’t" opens the page ready to say so, and sends only on a tap', async ({ page }) => {
    const calls = await mockHelper(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?helper=' + CODE + '&answer=declined');
    await expect(page.getByText('Tell Casey you can’t')).toBeVisible();
    expect(calls.answer).toHaveLength(0);
    await page.getByRole('button', { name: 'Send to Casey', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('can’t make it');
    expect(calls.answer).toHaveLength(1);
    expect(calls.answer[0]).toMatchObject({ state: 'declined' });
  });

  test('"I’ve got it" posts a confirm and the host’s row then reads "said yes"', async ({ page }) => {
    const calls = await mockHelper(page);
    await openHelper(page);
    await page.getByRole('button', { name: 'I’ve got it', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('You’re on it');
    expect(calls.answer).toHaveLength(1);
    expect(calls.answer[0]).toMatchObject({ state: 'confirmed' });
    expect(calls.answer[0].idempotency_key).toBeTruthy();

    // The host's side, with the answer the server now holds.
    await boot(page);
    await mockHost(page, [{ helper_key: 'g-jordan', state: 'confirmed', note: null, submitted_at: new Date().toISOString(), updated_at: null }]);
    await page.addInitScript(() => {
      const evs = JSON.parse(localStorage.getItem('ngw-events'));
      evs[0].helperLinkIds = ['g-jordan'];
      localStorage.setItem('ngw-events', JSON.stringify(evs));
    });
    await openChecklist(page);
    await expect(page.locator('.assign-btn', { hasText: 'Jordan Avery — said yes' })).toBeVisible();
    // the hand-tapped confirm steps aside once Jordan has answered
    await expect(page.getByRole('button', { name: /Jordan Avery confirmed/ })).toHaveCount(0);
    // ...and so does "Send Jordan their job": Jordan already has it and said yes
    // (owner, 11/16/2026: "make sure CTAs on your checklist are justified").
    await expect(page.getByRole('button', { name: 'Send Jordan their job', exact: true })).toHaveCount(0);
  });

  test('"I can’t" with a note posts it, and the host sees it with the note', async ({ page }) => {
    const calls = await mockHelper(page);
    await openHelper(page);
    await page.getByRole('button', { name: 'I can’t', exact: true }).click();
    await page.getByLabel('Note').fill('Out of town that week');
    await page.getByRole('button', { name: 'Send to Casey', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('can’t make it');
    expect(calls.answer[0]).toMatchObject({ state: 'declined', note: 'Out of town that week' });
    // Counted on the helper's page: no or yes, never the note (11/20/2026).
    expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'helper_answered')))
      .toEqual([{ event: 'helper_answered', answer: 'no' }]);

    await boot(page);
    await mockHost(page, [{ helper_key: 'g-jordan', state: 'declined', note: 'Out of town that week', submitted_at: new Date().toISOString(), updated_at: null }]);
    await page.addInitScript(() => {
      const evs = JSON.parse(localStorage.getItem('ngw-events'));
      evs[0].helperLinkIds = ['g-jordan'];
      localStorage.setItem('ngw-events', JSON.stringify(evs));
    });
    await openChecklist(page);
    await expect(page.locator('.assign-btn', { hasText: 'Jordan Avery — can’t do it' })).toBeVisible();
    await expect(page.locator('.helper-answer')).toContainText('Out of town that week');
    // Jordan said no: sending Jordan the same job again is not the next step —
    // giving it to someone else is, and that button stays.
    await expect(page.getByRole('button', { name: 'Send Jordan their job', exact: true })).toHaveCount(0);
    await expect(page.locator('.assign-btn', { hasText: 'Jordan Avery — can’t do it' })).toBeVisible();
  });

  test('a failed answer says so and keeps the note — never a fake success', async ({ page }) => {
    await mockHelper(page);
    await page.route(`${API}/api/public/helper/${CODE}/answer`, (route) => route.fulfill({ status: 500, json: { detail: 'nope' } }));
    await openHelper(page);
    await page.getByRole('button', { name: 'I can’t', exact: true }).click();
    await page.getByLabel('Note').fill('Maybe next time');
    await page.getByRole('button', { name: 'Send to Casey', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('That didn’t go through.');
    await expect(page.getByLabel('Note')).toHaveValue('Maybe next time');
    expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'helper_answered'))).toEqual([]);
  });

  test('a code that does not resolve is a dead link, said plainly', async ({ page }) => {
    await page.route(`${API}/api/public/helper/${CODE}`, (route) => route.fulfill({ status: 404, json: { detail: 'helper link not found' } }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?helper=' + CODE);
    await expect(page.getByRole('heading', { name: 'This link isn’t live anymore' })).toBeVisible();
  });
});

// ─── EVERY CHECKLIST BUTTON EARNS ITS PLACE (owner, 11/16/2026) ──────────────
// "Make sure CTAs on your checklist are justified." Found on the 11/15 live
// screenshots: a row the plan had already handled still offered "Give this to
// someone" and wore "Do now" / "past its window"; and the record-only confirm
// read "Confirm with Jordan", which sounds like the app contacts Jordan. It
// only records the host's word (UX_07 level 4: say "Mark").
test.describe('checklist buttons are justified', () => {
  const withRows = (rows) => async (page) => {
    await page.addInitScript(([ev, iso, tl]) => {
      localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso, timeline: tl }]));
      localStorage.setItem('ngw-hostv2-last-event', ev.id);
      localStorage.setItem('ngw-v2-splash-seen', '1');
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
      localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Casey Morgan' }));
    }, [EVENT, dateIn(20), rows]);
  };

  test('a row your plan already handled offers no assignment and no urgency', async ({ page }) => {
    await withRows([
      // 11/23/2026 (part 2, owner ruling): a row is done by the facts it
      // declares, never by its words, so the handled row declares its fact.
      { id: 't-date', task: 'Set the date', offsetDays: 60, facts: ['date-set'] },
      { id: 't-open', task: 'Bring folding chairs', offsetDays: 60 },
    ])(page);
    await mockHost(page);
    await openChecklist(page);
    await openAllPhases(page);
    const handled = page.locator('.frow', { hasText: 'Set the date' });
    await expect(handled.getByText('your plan did this · confirm')).toBeVisible();
    await expect(handled).not.toContainText(/Do now|due now|past its window/);
    await expect(page.locator('.row-assign').filter({ has: page.locator('[aria-label*="Set the date"]') })).toHaveCount(0);
    // control: the open row keeps both, so the absence above is the fix
    const open = await revealChecklistStep(page, 'Bring folding chairs');
    await expect(open).toContainText(/Do now|due now|past its window/);
    await expect(page.getByRole('button', { name: 'Assign Bring folding chairs to someone' })).toBeVisible();
  });

  test('the record-only confirm says it records: "Mark Jordan Avery confirmed"', async ({ page }) => {
    await boot(page);
    await mockHost(page);
    await openChecklist(page);
    const mark = page.getByRole('button', { name: 'Mark Jordan Avery confirmed for Bring folding chairs', exact: true });
    await expect(mark).toBeVisible();
    await expect(mark).toHaveText('Mark Jordan Avery confirmed');
    await expect(page.getByText(/^Confirm with Jordan/)).toHaveCount(0);
    await mark.click();
    await expect(page.locator('.assign-btn', { hasText: 'Jordan Avery — confirmed' })).toBeVisible();
    await expect(page.getByText('Not confirmed after all', { exact: true })).toBeVisible();
  });
});
