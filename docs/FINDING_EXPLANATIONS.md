# Finding Explanations — Why Evidence Is Sufficient/Insufficient

## Problem Solved

**Before:** "Finding: insufficient" — with no explanation of what's missing or what to do.

**After:** Detailed explanation of:
- ✅ Why the finding has this status
- ❌ What information is still needed
- 🎯 What to do next

## Finding Status Types

### ✅ SUFFICIENT
Strong evidence to make a decision and act on it.

```
✅ SUFFICIENT — Strong evidence to make a decision

Why:
  1. Sufficient evidence from 4 independent sources
  2. 12 relevant facts extracted
  3. No conflicting values

Next steps:
  → Accept and apply this finding
```

**When this happens:**
- ≥3 independent sources all agree
- ≥5 facts extracted
- 0 conflicts
- Data is current/recent

**Action:** Click "Accept" — ready to update playbook

---

### ◐ PROPOSED
Enough evidence to propose a value, but review first.

```
◐ PROPOSED — Enough evidence to propose a value

Why:
  1. Sufficient evidence from 2 independent sources
  2. 4 relevant facts extracted
  3. No conflicting values

Still needed:
  • Corroboration from additional source
  • More comprehensive data

Next steps:
  1. Review the evidence carefully
  2. Consider running another campaign
  3. Accept if confident, or gather more data

→ Review and accept if confident
```

**When this happens:**
- 2 sources agree on the value
- 3-4 facts extracted
- 0 conflicts
- Data is current

**Action:** Review manually before accepting

---

### ❓ INCONCLUSIVE
Evidence exists but the picture is unclear.

```
❓ INCONCLUSIVE — Evidence exists but unclear

Why:
  1. Mixed signals from sources
  2. Some facts agree, others don't
  3. Evidence quality varies

Still needed:
  • Clearer answers from sources
  • More specific research questions
  • Higher quality data

Next steps:
  1. Review conflicting evidence
  2. Ask providers more targeted questions
  3. Specify exactly what you need to know

→ Gather more specific information
```

**When this happens:**
- Sources partially agree
- Some facts contradict others
- Quality is mixed

**Action:** Run another campaign with better-targeted questions

---

### ⚠️ CONFLICTED
Sources disagree on the value.

```
⚠️ CONFLICTED — Sources disagree on the value

Why:
  1. 2 conflicting values reported
  2. Government says $8.50, Commercial says $7.99
  3. Both from high-authority sources

Still needed:
  • Agreement between sources
  • Explanation for the difference (seasonal? location?)

Next steps:
  1. Investigate why sources disagree
  2. Use consensus rules to pick a value:
     - Authority: Government > Commercial
     - Freshness: Today's data > last month's
     - Geography: Local vs regional prices
  3. Document the reason for your choice

→ Manually resolve conflicts
```

**When this happens:**
- Different sources report different values
- Both are high-confidence
- No clear "winner"

**Action:** Use conflict resolution UI to pick a value

---

### ✕ INSUFFICIENT
Not enough valid evidence to make a decision.

```
✕ INSUFFICIENT — Not enough valid evidence

Gap: "heat level for steaming crabs"

Why:
  1. Evidence doesn't address the gap: Got 6 items but 0 directly answer "heat level"
  2. Evidence returned is about unrelated topics:
     • Pricing & costs
     • Seasonality
     • Storage & compliance
     • None about steaming temperature
  3. Wrong provider families for this question

Still needed:
  • Evidence directly relevant to heat level
  • Food safety specifications
  • Temperature control guidance

Next steps:
  1. Identify providers that specialize in food safety
  2. Try running with: Food Safety, Government
  3. Ask more specific: "What temperature for steaming?"
  4. Look for: USDA guidelines, FDA regulations, cooking specs

→ Run another research campaign with better providers
```

## Why Evidence Doesn't Answer the Question

### Example: "Heat Level" Gap

**What was asked:** How hot should water be when steaming crabs?

**What evidence came back:**
1. USDA Market News — Crab prices by size (irrelevant)
2. NOAA Fisheries — Peak season months (irrelevant)
3. FDA Facility Database — Storage temperature requirements (related but not direct)
4. Retail Price Survey — Pricing (irrelevant)
5. Restaurant Depot — Wholesale prices (irrelevant)
6. Community Forums — "Save money by steaming yourself" (vague, not technical)

**Result:** 0 relevant sources out of 6

**Problem:** Providers returned general information, not specific answer to the question.

