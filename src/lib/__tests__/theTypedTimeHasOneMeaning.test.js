// ─── THE TYPED TIME HAS ONE MEANING (six root causes, cause 5) ───────────────
// P1-4: typed "3pm" → "dinner hits the table at 3 PM" in the decisions copy,
// arrivals 3:00 / dinner 4:00 on the day. Owner ruling 11/23/2026: for a
// meal-centered event the typed time is when dinner hits the table; arrivals
// precede it by the playbook's own lead. Every playbook declares its meaning;
// creation stamps it; the run of show, the invite and the decisions copy read
// it. Walks all 47 playbooks with a host-typed 3:00 PM.
const pbm = require('../playbooks');
const { timeAnchorOf, timeAnchorFields } = require('../eventAnchor');
const { eventClock, eventStartLabel, clockLabel12, parseStartMinutes } = require('../eventWhen');
const { rosWhenOffset } = require('../playbooks');
const { timePhrase } = require('../doItForMe');
const { decisionKnownPart, decisionSettledByData } = require('../playbooks');

const created = (pb, startTime = '3:00 PM') => {
  const ev = { id: 'ev-t', type: pb.type, name: 'T', date: '2027-11-25', startTime, startTimeSource: 'host', guestMode: 'count', guestCount: 14, guests: [], vendors: [], timeline: [] };
  return { ...ev, ...timeAnchorFields(ev) };
};
const rowAt = (ros, min) => (ros.rows || ros || []).find((r) => r && r.time && parseStartMinutes(r.time) === min);

describe('every playbook declares what the time she types means', () => {
  test('a declared meaning on each of the 47, and a serve cue in its own run of show for each meal', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const a = pb.timeAnchor;
      if (!a || !['serve', 'arrival'].includes(a.means)) { bad.push(`${pb.type}: no timeAnchor`); continue; }
      if (a.means === 'serve') {
        const cue = Object.values(pb.schedules || {}).flat().find((x) => x && x.when === a.serveAt);
        if (!cue) bad.push(`${pb.type}: serveAt ${a.serveAt} is not one of its cues`);
      }
    }
    expect(bad).toEqual([]);
    expect(pbm.ALL_PLAYBOOKS.length).toBe(47);
  });

  test('run of show, invite and drafts agree with the meaning, on every playbook', () => {
    const bad = [];
    for (const pb of pbm.ALL_PLAYBOOKS) {
      const ev = created(pb);
      const { means, leadMin } = timeAnchorOf(pb);
      const c = eventClock(ev);
      const arrive = means === 'serve' ? 15 * 60 - leadMin : 15 * 60;
      if (c.arrivalMin !== arrive) bad.push(`${pb.type}: clock arrival ${c.arrivalMin} ≠ ${arrive}`);
      const ros = pbm.playbookRunOfShow(ev);
      const rows = (ros && ros.rows) || ros || [];
      // The run of show is anchored at arrival: a cue authored at T0 sits at the arrival clock.
      const t0 = Object.values(pb.schedules || {}).flat().find((x) => x && rosWhenOffset(x.when) === 0);
      if (t0 && rows.length && !rowAt(rows, arrive)) bad.push(`${pb.type}: no run-of-show row at arrival ${clockLabel12(arrive)}`);
      const inv = eventStartLabel(ev);
      if (!inv || inv.label !== clockLabel12(arrive)) bad.push(`${pb.type}: invite says ${inv && inv.label}`);
      if (means === 'serve') {
        if (inv.serveLabel !== '3:00 PM') bad.push(`${pb.type}: invite dinner ${inv.serveLabel}`);
        if (!rowAt(rows, 15 * 60)) bad.push(`${pb.type}: the meal is not on the run of show at 3:00 PM`);
        if (!/3:00 PM/.test(timePhrase(ev)) || !/2:00 PM|2:30 PM/.test(timePhrase(ev))) bad.push(`${pb.type}: drafts say "${timePhrase(ev)}"`);
      } else if (inv.serveLabel) bad.push(`${pb.type}: an arrival event names a dinner time`);
    }
    expect(bad).toEqual([]);
  });

  test('Thanksgiving at "3pm": dinner 3:00 PM, arrivals 2:00 PM, and the serve-time call reads 3 PM', () => {
    const pb = pbm.ALL_PLAYBOOKS.find((p) => p.type === 'Thanksgiving Hosting');
    const ev = created(pb);
    const rows = (pbm.playbookRunOfShow(ev).rows) || pbm.playbookRunOfShow(ev);
    expect(rowAt(rows, 14 * 60).segment).toMatch(/Arrivals/i);
    expect(JSON.stringify(rowAt(rows, 15 * 60))).toMatch(/Dinner/);
    expect(eventStartLabel(ev)).toEqual({ kind: 'exact', label: '2:00 PM', serveLabel: '3:00 PM' });
    const d = pb.decisions.find((x) => x.id === 'serve_time');
    const st = decisionSettledByData(ev, d) || decisionKnownPart(ev, d);
    expect(JSON.stringify(st)).toMatch(/3 PM/);
  });

  test('our own default start stays the arrival on a meal event; a time she gave is never moved', () => {
    const pb = pbm.ALL_PLAYBOOKS.find((p) => p.type === 'Thanksgiving Hosting');
    expect(timeAnchorFields({ type: pb.type, startTime: '14:00', startTimeSource: 'derived' }, { defaultApplied: true }).startTime).toBe('15:00');
    expect(timeAnchorFields({ type: pb.type, startTime: '3:00 PM', startTimeSource: 'host' }).startTime).toBeUndefined();
    // An event made before the ruling keeps its meaning.
    expect(eventClock({ startTime: '15:00' })).toMatchObject({ means: 'arrival', arrivalMin: 900, serveMin: null });
  });
});
