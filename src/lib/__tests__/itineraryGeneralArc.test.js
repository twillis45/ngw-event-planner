// The multi-day arc used to be gated on `ev.type === 'Reunion'`, so 38 of 39
// playbooks produced no programme at all. The gate is now the SPAN.
import { guestItinerary } from '../itinerary';

const noPlaybook = () => null;
// A Sat-start 5-day trip: Jun 17 2028 is a Saturday, so the main day must NOT be
// day 1 (people are still arriving) — it should take the NEXT Saturday, Jun 24.
const santaFe = { id: 'sf', type: 'Birthday', date: '2028-06-17', endDate: '2028-06-21', isDestination: true };

describe('any multi-day event gets an arc, not just a Reunion', () => {
  test('the destination 80th birthday is no longer irrelevant', () => {
    const it = guestItinerary(santaFe, noPlaybook);
    expect(it.relevant).toBe(true);
    expect(it.source).toBe('proposed');
    expect(it.rows.length).toBeGreaterThanOrEqual(3);
  });

  test('it proposes arrival, a main day, and departures', () => {
    const titles = guestItinerary(santaFe, noPlaybook).rows.map((r) => r.title);
    expect(titles).toContain('Everyone arrives');
    expect(titles).toContain('The main event');
    expect(titles).toContain('Goodbyes and departures');
  });

  test('arrival is day 1 and departure is the last day', () => {
    const rows = guestItinerary(santaFe, noPlaybook).rows;
    expect(rows.find((r) => r.title === 'Everyone arrives').day).toBe(1);
    expect(rows.find((r) => r.title === 'Goodbyes and departures').day).toBe(5);
  });

  test('the main day never collides with the arrival day', () => {
    const rows = guestItinerary(santaFe, noPlaybook).rows;
    expect(rows.find((r) => r.title === 'The main event').day).toBeGreaterThan(1);
  });

  test('it is labelled STRUCTURAL and admits it holds no activity content', () => {
    const p = guestItinerary(santaFe, noPlaybook).provenance;
    expect(p.tier).toBe('structural');
    expect(p.note).toMatch(/will not invent/i);
  });

  test('every row is a day-part SLOT, never an invented clock time', () => {
    guestItinerary(santaFe, noPlaybook).rows.forEach((r) => {
      expect(r.time).toBeNull();
      expect(['morning', 'midday', 'afternoon', 'evening', 'night']).toContain(r.slot);
    });
  });
});

describe('what must NOT change', () => {
  test('a SINGLE-day event still gets no arc', () => {
    const one = { id: 'o', type: 'Birthday', date: '2028-06-17' };
    expect(guestItinerary(one, noPlaybook).relevant).toBe(false);
  });

  test('Reunion keeps its RESEARCHED arc, not the structural one', () => {
    const reunion = { id: 'r', type: 'Reunion', date: '2028-06-16', endDate: '2028-06-18' };
    const it = guestItinerary(reunion, noPlaybook);
    expect(it.provenance.tier).toBe('researched');
    expect(it.rows.map((r) => r.title)).toContain('The cookout — the big gathering');
  });

  test('host-owned rows still outrank any proposal', () => {
    const withHost = { ...santaFe, itinerary: [{ day: 2, slot: 'morning', title: 'Hot air balloons' }] };
    const it = guestItinerary(withHost, noPlaybook);
    expect(it.source).toBe('host');
    expect(it.rows).toHaveLength(1);
  });
});

// The three anchors are the same three whatever the span, so a 5-day trip came back
// as a 3-row plan with two days silently unmentioned. The gap is the point: a guest
// is there on the Sunday whether or not we have a row for it.
describe('the arc names the days it does NOT cover', () => {
  // Jun 17 2028 is a Saturday. Days: 1 Sat, 2 Sun, 3 Mon, 4 Tue, 5 Wed.
  // Anchors land on 1 (arrive), 3 (main — no later Saturday), 5 (depart).
  const fiveDay = { id: 'sf', type: 'Birthday', date: '2028-06-17', endDate: '2028-06-21', isDestination: true };

  test('it names the uncovered days by weekday', () => {
    const p = guestItinerary(fiveDay, noPlaybook).provenance;
    expect(p.openDays).toEqual([2, 4]);
    expect(p.note).toMatch(/Sunday and Tuesday have nothing on them yet/);
  });

  test('it says how much of the trip is unplanned, in days', () => {
    expect(guestItinerary(fiveDay, noPlaybook).provenance.note)
      .toMatch(/2 whole days your guests are here for/);
  });

  test('it still refuses to fill them — no invented activity content', () => {
    const p = guestItinerary(fiveDay, noPlaybook);
    expect(p.provenance.note).toMatch(/will not invent any/);
    // and the GAP is never expressed as filler ROWS, which would reach the invite
    expect(p.rows).toHaveLength(3);
    p.rows.forEach((r) => expect(r.title).not.toMatch(/nothing planned|open|tbd/i));
  });

  test('a fully-covered span reports no gap at all', () => {
    // Sat->Mon: anchors on 1, 2 (Sunday is the middle), 3 — nothing left over.
    const threeDay = { id: 't', type: 'Birthday', date: '2028-06-17', endDate: '2028-06-19' };
    const p = guestItinerary(threeDay, noPlaybook).provenance;
    expect(p.openDays).toEqual([]);
    expect(p.note).not.toMatch(/nothing on/);
  });

  test('a single uncovered day reads in the singular', () => {
    // Sat->Tue (4 days): anchors 1, 2, 4 -> day 3 is the lone gap.
    const fourDay = { id: 'f', type: 'Birthday', date: '2028-06-17', endDate: '2028-06-20' };
    const p = guestItinerary(fourDay, noPlaybook).provenance;
    expect(p.openDays).toEqual([3]);
    expect(p.note).toMatch(/has nothing on it yet/);
    expect(p.note).toMatch(/a whole day your guests are here for/);
  });
});
