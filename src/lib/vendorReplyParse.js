// Vendor-reply parser — pure core (Agent Opportunity Audit, P0 flagship).
//
// A vendor replies "we'll arrive at 2pm, deposit received, final count 85" and
// today a human reads that and hand-types every field. This module owns the
// deterministic half of the "inbound vendor-reply parser": given the fields an
// LLM extracted from that reply, it decides which of them actually CHANGE the
// vendor record, coerces each to the shape the record stores, and builds the
// patch the planner applies through the cockpit's existing onPatchVendor path.
//
// Doctrine (06_AI_GROUNDING): this is "Apply reviewed extraction" — sanctioned.
// The extraction only ever PROPOSES; nothing here writes. buildReplyDiff returns
// rows for the planner to review, apply, or drop. An empty/unstated field is
// never a change, and a boolean is never DOWNGRADED off a reply (a reply that
// doesn't mention the deposit must not un-mark a paid deposit).
//
// The FIELDS list is the single source of truth shared with the backend prompt
// (backend/app/routers/ai.py :: parse-vendor-reply). The extracted `key`s here
// MUST match the JSON keys the prompt asks the model to return. Target `field`s
// are the real vendor-record fields inferPromisesFromVendor already reads, so an
// applied reply lights up the same accountability tiers a manual edit would —
// and the day-of contact writes onSiteContactName/onSitePhone, the exact fields
// VendorConfirmationNote writes, so there is one contact path, not two.

// type: how the stored value is shaped and compared.
//   'time'  — 24-hour "HH:MM" string. Raw model text ("2:00 PM", "2pm",
//             "14:00", "2.30pm") is normalized by normalizeTime; anything it
//             can't normalize is DROPPED, never proposed as free text. This is
//             the app-wide contract: ArrivalTimeFlow validates /^\d{2}:\d{2}$/,
//             hostv2 uses <input type="time">, and the ICS export does
//             split(':') math on these fields. (2026-07-14 parser audit F2 —
//             previously stored as free text.)
//   'text'  — free text; trimmed string
//   'money' — number of dollars; "$2,400" → 2400
//   'int'   — whole count; "85 guests" → 85
//   'bool'  — a yes/received/paid flag; only ever proposed as `true`
export const FIELDS = [
  { key: 'arrival_time',        field: 'arrivalTime',       label: 'Arrival time',      type: 'time' },
  { key: 'coverage_start',      field: 'coverageStart',     label: 'Coverage start',    type: 'time' },
  { key: 'coverage_end',        field: 'coverageEnd',       label: 'Coverage end',      type: 'time' },
  { key: 'delivery_time',       field: 'deliveryTime',      label: 'Delivery time',     type: 'time' },
  { key: 'setup_start',         field: 'setupStart',        label: 'Setup start',       type: 'time' },
  { key: 'setup_end',           field: 'setupEnd',          label: 'Setup end',         type: 'time' },
  { key: 'day_of_contact_name', field: 'onSiteContactName', label: 'Day-of contact',    type: 'text' },
  { key: 'day_of_phone',        field: 'onSitePhone',       label: 'Day-of phone',      type: 'text' },
  { key: 'email',               field: 'email',             label: 'Email',             type: 'text' },
  { key: 'cost',                field: 'cost',              label: 'Total cost',        type: 'money' },
  { key: 'deposit_amount',      field: 'depositAmt',        label: 'Deposit amount',    type: 'money' },
  { key: 'deposit_paid',        field: 'depositPaid',       label: 'Deposit received',  type: 'bool' },
  { key: 'balance_paid',        field: 'balancePaid',       label: 'Balance paid',      type: 'bool' },
  // 2026-07-14 parser audit F5: the #1 real inbound reply is "yes, we're all
  // set for Saturday" — a reconfirmation. TRUE-ONLY like deposit_paid (never
  // written false); targets reconfirmed72, the exact field the T-72h
  // vendor-reconfirm raiser (surfaceRegistry.js) and the shell banner read.
  { key: 'reconfirmed',         field: 'reconfirmed72',     label: 'Confirmed for the day', type: 'bool' },
  { key: 'final_guest_count',   field: 'guestCount',        label: 'Final guest count', type: 'int' },
  { key: 'staff_count',         field: 'staffCount',        label: 'Staff count',       type: 'int' },
  { key: 'passenger_count',     field: 'passengerCount',    label: 'Passenger count',   type: 'int' },
  { key: 'guard_count',         field: 'guardCount',        label: 'Guard count',       type: 'int' },
];

