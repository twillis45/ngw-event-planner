// Single source of truth for "is this planning task already handled by real event state?"
//
// Lifted + generalized from CommandCenter's `_stTask` so that What's-left, Next Up, and
// readiness all share ONE satisfaction predicate. Doctrine (project_single_source_task_
// doctrine): derive, don't store; self-updating; current-only; no manual checkoff.
//
// Conservative: returns true ONLY when we can prove from event facts that the task is
// handled — unmatched tasks fall through to false (so a manual `done` flag, used as an
// override on top of this, still covers the long tail we can't yet prove).
//
// CHOICES ARE ENGINE INPUTS: a caterer task is "satisfied" (drops out of the plan) when
// the host chose to self-provide food (cook / potluck) — there is no caterer in this
// event — OR when a real vendor exists. This is what makes a sourcing toggle ripple
// through the plan / tasks / readiness.

// True when the host's food sourcing choice means no caterer is part of this event.
export function cateringSelfProvided(event) {
  const src = String((event && event.foodChoices && event.foodChoices.sourcing) || '').toLowerCase();
  if (!src) return false;
  return /host cooks|potluck|cook (it )?(yourself|everything|the mains)|\bdiy\b|self[-\s]?cater/.test(src);
}

// True when a real, named vendor is attached to the event.
export function hasNamedVendor(event) {
  return Array.isArray(event && event.vendors) && event.vendors.some((v) => v && String(v.name || '').trim());
}

// taskSatisfied(event, task) → boolean. `task` may be a timeline task ({task}) or a
// subtask ({text}). Keyword-matched against the same domains the next-step engine routes
// on, so the surfaces can never disagree about whether a task is handled.
export function taskSatisfied(event, task) {
  if (!event || !task) return false;
  const s = String(task.task || task.text || '').toLowerCase();
  if (!s) return false;
  const guests     = Array.isArray(event.guests) ? event.guests : [];
  const hasGuests  = (Number(event.guestCount) || Number(event.guestEstimate) || guests.length) > 0;
  const hasBudget  = (Number(event.totalBudget) || 0) > 0 || (Array.isArray(event.budget) && event.budget.some((b) => Number(b && b.budgeted) > 0));
  const hasVenue   = !!String(event.venue || '').trim() && !/^(tbd|tba)$/i.test(String(event.venue).trim());
  const hasVendors = hasNamedVendor(event);
  const hasFood    = (event.foodChoices && Object.keys(event.foodChoices).length > 0) || (Array.isArray(event.foodAdd) && event.foodAdd.length > 0);
  const dateSet    = !!String(event.date || '').trim() && !/^(tbd|tba)$/i.test(String(event.date).trim());

  // "Set the date…" composites (playbook setup milestones like "Set date, headcount, menu")
  // anchor on the date — they are handled the moment the date is set. The atomic headcount /
  // food dominoes then carry on their own (eventPlan decomposes the composite), so the stale
  // bundled string never lingers in a "what's left" list once event.date exists. FIRST so it
  // wins over the generic headcount match below.
  if (/^set\b.*\bdate\b/.test(s) || /\bset (the |a )?date\b/.test(s))         return dateSet;
  // Caterer-specific FIRST — before the generic guest/headcount match — so a sourcing
  // toggle gates catering tasks even when they also say "headcount" (e.g. "confirm
  // catering headcount"). Satisfied when a real caterer exists OR the host self-provides.
  if (/cater/.test(s))                                                       return hasVendors || cateringSelfProvided(event);
  if (/invite|rsvp|\bguest|head\s?count|who.?s coming|adult|kids?\b/.test(s)) return hasGuests;
  if (/budget|spending plan|set (a |the )?(cost|spend)/.test(s))             return hasBudget;
  if (/venue|location|book.*(space|hall|room|venue)|secure.*(space|venue)/.test(s)) return hasVenue;
  if (/vendor|photograph|\bdj\b|florist|hire|book a /.test(s))               return hasVendors;
  if (/menu|food plan|what to (cook|serve|make)|plan the food/.test(s))       return hasFood;
  return false;
}

// effectiveDone — the value every "what's left" surface and readiness should use instead
// of the raw stored `task.done`. A task is done if the host ticked it OR real event state
// proves it handled. This is the bridge that retires manual checkoff as a source of truth.
export function effectiveDone(event, task) {
  return !!(task && task.done) || taskSatisfied(event, task);
}
