// A caterer's PAY step waits for a caterer she has hired or a food call she
// has made (batch 11, #233 Left). Holiday Party and Retirement Party default
// their food call to drop-off catering, and catererHired read that default as
// a hire: "Pay the caterer and bartender their final balance…" and "Pay the
// venue and caterer balances…" sat on the list of a host who had picked
// nothing. Our proposal is not her pick. The booking step stays, so she is
// still told to book one.
import { playbookChecklist, foodApproach, catererHired } from '../playbooks';

const AS_OF = new Date('2026-11-22T12:00:00');
const ev = (type, extra = {}) => ({
  id: 'ev-' + type.replace(/\W+/g, ''), type, date: '2027-03-06', guestMode: 'count', guestCount: 45,
  totalBudget: 3000, budget: [], vendors: [], guests: [], foodChoices: {}, ...extra,
});
const steps = (e) => (playbookChecklist(e, AS_OF) || []).map((r) => String(r.task || ''));
const payCaterer = (e) => steps(e).filter((s) => /\bpay\b/i.test(s) && /\bcaterer/i.test(s));

describe('a caterer pay step waits for her caterer', () => {
  for (const [type, pickId, pick] of [
    ['Holiday Party', 'food_format', 'Drop-off catering (you set up)'],
    ['Retirement Party', 'food_style', 'Drop-off catering / buffet'],
  ]) {
    test(`${type}: the drop-off default hires no one`, () => {
      const e = ev(type);
      expect(foodApproach(e).usesCaterer).toBe(true); // the plan still drops the groceries
      expect(catererHired(e)).toBe(false);
      expect(payCaterer(e)).toEqual([]);
    });
    test(`${type}: her own drop-off pick brings the pay step`, () => {
      const e = ev(type, { foodChoices: { [pickId]: pick } });
      expect(catererHired(e)).toBe(true);
      expect(payCaterer(e).length).toBeGreaterThan(0);
    });
    test(`${type}: a booked caterer brings the pay step`, () => {
      const e = ev(type, { vendors: [{ id: 'v1', name: 'Capital Catering', category: 'Catering', status: 'Booked', cost: 1800 }] });
      expect(payCaterer(e).length).toBeGreaterThan(0);
    });
  }
  test('the other work in a caterer step stays: the chase, the staff, the venue', () => {
    const h = steps(ev('Holiday Party'));
    expect(h).toContain('Chase non-responders and lock the final guaranteed count');
    expect(h.some((s) => /^Pay any staff you hired their final balance/.test(s))).toBe(true);
    const r = steps(ev('Retirement Party', { foodChoices: { venue: 'Banquet hall / event venue' } }));
    expect(r.some((s) => /^Pay the venue balance and get the damage deposit released/.test(s))).toBe(true);
    // Her caterer pick brings the caterer back into the same steps.
    const hc = steps(ev('Holiday Party', { foodChoices: { food_format: 'Drop-off catering (you set up)' } }));
    expect(hc).toContain('Chase non-responders; give caterer + bartender the final guaranteed count');
  });
  test('a plan whose every option is catered still counts as hired (Wedding)', () => {
    const wed = { id: 'ev-w', type: 'Wedding', date: '2027-10-16', guestMode: 'count', guestCount: 150, totalBudget: 40000, vendors: [], guests: [] };
    expect(catererHired(wed)).toBe(true);
  });
});
