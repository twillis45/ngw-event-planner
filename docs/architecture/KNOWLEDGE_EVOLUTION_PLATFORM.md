# Knowledge Evolution Platform — KEP-2 (Self-Improving Knowledge Organization)

**Status:** Executable core shipped (Bundles A/B/C + D/F via reuse); E/G/H/I/J governed architecture. The execution layer that continuously **discovers → researches → validates → manufactures → governs → improves** platform knowledge — human-governed, AI-accelerated. Canonical knowledge changes **only** through KCR review + publication.
**Owner:** Todd. **Established:** 2026-07-02 (KEP-2). Composes the frozen architecture — no new OS, registry, lifecycle, publishing pipeline, validation system, graph, KCR type, governance, or role system.

> **External acquisition is UNFROZEN.** Providers now ingest real fetched source records. The first real campaign — *Improve Crab Feast Pricing* — ran end-to-end against live DMV market data ($250–400/bushel, 3 corroborating sources) and produced a **draft, governed KCR** (needs review; nothing auto-published).

---

## Bundles
| Bundle | What | Status | Module (reuses) |
|---|---|---|---|
| **A · Acquisition** | 16 provider families → **Observations only** (never findings/KCRs). External providers normalize fetched records; internal-validation derives from the estate. Triggers: manual/scheduled/event/admin/campaign. | ✅ built | `providers.js` (observation/evidence) |
| **B · Campaigns** | reusable governed workflow toward a goal; lifecycle draft→…→kcr; orchestrates providers→obs→evidence→intel→finding→KCR (stops at KCR) | ✅ built | `campaign.js` (finding, providers, evidenceIntelligence) |
| **C · Evidence Intelligence** | cluster · dedupe · authority rank · freshness · **contradiction detection → conflict-KCR candidate** (never auto-resolved) | ✅ built | `evidenceIntelligence.js` |
| **D · Improvement Suggestions** | corpus scan → gaps → Observations/KCRs, nothing silently changed | ✅ via reuse | `dimensions.js` + `connectors.js` corpus scan |
| **E · Runtime Learning Loop** | recommendation→accepted/rejected/modified→outcome→finding→KCR | 🟡 design | extends Validation Platform (`IntelEvaluation`) |
| **F · Knowledge Analytics** | velocity/debt/throughput/coverage — **dimensional, no overall score** | ✅ via reuse | `factory.js` + Studio floor |
| **G · Multi-Tenant** | platform→industry→regional→corporate→venue→org→customer→event→user, all **projection** | 🟡 design | `runtimeResolver.js` projection chain |
| **H · AI Copilot** | discover/summarize/contradict/recommend/draft — **never publish/approve/ground/override** | 🟡 design | governed by KCR + Art. XIII (propose-only) |
| **I · Marketplace Prep** | future asset kinds (packages/SOPs/training…) — architecture only | 🟡 design | `GOVERNED_ASSET_KINDS` |
| **J · Production Hardening** | 100k assets / 1M relationships / 1M+ observations | 🟡 design + graph O(n) proven (4k <2s) | derived readers, deterministic ids |

## Invariants (enforced)
No new registry/lifecycle/pipeline. Providers emit observations only. Findings → KCR; nothing bypasses KCR; **no auto-publish**. Contradictions never auto-resolve. Confidence + analytics are **dimensional — never one score**. External evidence is candidate; community needs corroboration. Host runtime unchanged (resolver opt-in/inert). Everything attributable + auditable.

## Tests
`kepCampaign.test.js` (7): provider→observation, evidence dedup/cluster/authority, contradiction→conflict-KCR, and the **real** campaign end-to-end (real sources, corroborated finding, draft KCR). Plus KF-1 (13) + KAS-2 (5). Suite 1052 green.

## Change log
- **KEP-2 (2026-07-02)** — External acquisition unfrozen; 16-family provider framework (observations only); research campaign orchestration (reusable, lifecycle-tracked, stops at KCR); evidence intelligence (cluster/dedupe/authority/freshness/contradiction→conflict-KCR). First real campaign executed. D/F via reuse; E/G/H/I/J governed architecture. Studio floor shows acquisition (providers/campaigns/external-ON). No new OS/registry; host runtime unchanged.
