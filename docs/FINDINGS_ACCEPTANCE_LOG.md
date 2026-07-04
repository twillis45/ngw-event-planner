# Findings Acceptance Log — Tracking Research Impact

## Overview

When a research campaign completes, findings must be explicitly **accepted** before they update the playbook. This log tracks:
- ✓ What findings were accepted
- 🔍 Why they were accepted (confidence, evidence count, source quality)
- 📝 What changed in the playbook
- 👤 Who accepted them (timestamp, user context)
- 🔄 When they were superseded or revised

---

## Finding Status → Acceptance Logic

| Finding Status | Auto-Accept? | Requires Review? | Next Action |
|---|---|---|---|
| **✅ SUFFICIENT** | ✓ Yes (if all evidence is high-confidence) | No | Apply to playbook automatically |
| **◐ PROPOSED** | ✗ No | Yes | User reviews, then accepts or rejects |
| **❓ INCONCLUSIVE** | ✗ No | Yes | Request more research or manual decision |
| **⚠️ CONFLICTED** | ✗ No | Yes | Resolve conflict using consensus rules |
| **✕ INSUFFICIENT** | ✗ No | Yes | Cannot accept (need more research) |

---

## Acceptance Record Format

Each accepted finding is logged with:

```javascript
{
  findingId: 'crabFeast_steam_vs_order_001',
  gapId: 'steam_vs_order',
  playbook: 'Crab Feast',
  status: 'sufficient',
  acceptedAt: '2026-07-03T14:32:00Z',
  acceptedBy: 'user_session_id', // or 'auto' for high-confidence auto-accept
  
  // What was researched
  researchIntent: 'cost-verification',
  researchQuestion: 'What is the typical cost or price range for steaming your own vs. ordering steamed crabs?',
  
  // Confidence metrics
  evidence: {
    count: 6,
    direct: 3,
    related: 2,
    tangential: 1,
    sources: ['crabhouse_quote_1', 'wholesale_price_2', 'forum_anecdote_3', ...],
    quality: {
      average: 0.82,  // 0-1 scale
      freshness: 'current',
      completeness: 'comprehensive'
    }
  },
  
  // What was proposed as the finding
  proposedValue: 0.85,
  proposedNote: 'DIY steaming saves ~15% vs crab-house pickup (propane/pot offset by no steaming markup)',
  
  // What changed in the playbook
  playbookChanges: {
    field: 'decisions[steam_vs_order].costFactors.DIY',
    oldValue: undefined,
    newValue: 0.85,
    provenanceUpdated: {
      verificationStatus: 'researched',
      confidence: 'high',
      sources: ['crabhouse_quote_1', 'wholesale_price_2'],
      researchedAt: '2026-07-03'
    }
  },
  
  // Audit trail
  conflictResolution: null,  // or { strategy: 'authority', winner: 'value', reason: '...' }
  notes: 'Three crab houses quoted ~$15-18/dozen steamed; retail crab $12-14/dozen + ~$2 propane.'
}
```

---

## Auto-Accept Criteria

High-confidence findings are **automatically accepted** without manual review:

### ✅ Auto-Accept If
1. **Unanimous agreement**: All sources report the same value/fact
   - Example: 10 sources all say "steam at 212°F"
   
2. **All high-confidence sources**: Every source that proposed a value is high-confidence
   - Example: 3 sources all "high-confidence", all propose same value
   
3. **Consensus threshold exceeded**: 80%+ of sources agree on the value
   - Example: 8 of 10 sources say cost factor is 1.4, rest say 1.35
   
### ⚠️ Requires Manual Review If
- Sources conflict (some say 1.4, others say 1.5)
- Only medium-confidence sources agree
- Limited source count (only 1-2 sources)
- Wide variance in values (1.2 to 1.6 range)

---

## Acceptance Workflow

### Single Finding
```
Research complete
    ↓
Analyze finding quality
    ↓
Is it SUFFICIENT + unanimous/all-high-confidence?
    ├─ YES → Auto-accept → Update playbook → Log acceptance
    └─ NO → Show in review panel → User decides
              ├─ Accept → Update playbook → Log acceptance
              ├─ Reject → Do not update → Log rejection
              └─ Request more → Propose new campaign → Log deferred
```

### Batch Campaign (Multiple Gaps)
```
All gaps researched
    ↓
Group findings by acceptance status
    ├─ SUFFICIENT + high-confidence → Auto-accept all
    ├─ PROPOSED/CONFLICTED → Show review panel
    └─ INSUFFICIENT → Cannot accept
    ↓
User reviews + accepts/rejects in batch
    ↓
Update playbook with accepted findings
    ↓
Log all acceptances + rejections
```

---

## Acceptance Log View (UI)

When viewing research results, the acceptance section shows:

```
ACCEPTANCE STATUS
─────────────────
Finding: steam_vs_order cost factor

Status: ✅ SUFFICIENT (auto-accepted)
Confidence: High (unanimous: 3 sources, all agree on 0.85)
Accepted at: 2026-07-03 14:32 UTC
Auto-accepted: Yes (all sources high-confidence)

WHAT CHANGED:
  decisions[steam_vs_order].costFactors['DIY']
    Before: —
    After: 0.85
  
  decisions[steam_vs_order].costFactorProvenance
    verificationStatus: synthesized → researched
    confidence: medium → high
    sources: [added 3 sources]
    researchedAt: 2026-07-03

EVIDENCE USED:
  ✓ Crab House Quote #1 — "DIY saves ~$2-3 per dozen" (high-confidence)
  ✓ Wholesale Comparison — "DIY is ~0.85x house cost" (high-confidence)
  ✓ Forum Post — "Saved maybe 15% on crab, spent $20 propane" (medium-confidence)

NEXT:
  → View other findings
  → Commit changes to playbook
  → Create new campaign for related gap
```

