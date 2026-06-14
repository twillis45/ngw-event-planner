// ─────────────────────────────────────────────────────────────────────────────
// INTAKE FAMILY ENGINE — extracted verbatim from src/App.js (lines ~1926–2035).
// This is the "what does this event type actually need" router. It is a SECOND
// axis from the solve-engine in eventSolve.js: eventSolve decides the critical-
// path of tasks; this decides which intake sections, chrome, and vocabulary a
// given event family should even show. SOURCE OF TRUTH: every family-specific
// behavior (sections, chrome flags, host-facing copy) lives here; UI surfaces
// only READ these flags — no ad-hoc `if (home)` checks anywhere else.
//
// recordKind:'event'  = a self-host planning their OWN party (no client/roster/
//                       fee/lead-pipeline framing). Gets a dedicated "My Events" tab.
// recordKind:'client' = a professional planner engagement (CRM/AR/pipeline).
// ─────────────────────────────────────────────────────────────────────────────

const EVT_CATEGORIES = {
  'Weddings & Celebrations': [
    'Wedding', 'Elopement', 'Engagement Party', 'Vow Renewal', 'Anniversary',
    'Bridal Shower', 'Baby Shower', 'Gender Reveal', 'Birthday', 'Sweet 16',
    'Quinceañera', 'Graduation', 'Retirement Party', 'Reunion',
    'Surprise Proposal', 'Bachelorette Party', 'Bachelor Party',
  ],
  'Corporate': [
    'Holiday Party', 'Board Meeting', 'Conference', 'Product Launch',
    'Team Retreat', 'Town Hall', 'Training / Workshop', 'Award Ceremony',
    'Client Dinner',
  ],
  'Social & Fundraising': [
    'Fundraiser / Gala', 'Networking Event', 'Wellness Retreat', 'Other',
  ],
  'At-Home Gatherings': [
    'Dinner Party', 'Housewarming', 'Get-Together',
  ],
};
const EVT_TYPES  = Object.values(EVT_CATEGORIES).flat();
const EVT_PARENT = Object.entries(EVT_CATEGORIES).reduce((acc, [cat, types]) => {
  types.forEach(t => { acc[t] = cat; });
  return acc;
}, {});

const INTAKE_FAMILIES = {
  home_hosted: {
    label: 'Home-hosted', diy: true, venue: false, vendors: false, coi: false, deposit: false,
    plannerFee: false, partner: false, influencers: false, vision: 'light', personal: true, brief: false,
    recordKind: 'event', pipeline: false, discovery: false, commsChecklist: false, clientPortal: false, communication: false,
    vocab: {
      createTitle: 'Plan your get-together', createSub: 'Add the basics — Event Boss sets up your event, suggests a budget, and starts your checklist so you can enjoy the party.',
      nameLabel: 'Who’s it for? (hosts)', namePlaceholder: 'e.g. Imani & Marcus',
      createCta: 'Create event', createIntakeCta: 'Create & plan', recordWord: 'event',
      guestLabel: 'How many guests', budgetLabel: 'Rough budget',
    },
  },
  full_service: {
    label: 'Full-service', diy: false, venue: true, vendors: true, coi: true, deposit: true,
    plannerFee: true, partner: true, influencers: true, vision: true, personal: true, brief: false,
    recordKind: 'client', pipeline: true, discovery: true, commsChecklist: true, clientPortal: true, communication: true,
    vocab: { createTitle: 'Add to your roster', nameLabel: 'Client / Couple Name', createCta: 'Create Client', recordWord: 'client', guestLabel: 'Est. Guest Count', budgetLabel: 'Budget range' },
  },
  corporate: {
    label: 'Corporate', diy: false, venue: true, vendors: true, coi: true, deposit: true,
    plannerFee: false, partner: false, influencers: true, vision: false, personal: false, brief: true,
    recordKind: 'client', pipeline: true, discovery: true, commsChecklist: true, clientPortal: true, communication: true,
    vocab: { createTitle: 'Add to your roster', nameLabel: 'Organization / Team', createCta: 'Create Client', recordWord: 'client', guestLabel: 'Est. Attendees', budgetLabel: 'Budget range' },
  },
  host_driven: {
    label: 'Host-driven', diy: false, venue: true, vendors: true, coi: false, deposit: true,
    plannerFee: true, partner: true, influencers: false, vision: true, personal: true, brief: false,
    recordKind: 'client', pipeline: true, discovery: true, commsChecklist: true, clientPortal: true, communication: true,
    vocab: { createTitle: 'Add to your roster', nameLabel: 'Host / Guest of Honor', createCta: 'Create Client', recordWord: 'client', guestLabel: 'Est. Guest Count', budgetLabel: 'Budget range' },
  },
  travel_led: {
    label: 'Travel-led', diy: false, venue: true, vendors: true, coi: false, deposit: true,
    plannerFee: true, partner: true, influencers: false, vision: true, personal: true, brief: false,
    recordKind: 'client', pipeline: true, discovery: true, commsChecklist: true, clientPortal: true, communication: true,
    vocab: { createTitle: 'Add to your roster', nameLabel: 'Client / Traveler', createCta: 'Create Client', recordWord: 'client', guestLabel: 'Est. Travelers', budgetLabel: 'Budget range' },
  },
};

