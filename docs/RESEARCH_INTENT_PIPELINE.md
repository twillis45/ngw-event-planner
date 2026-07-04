# Research Intent Pipeline — Question-Driven Campaign Routing

## Overview

The research intent pipeline routes campaign research based on **what the question actually asks**, not just the field type. Different questions require different providers, templates, and workflows.

## Research Intent Types

### 1. **Cost Verification** (default)
**Question:** "Does hiring a pitmaster really cost 40% more?"

**What it researches:**
- Cost multipliers/factors for different decision options
- Price comparisons between approaches
- Cost-per-unit by option

**Providers:**
- Market pricing databases
- Retail sources
- Restaurant/catering industry pricing

**Template:** `cost-factor-grounding`

**Playbook example:**
```javascript
costFactorProvenance: {
  // No researchIntent = defaults to 'cost-verification'
  verificationStatus: 'synthesized',
  note: 'Need price data for pitmaster vs DIY'
}
```

---

### 2. **Vendor Capability** ✨ NEW
**Question:** "Who can handle the food? What are their capabilities?"

**What it researches:**
- Available vendors/services in the market
- Their capacity, cuisine, service style
- Pricing and references
- Suitability for this event type

**Providers:**
- Catering networks (vendor directories)
- Event industry associations
- Community forums & local reviews
- Venue-preferred vendor lists

**Template:** `vendor-capability-sourcing`

**Playbook example:**
```javascript
costFactorProvenance: {
  researchIntent: 'vendor-capability',  // ← NEW
  verificationStatus: 'synthesized',
  note: 'Research available pitmasters in area and their capabilities'
}
```

---

### 3. **Quantity Validation**
**Question:** "Is 0.5 lb per guest right for BBQ?"

**What it researches:**
- Industry-standard quantities
- Peer practices (what do other events use?)
- Coverage/sufficiency ranges

**Providers:**
- Hospitality associations
- Catering networks
- Community forums (real events)

**Template:** `qty-per-guest-grounding`

**Playbook example:**
```javascript
costFactorProvenance: {
  researchIntent: 'quantity-validation',
  verificationStatus: 'synthesized'
}
```

---

### 4. **Safety Compliance**
**Question:** "What temperature do we grill chicken to?"

**What it researches:**
- Regulatory requirements (FDA, USDA)
- Safe handling procedures
- Risk mitigation

**Providers:**
- FDA/USDA guidelines
- Food safety networks
- SME networks

**Template:** `food-safety-review`

**Playbook example:**
```javascript
costFactorProvenance: {
  researchIntent: 'safety-compliance',
  verificationStatus: 'synthesized'
}
```

---

### 5. **Decision Validation**
**Question:** "What do successful events do?"

**What it researches:**
- Community practices
- Peer experiences
- What worked in the real world

**Providers:**
- Community forums
- Event planners (Reddit, Facebook Groups)
- Social media
- Direct surveys

**Template:** `community-validation`

**Playbook example:**
```javascript
costFactorProvenance: {
  researchIntent: 'decision-validation',
  verificationStatus: 'synthesized'
}
```

---

## How to Declare Research Intent in Playbooks

### Syntax
Add `researchIntent` to any decision's `costFactorProvenance`:

```javascript
{
  id: 'food_style',
  label: 'Who handles the food?',
  costFactors: { ... },
  costFactorProvenance: {
    researchIntent: 'vendor-capability',  // ← Declare what you're researching
    verificationStatus: 'synthesized',
    confidence: 'medium',
    note: 'Need to find available pitmasters and assess their capabilities'
  }
}
```

### If Not Specified
If `researchIntent` is omitted, the system defaults to `'cost-verification'` (backward compatible):

```javascript
// This will use cost-verification templates
costFactorProvenance: {
  verificationStatus: 'synthesized'
  // No researchIntent = cost-verification
}
```

---

## The Intent-to-Template Mapping

| Research Intent | Available Templates | When to Use |
|---|---|---|
| `cost-verification` | cost-factor-grounding | Verifying cost multipliers |
| `vendor-capability` | vendor-capability-sourcing | Finding & evaluating vendors |
| `quantity-validation` | qty-per-guest-grounding | Validating per-guest quantities |
| `safety-compliance` | food-safety-review, regulation-compliance | Safety & legal requirements |
| `decision-validation` | community-validation | Learning real-world practices |

---

## Campaign Flow by Intent

