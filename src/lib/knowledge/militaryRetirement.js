// ─── Military Retirement intelligence — protocol + ceremony, ALL BRANCHES ────
//
// A military retirement carries real, documented PROTOCOL a generic party has no
// idea about (a color/honor guard, the folded-flag presentation, the retirement
// order reading, a shadowbox, spouse recognition, honors by rank — plus the
// service's own traditions: the Navy/Coast Guard "piping ashore", the Marines'
// NCO sword). This module is that knowledge, in code, for all six services.
//
// Each branch is fully authored (terms · ceremony sequence · protocol elements ·
// grounded board decisions). Grounded to real, citable references per service —
// same discipline as culturalContext.js: every claim traces to a source id below.
// A per-branch SPEC + a builder keep the common spine DRY while the vocabulary,
// options, sources, and distinctive rites stay authentic to the service.

export const MILITARY_SOURCES = {
  // Shared
  'title-4-usc-flag': { title: '4 U.S. Code Chapter 1 — The Flag', publisher: 'U.S. Government (Office of the Law Revision Counsel)', tier: 'established-consensus', note: 'Federal flag code — display, respect, and the basis for the ceremonial folding of the flag.' },
  // Army
  'ar-600-25': { title: 'AR 600-25, Salutes, Honors, and Visits of Courtesy', publisher: 'Headquarters, Department of the Army', tier: 'established-consensus', note: 'Army regulation governing honors, salutes, and ceremony courtesies.' },
  'da-pam-600-60': { title: 'DA PAM 600-60, A Guide to Protocol and Etiquette', publisher: 'Department of the Army', tier: 'established-consensus', note: 'Army protocol/etiquette guide — ceremony sequence, official party, precedence.' },
  'army-rso': { title: 'U.S. Army Retirement Services (RSO) ceremony guidance', publisher: 'U.S. Army Human Resources Command', tier: 'established-consensus', note: 'Certificates, retiree/spouse recognition, and the ceremony a unit runs.' },
  // Navy
  'opnavinst-1710': { title: 'OPNAVINST 1710.7, Social Usage and Protocol', publisher: 'Office of the Chief of Naval Operations', tier: 'established-consensus', note: 'Navy social usage and protocol — ceremonies, honors, and the piping of side honors.' },
  'navy-regs': { title: 'U.S. Navy Regulations', publisher: 'Department of the Navy', tier: 'established-consensus', note: 'The foundational regulations governing Navy customs, honors, and the ensign.' },
  // Air Force
  'afi-34-1201': { title: 'AFI 34-1201, Protocol', publisher: 'Department of the Air Force', tier: 'established-consensus', note: 'Air Force protocol instruction — ceremonies, honors, and precedence.' },
  'afpam-34-1202': { title: 'AFPAM 34-1202, Guide to Protocol', publisher: 'Department of the Air Force', tier: 'established-consensus', note: 'Air Force protocol guide — ceremony sequence and the official party.' },
  // Marine Corps
  'mco-5060': { title: 'MCO 5060.20, Marine Corps Drill and Ceremonies Manual', publisher: 'Headquarters, U.S. Marine Corps', tier: 'established-consensus', note: 'The Marine Corps drill and ceremonies manual — colors, honors, sword, and ceremony sequence.' },
  // Coast Guard
  'uscg-protocol': { title: 'U.S. Coast Guard ceremonies & protocol guidance (Navy-derived customs)', publisher: 'U.S. Coast Guard', tier: 'established-consensus', note: 'Coast Guard ceremony/protocol — the ensign, side honors, and retirement customs (shared Navy heritage).' },
  // Space Force (est. 2019) — adapts Air Force protocol
  'ussf-ceremony': { title: 'U.S. Space Force ceremony guidance (adapted from Air Force protocol)', publisher: 'U.S. Space Force', tier: 'researched', note: 'The newest service — retirement ceremonies adapt Air Force protocol (AFPAM 34-1202) with Space Force customs still maturing.' },
  // Cross-ceremony
  'oath-5usc-3331': { title: '5 U.S. Code § 3331 — Oath of office', publisher: 'U.S. Government (Office of the Law Revision Counsel)', tier: 'established-consensus', note: 'The statutory oath of office an officer takes — re-administered at a commissioning or promotion.' },
};

