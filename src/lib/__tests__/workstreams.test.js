// workstreamsFor() — POP-1/WOW-1 read-only Workstream composition.
// Pure function tests: grouping, status, blocked, nextDecision, deepLink.
// Cross-surface agreement (eventPlan vs. Vendors tab) is covered separately
// in vendorReadinessRollup.test.js, extended here for the workstreams field.

import { workstreamsFor, workstreamReadinessRollup, buildVendorReadinessRollup } from '../workstreams';
import { eventPlan, vendorReadinessRollup, getEventAttention } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Mirrors the flagship validation event (30-Year Army Retirement/VFW).
const flagshipEvent = (vendorOverrides = {}) => ({
  id: 'e-flagship',
  name: '30-Year United States Army Retirement Celebration at the VFW',
  type: 'Retirement Party',
  recordKind: 'host_event',
  date: future(92),
  guests: [],
  guestEstimate: '120',
  budget: [],
  timeline: [],
  vendors: [
    { id: 'v1', category: 'Venue',      status: 'Deposit Paid', ...vendorOverrides.venue },
    { id: 'v2', category: 'Catering',   status: 'Considering' },
    { id: 'v3', category: 'Photography',status: 'Considering' },
    { id: 'v4', category: 'DJ',         status: 'Considering' },
    { id: 'v5', category: 'Florals',    status: 'Considering' },
    { id: 'v6', category: 'Cake',       status: 'Considering' },
    { id: 'v7', category: 'Mobile Bar', status: 'Considering' },
    { id: 'v8', category: 'AV / Tech',  status: 'Considering' },
    { id: 'v9', category: 'Rentals',    status: 'Considering' },
  ],
});

describe('workstreamsFor — grouping', () => {
  test('groups the flagship\'s 9 vendor categories into 7 distinct workstreams', () => {
    const ws = workstreamsFor(flagshipEvent());
    const ids = ws.map(w => w.id).sort();
    // Venue, Catering+Cake->food, Photography, DJ->entertainment, Florals->decor,
    // Mobile Bar->bar, AV/Tech+Rentals->guest_experience
    expect(ids).toEqual(['bar', 'decor', 'entertainment', 'food', 'guest_experience', 'photography', 'venue']);
  });

  test('food workstream groups Catering + Cake together', () => {
    const ws = workstreamsFor(flagshipEvent());
    const food = ws.find(w => w.id === 'food');
    expect(food.vendors.map(v => v.category).sort()).toEqual(['Cake', 'Catering']);
    expect(food.readiness).toEqual({ total: 2, booked: 0, needsAttention: 2 });
  });

  test('an unrecognized category falls back to "other" rather than guessing', () => {
    const event = flagshipEvent();
    event.vendors.push({ id: 'v10', category: 'Alpaca Wrangler', status: 'Considering' });
    const ws = workstreamsFor(event);
    const other = ws.find(w => w.id === 'other');
    expect(other).toBeDefined();
    expect(other.vendors.map(v => v.id)).toEqual(['v10']);
  });

  test('event with no vendors returns an empty array', () => {
    expect(workstreamsFor(flagshipEvent({}), null, [])).toEqual([]);
  });
});

describe('workstreamsFor — per-workstream status', () => {
  test('venue (1 vendor, Deposit Paid) is "ready"', () => {
    const ws = workstreamsFor(flagshipEvent());
    expect(ws.find(w => w.id === 'venue').status).toBe('ready');
  });

  test('food (2 vendors, both Considering) is "not_started"', () => {
    const ws = workstreamsFor(flagshipEvent());
    expect(ws.find(w => w.id === 'food').status).toBe('not_started');
  });

  test('guest_experience (2 vendors, one booked) is "in_progress"', () => {
    const event = flagshipEvent();
    event.vendors.find(v => v.category === 'Rentals').status = 'Confirmed';
    const ws = workstreamsFor(event);
    expect(ws.find(w => w.id === 'guest_experience').status).toBe('in_progress');
  });
});

