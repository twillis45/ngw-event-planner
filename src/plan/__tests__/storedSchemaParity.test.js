// ─── Wave-6: the STORED timeline schema reads as overdue EVERYWHERE ───────────
//
// The wave-5 fix taught the surfaces to read leadDays / T-Nd / prose labels — but the
// schema actually PERSISTED on playbook events (playbookTimelineEntries: positive
// `offsetDays` + TitleCase `week` from the full 19-key vocabulary, NO leadDays) still
// resolved to null in taskLeadDays. So a crab feast's 'Pre-order' row, 4 days past its
// window, was overdue nowhere. These tests seed ONE stored-schema event and assert the
// reads every surface renders agree: ChecklistGenerator's count expression, App.js's
// plan-tab badge expression (replicated verbatim — App.js itself is not importable),
// and computeDayAlerts' DEFAULT predicate (no injection; wave-6 removed it).
//
// WAVE-7 (2026-07-15): the fourth leg is IN. CommandCenter's local PHASE_OFFSET
// mirror + risk_lost gate are gone (wave-6 landed lib/taskLead as the ONE policy),
// so deriveCommandCenterData's overdue read (its `decisions` list) now joins the
// parity sweep below — the probe proved 6 = 6 = 6 = 6 on this exact fixture.

import { isOverdue } from '../ChecklistGenerator';
import { deriveCommandCenterData } from '../../CommandCenter';
import { taskStatus } from '../TimelineBuilder';
import { taskIsOverdue, taskLeadDays, taskDueInDays } from '../../lib/taskLead';
import { computeDayAlerts } from '../../lib/dayAlerts';
import { effectiveDone } from '../../lib/taskEngine';
import { getPlaybook } from '../../lib/playbooks';
import { storedTimelineFromPlaybook, inDays } from './storedSchemaFixture';

// ONE stored-schema event: a Crab Feast tomorrow, planned for two months. The
// playbook's cf_reserve milestone ('Reserve / pre-order the crabs', offsetDays: 5)
// stores as { week: '5 Days Out', offsetDays: 5 } — T-5d, now 4 days past its window.
const storedEvent = () => {
  const pb = getPlaybook('Crab Feast');
  return {
    id: 'se1', type: 'Crab Feast', name: 'Crab Feast',
    date: inDays(1), createdAt: inDays(-60) + 'T12:00:00.000Z',
    guestCount: 18, guestMode: 'count',
    vendors: [], guests: [],
    timeline: storedTimelineFromPlaybook(pb),
  };
};
const reserveRow = (ev) => ev.timeline.find((t) => t.milestoneId === 'cf_reserve');

describe('the fixture is non-vacuous: it really is the stored schema', () => {
  test('rows carry positive offsetDays + TitleCase week, and NO leadDays', () => {
    const ev = storedEvent();
    expect(ev.timeline.length).toBeGreaterThan(3);
    const withOffsets = ev.timeline.filter((t) => Number.isFinite(t.offsetDays));
    expect(withOffsets.length).toBeGreaterThan(3); // offsetDays rows actually produced
    for (const t of ev.timeline) {
      expect(t.leadDays).toBeUndefined();
      expect(typeof t.week).toBe('string');
    }
  });

  test('the T-5d pre-order row stores as offsetDays 5 / week "5 Days Out", 4 days past', () => {
    const ev = storedEvent();
    const r = reserveRow(ev);
    expect(r).toBeTruthy();
    expect(r.offsetDays).toBe(5);
    expect(r.week).toBe('5 Days Out');
    expect(taskLeadDays(r)).toBe(-5); // offsetDays is now the 2nd-priority lead source
    expect(taskDueInDays(r, ev)).toBe(-4);
  });
});