### Cost Verification Flow
1. **Gap detected:** Decision with `costFactors` and `verificationStatus: 'synthesized'`
2. **Intent:** `'cost-verification'` (default)
3. **Templates offered:** cost-factor-grounding
4. **Providers:** market-pricing, retail, restaurant-depot
5. **Research:** Collect prices → compare ratios → verify multiplier
6. **Success:** "Hiring a pitmaster costs 1.4x the DIY approach"

### Vendor Capability Flow (NEW)
1. **Gap detected:** Decision with `costFactors` and `researchIntent: 'vendor-capability'`
2. **Intent:** `'vendor-capability'`
3. **Templates offered:** vendor-capability-sourcing
4. **Providers:** catering-network, event-industry, community-forums, venue-network
5. **Research:** Find vendors → assess capacity/cuisine → get references
6. **Success:** "Available pitmasters in the area: [list with ratings & pricing]"

---

## Example: Backyard BBQ "Who handles the food?"

**The Decision:**
```javascript
{
  id: 'food_style',
  label: 'Who handles the food?',
  options: [
    'Host grills everything',
    'Hire a BBQ caterer / pitmaster',
    'Potluck — guests bring sides'
  ],
  costFactors: {
    'Hire a BBQ caterer / pitmaster': 1.4,
    'Potluck — guests bring sides': 0.75
  },
  costFactorProvenance: {
    researchIntent: 'vendor-capability',  // ← Vendor sourcing, not just cost
    verificationStatus: 'synthesized',
    note: 'Research available pitmasters + their capabilities/pricing'
  }
}
```

**When a user researches this gap:**
1. Selects the gap "Who handles the food?"
2. System detects `researchIntent: 'vendor-capability'`
3. Campaign templates filtered to `vendor-capability-sourcing`
4. User chooses template (only option available)
5. Selects providers: catering networks, local forums
6. Campaign launches → collects vendor info
7. Results: "3 local pitmasters available, capacity 20-50 guests, $400-600"

---

## When to Use Each Intent

| Situation | Intent | Rationale |
|---|---|---|
| "Does this cost X% more/less?" | cost-verification | Price comparison question |
| "Who can handle this service?" | vendor-capability | Vendor sourcing question |
| "Is this quantity enough?" | quantity-validation | Industry norms question |
| "Is this safe?" | safety-compliance | Regulatory/safety question |
| "What do people actually do?" | decision-validation | Community practice question |

---

## Implementation Details

### For Developers

**Gap detection** (playbookSchema.js):
```javascript
export function getResearchIntent(gap) {
  const intent = gap.decision?.costFactorProvenance?.researchIntent;
  // Default to cost-verification if not specified (backward compatible)
  return intent || RESEARCH_INTENTS.COST_VERIFICATION;
}
```

**Template routing** (playbookSchema.js):
```javascript
export function getTemplatesForIntent(intent, allTemplates) {
  const intentToGapTypes = {
    [RESEARCH_INTENTS.COST_VERIFICATION]: ['cost-factor', 'pricing'],
    [RESEARCH_INTENTS.VENDOR_CAPABILITY]: ['vendor-capability', 'sourcing'],
    [RESEARCH_INTENTS.QUANTITY_VALIDATION]: ['quantity'],
    [RESEARCH_INTENTS.SAFETY_COMPLIANCE]: ['safety'],
    [RESEARCH_INTENTS.DECISION_VALIDATION]: ['pricing', 'quantity'],
  };
  // Filter templates by intent-mapped gapTypes
}
```

**In AdminConsole:**
```javascript
// Old (field-type based)
const suggestedTemplates = CAMPAIGN_TEMPLATES.filter(t => 
  t.gapTypes?.includes(gap.type)
);

// New (intent-based)
const suggestedTemplates = getTemplatesForIntent(
  getResearchIntent(gap), 
  CAMPAIGN_TEMPLATES
);
```

---

## Next Steps

1. **Add more intents** as you discover new question patterns
2. **Update playbooks** to declare `researchIntent` for gaps that need it
3. **Create targeted templates** for each intent (sample templates already exist)
4. **Validate intent-to-provider mapping** with real research campaigns

---

## Files Changed

- `/src/lib/knowledge/playbookSchema.js` — Added intent routing functions
- `/src/lib/knowledge/campaignTemplates.js` — Added vendor-capability-sourcing template
- `/src/admin/AdminConsole.jsx` — Updated to use intent-based routing
- `/src/lib/playbooks/data/backyardBbq.js` — Example of vendor-capability intent
