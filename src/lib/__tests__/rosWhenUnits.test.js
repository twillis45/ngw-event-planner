// ─── THE UNIT SUFFIX IS DATA (day-board audit 2026-07-28) ────────────────────
//
// Found while diffing the runtime day board against Figma 524:60: an event
// happening TODAY told the host its first setup cue was "~120h before guests
// arrive" — five days before a party that is today.
//
// rosWhenOffset's pattern was /^T0\s*([+-])\s*(\d+)(?::(\d+))?\s*h?/ — the
// trailing `h?` was optional AND never inspected, so the unit a playbook author
// wrote was thrown away and everything was multiplied by 60. Every authored
// MINUTE cue was silently promoted to hours across six playbooks:
//   reunion   T0-120m / -90m / -60m / -30m  (the entire setup block)
//   sweet16   T0-30m        boardMeeting  T0 -30m
//   engagementParty T0 -10m  genderReveal T0 -15m  retirementParty T0 -10m/-30m
// A decimal hour lost its remainder the same way: 'T0+4.5h' parsed as 4h flat.
//
// This is the same class as the 'T0 +5d' defect fixed earlier in the day: a
// token vocabulary that the parser only half understood. The gate below pins
// every form the playbooks actually author.
const { rosWhenOffset } = require('../playbooks');

describe('rosWhenOffset honours the unit the author wrote', () => {
  test('minutes mean minutes', () => {
    expect(rosWhenOffset('T0-120m')).toBe(-120);   // was -7200 (120 hours)
    expect(rosWhenOffset('T0-90m')).toBe(-90);
    expect(rosWhenOffset('T0-60m')).toBe(-60);
    expect(rosWhenOffset('T0-30m')).toBe(-30);
    expect(rosWhenOffset('T0 -15m')).toBe(-15);
    expect(rosWhenOffset('T0 -10m')).toBe(-10);
    expect(rosWhenOffset('T0+45m')).toBe(45);
  });

  test('hours still mean hours, bare or suffixed', () => {
    expect(rosWhenOffset('T0-2h')).toBe(-120);
    expect(rosWhenOffset('T0+4h')).toBe(240);
    expect(rosWhenOffset('T0 -1')).toBe(-60);      // bare number = hours (legacy)
  });

  test('a fractional hour keeps its remainder', () => {
    expect(rosWhenOffset('T0+4.5h')).toBe(270);    // was 240 — the half hour vanished
    expect(rosWhenOffset('T0 +4.5h')).toBe(270);
    expect(rosWhenOffset('T0-1.5h')).toBe(-90);
  });

  test('H:MM spells out both parts', () => {
    expect(rosWhenOffset('T0-1:30')).toBe(-90);
    expect(rosWhenOffset('T0+2:15')).toBe(135);
  });

  test('the anchor and the non-day-of tokens are unchanged', () => {
    expect(rosWhenOffset('T0')).toBe(0);
    expect(rosWhenOffset('guests arrive')).toBe(0);
    expect(rosWhenOffset('T-3d')).toBe(null);      // pre-day prep
    expect(rosWhenOffset('T0 +5d')).toBe(null);    // post-event follow-up
    expect(rosWhenOffset('during')).toBe(null);
    expect(rosWhenOffset('')).toBe(null);
  });

  test('no authored day-of cue lands more than a day from the anchor', () => {
    // The defect class stated as an invariant: a DAY-OF cue is by definition
    // within a day of the anchor. 120h would have failed this loudly.
    const { ALL_PLAYBOOKS } = require('../playbooks');
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const scheds = (pb && pb.schedules) || {};
      for (const key of Object.keys(scheds)) {
        for (const entry of (Array.isArray(scheds[key]) ? scheds[key] : [])) {
          const off = rosWhenOffset(entry && entry.when);
          if (off === null) continue;
          if (Math.abs(off) > 24 * 60) bad.push(`${pb.label || pb.id} :: "${entry.when}" → ${off} min`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

// ─── EVERY AUTHORED CUE HAS A NAME ───────────────────────────────────────────
// Same audit: the day hero read "This moment." on a Reunion because the reader
// only ever looked at `entry.what`, and reunion.js authors all 14 of its rows as
// `do:`. Nameless cues also emptied the UP NEXT block — a header over nothing.
describe('no playbook can author a nameless day-of cue', () => {
  const { ALL_PLAYBOOKS, playbookRunOfShow } = require('../playbooks');
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };

  test('every schedule entry carries text under one spelling or the other', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const scheds = (pb && pb.schedules) || {};
      for (const key of Object.keys(scheds)) {
        for (const entry of (Array.isArray(scheds[key]) ? scheds[key] : [])) {
          const text = entry && (entry.what != null ? entry.what : entry.do);
          if (!String(text || '').trim()) bad.push(`${pb.label || pb.id} :: ${key} :: ${JSON.stringify(entry && entry.when)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('the built run of show names every row — no blank segments', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      let ros = [];
      try { ros = playbookRunOfShow({ id: 'n', type, date: iso(0), guestCount: 24 }) || []; } catch { continue; }
      for (const r of ros) {
        if (!String((r && r.segment) || '').trim()) bad.push(`${type} :: ${JSON.stringify(r && r.id)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('the Reunion day board names its first cue (the "This moment." regression)', () => {
    const ros = playbookRunOfShow({ id: 'n', type: 'Reunion', date: iso(0), guestCount: 24 }) || [];
    expect(ros.length).toBeGreaterThan(0);
    expect(ros[0].segment).toMatch(/\S/);
    expect(ros[0].segment).not.toMatch(/^This moment/);
    // and the whole board is named, not just the first row
    expect(ros.every((r) => String(r.segment || '').trim())).toBe(true);
  });
});