describe('workstreamsFor — blocked (real COI signal, not invented)', () => {
  test('venue is blocked when its COI has lapsed before the event', () => {
    const event = flagshipEvent({
      venue: { coiStatus: 'received', coiVerified: true, coiExpiryDate: future(-10) },
    });
    const ws = workstreamsFor(event);
    expect(ws.find(w => w.id === 'venue').blocked).toBe(true);
  });

  test('venue is not blocked when COI is verified and valid', () => {
    const event = flagshipEvent({
      venue: { coiStatus: 'received', coiVerified: true, coiExpiryDate: future(200) },
    });
    const ws = workstreamsFor(event);
    expect(ws.find(w => w.id === 'venue').blocked).toBe(false);
  });
});

describe('workstreamsFor — nextDecision (matched from ctx.decisionBlockers, not invented)', () => {
  test('a venue-selection blocker surfaces as the venue workstream\'s next decision', () => {
    const ctx = { decisionBlockers: [{ type: 'venue-selection', urgency: 'critical', reasoning: 'Venue unlocks vendors, timeline, logistics' }] };
    const ws = workstreamsFor(flagshipEvent(), ctx);
    expect(ws.find(w => w.id === 'venue').nextDecision).toEqual({
      type: 'venue-selection', reasoning: 'Venue unlocks vendors, timeline, logistics', urgency: 'critical',
    });
  });

  test('a workstream with no matching blocker has a null nextDecision', () => {
    const ws = workstreamsFor(flagshipEvent(), { decisionBlockers: [{ type: 'venue-selection' }] });
    expect(ws.find(w => w.id === 'food').nextDecision).toBeNull();
  });

  test('no ctx passed → nextDecision is null everywhere, never throws', () => {
    const ws = workstreamsFor(flagshipEvent(), null);
    expect(ws.every(w => w.nextDecision === null)).toBe(true);
  });
});

describe('workstreamsFor — deepLink (preserves existing route shape)', () => {
  test('deepLink targets the first not-booked vendor in the workstream', () => {
    const ws = workstreamsFor(flagshipEvent());
    expect(ws.find(w => w.id === 'food').deepLink).toEqual({ tab: 'Vendors', vendorId: 'v2' });
  });

  test('a fully-booked workstream still deep-links to a vendor (its only one)', () => {
    const ws = workstreamsFor(flagshipEvent());
    expect(ws.find(w => w.id === 'venue').deepLink).toEqual({ tab: 'Vendors', vendorId: 'v1' });
  });

  test('dependencies is always an empty array — none authored yet, never invented', () => {
    const ws = workstreamsFor(flagshipEvent());
    expect(ws.every(w => Array.isArray(w.dependencies) && w.dependencies.length === 0)).toBe(true);
  });
});

describe('workstreamReadinessRollup — sums to the same total as the flat vendor count', () => {
  test('matches the flagship\'s known-correct 1 booked / 8 to follow up', () => {
    expect(workstreamReadinessRollup(flagshipEvent())).toEqual({ total: 9, booked: 1, needsAttention: 8 });
  });
});

describe('single runtime call path: eventPlan() composes workstreamsFor(), Vendors reads eventPlan()', () => {
  test('eventPlan(event, ctx).workstreams is workstreamsFor(event, ctx, event.vendors) — a real call path, not orphaned', () => {
    const event = flagshipEvent();
    const ctx = { decisionBlockers: [] };
    const plan = eventPlan(event, ctx);
    expect(plan.workstreams).toEqual(workstreamsFor(event, ctx, event.vendors));
    expect(plan.workstreams.length).toBeGreaterThan(0);
  });

  test('eventPlan(event).vendorReadiness, vendorReadinessRollup(event), and getEventAttention(event).vendorIssues all agree', () => {
    const event = flagshipEvent();
    const plan = eventPlan(event);
    const rollup = vendorReadinessRollup(event);
    const attention = getEventAttention(event);
    expect(plan.vendorReadiness).toEqual(rollup);
    expect(attention.vendorIssues).toBe(rollup.needsAttention);
    expect(plan.vendorReadiness.needsAttention).toBe(8); // pinned to the flagship's known-correct count
  });

  test('null event → well-formed empty vendorReadiness + workstreams, never throws', () => {
    expect(eventPlan(null)).toEqual(expect.objectContaining({
      vendorReadiness: { total: 0, booked: 0, needsAttention: 0 },
      workstreams: [],
    }));
  });
});

