// demo/src/lib/payLinks.js
// Sprint 56d · Pay-link helpers
//
// Extracted from App.js (formerly lines ~1632 + ~1660) so the Vendor cockpit's
// deep CTAs can import them without circular dependencies. App.js continues to
// re-export the same names for backward compatibility with the legacy
// VendorModal payment row.

export const PAY_METHODS = [
  'Cash',
  'Check',
  'Credit Card',
  'Debit Card',
  'Zelle',
  'Venmo',
  'PayPal',
  'Cash App',
  'Wire',
  'Other',
];

// Methods that can produce a clickable deep link via buildPayLink (the rest
// are offline/manual rails — display info instead).
export const DIGITAL_PAY_METHODS = ['Venmo', 'PayPal', 'Cash App', 'Zelle'];

// Methods that are manual/offline (show instructions instead of a link).
export const OFFLINE_PAY_METHODS = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Wire', 'Other'];

// Build a deep-link URL for digital payment methods so planners can tap and pay.
// Returns null when no link can be constructed (cash, check, wire, etc.) OR
// when the vendor doesn't have the right handle on file for that method.
export function buildPayLink(method, vendor, amount) {
  const amt   = (amount || 0).toFixed(2);
  const note  = encodeURIComponent(vendor.name || 'Event balance');
  const pNote = vendor.paymentNote || '';

  if (method === 'Venmo') {
    const handle = (vendor.venmo || '').replace(/^@/, '')
      || (pNote.match(/venmo[:\s]+@?([A-Za-z0-9_.-]+)/i) || [])[1];
    if (handle) return `https://venmo.com/${handle}?txn=pay&amount=${amt}&note=${note}`;
  }
  if (method === 'PayPal') {
    const raw = (pNote.match(/paypal(?:\.me)?[:\s/]+([^\s,]+)/i) || [])[1];
    if (raw) {
      const slug = raw.replace(/^\//, '');
      return slug.includes('@')
        ? `https://www.paypal.com/paypalme/${encodeURIComponent(slug)}`
        : `https://paypal.me/${slug}/${amt}`;
    }
  }
  if (method === 'Cash App') {
    const handle = (pNote.match(/\$([A-Za-z0-9_-]+)/) || [])[1];
    if (handle) return `https://cash.app/$${handle}/${amt}`;
  }
  if (method === 'Zelle') {
    // No universal deep-link for Zelle — return info string so caller knows
    // it's a manual destination (email/phone) the user copies into their bank.
    const info = (pNote.match(/zelle[:\s]+([^\s,]+)/i) || [])[1];
    return info ? `zelle:${info}` : null;
  }
  return null;
}

// Pick the most reasonable default method for a payment prompt:
// 1) the vendor's previously-used balanceMethod (they already paid this way)
// 2) their depositMethod (they at least know how to receive money this way)
// 3) Venmo if the vendor has a handle
// 4) the first method in the list as a generic fallback
export function getSuggestedPayMethod(vendor) {
  if (vendor?.balanceMethod && PAY_METHODS.includes(vendor.balanceMethod)) return vendor.balanceMethod;
  if (vendor?.depositMethod && PAY_METHODS.includes(vendor.depositMethod)) return vendor.depositMethod;
  if (vendor?.venmo) return 'Venmo';
  return 'Check';
}

// Plain-English instruction copy for offline / manual methods.
export function getOfflinePayInstruction(method, vendor) {
  switch (method) {
    case 'Check':
      return `Make the check out to ${vendor.name || 'the vendor'}. Mail or hand-deliver per the vendor's payment terms${vendor.paymentNote ? ` (see note: "${vendor.paymentNote}")` : ''}.`;
    case 'Wire':
      return vendor.paymentNote
        ? `Use the wire instructions on file: ${vendor.paymentNote}`
        : `Wire instructions aren't on file yet — message the vendor for routing + account info.`;
    case 'Zelle': {
      const dest = vendor.contact || vendor.phone;
      return dest
        ? `Send Zelle to ${dest} from your bank app${vendor.paymentNote ? ` (note: "${vendor.paymentNote}")` : ''}.`
        : `Zelle destination isn't on file — message the vendor for their Zelle email or phone.`;
    }
    case 'Cash':
      return `Hand-deliver in person. Get a written receipt at the same time.`;
    case 'Credit Card':
    case 'Debit Card':
      return `Use the vendor's card-on-file or payment portal${vendor.paymentNote ? ` (${vendor.paymentNote})` : ''}.`;
    default:
      return vendor.paymentNote || `Use the payment terms the vendor provided.`;
  }
}
