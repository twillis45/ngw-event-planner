// Sprint 60F — Moment Library v1 (ROS-ONLY). Authored planning knowledge, NOT
// intelligence. Survives every audit in the 60C→60E arc:
//   • 60D: NO free-text classification, NO NLP, NO corpus — the moments are a small
//     AUTHORED catalog keyed by event type. Valid at event #1.
//   • 61A: delivers value with zero data scale — it just guarantees the moment a host
//     cares about lands on the Run of Show with an owner.
//   • 60E: the ONE honest consumer is the Run of Show. Every moment maps to the one
//     dependency that always exists — a ROS segment. The `support` tier documents the
//     DEEPER dependency (food / photographer / AV); we never pretend to provision it,
//     we only NOTE it. No new engine, no recommendations, no scoring, no ranking.
//
// Flag pi.moments (default OFF). ?pi=moments / localStorage 'ngw-pi-moments' /
// REACT_APP_PI_MOMENTS='true'.

export function momentsOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=moments / localStorage 'ngw-pi-moments'='0' / REACT_APP_PI_MOMENTS='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=moments\b/.test(q)) return true;
      if (/[?&]pi-off=moments\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-moments');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_MOMENTS === 'false');
}

// A moment: { id, label, owner, support, match[], note? }
//   support: 'supported' — fully covered by an existing dependency (ROS + food/photo/dj)
//            'partial'   — gets a ROS segment, but its deeper need (AV/files/mic) is NOT
//                          tracked anywhere; `note` tells the planner what to bring.
//   match:   keywords used to detect the moment is ALREADY on the ROS (so we never
//            double-insert what buildStarterROS already seeded). Kept SPECIFIC so a
//            generic seeded "Tribute & recognition" doesn't suppress a real "Video tribute".
const M = {
  toast:        { id: 'toast',        label: 'Toast',                owner: 'Host / MC',    support: 'supported', match: ['toast'] },
  cake:         { id: 'cake',         label: 'Cake cutting',         owner: 'Host',         support: 'supported', match: ['cake'] },
  groupPhoto:   { id: 'groupPhoto',   label: 'Group photo',          owner: 'Photographer', support: 'supported', match: ['group photo', 'family photo'] },
  firstDance:   { id: 'firstDance',   label: 'First dance',          owner: 'Couple / DJ',  support: 'supported', match: ['first dance'] },
  giftOpening:  { id: 'giftOpening',  label: 'Gift opening',         owner: 'Host',         support: 'supported', match: ['gift'] },
  sendOff:      { id: 'sendOff',      label: 'Send-off',             owner: 'Host / MC',    support: 'supported', match: ['send-off', 'send off', 'farewell'] },
  ceremony:     { id: 'ceremony',     label: 'Ceremony',             owner: 'Officiant',    support: 'supported', match: ['ceremony'] },
  recognition:  { id: 'recognition',  label: 'Recognition speech',   owner: 'Host / MC',    support: 'partial',   match: ['recognition speech'], note: 'Confirm a microphone — AV isn’t tracked here.' },
  award:        { id: 'award',        label: 'Award presentation',   owner: 'Host / MC',    support: 'partial',   match: ['award'],              note: 'Have the award + podium ready.' },
  videoTribute: { id: 'videoTribute', label: 'Video tribute',        owner: 'AV / MC',      support: 'partial',   match: ['video tribute', 'tribute video', 'video montage'], note: 'Bring a screen/projector + the files — AV isn’t tracked here.' },
  keynote:      { id: 'keynote',      label: 'Keynote / remarks',    owner: 'Speaker',      support: 'partial',   match: ['keynote'],            note: 'Confirm a mic / slides — AV isn’t tracked here.' },
  appeal:       { id: 'appeal',       label: 'The ask / appeal',     owner: 'Host / MC',    support: 'partial',   match: ['appeal', 'the ask'],  note: 'Donations aren’t tracked here — brief whoever makes the ask.' },
  games:        { id: 'games',        label: 'Games',                owner: 'Host / MC',    support: 'supported', match: ['games'] },
  familyMoment: { id: 'familyMoment', label: 'Family celebration',   owner: 'Host',         support: 'supported', match: ['family celebration'] },
  sharedMeal:   { id: 'sharedMeal',   label: 'Shared meal / mingle', owner: 'Host',         support: 'supported', match: ['shared meal', 'mingle'] },
  bouquetToss:  { id: 'bouquetToss',  label: 'Bouquet toss',         owner: 'DJ / MC',      support: 'supported', match: ['bouquet'] },
  reveal:       { id: 'reveal',       label: 'The reveal',           owner: 'Host',         support: 'supported', match: ['the reveal', 'gender reveal'] },
  proposal:     { id: 'proposal',     label: 'The proposal',         owner: 'Host',         support: 'partial',   match: ['the proposal', 'proposal moment'], note: 'The surprise itself — brief whoever cues the timing/signal.' },
};

