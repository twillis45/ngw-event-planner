// ─── WHAT THE TIME SHE TYPES MEANS, PER PLAYBOOK (six root causes, cause 5) ──
//
// Every playbook declares `timeAnchor`:
//   { means: 'serve', serveAt: 'T0 +1h' } — meal-centered: the typed time is
//       when the meal is served; arrivals come `serveAt` before it (the
//       playbook's own serve cue in its run of show — owner ruling 11/23/2026:
//       "an hour, or the playbook's own stated lead if it has one");
//   { means: 'arrival' } — the typed time is when guests arrive.
// Creation stamps it on the event ONCE (timeAnchorFields), so a playbook edit
// never reinterprets a plan she already made; lib/eventWhen.eventClock reads
// the stamp everywhere a time is scheduled.
import { getPlaybook, rosWhenOffset } from './playbooks';
import { TIME_MEANS, parseStartMinutes } from './eventWhen';

const DEFAULT_SERVE_LEAD_MIN = 60;   // the ruling's "an hour"

/** timeAnchorOf(playbook) → { means, leadMin } (leadMin 0 for arrival). */
export function timeAnchorOf(pb) {
  const a = (pb && pb.timeAnchor) || null;
  if (!a || a.means !== TIME_MEANS.SERVE) return { means: TIME_MEANS.ARRIVAL, leadMin: 0 };
  const off = a.serveAt ? rosWhenOffset(a.serveAt) : null;
  return { means: TIME_MEANS.SERVE, leadMin: Number.isFinite(off) && off > 0 ? off : DEFAULT_SERVE_LEAD_MIN };
}

const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * The fields creation stamps on a new event: what its time means and, for a
 * serve-anchored playbook, the lead. `defaultApplied`: the start is OUR default
 * (lib/startTime.defaultStartTime, from the sunset and the run length), which
 * is an arrival time, so on a serve-anchored event it is moved to the meal it
 * implies and the run of show keeps its anchor. A time she gave is never moved.
 */
export function timeAnchorFields(event, { defaultApplied = false } = {}) {
  const pb = event ? getPlaybook(event.type) : null;
  const { means, leadMin } = timeAnchorOf(pb);
  const out = { startTimeMeans: means };
  if (means !== TIME_MEANS.SERVE) return out;
  out.arrivalLeadMin = leadMin;
  if (defaultApplied) {
    const m = parseStartMinutes(event.startTime);
    if (m != null) out.startTime = hhmm(m + leadMin);
  }
  return out;
}
