// ─── UP NEXT GOES WHERE THE ROW GOES (cohesion D's hookup for F, 11/25/2026) ──
//
// The checklist's "Up next" is a step, opened, with its route as the sheet's
// one lit button. The board's "Then, in order" rows for a step read
// taskRoute.actionRoute (cohesion F: the one step fallback). Up next reads the
// same through taskRoute.upNextRoute, so a step's two doors cannot disagree.
//
// Walked across every playbook (47) and the same event variants as
// everyStepDeclaresItsTarget, for every checklist row:
//   1. Up next's route is exactly a board row's route for that step
//      (actionRoute with the row's id), and the checklist button's own route;
//   2. where the step declares no route (no target, or only an outside link),
//      actionRoute falls back to the step's own checklist row, and Up next has
//      none: its button says "Check it off" (D4), or opens the outside link.
const pbm = require('../playbooks');
const { actionRoute, upNextRoute, checklistRouteFor } = require('../taskRoute');

const asOf = new Date('2026-11-23T12:00:00');
const DATE = '2027-06-10';

function eventsFor(pb) {
  const base = { id: 'ev-up', type: pb.type, name: 'Up next', date: DATE, startTime: '18:00', guests: [], vendors: [], budget: [], timeline: [], guestMode: 'count', guestCount: 20 };
  return [
    base,
    { ...base, guestMode: 'roster', guestCount: 0, guests: [{ id: 'g1', name: 'Ada Lee', rsvp: 'Pending' }, { id: 'g2', name: 'Bo Kim', rsvp: 'Yes' }] },
    { ...base, isDestination: true, travelMode: 'fly', kidsCount: 2 },
    { ...base, isDestination: true, travelMode: 'drive' },
  ];
}

describe('Up next goes where a board row for the same step goes', () => {
  test('every step of every playbook: one route for Up next, the board row and the checklist button', () => {
    const wrong = [];
    let rows = 0, routed = 0, checkOff = 0;
    for (const pb of pbm.ALL_PLAYBOOKS) {
      for (const ev of eventsFor(pb)) {
        let list = [];
        try { list = pbm.playbookChecklist(ev, asOf) || []; } catch (_e) { list = []; }
        for (const r of list) {
          rows += 1;
          const up = upNextRoute(ev, r.id);
          const board = actionRoute(ev, { id: 'step:' + r.id, taskId: r.id, title: r.task, route: null });
          const hit = checklistRouteFor(r.task, { taskId: r.id, week: r.week, category: r.category }, ev);
          const ownRow = { tab: 'Timeline', taskId: r.id, timelineId: r.id };
          if (up) {
            routed += 1;
            if (JSON.stringify(up) !== JSON.stringify(board)) wrong.push(`${pb.type}:${r.id} Up next ${JSON.stringify(up)} ≠ board row ${JSON.stringify(board)}`);
            if (!hit || JSON.stringify(hit.route) !== JSON.stringify(up)) wrong.push(`${pb.type}:${r.id} Up next ${JSON.stringify(up)} ≠ checklist button ${JSON.stringify(hit)}`);
          } else {
            checkOff += 1;
            if (JSON.stringify(board) !== JSON.stringify(ownRow)) wrong.push(`${pb.type}:${r.id} no Up next route, but a board row goes to ${JSON.stringify(board)}`);
            if (hit && hit.route) wrong.push(`${pb.type}:${r.id} no Up next route, but the checklist button routes to ${JSON.stringify(hit.route)}`);
          }
        }
      }
    }
    expect(wrong.slice(0, 40)).toEqual([]);
    expect(rows).toBeGreaterThan(1000);
    expect(routed).toBeGreaterThan(rows / 2);      // premise: most steps route somewhere
    expect(checkOff).toBeGreaterThan(0);           // premise: some steps declare no route
  });

  test('a declared route on the step wins; the own-row fallback is never an Up next route', () => {
    const ev = { id: 'ev-own', type: 'Birthday', name: 'x', date: DATE, guests: [], vendors: [], budget: [],
      timeline: [{ id: 'ev-own-t1', task: 'Something only the host knows', week: 'This week' }] };
    expect(actionRoute(ev, { taskId: 'ev-own-t1' })).toEqual({ tab: 'Timeline', taskId: 'ev-own-t1', timelineId: 'ev-own-t1' });
    expect(upNextRoute(ev, 'ev-own-t1')).toBeNull();
    expect(upNextRoute(ev, null)).toBeNull();
  });

  // The shell's button reading upNextRoute is asserted where it renders:
  // hostv2/e2e/upNextGoesWhereTheRowGoes.spec.mjs (the text-gate ratchet keeps
  // source scans of the shell out of jest).
});
