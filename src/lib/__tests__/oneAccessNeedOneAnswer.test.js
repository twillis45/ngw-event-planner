// ─── "SHE USES A WALKER" — ONE NEED, ONE ANSWER ─────────────────────────────
//
// THE MEASURED CASE. A host types "…sit-down lunch, she uses a walker" and
// both halves vanish. `HostShellV2:9455` records why that mattered: "for an
// 80th, mobility is the constraint that decides venue access, seating and
// where the cake table goes." The clause is reported honestly by
// `unusedClauses` — the app says it did not use it — but nothing can use it,
// because an operational need stated at INTAKE has nowhere to live.
//
// WHAT THE GATE GOT WRONG ABOUT THIS, corrected 2026-10-18. The planning
// package called this a downstream capability gap and claimed "there is no
// accessibility/mobility module anywhere in src/lib". That was false.
// `knowledge/accessibilityContext.js` grounds decisions with ADA/MPI sources;
// `guest.access[]` rides the RSVP wire and merges into the roster; seating and
// lodging BOTH already act on an access need. The real defect is smaller and
// worse:
//
//   TWO CONSUMERS, TWO VOCABULARIES, TWO SOURCE FIELDS.
//
//   seatingPlan.guestNeedsAccessibleSeat   reads access[] AND needs
//                                          /wheel|accessib|ada|step-free|mobility/
//                                          → BLIND TO "walker"
//   lodgingIntel  (the stepfree must-have) reads needs ONLY
//                                          /wheelchair|step-free|stairs|mobility|walker|cane|elder/
//                                          → BLIND TO THE STRUCTURED ARRAY
//
// So the same guest is accommodated at the table and not in the house, or in
// the house and not at the table, depending on which box her need was typed
// into. Neither consumer is wrong on its own; there is simply no owner. This
// repo already named that failure — confirmedCovers.js: "A concept with eight
// implementations has no owner."
//
// NO DIAGNOSIS IS INFERRED, and that is a hard line, not a nicety. "She uses a
// walker" is a statement about EQUIPMENT and what it needs: a step-free route
// and a seat that can be reached. It is not a statement about a person's
// health, and this model never converts it into one.
import {
  accessNeedsFor, needsStepFreeAccess, heardAccessNeeds, ACCESS_NEEDS,
} from '../accessNeeds';
import { guestNeedsAccessibleSeat, dietChipsFor } from '../seatingPlan';
import { mustHavesFor } from '../lodgingIntel';

const walkerEvent = (over = {}) => ({
  id: 'ev-walker', type: 'Birthday', name: "Mom's 80th",
  date: '2027-06-17', endDate: '2027-06-21',
  guestMode: 'count', guestCount: 10,
  accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
  ...over,
});

const houseWith = (guests) => ({
  id: 'ev-house', type: 'Reunion', date: '2027-06-17', endDate: '2027-06-21',
  guestMode: 'list', guests,
});
const hasStepFree = (ev) => mustHavesFor(ev).some((m) => m && m.id === 'stepfree');

describe('the vocabulary is one list, and it knows the words hosts actually use', () => {
  test('a walker is a step-free need — the word the measured case used', () => {
    expect(needsStepFreeAccess('she uses a walker')).toBe(true);
  });

  // Asserted as a table rather than a loop of bare booleans: jest takes no
  // message argument, so a failing `toBe(true)` inside a loop would say only
  // "expected true, received false" without naming the word. The diff names it.
  const reads = (phrases) => phrases.map((p) => [p, needsStepFreeAccess(p)]);
  const all = (phrases, v) => phrases.map((p) => [p, v]);

  test('so are the words each consumer already knew separately', () => {
    // The union of the two old regexes. Neither consumer loses a word it had.
    const yes = ['wheelchair', 'step-free', 'stepfree', 'uses a cane', 'mobility scooter',
      'trouble with stairs', 'ADA seating', 'accessible seat', 'elderly guests'];
    expect(reads(yes)).toEqual(all(yes, true));
  });

  test('and it does not fire on ordinary words that merely contain them', () => {
    // The guard against a vocabulary that grows until it matches everything.
    const no = ['', 'vegetarian', 'no peanuts', 'bringing a cake', 'walking tacos'];
    expect(reads(no)).toEqual(all(no, false));
  });

  test('the vocabulary is a frozen named list, not a regex hidden in a consumer', () => {
    expect(Object.isFrozen(ACCESS_NEEDS)).toBe(true);
    expect(ACCESS_NEEDS.map((n) => n.kind)).toContain('step-free');
  });
});

