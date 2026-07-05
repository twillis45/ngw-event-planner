// ─── Assemble Reveal Stage Generation ─────────────────────────────────────
// F4 Enhancement: Intelligent stage orchestration
// Consumes: Event Identity, existing playbook engines, risk, vendor intelligence
// Outputs: Array of cards matching the unified contract

import { playbookFoodPlan, effectiveRos } from './playbooks';

// ─── Card Contract ─────────────────────────────────────────────────────────
// Every stage (identity, timeline, food, risks, blockers) uses this shape:
// {
//   key: string,              // 'identity', 'timeline', 'risks', etc.
//   icon: string,             // icon name
//   title: string,            // card label
//   what: string,             // assembled recommendation
//   why: string,              // reasoning
//   status: string,           // 'Ready' | 'Needs Clarification' | 'Needs Research' | 'Awaiting Decision'
//   nextDecision: string,     // decision that unlocks this (or null)
//   sourceEngines: string[],  // transparency
//   confidenceLabel: string,  // 'High confidence', 'We think so', etc.
//   mark: string              // optional: 'ready' | 'caution' | 'blocker'
// }

// ─── Tier 1: Identity Stage ───────────────────────────────────────────────
function buildIdentityStage(event, eventIdentity, persona) {
  if (!eventIdentity) return null;

  const {
    primaryEventType = 'Event',
    secondaryEventTypes = [],
    isCompound = false,
    complexity = 'standard',
    ceremonyComponents = [],
    participants = [],
    confidence = 0.75
  } = eventIdentity;

  // Translate to natural language
  const eventDesc = isCompound
    ? `A ${primaryEventType.toLowerCase()} + ${secondaryEventTypes.map(t => t.toLowerCase()).join(' + ')}.`
    : `A ${primaryEventType.toLowerCase()}.`;

  const compoundExplanation = isCompound
    ? ' Two milestones, one event. We\'ll handle both.'
    : '';

  const ceremonyNote = ceremonyComponents.length > 0 && isCompound
    ? ' Formal ceremony first, then celebration.'
    : '';

  const participantNote = participants.length > 1
    ? ` Guests span ${participants.join(' and ')}.`
    : '';

  const confidenceWord = confidence >= 0.85 ? 'High confidence' : 'We think so';

  return {
    key: 'identity',
    icon: 'sparkles',
    title: 'Your Event',
    what: eventDesc + compoundExplanation,
    why: ceremonyNote.length > 0 || participantNote.length > 0
      ? `We recognized ${primaryEventType}.${ceremonyNote}${participantNote}`
      : `We recognized ${primaryEventType}. Planning starts here.`,
    status: 'Ready',
    nextDecision: isCompound
      ? 'Confirm: ceremony timing (before, during, or after celebration)?'
      : null,
    sourceEngines: ['Event Identity Engine'],
    confidenceLabel: confidenceWord,
    mark: 'ready'
  };
}

// ─── Tier 2: Decision Blockers ─────────────────────────────────────────────
function deriveDecisionBlockers(event, eventIdentity) {
  const blockers = [];

  // RULE: Compound events always surface timing decision
  if (eventIdentity && eventIdentity.isCompound) {
    if (!event.ceremonyTiming) {
      blockers.push({
        type: 'ceremony-timing',
        urgency: 'critical',
        reasoning: 'Ceremony timing affects vendors, timeline, guest experience'
      });
    }
  }

  // RULE: No venue = everything blocks.
  // At-home carve-out (POP-1 continuity): the host's "At home · your place"
  // path (venueKind === 'home') stores its location as venueCity — it never
  // writes event.venue — so requiring event.venue left at-home hosts with a
  // permanent unresolvable blocker. At-home resolves on the at-home path's own
  // required field (city). Every other venue model (venueKind 'venue'/unset,
  // planner events) still requires event.venue exactly as before.
  const venueResolved = (event.venueKind === 'home')
    ? !!String(event.venueCity || '').trim()
    : !!(event.venue && String(event.venue).trim());
  if (!venueResolved) {
    blockers.push({
      type: 'venue-selection',
      urgency: 'critical',
      reasoning: 'Venue unlocks vendors, timeline, logistics'
    });
  }

  // RULE: No confirmed guest count = budget is meaningless
  // IS-1 fix: the event object stores this as guestEstimate at creation time
  // (App.js NewEventModal) and guestCount once locked later (HostHome/Guests tab).
  // Match the app's own resolution order (see HostHome's guestCount computation)
  // instead of reading guestCount alone, which is unset for every fresh event.
  const resolvedGuestCount = Number(event.guestCount) || Number(event.guestEstimate) || (event.guests && event.guests.length) || 0;
  if (!resolvedGuestCount) {
    blockers.push({
      type: 'guest-count-confirmation',
      urgency: 'high',
      reasoning: 'Guest count scales budget, menu, logistics'
    });
  }

  // RULE: Formal ceremony without dress code = clarification needed
  if (eventIdentity && eventIdentity.ceremonyComponents && eventIdentity.ceremonyComponents.includes('formal-salute')) {
    if (!event.dressCode || (typeof event.dressCode === 'string' && !event.dressCode.trim())) {
      blockers.push({
        type: 'dress-code-confirmation',
        urgency: 'medium',
        reasoning: 'Military formality + guest expectations = miscommunication risk'
      });
    }
  }

  return blockers;
}

