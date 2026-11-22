// ─── THE CEREMONY'S DAY-OF CHECKS WAIT FOR THE ANSWER (Wanda audit follow-up, 11/22/2026) ──
//
// #224 asked once whether the official Army ceremony is part of this party
// (owner: "Ask once"), and the run of show prints the official sequence only
// when the answer is "this party". The day-of checklist did not ask: Wanda's
// list carried "Folded-flag presentation" and "Reading the Retirement Order"
// before the question was answered, and after "Held separately". It reads the
// same answer now, officialCeremonyAnswer(event) === 'this-party'.
import WANDA from '../../data/wandaGoldEvent';
import { playbookDayOfChecklist, playbookRunOfShow } from '../playbooks';
import { officialCeremonyAnswer } from '../knowledge/militaryRetirement';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
const labels = (ev) => ((playbookDayOfChecklist(ev) || {}).items || []).map((i) => String(i.label || ''));
const ceremonyItems = (ev) => labels(ev).filter((l) => /Folded-flag presentation|Retirement Order/i.test(l));
const rosHasSequence = (ev) => (playbookRunOfShow(ev) || []).some((r) => /retirement ceremony:/i.test(String(r.segment || '')));

describe('the day-of checklist asks the same question the run of show asks', () => {
  test('premise: Wanda has not answered it', () => {
    expect(officialCeremonyAnswer(wanda())).toBe(null);
  });

  test('unanswered: no flag presentation, no Retirement Order', () => {
    expect(ceremonyItems(wanda())).toEqual([]);
  });

  test('held separately: none of the ceremony’s checks', () => {
    expect(ceremonyItems(wanda({ officialCeremony: 'separate' }))).toEqual([]);
  });

  test('part of this party: the checks are there, as the run of show’s sequence is', () => {
    const ev = wanda({ officialCeremony: 'this-party', ros: [] });
    expect(ceremonyItems(ev)).toEqual(expect.arrayContaining(['Folded-flag presentation', 'Reading the Retirement Order']));
    expect(rosHasSequence(ev)).toBe(true);
  });

  test('one rule: the checklist shows them exactly when the run of show does', () => {
    for (const officialCeremony of [undefined, 'separate', 'this-party']) {
      const ev = wanda({ officialCeremony, ros: [] });
      expect(ceremonyItems(ev).length > 0).toBe(rosHasSequence(ev));
    }
  });
});
