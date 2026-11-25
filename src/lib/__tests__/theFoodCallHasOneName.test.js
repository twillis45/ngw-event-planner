// ─── THE FOOD CALL HAS ONE NAME (cohesion batch F, F2; owner, 11/24/2026) ─────
//
// The hero asked "How is the food handled? · 1 open" while the part-by-part
// row and the desktop NEXT pill — both read from the ledger's food cue — said
// "Decide what you're serving · 1 open", and Calls to make said "How is the
// food handled?". One decision, three names (UX_11 rules 8 and 11).
//
// The owner's ruling (F2): the call's own question (`callQuestion`, ruling 4a)
// is its one name below the headline. The ledger cue and the hero record both
// read it from `foodCallQuestion`, so the two cannot drift again.
import { WANDA_GOLD_EVENT } from '../../data/wandaGoldEvent';
import { SAMPLE_EVENTS_EXTRA } from '../../data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '../../data/sampleEventsDMV';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { callQuestion, getPlaybook } from '../playbooks';
import { foodCallQuestion } from '../decisionND';

const NOW = new Date('2026-11-24T10:00:00');
const foodItem = (ev) => (deriveEventPhaseProgress(ev, NOW).items || []).find((i) => i.id === 'food');

describe('the food call is asked by its own question everywhere', () => {
  test('Wanda: the ledger row reads the call it counts — "How is the food handled? · 1 open"', () => {
    const food = foodItem(WANDA_GOLD_EVENT);
    expect(food).toBeTruthy();
    const call = getPlaybook(WANDA_GOLD_EVENT.type).decisions.find((d) => d.id === 'food_style');
    expect(callQuestion(call)).toBe('How is the food handled?');
    expect(food.cueLabel).toBe('How is the food handled? · 1 open');
  });

  test('every sample with an open menu call: the cue names the question the hero asks', () => {
    let checked = 0;
    for (const ev of [WANDA_GOLD_EVENT, ...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV]) {
      const food = foodItem(ev);
      if (!food || !Array.isArray(food.records) || !food.records.length || !food.cueLabel) continue;
      const q = foodCallQuestion(ev, food.records, NOW);
      if (!q) continue;
      checked++;
      expect(`${ev.id}: ${food.cueLabel}`).toBe(`${ev.id}: ${q.replace(/\.+$/, '')} · ${food.records.length} open`);
    }
    expect(checked).toBeGreaterThan(0);
  });

  // The hero, the part-by-part row and the NEXT pill showing this one name is
  // asserted where it renders: hostv2/e2e/whatsCountedOpensInPlace.spec.mjs.
});
