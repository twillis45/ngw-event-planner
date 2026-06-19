// ─── Canonical Event Taxonomy (single source of truth) ─────────────────────
// Sprint 53 engine hardening (Task 1/2). ONE table maps every event type to its
// answer on EACH engine axis. Five classifiers used to carry their own keyword
// logic and could disagree on off-taxonomy input ("Welcome Dinner" → solve null /
// intake home_hosted / shares FALLBACK — three engines, three treatments). They
// now ALL derive from here, so one type resolves one way everywhere.
//
// IMPORTANT — these are DIFFERENT AXES, not one family for everything:
//   • solveFamily      — 29 backward-solve graphs (eventSolve GRAPHS). null = honest
//                        "no model yet, no fake preview" (NEVER silently a wedding).
//   • family           — 5 intake/budget families (home_hosted, full_service,
//                        corporate, host_driven, travel_led). Drives intake chrome,
//                        budget per-head bands, and the not-included list. This is the
//                        axis that was duplicated verbatim in App.js + confidence.js.
//   • shareFamily      — 3 budget-breakdown share tables + fallback
//                        (wedding | corporate | private | fallback). Coarser than
//                        `family` by design; the two axes MAY differ for one type
//                        (e.g. Holiday Party → family:corporate, shareFamily:private).
//   • recordKind       — derived from family: home_hosted ⇒ 'event' (a self-host
//                        planning their own party); everything else ⇒ 'client'.
//   • roster key       — the canonical type IS the CURATED_VENDORS key (vendor lib).
//
// Off-taxonomy + alias names resolve through TYPE_ALIASES then the single ordered
// KEYWORDS list — and NEVER to the maximal (wedding/full_service) family. Unknown
// input falls to the safe middle: family host_driven, shareFamily fallback,
// solveFamily null.
//
// CommonJS on purpose: the node-testable engine (eventSolve.js, run via
// `node src/lib/eventSolve.js` + backtest scripts) requires this directly, while
// the webpack/ESM surfaces (App.js, budgetEstimator/*, vendorCategoriesByType)
// import it via interop.