function intakeVocab(type) { return (intakeFamilyConfig(type) || INTAKE_FAMILIES.host_driven).vocab || {}; }

const HOST_CHECKLIST = [
  { key: 'invites',   label: 'Send the invites',           hint: 'Text, call, or email everyone' },
  { key: 'headcount', label: 'Confirm who’s coming',       hint: 'Chase down the maybes' },
  { key: 'menu',      label: 'Plan the menu',              hint: 'Food + drinks' },
  { key: 'dietary',   label: 'Ask about allergies & diets', hint: 'Vegetarian, nut-free, etc.' },
  { key: 'shopping',  label: 'Make a shopping list',        hint: 'Groceries, drinks, supplies' },
  { key: 'setup',     label: 'Plan the day-of setup',       hint: 'Tables, music, where things go' },
];

const INTAKE_FAMILY_BY_TYPE = {
  'Dinner Party': 'home_hosted', 'Housewarming': 'home_hosted', 'Get-Together': 'home_hosted',
  'Wedding': 'full_service', 'Quinceañera': 'full_service', 'Sweet 16': 'full_service', 'Vow Renewal': 'full_service', 'Fundraiser / Gala': 'full_service',
  'Holiday Party': 'corporate', 'Board Meeting': 'corporate', 'Conference': 'corporate', 'Product Launch': 'corporate', 'Team Retreat': 'corporate', 'Town Hall': 'corporate', 'Training / Workshop': 'corporate', 'Award Ceremony': 'corporate', 'Client Dinner': 'corporate', 'Networking Event': 'corporate',
  'Engagement Party': 'host_driven', 'Anniversary': 'host_driven', 'Bridal Shower': 'host_driven', 'Baby Shower': 'host_driven', 'Gender Reveal': 'host_driven', 'Birthday': 'host_driven', 'Graduation': 'host_driven', 'Retirement Party': 'host_driven', 'Reunion': 'host_driven', 'Surprise Proposal': 'host_driven', 'Bachelorette Party': 'host_driven', 'Bachelor Party': 'host_driven',
  'Elopement': 'travel_led', 'Wellness Retreat': 'travel_led',
};

// Returns one of the 5 family keys. CRITICAL: an unrecognized type must NEVER
// fall through to 'full_service' and re-flood a host with a vendor gap-board —
// keyword inference catches off-taxonomy names ("Welcome Dinner", "Team Offsite"),
// and the final default is the middle-weight 'host_driven', not the maximal family.
function intakeFamily(type) {
  if (!type) return 'host_driven';
  if (INTAKE_FAMILY_BY_TYPE[type]) return INTAKE_FAMILY_BY_TYPE[type];
  const t = String(type).toLowerCase();
  if (/\b(dinner|brunch|lunch|potluck|housewarming|game ?night|book club|cookout|bbq|barbecue|backyard|cocktail|happy hour)\b/.test(t)) return 'home_hosted';
  if (/\b(retreat|getaway|destination|honeymoon|elopement|cruise)\b/.test(t)) return 'travel_led';
  if (/\b(conference|summit|offsite|off-site|launch|meeting|board|town ?hall|training|workshop|networking|corporate|client|kickoff|kick-off|all[- ]?hands|seminar|expo|trade ?show|panel|mixer)\b/.test(t)) return 'corporate';
  if (/\b(wedding|gala|quince|sweet ?16|vow|fundrais)\b/.test(t)) return 'full_service';
  return 'host_driven'; // safe middle default — NOT maximal
}
function intakeFamilyConfig(type) { return INTAKE_FAMILIES[intakeFamily(type)] || INTAKE_FAMILIES.host_driven; }

module.exports = {
  EVT_CATEGORIES, EVT_TYPES, EVT_PARENT,
  INTAKE_FAMILIES, INTAKE_FAMILY_BY_TYPE, HOST_CHECKLIST,
  intakeFamily, intakeFamilyConfig, intakeVocab,
};
