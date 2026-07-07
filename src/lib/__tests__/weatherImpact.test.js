// WEATHER-IMPACT-1 — event-phase impact contract. Real windows only, honest
// fallbacks, no invented setup/arrival/breakdown times, phase-aware CTAs.

import { weatherImpactByEventPhase, RAIN_PLAN_TARGET } from '../weather';

const ev = (over = {}) => ({ id: 'e-wi', date: '2026-07-15', startTime: '14:00', rainPlan: '', ...over });
const wx = (over = {}) => ({ risk: 'high', pop: 80, conditions: 'Rain', date: '2026-07-15',
  summary: 'Heavy rain likely on Wednesday (your event day) (80%)', rainWindow: null, ...over });
const win = (startHour, endHour) => ({ startHour, endHour, label: `${startHour} to ${endHour + 1}` });

test('1 · daily-only rain says timing unknown, never a phase claim', () => {
  const r = weatherImpactByEventPhase(ev(), wx());
  expect(r.confidence).toBe('daily');
  expect(r.primaryPhase).toBe('event_day');
  expect(r.headline).toMatch(/timing isn’t available yet/);
  expect(r.hourlyWindowUsed).toBe(false);
});

test('2 · hourly rain after start says during-or-after, never a bounded window', () => {
  const r = weatherImpactByEventPhase(ev(), wx({ rainWindow: win(16, 18) }));
  expect(r.primaryPhase).toBe('event');
  expect(r.headline).toMatch(/during or after the event/);
  expect(r.headline).toMatch(/no end time is set/);
});

test('3 · hourly rain touching start says around arrival, with parking CTA', () => {
  const r = weatherImpactByEventPhase(ev(), wx({ rainWindow: win(13, 15) }));
  expect(r.primaryPhase).toBe('arrival');
  expect(r.headline).toMatch(/guest arrival/);
  const parking = r.affectedPhases.find(p => p.route && p.route.focusField === 'parking-notes');
  expect(parking).toBeTruthy();
});

test('4+6 · hourly rain well before start is prep-phase, lower urgency, no event-window claim', () => {
  const r = weatherImpactByEventPhase(ev(), wx({ rainWindow: win(8, 10) }));
  expect(r.primaryPhase).toBe('prep');
  expect(r.headline).toMatch(/before your 2 PM start/);
  expect(r.headline).not.toMatch(/during your event|event window/i);
  expect(r.affectedPhases[0].severity).toBe('medium');
});

test('7 · missing start time never invents an event window', () => {
  const r = weatherImpactByEventPhase(ev({ startTime: '' }), wx({ rainWindow: win(14, 16) }));
  expect(r.primaryPhase).toBe('event_day');
  expect(r.headline).toMatch(/start time isn’t set/);
});

test('9+10 · rain plan state drives the CTA; missing plan routes to rain-plan', () => {
  const missing = weatherImpactByEventPhase(ev(), wx({ rainWindow: win(15, 17) }));
  expect(missing.shouldPromptRainPlan).toBe(true);
  expect(missing.affectedPhases[0].route).toEqual(RAIN_PLAN_TARGET);
  expect(missing.affectedPhases[0].actionLabel).toBe('Add rain backup');
  const saved = weatherImpactByEventPhase(ev({ rainPlan: 'Move inside.' }), wx({ rainWindow: win(15, 17) }));
  expect(saved.shouldPromptRainPlan).toBe(false);
  expect(saved.affectedPhases[0].actionLabel).toBe('Review rain plan');
});

test('12 · guest update CTA appears for arrival/event impact and routes to the guests card', () => {
  const r = weatherImpactByEventPhase(ev(), wx({ rainWindow: win(15, 17) }));
  expect(r.shouldPromptGuestUpdate).toBe(true);
  const g = r.affectedPhases.find(p => p.actionLabel === 'Draft guest update');
  expect(g.route).toEqual({ tab: 'Guests', focusField: 'guests-invites-e-wi' });
});

test('13+14 · no setup/load-in claims anywhere; copy always names the event day', () => {
  const shapes = [wx(), wx({ rainWindow: win(8, 10) }), wx({ rainWindow: win(13, 15) }), wx({ rainWindow: win(17, 19) })];
  shapes.forEach((w) => {
    const r = weatherImpactByEventPhase(ev(), w);
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/setup will|load-in|load out|breakdown will|vendors will/i);
    expect(r.headline).toMatch(/Wednesday|your event day/);
  });
});

test('clear forecast → no impact, no prompts', () => {
  const r = weatherImpactByEventPhase(ev(), { risk: 'clear', summary: 'Clear' });
  expect(r.hasImpact).toBe(false);
  expect(r.affectedPhases).toEqual([]);
});
