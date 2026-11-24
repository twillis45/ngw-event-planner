// ─── EVERY SHEET KEEPS THE COHESION RULES (cohesion batch B, 11/24/2026) ────
//
// UX_11 (owner-approved 11/24/2026) says a rule that can be measured is
// enforced by a test, and the owner's standing rule is that fixes are
// systemic: the test sweeps EVERY sheet, not the one screen a batch is about.
// This opens the board and every section door on the sample plan that has
// the most in it (Wanda's 50th: vendors, money, seating, lodging), plus an
// opened vendor with its status picker up, and runs three probes on each:
//
//   rule 9  every tap at least 44x44 (touch projects only, UX_03 rule 2);
//   rule 3  remove, delete and skip are last, alone, and name what they remove;
//   rule 2  every field has a visible label, not only a placeholder;
//   clip    nothing tappable sits within 12px of an ancestor that clips
//           sideways (touch only). Owner report, 11/24/2026: the iPad
//           landscape hero's lit button lost its left edge, focus ring and
//           attention ring to a card's overflow; iPadOS Safari has no
//           overflow-clip-margin to save it. Also run at that iPad's own
//           Safari landscape size, 1000x690 ("ipad-1000").
//
// THE LIST OF WHAT IS STILL OPEN. The sweep landed before the later batches,
// so it found violations those batches own. Each one is written down in
// cohesionSweepKnown.mjs under the batch that fixes it, and the test asserts
// the list EXACTLY, per sheet and per project: a new violation fails, and so
// does a fixed one that is still listed, so the list can only shrink, and
// each batch deletes its own lines as it lands. Nothing here is skipped.
//
// The clock is fixed so "N days to go" copy, and the wrapping it causes,
// is the same on every run.
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';
import { underFloor, destructiveNotLast, unlabeledFields, clippedSideways } from './floorProbes.mjs';
import { KNOWN } from './cohesionSweepKnown.mjs';

test.use({ hasTouch: true });

const FLOOR = 44;
const TOUCH = /mobile|landscape|tablet/;
// The four gate geometries (phone, desktop, 13" iPad portrait, landscape).
const MEASURED = ['mobile', 'desktop', 'tablet-tall', 'landscape'];

const DOORS = [
  'Venue', 'Guests & invite', 'The spread & shopping', 'Your money', 'People you’re hiring',
  'Space, seats & helpers', 'Who sits where', 'Your checklist', 'Calendar', 'Calls to make',
  'What could go wrong', 'Messages', 'Travel & where everyone stays', 'Split the costs',
  'Make it yours', 'Share with family', 'Co-hosts', 'Ask No Guesswork', 'The One-Event Pass',
  'You & settings',
];

const boot = async (page) => {
  await page.clock.setFixedTime(new Date('2026-12-01T10:00:00'));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  // Nothing leaves the page: every non-GET is refused, and the API is a 404.
  await page.route('**/*', (route) => (route.request().method() === 'GET' ? route.fallback() : route.abort()));
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?elegant=1');
  await settled(page);
};

const sorted = (a) => [...new Set(a)].sort();
const probe = async (page, root, project) => ({
  9: TOUCH.test(project) ? sorted(await page.evaluate(underFloor, [root, FLOOR, null, false])) : [],
  3: sorted(await page.evaluate(destructiveNotLast, [root])),
  2: sorted(await page.evaluate(unlabeledFields, [root])),
  clip: TOUCH.test(project) ? sorted(await page.evaluate(clippedSideways, [root, 12])) : [],
});

const expected = (where, project) => {
  const k = KNOWN[where] || {};
  const pick = (rule) => [...new Set((k[rule] || []).filter(([projects]) => projects.includes(project)).map(([, s]) => s))].sort();
  return { 9: pick(9), 3: pick(3), 2: pick(2), clip: pick('clip') };
};

const check = (found, where, project) => {
  if (process.env.SWEEP_RECORD) console.log('SWEEP ' + JSON.stringify({ where, project, found }));
  expect(found, `${where} at ${project}: rules 9, 3, 2 and clip`).toEqual(expected(where, project));
};

test.describe('every sheet keeps the cohesion rules', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(!MEASURED.includes(info.project.name), 'measured at the four gate geometries');
  });

  test('the board', async ({ page }, info) => {
    await boot(page);
    await page.waitForTimeout(800);
    check(await probe(page, '.app', info.project.name), 'the board', info.project.name);
  });

  for (const door of DOORS) {
    test(door, async ({ page }, info) => {
      test.setTimeout(60_000);
      await boot(page);
      await openSectionByName(page, door, { settle: 600 });
      await sheetSettled(page);
      check(await probe(page, '.sheet', info.project.name), door, info.project.name);
    });
  }

  // The vendor detail the audit measured (#7, #8, #9): a paid vendor opened,
  // with its status picker up.
  test('an opened vendor, with its status picker', async ({ page }, info) => {
    test.setTimeout(60_000);
    await boot(page);
    await openSectionByName(page, 'People you’re hiring', { settle: 600 });
    await sheetSettled(page);
    const card = page.locator('.sheet .vcard:has(button[data-vaction="booking"])').first();
    await card.locator('.vc-head').click();
    await expect(card).toHaveClass(/\bopen\b/);
    await card.locator('button[data-vaction="booking"]').click();
    await expect(card.locator('.vc-statuspick')).toBeVisible();
    await page.waitForTimeout(400);
    check(await probe(page, '.sheet', info.project.name), 'an opened vendor', info.project.name);
  });
});

// iPad Safari landscape (1000x690, owner report 11/24/2026): the clip rule,
// once, under the landscape project (touch on), on the same sheets.
test.describe('nothing tappable is clipped at iPad Safari landscape, 1000x690', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'landscape', 'pins its own 1000x690; measured once');
    await page.setViewportSize({ width: 1000, height: 690 });
  });
  const clipOnly = async (page, root, where) => {
    const found = { 9: [], 3: [], 2: [], clip: sorted(await page.evaluate(clippedSideways, [root, 12])) };
    const want = expected(where, 'ipad-1000');
    if (process.env.SWEEP_RECORD) console.log('SWEEP ' + JSON.stringify({ where, project: 'ipad-1000', found }));
    expect(found, `${where} at 1000x690: clip`).toEqual({ ...want, 9: [], 3: [], 2: [] });
  };
  test('the board', async ({ page }) => {
    await boot(page);
    await page.waitForTimeout(800);
    await clipOnly(page, '.app', 'the board');
  });
  for (const door of DOORS) {
    test(door, async ({ page }) => {
      test.setTimeout(60_000);
      await boot(page);
      await openSectionByName(page, door, { settle: 600 });
      await sheetSettled(page);
      await clipOnly(page, '.sheet', door);
    });
  }
  test('an opened vendor, with its status picker', async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page);
    await openSectionByName(page, 'People you’re hiring', { settle: 600 });
    await sheetSettled(page);
    const card = page.locator('.sheet .vcard:has(button[data-vaction="booking"])').first();
    await card.locator('.vc-name').click();
    await expect(card).toHaveClass(/\bopen\b/);
    await card.evaluate((el) => Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished)));
    await clipOnly(page, '.sheet', 'an opened vendor');
  });
});
