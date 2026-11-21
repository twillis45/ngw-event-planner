// ─── ONE ROOM PLAN SAYS WHO SLEEPS WHERE (owner pick "combine", 11/21/2026) ──
// Group Trip's "Settle who sleeps where…" opens the room plan in Where everyone
// stays. event.roomPlan is the single record; each person's "rooming with" on
// the lodging roster is derived from it; a stored roommate is ignored.
// e2e twin: hostv2/e2e/oneRoomPlanSaysWhoSleepsWhere.spec.mjs.
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';
import { buildTravelPlan } from '../travelPlan';
import { roomPlanOf, startRoomPlan, setRoomCount, assignRoom, cycleHabit, drawLots, roommatesOf, roomListText, renameRoom } from '../roomPlan';
import { duplicateEvent } from '../duplicateEvent';

const NAMES = ['Ana Ruiz', 'Bree Cole', 'Cam Ito', 'Dee Park', 'Em Shah', 'Fay Lund', 'Gia Moss', 'Hope Diaz'];
const ev = (extra = {}) => ({ id: 'rp', type: 'Group Trip', isDestination: true, date: '2027-01-10', endDate: '2027-01-13', guestMode: 'list',
  venueCity: 'Nashville, TN', guests: NAMES.map((n, i) => ({ id: 'g' + (i + 1), name: n, rsvp: 'Yes' })), ...extra });
const ROW = (playbookChecklist(ev(), '2026-10-01') || []).find((r) => /^Settle who sleeps where/.test(r.task));
// A pinned "random" source, so the draw is checkable: always the first slot.
const zero = () => 0;

test('premise: the row is in the playbook', () => { expect(ROW).toBeTruthy(); });

test('the row opens the room plan in Where everyone stays', () => {
  const hit = checklistRouteFor(ROW.task, { week: ROW.week, category: ROW.category }, ev());
  expect(hit && hit.label).toBe('Plan who sleeps where');
  expect(resolveRoute(hit.route)).toEqual({ kind: 'lodging', focus: 'rooms' });
});

test('the row is done once everyone is in a room, not before', () => {
  const t = { task: ROW.task };
  expect(taskSatisfied(ev(), t)).toBe(false);
  const half = ev({ roomPlan: { rooms: [{ id: 'r1', name: 'Room 1', guestIds: ['g1', 'g2'] }] } });
  expect(taskSatisfied(half, t)).toBe(false);
  const e = ev({ roomPlan: startRoomPlan(ev(), 4) });
  expect(taskSatisfied({ ...e, roomPlan: drawLots(e, zero) }, t)).toBe(true);
});

test('rooms ± and named; tap a name then a room moves that one person', () => {
  let e = ev({ roomPlan: startRoomPlan(ev()) });
  expect(roomPlanOf(e).rooms.map((r) => r.name)).toEqual(['Room 1', 'Room 2', 'Room 3', 'Room 4']);
  e = { ...e, roomPlan: renameRoom(e, 'r1', 'The bunk room') };
  e = { ...e, roomPlan: assignRoom(e, 'g1', 'r1') };
  e = { ...e, roomPlan: assignRoom(e, 'g1', 'r2') };
  expect(roomPlanOf(e).rooms.map((r) => r.guestIds)).toEqual([[], ['g1'], [], []]);
  e = { ...e, roomPlan: setRoomCount(e, 1) };
  expect(roomPlanOf(e).rooms).toEqual([{ id: 'r1', name: 'The bunk room', guestIds: [] }]);
  expect(setRoomCount(e, 3).rooms.map((r) => r.name)).toEqual(['The bunk room', 'Room 2', 'Room 3']);
});

test('draw lots: early risers fill the first rooms and night owls the last, from a real shuffle', () => {
  let e = ev({ roomPlan: startRoomPlan(ev(), 4) });
  for (const [id, n] of [['g6', 1], ['g3', 1], ['g4', 2], ['g7', 2]]) for (let k = 0; k < n; k += 1) e = { ...e, roomPlan: cycleHabit(e, id) };
  const plan = drawLots(e, Math.random);
  const roomOf = (g) => plan.rooms.findIndex((r) => r.guestIds.includes(g));
  expect([roomOf('g6'), roomOf('g3')].sort()).toEqual([0, 0]);
  expect([roomOf('g4'), roomOf('g7')].sort()).toEqual([3, 3]);
  expect(plan.rooms.flatMap((r) => r.guestIds).sort()).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8']);
  // It IS random: two different shuffles place the unmarked middle differently.
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  const a = drawLots(e, seq([0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8])).rooms[1].guestIds;
  const b = drawLots(e, seq([0.9, 0.1, 0.7, 0.3, 0.2, 0.5, 0.4])).rooms[1].guestIds;
  expect(a).not.toEqual(b);
});

test('"rooming with" on the lodging roster is derived from the plan; a stored roommate is ignored', () => {
  const guests = ev().guests.map((g) => (g.id === 'g1' ? { ...g, travel: { lodging: { roommate: 'Someone Old' } } } : g));
  const e = ev({ guests, roomPlan: { rooms: [{ id: 'r1', name: 'Room 1', guestIds: ['g1', 'g2'] }, { id: 'r2', name: 'Room 2', guestIds: ['g3'] }] } });
  const roster = buildTravelPlan(e).lodging.roster;
  const by = (id) => roster.find((r) => r.guestId === id);
  expect(by('g1').roommate).toBe('Bree Cole');
  expect(by('g2').roommate).toBe('Ana Ruiz');
  expect(by('g3').roommate).toBeNull();      // alone in Room 2
  expect(by('g4').roommate).toBeNull();      // no room yet
  expect(buildTravelPlan(ev({ guests })).lodging.roster.find((r) => r.guestId === 'g1').roommate).toBeNull();
  expect(roommatesOf(e, 'g1')).toEqual(['Bree Cole']);
});

test('a declined guest leaves the plan; the room list says who has no room yet', () => {
  const guests = ev().guests.map((g) => (g.id === 'g2' ? { ...g, rsvp: 'No' } : g));
  const e = ev({ guests, roomPlan: { rooms: [{ id: 'r1', name: 'Room 1', guestIds: ['g1', 'g2'] }] } });
  expect(roomPlanOf(e).rooms[0].guestIds).toEqual(['g1']);
  expect(roomListText(e)).toBe('Room 1: Ana Ruiz\nNo room yet: Cam Ito, Dee Park, Em Shah, Fay Lund, Gia Moss, Hope Diaz');
});

test('a duplicated trip does not carry last time’s rooms', () => {
  expect(duplicateEvent(ev({ roomPlan: startRoomPlan(ev()) }), { id: 'n', now: '2026-11-21T00:00:00Z' }).roomPlan).toBeUndefined();
});
