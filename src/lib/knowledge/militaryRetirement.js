// ─── Military Retirement intelligence — protocol + ceremony, branch-aware ────
//
// Host report (2026-07-16): a military retirement is not a generic retirement
// party — it carries real, documented PROTOCOL (a color guard, the folded-flag
// presentation, the retirement order reading, a shadowbox, honors by rank) that
// the app knew nothing about. This module is that knowledge, in code.
//
// LEADS WITH ARMY (host's event is an Army retirement); the BRANCHES map is
// structured so Navy / Air Force / Marines / Coast Guard / Space Force slot in
// the same shape later. Grounded to real, citable references — same discipline
// as culturalContext.js: every protocol claim traces to a source id below, tier
// is honest ('established-consensus' for regulation/USC-level, never dressed up).

export const MILITARY_SOURCES = {
  'ar-600-25': {
    title: 'AR 600-25, Salutes, Honors, and Visits of Courtesy',
    publisher: 'Headquarters, Department of the Army',
    tier: 'established-consensus',
    note: 'The Army regulation governing honors, salutes, and the courtesies rendered at official ceremonies.',
  },
  'da-pam-600-60': {
    title: 'DA PAM 600-60, A Guide to Protocol and Etiquette for Official Entertainment',
    publisher: 'Department of the Army',
    tier: 'established-consensus',
    note: 'The Army protocol/etiquette guide covering ceremony sequence, the official party, and precedence.',
  },
  'title-4-usc-flag': {
    title: '4 U.S. Code Chapter 1 — The Flag',
    publisher: 'U.S. Government (Office of the Law Revision Counsel)',
    tier: 'established-consensus',
    note: 'Federal flag code — display, respect, and the basis for the ceremonial folding of the flag.',
  },
  'army-rso': {
    title: 'U.S. Army Retirement Services (RSO) — retirement ceremony guidance',
    publisher: 'U.S. Army Human Resources Command / Retirement Services',
    tier: 'established-consensus',
    note: 'Army Retirement Services Office guidance: certificates, the retiree/spouse recognition, and the ceremony a unit runs.',
  },
};

// A militaryRetirement context is grounded when it names a branch AND cites >=1
// real source id that resolves in MILITARY_SOURCES (mirrors isGroundedCulture).
export function isGroundedMilitary(ctx) {
  return !!(ctx
    && typeof ctx === 'object'
    && ctx.branch
    && (ctx.tier === 'established-consensus' || ctx.tier === 'researched')
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!MILITARY_SOURCES[s]));
}

export function militarySourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => MILITARY_SOURCES[s]).filter(Boolean);
}

