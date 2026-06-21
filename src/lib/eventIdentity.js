// Sprint 60B — Event Identity. A READER, not an engine. The human intelligence is
// ALREADY captured at intake (meaning_why · honoree · honoree_story · must_have_moment
// · feeling_words) and stored on the event; it was only read by the day-of RunOfShow.
// This projects those EXISTING fields into the planning surface so the event's own
// meaning orients the work — no new storage, schema, migration, engine, or workflow.
//   • pi.identity flag default OFF ⇒ nothing renders ⇒ production identity.
//   • Degrades gracefully: with no meaning captured, the reader returns null and the
//     UI shows today's behavior (the fields are optional at intake).

// pi.identity flag (default OFF). ?pi=identity / localStorage 'ngw-pi-identity' /
// REACT_APP_PI_IDENTITY='true'.
export function identityOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=identity / localStorage 'ngw-pi-identity'='0' / REACT_APP_PI_IDENTITY='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=identity\b/.test(q)) return true;
      if (/[?&]pi-off=identity\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-identity');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_IDENTITY === 'false');
}

// What an event TYPE really is — the essence beneath the format (a graduation party
// is a celebration of achievement). A plain lookup; never marketing, never poetry.
const TYPE_ESSENCE = {
  // Full type names first — exact match wins, so the most specific reading is used
  // (e.g. "Juneteenth Cookout" reads as freedom + community, not a generic cookout).
  'juneteenth cookout': 'a celebration of freedom, food, and community',
  'kwanzaa gathering': 'a celebration of heritage and community',
  'ethiopian coffee ceremony': 'a coffee ceremony and a gathering',
  'sunday dinner': 'a family dinner',
  'holiday party': 'a holiday celebration',
  'engagement party': 'a celebration of an engagement',
  'bachelorette party': 'a celebration before the wedding',
  'bachelor party': 'a celebration before the wedding',
  'gender reveal': 'a celebration of a new arrival',
  'vow renewal': 'a renewal of vows',
  'surprise proposal': 'a proposal',
  'low country boil': 'a seafood boil and a gathering',
  'crawfish boil': 'a seafood boil and a gathering',
  'crab feast': 'a seafood feast and a gathering',
  'fish fry': 'a fish fry and a gathering',
  'game night': 'a night of games with friends',
  'watch party': 'a watch party with friends',
  'card party': 'a card party with friends',
  'day party': 'a daytime party',
  'team retreat': 'a team gathering',
  'baby shower': 'a welcome for a new arrival',
  'bridal shower': 'a celebration before the wedding',
  'dinner party': 'a gathering of friends',
  'board meeting': 'a working session',
  'get-together': 'a gathering',
  // Type families / free-text fallbacks (soft contains-match below).
  graduation: 'a celebration of an achievement',
  retirement: 'recognition of a career and a new chapter',
  wedding: 'a celebration of a marriage',
  elopement: 'a celebration of a marriage',
  anniversary: 'a celebration of a milestone together',
  birthday: 'a celebration',
  quinceañera: 'a coming-of-age celebration',
  quinceanera: 'a coming-of-age celebration',
  'sweet 16': 'a coming-of-age celebration',
  juneteenth: 'a celebration of freedom and community',
  kwanzaa: 'a celebration of heritage and community',
  cookout: 'a cookout with food and people you love',
  barbecue: 'a cookout with food and people you love',
  bbq: 'a cookout with food and people you love',
  boil: 'a seafood boil and a gathering',
  repast: 'a gathering to remember and honor someone',
  reunion: 'a reunion',
  housewarming: 'a welcome to a new home',
  fundraiser: 'a fundraising event',
  gala: 'a fundraising event',
  corporate: 'a business gathering',
  conference: 'a professional gathering',
  memorial: 'a remembrance',
  party: 'a celebration',
};

const norm = (s) => String(s || '').trim().toLowerCase();
const clean = (s) => String(s || '').trim();

// P3 — is a captured must-have meaningful enough to echo into HERO copy? A trivial
// input ("m", "fun") must NOT render as 'Protect the heart: "m"'. Too short / one word
// ⇒ keep it stored, but don't surface it as a hero line (prompt the host to clarify
// instead). No interpretation, no AI cleanup — just a quality gate.
export function isMeaningfulMustHave(s) {
  const t = clean(s);
  if (t.length < 6) return false;
  return t.split(/\s+/).filter(Boolean).length >= 2;
}

function essenceOf(type) {
  const t = norm(type);
  if (TYPE_ESSENCE[t]) return TYPE_ESSENCE[t];
  // soft WORD-BOUNDARY match for free-text types ("Birthday Party", "Retirement Dinner").
  // Word boundaries avoid false hits like "birthday party" matching "day party".
  const hit = Object.keys(TYPE_ESSENCE).find((k) => {
    try { return new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t); }
    catch { return t.includes(k); }
  });
  // Never degrade to "an event" — that reads as a broken placeholder ("This is an event").
  // A warm, true-for-anything floor instead.
  return hit ? TYPE_ESSENCE[hit] : 'a gathering';
}

