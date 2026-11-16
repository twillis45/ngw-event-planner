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

// A bare thanks line ("Thanks so much!", "Thank you!") — the sign-off the
// Warmer closing stands in for.
const BARE_THANKS = /^(many\s+)?thanks?(\s+you)?(\s+(so|very)\s+much|\s+again|\s+a\s+lot)?\s*[!.]?$/i;

/**
 * The Warmer tone (11/16/2026): the closing that fits the reader, in place of a
 * bare "Thanks so much!" when the note ends with one — never two thank-yous in
 * a row. A signature after it stays where it is. Otherwise it is added at the
 * end. Applying it twice changes nothing.
 */
export function warmerBody(body, ctx = {}) {
  const b = String(body == null ? '' : body);
  const warm = warmClosing(ctx);
  if (b.includes(warm)) return b;
  const paras = b.split('\n\n');
  for (let i = paras.length - 1; i >= Math.max(0, paras.length - 2); i -= 1) {
    if (BARE_THANKS.test(paras[i].trim())) {
      paras[i] = warm;
      return paras.join('\n\n');
    }
  }
  return b + '\n\n' + warm;
}
