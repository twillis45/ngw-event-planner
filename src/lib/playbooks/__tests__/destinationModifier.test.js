// DESTINATION-1 — event.isDestination is a generic, type-independent modifier
// (same architecture as kidsCount/dietCounts): layers travel decisions/tasks on
// top of whatever base playbook is active, additively, gated only on the flag —
// never on event type, never requiring its own playbook (Wellness Retreat has
// no playbook file and shouldn't be the model — see the destination-celebration
// research board for the full audit).
import { playbookDecisionBoard, playbookChecklist, playbookDecisionOptions, eventHasKids } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 300); return d.toISOString().slice(0, 10); })();
const ev = (extra) => ({ id: 'e', type: 'Birthday', date: future, guestCount: 30, ...extra });

describe('destination decisions are purely additive, gated on isDestination', () => {
  test('no isDestination flag → no destination decisions appear, byte-identical to before', () => {
    const b = playbookDecisionBoard(ev(), '2026-01-01');
    const ids = [...b.open, ...b.locked].map((r) => r.id);
    expect(ids).not.toEqual(expect.arrayContaining(['dest_lodging', 'dest_travelmix', 'dest_transport', 'dest_childcare']));
  });

  test('isDestination: true adds all 5 destination decisions on top of Birthday\'s own', () => {
    const b = playbookDecisionBoard(ev({ isDestination: true }), '2026-01-01');
    const ids = [...b.open, ...b.locked].map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['dest_lodging', 'dest_travelmix', 'dest_transport', 'dest_childcare', 'dest_health']));
    // Birthday's own decisions are still present — additive, not replaced.
    expect(ids.some((id) => id === 'food_style')).toBe(true);
  });

  test('destination decisions work identically on any base type — not hardcoded to one', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Anniversary', date: future, guestCount: 20, isDestination: true }, '2026-01-01');
    const ids = [...b.open, ...b.locked].map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['dest_lodging', 'dest_travelmix', 'dest_transport', 'dest_childcare']));
  });

  test('a destination decision can be picked and locks like any other', () => {
    const b = playbookDecisionBoard(ev({ isDestination: true, foodChoices: { dest_lodging: 'A room block, no commitment' } }), '2026-01-01');
    const row = b.locked.find((r) => r.id === 'dest_lodging');
    expect(row).toBeTruthy();
    expect(row.because).toBe('A room block, no commitment');
  });

  test('the transport decision routes to Vendors like other vendor-blocked decisions', () => {
    const b = playbookDecisionBoard(ev({ isDestination: true }), '2026-01-01');
    const row = [...b.open, ...b.locked].find((r) => r.id === 'dest_transport');
    expect(row.route.tab).toBe('Vendors');
  });
});

describe('destination tasks are purely additive, gated on isDestination', () => {
  test('no isDestination flag → no destination tasks appear', () => {
    const rows = playbookChecklist(ev(), '2026-01-01');
    const ids = rows.map((r) => r.id);
    expect(ids.some((id) => id.includes('dest_t_'))).toBe(false);
  });

  test('isDestination: true adds the 6 unconditional destination tasks, additive on Birthday\'s own', () => {
    const rows = playbookChecklist(ev({ isDestination: true }), '2026-01-01');
    const ids = rows.map((r) => r.id);
    expect(ids.some((id) => id.includes('dest_t_lodging'))).toBe(true);
    expect(ids.some((id) => id.includes('dest_t_access'))).toBe(true);
    expect(ids.some((id) => id.includes('dest_t_grid'))).toBe(true);
    expect(ids.some((id) => id.includes('dest_t_transport'))).toBe(true);
    expect(ids.some((id) => id.includes('dest_t_info'))).toBe(true);
    expect(ids.some((id) => id.includes('dest_t_welcome'))).toBe(true);
    // Birthday's own tasks are still present.
    expect(ids.length).toBeGreaterThan(5);
  });

  test('the welcome-bags task (T-1d) is due one day before the event, not bucketed as event-day', () => {
    const rows = playbookChecklist(ev({ isDestination: true }), '2026-01-01');
    const welcome = rows.find((r) => r.id.includes('dest_t_welcome'));
    expect(welcome.category).toBe('planning'); // offset -1 is < 0, so not event-day
    expect(welcome.dueInDays).toBe(299); // dte (300) + offset (-1)
  });

  test('works additively on any base type, not hardcoded', () => {
    const rows = playbookChecklist({ id: 'e', type: 'Reunion', date: future, guestCount: 40, isDestination: true }, '2026-01-01');
    const ids = rows.map((r) => r.id);
    expect(ids.some((id) => id.includes('dest_t_lodging'))).toBe(true);
  });
});

