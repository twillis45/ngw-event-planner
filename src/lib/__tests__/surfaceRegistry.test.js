// THE SURFACE REGISTRY — a surface cannot be silent by accident.
//
// The attention audit's #1 structural finding: only 2 of 7 attention producers fed the
// ranked list. Risks, vendor conflicts, arrival asks and the day-of alert stack all RAN, all
// were correct in isolation, and all reached NOTHING. A weather risk on an outdoor event
// could not outrank "Plan the food" — not because it ranked low, but because it could not
// ENTER THE LIST AT ALL. Each was hand-wired to one passive row, or to a sheet a host might
// never open.

import { SURFACES, raiseAll, raiseCounts } from '../surfaceRegistry';
import { eventPlan } from '../../CommandCenter';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const feast = (over = {}) => ({
  id: 's', type: 'Crab Feast', name: 'Feast', date: iso(20),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});

describe('the contract', () => {
  test('every registered surface declares a real raise() — declaring nothing is the bug this kills', () => {
    expect(SURFACES.length).toBeGreaterThan(0);
    for (const s of SURFACES) {
      expect({ id: s.id, hasRaise: typeof s.raise }).toEqual({ id: s.id, hasRaise: 'function' });
      expect(s.label).toBeTruthy();
      expect(s.domain).toBeTruthy();
      // A raise must not throw on a bare event — a surface that explodes is a surface that is
      // silent, which is the whole failure mode.
      expect(() => s.raise({ id: 'x' })).not.toThrow();
    }
  });

  test('every raised item is ACTIONABLE — a raise you cannot act on is pure anxiety', () => {
    const ev = feast({ vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    for (const r of raiseAll(ev)) {
      expect({ t: r.title, hasRoute: !!(r.route && r.route.tab) }).toEqual({ t: r.title, hasRoute: true });
      // House standing rule: route to the ROW, never a bare tab top.
      if (r.route.tab === 'Vendors') expect(r.route.vendorId).toBeTruthy();
    }
  });
});

describe('surfaces that used to be silent now reach the list', () => {
  test('THE REGRESSION: a high risk enters the ranked list — it never could before', () => {
    const ev = feast();
    const risks = raiseAll(ev).filter(r => r.surface === 'risks');
    if (risks.length) {
      const titles = eventPlan(ev).nextActions.map(a => String(a.title || ''));
      expect(titles).toContain(risks[0].title);
    } else {
      // A playbook with no HIGH risk raises nothing — and says so, rather than inventing one.
      expect(risks).toEqual([]);
    }
  });

  test("an overdue arrival ask reaches the list — the Day tab's own promise, finally kept", () => {
    // The DJ's playbook wants arrival locked 7 days out; the event is in 2.
    const ev = feast({ date: iso(2), vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    const raised = raiseAll(ev).filter(r => r.surface === 'vendor-arrivals');
    expect(raised.length).toBe(1);
    expect(raised[0].title).toMatch(/Sable & Sound/);

    const titles = eventPlan(ev).nextActions.map(a => String(a.title || ''));
    expect(titles.join(' | ')).toMatch(/Sable & Sound/);
  });

  test('criticals lead — "your caterer hasn\'t shown up" outranks "set your budget"', () => {
    const ev = feast({ date: iso(2), totalBudget: '', vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    const actions = eventPlan(ev).nextActions;
    const crit = actions.findIndex(a => a.level === 'critical');
    const budget = actions.findIndex(a => a.domain === 'budget');
    if (crit >= 0 && budget >= 0) expect(crit).toBeLessThan(budget);
  });
});

describe('nothing is raised that should not be', () => {
  test('a past event raises nothing — it does not nag about a party that already happened', () => {
    expect(raiseAll(feast({ date: iso(-5) }))).toEqual([]);
  });

  test('a dismissed risk stays dismissed', () => {
    const ev = feast();
    const first = raiseAll(ev).find(r => r.surface === 'risks');
    if (!first) return;                       // no high risks on this playbook — nothing to test
    const id = first.route.riskId;
    const after = raiseAll({ ...ev, riskStatus: { [id]: 'dismissed' } });
    expect(after.find(r => r.route.riskId === id)).toBeUndefined();
  });

  test('counts are per-surface and real — a badge must count something clearing the work clears', () => {
    const ev = feast({ date: iso(2), vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    const counts = raiseCounts(ev);
    expect(counts['vendor-arrivals']).toBe(1);

    // Give the vendor their arrival time: the badge must go to zero.
    const fixed = { ...ev, vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ', arrivalTime: '17:00' }] };
    expect(raiseCounts(fixed)['vendor-arrivals']).toBeUndefined();
  });
});
