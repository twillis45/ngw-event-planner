import { confirmedCovers, confirmedRsvpCovers } from '../confirmedCovers';
import { resolveRoute } from '../routeResolver';
import { sectionGroups } from '../sectionDirectory';
import { nextPlanAttentionDate } from '../phaseProgress';
import { placeQuestionsFor } from '../placeQuestions';

const NOW = new Date('2026-11-05T12:00:00');

test('an RSVP receipt counts actual Yes covers even while planning around 40', () => {
  const ev = { guestMode: 'count', guestCount: 40, guests: [{ name: 'Aunt Carol', rsvp: 'Yes' }] };
  expect(confirmedCovers(ev)).toBe(40); // This planning contract remains correct.
  expect(confirmedRsvpCovers(ev)).toBe(1);
  expect(confirmedRsvpCovers({ ...ev, guests: [{ name: 'Aunt Carol', rsvp: 'Yes', kids: 2, plusOne: 'Sam' }] })).toBe(4);
  expect(confirmedRsvpCovers({ ...ev, guests: [{ name: 'Aunt Carol', rsvp: 'Maybe' }] })).toBe(0);
});

test('off-hero date and venue routes open their existing editors', () => {
  expect(resolveRoute({ tab: 'Event Details', focusField: 'event-start' })).toEqual({ kind: 'date', focus: null });
  expect(resolveRoute({ tab: 'Event Details', focusField: 'event-date' })).toEqual({ kind: 'date', focus: null });
  expect(resolveRoute({ tab: 'Event Details', focusField: 'event-venue' })).toEqual({ kind: 'venue', focus: null });
});

test('a place-question route targets its own existing answer row', () => {
  const q = placeQuestionsFor({ venue: 'Community Hall', accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }] })[0];
  expect(q.route.focusField).toBe('place-question-venue-step-free');
  expect(resolveRoute(q.route)).toEqual({ kind: 'stage:plan', focus: 'venue-step-free', anchor: 'place-question-venue-step-free' });
});

test('a venue has a permanent door even when the venue is already set', () => {
  const doors = sectionGroups({ event: { venue: 'Community Hall', venueCity: 'Baltimore' } }).flatMap((g) => g.rows);
  expect(doors.filter((r) => r.k === 'venue')).toHaveLength(1);
});

test('the dated horizon comes from eventPlan, before the shopping-ledger change', () => {
  const plan = { nextActions: [{ id: 'lodging', dueInDays: 10 }, { id: 'food', dueInDays: 40 }], setAside: [], worries: [] };
  const horizon = nextPlanAttentionDate(plan, { date: '2027-06-07', id: 'shopping', what: 'the shopping list opens' }, NOW);
  expect(horizon.date).toBe('2026-11-15');
  expect(horizon.id).toBe('lodging');
  expect(nextPlanAttentionDate({ nextActions: [], setAside: [], worries: [] }, null, NOW)).toBeNull();
});

test('the horizon respects bundle clocks, snooze return dates, overdue work, and unknown dates', () => {
  expect(nextPlanAttentionDate({ nextActions: [{ id: 'unknown', dueInDays: null }, { id: 'bundle', kind: 'bundle', dueInDays: 8 }], setAside: [{ id: 'back', snoozedUntil: '2026-11-07' }] }, null, NOW).date).toBe('2026-11-07');
  expect(nextPlanAttentionDate({ nextActions: [{ id: 'late', dueInDays: -2 }] }, null, NOW).days).toBe(-2);
  expect(nextPlanAttentionDate({ nextActions: [{ id: 'unknown', dueInDays: null }] }, null, NOW)).toBeNull();
});


test('a city alone never counts as a settled venue address', () => {
  const { venueFor } = require('../venueFor');
  const { deriveEventPhaseProgress } = require('../phaseProgress');
  const event = { type: 'Birthday', venue: 'Baltimore, MD', guestCount: 40 };
  expect(venueFor(event).addressSettled).toBe(false);
  expect(deriveEventPhaseProgress(event).items.find((i) => i.id === 'venueaddress').handled).toBe(false);
});
