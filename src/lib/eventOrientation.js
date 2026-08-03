// ─── eventOrientation — "where are we?", derived (Phase 5G-C1 Parts 8-9) ─────
//
// The host surface already showed counts ("4 of 5 plan parts handled") and a ranked
// next cue. What it never said was WHERE IN THE ARC the event is, or what that means
// in plain language. This adds exactly those two things, plus the per-dimension
// segments behind the count.
//
// THIN COMPOSITION, NOT A NEW ENGINE. Everything here reads `deriveEventPhaseProgress`
// output — phase, label, completedCount/totalCount, nextCue, and the `items` ledger.
// No readiness is recomputed and no new source of truth is introduced, so this can
// never disagree with the hairline it sits next to.
//
// THREE HONESTY RULES, each test-locked:
//   1. UNKNOWN STAYS UNKNOWN. No date means "Getting started", never a fabricated
//      phase and never a percentage.
//   2. A SEVERE BLOCKER DOMINATES COSMETIC COMPLETION. 6-of-7 handled with an
//      overdue critical item does not get to read as nearly done.
//   3. A WEAK SEGMENT WITHOUT A DESTINATION GETS A SENTENCE, NEVER A CTA. The
//      phaseProgress ledger carries `route` per item; items without one are
//      explained instead of being given a button that goes nowhere.

// Host-facing lifecycle words. The engine's own labels ("Planning readiness",
// "Planning setup") name a MEASUREMENT; a host wants to know what part of the arc
// they are in. Mapped, never invented — every value here comes from `phase`.
export const LIFECYCLE_LABELS = Object.freeze({
  unknown: 'Getting started',
  pre_event: 'Active planning',
  live_event: 'Event day',
  post_event: 'Wrapping up',
});

// Plain-language names for each readiness dimension the engine tracks.
export const DIMENSION_LABELS = Object.freeze({
  datetime: 'Date & time',
  location: 'Place',
  headcount: 'Guests',
  food: 'Food',
  shopping: 'Shopping',
  budget: 'Budget',
  vendors: 'Vendors',
  lodging: 'Where everyone stays',
  rain: 'Backup plan',
  moment: 'The moment',
  crabs: 'Seafood order',
});

/**
 * The segmented readiness summary (Part 9).
 *
 * One visual, driven entirely by the engine's own per-essential ledger. Each segment
 * is CATEGORICAL — handled / open — never a percentage of itself, because the engine
 * knows whether an essential is done, not how done it is.
 */
export function readinessSegments(phaseCues) {
  const items = (phaseCues && Array.isArray(phaseCues.items)) ? phaseCues.items : [];
  return items.map((it) => ({
    id: it.id,
    label: DIMENSION_LABELS[it.id] || it.id,
    handled: !!it.handled,
    // A destination only when the engine actually has one. Rendering a CTA for an
    // item with no route is the dead-navigation defect.
    route: (!it.handled && it.route) ? it.route : null,
    cueLabel: (!it.handled && it.cueLabel) ? it.cueLabel : null,
    // Weak AND unroutable: say why rather than offering a button.
    explanation: (!it.handled && !it.route)
      ? `${DIMENSION_LABELS[it.id] || it.id} is still open — it is handled elsewhere in the plan.`
      : null,
  }));
}

/**
 * Is something genuinely urgent, as opposed to merely unfinished?
 *
 * `queue` is the host shell's own attention queue. A critical or overdue lead item
 * outranks any completion count — 6 of 7 handled with an overdue vendor payment is
 * not "nearly done".
 */
export function severeBlocker(queue) {
  const q = Array.isArray(queue) ? queue : [];
  const lead = q[0];
  if (!lead) return null;
  const critical = lead.level === 'critical' || lead.status === 'overdue'
    || (typeof lead.dueInDays === 'number' && lead.dueInDays < 0);
  if (!critical) return null;
  return { id: lead.id, title: lead.title || lead.headline || null, overdue: true };
}

/**
 * orientation(phaseCues, queue, opts) -> what the host is told about where they are.
 *
 * Returns null when there is no engine output at all, so the caller renders the
 * surface it already had rather than an empty shell.
 */
