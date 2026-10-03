// ─── THE BRIDGE BETWEEN WHAT SHE SAID AND WHAT SHE TYPES ────────────────────
//
// Host 2026-10-03: "address plus 1s on guest list in creation (couples are
// plus one situations)."
//
// Both ends of this already worked and the middle did not:
//
//   intake   "8 couples" is parsed, and now KEPT as guestPairs
//   roster   "Denise & Ray" splits into two rows under one coupleId
//   between  nothing — a host who states eight couples and then types
//            sixteen separate names loses the pairing, and the bedroom
//            count silently drops from her own statement to an assumption
//            she then reads on screen ("this assumes they pair up").
//
// WHY A HINT AND NOT EIGHT ROWS. Creating eight couples as guest rows invents
// eight people nobody named — the non-negotiable. Telling her the format that
// already works is true, costs nothing, and leaves the typing to her.
//
// WHY AN E2E. The condition reads an event field, calls bedroomsNeeded, and
// renders inside the guests sheet. jest cannot execute the shell, so a test
// on either end passes whether or not a host ever sees this.
import { test, expect } from './fixtures.mjs';

const EV = {
  id: 'E2E_couples', type: 'Reunion', name: 'Anaheim reunion',
  date: '2027-03-12', endDate: '2027-03-15',
  guestMode: 'list', guestEstimate: 16, guestCount: 16,
  guestPairs: 8,                 // "8 couples", kept from intake
  budget: [], guests: [], vendors: [], timeline: [],
};

// ── SCOPED TO THE RAIL VIEWPORTS, AND SAYING WHY ──────────────────────────
// VIEWPORT_PORT_RULING step 3 puts a persistent section rail at tablet-land
// and above, so "Guests" is one click there. Below that the rail is absent and
// the phone's route to the section list runs through chrome this spec does not
// exist to test — "Show the rest of your plan" expands a panel inline, it does
// not open the directory.
//
// What is under test is viewport-independent: an event field, bedroomsNeeded,
// and one rendered line. Chasing the phone's navigation would test the chrome
// and not the hint. Recorded as a scope, not hidden as a skip — if the hint
// ever renders differently by width, this note is wrong and should fail.
const RAIL = /tablet-land|tablet-tall|desktop|wide/;

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./');
  // The section rows are `button.sec-row` and carry their sub-line in the
  // accessible name, so an anchored /^Guests$/ never matches. The persistent
  // RAIL only exists at tablet-land and above (VIEWPORT_PORT_RULING step 3);
  // narrower viewports reach the same rows through the Sections door. Both
  // render from one sectionGroups() call, so this is one list, two doors.
  // The RAIL's row is not the sheet's `.sec-row` — same list, different
  // markup — so this matches the accessible name the page actually exposes
  // rather than a class guessed from the sheet renderer.
  const row = page.getByRole('button', { name: /^Guests$/ }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  await page.getByLabel(/Add guest names/i).waitFor({ state: 'visible', timeout: 20000 });
};

test('a stated pairing reaches the place she types the names', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  await boot(page, EV);
  const hint = page.getByText(/You said 8 couples/i);
  await expect(hint).toBeVisible();
  // It must teach the format that actually works, not just restate the number.
  await expect(hint).toContainText(/Denise/);
  await expect(hint).toContainText(/sharing a room/i);
});

// ONCE THE ROSTER HAS THE PAIRING, THE ROSTER IS THE TRUTH and the hint has
// nothing left to say. Same precedence bedroomsNeeded uses: a real roster
// outranks a number typed once at intake.
test('and it goes quiet the moment the roster records a pairing', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  await boot(page, {
    ...EV,
    guests: [{ id: 'g1', name: 'Denise', coupleId: 'cp-1' },
             { id: 'g2', name: 'Ray', coupleId: 'cp-1' }],
  });
  await expect(page.getByText(/You said 8 couples/i)).toHaveCount(0);
});

// AND IT NEVER APPEARS UNINVITED. No stated pairing, no hint — the whole
// claim is "you said this", so with nothing said there is nothing to say.
test('no stated pairing, no hint', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const { guestPairs, ...noPairs } = EV;
  await boot(page, { ...noPairs, id: 'E2E_nopairs' });
  await expect(page.getByText(/You said \d+ couples?/i)).toHaveCount(0);
});
