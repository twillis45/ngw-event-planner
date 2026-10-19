// ─── "WE NOW NEED TO KNOW X, BECAUSE Y CHANGED" ─────────────────────────────
//
// THE GAP, stated precisely. Derive-on-read answers "given everything known,
// what is true?" and answers it well. It has no way to say "answering THAT
// question has made a DIFFERENT question relevant, and nobody has asked it."
//
// THE REFERENCE CASE IS REAL, not an illustration. P1-2 normalised "she uses a
// walker" and wired it to the two domains that could act on it truthfully —
// seating and lodging — while recording `place` as deliberately NOT reached,
// because a step-free requirement cannot be checked against a venue the app
// knows nothing about.
//
// That remains true of the venue itself. It stops being the whole story the
// moment the host names one: now there is a specific building, a specific
// unknown about it, and exactly one person who can settle it.
//
// WHAT THIS MUST NOT DO is answer the question. The app has no accessibility
// data for any venue. It asks, records, and stops asking.
import { openQuestionsFor, answerOpenQuestionPatch } from '../openQuestions';
import { SURFACES } from '../surfaceRegistry';
import { heardAccessNeeds } from '../accessNeeds';

const WALKER = heardAccessNeeds("Mom's 80th in Santa Fe, sit-down lunch, she uses a walker");

const base = (over = {}) => ({
  id: 'ev-oq', type: 'Birthday', name: "Mom's 80th",
  date: '2027-06-17',
  ...over,
});
const withVenue = (over = {}) => base({ venue: 'The Lodge at Santa Fe', ...over });
const ids = (qs) => qs.map((q) => q.id);

describe('both halves must be true — neither alone asks anything', () => {
  test('a venue and a need together produce the question', () => {
    expect(ids(openQuestionsFor(withVenue({ accessNeeds: WALKER })))).toEqual(['venue-step-free']);
  });

  test('a need with NO venue asks nothing — there is no building to ask about', () => {
    expect(openQuestionsFor(base({ accessNeeds: WALKER }))).toEqual([]);
  });

  test('a venue with NO need asks nothing — it is not a checklist', () => {
    // The guard against a primitive that grows into a form. A question nobody
    // needs answered is the thing the brief warns raisers become.
    expect(openQuestionsFor(withVenue())).toEqual([]);
  });

  test('neither one asks nothing', () => {
    expect(openQuestionsFor(base())).toEqual([]);
    expect(openQuestionsFor(null)).toEqual([]);
  });
});

describe('the question says what made it relevant', () => {
  const q = () => openQuestionsFor(withVenue({ accessNeeds: WALKER }))[0];

  test('it names the building', () => {
    expect(q().question).toBe('Is there a step-free way into The Lodge at Santa Fe?');
  });

  test('and it says WHY it is being asked now, in her own words', () => {
    // A question that cannot say what made it relevant is indistinguishable
    // from a field nobody asked for.
    expect(q().because).toMatch(/You named The Lodge at Santa Fe/);
    expect(q().because).toMatch(/she uses a walker/);
  });

  test('a guest-stated need names the guest instead', () => {
    const got = openQuestionsFor(withVenue({
      guests: [{ id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', access: ['Step-free / wheelchair'] }],
    }));
    expect(got[0].because).toMatch(/Tonya Brooks needs a step-free route/);
  });

  test('IT DOES NOT ANSWER ITSELF — it says who to ask', () => {
    // The app holds no accessibility data for any venue. Guessing would be the
    // fabricated consequence this sprint exists to prevent.
    expect(q().askWho).toBe('the venue');
    const blob = JSON.stringify(q()).toLowerCase();
    expect(/\b(?:probably|likely|should be|we think|appears)\b/.test(blob)).toBe(false);
  });
});

describe('answering it ends it — including answering no', () => {
  const ev = () => withVenue({ accessNeeds: WALKER });

  test('yes closes it', () => {
    const e = ev();
    const after = { ...e, ...answerOpenQuestionPatch(openQuestionsFor(e)[0], true) };
    expect(openQuestionsFor(after)).toEqual([]);
  });

  test('NO ALSO CLOSES IT — "there are steps" is information, not an open question', () => {
    // The distinction that stops this becoming the thing P1-3 just finished
    // removing from the clause list: re-asking something already answered.
    const e = ev();
    const after = { ...e, ...answerOpenQuestionPatch(openQuestionsFor(e)[0], false) };
    expect(openQuestionsFor(after)).toEqual([]);
    expect(after.venueStepFree).toBe(false);
  });

  test('it is a patch, not a mutation', () => {
    const e = ev();
    answerOpenQuestionPatch(openQuestionsFor(e)[0], true);
    expect(e.venueStepFree).toBeUndefined();
  });

  test('a non-answer is refused rather than stored as one', () => {
    const q = openQuestionsFor(ev())[0];
    expect(answerOpenQuestionPatch(q, null)).toBe(null);
    expect(answerOpenQuestionPatch(q, 'maybe')).toBe(null);
  });
});

describe('eventPlan stays the authority — this only RAISES', () => {
  const surface = () => SURFACES.find((s) => s.id === 'openquestions');

  test('the raiser exists and is one surface, not a family of them', () => {
    // "Do not add raisers merely to achieve domain-count symmetry." One.
    expect(surface()).toBeTruthy();
    expect(SURFACES.filter((s) => s.id === 'openquestions')).toHaveLength(1);
  });

  test('it raises the question as attention, never as an emergency', () => {
    const raised = surface().raise(withVenue({ accessNeeds: WALKER }));
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('attention');
    expect(raised[0].title).toMatch(/step-free way into The Lodge/);
    expect(raised[0].why).toMatch(/You named/);
    expect(raised[0].ask).toBe('Ask the venue.');
  });

  test('and raises nothing when the question is not open', () => {
    expect(surface().raise(withVenue())).toEqual([]);
    expect(surface().raise(withVenue({ accessNeeds: WALKER, venueStepFree: true }))).toEqual([]);
  });

  test('a past event is never asked', () => {
    expect(surface().raise(withVenue({ accessNeeds: WALKER, date: '2020-01-01' }))).toEqual([]);
  });
});
