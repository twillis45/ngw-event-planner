// ─── EVERY CHECKLIST ROW HAS A DESTINATION, OR SAYS WHY NOT (11/21/2026) ─────
//
// Every playbook's checklist, row by row, through the real checklistRouteFor
// and resolveRoute:
//   • every emitted route lands on a sheet or stage the host shell renders;
//   • every row that IS a playbook call (`answeredBy`) has a destination, and
//     with no other rule it opens Calls to make on that call: "Decide whose
//     midnight it is…" had no button while midnight_model sat on that sheet;
//   • the rows with no button are real-world work (cook, thaw, wash, text a
//     friend), and their count may only fall. checklistDestinationTruth holds
//     why a kitchen row honestly has none.
const { checklistRouteFor } = require('../lib/taskRoute');
const { resolveRoute } = require('../lib/routeResolver');
const { ALL_PLAYBOOKS, playbookChecklist, stepCalls } = require('../lib/playbooks');

// The sheet kinds hostv2 renders (HostShellV2 `sheet.kind === …`) plus its two stages.
const SHELL_KINDS = new Set(['air', 'budget', 'costshare', 'crabs', 'date', 'decisions', 'food', 'ground', 'guests',
  'lodging', 'messages', 'rain', 'risks', 'seating', 'space', 'tasks', 'vendors', 'venue', 'stage:day', 'stage:plan',
  // 11/21/2026: the album rows open After on the recap's album link; the trip
  // details open their draft.
  'stage:after', 'draft', 'sweep']);
// 11/21/2026: 124 → 120. Halloween's and NYE's "Share the … photos in one album
// link" now open After on the recap's "Photo album link" field; Group Trip's
// "Send everyone the trip details" opens its draft, and "Confirm every
// reservation" opens the reconfirm sweep as "Confirm every booking".
const NO_DESTINATION_CEILING = 120;

const ev = (type) => ({ id: 'dest', type, date: '2026-12-31', guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' });
const rows = [];
for (const pb of ALL_PLAYBOOKS) {
  const e = ev(pb.type);
  for (const r of (playbookChecklist(e, '2026-10-01') || [])) {
    const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, e);
    const kind = !hit ? null : hit.href ? 'external' : ((resolveRoute(hit.route) || {}).kind || 'UNRESOLVED');
    rows.push({ type: pb.type, id: r.id, task: r.task, hit, kind, calls: stepCalls(e, { task: r.task }) });
  }
}

test('every emitted route lands on a surface the host shell renders', () => {
  const bad = rows.filter((r) => r.kind && r.kind !== 'external' && !SHELL_KINDS.has(r.kind))
    .map((r) => `${r.type}: ${r.task.slice(0, 60)} → ${r.kind}`);
  expect(bad).toEqual([]);
});

test('every row that is a call has a destination', () => {
  // An authored keyword rule may already send it where the call is made too
  // (the spread's "Your choices", the money agreement); otherwise it opens
  // Calls to make on that call.
  const callRows = rows.filter((r) => r.calls.length);
  expect(callRows.length).toBeGreaterThan(0);
  for (const r of callRows) {
    expect(r.hit).toBeTruthy();
    expect(SHELL_KINDS.has(r.kind)).toBe(true);
    if (r.kind === 'decisions') expect(resolveRoute(r.hit.route).focus).toBe(r.calls[0]);
  }
});

test("New Year's Eve: deciding whose midnight it is opens that call", () => {
  const r = rows.find((x) => x.type === "New Year's Eve Party" && /^Decide whose midnight/.test(x.task));
  expect(r).toBeTruthy();
  expect(r.kind).toBe('decisions');
  expect(resolveRoute(r.hit.route).focus).toBe('midnight_model');
});

// Wedding's "Write the vision brief" (split from the budget step, 11/21/2026)
// is not a call, but the style call ("Style + formality (the design brief)")
// is where the brief's answer is kept, so the step opens it.
test('Wedding: writing the vision brief opens the style call', () => {
  const r = rows.find((x) => x.type === 'Wedding' && x.task === 'Write the vision brief');
  expect(r).toBeTruthy();
  expect(r.calls).toEqual([]);
  expect(r.kind).toBe('decisions');
  expect(resolveRoute(r.hit.route).focus).toBe('vision');
  expect(r.hit.label).toBe('Pick the style');
});

test('rows with no button only get fewer', () => {
  expect(rows.filter((r) => !r.hit).length).toBeLessThanOrEqual(NO_DESTINATION_CEILING);
});
