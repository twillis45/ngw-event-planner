# Data Quality & Connection Status Standards

## Overview

Every piece of evidence collected from providers includes comprehensive metadata about:
- **Connection Status** — Was the request successful?
- **Data Freshness** — How old is the information?
- **Completeness** — How much data was returned?
- **Quality Score** — Overall trustworthiness (0-100)

This prevents using stale, incomplete, or failed data without knowing it.

## Connection Status

### SUCCESS ✓
Everything worked perfectly.
```
Status: success
Issue: null
Response: 200 OK
Data: Complete results returned
```

### PARTIAL ◐
Connected and got some data, but with warnings.
```
Status: partial
Issue: "Limited results (3 items)"
Response: 200 OK but incomplete
Data: Some fields missing or partial results
```

### EMPTY ⊘
Connected successfully but no matching results.
```
Status: empty
Issue: "No results found for query"
Response: 200 OK
Data: Empty dataset, not an error
```

### TIMEOUT ⏱
Request took too long (>30s typically).
```
Status: timeout
Issue: "Provider timeout (35000ms)"
Response: 408 or 504
Data: Partial or none
```

### ERROR ✕
Something went wrong on provider side.
```
Status: error
Issue: "Server error: 500 Internal Server Error"
Response: 5xx
Data: None
```

### OFFLINE ✕
Provider is unreachable.
```
Status: offline
Issue: "Provider is offline or unavailable"
Response: 503 Service Unavailable
Data: None
```

### UNSUPPORTED ⊘
Provider doesn't support this query type.
```
Status: unsupported
Issue: "Provider does not support this query type"
Response: 405 Method Not Allowed
Data: None
```

## Data Freshness

| Level | Age | Use Case | Color |
|-------|-----|----------|-------|
| **CURRENT** | ≤1 day | Actively trading prices, real-time data | 🟢 Green |
| **RECENT** | 2-7 days | Weekly updates, market snapshots | 🟢 Green |
| **AGED** | 1-4 weeks | Monthly data, seasonal variations | 🟡 Yellow |
| **STALE** | >1 month | Reference data, historical context | 🟠 Orange |
| **ARCHIVED** | >6 months | Historical only, not for decisions | ⚫ Gray |

### Example: Crab Price

```
Evidence 1: Price from Fish Market
  Freshness: CURRENT (fetched today)
  Data Date: 2026-07-03
  ✅ Can use for decision

Evidence 2: Historical Pricing Study
  Freshness: STALE (study from May 2026)
  Data Date: 2026-05-15
  ⚠️ Use for context only, not as primary
```

## Completeness Levels

| Level | % of Fields | Example | Trust |
|-------|-------------|---------|-------|
| **COMPLETE** | ≥90% | 5/5 fields returned | ✅ High |
| **PARTIAL** | 70-89% | 4/5 fields returned | ⚠️ Medium |
| **SPARSE** | 30-69% | 2/5 fields returned | ⚠️ Low |
| **MINIMAL** | <30% | 1/5 fields returned | ❌ Very Low |

### Example: Crab Pricing Query

```
Expected fields:
  1. Price (per dozen)
  2. Size grade
  3. Availability
  4. Seasonal notes
  5. Source/vendor

Evidence: Government Study
  Returned: price, size_grade, seasonal_notes
  Completeness: 3/5 = PARTIAL (60%)
  Missing: availability, vendor info
  Status: Can use but incomplete
```

## Quality Score (0-100)

Composite score combining connection, freshness, completeness, and extracted facts.

```
Score 80-100 | Excellent ✨
  • Connection: SUCCESS
  • Freshness: CURRENT or RECENT
  • Completeness: COMPLETE
  • Facts: 3+ extracted
  ✅ Use for decision-making

Score 60-79 | Good ✓
  • Connection: SUCCESS
  • Freshness: AGED or better
  • Completeness: PARTIAL or better
  • Facts: 2-3 extracted
  ⚠️ Can use with review

Score 40-59 | Fair ◐
  • Connection: PARTIAL or SUCCESS
  • Freshness: STALE possible
  • Completeness: SPARSE
  • Facts: 1-2 extracted
  ⚠️ Corroborate with other sources

Score 20-39 | Poor ⚠️
  • Connection: EMPTY or ERROR possible
  • Freshness: STALE or ARCHIVED
  • Completeness: MINIMAL
  • Facts: 0-1 extracted
  ❌ Don't use alone

Score 0-19 | Insufficient ✕
  • Connection: ERROR or OFFLINE
  • Completeness: MINIMAL
  • Facts: 0 extracted
  ❌ Cannot use
```

