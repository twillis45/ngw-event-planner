// ─── PER-ROW DESTINATION GATING ───────────────────────────────────────────
//
// `isDestination` used to admit or refuse all five travel rows together, so a
// staycation and a fly-in wedding got an identical set. Host ruling: a
// staycation IS a lodging event — local, nobody travels, everyone still sleeps
// somewhere — while transport ("the late-night ride back from the venue") is
// not a staycation question.
//
// Two intake-ASKED fields decide it: guestsStayOvernight and travelMode.
// Distance is deliberately not used; the app holds no city coordinates, so any
// mileage would be invented.
import { destinationDecisionsFor, playbookDecisionBoard } from '../playbooks';

const ids = (ev, pb) => destinationDecisionsFor(ev, pb).map((d) => d.id);
const base = { id: 'ev', type: 'Retirement Party', date: '2027-06-12' };

describe('lodging follows OVERNIGHT, not travel', () => {
  test('a staycation gets lodging and nothing else', () => {
    const r = ids({ ...base, isDestination: false, guestsStayOvernight: true });
    expect(r).toContain('dest_lodging');
    expect(r).not.toContain('dest_transport');
    expect(r).not.toContain('dest_travelmix');
    expect(r).not.toContain('dest_health');
  });

  test('a multi-day local event infers overnight from the span', () => {
    expect(ids({ ...base, isDestination: false, endDate: '2027-06-14' })).toContain('dest_lodging');
  });

  test('a local single-day event gets none of them', () => {
    expect(ids({ ...base, isDestination: false })).toEqual([]);
  });

  test('a destination event where guests explicitly do NOT stay over drops lodging', () => {
    const r = ids({ ...base, isDestination: true, guestsStayOvernight: false });
    expect(r).not.toContain('dest_lodging');
    expect(r).toContain('dest_transport');
  });
});

describe('transport follows ARRIVAL MODE', () => {
  test('a driving trip is not asked about shuttles', () => {
    const r = ids({ ...base, isDestination: true, travelMode: 'drive' });
    expect(r).not.toContain('dest_transport');
    expect(r).toContain('dest_travelmix');
  });

  test('flying keeps transport', () => {
    expect(ids({ ...base, isDestination: true, travelMode: 'fly' })).toContain('dest_transport');
  });

  test('a mixed arrival keeps transport — some guests still land', () => {
    expect(ids({ ...base, isDestination: true, travelMode: 'mixed' })).toContain('dest_transport');
  });

  test('an unstated mode keeps transport — silence is not a no', () => {
    expect(ids({ ...base, isDestination: true })).toContain('dest_transport');
  });
});

describe('nothing regresses for events created before this shipped', () => {
  test('a plain destination event with neither field is unchanged', () => {
    // All five, including dest_childcare — that one carries its own `whenKids`
    // predicate and is filtered downstream, not here.
    expect(ids({ ...base, isDestination: true }).sort())
      .toEqual(['dest_childcare', 'dest_health', 'dest_lodging', 'dest_transport', 'dest_travelmix'].sort());
  });

  test('a plain local event with neither field is unchanged', () => {
    expect(ids({ ...base, isDestination: false })).toEqual([]);
  });

  test('a travel-native playbook keeps its OWN lodging row, never two', () => {
    const pb = { decisions: [{ id: 'lodging' }] };
    expect(ids({ ...base, isDestination: true }, pb)).not.toContain('dest_lodging');
  });
});

describe('the board reflects the gating end to end', () => {
  // A NEAR date on purpose. On a long runway the board moves a ready decision
  // whose window is still far out (dest_lodging is T-210d) into a `deferred`
  // bucket rather than nagging as an open row — correct behaviour that has
  // nothing to do with this gating. Forty-five days out keeps every window open
  // so the assertions test row PRESENCE, not the compression rules.
  const soon = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
  const withGuests = (ev) => ({
    ...ev,
    date: soon,
    guests: Array.from({ length: 18 }, (_, i) => ({ id: 'g' + i, rsvp: 'yes' })),
  });
  // Presence on the board at all — open or deferred — is what the gate decides.
  const onBoard = (b) => [...(b.open || []), ...(b.deferred || [])].map((d) => d.id);

  test('a staycation board carries lodging but not transport', () => {
    const b = playbookDecisionBoard(withGuests({ ...base, isDestination: false, guestsStayOvernight: true }));
    expect(onBoard(b)).toContain('dest_lodging');
    expect(onBoard(b)).not.toContain('dest_transport');
  });

  test('a driving destination board drops transport but keeps the rest', () => {
    const b = playbookDecisionBoard(withGuests({ ...base, isDestination: true, travelMode: 'drive' }));
    expect(onBoard(b)).not.toContain('dest_transport');
    expect(onBoard(b)).toContain('dest_lodging');
    expect(onBoard(b)).toContain('dest_travelmix');
  });

  test('a flying destination board keeps transport', () => {
    const b = playbookDecisionBoard(withGuests({ ...base, isDestination: true, travelMode: 'fly' }));
    expect(onBoard(b)).toContain('dest_transport');
  });
});
