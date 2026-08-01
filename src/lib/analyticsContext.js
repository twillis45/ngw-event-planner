// ─── SHARED ANALYTICS EVENT CONTEXT — one definition, every event ─────────────
//
// WHY THIS EXISTS. The Reasoning Continuity v1 events shipped with no event
// context at all, so the data could count impressions and clicks and could not
// answer any question worth asking: does a reason help more on a tight runway
// than a long one, do solemn events behave differently, does a destination event
// change anything. Without segmentation the numbers are uninterpretable rather
// than merely imprecise.
//
// Duplicating four fields across three call sites is how they drift, so this is
// the single producer. Every analytics payload spreads the SAME object.
//
// HONEST NULLS. Absence is reported as null, never as a default. A missing date
// is not "0 days out" and an unknown type is not "other" — a null is a fact the
// analysis can filter on, whereas an invented value silently pollutes a segment.
// No PII: type, runway and two booleans. Never the event name, venue, city, or
// any guest field.
import { daysUntil } from './dates';
import { isSolemnEvent } from './solemn';

/**
 * analyticsEventContext(event) -> { event_type, days_out, is_solemn, is_destination }
 * Pure. Never throws — analytics must not be able to break a render.
 */
export function analyticsEventContext(event) {
  if (!event || typeof event !== 'object') {
    return { event_type: null, days_out: null, is_solemn: null, is_destination: null };
  }
  // The TYPE only. Never `name` — a host's event name is free text and routinely
  // carries a family name ("Repast for Deacon Willie Hayes").
  const rawType = typeof event.type === 'string' ? event.type.trim() : '';
  const event_type = rawType ? rawType.toLowerCase() : null;

  // Runway in whole days. Null when there is no readable date — an event with no
  // date is a real state and must not be reported as due today.
  let days_out = null;
  try {
    const d = daysUntil(event.date);
    if (Number.isFinite(d)) days_out = d;
  } catch { days_out = null; }

  // Solemnity is a classification the product already owns; read it, never re-derive.
  let is_solemn = null;
  try { is_solemn = !!isSolemnEvent(event); } catch { is_solemn = null; }

  // `isDestination` is the ONE flag the travel/lodging stack gates on. Absent is
  // reported as false only when the field is genuinely present-and-falsy; an
  // undefined field is null, because "nobody set this" and "this is local" are
  // different facts and the destination-activation question depends on telling
  // them apart.
  const is_destination = event.isDestination === undefined ? null : !!event.isDestination;

  return { event_type, days_out, is_solemn, is_destination };
}

/** Runway bucket for segmentation. Null in, null out. */
export function runwayBucket(daysOut) {
  if (!Number.isFinite(daysOut)) return null;
  if (daysOut < 0) return 'past';
  if (daysOut === 0) return 'day_of';
  if (daysOut <= 2) return 'day_before';
  if (daysOut <= 7) return 'week';
  if (daysOut <= 30) return 'month';
  return 'long';
}
