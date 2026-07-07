// HOST-CHOICE-SUPPRESSION-1 — guest workflow reader + no-RSVP-pressure rules.
// The host's setup choice governs which planning surface appears; empty data
// never implies RSVP mode.

import { guestPlanningMode, showsReplyTracking } from '../guestMode';
import { decisionConfidence } from '../decisionConfidence';

test('1 · count mode → count_only, even with a tracking roster attached', () => {
  expect(guestPlanningMode({ guestMode: 'count', guestCount: 30 })).toBe('count_only');
  expect(guestPlanningMode({ guestMode: 'count', guestCount: 30, guests: [{ name: 'A', rsvp: '' }] })).toBe('count_only');
  expect(showsReplyTracking({ guestMode: 'count', guestCount: 30, guests: [{ name: 'A' }] })).toBe(false);
});

test('2 · locked count flags mean count_only', () => {
  expect(guestPlanningMode({ guestCountLocked: true, guestCount: 20 })).toBe('count_only');
  expect(guestPlanningMode({ headcountLocked: true, guestCount: 20 })).toBe('count_only');
});

test('3 · list mode or a real roster → rsvp_tracking', () => {
  expect(guestPlanningMode({ guestMode: 'list', guests: [] })).toBe('rsvp_tracking');
  expect(guestPlanningMode({ guests: [{ name: 'A', rsvp: 'Yes' }] })).toBe('rsvp_tracking');
  expect(showsReplyTracking({ guests: [{ name: 'A' }] })).toBe(true);
});

test('4 · nothing chosen → unknown, and never reply-tracking', () => {
  expect(guestPlanningMode({})).toBe('unknown');
  expect(guestPlanningMode({ guestEstimate: 25 })).toBe('unknown');
  expect(showsReplyTracking({})).toBe(false);
});

test('5 · count-only host is never told to Chase RSVPs (missing count is SET, not chased)', () => {
  const g = decisionConfidence({ audience: 'self_family', guestMode: 'count' }, {})
    .find(i => i.key === 'guestCount');
  expect(g.primaryAction).toBe('Set the count');
  expect(g.confidence).not.toMatch(/gathering responses/i);
});

test('6 · pending roster replies still chase in tracking mode', () => {
  const g = decisionConfidence({ guests: [{ rsvp: 'Yes' }, { rsvp: 'Maybe' }, { rsvp: '' }] }, {})
    .find(i => i.key === 'guestCount');
  expect(g.primaryAction).toBe('Chase RSVPs');
});

test('7 · reply-pressure surfaces in App.js are gated on showsReplyTracking (source contract)', () => {
  const fs = require('fs'); const path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  // the RSVP chase button, non-responder alert, HostHome nudge, and event-day
  // rsvp-pending alert all reference the shared gate
  expect((app.match(/showsReplyTracking\(/g) || []).length).toBeGreaterThanOrEqual(5);
  expect(app).toMatch(/pendingRsvp > 0 && showsReplyTracking\(event\)/);
  expect(app).toMatch(/awaiting > 0 && showsReplyTracking\(event\)/);
});
