// demo/src/lib/workflowCompression.js
// Sprint 57f · Compressed Workflow Intelligence
//
// PROBLEM
// -------
// TIMELINE_TEMPLATES and WORKFLOW_FOCUS assume a standard lead time
// (a wedding is 12 months out, a board meeting 3 months, etc.). When a
// planner enters a date that's shorter than the template's standard lead,
// the template assigns tasks to phases that have already passed. From day
// one the planner sees overdue work, scary red badges, and "6 Months Out"
// guidance for an event that's 60 days away. That's intimidating and wrong.
//
// DECISION
// --------
// Compression is a derived view, not a stored field. We never mutate
// PHASE_OFFSET / TIMELINE_TEMPLATES / WORKFLOW_FOCUS. Instead, we layer a
// compression ratio on top of them: given (event date, event type), compute
// how compressed this event is relative to its standard lead, then map
// each template task to one of four urgency classes.
//
// SOURCE OF TRUTH
// ---------------
// - Standard lead per event type lives here (see STANDARD_LEAD_DAYS).
// - Days-until-event must come from the caller (daysUntil in App.js).
// - PHASE_OFFSET, currentPhase, TIMELINE_TEMPLATES, WORKFLOW_FOCUS all
//   continue to live in App.js as the canonical phase model. Helpers in
//   this file derive from them; they do NOT replace them.
//
// LANGUAGE
// --------
// Aligns with Sprint 57e budget rush vocabulary: TIGHT / COMPRESSED / RUSH.
// We add `standard` (no compression) so callers don't have to special-case
// null. User-facing labels intentionally avoid shame: "Tight timeline",
// "Compressed", "Rush" — same word the planner heard in the budget.

// Standard lead times per event type (in days). Keys must match the event
// type strings used in TIMELINE_TEMPLATES so lookups stay consistent.
// Values reflect the longest reasonable "first phase" in each event type's
// timeline template — i.e. the lead time the template was designed for.
export const STANDARD_LEAD_DAYS = {
  Wedding:             365, // 12 months
  Corporate:           182, // 6 months
  'Board Meeting':      91, // 3 months
  Birthday:             91, // 3 months
  Anniversary:         182, // 6 months
  'Baby Shower':        61, // 2 months
  'Bridal Shower':      91, // 3 months
  Graduation:           91, // 3 months
  'Engagement Party':   91, // 3 months
  'Vow Renewal':       182, // 6 months
  'Retirement Party':   61, // 2 months
  'Sweet 16':           91, // 3 months
  Quinceañera:         365, // 12 months
  Reunion:             182, // 6 months
  'Fundraiser / Gala': 182, // 6 months
  'Networking Event':   28, // 4 weeks
  'Holiday Party':     121, // 4 months
  Conference:          365, // 12 months
  'Product Launch':     91, // 3 months
  'Team Retreat':       91, // 3 months
  'Town Hall':          28, // 4 weeks
  'Training / Workshop':42, // 6 weeks
  'Award Ceremony':     91, // 3 months
  'Client Dinner':      21, // 3 weeks
  Other:                91, // 3 months default
};

export const getStandardLeadDays = (eventType) =>
  STANDARD_LEAD_DAYS[eventType] ?? STANDARD_LEAD_DAYS.Other;

// Compression ratio = days_until / standard_lead.
// 1.0 = on standard timeline.  0.5 = half the usual lead time.  0.1 = very rushed.
// Returns null if we can't compute (no date, past date, missing inputs).
export const getCompressionRatio = (daysUntil, eventType) => {
  if (daysUntil === null || daysUntil === undefined || daysUntil < 0) return null;
  const std = getStandardLeadDays(eventType);
  if (!std) return null;
  return daysUntil / std;
};

// Level buckets aligned with Sprint 57e budget rush thresholds so the
// language the planner sees on budget matches the language on workflow.
//
//   standard    → ratio >= 1.0  (full lead time or longer)
//   tight       → ratio >= 0.6  (small premium territory)
//   compressed  → ratio >= 0.3  (real compression — vendor availability bites)
//   rush        → ratio <  0.3  (deep rush — substitutions likely)
//
// Returns null when the ratio can't be computed.
export const getCompressionLevel = (daysUntil, eventType) => {
  const ratio = getCompressionRatio(daysUntil, eventType);
  if (ratio === null) return null;
  if (ratio >= 1.0) return 'standard';
  if (ratio >= 0.6) return 'tight';
  if (ratio >= 0.3) return 'compressed';
  return 'rush';
};

