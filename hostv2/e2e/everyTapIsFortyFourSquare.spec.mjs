// ─── EVERY TAP IS 44 BY 44, ON TABLETS TOO (design audit 2 #5, batch 4) ─────
//
// Owner ruling 11/20/2026 (doctrine 02, ruling 3; UX_03 rule 2): touch targets
// are 44x44 on BOTH axes. One exemption: an inline text link within a sentence
// with no other tappable target within 24px of it.
//
// The audit (round 2, T3) measured tablets WORSE than the phone: 35 controls
// under 44 per tablet size against 24 at 390. The phone-only rules that floor
// them never reached the tablet. Measured there, on the surfaces it named:
//   - the headcount chips "6 / 8 / 12 / 20" (board and Calls to make), 34.8 wide;
//   - "+ Add a day" 32 tall, and the Space section's lines 33 tall;
//   - Who sits where's rows at 43; the invite's Privacy / Terms / Refunds at 17.
//
// It PROBES with elementFromPoint, outward from each control's center on both
// axes, as nothingPressableIsUnderTheFloor does on one: an expander that a
// parent clips computes as 44 and taps as nothing. Touch projects only, and
// with touch on, so the (hover:none) rules apply as on a real iPad.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const TOUCH = /mobile|landscape|tablet/;
test.use({ hasTouch: true });

const FLOOR = 44;
const EVENT = {
  id: 'tap-44', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(20), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', rsvpCode: 'tap-44-code',
  guestMode: 'list', guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' },
    { id: 'g3', name: 'Morgan Diaz', rsvp: 'Yes' },
  ],
  vendors: [], budget: [], timeline: [],
};

// No headcount yet: the board asks "how many?" with the 6 / 8 / 12 / 20 chips.
const NO_COUNT = { id: 'tap-44-count', name: 'Maya’s 40th', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(30), guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page, url = '?elegant=1', event = EVENT) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto(url);
};

