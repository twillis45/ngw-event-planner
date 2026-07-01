// INTEL-1 P1 — the inert Host Intelligence store + hostIntel() reader.
// Acceptance: absent ⇒ honest-empty; malformed ⇒ no throw; single/multiple/stale/unstable
// observations rolled up with domain confidence + stability + explainability; no PII stored;
// inspectable/deletable at the data level. NOTHING here asserts a plan/estimate change — P1 is inert.
import {
  hostIntel, emptyHostIntelligence, appendObservation, appendFoodObservation,
  markEventObserved, clearDomain, clearAllHostIntelligence, CONFIDENCE, STABILITY,
} from '../hostIntel';

const ASOF = '2026-07-01';
// an observation dated `monthsAgo` before ASOF
const obs = (eventId, estimate, actual, monthsAgo = 0) => {
  const d = new Date(ASOF + 'T00:00:00'); d.setMonth(d.getMonth() - monthsAgo);
  return { eventId, date: d.toISOString().slice(0, 10), estimate, actual };
};
const withDomain = (name, observations) => ({ hostIntelligence: { version: 1, eventsObserved: observations.length, domains: { [name]: { observations } } } });

describe('hostIntel — honest-empty (absent / malformed)', () => {
  test('absent profile ⇒ present:false, every domain honest-empty', () => {
    for (const p of [undefined, null, {}, { hostIntelligence: null }]) {
      const h = hostIntel(p, ASOF);
      expect(h.present).toBe(false);
      expect(h.eventsObserved).toBe(0);
      const r = h.get('attendance');
      expect(r).toMatchObject({ n: 0, confidence: CONFIDENCE.NONE, stability: STABILITY.NONE, applicable: false });
      expect(r.observations).toEqual([]);
    }
  });
  test('malformed shapes never throw and read honest-empty', () => {
    const bad = [
      { hostIntelligence: 'garbage' },
      { hostIntelligence: { domains: 'nope' } },
      { hostIntelligence: { domains: { attendance: { observations: 'notarray' } } } },
      { hostIntelligence: { domains: { attendance: { observations: [null, 42, { estimate: 0, actual: 5 }, { estimate: -1, actual: 2 }] } } } },
    ];
    for (const p of bad) {
      expect(() => hostIntel(p, ASOF)).not.toThrow();
      expect(hostIntel(p, ASOF).get('attendance').n).toBe(0);
    }
  });
});

describe('hostIntel — confidence by observation count (per domain, independent)', () => {
  test('single observation ⇒ Low confidence, Stability None (can’t assess <2), not applicable', () => {
    const r = hostIntel(withDomain('attendance', [obs('e1', 42, 36)]), ASOF).get('attendance');
    expect(r.n).toBe(1);
    expect(r.confidence).toBe(CONFIDENCE.LOW);
    expect(r.stability).toBe(STABILITY.NONE);
    expect(r.applicable).toBe(false);
    expect(r.ratio).toBeCloseTo(36 / 42, 5); // explainability: the fact is preserved
  });
  test('3 observations ⇒ Medium; 5 ⇒ High', () => {
    const three = [obs('a', 40, 34), obs('b', 40, 35), obs('c', 40, 33)];
    expect(hostIntel(withDomain('attendance', three), ASOF).get('attendance').confidence).toBe(CONFIDENCE.MEDIUM);
    const five = [...three, obs('d', 40, 34), obs('e', 40, 35)];
    expect(hostIntel(withDomain('attendance', five), ASOF).get('attendance').confidence).toBe(CONFIDENCE.HIGH);
  });
  test('domains mature INDEPENDENTLY — attendance High while ice absent (None)', () => {
    const p = { hostIntelligence: { version: 1, eventsObserved: 5, domains: {
      attendance: { observations: [obs('a',40,34),obs('b',40,35),obs('c',40,33),obs('d',40,34),obs('e',40,35)] },
    } } };
    const h = hostIntel(p, ASOF);
    expect(h.get('attendance').confidence).toBe(CONFIDENCE.HIGH);
    expect(h.get('weather').confidence).toBe(CONFIDENCE.NONE); // ice never observed
  });
});

describe('hostIntel — staleness (recency gate on confidence)', () => {
  test('observations older than ~18mo stop counting toward confidence', () => {
    // 5 total, but 4 are 20 months old ⇒ freshN = 1 ⇒ Low (not High)
    const stale = [obs('a',40,34,20), obs('b',40,35,20), obs('c',40,33,20), obs('d',40,34,20), obs('e',40,35,0)];
    const r = hostIntel(withDomain('attendance', stale), ASOF).get('attendance');
    expect(r.n).toBe(5);
    expect(r.freshN).toBe(1);
    expect(r.confidence).toBe(CONFIDENCE.LOW);
  });
});