describe('POP-1.1 Objective 1: planningState — a read-only mapping over existing eventPlan fields', () => {
  test('currentPriority/deepLink/reasoning mirror nextActions[0], not a new computation', () => {
    const event = flagshipEvent();
    const plan = eventPlan(event);
    const top = plan.nextActions[0];
    expect(plan.planningState.currentPriority).toBe(top ? top.title : null);
    expect(plan.planningState.deepLink).toEqual(top ? (top.route || null) : null);
    expect(plan.planningState.reasoning).toEqual(top ? (top.consequence || null) : null);
  });

  test('nextMilestone is a foundation domino title when progress is incomplete', () => {
    const event = flagshipEvent();
    const plan = eventPlan(event);
    if (plan.progress.done < plan.progress.total) {
      expect(typeof plan.planningState.nextMilestone).toBe('string');
    } else {
      expect(plan.planningState.nextMilestone).toBeNull();
    }
  });

  test('blockedDecisions passes through ctx.decisionBlockers verbatim — never invented', () => {
    const event = flagshipEvent();
    const blockers = [{ type: 'venue-selection', urgency: 'critical', reasoning: 'x' }];
    const plan = eventPlan(event, { decisionBlockers: blockers });
    expect(plan.planningState.blockedDecisions).toEqual(blockers);
  });

  test('POP-1B: bare eventPlan(event) derives ctx itself — blockedDecisions reflects the event, never throws', () => {
    // eventPlan is now the SINGLE consumer of Experience Context: a caller that
    // passes no ctx still gets ctx-derived blockers (the orchestrator builds it
    // once internally), instead of every surface wiring ctx separately.
    const event = flagshipEvent();
    const plan = eventPlan(event);
    expect(Array.isArray(plan.planningState.blockedDecisions)).toBe(true);
    // a flagship event with no venue has a real venue-selection blocker
    expect(plan.planningState.blockedDecisions.some(b => b && b.type === 'venue-selection')).toBe(true);
  });

  test('an explicitly-passed ctx still wins over the internally-derived one', () => {
    const event = flagshipEvent();
    const custom = [{ type: 'custom-block', urgency: 'critical', reasoning: 'caller-supplied' }];
    const plan = eventPlan(event, { decisionBlockers: custom });
    expect(plan.planningState.blockedDecisions).toEqual(custom);
  });

  test('confidence stays honestly undefined; recommendationLifecycle is now the POP-1C projection', () => {
    const event = flagshipEvent();
    const plan = eventPlan(event);
    // no per-action confidence signal exists to compose — still not invented
    expect(plan.planningState.confidence).toBeUndefined();
    // POP-1C: the lifecycle is now a real read-only projection over existing state
    const lc = plan.planningState.recommendationLifecycle;
    expect(Array.isArray(lc)).toBe(true);
    const STATES = new Set(['Discovered','Recommended','Accepted','Working','Blocked','Completed','Archived']);
    lc.forEach(i => expect(STATES.has(i.state)).toBe(true));
  });

  test('null event → planningState is fully null/empty, never throws', () => {
    const plan = eventPlan(null);
    expect(plan.planningState).toEqual({
      currentPriority: null, currentWorkstream: null, currentMilestone: null, nextMilestone: null,
      blockedDecisions: [], recommendationLifecycle: undefined, deepLink: null, reasoning: null, confidence: undefined,
    });
  });

  test('passing ctx into eventPlan does not change nextActions ranking (additive only)', () => {
    const event = flagshipEvent();
    const withoutCtx = eventPlan(event);
    const withCtx = eventPlan(event, { decisionBlockers: [{ type: 'venue-selection' }], compound: true });
    expect(withCtx.nextActions).toEqual(withoutCtx.nextActions);
    expect(withCtx.progress).toEqual(withoutCtx.progress);
  });
});

