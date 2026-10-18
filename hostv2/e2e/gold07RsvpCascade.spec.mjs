// ─── GOLD-07 · ONE REPLY, THE WHOLE CASCADE ─────────────────────────────────
//
// THE GAP THIS CLOSES, measured 2026-10-18 for the redesign gate. Every hop of
// the RSVP cascade had coverage and the CASCADE had none: no spec in either
// suite walked `public RSVP → backend → read-back → canonical attendance →
// Food → Shopping → Seating → Money → the ranked plan`. Seating had no e2e at
// all. That matters more than a missing test usually does, because this is the
// seam the redesign will rebuild first and the one where the guest count —
// the repo's most duplicated derivation — crosses six domains in a row.
//
// WHY A BROWSER, AND WHY ITS OWN BUNDLE. Two reasons, both structural:
//
//   1. jest cannot execute hostv2. The read-back's field mapping — 18 lines of
//      hand-written snake_case → camelCase in HostShellV2 (:6893) — is inline
//      in the shell, so no unit test can reach it. The code's own comment
//      records what a dropped field there costs: "before migration 015 the
//      server dropped these, so a remote guest's ALLERGY answer never reached
//      the host's roster. Data-loss class." Nothing has executed that mapping
//      since.
//   2. The ordinary e2e build bakes NO REACT_APP_API_BASE_URL (measured: the
//      built index chunk's whole env object is `{NODE_ENV:"production"}`), so
//      `isRsvpApiConfigured()` is false, `submitRsvp` throws before it
//      fetches, and the read-back effect returns on its first line. The entire
//      backend leg is unreachable from the shared bundle. Hence dist-gold07,
//      for the same reason and in the same shape as the sync harness's own
//      bundle — see the webServer note in playwright.config.mjs.
//
// THE GUEST IS A STRANGER, deliberately. Her context has empty localStorage,
// so the invite CANNOT resolve from the local pool and must come back from the
// backend — which is what happens to every real guest who taps a link on their
// own phone. A spec that seeded the event into the guest's browser would be
// testing the owner's demo device and calling it a remote RSVP.
//
// AND THE HOST READS BACK WHAT SHE ACTUALLY SENT. The read-back row for Denise
// is built FROM the POST body this spec captured off the wire, not from a
// hand-written fixture that happens to agree with it. A fixture can drift from
// the payload; a captured body cannot.
//
// WHAT "MOVED" MEANS HERE. Every number is measured TWICE in one run, against
// the same bundle and the same price vintage: once with the roster silent,
// once after the replies land. Asserting literal dollars instead would fail on
// the next price refresh for no product reason, and asserting only "it
// changed" would pass if it changed to nonsense. So the shape is: the before
// is genuinely unresolved, the after is a specific resolved value, and the
// direction between them is the one the cascade requires.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { dateIn } from './fixtures.mjs';

// This spec runs ONLY against the gold07 bundle on 5255 — the shared preview on
// 5233 has no API base, so every assertion below would measure the offline
// fallback instead. Addressed absolutely for the same reason crossDeviceSync is.
const BASE = previewUrl(5255);
const API = 'https://gold07-mock.invalid';
const EVENT_ID = 'e2e-gold07';
const CODE = 'gold07';

const ROSTER = ['Denise Harrell', 'Ray Harrell', 'Tonya Brooks', 'Marcus Brooks', 'Alma Pierce', 'June Pierce'];

// A reunion in a rented house, 45 days out, with a reply-by date that has
// already passed. Each of those is load-bearing:
//   · the kitchen (`dest_lodging`) is what makes the shopping list apply at all
//     — a room block withholds it by design (noKitchenNoShoppingList.spec.mjs)
//   · the PAST rsvpDeadline is the only thing that lets the chase job raise
//     (surfaceRegistry:490 — "only a date the host actually set", strictly past)
//   · the guests carry ids because both the chase and the seating raise refuse
//     to fire without a row to land on ("ROW-LEVEL OR NOT AT ALL")
// Dates are LOCAL calendar days via dateIn — see the note on it in fixtures.mjs.
const hostEvent = () => ({
  id: EVENT_ID, name: 'Harrell reunion', type: 'Reunion',
  date: dateIn(45), endDate: dateIn(49),
  rsvpDeadline: dateIn(-3),
  rsvpCode: CODE,
  venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'list', totalBudget: 4000,
  foodChoices: { dest_lodging: 'A house we rent for everyone' },
  budget: [], vendors: [],
  guests: ROSTER.map((name, i) => ({ id: `g${i + 1}`, name })),
});