const BY_KEY = FIELDS.reduce((m, f) => { m[f.key] = f; return m; }, {});

// The exact key list the backend prompt must return. Cross-language parity is
// PINNED by a test: src/lib/__tests__/vendorReplyParse.test.js reads
// backend/app/routers/ai.py (VENDOR_REPLY_FIELDS) and asserts identical key
// sets. If you add/rename a key here, change both files or that test fails.
export const EXTRACT_KEYS = FIELDS.map(f => f.key);

// ── time normalization ──────────────────────────────────────────────────────
// 2026-07-14 parser audit F2. The app's time contract is 24-hour "HH:MM"
// (ArrivalTimeFlow's /^\d{2}:\d{2}$/, hostv2 <input type="time">, ICS
// split(':') math). normalizeTime turns the common ways a vendor writes a
// time into that shape, and returns null for anything it can't normalize —
// a value we can't normalize is a value we don't propose.
//
// Accepted forms → "HH:MM":
//   "2:00 PM" / "2 pm" / "2p.m." / "2.30pm"  (12h with meridiem; ":" or ".")
//   "14:00" / "14.30" / "9:05"               (no meridiem → read as 24h)
//   "1400" / "0930" / "1400 hours"           (4-digit military)
//   "noon" → "12:00", "midnight" → "00:00"
// Rejected (→ null): bare hour with no meridiem ("2" — ambiguous), out-of-range
// values ("25:00", "2:75"), and anything non-time ("TBD", "afternoon").
export function normalizeTime(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().toLowerCase();
  if (s === '') return null;
  if (s === 'noon' || s === '12 noon') return '12:00';
  if (s === 'midnight') return '00:00';
  s = s.replace(/\s*(hours|hrs)$/, ''); // "1400 hours" → "1400"

  const pad = (n) => String(n).padStart(2, '0');

  // 4-digit military with no separator: "1400", "0930".
  let m = /^([01]\d|2[0-3])([0-5]\d)$/.exec(s);
  if (m) return `${m[1]}:${m[2]}`;

  // hour [sep minutes] [meridiem] — sep is ":" or "." ("2.30pm").
  m = /^(\d{1,2})(?:[:.]([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? null : Number(m[2]);
  const mer = m[3] ? (m[3][0] === 'p' ? 'pm' : 'am') : null;

  if (mer) {
    if (h < 1 || h > 12) return null;
    if (mer === 'am' && h === 12) h = 0;
    if (mer === 'pm' && h < 12) h += 12;
    return `${pad(h)}:${pad(min === null ? 0 : min)}`;
  }
  // No meridiem: minutes are required (a bare "2" is ambiguous) and the
  // hour reads as 24h ("14:00", "9:05" → "09:05").
  if (min === null) return null;
  if (h > 23) return null;
  return `${pad(h)}:${pad(min)}`;
}

// ── coercion ────────────────────────────────────────────────────────────────
// Returns the value in stored shape, or null when the raw value carries no
// usable signal for that type. null means "no change proposed".
export function coerceValue(type, raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;

  switch (type) {
    case 'money':
    case 'int': {
      // "$2,400.00" / "85 guests" / 85 → number. Reject if no digits.
      const s = String(raw).replace(/[^0-9.]/g, '');
      if (s === '' || s === '.') return null;
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return type === 'int' ? Math.round(n) : n;
    }
    case 'bool': {
      // The model returns true only when the reply asserts the flag; treat any
      // affirmative token as true and everything else as "not asserted" (null),
      // never false — see buildReplyDiff for why bool is never a downgrade.
      if (raw === true) return true;
      if (raw === false || raw === 0) return null;
      const s = String(raw).trim().toLowerCase();
      if (['true', 'yes', 'paid', 'received', 'y', '1'].includes(s)) return true;
      return null;
    }
    case 'time':
      // 2026-07-14 parser audit F2: 24h "HH:MM" or nothing (was free text).
      return normalizeTime(raw);
    case 'text':
    default:
      return String(raw).trim();
  }
}

// Normalize a stored/compared value so "2400" and 2400, or "" and null/undefined,
// compare equal and don't surface a no-op "change".
function norm(type, v) {
  const c = coerceValue(type, v);
  return c === null ? null : c;
}

// Whitespace-only normalization for the evidence check: the model may re-wrap
// lines or collapse spaces, but the words must be verbatim. Nothing looser —
// a "fuzzy" match would let the model bless quotes it invented.
function squashWs(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// ── diff ──────────────────────────────────────────────────────────────────
// extracted: { [key]: { value, evidence } | value }  (the backend's `fields`)
// vendor:    the current vendor record
// replyText: the pasted reply the extraction came from (2026-07-14 parser
//            audit F3). Each row gains `evidenceVerified` — true only when the
//            row's evidence is a verbatim substring of the reply (whitespace
//            normalized, nothing else). Rows with missing or unverified
//            evidence are still proposed but default accepted:false (opt-IN),
//            so an unsupported claim never rides an "Apply all" click.
// → rows the planner reviews. Only fields whose extracted value is present AND
//   differs from what the record already holds. Verified rows default
//   accepted:true; unverified rows default accepted:false.
export function buildReplyDiff(extracted, vendor, replyText = '') {
  if (!extracted || typeof extracted !== 'object') return [];
  const v = vendor || {};
  const haystack = squashWs(replyText);
  const rows = [];

  for (const key of Object.keys(extracted)) {
    const spec = BY_KEY[key];
    if (!spec) continue; // ignore anything outside the shared schema

    const entry = extracted[key];
    const rawValue = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
    const evidence = entry && typeof entry === 'object' ? (entry.evidence || '') : '';

    const proposed = coerceValue(spec.type, rawValue);
    if (proposed === null) continue; // unstated / unusable → no change

    const current = norm(spec.type, v[spec.field]);

    if (spec.type === 'bool') {
      // Only propose SETTING the flag true. Never downgrade: if it's already
      // true, or the reply only says "not paid", there is nothing to apply.
      if (current === true || proposed !== true) continue;
    } else if (current !== null && String(current) === String(proposed)) {
      continue; // already holds this value
    }

    const evidenceText = String(evidence || '').trim();
    // Verbatim-substring check, whitespace normalized only (audit F3). An
    // empty haystack (caller didn't pass the reply) verifies nothing — the
    // safe failure mode is opt-in, not a rubber stamp.
    const evidenceVerified =
      evidenceText !== '' && haystack !== '' && haystack.includes(squashWs(evidenceText));

    rows.push({
      key,
      field: spec.field,
      label: spec.label,
      type: spec.type,
      current: current === null ? null : v[spec.field],
      proposed,
      evidence: evidenceText,
      evidenceVerified,
      accepted: evidenceVerified,
    });
  }

  return rows;
}

// ── patch ─────────────────────────────────────────────────────────────────
// The record patch for the rows the planner kept checked. Pass the reviewed
// rows (each carrying `accepted`); only accepted rows land in the patch.
export function buildPatch(rows) {
  const patch = {};
  (rows || []).forEach(r => { if (r && r.accepted) patch[r.field] = r.proposed; });
  return patch;
}

// A one-line vendor-log entry recording what the reply applied and that it came
// from an AI extraction the planner reviewed (never "auto"). Honest provenance.
export function replyLogEntry(rows) {
  const kept = (rows || []).filter(r => r && r.accepted);
  if (kept.length === 0) return null;
  const parts = kept.map(r => `${r.label}: ${formatForLog(r.type, r.proposed)}`);
  return `Applied ${kept.length} field${kept.length === 1 ? '' : 's'} from a vendor reply (AI-extracted, reviewed) — ${parts.join(', ')}.`;
}

function formatForLog(type, v) {
  if (type === 'bool') return 'yes';
  if (type === 'money') return `$${v}`;
  return String(v);
}
