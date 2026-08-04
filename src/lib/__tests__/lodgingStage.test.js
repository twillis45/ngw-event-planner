// ─── ONE MOMENT AT A TIME (lodging reimagine, 2026-08-03) ──────────────────
//
// Host, after reading the live panel end to end: "not very readable... we need
// way more than folding."
//
// The sheet was five surfaces wearing one scroll — a search launcher, an
// intake, a comparison, a commitment and a record. Those are five different
// MOMENTS and a host is only ever in one, so stacking them made the host work
// out which part was theirs every single time.
//
// lodgingStage derives that moment from data the app already holds. The rules
// this gate holds:
//   · the stage is DERIVED, never stored — no new field, no second truth
//   · choosing is NOT booking, and the stage never says it is
//   · every stage stays reachable; only one is loud
const { lodgingStage, LODGING_STAGES } = require('../lodgingIntel');

const opt = (o) => ({ status: 'option', ...o });
const base = {
  id: 'ev-stage', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21',
  isDestination: true, guestCount: 10,
  budget: [], vendors: [], guests: [],
};
const withTown = { ...base, venueCity: 'Santa Fe', venueState: 'NM' };

describe('the lodging sheet knows which moment the host is in', () => {
  it('says nothing at all for a non-destination event', () => {
    expect(lodgingStage({ ...withTown, isDestination: false })).toBeNull();
    expect(lodgingStage(null)).toBeNull();
  });

  it('no town → name the town', () => {
    const s = lodgingStage(base);
    expect(s.stage).toBe('no-town');
    expect(s.title).toMatch(/name the town/i);
  });

  it('town but nothing weighed → go look', () => {
    expect(lodgingStage(withTown).stage).toBe('looking');
  });

  it('options on the list → weighing, and it counts what fits', () => {
    const s = lodgingStage({ ...withTown, lodgingOptions: [
      opt({ id: 'a', label: 'Ranch House', sleeps: 12 }),
      opt({ id: 'b', label: 'Casa Vista', sleeps: 8 }),
    ] });
    expect(s.stage).toBe('weighing');
    expect(s.counts).toEqual({ options: 2, fits: 1, guests: 10 });
    expect(s.title).toMatch(/2 places, 1 that fit/);
  });

  it('a pick is a pick — and CHOOSING IS NOT BOOKING', () => {
    const s = lodgingStage({ ...withTown, lodgingOptions: [
      { id: 'a', label: 'Ranch House', sleeps: 12, status: 'chosen' },
    ] });
    expect(s.stage).toBe('picked');
    expect(s.title).toMatch(/Ranch House/);
    // the act still points at booking — it never claims the stay is secured
    expect(s.why).toMatch(/book it on the platform/i);
    expect(s.stage).not.toBe('booked');
  });

  it('only a real booking record reaches booked', () => {
    const picked = { ...withTown, lodgingOptions: [
      { id: 'a', label: 'Ranch House', sleeps: 12, status: 'chosen' },
    ] };
    // a typed confirmation name
    expect(lodgingStage({ ...picked, lodging: { hotelName: 'The Ranch House' } }).stage).toBe('booked');
    // or a code
    expect(lodgingStage({ ...picked, lodging: { bookingCode: 'NGW80' } }).stage).toBe('booked');
    // or a money-safe date off the confirmation
    expect(lodgingStage({ ...picked, moneyDates: { refundDeadline: '2028-05-18' } }).stage).toBe('booked');
    // whitespace is not a record
    expect(lodgingStage({ ...picked, lodging: { hotelName: '   ' } }).stage).toBe('picked');
  });

  it('keeps every stage reachable, with exactly one current', () => {
    const s = lodgingStage({ ...withTown, lodgingOptions: [opt({ id: 'a', label: 'A', sleeps: 12 })] });
    expect(s.steps.map((x) => x.id)).toEqual(LODGING_STAGES);
    expect(s.steps.filter((x) => x.current)).toHaveLength(1);
    // everything before the current stage reads as behind you, nothing after
    const i = s.steps.findIndex((x) => x.current);
    expect(s.steps.slice(0, i).every((x) => x.done)).toBe(true);
    expect(s.steps.slice(i).some((x) => x.done)).toBe(false);
  });

  it('always names one act, and never an empty one', () => {
    for (const ev of [base, withTown,
      { ...withTown, lodgingOptions: [opt({ id: 'a', label: 'Ranch House' })] },
      { ...withTown, lodgingOptions: [{ id: 'a', label: 'Ranch House', status: 'chosen' }] },
      // a nameless pick still gets a real title rather than a bare full stop
      { ...withTown, lodgingOptions: [{ id: 'a', label: '   ', status: 'chosen' }] },
      { ...withTown, lodging: { hotelName: 'The Ranch House' } }]) {
      const s = lodgingStage(ev);
      expect(String(s.act || '').trim().length).toBeGreaterThan(3);
      expect(String(s.title || '').trim().length).toBeGreaterThan(3);
      expect(String(s.why || '').trim().length).toBeGreaterThan(10);
    }
  });
});
