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
const underFloor = ([rootSel, floor]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const PRESS = 'button, a[href], [role=button], [role=radio], summary, input:not([type=hidden]), select';
  const all = [...root.querySelectorAll(PRESS)];
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
  for (const el of all) {
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
