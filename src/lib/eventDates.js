// ─── THE EVENT'S DATES: ONE SHAPE, ONE SETTER, ONE WAY TO SAY THEM ──────────
//
// Owner, 11/21/2026: "Host should be asked for ranges not last day" and "Make
// sure dates are single source. Don't keep asking host for the same
// information."
//
// The stored shape is `date` (first day) + `endDate` (last day, only when it
// runs past the first). Before this, four places wrote it: creation, the Date &
// time editor (start only), Space's own "Last day" input plus its add/drop-a-day
// buttons, and the date poll's "Use these dates". Every one now builds its patch
// here, and `eventDatesCensus.test.js` fails when a surface writes `date` or
// `endDate` any other way.
//
// `datesToConfirm` is the one other date field this owns: the host's sentence
// clearly meant more than one day ("a long weekend", "July 4th weekend", "next
// weekend camping trip") but did not say which days. It is a question owed, not
// a fact — it is cleared the moment the host gives a range here, and nothing
// reads it as a span.
import { spanNights } from './dates';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (v) => {
  const s = String(v || '').slice(0, 10);
  return ISO.test(s) ? s : '';
};

/**
 * eventDatesPatch(event, { date, endDate }) -> patch | null
 *
 * The ONE builder of a date write. `date` omitted keeps the current start;
 * `endDate` omitted keeps the current end, while '' or null makes it one day.
 * An end on or before the start is not a span, so it is dropped rather than
 * stored (lib/dates spanEnd already ignores it on read). Null when there is no
 * valid start to write.
 */
export function eventDatesPatch(event, next = {}) {
  const ev = event || {};
  const date = 'date' in next ? day(next.date) : day(ev.date);
  if (!date) return null;
  const rawEnd = 'endDate' in next ? day(next.endDate) : day(ev.endDate);
  const endDate = rawEnd && rawEnd > date ? rawEnd : null;
  const patch = { date, endDate };
  // A named month has been answered by a real day.
  if (ev.targetMonth) patch.targetMonth = null;
  // The open "which days?" question is answered by any range the host gives,
  // and by a deliberate one-day answer too: either way she has now said.
  if (ev.datesToConfirm) patch.datesToConfirm = null;
  // A stated night count beside real dates is a second copy of one fact.
  if (ev.statedNights && endDate) patch.statedNights = null;
  return patch;
}

/**
 * eventStartTimePatch(event, { startTime } | { confirm: true }) -> patch | null
 *
 * THE START TIME, TWO EDITORS, ONE STORE (owner 11/22/2026: "Both can edit").
 * Date & time's start time and the run of show's "guests arrive" are the same
 * fact, `startTime` (HH:MM, 24h), and both build their write here, as the
 * dates do above. A time she types or picks is hers (`startTimeSource:
 * 'host'`, the outward gate lib/startTime reads). `confirm` makes our
 * pencilled time hers without changing it; with no time there is nothing to
 * confirm. A cleared field clears the time. Anything that is not a clock time
 * writes nothing.
 */
export function eventStartTimePatch(event, next = {}) {
  const ev = event || {};
  if (next.confirm) return String(ev.startTime || '').trim() ? { startTimeSource: 'host' } : null;
  const t = String(next.startTime == null ? '' : next.startTime).trim();
  if (!t) return { startTime: '', startTimeSource: null };
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return { startTime: `${m[1].padStart(2, '0')}:${m[2]}`, startTimeSource: 'host' };
}

/**
 * normalizeEventDates(event) -> event
 *
 * Idempotent clean-up of what older builds stored: an endDate that is empty,
 * malformed or not after the start (Space's old "Last day" input could leave
 * '' behind), and a statedNights kept beside a real span. Returns the same
 * object when nothing needs changing, so a reload writes nothing.
 */
export function normalizeEventDates(event) {
  if (!event || typeof event !== 'object') return event;
  const start = day(event.date);
  const hasEnd = 'endDate' in event;
  const end = day(event.endDate);
  const badEnd = hasEnd && (!end || !start || end <= start);
  const dupNights = !badEnd && end && start && end > start && event.statedNights != null;
  if (!badEnd && !dupNights) return event;
  const out = { ...event };
  if (badEnd) delete out.endDate;
  if (dupNights) delete out.statedNights;
  return out;
}

const fmt = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts);

/**
 * eventSpanLabel(event) -> "Jun 14–17 (3 nights)" | "Dec 30 – Jan 2 (3 nights)"
 *                          | "Sat, Jun 14" | null
 *
 * The words every surface uses for the event's dates, so the board, Space, the
 * reveal and the range control cannot say the same span three ways.
 */
export function eventSpanLabel(event) {
  const ev = event || {};
  const start = day(ev.date);
  if (!start) return null;
  const n = spanNights(ev);
  if (n > 0) {
    const end = day(ev.endDate);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    const a = fmt(start, { month: 'short', day: 'numeric' });
    const b = sameMonth ? String(Number(end.slice(8, 10))) : fmt(end, { month: 'short', day: 'numeric' });
    return (sameMonth ? `${a}–${b}` : `${a} – ${b}`) + ` (${n} night${n === 1 ? '' : 's'})`;
  }
  return fmt(start, { weekday: 'short', month: 'short', day: 'numeric' });
}
