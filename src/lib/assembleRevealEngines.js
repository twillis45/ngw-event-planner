// ─── Assemble Reveal Stage Generation ─────────────────────────────────────
// F4 Enhancement: Intelligent stage orchestration
// Consumes: Event Identity, existing playbook engines, risk, vendor intelligence
// Outputs: Array of cards matching the unified contract

import { playbookFoodPlan, effectiveRos } from './playbooks';
// Was: Math.floor((eventMidnight - new Date()) / 86400000) — a floor over a diff whose
// right side still carried the wall clock, so for most of every day it reported one day
// FEWER than remained, and the 30-day risk thresholds below fired a day early.
import { daysUntil as daysToEvent, spanNights } from './dates';
import { venueFor } from './venueFor';
import { lodgingIntel, lodgingKitchen } from './lodgingIntel';
import { foodSpanText } from './foodSpan';

// ─── ONE HEADCOUNT (host ruling "single points of truth", 2026-07-29) ───────
// This file resolved the guest count in three places: once for the blockers
// rule, once inline for the guests stage, and — differently — for the food
// stage, which printed the food plan's own planned-for figure instead. On a
// "45 people" event the reveal therefore showed "6 items for 47 guests" three
// lines above "45 guests": two headcounts on one screen, on the screen whose
// closing line promises "nothing made up". Neither number was wrong; having
// two was. The 47 is a DERIVATION (buy to the high end of likely attendance so
// the host doesn't run short) and belongs to the Food surface that owns it.
// Every stage here now reads this one resolver, in the app's own resolution
// order — guestCount once locked, else the creation-time estimate, else the
// roster length (see HostHome's computation).
export const resolveGuestCount = (event) => {
  const ev = event || {};
  return Number(ev.guestCount) || Number(ev.guestEstimate) || (ev.guests && ev.guests.length) || 0;
};

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
//   confidenceLabel: string,  // 'High confidence', 'Fairly confident', etc.
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
  // "A anniversary." — driven 2026-07-29 on a real create. The article was
  // hardcoded, so every vowel-initial type (anniversary, engagement, open house,
  // induction) read wrong on the first screen of the app.
  const article = (word) => (/^[aeiou]/i.test(String(word || '').trim()) ? 'An' : 'A');
  const eventDesc = isCompound
    ? `${article(primaryEventType)} ${primaryEventType.toLowerCase()} + ${secondaryEventTypes.map(t => t.toLowerCase()).join(' + ')}.`
    : `${article(primaryEventType)} ${primaryEventType.toLowerCase()}.`;

  const compoundExplanation = isCompound
    ? ' Two milestones, one event. I\'ll plan both.'
    : '';

  const ceremonyNote = ceremonyComponents.length > 0 && isCompound
    ? ' Formal ceremony first, then celebration.'
    : '';

  const participantNote = participants.length > 1
    ? ` Guests span ${participants.join(' and ')}.`
    : '';

  const confidenceWord = confidence >= 0.85 ? 'High confidence' : 'Fairly confident';

  return {
    key: 'identity',
    icon: 'sparkles',
    title: 'Your Event',
    what: eventDesc + compoundExplanation,
    why: ceremonyNote.length > 0 || participantNote.length > 0
      ? `I recognized ${primaryEventType}.${ceremonyNote}${participantNote}`
      : `I recognized ${primaryEventType}. Planning starts here.`,
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
  // path (kind 'home') stores its location in the city field — it never
  // writes the venue name — so requiring one left at-home hosts with a
  // permanent unresolvable blocker. At-home resolves on the at-home path's own
  // required field (city). Every other venue model (venueKind 'venue'/unset,
  // planner events) still requires the venue name exactly as before.
  // ONE venue reader (venueFor): home needs a REAL city (the CITY-LEAK gate
  // rides inside — a polluted venueCity no longer fakes a resolved venue);
  // everything else needs a name.
  const vf = venueFor(event);
  const venueResolved = vf.isHome ? !vf.needsCityForWeather : !!vf.name;
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
  // Resolution order now lives in resolveGuestCount (module head) so this rule and
  // the stages below cannot drift apart.
  const resolvedGuestCount = resolveGuestCount(event);
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
      nextDecision: 'Choose the timing.',
      // No in-app tab/field to ROUTE to (route stays null, below) — but this is
      // a plain 3-way pick with nowhere else it needs to live, so it resolves
      // inline on the card itself rather than being a dead-end instruction with
      // no way to act on it. fieldKey names the exact event field it writes.
      fieldKey: 'ceremonyTiming',
      options: [
        { value: 'before', label: 'Before the celebration' },
        { value: 'during', label: 'During the celebration' },
        { value: 'after',  label: 'After the celebration' },
      ],
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
  // dress-code has no in-app field to land on and no simple fixed option set —
  // it stays routeless (the CTA simply doesn't render) rather than lying about
  // a destination. Never invent a route. ceremony-timing is different: it's a
  // plain 3-way pick with nowhere else that needs to live, so it carries
  // fieldKey/options and resolves inline on the card (see App.js/HostShellV2
  // consumers) instead of being a dead-end instruction with no way to act on
  // it — same "never fake it" principle, opposite resolution.

  return {
    key: `blocker-${blocker.type}`,
    // POP-1/WOW-1: additive field so a consumer (AssembleReveal's Acknowledge/
    // Dismiss buttons) can identify which stages are blocker stages and which
    // blocker.type to write a status against, without parsing the `key` string.
    blockerType: blocker.type,
    // POP-1 continuity: where this blocker gets RESOLVED (not just acknowledged).
    // null when no in-app destination exists — consumers render no CTA then.
    route: copy.route || null,
    // Inline resolution for simple fixed-choice blockers (see comment above).
    // null for anything without a real, non-invented set of options.
    fieldKey: copy.fieldKey || null,
    options: copy.options || null,
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

  // === GUESTS — FIRST, BECAUSE EVERY OTHER NUMBER IS SIZED FROM IT ─────────
  // Driven 2026-08-05: the reveal announced "4 items for 10 guests" three
  // stages before it announced the ten guests. The count is not one more
  // domain among seven — it is the input the food, the shopping and the day
  // are all measured against, and the food stage already carries a comment
  // about the confusion of two headcounts appearing near each other. Telling
  // the story in the order the plan was actually derived is what makes "all of
  // this came straight from your answers" legible rather than merely true.
  // === GUESTS (if meaningful) ===
  try {
    const guestCount = resolveGuestCount(event);
    if (guestCount > 0) {
      domains.push({
        type: 'guests',
        data: { guestCount, rsvpCount: (event.guests || []).filter(g => g && g.rsvp === 'Yes').length || 0 }
      });
    }
  } catch {}

  // === LODGING (destination only — and BEFORE food, because it gates food) ===
  // The reveal named food, shopping, guests, budget and vendors but never
  // lodging, so on a destination event the one decision that blocks the food
  // plan was the one the reveal skipped. dest_lodging declares
  // blocks:['vendors','food'] (playbooks/index.js) and phaseProgress ranks the
  // lodging axis at priority 4 — above location and food. Ordering here mirrors
  // that: whoever reads the reveal top-to-bottom meets the first domino first.
  try {
    if (event && event.isDestination === true) {
      let chosen = null;
      try { chosen = (lodgingIntel(event) || {}).chosen || null; } catch { /* intel is best-effort */ }
      domains.push({
        type: 'lodging',
        data: {
          stayLabel: String((chosen && chosen.label) || '').trim(),
          nights: spanNights(event) || 0,
          // true | false | null — null is NOT TOLD, and stays null here.
          kitchen: lodgingKitchen(event)
        }
      });
    }
  } catch {}

  // === FOOD ===
  try {
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.itemCount > 0) {
      domains.push({
        type: 'food',
        // guestCount = the host's headcount (the truth). planFor = what the plan
        // BUYS for (sizingGuests' plan-to ceiling). Both ride along so the stage
        // can state the first and explain the second — see buildDomainStage.food.
        data: {
          fp,
          guestCount: resolveGuestCount(event),
          planFor: Number(fp.guests) || 0,
          spanNote: foodSpanText(event)
        }
      });
    }
  } catch {}

  // === SHOPPING ===
  try {
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.list && fp.list.length > 0) {
      domains.push({
        type: 'shopping',
        data: { fp, itemCount: fp.itemCount, spanNote: foodSpanText(event) }
      });
    }
  } catch {}

  // === THE DAY — LAST OF THE PLANNING BEATS, because it is assembled FROM
  // them. Driven 2026-08-05: the day used to open the reveal, promising 11
  // moments before the count, the stay and the food that shape them had been
  // named. Revealed here it reads as the culmination of her answers rather
  // than a flourish that arrives ahead of its own inputs.
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
    lodging: {
      icon: 'home',
      title: 'Where Everyone Stays',
      // Never guesses a stay and never invents a night count: an unpicked stay
      // says so. The span is the host's own dates, not an assumption.
      buildWhat: (data) => {
        const n = Number(data.nights) || 0;
        const nightsPhrase = n > 0 ? `${n} night${n === 1 ? '' : 's'}` : '';
        if (data.stayLabel) return nightsPhrase ? `${data.stayLabel} · ${nightsPhrase}.` : `${data.stayLabel}.`;
        return nightsPhrase ? `Not picked yet · ${nightsPhrase} to cover.` : 'Not picked yet.';
      },
      // The kitchen fact is WHY this sorts first: it decides whether a shopping
      // list is the main artifact or meaningless (lodging→food audit,
      // 2026-08-03). null means the host genuinely has not been asked — that
      // reads as the open question it is, not as a hotel.
      buildWhy: (data) => {
        if (data.kitchen === true) return 'A kitchen means the food plan is a grocery run, not reservations.';
        if (data.kitchen === false) return 'No kitchen means the food plan is reservations, not a grocery run.';
        return 'Where everyone sleeps decides the food plan — so this one comes first.';
      },
      status: (data) => (data.stayLabel ? 'Ready' : 'Awaiting Decision')
    },
    food: {
      icon: 'cloche',
      title: 'Sizing the Food & Drink',
      // ONE HEADCOUNT, AND THE OVERAGE NAMED AS AN ESTIMATE (frames 16-17 audit,
      // driven 2026-07-29; host rulings "single points of truth" then "keep the
      // derivation for the overage, just be consistent so they understand what
      // is an estimate").
      // This used to print the food plan's internal planned-for figure as if it
      // were the headcount, so on "45 people" the stage read "6 items for 47
      // guests" three lines above Guest Planning's "45 guests" — two headcounts,
      // no way to tell which was theirs, on the screen that promises "nothing
      // made up".
      // The 47 is real and worth keeping: sizingGuests' plan-to ceiling, what to
      // BUY so the host doesn't run short. It is just not a headcount. So the
      // headline states the ONE headcount, and the line beneath names the
      // overage in its own words, marked as the estimate it is.
      buildWhat: (data) => `${data.fp.itemCount} item${data.fp.itemCount === 1 ? '' : 's'} for ${data.guestCount} guests.`,
      // Across a multi-day span that item count sizes ONE gathering, not the
      // trip (foodSpan.js). The scope is stated rather than the quantities
      // silently multiplied — nobody has researched the multi-day meal model.
      buildWhy: (data) => {
        const base = data.planFor > data.guestCount
          ? `Menu is built. Quantities are an estimate — sized for about ${data.planFor} so you don't run short if more show up. Choose sourcing next.`
          : 'Menu is built. Quantities are an estimate — they scale with your head count. Choose sourcing next.';
        return data.spanNote ? `${base} ${data.spanNote}` : base;
      },
      status: 'Ready to fill'
    },
    shopping: {
      icon: 'store',
      title: 'Writing Your Shopping List',
      buildWhat: (data) => `${data.itemCount} item${data.itemCount === 1 ? '' : 's'}, ready to check off.`,
      // Same rule as the food stage: a price the host hasn't paid yet is an
      // ESTIMATE, and this screen says so rather than implying a looked-up
      // figure. "mapped to a store and price" read as precision it doesn't have.
      // When we KNOW there is no kitchen, a grocery list is not the artifact
      // for the stay — say so instead of presenting it as the plan. Untold
      // stays untold (foodSpan.js).
      buildWhy: (data) => {
        const base = 'Every ingredient mapped to a store, with an estimated price. Check items off as you shop.';
        return data.spanNote ? `${base} ${data.spanNote}` : base;
      },
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
      // "across 0 categories" read as broken (host 2026-07-27) — when no
      // categories exist yet, say the honest simpler thing instead.
      buildWhat: (data) => (data.categories.length > 0
        ? `$${(Number(data.totalBudget) || 0).toLocaleString()} allocated across ${data.categories.length} categories.`
        : `$${(Number(data.totalBudget) || 0).toLocaleString()} set — ready to allocate.`),
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
    // Most stages carry a fixed status; lodging's depends on whether a stay is
    // actually picked, so a function is allowed here.
    status: typeof meta.status === 'function' ? meta.status(domain.data) : meta.status,
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
    const daysUntil = daysToEvent(event.date);

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
  const daysUntil = daysToEvent(event.date);

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
    why: 'These aren\'t fears — they\'re patterns I see in events like yours.',
    status: 'Needs Research',
    nextDecision: mitigations,
    sourceEngines: ['Risk Engine', 'Event Identity'],
    confidenceLabel: 'Worth planning for',
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
