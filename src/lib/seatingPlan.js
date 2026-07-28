// ─── seatingPlan — Sprint 1 "One app": tables + guest-assignment engine ──────
//
// Extracted verbatim from App.js's legacy Seating component (the last L4 tab
// with no V2 equivalent) so the V2 UI slice can wire seating without
// re-implementing the math — same extraction pattern as eventGeoQuery /
// importHistory, same thin-domain-helper shape as crabPlan / travelPlan.
// Pure readers over event state + pure write-shape helpers; no React, no DOM,
// no storage, no fetching.
//
// DATA MODEL (as found in App.js — nothing here is invented):
//   event.tables      — a NUMBER: how many tables exist (default 5 via
//                       `event.tables || 5` at every legacy read site).
//                       There is NO per-table seat capacity anywhere in the
//                       model — "capacity" in legacy is only the derived
//                       average (confirmed ÷ tableCount) and the evenness
//                       check (max−min occupancy ≤ 1). This engine therefore
//                       exposes occupancy + avgPerTable + tablesEven and does
//                       NOT fabricate a seats-per-table limit or an
//                       over-capacity flag off data that doesn't exist.
//   event.tableNames  — string[] indexed by tableNum−1; '' / missing means
//                       the default "Table N" label.
//   event.guests[i]   — { id, name, rsvp, table, group, meal, kids, needs }
//                       · rsvp === 'Yes' (strict) is "confirmed" — the only
//                         guests seating considers (matches legacy Seating
//                         AND Command Center's unseated nudge).
//                       · table — 1-based table number, or null/undefined
//                         when unassigned. Legacy compares with strict ===.
//                       · meal — 'Standard' | 'Vegetarian' | 'Vegan' |
//                         'Gluten-Free' | '—'; kids — number; needs — free
//                         text ("wheelchair" etc.).
//
// HARD RULES (same doctrine as crabPlan / travelPlan):
//   - headcount-only events (no guest roster) degrade: tables come back with
//     empty occupancy and roster-derived arrays come back EMPTY — guests are
//     never invented from a headcount.
//   - write helpers are pure: they return the NEXT array (guests /
//     tableNames); the UI owns persistence (setGuests / patchEvent).
//   - behavior-preserving: quirks are kept, not fixed (e.g. auto-assign
//     round-robins per GUEST, so one group's members scatter across
//     consecutive tables — that is what shipped; noted, not changed).

import { playbookCapacity } from './playbooks';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * The last-resort table count. Kept ONLY for an event whose playbook authors no tables at
 * all — see tableCountOf below, which now derives a real number first.
 *
 * This used to be the WHOLE answer: `event.tables || 5`. Five tables the host never chose,
 * drawn as fact, with the evenness advice ("balances the room evenly") computed against
 * them. Meanwhile playbookCapacity was ALREADY turning the playbook's own authored rentals
 * factor — a crab feast is `qtyPerGuest: 0.15` for long folding tables, about one per 6–7
 * pickers — into a real count, from an engine the runtime already imports. Two engines that
 * never spoke.
 */
export const DEFAULT_TABLE_COUNT = 5;

const TABLE_ROW = /table/i;

/**
 * Tables the PLAYBOOK says this event needs, from its own authored rentals factor × the real
 * guest count. Null when the playbook authors no table row — in which case we do not invent
 * one, we fall back and the surface says it is a starting point.
 */
export function playbookTableCount(event) {
  try {
    // Static import, NOT require(). I reached for a lazy require() to dodge a circular
    // dependency that does not exist — playbooks/index.js has no reference to this file — and
    // require() does not exist in the Vite/ESM browser bundle. It threw, the catch swallowed
    // it, and every event silently fell back to the bare 5 IN THE APP while the unit tests
    // (running under Jest/CJS, where require works) passed. The tests said one thing and the
    // running app did another; only opening the sheet caught it.
    const cap = playbookCapacity(event);
    const row = ((cap && cap.items) || []).find((i) => i && TABLE_ROW.test(String(i.short || i.item || '')));
    const qty = row && Number(row.qty);
    return Number.isFinite(qty) && qty > 0 ? qty : null;
  } catch (_e) { return null; }
}

/** Short meal labels used on seating pills (legacy `mealShort`). */
export const MEAL_SHORT = { Standard: 'Std', Vegetarian: 'Veg', Vegan: 'Vgn', 'Gluten-Free': 'GF', '—': '' };

/**
 * The event's table count as every legacy read site resolves it:
 * `event.tables || 5`. 0 / missing / junk → the default.
 * @param {object} event
 * @returns {number}
 */
