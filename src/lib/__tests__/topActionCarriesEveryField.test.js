// ─── THE topAction REBUILD IS A WHITELIST, AND IT HAS EATEN FIVE FIELDS ──────
//
// `eventPlan` does not spread the selector's chosen action. It rebuilds it
// field by field:
//
//     const topAction = top && top.title ? { id: …, domain: …, title: top.title, … }
//
// Anything a producer stamps that is not NAMED there is silently gone by the
// time the shell reads `nextActions[0]`. Five fields have been lost this way,
// each one found by driving the app, none by a test:
//
//     level           (F1, 2026-07-14)  criticals became snoozeable — "not now"
//                                       on the single worst item in the app
//     leadDays        (F7, 2026-07-14)  the snooze lead-window cap was dead code
//     sourceCategory  (2026-07-22)      the shell fell back to prose sniffing
//     blockerType     (2026-08-14)      the promoted ask rendered in the hero
//                                       AND as its own card below it
//     ask             (2026-08-14)      the authored hero question was ignored
//                                       and the prose ladder answered wrong
//
// The file records three of those as separate incidents in three separate
// comments. They are not three bugs. They are one mechanism with five
// instances, and nothing has ever guarded the mechanism itself.
//
// WHY NO EXISTING TEST CATCHES IT. The engine suites call
// `_selectEventNextActionInner` or `selectEventNextAction` directly and assert
// on what the SELECTOR returned — which is always correct. The loss happens one
// layer downstream, inside `eventPlan`. A test has to compare the two objects to
// see it, and until now none did.
//
// SO THIS GATES THE CLASS, NOT THE FIVE. It walks every field the selector
// actually produces across a spread of fixtures and asserts each one survives —
// so the SIXTH field fails here, on the day it is added, naming itself.
import { eventPlan, _selectEventNextActionInner } from '../../CommandCenter';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

// Fields the rebuild deliberately RENAMES. Documented rather than ignored: a
// rename is a decision, a silent drop is a defect, and the difference has to be
// written down somewhere a test can read.
const RENAMES = {
  primaryCta: 'cta',          // the shell's vocabulary for the button label
  primaryRoute: 'route',      // …and it carries `primaryRoute` too, deliberately
};

// Fields that legitimately do NOT travel, each with the reason it does not.
// Adding to this list is allowed; doing it silently is what this test prevents.
const NOT_CARRIED = {
  // A framing line for the ladder's own card. The shell composes its own
  // context from dueInDays/leadDays and never reads this.
  contextLine: 'shell composes its own context line from the date fields',
};

// A spread wide enough that between them the fixtures exercise several tiers —
// the brand-new start tier, the foundation tier, a blocker tier, and a
// destination event deep enough to reach the reactive ladder.
const FIXTURES = [
  ['brand new', {
    id: 'tc-new', type: 'Birthday', name: 'Brand New',
    date: '2027-06-20', budget: [], guests: [], vendors: [], timeline: [],
  }],
  ['venue gate', {
    id: 'tc-venue', type: 'Birthday', name: 'Venue Gate',
    date: '2027-06-20', endDate: '2027-06-24',
    guestMode: 'count', guestEstimate: 12, guestCount: 12, totalBudget: 4000,
    budget: [], guests: [], vendors: [], timeline: [],
  }],
  ['destination, town only', {
    id: 'tc-dest', type: 'Birthday', name: 'Destination',
    isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
    date: '2027-06-20', endDate: '2027-06-24',
    guestMode: 'count', guestEstimate: 24, guestCount: 24, totalBudget: 9000,
    budget: [], guests: [], vendors: [], timeline: [],
  }],
  ['fully furnished', {
    id: 'tc-full', type: 'Birthday', name: 'Furnished',
    isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
    venue: 'The Lodge at Santa Fe',
    date: '2027-06-20', endDate: '2027-06-24',
    guestMode: 'count', guestEstimate: 24, guestCount: 24, totalBudget: 9000,
    foodChoices: { sourcing: 'host cooks' },
    budget: [], guests: [], vendors: [], timeline: [],
  }],
];

// Values that carry no information, so losing them costs nothing.
const meaningful = (v) => !(v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0));

describe('every field the selector stamps survives into nextActions[0]', () => {
  for (const [name, ev] of FIXTURES) {
    test(`${name} — no field is silently dropped by the rebuild`, () => {
      const top = _selectEventNextActionInner(ev);
      expect(top).toBeTruthy();

      const head = (eventPlan(ev).nextActions || [])[0];
      expect(head).toBeTruthy();

      // Only compare when the head IS the ladder's action. On some fixtures a
      // registry raise or a foundation domino legitimately outranks it, and
      // then there is nothing to carry — asserting anyway would test the
      // ranking, not the rebuild.
      if (head.source !== 'ladder' && head.title !== top.title) return;

      const dropped = [];
      for (const [key, value] of Object.entries(top)) {
        if (!meaningful(value)) continue;
        if (key in NOT_CARRIED) continue;
        const target = RENAMES[key] || key;
        if (!meaningful(head[target])) dropped.push(`${key}${RENAMES[key] ? ` (as ${target})` : ''}`);
      }

      // The message names the field, because "expected 0 got 1" would send the
      // next person back through the same five-incident history to work out
      // which one it was.
      expect({ fixture: name, dropped }).toEqual({ fixture: name, dropped: [] });
    });
  }

  // The five known instances, asserted by name as well. If the generic sweep
  // above is ever weakened — a fixture removed, `meaningful` loosened — these
  // still fail, and they are the ones with documented live consequences.
  test('the five fields this rebuild has already lost are all carried', () => {
    const ev = FIXTURES[2][1];                     // the venue gate fires here
    const head = (eventPlan(ev).nextActions || [])[0];
    const top = _selectEventNextActionInner(ev);
    expect(head.level).toBe(top.level);
    expect(head.level).toBeTruthy();
    expect(head.blockerType).toBe('venue-selection');
    expect(head.ask).toBeTruthy();
    expect(head.ask).toBe(top.ask);
    // leadDays/sourceCategory are null on this tier — assert the CHANNEL exists
    // rather than inventing a value, which is the honest form of this check.
    expect('leadDays' in head).toBe(true);
    expect('sourceCategory' in head).toBe(true);
  });
});
