// ─── THE MOVE TO OUR OWN ADDRESS (owner ruling 11/19/2026, option A) ─────────
//
// The app moves from twillis45.github.io to events.noguessworksystems.com by
// GitHub's own redirect. A browser keeps a site's saved data per address, so a
// plan saved only on this device (never signed in) stays behind at the old
// address, where the app will not open again. Signed-in plans are in the
// account and move with it. So, while a move is set, a signed-out host with a
// device-only plan is told the day and the new address, and asked to sign in.
//
// Off until both build settings are set: REACT_APP_DOMAIN_MOVE_HOST (the new
// address) and REACT_APP_DOMAIN_MOVE_DATE (YYYY-MM-DD, the day of the switch).
// From the day after, nothing shows: the old address no longer serves the app.
// PURE.

const fmt = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The planned move, or null when none is set (or it is malformed). */
export function domainMove(env = process.env) {
  const host = String((env && env.REACT_APP_DOMAIN_MOVE_HOST) || '').trim().toLowerCase();
  const date = String((env && env.REACT_APP_DOMAIN_MOVE_DATE) || '').trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { host, date };
}

/** What the host is told, or '' when there is nothing true to say today. */
export function moveNotice(move, now = new Date()) {
  if (!move || ymd(now) > move.date) return '';
  const when = ymd(now) === move.date ? 'Today' : `On ${fmt(move.date)}`;
  return `${when} this app moves to ${move.host}. Plans saved only on this device don’t come along — sign in to keep this one in your account.`;
}
