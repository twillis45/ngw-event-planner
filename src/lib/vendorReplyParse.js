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
//   'time'  — free text time ("2:00 PM"); stored/compared as trimmed string
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
  { key: 'final_guest_count',   field: 'guestCount',        label: 'Final guest count', type: 'int' },
  { key: 'staff_count',         field: 'staffCount',        label: 'Staff count',       type: 'int' },
  { key: 'passenger_count',     field: 'passengerCount',    label: 'Passenger count',   type: 'int' },
  { key: 'guard_count',         field: 'guardCount',        label: 'Guard count',       type: 'int' },
];

const BY_KEY = FIELDS.reduce((m, f) => { m[f.key] = f; return m; }, {});

// The exact key list the backend prompt must return. Exported so a test can
// assert prompt/consumer parity if the backend contract is ever snapshotted.
export const EXTRACT_KEYS = FIELDS.map(f => f.key);

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

// ── diff ──────────────────────────────────────────────────────────────────
// extracted: { [key]: { value, evidence } | value }  (the backend's `fields`)
// vendor:    the current vendor record
// → rows the planner reviews. Only fields whose extracted value is present AND
//   differs from what the record already holds. Each row defaults accepted:true.
export function buildReplyDiff(extracted, vendor) {
  if (!extracted || typeof extracted !== 'object') return [];
  const v = vendor || {};
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

    rows.push({
      key,
      field: spec.field,
      label: spec.label,
      type: spec.type,
      current: current === null ? null : v[spec.field],
      proposed,
      evidence: String(evidence || '').trim(),
      accepted: true,
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