export function tableCountOf(event) {
  // A TABLE IS A WHOLE THING (host report 2026-07-28: "cant have 1.2 tables").
  // The playbook factor scales per-guest, so it can land on 1.4; the capacity
  // builder now ceils, and this ceils too — defence in depth, and it also heals
  // an event that already PERSISTED a fractional count before that fix landed.
  // Array.from({length: 1.2}) silently drew ONE table while the label said 1.2,
  // so the map and the copy disagreed with each other as well as with reality.
  const own = num(event && event.tables);
  if (own) return Math.max(1, Math.ceil(own));
  // Otherwise the playbook's real factor, not a bare 5.
  const derived = playbookTableCount(event);
  return derived ? Math.max(1, Math.ceil(derived)) : DEFAULT_TABLE_COUNT;
}

/** Where the table count came from, so a surface can say so instead of drawing it as fact. */
export function tableCountBasis(event) {
  if (num(event && event.tables)) return 'host';
  return playbookTableCount(event) ? 'playbook' : 'default';
}

/**
 * Clamp a host-typed table count the way the legacy input handler does:
 * `Math.max(1, Number(value) || 1)` — never below 1, junk becomes 1.
 * @param {*} value raw input value
 * @returns {number}
 */
export function clampTableCount(value) {
  // Whole tables only — the ± stepper and any host-typed value both land here.
  return Math.max(1, Math.ceil(Number(value) || 1));
}

/**
 * Display label for a table: the host's custom name when set, else "Table N".
 * @param {string[]|null|undefined} tableNames event.tableNames
 * @param {number} tableNum 1-based table number
 * @returns {string}
 */
export function tableLabel(tableNames, tableNum) {
  return (Array.isArray(tableNames) ? tableNames : [])[tableNum - 1] || `Table ${tableNum}`;
}

/**
 * Confirmed guests — the only roster seating considers. Strict rsvp === 'Yes',
 * exactly as legacy Seating and the Command Center nudge filter.
 * @param {Array|null|undefined} guests
 * @returns {Array}
 */
export function confirmedGuests(guests) {
  return (Array.isArray(guests) ? guests : []).filter(g => g && g.rsvp === 'Yes');
}

/**
 * Chairs a guest row actually needs: the guest plus a filled plusOne. A couple
 * stays ONE assignment unit (they sit together), but they are TWO people — one
 * row = one chair undercounted every couple at every table until the 2026-07-27
 * audit (engine parity with attendanceBand/crabPlan).
 */
export function seatsFor(g) {
  return 1 + (String((g && g.plusOne) || '').trim() ? 1 : 0);
}
const seatSum = (rows) => rows.reduce((s, g) => s + seatsFor(g), 0);

/**
 * Name-search filter for guest rows (legacy inline search). Empty query
 * passes everything; otherwise case-insensitive substring on name.
 * @param {Array} list guest objects
 * @param {string} query
 * @returns {Array}
 */
export function filterGuestsByName(list, query) {
  const q = String(query || '').toLowerCase();
  if (!q) return Array.isArray(list) ? list : [];
  return (Array.isArray(list) ? list : []).filter(g => String((g && g.name) || '').toLowerCase().includes(q));
}

/**
 * Diet / accessibility rollup chips over confirmed guests (legacy host-hero
 * chips). Derived ONLY from real guest fields; empty roster → no chips.
 * @param {Array} confirmed confirmed guest objects
 * @returns {string[]} e.g. ['Veg 3', 'GF 1', 'Kids 4', 'Wheelchair 1']
 */
// A guest needs an accessible seat if the redesigned invite's structured
// `access` array says so, OR (legacy / typed) the free-text `needs` matches.
const NEEDS_ACCESSIBLE_RE = /wheel|accessib|\bada\b|step-?free|mobility/i;
export function guestNeedsAccessibleSeat(g) {
  if (!g) return false;
  const access = Array.isArray(g.access) ? g.access.join(' ') : '';
  return NEEDS_ACCESSIBLE_RE.test(access) || NEEDS_ACCESSIBLE_RE.test(String(g.needs || ''));
}

