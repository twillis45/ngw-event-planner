// ─── eventDocuments — vendor paperwork derivations (Sprint 1 "One app") ──────
//
// Extracted from the legacy EventDocumentsTab (App.js) as part of the V2
// document-area scoping slice. Only the HOST-REAL logic lives here: the
// per-vendor contract/paperwork status ladder and the needs-attention
// predicate, both pure derivations over fields the vendor cockpit already
// writes (contractUrl / contractFileName / contractStoragePath /
// contractSigned / docusignEnvelopeId / docusignStatus).
//
// Deliberately NOT here (scoping ruling, 2026-07-11):
//   · event.documents[] helpers — that store is planner-era demo seed data
//     with NO write path anywhere in the app (floor plans, mood boards,
//     final packets, "needs client review" = agency deliverable vocabulary).
//     It sunsets with legacy; building attach/categorize helpers over a dead
//     store would be fake capability (skill 06: no fake intelligence).
//   · COI expiry derivation — canonical in lib/vendorIntelligence.js
//     getVendorCOIState (expiry vs event date, lapse-before-event, verify
//     gate). Do not duplicate it here.
//   · Any parsing of document contents — nothing in the app reads a PDF and
//     nothing here may claim to.
//
// HARD RULES (test-locked): status comes only from host/vendor-entered flags,
// never from file contents; "Signed" requires the host's own contractSigned
// assertion, a file alone is never promoted to signed; no invented statuses.

const isSigned = (v) => v?.contractSigned === true || v?.contract_signed === true;
const hasFile = (v) => Boolean(v?.contractUrl || v?.contractFileName || v?.contractStoragePath);
const docusignInFlight = (v) => Boolean(v?.docusignEnvelopeId && v?.docusignStatus !== 'completed');

// A vendor shows up in document/paperwork lists when any document signal
// exists on the record — a file, a pasted link, or a DocuSign envelope.
export function vendorHasDocumentSignal(vendor) {
  return hasFile(vendor) || Boolean(vendor?.docusignEnvelopeId);
}

// All vendors on an event that carry any document signal, in vendor order.
export function vendorDocumentsFor(event) {
  const vendors = Array.isArray(event?.vendors) ? event.vendors : [];
  return vendors.filter(vendorHasDocumentSignal);
}

// Per-vendor paperwork status ladder. Returns { key, label, level, action }:
//   key    — stable machine key for tests/routing
//   label  — host-facing chip copy (verbatim from the legacy Documents tab)
//   level  — 'done' | 'attention' | 'todo' (UI maps to its own palette)
//   action — honest next-step verb, or null when there is nothing to do
// Ladder order matters and is test-locked: signed+file wins; a signed
// assertion without a file still asks for the file; an in-flight DocuSign
// envelope beats "needs signature"; a file with no signature asks for one.
export function vendorDocumentStatus(vendor) {
  const signed = isSigned(vendor);
  const file = hasFile(vendor);
  if (signed && file) {
    return { key: 'signed', label: 'Signed', level: 'done', action: vendor.contractUrl ? 'Open file' : null };
  }
  if (signed && !file) {
    return { key: 'needs_upload_signed', label: 'Needs upload', level: 'attention', action: 'Upload signed contract' };
  }
  if (docusignInFlight(vendor)) {
    return { key: 'pending_signature', label: 'Pending signature', level: 'attention', action: 'Open contract' };
  }
  if (file && !signed) {
    return { key: 'needs_signature', label: 'Needs signature', level: 'attention', action: 'Request signature' };
  }
  return { key: 'needs_upload', label: 'Needs upload', level: 'todo', action: 'Upload contract' };
}

// Needs-attention predicate for the "act on this now" grouping:
//   · file on hand but not signed
//   · signed but the file itself is missing
//   · DocuSign envelope still in flight
// Kept as the raw boolean (not derived from vendorDocumentStatus) to preserve
// legacy behavior exactly — a signed+filed vendor whose old DocuSign envelope
// never reached 'completed' still surfaces here, matching the legacy tab.
export function vendorDocumentNeedsAttention(vendor) {
  const signed = isSigned(vendor);
  const file = hasFile(vendor);
  return (file && !signed) || (signed && !file) || docusignInFlight(vendor);
}

// Vendors on an event whose paperwork needs attention right now.
export function vendorDocumentsNeedingAttention(event) {
  return vendorDocumentsFor(event).filter(vendorDocumentNeedsAttention);
}
