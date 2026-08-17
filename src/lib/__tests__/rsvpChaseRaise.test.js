// ─── WHEN THE REPLY-BY PASSES AND NOBODY SAID ANYTHING ──────────────────────
//
// W8 named "the missing reply-by/silent-guest PRODUCER" as a Coverage cap and it
// was still open five weeks later. Re-derived 2026-08-17 against the real
// `raiseAll`: a Wedding with a HARD reply-by five days past and three of five
// guests silent produced FOURTEEN raises, and not one was about the silence. The
// only RSVP-ish match was the standing risk card "Final headcount wrong or late
// to the caterer" — which renders identically whether every guest has replied or
// none has, so it is a worry, not a reading of this event.
//
// Every other piece already existed: `rsvpDeadlineFor` reads the date,
// `rsvpHasResponded` reads the state, `draftRsvpChase` writes the message. Only
// the raiser was missing.
//
// MOST OF THIS FILE TESTS SILENCE, and that is deliberate. A chase that fires
// when it should not is worse than none: it tells a host their friends are late
// when they are not, and it does it about named people. The refusals below are
// the feature.
import { raiseAll } from '../surfaceRegistry';

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EV = (over = {}) => ({
  id: 'ev-rsvp', type: 'Wedding', date: isoIn(20), guestMode: 'list',
  venue: 'The Hall', venueCity: 'Santa Fe, NM', venueState: 'NM', totalBudget: 9000,
  rsvpDeadline: isoIn(-5),
  guests: [
    { id: 'g1', name: 'Ana', rsvp: 'Yes' },
    { id: 'g2', name: 'Ben', rsvp: '' },
    { id: 'g3', name: 'Cara', rsvp: '' },
    { id: 'g4', name: 'Dee', rsvp: '' },
    { id: 'g5', name: 'Eli', rsvp: 'No' },
  ],
  ...over,
});

const chases = (event) => (raiseAll(event) || []).filter((r) => r && r.key === 'rsvp-chase');

describe('it speaks when the reply-by has actually passed', () => {
  test('PREMISE — the fixture produces a real raise ledger, not an empty one', () => {
    // Without this, every silence assertion below could pass because raiseAll
    // threw and returned nothing.
    expect((raiseAll(EV()) || []).length).toBeGreaterThan(5);
  });

  test('three silent guests past a hard reply-by raises exactly one row', () => {
    const rows = chases(EV());
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('3 guests still have not replied');
  });

  test('it says how late, and how many DID answer', () => {
    // The host's real question is not "how many are missing" alone — it is
    // whether this is a crisis or two stragglers.
    const [row] = chases(EV());
    expect(row.why).toMatch(/passed 5 days ago/);
    expect(row.why).toMatch(/2 of 5 have answered/);
  });

  test('it lands on a person, never on a tab', () => {
    const [row] = chases(EV());
    expect(row.route.tab).toBe('Guests');
    expect(row.route.guestId).toBe('g2');        // the first still owed a reply
    expect(row.dueInDays).toBe(-5);              // genuinely past, so it ranks as late
  });

  test('one silent guest reads as one, not as a plural', () => {
    const rows = chases(EV({ guests: [
      { id: 'g1', name: 'Ana', rsvp: 'Yes' },
      { id: 'g2', name: 'Ben', rsvp: '' },
    ] }));
    expect(rows[0].title).toBe('1 guest still has not replied');
  });
});

describe('and stays quiet everywhere else', () => {
  test('a reply-by still in the future raises nothing — silence is not lateness yet', () => {
    expect(chases(EV({ rsvpDeadline: isoIn(5) }))).toEqual([]);
  });

  test('with NO host-set date, nothing is ever chased — at any distance', () => {
    // Asserts the real property rather than the one I first claimed. My original
    // version of this test said "a SOFT deadline raises nothing" and passed for
    // the wrong reason: rsvpDeadlineFor marks its DERIVED default hard:true too,
    // so the `hard !== true` guard was not what refused it. Removing that guard
    // turned nothing red, which is how the mistake surfaced.
    //
    // What actually holds: a derived deadline is event − 7d (never past while the
    // event is ≥7 days out), and inside 7 days the answer is hard:false with a
    // positive `days`. So no non-override branch can be late. Swept across the
    // range rather than spot-checked at 20 days, which is what hid it.
    for (const dte of [3, 6, 7, 8, 14, 30, 90]) {
      const ev = EV({ date: isoIn(dte) });
      delete ev.rsvpDeadline;
      expect(chases(ev)).toEqual([]);
    }
  });

  test('everyone answered — no row, not a zero row', () => {
    expect(chases(EV({ guests: [
      { id: 'g1', name: 'Ana', rsvp: 'Yes' },
      { id: 'g2', name: 'Ben', rsvp: 'No' },
    ] }))).toEqual([]);
  });

  test('a headcount event has nobody to chase', () => {
    // No named guests means no one to write to; a count cannot be nagged.
    expect(chases(EV({ guestMode: 'count', guestCount: 40, guests: [] }))).toEqual([]);
  });

  test('a past event raises nothing — the reply-by is moot', () => {
    expect(chases(EV({ date: isoIn(-3), rsvpDeadline: isoIn(-20) }))).toEqual([]);
  });

  test('a guest with no id is skipped rather than routed at nothing', () => {
    // The route lands on a person; a person with no id has no row to land on.
    const rows = chases(EV({ guests: [
      { id: 'g1', name: 'Ana', rsvp: 'Yes' },
      { name: 'Nameless', rsvp: '' },
    ] }));
    expect(rows).toEqual([]);
  });

  test('junk input is answered, not thrown at', () => {
    expect(() => raiseAll({ id: 'x', type: 'Wedding', date: isoIn(10), rsvpDeadline: 'not-a-date' })).not.toThrow();
    expect(() => raiseAll({ id: 'x', type: 'Wedding', date: isoIn(10), guests: null })).not.toThrow();
  });
});
