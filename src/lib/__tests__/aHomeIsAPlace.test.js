// Gold run (GOLD-05 / GOLD-06, 11/5/2026). "Backyard cookout at my house…, I'm
// handling the venue myself" saved venue "Backyard", kind home — and the first
// plan screen said "Venue — Where is the event? … REQUIRED · AWAITING DECISION".
// GOLD-05 exists to forbid exactly that. The blocker fires for a home event
// because the TOWN is missing (weather, rain note, shopping read it); the
// question it asked was a different one, about a place she had already settled.
import { buildAssembleRevealStages } from '../assembleRevealEngines';

const venueStage = (ev) => (buildAssembleRevealStages(ev, null, null, {}) || [])
  .find((s) => s && /venue|town|where/i.test(`${s.key} ${s.title} ${s.what || s.description || ''}`) && /venue|town/i.test(String(s.key || s.title)));
const text = (st) => JSON.stringify(st || {});

const home = { id: 'h1', type: 'The Cookout', date: '2026-11-07', guestEstimate: 25, venue: 'Backyard', venueKind: 'home' };

test('a home with no town asks for the TOWN, never "where is the event"', () => {
  const st = venueStage(home);
  expect(st).toBeTruthy();
  expect(text(st)).not.toMatch(/Where is the event/i);
  expect(text(st)).not.toMatch(/Choose or confirm the venue/i);
  expect(text(st)).toMatch(/town/i);
});

test('a home with its town asks nothing', () => {
  expect(venueStage({ ...home, venueCity: 'Bowie', venueState: 'MD' })).toBeFalsy();
});

test('an event with no place at all still asks where (control)', () => {
  const st = venueStage({ id: 'v1', type: 'Birthday', date: '2026-12-07', guestEstimate: 40 });
  expect(text(st)).toMatch(/Where is the event/i);
});
