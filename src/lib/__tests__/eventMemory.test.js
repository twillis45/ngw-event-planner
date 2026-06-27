// Sprint 58G — Event Memory v1. Proves: a pure reader aggregates the ALREADY-captured
// vendor outcomes + reasons across events into a private per-vendor track record;
// counts only USED (confirmed) vendors; excludes the current event; lesson capture.

import { vendorKey, vendorMemoryFor, summarizeVendorMemory, setLesson, getLesson } from '../eventMemory';

// Two past events that both used "Bloom & Stem": one on-time (chosen for response),
// one late. Plus a current event where it's only being considered.
const e1 = {
  id: 'e1',
  vendors: [{ id: 'a', name: 'Bloom & Stem', category: 'Florals', status: 'Confirmed' }],
  outcomes: { vendors: { a: 'on_time' } },
  decisionMemory: [{ decisionType: 'vendor_selection', subjectId: 'a', subjectLabel: 'Bloom & Stem', rationale: 'fast response', outcome: null }],
};
const e2 = {
  id: 'e2',
  vendors: [{ id: 'b', name: 'bloom & stem', category: 'Florals', status: 'Booked' }],  // diff id, diff case
  outcomes: { vendors: { b: 'late' } },
  decisionMemory: [{ decisionType: 'vendor_selection', subjectId: 'b', subjectLabel: 'Bloom & Stem', rationale: 'price', outcome: null }],
};
const eCur = { id: 'cur', vendors: [{ id: 'c', name: 'Bloom & Stem', status: 'Considering' }] };

describe('58G vendorKey — cross-event identity (normalized name)', () => {
  test('case/space-insensitive', () => {
    expect(vendorKey('  Bloom &  Stem ')).toBe('bloom & stem');
    expect(vendorKey('Bloom & Stem')).toBe(vendorKey('bloom & stem'));
  });
});

describe('58G vendorMemoryFor — private aggregate across events', () => {
  test('aggregates outcomes + reasons; counts only USED (confirmed/booked)', () => {
    const m = vendorMemoryFor([e1, e2, eCur], 'Bloom & Stem');
    expect(m.timesUsed).toBe(2);            // e1 Confirmed + e2 Booked; eCur "Considering" not counted
    expect(m.on_time).toBe(1);
    expect(m.late).toBe(1);
    expect(m.rehired).toBe(true);
    expect(m.reasons).toEqual(['fast response', 'price']);
  });
  test('excludeEventId reads PAST history relative to the event being planned', () => {
    const m = vendorMemoryFor([e1, e2, eCur], 'Bloom & Stem', 'e2');
    expect(m.timesUsed).toBe(1);
    expect(m.on_time).toBe(1);
    expect(m.late).toBe(0);
  });
  test('a never-used vendor ⇒ null (no record to show)', () => {
    expect(vendorMemoryFor([eCur], 'Bloom & Stem')).toBeNull();   // only Considering
    expect(vendorMemoryFor([e1], 'Nobody')).toBeNull();
  });
});

describe('61B vendorMemoryFor — keyed on stable bankId, not name', () => {
  // Two PAST events using the SAME vendor (same bankId) but DIFFERENT display
  // names — a rename that the old name-key would have fragmented into two records.
  const b1 = {
    id: 'b1',
    vendors: [{ id: 'v1', bankId: 'pv-9', name: 'Bloom & Stem', category: 'Florals', status: 'Confirmed' }],
    outcomes: { vendors: { v1: 'on_time' } },
  };
  const b2 = {
    id: 'b2',
    vendors: [{ id: 'v2', bankId: 'pv-9', name: 'Bloom and Stem Co.', category: 'Florals', status: 'Booked' }],
    outcomes: { vendors: { v2: 'great' } },
  };

  test('same bankId, different names ⇒ one aggregated record (timesUsed === 2)', () => {
    const m = vendorMemoryFor([b1, b2], { bankId: 'pv-9', name: 'Bloom & Stem' });
    expect(m.timesUsed).toBe(2);
    expect(m.on_time).toBe(1);
    expect(m.great).toBe(1);
    expect(m.rehired).toBe(true);
  });

  test('different bankIds ⇒ distinct records (no cross-bleed)', () => {
    const other = { id: 'o1', vendors: [{ id: 'v3', bankId: 'pv-7', name: 'Bloom & Stem', category: 'Florals', status: 'Confirmed' }], outcomes: { vendors: { v3: 'late' } } };
    const m = vendorMemoryFor([b1, b2, other], { bankId: 'pv-9', name: 'Bloom & Stem' });
    expect(m.timesUsed).toBe(2);   // only the two pv-9 events, NOT the pv-7 one
    expect(m.late).toBe(0);
  });

  test('legacy name-fallback intact when no bankId on the lookup or events', () => {
    // Object signature with no bankId falls back to the normalized-name key.
    const m = vendorMemoryFor([e1, e2, eCur], { name: 'Bloom & Stem' });
    expect(m.timesUsed).toBe(2);
    expect(m.on_time).toBe(1);
    expect(m.late).toBe(1);
  });

  test('excludeEventId still works with the object signature', () => {
    const m = vendorMemoryFor([b1, b2], { bankId: 'pv-9', name: 'Bloom & Stem' }, 'b2');
    expect(m.timesUsed).toBe(1);
    expect(m.on_time).toBe(1);
    expect(m.great).toBe(0);
  });

  test('object signature still routes through the bare-name path for legacy events', () => {
    // A bankId lookup must NOT match legacy events that have no bankId field.
    const m = vendorMemoryFor([e1, e2], { bankId: 'pv-nonexistent', name: 'Bloom & Stem' });
    expect(m).toBeNull();   // bankId present ⇒ matches on bankId only; legacy events have none
  });
});

describe('58G summarizeVendorMemory — one private line, no public rating', () => {
  test('renders the compact track record', () => {
    const m = vendorMemoryFor([e1, e2], 'Bloom & Stem');
    expect(summarizeVendorMemory(m)).toBe('Used 2× · 1 on-time, 1 late · rehired');
  });
  test('empty/null ⇒ empty string', () => { expect(summarizeVendorMemory(null)).toBe(''); });
});

describe('58G Event Lesson Memory', () => {
  test('setLesson stores one short string immutably; getLesson reads it', () => {
    const ev = { id: 'x' };
    const next = setLesson(ev, '  Parking filled early.  ');
    expect(next).not.toBe(ev);
    expect(ev.lessons).toBeUndefined();
    expect(getLesson(next)).toBe('Parking filled early.');
  });
  test('caps length; getLesson safe on missing', () => {
    expect(getLesson({})).toBe('');
    expect(setLesson({}, 'x'.repeat(500)).lessons.length).toBe(200);
  });
});
