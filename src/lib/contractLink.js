// ─── THE LINK TO A VENDOR'S CONTRACT, AT THE MOMENT IT IS USED (H4, 11/12/2026) ──
//
// An uploaded contract lives in the private event-files bucket. uploadFile()
// hands back a signed URL that is valid for ONE HOUR, and the shell stored it
// as `contractUrl` and kept opening it — so an hour after the upload, "View"
// and "Analyze with AI" quietly stopped working while the card still said the
// file was on record.
//
// The durable fact is `contractStoragePath`. A stored file is re-signed every
// time it is opened; `contractUrl` is used only for a link the host PASTED
// (no storage path), which is theirs and does not expire on our clock.
import { getSignedUrl } from './storage';

/**
 * The URL to open for a vendor's contract, fetched now.
 * Returns { ok: true, url } or { ok: false, error }.
 * A stored file is always re-signed — its saved `contractUrl` is never used.
 */
export async function contractUrlFor(vendor) {
  if (!vendor) return { ok: false, error: 'No contract on file' };
  if (vendor.contractStoragePath) {
    try {
      const r = await getSignedUrl(vendor.contractStoragePath);
      if (r && r.ok && r.url) return { ok: true, url: r.url };
      return { ok: false, error: (r && r.error) || 'Could not sign the file link' };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Could not sign the file link' };
    }
  }
  if (vendor.contractUrl) return { ok: true, url: vendor.contractUrl };
  return { ok: false, error: 'No contract on file' };
}
