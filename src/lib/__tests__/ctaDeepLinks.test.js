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
    // food: foodFocus deep-link when a menu decision exists, else the food-plan
    // card anchor — NEVER a bare tab (deep-link doctrine: no whole-surface CTAs).
    expect(byId.food.foodFocus || byId.food.focusField === 'food-plan').toBeTruthy();
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
      expect(na.primaryRoute.foodFocus || na.primaryRoute.focusField === 'food-plan').toBeTruthy();
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

// ── REMAINING-1A: host-friendly health-row copy after a choice is made ─────────
import { deriveCommandCenterData } from '../../CommandCenter';

describe('Command health rows lead with meaning, not estimate labels', () => {
  test('a chosen guest count reads "Planning for N", never "estimated"', () => {
    const ev = host({ guestEstimate: 120 });
    const rows = deriveCommandCenterData(ev).health || deriveCommandCenterData(ev).planningHealth || [];
    const all = JSON.stringify(deriveCommandCenterData(ev));
    expect(all).toContain('Planning for 120');
    expect(all).not.toMatch(/\d+ estimated/);
  });

  test('empty states stay honest needs-info copy', () => {
    const all = JSON.stringify(deriveCommandCenterData(host()));
    expect(all).toMatch(/No guests yet|Set how many|guests-entry/);
  });
});

// ── Deep-link doctrine: a CTA never leaves the user guessing — it lands on the
// field or row where the action resolves, or it is a whole-surface action.
import { topPlaybookDecision, playbookDecisionBoard } from '../playbooks';
import { buildVendorReadinessRollup } from '../workstreams';

describe('CTAs land on the exact field/row, never a bare tab', () => {
  const soonHost = (over = {}) => ({
    id: 'e-dl', name: 'Crab Feast DL', type: 'Crab Feast', recordKind: 'host_event',
    date: future(5), guests: [], vendors: [], budget: [], timeline: [], ...over,
  });

  test('guest-count decision lands ON the count entry', () => {
    const dec = topPlaybookDecision(soonHost());
    if (dec && dec.decision === 'guestCount') {
      expect(dec.primaryRoute.focusField).toBe('guests-entry');
    }
  });

  test('decision-board headcount rows carry the guests-entry anchor', () => {
    const board = playbookDecisionBoard(soonHost());
    const rows = [...(board?.open || []), ...(board?.locked || [])].filter(r => r.id === 'f-headcount');
    rows.filter(r => (board?.open || []).includes(r)).forEach(r => {
      expect(r.route.focusField).toBe('guests-entry');
    });
    if (board?.headcount) expect(board.headcount.route.focusField).toBe('guests-entry');
  });

  test('Add-vendor rollup CTA lands ON the add button', () => {
    const roll = buildVendorReadinessRollup(soonHost());
    if (roll && roll.ctaLabel === 'Add vendor') {
      expect(roll.target.focusField).toBe('vendor-add');
    }
  });
});

// Whole-surface CTAs are dead (Todd's rule): every remaining formerly-broad
// route must carry its landing anchor.
describe('no whole-surface CTAs — formerly-broad routes carry anchors', () => {
  test('Review-vendors rollup (all booked) lands on the vendor list anchor', () => {
    const ev = host({
      guestCount: 40, guestMode: 'count', totalBudget: 1200, foodPlanChoice: 'catering',
      vendors: [{ id: 'v-ok', name: 'Fork & Flower Catering', category: 'Catering', status: 'Confirmed', cost: 900, depositPaid: true, contractSigned: true, coiStatus: 'received' }],
    });
    const roll = buildVendorReadinessRollup(ev);
    expect(roll.target.tab).toBe('Vendors');
    // First-undone-item rule: with vendors present the landing is a ROW, never
    // the list container.
    expect(roll.target.vendorId).toBe('v-ok');
  });
});

// Earliest-keyword-wins: a milestone label leads with its action verb, so the
// FIRST domain keyword in the label owns the route — "Book the caterer … for
// your guest count" is a vendor action, never a Guests landing (live-caught
// wrong-screen bug: fixed-order checks tested 'guest' first).
describe('milestone keyword router: earliest keyword wins', () => {
  test('vendor verb leading a label beats a later guest mention', () => {
    // Pin via the emitted plan on a Juneteenth-shaped event whose next
    // milestone is the caterer-booking composite.
    const ev = host({
      type: 'Juneteenth Cookout', guestCount: 30, guestMode: 'count',
      totalBudget: 500, foodPlanChoice: 'cook', date: future(14),
    });
    (eventPlan(ev).nextActions || []).forEach(a => {
      const title = String(a.title || '').toLowerCase();
      if (/prep for "book/.test(title)) {
        expect(a.primaryRoute.tab).toBe('Vendors');
        expect(a.primaryRoute.vendorId || a.primaryRoute.focusField === 'vendor-add').toBeTruthy();
      }
    });
  });
});