describe('POP-1/WOW-1: decisionBlockerStatus end-to-end through buildExperienceContext -> eventPlan', () => {
  test('an acknowledged decision blocker disappears from planningState.blockedDecisions, an unresolved one does not', () => {
    const event = flagshipEvent();
    event.venue = ''; // triggers a real 'venue-selection' blocker
    const ctxOpen = buildExperienceContext(event, null, null);
    expect(ctxOpen.decisionBlockers.find(b => b.type === 'venue-selection')).toBeDefined();
    expect(eventPlan(event, ctxOpen).planningState.blockedDecisions.find(b => b.type === 'venue-selection')).toBeDefined();

    event.decisionBlockerStatus = { 'venue-selection': 'acknowledged' };
    const ctxAcked = buildExperienceContext(event, null, null);
    expect(ctxAcked.decisionBlockers.find(b => b.type === 'venue-selection')).toBeUndefined();
    expect(eventPlan(event, ctxAcked).planningState.blockedDecisions.find(b => b.type === 'venue-selection')).toBeUndefined();
  });
});

describe('POP-1/WOW-1: flagship category additions map into workstreams, not custom one-off logic', () => {
  test('Retirement Party\'s seed list (vendorCategoriesByType.js) includes the 3 new categories', () => {
    const { CURATED_VENDORS } = require('../vendorCategoriesByType');
    expect(CURATED_VENDORS['Retirement Party']).toEqual(expect.arrayContaining(['Recognition Ceremony', 'Recognition Slideshow', 'Military Display']));
  });

  test('Recognition Ceremony, Recognition Slideshow, and Military Display each group into their own workstream', () => {
    const event = flagshipEvent();
    event.vendors.push(
      { id: 'v10', category: 'Recognition Ceremony', status: 'Considering' },
      { id: 'v11', category: 'Recognition Slideshow', status: 'Considering' },
      { id: 'v12', category: 'Military Display', status: 'Considering' },
    );
    const ws = workstreamsFor(event);
    expect(ws.find(w => w.id === 'recognition_ceremony')?.vendors.map(v => v.id)).toEqual(['v10']);
    expect(ws.find(w => w.id === 'recognition_slideshow')?.vendors.map(v => v.id)).toEqual(['v11']);
    expect(ws.find(w => w.id === 'military_display')?.vendors.map(v => v.id)).toEqual(['v12']);
    // No "other" fallback needed now that these 3 categories are mapped.
    expect(ws.find(w => w.id === 'other')).toBeUndefined();
  });
});

