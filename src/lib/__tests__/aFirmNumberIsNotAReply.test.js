// ─── A FIRM NUMBER IS NOT A REPLY ───────────────────────────────────────────
//
// PEOPLE/ATTENDANCE REDESIGN, step 3.
//
// THE DEFECT THIS WAS WRITTEN AGAINST, found while writing the product contract
// rather than after shipping a screen:
//
//   `attendanceBand().confirmed` means "people said yes" on basis 'rsvp' —
//   and on basis 'count' it is `confirmed: n`, THE HOST'S OWN NUMBER, with
//   nobody having replied at all (playbooks/index.js:708-711 vs :721-723).
//
// A People surface that rendered `band.confirmed` under "N have confirmed
// they're coming" would therefore be truthful on a roster and a lie on a
// headcount. One field, two meanings — the repo's named recurring defect, and
// the exact shape Sprint 0 spent eight slices removing from other fields.
//
// So the rule under test is not a preference. It is: THE WORD IS CHOSEN FROM
// THE BASIS, in one place, where a test can see it.
import { attendanceStatement, FORBIDDEN_ON_SCREEN } from '../attendanceStatement';
import { attendanceBand } from '../playbooks';

const base = (over = {}) => ({
  id: 'ev-att', type: 'Birthday', name: "Mom's 80th", date: '2027-06-17', ...over,
});

// A roster of real replies. `rsvpState` reads these.
const roster = (spec) => spec.map((r, i) => ({
  id: 'g' + i, name: 'Guest ' + i, rsvp: r.rsvp, kids: r.kids || 0, plusOne: r.plusOne || '',
}));

describe('the three kinds of truth are never given the same words', () => {
  test('A ROSTER says people replied, because they did', () => {
    const s = attendanceStatement(base({
      guestMode: 'list',
      guests: roster([{ rsvp: 'Yes' }, { rsvp: 'Yes' }, { rsvp: 'Pending' }]),
    }));
    expect(s.standing).toBe('replied');
    expect(s.headline).toMatch(/said yes/);
    expect(s.stillOut).toBe(1);
  });

  test('A SETTLED HEADCOUNT NEVER SAYS ANYONE REPLIED — this is the defect', () => {
    // The premise, asserted so this test cannot pass for the wrong reason: the
    // engine really does report `confirmed: 40` here with an empty roster.
    const ev = base({ guestMode: 'count', guestCount: 40, guestCountSource: 'host', guestCountLocked: true });
    const band = attendanceBand(ev);
    expect({ basis: band.basis, confirmed: band.confirmed }).toEqual({ basis: 'count', confirmed: 40 });

    const s = attendanceStatement(ev);
    expect(s.standing).toBe('firm');
    // The words the engine's own `confirmed: 40` would have produced if the
    // surface read the field instead of the basis.
    expect(s.headline).not.toMatch(/said yes|replied|repl(y|ies)|confirmed/i);
    expect(s.stillOut).toBe(0);
  });

  test('AN ESTIMATE says what it is — a typical outcome, not an answer', () => {
    const s = attendanceStatement(base({ guestEstimate: 40, guestCountSource: 'host' }));
    expect(s.standing).toBe('expected');
    expect(s.headline).not.toMatch(/said yes|replied|confirmed/i);
    expect(s.figure).toMatch(/^\d+–\d+$/);          // a real band, not a point
  });
});

describe('whose number it is reaches the surface', () => {
  test("the host's own estimate is hers, and carries no apology", () => {
    const s = attendanceStatement(base({ guestEstimate: 40, guestCountSource: 'host' }));
    expect(s.fromHost).toBe(true);
    expect(s.notice).toBe(null);
    expect(s.because).not.toMatch(/not a number you gave/);
  });

  test('AN APP-SUPPLIED NUMBER SAYS SO, in her language, on the surface itself', () => {
    // Sprint 0.5 D1 put the disclosure in `because`; this is the assertion that
    // it actually reaches a host rather than sitting in an engine field.
    const s = attendanceStatement(base({ guestEstimate: 40, guestCountSource: 'playbook-typical' }));
    expect(s.fromHost).toBe(false);
    expect(s.because).toMatch(/not a number you gave/);
    expect(s.notice).toMatch(/typical headcount/i);
    expect(s.notice).toMatch(/not in anything we send until you confirm/i);
  });

  test('a roster is hers by construction', () => {
    const s = attendanceStatement(base({ guestMode: 'list', guests: roster([{ rsvp: 'Yes' }]) }));
    expect(s.fromHost).toBe(true);
  });

  test('a legacy event with no recorded source is treated as hers, deliberately', () => {
    // guestCountFor's own ruling: "treating unknown as derived would withhold
    // real headcounts from real vendor briefs — a worse failure, and a silent
    // one." The surface must not invent doubt the engine refuses to invent.
    const s = attendanceStatement(base({ guestEstimate: 40 }));
    expect(s.fromHost).toBe(true);
    expect(s.notice).toBe(null);
  });
});

