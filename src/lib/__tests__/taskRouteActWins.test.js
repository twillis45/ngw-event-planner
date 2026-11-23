const { routeByWords } = require('../__fixtures__/stepByWords');
const { checklistRouteFor } = require('../taskRoute');
// Six root causes, cause 1 (11/23/2026): these rows now land by the target
// each step DECLARES, so an incidental noun cannot win. The authored rows the
// old keyword rules were written for are asserted by their own words; a
// phrasing no playbook authors gets no button at all.
describe('the act beats the trailing inventory', () => {
  test('a pavilion reservation row routes to the venue details, not the parking note', () => {
    const hit = routeByWords('Call the park / reserve the pavilion and confirm what it includes', {}, null);
    expect(hit).toBeTruthy();
    expect(hit.label).not.toMatch(/parking/i);
    expect(hit.route.tab).toBe('Event Details');
  });
  test('a row that really is about parking still lands on the parking note', () => {
    const hit = routeByWords('Arrange parking, visitor badges, and a building/reception access list', {}, null);
    expect(hit.label).toBe('Open the parking note');
    expect(hit.route.focusField).toBe('parking-notes');
  });
  test('a phrasing no playbook authors gets no guessed button', () => {
    expect(checklistRouteFor('Book the shelter; confirm tables, power and parking', {}, { id: 'e', type: 'Reunion' })).toBeNull();
  });
});

// ─── "guests" NAMES THE AUDIENCE, NOT THE DESTINATION ────────────────────────
//
// Host report 2026-07-28: "Send guests the getting-here info — airport, hotel,
// transport, cutoff dates" landed on the GUEST LIST. Nothing specific matched
// it, so it fell through to milestoneActionRoute whose first domain is
// /guest|invite|rsvp|.../ — the bare word "guests" won. Same fall-through-catch
// class the routing audit recorded: a broad matcher quietly eating a task that
// is about something else.
describe('the getting-here brief lands on travel, not the guest list', () => {
  const { checklistRouteFor } = require('../taskRoute');
  const EV = { id: 'r', type: 'Family Reunion', date: '2026-09-11', venueCity: 'McHenry', venueState: 'MD', guestCount: 10 };
  const to = (t) => routeByWords(t, {}, EV);

  test('the exact task the host reported', () => {
    const hit = to('Send guests the getting-here info — airport, hotel, transport, cutoff dates');
    expect(hit.route.tab).toBe('Travel');
    expect(hit.label).toBe('Open travel & stays');
  });

  test('every wording of the brief (by how people travel) lands on travel', () => {
    for (const t of ['Send guests the getting-here info — how to get there, hotel, transport, cutoff dates',
      'Send guests the getting-here info — directions and parking, hotel, cutoff dates',
      'Send guests the getting-here info — airport and parking, hotel, transport, cutoff dates']) {
      expect(to(t).route.tab).toBe('Travel');
    }
  });

  test('REAL guest-list work still lands on the guest list', () => {
    for (const t of ['List every household and a contact for each',
      'Chase non-responders by household', 'Prep name tags, markers, and a sign-in / contact-update sheet']) {
      expect(to(t).route.tab).toBe('Guests');
    }
  });

  test('an airport row lands on the airports card', () => {
    const hit = to('Book flights/shuttles; build an arrivals/departures grid; plan airport transfers');
    expect(hit).toBeTruthy();
    expect(hit.route.focusField).toBe('air');
    expect(hit.label).toBe('Open the airports');
  });
});

// ─── THE WALK-THROUGH IS THE PLACE, NOT THE PARKING ─────────────────────────
//
// Owner screenshot, 11/18/2026: Friendsgiving's late step "If it is not at your
// place, walk the kitchen with whoever lives there: oven size, refrigerator
// space, serving dishes, and parking" carried "Open the parking note". Parking
// is the last of four things to check; the step is about the place.
describe('a walk-through of the place opens the place, not the parking note', () => {
  const { checklistRouteFor } = require('../taskRoute');
  test('the Friendsgiving kitchen walk-through opens the place notes', () => {
    const hit = routeByWords('If it is not at your place, walk the kitchen with whoever lives there: oven size, refrigerator space, serving dishes, and parking', {}, null);
    expect(hit).toBeTruthy();
    expect(hit.label).toBe('Open the place notes');
    expect(hit.route).toEqual({ tab: 'Event Details', focusField: 'space' });
  });
  test('the same step in every playbook that carries it', () => {
    const { ALL_PLAYBOOKS } = require('../playbooks');
    const rows = [];
    for (const pb of ALL_PLAYBOOKS || []) {
      for (const t of [...(pb.tasks || []), ...(pb.checklist || [])]) {
        const label = String((t && (t.label || t.task)) || '');
        if (/\b(walk|tour|visit|check)\b[^.;]{0,60}:\s*[^.;]*,[^.;]*\bparking\b/i.test(label)) rows.push(label);
      }
    }
    for (const label of rows) expect(routeByWords(label, {}, null).label).not.toBe('Open the parking note');
  });
});