const publicInvite = {
  ok: true,
  event: {
    id: EVENT_ID, name: 'Harrell reunion', type: 'Reunion',
    date: dateIn(45), endDate: dateIn(49),
    venueCity: 'Santa Fe', state: 'NM', rsvpCode: CODE, goingCount: 0,
  },
};

// ── Page plumbing ──────────────────────────────────────────────────────────
// The catch-all is registered FIRST on purpose: Playwright tries routes
// most-recently-registered first, so a catch-all added last silently shadows
// every specific mock under it. Cost me a run where the invite resolved to
// "this link isn't live anymore" while the request log showed the right URL
// being fetched.
const stubApi = async (page, routes = []) => {
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, json: [] }));
  for (const [url, handler] of routes) await page.route(url, handler);
};

const settled = (page) => page.waitForFunction(() => {
  const sp = document.querySelector('.splash');
  if (sp) {
    const cs = getComputedStyle(sp);
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
  }
  const app = document.querySelector('.app');
  return !!app && (app.innerText || '').trim().length > 120;
}, null, { timeout: 20_000 });

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

// Click by visible text. The reply chips are `button[role=radio]`, the section
// rows are plain buttons, and the sheet's controls are a mix — one DOM walk
// handles all three rather than three locator dialects.
const tap = (page, rx) => page.evaluate((s) => {
  const re = new RegExp(s);
  const el = [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="checkbox"],a')]
    .filter((x) => re.test((x.innerText || '').trim())).pop();
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, rx.source);

const openSection = async (page, name) => {
  await page.evaluate((n) => {
    const el = [...document.querySelectorAll('button,[role="button"],a')]
      .find((x) => (x.innerText || '').trim() === n);
    if (el) el.click();
  }, name);
  await page.waitForTimeout(900);
  const t = await page.evaluate(() => {
    const sh = document.querySelector('.sheet');
    return sh ? (sh.innerText || '').replace(/\s+/g, ' ') : '';
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return t;
};

/** Boot the host shell and read every surface this cascade touches, in one pass. */
const readHost = async (browser, readbackRows) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await stubApi(page, readbackRows
    ? [[`${API}/api/events/${EVENT_ID}/rsvps`, (r) => r.fulfill({ status: 200, json: readbackRows })]]
    : []);
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, hostEvent());
  await page.goto(`${BASE}?elegant=1`);
  await settled(page);
  // The read-back is an async effect that patches the event after first paint.
  // Waiting on the merged roster rather than a fixed sleep: the assertion is
  // then about the app's end state and not about this machine's speed.
  if (readbackRows) {
    await page.waitForFunction(() => /\d+ of \d+ confirmed|planned around/i.test(document.body.innerText || ''),
      null, { timeout: 15_000 }).catch(() => {});
  }
  const out = {
    board: await bodyText(page),
    food: await openSection(page, 'The spread & shopping'),
    money: await openSection(page, 'Your money'),
    seating: await openSection(page, 'Who sits where'),
    guests: await openSection(page, 'Guests'),
  };
  await ctx.close();
  return out;
};

const dollars = (s) => Number(String(s || '').replace(/[^0-9.]/g, '')) || 0;
const spokenFor = (money) => dollars((money.match(/\$([\d,]+) spoken for/) || [])[1]);

test.describe('GOLD-07 — a guest replies and the whole plan moves', () => {
  test('(premise) with the roster silent, every downstream surface says so', async ({ browser }) => {
    // Without this the cascade test below could pass while measuring nothing:
    // every "now it says 7" assertion needs a before that genuinely did not.
    const before = await readHost(browser, null);

    expect(before.board, 'the board counts the replies it is still owed')
      .toMatch(/0 confirmed · 6 replies still out/i);

    // Food and money size to a RANGE, not a number — the honest shape for a
    // roster nobody has answered.
    expect(before.food, 'the food plan has no settled headcount to size to')
      .toMatch(/0–6 guests/);
    expect(before.money, 'and the money says the same thing in its own words')
      .toMatch(/sized for 0–6 guests/i);

    // Seating refuses to invent chairs for people who have not said yes.
    expect(before.seating).toMatch(/once someone says yes/i);
    expect(before.seating, 'nothing is seated because nothing is confirmed').not.toMatch(/Seated so far/i);

    // And the ranked plan is asking for the replies, not for seats.
    expect(before.board).toMatch(/6 guests still have not replied/i);
    expect(before.board, 'seating cannot be the next job when nobody has confirmed')
      .not.toMatch(/still needs? (a )?seats?/i);
  });

  test('a stranger on her own phone answers, and it lands in every domain', async ({ browser }) => {
    // ── 1 · THE GUEST ────────────────────────────────────────────────────
    // Empty localStorage: this browser has never seen the event, so the invite
    // can only come from the backend.
    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    const posted = [];
    await stubApi(guest, [
      [`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: publicInvite })],
      [`${API}/api/public/rsvp/${CODE}`, (r) => {
        posted.push(JSON.parse(r.request().postData() || '{}'));
        return r.fulfill({ status: 200, json: { ok: true, submitted_at: new Date().toISOString() } });
      }],
    ]);
    await guest.goto(`${BASE}?rsvp=${CODE}`);
    await guest.getByLabel('Your name').waitFor({ state: 'visible', timeout: 20_000 });

    // BOUNDARY 1 — the invite resolved from the SERVER, not from a local pool.
    expect(await bodyText(guest), 'the backend invite rendered the real event')
      .toMatch(/Harrell reunion/);

    await tap(guest, /^Yes, I.m in$/);
    await guest.waitForTimeout(400);
    await tap(guest, /^\+$/);                       // two kids, one tap each
    await guest.waitForTimeout(150);
    await tap(guest, /^\+$/);
    await guest.waitForTimeout(150);
    await tap(guest, /^Add dietary or access needs$/);
    await guest.waitForTimeout(400);
    await tap(guest, /^Peanut$/);
    await guest.waitForTimeout(200);
    // Re-entered after the panel expansions: answering re-renders the form and
    // the name field does not survive it. Measured, not assumed — the first run
    // of this walk came back "Add your name to send."
    await guest.getByLabel('Your name').fill('Denise Harrell');
    await guest.waitForTimeout(200);
    await tap(guest, /^Send my reply$/);
    await guest.waitForFunction(() => /YOU.RE IN/i.test(document.body.innerText || ''), null, { timeout: 15_000 });

    // BOUNDARY 2 — what actually went over the wire.
    expect(posted.length, 'exactly one submission left the browser').toBe(1);
    const sent = posted[0];
    expect(sent.name).toBe('Denise Harrell');
    expect(sent.rsvp).toBe('Yes');
    expect(sent.kids, 'the kids stepper reached the payload').toBe(2);
    expect(sent.allergens, 'the STRUCTURED allergen rides the wire — the field whose loss was a data-loss bug')
      .toEqual(['Peanut']);
    expect(String(sent.idempotency_key || ''), 'a replay must not duplicate the row').not.toBe('');

    // And she is told what the host will see, in her own confirmation.
    const confirmed = await bodyText(guest);
    expect(confirmed).toMatch(/3 of you/);          // herself + 2 kids
    expect(confirmed).toMatch(/needs noted: Peanut/i);
    await guestCtx.close();

    // ── 2 · THE SERVER HANDS IT BACK ─────────────────────────────────────
    // Denise's row is built FROM the captured body, so the host reads back what
    // the guest actually sent. The other five are the rest of the household
    // answering from their own phones.
    const rows = [
      {
        guest_name: sent.name, rsvp: sent.rsvp, meal: sent.meal, needs: sent.needs,
        kids: sent.kids, allergens: sent.allergens, idempotency_key: sent.idempotency_key,
      },
      { guest_name: 'Ray Harrell', rsvp: 'Yes', meal: 'Standard', kids: 0, idempotency_key: 'k2' },
      // STRUCTURED-ONLY, and that is the point. Denise's allergen cannot prove
      // the `allergens` mapping survives: the invite derives her free-text
      // `needs` FROM the same selection, and the roster chip dedupes the
      // structured array against `needs` (HostShellV2:23629) — so dropping
      // `allergens: r.allergens` from the read-back mapping changes nothing
      // visible on her row. Verified by deleting that line and watching this
      // spec stay green. Tonya carries the array with no matching free text,
      // which is the only shape that can tell the two apart.
      { guest_name: 'Tonya Brooks', rsvp: 'Yes', meal: 'Vegetarian', kids: 0, allergens: ['Shellfish'], idempotency_key: 'k3' },
      { guest_name: 'Marcus Brooks', rsvp: 'Yes', meal: 'Standard', kids: 0, idempotency_key: 'k4' },
      { guest_name: 'June Pierce', rsvp: 'Yes', meal: 'Standard', kids: 0, idempotency_key: 'k5' },
      { guest_name: 'Alma Pierce', rsvp: 'No', idempotency_key: 'k6' },
    ];

    // ── 3 · THE HOST, BEFORE AND AFTER, ON THE SAME BUNDLE ───────────────
    const before = await readHost(browser, null);
    const after = await readHost(browser, rows);

    // BOUNDARY 3 — the roster. The snake_case mapping is the only thing
    // standing between the wire and this row.
    expect(after.guests).toMatch(/Denise Harrell 2 kids Std Peanut Yes/);
    expect(after.guests).toMatch(/Alma Pierce No/);
    // The structured array specifically — the field class whose loss the code
    // records as "a remote guest's ALLERGY answer never reached the host's
    // roster. Data-loss class." Tonya sent it as data, not prose, and nothing
    // else on her row could render this word.
    expect(after.guests, 'the structured allergens array survived the wire')
      .toMatch(/Tonya Brooks Veg Shellfish Yes/);

    // BOUNDARY 4 — canonical attendance. Five yeses and two kids is seven
    // people, and the app says both numbers rather than conflating them.
    expect(after.guests).toMatch(/5 said yes/i);
    expect(after.guests).toMatch(/likely 7 on the day/i);
    expect(after.guests).toMatch(/2 kids/);
    expect(after.board).toMatch(/Guests 5 of 6 confirmed/i);

    // BOUNDARY 5 — Food sizes to the resolved number, not the range it had.
    expect(before.food).toMatch(/0–6 guests/);
    expect(after.food, 'the food plan is now sized to a settled seven').toMatch(/\b7 guests\b/);
    expect(after.food).not.toMatch(/0–6 guests/);

    // BOUNDARY 6 — Shopping. Tonya's vegetarian answer is a line on the list
    // that was not there when nobody had replied.
    const items = (t) => Number((t.match(/The list (\d+) items/) || [])[1] || 0);
    expect(items(before.food), 'premise: the silent roster already has a list').toBeGreaterThan(0);
    expect(items(after.food), 'a dietary answer adds a line to the run')
      .toBeGreaterThan(items(before.food));

    // BOUNDARY 7 — Seating. It had nothing to show and now holds five named
    // people, the kids, and the vegetarian — the first e2e this surface has.
    expect(before.seating).toMatch(/once someone says yes/i);
    expect(after.seating).toMatch(/Seated so far 0 of 5/);
    expect(after.seating).toMatch(/Kids 2/);
    expect(after.seating).toMatch(/Veg 1/);
    expect(after.seating, "and the chip carries the guest's own answers")
      .toMatch(/Denise Harrell Std · \+2 kids/);

    // BOUNDARY 8 — Money. Food is priced across seven now, and the total
    // committed rises. Compared against the same run's own baseline rather
    // than a literal, so a price-data refresh cannot fail this for free.
    expect(before.money).toMatch(/sized for 0–6 guests/i);
    expect(after.money).toMatch(/across 7 guests/i);
    expect(spokenFor(after.money), 'more mouths, more money')
      .toBeGreaterThan(spokenFor(before.money));
    expect(spokenFor(before.money), 'premise: there was real money to move').toBeGreaterThan(0);

    // BOUNDARY 9 — the ranked plan reranks. This is the one that proves the
    // cascade reaches the host's attention and not just her sheets: the job
    // that was top of the list is GONE, and the job the replies created has
    // taken its place.
    expect(before.board).toMatch(/6 guests still have not replied/i);
    expect(after.board, 'nobody is owed a reply any more, so the chase must stand down')
      .not.toMatch(/guests? still (has|have) not replied/i);
    expect(after.board, 'and the work the replies created is now on the board')
      .toMatch(/5 confirmed guests still need seats/i);
    expect(after.board).toMatch(/0 of 5 confirmed guests are seated/i);
  });
});
