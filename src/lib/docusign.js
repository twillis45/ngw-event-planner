/**
 * DocuSign integration client — Sprint 64
 *
 * All calls go through the FastAPI backend — DocuSign credentials never
 * touch the browser. The planner's DocuSign access token is stored in
 * their profile (localStorage/Supabase) and sent per-request.
 *
 * Envelope status values from DocuSign:
 *   created   — draft, not yet sent
 *   sent      — sent to first signer (vendor)
 *   delivered — vendor opened the email
 *   completed — all parties signed ✅
 *   declined  — a signer declined
 *   voided    — cancelled by sender
 */

const BASE = process.env.REACT_APP_API_BASE_URL;

export const isDocuSignApiConfigured = () => Boolean(BASE);

/** Check if DocuSign is configured on the backend */
export async function checkDocuSignStatus() {
  if (!BASE) return { configured: false };
  try {
    const res = await fetch(`${BASE}/api/docusign/status`);
    if (!res.ok) return { configured: false };
    return res.json();
  } catch {
    return { configured: false };
  }
}

/** Redirect planner to DocuSign OAuth consent page */
export function startDocuSignOAuth() {
  if (!BASE) return;
  window.location.href = `${BASE}/api/docusign/connect`;
}

/**
 * Parse DocuSign tokens from URL params after OAuth callback redirect.
 * Returns null if not present.
 */
export function parseDocuSignCallback() {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('docusign_connected')) return null;
  return {
    accessToken:  params.get('docusign_access_token'),
    refreshToken: params.get('docusign_refresh_token'),
    expiresIn:    parseInt(params.get('docusign_expires_in') || '3600', 10),
    accountName:  params.get('docusign_account_name'),
    connectedAt:  Date.now(),
  };
}

/**
 * Send a contract for signature via DocuSign.
 * Both vendor and planner sign — vendor first (order 1), planner second (order 2).
 *
 * Returns { ok, envelopeId, status } or { ok: false, error }
 */
export async function sendForSignature({
  accessToken,
  contractUrl,
  documentName,
  documentExtension = 'pdf',
  vendorName,
  vendorEmail,
  plannerName,
  plannerEmail,
  eventName,
  eventId,
  vendorId,
}) {
  if (!BASE) return { ok: false, error: 'Backend not configured' };
  if (!accessToken) return { ok: false, error: 'DocuSign not connected — connect in Studio Settings' };
  if (!vendorEmail) return { ok: false, error: 'Vendor email required for DocuSign' };
  if (!plannerEmail) return { ok: false, error: 'Planner email required — add in Studio Setup' };
  if (!contractUrl) return { ok: false, error: 'No contract file attached — upload a contract first' };

  try {
    const res = await fetch(`${BASE}/api/docusign/send-envelope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        contract_url: contractUrl,
        document_name: documentName || `${vendorName} Contract`,
        document_extension: documentExtension,
        vendor_name: vendorName,
        vendor_email: vendorEmail,
        planner_name: plannerName,
        planner_email: plannerEmail,
        event_name: eventName,
        event_id: eventId,
        vendor_id: vendorId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      return { ok: false, error: err.detail || 'DocuSign API error' };
    }
    return { ok: true, ...(await res.json()) };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

/**
 * Poll envelope status.
 * Returns { ok, status, completedDateTime, signedDocumentUrl } or { ok: false, error }
 */
export async function getEnvelopeStatus(envelopeId, accessToken) {
  if (!BASE || !envelopeId || !accessToken) return { ok: false, error: 'Missing params' };
  try {
    const res = await fetch(
      `${BASE}/api/docusign/envelope/${envelopeId}?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return { ok: false, error: 'Could not fetch envelope status' };
    return { ok: true, ...(await res.json()) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Human-readable envelope status label */
export function envelopeStatusLabel(status) {
  const map = {
    created:   'Draft',
    sent:      'Sent to vendor',
    delivered: 'Opened by vendor',
    completed: 'Fully signed ✓',
    declined:  'Declined',
    voided:    'Voided',
  };
  return map[status] || status || 'Unknown';
}

export function envelopeStatusColor(status, C) {
  if (status === 'completed') return C.success;
  if (status === 'declined' || status === 'voided') return C.danger;
  if (status === 'sent' || status === 'delivered') return C.warn;
  return C.muted;
}
