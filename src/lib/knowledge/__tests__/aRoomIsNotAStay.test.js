// ─── A PER-ROOM CEILING CANNOT BE COMPARED WITH A WHOLE-EVENT BUDGET ───────
//
// Lodging board 2026-09-27, finding #1, from the Next Maintainer seat: rung 4
// is GSA's cap on ONE ROOM per night, the budget flag compares a whole-event
// total, and nothing structurally stopped them meeting. This is the structure.
import { budgetComparableTotal, isOwnEvidence } from '../lodgingBasisLadder';

const picked = { rung: 'picked', unit: 'stay', low: 1800, high: 1800, perNight: false };
const cheapest = { rung: 'cheapest', unit: 'stay', low: 1450, high: 1450, perNight: false };
const listings = { rung: 'listings', unit: 'place-night', low: 210, high: 340, perNight: true };
const federal = { rung: 'federal', unit: 'room-night', low: 166, high: 166, perNight: true };

describe('only the host’s own evidence may meet a budget', () => {
  test('a stay the host shortlisted converts, unchanged', () => {
    expect(budgetComparableTotal(picked, 3)).toBe(1800);
    expect(budgetComparableTotal(cheapest, 3)).toBe(1450);
  });

  test('THE FEDERAL CAP NEVER CONVERTS, at any number of nights', () => {
    // It is a ceiling on one room. Turning it into a stay needs a room count,
    // and lodgingIntel refuses to guess one — couples, children, singles.
    for (const nights of [0, 1, 2, 3, 7, 30]) {
      expect(budgetComparableTotal(federal, nights)).toBeNull();
    }
  });

  test('a regional ASKING band never converts either, and that is the board’s ruling', () => {
    // Units would allow it — a whole place × nights is arithmetically a stay.
    // Standing does not: asking data overstates, and in many destination
    // celebrations the guests pay for their own rooms.
    for (const nights of [1, 3, 7]) {
      expect(budgetComparableTotal(listings, nights)).toBeNull();
    }
  });

  test('BOTH gates are load-bearing — neither alone is trusted', () => {
    // A future rung claiming the right unit without being the host's own
    // evidence is still refused…
    expect(budgetComparableTotal({ rung: 'listings', unit: 'stay', low: 900 }, 2)).toBeNull();
    // …and the host's own evidence in a per-night unit is refused too.
    expect(budgetComparableTotal({ rung: 'picked', unit: 'place-night', low: 300 }, 2)).toBeNull();
  });

  test('nothing, nonsense and zero are null — never a number', () => {
    expect(budgetComparableTotal(null, 3)).toBeNull();
    expect(budgetComparableTotal(undefined, 3)).toBeNull();
    expect(budgetComparableTotal({ ...picked, low: 0 }, 3)).toBeNull();
    expect(budgetComparableTotal({ ...picked, low: -5 }, 3)).toBeNull();
    expect(budgetComparableTotal({ ...picked, low: 'lots' }, 3)).toBeNull();
  });

  test('the two published rungs are still not own-evidence', () => {
    expect(isOwnEvidence(listings)).toBe(false);
    expect(isOwnEvidence(federal)).toBe(false);
    expect(isOwnEvidence(picked)).toBe(true);
  });
});
