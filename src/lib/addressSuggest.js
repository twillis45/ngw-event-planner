// ─── Address suggestions stay in the host's state ────────────────────────────
// The geocoder ranks by its own idea of prominence, so "Pasadena" returns
// California first for a host planning in Maryland (issue #100 follow-up,
// 11/5/2026). The event usually already knows its state; when it does, those
// suggestions lead. Order only — a host may be planning somewhere else, so
// nothing is ever filtered out.
import { venueFor } from './venueFor';

/** Two-letter state the event already holds, or '' when it holds none.
 *  Read through venueFor, the one venue reader (venueSourceProof). */
export function knownStateCode(ev) {
  if (!ev) return '';
  const st = String(venueFor(ev).state || '').trim();
  return /^[A-Za-z]{2}$/.test(st) ? st.toUpperCase() : '';
}

/** Stable: suggestions in `stateCode` first, everything else in provider order. */
export function preferState(sugs, stateCode) {
  const st = String(stateCode || '').toUpperCase();
  if (!st || !Array.isArray(sugs)) return sugs;
  return [...sugs.filter((s) => s && s.stateCode === st), ...sugs.filter((s) => !s || s.stateCode !== st)];
}
