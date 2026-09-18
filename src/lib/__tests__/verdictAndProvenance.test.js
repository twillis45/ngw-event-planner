// ─── THREE FINDINGS FROM THE 2026-09-18 LOGIC-FRICTION AUDIT ─────────────────
//
// All three are the same root shape in different clothes: a surface deciding a
// fact for itself instead of asking the one place that owns it.
//
//   1  surfaceRegistry read `venueFor(event).name` to answer "does this event
//      have a venue?", so an address-only event was told "No venue booked yet —
//      Book your venue" and routed to Vendors, while the blocker engine (fixed
//      earlier the same day) correctly said nothing. Two surfaces, one fact,
//      opposite answers, on the same event on the same day.
//
//   2  The "add the address" row decided whether it already HAD an address by
//      testing the venue NAME for a digit. Saving the address never retired the
//      ask: venue "Backyard", add "12 Elm St", and the row re-renders "add the
//      address for backyard" — answerable an unlimited number of times.
//
//   3  Confirming the DATE stamped `startTimeSource: 'host'` onto an hour the
//      app had derived and the host had never seen. That flag is the outward
//      gate: eventWhen releases the hour to the guest invite on it, vendorBrief
//      nulls every run-of-show clock without it. So a tap that asked about the
//      date published OUR guessed hour to her guests and her caterer as hers.
//
// (1) is fixed by PUBLISHING the verdict rather than patching the caller:
// venueFor now returns `addressSettled`. Three places had built that answer
// themselves — phaseProgress via eventLocationStatus (correct), LodgingCockpit
// by hand (correct), surfaceRegistry from the name alone (wrong). A verdict
// consumers must assemble WILL fork; `isSet` forked six ways before this.
import { venueFor } from '../venueFor';
import { eventLocationStatus } from '../locationAssist';
import { startTimeIsConfirmed, defaultStartTime } from '../startTime';

describe('addressSettled — the production-layer verdict, published once', () => {
  const cases = [
    ['a named hall',                 { venueKind: 'venue', venue: 'VFW Post 3150' },            true],
    ['a street, no name',            { venueKind: 'venue', venueAddress: '8100 Ryan Way' },     true],
    ['a street at home',             { venueKind: 'home', venueAddress: '8100 Ryan Way' },      true],
    ['name and street',              { venue: 'The Hall', venueAddress: '12 Elm St' },          true],
    // THE 2026-08-14 BOARD RULING. A town unblocks TRAVEL, an address unblocks
    // PRODUCTION, and they regress independently. No town, in any shape, may
    // satisfy the production layer.
    ['a bare city',                  { venueKind: 'venue', venueCity: 'Greenbelt', venueState: 'MD' }, false],
    ['a bare city at home',          { venueKind: 'home', venueCity: 'Greenbelt', venueState: 'MD' },  false],
    ['a city in the venue field',    { venue: 'Santa Fe, NM' },                                  false],
    ['nothing at all',               {},                                                        false],
  ];
  test.each(cases)('%s', (_label, ev, want) => {
    expect(venueFor(ev).addressSettled).toBe(want);
  });

  // The published verdict must agree with the reader that already answered this
  // correctly, or we have simply added a ninth opinion.
  test.each(cases)('%s — agrees with eventLocationStatus', (_label, ev, want) => {
    const byStatus = ['venue_only', 'full_address'].includes(eventLocationStatus(ev));
    expect(byStatus).toBe(want);
  });
});

describe('the vendor-category raiser reads the verdict, not the name', () => {
  const { buildSurfaceRaises } = (() => {
    const m = require('../surfaceRegistry');
    return { buildSurfaceRaises: m.buildSurfaceRaises || m.default || null };
  })();

  // The export surface here is not the point of this test; the SOURCE is. The
  // behavior claim (no "No venue booked yet" over an address) belongs with the
  // other host-visible claims and cannot be made honestly from a unit test that
  // does not render. What IS checkable here, and what regressed, is that this
  // file no longer decides the question from the name.
  test('surfaceRegistry does not answer "has a venue" from vf.name', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'surfaceRegistry.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    expect(src).toMatch(/addressSettled/);
    // the exact shape that shipped the bug
    expect(src).not.toMatch(/venueFor\(event\)\s*\|\|\s*\{\}\)\.name/);
  });

  test('(premise) the module still imports the one reader', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'surfaceRegistry.js'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*venueFor/);
  });
});

describe('a derived hour is never stamped as the host\'s', () => {
  // The flag under test IS the outward gate. These assert the gate's meaning
  // rather than any one caller's use of it, so they hold wherever it is read.
  test('a freshly defaulted hour is derived, not confirmed', () => {
    const ev = { type: 'Birthday', date: '2026-12-05' };
    const d = defaultStartTime(ev, null);
    if (!d) return;                       // no proposal for this shape — nothing to assert
    expect(d.startTimeSource).toBe('derived');
    expect(startTimeIsConfirmed({ ...ev, ...d })).toBe(false);
  });

  test('confirming is what flips it, and only that', () => {
    const base = { type: 'Birthday', date: '2026-12-05', startTime: '15:00', startTimeSource: 'derived' };
    expect(startTimeIsConfirmed(base)).toBe(false);
    expect(startTimeIsConfirmed({ ...base, startTimeSource: 'host' })).toBe(true);
  });

  test('adding a date does not confirm the hour', () => {
    // The shape the bug produced: a derived hour, then a date arrives. The hour
    // is no more hers than it was a moment ago.
    const before = { type: 'Birthday', startTime: '15:00', startTimeSource: 'derived' };
    const after = { ...before, date: '2026-12-05' };
    expect(startTimeIsConfirmed(after)).toBe(false);
  });

  // THE SOURCE GUARD. The defect was a WRITE in the date-confirm handler, and no
  // unit test can see a write that lives in a shell jest cannot execute. This
  // asserts the handler does not re-acquire it. Paired with the behavior claim
  // in hostv2/e2e/.
  test('the date-confirm handler does not stamp startTimeSource', () => {
    const fs = require('fs');
    const path = require('path');
    const shell = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');
    const src = fs.readFileSync(shell, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    // The one legitimate family of writes is the TIME control's own handlers,
    // which sit inside the `patchEvent({ startTime… })` / "that's right" rows.
    // A bare `patch.startTimeSource = 'host'` on a patch object is the shape
    // that shipped this bug — it belongs to no time control.
    expect(src).not.toMatch(/patch\.startTimeSource\s*=/);
  });
});
