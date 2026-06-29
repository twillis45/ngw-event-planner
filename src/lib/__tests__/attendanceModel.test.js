import { attendanceClass, attendanceShift, expectedFromPlanned, ATTENDANCE_SOURCES } from '../attendanceModel';

describe('attendanceModel — researched headcount shift', () => {
  test('classifies event types by formality', () => {
    expect(attendanceClass('Wedding')).toBe('formal');
    expect(attendanceClass('Conference')).toBe('formal');
    expect(attendanceClass('The Cookout')).toBe('casual_open');
    expect(attendanceClass('Backyard BBQ')).toBe('casual_open');
    expect(attendanceClass('Juneteenth Cookout')).toBe('casual_open');
    expect(attendanceClass('Dinner Party')).toBe('rsvp_social');
    expect(attendanceClass('Baby Shower')).toBe('rsvp_social');
    expect(attendanceClass('Some Unknown Thing')).toBe('rsvp_social'); // sensible default
  });

  test('a playbook can override its class / factors via meta', () => {
    expect(attendanceClass('Whatever', { meta: { attendanceClass: 'community_free' } })).toBe('community_free');
    const sh = attendanceShift('Whatever', { meta: { attendanceFactors: { low: 0.5, high: 1.5 } } });
    expect(sh.low).toBe(0.5);
    expect(sh.high).toBe(1.5);
  });

  test('formal events run tight (slight down, no walk-ins)', () => {
    const sh = attendanceShift('Wedding');
    expect(sh.low).toBeGreaterThanOrEqual(0.88);
    expect(sh.high).toBeLessThanOrEqual(1.0);
  });

  test('casual open-door events swing both ways', () => {
    const sh = attendanceShift('The Cookout');
    expect(sh.low).toBeLessThan(0.85);   // real no-show floor
    expect(sh.high).toBeGreaterThan(1.0); // plus-ones / walk-ins
  });

  test('expectedFromPlanned returns a band around the planned number, sized to the high', () => {
    const e = expectedFromPlanned(40, 'The Cookout');
    expect(e.planned).toBe(40);
    expect(e.low).toBeLessThan(40);
    expect(e.high).toBeGreaterThan(40);
    expect(e.planning).toBe(e.high);
    expect(typeof e.note).toBe('string');
  });

  test('a formal 100-person plan lands at or below 100 (no walk-ins)', () => {
    const e = expectedFromPlanned(100, 'Wedding');
    expect(e.high).toBeLessThanOrEqual(100);
    expect(e.low).toBeLessThan(100);
  });

  test('non-positive count → null', () => {
    expect(expectedFromPlanned(0, 'The Cookout')).toBeNull();
    expect(expectedFromPlanned(-5, 'Wedding')).toBeNull();
  });

  test('ships its citations (grounded, not invented)', () => {
    expect(Array.isArray(ATTENDANCE_SOURCES)).toBe(true);
    expect(ATTENDANCE_SOURCES.length).toBeGreaterThanOrEqual(3);
    ATTENDANCE_SOURCES.forEach((s) => expect(s.url).toMatch(/^https?:\/\//));
  });
});
