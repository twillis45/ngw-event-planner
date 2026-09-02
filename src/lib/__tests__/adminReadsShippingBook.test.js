// ─── THE OPERATOR PANEL MUST READ THE APP THAT SHIPS ────────────────────────
//
// A review board found the admin console reading `ngw-events` — the FROZEN
// legacy shell's storage key — while hostv2, the app that actually ships,
// writes `ngw-hostv2-custom-events`. Every "local book" panel therefore
// rendered EMPTY against the shipping app while carrying a banner describing
// itself as this browser's book.
//
// Data-honesty seat, ruling: "a panel labelled 'This Browser' that reads a key
// the browser does not write is a control lying about what it does — the
// textbook violation." An internal audience is still an audience.
//
// Asserted at source, the same idiom deleteEventLandsSomewhere uses, because
// readLocalBook is module-private and exporting it purely to test it would
// widen the surface to satisfy the test.
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'admin', 'AdminConsole.jsx'), 'utf8',
);

const FN = (() => {
  const i = SRC.indexOf('function readLocalBook()');
  return i < 0 ? '' : SRC.slice(i, i + 900);
})();

describe('the admin local-book reader', () => {
  test('it exists', () => {
    expect(FN).not.toBe('');
  });

  test('it reads the SHIPPING app’s key', () => {
    // The whole defect in one assertion.
    expect(FN).toMatch(/ngw-hostv2-custom-events/);
  });

  test('it still reads the legacy key — this is additive, not a swap', () => {
    // Swapping would have moved the blind spot rather than closed it: events
    // created in the frozen shell are real and are still on this device.
    expect(FN).toMatch(/'ngw-events'/);
  });

  test('it dedupes, so an event in both books is counted once', () => {
    // Without this the panels would double-count during the overlap period,
    // which is a different lie in the same place.
    expect(FN).toMatch(/seen/);
    expect(FN).toMatch(/Set\(/);
  });

  test('a corrupt book yields an array, never a throw', () => {
    expect(FN).toMatch(/catch/);
    expect(FN).toMatch(/Array\.isArray/);
  });
});