// DESTINATION-4 — health question, accessibility walk, kids lodging + kids job.
describe('the health question asks about heart/lung conditions, never age', () => {
  test('dest_health is on the board and its wording is health-based, with plain answers', () => {
    const b = playbookDecisionBoard(ev({ isDestination: true }), '2026-01-01');
    expect([...b.open, ...b.locked].some((r) => r.id === 'dest_health')).toBe(true);
    const opts = playbookDecisionOptions(ev({ isDestination: true }), 'dest_health');
    expect(opts.label).toBe('Any guests with heart or lung conditions?');
    expect(opts.label).not.toMatch(/age|elder|older|senior/i);
    expect(opts.options).toEqual(['Yes', 'No', 'Not sure']);
  });

  test('destination decisions settle inline like any other optioned decision (options reachable via playbookDecisionOptions)', () => {
    const opts = playbookDecisionOptions(ev({ isDestination: true }), 'dest_lodging');
    expect(opts).toBeTruthy();
    expect(opts.options.length).toBeGreaterThan(0);
    // No isDestination flag → dest decisions stay unreachable, byte-identical to before.
    expect(playbookDecisionOptions(ev(), 'dest_health')).toBeNull();
  });

  test('the pacing/doctor note appears ONLY when the host answered Yes — an unanswered question never claims a health need', () => {
    const has = (extra) => playbookChecklist(ev({ isDestination: true, ...extra }), '2026-01-01')
      .some((r) => r.id.includes('dest_t_health'));
    expect(has({})).toBe(false); // unanswered ('Not sure' default) → no task
    expect(has({ foodChoices: { dest_health: 'No' } })).toBe(false);
    expect(has({ foodChoices: { dest_health: 'Not sure' } })).toBe(false);
    expect(has({ foodChoices: { dest_health: 'Yes' } })).toBe(true);
  });

  test('the yes-path note stays in plain host language — pacing + a call to their doctor, no prescriptions', () => {
    const rows = playbookChecklist(ev({ isDestination: true, foodChoices: { dest_health: 'Yes' } }), '2026-01-01');
    const row = rows.find((r) => r.id.includes('dest_t_health'));
    expect(row.task).toMatch(/rest/i);
    expect(row.task).toMatch(/call to their doctor/i);
  });
});

describe('the accessibility task is a walk-the-path audit, not an ADA checkbox', () => {
  test('appears for every destination event and carries the whole-path framing', () => {
    const rows = playbookChecklist(ev({ isDestination: true }), '2026-01-01');
    const row = rows.find((r) => r.id.includes('dest_t_access'));
    expect(row).toBeTruthy();
    expect(row.task).toMatch(/Walk the whole guest path, not just the room/);
    expect(row.task).toMatch(/door widths/);
    expect(row.task).toMatch(/parking/);
    expect(row.task).not.toMatch(/\bADA\b|complian/i);
  });
});

describe('crib/connecting-room ask rides the lodging call only when kids are coming', () => {
  const lodgingRow = (extra) => playbookChecklist(ev({ isDestination: true, ...extra }), '2026-01-01')
    .find((r) => r.id.includes('dest_t_lodging'));

  test('no kids → the lodging task is byte-identical to before', () => {
    expect(lodgingRow({}).task).toBe('Confirm the room block or share group hotel options with guests');
  });

  test('kidsCount > 0 (headcount mode) → the crib/connecting-room ask joins the SAME task, not a second one', () => {
    const rows = playbookChecklist(ev({ isDestination: true, kidsCount: 2 }), '2026-01-01');
    const row = rows.find((r) => r.id.includes('dest_t_lodging'));
    expect(row.task).toMatch(/cribs and connecting rooms in the same call/);
    expect(rows.filter((r) => /crib/i.test(r.task)).length).toBe(1); // one ask, not two
  });

  test('roster kids ("Children in Party") trigger it too — same sources as the food plan', () => {
    const row = lodgingRow({ guestCount: undefined, guests: [{ name: 'A', rsvp: 'yes', kids: 2 }, { name: 'B', rsvp: 'yes' }] });
    expect(row.task).toMatch(/cribs and connecting rooms/);
  });
});

describe('kids get a real job in the event — gated on kids actually coming', () => {
  const hasJob = (extra) => playbookChecklist(ev({ isDestination: true, ...extra }), '2026-01-01')
    .some((r) => r.id.includes('dest_t_kidsjob'));

  test('no kids signal → no task (never inferred from event type)', () => {
    expect(hasJob({})).toBe(false);
  });

  test('kidsCount > 0 → the purposeful-job task appears', () => {
    expect(hasJob({ kidsCount: 3 })).toBe(true);
  });

  test('roster kids trigger it too', () => {
    expect(hasJob({ guestCount: undefined, guests: [{ name: 'A', rsvp: 'yes', kids: 1 }] })).toBe(true);
  });

  test('kids present but not a destination event → not added (it ships with the destination set)', () => {
    const rows = playbookChecklist(ev({ kidsCount: 3 }), '2026-01-01');
    expect(rows.some((r) => r.id.includes('dest_t_kidsjob'))).toBe(false);
  });
});

describe('eventHasKids — one shared predicate, same sources as the food plan', () => {
  test('headcount mode reads event.kidsCount', () => {
    expect(eventHasKids(ev({ kidsCount: 2 }))).toBe(true);
    expect(eventHasKids(ev({ kidsCount: 0 }))).toBe(false);
    expect(eventHasKids(ev())).toBe(false);
  });
  test('roster mode reads per-guest kids and ignores declined rows', () => {
    expect(eventHasKids(ev({ guests: [{ name: 'A', rsvp: 'yes', kids: 2 }] }))).toBe(true);
    expect(eventHasKids(ev({ guests: [{ name: 'A', rsvp: 'no', kids: 2 }] }))).toBe(false);
    // Roster exists → it is the ground truth; a stale manual kidsCount doesn't override it.
    expect(eventHasKids(ev({ guests: [{ name: 'A', rsvp: 'yes' }], kidsCount: 2 }))).toBe(false);
  });
});