function buildBlockerStage(blocker) {
  const blockerCopy = {
    'ceremony-timing': {
      title: 'Ceremony Timing',
      what: 'When does the ceremony happen? Before, during, or after the celebration?',
      why: 'This decision cascades: it affects your timeline, guest experience, vendor sequence, and risk profile.',
      nextDecision: 'Choose the timing.'
    },
    'venue-selection': {
      title: 'Venue',
      what: 'Where is the event?',
      why: 'Everything depends on venue: vendors, timeline, logistics, weather contingency.',
      nextDecision: 'Choose or confirm the venue.',
      // POP-1 continuity: route to the exact field that resolves this blocker
      // (same {tab, focusField} convention as every other deep-link CTA).
      route: { tab: 'Event Details', focusField: 'event-venue' }
    },
    'guest-count-confirmation': {
      title: 'Guest Count',
      what: 'How many guests?',
      why: 'Every other number (budget, food, seating) depends on this.',
      nextDecision: 'Confirm the headcount.',
      route: { tab: 'Guests', focusField: 'guests-entry' }
    },
    'dress-code-confirmation': {
      title: 'Dress Code',
      what: 'What should guests wear?',
      why: 'Formal ceremony + casual celebration = guests will be confused. Clarity here prevents day-of friction.',
      nextDecision: 'Decide: all formal, all casual, or different zones?'
    }
  };

  const copy = blockerCopy[blocker.type] || {
    title: 'Decision Needed',
    what: blocker.type,
    why: blocker.reasoning,
    nextDecision: 'Make this choice.'
  };
  // ceremony-timing / dress-code have no in-app field to land on yet — those
  // stay routeless (the CTA simply doesn't render) rather than lying about a
  // destination. Never invent a route.

  return {
    key: `blocker-${blocker.type}`,
    // POP-1/WOW-1: additive field so a consumer (AssembleReveal's Acknowledge/
    // Dismiss buttons) can identify which stages are blocker stages and which
    // blocker.type to write a status against, without parsing the `key` string.
    blockerType: blocker.type,
    // POP-1 continuity: where this blocker gets RESOLVED (not just acknowledged).
    // null when no in-app destination exists — consumers render no CTA then.
    route: copy.route || null,
    icon: 'alert',
    title: copy.title,
    what: copy.what,
    why: copy.why,
    status: 'Awaiting Decision',
    nextDecision: copy.nextDecision,
    sourceEngines: ['Decision Derivation', 'Event Identity'],
    confidenceLabel: 'Required',
    mark: blocker.urgency === 'critical' ? 'blocker' : 'caution'
  };
}

