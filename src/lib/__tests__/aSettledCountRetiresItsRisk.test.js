// A headcount risk retires once its count is settled (batch 11; audit 2 lane C
// P1-11: "the headcount risk stays up on the day before and the day itself").
// The potluck birthday had her locked 30 on file from creation, and the day
// before and the day itself still read "If final headcount still not locked 3
// days out". The same rule the allergy risk follows (it retires once the
// needs are noted): a risk about a missing fact retires when the fact is in.
//   · "…still not confirmed / locked N days out" retires on a locked count
//     (an estimate is not a final count);
//   · "…wrong or late to the caterer" and "…guarantee … on a stale number"
//     retire once the caterer has been given a count, or no caterer is hired.
import { playbookRisks } from '../playbooks';

const triggers = (ev) => ((playbookRisks(ev) || {}).items || []).map((r) => r.trigger);
const NOT_LOCKED = /final headcount still not (?:confirmed|locked)/i;

describe('a headcount risk retires on a settled count', () => {
  test('Birthday: a locked count retires "still not locked"; an estimate does not', () => {
    const base = { id: 'b', type: 'Birthday', date: '2027-06-12', guestMode: 'count', budget: [], vendors: [], guests: [] };
    expect(triggers({ ...base, guestEstimate: 30, guestCountSource: 'host' }).some((t) => NOT_LOCKED.test(t))).toBe(true);
    expect(triggers({ ...base, guestCount: 30, guestEstimate: 30 }).some((t) => NOT_LOCKED.test(t))).toBe(false);
    expect(triggers({ ...base, guestEstimate: 30, guestCountLocked: true }).some((t) => NOT_LOCKED.test(t))).toBe(false);
  });
  test('Wedding: the caterer told a count retires "wrong or late to the caterer"', () => {
    const base = { id: 'w', type: 'Wedding', date: '2027-10-16', guestMode: 'count', guestCount: 150, budget: [], guests: [],
      vendors: [{ id: 'v', name: 'Harvest Table Catering', category: 'Catering', status: 'Booked', cost: 14000 }] };
    expect(triggers(base).some((t) => /wrong or late to the caterer/i.test(t))).toBe(true);
    expect(triggers({ ...base, catererCount: 150 }).some((t) => /wrong or late to the caterer/i.test(t))).toBe(false);
  });
});
