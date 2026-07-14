// ─── What time does the event start? Propose it, ground it, let the host own it. ──
//
// The run of show used to answer this by inventing: with only "afternoon" it printed
// 3:00 PM, and with nothing at all it anchored the entire day to a bare 15:00 — times that
// were shown as fact, SENT TO VENDORS, and frozen into event.ros on the first edit. That is
// fixed (playbooks/index.js now emits relative labels unless the host set a real time), but
// leaving the host with an empty field is only half an answer, exactly as it was with the
// reply-by date. An event should start with a GROUNDED time.
//
// So: propose, show the work, write nothing until they tap, let them change it. The doctrine
// from lib/replyBy.js, applied to the clock.
//
// ── What actually grounds a start time ────────────────────────────────────────
// Three real constraints, in order of how much they know:
//
//   1. DAYLIGHT (the strong one). weather.js computes a REAL sunset for the event's date and
//      city — its own comment says "real, computed — never fabricated" — and until now NOTHING
//      CONSUMED IT. An outdoor event should finish in the light: nobody wants to be picking
//      crabs, or finding their car, in the dark. Combined with the playbook's authored
//      `meta.typicalDurationHours`, that gives a start time derived entirely from facts:
//
//          start = sunset − duration − a short buffer
//
//      "Sunset is 8:14 PM on August 4. A crab feast runs about 4 hours, so a 3:30 start has
//       you finishing in the light."  ← every number in that sentence is real.
//
//   2. THE HOST'S OWN WORD. If they said "afternoon", the middle of the afternoon is not our
//      guess — it is their statement, made precise. We say so plainly, and it is theirs to
//      move. When BOTH exist, daylight refines the bucket rather than contradicting it: we
//      never move the host outside the window they chose.
//
//   3. NOTHING. Then we say nothing, or say it is a rule of thumb. We do not invent.
//
// A note on what is NOT here: there is no authored "a crab feast starts at 1pm" anywhere in
// the playbooks, and inventing one — even a sensible one — would be the same bug in better
// clothes. Every number below traces to the forecast, the playbook's own duration, or the
// host's own words.

import { getPlaybook } from './playbooks';
import { ANCHOR_HOUR } from './eventWhen';

// Types that live outdoors — the same list phaseProgress uses to decide a rain plan matters.
const OUTDOOR_TYPE = /cookout|bbq|barbecue|fish fry|crab feast|crawfish|boil|picnic|day party|block party|tailgate|luau|beach|garden party|graduation|juneteenth|family reunion|reunion/i;

// Finish this long before the light goes. Not a fudge factor — it is the difference between
// "the last guest leaves as the sun sets" and "everyone is packing coolers in the dark".
const LIGHT_BUFFER_MIN = 30;

