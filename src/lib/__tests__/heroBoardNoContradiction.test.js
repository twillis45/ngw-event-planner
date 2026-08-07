// ── THE HERO AND THE BOARD MUST NOT CONTRADICT EACH OTHER ───────────────────
//
// A systematic sweep — 12 event types x 12 horizons, 144 events — comparing
// deriveEventPhaseProgress().nextCue against playbookDecisionBoard(). It found
// 36 contradictions of one kind: on babyShower, bridalShower and dinnerParty,
// at EVERY horizon, the hero named `dietary` as an open food choice while the
// board had that exact row LOCKED, because: "Collected".
//
// Both engines were reading the truth; the cue was reading the wrong field.
// Whether dietary is settled is `plan.dietaryResolved` — the host noted
// allergies, or a guest recorded a need, or there is no list to collect from.
// It is NOT `foodChoices.dietary`, which nothing in that workflow ever writes.
// So for those three playbooks the food axis could not complete: answer every
// real menu question and the hero still said "1 open", forever, pointing at a
// question the rest of the app considered closed.
//
// This is written as a SWEEP rather than three fixed cases, because the defect
// was invisible in any single case anyone had looked at — it needed the cross
// product to show up. A new playbook that carries a dietary decision inherits
// the check for free.
import { getPlaybook, playbookDecisionBoard, playbookFoodPlan } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const AS_OF = new Date('2026-08-07T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const TYPES = ['birthday', 'wedding', 'babyShower', 'graduation', 'retirementParty',
  'dinnerParty', 'anniversary', 'holidayParty', 'reunion', 'cookout', 'conference', 'bridalShower'];
const HORIZONS = [400, 210, 120, 90, 60, 45, 30, 21, 14, 7, 3, 1];

const eventFor = (type, days, extra) => ({
  id: `ev-${type}-${days}`, type, name: 'Agreement sweep',
  date: iso(AS_OF.getTime() + days * 864e5),
  venue: 'The Hall', guestCount: 40, foodChoices: {}, ...(extra || null),
});

function contradictions(extra) {
  const found = [];
  for (const type of TYPES) {
    if (!getPlaybook(type)) continue;
    for (const days of HORIZONS) {
      const ev = eventFor(type, days, extra);
      const board = playbookDecisionBoard(ev, AS_OF) || {};
      const cue = (deriveEventPhaseProgress(ev, AS_OF) || {}).nextCue;
      if (!cue) continue;
      const records = cue.records || [];
      const locked = new Set((board.locked || []).map(r => r && r.id).filter(Boolean));
      const deferred = new Set((board.deferred || []).map(r => r && r.id).filter(Boolean));
      for (const id of records) {
        if (locked.has(id)) found.push(`${type}@${days}d asks for LOCKED ${id}`);
        if (deferred.has(id)) found.push(`${type}@${days}d asks for DEFERRED ${id}`);
      }
    }
  }
  return found;
}

describe('hero / board agreement, swept', () => {
  test('the sweep actually covers something (premise)', () => {
    // Without this, a broken type list or a null cue everywhere would make the
    // real test below pass by checking nothing.
    const covered = TYPES.filter(t => getPlaybook(t));
    expect(covered.length).toBeGreaterThanOrEqual(8);
    const cues = HORIZONS.map(d =>
      (deriveEventPhaseProgress(eventFor('babyShower', d), AS_OF) || {}).nextCue).filter(Boolean);
    expect(cues.length).toBeGreaterThan(6);
  });

  test('no cue ever asks for a row the board calls settled or parked', () => {
    expect(contradictions()).toEqual([]);
  });

  test('and not for a host with a real guest list either', () => {
    // A second population, because the first one resolves dietary via the
    // "no list to collect from" branch. Here a guest HAS recorded a need, which
    // is the other way it legitimately resolves.
    expect(contradictions({ guests: [{ name: 'A', needs: 'peanut allergy' }, { name: 'B' }] })).toEqual([]);
  });

  test('a host who genuinely owes the dietary answer is still asked', () => {
    // The fix must not have bought agreement by going quiet. guestMode 'count'
    // with nothing noted is the case where the host really does owe this.
    const ev = eventFor('babyShower', 30, { guestMode: 'count', guestCount: 40 });
    const plan = playbookFoodPlan(ev) || {};
    expect(plan.dietaryResolved).toBe(false);
    const items = (deriveEventPhaseProgress(ev, AS_OF) || {}).items || [];
    const food = items.find(i => i.id === 'food');
    expect(food.handled).toBe(false);
    const cue = (deriveEventPhaseProgress(ev, AS_OF) || {}).nextCue;
    if (cue && cue.id === 'food') expect(cue.records || []).toContain('dietary');
  });

  test('answering every real menu question completes the food axis', () => {
    // The user-visible half of the bug: this was unreachable for these three
    // playbooks. `dietary` is deliberately NOT answered here — it is settled by
    // dietaryResolved, not by a pick.
    for (const type of ['babyShower', 'bridalShower', 'dinnerParty']) {
      const probe = eventFor(type, 30);
      const plan = playbookFoodPlan(probe) || {};
      expect(plan.dietaryResolved).toBe(true);
      const picks = {};
      for (const c of plan.choices || []) {
        if (c.id === 'dietary' || /dietary|allerg/i.test(c.label || '')) continue;
        picks[c.id] = 'answered';
      }
      const items = (deriveEventPhaseProgress(eventFor(type, 30, { foodChoices: picks }), AS_OF) || {}).items || [];
      const food = items.find(i => i.id === 'food');
      expect({ type, handled: food && food.handled }).toEqual({ type, handled: true });
    }
  });
});
