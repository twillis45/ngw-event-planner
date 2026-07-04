# Research Questions — Making Evidence Relevant

## The Problem You Identified

**Gap:** "heat level" (for steaming crabs)

**Evidence returned:**
- Crab pricing by size
- Seasonality months
- Storage temperature for food facilities
- Retail pricing surveys
- Wholesale pricing
- Community vendor opinions

**Result:** "6 evidence items but 0 answer the question"

The system was collecting generic "crab information" instead of answering the specific question: **"What temperature should water be for steaming crabs?"**

## The Solution: Research Questions

Every gap has a **specific research question** that providers must answer.

### Gap: "heat level"

| Field | Value |
|-------|-------|
| **Gap** | heat level (for steaming) |
| **Research Question** | "What is the optimal temperature or heat level for steaming crabs?" |
| **Context** | Used to ensure proper cooking or safety |
| **Keywords to look for** | temperature, heat, cooking, steam, boil, degrees |
| **Ideal providers** | Food Safety, Government, Academic |
| **Details needed** | Specific temperature in °F/°C, safe range, duration, how to measure |

### Gap: "steam_vs_order" (cost factor)

| Field | Value |
|-------|-------|
| **Gap** | steam vs order (cost comparison) |
| **Research Question** | "What is the typical cost or price range for steaming your own vs. ordering steamed crabs?" |
| **Context** | Used to estimate event budget impact |
| **Keywords to look for** | cost, price, budget, expense, markup, savings |
| **Ideal providers** | Commercial, Industry, Government |
| **Details needed** | DIY cost vs. house cost, markup percentage, bulk pricing, seasonal variation |

## How Evidence Gets Scored for Relevance

```javascript
import { scoreRelevance } from '../lib/knowledge/researchQuestion';

const evidence = {
  source: 'USDA Market News',
  statement: 'Large blue crabs cost $7.92 per dozen',
  extractedFacts: [...]
};

const researchQuestion = {
  question: 'What is the optimal temperature for steaming crabs?',
  keywords: ['temperature', 'heat', 'cooking', 'steam', 'degrees'],
  details: ['Specific temperature', 'Safe range', 'Duration', 'How to measure']
};

const relevance = scoreRelevance(evidence, researchQuestion);
// Returns: {
//   score: 0,
//   relevance: 'unrelated',
//   keywordMatches: 0,
//   detailMatches: 0,
//   relevantFactCount: 0
// }
```

## Relevance Categories

### ✅ DIRECT (Score 70-100)
Evidence **directly answers** the research question.

```
Research Question: "What temperature for steaming?"
Evidence: "FDA guideline: Steam at 212°F for 20 minutes"
Relevance: DIRECT ✅
Matched: temperature (keyword), 212°F (specific value), duration (detail)
```

### ◐ RELATED (Score 40-69)
Evidence is **somewhat relevant** but incomplete.

```
Research Question: "What temperature for steaming?"
Evidence: "Proper food storage requires <40°F refrigeration"
Relevance: RELATED ◐
Issue: Talks about temperature but for storage, not cooking
Matched: temperature (keyword), but wrong context
```

### ⊘ TANGENTIAL (Score 20-39)
Evidence mentions the **topic but not the specific need**.

```
Research Question: "What temperature for steaming?"
Evidence: "Peak crab season is June-September when supply is high"
Relevance: TANGENTIAL ⊘
Issue: About crabs but nothing about heat/temperature
Matched: Some general crab information, nothing specific
```

### ✕ UNRELATED (Score 0-19)
Evidence **doesn't answer the question** at all.

```
Research Question: "What temperature for steaming?"
Evidence: "Market prices vary: mediums $6.17, larges $7.92, jumbos $14.58"
Relevance: UNRELATED ✕
Issue: Completely different topic (pricing, not cooking)
Matched: Nothing related to the research question
```

## What Users Now See

### Before
```
Finding: insufficient
💡 Research complete: 6 evidence items
```

