// ─── WHAT RUNS ALL THROUGH THE DAY (host directive 2026-07-28) ───────────────
// "the checklists and full agenda seem woefully inadequate on details of the
// day's responsibility to make sure nothing is forgotten or missed throughout
// the event."
//
// The playbooks had ALREADY authored this — 30 rows, one per event type, as
// `when: 'during'`. rosWhenOffset rightly returns null for them (a continuous
// responsibility is not a point in time) and the run-of-show builder then
// skipped them, so every single one was discarded before it could reach a host.
// Several are safety rows.
const { playbookDuringCues, playbookRunOfShow, ALL_PLAYBOOKS } = require('../playbooks');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
const ev = (type, extra) => ({ id: 'd', type, date: iso(0), guestCount: 24, ...extra });

describe('continuous responsibilities reach the host', () => {
  test('the safety rows that were being dropped now come back', () => {
    const fry = playbookDuringCues(ev('Fish Fry')).map((c) => c.segment).join(' | ');
    expect(fry).toMatch(/fryer attended at all times/i);
    const boil = playbookDuringCues(ev('Low Country Boil')).map((c) => c.segment).join(' | ');
    expect(boil).toMatch(/burner attended at all times/i);
  });

  test('most event types author at least one, and none is blank', () => {
    let withCues = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      const cues = playbookDuringCues(ev(type));
      expect(Array.isArray(cues)).toBe(true);
      for (const c of cues) {
        expect(String(c.segment || '').trim().length).toBeGreaterThan(3);
        expect(c.id).toMatch(/^pb-during-/);
      }
      if (cues.length) withCues += 1;
    }
    expect(withCues).toBeGreaterThanOrEqual(25);
  });

  test('they carry NO clock — a continuous duty is not a point in time', () => {
    for (const c of playbookDuringCues(ev('Reunion'))) {
      expect(c.time).toBeUndefined();
      expect(c.rel).toBeUndefined();
    }
  });

  test('they never leak into the timed spine (no double-counting)', () => {
    const timed = playbookRunOfShow(ev('Fish Fry')) || [];
    expect(timed.some((r) => /attended at all times/i.test(r.segment || ''))).toBe(false);
  });

  test('an unknown type degrades to empty, never throws', () => {
    expect(playbookDuringCues(ev('Not A Real Type'))).toEqual([]);
    expect(playbookDuringCues(null)).toEqual([]);
  });
});
