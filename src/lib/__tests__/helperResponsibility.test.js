// ─── HELPER-RESPONSIBILITY-1 — contract tests ─────────────────────────────────
// Core truth under test: ASSIGNED IS NOT HANDLED. Chosen is not bought.

import { deriveHelperResponsibilities, helperResponsibilityForItem, helperStatusLine } from '../helperResponsibility';
import { playbookFoodPlan } from '../playbooks';
import { buildBudgetRecoveryPlan } from '../budgetRecovery';
import { buildDayBeforePlan } from '../dayBefore';
import { buildVendorBriefPayload } from '../vendorBrief';
import { draftGuestBrief, draftInvite, draftDayBeforeDetails } from '../doItForMe';

const baseEvent = (over = {}) => ({
  id: 'hr1-test',
  name: 'Backyard Cookout',
  type: 'Cookout',
  date: '2026-08-01',
  guestCount: 24,
  venueKind: 'home',
  venueCity: 'Atlanta',
  venueState: 'GA',
  foodAdd: [
    { id: 'fa-lisa', name: 'Dessert tray', owner: 'Aunt Lisa', cost: 0 },
    { id: 'fa-marcus', name: 'Bags of ice', owner: 'Marcus', cost: 0 },
  ],
  timeline: [
    { id: 'tl-1', task: 'Pick up the folding tables', owner: 'Deshawn', done: false },
    { id: 'tl-2', task: 'Order the cake', owner: 'host', done: false },
  ],
  ros: [
    { id: 'ros-1', time: '10:00', segment: 'Set up the canopy', type: 'setup', owner: 'Marcus', confirmed: false },
    { id: 'ros-2', time: '12:00', segment: 'Guests arrive', type: 'event', owner: 'Host', confirmed: false },
  ],
  ...over,
});

describe('deriveHelperResponsibilities — explicit data only', () => {
  test('1 · finds food, task, and setup helpers from owner fields', () => {
    const { helpers, responsibilities } = deriveHelperResponsibilities(baseEvent());
    const names = helpers.map(h => h.name).sort();
    expect(names).toEqual(['Aunt Lisa', 'Deshawn', 'Marcus']);
    expect(responsibilities.some(r => r.itemType === 'food' && r.helperName === 'Aunt Lisa')).toBe(true);
    expect(responsibilities.some(r => r.itemType === 'task' && r.helperName === 'Deshawn')).toBe(true);
    expect(responsibilities.some(r => r.itemType === 'setup' && r.helperName === 'Marcus')).toBe(true);
  });

  test('2 · host/you/blank owners are never helpers', () => {
    const { responsibilities } = deriveHelperResponsibilities(baseEvent());
    expect(responsibilities.some(r => /^host$/i.test(r.helperName))).toBe(false);
    expect(responsibilities.some(r => r.itemId === 'tl-2')).toBe(false); // owner 'host'
    expect(responsibilities.some(r => r.itemId === 'ros-2')).toBe(false); // owner 'Host'
  });

  test('3 · vendors are not helpers (vendor ROS rows excluded)', () => {
    const ev = baseEvent({ ros: [{ id: 'ros-v', time: '09:00', segment: 'Caterer arrives', type: 'vendor', owner: 'Soul Catering', confirmed: false }] });
    const { responsibilities } = deriveHelperResponsibilities(ev);
    expect(responsibilities.some(r => r.helperName === 'Soul Catering')).toBe(false);
  });

  test('4 · no helpers → empty result, nothing invented', () => {
    const out = deriveHelperResponsibilities(baseEvent({ foodAdd: [], timeline: [], ros: [] }));
    expect(out.helpers).toEqual([]);
    expect(out.responsibilities).toEqual([]);
  });

  test('5 · one helper with multiple item types dedupes into one entry', () => {
    const { helpers } = deriveHelperResponsibilities(baseEvent());
    const marcus = helpers.filter(h => h.name === 'Marcus');
    expect(marcus).toHaveLength(1);
  });
});

describe('status ladder — assigned → confirmed → handled', () => {
  test('6 · default status is assigned, backup needed, next action = confirm', () => {
    const r = helperResponsibilityForItem(baseEvent(), 'fa-lisa');
    expect(r.status).toBe('assigned');
    expect(r.hostBackupNeeded).toBe(true);
    expect(r.hostNextAction).toBe('Confirm with Aunt Lisa');
  });

  test('7 · helperConfirmed map promotes to confirmed (backup released)', () => {
    const r = helperResponsibilityForItem(baseEvent({ helperConfirmed: { 'fa-lisa': true } }), 'fa-lisa');
    expect(r.status).toBe('confirmed');
    expect(r.hostBackupNeeded).toBe(false);
  });

  test('8 · marked brought (foodGot) is handled — the only true completion', () => {
    const r = helperResponsibilityForItem(baseEvent({ foodGot: { 'fa-lisa': true } }), 'fa-lisa');
    expect(r.status).toBe('handled');
    expect(r.hostNextAction).toBe(null);
  });

  test('9 · confirmed is NOT handled — assigned is not bought', () => {
    const r = helperResponsibilityForItem(baseEvent({ helperConfirmed: { 'fa-lisa': true } }), 'fa-lisa');
    expect(r.status).not.toBe('handled');
  });

  test('10 · ROS own confirmed flag promotes a setup cue', () => {
    const ev = baseEvent();
    ev.ros[0].confirmed = true;
    const r = helperResponsibilityForItem(ev, 'ros-1');
    expect(r.status).toBe('confirmed');
  });

  test('11 · routes obey the rendered-id rule (foodrow id exists in the plan list)', () => {
    const ev = baseEvent();
    const { responsibilities } = deriveHelperResponsibilities(ev);
    const food = responsibilities.filter(r => r.itemType === 'food');
    const rendered = new Set(playbookFoodPlan(ev).list.map(i => i.id));
    for (const r of food) {
      expect(r.route.focusField).toBe(`foodrow-${r.itemId}`);
      expect(rendered.has(r.itemId)).toBe(true);
    }
  });
});

