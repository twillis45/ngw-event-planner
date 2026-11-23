// The rain backup waits for its own window, and offers what fits the place
// (batch 11; audit 2 lane C P1-1). At 300 days out the 150-guest vineyard
// wedding led with "Add a rain backup." and offered "Tent / Carport / garage".
//   · Timing: the wedding's own playbook books the tent with its rentals at
//     T-180d and decides the rain plan at T-7d. Until the earliest of those
//     authored leads, the rain part still counts in the plan (the denominator
//     does not move), but it ranks after the rest instead of leading.
//   · Options: a carport or a garage is a home's cover; at a venue it is not
//     offered.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { rainPlanOptions } from '../weather';

const at = (date, d) => { const x = new Date(date + 'T09:00:00'); x.setDate(x.getDate() + d); return x; };
const wedding = {
  id: 'aud-wedding', type: 'Wedding', date: '2027-10-16', startTime: '16:00', startTimeSource: 'host',
  venue: 'Bluemont Vineyard', venueCity: 'Bluemont, VA', state: 'VA', guestMode: 'count', guestCount: 150, totalBudget: 45000,
  budget: [], guests: [], vendors: [], createdAt: '2026-12-20T15:00:00.000Z',
};
const rain = (pc) => (pc.items || []).find((i) => i.id === 'rain');

describe('the rain part ranks by its own window', () => {
  test('300 days out: counted, not leading', () => {
    const pc = deriveEventPhaseProgress(wedding, at(wedding.date, -300));
    expect(rain(pc)).toBeTruthy();
    expect(pc.nextCue && pc.nextCue.id).not.toBe('rain');
  });
  test('the same plan counts the same parts at 300 and at 150 days', () => {
    const far = deriveEventPhaseProgress(wedding, at(wedding.date, -300));
    const near = deriveEventPhaseProgress(wedding, at(wedding.date, -150));
    expect(near.totalCount).toBe(far.totalCount);
  });
  test('inside the tent-booking window it ranks where it always did', () => {
    const far = rain(deriveEventPhaseProgress(wedding, at(wedding.date, -300)));
    const near = rain(deriveEventPhaseProgress(wedding, at(wedding.date, -150)));
    expect(near.priority).toBe(5);
    expect(far.priority).toBeGreaterThan(near.priority);
  });
});

describe('the rain options fit the place', () => {
  test('a home is offered its carport or garage', () => {
    expect(rainPlanOptions({ venue: 'Our backyard', venueKind: 'home' })).toContain('Carport / garage');
  });
  test('a venue is not', () => {
    const opts = rainPlanOptions(wedding);
    expect(opts).not.toContain('Carport / garage');
    expect(opts).toEqual(expect.arrayContaining(['Tent on standby', 'Move it indoors', 'Rain or shine']));
  });
});
