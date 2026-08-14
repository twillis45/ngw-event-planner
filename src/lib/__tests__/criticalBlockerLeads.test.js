// ─── A CRITICAL BLOCKER IS THE ASK, NOT A FOOTNOTE ───────────────────────────
//
// Board ruling 2026-08-07, section 1c: "Blockers marked `urgency:'critical'`
// render IN the hero, not as siblings after it."
//
// THE SPLIT THAT CAUSED IT. `deriveDecisionBlockers` marks venue-selection
// `urgency:'critical'`, `reversibility:'locked'`, `blocks:['catering']` — it is
// the gate on the whole sequence. But that list feeds `unresolvedBlockerStages`
// -> the shell's blocker CARDS, a different pipe from `eventPlan().nextActions`,
// which is what the hero reads. So the engine's own severity never entered the
// ranking at all, and the layout rendered the gate dead last, below "Worth
// keeping an eye on" — explicitly the BACKGROUND lane.
//
// The ranking machinery to fix it already exists and is untouched here:
// `_severityBand` bands `level === 'critical'` to 0 and the sort is stable, so
// a promoted blocker leads by the comparator that already shipped. What was
// missing was the promotion, not the order.
//
// WHY THIS ASSERTS POSITION AND WIRING, NOT JUST PRESENCE. An action that leads
// the queue but carries no route the hero can wire is a dead ask — the host
// reads "Venue" at 40px type with nothing to answer it. `wiredKind`
// (HostShellV2) maps `route.focusField === 'event-venue'` to the venue editor,
// so that exact field is part of the contract and is asserted by name.
//
// NOTE ON STYLE: jest's `expect` takes ONE argument. The playwright specs in
// hostv2/e2e pass a message as the second — that API is not this one, and it
// fails as "Expect takes at most one argument" rather than as a bad assertion.
// Context lives in the test name and in `describe` here.
import { eventPlan } from '../../CommandCenter';
import { deriveDecisionBlockers } from '../assembleRevealEngines';
import { eventLocationStatus } from '../locationAssist';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

// A location-less event, otherwise healthy: date set, headcount set, budget set.
// Everything the foundation would otherwise lead with is ALREADY DONE, so if
// the venue blocker does not lead here it is not being ranked at all.
//
// NO `venueCity` — and that is the contract, not an omission. See the
// disagreement test at the bottom: with a town but no named venue the two
// readers of this one fact return opposite answers, and Tier 0.6 deliberately
// stands down there rather than arbitrating it by ranking.
const venuelessEvent = () => ({
  id: 'T_critblock', type: 'Birthday', name: 'Critical Blocker',
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 12, guestCount: 12,
  totalBudget: 4000,
  budget: [], guests: [], vendors: [], timeline: [],
});

const withVenue = () => ({ ...venuelessEvent(), venue: 'The Lodge at Santa Fe' });

// The SAME event with a town filled in. `eventLocationStatus` -> 'city_only'
// (handled), `deriveDecisionBlockers` -> venue-selection critical.
const cityOnlyEvent = () => ({
  ...venuelessEvent(), isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
});

const headOf = (ev) => (eventPlan(ev).nextActions || [])[0];

