import { ALL_PLAYBOOKS } from '../playbooks/index';
import { isGroundedCulture } from './culturalContext';
import { effectiveAccessibility } from './accessibilityContext';
import { effectiveLegal, detectLegalCategory } from './legalContext';

test('coverage probe', () => {
  let totalDecisions = 0;
  const axisCounts = { cultural: 0, accessibility: 0, legal: 0 };
  const legalByCat = {};
  const legalHits = [];
  const structuralZeros = { venueConstraintField: 0, weatherPerDecision: 0, humanRelational: 0 };
  const inlineFields = { culturalContext: 0, accessibilityContext: 0, legalContext: 0, venueContext: 0, weatherContext: 0, humanContext: 0 };
  const playbooksWithLegal = new Set();
  const playbooksWithCultural = new Set();
  const playbooksWithAccess = new Set();

  // False-positive probe list: plain food/theme choices that must NOT be flagged legal
  const mustNotBeLegal = [];

  for (const pb of ALL_PLAYBOOKS) {
    const decs = pb.decisions || [];
    for (const d of decs) {
      totalDecisions++;
      if (isGroundedCulture(d.culturalContext)) { axisCounts.cultural++; playbooksWithCultural.add(pb.type || pb.eventType || pb.id); }
      if (effectiveAccessibility(d)) { axisCounts.accessibility++; playbooksWithAccess.add(pb.type || pb.eventType || pb.id); }
      const legal = effectiveLegal(d);
      if (legal) {
        axisCounts.legal++;
        playbooksWithLegal.add(pb.type || pb.eventType || pb.id);
        legalByCat[legal.category] = (legalByCat[legal.category] || 0) + 1;
        legalHits.push(`${pb.type || pb.id}:${d.id} [${legal.category}] "${d.label}"`);
      }
      // inline structured fields
      for (const f of Object.keys(inlineFields)) { if (d[f] != null) inlineFields[f]++; }
      // structural zero checks
      if (d.venueContext || d.venueConstraint) structuralZeros.venueConstraintField++;
      if (d.weatherContext || d.weatherSensitivity) structuralZeros.weatherPerDecision++;
      if (d.humanContext || d.relationalContext) structuralZeros.humanRelational++;

      // false positive probe: known-plain ids
      if (/^(sides|theme|crab_size|cake|dessert|favors|decor|colors|playlist|music)$/i.test(d.id)) {
        if (legal) mustNotBeLegal.push(`FALSE-POS ${pb.type || pb.id}:${d.id} "${d.label}"`);
      }
    }
  }

  console.log('=== COVERAGE PROBE ===');
  console.log('Playbooks:', ALL_PLAYBOOKS.length, ' totalDecisions:', totalDecisions);
  console.log('GROUNDED AXIS COUNTS:', JSON.stringify(axisCounts));
  console.log('legal by category:', JSON.stringify(legalByCat));
  console.log('legal spans playbooks:', playbooksWithLegal.size, [...playbooksWithLegal].sort().join(','));
  console.log('cultural spans playbooks:', playbooksWithCultural.size, [...playbooksWithCultural].sort().join(','));
  console.log('accessibility spans playbooks:', playbooksWithAccess.size);
  console.log('INLINE STRUCTURED FIELDS present:', JSON.stringify(inlineFields));
  console.log('STRUCTURAL ZERO fields:', JSON.stringify(structuralZeros));
  console.log('FALSE POSITIVES (plain food/theme flagged legal):', mustNotBeLegal.length, mustNotBeLegal.join(' | '));
  console.log('--- all legal hits ---');
  legalHits.forEach((h) => console.log('  ', h));
});