---

## Acceptance Log Entry (Admin View)

The admin console shows a log of all acceptance decisions:

| Timestamp | Playbook | Gap | Status | Accepted By | Action | Sources | Notes |
|---|---|---|---|---|---|---|---|
| 2026-07-03 14:32 | Crab Feast | steam_vs_order | ✅ SUFFICIENT | auto | Create | crabhouse_1, wholesale_2 | 3/3 sources agree: 0.85 |
| 2026-07-03 14:28 | Crab Feast | crab_size | ◐ PROPOSED | user_click | Accept | pricing_1, pricing_2 | 2 sources, user confident |
| 2026-07-03 14:20 | Crab Feast | where_buy | ⚠️ CONFLICTED | pending | — | venue_1, forum_2 | Sources disagree: 0.85 vs 1.1 |
| 2026-07-02 18:45 | Get-Together | food_style | ✕ INSUFFICIENT | — | Reject | (none direct) | 0 direct evidence, need vendor search |

---

## Playbook Update Workflow

### Before
```javascript
decisions[steam_vs_order].costFactorProvenance: {
  verificationStatus: 'synthesized',  // ← Needs research
  confidence: 'medium',
  note: 'Heuristic: DIY steaming saves ~15%...'
}
```

### After Acceptance
```javascript
decisions[steam_vs_order].costFactorProvenance: {
  verificationStatus: 'researched',   // ← Updated
  confidence: 'high',                  // ← Upgraded
  sources: [                           // ← Added evidence sources
    'crabhouse_quote_dmv_2026_07',
    'wholesale_pricing_comparison_2026_07',
    'forum_consensus_crab_chat_2026_07'
  ],
  researchedAt: '2026-07-03',         // ← When
  researchCampaignId: 'camp_001_batch_3',  // ← Which campaign
  acceptanceNote: 'Unanimous: 3 independent sources all confirm ~0.85 cost factor for DIY vs house steaming.'
}
```

---

## Conflicted Finding Resolution

When sources disagree, the acceptance process uses **consensus resolution**:

```javascript
{
  findingId: 'get_together_food_style_conflicted',
  status: 'conflicted',
  proposedValues: [
    { value: 1.4, sources: 2, confidence: 'high', reason: 'Commercial pitmaster quotes' },
    { value: 1.2, sources: 1, confidence: 'medium', reason: 'Forum anecdote' }
  ],
  
  // Resolution strategy applied
  resolution: {
    strategy: 'authority-ranking',  // or 'confidence-weighted', 'majority', 'average'
    winner: 1.4,
    reasoning: 'Commercial sources (authority > forum) and higher confidence, so 1.4 wins',
    userOverride: null  // User can override auto-resolution
  },
  
  acceptedValue: 1.4,
  acceptanceNote: 'Resolved conflict: 2 commercial quotes (1.4) have higher authority than 1 forum post (1.2)'
}
```

---

## Query the Acceptance Log

**Get all findings accepted in last 7 days:**
```javascript
const recentAcceptances = acceptanceLog.filter(entry =>
  entry.acceptedAt > (now - 7 * 24 * 60 * 60 * 1000) &&
  entry.action === 'Accept'
);
// Returns: [finding_1, finding_2, ...]
```

**Get all auto-accepted findings:**
```javascript
const autoAccepted = acceptanceLog.filter(entry =>
  entry.acceptedBy === 'auto'
);
// Auto-accepted 12, manually accepted 3, rejected 1
```

**Get all conflicted findings and how they were resolved:**
```javascript
const resolved = acceptanceLog.filter(entry =>
  entry.status === 'conflicted' && entry.action !== 'Pending'
);
// Shows which conflicts were resolved, when, and how
```

---

## Implementation

### Files to Create/Update
- `lib/knowledge/acceptanceLog.js` — Log creation, querying, storage
- `admin/AdminConsole.jsx` — Display acceptance status, accept/reject buttons, log viewer
- `docs/FINDINGS_ACCEPTANCE_LOG.md` — This documentation

### Data Storage
```javascript
// In-memory during session (can be persisted to localStorage/backend)
const acceptanceLog = [
  { findingId, gapId, playbook, status, acceptedAt, acceptedBy, ... },
  // ...
];
```

### Auto-Accept Trigger
```javascript
// When research completes
if (finding.status === 'sufficient' && isHighConfidenceConsensus(finding)) {
  // Auto-accept
  acceptFinding(finding, 'auto');
  updatePlaybook(finding);
  logAcceptance(finding, 'auto');
} else {
  // Show for manual review
  showAcceptancePanel(finding);
}
```

---

## Next Steps

1. Implement `acceptanceLog.js` with CRUD operations
2. Add acceptance UI panel to AdminConsole
3. Add auto-accept logic for high-confidence findings
4. Track what changes in the playbook when findings are accepted
5. Export acceptance log for audit/reporting
