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

// ─── WHAT THE TIME SHE TYPED MEANS (six root causes, cause 5) ────────────────
// Thanksgiving walkthrough P1-4 (11/23/2026): she typed "3pm"; the decisions
// sheet said dinner hits the table at 3 PM while the day's schedule had
// arrivals at 3 and dinner at 4. The typed time had no defined meaning.
//
// OWNER RULING 11/23/2026: for meal-centered events the time she types is when
// dinner hits the table; arrivals come before it, by the playbook's own stated
// lead. Every playbook DECLARES its meaning (`timeAnchor`, lib/eventAnchor),
// and creation stamps it on the event, once:
//   event.startTimeMeans  'serve' | 'arrival'   (absent → 'arrival', the
//                         meaning every event had before this ruling)
//   event.arrivalLeadMin  minutes from arrival to the meal (serve events)
// The stamp lives on the event so this file stays import-free (the guest's
// invite reads it). Everything that schedules — the run of show, the invite,
// the decisions copy, the calendar — reads eventClock.
export const TIME_MEANS = Object.freeze({ SERVE: 'serve', ARRIVAL: 'arrival' });

/**
 * eventClock(event) → { means, leadMin, typedMin, arrivalMin, serveMin }
 * typedMin is the time she gave (null when none); arrivalMin is the run of
 * show's anchor (when guests arrive); serveMin is when the meal is served when
 * the event says so (null otherwise). Precise times only.
 */
export function eventClock(event) {
  const means = event && event.startTimeMeans === TIME_MEANS.SERVE ? TIME_MEANS.SERVE : TIME_MEANS.ARRIVAL;
  const lead = Number(event && event.arrivalLeadMin);
  const leadMin = means === TIME_MEANS.SERVE && Number.isFinite(lead) && lead > 0 ? Math.round(lead) : 0;
  const typedMin = parseStartMinutes(event && event.startTime);
  if (typedMin == null) return { means, leadMin, typedMin: null, arrivalMin: null, serveMin: null };
  if (means === TIME_MEANS.SERVE) return { means, leadMin, typedMin, arrivalMin: Math.max(0, typedMin - leadMin), serveMin: typedMin };
  return { means, leadMin, typedMin, arrivalMin: typedMin, serveMin: null };
}

/** "15:00" → "3:00 PM". */
export function clockLabel12(min) {
  if (min == null || !Number.isFinite(min)) return '';
  const h24 = Math.floor(min / 60) % 24;
  const mm = min % 60;
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(mm).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

/** When guests arrive, in minutes — the run of show's anchor. Precise only. */
export function eventArrivalMinutes(event) {
  return eventClock(event).arrivalMin;
}

/**
 * The event's start, in minutes from midnight — precise time first, bucket second.
 * null when the host has told us NOTHING about when the day starts.
 */
export function eventStartMinutes(event) {
  // When guests arrive: for a serve-anchored event, the lead before the meal.
  const exact = eventArrivalMinutes(event);
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
  // THE OUTWARD GATE (2026-07-14). An event now ARRIVES with a grounded default start time so
  // the plan runs on a real clock from the first second — but a default is OURS, not the
  // host's, until they confirm it. This function is what a GUEST reads on the invitation, and
  // a guest must never be handed an hour the host never chose. (The same rule the reply-by
  // date learned the hard way.) Unconfirmed ⇒ fall through to the bucket, or to nothing.
  const derived = event && String(event.startTimeSource || '') === 'derived';
  const clock = derived ? null : eventClock(event);
  if (clock && clock.arrivalMin != null) {
    // A guest is told when to ARRIVE; a meal-centered event also says when it
    // is served (cause 5: "dinner at 3:00 PM" means arrivals before it).
    return clock.serveMin != null
      ? { kind: 'exact', label: clockLabel12(clock.arrivalMin), serveLabel: clockLabel12(clock.serveMin) }
      : { kind: 'exact', label: clockLabel12(clock.arrivalMin) };
  }
  const tod = String((event && event.timeOfDay) || '').trim();
  if (tod && ANCHOR_HOUR[tod.toLowerCase()] != null) {
    // The BUCKET is what the host actually told us. Rendering "3:00 PM" from
    // 'afternoon' would be inventing a precision they never gave.
    return { kind: 'bucket', label: tod.charAt(0).toUpperCase() + tod.slice(1).toLowerCase() };
  }
  return null;
}

/** The words beside the time field: what the time she sets there means. */
export function startTimeFieldWords(event) {
  return eventClock(event).means === TIME_MEANS.SERVE
    ? { label: 'dinner on the table:', aria: 'What time dinner hits the table' }
    : { label: 'guests arrive:', aria: 'What time guests arrive' };
}
