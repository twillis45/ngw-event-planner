// INTEL-1 P1 — the inert Host Intelligence store + hostIntel() reader.
// Acceptance: absent ⇒ honest-empty; malformed ⇒ no throw; single/multiple/stale/unstable
// observations rolled up with domain confidence + stability + explainability; no PII stored;
// inspectable/deletable at the data level. NOTHING here asserts a plan/estimate change — P1 is inert.
import {
  hostIntel, emptyHostIntelligence, appendObservation, appendFoodObservation,
  markEventObserved, clearDomain, clearAllHostIntelligence, CONFIDENCE, STABILITY,
  applyReconciliation, isReconciled,
  summarizeHostIntel, clearMemoryDomain, clearAllMemory,
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

describe('P2 — applyReconciliation (Reality Reconciliation write)', () => {
  const D = '2026-07-01';
  const full = (eventId) => ({
    eventId, date: D,
    attendance: { planned: 42, actual: 36 },
    food: [{ itemId: 'brisket', planned: 18, consumedRatio: 0.85 }, { itemId: 'oldbay', planned: 2, consumedRatio: 0.65 }],
    budget: { estimate: 850, ratio: 1.2 },
    ice: { ratio: 1.4 },
    lesson: 'Order more ice next time',
  });

  test('attendance write — stores estimate/actual on the attendance domain', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), { eventId: 'e1', date: D, attendance: { planned: 42, actual: 36 } });
    const o = hi.domains.attendance.observations[0];
    expect(o).toMatchObject({ eventId: 'e1', estimate: 42, actual: 36 });
    expect(hi.eventsObserved).toBe(1);
  });
  test('food write — one observation per item, keyed by itemId', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), full('e1'));
    expect(hi.domains.food.items.brisket.observations[0]).toMatchObject({ estimate: 18, actual: 18 * 0.85 });
    expect(hi.domains.food.items.oldbay.observations[0].actual).toBeCloseTo(2 * 0.65, 5);
  });
  test('spend write — budget domain records estimate × ratio', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), { eventId: 'e1', date: D, budget: { estimate: 850, ratio: 1.2 } });
    expect(hi.domains.budget.observations[0]).toMatchObject({ estimate: 850, actual: 850 * 1.2 });
  });
  test('ice write — weather domain records the ratio (estimate 1)', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), { eventId: 'e1', date: D, ice: { ratio: 1.4 } });
    expect(hi.domains.weather.observations[0]).toMatchObject({ estimate: 1, actual: 1.4 });
  });
  test('lesson write — host note on lessons[], no numeric observation', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), { eventId: 'e1', date: D, lesson: '  Start prep earlier  ' });
    expect(hi.lessons).toEqual([{ eventId: 'e1', date: D, text: 'Start prep earlier' }]);
    expect(hi.eventsObserved).toBe(1); // a lesson alone counts as a reconciliation
  });

  test('SKIP — all fields empty writes nothing (store unchanged, not reconciled)', () => {
    const before = emptyHostIntelligence();
    const after = applyReconciliation(before, { eventId: 'e1', date: D, attendance: null, food: null, budget: null, ice: null, lesson: '' });
    expect(after).toBe(before); // unchanged reference — nothing written
    expect(isReconciled({ hostIntelligence: after }, 'e1')).toBe(false);
    // partial skip: only attendance answered ⇒ only attendance written, no fake food/budget
    const partial = applyReconciliation(emptyHostIntelligence(), { eventId: 'e1', date: D, attendance: { planned: 40, actual: 38 } });
    expect(partial.domains.food).toBeUndefined();
    expect(partial.domains.budget).toBeUndefined();
  });
  test('IDEMPOTENCY — re-running the same eventId edits, never duplicates', () => {
    let hi = applyReconciliation(emptyHostIntelligence(), full('e1'));
    hi = applyReconciliation(hi, { ...full('e1'), attendance: { planned: 42, actual: 40 } }); // corrected
    expect(hi.domains.attendance.observations).toHaveLength(1);   // not 2
    expect(hi.domains.attendance.observations[0].actual).toBe(40); // corrected value
    expect(hi.domains.food.items.brisket.observations).toHaveLength(1);
    expect(hi.lessons).toHaveLength(1);
    expect(hi.eventsObserved).toBe(1);                            // still one reconciled event
    // a DIFFERENT event increments
    hi = applyReconciliation(hi, full('e2'));
    expect(hi.eventsObserved).toBe(2);
  });
  test('MALFORMED profile input — builds from empty, never throws; no eventId ⇒ no-op', () => {
    for (const bad of [null, undefined, 'garbage', { domains: 'nope' }, 42]) {
      expect(() => applyReconciliation(bad, full('e1'))).not.toThrow();
    }
    expect(applyReconciliation('garbage', full('e1')).domains.attendance.observations).toHaveLength(1);
    const noId = applyReconciliation(emptyHostIntelligence(), { attendance: { planned: 40, actual: 38 } });
    expect(noId.eventsObserved).toBe(0); // no event key ⇒ nothing written
  });
  test('NO guest PII — the whole reconciled store serializes without any PII', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), { ...full('e1'), lesson: 'went great' });
    const s = JSON.stringify(hi);
    // observations carry only eventId/date/estimate/actual; food keyed by item id; no guest fields
    for (const o of hi.domains.attendance.observations) expect(Object.keys(o).sort()).toEqual(['actual', 'date', 'estimate', 'eventId']);
    expect(s).not.toMatch(/name|address|email|phone|guest/i);
  });
  test('isReconciled reflects the reconciled marker', () => {
    const hi = applyReconciliation(emptyHostIntelligence(), full('e1'));
    expect(isReconciled({ hostIntelligence: hi }, 'e1')).toBe(true);
    expect(isReconciled({ hostIntelligence: hi }, 'e2')).toBe(false);
    expect(isReconciled(null, 'e1')).toBe(false);
  });
});

