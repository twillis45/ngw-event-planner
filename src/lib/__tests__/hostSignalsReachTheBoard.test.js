// ─── HALF OF ADAPTIVITY WAS INERT IN THE SHIPPING SHELL ─────────────────────
//
// `computeHostAdaptation` takes experience and capacity and genuinely uses them:
// a first-time solo host gets HIGH hand-holding — a smaller starting focus set,
// derivable defaults pre-proposed, reassurance on. It is finished and tested
// (playbooks/__tests__/overwhelm.test.js).
//
// It read those two values ONLY off the event, and hostv2 never wrote them.
// Measured 2026-08-17: `hostExperience` and `hostCapacity` appear in ZERO files
// under hostv2/src. So `handHolding` was permanently 'standard' for every real
// host, and the decision-engine scoreboard carried Adaptivity at 9 for a month
// on an axis no host could reach.
//
// "First time hosting" and "planning this alone" describe the HOST, not one
// event — so they live on the profile and follow them everywhere, with the event
// still able to override for a one-off.
import { playbookDecisionBoard } from '../playbooks';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const EV = (over = {}) => ({
  id: 'ev-hs', type: 'Wedding', date: isoIn(45), venue: 'The Hall',
  venueCity: 'Santa Fe, NM', guestMode: 'count', guestCount: 60, totalBudget: 15000, ...over,
});
const ha = (event, profile) => (playbookDecisionBoard(event, undefined, profile) || {}).hostAdaptation || {};

describe('the host profile reaches the board', () => {
  test('PREMISE — with nothing declared the board is neutral', () => {
    // The additive guarantee: absent inputs default to 'standard', byte-identical
    // to the board that shipped before any of this existed.
    expect(ha(EV()).handHolding).toBe('standard');
  });

  test('A FIRST-TIME SOLO HOST IS RECOGNISED FROM THE PROFILE', () => {
    // This is the wire that did not exist. Without it the engine below is dead.
    const a = ha(EV(), { hostExperience: 'first_time', hostCapacity: 'solo' });
    expect(a.handHolding).toBe('high');
    // `experience`/`capacity` are the field names on hostAdaptation — asserted
    // against the real object after writing `hostExperience` first and watching
    // it fail on a wire that was actually working.
    expect(a.experience).toBe('first_time');
    expect(a.capacity).toBe('solo');
  });

  test('and it follows them to a DIFFERENT event', () => {
    // The reason this belongs on the profile rather than the event: a host does
    // not stop being a first-timer when they open their second event.
    const a = ha(EV({ id: 'ev-other', type: 'Birthday', guestCount: 20 }), { hostExperience: 'first_time', hostCapacity: 'solo' });
    expect(a.handHolding).toBe('high');
  });

  test('THE EVENT STILL WINS — this one is new territory', () => {
    // A generally seasoned host can mark a single event as unfamiliar. Event
    // beats profile, never the other way round.
    const a = ha(EV({ hostExperience: 'first_time' }), { hostExperience: 'experienced' });
    expect(a.experience).toBe('first_time');
  });

  test('an empty or junk profile changes nothing', () => {
    expect(ha(EV(), {}).handHolding).toBe('standard');
    expect(ha(EV(), null).handHolding).toBe('standard');
    expect(() => ha(EV(), { hostExperience: 42 })).not.toThrow();
  });
});