### After
```
🔍 Research Question
"What is the optimal temperature or heat level for steaming crabs?"

Looking for: Specific temperature in Fahrenheit or Celsius • Safe temperature range • Time duration at temperature • How to measure/monitor

Evidence breakdown:
  0 direct, 1 related, 2 tangential, 3 unrelated

✕ INSUFFICIENT — Not enough valid evidence

Gap: "heat level"

Why:
  1. Evidence doesn't address the gap: Got 6 items but only 0-1 directly answer "What temperature?"
  2. Evidence is about pricing and seasonality — not cooking temperature
  3. Wrong provider families for this question

Still needed:
  • Evidence directly relevant to cooking temperature
  • Food safety temperature specifications
  • Cooking time/duration guidance

Next steps:
  1. Identify providers that specialize in food safety & cooking
  2. Try running with: Food Safety, Government, Academic
  3. Ask more specific: "What temperature for steaming crabs?"
  4. Look for: FDA cooking guidelines, USDA recommendations, chef resources

→ Run another research campaign with better providers
```

## Research Question Templates

Each gap type has templates built in:

| Gap Type | Research Question | Best Providers |
|----------|-------------------|-----------------|
| **cost-factor** | "What is the typical cost or price range for {item}?" | Commercial, Industry, Government |
| **heat-level** | "What is the optimal temperature or heat level for {item}?" | Food Safety, Government, Academic |
| **storage** | "What are the proper storage conditions for {item}?" | Food Safety, Government, Academic |
| **seasonality** | "When is {item} in season or readily available?" | Government, Industry, Academic |
| **timing** | "How long does {item} take to prepare or execute?" | Industry, Commercial, Community |
| **difficulty** | "How difficult is {item} to prepare or execute?" | Community, Industry, Academic |

## Why This Fixes the Problem

### Before (Broken)
1. Gap identified: "heat level"
2. Campaign launched with: All providers
3. Providers asked: (nothing specific — just return data)
4. Evidence collected: Whatever providers happen to have
5. Result: Pricing, seasonality, storage — anything but temperature
6. Finding: "insufficient" (with no explanation)

### After (Fixed)
1. Gap identified: "heat level"
2. Research question generated: "What temperature for steaming?"
3. Campaign launched with: Food Safety, Government, Academic (specialists)
4. Providers asked: (specific question about cooking temperature)
5. Evidence collected: Filtered for relevance to temperature
6. Finding: "Direct evidence: 0, Related: 1, Tangential: 2, Unrelated: 3"
7. Explanation: "0 of 6 directly answer the question. Got pricing/seasonality instead."

## Implementation in Campaign

```javascript
// When launching a campaign
const gap = { id: 'heat_level', type: 'heat-level', label: 'Steam temperature' };

// Generate what we're researching
const researchQuestion = generateResearchQuestion(gap, playbook);
// {
//   question: "What is the optimal temperature or heat level for steaming crabs?",
//   keywords: ['temperature', 'heat', 'cooking', 'steam', 'degrees'],
//   providers: ['Food Safety', 'Government', 'Academic'],
//   details: ['Specific temperature', 'Safe range', 'Duration', 'How to measure']
// }

// When evidence arrives, categorize by relevance
const categorized = categorizeEvidenceRelevance(evidence, researchQuestion);
// {
//   direct: [evidence that answers the question],
//   related: [somewhat relevant evidence],
//   tangential: [mentions the topic],
//   unrelated: [completely different]
// }

// Use relevance in finding analysis
if (categorized.direct.length === 0) {
  finding = 'insufficient';
  explanation = 'Evidence does not address the research question';
}
```

## Next Steps

When you see "Finding: insufficient", now you know:

1. ✅ **What was being researched** (the research question)
2. ✅ **How much evidence was relevant** (0 direct, 1 related, 3 unrelated)
3. ✅ **Why it's insufficient** (Got wrong type of evidence)
4. ✅ **What to do next** (Use better providers, ask more specific questions)

Instead of:
```
Finding: insufficient
```

You now understand:
```
"We asked 'What temperature for steaming?'
Got: 3 pricing articles, 2 seasonality articles, 1 storage article
Needed: Food Safety or Government sources with cooking guidelines"
```

This transforms an incomplete message into actionable intelligence.
