// THROWAWAY adversarial grounding probe — DELETE after running.
import { ALL_PLAYBOOKS } from '../index';
import { effectiveTimingProvenance, isGroundedTiming, detectTimingCategory, resolveTimingProvenance } from '../../knowledge/timingProvenance';
import { isGroundedCost } from '../../knowledge/costProvenance';
import { isGroundedCulture } from '../../knowledge/culturalContext';
import { effectiveAccessibility, isGroundedAccessibility } from '../../knowledge/accessibilityContext';

test('grounding tally', () => {
  expect(ALL_PLAYBOOKS.length).toBe(39);
  let total = 0, timing = 0, cost = 0, costEligible = 0, cultural = 0, access = 0;
  const timingByCat = {};
  const timingHits = [];
  // window-gate check: decisions where TEXT category matched but timing did NOT ground (window veto)
  let textMatchedButWindowVetoed = 0;
  const vetoSamples = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) {
      total++;
      const tp = effectiveTimingProvenance(d);
      if (isGroundedTiming(tp)) {
        timing++;
        timingByCat[tp.category] = (timingByCat[tp.category] || 0) + 1;
        if (timingHits.length < 60) timingHits.push(`${pb.eventType}::${d.id}::${d.when}::${tp.category}::${tp.sources.join(',')}`);
      } else {
        const cat = detectTimingCategory(d);
        if (cat && !resolveTimingProvenance(d)) {
          textMatchedButWindowVetoed++;
          if (vetoSamples.length < 20) vetoSamples.push(`${pb.eventType}::${d.id}::when=${d.when}::cat=${cat.category}::window=[${cat.leadDays}]`);
        }
      }
      if (d.costFactors && Object.keys(d.costFactors).length > 0) costEligible++;
      if (isGroundedCost(d.costFactorProvenance)) cost++;
      if (isGroundedCulture(d.culturalContext)) cultural++;
      if (isGroundedAccessibility(effectiveAccessibility(d))) access++;
    }
  }
  const pct = (n) => ((n / total) * 100).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    total,
    timing, timingPct: pct(timing), timingByCat,
    cost, costEligible, costPct: pct(cost),
    cultural, culturalPct: pct(cultural),
    access, accessPct: pct(access),
    textMatchedButWindowVetoed, vetoSamples,
    photographyHits: timingHits.filter((h) => h.includes('::photography::')),
    attireHits: timingHits.filter((h) => h.includes('::attire::')),
  }, null, 2));
  // dump all timing hits with when to inspect lead-window consistency
  // eslint-disable-next-line no-console
  console.log('TIMING_HITS\n' + timingHits.join('\n'));
});
