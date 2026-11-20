// The one reader for a stored clock time. No imports, so anything can use it.
// Two forms are stored: "16:00" (the time field) and "4:00 PM" (a plan made
// from a sentence). Copies that read only the digits sent "4:00 PM" out as
// "4:00 AM" (helper ask, found live 11/19/2026).

const pad = (n) => String(n).padStart(2, '0');

/** "8:14 PM" → 1214. Null on anything else — we never guess at a time we cannot read. */
export function parseClock(s) {
  const t = String(s || '').trim();
  let m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (m) {
    let h = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + Number(m[2]);
  }
  m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

/** "16:00" or "4:00 PM" → "4:00 PM"; '' when unreadable. The one reader every
 *  page uses: copies that took only the digits sent "4:00 PM" out as "4:00 AM". */
export function clock12(s) {
  const min = parseClock(s);
  return min == null ? '' : `${Math.floor(min / 60) % 12 || 12}:${pad(min % 60)} ${min >= 720 ? 'PM' : 'AM'}`;
}
