// Sprint UX-4 — Disclosure guardrails. These tests FAIL if the architecture ever
// violates a non-negotiable rule: populated content going dormant, planners seeing
// dormant, a Hidden/Locked state appearing, visibility keying on completion %, or stage
// overriding real data.

import { VIS, eventStage, sectionVisibility, isDormant, upcomingRail } from '../disclosure';

const HOST = (over = {}) => ({ audience: 'self_family', date: '2030-01-01', ...over });
const PLANNER = (over = {}) => ({ audience: 'client', date: '2030-01-01', ...over });
const withVendor = { vendors: [{ id: 'v1', name: 'Soul Daddy', status: 'Considering' }] };

describe('UX-4 visibility enum — only four states, no floor below Dormant', () => {
  test('exactly Primary/Standard/Collapsed/Dormant — no Hidden/Locked/Disabled', () => {
    expect(Object.values(VIS).sort()).toEqual(['collapsed', 'dormant', 'primary', 'standard']);
    ['HIDDEN', 'LOCKED', 'DISABLED', 'UNAVAILABLE'].forEach(k => expect(VIS[k]).toBeUndefined());
  });
});

describe('UX-4 eventStage — date + data only (never completion %)', () => {
  test('no data ⇒ created; past ⇒ complete; ≤14d ⇒ final', () => {
    expect(eventStage(HOST())).toBe('created');
    expect(eventStage(HOST({ date: '2020-01-01' }))).toBe('complete');
    expect(eventStage(HOST({ ...withVendor, date: '2020-01-01' }))).toBe('complete');
  });
});

describe('UX-4 Rule 2 — populated content is NEVER dormant', () => {
  test('host event WITH a named vendor ⇒ vendors STANDARD, not dormant', () => {
    expect(sectionVisibility('vendors', HOST(withVendor))).toBe(VIS.STANDARD);
    expect(isDormant('vendors', HOST(withVendor))).toBe(false);
  });
  test('brand-new host event ⇒ empty operational sections are DORMANT', () => {
    const e = HOST();
    ['vendors', 'documents', 'planningHealth', 'readinessGrid', 'capacity', 'nextUp'].forEach(s =>
      expect(sectionVisibility(s, e)).toBe(VIS.DORMANT));
  });
});

describe('UX-4 Rule 4 — reality overrides stage (data beats date)', () => {
  test('far-future event (created stage) WITH vendor data still shows vendors', () => {
    const e = HOST({ ...withVendor, date: '2099-01-01' }); // stage would say "early/created"
    expect(eventStage(e)).not.toBe('dayof');
    expect(sectionVisibility('vendors', e)).toBe(VIS.STANDARD); // data wins
  });
});

describe('UX-4 guardrail — planner NEVER sees Dormant', () => {
  test('every section resolves to Standard/Primary for a planner, even when empty', () => {
    const e = PLANNER();
    ['needsYou', 'vendors', 'documents', 'planningHealth', 'realityCheck', 'capacity', 'nextUp', 'foodDrinks'].forEach(s => {
      const v = sectionVisibility(s, e);
      expect(v === VIS.STANDARD || v === VIS.PRIMARY).toBe(true);
      expect(v).not.toBe(VIS.DORMANT);
    });
  });
  test('upcomingRail is empty for planners (full cockpit, no rail)', () => {
    expect(upcomingRail(PLANNER())).toEqual([]);
  });
});

describe('UX-4 guardrail — visibility does NOT depend on completion %', () => {
  test('same data presence, different "done" state ⇒ identical visibility', () => {
    const considering = HOST({ vendors: [{ id: 'v1', name: 'X', status: 'Considering' }] });
    const confirmed = HOST({ vendors: [{ id: 'v1', name: 'X', status: 'Confirmed', balancePaid: true }] });
    expect(sectionVisibility('vendors', considering)).toBe(sectionVisibility('vendors', confirmed));
  });
});

describe('UX-4 urgency ⇒ Primary', () => {
  test('a critical need escalates needsYou to PRIMARY', () => {
    expect(sectionVisibility('needsYou', HOST(), { needs: 1, criticalNeeds: 1 })).toBe(VIS.PRIMARY);
  });
});

describe('UX-4 Upcoming Rail — dormant sections are reachable, never hidden', () => {
  test('brand-new host ⇒ rail lists Vendors / Food & drinks with routes', () => {
    const rail = upcomingRail(HOST());
    const sections = rail.map(r => r.section);
    expect(sections).toEqual(expect.arrayContaining(['vendors', 'foodDrinks']));
    rail.forEach(r => { expect(r.label).toBeTruthy(); expect(r.hint).toBeTruthy(); expect(r.route).toBeTruthy(); });
  });
  test('host audit #4 — the "Paperwork / Contracts & files" CRM rail item is gone for hosts', () => {
    expect(upcomingRail(HOST()).map(r => r.section)).not.toContain('documents');
  });
  test('once a vendor exists, Vendors leaves the rail (it is Standard now)', () => {
    expect(upcomingRail(HOST(withVendor)).map(r => r.section)).not.toContain('vendors');
  });
});
