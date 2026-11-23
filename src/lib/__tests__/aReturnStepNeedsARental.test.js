// A step to return the rentals needs something rented (batch 11; #230 Left,
// audit 2 lane C P1-9). The day after the wedding, After's first thing owed was
// "Return the rentals on the contract's clock — linens, glassware, chairs,
// arch…" on a plan with no rental anywhere: no rental vendor, no rental line
// in the budget, nothing rented off the seating list. A rental on record is
// what the step returns.
import { playbookChecklist, somethingIsRented } from '../playbooks';

const AS_OF = new Date('2027-10-17T12:00:00'); // the day after
const RETURNS = /^(return the rentals|get the rentals back|count the rentals back|return the tents)/i;
const ev = (type, extra = {}) => ({
  id: 'ev-' + type.replace(/\W+/g, ''), type, date: '2027-10-16', startTime: '16:00', startTimeSource: 'host',
  guestMode: 'count', guestCount: 120, totalBudget: 40000, budget: [], vendors: [], guests: [], foodChoices: {}, ...extra,
});
const returns = (e) => (playbookChecklist(e, AS_OF) || []).map((r) => String(r.task || '')).filter((s) => RETURNS.test(s));

describe('a rentals-return step needs a rental', () => {
  for (const type of ['Wedding', 'Anniversary', 'Holiday Party', 'Reunion']) {
    test(`${type}: nothing rented, no return step`, () => {
      expect(somethingIsRented(ev(type))).toBe(false);
      expect(returns(ev(type))).toEqual([]);
    });
    test(`${type}: a rental vendor brings it`, () => {
      const e = ev(type, { vendors: [{ id: 'v-r', name: 'Party Rental Co', category: 'Rentals', status: 'Booked', cost: 1800 }] });
      expect(returns(e).length).toBe(1);
    });
  }
  test('a declined rental vendor rents nothing', () => {
    expect(somethingIsRented(ev('Wedding', { vendors: [{ id: 'v-r', name: 'Tent Co', category: 'Tent', status: 'Declined' }] }))).toBe(false);
  });
  test('a rental line in the budget counts', () => {
    expect(somethingIsRented(ev('Wedding', { budget: [{ id: 'b1', category: 'Rentals', estimated: 900 }] }))).toBe(true);
  });
  test('a rented item she got off the seating list counts; one she owns does not', () => {
    expect(somethingIsRented(ev('Wedding', { capacityChecked: { chairs: true } }))).toBe(true);
    expect(somethingIsRented(ev('Wedding', { capacityChecked: { chairs: true }, capacityOwned: { chairs: true } }))).toBe(false);
  });
});
