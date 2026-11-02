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
import { placeQuestionsFor, answerPlaceQuestionPatch } from '../placeQuestions';
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
    expect(ids(placeQuestionsFor(withVenue({ accessNeeds: WALKER })))).toEqual(['venue-step-free']);
  });

  test('a need with NO venue asks nothing — there is no building to ask about', () => {
    expect(placeQuestionsFor(base({ accessNeeds: WALKER }))).toEqual([]);
  });

  test('a venue with NO need asks nothing — it is not a checklist', () => {
    // The guard against a primitive that grows into a form. A question nobody
    // needs answered is the thing the brief warns raisers become.
    expect(placeQuestionsFor(withVenue())).toEqual([]);
  });

  test('neither one asks nothing', () => {
    expect(placeQuestionsFor(base())).toEqual([]);
    expect(placeQuestionsFor(null)).toEqual([]);
  });
});

describe('the question says what made it relevant', () => {
  const q = () => placeQuestionsFor(withVenue({ accessNeeds: WALKER }))[0];

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
    const got = placeQuestionsFor(withVenue({
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
    const after = { ...e, ...answerPlaceQuestionPatch(placeQuestionsFor(e)[0], true) };
    expect(placeQuestionsFor(after)).toEqual([]);
  });

  test('NO ALSO CLOSES IT — "there are steps" is information, not an open question', () => {
    // The distinction that stops this becoming the thing P1-3 just finished
    // removing from the clause list: re-asking something already answered.
    const e = ev();
    const after = { ...e, ...answerPlaceQuestionPatch(placeQuestionsFor(e)[0], false) };
    expect(placeQuestionsFor(after)).toEqual([]);
    expect(after.venueStepFree).toBe(false);
  });

  test('it is a patch, not a mutation', () => {
    const e = ev();
    answerPlaceQuestionPatch(placeQuestionsFor(e)[0], true);
    expect(e.venueStepFree).toBeUndefined();
  });

  test('a non-answer is refused rather than stored as one', () => {
    const q = placeQuestionsFor(ev())[0];
    expect(answerPlaceQuestionPatch(q, null)).toBe(null);
    expect(answerPlaceQuestionPatch(q, 'maybe')).toBe(null);
  });
});

describe('eventPlan stays the authority — this only RAISES', () => {
  const surface = () => SURFACES.find((s) => s.id === 'placequestions');

  test('the raiser exists and is one surface, not a family of them', () => {
    // "Do not add raisers merely to achieve domain-count symmetry." One.
    expect(surface()).toBeTruthy();
    expect(SURFACES.filter((s) => s.id === 'placequestions')).toHaveLength(1);
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

// ─── CASE 2 · ATTENDANCE × OUTDOORS → A PERMIT (Sprint 0.5 Decision 3) ──────
//
// A materially different shape from the venue/access rule: not two facts
// coexisting, but a DERIVED NUMBER CROSSING A LINE. Below ~50 outdoors a city
// permit is nobody's problem; above it, it is the thing that can end the event.
//
// THE APP HAS SAID THIS ALL ALONG AND NOBODY COULD ACT ON IT.
// `placeIntelligence.js:182` has pushed exactly this sentence as a NOTE inside
// a card since before any of this existed — and `derivePlaceIntelligence` is
// not in `surfaceRegistry`, so it never raised, could not be answered, and
// never resolved. Sprint 0.5 found it inert, not absent.
describe('CASE 2 — a headcount crossing a line makes a permit consequential', () => {
  const outdoorEv = (over = {}) => base({
    venue: 'Cedar Park pavilion',          // isLikelyOutdoor matches "park"/"pavilion"
    ...over,
  });
  const ids = (qs) => qs.map((q) => q.id);

  test('an outdoor event planned for 60 by the HOST raises the permit question', () => {
    const qs = placeQuestionsFor(outdoorEv({ guestEstimate: 60, guestCountSource: 'host' }));
    expect(ids(qs)).toContain('outdoor-permit');
    const q = qs.find((x) => x.id === 'outdoor-permit');
    expect(q.question).toMatch(/city or park permit/i);
    expect(q.because).toMatch(/outdoor event for 6\d/);
    expect(q.askWho).toMatch(/city or parks office/i);
  });

  test('the same event for 12 does not — below the line this is nobody’s problem', () => {
    expect(ids(placeQuestionsFor(outdoorEv({ guestEstimate: 12, guestCountSource: 'host' }))))
      .not.toContain('outdoor-permit');
  });

  test('INDOORS at any size does not', () => {
    expect(ids(placeQuestionsFor(base({
      venue: 'The Lodge ballroom', indoorOutdoor: 'indoor',
      guestEstimate: 200, guestCountSource: 'host',
    })))).not.toContain('outdoor-permit');
  });

  test('DECISION 1 COMPOSED IN — an app-invented count cannot manufacture a permit', () => {
    // The sharpest assertion in this slice. A fabricated consequence is worse
    // than a missing one: it would send a host to a city office over a number
    // she never gave. attendanceBand's countFromHost is what refuses it.
    expect(ids(placeQuestionsFor(outdoorEv({
      guestEstimate: 60, guestCountSource: 'playbook-typical',
    })))).not.toContain('outdoor-permit');
  });

  test('…and a real roster of 60 yeses DOES raise it', () => {
    // Proving the refusal above is about provenance, not about the number.
    const qs = placeQuestionsFor(outdoorEv({
      guestMode: 'list',
      guests: Array.from({ length: 60 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
    }));
    expect(ids(qs)).toContain('outdoor-permit');
  });

  test('answering it ends it, either way', () => {
    const ev = outdoorEv({ guestEstimate: 60, guestCountSource: 'host' });
    const q = placeQuestionsFor(ev).find((x) => x.id === 'outdoor-permit');
    for (const value of [true, false]) {
      const after = { ...ev, ...answerPlaceQuestionPatch(q, value) };
      expect(ids(placeQuestionsFor(after))).not.toContain('outdoor-permit');
    }
  });

  test('it does not answer itself — no permit is ever asserted to exist or not', () => {
    const q = placeQuestionsFor(outdoorEv({ guestEstimate: 60, guestCountSource: 'host' }))
      .find((x) => x.id === 'outdoor-permit');
    const blob = JSON.stringify(q).toLowerCase();
    expect(/\b(?:you need|is required|you must|no permit)\b/.test(blob)).toBe(false);
  });
});

describe('the two rules are independent, and both can be owed at once', () => {
  test('a big outdoor event with a step-free need owes both questions', () => {
    const qs = placeQuestionsFor(base({
      venue: 'Cedar Park pavilion',
      guestEstimate: 60, guestCountSource: 'host',
      accessNeeds: WALKER,
    }));
    expect(qs.map((q) => q.id).sort()).toEqual(['outdoor-permit', 'venue-step-free']);
  });

  test('answering one leaves the other open', () => {
    const ev = base({
      venue: 'Cedar Park pavilion',
      guestEstimate: 60, guestCountSource: 'host',
      accessNeeds: WALKER,
      venueStepFree: true,
    });
    expect(placeQuestionsFor(ev).map((q) => q.id)).toEqual(['outdoor-permit']);
  });

  test('the raiser carries both to the board, as attention', () => {
    const raised = SURFACES.find((s) => s.id === 'placequestions').raise(base({
      venue: 'Cedar Park pavilion',
      guestEstimate: 60, guestCountSource: 'host',
      accessNeeds: WALKER,
    }));
    expect(raised).toHaveLength(2);
    for (const r of raised) {
      expect(r.severity).toBe('attention');
      expect(r.why).toBeTruthy();
      expect(r.ask).toBeTruthy();
    }
  });
});