**Solution:** Use providers that specialize in food safety and cooking:
- Government (USDA cooking guidelines)
- Food Safety (FDA regulations)
- Academic (research papers on cooking)

## Quality Issues Affecting Findings

### Insufficient Sources
```
✕ INSUFFICIENT — Only 1 source

Why:
  1. Single source risk: Only 1 provider addresses this gap
  2. Other evidence is tangential or unrelated
  3. Need independent verification

Still needed:
  • Another independent source
  • Corroboration of the value

Next steps:
  → Run campaign with different provider family
     Try: Government or Academic source for this topic
```

### Stale Data
```
✕ INSUFFICIENT — Data is outdated

Why:
  1. Data is stale: 5 of 6 sources are >1 month old
  2. Crab pricing changes seasonally
  3. Using old data risks wrong cost estimates

Still needed:
  • Current, up-to-date information
  • Pricing from this month/week

Next steps:
  → Run campaign again to get fresh data
     Pricing changes frequently and affects event costs
```

### Incomplete Results
```
◐ PROPOSED — Limited data from providers

Why:
  1. Limited data extracted: Only 3 facts from 6 sources
  2. Providers didn't return detailed information
  3. Likely used generic/cached data

Still needed:
  • More comprehensive responses
  • Detailed breakdowns from sources

Next steps:
  1. Ask providers more specific questions
  2. Request detailed information:
     - Not just "yes/no"
     - Include ranges, breakdowns, specifics
```

## How to Improve Findings

### If Finding is "INSUFFICIENT"

| Issue | Solution |
|-------|----------|
| Wrong providers | Run with specialists for this topic |
| Unrelated results | Ask more specific questions |
| Only 1 source | Run again with different provider family |
| Stale data | Refresh with current sources |
| Too vague | Request detailed breakdowns |

### If Finding is "PROPOSED" (not SUFFICIENT)

| Issue | Solution |
|-------|----------|
| 2 sources, need 3 | Run again with 1 more family |
| Few facts | Ask for more details |
| Older data | Include recent providers |

### If Finding is "CONFLICTED"

| Issue | Solution |
|-------|----------|
| Sources disagree | Investigate why (seasonal? region?) |
| Different authorities | Use authority ranking (Gov > Commercial) |
| Old vs new data | Pick newer source |

## Next Steps By Finding Type

| Status | Action | Timeline |
|--------|--------|----------|
| SUFFICIENT | ✅ Accept immediately | Done |
| PROPOSED | ⚠️ Review & decide | 5 minutes |
| INCONCLUSIVE | 🔄 Run targeted campaign | +30 minutes |
| CONFLICTED | ⚠️ Resolve conflicts | 5-10 minutes |
| INSUFFICIENT | 🔄 Run with better providers | +30 minutes |

## Example: Before & After

### BEFORE (Confusing)
```
Finding: insufficient
💡 Research complete: 6 evidence items from 7 providers
```

❌ **Problems:**
- Doesn't explain why it's insufficient
- "6 evidence items" sounds like success
- No guidance on next steps

---

### AFTER (Clear & Actionable)
```
✕ INSUFFICIENT — Not enough valid evidence

Gap: "heat level for steaming crabs"

Why:
  1. Evidence doesn't address the gap: Got 6 items but 0 directly answer "heat level"
  2. Evidence returned is about pricing, seasonality, storage — not temperature
  3. Wrong provider families for this question

Still needed:
  • Evidence directly relevant to heat level
  • Food safety specifications
  • Temperature control guidance

Next steps:
  1. Identify providers that specialize in food safety
  2. Try running with: Food Safety, Government
  3. Ask more specific: "What temperature for steaming?"
  4. Look for: USDA guidelines, FDA regulations, cooking specs

→ Run another research campaign with better providers
```

✅ **Benefits:**
- Crystal clear why insufficient
- Specific next steps
- Knows which providers to try
- Exactly what to ask them

---

## Reference: All Status Types

| Status | Icon | Color | Meaning | Action |
|--------|------|-------|---------|--------|
| SUFFICIENT | ✅ | Green | Ready to use | Accept |
| PROPOSED | ◐ | Blue | Probably good | Review & decide |
| INCONCLUSIVE | ❓ | Yellow | Unclear | Get better data |
| CONFLICTED | ⚠️ | Orange | Disagree | Resolve manually |
| INSUFFICIENT | ✕ | Red | Not enough | Run again |
