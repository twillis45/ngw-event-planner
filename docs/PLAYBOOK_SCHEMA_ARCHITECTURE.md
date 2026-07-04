# Playbook Schema Architecture

## Principle: Single Source of Truth

All playbook structure assumptions live in **one module**: `src/lib/knowledge/playbookSchema.js`

This prevents:
- Duplicated field definitions across the codebase
- Hardcoded field paths in UI logic
- Inconsistent gap detection between sections
- Breaking changes when playbook structure changes

## Architecture Overview

```
Playbook Files (src/lib/playbooks/data/*.js)
         ↓
    ALL_PLAYBOOKS (imported)
         ↓
 Playbook Schema Registry (playbookSchema.js)
         ↓
    Gap Detection     Field Access     Confidence Rules
         ↓                 ↓                   ↓
   Admin Console    Campaign Research   Auto-Accept Logic
   Mission Control   Dependency Explorer   Evidence Resolution
```

## Core Functions

### 1. Gap Detection
```javascript
import { detectGapsInPlaybook } from '../lib/knowledge/playbookSchema';

// Use this instead of hardcoding decision structure
const gaps = detectGapsInPlaybook(playbook);
// Returns: [{ id, type, label, fieldPath, decision }]
```

**Never do this:**
```javascript
// ❌ BAD: Hardcoded assumption
if (decision.costFactorProvenance?.verificationStatus === 'synthesized') {
  // ...
}
```

**Always do this:**
```javascript
// ✅ GOOD: Use schema
const gaps = detectGapsInPlaybook(playbook);
gaps.forEach(gap => {
  // gap.fieldPath is canonical
  // gap.type is from schema
});
```

### 2. Field Access
```javascript
import { getPlaybookField, setPlaybookField, parseFieldPath } from '../lib/knowledge/playbookSchema';

// Get a field by path
const costFactors = getPlaybookField(playbook, 'decisions[steam_vs_order].costFactors');

// Update a field (returns new playbook)
const updated = setPlaybookField(
  playbook,
  'decisions[steam_vs_order].costFactors',
  { 'Steam them myself': 0.85 }
);

// Parse a field path
const parsed = parseFieldPath('decisions[steam_vs_order].costFactors');
// Returns: { type: 'decision', resourceType: 'decisions', id: 'steam_vs_order', subField: 'costFactors' }
```

**Never do this:**
```javascript
// ❌ BAD: Manual field path construction
const fieldPath = `decisions[${d.id}].costFactors`;
const parts = fieldPath.split('[');
```

**Always do this:**
```javascript
// ✅ GOOD: Use schema
const parsed = parseFieldPath(fieldPath);
const resource = playbook[parsed.resourceType].find(r => r.id === parsed.id);
```

### 3. Confidence Rules
```javascript
import { isHighConfidenceProvenance, shouldAutoAcceptConsensus } from '../lib/knowledge/playbookSchema';

// Check if a playbook field's provenance is high-confidence
if (isHighConfidenceProvenance(decision.costFactorProvenance)) {
  // This field is researched and confident, no manual review needed
}

// Check if evidence consensus should auto-accept
if (shouldAutoAcceptConsensus(conflictData)) {
  // Automatically select this value, don't ask user
  selectedValue = winner;
}
```

### 4. Readiness Assessment
```javascript
import { playbookReadinessForResearch } from '../lib/knowledge/playbookSchema';

const readiness = playbookReadinessForResearch(playbook);
// Returns: {
//   hasResearchableGaps: boolean,
//   totalGaps: number,
//   gaps: [{ id, type, label, fieldPath }],
//   readiness: 'ready' | 'complete'
// }

if (readiness.hasResearchableGaps) {
  // Show "Start Research" button
  // Use readiness.gaps to populate campaign
}
```

## How to Add New Gap Types

When adding a new researchable field type (e.g., cost ranges):