// identityStatement(event) → one factual sentence. e.g.
// "This is a celebration of an achievement for Wanda." (assembled, not generated.)
export function identityStatement(event) {
  if (!event) return '';
  const essence = essenceOf(event.type);
  const who = clean(event.honoree);
  return who ? `This is ${essence} for ${who}.` : `This is ${essence}.`;
}

// success(event) → up to 5 concise bullets. Specific (captured) first, then universal.
function successBullets(event) {
  const out = [];
  const must = clean(event.must_have_moment);
  const feel = clean(event.feeling_words);
  const who = clean(event.honoree) || 'the host';
  if (must) out.push(`The must-have happens: ${must}`);
  if (feel) out.push(`Everyone feels ${feel}`);
  out.push(`${who} feels celebrated`);
  out.push('The day runs without a hitch');
  out.push('The people who matter are there');
  return out.slice(0, 5);
}

// eventIdentity(event) → the projection, or null when nothing human is captured
// (so the surface degrades to today's behavior). Pure — safe on every render.
export function eventIdentity(event) {
  if (!event) return null;
  const intent = clean(event.meaning_why);
  const forWhom = clean(event.honoree);
  const story = clean(event.honoree_story);
  const mustHaveMoment = clean(event.must_have_moment);
  const feeling = clean(event.feeling_words);
  // "Human" only if SOMETHING beyond the bare type/name was captured.
  const hasMeaning = !!(intent || story || mustHaveMoment || feeling);
  if (!hasMeaning && !forWhom) return null;
  return {
    reallyIs: identityStatement(event),
    forWhom: forWhom ? { name: forWhom, story } : null,
    intent,                  // meaning_why — why the event exists
    success: successBullets(event),
    mustHaveMoment,          // the one tracked priority
    feeling,
    hasMeaning,
  };
}

// ── Part 6: Outcome alignment — "did the thing that mattered most happen?" ───────
// Reuses the EXISTING outcome store (event.outcomes, from 58E). No new architecture.
export const MUST_HAVE_SIGNALS = ['happened', 'partly', 'missed'];
export const MUST_HAVE_LABEL = { happened: 'It happened', partly: 'Partly', missed: 'Missed it' };
export function setMustHaveOutcome(event, status, now) {
  if (!event) return event;
  const o = event.outcomes || {};
  return { ...event, outcomes: { ...o, capturedAt: now || o.capturedAt || null, mustHave: status } };
}
export function mustHaveOutcome(event) {
  return (event && event.outcomes && event.outcomes.mustHave) || null;
}

// ── Sprint 60C #1 — Outcome reflection (feeling + why) ──────────────────────────
// Extends the SAME outcomes store (event.outcomes, 58E) the must-have uses — no new
// schema. The feeling capture mirrors the must-have capture; `meaning_why` is shown
// as read-only framing. Pure expression, zero engine touch.
export const FEELING_SIGNALS = ['yes', 'partly', 'no'];
export const FEELING_LABEL = { yes: 'Yes', partly: 'Somewhat', no: 'Not really' };
export function setFeelingOutcome(event, status, now) {
  if (!event) return event;
  const o = event.outcomes || {};
  return { ...event, outcomes: { ...o, capturedAt: now || o.capturedAt || null, feeling: status } };
}
export function feelingOutcome(event) {
  return (event && event.outcomes && event.outcomes.feeling) || null;
}

// identityReflection(event) → null | { why, feeling }. The post-event framing the
// OutcomeCapture surface renders. Null when nothing reflective was captured.
export function identityReflection(event) {
  if (!event) return null;
  const why = clean(event.meaning_why);
  const feeling = clean(event.feeling_words);
  if (!why && !feeling) return null;
  return { why, feeling };
}

// ── Sprint 60C #2 — must-have ↔ action link (confidence-tiered, graceful) ───────
// Pure fuzzy matcher: does a candidate action/task text confidently serve the
// captured must-have? Returns null when nothing is captured; otherwise a confidence
// in [0,1] + matched flag. Used ONLY post-engine to annotate (never to reorder).
const _STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'with', 'at',
  'in', 'on', 'my', 'our', 'your', 'their', 'his', 'her', 'is', 'are', 'be', 'will',
  'that', 'this', 'it', 'get', 'gets', 'getting', 'have', 'has', 'do', 'does']);
function _sig(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !_STOP.has(w));
}
export function mustHaveLink(event, candidateText) {
  const moment = clean(event && event.must_have_moment);
  if (!moment) return null;
  const momentSig = _sig(moment);
  if (!momentSig.length) return { confidence: 0, matched: false, shared: [] };
  const candSet = new Set(_sig(candidateText));
  const shared = [...new Set(momentSig)].filter((w) => candSet.has(w));
  const confidence = shared.length / new Set(momentSig).size;
  return { confidence, matched: shared.length >= 1 && confidence >= 0.3, shared };
}

// mustHaveBecause(event, candidateText) → a quiet, traceable "because" string when
// the action confidently serves the must-have; null otherwise (graceful degrade).
export function mustHaveBecause(event, candidateText) {
  const link = mustHaveLink(event, candidateText);
  if (!link || !link.matched) return null;
  return `Protecting your must-have — ${clean(event.must_have_moment)}`;
}
