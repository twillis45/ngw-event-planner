// "We'll cook it" is the host's answer to who carries the meal. A menu-format
// pick after it ("Buffet / trays") says how the food is laid out, not who makes
// it — and "trays" on a buffet is a serving dish, not an order (audit 2 lane A
// P0-4, Graduation: the plan flipped to catered and asked her to "Confirm your
// caterer and send them the final headcount").
import { foodApproach, playbookChecklist, CATERER_OPTION_RE } from '../playbooks';

const AS_OF = new Date('2026-11-22T12:00:00');
const grad = (foodChoices) => ({
  id: 'ev-grad', type: 'Graduation', name: "Marcus's Graduation", date: '2027-03-02',
  guestMode: 'count', guestCount: 35, totalBudget: 0, budget: [], vendors: [], guests: [],
  venue: 'Our backyard, Columbia, MD', foodChoices,
});
const steps = (ev) => (playbookChecklist(ev, AS_OF) || []).map((r) => r.task || r.label || '');

describe('the host’s sourcing answer outranks a menu-format pick', () => {
  test('"We’ll cook it" + "Buffet / trays" stays host-cooked', () => {
    const fa = foodApproach(grad({ sourcing: 'host cooks', food_menu: 'Buffet / trays' }));
    expect(fa.usesCaterer).toBe(false);
    expect(fa.cooking).toBe(true);
  });

  test('…and no caterer step is added for her', () => {
    expect(steps(grad({ sourcing: 'host cooks', food_menu: 'Buffet / trays' })).filter((s) => /cater/i.test(s))).toEqual([]);
  });

  test('a menu pick that names an order does not outrank "We’ll cook it" either', () => {
    // Sweet 16's "Pizza + sides" is a menu, asked after the approach.
    const fa = foodApproach({ type: 'Sweet 16', guestMode: 'count', guestCount: 40, date: '2027-05-01', foodChoices: { sourcing: 'host cooks', food_menu: 'Pizza + sides' } });
    expect(fa.usesCaterer).toBe(false);
  });

  test('a buffet of trays is not an order; ordering trays still is', () => {
    expect(CATERER_OPTION_RE.test('Buffet / trays')).toBe(false);
    expect(CATERER_OPTION_RE.test('Order trays')).toBe(true);
    expect(CATERER_OPTION_RE.test('Order pizza/trays')).toBe(true);
  });

  test('the host’s own catered answer on the dedicated lever still wins over "We’ll cook it"', () => {
    const fa = foodApproach(grad({ sourcing: 'host cooks', food_style: 'Drop-off catering / BBQ' }));
    expect(fa.usesCaterer).toBe(true);
  });
});
