// Wave-2p: budget-authority (60/30/10 event-budget) + kids/childcare supervision-safety axes.
import { ALL_PLAYBOOKS } from '../playbooks';
import { BUDGET_SOURCES, isGroundedBudget, effectiveBudget, detectBudgetCategory, resolveBudget } from './budgetContext';
import { CHILDCARE_SOURCES, isGroundedChildcare, effectiveChildcare, detectChildcareCategory, resolveChildcare } from './childcareContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('budget + childcare axes', () => {
  test('grounds budget-authority and kids/childcare decisions, real sources', () => {
    let b = 0; let c = 0;
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      if (detectBudgetCategory(d)) { expect(isGroundedBudget(effectiveBudget(d))).toBe(true); b++; }
      if (detectChildcareCategory(d)) { expect(isGroundedChildcare(effectiveChildcare(d))).toBe(true); c++; }
    }
    expect(b).toBeGreaterThanOrEqual(3);
    expect(c).toBeGreaterThanOrEqual(1);
    for (const s of [...Object.values(BUDGET_SOURCES), ...Object.values(CHILDCARE_SOURCES)]) {
      expect(s.url).toMatch(/^https?:/); expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  test('resolvers + predicates; no false positives on food-budget or kids-menu', () => {
    expect(resolveBudget({ id: 'budget', label: 'Set the budget' }).sources).toContain('eventmobi-budget');
    expect(resolveChildcare({ id: 'kids', label: 'Kids activity / zone' }).sources).toContain('childcaregov-ratios');
    expect(detectBudgetCategory({ id: 'x', label: 'Budget-friendly menu option' })).toBeNull();
    expect(detectChildcareCategory({ id: 'x', label: 'Kids menu' })).toBeNull();
    expect(isGroundedBudget({ factor: 'x', guideline: 'y', tier: 'planning-standard', sources: ['nope'] })).toBe(false);
    expect(isGroundedChildcare({ factor: 'x', guideline: 'y', tier: 'wrong', sources: ['childcaregov-ratios'] })).toBe(false);
  });
  test('gap-detector 0; board surfaces both', () => {
    let g = 0;
    for (const pb of ALL_PLAYBOOKS) g += detectGapsInPlaybook(pb).filter((x) => /budget-ungrounded|childcare-ungrounded/.test(String(x.type))).length;
    expect(g).toBe(0);
    const b = playbookDecisionBoard({ id: 'e', type: 'Wedding', date: '2027-06-01', guests: [], guestEstimate: 100 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.budgetGrounded === true)).toBe(true);
  });
});