export function isGroundedMilitary(ctx) {
  return !!(ctx && typeof ctx === 'object' && ctx.branch
    && (ctx.tier === 'established-consensus' || ctx.tier === 'researched')
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!MILITARY_SOURCES[s]));
}

export function militarySourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => MILITARY_SOURCES[s]).filter(Boolean);
}

// ── Per-branch specs. The common decisions (honor guard, shadowbox, order reader,
//    official party, uniform, spouse) share ids across branches (only one branch is
//    ever injected per event, so there's no collision) and are built from the spec;
//    `distinctive` adds the rites unique to a service, with their own ids.
const SPECS = {
  army: {
    label: 'U.S. Army', member: 'Soldier', unit: 'unit', colors: 'the Colors', tier: 'established-consensus',
    protocolSrc: 'ar-600-25', partySrc: 'da-pam-600-60', rsoSrc: 'army-rso', uniformSrc: 'da-pam-600-60',
    honorOpts: ['The unit color guard', 'An ROTC / JROTC detail', 'A VFW / American Legion honor guard', 'No color guard'], honorDefault: 2,
    uniformOpts: ['Army Service Uniform', 'Army Blue (formal)', 'Civilian — social celebration'],
    partyOpts: ['The commander presides', 'The command sergeant major', 'A senior leader / guest of honor'],
    partyLead: 'the commander, command sergeant major, and key leaders',
    orderName: 'Retirement Order', certName: 'Certificate of Retirement',
    ceremonyExtra: [], distinctive: [],
  },
  navy: {
    label: 'U.S. Navy', member: 'Sailor', unit: 'command', colors: 'the Ensign', tier: 'established-consensus',
    protocolSrc: 'opnavinst-1710', partySrc: 'opnavinst-1710', rsoSrc: 'navy-regs', uniformSrc: 'opnavinst-1710',
    honorOpts: ['The command honor guard', 'A base / region honor guard', 'Sideboys from the command', 'No honor guard'], honorDefault: 0,
    uniformOpts: ['Service Dress Blue', 'Service Dress White (summer)', 'Civilian — social celebration'],
    partyOpts: ['The commanding officer presides', 'The command master chief', 'A flag officer / guest of honor'],
    partyLead: 'the commanding officer, command master chief, and key leaders',
    orderName: 'Retirement Certificate', certName: 'Certificate of Retirement',
    ceremonyExtra: ['Piping the retiree ashore (boatswain’s pipe + sideboys) — “Sailor, going ashore”'],
    distinctive: [
      { id: 'mil_navy_piping', label: 'Piping ashore?', options: ['Full side honors (pipe + sideboys)', 'Boatswain’s pipe only', 'Skip it'], default: 'Full side honors (pipe + sideboys)', when: 'T-30d', why: 'The Navy’s signature farewell — the boatswain pipes the retiree over the side/ashore, sideboys rendered. Coordinate the boatswain’s mate and sideboys with the command.', src: 'opnavinst-1710' },
    ],
  },
  airforce: {
    label: 'U.S. Air Force', member: 'Airman', unit: 'squadron', colors: 'the Colors', tier: 'established-consensus',
    protocolSrc: 'afi-34-1201', partySrc: 'afpam-34-1202', rsoSrc: 'afi-34-1201', uniformSrc: 'afpam-34-1202',
    honorOpts: ['The base honor guard', 'A squadron detail', 'No honor guard'], honorDefault: 0,
    uniformOpts: ['Service Dress', 'Mess Dress (formal evening)', 'Civilian — social celebration'],
    partyOpts: ['The commander presides', 'The command chief master sergeant', 'A senior leader / guest of honor'],
    partyLead: 'the commander, command chief, and key leaders',
    orderName: 'Retirement Order', certName: 'Certificate of Retirement',
    ceremonyExtra: [], distinctive: [],
  },
  marines: {
    label: 'U.S. Marine Corps', member: 'Marine', unit: 'unit', colors: 'the Colors', tier: 'established-consensus',
    protocolSrc: 'mco-5060', partySrc: 'mco-5060', rsoSrc: 'mco-5060', uniformSrc: 'mco-5060',
    honorOpts: ['The unit color guard', 'A base honor guard', 'A Marine Corps League detail', 'No color guard'], honorDefault: 0,
    uniformOpts: ['Dress Blues (Alphas)', 'Dress Blues (Bravos)', 'Civilian — social celebration'],
    partyOpts: ['The commanding officer presides', 'The sergeant major', 'A senior officer / guest of honor'],
    partyLead: 'the commanding officer, sergeant major, and key leaders',
    orderName: 'Retirement Certificate', certName: 'Certificate of Retirement',
    ceremonyExtra: ['Presentation of the shadowbox with the Eagle, Globe, and Anchor'],
    distinctive: [
      { id: 'mil_marine_sword', label: 'The NCO sword / mantle?', options: ['Pass the NCO sword to a junior Marine', 'Display the sword', 'No sword element'], default: 'Display the sword', when: 'T-21d', why: 'A Marine tradition — passing or presenting the NCO sword marks the handoff of the mantle. Decide who receives or holds it.', src: 'mco-5060' },
    ],
  },
  coastguard: {
    label: 'U.S. Coast Guard', member: 'Coast Guardsman', unit: 'unit', colors: 'the Ensign', tier: 'established-consensus',
    protocolSrc: 'uscg-protocol', partySrc: 'uscg-protocol', rsoSrc: 'uscg-protocol', uniformSrc: 'uscg-protocol',
    honorOpts: ['The unit honor guard', 'A district / sector honor guard', 'Sideboys from the unit', 'No honor guard'], honorDefault: 0,
    uniformOpts: ['Service Dress Blue', 'Full Dress Blue (formal)', 'Civilian — social celebration'],
    partyOpts: ['The commanding officer presides', 'The command master chief', 'A flag officer / guest of honor'],
    partyLead: 'the commanding officer, command master chief, and key leaders',
    orderName: 'Retirement Certificate', certName: 'Certificate of Retirement',
    ceremonyExtra: ['Piping ashore (Navy-shared side honors)'],
    distinctive: [
      { id: 'mil_cg_piping', label: 'Piping ashore?', options: ['Full side honors (pipe + sideboys)', 'Boatswain’s pipe only', 'Skip it'], default: 'Full side honors (pipe + sideboys)', when: 'T-30d', why: 'The Coast Guard shares the Navy’s sea-service farewell — the retiree is piped ashore with sideboys. Coordinate with the unit.', src: 'uscg-protocol' },
    ],
  },
  spaceforce: {
    label: 'U.S. Space Force', member: 'Guardian', unit: 'delta', colors: 'the Colors', tier: 'researched',
    protocolSrc: 'ussf-ceremony', partySrc: 'ussf-ceremony', rsoSrc: 'ussf-ceremony', uniformSrc: 'ussf-ceremony',
    honorOpts: ['A base honor guard', 'A delta detail', 'No honor guard'], honorDefault: 0,
    uniformOpts: ['Service Dress', 'Civilian — social celebration'],
    partyOpts: ['The commander presides', 'The senior enlisted leader', 'A senior leader / guest of honor'],
    partyLead: 'the commander and senior enlisted leader',
    orderName: 'Retirement Order', certName: 'Certificate of Retirement',
    ceremonyExtra: [], distinctive: [],
  },
};