// The ONE universal moment that's honest for ANY event type — including business
// events. Toast and cake are NOT universal (no cake at a board meeting), so they
// live only on the types that actually have them. (Grandmother / VenueOps lens.)
const COMMON = [M.groupPhoto];

// Authored type → moments. Free-text types soft-match by `includes` (e.g. "Retirement
// Dinner" → retirement). Unknown types fall back to COMMON only.
const BY_TYPE = {
  'wedding':           [M.ceremony, M.firstDance, M.toast, M.cake, M.bouquetToss, M.groupPhoto, M.sendOff],
  'elopement':         [M.ceremony, M.toast, M.groupPhoto],
  'vow renewal':       [M.ceremony, M.firstDance, M.toast, M.cake, M.groupPhoto],
  'engagement':        [M.toast, M.firstDance, M.cake, M.groupPhoto],
  'surprise proposal': [M.proposal, M.groupPhoto],
  'anniversary':       [M.toast, M.firstDance, M.videoTribute, M.cake, M.groupPhoto],
  'retirement':        [M.recognition, M.toast, M.videoTribute, M.award, M.cake, M.groupPhoto],
  'birthday':          [M.cake, M.toast, M.giftOpening, M.groupPhoto],
  'sweet 16':          [M.cake, M.toast, M.firstDance, M.groupPhoto],
  'quinceañera':       [M.cake, M.toast, M.firstDance, M.groupPhoto],
  'gender reveal':     [M.reveal, M.cake, M.groupPhoto],
  'graduation':        [M.recognition, M.award, M.cake, M.groupPhoto, M.familyMoment],
  'baby shower':       [M.games, M.giftOpening, M.cake, M.groupPhoto],
  'bridal shower':     [M.games, M.giftOpening, M.cake, M.groupPhoto],
  'reunion':           [M.groupPhoto, M.recognition, M.sharedMeal],
  'award ceremony':    [M.award, M.recognition, M.keynote, M.groupPhoto],
  'corporate':         [M.keynote, M.award, M.recognition, M.groupPhoto],
  'conference':        [M.keynote, M.recognition, M.groupPhoto],
  'product launch':    [M.keynote, M.groupPhoto],
  'fundraiser':        [M.appeal, M.recognition, M.keynote, M.groupPhoto],
  'gala':              [M.appeal, M.recognition, M.keynote, M.groupPhoto],
  'holiday party':     [M.toast, M.groupPhoto, M.games],
  'dinner party':      [M.toast, M.sharedMeal, M.groupPhoto],
  'housewarming':      [M.toast, M.groupPhoto],
  'get-together':      [M.toast, M.groupPhoto],
};

const norm = (s) => String(s || '').trim().toLowerCase();

// momentsForType(type) → the authored moment menu for an event type (type-specific
// first, then any COMMON not already included). Deterministic; deduped by id.
export function momentsForType(type) {
  const t = norm(type);
  let specific = BY_TYPE[t];
  if (!specific) {
    const hitKey = Object.keys(BY_TYPE).find((k) => t.includes(k));
    specific = hitKey ? BY_TYPE[hitKey] : [];
  }
  const seen = new Set(specific.map((m) => m.id));
  const out = [...specific];
  COMMON.forEach((m) => { if (!seen.has(m.id)) { out.push(m); seen.add(m.id); } });
  return out;
}

// momentOnRos(ros, moment) → is this moment ALREADY represented on the run of show?
// (so the picker only offers what's missing, and a tap never double-inserts.)
export function momentOnRos(ros, moment) {
  if (!moment) return false;
  const segs = Array.isArray(ros) ? ros : [];
  const hay = segs.map((s) => norm(s && s.segment)).join(' | ');
  return (moment.match || []).some((kw) => hay.includes(norm(kw)));
}

// buildMomentSegment(moment) → a Run-of-Show segment for this moment, MINUS its id
// (the caller stamps `id: uid()`, keeping this module pure / test-stable). Mirrors the
// exact shape RunOfShow.add() uses; time left blank for the planner to slot.
export function buildMomentSegment(moment) {
  if (!moment) return null;
  return {
    time: '',
    segment: moment.label,
    location: '',
    type: 'event',
    owner: moment.owner || '',
    confirmed: false,
    notes: moment.note || '',
    fromMoment: moment.id,
  };
}

// suggestableMoments(type, ros) → the menu minus anything already on the ROS.
export function suggestableMoments(type, ros) {
  return momentsForType(type).filter((m) => !momentOnRos(ros, m));
}
