# NGW Event Planner — Project Catch-Up Prompt

Use this prompt to brief a new engineer or AI assistant on the current state of the project.

---

## Copy this entire section and paste it into your AI assistant:

---

You are working on **NGW Event Planner**, a premium event operations command system for event professionals.

### 1. THE VISION

**What it is:** A research-driven event planning system that uses playbooks (templates) to guide event decisions, then runs research campaigns to ground those decisions in real market data.

**Why it matters:** Event planners make decisions without evidence (How much does food cost? Who can cater? Is this safe?). NGW researches these questions using provider networks (market pricing, catering networks, industry standards, community forums, government data, etc.) to surface authoritative answers.

**Core principle:** "Zero friction" — the system should surface exactly what the planner needs, when they need it, without guesswork or generic advice.

### 2. THE ARCHITECTURE — 4 Layers

```
L1 Studio (home) → What needs attention across my business?
    ↓
L2 Portfolio (events list) → Which event do I work on next?
    ↓
L3 Event Command (triage) → What needs attention in THIS event?
    ↓
L4 Specialist Tabs → Now I'm fixing the thing (vendors, timeline, budget, etc.)
```

**Non-negotiable rule:** Each layer hands off to the next. Do not duplicate work across layers. Do not create overlapping surfaces.

### 3. THE PLAYBOOK SYSTEM

A **playbook** is an event type template (Crab Feast, Get-Together, Birthday, Wedding, etc.) containing:

- **Decisions**: "Who handles the food?" "Steam yourself or order steamed?" with cost factors for each option
- **Milestones & Tasks**: Day-of sequence
- **Purchases**: What to buy, quantities per guest, unit costs
- **Risks & Mitigations**: What can go wrong

**Key insight:** Every decision can have a `costFactorProvenance` field that declares what KIND of research is needed:
```javascript
costFactorProvenance: {
  researchIntent: 'vendor-capability',  // or 'cost-verification', 'quantity-validation', etc.
  verificationStatus: 'synthesized',     // or 'researched', 'published', 'verified'
  confidence: 'medium',
  note: 'Research needed...'
}
```

### 4. THE RESEARCH CAMPAIGN SYSTEM

**Problem solved:** Research questions were hardcoded (wrong approach). "Heat level" meant temperature in a steaming context, but the same term in a different playbook meant seasoning spice—and the hardcoded template couldn't adapt.

**Solution:** Playbook gap definitions drive the research. The system detects gaps where `verificationStatus === 'synthesized'`, generates research questions dynamically from the gap definition, launches campaigns to providers, collects evidence, analyzes findings, and accepts/merges high-confidence results back into the playbook.

### 5. THE RESEARCH INTENT PIPELINE (CRITICAL ARCHITECTURE)

Different questions require different providers and workflows. We don't guess—we ask the playbook: "What are we actually researching?"

#### 5 Research Intents:

| Intent | Question | Providers | When |
|---|---|---|---|
| **cost-verification** | "Does hiring cost 40% more?" | Market pricing, retail | Verifying cost multipliers |
| **vendor-capability** | "Who can do this? What can they do?" | Catering networks, industry assoc | Finding & evaluating vendors |
| **quantity-validation** | "Is 0.5 lb/guest right?" | Hospitality assoc, catering network | Industry norms |
| **safety-compliance** | "What temperature to cook?" | FDA/USDA, food safety SME | Safety & legal |
| **decision-validation** | "What do successful events do?" | Community forums, planners | Real-world practices |

**How playbooks declare intent:**
```javascript
costFactorProvenance: {
  researchIntent: 'vendor-capability',  // ← THIS drives template selection
  verificationStatus: 'synthesized'
}
```

**When research completes:** Template selection uses intent, not field type → right providers → right workflow.

### 6. ARCHITECTURE PRINCIPLES — "NO HARDCODING"

**The rule:** Single sources of truth. No hardcoded templates, no inferred rules, no guessing from field names.

