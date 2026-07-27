// One line, two adults (audit 2026-07-27): the detector that turns "Ryan and
// Nicole" into two real guests, the merge guard that stops a couple string from
// silently swallowing Nicole, and the engine parity that makes a filled plusOne
// count as a person in food/headcount — locked together because they are one fix.

import { detectCoupleNames } from '../guestSplit';
import { matchGuestIndexByName, mergeGuestReplies } from '../guestMerge';
import { attendanceBand } from '../playbooks/index';

describe('detectCoupleNames', () => {
  test('plain couple splits', () => {
    expect(detectCoupleNames('Ryan and Nicole')).toEqual({ names: ['Ryan', 'Nicole'] });
    expect(detectCoupleNames('Denise & Ray')).toEqual({ names: ['Denise', 'Ray'] });
  });
  test('shared surname distributes', () => {
    expect(detectCoupleNames('Ryan and Nicole Smith')).toEqual({ names: ['Ryan Smith', 'Nicole Smith'] });
  });
  test('two full names stay as typed', () => {
    expect(detectCoupleNames('Ryan Smith and Nicole Jones')).toEqual({ names: ['Ryan Smith', 'Nicole Jones'] });
  });
  test('businesses, lists, initials, and single names are NOT couples', () => {
    expect(detectCoupleNames('Anderson & Sons Catering')).toBe(null);
    expect(detectCoupleNames('Salt and Pepper Band')).toBe(null);
    expect(detectCoupleNames('Ann, Bo and Cy')).toBe(null);   // comma list — host's call
    expect(detectCoupleNames('J and R')).toBe(null);           // initials
    expect(detectCoupleNames('Uncle Joe')).toBe(null);
    expect(detectCoupleNames('')).toBe(null);
  });
});

describe('merge guard — couple strings never partial-match a single row', () => {
  const roster = [{ id: 'g1', name: 'Ryan Smith', rsvp: '' }];
  test('the old failure: "Ryan and Nicole" used to land on "Ryan Smith" and discard Nicole', () => {
    expect(matchGuestIndexByName(roster, 'Ryan and Nicole')).toBe(-1);
  });
  test('exact couple-to-couple equality still matches', () => {
    expect(matchGuestIndexByName([{ name: 'Ryan and Nicole' }], 'Ryan and Nicole')).toBe(0);
  });
  test('normal single-name matching is untouched', () => {
    expect(matchGuestIndexByName(roster, 'Ryan')).toBe(0);
    expect(matchGuestIndexByName(roster, 'ryan smith')).toBe(0);
  });
  test('a couple reply appends a visible row instead of silently updating Ryan', () => {
    const { guests, added, merged } = mergeGuestReplies(roster, [{ name: 'Ryan and Nicole', rsvp: 'Yes' }]);
    expect(added).toBe(1);
    expect(merged).toBe(0);
    expect(guests.find(g => g.name === 'Ryan and Nicole')).toBeTruthy();
    expect(guests.find(g => g.name === 'Ryan Smith').rsvp).toBe(''); // Ryan untouched
  });
});

describe('seating parity — a filled plusOne is a chair', () => {
  const { buildSeatingPlan, seatsFor } = require('../seatingPlan');
  test('couple row = one unit, two chairs; totals count people', () => {
    const plan = buildSeatingPlan({
      tables: 2,
      guests: [
        { id: 'g1', name: 'Ryan Smith', rsvp: 'Yes', plusOne: 'Nicole Smith', plusOneMeal: 'Vegetarian', table: 1 },
        { id: 'g2', name: 'Uncle Joe', rsvp: 'Yes' },
      ],
    });
    expect(seatsFor({ plusOne: 'Nicole' })).toBe(2);
    expect(plan.totals.confirmed).toBe(3);      // people, not rows
    expect(plan.totals.seated).toBe(2);         // Ryan + Nicole at table 1
    expect(plan.totals.unassigned).toBe(1);     // Joe
    expect(plan.tables[0].count).toBe(2);       // two chairs at table 1
    expect(plan.tables[0].meals.Vegetarian).toBe(1); // Nicole's plate counted
  });
});

describe('engine parity — a filled plusOne is a person', () => {
  const ev = {
    guests: [
      { name: 'Ryan Smith', rsvp: 'Yes', plusOne: 'Nicole Smith' },
      { name: 'Uncle Joe', rsvp: 'Yes' },
    ],
  };
  test('attendanceBand counts the plus-one adult', () => {
    const band = attendanceBand(ev);
    expect(band.confirmed).toBe(3); // Ryan + Nicole + Joe
    expect(band.low).toBe(3);
  });
  test('a blank plusOne adds nothing', () => {
    const band = attendanceBand({ guests: [{ name: 'Joe', rsvp: 'Yes', plusOne: '  ' }] });
    expect(band.confirmed).toBe(1);
  });
});
