// LOCATION-VENUE-1 — Place Intelligence contract. One Place Core answering two
// questions (location: what does this place change; venue: what must be
// confirmed) with truthful states and real deep-link CTAs. Pins the doctrine
// rules: na is suppression not failure, no invented facts, counts not
// percentages.

import { derivePlaceIntelligence, PLACE_STATES, PLACE_TARGETS } from '../placeIntelligence';
import { RAIN_PLAN_TARGET } from '../weather';

const sec = (pi, key) => pi.sections.find((s) => s.key === key);

const venueEvent = (over = {}) => ({
  recordKind: 'host_event', venueKind: 'venue',
  venue: 'VFW Post 3150 — Alexandria, VA', venueAddress: '224 Fayette St, Alexandria, VA',
  guestCount: 120, vendors: [], ...over,
});

const homeEvent = (over = {}) => ({
  recordKind: 'host_event', venueKind: 'home', venueCity: 'Atlanta', vendors: [], ...over,
});

test('1 · no location → status missing, CTA routes to the venue field', () => {
  const pi = derivePlaceIntelligence({ recordKind: 'host_event', venueKind: 'venue' });
  expect(pi.status).toBe('missing');
  expect(pi.headline).toMatch(/Location is missing/);
  const v = sec(pi, 'venue');
  expect(v.state).toBe(PLACE_STATES.NEEDS);
  expect(v.action.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
});

test('2 · venue set, rain plan missing, not indoor → rain backup needs info', () => {
  const pi = derivePlaceIntelligence(venueEvent({ indoorOutdoor: 'both' }));
  expect(sec(pi, 'rain').state).toBe(PLACE_STATES.RISK);
  expect(sec(pi, 'rain').action.route).toEqual(RAIN_PLAN_TARGET);
});

test('3 · at-home outdoor event → parking, weather, and arrival prompts appear', () => {
  const pi = derivePlaceIntelligence(homeEvent({ indoorOutdoor: 'outdoor' }));
  expect(sec(pi, 'parking').state).toBe(PLACE_STATES.RISK); // outdoors elevates
  expect(sec(pi, 'rain').state).toBe(PLACE_STATES.RISK);
  expect(sec(pi, 'arrival').state).toBe(PLACE_STATES.NEEDS); // no street address yet
});

test('4 · indoor venue event → rain backup is not-applicable, not a failure', () => {
  const pi = derivePlaceIntelligence(venueEvent({ indoorOutdoor: 'indoor' }));
  expect(sec(pi, 'rain').state).toBe(PLACE_STATES.NA);
  expect(pi.missingItems).not.toContain('Rain backup');
  expect(pi.actions.map((a) => a.id)).not.toContain('place-rain');
});

test('5+11 · vendor-heavy venue event → load-in reminder with CTA', () => {
  const pi = derivePlaceIntelligence(venueEvent({
    vendors: [{ id: 'v1', name: 'Capital Rotisserie Catering' }],
  }));
  const li = sec(pi, 'loadIn');
  expect(li.state).toBe(PLACE_STATES.NEEDS);
  expect(li.action.route).toEqual({ tab: 'Event Details', focusField: 'loadin-notes' });
});

test('6+14 · vendorless (incl. at-home) → vendor setup suppressed, never failing', () => {
  [venueEvent(), homeEvent()].forEach((ev) => {
    const pi = derivePlaceIntelligence(ev);
    expect(sec(pi, 'loadIn').state).toBe(PLACE_STATES.NA);
    expect(pi.missingItems).not.toContain('Vendor setup');
  });
});

test('7+9 · parking missing → needs info with a real parking CTA', () => {
  const pi = derivePlaceIntelligence(venueEvent());
  const p = sec(pi, 'parking');
  expect(p.state).toBe(PLACE_STATES.NEEDS);
  expect(p.action.route).toEqual({ tab: 'Event Details', focusField: 'parking-notes' });
  // and honest confirm-with-the-venue language, never invented instructions
  expect(p.detail).toMatch(/Confirm parking with the venue/);
});

test('8 · rain plan saved → rain backup handled', () => {
  const pi = derivePlaceIntelligence(homeEvent({ rainPlan: 'Move everything into the garage.' }));
  expect(sec(pi, 'rain').state).toBe(PLACE_STATES.HANDLED);
});

test('10 · booked outdoor venue without rain backup → risk state', () => {
  const pi = derivePlaceIntelligence(venueEvent({ indoorOutdoor: 'outdoor' }));
  const r = sec(pi, 'rain');
  expect(r.state).toBe(PLACE_STATES.RISK);
  expect(r.detail).toMatch(/Confirm the venue.s indoor backup space/);
});

test('12 · missing venue contact is asked for, never invented', () => {
  const pi = derivePlaceIntelligence(venueEvent());
  const c = sec(pi, 'contact');
  expect(c.state).toBe(PLACE_STATES.NEEDS);
  expect(c.detail).toMatch(/Confirm with the venue/);
  // set contact → handled with "entered" language, never "confirmed"
  const set = derivePlaceIntelligence(venueEvent({ venueContact: 'Post Quartermaster' }));
  expect(sec(set, 'contact').state).toBe(PLACE_STATES.HANDLED);
  expect(sec(set, 'contact').detail).not.toMatch(/confirmed/i);
});

test('13 · at-home suppresses venue-only contact/rules requirements', () => {
  const pi = derivePlaceIntelligence(homeEvent());
  expect(sec(pi, 'contact').state).toBe(PLACE_STATES.NA);
  expect(sec(pi, 'rules').state).toBe(PLACE_STATES.NA);
  expect(pi.missingItems).not.toEqual(expect.arrayContaining(['Venue contact', 'Venue rules']));
});

test('15 · no invented facts anywhere in the output', () => {
  // Sweep every representative shape: no copy may assert a specific parking
  // instruction, backup room, accessibility fact, or venue rule we don't hold.
  [venueEvent(), homeEvent(), venueEvent({ indoorOutdoor: 'outdoor' }),
   homeEvent({ indoorOutdoor: 'outdoor', guestCount: 80 })].forEach((ev) => {
    const all = JSON.stringify(derivePlaceIntelligence(ev));
    expect(all).not.toMatch(/Lot [A-Z]/); // "Lot B"-style invented specifics (case-sensitive: "a lot nearby" is a question, not a fact)
    expect(all).not.toMatch(/validate|Ballroom|wheelchair|elevator/i);
    expect(all).not.toMatch(/venue confirmed|address validated/i);
  });
});

test('16 · every emitted CTA has a valid Event Details route/focus contract', () => {
  const shapes = [
    {}, venueEvent(), homeEvent(),
    venueEvent({ indoorOutdoor: 'outdoor', vendors: [{ id: 'v', name: 'X Rentals' }] }),
    homeEvent({ indoorOutdoor: 'outdoor' }),
  ];
  const validFocus = new Set(Object.values(PLACE_TARGETS).map((t) => t.focusField));
  shapes.forEach((ev) => {
    derivePlaceIntelligence(ev).actions.forEach((a) => {
      expect(a.route.tab).toBe('Event Details');
      expect(validFocus.has(a.route.focusField)).toBe(true);
      expect(a.label).toBeTruthy();
    });
  });
});

test('summary uses counts, never percentages; handled events say so plainly', () => {
  const busy = derivePlaceIntelligence(homeEvent());
  expect(busy.summary).toMatch(/^\d+ location details? needs? attention$/);
  expect(JSON.stringify(busy)).not.toMatch(/%|percent/i);
  const done = derivePlaceIntelligence(homeEvent({
    venueStreet: '12 Peach St', parkingNotes: 'Driveway + street', rainPlan: 'Garage',
  }));
  expect(done.status).toBe('handled');
  expect(done.headline).toMatch(/look handled/);
});

test('permit + COI notes stay honest nudges with existing gating', () => {
  const pi = derivePlaceIntelligence(venueEvent({ indoorOutdoor: 'outdoor', guestCount: 120 }));
  expect(pi.notes.join(' ')).toMatch(/often need a city or park permit/);
  // COI note only when vendors exist — vendorless hosts never see vendor paperwork
  const noV = derivePlaceIntelligence(venueEvent({ coiNeeded: 'required' }));
  expect(noV.notes.join(' ')).not.toMatch(/COI/);
  const withV = derivePlaceIntelligence(venueEvent({ coiNeeded: 'required', vendors: [{ id: 'v', name: 'VFW Post 3150' }] }));
  expect(withV.notes.join(' ')).toMatch(/COI required/);
});