**What was wrong:**
- Hardcoded template: `RESEARCH_TEMPLATES = { 'heat-level': {...} }` — assumed heat level means temperature
- Hardcoded inference: `if (text.includes('temperature')) { addProvider('Food Safety') }` — assumed all temperature questions are safety
- Hardcoded field types: gaps set `type: 'costFactor'` but templates expected `'cost-factor'` (mismatch)

**What's right:**
- **Single source of truth:** The playbook gap definition declares what it needs
- **Generic engine:** System reads the declaration and routes accordingly
- **No special cases:** "Crawfish boil heat level" (seasoning) and "steaming heat level" (temperature) each get the right research path because they declare their intent

**Applied fixes:**
- `playbookSchema.js`: Unified field types to hyphenated (`'cost-factor'` not `'costFactor'`)
- `researchQuestion.js`: Refactored to derive questions from gap definitions, not templates
- `campaignTemplates.js`: Added intent-based routing (`gapTypes: ['vendor-capability']`)

### 7. GAP DETECTION

A **gap** is a decision whose cost factors need research:

```javascript
// Detected as a gap because:
// 1. Has costFactors defined
// 2. Has costFactorProvenance.verificationStatus === 'synthesized'
{
  id: 'food_style',
  label: 'Who handles the food?',
  costFactors: { 'Hire a pitmaster': 1.4, ... },
  costFactorProvenance: {
    researchIntent: 'vendor-capability',
    verificationStatus: 'synthesized'  // ← This triggers detection
  }
}
```

**detectGapsInPlaybook()** scans a playbook's decisions and returns all gaps ready for research.

### 8. THE WORKFLOW

```
Select Playbook
    ↓
Detect Gaps (decisions with synthesized verificationStatus)
    ↓
Select Gap(s) to research
    ├─ Single gap → template selection → provider selection → launch
    └─ Multiple gaps → batch provider selection → launch all
    ↓
Campaign runs, collects evidence from providers
    ↓
Findings analyzed:
    - Sufficient? (≥3 sources, unanimous or all high-confidence)
    - Proposed? (2 sources, some agreement)
    - Insufficient? (not enough or wrong type of evidence)
    - Conflicted? (sources disagree)
    - Inconclusive? (mixed signals)
    ↓
High-confidence findings auto-accept → update playbook
Medium-confidence findings show for manual review
    ↓
User accepts/rejects → playbook updated with researched data
    ↓
Playbook decision now marked:
    verificationStatus: 'researched'
    confidence: 'high'
    sources: [list of evidence]
    researchedAt: timestamp
```

### 9. CURRENT STATE (AS OF 2026-07-03)

