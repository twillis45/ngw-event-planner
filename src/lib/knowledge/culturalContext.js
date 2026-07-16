// demo/src/lib/knowledge/culturalContext.js
//
// Wave-2g COVERAGE + GROUNDING — a structured cultural/religious axis.
//
// The Coverage re-score (3→4) found the priority axis complete but the whole
// cultural/religious/legal/accessibility HALF of a planner's judgment still 0/215 as
// STRUCTURED fields — prose only, invisible to the engine. Its #1 lever: "add a
// structured cultural axis to the ~15 decisions where faith/tradition steers the choice
// (repast, quinceañera, kwanzaa, ethiopian, juneteenth) — even 10-15/215 with provenance
// moves the weakest sub-dim off 0 and unlocks 4→5." The Grounding re-score separately
// flagged cultural = 0 externally-cited.
//
// This registers REAL, dated, authoritative sources (Smithsonian NMAAHC, Britannica, PBS,
// Dignity Memorial, culinary historian Adrian Miller) so a decision can carry a
// `culturalContext` that is GROUNDED, not synthesized prose. No cultural fact is invented:
// every `tier:'established-consensus'` claim traces to a cited source. Decisions author the
// field directly (the cultural steer is specific per decision, unlike generic timing), and
// reference these shared source ids so the citations live in one auditable place.

export const CULTURAL_SOURCES = {
  'nmaahc-kwanzaa': {
    org: 'Smithsonian National Museum of African American History and Culture',
    url: 'https://nmaahc.si.edu/explore/stories/seven-principles-kwanzaa',
    fetched: '2026-07-16',
    claim: 'Kwanzaa centers the Nguzo Saba (seven principles); the mishumaa saba are 7 candles — 3 red, 3 green, 1 black — held in the kinara (symbolizing the ancestors); the karamu is the communal feast.',
  },
  'pbs-juneteenth': {
    org: 'PBS',
    url: 'https://www.pbs.org/articles/the-meaning-and-history-of-juneteenth-foods',
    fetched: '2026-07-16',
    claim: 'Juneteenth marks June 19, 1865, when Union Gen. Gordon Granger announced emancipation in Galveston, TX; red foods and drinks symbolize the blood and sacrifice of the enslaved and trace to West African hibiscus (bissap) and kola-nut traditions.',
  },
  'miller-juneteenth': {
    org: 'Adrian Miller, culinary historian (via CNN / Atlas Obscura)',
    url: 'https://www.cnn.com/2024/06/17/us/juneteenth-red-food-drinks-reaj',
    fetched: '2026-07-16',
    claim: 'Red Juneteenth drinks link to two native West African plants — the kola nut and hibiscus (stewed into the reddish tea bissap) — carried through the diaspora.',
  },
  'britannica-quinceanera': {
    org: 'Encyclopaedia Britannica',
    url: 'https://www.britannica.com/topic/quinceanera',
    fetched: '2026-07-16',
    claim: 'The quinceañera (15th-birthday rite of passage) is both religious and social: it traditionally opens with a Catholic Mass (misa), and the reception features the choreographed waltz (vals) and a court of damas and chambelanes representing the years of childhood.',
  },
  'ethiopia-coffee-lavazza': {
    org: 'Lavazza — Coffee ceremony in Eritrea and Ethiopia',
    url: 'https://www.lavazzausa.com/en/other-than-coffee/coffee-ceremony-eritrea-ethiopia-rituals-tradition',
    fetched: '2026-07-16',
    claim: 'The Ethiopian buna ceremony roasts green beans over a fire, brews in a clay jebena, and serves three rounds — abol, tona, baraka — as a communal act of hospitality that brings family and community together.',
  },
  'dignity-repast': {
    org: 'Dignity Memorial',
    url: 'https://www.dignitymemorial.com/memorial-services/funeral-traditions/what-is-a-repast',
    fetched: '2026-07-16',
    claim: 'The repast is the meal shared after a funeral; in Black communities especially it is a tradition of the community feeding the grieving family — collective grieving, comfort, and support rooted in West African funeral custom.',
  },
};

// A culturalContext is GROUNDED only when it names a tradition + how it steers the decision
// AND cites >=1 real source id that resolves in CULTURAL_SOURCES with an authoritative tier
// (mirrors isGroundedProvenance/isGroundedTiming — an empty or sourceless object is hollow).
export function isGroundedCulture(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.tradition === 'string' && ctx.tradition.trim().length > 0
    && typeof ctx.constraint === 'string' && ctx.constraint.trim().length > 0
    && (ctx.tier === 'established-consensus' || ctx.tier === 'researched')
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!CULTURAL_SOURCES[s]));
}

// Resolve the source objects a culturalContext cites (for a UI / audit to show the citation).
export function culturalSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => CULTURAL_SOURCES[s]).filter(Boolean);
}
