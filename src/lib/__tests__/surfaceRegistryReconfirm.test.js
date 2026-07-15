// T-72h RECONFIRM SWEEP enters the registry — coverage re-audit finding.
//
// HostShellV2 computed `reconfirmables` locally (HostShellV2.jsx ~1505) and rendered a
// banner only: a host who never saw the banner never learned, and the ranked list never
// counted it. The 'vendor-reconfirm' surface mirrors the shell's predicate — named
// vendors, days 0..3, not yet `reconfirmed72` — with one deliberate divergence pinned
// below: informal helpers never raise (host-appropriate vendor UI rule).

import { raiseAll } from '../surfaceRegistry';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const feast = (over = {}) => ({
  id: 's', type: 'Crab Feast', name: 'Feast', date: iso(2),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});

const reconfirms = (ev) => raiseAll(ev).filter((r) => r.surface === 'vendor-reconfirm');

describe('who qualifies — the shell predicate, not a guess', () => {
  test('an unnamed vendor never raises — there is no one to reconfirm', () => {
    const ev = feast({ vendors: [{ id: 'v1', name: '', category: 'Catering' }, { id: 'v2', name: '   ', category: 'DJ' }] });
    expect(reconfirms(ev)).toEqual([]);
  });

  test('an informal helper never raises — a friend bringing the cooler is not a paid-vendor reconfirm ask', () => {
    const ev = feast({ vendors: [{ id: 'v1', name: 'Aunt Carol', category: 'Desserts', isInformal: true }] });
    expect(reconfirms(ev)).toEqual([]);
  });

  test('a vendor who already answered (reconfirmed72 truthy) never raises — the ask is done', () => {
    const ev = feast({ vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ', reconfirmed72: true }] });
    expect(reconfirms(ev)).toEqual([]);
  });
});

describe('inside the window, one raise per vendor', () => {
  test('two qualifying vendors 2 days out → two attention raises, each routed to its own vendor row', () => {
    const ev = feast({
      date: iso(2),
      vendors: [
        { id: 'v1', name: 'Sable & Sound', category: 'DJ' },
        { id: 'v2', name: 'Bay Catering', category: 'Catering' },
      ],
    });
    const raised = reconfirms(ev);
    expect(raised.length).toBe(2);
    for (const r of raised) {
      expect(r.severity).toBe('attention');
      expect(r.route.tab).toBe('Vendors');
      // Row-level or not at all — the house standing rule, and what the upstream dedup keys on.
      expect(r.route.vendorId).toBeTruthy();
      expect(r.why).toMatch(/2 days out/);
    }
    expect(new Set(raised.map((r) => r.route.vendorId))).toEqual(new Set(['v1', 'v2']));
    expect(raised.map((r) => r.title).sort()).toEqual([
      'Reconfirm Bay Catering for the day',
      'Reconfirm Sable & Sound for the day',
    ]);
  });

  test('answering clears exactly that vendor — the other ask stays', () => {
    const vendors = [
      { id: 'v1', name: 'Sable & Sound', category: 'DJ', reconfirmed72: true },
      { id: 'v2', name: 'Bay Catering', category: 'Catering' },
    ];
    const raised = reconfirms(feast({ vendors }));
    expect(raised.length).toBe(1);
    expect(raised[0].route.vendorId).toBe('v2');
  });
});

describe('outside the window, silence', () => {
  test('10 days out → nothing; the sweep exists only inside the last three days (0..3)', () => {
    const ev = feast({ date: iso(10), vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    expect(reconfirms(ev)).toEqual([]);
  });

  test('a past event raises nothing — no nagging about a party that already happened', () => {
    const ev = feast({ date: iso(-2), vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    expect(reconfirms(ev)).toEqual([]);
  });

  test('no date at all → nothing; a window needs a day to count from', () => {
    const ev = feast({ date: '', vendors: [{ id: 'v1', name: 'Sable & Sound', category: 'DJ' }] });
    expect(reconfirms(ev)).toEqual([]);
  });
});