describe('parity: every overdue read agrees on the stored schema', () => {
  test('ChecklistGenerator count expression sees it (>= 1, includes the pre-order)', () => {
    const ev = storedEvent();
    // Exactly the surface's own count expression (ChecklistGenerator ~:264).
    const count = ev.timeline.filter((t) => !t.done && isOverdue(t, ev)).length;
    expect(count).toBeGreaterThanOrEqual(1);
    expect(isOverdue(reserveRow(ev), ev)).toBe(true);
  });

  test("App.js plan-tab badge expression sees it (replicated: !taskEffectiveDone && isTaskOverdue)", () => {
    const ev = storedEvent();
    // Replica of App.js ~:43836 — isTaskOverdue there now delegates to
    // lib/taskLead.taskIsOverdue with the full event, which is what we call here.
    const overdueCount = (ev.timeline || [])
      .filter((t) => !effectiveDone(ev, t) && taskIsOverdue(t, ev)).length;
    expect(overdueCount).toBeGreaterThanOrEqual(1);
    // The pre-order specifically: no event state can prove crabs were pre-ordered,
    // so effectiveDone cannot hide it.
    const r = reserveRow(ev);
    expect(effectiveDone(ev, r)).toBe(false);
    expect(taskIsOverdue(r, ev)).toBe(true);
  });

  test('computeDayAlerts DEFAULT predicate sees it — no injected policy needed', () => {
    const ev = storedEvent();
    const alerts = computeDayAlerts(ev) || []; // no opts: the lib default IS the policy
    const open = alerts.find((a) => a.id === 'overdue-tasks');
    expect(open).toBeTruthy();
    // The alert's count is the same expression the lib runs — assert it matches the
    // one policy, not a private variant.
    const expected = (ev.timeline || []).filter((t) => t && !t.done && taskIsOverdue(t, ev)).length;
    expect(expected).toBeGreaterThanOrEqual(1);
    expect(open.headline).toContain(String(expected));
  });

  test("the FOURTH LEG: deriveCommandCenterData's overdue read agrees with the other three", () => {
    // WAVE-7 (2026-07-15): promoted from the seam-audit probe (proved 6 = 6 = 6 = 6).
    // CommandCenter's `decisions` list is the hero/urgent tier's own overdue read —
    // post wave-6 it delegates to lib/taskLead.taskIsOverdue like everyone else,
    // and this pins that the counts can never drift apart again.
    const ev = storedEvent();
    const checklistCount = ev.timeline.filter((t) => !t.done && isOverdue(t, ev)).length;
    const libCount = (ev.timeline || []).filter((t) => t && !t.done && taskIsOverdue(t, ev)).length;
    const alerts = computeDayAlerts(ev) || [];
    const alertRow = alerts.find((a) => a.id === 'overdue-tasks');
    const ccCount = (deriveCommandCenterData(ev).decisions || []).length;

    expect(checklistCount).toBeGreaterThanOrEqual(1);        // non-vacuous
    expect(ccCount).toBe(checklistCount);                    // CommandCenter = Checklist
    expect(ccCount).toBe(libCount);                          // CommandCenter = lib policy
    expect(alertRow).toBeTruthy();
    expect(alertRow.headline).toContain(String(ccCount));    // CommandCenter = dayAlerts
    // The pre-order row specifically is billed by the fourth leg too.
    const cc = deriveCommandCenterData(ev).decisions || [];
    expect(cc.some((d) => /pre-order/i.test(String(d.title || '')))).toBe(true);
  });

  test('TimelineBuilder badge agrees: DUE UPCOMING on the same stored row', () => {
    const ev = storedEvent();
    expect(taskStatus(reserveRow(ev), ev).label).toBe('DUE UPCOMING');
  });

  test('all reads give the same verdict per task — no surface disagrees', () => {
    const ev = storedEvent();
    for (const t of ev.timeline) {
      const a = isOverdue(t, ev);              // ChecklistGenerator
      const b = taskIsOverdue(t, ev);          // lib policy (badge + dayAlerts + hero)
      const c = taskStatus(t, ev).label === 'DUE UPCOMING'; // TimelineBuilder
      expect({ id: t.milestoneId, checklist: a, lib: b, timeline: c })
        .toEqual({ id: t.milestoneId, checklist: b, lib: b, timeline: b });
    }
  });
});

describe('the guards still travel with the stored schema', () => {
  test('createdAt reachability: created yesterday for tomorrow → tight timeline, not late', () => {
    const ev = { ...storedEvent(), createdAt: inDays(-1) + 'T12:00:00.000Z' };
    expect(taskIsOverdue(reserveRow(ev), ev)).toBe(false);
    expect(isOverdue(reserveRow(ev), ev)).toBe(false);
  });

  test('snooze suppresses in the ONE policy (not per-surface): lib and checklist agree', () => {
    const ev = storedEvent();
    const snoozed = { ...reserveRow(ev), snoozedUntil: inDays(2) };
    expect(taskIsOverdue(snoozed, ev)).toBe(false); // policy itself, not a wrapper
    expect(isOverdue(snoozed, ev)).toBe(false);
    const lapsed = { ...reserveRow(ev), snoozedUntil: inDays(-1) };
    expect(taskIsOverdue(lapsed, ev)).toBe(true);
  });
});
