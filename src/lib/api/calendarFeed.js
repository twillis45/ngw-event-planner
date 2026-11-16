// The calendar subscription feed's address (owner, 11/16/2026). The host's
// calendar app reads it; see backend/app/routers/calendar_feed.py.
const BASE = process.env.REACT_APP_API_BASE_URL;

export const isCalendarFeedConfigured = () => Boolean(BASE);

/** https:// address (Google, Outlook: "subscribe from URL"). '' when off or unconfigured. */
export function calendarFeedUrl(code) {
  return BASE && code ? `${BASE.replace(/\/+$/, '')}/api/public/calendar/${encodeURIComponent(code)}.ics` : '';
}

/** webcal:// address — on an iPhone or Mac, tapping it opens Calendar's own Subscribe screen. */
export function calendarWebcalUrl(code) {
  return calendarFeedUrl(code).replace(/^https?:/, 'webcal:');
}

/** A long random code for the feed (24+ characters, URL-safe). */
export function newCalendarCode() {
  const bytes = new Uint8Array(18);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return 'cal-' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 30);
}