// Build one branch's authored data (ceremonySequence, protocol elements, decisions)
// from its spec. The common spine is shared; the vocabulary + sources are the branch's.
function buildBranch(slug, s) {
  const mc = (element, sources) => ({ branch: slug, element, tier: s.tier, sources });
  const ceremonySequence = [
    'Prelude / guests seated',
    `Presentation (posting) of ${s.colors} — ${slug === 'navy' || slug === 'coastguard' ? 'honor guard' : 'color guard'}`,
    'National Anthem',
    'Invocation — chaplain',
    `Introduction of the official party and the retiring ${s.member}`,
    'Presentation of retirement awards & decorations',
    `Reading of the ${s.orderName} + ${s.certName}`,
    `Presentation of the U.S. Flag to the retiree (folded flag)`,
    'Recognition of the spouse / Family (certificate of appreciation)',
    ...s.ceremonyExtra,
    'The retiree’s remarks',
    'Benediction',
    `Retiring (retreat of) ${s.colors}`,
  ];
  const protocol = [
    { id: 'color_guard', label: (slug === 'navy' || slug === 'coastguard') ? 'Honor guard' : 'Color guard', sources: [s.protocolSrc], lead: 'weeks', note: `Posts and retires ${s.colors}. Book early through the ${s.unit}, a base honor guard, or a veterans' organization — they run on their own calendar.` },
    { id: 'flag_presentation', label: 'Folded-flag presentation', sources: ['title-4-usc-flag', s.protocolSrc], lead: 'days', note: 'A U.S. flag is ceremonially folded (13 folds) and presented to the retiree. Confirm who folds and who presents; have a stand or shadowbox to receive it.' },
    { id: 'retirement_order', label: `Reading the ${s.orderName}`, sources: [s.rsoSrc], lead: 'days', note: `A senior officer or NCO reads the ${s.orderName} and presents the ${s.certName}. Confirm the reader and that it's in hand.` },
    { id: 'shadowbox', label: 'The shadowbox', sources: [s.rsoSrc], lead: 'weeks', note: 'Holds the folded flag, rank insignia, and service/retirement medals — the keepsake of the career, and the longest-lead item. Commission it early.' },
    { id: 'chain_of_command', label: 'Chain-of-command invitations', sources: [s.partySrc], lead: 'weeks', note: `${s.partyLead[0].toUpperCase() + s.partyLead.slice(1)} are invited by protocol/precedence. Confirm who presides early.` },
    { id: 'spouse_recognition', label: 'Spouse / Family recognition', sources: [s.rsoSrc], lead: 'days', note: 'The Family served alongside the member — a Certificate of Appreciation, flowers, or a keepsake. Don’t leave it out.' },
    { id: 'honors', label: 'Honors by rank', sources: [s.protocolSrc], lead: 'days', note: 'Rendered honors scale with the retiree’s grade — confirm what their rank rates.' },
    { id: 'uniform', label: 'Uniform for the ceremony', sources: [s.uniformSrc], lead: 'days', note: 'The retiree and attending members wear the appropriate dress uniform. Name the uniform of the day on the invitation.' },
  ];
  const decisions = [
    { id: 'mil_color_guard', label: (slug === 'navy' || slug === 'coastguard') ? 'Who renders honors?' : `Who posts ${s.colors}?`, options: s.honorOpts, default: s.honorOpts[s.honorDefault || 0], when: 'T-45d', blocks: ['run_of_show'], why: `A ${(slug === 'navy' || slug === 'coastguard') ? 'honor' : 'color'} guard posts and retires ${s.colors} — book early; they run on their own calendar.`, militaryContext: mc('color_guard', [s.protocolSrc]) },
    { id: 'mil_shadowbox', label: 'The shadowbox', options: ['Commission a builder', `Have the ${s.unit} build it`, 'Build it ourselves', 'Skip it'], default: 'Commission a builder', when: 'T-45d', why: 'The shadowbox holds the folded flag, insignia, and medals — the career’s keepsake and the longest-lead item. Commission it early.', militaryContext: mc('shadowbox', [s.rsoSrc]) },
    { id: 'mil_order_reader', label: `Who reads the ${s.orderName}?`, options: ['The presiding officer', 'A senior NCO', 'The commander'], default: 'The presiding officer', when: 'T-21d', why: `A senior officer or NCO reads the ${s.orderName} and presents the ${s.certName} — confirm the reader and that it's in hand.`, militaryContext: mc('retirement_order', [s.rsoSrc]) },
    { id: 'mil_official_party', label: 'Who presides, and the official party?', options: s.partyOpts, default: s.partyOpts[0], when: 'T-45d', why: `${s.partyLead[0].toUpperCase() + s.partyLead.slice(1)} are invited by protocol and precedence — confirm who presides early.`, militaryContext: mc('chain_of_command', [s.partySrc]) },
    { id: 'mil_uniform', label: 'Uniform of the day?', options: s.uniformOpts, default: s.uniformOpts[0], when: 'T-14d', why: `Name the uniform on the invitation so the retiring ${s.member} and attending members dress to standard.`, militaryContext: mc('uniform', [s.uniformSrc]) },
    { id: 'mil_spouse', label: 'How to recognize the spouse / Family?', options: ['Certificate of Appreciation', 'Flowers + a keepsake', 'Certificate + flowers', 'A separate tribute'], default: 'Certificate + flowers', when: 'T-14d', why: `The Family served alongside the ${s.member} — recognize them; don’t leave it out.`, militaryContext: mc('spouse_recognition', [s.rsoSrc]) },
    ...(s.distinctive || []).map((d) => ({ id: d.id, label: d.label, options: d.options, default: d.default, when: d.when, why: d.why, militaryContext: mc(d.id.replace(/^mil_/, ''), [d.src]) })),
  ];
  return {
    branch: slug, authored: true, label: s.label,
    terms: { member: `the retiring ${s.member}`, unit: `the ${s.unit}`, colors: s.colors, family: 'the Family' },
    ceremonySequence, protocol, decisions,
    sources: [...new Set([s.protocolSrc, s.partySrc, s.rsoSrc, s.uniformSrc, 'title-4-usc-flag'])],
  };
}