describe('P3 — summarizeHostIntel + clear (Settings "What Event Boss remembers")', () => {
  // A host profile with UNRELATED keys + a populated, stable, Medium-confidence memory.
  const populated = () => {
    let hi = emptyHostIntelligence();
    for (const [i, d] of [['e1', '2026-06-01'], ['e2', '2026-06-08'], ['e3', '2026-06-15']].entries()) {
      hi = applyReconciliation(hi, {
        eventId: d[0], date: d[1],
        attendance: { planned: 40, actual: 34 - i }, // 34/35/33 → ~14% fewer, stable
        food: [{ itemId: 'brisket', planned: 18, consumedRatio: 0.85 }, { itemId: 'old_bay', planned: 2, consumedRatio: 0.65 }],
        budget: { estimate: 800, ratio: 1.2 },
        ice: { ratio: 1.4 },
        lesson: i === 0 ? 'order crabs a day earlier' : null,
      });
    }
    return { name: 'Maya Carter', accountType: 'host', savedVendors: [{ id: 'v1' }], hostIntelligence: hi };
  };

  test('EMPTY memory ⇒ honest-empty (present:false, no groups)', () => {
    for (const p of [{}, { hostIntelligence: emptyHostIntelligence() }, { hostIntelligence: { version: 1, eventsObserved: 0, domains: {} } }]) {
      const s = summarizeHostIntel(p, ASOF);
      expect(s.present).toBe(false);
      expect(s.groups).toEqual([]);
    }
  });

  test('POPULATED ⇒ attendance/food/spend/ice/lesson facts in plain language, NO guest PII', () => {
    const s = summarizeHostIntel(populated(), ASOF);
    expect(s.present).toBe(true);
    const byDomain = Object.fromEntries(s.groups.map((g) => [g.domain, g]));
    expect(byDomain.attendance.lines[0]).toMatch(/fewer guests show up than you plan/i);
    expect(byDomain.food.lines.join(' ')).toMatch(/Brisket.*left over/i);
    expect(byDomain.food.lines.join(' ')).toMatch(/Old Bay/); // itemId humanized, not a raw slug
    expect(byDomain.budget.lines[0]).toMatch(/over your plan/i);
    expect(byDomain.weather.lines[0]).toMatch(/need about \d+% more/i);
    expect(byDomain.lessons.lines[0]).toMatch(/order crabs a day earlier/);
    expect(byDomain.attendance.note).toMatch(/Getting a feel|Confident|learning/);
    // NO guest PII and no profile identity leaks into the summary
    const blob = JSON.stringify(s);
    expect(blob).not.toMatch(/Maya|Carter|address|email|phone/i);
  });

  test('MALFORMED memory ⇒ no throw, honest-empty', () => {
    for (const p of [null, undefined, 'garbage', { hostIntelligence: 'x' }, { hostIntelligence: { domains: 'nope' } }]) {
      expect(() => summarizeHostIntel(p, ASOF)).not.toThrow();
      expect(summarizeHostIntel(p, ASOF).present).toBe(false);
    }
  });

  test('CLEAR DOMAIN removes just that domain; unrelated profile data untouched', () => {
    const before = populated();
    const after = clearMemoryDomain(before, 'attendance');
    expect(after.hostIntelligence.domains.attendance).toBeUndefined();
    expect(after.hostIntelligence.domains.budget).toBeDefined();       // siblings kept
    expect(after.hostIntelligence.domains.food).toBeDefined();
    expect(after.name).toBe('Maya Carter');                            // unrelated profile intact
    expect(after.savedVendors).toEqual([{ id: 'v1' }]);
    expect(before.hostIntelligence.domains.attendance).toBeDefined();  // input not mutated
    // lessons is a domain too
    const noLessons = clearMemoryDomain(before, 'lessons');
    expect(noLessons.hostIntelligence.lessons).toBeUndefined();
    expect(noLessons.hostIntelligence.domains.food).toBeDefined();
  });

  test('CLEAR ALL resets memory only; the rest of the profile survives', () => {
    const after = clearAllMemory(populated());
    expect(after.hostIntelligence).toEqual(emptyHostIntelligence());
    expect(summarizeHostIntel(after, ASOF).present).toBe(false);
    expect(after.name).toBe('Maya Carter');                            // no accidental deletion
    expect(after.accountType).toBe('host');
    expect(after.savedVendors).toEqual([{ id: 'v1' }]);
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