// Friendly metadata per level. `badge` matches Sprint 57e budget badges
// (same icon vocabulary so the planner sees one consistent vibe across
// budget + workflow). `tone` is one of muted / accent / warn / danger so
// callers pick the right token from C.{muted,accent2,warn,danger}.
export const COMPRESSION_META = {
  standard: {
    label: 'On standard timeline',
    badge: null,
    tone: 'muted',
    headline: 'You have the usual lead time for this kind of event.',
    sub: 'Phases unfold in their normal order — no special pacing needed.',
  },
  tight: {
    label: 'Tight timeline',
    badge: '⏱ TIGHT',
    tone: 'accent',
    headline: 'A little less runway than usual — still very doable.',
    sub: 'Some vendors may want quicker decisions. We\'ll flag what to do first.',
  },
  compressed: {
    label: 'Compressed timeline',
    badge: '⏱ COMPRESSED',
    tone: 'warn',
    headline: 'Half the usual lead time — focus on the must-haves.',
    sub: 'We\'ll skip phases that have already passed and tag what still fits.',
  },
  rush: {
    label: 'Rush timeline',
    badge: '⏱ RUSH',
    tone: 'danger',
    headline: 'Short turnaround — we\'ll keep the plan tight and honest.',
    sub: 'Expect to swap a few templates for faster substitutes. That\'s normal at this lead time.',
  },
};

// Compress phase guidance:
//   - Drop phases that have already passed (their offset is "before today").
//   - Always keep phases from `currentPhase` onward (the present and future).
//
// `phases` is the WORKFLOW_FOCUS[eventType] map: { '12 Months Out': {...}, ... }.
// `phaseOffset` is the PHASE_OFFSET map (negative day-offsets from event date).
// `daysUntil` is days remaining to the event.
//
// Returns an array of `{ phase, focus, tips }` in chronological order, or [] if
// inputs are missing.
export const compressPhases = (phases, phaseOffset, daysUntil) => {
  if (!phases || !phaseOffset) return [];
  if (daysUntil === null || daysUntil === undefined) return [];
  // PHASE_OFFSET keys are in chronological order (12 months → week of). Walk
  // them in that order and only keep phases whose offset is still "in front"
  // of the planner — i.e. abs(offset) <= daysUntil. Then map each kept phase
  // back to its WORKFLOW_FOCUS entry, falling back to nearest later phase if
  // the type doesn't define every label.
  const orderedKeys = Object.keys(phaseOffset);
  const kept = orderedKeys.filter(k => Math.abs(phaseOffset[k]) <= daysUntil);
  return kept
    .map(phase => {
      if (phases[phase]) return { phase, ...phases[phase] };
      // walk forward to the next available phase definition
      const idx = orderedKeys.indexOf(phase);
      for (let i = idx + 1; i < orderedKeys.length; i++) {
        if (phases[orderedKeys[i]]) return { phase, ...phases[orderedKeys[i]] };
      }
      return null;
    })
    .filter(Boolean);
};

// Friendly urgency vocabulary for individual template tasks. These map onto
// the planner's mental model of "what does this task mean to me right now"
// rather than fighting the user with red overdue badges.
export const URGENCY_META = {
  do_now: {
    key: 'do_now',
    label: 'Do now',
    tone: 'danger',
    short: 'do now',
    explanation: 'This phase has already started — handle it first.',
  },
  standard: {
    key: 'standard',
    label: 'Fits plan',
    tone: 'accent',
    short: 'fits plan',
    explanation: 'Falls in the current or upcoming phase — handle when you reach it.',
  },
  risk_lost: {
    key: 'risk_lost',
    label: 'Consider replacing',
    tone: 'warn',
    short: 'consider swap',
    explanation: 'The standard timing window has passed — you can still do this, but a faster substitute may serve you better.',
  },
  skippable: {
    key: 'skippable',
    label: 'Can skip',
    tone: 'muted',
    short: 'can skip',
    explanation: 'Optional polish — safe to skip if the timeline is tight.',
  },
};