export const BRANCHES = Object.fromEntries(Object.entries(SPECS).map(([slug, s]) => [slug, buildBranch(slug, s)]));

const BRANCH_MATCHERS = [
  [/\barmy\b|\bsoldier\b|\bsoldiers\b|\bfort\b/i, 'army'],
  [/\bnavy\b|\bsailor\b|\bnaval\b|\buss\b|\bfleet\b/i, 'navy'],
  [/\bair force\b|\bairman\b|\busaf\b/i, 'airforce'],
  [/\bmarine(s|)\b|\busmc\b|\bsemper fi\b/i, 'marines'],
  [/\bcoast guard\b|\buscg\b|\bcoastie\b/i, 'coastguard'],
  [/\bspace force\b|\bguardian\b|\bussf\b/i, 'spaceforce'],
];

export function detectMilitaryBranch(event) {
  if (!event) return null;
  const hay = [event.type, event.secondaryType, event.story, event.name, event.meaning, event.honoreeStory]
    .filter(Boolean).join(' ').toLowerCase();
  for (const [re, slug] of BRANCH_MATCHERS) if (re.test(hay)) return slug;
  if (/\bmilitary\b|\bveteran\b|\bretiring from the\b|\bin the unit\b|\bvfw\b/i.test(hay)) return 'unknown';
  return null;
}

