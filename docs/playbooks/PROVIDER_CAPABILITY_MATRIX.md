# Provider Capability Matrix

**Date:** 2026-08-01. ASCII-only. Phase 5F.
**Method:** measured against imports, citations and output. **No capability is inferred from
a provider's name.**

---

# 1. The headline

**Not one of the 16 declared providers is cited anywhere in the corpus.** Zero. The 32 source
ids that playbook provenance actually uses are a different vocabulary entirely, and the
registry the host predicate reads (`QTY_SOURCES`) shares **no ids at all** with
`providers.js`.

There are three disconnected source vocabularies, plus raw URLs:

| Registry | Size | Read by | Cited in corpus |
|---|---|---|---|
| `providers.js` (`buildProviders`) | 16 | admin console only | **0** |
| `groundingSources.js` | 112 | `decisionEvidence`, `publishedExport`, App | partially |
| `quantityProvenance.js` `QTY_SOURCES` | 4 | **`isGroundedItemQty` - the host predicate** | 3 of 4 heavily |
| raw URLs pasted into `sources[]` | ~8 | nothing resolves them | yes, e.g. `eatlikenoone.com` x3 |

**The only registry that can make a host-visible claim "grounded" is `QTY_SOURCES`, which
has four entries.**

---

# 2. The matrix

`Runtime impact` = can a change here alter what a host sees? Tested by import graph and by
output, not by reading names.

| Provider | Exists | Used | Research Role | Evidence Role | Runtime Impact |
|---|---|---|---|---|---|
| `data.gov` | yes | **never cited** | family `government`, generic normalizer | stamps `official` + 365d | **none** |
| `scholar` | yes | **never cited** | family `academic`, generic normalizer | `industry` + 730d | **none** |
| `astm-iso` | yes | **never cited** | family `standards` | `official` + 365d | **none** |
| `fda-foodsafety` | yes | **never cited** | family `food-safety`; has a *simulated* fetcher | `official` + 180d | **none** |
| `noaa` | yes | **never cited** | family `weather` | `official` + 7d | **none** |
| `hospitality-assoc` | yes | **never cited** | family `hospitality` | `industry` + 180d | **none** |
| `event-industry` | yes | **never cited** | family `event-industry` | `industry` + 180d | **none** |
| `market-pricing` | yes | **never cited** | family `commercial-pricing`; *simulated* fetcher | `commercial` + 45d | **none** |
| `retail` | yes | **never cited** | family `retail`; *simulated* fetcher | `commercial` + 45d | **none** |
| `restaurant-depot` | yes | **never cited** | family `wholesale` | `commercial` + 45d | **none** |
| `tourism-board` | yes | **never cited** | family `tourism` | `industry` + 180d | **none** |
| `venue-network` | yes | **never cited** | family `venue` | `industry` + 180d | **none** |
| `catering-network` | yes | **never cited** | family `catering` | `industry` + 180d | **none** |
| `sme-network` | yes | **never cited** | family `sme` | `expert` + 365d | **none** |
| `community-forums` | yes | **never cited** | family `community`; *simulated* fetcher | `community` + 30d | **none** |
| `internal-validation` | yes | **never cited** | the only non-generic `acquire`; derives from event outcomes | `event` + 90d | **none** (honest-empty: 0 outcomes) |

**Every row is `Runtime Impact: none`,** because no provider module is imported by hostv2, by
the playbooks engine, or by any knowledge-runtime file. Verified by import graph:

```
hostv2 imports of provider modules   : NONE
playbooks engine imports             : NONE
knowledge runtime imports            : NONE
admin console imports                : all 9 modules
```

## 2.1 The registry that DOES have runtime impact

| Source id | Registry | Runtime impact | Status |
|---|---|---|---|
| `webstaurant-protein-2026` | `QTY_SOURCES` | **yes** - grounds protein qty | cited x11 |
| `webstaurant-portions-2026` | `QTY_SOURCES` | **yes** | cited |
| `bar-provision-2026` | `QTY_SOURCES` | **yes** | cited x25 - the most-used source in NGW |
| `reddy-ice-2026` | `QTY_SOURCES` | **yes** | added 5F; proven to host |

Four entries. Adding one is a **code change**, which is the actual bottleneck on acquisition.

---

# 3. Module-by-module audit