export function dietChipsFor(confirmed) {
  if (!Array.isArray(confirmed) || !confirmed.length) return [];
  let veg = 0, gf = 0, kids = 0, wheel = 0;
  for (const g of confirmed) {
    // Read the guest's plate AND their structured diet array (redesigned invite),
    // so a veg/GF pick counts no matter where it was recorded. The plus-one's
    // recorded plate/needs ride the same row (they have no row of their own).
    const dietHay = [String((g && g.meal) || ''),
      String((g && g.plusOne) ? (g.plusOneMeal || '') : ''),
      String((g && g.plusOne) ? (g.plusOneNeeds || '') : ''),
      ...(Array.isArray(g && g.diets) ? g.diets : [])].join(' ');
    if (/veg(etarian|an)?/i.test(dietHay)) veg++;
    if (/gluten|^gf$/i.test(dietHay)) gf++;
    if (g && g.kids) kids += Number(g.kids) || 0;
    if (guestNeedsAccessibleSeat(g)) wheel++;
  }
  const out = [];
  if (veg) out.push(`Veg ${veg}`);
  if (gf) out.push(`GF ${gf}`);
  if (kids) out.push(`Kids ${kids}`);
  if (wheel) out.push(`Wheelchair ${wheel}`);
  return out;
}

/**
 * The NAMES of guests who need an accessible seat — so the host can place them
 * deliberately (actionable surfacing, not just a count). Confirmed guests only.
 * @param {Array} confirmed confirmed guest objects
 * @returns {string[]} e.g. ['Jane Doe', 'Bob Smith']
 */
export function accessibleSeatNames(confirmed) {
  if (!Array.isArray(confirmed)) return [];
  return confirmed.filter(guestNeedsAccessibleSeat).map((g) => String((g && g.name) || 'A guest').trim()).filter(Boolean);
}

/**
 * ONE reader that turns event state into the whole seating picture.
 * Reads event.guests / event.tables / event.tableNames only.
 *
 * @param {object} event
 * @returns {{
 *   enabled: boolean,            // seating always exists — tables are configurable on any event
 *   hasRoster: boolean,          // false for headcount-only events (guests never invented)
 *   tableCount: number,
 *   tables: Array<{
 *     number: number,            // 1-based
 *     name: string|null,         // host's custom name, or null
 *     label: string,             // name || "Table N"
 *     guests: Array,             // confirmed guests seated here (strict table === number)
 *     count: number,             // occupancy
 *     kids: number,              // extra kids riding on these guests
 *     meals: Object<string,number>, // per-meal rollup (legacy: every meal except '—')
 *   }>,
 *   confirmed: Array,            // rsvp === 'Yes'
 *   unassigned: Array,           // confirmed with no table (legacy unseatedAll)
 *   dietChips: string[],
 *   totals: {
 *     confirmed: number, seated: number, unassigned: number, tableCount: number,
 *     avgPerTable: number|null,  // round(confirmed ÷ tables); null when no confirmed guests
 *     tablesEven: boolean,       // legacy balance check: non-empty tables within 1 of each other
 *     allSeated: boolean,        // confirmed > 0 and none unassigned
 *   },
 * }}
 */
export function buildSeatingPlan(event) {
  const ev = event || {};
  const hasRoster = Array.isArray(ev.guests) && ev.guests.length > 0;
  const tableCount = tableCountOf(ev);
  const tableNames = Array.isArray(ev.tableNames) ? ev.tableNames : [];
  const confirmed = confirmedGuests(ev.guests);
  const unassigned = confirmed.filter(g => !g.table);
  // People, not rows: a row with a filled plusOne is two chairs (seatsFor).
  const confirmedSeats = seatSum(confirmed);
  const unassignedSeats = seatSum(unassigned);
  const seated = confirmedSeats - unassignedSeats;

  const tables = Array.from({ length: tableCount }, (_, i) => {
    const number = i + 1;
    const guests = confirmed.filter(g => g.table === number); // strict ===, as legacy
    // A guest who has not told you their meal is NOT a meal choice. The old test
    // rejected only the '—' sentinel, so a guest with `meal` undefined bucketed
    // under the key `undefined` and the table row rendered the literal string
    // "undefined 2" (host report 2026-07-28). Unknown is unknown — it is left out
    // of the breakdown rather than invented or printed raw.
    const realMeal = (m) => { const s = String(m == null ? '' : m).trim(); return s && s !== '—' ? s : null; };
    const meals = guests.reduce((acc, g) => {
      const m = realMeal(g.meal);
      if (m) acc[m] = (acc[m] || 0) + 1;
      // The plus-one's plate counts at this table too (their own meal when
      // recorded; never invented).
      const pm = realMeal(g.plusOneMeal);
      if (String(g.plusOne || '').trim() && pm) acc[pm] = (acc[pm] || 0) + 1;
      return acc;
    }, {});
    const kids = guests.reduce((sum, g) => sum + (g.kids || 0), 0);
    const name = tableNames[i] || null;
    return { number, name, label: name || `Table ${number}`, guests, count: seatSum(guests), kids, meals };
  });

  // Legacy evenness: false until someone is seated; a single occupied table is
  // "even"; otherwise every non-empty table within 1 guest of the others.
  const tablesEven = (() => {
    if (seated === 0) return false;
    const counts = tables.map(t => t.count).filter(n => n > 0);
    if (counts.length < 2) return true;
    return (Math.max(...counts) - Math.min(...counts)) <= 1;
  })();

  return {
    enabled: true,
    hasRoster,
    tableCount,
    tables,
    confirmed,
    unassigned,
    dietChips: dietChipsFor(confirmed),
    // Names (not just a count) of guests needing an accessible seat, so the host
    // can place them deliberately — the redesigned invite's access data made
    // actionable instead of a dead tally.
    accessibleSeats: accessibleSeatNames(confirmed),
    totals: {
      confirmed: confirmedSeats, // chairs needed, not rows — a couple is two
      seated,
      unassigned: unassignedSeats,
      tableCount,
      avgPerTable: confirmedSeats ? Math.round(confirmedSeats / tableCount) : null,
      tablesEven,
      allSeated: confirmedSeats > 0 && unassignedSeats === 0,
    },
  };
}

