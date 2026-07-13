// ─── contactFormat — one place for phone + email formatting/validation ────────
//
// The app collected phones and emails in a dozen inputs with no consistent
// format or validation: a host could type "1234567890", "123.456.7890", or
// "(123) 456-7890" and each stored differently, so the same number read three
// ways across the vendor card, the day-of contact line, and the brief.
//
// This module is the single source: format a phone AS the host types (US 10- or
// 11-digit) so the field and every later reference show one shape —
// "(123) 456-7890" — and validate emails with one honest predicate. Non-US /
// unparseable input degrades gracefully to the raw digits rather than mangling.

// Digits only — the canonical stored/compared form.
export function normalizePhone(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

// Format for display AND storage: "(123) 456-7890", or "1 (123) 456-7890" for a
// leading US country code. Partial input formats progressively as you type
// ("123" → "123", "1234" → "(123) 4"). More than 10 significant digits keeps the
// extra on the line rather than dropping it (honest, if unusual). Empty → "".
export function formatPhoneUS(v) {
  let d = normalizePhone(v);
  if (!d) return '';
  let cc = '';
  if (d.length === 11 && d[0] === '1') { cc = '1 '; d = d.slice(1); }
  else if (d.length > 11 && d[0] === '1') { cc = '1 '; d = d.slice(1); }
  if (d.length <= 3) return cc + d;
  if (d.length <= 6) return `${cc}(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `${cc}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return `${cc}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)} ${d.slice(10)}`.trim();
}

// A phone is "complete enough" at 10 digits (US) or 11 with a leading 1. Blank is
// valid (optional field) — callers decide whether a field is required.
export function isValidPhone(v) {
  const d = normalizePhone(v);
  if (d.length === 0) return true;
  return d.length === 10 || (d.length === 11 && d[0] === '1');
}

// A phone that has SOME digits but isn't a complete US number — used to show an
// inline hint without nagging an empty field.
export function isIncompletePhone(v) {
  const d = normalizePhone(v);
  return d.length > 0 && !isValidPhone(v);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Blank is valid (optional); a non-empty value must look like an email.
export function isValidEmail(v) {
  const s = String(v == null ? '' : v).trim();
  return s === '' || EMAIL_RE.test(s);
}

// Non-empty AND malformed — for the inline "that doesn't look like an email" hint.
export function isMalformedEmail(v) {
  const s = String(v == null ? '' : v).trim();
  return s !== '' && !EMAIL_RE.test(s);
}

export default { normalizePhone, formatPhoneUS, isValidPhone, isIncompletePhone, isValidEmail, isMalformedEmail };
