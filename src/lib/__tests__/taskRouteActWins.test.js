const { checklistRouteFor } = require('../taskRoute');
describe('the act beats the trailing inventory', () => {
  test('a pavilion reservation row routes to the venue, not the parking note', () => {
    const hit = checklistRouteFor('The park / reserve the pavilion and confirm what it includes (tables, grills, power, parking)', {}, null);
    expect(hit).toBeTruthy();
    expect(hit.label).not.toMatch(/parking/i);
    expect(hit.route.tab).toBe('Event Details');
  });
  test('a row that really is about parking still lands on the parking note', () => {
    const hit = checklistRouteFor('Post the parking map and mark the overflow lot', {}, null);
    expect(hit.label).toBe('Open the parking note');
    expect(hit.route.focusField).toBe('parking-notes');
  });
  test('book the shelter behaves the same as reserve the pavilion', () => {
    const hit = checklistRouteFor('Book the shelter; confirm tables, power and parking', {}, null);
    expect(hit.label).not.toMatch(/parking/i);
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
  const to = (t) => checklistRouteFor(t, {}, EV);

  test('the exact task the host reported', () => {
    const hit = to('Send guests the getting-here info — airport, hotel, transport, cutoff dates');
    expect(hit.route.tab).toBe('Travel');
    expect(hit.label).toBe('Open travel & stays');
  });

  test('every phrasing of the brief', () => {
    for (const t of ['Send the getting-here info', 'Share travel details with everyone',
      'Write up how to get here', 'Send arrival info to the family', 'Send the travel brief']) {
      expect(to(t).route.tab).toBe('Travel');
    }
  });

  test('airport named alongside lodging or transport is the brief by description', () => {
    for (const t of ['Confirm the airport and the hotel shuttle',
      'Airport pickups and where everyone will stay']) {
      expect(to(t).route.tab).toBe('Travel');
    }
  });

  test('REAL guest-list work still lands on the guest list', () => {
    // The fix must not overcorrect — these are genuinely about the roster.
    for (const t of ['List every household and a contact for each',
      'Chase non-responders', 'Print the sign-in sheet and name tags']) {
      expect(to(t).route.tab).toBe('Guests');
    }
  });

  test('a bare airport row lands on the airports card — it used to land NOWHERE', () => {
    // Pre-existing gap found while fixing the above: milestoneActionRoute has no
    // air domain, so airport rows fell to the Timeline self-route and were
    // nulled out — no CTA at all, despite the app having an airports card and a
    // 119-airport table.
    for (const t of ['Add the nearest airport', 'Note the airport code', 'Check flight times']) {
      const hit = to(t);
      expect(hit).toBeTruthy();
      expect(hit.route.focusField).toBe('air');
      expect(hit.label).toBe('Open the airports');
    }
  });
});
