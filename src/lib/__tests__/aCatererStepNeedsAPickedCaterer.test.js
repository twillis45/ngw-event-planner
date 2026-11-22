// A step that presumes a caterer ("Confirm your caterer…", "Pay … the caterer's
// final headcount charge") shows only once a caterer is picked or booked. Our
// recommendation is not her pick: Birthday's "Order pizza/trays" proposal at 20
// guests put the caterer's invoice on the list of a host who had hired no one
// (audit 2 lane A P1-12).
import { playbookChecklist } from '../playbooks';

const AS_OF = new Date('2026-11-22T12:00:00');
const bday = (extra = {}) => ({
  id: 'ev-bd', type: 'Birthday', name: "Tony's 40th", date: '2027-03-06',
  guestMode: 'count', guestCount: 20, totalBudget: 3100, budget: [], vendors: [], guests: [],
  venue: 'Our place, Annapolis, MD', ...extra,
});
const catererSteps = (ev) => (playbookChecklist(ev, AS_OF) || [])
  .map((r) => String(r.task || r.label || '')).filter((s) => /\bcaterer/i.test(s));

describe('a caterer step needs a picked or booked caterer', () => {
  test('no pick, no booking: no caterer step', () => {
    expect(catererSteps(bday())).toEqual([]);
  });
  test('"We’ll cook it": no caterer step', () => {
    expect(catererSteps(bday({ foodChoices: { sourcing: 'host cooks' } }))).toEqual([]);
  });
  test('her caterer pick brings the caterer steps', () => {
    expect(catererSteps(bday({ foodChoices: { food_style: 'Drop-off catering' } })).length).toBeGreaterThan(0);
  });
  test('a booked caterer brings them too', () => {
    const vendors = [{ id: 'v1', name: 'Capital Catering', category: 'Catering', status: 'Booked', cost: 1800 }];
    expect(catererSteps(bday({ vendors })).length).toBeGreaterThan(0);
  });
  test('a plan whose every option is catered keeps its caterer steps (Wedding)', () => {
    const wed = { id: 'ev-w', type: 'Wedding', date: '2027-10-16', guestMode: 'count', guestCount: 150, totalBudget: 40000, vendors: [], guests: [] };
    expect(catererSteps(wed).length).toBeGreaterThan(0);
  });
});
