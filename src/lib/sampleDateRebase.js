// ─── SAMPLE DATE REBASE — the sample corpus stops rotting ────────────────────
//
// THE PROBLEM (2026-07-31). Every date in the sample events was an absolute ISO
// literal — 691 of them across sampleEventsExtra.js and sampleEventsDMV.js. An
// absolute date encodes a LEAD on the day it is authored and then shrinks by one
// every day after, so the fixtures walk themselves through scenarios nobody wrote
// them for. Measured on 2026-07-31:
//
//   * 9 of 21 events had already gone past-date and rendered ZERO rows, so half
//     the corpus was silently inert.
//   * ev-x-retirement-party read 29 days out. Every Figma board captured from it
//     reads 43 DAYS, so the design reference and the app disagreed — and the
//     board is what the parity check verifies against.
//   * Its catering balance was 51 days overdue, which promoted "Pay your caterer"
//     over the "Ask about insurance" hero the boards depict. The ranking was
//     correct; its input had rotted.
//
// testUtils/frozenClock.js already names this exact failure for TEST fixtures
// ("a hardcoded future date … encoded a 20-day lead on the day it was written and
// has been shrinking ever since"). That fix never reached the SHIPPED sample
// corpus. This is that fix.
//
// THE MODEL. One constant. The seed files keep their authored dates, which are
// read as offsets FROM `SAMPLE_ANCHOR` rather than as facts about a calendar.
// Every date in an event shifts by the same delta, so every internal relationship
// — a deposit due six weeks before the day, a COI expiring after it, a document
// touched last Tuesday — survives exactly as authored. Only "now" moves.
//
// PURE: no React, no I/O, no imports. Deterministic given a clock.

// The day the sample corpus was authored against. Chosen so ev-x-retirement-party
// resolves to 43 days out — the lead every Figma board in
// `3jKLC1z1Y0UGWNcenJGDQW` was captured at (2026-08-29 minus 43). Moving this one
// constant re-times the entire corpus; nothing else encodes a calendar.
export const SAMPLE_ANCHOR = '2026-07-17';

// Strict shapes only. `YYYY-MM-DD` and a full ISO instant. Deliberately NOT
// matched: the `week` fields, which hold template keys like "2026-W24" and
// "2026-06 (Wk of Jun 15)" and are phase labels the workflow engines match on,
// not moments in time. Shifting those would break taskRoute/dayAlerts matching.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

const DAY_MS = 86400000;

// Both endpoints read at UTC NOON. Every real zone lies within UTC-12..UTC+14, so
// a midday instant is the same calendar day everywhere and the difference is an
// exact integer of days — no DST step, and none of the local-components-serialised-
// as-UTC drift that frozenClock.js documents.
const noonUTC = (dateOnly) => Date.parse(`${dateOnly}T12:00:00.000Z`);

// LOCAL calendar components — the same calendar `dates.js` measures in, so "today"
// means the day the host is actually living in.
const pad = (n) => String(n).padStart(2, '0');
const localDateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Whole days from SAMPLE_ANCHOR to the current local calendar day. */
export function rebaseDelta(now = new Date()) {
  const today = localDateOnly(now);
  return Math.round((noonUTC(today) - noonUTC(SAMPLE_ANCHOR)) / DAY_MS);
}

/** Shift one ISO string by `days`, preserving its shape and time-of-day. */
export function shiftIso(value, days) {
  if (ISO_DATE.test(value)) {
    const d = new Date(noonUTC(value) + days * DAY_MS);
    return d.toISOString().slice(0, 10);
  }
  if (ISO_INSTANT.test(value)) {
    const t = Date.parse(value);
    if (!Number.isFinite(t)) return value;
    return new Date(t + days * DAY_MS).toISOString();
  }
  return value;
}

// Structural walk. Arrays and plain objects are rebuilt; everything else is
// returned as-is. The seeds are plain JSON, so there are no class instances,
// getters or cycles to preserve.
function walk(node, days) {
  if (typeof node === 'string') return shiftIso(node, days);
  if (Array.isArray(node)) return node.map((n) => walk(n, days));
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = walk(node[k], days);
    return out;
  }
  return node;
}

/**
 * rebaseSampleEvents(events, now?) -> events shifted so their authored leads hold.
 *
 * A delta of 0 (running exactly on the anchor day) returns the input untouched,
 * so the anchor day is a genuine no-op rather than a deep clone.
 */
export function rebaseSampleEvents(events, now = new Date()) {
  if (!Array.isArray(events)) return events;
  const days = rebaseDelta(now);
  if (!days) return events;
  return events.map((e) => walk(e, days));
}