export function isMilitaryRetirement(event) {
  if (!event) return false;
  const isRet = /retire/i.test(String(event.type || '') + ' ' + String(event.secondaryType || ''));
  return isRet && !!detectMilitaryBranch(event);
}

export function militaryRetirementContext(event) {
  if (!isMilitaryRetirement(event)) return null;
  const slug = detectMilitaryBranch(event);
  const data = (slug && BRANCHES[slug]) || null;
  if (data && data.authored) {
    return {
      branch: data.branch, label: data.label, terms: data.terms,
      ceremonySequence: data.ceremonySequence, protocol: data.protocol,
      tier: SPECS[slug].tier, sources: data.sources, authored: true,
    };
  }
  return {
    branch: slug || 'unknown', label: 'the service',
    terms: null, ceremonySequence: null, protocol: null,
    tier: 'reasoned', sources: [], authored: false,
    note: 'Military retirement recognized; branch unclear from the wording — name the branch to load its protocol.',
  };
}

// Backward-compatible export: the Army decision set (the reference shape).
export const MILITARY_DECISIONS = BRANCHES.army.decisions;

// The military decisions that apply to THIS event — the detected branch's set, else [].
export function militaryDecisionsFor(event) {
  const slug = isMilitaryRetirement(event) ? detectMilitaryBranch(event) : null;
  const data = slug && BRANCHES[slug];
  return (data && data.authored) ? data.decisions : [];
}

// ── OTHER MILITARY CEREMONIES — the same intelligence for the ceremonies a host also
//    runs. PROMOTION is authored; change-of-command / reenlistment / awards slot into the
//    same shape next. Every protocol element + decision HOLDS ITS SOURCE PROVENANCE (source
//    ids that resolve in MILITARY_SOURCES) — never a claim without a traceable citation.
const CEREMONY_DETECT = {
  promotion: /\bpromotion\b|\bpromoted\b|\bpinning\b|\bpin[- ]on\b|\bmakes? rank\b|\bfrocking\b/i,
  // change_of_command: /change of command|assumption of command|relinquish/i,   (to author)
  // reenlistment:      /re-?enlist|oath of enlistment/i,
  // awards:            /award ceremony|medal|decoration/i,
};