// type → { parent, solveFamily, family, shareFamily, travel, multiDay, cultural }
const EVENT_TAXONOMY = {
  // ── Weddings & Celebrations ───────────────────────────────────────────────
  'Wedding':            { parent: 'Weddings & Celebrations', solveFamily: 'wedding',          family: 'full_service', shareFamily: 'wedding'  },
  'Elopement':          { parent: 'Weddings & Celebrations', solveFamily: 'elopement',        family: 'travel_led',   shareFamily: 'wedding',  travel: true },
  'Engagement Party':   { parent: 'Weddings & Celebrations', solveFamily: 'engagement_party', family: 'host_driven',  shareFamily: 'wedding'  },
  'Vow Renewal':        { parent: 'Weddings & Celebrations', solveFamily: 'vow_renewal',      family: 'full_service', shareFamily: 'wedding'  },
  'Anniversary':        { parent: 'Weddings & Celebrations', solveFamily: 'anniversary',      family: 'host_driven',  shareFamily: 'private'  },
  'Bridal Shower':      { parent: 'Weddings & Celebrations', solveFamily: 'bridal_shower',    family: 'host_driven',  shareFamily: 'wedding'  },
  'Baby Shower':        { parent: 'Weddings & Celebrations', solveFamily: 'baby_shower',      family: 'host_driven',  shareFamily: 'private'  },
  'Gender Reveal':      { parent: 'Weddings & Celebrations', solveFamily: 'gender_reveal',    family: 'host_driven',  shareFamily: 'fallback' },
  'Birthday':           { parent: 'Weddings & Celebrations', solveFamily: 'birthday',         family: 'host_driven',  shareFamily: 'private'  },
  'Sweet 16':           { parent: 'Weddings & Celebrations', solveFamily: 'sweet16',          family: 'full_service', shareFamily: 'private'  },
  'Quinceañera':        { parent: 'Weddings & Celebrations', solveFamily: 'quinceanera',      family: 'full_service', shareFamily: 'wedding',  cultural: 'latin' },
  'Graduation':         { parent: 'Weddings & Celebrations', solveFamily: 'graduation',       family: 'host_driven',  shareFamily: 'private'  },
  'Retirement Party':   { parent: 'Weddings & Celebrations', solveFamily: 'retirement_party', family: 'host_driven',  shareFamily: 'private'  },
  'Reunion':            { parent: 'Weddings & Celebrations', solveFamily: 'reunion',          family: 'host_driven',  shareFamily: 'private'  },
  'Surprise Proposal':  { parent: 'Weddings & Celebrations', solveFamily: 'proposal',         family: 'host_driven',  shareFamily: 'fallback' },
  'Bachelorette Party': { parent: 'Weddings & Celebrations', solveFamily: 'bachelorette',     family: 'host_driven',  shareFamily: 'fallback', travel: true },
  'Bachelor Party':     { parent: 'Weddings & Celebrations', solveFamily: 'bachelorette',     family: 'host_driven',  shareFamily: 'fallback', travel: true },

  // ── Corporate ─────────────────────────────────────────────────────────────
  // NOTE: Holiday Party keeps shareFamily 'private' (its current resolved value) even
  // though family is 'corporate' — the axes are allowed to differ; documented drift.
  'Holiday Party':      { parent: 'Corporate', solveFamily: 'holiday_party',     family: 'corporate', shareFamily: 'private'   },
  'Board Meeting':      { parent: 'Corporate', solveFamily: 'board',             family: 'corporate', shareFamily: 'corporate' },
  'Conference':         { parent: 'Corporate', solveFamily: 'corporate',         family: 'corporate', shareFamily: 'corporate', multiDay: true },
  'Product Launch':     { parent: 'Corporate', solveFamily: 'product_launch',    family: 'corporate', shareFamily: 'corporate' },
  'Team Retreat':       { parent: 'Corporate', solveFamily: 'team_retreat',      family: 'corporate', shareFamily: 'corporate', travel: true, multiDay: true },
  'Town Hall':          { parent: 'Corporate', solveFamily: 'town_hall',         family: 'corporate', shareFamily: 'corporate' },
  'Training / Workshop':{ parent: 'Corporate', solveFamily: 'training_workshop', family: 'corporate', shareFamily: 'corporate' },
  'Award Ceremony':     { parent: 'Corporate', solveFamily: 'award_ceremony',    family: 'corporate', shareFamily: 'corporate' },
  'Client Dinner':      { parent: 'Corporate', solveFamily: 'client_dinner',     family: 'corporate', shareFamily: 'corporate' },

  // ── Social & Fundraising ──────────────────────────────────────────────────
  'Fundraiser / Gala':  { parent: 'Social & Fundraising', solveFamily: 'gala',             family: 'full_service', shareFamily: 'corporate' },
  'Networking Event':   { parent: 'Social & Fundraising', solveFamily: 'networking_event', family: 'corporate',    shareFamily: 'corporate' },
  'Wellness Retreat':   { parent: 'Social & Fundraising', solveFamily: 'wellness_retreat', family: 'travel_led',   shareFamily: 'fallback', travel: true, multiDay: true },
  'Other':              { parent: 'Social & Fundraising', solveFamily: null,               family: 'host_driven',  shareFamily: 'fallback' },

  // ── At-Home Gatherings ────────────────────────────────────────────────────
  'Dinner Party':       { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Watch Party':        { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Game Night':         { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Housewarming':       { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Get-Together':       { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  // Popular African American hosted at-home events (board-recruited 2026-06-18).
  // home_hosted; a community overlay (cited from insider experts) is opt-in, never
  // auto-applied by type name. Repast is a somber after-funeral gathering.
  'The Cookout':        { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Fish Fry':           { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Card Party':         { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Sunday Dinner':      { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Day Party':          { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  // Regional seafood-boil hosted events (DMV crab feast + the boil family).
  'Crab Feast':         { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Crawfish Boil':      { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Low Country Boil':   { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Repast':             { parent: 'At-Home Gatherings', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Juneteenth Cookout': { parent: 'Holidays & Heritage', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
  'Kwanzaa Gathering':  { parent: 'Holidays & Heritage', solveFamily: 'home_gathering', family: 'home_hosted', shareFamily: 'fallback' },
};

// recordKind is a pure function of family.
const FAMILY_RECORD_KIND = {
  home_hosted: 'event',
  full_service: 'client',
  corporate: 'client',
  host_driven: 'client',
  travel_led: 'client',
};

// Explicit alias map — exact-string normalisation of the app's OTHER vocabularies
// (the create-event modal uses 'Corporate'/'Conference'; intake/public forms use
// 'Corporate Event'/'Conference / Summit'; legacy budget keys 'Corporate Retreat').
// Checked before the keyword pass. Targets are always canonical EVENT_TAXONOMY keys.
const TYPE_ALIASES = {
  'Corporate Event': 'Conference',
  'Corporate': 'Conference',
  'Conference / Summit': 'Conference',
  'Corporate Retreat': 'Team Retreat',
  'Gala': 'Fundraiser / Gala',
  'Gala / Fundraiser': 'Fundraiser / Gala',
  'Fundraiser': 'Fundraiser / Gala',
  'Birthday Party': 'Birthday',
  'Graduation Party': 'Graduation',
  'Training': 'Training / Workshop',
  'Workshop': 'Training / Workshop',
  // New At-Home Gatherings dropdown labels → nearest canonical home_hosted type,
  // so intake family / playbook / roster all resolve (no orphan canonical types).
  'Cocktail Party': 'Dinner Party',
  'Backyard BBQ': 'Get-Together',
  'Brunch': 'Dinner Party',
  // Watch Party + Game Night are now CANONICAL (own playbooks); sports-watch
  // variants resolve to the Watch Party playbook.
  'Super Bowl Party': 'Watch Party',
  'Game Day Party': 'Watch Party',
};

// The SINGLE ordered keyword resolver — replaces the four independent regex blocks
// that lived in eventSolve.familyFor, App.intakeFamily, confidence.budgetFamilyForType,
// and categoryShares.getCategoryShares. Ordered specific → generic. Tested against the
// lower-cased raw string. Each entry resolves to a canonical type; family/shares/solve/
// roster all derive from that single decision. NEVER routes to the maximal family —
// the most generic tails land on Conference (corporate) or Birthday (host_driven).
const KEYWORDS = [
  // ── Cultural / religious ceremonies (resolve to the nearest host model, flagged) ──
  [/bar\s*mitzvah|bat\s*mitzvah|b['’]?nai\s*mitzvah/, 'Sweet 16'],
  [/quincea|quince\b/, 'Quinceañera'],
  [/bris\b|brit\s*milah|baby\s*naming|naming\s*ceremony|christening|baptism|first\s*communion|confirmation\b/, 'Baby Shower'],
  [/mehndi|sangeet|haldi|nikah|walima|baraat|\broka\b/, 'Wedding'],
  [/diwali|deepavali|\beid\b|lunar\s*new\s*year|\blny\b|\btet\b|seollal|holi\b|nowruz|hanukkah|kwanzaa|lohri|onam|vaisakhi/, 'Birthday'],
  // ── On-trend + specific ceremonies (most specific first) ──
  [/bachelorette|hen\s*(do|party)/, 'Bachelorette Party'],
  [/bachelor\b|stag\b/, 'Bachelor Party'],
  [/proposal|will\s*you\s*marry/, 'Surprise Proposal'],
  [/gender\s*reveal|sex\s*reveal/, 'Gender Reveal'],
  [/elope|micro.?wedding|minimony/, 'Elopement'],
  [/destination\s*wedding/, 'Wedding'],
  [/wellness|yoga|sound\s*bath|breathwork|meditation\s*retreat|spa\s*retreat/, 'Wellness Retreat'],
  [/sweet\s*16|sweet\s*sixteen/, 'Sweet 16'],
  [/baby\s*shower|baby\s*sprinkle|sip\s*(and|&)\s*see/, 'Baby Shower'],
  [/bridal\s*shower|wedding\s*shower/, 'Bridal Shower'],
  [/engagement/, 'Engagement Party'],
  [/vow\s*renewal/, 'Vow Renewal'],
  [/anniversary/, 'Anniversary'],
  [/graduation|grad\s*party/, 'Graduation'],
  [/retirement/, 'Retirement Party'],
  [/reunion/, 'Reunion'],
  // ── Corporate ──
  [/board\s*meeting|\bboard\b|trustee|governance/, 'Board Meeting'],
  [/product\s*launch|launch\s*party|unveiling/, 'Product Launch'],
  [/town\s*hall|all.?hands/, 'Town Hall'],
  [/training|workshop|seminar|\bclass\b|bootcamp|masterclass/, 'Training / Workshop'],
  [/award|recognition\s*ceremony/, 'Award Ceremony'],
  [/client\s*(dinner|entertain|appreciation|event|reception)|business\s*dinner/, 'Client Dinner'],
  [/team\s*retreat|offsite|off-site|team\s*build|company\s*retreat|corporate\s*retreat/, 'Team Retreat'],
  [/holiday\s*party|company\s*party|staff\s*party|office\s*party/, 'Holiday Party'],
  [/conference|summit|kickoff|kick-off|\bsko\b|expo\b|trade\s*show|convention|symposium|\bforum\b/, 'Conference'],
  [/networking|mixer/, 'Networking Event'],
  [/gala|fundrais|benefit\b|auction|charity\b|donor\b/, 'Fundraiser / Gala'],
  // ── Casual / at-home gatherings ──
  [/house\s*warming|housewarming/, 'Housewarming'],
  [/dinner\s*party|friendsgiving|supper\s*club|welcome\s*dinner|rehearsal\s*dinner|tasting\s*menu/, 'Dinner Party'],
  [/get.?together|game\s*night|potluck|cookout|bbq|barbecue|crawfish|crab\s*boil|low.?country\s*boil|fish\s*fry|\bboil\b|backyard|brunch|happy\s*hour|watch\s*party|cocktail\s*party|block\s*party|picnic/, 'Get-Together'],
  // ── Generic travel (after team retreat / wellness specifics) ──
  [/honeymoon|getaway|\bcruise\b|girls?\s*trip|guys?\s*trip|\bretreat\b|destination\b/, 'Wellness Retreat'],
  // ── Generic celebrations (after specifics) ──
  [/wedding|nuptial|marriage|matrimony/, 'Wedding'],
  [/birthday|\bb.?day\b|milestone\s*birthday/, 'Birthday'],
  // ── Generic corporate fallback (clearly-corporate language) ──
  [/corporate|meeting|company|business|\bpanel\b|\bclient\b/, 'Conference'],
  // ── Generic party fallback (host-driven, NOT maximal) ──
  [/party|celebration|\bbash\b|soiree|fiesta|shindig/, 'Birthday'],
];

// Cultural flag resolver — forward-looking metadata (Task 8). Keyed first off the
// canonical type's own `cultural` field, then a keyword pass on the raw name. Not yet
// consumed by the core engines; exposed so future cultural overlays read one source.
const CULTURAL_FLAGS = [
  [/bar\s*mitzvah|bat\s*mitzvah|b['’]?nai\s*mitzvah/, 'jewish-coming-of-age'],
  [/bris\b|brit\s*milah|hanukkah/, 'jewish'],
  [/quincea|quince\b/, 'latin'],
  [/diwali|deepavali|holi\b|lohri|onam|vaisakhi|mehndi|sangeet|haldi/, 'hindu'],
  [/\beid\b|ramadan|nikah|walima|henna\s*night/, 'islamic'],
  [/lunar\s*new\s*year|\blny\b|\btet\b|seollal/, 'lunar'],
  [/kwanzaa/, 'pan-african'],
  [/nowruz/, 'persian'],
  [/christening|baptism|first\s*communion|confirmation\b/, 'christian'],
];

/**
 * Resolve any raw type string to a canonical EVENT_TAXONOMY key, or null when
 * nothing matches. Order: exact canonical → exact alias → case-insensitive
 * canonical → keyword pass. null is meaningful: it signals "no recognised type"
 * so solve previews stay honest.
 */
function resolveCanonicalType(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (EVENT_TAXONOMY[s]) return s;
  if (TYPE_ALIASES[s]) return TYPE_ALIASES[s];
  const t = s.toLowerCase();
  for (const k in EVENT_TAXONOMY) { if (k.toLowerCase() === t) return k; }
  for (const k in TYPE_ALIASES)   { if (k.toLowerCase() === t) return TYPE_ALIASES[k]; }
  for (const [re, type] of KEYWORDS) { if (re.test(t)) return type; }
  return null;
}

// ── Per-axis accessors. Each derives from the one canonical resolution. ──

// 5-family axis — drives intake chrome AND budget per-head bands (one axis, was two).
// Unknown → safe middle 'host_driven', never the maximal family.
function intakeFamilyFor(raw) {
  const c = resolveCanonicalType(raw);
  return c ? EVENT_TAXONOMY[c].family : 'host_driven';
}
// Alias kept for the budget lib's historical name; SAME axis as intake by construction.
const budgetFamilyFor = intakeFamilyFor;

// 29-graph solve axis. Unknown → null (no fake preview; NEVER silently a wedding).
function solveFamilyFor(raw) {
  const c = resolveCanonicalType(raw);
  return c ? EVENT_TAXONOMY[c].solveFamily : null;
}

// 3-table budget-breakdown axis. Unknown → 'fallback' (generic, not maximal).
function budgetShareFamilyFor(raw) {
  const c = resolveCanonicalType(raw);
  return c ? EVENT_TAXONOMY[c].shareFamily : 'fallback';
}

// recordKind — 'event' (self-host) vs 'client' (professional engagement).
function recordKindFor(raw) {
  return FAMILY_RECORD_KIND[intakeFamilyFor(raw)] || 'client';
}

// Roster key — the canonical type IS the CURATED_VENDORS key. null when unrecognised
// (vendor lib then falls back to the budget-share label list).
function curatedRosterKeyFor(raw) {
  return resolveCanonicalType(raw);
}

// Cultural flag (forward-looking metadata). null when none applies.
function culturalFlagFor(raw) {
  const c = resolveCanonicalType(raw);
  if (c && EVENT_TAXONOMY[c].cultural) return EVENT_TAXONOMY[c].cultural;
  if (!raw) return null;
  const t = String(raw).toLowerCase();
  for (const [re, flag] of CULTURAL_FLAGS) { if (re.test(t)) return flag; }
  return null;
}

// ESM module (.mjs) — webpack/ESM surfaces import it (directly or via the engine),
// and node loads it as ESM for the validate/backtest/self-test scripts. It is .mjs,
// not .js, on purpose: CRA's babel marks every src/*.js as an ES module, so a CJS
// `module.exports = {…}` here is pulled into the production bundle's harmony scope and
// throws "ES Modules may not assign module.exports" at runtime. Real ESM exports avoid
// that entirely; .mjs keeps node treating it as ESM too (no package.json "type" flip).
export {
  EVENT_TAXONOMY,
  TYPE_ALIASES,
  FAMILY_RECORD_KIND,
  resolveCanonicalType,
  intakeFamilyFor,
  budgetFamilyFor,
  solveFamilyFor,
  budgetShareFamilyFor,
  recordKindFor,
  curatedRosterKeyFor,
  culturalFlagFor,
};
