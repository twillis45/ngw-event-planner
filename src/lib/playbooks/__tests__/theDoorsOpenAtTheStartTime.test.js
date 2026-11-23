// ─── THE DOORS OPEN AT THE START TIME (audit 2 lane D, D-15, 11/22/2026) ─────
//
// Date & time and the invite say guests arrive at 1:00 PM; the run of show's
// arrival beat said 1:05 PM, because 30-odd playbooks authored their "Doors:"
// (or "Gather", "Gate opens", "Family arrives", "Registration table opens")
// beat at 'T0 +5m'. The start time IS when guests arrive, so the beat that
// greets them sits at T0. Beats that follow arrival (grace, a ceremony
// starting, a call to order) are untouched.
import { ALL_PLAYBOOKS } from '../index';

const ARRIVAL = /^(Doors\b|Gather:|Gate opens|Arrivals\b|Family arrives|Greet at the door|Registration table opens|Everyone gathers at the meeting point)/;
// Multi-day buckets ("Day 1 afternoon") are not offsets from the start time
// and are left out.
const rows = (pb) => {
  const r = pb.schedules || {};
  return Object.values(r).filter(Array.isArray).flat().filter((x) => x && typeof x.what === 'string');
};

test('premise: arrival beats exist across the corpus', () => {
  const n = ALL_PLAYBOOKS.reduce((s, pb) => s + rows(pb).filter((x) => ARRIVAL.test(x.what)).length, 0);
  expect(n).toBeGreaterThanOrEqual(30);
});

// Team Retreat keeps 'T0 +5m': its 'T0 last day' wrap-up row resolves to the
// start time on a one-day retreat, so arrivals at T0 would collide with it
// (dayModelAudit). It is not a host-pickable type; the wrap-up row is the bug
// to fix there, not the arrival beat.
const KEEPS_ITS_OFFSET = new Set(['Team Retreat']);

test('every arrival beat is at the start time, not five minutes after it', () => {
  const late = [];
  for (const pb of ALL_PLAYBOOKS) {
    if (KEEPS_ITS_OFFSET.has(pb.type)) continue;
    for (const x of rows(pb)) if (ARRIVAL.test(x.what) && /^T0\b/.test(String(x.when)) && String(x.when).trim() !== 'T0') late.push(`${pb.type}: ${x.when} ${x.what.slice(0, 40)}`);
  }
  expect(late).toEqual([]);
});
