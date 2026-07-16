// ─── Destination context — grounding the travel decisions ───────────────────
//
// Gap found (2026-07-16): the destination engine had decent coverage (lodging,
// travel mix, transport, childcare, health) but ZERO grounding — not a single
// cited source, and NOT a grounded axis, even though the calls it drives (altitude
// health, the late-night ride home, a room block's attrition risk) are exactly the
// kind of thing a seasoned planner grounds in real references. This closes that:
// a DESTINATION_SOURCES registry + a grounded destinationContext per decision,
// wired into the board like culturalContext / militaryContext, and registered in
// groundingSources.js so the provenance is auditable in the admin.
//
// Only the genuinely GROUNDABLE calls are grounded — dest_travelmix ("how many are
// traveling?") is fact-gathering, not a claim with a source, so it stays honest-unbouned.

export const DESTINATION_SOURCES = {
  'cdc-yellowbook': { title: 'CDC Health Information for International Travel (the Yellow Book)', publisher: 'U.S. Centers for Disease Control and Prevention', tier: 'established-consensus', note: 'The CDC travelers’-health reference — pre-travel health, vaccines, and destination risk.' },
  'cdc-altitude': { title: 'CDC Travelers’ Health — High-Altitude Travel & Altitude Illness', publisher: 'U.S. Centers for Disease Control and Prevention', tier: 'established-consensus', note: 'Altitude illness is predicted by rate of ascent and by heart/lung health, not age — the basis for pacing a high-altitude schedule.' },
  'ahla-roomblock': { title: 'Hotel group room-block practice — courtesy vs. guaranteed block (attrition)', publisher: 'American Hotel & Lodging Association (industry practice)', tier: 'established-consensus', note: 'A courtesy block holds rooms with no host liability; a guaranteed block gets a firmer rate but the host owes an attrition penalty on rooms that don’t fill.' },
  'nhtsa-impaired': { title: 'NHTSA impaired-driving data', publisher: 'U.S. National Highway Traffic Safety Administration (DOT)', tier: 'established-consensus', note: 'Late-night, alcohol-served travel is when impaired-driving risk peaks — why the ride home from a destination venue is the single riskiest logistics gap.' },
};

// Grounded when it names an element AND cites >=1 source id that resolves here
// (mirrors isGroundedCulture / isGroundedMilitary — an empty/sourceless ctx is hollow).
export function isGroundedDestination(ctx) {
  return !!(ctx && typeof ctx === 'object' && ctx.element
    && (ctx.tier === 'established-consensus' || ctx.tier === 'researched')
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!DESTINATION_SOURCES[s]));
}

export function destinationSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => DESTINATION_SOURCES[s]).filter(Boolean);
}

// Per-decision grounding for the destination decisions that carry a real, citable
// basis. Keyed by decision id (the board attaches these to DESTINATION_DECISIONS
// without editing that array). Fact-gathering calls (travelmix) are absent on purpose.
export const DESTINATION_CONTEXTS = {
  dest_health: { element: 'traveler_health', tier: 'established-consensus', sources: ['cdc-yellowbook', 'cdc-altitude'], note: 'Pace the schedule for heart/lung health and altitude, not age — grounded in CDC travelers’-health guidance.' },
  dest_transport: { element: 'ground_transport_safety', tier: 'established-consensus', sources: ['nhtsa-impaired'], note: 'The late-night ride from the venue is the riskiest logistics gap — arrange group transport early, grounded in NHTSA impaired-driving data.' },
  dest_lodging: { element: 'room_block', tier: 'established-consensus', sources: ['ahla-roomblock'], note: 'Courtesy block (no liability) vs. guaranteed block (firmer rate, attrition risk) — grounded in hotel group-sales practice.' },
};

export function destinationContextFor(id) {
  return DESTINATION_CONTEXTS[id] || null;
}
