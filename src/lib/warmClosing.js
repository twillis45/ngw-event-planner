// ─── THE "WARMER" TONE'S CLOSING LINE, BY WHO THE NOTE IS FOR (11/16/2026) ───
// Tones are deterministic rewrites of the same facts (HostShellV2 toneBody);
// "Warmer" adds one closing line. That line used to be the same for everyone,
// so a caterer still quoting read "So glad you’ll be part of it." PURE.
import { SHOPPING_STATUSES } from './workstreams';

/** @param {{ title?: string, vendor?: { status?: string } | null }} ctx */
export function warmClosing({ title, vendor } = {}) {
  if (/payment/i.test(String(title || ''))) return 'Thank you again for everything you’re doing for us.';
  if (vendor) {
    const s = String(vendor.status || '');
    if (!s || SHOPPING_STATUSES.has(s)) return 'Thank you for your time — I’d love to work with you on this.';
    return 'So glad to be working with you on this.';
  }
  return 'So glad you’ll be part of it.';
}