describe('POP-1 Phase 1 (exact first slice): buildVendorReadinessRollup / eventPlan().vendorReadinessRollup', () => {
  // DMV-area realistic vendor names (Washington DC / MD / NoVA), per the flagship
  // vendor realism rule — not "Vendor A"/"Sample Catering" placeholders. Built as a
  // standalone event object (not via the shared flagshipEvent() helper, whose
  // signature only overrides the venue vendor) so vendor names can be set freely.
  const dmvFlagshipEvent = () => ({
    id: 'e-flagship-dmv',
    name: '30-Year United States Army Retirement Celebration at the VFW',
    type: 'Retirement Party',
    recordKind: 'host_event',
    date: future(92),
    guests: [],
    guestEstimate: '120',
    budget: [],
    timeline: [],
    vendors: [
      { id: 'v1', category: 'Venue', status: 'Deposit Paid', name: 'VFW Post 3150 — Alexandria, VA' },
      { id: 'v2', category: 'Catering', status: 'Considering', name: 'Capital Rotisserie Catering — Silver Spring, MD' },
      { id: 'v3', category: 'Photography', status: 'Considering', name: 'Anacostia Frame & Film Co. — Washington, DC' },
      { id: 'v4', category: 'DJ', status: 'Considering', name: 'Beltway Sound Collective — Arlington, VA' },
      { id: 'v5', category: 'Rentals', status: 'Considering', name: 'Old Town Tent & Party Rentals — Alexandria, VA' },
    ],
  });

  test('DMV-realistic vendor names are honored end-to-end through workstreamsFor (not placeholder names)', () => {
    const event = dmvFlagshipEvent();
    const ws = workstreamsFor(event);
    const names = ws.flatMap(w => w.vendors.map(v => v.name)).filter(Boolean);
    expect(names).toEqual(expect.arrayContaining([
      'VFW Post 3150 — Alexandria, VA',
      'Capital Rotisserie Catering — Silver Spring, MD',
      'Anacostia Frame & Film Co. — Washington, DC',
      'Beltway Sound Collective — Arlington, VA',
      'Old Town Tent & Party Rentals — Alexandria, VA',
    ]));
    expect(names.some(n => /^Vendor [A-Z]$|Sample Catering|Test Vendor|Generic Rentals/.test(n))).toBe(false);
  });

  test('no vendors at all -> not_started status, no invented counts', () => {
    const event = { ...dmvFlagshipEvent(), vendors: [] };
    const rollup = buildVendorReadinessRollup(event);
    expect(rollup).toEqual({
      status: 'not_started', label: 'No vendors added yet', nextAction: 'Add your first vendor.',
      ctaLabel: 'Add vendor', target: { tab: 'Vendors', focusField: 'vendor-add' }, reason: null,
      counts: { total: 0, ready: 0, needsAttention: 0, missing: 0 },
    });
  });

  test('all vendors booked -> ready status', () => {
    const event = { ...dmvFlagshipEvent(), vendors: [{ id: 'only', category: 'Venue', status: 'Confirmed', name: 'VFW Post 3150 — Alexandria, VA' }] };
    const rollup = buildVendorReadinessRollup(event);
    expect(rollup.status).toBe('ready');
    expect(rollup.label).toBe('All vendors booked');
    expect(rollup.counts).toEqual({ total: 1, ready: 1, needsAttention: 0, missing: 0 });
  });

  test('some vendors still deciding, none blocked -> in_progress status with a real deep link', () => {
    const event = dmvFlagshipEvent();
    const rollup = buildVendorReadinessRollup(event);
    expect(rollup.status).toBe('in_progress');
    expect(rollup.counts).toEqual({ total: 5, ready: 1, needsAttention: 4, missing: 0 });
    expect(rollup.target).toEqual(expect.objectContaining({ tab: 'Vendors' }));
  });

  test('a blocked workstream (critical COI) -> needs_attention status naming that workstream', () => {
    const event = {
      ...dmvFlagshipEvent(),
      vendors: [{ id: 'v1', category: 'Venue', status: 'Considering', name: 'VFW Post 3150 — Alexandria, VA', coiStatus: 'received', coiVerified: true, coiExpiryDate: '2020-01-01' }], // lapsed before any future event date
    };
    const rollup = buildVendorReadinessRollup(event);
    expect(rollup.status).toBe('needs_attention');
    expect(rollup.reason).toMatch(/Venue/);
  });

  test('eventPlan(event).vendorReadinessRollup matches buildVendorReadinessRollup(event, ctx) directly (single source, no duplicate logic)', () => {
    const event = dmvFlagshipEvent();
    const ctx = { decisionBlockers: [] };
    const plan = eventPlan(event, ctx);
    const direct = buildVendorReadinessRollup(event, ctx, event.vendors);
    expect(plan.vendorReadinessRollup).toEqual(direct);
  });

  test('HostHome (eventPlan) and Vendors (VendorStatusBar) read the identical rollup object shape for the same event — cannot disagree', () => {
    const event = dmvFlagshipEvent();
    const plan = eventPlan(event);
    // Mirrors exactly what VendorPlanningWorkspace.jsx's VendorStatusBar destructures.
    const { ready: bookedN, needsAttention: followN } = plan.vendorReadinessRollup.counts;
    expect(bookedN).toBe(1);
    expect(followN).toBe(4);
  });
});