✅ **Working:**
- Playbook system with decisions, milestones, purchases
- Gap detection from playbook definitions
- Campaign templates for different research types
- Research question generation from gap definitions (not hardcoded)
- Evidence collection from provider networks
- Finding analysis (sufficient/proposed/insufficient/conflicted/inconclusive)
- Finding explanations (why this status, what's missing, next steps)
- Evidence relevance scoring against research questions
- Auto-accept for high-confidence findings
- Data quality tracking (connection status, freshness, completeness)
- Research intent pipeline (cost-verification, vendor-capability, etc.)
- Batch campaign closure (research multiple gaps in one workflow)
- Single-gap workflow (template → providers → launch)

⚠️ **In Progress:**
- Acceptance tracking log (which findings were accepted, when, by whom)
- Playbook merge/update (accept findings and persist changes)
- Audit trail (what changed in playbooks due to research)
- Conflict resolution UI (when sources disagree)

❌ **Not Yet:**
- Provider implementation (currently stubbed/mocked)
- Evidence persistence (currently in-memory)
- Playbook versioning (track changes over time)
- Research campaign scheduling (recurring research for freshness)
- Integration with event creation (link campaign results to event costs)
- Team collaboration features

### 10. KEY FILES & THEIR ROLES

| File | Role |
|---|---|
| `playbookSchema.js` | Single source of truth for playbook structure, gap detection, research intent routing |
| `campaignTemplates.js` | Reusable campaign patterns (cost-factor-grounding, vendor-capability-sourcing, etc.) |
| `researchQuestion.js` | Generate research questions FROM gap definitions (not templates) |
| `findingAnalysis.js` | Analyze findings (status, why, what's missing, next steps) |
| `dataQuality.js` | Track evidence quality (connection status, freshness, completeness) |
| `consensusResolver.js` | Multi-strategy conflict resolution (authority, confidence, majority, average) |
| `AdminConsole.jsx` | Campaign research UI (select playbook → gaps → campaign → results) |
| `backyardBbq.js` | Example playbook with `researchIntent: 'vendor-capability'` |

### 11. WHAT YOU NEED TO KNOW TO CONTRIBUTE

**Do this:**
- Read the playbook schema before editing playbooks
- Use `researchIntent` to declare what research is needed
- Check `playbookSchema.js` for gap detection rules
- Test with multiple playbooks (Crab Feast, Get-Together, Birthday) to ensure no hardcoding
- Verify high-confidence findings auto-accept without manual review

**Don't do this:**
- Hardcode templates based on gap label/type
- Infer providers from string-matching decision names
- Add special-case logic for "heat level" or "cost factor"
- Create parallel playbook structures

**Key principle:**
Single source of truth. The playbook gap definition is the authority. The engine is generic.

### 12. RECENT FIXES (Sprint 46+)

1. **Fixed field type naming** (camelCase → hyphenated)
   - Was: `COST_FACTOR = 'costFactor'`
   - Now: `COST_FACTOR = 'cost-factor'`
   - Why: Campaign templates expected hyphenated gapTypes

2. **Fixed single-gap workflow**
   - Was: Button appeared only when multiple gaps selected
   - Now: Single gap routes to template selection workflow

3. **Added missing costFactorProvenance**
   - Fixed 6 playbooks (graduation, ethiopianCoffeeCeremony, fishFry, juneteenthCookout, lowCountryBoil, pupusaGathering)
   - Each decision with costFactors now has costFactorProvenance

4. **Created research intent pipeline**
   - Added `researchIntent` field to costFactorProvenance
   - Implemented intent-based template routing
   - Added vendor-capability-sourcing template
   - Example: backyardBbq "Who handles the food?" marked as vendor-capability

### 13. COMMON QUESTIONS

**Q: Why do gaps need `costFactorProvenance.researchIntent`?**
A: Different questions need different approaches. "Does it cost more?" routes to market pricing. "Who can do it?" routes to vendor networks. The intent tells the system which workflow to use.

**Q: What if a playbook doesn't declare researchIntent?**
A: System defaults to 'cost-verification' (backward compatible). But you should declare it explicitly for clarity.

**Q: How do I add a new research intent?**
A: Add to `RESEARCH_INTENTS` in playbookSchema.js, create a new campaign template in campaignTemplates.js, add the intent-to-providers mapping in getTemplatesForIntent().

**Q: What makes a finding "high-confidence enough to auto-accept"?**
A: Unanimous agreement across all sources OR all sources have high confidence rating. See `consensusResolver.js` shouldAutoAcceptConsensus().

**Q: When should I add researchIntent vs. leaving it blank?**
A: Always declare it. It documents intent clearly and routes to the right providers. Blank defaults to cost-verification, but that might not be what you're researching.

### 14. NEXT PRIORITY

1. **Acceptance tracking & audit trail** — Know what research changed the playbook
2. **Playbook merge workflow** — Actually persist findings back to playbooks
3. **Conflict resolution UI** — When sources disagree, let users resolve
4. **Provider stubs → real implementation** — Replace mock providers with real APIs
5. **Research persistence** — Save campaigns and findings to database

---

## END CATCH-UP PROMPT

---

## How to Use This Prompt

**For new contributors:**
1. Copy the prompt (everything between the lines above)
2. Paste it into Claude, ChatGPT, or your AI assistant
3. Ask questions about the parts you don't understand
4. Refer back to specific sections as you work

**For handoff between sessions:**
1. Update the "CURRENT STATE" section with latest status
2. Update "RECENT FIXES" with this week's changes
3. Send to the next engineer working on the project

**For context in conversations:**
- Start with: "I'm working on NGW Event Planner. Here's the project context: [paste prompt]"
- Then ask your specific question
- The AI will have full context and can provide better guidance