// ─── Tier 3: Planning Domains ──────────────────────────────────────────────
// HQ-2 P0-1: `foodPP` is the SAME resolved price-factor object every other food-cost
// surface (Budget, Food tab, HostHome, PlanBudgetRollup) computes via useFoodPriceFactor
// — passed in by the caller (a hook can't run inside this plain function). Passing
// `null` here silently priced Reveal's Food/Shopping cards at the national average
// while every other screen showed the regional figure for the same event.
function assemblePlanningDomains(event, profile, foodPP) {
  const domains = [];

  // === TIMELINE ===
  try {
    const ros = effectiveRos(event) || [];
    if (ros.length > 0) {
      domains.push({
        type: 'timeline',
        data: { cueCount: ros.length, ros }
      });
    }
  } catch {}

  // === FOOD ===
  try {
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.itemCount > 0) {
      domains.push({
        type: 'food',
        data: { fp, guestEstimate: fp.guests }
      });
    }
  } catch {}

  // === SHOPPING ===
  try {
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.list && fp.list.length > 0) {
      domains.push({
        type: 'shopping',
        data: { fp, itemCount: fp.itemCount }
      });
    }
  } catch {}

  // === GUESTS (if meaningful) ===
  try {
    const guestCount = Number(event.guestCount) || Number(event.guestEstimate) || (event.guests && event.guests.length) || 0;
    if (guestCount > 0) {
      domains.push({
        type: 'guests',
        data: { guestCount, rsvpCount: (event.guests || []).filter(g => g && g.rsvp === 'Yes').length || 0 }
      });
    }
  } catch {}

  // === BUDGET (if set) ===
  try {
    const budgetSet = (event.budget || []).reduce((s, r) => s + (Number(r.budgeted) || 0), 0) > 0;
    if (budgetSet || Number(event.totalBudget) > 0) {
      domains.push({
        type: 'budget',
        data: { totalBudget: event.totalBudget, categories: event.budget || [] }
      });
    }
  } catch {}

  // === VENDORS (if any named) ===
  try {
    const namedVendors = (event.vendors || []).filter(v => v && v.name && String(v.name).trim());
    if (namedVendors.length > 0) {
      domains.push({
        type: 'vendors',
        data: { vendorCount: namedVendors.length, vendors: namedVendors }
      });
    }
  } catch {}

  return domains;
}

function buildDomainStage(domain) {
  const stageMeta = {
    timeline: {
      icon: 'calendar',
      title: 'Building Your Day',
      buildWhat: (data) => `${data.cueCount} moments, hour by hour.`,
      buildWhy: (data) => 'Your timeline is ready to fill—every moment can be adjusted as plans crystallize.',
      status: 'Ready to fill'
    },
    food: {
      icon: 'cloche',
      title: 'Sizing the Food & Drink',
      buildWhat: (data) => `${data.fp.itemCount} item${data.fp.itemCount === 1 ? '' : 's'} for ${data.guestEstimate} guests.`,
      buildWhy: (data) => 'Menu is built. Quantities scale with headcount. Choose sourcing next.',
      status: 'Ready to fill'
    },
    shopping: {
      icon: 'store',
      title: 'Writing Your Shopping List',
      buildWhat: (data) => `${data.itemCount} item${data.itemCount === 1 ? '' : 's'}, ready to check off.`,
      buildWhy: (data) => 'Every ingredient mapped to a store and price. Check items off as you shop.',
      status: 'Ready'
    },
    guests: {
      icon: 'people',
      title: 'Guest Planning',
      buildWhat: (data) => `${data.guestCount} guest${data.guestCount === 1 ? '' : 's'}${data.rsvpCount > 0 ? `, ${data.rsvpCount} confirmed` : ''}.`,
      buildWhy: (data) => 'Guest list built. RSVP tracking live.',
      status: 'In progress'
    },
    budget: {
      icon: 'wallet',
      title: 'Budget',
      buildWhat: (data) => `$${(Number(data.totalBudget) || 0).toLocaleString()} allocated across ${data.categories.length} categories.`,
      buildWhy: (data) => 'Budget is set and live. Track spending in real time.',
      status: 'Ready'
    },
    vendors: {
      icon: 'briefcase',
      title: 'Vendors',
      buildWhat: (data) => `${data.vendorCount} vendor${data.vendorCount === 1 ? '' : 's'} assigned.`,
      buildWhy: (data) => 'Vendor list built. Confirm each one, then track deliverables.',
      status: 'Ready to confirm'
    }
  };

  const meta = stageMeta[domain.type];
  if (!meta) return null;

  return {
    key: domain.type,
    icon: meta.icon,
    title: meta.title,
    what: meta.buildWhat(domain.data),
    why: meta.buildWhy(domain.data),
    status: meta.status,
    nextDecision: null,
    sourceEngines: ['Playbook Engine'],
    confidenceLabel: 'Assembled',
    mark: 'ready'
  };
}

