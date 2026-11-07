// The code from the sign-in email, as the host typed it. Supabase sends 6 digits
// by default and allows up to 10; spaces and dashes are ignored. null = not a code.
export function signInCode(raw) {
  const digits = String(raw == null ? '' : raw).replace(/[\s-]/g, '');
  return /^\d{6,10}$/.test(digits) ? digits : null;
}
