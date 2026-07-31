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
const SETS = [
  {
    id: 'memorial',
    // Repast / memorial / funeral. Solemn register: no "celebrate", no "loud".
    match: /repast|memorial|funeral|celebration of life|wake|shiva|homegoing/i,
    honoree: 'Deacon Willie Hayes',
    honoree_story: 'Fifty years in the choir loft; he never missed a Sunday',
    meaning_why: 'His people need somewhere to sit down together afterward',
    feeling_words: 'gentle, unhurried, room to talk',
    must_have_moment: 'The family eats before anyone else is served',
  },
  {
    id: 'couple',
    match: /wedding|elopement|vow|engagement|anniversar|rehearsal dinner/i,
    honoree: 'Marcus & Adaeze — us',
    honoree_story: 'Eight years, two cities, one very patient dog',
    meaning_why: 'Both families in one room for the first time',
    feeling_words: 'warm, unhurried, a little loud',
    must_have_moment: 'Both mothers help light the candle',
  },
  {
    id: 'reunion',
    match: /reunion|family gathering|homecoming/i,
    honoree: 'The Whitfield side — all of us',
    honoree_story: 'Five states, one weekend, first time since ’19',
    meaning_why: 'The cousins have never all met each other',
    feeling_words: 'warm, loud, unhurried',
    must_have_moment: 'The whole family on the steps for one photo',
  },
  {
    id: 'graduation',
    match: /graduat|commencement|promotion ceremony/i,
    honoree: 'Maya — my daughter',
    honoree_story: 'First in the family to finish; worked nights the whole way',
    meaning_why: 'She thinks nobody noticed how hard it was',
    feeling_words: 'proud, easy, a little loud',
    must_have_moment: 'Her grandmother hands her the cap',
  },
  {
    id: 'retirement',
    match: /retirement|farewell|last day|service send/i,
    honoree: 'Margaret — my mom',
    honoree_story: '32 years at the library; she taught half the county to read',
    meaning_why: 'She never lets anyone celebrate her — this time we are',
    feeling_words: 'warm, loud, unhurried',
    must_have_moment: 'Everyone on the lawn for the sunset photo',
  },
  {
    id: 'baby',
    match: /baby shower|baby|gender reveal|christening|baptism|naming/i,
    honoree: 'Priya & the baby',
    honoree_story: 'Waited a long time for this one',
    meaning_why: 'She has looked after everyone else for years',
    feeling_words: 'calm, warm, short',
    must_have_moment: 'Her sister reads the letter from their mom',
  },
  {
    id: 'birthday',
    match: /birthday|quince|sweet 16|sweet sixteen|bar mitzvah|bat mitzvah|milestone/i,
    honoree: 'Priya — turning 40',
    honoree_story: 'She has thrown everyone else’s party for twenty years',
    meaning_why: 'This is the first one that is actually hers',
    feeling_words: 'warm, loud, unhurried',
    must_have_moment: 'The lights go down before the cake comes out',
  },
];

// The fallback: deliberately person-shaped but unspecific, so it reads as an
// example rather than someone else's life.
const GENERIC = {
  id: 'generic',
  honoree: 'Who the day is really for',
  honoree_story: 'A line about them — the thing people would say',
  meaning_why: 'Why this one matters more than the last',
  feeling_words: 'warm, unhurried',
  must_have_moment: 'The one thing that has to happen',
};

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
