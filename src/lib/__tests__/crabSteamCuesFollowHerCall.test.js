// Crab Feast's day cues follow her steam-or-order call (batch 11, #233 Left).
// With "Order steamed for pickup" the crab house steams them and she picks up
// hot bushels, yet the run of show still read "First steam hits the table",
// "the second steam goes on" and "if steaming your own crabs, get the pot and
// liquid ready". Steaming cues are for a host who steams; a pickup host's
// crabs arrive cooked.
import { playbookRunOfShow } from '../playbooks';

const crab = (foodChoices = {}) => ({
  id: 'aud-crab', name: 'Backyard Crab Feast', type: 'Crab Feast', date: '2027-07-24', startTime: '14:00', startTimeSource: 'host',
  venue: 'Our backyard', venueCity: 'Annapolis, MD', state: 'MD', venueKind: 'home', guestMode: 'count', guestCount: 40,
  guestEstimate: 40, totalBudget: 2500, budget: [], vendors: [], guests: [], foodChoices,
});
const cues = (ev) => (playbookRunOfShow(ev) || []).map((r) => String(r.segment || ''));
const STEAMING = /\b(first|second) steam\b|steaming your own|pot and liquid/i;

describe('the crab cues follow the steam-or-order call', () => {
  test('pickup: no steaming cues, and the crabs still reach the table', () => {
    const c = cues(crab({ steam_vs_order: 'Order steamed for pickup' }));
    expect(c.filter((s) => STEAMING.test(s))).toEqual([]);
    expect(c.some((s) => /crabs hit the table/i.test(s))).toBe(true);
  });
  test('the authored default is pickup, so an unanswered plan reads as pickup', () => {
    expect(cues(crab()).filter((s) => STEAMING.test(s))).toEqual([]);
  });
  for (const pick of ['Steam them myself', 'Buy live, steam in batches']) {
    test(`${pick}: the steaming cues stay`, () => {
      const c = cues(crab({ steam_vs_order: pick }));
      expect(c.some((s) => /first steam hits the table/i.test(s))).toBe(true);
      expect(c.some((s) => /second steam goes on/i.test(s))).toBe(true);
      expect(c.some((s) => /steaming your own crabs/i.test(s))).toBe(true);
    });
  }
});
