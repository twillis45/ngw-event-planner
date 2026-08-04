// The destination lodging axis. The timeline already carried the real work
// (room block, arrivals grid, ground transport); the READINESS ledger did not,
// so it could never be prioritised. This is the wire — and it must not invent.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { DIMENSION_LABELS, readinessSegments } from '../eventOrientation';

const NOW = new Date('2026-08-03T12:00:00Z');
const base = { id: 'e', type: 'Birthday', date: '2028-06-17', guestCount: 10 };
const ids = (ev) => deriveEventPhaseProgress(ev, NOW).items.map((i) => i.id);
const item = (ev) => deriveEventPhaseProgress(ev, NOW).items.find((i) => i.id === 'lodging');

describe('it applies ONLY when the host said destination', () => {
  test('a local event has no lodging axis at all', () => {
    expect(ids(base)).not.toContain('lodging');
  });

  test('a destination event gets one', () => {
    expect(ids({ ...base, isDestination: true })).toContain('lodging');
  });

  test('a CITY alone never conjures it — that is the venueCity trap', () => {
    expect(ids({ ...base, venueCity: 'Santa Fe', venueState: 'NM' })).not.toContain('lodging');
  });

  test('an absent isDestination is "not told", never a yes', () => {
    expect(ids({ ...base, isDestination: undefined })).not.toContain('lodging');
    expect(ids({ ...base, isDestination: false })).not.toContain('lodging');
  });
});

describe('handled means a real stored pick, never an inference', () => {
  test('destination with no lodging is OPEN', () => {
    expect(item({ ...base, isDestination: true }).handled).toBe(false);
  });

  test('an empty lodging object does not count as picked', () => {
    expect(item({ ...base, isDestination: true, lodging: {} }).handled).toBe(false);
    expect(item({ ...base, isDestination: true, lodging: { hotelName: '   ' } }).handled).toBe(false);
  });

  test('a named hotel IS handled', () => {
    expect(item({ ...base, isDestination: true, lodging: { hotelName: 'Rancho Encantado' } }).handled).toBe(true);
  });
});

describe('it outranks the things that can wait', () => {
  test('lodging is louder than food — rooms sell out, menus do not', () => {
    const all = deriveEventPhaseProgress({ ...base, isDestination: true }, NOW).items;
    const pri = (id) => (all.find((i) => i.id === id) || {}).priority;
    if (pri('food') != null) expect(pri('lodging')).toBeLessThan(pri('food'));
  });

  // WAS: expect(pri('lodging')).toBeLessThan(pri('location')) — unconditional.
  //
  // Driven live 2026-08-03: that produced a hero reading "Add the location."
  // directly above a cue for "Sort where everyone stays". Two different asks on
  // one screen, and the louder one impossible — you cannot search Airbnb, Vrbo
  // or hotels without a place, which is exactly what lodgingSearchBlocked says
  // ("Name the town and the searches open up").
  //
  // Urgency is a reason to promote an action, never a reason to promote one the
  // host cannot take. Lodging still outranks food (above); it yields to the
  // location only while the location is the thing blocking it.
  test('but it yields to the location while the town is unknown', () => {
    const noTown = deriveEventPhaseProgress({ ...base, isDestination: true }, NOW).items;
    const p = (id) => (noTown.find((i) => i.id === id) || {}).priority;
    expect(p('lodging')).toBeGreaterThan(p('location'));
  });

  test('and outranks it again once the town is known', () => {
    const withTown = deriveEventPhaseProgress(
      { ...base, isDestination: true, venue: 'Santa Fe, NM', venueCity: 'Santa Fe', venueState: 'NM' }, NOW).items;
    const p = (id) => (withTown.find((i) => i.id === id) || {}).priority;
    // location is handled now, but the ordering must still favour lodging
    expect(p('lodging')).toBeLessThan(p('location'));
  });

  test('it routes somewhere real, and only while open', () => {
    const open = readinessSegments(deriveEventPhaseProgress({ ...base, isDestination: true }, NOW))
      .find((s) => s.id === 'lodging');
    expect(open.route).toEqual({ tab: 'Travel', focusField: 'lodging' });
    const done = readinessSegments(deriveEventPhaseProgress(
      { ...base, isDestination: true, lodging: { hotelName: 'Rancho Encantado' } }, NOW,
    )).find((s) => s.id === 'lodging');
    expect(done.route).toBeNull();
  });

  test('it has a plain-language name, not the raw id', () => {
    expect(DIMENSION_LABELS.lodging).toBe('Where everyone stays');
  });
});

describe('the denominator moves honestly', () => {
  test('marking an event destination ADDS a part rather than re-scoring the old ones', () => {
    const local = deriveEventPhaseProgress(base, NOW);
    const dest = deriveEventPhaseProgress({ ...base, isDestination: true }, NOW);
    expect(dest.totalCount).toBe(local.totalCount + 1);
    expect(dest.completedCount).toBe(local.completedCount);
  });
});