// The window each time-of-day word actually covers, so a daylight-derived time can be
// checked against the host's own word instead of silently overriding it.
const BUCKET_WINDOW = {
  morning:   [8 * 60, 11 * 60 + 59],
  afternoon: [12 * 60, 16 * 60 + 59],
  evening:   [17 * 60, 19 * 60 + 59],
  night:     [19 * 60, 22 * 60],
  late:      [20 * 60, 23 * 60],
};

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const pretty = (min) => {
  const h24 = Math.floor(min / 60); const m = min % 60;
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${ap}`;
};

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

export function isOutdoorEvent(event) {
  const ev = event || {};
  if (ev.indoorVenue === true) return false;
  if (String(ev.venueKind || '') === 'venue' && !OUTDOOR_TYPE.test(String(ev.type || ''))) return false;
  return OUTDOOR_TYPE.test(String(ev.type || '')) || String(ev.venueKind || '') === 'home';
}

/** The playbook's own authored run-length. Null when the playbook doesn't say. */
export function typicalDurationHours(event) {
  try {
    const pb = getPlaybook((event || {}).type);
    const h = pb && pb.meta && Number(pb.meta.typicalDurationHours);
    return Number.isFinite(h) && h > 0 ? h : null;
  } catch (_e) { return null; }
}

/**
 * Propose a start time.
 *
 * @param {object} event
 * @param {{sunset?: string}} [weather] the REAL forecast for the event day (weather.js).
 *        Omitted or without a sunset ⇒ the daylight constraint simply isn't available, and
 *        we fall back rather than pretend.
 * @returns {null | {
 *   hhmm: string, minutes: number, label: string,
 *   basis: 'daylight' | 'daylight-in-bucket' | 'bucket' | null,
 *   why: string, grounded: boolean, drivers: string[]
 * }}
 * Null when the host has already set a time (nothing to propose) or when we genuinely know
 * nothing — in which case the surface asks, rather than guessing.
 */
/**
 * DEFAULT the start time — write it, don't just offer it.
 *
 * The host asked for the app to arrive with a grounded time rather than an empty field, and
 * that is right: a day with no clock is a day whose run of show is relative, whose vendors
 * cannot be told an hour, and whose host has to invent one themselves.
 *
 * What makes this safe — and different from the 15:00 we just deleted — is PROVENANCE.
 * The old invention was indistinguishable from a host decision the moment it was written.
 * This one carries `startTimeSource: 'derived'` and the sentence that justifies it, so:
 *
 *   · the app plans on a real clock immediately (the whole point)
 *   · every host-facing surface can say "we set this, and here's why — change it"
 *   · nothing OUTWARD-facing (a guest's invitation, a vendor's brief) may state the hour
 *     until the host has confirmed it. An unconfirmed hour is ours, not theirs, and a
 *     caterer who shows up at the wrong time does not care whose default it was.
 *
 * Returns the patch to merge, or null when we cannot ground one — in which case the event
 * honestly has no time, and the ranked list asks for one.
 */
export function defaultStartTime(event, weather) {
  const p = proposeStartTime(event, weather);
  if (!p) return null;
  return { startTime: p.hhmm, startTimeSource: 'derived', startTimeWhy: p.why, startTimeBasis: p.basis };
}

/** Has the host actually chosen this hour, or is it still our default? */
export function startTimeIsConfirmed(event) {
  const ev = event || {};
  if (!String(ev.startTime || '').trim()) return false;
  return ev.startTimeSource !== 'derived';
}

export function proposeStartTime(event, weather) {
  const ev = event || {};
  if (String(ev.startTime || '').trim()) return null;      // the host has already decided

  const tod = String(ev.timeOfDay || '').trim().toLowerCase();
  const bucketMin = ANCHOR_HOUR[tod] != null ? ANCHOR_HOUR[tod] * 60 : null;
  const window = BUCKET_WINDOW[tod] || null;

  const durH = typicalDurationHours(ev);
  const sunsetMin = parseClock(weather && weather.sunset);
  const outdoor = isOutdoorEvent(ev);

  const drivers = [];

  // ── 1. Daylight: the strong, fully-derived constraint ────────────────────────
  if (outdoor && sunsetMin != null && durH != null) {
    const latest = sunsetMin - durH * 60 - LIGHT_BUFFER_MIN;
    drivers.push(`sunset ${pretty(sunsetMin)}`, `${durH}h typical run`);

    // Never move the host outside the window they themselves named. If daylight says start
    // earlier than their word allows, we keep their word and TELL them the tension — their
    // decision, not ours to quietly overrule.
    if (window && latest < window[0]) {
      const start = window[0];
      return {
        hhmm: hhmm(start), minutes: start, label: pretty(start),
        basis: 'daylight-in-bucket', grounded: true, drivers,
        why: `Sunset is ${pretty(sunsetMin)}, and a ${String(ev.type || 'event').toLowerCase()} runs about ${durH} hours — so to finish in the light you'd want to start before ${pretty(latest)}. That's earlier than ${tod}, so this is the earliest ${tod} start. Worth knowing you'll run past dark.`,
      };
    }

    const start = window ? Math.min(latest, window[1]) : latest;
    return {
      hhmm: hhmm(start), minutes: start, label: pretty(start),
      basis: window ? 'daylight-in-bucket' : 'daylight', grounded: true, drivers,
      why: `Sunset is ${pretty(sunsetMin)} that day, and a ${String(ev.type || 'event').toLowerCase()} runs about ${durH} hours — so a ${pretty(start)} start has you finishing in the light.`,
    };
  }

  // ── 2. The host's own word, made precise ─────────────────────────────────────
  if (bucketMin != null) {
    drivers.push(`you said ${tod}`);
    const dur = durH ? ` A ${String(ev.type || 'event').toLowerCase()} runs about ${durH} hours.` : '';
    return {
      hhmm: hhmm(bucketMin), minutes: bucketMin, label: pretty(bucketMin),
      basis: 'bucket', grounded: true, drivers,
      why: `You said ${tod} — this is the middle of it, not a guess at your plan.${dur} Change it to whatever is true.`,
    };
  }

  // ── 3. We know nothing. Say nothing. ─────────────────────────────────────────
  return null;
}
