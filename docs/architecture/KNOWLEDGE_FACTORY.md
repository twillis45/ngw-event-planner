# Knowledge Factory — v1.0 (Capability, KF-1)

**Status:** Shipped capability (engine layer + Studio floor). The Knowledge Factory turns the platform from *manually authored* knowledge into a *continuously manufactured, governed, versioned, measured* knowledge system. It **composes** the frozen architecture (KAS, KCR, Playbook Intelligence, Validation, registries) — it adds **no** new OS and **no** new registry.
**Owner:** Todd. **Established:** 2026-07-02 (KF-1).

> Bloomberg + Git + Stripe + Notion for event knowledge: knowledge is manufactured, compounds, is governed, is versioned, is measured, and improves — without editing canonical source files.

---

## The line (what the factory runs)
```
Gap/Signal → Observation → Evidence → Finding → KCR → Review → Publish → Override → Runtime Resolution → Rendered
```
Every stage already existed as a part; KF-1 wires them into one **derived, measured** line and generalizes it beyond playbooks.

## Modules (all pure, all reuse)
| Module | Role | Reuses |
|---|---|---|
| `knowledgeGraph.js` | generalized asset/evidence/finding/KCR graph (10 relationship types, 24 domains); derived, O(n), scales to 40k | `GOVERNED_ASSET_KINDS`, `GRAPH_RELATIONS` |
| `dependencyEngine.js` | blast radius of a change — affected assets/engines/readers/prompts/tests/runtime; dimensional magnitude (no risk score) | `knowledgeImpactPreview`, graph |
| `runtimeResolver.js` | canonical → override → role/context/workspace projection → rendered; **opt-in, inert by default** (backward compatible) | `effectiveValue` |
| `factory.js` | the manufacturing view: queues (observation→validation), dimensional debt/velocity, batch publishing (1 finding → N KCRs) | `corpusConnector`, `evaluateAsset`, `dimensions`, `findingToKCR`, `dependencyEngine` |

Plus the KAS-2 manufacturing objects (`observation`/`evidence`/`finding`/`knowledgeOverride`/`connectors`) they build on.

## Guarantees
- **No single score, ever** — queues, debt, velocity, blast radius are all dimensional.
- **No fabricated metrics** — everything derives from the estate; honest-empty (Evidence/Finding queues are 0 until records exist).
- **Backward compatible** — the runtime resolver is inert (authored value) until a reader opts in; host runtime unchanged (KF-1 rule 7 / project rule).
- **Nothing bypasses KCR** — findings produce KCRs; batch publishing produces *many* KCRs, still each governed/reviewed/versioned/rollback-able.
- **Scales** — graph build over 4,000 assets < 2s in test; derived views are O(n).

## Studio surface
`AdminConsole` Studio gains a **Knowledge Factory · manufacturing floor**: the six queues, dimensional knowledge debt, and growth (assets · graph nodes/edges · research velocity · review backlog). Admin-only; drillable; derived.

## Tests
`knowledgeFactory.test.js` (13) — graph, dependency/blast-radius, runtime resolution (+ backward-compat inertness), batch publishing, factory metrics, and a 4,000-asset performance test. Plus `kasVerticalSlice.test.js` (the end-to-end manufacturing proof).

## Change log
- **v1.0 (2026-07-02)** — Knowledge Factory capability: generalized knowledge graph, dependency/blast-radius engine, opt-in runtime resolver, factory engine (queues + dimensional debt/velocity + batch publishing), Studio manufacturing floor. Composes KAS/KCR/Playbook-Intelligence/Validation — no new OS, no new registry, host runtime unchanged.
