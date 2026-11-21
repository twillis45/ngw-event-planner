// ─── WHO SLEEPS WHERE: ONE ROOM PLAN (owner pick "combine", 11/21/2026) ──────
//
// Group Trip's "Settle who sleeps where: draw lots for the best rooms, and
// keep the early risers apart from the night owls" had no button. The room
// plan (event.roomPlan) is the single record:
//   · rooms, added or removed and named;
//   · tap a name, then a room;
//   · Draw lots — honestly random, with early risers (☀) filling rooms first
//     and night owls (☾) last, so they mostly land apart, and the copy says so;
//   · Copy the room list.
// Each person's "rooming with …" (the lodging roster's `roommate`) is DERIVED
// from it (travelPlan reads roommatesOf). The old stored
// guests[].travel.lodging.roommate had no writer anywhere and is ignored, so
// there is never a second record to disagree with.
//
// Shape: { rooms: [{ id, name, guestIds: [] }], habits: { [guestId]: 'early' | 'late' } }

export const ROOMS_ROW = /^settle who sleeps where\b/i;
export const HABIT_MARK = { early: '☀', late: '☾' };

const str = (v) => String(v == null ? '' : v).trim();
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/** The people a room is for: named guests who have not declined (the lodging roster's rule). */
export function roomPlanPeople(event) {
  return (Array.isArray(event && event.guests) ? event.guests : [])
    .filter((g) => g && g.id != null && str(g.name) && !/^n/i.test(str(g.rsvp)))
    .map((g) => ({ id: g.id, name: str(g.name), first: str(g.name).split(/\s+/)[0] }));
}

/** The plan, cleaned: unknown or declined people leave their rooms; nobody sits in two. */
export function roomPlanOf(event) {
  const raw = (event && event.roomPlan && typeof event.roomPlan === 'object') ? event.roomPlan : {};
  const people = roomPlanPeople(event);
  const seen = new Set();
  const rooms = (Array.isArray(raw.rooms) ? raw.rooms : []).filter((r) => r && r.id).map((r, i) => ({
    id: String(r.id),
    name: str(r.name) || `Room ${i + 1}`,
    guestIds: (Array.isArray(r.guestIds) ? r.guestIds : []).filter((gid) => {
      const key = String(gid);
      if (seen.has(key) || !people.some((p) => sameId(p.id, gid))) return false;
      seen.add(key);
      return true;
    }),
  }));
  const habits = (raw.habits && typeof raw.habits === 'object') ? raw.habits : {};
  return { rooms, habits };
}

/** A starting plan: one room per two people, unnamed beyond "Room N". */
export function startRoomPlan(event, count) {
  const n = Math.max(1, Number(count) || Math.ceil(roomPlanPeople(event).length / 2) || 1);
  return { rooms: Array.from({ length: n }, (_, i) => ({ id: 'r' + (i + 1), name: `Room ${i + 1}`, guestIds: [] })), habits: {} };
}

/** Rooms ±: added rooms are empty; a removed room's people go back to "no room yet". */
export function setRoomCount(event, n) {
  const plan = roomPlanOf(event);
  const want = Math.max(1, Math.min(20, Math.floor(Number(n) || 1)));
  const rooms = plan.rooms.slice(0, want);
  const used = new Set(rooms.map((r) => r.id));
  for (let i = rooms.length; i < want; i += 1) {
    let k = i + 1;
    while (used.has('r' + k)) k += 1;
    used.add('r' + k);
    rooms.push({ id: 'r' + k, name: `Room ${i + 1}`, guestIds: [] });
  }
  return { ...plan, rooms };
}

export function renameRoom(event, roomId, name) {
  const plan = roomPlanOf(event);
  return { ...plan, rooms: plan.rooms.map((r) => (r.id === roomId ? { ...r, name: String(name || '').slice(0, 40) } : r)) };
}

/** Put a person in a room (or in none, with roomId null). */
export function assignRoom(event, guestId, roomId) {
  const plan = roomPlanOf(event);
  return {
    ...plan,
    rooms: plan.rooms.map((r) => {
      const rest = r.guestIds.filter((g) => !sameId(g, guestId));
      return r.id === roomId ? { ...r, guestIds: [...rest, guestId] } : { ...r, guestIds: rest };
    }),
  };
}

/** ☀ → ☾ → unmarked, for one person. */
export function cycleHabit(event, guestId) {
  const plan = roomPlanOf(event);
  const cur = plan.habits[String(guestId)];
  const next = cur === 'early' ? 'late' : cur === 'late' ? null : 'early';
  const habits = { ...plan.habits };
  if (next) habits[String(guestId)] = next; else delete habits[String(guestId)];
  return { ...plan, habits };
}

/**
 * Draw lots. The order is a real shuffle (`rand` is Math.random unless a test
 * pins it); then early risers go first and night owls last, and the rooms fill
 * in order — so the two groups mostly land in different rooms. Nothing about
 * who rooms with whom is chosen by the app beyond that one stated rule.
 */
export function drawLots(event, rand = Math.random) {
  const plan = roomPlanOf(event);
  const rooms = plan.rooms.length ? plan.rooms : startRoomPlan(event).rooms;
  const people = roomPlanPeople(event).map((p) => p.id);
  for (let i = people.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [people[i], people[j]] = [people[j], people[i]];
  }
  const rank = (id) => ({ early: 0, late: 2 }[plan.habits[String(id)]] ?? 1);
  const order = people.map((id, i) => ({ id, i })).sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i).map((x) => x.id);
  const per = Math.ceil(order.length / rooms.length) || 0;
  return {
    ...plan,
    rooms: rooms.map((r, k) => ({ ...r, guestIds: order.slice(k * per, (k + 1) * per) })),
  };
}

/** Who shares a room with this person (full names), or [] when unplaced or alone. */
export function roommatesOf(event, guestId) {
  const plan = roomPlanOf(event);
  const room = plan.rooms.find((r) => r.guestIds.some((g) => sameId(g, guestId)));
  if (!room) return [];
  const people = roomPlanPeople(event);
  return room.guestIds.filter((g) => !sameId(g, guestId))
    .map((g) => (people.find((p) => sameId(p.id, g)) || {}).name).filter(Boolean);
}

/** The people not in any room yet. */
export function unplaced(event) {
  const plan = roomPlanOf(event);
  const placed = new Set(plan.rooms.flatMap((r) => r.guestIds.map(String)));
  return roomPlanPeople(event).filter((p) => !placed.has(String(p.id)));
}

/** "Room 1: Fay Lund, Cam Ito" per line, then who has no room yet. */
export function roomListText(event) {
  const plan = roomPlanOf(event);
  const people = roomPlanPeople(event);
  const nameOf = (g) => (people.find((p) => sameId(p.id, g)) || {}).name;
  const lines = plan.rooms.map((r) => `${r.name}: ${r.guestIds.map(nameOf).filter(Boolean).join(', ') || 'nobody yet'}`);
  const left = unplaced(event);
  if (left.length) lines.push(`No room yet: ${left.map((p) => p.name).join(', ')}`);
  return lines.join('\n');
}

/** "Settle who sleeps where" is done when everyone is in a room. */
export function roomPlanSettled(event) {
  const people = roomPlanPeople(event);
  return people.length > 0 && roomPlanOf(event).rooms.length > 0 && unplaced(event).length === 0;
}