1. **Add to schema:**
```javascript
// In playbookSchema.js
export const GAP_CRITERIA = {
  COST_FACTOR: { /* existing */ },
  COST_RANGE: {  // NEW
    type: FIELD_TYPES.COST_RANGE,
    hasData: (purchase) => purchase.unitCostRange,
    needsResearch: (purchase) =>
      purchase.costProvenance?.verificationStatus === 'synthesized' &&
      purchase.unitCostRange,
    label: (purchase) => purchase.label || purchase.id,
    fieldPath: (purchaseId) => `purchases[${purchaseId}].unitCostRange`,
  },
};

// Update detectGapsInPlaybook:
if (playbook.purchases && Array.isArray(playbook.purchases)) {
  playbook.purchases.forEach((purchase) => {
    if (GAP_CRITERIA.COST_RANGE.needsResearch(purchase)) {
      gaps.push({
        id: purchase.id,
        type: FIELD_TYPES.COST_RANGE,
        label: GAP_CRITERIA.COST_RANGE.label(purchase),
        fieldPath: GAP_CRITERIA.COST_RANGE.fieldPath(purchase.id),
        purchase,
      });
    }
  });
}
```

2. **Admin console automatically picks it up:**
```javascript
// No changes needed here!
const gaps = detectGapsInPlaybook(selectedPb);
// Now includes both COST_FACTOR and COST_RANGE gaps
```

## Migration Checklist

When refactoring code to use schema:

- [ ] Replace hardcoded field paths with `parseFieldPath()` or schema definitions
- [ ] Replace manual gap detection with `detectGapsInPlaybook()`
- [ ] Replace confidence checks with `isHighConfidenceProvenance()`
- [ ] Replace custom readiness logic with `playbookReadinessForResearch()`
- [ ] Remove all decision structure assumptions from UI code
- [ ] Test with multiple playbook types to verify structure assumptions are correct

## Examples

### ✅ Correct: Using Schema

```javascript
// Campaign Research gap selection
import { detectGapsInPlaybook } from '../lib/knowledge/playbookSchema';

const gaps = detectGapsInPlaybook(selectedPb);
// All gaps automatically detected, no hardcoding

gaps.forEach(gap => {
  console.log(gap.fieldPath); // "decisions[steam_vs_order].costFactors"
  console.log(gap.type);      // "costFactor"
});
```

### ✅ Correct: Field Updates

```javascript
// Campaign Research results merging
import { setPlaybookField } from '../lib/knowledge/playbookSchema';

let updated = playbook;
results.forEach(result => {
  if (result.status === 'success') {
    updated = setPlaybookField(
      updated,
      result.gap.fieldPath,
      { verificationStatus: 'researched', sources: result.providersUsed }
    );
  }
});
localStorage.setItem(`ngw-playbook-${playbook.type}`, JSON.stringify(updated));
```

### ❌ Incorrect: Hardcoded Structure

```javascript
// This breaks if playbook structure changes
if (playbook.decisions) {
  playbook.decisions.forEach(d => {
    if (d.costFactors && d.costFactorProvenance?.verificationStatus === 'synthesized') {
      // Hardcoded assumptions everywhere
    }
  });
}
```

### ❌ Incorrect: Manual Field Paths

```javascript
// This is fragile - easy to mistype, hard to track
const fieldPath = `decisions[${gapId}].costFactors`;
const parts = fieldPath.split('[');
const id = parts[1]?.replace(']', '');
// What if structure changes?
```

## Benefits

✅ **Single point of change** — Update field definitions once, everywhere updates  
✅ **Type safety** — Clear contracts for what gaps are  
✅ **Consistency** — All sections use same gap definitions  
✅ **Testability** — Schema functions easy to unit test  
✅ **Documentation** — Schema IS the documentation  
✅ **Scalability** — Add new gap types without touching UI code  

## Related Modules

- `playbookMerge.js` — Merges playbooks with localStorage overrides
- `consensusResolver.js` — Resolves conflicting evidence findings
- `missionControl.js` — Uses schema for queue/health calculations
- `campaign.js` — Uses field paths from schema for research
