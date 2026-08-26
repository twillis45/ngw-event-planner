// ─── THE DAY MODEL, SWEPT (host directive 2026-07-28: "do a thorough audit") ──
//
// The day board was rebuilt this session: `program` became a first-class
// schedule key, every playbook got 6-9 authored beats and a morning block, the
// continuous duties were surfaced, and three separate token-parsing defects were
// fixed (T0+Nd, T0-Nm, and the prose T0 vocabulary). This sweeps the result on
// every dimension that can silently rot, across all 39 playbooks at once.
//
// Each expectation below was AT ZERO when written. They are ratchets.
const { ALL_PLAYBOOKS, playbookRunOfShow, playbookDuringCues, rosWhenOffset } = require('../playbooks');
const { rosOverlapCount } = require('../rosOverlap');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
const ev = (type) => ({ id: 'audit', type, date: iso(0), guestCount: 24, startTime: '15:00' });
const typesOf = () => ALL_PLAYBOOKS.map((pb) => pb.label || pb.type || pb.id);

const offsetsFor = (pb) => {
  const out = [];
  for (const k of ['cooking', 'preparation', 'setup', 'program', 'cleanup', 'purchasing']) {
    for (const e of ((pb.schedules && pb.schedules[k]) || [])) {
      const o = rosWhenOffset(e && e.when);
      if (o != null) out.push(o);
    }
  }
  return out.sort((a, b) => a - b);
};

describe('every playbook covers a whole day', () => {
  test('a program of at least six beats', () => {
    const bad = ALL_PLAYBOOKS
      .filter((pb) => (((pb.schedules && pb.schedules.program) || []).length < 6))
      .map((pb) => `${pb.label || pb.id}: ${((pb.schedules && pb.schedules.program) || []).length}`);
    expect(bad).toEqual([]);
  });

  test('a continuous duty that runs all day', () => {
    const bad = typesOf().filter((t) => !playbookDuringCues(ev(t)).length);
    expect(bad).toEqual([]);
  });

  test('a morning — same-day work starts at least three hours before doors', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const offs = offsetsFor(pb);
      if (!offs.length) { bad.push(`${pb.label || pb.id}: no same-day work at all`); continue; }
      if (offs[0] > -180) bad.push(`${pb.label || pb.id}: starts ${(offs[0] / 60).toFixed(1)}h out`);
    }
    expect(bad).toEqual([]);
  });
});

describe('the built day is coherent', () => {
  test('no two moments land on the same minute', () => {
    // The board flags equal starts as an overlap, so a stacked minute makes it
    // cry wolf about a day that is actually fine. 31 of 39 failed this the first
    // time it ran — the authored beats had landed on top of existing rows.
    const bad = typesOf().filter((t) => rosOverlapCount(playbookRunOfShow(ev(t)) || []) > 0);
    expect(bad).toEqual([]);
  });

  test('rows come out in ascending time order', () => {
    const bad = [];
    for (const t of typesOf()) {
      const mins = (playbookRunOfShow(ev(t)) || []).map((r) => r._min).filter((m) => m != null);
      if (mins.some((m, i) => i && m < mins[i - 1])) bad.push(t);
    }
    expect(bad).toEqual([]);
  });

  test('no blank and no duplicated moment text', () => {
    const blank = [], dupe = [];
    for (const t of typesOf()) {
      const segs = (playbookRunOfShow(ev(t)) || []).map((r) => String((r && r.segment) || '').trim());
      if (segs.some((x) => !x)) blank.push(t);
      const seen = new Set();
      for (const x of segs) { if (seen.has(x)) dupe.push(`${t}: "${x.slice(0, 40)}"`); seen.add(x); }
    }
    expect(blank).toEqual([]);
    expect(dupe).toEqual([]);
  });

  test('no cue strands itself half a day past the event', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const offs = offsetsFor(pb);
      if (offs.length && offs[offs.length - 1] > 12 * 60) bad.push(`${pb.label || pb.id}: +${(offs[offs.length - 1] / 60).toFixed(1)}h`);
    }
    expect(bad).toEqual([]);
  });

  test('no dead air — nothing leaves the host with a multi-hour hole', () => {
    // The first audit flagged three of these and I was ready to call them
    // legitimate (a wedding's hair-and-makeup block, two wind-downs). The host's
    // ruling: fill them. A host standing in a room at hour four does not care
    // that the gap was defensible — they care that the board went quiet on them.
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const offs = offsetsFor(pb);
      for (let i = 1; i < offs.length; i += 1) {
        const gap = offs[i] - offs[i - 1];
        if (gap > 150) bad.push(`${pb.label || pb.id}: ${(gap / 60).toFixed(1)}h of nothing at ${(offs[i - 1] / 60).toFixed(1)}h`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('the day is substantial — the board is not three rows and a shrug', () => {
    const thin = typesOf().filter((t) => (playbookRunOfShow(ev(t)) || []).length < 8);
    expect(thin).toEqual([]);
  });
});