describe('the figure is the engine’s, not a second derivation', () => {
  test('it is exactly attendanceBandLabel, band and point alike', () => {
    for (const ev of [
      base({ guestMode: 'list', guests: roster([{ rsvp: 'Yes' }, { rsvp: 'Pending' }]) }),
      base({ guestEstimate: 40, guestCountSource: 'host' }),
      base({ guestMode: 'count', guestCount: 40, guestCountSource: 'host', guestCountLocked: true }),
    ]) {
      const band = attendanceBand(ev);
      const expected = band.band ? `${band.low}–${band.high}` : String(band.high);
      expect(attendanceStatement(ev).figure).toBe(expected);
    }
  });

  test('a plus-one is a person in the figure, because the engine says so', () => {
    const one = attendanceStatement(base({ guestMode: 'list', guests: roster([{ rsvp: 'Yes' }]) }));
    const withPo = attendanceStatement(base({
      guestMode: 'list', guests: roster([{ rsvp: 'Yes', plusOne: 'Ray' }]),
    }));
    expect(withPo.headline).not.toEqual(one.headline);
    expect(withPo.headline).toMatch(/2 people said yes/);
  });

  test('only a confirmed row’s kids are locked in', () => {
    // The low end counts a yes-row's kids and not a pending row's — the rule
    // that stopped a caterer being told 5 when 7 were eating.
    const s = attendanceStatement(base({
      guestMode: 'list',
      guests: roster([{ rsvp: 'Yes', kids: 2 }, { rsvp: 'Pending', kids: 3 }]),
    }));
    const band = attendanceBand(base({
      guestMode: 'list',
      guests: roster([{ rsvp: 'Yes', kids: 2 }, { rsvp: 'Pending', kids: 3 }]),
    }));
    expect(band.low).toBe(3);        // 1 yes + its 2 kids
    expect(s.figure).toBe(`${band.low}–${band.high}`);
  });

  test('unit agrees with the figure', () => {
    expect(attendanceStatement(base({ guestMode: 'list', guests: roster([{ rsvp: 'Yes' }]) })).unit).toBe('guest');
    expect(attendanceStatement(base({ guestMode: 'count', guestCount: 40, guestCountLocked: true })).unit).toBe('guests');
  });
});

describe('what the plan prepares for is shown only when it disagrees', () => {
  test('silent when the two agree, which is the normal case', () => {
    expect(attendanceStatement(base({ guestEstimate: 40, guestCountSource: 'host' })).preparingFor).toBe(null);
  });

  test('named when an explicit estimate outruns the roster', () => {
    // sizingGuests: "An explicit estimate that EXCEEDS a roster still wins (the
    // host told us to expect more)." Without this the food sizes past her yeses
    // with nothing on screen saying why.
    const s = attendanceStatement(base({
      guestMode: 'list', guestEstimate: 60,
      guests: roster([{ rsvp: 'Yes' }, { rsvp: 'Yes' }]),
    }));
    expect(s.preparingFor).toBe(60);
  });
});

describe('silence, and the words that may never appear', () => {
  test('an event with no headcount signal says nothing at all', () => {
    expect(attendanceStatement(base()).known).toBe(false);
    expect(attendanceStatement(null).known).toBe(false);
    expect(attendanceStatement(base({ guestCount: 0, guestEstimate: 0 })).known).toBe(false);
  });

  test('NO DEVELOPER VOCABULARY leaves this module', () => {
    const ev = base({ guestMode: 'list', guests: roster([{ rsvp: 'Yes' }, { rsvp: 'Pending' }]) });
    const strings = Object.values(attendanceStatement(ev))
      .filter((v) => typeof v === 'string').join(' ').toLowerCase();
    const leaked = FORBIDDEN_ON_SCREEN.filter((w) => strings.includes(w.toLowerCase()));
    expect(leaked).toEqual([]);
  });

  test('a broken event does not take the surface down with it', () => {
    for (const bad of [{ guests: 'not-an-array' }, { guestCount: 'abc' }, { type: null }]) {
      expect(() => attendanceStatement(base(bad))).not.toThrow();
    }
  });
});
