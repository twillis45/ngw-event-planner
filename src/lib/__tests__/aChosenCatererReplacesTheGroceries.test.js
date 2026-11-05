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

test.each(['Crab Feast', 'Fish Fry', 'Thanksgiving Hosting'])('an explicit caterer on %s has an unpriced, undated role instead of disappearing', type => {
  const ev = { ...event({ sourcing: 'caterer' }), type };
  const roles = buildVendorPlan(ev).categories.filter(c => c.category === 'Catering');
  expect(roles).toHaveLength(1);
  expect(roles[0]).toEqual(expect.objectContaining({ required: true, when: null, estimateLow: null, estimateHigh: null, booked: false }));
  const action = SURFACES.find(s => s.id === 'vendor-unbooked').raise(ev).find(a => /catering/i.test(a.title));
  expect(action).toEqual(expect.objectContaining({ dueInDays: null, leadDays: null, route: { tab: 'Vendors' } }));
  expect(action.why).toMatch(/you chose/i);
  expect(action.why).not.toMatch(/past|late|overdue|days/i);
  expect(ev.vendors).toEqual([]);
});

test('an explicit catering choice can be acted on before its authored booking deadline', () => {
  const date = new Date();
  date.setDate(date.getDate() + 45);
  const ev = { ...event({ sourcing: 'caterer' }), date: localISO(date) };
  const action = SURFACES.find(s => s.id === 'vendor-unbooked').raise(ev).find(a => /catering/i.test(a.title));
  expect(action).toBeTruthy();
  expect(action.dueInDays).toBe(35);
  expect(action.why).toMatch(/you chose/i);
  expect(action.why).not.toMatch(/past|late|overdue/i);
});

test('derived catering roles require an explicit answer and clear when the caterer is booked', () => {
  const raiser = SURFACES.find(s => s.id === 'vendor-unbooked');
  const absent = { ...event(), type: 'Crab Feast' };
  expect(buildVendorPlan(absent).categories.some(c => c.category === 'Catering')).toBe(false);
  const ev = { ...absent, foodChoices: { sourcing: 'caterer' }, vendors: [{ id: 'v', category: 'Caterer', status: 'Booked', name: 'Host choice' }] };
  expect(raiser.raise(ev).some(a => /catering/i.test(a.title))).toBe(false);
});
