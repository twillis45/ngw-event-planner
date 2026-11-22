// ─── A VENDOR'S QUOTE IS NOT A SHOPPING LINE (Wanda audit follow-up, 11/22/2026) ──
//
// #224 made a quoted caterer price the food (catererPriceOf): the spread's
// catering line carries Semper Catering's $1,500 quote. The money recovery
// list then offered that quote as a line to trim at the store:
//   Trim or swap "Catering (the food) · Semper Catering Co. quote" ~$1,500
//   · Not bought yet.
// A quote is a conversation with the vendor, which the same list already
// offers once ("Nothing is committed to Semper Catering Co. yet"). It is not
// a shopping line, and it is not offered as one.
import WANDA from '../../data/wandaGoldEvent';
import { buildBudgetRecoveryPlan } from '../budgetRecovery';
import { catererPriceOf, playbookFoodPlan } from '../playbooks';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
// Her own budget rows ($5,000) and the expected spend put her over, so the list is built.
const tight = () => wanda({ foodChoices: { food_style: 'Drop-off catering / buffet' } });

describe('the recovery list does not offer a vendor quote as a shopping line', () => {
  test('premise: the quote prices the food, and the plan is over budget', () => {
    expect(catererPriceOf(tight())).toEqual(expect.objectContaining({ cost: 1500 }));
    expect(playbookFoodPlan(tight()).list.some((l) => l.id === 'fa-catering' && l.quotedBy)).toBe(true);
    expect(buildBudgetRecoveryPlan(tight()).status).toBe('recovery_available');
  });

  test('no "Trim or swap" for the caterer’s quote', () => {
    const labels = buildBudgetRecoveryPlan(tight()).suggestions.map((s) => s.label);
    expect(labels.filter((l) => /Catering \(the food\)|Semper Catering Co\. quote/.test(l) && /Trim|swap|Skip/.test(l))).toEqual([]);
  });

  test('the quote is still named once, as a conversation with the vendor', () => {
    const labels = buildBudgetRecoveryPlan(tight()).suggestions.map((s) => s.label);
    expect(labels.filter((l) => /Semper Catering/.test(l))).toEqual(['Nothing is committed to Semper Catering Co. yet']);
  });
});
