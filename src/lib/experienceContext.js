// ─── Canonical Experience Context (Sprint PC-1) ───────────────────────────
// Platform Continuity: ONE runtime object every Host surface reads instead of
// independently re-deriving event understanding.
//
// This is NOT a new engine and NOT persistence. It is a pure composition
// function — every field is a passthrough to an engine that already exists
// (Sprint A's resolveEventIdentity, assembleRevealEngines' blocker/risk
// derivation, the legacy eventIdentity() meaning reader, playbookFoodPlan,
// effectiveRos). Calling it twice with the same inputs returns equivalent
// output — it is safe to call from any surface without a store or cache.
//
// HQ-3's #1 finding: Assemble Reveal computed real understanding and
// discarded it; Host Home re-derived identity using a DIFFERENT function
// (the legacy meaning reader) with no compound/complexity concept. The two
// surfaces agreed only by coincidence (same raw event fields), not by
// design. buildExperienceContext() is the fix: both surfaces now call the
// SAME function, so "what did we understand about this event" is answered
// identically everywhere, not independently reconstructed per screen.

import { resolveEventIdentity } from './eventIdentityEngine';
import { eventIdentity as legacyMeaningReader } from './eventIdentity';
import {
  deriveDecisionBlockers,
  deriveTopRisks,
  buildAssembleRevealStages,
} from './assembleRevealEngines';

// PC-1: canonical shape. Every category below has exactly one owner function
// (named in the comment); this module never reinterprets or recomputes that
// owner's reasoning — it only assembles their outputs into one object.
export function buildExperienceContext(event, profile, foodPP) {
  if (!event) return null;

  // Owner: lib/eventIdentityEngine.js — resolveEventIdentity()
  // Classification: primary/secondary type, compound, complexity, ceremony
  // components, confidence. Built from the SAME name-stripped free-text
  // signal AssembleReveal has used since Sprint IS-1 (avoids the type-name
  // self-echo false-positive that IS-1 fixed) plus the existing structured
  // secondaryType/honoree/theme fields.
  const typeWords = String((event && event.type) || '').toLowerCase().split(/\s+/).filter(Boolean);
  const nameSansType = String((event && event.name) || '')
    .split(/\s+/)
    .filter(w => !typeWords.includes(w.toLowerCase()))
    .join(' ');
  const freeText = [nameSansType, event.secondaryType, event.honoree, event.theme]
    .filter(Boolean).join('. ');
  let eventIdentityResult = null;
  try { eventIdentityResult = resolveEventIdentity(event, event.type, 'self', freeText); } catch { eventIdentityResult = null; }

  // Owner: lib/eventIdentity.js — eventIdentity() (legacy reader, renamed here
  // to make its distinct purpose explicit: this is HUMAN meaning — must-have
  // moment, feeling words, honoree story — never event TYPE classification.
  // PC-1 does not merge these two readers' jobs; it makes both consumable
  // from one place so no surface has to know which of the two to call.
  let humanContextResult = null;
  try { humanContextResult = legacyMeaningReader(event); } catch { humanContextResult = null; }

  // Owner: lib/assembleRevealEngines.js — deriveDecisionBlockers(), filtered
  // through event.decisionBlockerStatus — the SAME pattern as event.riskStatus
  // below (POP-1/WOW-1): a blocker the host already acknowledged/dismissed
  // doesn't keep reappearing in the canonical context. Each blocker type is
  // pushed at most once per deriveDecisionBlockers() call (verified: 4
  // independent `if` checks, none in a loop), so `.type` alone is a stable,
  // deterministic key here — same reasoning already relied on for risks below.
  let decisionBlockers = [];
  try {
    const allBlockers = deriveDecisionBlockers(event, eventIdentityResult) || [];
    const decisionBlockerStatus = event.decisionBlockerStatus || {};
    decisionBlockers = allBlockers.filter(b => !decisionBlockerStatus[b.type]);
  } catch { decisionBlockers = []; }

  // Owner: lib/assembleRevealEngines.js — deriveTopRisks(), filtered through
  // the same event.riskStatus loop HQ-2 wired into WhatCouldGoWrongPanel, so
  // a risk the host already dismissed/mitigated doesn't reappear in the
  // canonical context either — one status, read everywhere.
  let activeRisks = [];
  try {
    const allRisks = deriveTopRisks(event, eventIdentityResult) || [];
    const riskStatus = event.riskStatus || {};
    activeRisks = allRisks.filter(r => !riskStatus[r.type]);
  } catch { activeRisks = []; }

  // Owner: lib/assembleRevealEngines.js — buildAssembleRevealStages()
  // The exact same stage list AssembleReveal renders — "assembledState" so
  // any later surface can ask "what did the reveal actually show" instead
  // of re-deriving its own version of the same cards.
  let assembledState = [];
  try { assembledState = buildAssembleRevealStages(event, eventIdentityResult, profile, foodPP) || []; } catch { assembledState = []; }

  const confidence = eventIdentityResult ? eventIdentityResult.confidence : null;
  const reasoning = eventIdentityResult ? eventIdentityResult.canonicalDescription : null;
  const assumptions = eventIdentityResult ? (eventIdentityResult.missingClarifyingQuestions || []) : [];

  return {
    eventIdentity: eventIdentityResult,
    persona: null, // No persona resolver exists — Sprint A's parked resolvePersona()/resolveShell() were DELETED (dead under host-only, per IS-2; re-verified zero callers). Field kept null so consumers' shape is stable.
    complexity: eventIdentityResult ? eventIdentityResult.complexity : null,
    compound: eventIdentityResult ? !!eventIdentityResult.isCompound : false,
    humanContext: humanContextResult,
    relationshipContext: eventIdentityResult ? (eventIdentityResult.participants || []) : [],
    currentGoals: humanContextResult ? humanContextResult.success : [],
    currentPriorities: humanContextResult && humanContextResult.mustHaveMoment ? [humanContextResult.mustHaveMoment] : [],
    decisionBlockers,
    recommendations: assembledState,
    activeRisks,
    reasoning,
    confidence,
    assumptions,
    nextActions: decisionBlockers.map(b => b.reasoning).filter(Boolean),
    assembledState,
  };
}
