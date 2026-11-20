// The admin console's name (owner, 11/19/2026: "Let's give it an admin name").
// Shown only at ?admin=1: the sign-in header and the browser tab.
export const ADMIN_NAME = 'No Guesswork Events · Admin';
export const ADMIN_TITLE = 'Admin · No Guesswork Events';

export function isAdminPage() {
  try { return new URLSearchParams(window.location.search).get('admin') === '1'; } catch { return false; }
}
