// ─── THE CHECKLIST BUTTONS LINE UP (owner, 11/16/2026) ──────────────────────
//
// "Make sure the CTAs are balanced — they don't look good." On the 11/16
// checklist screenshot one row's buttons started at two left edges: the row's
// "Open the space list →" at the text column (62px), the helper buttons under it
// 10px further left, and "Map the spread →" floated beside the due line at the
// far right. Every button a row carries now starts where the row's title does.
// Measured, not eyeballed: each button's left edge against its own row title.
// Synthetic event (same as aHelperGetsTheirJobByLink).
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

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
};


const lefts = (page) => page.evaluate(() => {
  const out = [];
  for (const row of document.querySelectorAll('.frow')) {
    const title = row.querySelector('.f-name');
    if (!title) continue;
    const tx = Math.round(title.getBoundingClientRect().x);
    const btns = [];
    // every button under a row sits in the sibling .row-assign: the row's own
    // action first (11/16: moved out of the row's <button>, axe
    // nested-interactive), then helper / assign
    const sib = row.nextElementSibling && row.nextElementSibling.classList.contains('row-assign') ? row.nextElementSibling : null;
    // and the helper's "Call Jordan" (a tel: link styled as the same control):
    // in a section panel (both themes since 11/22/2026) the row is 34px
    // narrower, it takes its own line, and a buttons-only walk read the line
    // it took as a 70px gap.
    if (sib) btns.push(...sib.querySelectorAll(':scope > button, :scope > a.rowlink, :scope > .row-act > button'));
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if (r.width) out.push({ row: title.innerText.slice(0, 30), label: b.innerText.slice(0, 30), dx: Math.round(r.x) - tx, left: Math.round(r.x), top: Math.round(r.top), bottom: Math.round(r.bottom) });
    }
  }
  return out;
});

test('every checklist button starts at its row title’s left edge', async ({ page }) => {
  await boot(page);
  await mockHost(page);
  await openChecklist(page);
  const all = await lefts(page);
  expect(all.length, 'the checklist has rows with buttons to measure').toBeGreaterThanOrEqual(3);
  expect(all.some((b) => /Mark Jordan Avery confirmed/.test(b.label)), 'a helper row is among them').toBe(true);
  expect(all.some((b) => / →$/.test(b.label)), 'a row link is among them').toBe(true);
  const off = all.filter((b) => Math.abs(b.dx) > 1);
  expect(off, JSON.stringify(off)).toEqual([]);
});

test('the buttons under one row keep one even gap between them', async ({ page }) => {
  await boot(page);
  await mockHost(page);
  await openChecklist(page);
  const chairs = (await lefts(page)).filter((b) => /folding chairs/.test(b.row));
  // the row link, then "Jordan Avery — not told yet", "Send Jordan their job", "Call Jordan", "Mark Jordan Avery confirmed"
  expect(chairs.length).toBe(5);
  const gaps = chairs.slice(1).map((b, i) => b.top - chairs[i].bottom);
  // one gap (12px, --sp-3) between every pair — it was 3px under the row link and 12 below
  expect(Math.max(...gaps) - Math.min(...gaps), JSON.stringify(gaps)).toBeLessThanOrEqual(2);
  expect(Math.min(...gaps), JSON.stringify(gaps)).toBeGreaterThanOrEqual(10);
});


// Nothing interactive inside a row's own <button> (axe on live, 11/16/2026:
// nested-interactive, serious, 36 rows — the action was a role=button span
// inside it, which a screen reader cannot reach as a button).
test('no checklist row hides a button inside its own button', async ({ page }) => {
  await boot(page);
  await mockHost(page);
  await openChecklist(page);
  const nested = await page.evaluate(() => [...document.querySelectorAll('button.frow')]
    .filter((b) => b.querySelector('button, [role="button"], a[href], input, select, textarea, [tabindex]'))
    .map((b) => (b.innerText || '').slice(0, 40)));
  expect(nested).toEqual([]);
  const act = page.locator('.row-assign [data-row-action]').first();
  await expect(act).toBeVisible();
  expect(await act.evaluate((el) => el.tagName)).toBe('BUTTON');
});
