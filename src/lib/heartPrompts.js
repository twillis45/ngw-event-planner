// ─── heartPrompts — the "Make it yours" examples, by event type ──────────────
//
// CLICK-THROUGH AUDIT 2026-07-28. The five heart questions ("Who is it for?",
// "Their story, in a line or two", …) shipped with ONE hardcoded set of
// examples: a retirement for "Margaret — my mom", "32 years at the library;
// she taught half the county to read". Driven live on Marcus & Adaeze's
// WEDDING, that is what the host was shown — someone else's mother, on the
// screen the app uses to ask what the day is really about.
//
// A placeholder is not decoration here. This surface asks the host for the
// emotional core of their event, and the example sets the register of the
// answer. The wrong example doesn't just look sloppy, it asks the wrong
// question: a wedding is not "for" one honoree the way a retirement is, and a
// repast must never be prompted with "warm, loud, unhurried".
//
// These are EXAMPLES, never defaults — nothing here is ever written to the
// event. The field stays empty until the host types (see the caller: value is
// event.<key>, placeholder is this).

// Matched in order — first hit wins, so put the specific before the general.
//
// PROMPTS, NOT SOMEONE ELSE'S STORY (Wanda audit P1-9, 11/22/2026). The sets
// still carried strangers' lives ("32 years at the library; she taught half
// the county to read") — and on Wanda's Army retirement that sat in the field
// beside her own "30 years in the Army". Each example now names what to write,
// in the register of the event, and asserts nothing about anyone.
const SETS = [
  {
    id: 'memorial',
    // Repast / memorial / funeral. Solemn register: no "celebrate", no "loud".
    match: /repast|memorial|funeral|celebration of life|wake|shiva|homegoing/i,
    honoree: 'Their name',
    honoree_story: 'What people will say about them, in a line',
    meaning_why: 'What the family needs from this day',
    feeling_words: 'For example: gentle, unhurried, room to talk',
    must_have_moment: 'The one thing the family needs to happen',
  },
  {
    id: 'couple',
    match: /wedding|elopement|vow|engagement|anniversar|rehearsal dinner/i,
    honoree: 'The two of you',
    honoree_story: 'How you got here, in a line or two',
    meaning_why: 'Why this day, with these people',
    feeling_words: 'For example: warm, unhurried, a little loud',
    must_have_moment: 'The moment you won’t skip',
  },
  {
    id: 'reunion',
    match: /reunion|family gathering|homecoming/i,
    honoree: 'Who is coming together',
    honoree_story: 'What ties everyone together',
    meaning_why: 'Why now',
    feeling_words: 'For example: warm, loud, unhurried',
    must_have_moment: 'The moment everyone should be in',
  },
  {
    id: 'graduation',
    match: /graduat|commencement|promotion ceremony/i,
    honoree: 'The graduate — and who they are to you',
    honoree_story: 'What it took to get here',
    meaning_why: 'Why marking it matters',
    feeling_words: 'For example: proud, easy, a little loud',
    must_have_moment: 'The moment that has to happen',
  },
  {
    id: 'retirement',
    match: /retirement|farewell|last day|service send/i,
    honoree: 'Who is retiring — and who they are to you',
    honoree_story: 'Their years of work, in a line',
    meaning_why: 'Why this send-off matters',
    feeling_words: 'For example: proud, warm, unhurried',
    must_have_moment: 'The moment that has to happen',
  },
  {
    id: 'baby',
    match: /baby shower|baby|gender reveal|christening|baptism|naming/i,
    honoree: 'Who it’s for',
    honoree_story: 'Their story so far, in a line',
    meaning_why: 'Why gathering for this matters',
    feeling_words: 'For example: calm, warm, short',
    must_have_moment: 'The moment that has to happen',
  },
  {
    id: 'birthday',
    match: /birthday|quince|sweet 16|sweet sixteen|bar mitzvah|bat mitzvah|milestone/i,
    honoree: 'Whose birthday — and the age, if it’s a big one',
    honoree_story: 'Who they are, in a line',
    meaning_why: 'Why this one matters',
    feeling_words: 'For example: warm, loud, unhurried',
    must_have_moment: 'The moment that has to happen',
  },
];

// The fallback: deliberately person-shaped but unspecific, so it reads as an
// example rather than someone else's life.
const GENERIC = {
  id: 'generic',
  honoree: 'Who the day is really for',
  honoree_story: 'A line about them — the thing people would say',
  meaning_why: 'Why this one matters more than the last',
  feeling_words: 'For example: warm, unhurried',
  must_have_moment: 'The one thing that has to happen',
};

/**
 * heartFieldsFor(event) → { honoree, honoree_story, meaning_why, feeling_words, must_have_moment }
 *
 * WHAT SHE ALREADY SAID (Wanda audit P1-9, 11/22/2026). Creation stores the
 * story as `story` and the why as `meaning`; "Make it yours" read only
 * `honoree_story` and `meaning_why`, so it opened empty over an event that had
 * both. Her answer in the heart field wins; the creation words fill the gap.
 */
export function heartFieldsFor(event) {
  const ev = event || {};
  const pick = (...vals) => {
    for (const v of vals) { const t = String(v == null ? '' : v).trim(); if (t) return t; }
    return '';
  };
  return {
    honoree: pick(ev.honoree),
    honoree_story: pick(ev.honoree_story, ev.honoreeStory, ev.story),
    meaning_why: pick(ev.meaning_why, ev.meaning),
    feeling_words: pick(ev.feeling_words),
    must_have_moment: pick(ev.must_have_moment),
  };
}

/**
 * heartPlaceholders(type) → { honoree, honoree_story, meaning_why,
 *                             feeling_words, must_have_moment }
 * `type` is the event's own type/label string. Unknown or missing → GENERIC.
 */
export function heartPlaceholders(type) {
  const t = String(type || '').trim();
  if (!t) return { ...GENERIC };
  const hit = SETS.find((s) => s.match.test(t));
  return hit ? { ...hit } : { ...GENERIC };
}

export const HEART_PROMPT_SETS = SETS;