// ── Branch data. ARMY is authored; the others carry `authored:false` so a caller
//    can detect the branch and honestly say "protocol coming" rather than fake it.
export const BRANCHES = {
  army: {
    branch: 'army',
    authored: true,
    label: 'U.S. Army',
    // Vocabulary a seasoned Army planner uses — so copy reads right, never civilianized.
    terms: { member: 'the retiring Soldier', unit: 'the unit', colors: 'the unit colors (guidon)', family: 'the Family' },
    // The standard Army retirement ceremony order. A host doesn't run every element,
    // but this is the spine a formal ceremony follows (RSO / DA PAM 600-60).
    ceremonySequence: [
      'Prelude / guests seated',
      'Presentation (posting) of the Colors — color guard',
      'National Anthem',
      'Invocation — chaplain',
      'Introduction of the official party and the retiring Soldier',
      'Presentation of retirement awards & decorations',
      'Reading of the Retirement Order + Certificate of Retirement',
      'Presentation of the U.S. Flag to the retiree (folded flag)',
      'Recognition of the spouse / Family (certificate of appreciation)',
      'The retiree’s remarks',
      'Benediction',
      'Retiring (retreat of) the Colors',
    ],
    // The protocol elements that carry lead time or a real decision for the host.
    protocol: [
      { id: 'color_guard', label: 'Color guard', sources: ['ar-600-25'], lead: 'weeks', note: 'A color guard posts and retires the Colors. Arrange it through the unit, an ROTC/JROTC detachment, or a VFW/American Legion honor guard — book early; they run on their own calendar.' },
      { id: 'flag_presentation', label: 'Folded-flag presentation', sources: ['title-4-usc-flag', 'ar-600-25'], lead: 'days', note: 'A U.S. flag is ceremonially folded (13 folds) and presented to the retiree. Confirm who folds and who presents, and have a stand or shadowbox ready to receive it.' },
      { id: 'retirement_order', label: 'Reading the Retirement Order', sources: ['army-rso'], lead: 'days', note: 'A senior officer or NCO reads the published Retirement Order and presents the Certificate of Retirement. Confirm the reader and that the order/certificate are in hand.' },
      { id: 'shadowbox', label: 'The shadowbox', sources: ['army-rso'], lead: 'weeks', note: 'A hand-built shadowbox holds the folded flag, rank insignia, service/retirement medals, and unit patches — the keepsake of the career. Longest lead item; commission it early.' },
      { id: 'chain_of_command', label: 'Chain-of-command invitations', sources: ['da-pam-600-60'], lead: 'weeks', note: 'The commander, command sergeant major, and key leaders are invited by protocol/precedence. Confirm who presides and the official party early.' },
      { id: 'spouse_recognition', label: 'Spouse / Family recognition', sources: ['army-rso'], lead: 'days', note: 'The spouse/Family are recognized for their service alongside the Soldier — a Certificate of Appreciation, flowers, or a keepsake. Don’t leave it out.' },
      { id: 'honors', label: 'Honors by rank', sources: ['ar-600-25'], lead: 'days', note: 'Rendered honors (ruffles and flourishes, a cannon salute for general officers, etc.) scale with the retiree’s rank per AR 600-25. Confirm what the retiree’s grade rates.' },
      { id: 'uniform', label: 'Uniform for the ceremony', sources: ['da-pam-600-60'], lead: 'days', note: 'The retiring Soldier and Soldiers attending wear the appropriate dress uniform (Army Service/Blue). Name the uniform of the day on the invitation.' },
    ],
  },
  // Others intentionally not authored yet — same shape, filled next.
  navy: { branch: 'navy', authored: false, label: 'U.S. Navy' },
  airforce: { branch: 'airforce', authored: false, label: 'U.S. Air Force' },
  marines: { branch: 'marines', authored: false, label: 'U.S. Marine Corps' },
  coastguard: { branch: 'coastguard', authored: false, label: 'U.S. Coast Guard' },
  spaceforce: { branch: 'spaceforce', authored: false, label: 'U.S. Space Force' },
};

// Detect the branch from what the host actually said (event type/story/name/meaning).
// Conservative: returns null unless there's a real military signal, so a civilian
// retirement is never mislabeled.
const BRANCH_MATCHERS = [
  [/\barmy\b|\bsoldier\b|\bsoldiers\b|\bfort\b/i, 'army'],
  [/\bnavy\b|\bsailor\b|\bnaval\b|\buss\b/i, 'navy'],
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
  // a generic "military" / "veteran" / "unit" signal on a retirement, branch unknown
  if (/\bmilitary\b|\bveteran\b|\bretiring from the\b|\bin the unit\b|\bvfw\b/i.test(hay)) return 'unknown';
  return null;
}

// Is this event a MILITARY retirement? (retirement type OR secondaryType + a branch signal.)
export function isMilitaryRetirement(event) {
  if (!event) return false;
  const isRet = /retire/i.test(String(event.type || '') + ' ' + String(event.secondaryType || ''));
  return isRet && !!detectMilitaryBranch(event);
}

// The protocol context for this event — the intelligence a caller surfaces / wires
// into decisions + timeline. Returns null for a non-military or non-retirement event.
export function militaryRetirementContext(event) {
  if (!isMilitaryRetirement(event)) return null;
  const slug = detectMilitaryBranch(event);
  const data = (slug && BRANCHES[slug]) || null;
  if (data && data.authored) {
    return {
      branch: data.branch,
      label: data.label,
      terms: data.terms,
      ceremonySequence: data.ceremonySequence,
      protocol: data.protocol,
      tier: 'established-consensus',
      sources: ['ar-600-25', 'da-pam-600-60', 'title-4-usc-flag', 'army-rso'],
      authored: true,
    };
  }
  // Military retirement detected, but this branch isn't authored yet — honest partial.
  return {
    branch: slug || 'unknown',
    label: (data && data.label) || 'the service',
    terms: null, ceremonySequence: null, protocol: null,
    tier: 'reasoned',
    sources: [],
    authored: false,
    note: 'Military retirement recognized; full protocol for this branch is coming — the Army protocol is the reference shape.',
  };
}
