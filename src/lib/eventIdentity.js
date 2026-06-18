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
  graduation: 'a celebration of an achievement',
  retirement: 'recognition of a career and a new chapter',
  wedding: 'a celebration of a marriage',
  anniversary: 'a celebration of a milestone together',
  birthday: 'a celebration',
  'baby shower': 'a welcome for a new arrival',
  'bridal shower': 'a celebration before the wedding',
  quinceañera: 'a coming-of-age celebration',
  'sweet 16': 'a coming-of-age celebration',
  'dinner party': 'a gathering of friends',
  'get-together': 'a gathering',
  housewarming: 'a welcome to a new home',
  fundraiser: 'a fundraising event',
  gala: 'a fundraising event',
  corporate: 'a business gathering',
  conference: 'a professional gathering',
  'board meeting': 'a working session',
  memorial: 'a remembrance',
};

const norm = (s) => String(s || '').trim().toLowerCase();
const clean = (s) => String(s || '').trim();

function essenceOf(type) {
  const t = norm(type);
  if (TYPE_ESSENCE[t]) return TYPE_ESSENCE[t];
  // soft contains-match for free-text types ("Birthday Party", "Retirement Dinner")
  const hit = Object.keys(TYPE_ESSENCE).find((k) => t.includes(k));
  return hit ? TYPE_ESSENCE[hit] : 'an event';
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