export function orientation(phaseCues, queue = [], opts = {}) {
  if (!phaseCues || !phaseCues.phase) return null;
  const phase = phaseCues.phase;
  const done = Number(phaseCues.completedCount) || 0;
  const total = Number(phaseCues.totalCount) || 0;
  const segments = readinessSegments(phaseCues);
  const blocker = severeBlocker(queue);
  const openNames = segments.filter((s) => !s.handled).map((s) => s.label.toLowerCase());

  // ── The plain-language summary, composed from real state only ──────────────
  let summary;
  if (phase === 'unknown') {
    // Rule 1. No date means the plan cannot be timed at all, and that is the whole
    // story — do not dress it up with a count that implies progress toward a day.
    summary = 'No date yet, so nothing can be timed. Add the day and the rest of the plan falls into place.';
  } else if (blocker) {
    // Rule 2. The blocker leads, whatever the count says.
    summary = total && done >= total
      ? 'Everything is handled, but one thing has gone past its date and needs you now.'
      : `One thing has gone past its date and needs you now — the other ${Math.max(0, total - done)} open ${total - done === 1 ? 'part' : 'parts'} can follow.`;
  } else if (total && done >= total) {
    summary = phase === 'live_event'
      ? 'Everything is handled. Today is about running it, not planning it.'
      : 'Every part of the plan is handled. Nothing is waiting on you.';
  } else if (openNames.length) {
    const named = openNames.slice(0, 2).join(' and ');
    const rest = openNames.length > 2 ? `, plus ${openNames.length - 2} more` : '';
    summary = `Your plan is moving. ${named}${rest} still need${openNames.length === 1 ? 's' : ''} you.`;
  } else {
    summary = 'Your plan is moving.';
  }

  // A recommendation assumption worth surfacing here, passed in rather than read —
  // this module does not reach into the knowledge layer.
  const assumption = opts.assumption || null;

  return {
    phase,
    lifecycleLabel: LIFECYCLE_LABELS[phase] || LIFECYCLE_LABELS.unknown,
    engineLabel: phaseCues.label || null,
    completedCount: done,
    totalCount: total,
    summary,
    segments,
    blocker,
    primaryAction: phaseCues.nextCue || null,
    assumption,
    // Explicitly NOT a percentage. Categorical only — see rule 1.
    countText: total ? `${done} of ${total} handled` : null,
  };
}

/**
 * The parts still open, named, for the visible hairline.
 *
 * WHY THIS EXISTS: the hairline used to read "2 of 4 plan parts handled" beside a bar
 * whose green-vs-grey strips already encode exactly that count — one truth, printed
 * twice, and the NAMES (which only the strips' hover tooltip carried) reached no
 * touch device at all. Naming the open parts here spends the same line on information
 * the host does not otherwise have, and it needs no pointer, so touch, keyboard and
 * assistive tech all get the same sentence. Hover stays a desktop refinement.
 *
 * Same two-then-rest idiom as `summary` above, so the surface does not grow a second
 * way of saying the same thing.
 */
export function openPartsLabel(orientationResult) {
  if (!orientationResult) return '';
  const open = orientationResult.segments.filter((s) => !s.handled).map((s) => s.label);
  if (!open.length) return 'nothing open';
  if (open.length === 1) return `${open[0]} open`;
  if (open.length === 2) return `${open[0]} and ${open[1]} open`;
  return `${open[0]}, ${open[1]} +${open.length - 2} more`;
}

/**
 * The hairline's visible left label — HYBRID, and the split is deliberate.
 *
 * The board frames (Figma 922:121 "0 of 5 plan parts handled", 120:60 "4 of 7
 * clashes cleared") specify the COUNT. Naming the open parts beats the count when
 * the host is nearly done and there are one or two things left — that is real
 * information, and it is the only form that survives on touch, where the strips'
 * hover tooltip does not exist.
 *
 * But names do not survive the extremes. At 0 of 5 handled they degrade to
 * "Date & time, Place +3 more", which is longer than the count and says less. So:
 * names while the remaining list is short enough to BE a list, the specified
 * count otherwise.
 */
export function hairlineLabel(orientationResult) {
  const o = orientationResult;
  if (!o) return '';
  const openCount = o.segments.filter((s) => !s.handled).length;
  const done = o.completedCount;
  const total = o.totalCount;
  if (openCount > 0 && openCount <= 2) return `${done} of ${total} · ${openPartsLabel(o)}`;
  return `${done} of ${total} plan parts handled`;
}

/**
 * A text equivalent of the segmented visual, for screen readers.
 *
 * The existing progress hairline is `aria-hidden="true"`, so its labels reach nobody
 * using assistive tech. A visual that encodes state must have a text form.
 */
export function segmentsText(orientationResult) {
  if (!orientationResult) return '';
  const o = orientationResult;
  const open = o.segments.filter((s) => !s.handled).map((s) => s.label);
  const head = `${o.lifecycleLabel}. ${o.countText || 'Nothing counted yet'}.`;
  const body = open.length ? ` Still open: ${open.join(', ')}.` : ' Nothing open.';
  const tail = o.blocker ? ' One item is past its date.' : '';
  return head + body + tail;
}
