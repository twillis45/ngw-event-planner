import { buildAssembleRevealStages } from '../assembleRevealEngines';
import { buildExperienceContext } from '../experienceContext';
import { deriveEventPhaseProgress } from '../phaseProgress';

const event = { type: 'Anniversary', name: 'Mom and Dad’s 50th Anniversary', honoree: 'Mom and Dad', guestEstimate: 40, guests: [], vendors: [], budget: [], timeline: [] };
const stages = (ev) => buildAssembleRevealStages(ev, buildExperienceContext(ev, null, 1).eventIdentity, null, 1);

test('a couple’s names do not create a second milestone or ceremony timing question', () => {
  const ctx = buildExperienceContext(event, null, 1);
  expect(ctx.eventIdentity.isCompound).toBe(false);
  const reveal = stages(event);
  expect(reveal.find((s) => s.key === 'identity').what).not.toMatch(/\+|two milestones/i);
  expect(reveal.some((s) => s.key === 'blocker-ceremony-timing')).toBe(false);
});

test('a headcount is not a guest list and never proves public RSVP capability', () => {
  const guest = stages(event).find((s) => s.key === 'guests');
  expect(guest.why).not.toMatch(/list built|tracking live/i);
  expect(guest.why).toMatch(/no guest names/i);
});

test('a generated menu stays a draft awaiting the host’s choices', () => {
  const reveal = stages({ ...event, type: 'Birthday' });
  expect(reveal.find((s) => s.key === 'food').why).not.toMatch(/menu is built/i);
  expect(reveal.find((s) => s.key === 'food').why).toMatch(/draft/i);
});

test('a backyard without a town is not handled in progress while reveal asks for it', () => {
  const ev = { ...event, venue: 'Backyard', venueKind: 'home' };
  expect(stages(ev).some((s) => s.key === 'blocker-venue-selection')).toBe(true);
  const progress = deriveEventPhaseProgress(ev);
  const location = progress.items.find((e) => e.id === 'location');
  expect(location.handled).toBe(false);
});


test('considering vendor roles are visible without being called assigned or booked', () => {
  const vendor = stages({ ...event, vendors: [{ category: 'Catering', name: '', status: 'Considering' }] }).find((s) => s.key === 'vendors');
  expect(vendor.what).toMatch(/1 vendor role recorded/i);
  expect(vendor.what).not.toMatch(/assigned|booked/i);
  expect(vendor.why).toMatch(/Considering does not mean booked/);
});

test('an unresolved honoree is stated instead of an unqualified confidence claim', () => {
  const identity = stages({ ...event, type: 'Birthday', name: 'My Birthday', honoree: '' }).find((s) => s.key === 'identity');
  expect(identity.confidenceLabel).toBe('Honoree not named');
});
