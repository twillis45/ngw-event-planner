// "5 NIGHTS" REACHED THE PARSER AND STOPPED THERE (host report 2026-09-29).
//
// Measured by driving the owner's own Disneyland seed from creation:
//
//   "50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions
//    airbnb accomodations"
//
// The reveal said "Where Everyone Stays — Not picked yet." The Santa Fe 80th,
// one sentence away in the same drive, said "Not picked yet · 3 nights to
// cover." The difference is not the destination: it is that Santa Fe gave a
// DAY, so nights fell out of date→endDate arithmetic, and Disneyland gave a
// month. The parser heard "5 nights" in both. Only one of them survived to a
// screen, because nothing ever wrote the field down.
//
// `nights` has existed on the parse since 2026-09-25 and was read by nobody.
// Three things follow, and the first one is why this is not a one-line change:
//
//   1. The field is WRONG on the relative form. "party in 5 days" is a
//      countdown, not a duration, and it parsed as four nights. The
//      date→endDate derivation has always guarded on `rel`; the field did not.
//      Persisting it without this fix would have put a four-night stay on a
//      one-afternoon party.
//   2. It is persisted as `statedNights` — the host's own word, never a
//      derived span — and ONLY when no endDate can carry it, so there is never
//      a second answer sitting next to date→endDate waiting to drift.
//   3. It is read where the host's words were being dropped.
import { parseSmartEventText } from '../smartParseEvent';
import { spanIntel } from '../eventSpan';

const p = (s) => parseSmartEventText(s, {});

describe('1 · a countdown is not a duration', () => {
  test('"in 5 days" is when it happens, not how long it runs', () => {
    const r = p('party in 5 days for 20 people');
    expect(r.date).toBeTruthy();       // the countdown still resolves
    expect(r.nights).toBeNull();       // and produces no span
    expect(r.endDate).toBeNull();
  });

  test('"in 3 weeks" likewise', () => {
    expect(p('cookout in 3 weeks for 20 people').nights).toBeNull();
  });

  test('a real duration alongside a real date still spans, as it always has', () => {
    const r = p('cookout June 14 2027 3 nights for 20');
    expect(r.endDate).toBe('2027-06-17');
    expect(r.nights).toBe(3);
  });

  test('the owner seed still carries its five nights out of the parser', () => {
    const r = p('50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions airbnb accomodations');
    expect(r.nights).toBe(5);
    expect(r.date).toBeNull();
  });
});

describe('3 · the app knows how long the trip is', () => {
  // A stated night count with no start day: the exact shape the owner seed
  // produces, and the one the date→endDate path cannot represent.
  const DISNEY = { type: 'Birthday', isDestination: true, guestsStayOvernight: true, statedNights: 5 };

  test('spanIntel stops asking a question it was already answered', () => {
    const s = spanIntel(DISNEY);
    expect(s.state).toBe('multi');
    expect(s.nights).toBe(5);
    expect(s.days).toBe(6);
    expect(s.basis).toBe('host-nights');
    // It still owes the host a question — WHEN, not how long.
    expect(s.shouldAsk).toBe(true);
    expect(s.why).toMatch(/5 nights/);
  });

  test('without it, the same event is asked how long it runs', () => {
    // The negative control: strip the one field and the old behavior returns.
    const { statedNights, ...bare } = DISNEY;
    expect(spanIntel(bare).state).toBe('unasked');
  });

  test('real dates still outrank a stated count — one answer, not two', () => {
    const s = spanIntel({ type: 'Birthday', date: '2027-06-14', endDate: '2027-06-17', statedNights: 99 });
    expect(s.nights).toBe(3);
    expect(s.basis).toBe('host-span');
  });
});

describe('2 · the reveal says the number back', () => {
  // The measured symptom, at the surface it was measured on.
  const { buildAssembleRevealStages } = require('../assembleRevealEngines');
  const lodgingCard = (ev) => (buildAssembleRevealStages(ev, {
    primaryEventType: 'Birthday', secondaryEventTypes: [], isCompound: false,
    complexity: 'standard', ceremonyComponents: [], participants: [], confidence: 0.9,
  }, null, 1) || []).find(st => st.key === 'lodging');

  const DISNEY = {
    id: 'ev-disney', type: 'Birthday', name: 'My 50th Birthday',
    isDestination: true, guestsStayOvernight: true, guestCount: 16,
    venueCity: 'Anaheim', venueState: 'CA', statedNights: 5,
  };

  test('a month and a night count still names the nights', () => {
    expect(lodgingCard(DISNEY).what).toBe('Not picked yet · 5 nights to cover.');
  });

  test('without the field it falls back to the bare line it used to show', () => {
    const { statedNights, ...bare } = DISNEY;
    expect(lodgingCard(bare).what).toBe('Not picked yet.');
  });

  test('real dates still win — the span, not the stored count', () => {
    expect(lodgingCard({ ...DISNEY, date: '2027-06-14', endDate: '2027-06-17', statedNights: 99 }).what)
      .toBe('Not picked yet · 3 nights to cover.');
  });
});
