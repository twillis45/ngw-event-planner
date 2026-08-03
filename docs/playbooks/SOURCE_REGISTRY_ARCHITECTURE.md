# Source Registry Architecture

**Date:** 2026-08-01. ASCII-only. Phase 5F.1.
**Question this answers:** there are three registries and a set of raw URLs. Which one is
canonical, and what is the real path from a source to a host?

---

# 1. The three registries, measured

| Registry | Entries | Shape | Read by | Cited in corpus | Can ground a host claim? |
|---|---|---|---|---|---|
| `providers.js` `buildProviders()` | 16 | acquisition providers (family, authority, freshness, `acquire`) | admin console only | **0 of 16** | **No** |
| `groundingSources.js` | 112 | per-axis source identities (id, title, publisher, tier) | `App.js`, `decisionEvidence`, `publishedExport` | partially; 24 of 112 carry publisher+note | **No** - not read by any grounding predicate |
| `quantityProvenance.js` `QTY_SOURCES` | 4 | id -> `{org, url, fetched, claim}` | **`isGroundedItemQty`** | 3 of 4, heavily | **YES** |
| (raw URLs pasted into `sources[]`) | ~8 | none - a string | nothing resolves them | yes, e.g. `eatlikenoone.com` x3 | **No** - resolves nowhere, so silently ungrounds |

There are sibling registries for other axes on the same pattern as `QTY_SOURCES`
(`costProvenance`, `timingProvenance`, and the other `isGrounded*` predicates). The shape is
the same: **a predicate owns its own source table, and a claim grounds only when every cited
id resolves in that table.**

## 1.1 The finding

**`QTY_SOURCES` - four entries - is the only registry with the power to make a quantity claim
"grounded", and it is invisible to the provider UI that administrators actually use.**

The 16 providers an admin picks from in Campaign Research have **no relationship** to the
source ids that a correction must cite. Zero overlap. An admin who runs a campaign against
`market-pricing` and then opens a correction cannot cite `market-pricing` - nothing would
resolve it, and the claim would publish ungrounded with no error.

---

# 2. The canonical path

```
  SOURCE  (a real, dated, readable thing in the world)
     |    human reads it and judges what it supports
     v
  REGISTRY ENTRY            quantityProvenance.QTY_SOURCES[id] = {org,url,fetched,claim}
     |                      *** code change - the acquisition bottleneck ***
     v
  CORRECTION                Admin -> Publishing -> Correct this -> provenance editor
     |                      cites the registry id; tier: 'researched'
     v
  REVIEW                    SME + editorial + governance, no self-approval
     |
     v
  PUBLISH -> EXPORT -> BAKE publishedKcrs.json -> publishedKnowledge.json
     |
     v
  RESOLVER                  effectiveValue(): locked -> override -> snapshot -> authored
     |
     v
  ENGINE                    governedPurchase() -> playbookFoodPlan()
     |
     v
  PREDICATE                 isGroundedItemQty(prov): tier==='researched'
     |                      AND every prov.sources[] id resolves in QTY_SOURCES
     v
  HOST                      hostv2 renders "Sourced - <claim>"
```

**Every arrow on this path is proven** (Phase 5F, `reddy-ice-2026`), and it is preserved
unchanged by the 5F.1 repair - re-verified after the repair:

```
1. source registered      : true
2. predicate grounds it   : true
3. reaches host row       : qtyGrounded=true  sources=["reddy-ice-2026"]
4. hostv2 renders Sourced : true
```

## 2.1 Where `Provider` and `Evidence` sit - and why they are not on it

The brief's canonical chain is `Provider -> Source -> Evidence -> Claim -> KCR -> Runtime`.
Measured, **the working path contains neither Provider nor Evidence**:

