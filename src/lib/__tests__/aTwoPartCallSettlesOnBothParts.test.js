// A two-part call settles when both of its parts are on record (batch 11,
// #229 Left). Anniversary asks "Confirm guest count + collect dietary/
// accessibility needs" with no options. The host gave her count and tapped
// "That's everyone — noted", and the call was still asked: nothing read the
// two facts it is made of. It now settles on both (her own count, and the
// needs noted or recorded on the guest rows), and stays open on either alone.
import { playbookDecisionBoard } from '../playbooks';

const AS_OF = new Date('2026-11-22T12:00:00');
const an = (extra = {}) => ({
  id: 'ev-an', type: 'Anniversary', date: '2027-03-06', guestMode: 'count', guestCount: 30, guestCountSource: 'host',
  totalBudget: 3000, budget: [], vendors: [], guests: [], foodChoices: {}, ...extra,
});
const where = (ev) => {
  const b = playbookDecisionBoard(ev, AS_OF);
  if ((b.locked || []).some((r) => r.id === 'guestlist')) return 'settled';
  if ([...(b.open || []), ...(b.deferred || [])].some((r) => r.id === 'guestlist')) return 'asked';
  return 'gone';
};

describe('Anniversary: count + dietary needs', () => {
  test('her count and the needs noted: settled, and it says what settled it', () => {
    const ev = an({ dietaryNoted: true });
    expect(where(ev)).toBe('settled');
    const row = playbookDecisionBoard(ev, AS_OF).locked.find((r) => r.id === 'guestlist');
    expect(row.because).toMatch(/30 guests/);
    expect(row.because).toMatch(/noted/i);
  });
  test('needs recorded on the guest rows count too', () => {
    const guests = [{ id: 'g1', name: 'Ann', rsvp: 'Yes', needs: 'Wheelchair access' }, { id: 'g2', name: 'Bo', rsvp: 'Yes' }];
    expect(where(an({ guestMode: 'list', guestCount: undefined, guestCountSource: undefined, guests }))).toBe('settled');
  });
  test('the needs noted without her own count: still asked', () => {
    expect(where(an({ dietaryNoted: true, guestCount: undefined, guestEstimate: 30, guestCountSource: 'playbook-typical' }))).toBe('asked');
  });
  test('her count alone: still asked', () => {
    expect(where(an())).toBe('asked');
  });
});
