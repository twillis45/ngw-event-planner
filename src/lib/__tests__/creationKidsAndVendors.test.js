// ─── WHAT THE CREATION BOX HEARS (audit lane B, 11/22/2026) ──────────────────
//
// Forty-two sentences typed into "Start my event" with the clock fixed at
// Sunday 11/22/2026, noon. Five creation*.test.js files pin the findings,
// one each, every one watched failing before its fix:
//
//   1. A common word is not a month: "maybe 30-35" was May 30 – Jun 4,
//      "married 25 years" was Mar 25, "my junior 17 friends" was Jun 17.
//   2. The occasion she named is the playbook: a celebration of life, a
//      Kwanzaa gathering and a Juneteenth celebration were all Birthdays; a
//      Memorial Day camping trip was a Day Party; a brunch was a cookout; a
//      church fish fry fundraiser was a ballroom gala.
//   3. "after the funeral" does not name the repast's honoree "After".
//   4. Every clause is used or reported: BYOB the playbook cannot hold, a bare
//      weekday, "this/next weekend", places inside a used phrase. "next
//      September" and "sometime in February" are a month to pick from.
//   5. "no kids" is the Halloween audience; "DJ already booked" is booked.
//
// The clock: `now` is passed to the parser, and Date is frozen for the
// clause reader (which takes no clock). Local noon, so the day is Sunday
// 11/22 in every timezone, Kiritimati (UTC+14) and Midway (UTC-11) included.
import { parseSmartEventText } from '../smartParseEvent';
import { vendorRolesLine } from '../heardClauses';
import { adultsOnlyPickFor } from '../heardFacts';
import { getPlaybook } from '../playbooks';

const NOW = new Date(2026, 10, 22, 12, 0, 0);
const p = (text) => parseSmartEventText(text, { now: NOW });

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

test('the clock is Sunday, November 22, 2026, wherever this runs', () => {
  expect([NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getDay()]).toEqual([2026, 10, 22, 0]);
});


describe('5 · what she said about kids and vendors', () => {
  test('"no kids" picks the adults-only audience the Halloween playbook offers', () => {
    const decs = getPlaybook('Halloween Party').decisions;
    expect(p('Halloween party Oct 31 2027, costumes, 40 adults, no kids').kidsPolicy).toBe('adults_only');
    expect(adultsOnlyPickFor(decs, 'adults_only')).toEqual({ id: 'audience', pick: 'Adults-only costume party' });
    expect(adultsOnlyPickFor(decs, 'kids_welcome')).toBeNull();
    expect(adultsOnlyPickFor(decs, null)).toBeNull();
    // A playbook with no audience call gets nothing invented.
    expect(adultsOnlyPickFor(getPlaybook('Dinner Party').decisions, 'adults_only')).toBeNull();
  });
  test('"DJ already booked" previews as booked, matching what is stored', () => {
    const line = vendorRolesLine([{ category: 'DJ', name: '', status: 'Booked' }]);
    expect(line).toMatch(/Already booked: DJ/);
    expect(line).not.toMatch(/not booked/);
    const mixed = vendorRolesLine([{ category: 'DJ', name: '', status: 'Booked' }, { category: 'Catering', name: '', status: 'Considering' }]);
    expect(mixed).toMatch(/Already booked: DJ/);
    expect(mixed).toMatch(/Vendor roles to consider: Catering\. These start as Considering, not booked\./);
    expect(vendorRolesLine([{ category: 'Catering', name: '', status: 'Considering' }]))
      .toBe('Vendor roles to consider: Catering. These start as Considering, not booked.');
    expect(vendorRolesLine([])).toBeNull();
  });
});
