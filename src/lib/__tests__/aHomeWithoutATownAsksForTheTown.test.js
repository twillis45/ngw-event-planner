// Live 11/23/2026 (Thanksgiving at home, no town given): the hero said "Add the
// location." over the town card's "Your town — The place is set." Her place
// IS set (her home); what is missing is the town. At home, the ask is the town.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { heroAskFor, ASK_KINDS } from '../heroAsk';
import { eventPlan } from '../../CommandCenter';
import { useFrozenClock } from '../../testUtils/frozenClock';

const base = { id: 'e-town', name: 'Thanksgiving Dinner', type: 'Thanksgiving Hosting', date: '2026-11-26', startTime: '15:00', guestEstimate: 14 };
const cue = (ev) => (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'location');

test('at home with no town, the location row asks for the town', () => {
  const c = cue({ ...base, venueKind: 'home' });
  expect(c).toBeTruthy();
  expect(c.handled).toBe(false);
  expect(heroAskFor(c)).toBe(ASK_KINDS.town);
});

test('away from home with nothing set, the ask is still the location', () => {
  const c = cue({ ...base });
  expect(heroAskFor(c)).toBe('Add the location.');
});

// THE PRODUCER THE HERO ACTUALLY READS. The test above passed while the live
// hero still said "Add the location.": queue[0] on that screen is not the
// checklist row, it is the venue gate eventPlan promotes into the hero (the
// critical-blocker tier in CommandCenter), and it authored its own ask.
describe('the venue gate eventPlan promotes', () => {
  useFrozenClock('2026-11-23T12:00:00.000Z');
  const head = (ev) => (eventPlan(ev).nextActions || [])[0];

  test('at home with no town, the hero item asks for the town', () => {
    const a = head({ ...base, venueKind: 'home', totalBudget: 400, budget: [], guests: [], vendors: [], timeline: [] });
    expect(a.blockerType).toBe('venue-selection');
    // One address ask (owner, 11/24/2026). Was 'Your city'.
    expect(a.title).toBe('Your address');
    expect(heroAskFor(a)).toBe(ASK_KINDS.town);
  });

  test('away from home with no town, it still asks for the location', () => {
    const a = head({ ...base, totalBudget: 400, budget: [], guests: [], vendors: [], timeline: [] });
    expect(a.blockerType).toBe('venue-selection');
    expect(heroAskFor(a)).toBe('Add the location.');
  });
});