// ─── Tier 4: Risk Preview ─────────────────────────────────────────────────
function deriveTopRisks(event, eventIdentity) {
  const risks = [];

  if (!eventIdentity) return [];

  // RULE: Compound events often have ceremony/celebration confusion
  if (eventIdentity.isCompound) {
    risks.push({
      type: 'compound-confusion',
      severity: 'medium',
      description: 'Guest expectations for ceremony vs. celebration formality will diverge if not clarified early.',
      mitigation: 'Clarity on dress code + timing cascades to reduce all downstream friction.'
    });
  }

  // RULE: Outdoor + ceremony = weather
  if (eventIdentity.ceremonyComponents && eventIdentity.ceremonyComponents.includes('formal-salute')) {
    const daysUntil = (() => {
      try {
        const d = new Date(event.date + 'T00:00:00');
        const now = new Date();
        return Math.floor((d - now) / (1000 * 60 * 60 * 24));
      } catch {
        return null;
      }
    })();

    if (daysUntil !== null && daysUntil > 0 && daysUntil <= 30 && !event.indoorVenue) {
      risks.push({
        type: 'weather-ceremony',
        severity: 'medium',
        description: 'Outdoor ceremony + formal dress code = weather is not a small risk.',
        mitigation: 'Plan contingency now: indoor backup, tent rental, etc.'
      });
    }
  }

  // RULE: Large guest count + limited timeline
  const guestCount = event.guestCount || (event.guests && event.guests.length) || 0;
  const daysUntil = (() => {
    try {
      const d = new Date(event.date + 'T00:00:00');
      const now = new Date();
      return Math.floor((d - now) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  })();

  if (guestCount > 100 && daysUntil !== null && daysUntil < 30) {
    risks.push({
      type: 'compression',
      severity: 'high',
      description: `${guestCount} guests in ${daysUntil} days is tight. Vendors book fast.`,
      mitigation: 'Confirm top vendors (venue, catering, photography) this week.'
    });
  }

  // Return top 1–3 by severity
  return risks.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)).slice(0, 3);
}

function buildRiskStage(topRisks) {
  if (!topRisks || topRisks.length === 0) return null;

  const riskExplanations = topRisks.map(r => r.description).join(' And: ');
  const mitigations = topRisks.map(r => r.mitigation).join(' Also: ');

  return {
    key: 'risks',
    icon: 'alert',
    title: 'Watch Out',
    what: riskExplanations,
    why: 'These aren\'t fears—they\'re patterns we see in events like yours.',
    status: 'Needs Research',
    nextDecision: mitigations,
    sourceEngines: ['Risk Engine', 'Event Identity'],
    confidenceLabel: 'We can help',
    mark: 'caution'
  };
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────
export function buildAssembleRevealStages(event, eventIdentity, profile, foodPP) {
  if (!event) return [];

  const stages = [];

  // Tier 1: Identity (always first)
  try {
    const identityStage = buildIdentityStage(event, eventIdentity, null);
    if (identityStage) stages.push(identityStage);
  } catch (e) {
    console.error('[Reveal] Identity stage error:', e);
  }

  // Tier 2: Decision Blockers
  try {
    const blockers = deriveDecisionBlockers(event, eventIdentity);
    blockers.forEach(b => {
      const blockerStage = buildBlockerStage(b);
      if (blockerStage) stages.push(blockerStage);
    });
  } catch (e) {
    console.error('[Reveal] Blocker stages error:', e);
  }

  // Tier 3: Planning Domains
  try {
    const domains = assemblePlanningDomains(event, profile, foodPP);
    domains.forEach(d => {
      const domainStage = buildDomainStage(d);
      if (domainStage) stages.push(domainStage);
    });
  } catch (e) {
    console.error('[Reveal] Domain stages error:', e);
  }

  // Tier 4: Risk Preview
  try {
    const topRisks = deriveTopRisks(event, eventIdentity);
    const riskStage = buildRiskStage(topRisks);
    if (riskStage) stages.push(riskStage);
  } catch (e) {
    console.error('[Reveal] Risk stage error:', e);
  }

  return stages.filter(Boolean);
}

// POP-1 continuity: the ongoing (post-Reveal) view of unresolved decision
// blockers. Pure composition of two existing functions — ctx.decisionBlockers
// (already filtered through event.decisionBlockerStatus by
// buildExperienceContext, so acknowledged/dismissed blockers never appear,
// exactly matching Reveal's behavior) mapped through buildBlockerStage (the
// same title/what/nextDecision/route copy Reveal renders). Not a new engine:
// no derivation, no state, no new copy.
export function unresolvedBlockerStages(ctx) {
  const blockers = (ctx && Array.isArray(ctx.decisionBlockers)) ? ctx.decisionBlockers : [];
  return blockers.map(b => { try { return buildBlockerStage(b); } catch { return null; } }).filter(Boolean);
}

// Export for testing
export {
  buildIdentityStage,
  deriveDecisionBlockers,
  buildBlockerStage,
  assemblePlanningDomains,
  buildDomainStage,
  deriveTopRisks,
  buildRiskStage
};
