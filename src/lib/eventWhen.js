// ─── eventWhen — the ONE reader for "when does this event start?" ────────────
//
// The run-of-show engine already answered this: a precise `event.startTime`
// ("18:30", "6:30 PM") wins, and a coarse `event.timeOfDay` bucket
// (morning/afternoon/evening → 10:00 / 15:00 / 18:00) is the fallback. That logic
// lived inside playbooks/index.js as a private function.
//
// The INVITE needs the same answer — and it could not have it. Importing playbooks
// would drag all 40 playbooks into the guest's download (the 418 KB we just removed
// from the invite chunk), and re-deriving the parse locally would be a second
// vocabulary for one concept, which is the exact bug class this codebase spent
// 2026-07-14 closing.
//
// So the reader moves here: ZERO imports, so anything can use it — the invite pays
// nothing, and there is still exactly one definition. playbooks imports it too.
//
// WHY THIS EXISTS AT ALL: the invite formatted `{ weekday, month, day }` and had no
// hour component, for ANY event. The app showed the time to the HOST ("Saturday,
// July 11 · Afternoon"), used it to anchor the entire run of show — and withheld it
// from the GUEST, the one person whose whole job is to arrive at the right time.

// Coarse buckets → the hour the run-of-show anchors to. Kept identical to
// ROS_ANCHOR_HOUR in playbooks/index.js (which now imports this).
export const ANCHOR_HOUR = { morning: 10, afternoon: 15, evening: 18, night: 19, late: 20 };

/** "18:30" | "6:30 PM" | "7:00pm" → minutes from midnight. null when unparseable. */
export function parseStartMinutes(s) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(String(s || ''));
  if (!m) return null;
  let h = Number(m[1]);
  const mm = Number(m[2]);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/**
 * The event's start, in minutes from midnight — precise time first, bucket second.
 * null when the host has told us NOTHING about when the day starts.
 */
export function eventStartMinutes(event) {
  const exact = parseStartMinutes(event && event.startTime);
  if (exact != null) return exact;
  const tod = String((event && event.timeOfDay) || '').trim().toLowerCase();
  const hour = ANCHOR_HOUR[tod];
  return hour != null ? hour * 60 : null;
}

/**
 * What a GUEST should be told about when to arrive.
 *
 *   { kind: 'exact',  label: '7:30 PM' }   — the host set a real time
 *   { kind: 'bucket', label: 'Afternoon' } — only a coarse bucket; say the bucket,
 *                                            never invent a clock time from it
 *   null                                   — we genuinely don't know. Say nothing
 *                                            rather than guess (honesty doctrine:
 *                                            missing data is never fabricated).
 */
export function eventStartLabel(event) {
  const exact = parseStartMinutes(event && event.startTime);
  if (exact != null) {
    const h24 = Math.floor(exact / 60);
    const mm = exact % 60;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { kind: 'exact', label: `${h12}:${String(mm).padStart(2, '0')} ${ap}` };
  }
  const tod = String((event && event.timeOfDay) || '').trim();
  if (tod && ANCHOR_HOUR[tod.toLowerCase()] != null) {
    // The BUCKET is what the host actually told us. Rendering "3:00 PM" from
    // 'afternoon' would be inventing a precision they never gave.
    return { kind: 'bucket', label: tod.charAt(0).toUpperCase() + tod.slice(1).toLowerCase() };
  }
  return null;
}
