# Grounding & Price Monitoring

How the playbook canon moves from **model-authored estimate** → **cited + dated**, and how it's kept fresh. This is the operational loop behind the "can I trust these prices?" question.

## The data contract

Every priced item in `src/lib/playbooks/data/*.js` carries provenance:

```js
provenance: {
  tier: 'trade-heuristic' | 'regional-heuristic' | 'cultural-tradition',
  confidence: 'low' | 'medium' | 'high',
  verificationStatus: 'synthesized' | 'established-consensus' | 'cited',
  note: '…',
  sources: ['https://…'],        // present once cited
  lastVerified: 'YYYY-MM',       // stamped by the monthly pass
}
```

Per-channel prices use `sourcingPrices: { butcher: [lo,hi], costco: [lo,hi], grocery: [lo,hi] }`
(see `p_ribs` / `p_chicken` in `juneteenthCookout.js` — the worked example). Items without
it fall back to the typical sourcing factor.

**Honesty rule:** until `verificationStatus === 'cited'`, the UI presents the figure as a
*typical/estimate* (it already does via provenance). Never fabricate a source — if a search
finds nothing, the item stays `synthesized`.

## The scoreboard

```
npm run grounding:audit      # human scoreboard: "% cited", lowest-grounded playbooks first
npm run grounding:json       # machine output (for CI / diffing)
```

Baseline at creation: **~2% cited** (3 cited / 541 priced items / 39 playbooks). The number to drive up.

## The monthly pass (foreground — needs web search)

Run in a Claude session (web search is unavailable to background/CI):

1. `npm run grounding:audit` → take the lowest-grounded, highest-traffic playbooks.
2. For each priced protein/item: search current per-channel prices (e.g. "pork ribs $/lb Costco vs grocery 2025").
3. Write `sourcingPrices` / `unitCostRange` + `sources`, flip `verificationStatus: 'cited'`, stamp `lastVerified: '<YYYY-MM>'`.
4. Re-check existing `cited` items whose `lastVerified` is >30 days old; if a price drifted >15%, update the range + re-stamp.
5. `npm run grounding:audit` again to confirm the % moved; run the test suite (money math).

## Scheduling the cadence

CI can run the **audit** monthly (it can't research — no web/LLM), and post the scoreboard so a
human kicks off step 2. Drop-in GitHub Actions:

```yaml
# .github/workflows/grounding-monitor.yml
name: grounding-monitor
on:
  schedule: [{ cron: '17 13 3 * *' }]   # 3rd of each month, 13:17 UTC (off the :00 mark)
  workflow_dispatch: {}
jobs:
  audit:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: demo } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node scripts/groundingAudit.mjs --json > grounding.json
      - run: node scripts/groundingAudit.mjs   # human scoreboard in the log
      - uses: actions/upload-artifact@v4
        with: { name: grounding-report, path: demo/grounding.json }
```

(In-session `CronCreate` is **not** suitable for this — it's session-only and auto-expires
after 7 days. Use CI for true monthly cadence, or a calendar reminder to run the foreground pass.)