| Module | Lines | Prod importers | What it really does |
|---|---|---|---|
| `providers.js` | 118 | admin only | 16 providers; 15 are *generic normalizers* that stamp a family's authority + freshness onto handed-in records. Only `internal-validation` has real derivation logic, and it returns empty. |
| `providerIntegration.js` | 215 | admin only | **Declares "Real data fetching from external APIs" and makes ZERO network calls.** See section 4. |
| `providerIntelligence.js` | 208 | admin, blueprint, runner | Tracks per-provider run stats in localStorage. Real, but describes runs that never fetched. |
| `providerHealth.js` | 81 | admin only | Health rollup over recorded provider events. |
| `providerMonitor.js` | 379 | admin only | Freshness/overdue rules per provider. |
| `providerNormalizers.js` | 268 | admin only | Paste-normalization for hand-entered records. **The one genuinely useful piece for human research.** |
| `researchBlueprint.js` | 274 | admin, missionControl, runner | Recommends providers + capabilities for a gap. Recommends from the 16 that are never cited. |
| `campaignRunner.js` | 353 | admin, missionControl | Executes campaigns -> observations -> evidence. Persists campaigns. |
| `groundingSources.js` | 95 | App, decisionEvidence, publishedExport | 112 axis sources; 24 carry publisher+note, 88 are bare ids. |

---

# 4. The finding that outranks the rest

`providerIntegration.js` header, verbatim:

> `// Real data fetching from external APIs: FDA, government data, retail pricing.`

Measured:

```
exported fetchers                    5
real network calls (fetch/axios/XHR) 0
"Simulated" markers                  4
"would connect ... in production"    2
fabricated facts marked confidence:'high'  11
```

The simulated records carry **real, authoritative URLs**:
`opendata.fda.gov`, `ams.usda.gov/market-news`, `fisheries.noaa.gov`, `instacart.com`,
`restaurantdepot.com`, `reddit.com/r/maryland`.

A representative record it returns:

> `USDA Market News: Blue crabs (Maryland) seasonal average June-July 2026: Large grade
> $7.92-$8.17/lb, Medium grade $6.17-$6.25/lb, Jumbo grade $14.58-$15.67/lb.`
> - attributed to `https://www.ams.usda.gov/market-news`, `confidence: 'high'`

**Those prices were never fetched from USDA.** They are literals in our own source file
wearing a USDA citation and a high-confidence stamp.

## 4.1 Why this has not yet caused harm

Only because a *different* defect blocks it. `AdminConsole.handleMerge` - the button labelled
"merge evidence into playbook" - sets local React state and writes nothing:

```js
const handleMerge = () => {
  setCampRunResult({ ...campRunResult, merged: true, mergedAt: asOf,
    message: `OK Evidence merged into playbook. ${gap.label} cost factors now marked as researched.` });
};
```

No `upsertKCR`. No playbook write. No persistence. It prints a green success message
asserting a change that did not happen.

**So campaign output cannot become a KCR, and the fabricated USDA prices cannot reach a
host.** The system is protected by a bug, not by a gate. Fix `handleMerge` without first
removing the simulated fetchers and NGW would publish invented federal data attributed to
the federal source.

**These two must be fixed in the same change, simulators first.**

---

# 5. Verdict

## **C - partially connected, presenting itself as A.**

| Layer | Status |
|---|---|
| Provider declarations, families, freshness defaults | **real and coherent** |
| Campaign execution, observation/evidence construction | **real code, runs, persists campaigns** |
| Provider fetching | **simulated, and labelled as real** |
| Research output -> governed knowledge | **not connected** (`handleMerge` no-op) |
| Provider -> host runtime | **not connected** (zero imports) |
| Provider ids -> corpus citations | **not connected** (0 of 16 cited) |

It is a working admin research *workbench* whose data layer is fabricated and whose output
has no route into the governed corpus. Calling it "metadata only" would understate the code
that genuinely runs; calling it "connected intelligence" would repeat the claim its own file
header already makes falsely.

---

# 6. What must happen before any of this is trusted

1. **Delete or hard-disable the simulated fetchers.** A function named `fetchGovernmentData`
   that invents USDA prices is worse than no function. If handed-in records are the real
   contract (and `providers.js` says they are), then `providerIntegration.js` should accept
   pasted records and nothing else.
2. **Make `handleMerge` either real or honest.** Today it lies. Either it creates a KCR that
   goes to Review, or the button says "Copy evidence for manual review".
3. **Unify the source vocabularies,** or state which one is authoritative. Today
   `QTY_SOURCES` is the only registry with runtime power and it is invisible to the provider
   UI that admins actually use.
4. **Only then** consider automating acquisition.
