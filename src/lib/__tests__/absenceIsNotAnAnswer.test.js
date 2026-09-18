// ─── THE SEAM WROTE DOWN A DECISION THE HOST NEVER MADE ──────────────────────
//
// MEASURED 2026-09-18. On every event where the parser heard NOTHING about
// travel, the creation seam persisted `isDestination: false`.
//
// That is not a harmless default. `smartParseEvent` has no affirmative "this is
// local" detector — read it (~:524): `isDestination` is `travelSaid || (a place
// that is away)`, and `destinationBasis` is null whenever that comes out false.
// So a parser-derived false has only ever meant NO TRAVEL SIGNAL WAS FOUND.
// Writing it turned a silence into an answer, and `isDestination` is read by 25
// modules: a false deletes the travel, lodging and transport stack and leaves
// the budget band un-adjusted.
//
// The bases are the other half. The creation chips render "· heard",
// "· not your area" and "· from your dates" off `destinationBasis` and
// `overnightBasis` — then the seam dropped both, so one screen later nothing
// could say why the app believed it.
//
// WHY THIS TEST CAN EXIST AT ALL. The rule used to be four `...( ? : {})`
// spreads inside hostv2, which jest cannot execute — so it could only ever have
// been checked by reading source, which is how the text-gate ratchet climbed
// five times today. Extracting the rule is the fix for that too: what follows
// runs the real decision table.
import { travelFieldsToPersist } from '../travelFieldsToPersist';

const F = (o) => travelFieldsToPersist(o);

describe('a silence is never written down as an answer', () => {
  test('THE DEFECT: nothing heard about travel writes NOTHING', () => {
    // "Cookout on June 12, 2027" — no travel language, no place away.
    expect(F({ effIsDestination: false, manualIsDestination: null, destinationBasis: null }))
      .toEqual({});
  });

  test('an ungrounded guess also writes nothing (the earlier half, still holding)', () => {
    // `place-named` with no home city to compare against resolves to null.
    expect(F({ effIsDestination: null, manualIsDestination: null, destinationBasis: 'place-named' }))
      .toEqual({});
  });

  test('NEGATIVE CONTROL: the host tapping "Local event" IS an answer', () => {
    // A gate that never records a false would lose a real host decision.
    expect(F({ effIsDestination: false, manualIsDestination: false }))
      .toEqual({ isDestination: false });
  });

  test('a real finding is recorded, with the reason the chip showed', () => {
    expect(F({ effIsDestination: true, manualIsDestination: null, destinationBasis: 'travel-language' }))
      .toEqual({ isDestination: true, destinationBasis: 'travel-language' });
  });

  test('the other grounded basis rides too', () => {
    expect(F({ effIsDestination: true, manualIsDestination: null, destinationBasis: 'place-differs-from-your-area' }).destinationBasis)
      .toBe('place-differs-from-your-area');
  });
});

describe('a reason is ours to give, not to put in the host’s mouth', () => {
  test('the host setting the chip themselves gets NO basis attached', () => {
    // The basis explains the APP's finding. Stapling it to the host's own tap
    // would be the app claiming their decision was its own inference.
    const out = F({ effIsDestination: true, manualIsDestination: true, destinationBasis: 'travel-language' });
    expect(out.isDestination).toBe(true);
    expect(out.destinationBasis).toBeUndefined();
  });

  test('same rule for overnight', () => {
    const heard = F({ effOvernight: true, manualOvernight: null, overnightBasis: 'said-so' });
    expect(heard).toEqual({ guestsStayOvernight: true, overnightBasis: 'said-so' });
    const tapped = F({ effOvernight: true, manualOvernight: true, overnightBasis: 'said-so' });
    expect(tapped).toEqual({ guestsStayOvernight: true });
  });
});

describe('overnight keeps the rule it already had', () => {
  test('unknown stays absent — not false', () => {
    expect(F({ effOvernight: null }).guestsStayOvernight).toBeUndefined();
  });

  test('a real no is recorded', () => {
    expect(F({ effOvernight: false, manualOvernight: false }).guestsStayOvernight).toBe(false);
  });

  test('the multi-day-span reason is carried', () => {
    expect(F({ effOvernight: true, overnightBasis: 'multi-day-span' }).overnightBasis).toBe('multi-day-span');
  });
});

describe('travel mode cannot outlive the flag that gives it meaning', () => {
  test('never written for a non-destination', () => {
    expect(F({ effIsDestination: false, manualIsDestination: false, travelMode: 'fly' }).travelMode)
      .toBeUndefined();
  });

  test('never written when the flag was never answered', () => {
    expect(F({ effIsDestination: null, travelMode: 'fly' }).travelMode).toBeUndefined();
  });

  test('written for a real destination', () => {
    expect(F({ effIsDestination: true, travelMode: 'fly' }).travelMode).toBe('fly');
  });
});

describe('it never invents a field', () => {
  test('no arguments at all produces an empty patch', () => {
    expect(F()).toEqual({});
    expect(F({})).toEqual({});
  });

  test('every key returned was asked for — no defaults leak in', () => {
    // Spread into the stored event, so a stray key is a stored claim.
    const out = F({ effIsDestination: true, destinationBasis: 'travel-language', effOvernight: true, overnightBasis: 'said-so', travelMode: 'drive' });
    expect(Object.keys(out).sort()).toEqual(
      ['destinationBasis', 'guestsStayOvernight', 'isDestination', 'overnightBasis', 'travelMode'],
    );
  });

  test('a basis with no flag behind it is never stored alone', () => {
    // An orphan reason is a claim about a fact that was not recorded.
    expect(F({ effIsDestination: false, destinationBasis: 'travel-language' }).destinationBasis).toBeUndefined();
    expect(F({ effOvernight: null, overnightBasis: 'said-so' }).overnightBasis).toBeUndefined();
  });
});
