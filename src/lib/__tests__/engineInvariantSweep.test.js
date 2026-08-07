// ── A NET OVER THE WHOLE ENGINE, NOT A HANDFUL OF CASES ─────────────────────
//
// Two real defects were found today by running two engines against the same
// event and comparing, and both were invisible in every single case anyone had
// looked at: the hero nagged for decisions the board had parked, and three
// playbooks had a food axis that could never be finished. Both needed the cross
// product to show up at all.
//
// So this sweeps 12 event types x 10 horizons (including two PAST ones) x 6
// host states = 720 events, and asserts a handful of properties that should
// hold for every one of them. It is deliberately cheap and broad rather than
// deep: its job is to notice a whole CLASS going wrong, not to explain it.
//
// It is currently green. That is the point of committing it — the next
// regression in any of these classes names itself instead of waiting for
// someone to think of the right single case.
import { getPlaybook, playbookDecisionBoard } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const AS_OF = new Date('2026-08-07T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

const TYPES = ['birthday', 'wedding', 'babyShower', 'graduation', 'retirementParty',
  'dinnerParty', 'anniversary', 'holidayParty', 'reunion', 'cookout', 'conference', 'bridalShower'];
const HORIZONS = [400, 120, 60, 30, 14, 7, 3, 1, -2, -30];   // negatives are past events
const STATES = {
  bare: {},
  counted: { guestCount: 40 },
  listed: { guests: [{ name: 'A', rsvp: 'Yes' }, { name: 'B', rsvp: 'Maybe' }] },
  vendored: { guestCount: 30, vendors: [{ name: 'Cater Co', category: 'Catering' }] },
  budgeted: { guestCount: 30, totalBudget: 5000 },
  nodate: { guestCount: 30, date: '' },
};

function sweep() {
  const bad = [];
  const stats = { events: 0, cues: 0, items: 0, past: 0, cueIds: new Set() };
  for (const type of TYPES) {
    if (!getPlaybook(type)) continue;
    for (const days of HORIZONS) {
      for (const [state, extra] of Object.entries(STATES)) {
        const where = `${type}@${days}d/${state}`;
        const ev = {
          id: 'e-sweep', type, name: 'Sweep', venue: 'The Hall',
          date: iso(AS_OF.getTime() + days * 864e5), foodChoices: {}, ...extra,
        };
        let board, prog;
        try { board = playbookDecisionBoard(ev, AS_OF) || {}; } catch (e) { bad.push(`${where}: board threw ${e}`); continue; }
        try { prog = deriveEventPhaseProgress(ev, AS_OF) || {}; } catch (e) { bad.push(`${where}: progress threw ${e}`); continue; }

        stats.events++;
        if (days < 0) stats.past++;
        const items = prog.items || [];
        stats.items += items.length;
        const handled = items.filter(i => i.handled).length;

        // The scoreboard must describe its own ledger.
        if (typeof prog.completedCount === 'number' && prog.completedCount !== handled)
          bad.push(`${where}: completedCount ${prog.completedCount} but ${handled} items handled`);
        if (typeof prog.totalCount === 'number' && prog.completedCount > prog.totalCount)
          bad.push(`${where}: ${prog.completedCount}/${prog.totalCount}`);
        if (typeof prog.progress === 'number' && (prog.progress < 0 || prog.progress > 1))
          bad.push(`${where}: progress ${prog.progress} out of range`);

        const cue = prog.nextCue;
        if (!cue) continue;
        stats.cues++; stats.cueIds.add(cue.id);

        // A cue is an ASK: it needs words and somewhere to go.
        if (!cue.route) bad.push(`${where}: cue ${cue.id} has no route`);
        if (!cue.label || !String(cue.label).trim()) bad.push(`${where}: cue ${cue.id} has no label`);

        // It must not ask for an axis it simultaneously reports as done.
        const item = items.find(i => i.id === cue.id);
        if (item && item.handled) bad.push(`${where}: cue for handled axis ${cue.id}`);

        // Nor for a row the board considers settled or not yet due.
        const locked = new Set((board.locked || []).map(r => r && r.id).filter(Boolean));
        const deferred = new Set((board.deferred || []).map(r => r && r.id).filter(Boolean));
        for (const id of cue.records || []) {
          if (locked.has(id)) bad.push(`${where}: cue asks for LOCKED ${id}`);
          if (deferred.has(id)) bad.push(`${where}: cue asks for DEFERRED ${id}`);
        }

        // After the event, planning gaps are retired — wrap-up only.
        if (days < 0 && ['food', 'lodging', 'headcount', 'location', 'shopping'].includes(cue.id))
          bad.push(`${where}: planning cue "${cue.id}" after the event`);
      }
    }
  }
  return { bad, stats };
}

const RESULT = sweep();

describe('engine invariants, swept', () => {
  test('the sweep really exercised both engines (premise)', () => {
    // An empty violation list is only meaningful if the sweep ran. Every
    // vacuous test found in this sprint looked exactly like a clean result.
    expect(RESULT.stats.events).toBeGreaterThan(600);
    expect(RESULT.stats.cues).toBeGreaterThan(400);
    expect(RESULT.stats.items).toBeGreaterThan(2000);
    expect(RESULT.stats.past).toBeGreaterThan(100);
    // and it reached genuinely different asks, not one cue 600 times
    expect(RESULT.stats.cueIds.size).toBeGreaterThanOrEqual(5);
  });

  test('no engine invariant is violated on any of them', () => {
    expect({ violations: RESULT.bad.slice(0, 20), total: RESULT.bad.length })
      .toEqual({ violations: [], total: 0 });
  });
});
