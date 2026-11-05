import { foodApproach, playbookFoodPlan } from '../playbooks';
import { buildVendorPlan } from '../vendorPlan';
import { SURFACES } from '../surfaceRegistry';
import { eventPlan } from '../../CommandCenter';
import { localISO } from '../dates';

const event = (foodChoices = {}, vendors = []) => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return { id: 'chosen-caterer', type: 'Dinner Party', date: localISO(date),
    guestCount: 20, guestMode: 'count', foodChoices, vendors, guests: [], budget: [], timeline: [] };
};

test('an explicit generic caterer answer outranks an unanswered authored default', () => {
  const ev = event({ sourcing: 'caterer' });
  expect(foodApproach(ev).usesCaterer).toBe(true);
  expect(foodApproach(ev).decisionId).toBe(null);
  const plan = playbookFoodPlan(ev);
  expect(plan.list.some(i => i.id === 'fa-catering')).toBe(true);
  expect(plan.list.filter(i => i.group === 'Food' && i.id !== 'fa-catering')).toEqual([]);
});

test('an explicit authored meal answer retains precedence over the generic fallback', () => {
  const ev = { ...event({ sourcing: 'caterer', food_style: 'Cook/grill yourself' }), type: 'Birthday' };
  expect(foodApproach(ev)).toEqual(expect.objectContaining({ decisionId: 'food_style', usesCaterer: false }));
  expect(playbookFoodPlan(ev).list.some(i => i.id === 'fa-catering')).toBe(false);
});

test('a chosen caterer becomes a required existing category and enters canonical attention', () => {
  const ev = event({ sourcing: 'caterer' });
  const category = buildVendorPlan(ev).categories.find(c => /catering/i.test(c.category));
  expect(category).toEqual(expect.objectContaining({ required: true, when: 'T-10d' }));
  const raiser = SURFACES.find(s => s.id === 'vendor-unbooked');
  expect(raiser.raise(ev)).toEqual(expect.arrayContaining([expect.objectContaining({ route: { tab: 'Vendors' } })]));
  expect(eventPlan(ev).nextActions.some(a => /vendor-unbooked/.test(a.id))).toBe(true);
  expect(ev.vendors).toEqual([]);
});

test('cooking keeps an optional catering category optional; a booked caterer clears the raise', () => {
  const raiser = SURFACES.find(s => s.id === 'vendor-unbooked');
  expect(buildVendorPlan(event({ sourcing: 'host cooks' })).categories.find(c => /catering/i.test(c.category)).required).toBe(false);
  expect(raiser.raise(event({ sourcing: 'caterer' }, [{ id: 'caterer', category: 'Catering', name: 'Host choice', status: 'Booked' }]))).toEqual([]);
});

test('an unanswered authored catering default cannot create a booking obligation', () => {
  const ev = { ...event(), type: 'Birthday' };
  expect(foodApproach(ev).usesCaterer).toBe(true);
  expect(buildVendorPlan(ev).categories.find(c => /catering/i.test(c.category)).required).toBe(false);
});
