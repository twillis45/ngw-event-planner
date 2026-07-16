// demo/src/lib/knowledge/childcareContext.js — Wave-2p COVERAGE: kids/childcare safety axis.
// A safety-adjacent zero the Coverage re-score named. Grounded to childcare supervision-ratio standards.
export const CHILDCARE_SOURCES = {
  'childcaregov-ratios': {
    org: 'Childcare.gov / ZERO TO THREE — Supervision Ratios & Group Sizes',
    url: 'https://childcare.gov/consumer-education/regulated-child-care/supervision-ratios-and-group-sizes',
    fetched: '2026-07-16',
    claim: 'Adult-to-child supervision ratios rise with age: roughly 1 adult per 4 children under age 3, ~1:10 for ages 3-5, ~1:20 for ages 5-9. Always have at least TWO adults supervising a group of children, and check your state\'s specific requirements — young children need near-constant attention for their safety.',
  },
};
const CHILDCARE_CATEGORIES = [{
  category: 'childcare',
  pattern: /childcare|child care|babysitt|kids'? (table|activity|zone|corner|room|area|plan|entertainment)|what do the (kids|children)|the little ones|kids'? supervision|kids activities?/i,
  antiPattern: /kids'? menu|kids'? meal|kids eat/i,
  factor: 'Kids & supervision safety',
  guideline: 'Plan real supervision for the children — roughly 1 adult per 4 under age 3, ~1:10 for ages 3-5, and never fewer than two adults on the group. A defined kids\' zone with an assigned watcher (and no pool/road/fire access unattended) keeps it safe while the grown-ups host.',
  tier: 'childcare-standard', sources: ['childcaregov-ratios'],
}];
export function detectChildcareCategory(d){ if(!d) return null; const h=`${d.id||''} ${d.label||''}`; for(const c of CHILDCARE_CATEGORIES){ if(c.pattern.test(h)&&!(c.antiPattern&&c.antiPattern.test(h))) return c; } return null; }
export function resolveChildcare(d){ const c=detectChildcareCategory(d); if(!c) return null; return {factor:c.factor,guideline:c.guideline,category:c.category,tier:c.tier,sources:c.sources.slice(),verificationStatus:'researched',resolvedBy:'childcare-resolver'}; }
export function isGroundedChildcare(x){ return !!(x&&typeof x==='object'&&typeof x.factor==='string'&&x.factor.trim()&&typeof x.guideline==='string'&&x.guideline.trim()&&x.tier==='childcare-standard'&&Array.isArray(x.sources)&&x.sources.length>0&&x.sources.every(s=>!!CHILDCARE_SOURCES[s])); }
export function childcareSourcesFor(x){ if(!x||!Array.isArray(x.sources)) return []; return x.sources.map(s=>CHILDCARE_SOURCES[s]).filter(Boolean); }
export function effectiveChildcare(d){ if(d&&isGroundedChildcare(d.childcareContext)) return d.childcareContext; return resolveChildcare(d); }
