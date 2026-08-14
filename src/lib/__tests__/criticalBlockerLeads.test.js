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
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

// A location-less event, otherwise healthy: date set, headcount set, budget set.
// Everything the foundation would otherwise lead with is ALREADY DONE, so if
// the venue blocker does not lead here it is not being ranked at all.
//
// NO `venueCity`: this fixture isolates the promotion itself. The town-set case
// is now a separate essential entirely (`venueaddress`) and is covered by
// venueAddressEssential.test.js.
const venuelessEvent = () => ({
  id: 'T_critblock', type: 'Birthday', name: 'Critical Blocker',
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 12, guestCount: 12,
  totalBudget: 4000,
  budget: [], guests: [], vendors: [], timeline: [],
});

const withVenue = () => ({ ...venuelessEvent(), venue: 'The Lodge at Santa Fe' });

const headOf = (ev) => (eventPlan(ev).nextActions || [])[0];

describe('a critical blocker leads the queue', () => {
  // The premise, asserted rather than assumed — and it is now a LADDER, not a
  // constant. Both event-industry seats ruled a flat `critical` wrong: an
  // unsigned venue ten months out is the normal shape of a plan, and a
  // permanent red gate trains the host to ignore the word before it is ever
  // true. Severity is driven backward from the dependents' real lead times.
  test('PREMISE — venue severity escalates on the countdown, it is not constant', () => {
    const at = (iso) => (deriveDecisionBlockers({ ...venuelessEvent(), date: iso, endDate: iso }) || [])
      .find((b) => b.type === 'venue-selection');
    // ~310 days out: real, ranked first, but not on fire.
    expect(at('2027-06-20').urgency).toBe('medium');
    // Inside T-120 the address-bound work (COI, permits, load-in, final rental
    // counts) can no longer fit its own lead time.
    expect(at('2026-10-01').urgency).toBe('critical');
  });

  // POSITION AND TONE ARE DIFFERENT AXES. The venue gate leads at every stage —
  // it is the gate on the sequence — while its `level` rides the countdown. An
  // earlier build gated the tier on `urgency === 'critical'`, which made the
  // gate VANISH from the hero at 310 days and reappear at T-120 while the cue
  // ladder ranked it first the whole time; `hostEngineSelectionParity` caught it.
  test('it is nextActions[0] at every stage, carrying the laddered tone', () => {
    const actions = eventPlan(venuelessEvent()).nextActions || [];
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].blockerType).toBe('venue-selection');
    expect(actions[0].level).toBe('medium');          // 310 days out
    const near = { ...venuelessEvent(), date: '2026-10-01', endDate: '2026-10-01' };
    const nearHead = (eventPlan(near).nextActions || [])[0];
    expect(nearHead.blockerType).toBe('venue-selection');
    expect(nearHead.level).toBe('critical');          // inside T-120
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

  // ONLY THE VENUE GATE IS EXEMPT FROM THE CRITICAL BAR. Every other blocker
  // still needs `critical` to reach the hero — `guest-count-confirmation` is
  // 'high' and dress-code is 'medium', and promoting those too would move the
  // blocker LIST into the hero, which is the opposite of the ruling.
  test('a high-urgency blocker is still not promoted', () => {
    const noGuests = { ...venuelessEvent(), guestEstimate: 0, guestCount: 0 };
    const promoted = (eventPlan(noGuests).nextActions || []).filter((a) => a.blockerType);
    expect(promoted.some((a) => a.blockerType === 'guest-count-confirmation')).toBe(false);
  });
});

// ── THE STANDOFF IS OVER — THE BOARD SPLIT THE FACT (2026-08-14) ────────────
//
// This file previously ended with a `describe` locking a TRUCE: Tier 0.6
// promoted a venue blocker only where `eventLocationStatus` and
// `deriveDecisionBlockers` agreed, because they disagreed about whether a town
// resolved the venue and a ranking change is no way to settle a data-honesty
// question. Its header said, in as many words, that it encoded a standoff and
// must be deleted once someone decided which reader was right.
//
// The board decided: NEITHER. The fact was split in two — the town and the
// venue address are separate essentials (phaseProgress `location` and
// `venueaddress`), so both readers now return the same answer by construction
// and the guard has nothing left to guard. Ruling and evidence:
// docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md
//
// The truce block is deleted rather than left asserting a peace that no longer
// describes the product. What replaced it lives in venueAddressEssential.test.js.