describe('an intake-stated need becomes a normalized requirement, and nothing more', () => {
  test('the requirement is recorded with the words the host used', () => {
    const got = accessNeedsFor(walkerEvent());
    expect(got.requirements).toHaveLength(1);
    expect(got.requirements[0].kind).toBe('step-free');
    expect(got.requirements[0].phrase).toBe('she uses a walker');
  });

  test('NO DIAGNOSIS — the requirement names equipment and a route, never a condition', () => {
    const r = accessNeedsFor(walkerEvent()).requirements[0];
    const blob = JSON.stringify(r).toLowerCase();
    const CLINICAL = ['disab', 'impair', 'condition', 'diagnos', 'patient', 'illness', 'elderly'];
    expect(CLINICAL.filter((w) => blob.includes(w))).toEqual([]);
  });

  test('it says who it is about only when it was told — "she" is not a name', () => {
    // Guessing which guest "she" refers to is exactly the kind of invention
    // this repo forbids. Unknown stays unknown.
    expect(accessNeedsFor(walkerEvent()).requirements[0].who).toBe(null);
  });

  test('no stated need produces no requirement — never a default one', () => {
    expect(accessNeedsFor({ id: 'ev-none', type: 'Birthday' }).requirements).toEqual([]);
    expect(accessNeedsFor(null).requirements).toEqual([]);
  });

  test('a roster need and an intake need land in the same list', () => {
    const got = accessNeedsFor(walkerEvent({
      guestMode: 'list',
      guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', access: ['Step-free / wheelchair'] }],
    }));
    expect(got.requirements).toHaveLength(2);
    expect(got.requirements.map((r) => r.source).sort()).toEqual(['guest-said', 'host-said']);
    // The guest's own requirement DOES carry a name, because it was told one.
    expect(got.requirements.find((r) => r.source === 'guest-said').who).toBe('Tonya Brooks');
  });
});

describe('what is applied, and what is honestly not', () => {
  // The brief: "wire only consumers whose behavior can be made truthful now.
  // Unknown/unimplemented consequences must remain explicit rather than
  // fabricated." Measured 2026-10-18: Seating and Lodging already act on an
  // access need. Place has no venue-accessibility data to reason from, Ground
  // carries only a free-text passthrough (travelPlan.js:278), and The Day has
  // nothing. Wiring those three would mean inventing behaviour.
  test('an UNNAMED need reaches lodging and explicitly not seating', () => {
    // The correction that matters. Lodging is sized by the COUNT of people
    // needing a step-free route, so "someone uses a walker" changes the house
    // search without us knowing who. Seating seats PEOPLE — its tally is one
    // entry per roster row and its instruction names the guest. An unnamed
    // need cannot reach it without inventing a person, so it must not claim to.
    const got = accessNeedsFor(walkerEvent());
    expect(got.appliedTo).toEqual(['lodging']);
    expect(got.notYetApplied).toEqual(['seating', 'place', 'ground', 'the-day']);
  });

  test('a NAMED need reaches both', () => {
    const got = accessNeedsFor({
      id: 'ev-named', guests: [{ id: 'g1', name: 'Tonya Brooks', access: ['Step-free / wheelchair'] }],
    });
    expect(got.appliedTo).toEqual(['seating', 'lodging']);
    expect(got.notYetApplied).toEqual(['place', 'ground', 'the-day']);
  });

  test('each requirement carries its own reach, not just the event total', () => {
    const got = accessNeedsFor(walkerEvent({
      guests: [{ id: 'g1', name: 'Tonya Brooks', access: ['Step-free / wheelchair'] }],
    }));
    const bySource = Object.fromEntries(got.requirements.map((r) => [r.source, r.appliedTo]));
    expect(bySource['host-said']).toEqual(['lodging']);
    expect(bySource['guest-said']).toEqual(['seating', 'lodging']);
    // The event total is the union — one named guest does not make the
    // unnamed need seatable.
    expect(got.appliedTo).toEqual(['seating', 'lodging']);
  });

  test('with no requirement, nothing is claimed in either direction', () => {
    const got = accessNeedsFor({ id: 'ev-none' });
    expect(got.appliedTo).toEqual([]);
    expect(got.notYetApplied).toEqual([]);
  });
});

