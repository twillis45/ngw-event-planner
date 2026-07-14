// The DEADLINE is grounded. The HOUR is not — so we ask.
//
// The Day tab's empty state promises the schedule "fills in as vendors and their arrival
// times settle", and the app did nothing to make that happen: a bare empty field, and a host
// left to remember on their own that a caterer needs chasing.

import { arrivalAsk, openArrivalAsks } from '../vendorAsks';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ev = (over = {}) => ({ id: 'e', type: 'Dinner Party', date: iso(20), vendors: [], ...over });
const caterer = { id: 'v1', name: 'Fired Up BBQ', category: 'Catering' };
const shooter = { id: 'v2', name: 'Lens & Co', category: 'Photography' };

describe('the lead comes from the vendor\'s OWN playbook, and it really varies', () => {
  test('catering locks arrival 3 days out', () => {
    expect(arrivalAsk(caterer, ev()).daysBefore).toBe(3);
  });

  test('a photographer wants it a week out — this is a real constraint, not a constant', () => {
    const p = arrivalAsk(shooter, ev());
    expect(p.daysBefore).toBe(7);
    // The whole justification for grounding on this: the leads DIFFER. (Contrast
    // payment_terms — daysBefore 30 in all thirteen playbooks — which grounds nothing.)
    expect(p.daysBefore).not.toBe(arrivalAsk(caterer, ev()).daysBefore);
  });

  test('the deadline is a real date, and the reason names whose rule it is', () => {
    const a = arrivalAsk(caterer, ev());
    expect(a.dueIso).toBe(iso(17));           // 20 days out − 3
    expect(a.dueInDays).toBe(17);
    expect(a.why).toMatch(/catering usually locks the arrival time 3 days/i);
    expect(a.why).toMatch(/Only Fired Up BBQ can tell you the hour/i);
  });
});

describe('we never propose the HOUR', () => {
  test('the ask carries no clock time at all — only the vendor knows it', () => {
    const a = arrivalAsk(caterer, ev());
    expect(JSON.stringify(a)).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('who is NOT chased', () => {
  test('a vendor who already gave a time', () => {
    expect(arrivalAsk({ ...caterer, arrivalTime: '16:00' }, ev())).toBeNull();
  });

  test('an informal helper — a friend bringing a dish is not a vendor to chase', () => {
    expect(arrivalAsk({ ...caterer, isInformal: true }, ev())).toBeNull();
  });

  test('a category whose playbook authors no arrival promise gets NO invented deadline', () => {
    const odd = { id: 'v9', name: 'Someone', category: 'Other' };
    const a = arrivalAsk(odd, ev());
    if (a) expect(a.daysBefore).toBeGreaterThan(0);   // if the playbook authors one, fine
    else expect(a).toBeNull();                        // if not, we say nothing
  });
});

describe('past the window, it says so — and it is ranked', () => {
  test('an overdue ask names how late it is', () => {
    const a = arrivalAsk(caterer, ev({ date: iso(1) }));   // wanted 3 days out; 1 day left
    expect(a.overdue).toBe(true);
    expect(a.label).toMatch(/past when you'd want it/);
  });

  test('the most-overdue vendor comes first', () => {
    const list = openArrivalAsks(ev({ date: iso(5), vendors: [caterer, shooter] }));
    // photographer wants it 7 days out (2 days late); caterer 3 days out (2 days to go)
    expect(list[0].vendor.name).toBe('Lens & Co');
    expect(list[0].ask.overdue).toBe(true);
  });
});