// Classify a single template task. A task lives at `task.week` (a key from
// PHASE_OFFSET). The classification depends on whether that phase is still
// reachable given the event date.
//
//   - If the phase is in the future or current → standard
//   - If the phase has barely slipped (offset is just behind now) → do_now
//     (we still want to surface it as the FIRST thing to handle)
//   - If the phase has slipped far past the typical "do it" window → risk_lost
//   - If the task has the word "favor", "tribute", "memory", "slideshow",
//     "playlist", "name badges", or "tip envelope" AND we're rush-compressed
//     → skippable (these are polish tasks)
//
// Returns { urgency, ...URGENCY_META[urgency] } so callers get the friendly
// label + tone with one lookup. Safe default: standard.
const POLISH_HINTS = [
  /\bfavor/i, /\btribute/i, /\bmemory/i, /\bslideshow/i, /\bplaylist/i,
  /\bname tag/i, /\bname badge/i, /\btip envelope/i, /\bplacard/i,
  /\bphoto display/i, /\brunner/i, /\bcenterpiece/i,
];
const isPolishTask = (task) =>
  POLISH_HINTS.some(re => re.test(task?.task || ''));

export const classifyTemplateTaskUrgency = (
  task,
  daysUntil,
  eventType,
  phaseOffset,
) => {
  if (!task || !phaseOffset || daysUntil === null || daysUntil === undefined || daysUntil < 0) {
    return { urgency: 'standard', ...URGENCY_META.standard };
  }
  const off = phaseOffset[task.week];
  if (off === undefined) {
    return { urgency: 'standard', ...URGENCY_META.standard };
  }
  const phaseDistance = Math.abs(off); // how many days before event this phase starts
  const level = getCompressionLevel(daysUntil, eventType);

  // Phase is still ahead → standard cadence
  if (phaseDistance <= daysUntil) {
    return { urgency: 'standard', ...URGENCY_META.standard };
  }

  // Phase has already started. How far past?
  const slipDays = phaseDistance - daysUntil;

  // Rush level + polish task → skippable
  if (level === 'rush' && isPolishTask(task)) {
    return { urgency: 'skippable', ...URGENCY_META.skippable };
  }

  // Slipped less than ~30 days → do it now (still the most-important
  // surviving signal from the standard template)
  if (slipDays <= 30) {
    return { urgency: 'do_now', ...URGENCY_META.do_now };
  }

  // Slipped significantly. BUT a behind-template phase is only genuinely "lost"
  // (→ overdue) when the event is in DEEP RUSH — no runway left to recover it.
  // With real lead time (a normal 6-month wedding is 'compressed', not rush),
  // these early phases are front-loaded CATCH-UP work the planner does first
  // (do_now), NOT missed deadlines. Without this gate, freshly creating a viable
  // 6-month event read as "most tasks overdue" — confusing and wrong. risk_lost
  // re-emerges naturally as the event approaches and the ratio drops into rush.
  if (level === 'rush') {
    return { urgency: 'risk_lost', ...URGENCY_META.risk_lost };
  }
  return { urgency: 'do_now', ...URGENCY_META.do_now };
};

// Composite summary for the intake banner + dashboards. Returns one object
// with everything a banner / strip / panel needs to render — saves callers
// from re-deriving level + meta + phase counts.
//
// Inputs:
//   event       — must expose .type and .date (date as YYYY-MM-DD).
//   daysUntil   — caller-computed days remaining (so we don't pull date utils).
//   workflowFocus — WORKFLOW_FOCUS map (passed in so this module stays
//                   independent of App.js's giant constants object).
//   phaseOffset   — PHASE_OFFSET map (same reason).
//
// Returns null when we can't form a useful summary (no date, past date).
export const getCompressedWorkflowSummary = (
  event,
  daysUntil,
  workflowFocus,
  phaseOffset,
) => {
  if (!event || !event.type || daysUntil === null || daysUntil === undefined || daysUntil < 0) {
    return null;
  }
  const level    = getCompressionLevel(daysUntil, event.type);
  if (!level) return null;
  const meta     = COMPRESSION_META[level] || COMPRESSION_META.standard;
  const std      = getStandardLeadDays(event.type);
  const ratio    = getCompressionRatio(daysUntil, event.type);
  const phases   = workflowFocus?.[event.type] || workflowFocus?.Birthday || {};
  const visible  = compressPhases(phases, phaseOffset, daysUntil);
  const totalPhases  = Object.keys(phases).length;
  const droppedCount = Math.max(0, totalPhases - visible.length);

  return {
    level,
    meta,
    daysUntil,
    standardLeadDays: std,
    ratio,
    visiblePhases:   visible,
    totalPhases,
    droppedPhaseCount: droppedCount,
  };
};

