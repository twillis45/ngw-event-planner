// ─── THE GAME NIGHT FIXTURE — the exact live state PR #70 was driven against ──
//
// Captured 2026-07-31 from the running shell at
// http://localhost:8097/ngw-event-planner/hostv2/ — the host's own 'gn' event
// (adopted out of 'ngw-events') plus its 'ngw-hostv2-patch-gn' overlay, merged
// the way eventPool merges them. Nothing here is invented: the four settled
// foodChoices, the diet count and the sourcing preference are the host's real
// answers, and `sourcing: 'host cooks'` is why the provider decision is a
// COMPLETED record rather than an open call.
//
// The date is computed T+2 so the fixture always sits in the same runway the
// live reproduction did (2 days out), independent of when the suite runs.
import { daysFromNow } from './frozenClock';

export const GAME_NIGHT_PATCH = {
  startTime: '15:00',
  startTimeSource: 'host',
  startTimeWhy: 'Most game nights are afternoon gatherings, so we set a 3:00 PM start to plan around — this is a starting point, not your plan. Change it to whatever is true.',
  startTimeBasis: 'rule-of-thumb',
  foodChoices: {
    game_type: 'Mixed (fillers + one headliner)',
    food_model: 'Host provides snacks',
    drinks: 'Add one batch cocktail',
    sourcing: 'host cooks',
  },
  dietCounts: { Vegetarian: 1 },
  sourcing: 'costco',
};

// The base row as it sits in 'ngw-events' — a real host event, adopted by the
// shell through REAL_EVENTS. Twelve guests by count, at home in Atlanta, $600.
export const GAME_NIGHT_BASE = {
  id: 'gn',
  name: 'Game Night',
  type: 'game night',
  createdAt: '2026-06-21',
  guestMode: 'count',
  guestCount: 12,
  venueKind: 'home',
  venueCity: 'Atlanta',
  venueState: 'GA',
  guests: [],
  vendors: [],
  timeline: [],
  budget: [],
  totalBudget: 600,
};

// base + patch, exactly the merge eventPool performs ({...base, ...patch}).
export const gameNightEvent = () => ({
  ...GAME_NIGHT_BASE,
  date: daysFromNow(2),
  ...GAME_NIGHT_PATCH,
});
