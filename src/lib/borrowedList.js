// ─── THE BORROWED LIST (owner pick B, 11/21/2026) ────────────────────────────
//
// "Return the borrowed projector…", "Return every borrowed platter, urn, and
// folding chair…", "Wash and return every borrowed pan…" had no button, and
// five more return rows opened Space and found nothing there to return.
// They open "Borrowed · N of M back" on Space, seats & helpers:
//   · what a helper brings on What to bring (capacityHelpers) appears on its own;
//   · anything else is added by hand: What + From whom (event.borrowed[]);
//   · "Mark returned" records it; "Still to go back: Aunt Rose (…)" says who
//     is still owed what.
// A helper item's return is kept as a borrowed[] entry carrying `helperKey`,
// so both kinds live in the one field and sync with the event.

// The eight return rows, by their authored words: a return verb, then
// something borrowed or lent.
export const BORROWED_ROW = /^(?:return|get|give back|wash and return)\b[^.;]*\b(?:borrowed|lent)\b/i;

const str = (v) => String(v == null ? '' : v).trim();

/**
 * The list: helper-supplied items first (What to bring order), then the host's
 * own entries. `names` maps a What-to-bring key to its label; without one the
 * key itself is shown.
 */
export function borrowedList(event, names = {}) {
  const ev = event || {};
  const helpers = (ev.capacityHelpers && typeof ev.capacityHelpers === 'object') ? ev.capacityHelpers : {};
  const skip = (ev.capacitySkip && typeof ev.capacitySkip === 'object') ? ev.capacitySkip : {};
  const own = (Array.isArray(ev.borrowed) ? ev.borrowed : []).filter((b) => b && b.id);
  const rows = [];
  for (const key of Object.keys(helpers)) {
    const from = str(helpers[key]);
    if (!from || skip[key]) continue;
    const rec = own.find((b) => b.helperKey === key);
    rows.push({ id: 'cap:' + key, helperKey: key, what: str(names[key]) || key, from, returned: !!(rec && rec.returned) });
  }
  for (const b of own) {
    if (b.helperKey) continue;
    if (!str(b.what)) continue;
    rows.push({ id: b.id, what: str(b.what), from: str(b.from), returned: !!b.returned });
  }
  const back = rows.filter((r) => r.returned).length;
  // "Aunt Rose (Coffee urn, chafing dishes) · Grace Church hall (chairs)"
  const owed = new Map();
  for (const r of rows) {
    if (r.returned) continue;
    const who = r.from || 'Not sure who';
    owed.set(who, [...(owed.get(who) || []), r.what]);
  }
  const stillToGo = [...owed].map(([who, what]) => `${who} (${what.join(', ')})`).join(' · ');
  return { rows, back, total: rows.length, stillToGo };
}

/** The new borrowed[] after marking a row returned (or not). */
export function markReturned(event, row, returned = true) {
  const own = Array.isArray(event && event.borrowed) ? event.borrowed : [];
  if (row.helperKey) {
    const rest = own.filter((b) => b && b.helperKey !== row.helperKey);
    return [...rest, { id: row.id, helperKey: row.helperKey, returned: !!returned }];
  }
  return own.map((b) => (b && b.id === row.id ? { ...b, returned: !!returned } : b));
}

/** The new borrowed[] with a hand-added item, or null when What is blank. */
export function addBorrowed(event, what, from, id) {
  const w = str(what);
  if (!w) return null;
  const own = Array.isArray(event && event.borrowed) ? event.borrowed : [];
  return [...own, { id: id || 'b-' + Date.now().toString(36), what: w.slice(0, 80), from: str(from).slice(0, 80), returned: false }];
}

/** A return row is done when there is something on the list and all of it is back. */
export function borrowedAllBack(event) {
  const b = borrowedList(event);
  return b.total > 0 && b.back === b.total;
}