// Helper for callers that want to render a chip on an existing task row.
// Returns null when no chip is warranted (standard urgency on a standard
// timeline — don't pollute the row).
export const taskUrgencyChip = (task, daysUntil, eventType, phaseOffset) => {
  const u = classifyTemplateTaskUrgency(task, daysUntil, eventType, phaseOffset);
  if (u.urgency === 'standard') return null;
  return u;
};

// Sprint 57f.1: derive a single compression summary for one event from its
// existing timeline (which already carries .urgency snapshots from intake).
// This is the canonical signal Event Command + Home + Timeline all read from
// — no new urgency state, just derived counts and "is this significant?"
//
// `event` must expose .type, .date, and .timeline.
// `daysUntilFn` is a function that turns 'YYYY-MM-DD' → days remaining (we
// inject it so this module stays free of date utilities living in App.js).
// `phaseOffset` is the PHASE_OFFSET map (same reason).
//
// Returns null if the event has no date or is in the past. Otherwise:
//   {
//     level,           // 'standard' | 'tight' | 'compressed' | 'rush'
//     meta,            // COMPRESSION_META[level]
//     daysUntil,
//     doNow,           // tasks classified do_now (still open)
//     considerSwap,    // tasks classified risk_lost (still open)
//     canSkip,         // tasks classified skippable (still open)
//     totalUrgent,     // doNow.length + considerSwap.length
//     significant,     // true when Command/Home should surface this
//     headline,        // short planner-friendly string
//   }
//
// "significant" is the gate that prevents Command from yelling about every
// standard event and prevents Home from spamming standard timelines. The
// rule: compression level is non-standard AND there is at least one open
// do_now or risk_lost task left to act on.
export const deriveEventCompressionSummary = (event, daysUntilFn, phaseOffset) => {
  if (!event || !event.type || !event.date) return null;
  const days = typeof daysUntilFn === 'function'
    ? daysUntilFn(event.date)
    : (event._daysUntil ?? null);
  if (days === null || days === undefined || days < 0) return null;

  const level = getCompressionLevel(days, event.type);
  if (!level) return null;

  // Re-derive each task's urgency from the live event date + phase offsets.
  // Important: do NOT trust the stored `task.urgency` exclusively — the
  // planner may have changed the event date after intake, which would make
  // the snapshot stale. The stored field is a hint; the live classification
  // is the truth.
  const open = (event.timeline || []).filter(t => !t.done);
  const liveClassed = open.map(t => ({
    task: t,
    cls: classifyTemplateTaskUrgency(t, days, event.type, phaseOffset),
  }));

  const doNow        = liveClassed.filter(x => x.cls.urgency === 'do_now').map(x => x.task);
  const considerSwap = liveClassed.filter(x => x.cls.urgency === 'risk_lost').map(x => x.task);
  const canSkip      = liveClassed.filter(x => x.cls.urgency === 'skippable').map(x => x.task);
  const totalUrgent  = doNow.length + considerSwap.length;

  const significant = level !== 'standard' && totalUrgent > 0;

  let headline = null;
  if (significant) {
    if (doNow.length >= 1 && considerSwap.length >= 1) {
      headline = `Tight timeline — ${doNow.length} to do now, ${considerSwap.length} to consider swapping.`;
    } else if (doNow.length >= 1) {
      headline = doNow.length === 1
        ? 'Tight timeline — 1 task moved to the front.'
        : `Tight timeline — ${doNow.length} tasks moved to the front.`;
    } else if (considerSwap.length >= 1) {
      headline = considerSwap.length === 1
        ? 'Tight timeline — 1 long-lead task to consider swapping.'
        : `Tight timeline — ${considerSwap.length} long-lead tasks to consider swapping.`;
    }
  }

  return {
    level,
    meta: COMPRESSION_META[level] || COMPRESSION_META.standard,
    daysUntil: days,
    doNow,
    considerSwap,
    canSkip,
    totalUrgent,
    significant,
    headline,
  };
};
