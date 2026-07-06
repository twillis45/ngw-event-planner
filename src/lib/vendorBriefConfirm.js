// ─── Vendor Brief confirmation (Phase 2A) — pure logic ────────────────────────
// The vendor-facing confirm block and the planner read-back row both lean on
// these helpers so the behavior is testable outside the giant App.js components.
//
// Slice 2A is CAPTURE + DISPLAY only: nothing here (or in its callers) writes
// vendor status, vendor.log, on-site fields, or attention-feed items. That is
// Slice 2B, deliberately not started.

export const CONFIRM_STATES = ['confirmed', 'issue_reported'];

// Build the public confirm POST body. Server re-clips everything; this only
// shapes and trims so an all-whitespace field is sent as undefined, not "".
export function buildConfirmationPayload(idempotencyKey, state, fields = {}) {
  const clean = (v) => {
    const s = (v == null ? '' : String(v)).trim();
    return s ? s : undefined;
  };
  return {
    idempotency_key: idempotencyKey,
    state: CONFIRM_STATES.includes(state) ? state : 'confirmed',
    on_site_name:  clean(fields.onSiteName),
    on_site_phone: clean(fields.onSitePhone),
    note:          clean(fields.note),
  };
}

// Latest confirmation row for one vendor from the planner read-back list.
// Rows arrive newest-first from the API, but don't rely on it — pick by the
// freshest timestamp (updated_at wins over submitted_at when present).
export function latestConfirmationFor(rows, vendorId) {
  const ts = (r) => Date.parse(r.updated_at || r.submitted_at || 0) || 0;
  return (Array.isArray(rows) ? rows : [])
    .filter(r => r && String(r.vendor_id) === String(vendorId))
    .sort((a, b) => ts(b) - ts(a))[0] || null;
}

// ── Slice 2B-1: host/planner actions on a confirmation row ────────────────────
// The vendor's click NEVER mutates event state by itself; these helpers decide
// which EXPLICIT host actions the read-back row may offer, and the exact log
// strings those actions write. All writes go through the cockpit's existing
// onPatchVendor / onAddLog paths — no new persistence.

const norm = (v) => (v == null ? '' : String(v)).trim();

// Which actions apply for this row + current vendor state. Recomputed on every
// render, so an applied action disappears once the vendor record reflects it —
// that's what makes the buttons naturally idempotent.
export function confirmationActionsFor(row, vendor) {
  const none = { markConfirmed: false, saveContact: false, saveContactLabel: null, addIssueToLog: false };
  if (!row || !vendor) return none;
  const actions = { ...none };

  if (row.state === 'confirmed') {
    // Mark confirmed — host asserts the vendor is locked in. Hidden once the
    // stage already says so; a brief click alone never changes the stage.
    actions.markConfirmed = vendor.status !== 'Confirmed';

    // Save on-site contact — only when the row carries contact info the
    // vendor record doesn't already have.
    const rowName = norm(row.on_site_name), rowPhone = norm(row.on_site_phone);
    if (rowName || rowPhone) {
      const matches = norm(vendor.onSiteContactName) === rowName && norm(vendor.onSitePhone) === rowPhone;
      if (!matches) {
        actions.saveContact = true;
        const hasExisting = norm(vendor.onSiteContactName) || norm(vendor.onSitePhone);
        actions.saveContactLabel = hasExisting ? 'Replace on-site contact' : 'Save on-site contact';
      }
    }
  }

  if (row.state === 'issue_reported') {
    // Paper trail only — no issue-management workflow. Useless without a note.
    actions.addIssueToLog = Boolean(norm(row.note));
  }

  return actions;
}

// Log strings — plain, host-readable, written via the existing onAddLog path
// (which stamps the date).
export function contactLogEntry(row) {
  const contact = [norm(row && row.on_site_name), norm(row && row.on_site_phone)].filter(Boolean).join(', ');
  return `Saved on-site contact from brief confirmation — ${contact}`;
}

export const MARK_CONFIRMED_LOG = 'Marked confirmed after brief confirmation';

export function issueLogEntry(row) {
  return `Vendor reported via brief link: ${norm(row && row.note)}`;
}

// One-line planner display for a confirmation row. Vendor-entered text is
// returned as plain data for the caller to render as TEXT ONLY (never HTML).
export function describeConfirmation(row) {
  if (!row) return null;
  const when = row.updated_at || row.submitted_at;
  const date = when ? new Date(when).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const contact = [row.on_site_name, row.on_site_phone].filter(Boolean).join(', ');
  if (row.state === 'issue_reported') {
    return {
      kind: 'issue',
      label: 'Vendor reported an issue',
      detail: [row.note, date].filter(Boolean).join(' — '),
    };
  }
  return {
    kind: 'confirmed',
    label: 'Vendor confirmed',
    detail: [contact, date].filter(Boolean).join(' — '),
  };
}
