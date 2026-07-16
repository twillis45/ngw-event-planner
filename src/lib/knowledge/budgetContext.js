// demo/src/lib/knowledge/budgetContext.js — Wave-2p COVERAGE: budget-authority axis.
// The Coverage re-score named budget-authority (who approves/pays) the biggest remaining
// non-safety zero. Grounded to a real event-budgeting standard (the 60/30/10 rule).
export const BUDGET_SOURCES = {
  'eventmobi-budget': {
    org: 'EventMobi — Event Budget Planning Guide',
    url: 'https://www.eventmobi.com/blog/event-budget-basics/',
    fetched: '2026-07-16',
    claim: 'A common event-budget framework is the 60/30/10 rule — ~60% to the core experience (venue + food/beverage + production), ~30% to logistics/operations, ~10% to contingency; food & beverage alone runs 20-30%. Keep a 5-15% contingency (20% for a first-time event with no history), and get budget sign-off IN WRITING before committing spend so "I never agreed to that" can\'t happen at invoice time.',
  },
};
const BUDGET_CATEGORIES = [{
  category: 'budget_authority',
  pattern: /\bbudget\b|who pays|who('s| is) paying|cost ?split|how much (to |will |should )?spend|\bpadrinos\b|\bsponsors?\b|split the cost|chip in|per-?head budget/i,
  antiPattern: /budget-friendly|on a budget dish|budget option/i,
  factor: 'Budget & who approves the spend',
  guideline: 'Set the number first — a rough 60/30/10 split (60% venue + food, 30% the rest, 10% contingency) keeps it honest, and food alone is 20-30%. Agree WHO pays (and any sponsors/padrinos) and get the sign-off in writing before committing, with a 5-15% cushion (more for a first event).',
  tier: 'planning-standard', sources: ['eventmobi-budget'],
}];
export function detectBudgetCategory(d){ if(!d) return null; const h=`${d.id||''} ${d.label||''}`; for(const c of BUDGET_CATEGORIES){ if(c.pattern.test(h)&&!(c.antiPattern&&c.antiPattern.test(h))) return c; } return null; }
export function resolveBudget(d){ const c=detectBudgetCategory(d); if(!c) return null; return {factor:c.factor,guideline:c.guideline,category:c.category,tier:c.tier,sources:c.sources.slice(),verificationStatus:'researched',resolvedBy:'budget-authority-resolver'}; }
export function isGroundedBudget(x){ return !!(x&&typeof x==='object'&&typeof x.factor==='string'&&x.factor.trim()&&typeof x.guideline==='string'&&x.guideline.trim()&&x.tier==='planning-standard'&&Array.isArray(x.sources)&&x.sources.length>0&&x.sources.every(s=>!!BUDGET_SOURCES[s])); }
export function budgetSourcesFor(x){ if(!x||!Array.isArray(x.sources)) return []; return x.sources.map(s=>BUDGET_SOURCES[s]).filter(Boolean); }
export function effectiveBudget(d){ if(d&&isGroundedBudget(d.budgetContext)) return d.budgetContext; return resolveBudget(d); }
