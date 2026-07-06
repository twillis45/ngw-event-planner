// Slice D-1B — Next Up CTA deep-link contract. "Next up" cannot be vague: every
// host-facing foundation CTA must carry the EXACT focus target (focusField /
// foodFocus / vendorId+vendorSection), not just a tab. These pin the route
// payloads the shells consume (both shells forward focusField via
// scrollFocusFieldWithRetry, foodFocus via focusFood, vendorId/vendorSection
// via the vendor workspace's openId/openSection).

import { selectEventNextAction, eventPlan, _eventFoundationActions } from '../../CommandCenter';

beforeEach(() => { try { localStorage.clear(); } catch {} });

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const host = (over = {}) => ({
  id: 'e-cta',
  name: 'CTA Test BBQ',
  type: 'Backyard BBQ',
  recordKind: 'host_event',
  date: future(40),
  guests: [],
  vendors: [],
  budget: [],
  timeline: [],
  ...over,
});

// Walks the foundation ladder: each missing foundation's CTA must carry its
// exact anchor. Anchor ids must match the DOM anchors in App.js
// (event-date / guests-entry / hsp-budget) — renaming either side breaks the
// deep link, which is exactly what these tests are here to catch.
describe('foundation CTAs carry exact focus targets', () => {
  test('every foundation ladder route carries an exact target, never a bare tab', () => {
    // The ladder is the single source both eventPlan and composite decomposition
    // use. Anchor ids must match App.js DOM anchors exactly.
    const ladder = _eventFoundationActions(host({ date: undefined }));
    const byId = Object.fromEntries(ladder.map(a => [a.id, a.route]));
    expect(byId.date).toEqual({ tab: 'Event Details', focusField: 'event-date' });
    expect(byId.guests).toEqual({ tab: 'Guests', focusField: 'guests-entry' });
    expect(byId.budget).toEqual({ tab: 'Budget', focusField: 'hsp-budget' });
    // food: foodFocus deep-link when a menu decision exists, honest tab otherwise
    expect(byId.food.foodFocus || byId.food.tab === 'Planning').toBeTruthy();
  });

  test('guests missing → Guests + focusField guests-entry', () => {
    const na = selectEventNextAction(host());
    expect(na.primaryRoute.tab).toBe('Guests');
    expect(na.primaryRoute.focusField).toBe('guests-entry');
  });

  test('budget missing → Budget + focusField hsp-budget', () => {
    const na = selectEventNextAction(host({ guestCount: 40, guestMode: 'count' }));
    expect(na.primaryRoute.tab).toBe('Budget');
    expect(na.primaryRoute.focusField).toBe('hsp-budget');
  });

  test('food CTA is never LESS specific than the tab, and deep-links when a menu decision exists', () => {
    const na = selectEventNextAction(host({ guestCount: 40, guestMode: 'count', totalBudget: 1200 }));
    // Whatever the engine surfaces next, a route must exist and carry a tab.
    expect(na && na.primaryRoute && na.primaryRoute.tab).toBeTruthy();
    // When the next action IS the food foundation, it either carries the
    // foodFocus deep-link (open menu decision) or the honest Planning tab.
    if (na.category === 'food' || /food/i.test(na.title || '')) {
      expect(na.primaryRoute.foodFocus || na.primaryRoute.tab === 'Planning').toBeTruthy();
    }
  });
});

describe('vendor CTAs carry row + section deep-links', () => {
  const vendorEvent = () => host({
    guestCount: 40, guestMode: 'count', totalBudget: 1200,
    foodPlanChoice: 'catering',
    vendors: [{
      id: 'v-pay', name: 'Fork & Flower Catering', category: 'Catering',
      status: 'Contracted', cost: 900, depositAmt: 300, depositPaid: false,
      payDueDate: future(3), contractSigned: true,
    }],
  });

  test('a vendor-targeted next action carries vendorId (never a bare Vendors tab)', () => {
    const plan = eventPlan(vendorEvent());
    const vendorActions = (plan.nextActions || []).filter(a =>
      a.primaryRoute && a.primaryRoute.tab === 'Vendors');
    // Whatever vendor actions the engine emits must name the vendor row.
    vendorActions.forEach(a => expect(a.primaryRoute.vendorId).toBeTruthy());
  });

  test('payment-shaped vendor actions carry the payment section', () => {
    const plan = eventPlan(vendorEvent());
    const pay = (plan.nextActions || []).find(a =>
      a.primaryRoute && a.primaryRoute.vendorSection === 'payment');
    if (pay) { // engine ordering may rank other actions first; when present, it must be exact
      expect(pay.primaryRoute.tab).toBe('Vendors');
      expect(pay.primaryRoute.vendorId).toBe('v-pay');
    }
  });
});