// Runs in the page: every pressable control inside `root` whose probed hit
// area is under the floor on either axis, minus the one exemption.
const underFloor = ([rootSel, floor, only]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const PRESS = 'button, a[href], [role=button], [role=radio], summary, input:not([type=hidden]), select';
  const all = [...root.querySelectorAll(PRESS)];
  const judged = only ? all.filter((el) => el.matches(only)) : all;
  const inlineInSentence = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement;
    const text = [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (text.length < 12) return false;                 // a sentence around it, not a label beside it
    const r = el.getBoundingClientRect();
    return !all.some((o) => {
      if (o === el || o.contains(el) || el.contains(o) || !o.getClientRects().length) return false;
      const q = o.getBoundingClientRect();
      const dx = Math.max(0, q.left - r.right, r.left - q.right), dy = Math.max(0, q.top - r.bottom, r.top - q.bottom);
      return Math.hypot(dx, dy) < 24;
    });
  };
  const out = [];
  for (const el of judged) {
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 4 || el.closest('[inert], [aria-hidden="true"]')) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const b = el.getBoundingClientRect();
    const cx = Math.round(b.left + b.width / 2), cy = Math.round(b.top + b.height / 2);
    const owns = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
    if (!owns(cx, cy)) continue;                        // covered or clipped: judged where it is reachable
    const walk = (dx, dy) => { let n = 0; while (n < 60 && owns(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    const w = walk(-1, 0) + walk(1, 0) + 1, h = walk(0, -1) + walk(0, 1) + 1;
    if (w >= floor && h >= floor) continue;
    if (inlineInSentence(el)) continue;
    out.push(`${String(el.className || el.tagName).split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 26)}" ${w}x${h}`);
  }
  return out;
};

const SECTIONS = ['Calls to make', 'Space, seats & helpers', 'Who sits where'];

test('the board, and the sections the audit measured, have no tap under 44x44', async ({ page }, info) => {
  test.skip(!TOUCH.test(info.project.name), 'the 44x44 floor is a touch rule (UX_03 rule 2)');
  test.setTimeout(120_000);
  await boot(page);
  await settled(page);
  const found = [];
  const board = await page.evaluate(underFloor, ['.app', FLOOR]);
  found.push(...board.map((s) => `board: ${s}`));
  for (const name of SECTIONS) {
    await openSectionByName(page, name, { settle: 600 });
    await sheetSettled(page);
    const r = await page.evaluate(underFloor, ['.sheet', FLOOR]);
    found.push(...r.map((s) => `${name}: ${s}`));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  expect(found).toEqual([]);
});

test('the headcount ask has no tap under 44x44', async ({ page }, info) => {
  test.skip(!TOUCH.test(info.project.name), 'the 44x44 floor is a touch rule (UX_03 rule 2)');
  await boot(page, '?elegant=1', NO_COUNT);
  await settled(page);
  const chips = await page.locator('.app .chip').count();
  expect(chips, 'premise: the board asks for the headcount with chips').toBeGreaterThan(2);
  expect(await page.evaluate(underFloor, ['.app', FLOOR])).toEqual([]);
});

test('the guest invite has no tap under 44x44', async ({ page }, info) => {
  test.skip(!TOUCH.test(info.project.name), 'the 44x44 floor is a touch rule (UX_03 rule 2)');
  await boot(page, '?rsvp=' + EVENT.rsvpCode);
  await expect(page.locator('.inv2-sheet').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2600);   // past the entrance animation
  expect(await page.evaluate(underFloor, ['.inv2', FLOOR])).toEqual([]);
});

// ─── AUDIT 2, LANE F, P1-4 AND P1-5 (11/22/2026) ────────────────────────────
// Each control below measured under 44 on every touch device the audit ran:
// the Guests filter chips 32 tall (their own min-height:32px outranked the
// chip floor) and the "Find someone" field 40; "Delete [event]" 92x15; the
// pass chip 27; After's money rows 20 (an inline padding:0); The Day's "Menu"
// 38; the vendors bar 39; the pass sheet's support address 18 with a button
// inside 24px; the reveal's "Your original description" 15. Judged one by one
// with `only`, and each must exist (a control that vanished is not a pass).
// thePassIsOnTheBoard's event: a destination that takes the pass.
const PASS_EV = { id: 'cust-board-pass', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
  isDestination: true, passRequired: true, passReasons: ['destination'] };
const TRIP = {
  id: 'tap-44-trip', name: 'Girls Trip to Nashville', type: 'Group Trip', createdAt: '2026-11-01',
  date: dateIn(40), endDate: dateIn(43), guestEstimate: 8, guestMode: 'list', guestCountSource: 'host',
  isDestination: true, passRequired: true, passReasons: ['destination', 'multi-day'], costSharing: { mode: 'self-pay' },
  venueCity: 'Nashville, TN', hostName: 'Casey Morgan',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Sam Lee', rsvp: 'Maybe' }],
  vendors: [], budget: [], timeline: [],
};
const judge = async (page, root, only) => {
  const n = await page.evaluate(([r, o]) => { const el = [...document.querySelectorAll(r)].pop() || document.body; return el.querySelectorAll(o).length; }, [root, only]);
  expect(n, `premise: ${only} is on screen`).toBeGreaterThan(0);
  return page.evaluate(underFloor, [root, FLOOR, only]);
};
const viaMenu = async (page, label) => {
  if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.locator('.ev-eyebrow').first().click();
  await page.locator('.sheet').last().getByRole('button', { name: label, exact: false }).first().click();
  await page.waitForTimeout(1200);
};

test.describe('the controls audit 2 measured under 44 (390, touch)', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'pinned to the 390 phone the audit measured');
    await page.setViewportSize({ width: 390, height: 844 });
  });

  // The pass chip and its sheet show only where billing is live: the passgate
  // bundle, with the capability mocked (thePassIsOnTheBoard's harness).
  test('billing live: the pass chip and its sheet\'s support address', async ({ page }) => {
    const API = 'https://passgate-mock.invalid';
    await page.route(API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route(API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { stripe_configured: true, stripe_can_honour_purchases: true } }));
    await page.route(API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: { event_id: PASS_EV.id, held: false } }));
    await boot(page, previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266)) + '?elegant=1', PASS_EV);
    await settled(page);
    await page.locator('.pass-status-needed').first().waitFor({ timeout: 15_000 });
    const found = [];
    found.push(...await judge(page, '.app', '.pass-status-needed'));
    await page.locator('.pass-status-needed').first().click();
    await sheetSettled(page);
    found.push(...await judge(page, '.sheet', '.grounding > a[href^="mailto:"]'));
    // and the link's grown hit area took none from the controls around it
    found.push(...await page.evaluate(underFloor, ['.sheet', FLOOR]));
    expect(found).toEqual([]);
  });

  test('a trip: Delete on This event', async ({ page }) => {
    await boot(page, '?elegant=1', TRIP);
    await settled(page);
    const found = [];
    await viaMenu(page, 'This event');
    found.push(...await judge(page, '.sheet', '.delrow'));
    expect(found).toEqual([]);
  });

  test('Wanda: the Guests chips and field, the vendors bar, The Day\'s Menu, After\'s money rows', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    });
    await page.goto('?elegant=1');
    await settled(page);
    const found = [];
    await openSectionByName(page, 'Guests', { settle: 800 });
    await sheetSettled(page);
    found.push(...await judge(page, '.sheet', '.rtool-lens .chip, .rtool-q'));
    await openSectionByName(page, 'People you’re hiring', { settle: 800 });
    await sheetSettled(page);
    found.push(...await judge(page, '.sheet', '.conflictbar'));
    await viaMenu(page, 'The Day');
    found.push(...await judge(page, '.app', '.day-sec > .ev-eyebrow'));
    await viaMenu(page, 'After');
    found.push(...await judge(page, '.app', 'button.line'));
    expect(found).toEqual([]);
  });

  test('the reveal: "Your original description"', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.clear(); });
    await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
    await page.goto('?elegant=1');
    await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 30_000 });
    await page.getByText(/what are we planning/i).first().waitFor({ timeout: 20_000 });
    await page.getByPlaceholder(/crab feast/i).first().fill('Backyard crab feast for 20 people on Saturday');
    await page.getByRole('button', { name: /^Put my plan together$/ }).click();
    await page.getByRole('button', { name: /^Open your plan$|^Keep this plan$/ }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(6000);
    expect(await judge(page, '.reveal-stage', 'details.grounding > summary')).toEqual([]);
  });
});
