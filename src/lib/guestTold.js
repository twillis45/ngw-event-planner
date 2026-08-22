// ─── WHO HAVE YOU ACTUALLY TOLD? ────────────────────────────────────────────
//
// The guest rails are `sms:` / `mailto:` / `tel:` links: the phone's own apps
// send, and this product never claims otherwise. That honesty had a cost the
// transport board named — the app watched a host open forty composers and
// remembered nothing, so "who still doesn't know?" was a question only the
// host's memory could answer, on the one list where forgetting someone is the
// failure that actually ruins an event.
//
// This is the same model the send ledger already runs, at per-recipient grain:
// a HOST-ATTESTED record. The host says they told someone; the app writes that
// down and never upgrades it into a claim of its own. `attested: true` is the
// whole point — nothing here is verified, and nothing here may ever be
// rendered as though it were.
//
// WHY IT IS NOT THE SEND LEDGER. `sendLedger` is keyed by DRAFT TITLE — one
// entry per message. This is keyed by person, and a host tells the same person
// about several things over an event's life. Same semantics, different grain;
// merging them would make one of the two lie about the other.

/** A told record is `{ at, channel, attested: true }`, keyed by guest id. */
export function guestToldMap(event) {
  const m = event && event.guestTold;
  return (m && typeof m === 'object') ? m : {};
}

/**
 * recordTold(map, guestId, channel, nowIso) -> next map
 *
 * Idempotent by design: telling someone twice is a real thing hosts do, and
 * the record that matters is the FIRST time — that is the one that answers
 * "have they had a chance to reply?". A later tap refreshes the channel
 * without moving the clock backwards or forwards.
 */
export function recordTold(map, guestId, channel, nowIso) {
  const id = String(guestId || '').trim();
  if (!id) return map || {};
  const cur = (map && typeof map === 'object') ? map : {};
  const prev = cur[id];
  return {
    ...cur,
    [id]: {
      at: (prev && prev.at) || nowIso || new Date().toISOString(),
      channel: channel || (prev && prev.channel) || 'message',
      attested: true,          // the host's word. Never a delivery claim.
    },
  };
}

/** Undo. A mis-tap must be reversible or hosts stop tapping honestly. */
export function clearTold(map, guestId) {
  const id = String(guestId || '').trim();
  const cur = (map && typeof map === 'object') ? map : {};
  if (!id || !(id in cur)) return cur;
  const next = { ...cur };
  delete next[id];
  return next;
}

export const isTold = (map, guestId) => !!(map && map[String(guestId || '').trim()]);

/**
 * toldRollup(event) -> { told, total, left, line }
 *
 * Counts against the guests who can actually BE told — someone with no phone
 * and no email is not "still to tell", they are unreachable, and counting them
 * in a number the host is meant to drive to zero makes the number a nag rather
 * than a fact.
 */
export function toldRollup(event) {
  const guests = Array.isArray(event && event.guests) ? event.guests : [];
  const map = guestToldMap(event);
  const reachable = guests.filter((g) => g && (String(g.phone || '').trim() || String(g.email || '').trim()));
  const total = reachable.length;
  const told = reachable.filter((g) => isTold(map, g.id)).length;
  const left = Math.max(0, total - told);
  return { told, total, left, line: toldLine(told, total, left) };
}

/** The host-facing sentence. Exact copy from the transport ruling, clause 3. */
export function toldLine(told, total, left) {
  if (!total) return '';                       // nobody reachable: say nothing
  if (!told) return 'Nobody marked told yet — the app remembers as you go';
  if (!left) return `Told all ${total}`;
  return `Told ${told} of ${total} — ${left} still to tell`;
}