| Stage | On the working path? | Why |
|---|---|---|
| Provider | **No** | No provider module is imported by hostv2, the playbooks engine, or the knowledge runtime. 0 of 16 are cited anywhere |
| Source | **Yes** | The real thing a human read |
| Evidence | **No** | `createEvidence` records exist as a type, but the store holds 0. Governance reads `provenance.sources[]`, not evidence objects |
| Claim | **Yes** | Written by a human into the registry entry and the correction note |
| KCR | **Yes** | The governed unit |
| Runtime | **Yes** | Resolver -> engine -> predicate -> host |

This is worth stating plainly rather than drawing the intended architecture and implying it
runs. **Provider and Evidence are a parallel, unconnected pipeline.** The chain that moves a
number is `Source -> Registry -> Correction -> Review -> Publish -> Predicate -> Host`.

---

# 3. What the repair changed

| Before | After |
|---|---|
| `providerIntegration.js` header claimed real API integration; 0 network calls; 6 fabricated statements; 11 facts stamped `confidence:'high'`; 9 real orgs named in invented records (FDA, USDA, NOAA, Whole Foods, Safeway, Harris Teeter, Restaurant Depot, Reddit, a named local shop) | Fabricators **deleted**. `fetchProviderData` is honest-empty and returns `unfetched: true` with a reason. NGW does not crawl, and now says so |
| `prepareEvidenceForReview` stamped `confidence: 'high'` on every record regardless of source | Confidence is **inherited, never minted**; default `unverified`. Output marked `reviewCandidate: true` so nothing mistakes it for governed evidence |
| "OK Campaign completed successfully" + "OK Accept & Merge into Playbook" -> handler wrote nothing, then reported "Evidence merged into playbook... now marked as researched" | Button and handler **removed**. Panel states: *"Preview only - nothing is saved. These candidates are not evidence and are not governed knowledge."* and points at the governed route |

**Deleted, not flagged.** A flagged simulator is one config change from live, and that file's
own header already proved a label is not a gate.

---

# 4. Which registry should be canonical

**Recommendation: `QTY_SOURCES` and its sibling axis registries are already canonical - make
that explicit rather than adding a fourth registry.**

They earn it on the only criterion that matters here: a grounding predicate reads them, so an
entry changes what a host sees. `providers.js` and `groundingSources.js` do not have that
property, and giving it to them would mean pointing a predicate at 112 mostly-bare ids and 16
never-cited provider names.

| Registry | Recommendation |
|---|---|
| `QTY_SOURCES` + siblings | **Canonical.** Add the `supports`/`refuses`/`freshnessDays`/`failures` fields from `PROVIDER_GOVERNANCE_MODEL.md` here, where they will actually be enforced |
| `groundingSources.js` | Keep as the **axis index** - what NGW has looked at per dimension. Not a grounding authority |
| `providers.js` | Keep as the **acquisition family model** - authority tier and freshness defaults for handed-in records. Not a source of ids to cite |
| raw URLs in `sources[]` | **Stop.** A URL in `sources[]` resolves nowhere, so the claim silently fails to ground. Should be a lint |

## 4.1 The one structural change worth making next

**Make the composer's source field offer the registry.** Today an admin types a source id as
free text; if it does not resolve, the correction publishes and simply never grounds - no
error, no warning, and the host quietly shows no Sourced line. A picker backed by
`QTY_SOURCES` (plus "register a new source" as an explicit, reviewed act) closes the gap
between "what an admin can cite" and "what can ground".

---

# 5. Remaining gaps

- **Registering a source is still a code change.** This is the acquisition bottleneck. It is
  also currently a *feature*: adding a source is a decision about who may be believed, and it
  should not be a text box. It needs a review path, not removal.
- **The composer has no asset picker** - 37 of 39 playbooks remain unreachable.
- **Evidence objects are unused.** 0 in the store. Either wire `createEvidence` into the
  governed path or stop presenting an Evidence stage in the architecture.
- **`researchBlueprint` still recommends the 16 uncited providers** for a gap. Now that their
  fetchers are empty, its recommendations lead to an honest dead end rather than to fabricated
  data - an improvement, but it still points the wrong way.
- **No lint** stops a raw URL being pasted into `sources[]`.