// ── Write-shape helpers — pure; the UI persists the returned array ───────────

/**
 * Next guests array with one guest assigned to a table.
 * @param {Array} guests full guest array (not just confirmed)
 * @param {*} guestId
 * @param {number} tableNum 1-based
 * @returns {Array} next guests array
 */
export function assignGuestToTable(guests, guestId, tableNum) {
  return (Array.isArray(guests) ? guests : []).map(g => (g && g.id === guestId ? { ...g, table: tableNum } : g));
}

/**
 * Next guests array with one guest removed from their table (table: null,
 * exactly what legacy unassign wrote).
 * @param {Array} guests full guest array
 * @param {*} guestId
 * @returns {Array} next guests array
 */
export function unassignGuest(guests, guestId) {
  return (Array.isArray(guests) ? guests : []).map(g => (g && g.id === guestId ? { ...g, table: null } : g));
}

/**
 * Legacy "Auto-assign by group": every UNSEATED confirmed guest who has a
 * group gets the next table, round-robin. Preserved quirk: the index advances
 * per GUEST (not per group), so a group's members land on CONSECUTIVE tables
 * rather than together — that is what shipped, kept verbatim. Guests without
 * a group, already-seated guests, and non-confirmed guests are untouched.
 * @param {Array} guests full guest array
 * @param {number} tableCount
 * @returns {Array} next guests array
 */
export function autoAssignByGroup(guests, tableCount) {
  const all = Array.isArray(guests) ? guests : [];
  const count = clampTableCount(tableCount);
  const confirmed = all.filter(g => g && g.rsvp === 'Yes');
  const groups = [...new Set(confirmed.map(g => g.group).filter(Boolean))];
  let tableIdx = 0;
  const updates = {};
  const seen = new Set();
  groups.forEach(group => {
    const members = confirmed.filter(g => g.group === group && !g.table);
    members.forEach(g => {
      if (seen.has(g.id)) return;
      const table = (tableIdx % count) + 1;
      updates[g.id] = table;
      seen.add(g.id);
      // A linked couple (coupleId, split-on-entry 2026-07-27) sits TOGETHER —
      // the round-robin's preserved quirk scatters group members, but a couple
      // is one unit: the partner lands on the same table, one index advance.
      if (g.coupleId) {
        const partner = confirmed.find(x => x && x !== g && x.coupleId === g.coupleId && !x.table && !seen.has(x.id));
        if (partner) { updates[partner.id] = table; seen.add(partner.id); }
      }
      tableIdx++;
    });
  });
  return all.map(g => (g && updates[g.id] ? { ...g, table: updates[g.id] } : g));
}

/**
 * Next tableNames array with one table renamed (trimmed, as the legacy
 * rename-on-blur wrote it; '' clears back to the default "Table N" label).
 * @param {string[]|null|undefined} tableNames current event.tableNames
 * @param {number} tableNum 1-based
 * @param {string} name raw typed name
 * @returns {string[]} next tableNames array
 */
export function renameTable(tableNames, tableNum, name) {
  const names = [...(Array.isArray(tableNames) ? tableNames : [])];
  names[tableNum - 1] = String(name || '').trim();
  return names;
}