describe('a critical blocker leads the queue', () => {
  // The premise, asserted rather than assumed. If the engine ever stops marking
  // venue critical, this must fail HERE — on the premise — and not further down
  // where the failure would read as a ranking bug.
  test('PREMISE — the engine marks an unresolved venue critical', () => {
    const venue = deriveDecisionBlockers(venuelessEvent()).find((b) => b.type === 'venue-selection');
    expect(venue).toBeTruthy();
    expect(venue.urgency).toBe('critical');
  });

  test('it is nextActions[0] — ahead of every non-critical the foundation offers', () => {
    const actions = eventPlan(venuelessEvent()).nextActions || [];
    expect(actions.length).toBeGreaterThan(0);
    // Both asserted: `level` is what the band sorts on, `blockerType` is what
    // makes it THIS item rather than a coincidental critical from elsewhere.
    expect(actions[0].level).toBe('critical');
    expect(actions[0].blockerType).toBe('venue-selection');
  });

  test('it carries the route the hero can actually wire', () => {
    const head = headOf(venuelessEvent());
    expect(head.route).toBeTruthy();
    // wiredKind() reads focusField first; 'event-venue' is the venue editor.
    expect(head.route.focusField).toBe('event-venue');
    expect(head.done).toBe(false);
    // WAVE-6 shell contract: every ranked action exposes these as number|null.
    expect(head.dueInDays === null || Number.isFinite(head.dueInDays)).toBe(true);
    expect(head.leadDays === null || Number.isFinite(head.leadDays)).toBe(true);
  });

  test('it names the act — the CTA doctrine applies to promoted blockers too', () => {
    const head = headOf(venuelessEvent());
    const label = String(head.ctaLabel || head.cta || '');
    expect(label.length).toBeGreaterThan(0);
    // No bare "Go" / "Do this" / "View" — see ctaNamesTheAct.
    expect(label).not.toMatch(/^(go|do this|handle this|take me to it|view)$/i);
  });

  // THE OTHER HALF. A promotion that never retracts is worse than none: the host
  // answers the venue question and the gate keeps leading with it forever.
  test('it LEAVES once resolved — no permanent unresolvable ask', () => {
    const actions = eventPlan(withVenue()).nextActions || [];
    expect(actions.some((a) => a.blockerType === 'venue-selection')).toBe(false);
  });

  // Non-critical blockers keep their existing home. `guest-count-confirmation`
  // is `urgency:'high'` and dress-code is 'medium'; promoting those too would
  // turn the hero into the blocker list, which is the opposite of the ruling.
  // FOUND BY DRIVING, NOT BY A TEST. The hero asked "Add the location." while
  // the queue's SECOND ROW said "Add the location" — the same ask twice on one
  // screen. `topDomain` only adopted a matched phase concern's domain for
  // `category === 'readiness'` heroes; a Tier 0.6 blocker is `category:
  // 'blocker'`, so its domain stayed 'blocker' while the location cue's was
  // 'location' and dedup never saw them as one concern.
  test('it absorbs the phase cue that resolves through the SAME field', () => {
    const actions = eventPlan(venuelessEvent()).nextActions || [];
    const venueAsks = actions.filter((a) => {
      const f = (a.route && a.route.focusField) || (a.primaryRoute && a.primaryRoute.focusField) || '';
      return f === 'event-venue';
    });
    // Exactly one: the promoted blocker. The location essential resolves through
    // this same field and must not also be listed.
    expect(venueAsks.length).toBe(1);
    expect(venueAsks[0].blockerType).toBe('venue-selection');
  });

  test('only CRITICAL is promoted — high and medium stay where they were', () => {
    const noGuests = { ...venuelessEvent(), guestEstimate: 0, guestCount: 0 };
    const promoted = (eventPlan(noGuests).nextActions || []).filter((a) => a.blockerType);
    for (const a of promoted) expect(a.level).toBe('critical');
    expect(promoted.some((a) => a.blockerType === 'guest-count-confirmation')).toBe(false);
  });
});

// ── WHERE THE TWO READERS DISAGREE, THE RANKING STANDS DOWN ──────────────────
//
// This is the live split that scoped the whole ruling, measured 2026-08-14:
//
//     eventLocationStatus(ev)     "city_only"   -> location essential HANDLED
//     deriveDecisionBlockers(ev)  venue-selection, urgency: "critical"
//
// One fact, two engines, opposite answers. It is pre-existing and visible on
// the surface today: the stat column's Venue chip reads "handled" on the very
// event whose blocker list calls venue critical.
//
// Promoting on the blocker alone would put "Add the location." at display size
// beside a chip saying Venue is done. So Tier 0.6 requires BOTH readers to say
// unresolved, and this describes that rule so the next person meets the
// disagreement here rather than rediscovering it from a contradictory screen.
//
// WHEN THE SPLIT IS RESOLVED, THIS TEST SHOULD CHANGE — it encodes a standoff,
// not a desired end state. Whichever reader wins, delete the guard in Tier 0.6
// and rewrite this block; do not leave it asserting a truce that no longer
// describes the product.
describe('the venue readers disagree, and the ranking does not arbitrate it', () => {
  test('PREMISE — a town with no named venue: handled by one reader, critical by the other', () => {
    const ev = cityOnlyEvent();
    expect(eventLocationStatus(ev)).toBe('city_only');
    const blockers = deriveDecisionBlockers(ev) || [];
    expect(blockers.some((b) => b.type === 'venue-selection' && b.urgency === 'critical')).toBe(true);
  });

  test('so the blocker is NOT promoted into the hero there', () => {
    const head = (eventPlan(cityOnlyEvent()).nextActions || [])[0];
    // Falsy, not `undefined`: the topAction rebuild normalizes every whitelisted
    // field to null, so a head that is not a blocker carries `blockerType: null`.
    expect(head.blockerType).toBeFalsy();
  });

  test('and it IS promoted once the location is genuinely missing', () => {
    expect(eventLocationStatus(venuelessEvent())).toBe('missing');
    const head = (eventPlan(venuelessEvent()).nextActions || [])[0];
    expect(head.blockerType).toBe('venue-selection');
  });
});
