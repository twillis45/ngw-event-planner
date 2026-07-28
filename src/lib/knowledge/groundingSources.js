// ─── Grounding provenance — the CITED sources behind the playbooks, unified ──
//
// Host directive (2026-07-16): "always hold on to the provenance of the sources"
// + "make sure we have a field for the sources in the admin view for the playbooks."
//
// Distinct from sourceCatalog.js (which rates provider FAMILIES by reliability):
// this unions the per-axis *_SOURCES registries — the exact citations a grounded
// decision points at via its `sources` ids — so the admin can audit, in ONE place,
// every source the engine actually stands on. Nothing grounded without a traceable id.

import { TIMING_SOURCES } from './timingProvenance';
import { COST_SOURCES } from './costProvenance';
import { QTY_SOURCES } from './quantityProvenance';
import { CULTURAL_SOURCES } from './culturalContext';
import { ACCESSIBILITY_SOURCES } from './accessibilityContext';
import { LEGAL_SOURCES } from './legalContext';
import { VENUE_SOURCES } from './venueContext';
import { WEATHER_SOURCES } from './weatherContext';
import { HUMAN_SOURCES } from './humanContext';
import { DIETARY_SOURCES } from './dietaryContext';
import { BUDGET_SOURCES } from './budgetContext';
import { CHILDCARE_SOURCES } from './childcareContext';
import { MILITARY_SOURCES } from './militaryRetirement';
import { DESTINATION_SOURCES } from './destinationContext';
import { INCIDENT_SOURCES } from './incidentContext';
import { FOOD_SAFETY_SOURCES } from './foodSafetyContext';
import { FIRE_SAFETY_SOURCES } from './fireSafetyContext';
import { BOOKING_RISK_SOURCES } from './bookingRiskContext';
import { normalizeTier, tierInfo } from './groundingDoctrine';

const REGISTRIES = [
  ['Timing', TIMING_SOURCES],
  ['Cost', COST_SOURCES],
  ['Quantity', QTY_SOURCES],
  ['Cultural / religious', CULTURAL_SOURCES],
  ['Accessibility', ACCESSIBILITY_SOURCES],
  ['Legal / COI', LEGAL_SOURCES],
  ['Venue constraint', VENUE_SOURCES],
  ['Weather', WEATHER_SOURCES],
  ['Human / relational', HUMAN_SOURCES],
  ['Dietary / allergy', DIETARY_SOURCES],
  ['Budget authority', BUDGET_SOURCES],
  ['Childcare', CHILDCARE_SOURCES],
  ['Military ceremony', MILITARY_SOURCES],
  ['Incident / guest safety', INCIDENT_SOURCES],
  ['Food safety', FOOD_SAFETY_SOURCES],
  ['Fire & burn safety', FIRE_SAFETY_SOURCES],
  ['Booking / vendor collapse', BOOKING_RISK_SOURCES],
  ['Destination / travel', DESTINATION_SOURCES],
];

// The full provenance catalog: every grounding axis, and every source it cites.
export function groundingSourceCatalog() {
  return REGISTRIES
    .map(([axis, reg]) => ({
      axis,
      sources: Object.entries(reg || {}).map(([id, s]) => {
        const rawTier = (s && s.tier) || '';
        return {
          id,
          title: (s && s.title) || id,
          publisher: (s && s.publisher) || '',
          tier: rawTier,                       // as authored on the axis
          canonTier: normalizeTier(rawTier),   // mapped onto the canonical ladder
          tierLabel: tierInfo(rawTier).label,  // human label for the canonical rung
          grounded: tierInfo(rawTier).grounded,
          note: (s && s.note) || '',
        };
      }),
    }))
    .filter((g) => g.sources.length);
}

// Roll-up for the admin summary (axes, total cited sources, by grounding tier).
export function groundingSourceStats() {
  const cat = groundingSourceCatalog();
  const all = cat.flatMap((g) => g.sources);
  const byTier = {};        // by CANONICAL rung, so the admin reads one consistent vocabulary
  all.forEach((s) => { const t = s.canonTier || 'unspecified'; byTier[t] = (byTier[t] || 0) + 1; });
  return { axes: cat.length, sources: all.length, byTier };
}

// Resolve a single cited source id to its citation across ALL registries — for a row
// that shows the full provenance behind an id wherever it was cited from.
export function resolveGroundingSource(id) {
  for (const [axis, reg] of REGISTRIES) {
    if (reg && reg[id]) return { axis, id, ...reg[id] };
  }
  return null;
}
