// ─── KCR role → capability model (KCR-6) ──────────────────────────────────────
// Governed publishing needs finer authority than the platform's coarse auth role
// (Supabase app_metadata.role = admin/support today). This maps roles → KCR capabilities
// and is ready for finer roles (steward/editor/sme/publisher/governance) the moment
// app_metadata carries them. Pure — the UI gates action buttons on kcrCan(); the pipeline
// gates (advanceKCR/publishKCR) enforce regardless, so the UI can never weaken governance.
//
// Today's mapping (honest): admin acts as governance/publisher (can publish); support is
// a steward/editor (propose + review, but NOT governance review, NOT publish).

export const KCR_CAPS = {
  admin:      ['view', 'evidence', 'proposal', 'request-review', 'review:sme', 'review:editorial', 'review:governance', 'publish', 'reject'],
  support:    ['view', 'evidence', 'proposal', 'request-review', 'review:sme', 'review:editorial', 'reject'],
  // Finer roles (unlocked when app_metadata carries them):
  steward:    ['view', 'evidence', 'proposal', 'request-review', 'reject'],
  editor:     ['view', 'evidence', 'proposal', 'request-review', 'review:editorial', 'reject'],
  sme:        ['view', 'review:sme'],
  publisher:  ['view', 'review:governance', 'publish', 'reject'],
  governance: ['view', 'review:governance', 'publish', 'reject'],
};

// Unknown / absent role ⇒ read-only (view). Never a default write/publish capability.
export function kcrCaps(role) { return KCR_CAPS[role] || ['view']; }
export function kcrCan(role, cap) { return kcrCaps(role).includes(cap); }

// The publish capability is the load-bearing one — only governance/publisher (or admin)
// may promote a KCR to Production. A convenience for the UI's most-guarded action.
export function canPublish(role) { return kcrCan(role, 'publish'); }