describe('INTAKE — the sentence the whole feature was built for', () => {
  // HostShellV2:9455 records the original defect verbatim: a host typed
  // "…sit-down lunch, she uses a walker" and BOTH halves vanished without a
  // word. This is that exact sentence.
  const SENTENCE = "Mom's 80th in Santa Fe, sit-down lunch, she uses a walker";

  test('the walker clause is heard, and kept in her own words', () => {
    const got = heardAccessNeeds(SENTENCE);
    expect(got).toHaveLength(1);
    expect(got[0].kind).toBe('step-free');
    expect(got[0].phrase).toBe('she uses a walker');
    expect(got[0].source).toBe('host-said');
  });

  test('only the clause that carries the need — not the whole sentence', () => {
    // Keeping the entire line would put "sit-down lunch" and the town inside
    // an access requirement, which is how a normalized field turns back into
    // free text.
    const phrase = heardAccessNeeds(SENTENCE)[0].phrase;
    expect(phrase).not.toMatch(/Santa Fe|sit-down|80th/i);
  });

  test('a sentence with no access need writes nothing', () => {
    expect(heardAccessNeeds("Mom's 80th in Santa Fe, sit-down lunch for 40")).toEqual([]);
    expect(heardAccessNeeds('')).toEqual([]);
    expect(heardAccessNeeds(null)).toEqual([]);
  });

  test('the same need said twice is recorded once', () => {
    expect(heardAccessNeeds('she uses a walker, she uses a walker')).toHaveLength(1);
  });

  test('and what intake heard flows straight into the normalized reader', () => {
    // The end of the acceptance case: sentence → stored field → requirement,
    // with no consumer re-parsing prose.
    const ev = { id: 'ev-e2e', type: 'Birthday', accessNeeds: heardAccessNeeds(SENTENCE) };
    const got = accessNeedsFor(ev);
    expect(got.requirements).toHaveLength(1);
    expect(got.requirements[0].phrase).toBe('she uses a walker');
    expect(got.requirements[0].who).toBe(null);
    // Reaches the house search, and says plainly that it has not reached the
    // table — because nobody told us whose seat it is.
    expect(got.appliedTo).toEqual(['lodging']);
    expect(got.notYetApplied).toContain('seating');
  });
});

describe('SEATING — the consumer that was blind to the word', () => {
  test('a walker now reaches the seating plan', () => {
    expect(guestNeedsAccessibleSeat({ name: 'Ruth', needs: 'she uses a walker' })).toBe(true);
  });

  test('and everything it already saw, it still sees', () => {
    expect(guestNeedsAccessibleSeat({ access: ['Step-free / wheelchair'] })).toBe(true);
    expect(guestNeedsAccessibleSeat({ access: ['Needs an accessible seat'] })).toBe(true);
    expect(guestNeedsAccessibleSeat({ needs: 'wheelchair user' })).toBe(true);
    expect(guestNeedsAccessibleSeat({ needs: 'vegetarian' })).toBe(false);
    expect(guestNeedsAccessibleSeat(null)).toBe(false);
  });

  test('the tally counts the walker guest', () => {
    const chips = dietChipsFor([
      { name: 'Ruth', rsvp: 'Yes', needs: 'she uses a walker' },
      { name: 'Ray', rsvp: 'Yes' },
    ]);
    expect(chips).toContain('Wheelchair 1');
  });
});

describe('LODGING — the consumer that was blind to the structured array', () => {
  test('a guest who answered the invite structurally now reaches the house search', () => {
    const ev = houseWith(Array.from({ length: 7 }, (_, i) => ({
      id: `g${i}`, name: `G${i}`, rsvp: 'Yes',
      ...(i === 0 ? { access: ['Step-free / wheelchair'] } : {}),
    })));
    expect(hasStepFree(ev)).toBe(true);
  });

  test('and the free text it already read still reaches it', () => {
    const ev = houseWith(Array.from({ length: 7 }, (_, i) => ({
      id: `g${i}`, name: `G${i}`, rsvp: 'Yes',
      ...(i === 0 ? { needs: 'uses a walker' } : {}),
    })));
    expect(hasStepFree(ev)).toBe(true);
  });

  test('NEGATIVE CONTROL — a house with no access need does not ask for a ground floor', () => {
    const ev = houseWith(Array.from({ length: 7 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })));
    expect(hasStepFree(ev)).toBe(false);
  });
});

describe('LODGING — the honoree who never RSVPs to her own party', () => {
  // The Santa Fe case end to end: the host says it at intake, the person it is
  // about is not a roster row, and the house still needs a ground floor.
  test('an intake-stated walker asks the house search for a ground floor', () => {
    const ev = {
      id: 'ev-santafe', type: 'Birthday', name: "Mom's 80th",
      date: '2027-06-17', endDate: '2027-06-21',
      guestMode: 'list',
      guests: Array.from({ length: 7 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
      accessNeeds: heardAccessNeeds("Mom's 80th in Santa Fe, sit-down lunch, she uses a walker"),
    };
    expect(hasStepFree(ev)).toBe(true);
  });

  test('NEGATIVE CONTROL — the same house without the clause does not', () => {
    const ev = {
      id: 'ev-santafe-2', type: 'Birthday', name: "Mom's 80th",
      date: '2027-06-17', endDate: '2027-06-21',
      guestMode: 'list',
      guests: Array.from({ length: 7 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
      accessNeeds: heardAccessNeeds("Mom's 80th in Santa Fe, sit-down lunch for 40"),
    };
    expect(hasStepFree(ev)).toBe(false);
  });
});