// Which military ceremony is this event? Promotion/etc. by wording; retirement via the
// existing type+branch detector. Null when it's not a military ceremony.
export function detectMilitaryCeremony(event) {
  if (!event) return null;
  const hay = [event.type, event.name, event.story, event.meaning].filter(Boolean).join(' ');
  for (const [type, re] of Object.entries(CEREMONY_DETECT)) if (re.test(hay)) return type;
  if (isMilitaryRetirement(event)) return 'retirement';
  return null;
}

// Build a PROMOTION context for the detected branch — grounded, provenance carried.
function buildPromotion(event) {
  const slug = detectMilitaryBranch(event) || 'army';
  const s = SPECS[slug] || SPECS.army;
  const mc = (element, sources) => ({ branch: slug, ceremony: 'promotion', element, tier: 'established-consensus', sources });
  const protocol = [
    { id: 'promotion_orders', label: 'Reading the promotion orders', sources: [s.rsoSrc], lead: 'days', note: 'The promotion orders/warrant are read aloud and presented.' },
    { id: 'oath_of_office', label: 'Oath of office (officers)', sources: ['oath-5usc-3331'], lead: 'days', note: 'A promoted officer re-takes the statutory oath of office (5 U.S.C. § 3331); enlisted promotions skip this.' },
    { id: 'pinning', label: 'Pinning the new rank', sources: [s.protocolSrc], lead: 'days', note: 'The new rank insignia is pinned/donned — traditionally by family, a mentor, or the presiding officer.' },
    { id: 'first_salute', label: 'The first salute (new officers)', sources: [s.protocolSrc], lead: 'days', note: 'A newly commissioned officer’s first salute — the officer traditionally gives a silver dollar to the first enlisted member to salute them.' },
  ];
  const decisions = [
    { id: 'prom_pinning', label: 'Who pins the new rank?', options: ['Spouse + a mentor', 'Family members', 'The presiding officer', 'A combination'], default: 'Spouse + a mentor', when: 'T-14d', why: 'The pinning is the emotional core of a promotion — decide who does the honors.', militaryContext: mc('pinning', [s.protocolSrc]) },
    { id: 'prom_oath', label: 'Who administers the oath (if an officer)?', options: ['The commander', 'A senior officer', 'A family member who has served', 'N/A — enlisted promotion'], default: 'The commander', when: 'T-14d', why: 'A promoted officer re-takes the oath of office (5 U.S.C. § 3331) — pick who administers it.', militaryContext: mc('oath_of_office', ['oath-5usc-3331']) },
    { id: 'prom_first_salute', label: 'Arrange the first salute + silver dollar?', options: ['Yes — line up an NCO + a silver dollar', 'Skip it', 'N/A — enlisted promotion'], default: 'Yes — line up an NCO + a silver dollar', when: 'T-14d', why: 'The newly commissioned officer’s first salute and the silver-dollar tradition — line up who renders it.', militaryContext: mc('first_salute', [s.protocolSrc]) },
    { id: 'prom_official_party', label: 'Who presides?', options: s.partyOpts, default: s.partyOpts[0], when: 'T-30d', why: `${s.partyLead[0].toUpperCase() + s.partyLead.slice(1)} — confirm who presides.`, militaryContext: mc('chain_of_command', [s.partySrc]) },
    { id: 'prom_uniform', label: 'Uniform of the day?', options: s.uniformOpts, default: s.uniformOpts[0], when: 'T-7d', why: 'Name the uniform on the invitation so everyone dresses to standard.', militaryContext: mc('uniform', [s.uniformSrc]) },
  ];
  return {
    ceremony: 'promotion', branch: slug, label: s.label + ' — promotion',
    protocol, decisions, tier: 'established-consensus',
    sources: [...new Set([s.protocolSrc, s.rsoSrc, s.partySrc, s.uniformSrc, 'oath-5usc-3331'])], authored: true,
  };
}

// The full military-ceremony context — routes to retirement (all six branches) or
// promotion. The provenance rides through: `sources` on the context + on every element.
export function militaryCeremonyContext(event) {
  const type = detectMilitaryCeremony(event);
  if (type === 'retirement') { const r = militaryRetirementContext(event); return r ? { ...r, ceremony: 'retirement' } : null; }
  if (type === 'promotion') return buildPromotion(event);
  return null;
}