## Quality Issues & Warnings

The UI automatically flags when evidence has problems:

### Data Quality Issue Examples

```
Evidence: Academic Study from 2024
Issues:
  ⚠️ Data is stale (2024-11-15) — reference only
  ⚠️ Only 2 fields returned (incomplete)

Evidence: Provider Timeout
Issues:
  ⚠️ Connection: Provider timeout (32000ms)
  ⚠️ No results returned

Evidence: Empty Result Set
Issues:
  ⚠️ Connection: Connected but no data returned
  ⚠️ No results found for query
```

## How to Provide Connection Status

When implementing a provider, include connection metadata:

```javascript
// In provider integration
const result = await fetchFromProvider(query);

// ALWAYS return this metadata:
const evidence = {
  source: 'Fish Market API',
  statement: 'Blue crabs: Large size $8.50/dozen',
  extractedFacts: [
    { fact: 'crab_price', value: 8.50, confidence: 'high' },
    { fact: 'crab_size', value: 'large', confidence: 'high' }
  ],
  // CONNECTION STATUS (critical!)
  connectionStatus: {
    provider: 'fish-market-api',
    status: 'success',                    // or empty, error, timeout, etc.
    success: true,                        // true/false
    dataDate: '2026-07-03',              // when was this data from?
    freshness: 'current',                 // current, recent, aged, stale, archived
    completeness: 'complete',             // complete, partial, sparse, minimal
    resultCount: 12,                      // how many results?
    fieldCount: 2,                        // how many fields extracted?
    responseTime: 245,                    // milliseconds
    statusCode: 200,                      // HTTP code
    issue: null                           // null if success, error message if not
  }
};
```

## UI Indicators

In Campaign Research results, each evidence item shows:

```
📌 Fish Market API
  ✓ 2 facts | ✓ success | ⏱ current

Data Quality Issues:
  ⚠️ Only 2 fields returned (incomplete)
  (shows if there are problems)

"Blue crabs by the dozen run $8.50/large..."

Extracted facts:
  • crab_price: $8.50 (high confidence)
  • crab_size: "large" (high confidence)
```

## Decision Rules

### When to Auto-Accept
- Quality score ≥ 70
- Connection: SUCCESS
- Freshness: CURRENT or RECENT
- Completeness: COMPLETE or PARTIAL
- No quality issues

### When to Require Review
- Quality score 40-69
- Freshness: AGED
- Completeness: SPARSE
- Some quality issues present

### When to Reject
- Quality score < 40
- Connection: ERROR, OFFLINE, EMPTY
- Freshness: STALE or ARCHIVED
- Completeness: MINIMAL
- Multiple quality issues

## Testing Data Quality

```javascript
import { 
  calculateEvidenceQualityScore,
  recommendEvidenceUsage 
} from '../lib/knowledge/dataQuality';

const evidence = {
  extractedFacts: [{ fact: 'price', value: 8.50 }],
  connectionStatus: {
    status: 'success',
    freshness: 'current',
    completeness: 'complete',
    resultCount: 12
  }
};

const score = calculateEvidenceQualityScore(evidence);
// Returns: 85

const recommendation = recommendEvidenceUsage(evidence);
// Returns: {
//   score: 85,
//   quality: 'excellent',
//   canUse: true,
//   shouldAutoAccept: true,
//   reasons: []
// }
```

## Best Practices

✅ **DO**
- Always include connection metadata with evidence
- Check freshness before using historical data
- Corroborate sparse/incomplete evidence
- Show users why evidence was rejected
- Auto-accept only high-quality consensus

❌ **DON'T**
- Use data without knowing connection status
- Trust stale data without noting the age
- Silently skip failed connections
- Mix data quality levels without explanation
- Auto-accept low-confidence findings

## Related Files

- `dataQuality.js` — Scoring and assessment functions
- `AdminConsole.jsx` — UI display of quality indicators
- `consensusResolver.js` — Uses quality scores for conflict resolution
- Campaign.js — Passes connectionStatus with evidence
