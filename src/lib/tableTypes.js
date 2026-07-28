// ─── Table types and how many each one actually seats ───────────────────────
//
// Host directive (2026-07-28): "logic to adjust how many each table sits. type
// of tables."
//
// DOCTRINE SHAPE:
//   · Until now the model had NO per-table capacity at all — seatingPlan's own
//     header says so ("does NOT fabricate a seats-per-table limit off data that
//     doesn't exist"). That was the right call while nothing knew a table's
//     size. A table TYPE is the missing fact: once the host says "60-inch
//     round", the seat count is a published industry standard, not a guess.
//   · So capacity is DERIVED FROM A DECLARED TYPE, never invented from thin
//     air, and the host can always override a specific table (a round that
//     seats 8 comfortably takes 10 when the family squeezes in).
//   · `seats` is the comfortable count rental companies publish; `seatsMax` is
//     the tight count. We plan on `seats` and say the max rather than silently
//     planning at the squeeze.
//   · A type the host has not set stays null — unknown, and the surface says so.
//
// event.tableTypes — string[] indexed by tableNum-1, a TABLE_TYPES id or ''.
// event.tableSeats — (number|null)[] indexed by tableNum-1, a host override.

export const TABLE_TYPE_SOURCES = {
  'rental-standard-seating': {
    title: 'Standard event-table seating capacities (round and banquet)',
    publisher: 'Event rental industry practice',
    tier: 'established-consensus',
    note: 'Rental catalogues converge on the same figures: a 60-inch round seats 8 (10 tight), a 72-inch round seats 10 (12 tight), a 48-inch round seats 6; an 8-foot banquet table seats 8 down the sides (10 with the ends), a 6-foot seats 6 (8 with the ends). These are dimensional facts about the table, not estimates about an event.',
  },
  'ada-clearance': {
    title: 'ADA Standards for Accessible Design — dining surfaces and clear floor space',
    publisher: 'U.S. Department of Justice (28 CFR Part 36, 2010 Standards)',
    tier: 'established-consensus',
    note: 'Accessible routes between seating need clear width; a wheelchair space at a dining surface needs knee and toe clearance. The practical planning consequence: a table seating its MAX leaves no room to get a chair out, so a guest who needs step-free access should sit at a table planned to its comfortable count, not its squeeze.',
  },
};

/**
 * The types a host can pick. `seats` = the comfortable published count,
 * `seatsMax` = the tight count. `shape` drives the floor-plan puck only.
 */
export const TABLE_TYPES = [
  { id: 'round-48', label: '48" round', shape: 'round', seats: 6, seatsMax: 8, note: 'A small round — six is comfortable.' },
  { id: 'round-60', label: '60" round', shape: 'round', seats: 8, seatsMax: 10, note: 'The banquet standard — eight comfortable, ten if you squeeze.' },
  { id: 'round-72', label: '72" round', shape: 'round', seats: 10, seatsMax: 12, note: 'The big round — ten comfortable, twelve tight.' },
  { id: 'banquet-6', label: '6ft banquet', shape: 'long', seats: 6, seatsMax: 8, note: 'Three a side; eight if you seat the ends.' },
  { id: 'banquet-8', label: '8ft banquet', shape: 'long', seats: 8, seatsMax: 10, note: 'Four a side; ten if you seat the ends.' },
  { id: 'picnic-8', label: '8ft picnic', shape: 'long', seats: 8, seatsMax: 8, note: 'Benches — four a side, and the ends do not seat.' },
  { id: 'farm-8', label: '8ft farm table', shape: 'long', seats: 8, seatsMax: 10, note: 'Same footprint as a banquet table, heavier look.' },
  { id: 'cocktail', label: 'Cocktail / highboy', shape: 'round', seats: 0, seatsMax: 4, note: 'A standing table — it seats nobody unless you add stools.' },
  { id: 'sweetheart', label: 'Sweetheart', shape: 'long', seats: 2, seatsMax: 2, note: 'Two seats, for the couple or the honoree.' },
];

const BY_ID = TABLE_TYPES.reduce((m, t) => { m[t.id] = t; return m; }, {});

/** The type record for an id, or null. Never throws on junk. */
export function tableTypeById(id) {
  const k = String(id || '').trim();
  return k && BY_ID[k] ? BY_ID[k] : null;
}

const arrAt = (v, i) => (Array.isArray(v) ? v[i] : undefined);
const whole = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null; };

/** The declared type of one table (1-based), or null when the host hasn't said. */
export function tableTypeOf(event, tableNum) {
  const ev = event || {};
  const own = tableTypeById(arrAt(ev.tableTypes, Number(tableNum) - 1));
  if (own) return own;
  // A single default type for the whole room is a legitimate host answer too.
  return tableTypeById(ev.tableType);
}

/**
 * How many this table seats:
 *   1. the host's override for THIS table          (they're standing in the room)
 *   2. the declared type's comfortable count       (a published dimensional fact)
 *   3. the room-wide seats-per-table the host set  (the pre-existing field)
 *   4. null — unknown. We never invent a capacity.
 * Returns { seats, seatsMax, basis } so a surface can say where the number came
 * from instead of drawing it as fact.
 */
export function seatsForTable(event, tableNum) {
  const ev = event || {};
  const override = whole(arrAt(ev.tableSeats, Number(tableNum) - 1));
  const type = tableTypeOf(ev, tableNum);
  if (override != null) {
    return { seats: override, seatsMax: type ? Math.max(override, type.seatsMax) : override, basis: 'host' };
  }
  if (type) return { seats: type.seats, seatsMax: type.seatsMax, basis: 'type' };
  const room = whole(ev.seatsPerTable);
  if (room != null) return { seats: room, seatsMax: room, basis: 'room' };
  return { seats: null, seatsMax: null, basis: 'unknown' };
}

/**
 * Room-level rollup: total seats when EVERY table's capacity is known, else
 * null — a partial total would read as a real number and be wrong.
 */
export function roomSeats(event, tableCount) {
  const n = Math.max(0, Math.ceil(Number(tableCount) || 0));
  if (!n) return { total: null, known: 0, of: 0 };
  let total = 0, known = 0;
  for (let i = 1; i <= n; i += 1) {
    const s = seatsForTable(event, i);
    if (s.seats == null) continue;
    total += s.seats; known += 1;
  }
  return { total: known === n ? total : null, known, of: n };
}

/** Write-shape helper: set one table's type without disturbing its neighbours. */
export function withTableType(event, tableNum, typeId) {
  const i = Math.max(0, Math.ceil(Number(tableNum) || 1) - 1);
  const next = Array.isArray(event && event.tableTypes) ? [...event.tableTypes] : [];
  while (next.length <= i) next.push('');
  next[i] = tableTypeById(typeId) ? String(typeId) : '';
  return next;
}

/** Write-shape helper: set one table's seat override (null clears it). */
export function withTableSeats(event, tableNum, seats) {
  const i = Math.max(0, Math.ceil(Number(tableNum) || 1) - 1);
  const next = Array.isArray(event && event.tableSeats) ? [...event.tableSeats] : [];
  while (next.length <= i) next.push(null);
  next[i] = whole(seats);
  return next;
}