describe('language — planner jargon and false completion banned', () => {
  test('12 · status lines use host-friendly vocabulary only', () => {
    const ev = baseEvent({ helperConfirmed: { 'fa-marcus': true }, foodGot: { 'fa-lisa': true } });
    const { responsibilities } = deriveHelperResponsibilities(ev);
    const allCopy = responsibilities.map(r => `${helperStatusLine(r)} ${r.hostNextAction || ''}`).join(' ');
    for (const banned of ['locked', 'external owner', 'dependency', 'resource', 'complete']) {
      expect(allCopy.toLowerCase()).not.toContain(banned);
    }
  });

  test('13 · "Covered by {name}" appears ONLY for confirmed, never bare assignment', () => {
    const assigned = helperResponsibilityForItem(baseEvent(), 'fa-lisa');
    expect(helperStatusLine(assigned)).toBe('Assigned to Aunt Lisa, but not confirmed');
    const confirmed = helperResponsibilityForItem(baseEvent({ helperConfirmed: { 'fa-lisa': true } }), 'fa-lisa');
    expect(helperStatusLine(confirmed)).toBe('Covered by Aunt Lisa');
  });
});

describe('budget recovery — assigned is not savings', () => {
  test('14 · an unconfirmed helper dish is protected, never a savings move', () => {
    const ev = baseEvent({
      totalBudget: 100,
      foodAdd: [{ id: 'fa-lisa', name: 'Dessert tray', owner: 'Aunt Lisa', cost: 80 }],
    });
    const plan = buildBudgetRecoveryPlan(ev);
    const asMove = (plan.suggestions || []).find(s => String(s.id).includes('fa-lisa'));
    expect(asMove).toBeUndefined();
    const prot = (plan.protectedItems || []).find(p => p.id === 'helper-fa-lisa');
    expect(prot).toBeTruthy();
    expect(prot.why).toContain('Assigned to Aunt Lisa, but not confirmed');
    expect(prot.why).toContain('Do not remove the backup yet');
  });

  test('15 · helper dishes stay out of the trim pool even when confirmed (their cost is not the host\'s to cut)', () => {
    const ev = baseEvent({
      totalBudget: 100,
      helperConfirmed: { 'fa-lisa': true },
      foodAdd: [{ id: 'fa-lisa', name: 'Dessert tray', owner: 'Aunt Lisa', cost: 80 }],
    });
    const plan = buildBudgetRecoveryPlan(ev);
    expect((plan.suggestions || []).some(s => String(s.id) === 'food-fa-lisa')).toBe(false);
  });
});

describe('day-before plan — confirm the people you are counting on', () => {
  const soon = (over = {}) => baseEvent({ date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(), ...over });

  test('16 · unconfirmed helper yields "Confirm {name} is still bringing {item}"', () => {
    const plan = buildDayBeforePlan(soon());
    const sec = plan.sections.find(s => s.key === 'helpers');
    expect(sec).toBeTruthy();
    expect(sec.detail).toMatch(/^Confirm (Aunt Lisa|Marcus|Deshawn) is still bringing /);
    expect(sec.open).toBeGreaterThan(0);
    expect(sec.route).toBeTruthy();
  });

  test('17 · all confirmed → calm copy, zero open; no helpers → no section', () => {
    const allConf = soon({ helperConfirmed: { 'fa-lisa': true, 'fa-marcus': true, 'tl-1': true } });
    allConf.ros[0].confirmed = true;
    const plan = buildDayBeforePlan(allConf);
    const sec = plan.sections.find(s => s.key === 'helpers');
    expect(sec.open).toBe(0);
    expect(sec.detail).toContain('confirmed');
    const none = buildDayBeforePlan(soon({ foodAdd: [], timeline: [], ros: [] }));
    expect(none.sections.find(s => s.key === 'helpers')).toBeUndefined();
  });
});

describe('privacy — helper names are host-private', () => {
  test('18 · vendor brief payload never carries helper names or the confirm map', () => {
    const ev = baseEvent({ helperConfirmed: { 'fa-lisa': true } });
    const payload = JSON.stringify(buildVendorBriefPayload(
      { id: 'v1', name: 'Soul Catering', category: 'Caterer' }, ev, ev.ros, { name: 'Todd' }));
    expect(payload).not.toContain('Aunt Lisa');
    expect(payload).not.toContain('Deshawn');
    expect(payload).not.toContain('helperConfirmed');
    expect(payload).not.toContain('foodAdd');
  });

  test('19 · guest drafts (invite, guest brief, day-before details) never name helpers', () => {
    const ev = baseEvent();
    const texts = [draftInvite(ev, {}), draftGuestBrief(ev, {}), draftDayBeforeDetails(ev, {})]
      .map(d => `${d.subject || ''} ${d.body || ''}`).join(' ');
    expect(texts).not.toContain('Aunt Lisa');
    expect(texts).not.toContain('Deshawn');
  });
});