describe('hostIntel — stability (consistency gate, independent of confidence)', () => {
  test('UNSTABLE ratios ⇒ Low stability ⇒ NOT applicable even at High confidence', () => {
    // 80/125/72/118/99% — mean ~99%, High confidence, but volatile
    const unstable = [obs('a',100,80), obs('b',100,125), obs('c',100,72), obs('d',100,118), obs('e',100,99)];
    const r = hostIntel(withDomain('attendance', unstable), ASOF).get('attendance');
    expect(r.confidence).toBe(CONFIDENCE.HIGH);
    expect(r.stability).toBe(STABILITY.LOW);
    expect(r.applicable).toBe(false); // high conf + low stability ⇒ keep asking
  });
  test('STABLE ratios at Medium+ confidence ⇒ applicable', () => {
    const stable = [obs('a',100,85), obs('b',100,84), obs('c',100,86), obs('d',100,85)];
    const r = hostIntel(withDomain('attendance', stable), ASOF).get('attendance');
    expect(r.confidence).toBe(CONFIDENCE.MEDIUM);
    expect(r.stability).toBe(STABILITY.HIGH);
    expect(r.applicable).toBe(true);
  });
});

describe('hostIntel — food items keyed + named-list domains', () => {
  test('getFood reads a per-item rollup; unknown item ⇒ honest-empty', () => {
    const p = { hostIntelligence: { version: 1, eventsObserved: 3, domains: { food: { items: {
      brisket: { observations: [obs('a',18,15), obs('b',18,16), obs('c',18,15)] },
    } } } } };
    const h = hostIntel(p, ASOF);
    expect(h.getFood('brisket').confidence).toBe(CONFIDENCE.MEDIUM);
    expect(h.getFood('unknown').n).toBe(0);
  });
  test('list() reads named-list domains (shopping.stores)', () => {
    const p = { hostIntelligence: { version: 1, eventsObserved: 2, domains: { shopping: { stores: ['Costco', 'Butcher'] } } } };
    expect(hostIntel(p, ASOF).list('shopping', 'stores')).toEqual(['Costco', 'Butcher']);
    expect(hostIntel({}, ASOF).list('shopping', 'stores')).toEqual([]);
  });
});

describe('append helpers — pure, immutable, dedupe, cap, NO PII', () => {
  test('appendObservation returns a NEW object and does not mutate input', () => {
    const before = emptyHostIntelligence();
    const after = appendObservation(before, 'attendance', obs('e1', 42, 36));
    expect(after).not.toBe(before);
    expect(before.domains.attendance).toBeUndefined();      // input untouched
    expect(after.domains.attendance.observations).toHaveLength(1);
  });
  test('stores ONLY {eventId,date,estimate,actual} — extra/PII fields stripped', () => {
    const after = appendObservation(emptyHostIntelligence(), 'attendance',
      { eventId: 'e1', date: '2026-07-01', estimate: 42, actual: 36, guestName: 'Ada Lovelace', address: '10 Downing' });
    const stored = after.domains.attendance.observations[0];
    expect(Object.keys(stored).sort()).toEqual(['actual', 'date', 'estimate', 'eventId']);
    expect(JSON.stringify(after)).not.toMatch(/Ada Lovelace|Downing/); // no PII anywhere
  });
  test('dedupes by eventId (re-reconciling an event edits, never double-counts)', () => {
    let hi = appendObservation(emptyHostIntelligence(), 'attendance', obs('e1', 42, 36));
    hi = appendObservation(hi, 'attendance', obs('e1', 42, 40)); // same event, corrected
    expect(hi.domains.attendance.observations).toHaveLength(1);
    expect(hi.domains.attendance.observations[0].actual).toBe(40);
  });
  test('caps at the last 8 observations', () => {
    let hi = emptyHostIntelligence();
    for (let i = 0; i < 12; i++) hi = appendObservation(hi, 'attendance', obs('e' + i, 40, 34));
    expect(hi.domains.attendance.observations).toHaveLength(8);
    expect(hi.domains.attendance.observations[7].eventId).toBe('e11');
  });
  test('appendFoodObservation + markEventObserved', () => {
    let hi = appendFoodObservation(emptyHostIntelligence(), 'brisket', obs('a', 18, 15));
    expect(hi.domains.food.items.brisket.observations).toHaveLength(1);
    hi = markEventObserved(hi);
    expect(hi.eventsObserved).toBe(1);
  });
});

describe('delete at the data level (privacy)', () => {
  test('clearDomain removes one domain; clearAll returns empty', () => {
    const hi = appendObservation(appendObservation(emptyHostIntelligence(), 'attendance', obs('a',40,34)), 'weather', obs('b',20,28));
    const cleared = clearDomain(hi, 'attendance');
    expect(cleared.domains.attendance).toBeUndefined();
    expect(cleared.domains.weather).toBeDefined();
    expect(clearAllHostIntelligence()).toEqual(emptyHostIntelligence());
  });
});
