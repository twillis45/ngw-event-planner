// ─── ONE NUMBER, ONE READER (six root causes, cause 3) ───────────────────────
// The lane-D harness (everyScreenSaysTheSameThing) asks each fact the way each
// surface asks it over the samples. This extends it to every playbook at
// several sizes and budgets for the facts the Thanksgiving walkthrough caught
// disagreeing (P1-3, P1-5, P1-6): the parts handled, the money figures and
// their names, and what "confirmed" means.
const fs = require('fs');
const path = require('path');
const pbm = require('../playbooks');
const { deriveEventPhaseProgress } = require('../phaseProgress');
const { planPartsProgress, planPartsLine } = require('../planProgress');
const { planRibbon } = require('../eventOrientation');
const { hostSpending } = require('../hostSpending');
const { expectedHeadroom } = require('../budgetCopy');
const { moneyFigures, headroomLabel, MONEY_LABELS } = require('../moneyFigures');
const { coversWithWord, confirmedRsvpCovers } = require('../confirmedCovers');

const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const events = () => {
  const out = [];
  for (const pb of pbm.ALL_PLAYBOOKS) {
    for (const [g, budget, days] of [[14, 400, 3], [40, 3000, 30], [120, '', 120]]) {
      out.push({ id: `ev-${pb.type}-${g}`, type: pb.type, name: 'N', date: dayOut(days), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Fort Washington, MD', guestMode: 'count', guestCount: g, totalBudget: budget, guests: [], vendors: [], budget: [], timeline: [] });
    }
  }
  return out;
};

describe('one number, one reader, on every playbook', () => {
  test('parts handled: the strip, the ribbon and the summary line agree', () => {
    const bad = [];
    for (const ev of events()) {
      const cues = deriveEventPhaseProgress(ev);
      const pp = planPartsProgress(cues);
      if (!pp) continue;
      const rib = planRibbon(cues, null);
      if (rib.done !== pp.done || rib.total !== pp.total) bad.push(`${ev.id}: ribbon ${rib.done}/${rib.total} vs ${pp.done}/${pp.total}`);
      if (cues.completedCount !== pp.done || cues.totalCount !== pp.total) bad.push(`${ev.id}: ledger ${cues.completedCount}/${cues.totalCount} vs ${pp.done}/${pp.total}`);
      if (pp.parts.filter((p) => p.handled).length !== pp.done) bad.push(`${ev.id}: listed handled ≠ count`);
      if (cues.summary && /parts? of your plan handled/.test(cues.summary) && cues.summary !== planPartsLine(pp)) bad.push(`${ev.id}: "${cues.summary}" vs "${planPartsLine(pp)}"`);
    }
    expect(bad).toEqual([]);
  });

  test('money: left to spend is expected − spent, the room is budget − expected, and the room is never called "left to spend"', () => {
    const bad = [];
    for (const ev of events()) {
      const money = hostSpending(ev);
      const f = moneyFigures(money);
      if (Math.abs(f.leftToSpend - Math.max(0, money.expected - money.spent)) > 0.01) bad.push(`${ev.id}: left to spend ${f.leftToSpend}`);
      if (f.headroom !== expectedHeadroom(money)) bad.push(`${ev.id}: headroom ${f.headroom} vs ${expectedHeadroom(money)}`);
      if (/left to spend/i.test(headroomLabel(f))) bad.push(`${ev.id}: the room is labeled "${headroomLabel(f)}"`);
    }
    expect(bad).toEqual([]);
    expect(MONEY_LABELS.leftToSpend).toBe('Left to spend');
    // The walkthrough's numbers: $400 budget, $323 expected, $0 spent.
    const f = moneyFigures({ planned: 400, expected: 323, committed: 0, spent: 0 });
    expect([f.leftToSpend, f.headroom, headroomLabel(f)]).toEqual([323, 77, 'Room left in your budget']);
  });

  test('"confirmed" is replies: a planned count with no replies is never called confirmed', () => {
    const bad = [];
    for (const ev of events()) {
      const cw = coversWithWord(ev);
      if (cw.word === 'confirmed' && confirmedRsvpCovers(ev) === 0) bad.push(`${ev.id}: ${cw.n} confirmed with no replies`);
      const roster = { ...ev, guestMode: 'roster', guests: [{ id: 'a', name: 'A B', rsvp: 'Yes' }, { id: 'b', name: 'C D', rsvp: 'Pending' }] };
      const rw = coversWithWord(roster);
      if (rw.word !== 'confirmed' || rw.n !== confirmedRsvpCovers(roster)) bad.push(`${ev.id}: roster says ${rw.n} ${rw.word}`);
    }
    expect(bad).toEqual([]);
  });

  test('the shell prints these through the readers, not its own counts', () => {
    const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(/'Expected left to spend'/.test(SRC)).toBe(false);
    expect(/n\('Completed'\) \+ ' handled'/.test(SRC)).toBe(false);
    expect(/if \(yes > 0\) w\.push\(yes \+ ' confirmed'\)/.test(SRC)).toBe(false);
    expect(/phaseCues\.completedCount/.test(SRC)).toBe(false);
    expect(/planPartsProgress\(phaseCues\)/.test(SRC)).toBe(true);
  });
});
