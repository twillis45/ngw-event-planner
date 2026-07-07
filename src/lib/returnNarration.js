// ─── returnNarration — RETURN-NARRATION-1 (test-framed, easy to kill) ─────────
//
// One hard-capped line answering "since last time, what meaningful thing
// moved?" — from REAL diffable state only. Not a feed, not a changelog, not
// encouragement. If nothing meaningful moved, it says NOTHING (a "no changes"
// line is noise, so we don't ship one).
//
// SNAPSHOT: lightweight safe markers only — phase, handled flags, counts,
// timestamp. Never message bodies, guest/vendor details, coordinates, or
// payment data beyond a boolean. Stored per event in localStorage
// (`ngw-return-snap-<id>`), rewritten on every shell mount, which is also the
// anti-repeat mechanism: a line can't recur because its diff basis is gone.
//
// GATES: no previous snapshot → silent (first visit). Gap under 30 minutes →
// silent (a reload is not a return). One line max, calm tense ("was added",
// "moved closer"), never sent/replied/paid claims, never the hero's words.

import { deriveEventPhaseProgress } from './phaseProgress';
import { rainPlanStatus } from './weather';
import { playbookFoodPlan } from './playbooks';
import { eventLocationStatus } from './locationAssist';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const has = (v) => !!String(v || '').trim();
const KEY = (id) => `ngw-return-snap-${id}`;
export const RETURN_GAP_MS = 30 * 60 * 1000;

export function buildReturnSnapshot(event, now = Date.now()) {
  const ev = event || {};
  let phase = 'unknown';
  try { phase = deriveEventPhaseProgress(ev).phase; } catch { /* keep unknown */ }
  let foodLeft = null;
  try {
    const plan = playbookFoodPlan(ev);
    const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
    if (plan && Array.isArray(plan.list)) foodLeft = plan.list.filter(i => i && !i.skipped && !got[i.id]).length;
  } catch { /* null */ }
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(v => v && has(v.name));
  const vendorGaps = vendors.filter(v => !/confirmed|booked|contracted/i.test(String(v.status || ''))
    || (num(v.depositAmt) > 0 && v.depositPaid !== true)).length;
  return {
    seenAt: now,
    phase,
    // the ONE shared location reader — phaseProgress, the weather source, and
    // this marker can never disagree again (eventLocationStatus !== 'missing')
    location: eventLocationStatus(ev) !== 'missing',
    parking: has(ev.parking),
    rain: (() => { try { return !!rainPlanStatus(ev).hasPlan; } catch { return false; } })(),
    countSet: num(ev.guestCount) > 0 || num(ev.guestEstimate) > 0,
    foodLeft,
    vendorGaps: vendors.length ? vendorGaps : null,
    openTasks: (Array.isArray(ev.timeline) ? ev.timeline : []).filter(t => t && t.task && !t.done).length,
  };
}

export function readReturnSnapshot(eventId) {
  try { const raw = localStorage.getItem(KEY(eventId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeReturnSnapshot(eventId, snap) {
  try { localStorage.setItem(KEY(eventId), JSON.stringify(snap)); } catch { /* best effort */ }
}

const PHASE_LINE = {
  live_event: 'Since last time: it’s event day.',
  post_event: 'Since last time: the event moved into wrap-up.',
};

export function deriveReturnNarration(event, prevSnap, now = Date.now()) {
  const none = { shouldShow: false, line: null, source: null, route: null };
  if (!prevSnap || !prevSnap.seenAt) return none;                    // first visit — say nothing
  if (now - prevSnap.seenAt < RETURN_GAP_MS) return none;            // a reload is not a return
  const cur = buildReturnSnapshot(event, now);

  // Priority order: phase change > foundations added > count set > food moved
  // closer > vendors moved closer > steps done. ONE line, first match wins.
  if (cur.phase !== prevSnap.phase && PHASE_LINE[cur.phase]) {
    return { shouldShow: true, line: PHASE_LINE[cur.phase], source: 'phase_change', route: null };
  }
  if (cur.location && !prevSnap.location) {
    return { shouldShow: true, line: 'Since last time: the event location was added.', source: 'completed_step', route: { tab: 'Event Details', focusField: 'event-venue' } };
  }
  if (cur.parking && !prevSnap.parking) {
    return { shouldShow: true, line: 'Since last time: parking details were added.', source: 'completed_step', route: { tab: 'Event Details', focusField: 'parking-notes' } };
  }
  if (cur.rain && !prevSnap.rain) {
    return { shouldShow: true, line: 'Since last time: the rain backup was added.', source: 'completed_step', route: { tab: 'Event Details', focusField: 'rain-plan' } };
  }
  if (cur.countSet && !prevSnap.countSet) {
    // count SET — never a word about replies (count-only hosts see no RSVP language)
    return { shouldShow: true, line: 'Since last time: the guest count was set.', source: 'completed_step', route: { tab: 'Guests', focusField: 'guests-entry' } };
  }
  if (cur.foodLeft != null && prevSnap.foodLeft != null && cur.foodLeft < prevSnap.foodLeft) {
    return { shouldShow: true, line: cur.foodLeft === 0
      ? 'Since last time: the shopping list is fully bought.'
      : `Since last time: food moved closer — ${cur.foodLeft} item${cur.foodLeft === 1 ? '' : 's'} left to buy.`,
      source: 'snapshot_diff', route: { tab: 'Planning', focusField: 'food-plan' } };
  }
  if (cur.vendorGaps != null && prevSnap.vendorGaps != null && cur.vendorGaps < prevSnap.vendorGaps) {
    return { shouldShow: true, line: cur.vendorGaps === 0
      ? 'Since last time: every vendor is squared away.'
      : `Since last time: the vendor plan moved closer — ${cur.vendorGaps} still ${cur.vendorGaps === 1 ? 'needs' : 'need'} a follow-up.`,
      source: 'snapshot_diff', route: { tab: 'Vendors', focusField: 'vendor-list' } };
  }
  if (prevSnap.openTasks != null && cur.openTasks < prevSnap.openTasks && (prevSnap.openTasks - cur.openTasks) >= 1 && prevSnap.openTasks > 0) {
    const done = prevSnap.openTasks - cur.openTasks;
    return { shouldShow: true, line: `Since last time: ${done} step${done === 1 ? ' was' : 's were'} checked off.`, source: 'completed_step', route: null };
  }
  return none; // nothing meaningful moved — stay quiet
}

// One-telling guard for the render site: the narration never re-tells the
// hero's or the cue's words.
export function narrationDuplicatesTelling(line, heroTitle, cueLabel) {
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const l = norm(line).replace(/^since last time /, '');
  if (!l) return false;
  // The narration's SUBJECT (before its verb) is what could re-tell a telling:
  // "parking details were added" → "parking details" vs hero "Add parking details".
  const subject = l.split(/ were | was | moved | is | are /)[0].trim();
  if (subject.length < 8) return false;
  const keyNoun = subject.split(' ').pop();
  return [heroTitle, cueLabel].some(t => {
    if (!t) return false;
    const n = norm(t);
    // full-subject match OR the subject's key noun ("location", "parking",
    // "count") already named by the hero/cue — silence is free, contradiction
    // is not.
    return n.includes(subject) || (keyNoun.length >= 5 && n.includes(keyNoun));
  });
}
