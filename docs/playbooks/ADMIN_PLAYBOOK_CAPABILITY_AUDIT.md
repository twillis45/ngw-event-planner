# Admin Playbook Capability Audit

**Date:** 2026-08-01 - **Read-only. No code changed.**
**Scope:** `src/admin/` (7,380 lines), `src/lib/adminApi.js`, `src/lib/knowledge/` (77
non-test modules).

---

# Executive finding

**The research operating system already exists and is substantial. What does not exist is
the last mile: nothing it produces can reach a playbook field.**

NGW has a full knowledge-governance stack -- research questions, campaigns, connectors,
evidence pipelines, consensus resolution, review packets, KCR roles and governance, a KCR
store with a server-side migration. It is wired into the Admin console. It is **not** wired
into the 39 static playbook files, and it cannot be, because those files are build-time ES
modules with no override layer.

---

# A. What exists -- confirmed in code

## A1. Admin console

`?admin=1` at `src/index.js:42`, lazy-loaded, wrapped in `AuthGate`, enforcing
`app_metadata.role`. 14 tabs:

```
Overview - Users - Workspaces - Invitations - Activation - Analytics -
Intelligence - Playbooks - Studio - Metrics - Errors - Providers - Audit - Settings
```

Two dedicated playbook surfaces: a **Playbooks** tab and `PlaybookCampaigns.jsx` (472 lines).

Research/governance vocabulary density in `AdminConsole.jsx`: **KCR 196 references**,
research 173, queue 86, Provenance 13, citation 3.

## A2. The knowledge / research layer -- 77 non-test modules

A complete authoring-to-publication chain exists as code:

| Stage | Module |
|---|---|
| Question formulation | `researchQuestion.js`, `researchBlueprint.js` |
| Policy / roles | `researchPolicies.js`, `researchRoles.js`, `kcrRoles.js` |
| Campaign definition | `campaign.js`, `campaignTemplates.js`, `researchPlaybooks.js` |
| Execution | `campaignRunner.js`, `researchRunner.js`, `providerExecutors.js`, `connectors.js` |
| Intake | `researchIntake.js`, `researchPipeline.js` |
| Evidence | `evidence.js`, `evidencePipeline.js`, `evidenceIntelligence.js` |
| Conflict resolution | `consensusResolver.js` |
| Change detection | `changeDetector.js`, `knowledgeChange.js` |
| Review | `reviewPacket.js` |
| Governance | `kcrGovernance.js`, `kcrStore.js`, `governedAsset.js` |
| Sources | `sourceCatalog.js`, `groundingSources.js`, `insightSources.js` |
| Domain provenance | `costProvenance.js`, `quantityProvenance.js`, `timingProvenance.js` |
| Doctrine | `RESEARCH_DOCTRINE.md` |
| Server | `src/lib/api/kcr.js`, `kaw1-migration.sql` |

## A3. Missing-data detection -- EXISTS and is running

`src/lib/playbooks/playbookContract.test.js` is a real gap detector with a two-tier design:
hard invariants that must always pass, plus **ratcheted gap counts whose baselines can only
go down**. Its comment names its own purpose: *"The printed lists are the Admin red->green
checklist."*

Run today, all five ratchets are at zero:

```
costFactorGaps  <= 0  (currently 0)
idPrefixGaps    <= 0  (currently 0)
categoryGaps    <= 0  (currently 0)
qtyMixGaps      <= 0  (currently 0)
foodNoCost      <= 0  (currently 0)
```

**The rollout debt this instrument was built to track has been fully paid.**

## A4. Knowledge modules ARE wired to the runtime

`src/lib/playbooks/index.js` imports **14** knowledge modules and consumes them in the
engine: `accessibilityContext`, `budgetContext`, `childcareContext`, `costProvenance`,
`culturalContext`, `destinationContext`, `dietaryContext`, `humanContext`, `legalContext`,
`militaryRetirement`, `quantityProvenance`, `timingProvenance`, `venueContext`,
`weatherContext`. `HostShellV2.jsx` imports three more directly.

So "the knowledge layer is disconnected" would be **false**. The context modules are live.

---

# B. What does not exist -- confirmed by exhaustive consumer trace

## B1. No write path from Admin to any playbook field

**FACT.** Playbooks are static ES modules compiled at build time. There is no playbook
table, no override store, no runtime merge. `adminApi.js` exports exactly two symbols
(`isAdminApiConfigured`, `adminApi`) -- 82 lines total.

## B2. The GOVERNANCE half of the knowledge layer reaches no runtime consumer

Traced across all of `src/` and `hostv2/src/`, excluding tests, `src/lib/knowledge/` itself,
and `src/admin/`:

| Module | Runtime consumers |
|---|---|
| `governedAsset` | **0** |
| `kcrGovernance` | **0** |
| `researchPipeline` | **0** |
| `campaignRunner` | **0** |
| `kcrStore` | 1 -- and it is `src/lib/api/kcr.js`, the API wrapper, not a product surface |

The distinction that matters: the **context** modules (A4) are wired; the **governed-research**
modules are not. Published KCR output has no consumer.

This is consistent with the deliberate scope of the Conveyor 1 slice, which was specified as
*transport only* -- "do NOT connect governed knowledge to decisions yet." The disconnection
is a decision, not an oversight. It has simply not been revisited.

## B3. No versioning of playbook content

`version` exists on all 39 playbooks as a field, but there is no version history, no diff, no
rollback for playbook content. Version control is git, at file granularity.

## B4. No approval workflow that terminates in a playbook

`kcrGovernance.js` and `reviewPacket.js` implement review and approval -- for KCRs. A KCR
approval publishes to the KCR store. It does not, and currently cannot, write a
`provenance` block onto `p_crabs` in `crabFeast.js`.

---

# C. Capability matrix

| Capability | Status | Evidence |
|---|---|---|
| Playbook management (read) | **EXISTS** | Playbooks tab, `PlaybookCampaigns.jsx` |
| Playbook management (write) | **ABSENT** | static modules; no write path |
| Missing-field detection | **EXISTS, at zero** | `playbookContract.test.js`, 5 ratchets all 0 |
| Research queues | **EXISTS** | 86 queue references; campaign + intake modules |
| Enrichment tooling | **EXISTS** | connectors, providerExecutors, evidencePipeline |
| Approval workflow | **EXISTS (for KCRs)** | `kcrGovernance.js`, `reviewPacket.js`, `kcrRoles.js` |
| Approval -> playbook write | **ABSENT** | no consumer of `governedAsset` |
| Data import | **PARTIAL** | `scripts/assembleSampleEvents.js` generates SAMPLE EVENTS, not playbooks -- and it is gitignored |
| Versioning | **PARTIAL** | `version` field; no history/diff/rollback |
| Provenance schema | **EXISTS** | tier/confidence/verificationStatus/sources/note |
| Provenance coverage | **31% of purchases** | 169/537; 8% carry a source id |

---

# D. FACTS / GAPS / ASSUMPTIONS

## FACTS -- confirmed in code

- F1. 39 playbooks, 215 decisions, 537 purchases; 17 of 19 top-level fields at 100%.
- F2. No playbook field is Admin-editable. Static modules, build-time import.
- F3. The contract linter exists, runs, and all five ratcheted gap classes are at 0.
- F4. 77 non-test knowledge modules implement a full research-to-governance chain.
- F5. 14 knowledge modules are imported and consumed by the playbook engine.
- F6. `governedAsset`, `kcrGovernance`, `researchPipeline`, `campaignRunner` have **zero**
  runtime consumers.
- F7. Purchase provenance: 169/537 (31%); 45 with a source id (8%); 7 `cited` (1.3%);
  7 playbooks with zero priced provenance.
- F8. `risks.ifDelayed` and `decisions.dependsOn` are authored (278 and 42 instances) and
  reach no action object -- `actionReason.js` has rungs for both that return null.
- F9. Provenance field hygiene is inconsistent: `medium` vs `med`; 21 objects with no tier;
  `sources` holds both ids and free prose.

## GAPS -- missing or incomplete

- G1. No write path from any research output to any playbook field. **This is the gap.**
- G2. `provenance` absent on 69% of priced items.
- G3. No playbook content versioning, diff or rollback.
- G4. `vegMain` 46%, `dayOfChecklist` 18%, `culturalContext` 5%.
- G5. Two authored fields (`ifDelayed`, `dependsOn`) have consumers waiting and no carrier.
- G6. The contract linter checks 5 gap classes; **provenance completeness is not one of
  them**, so the largest gap is the one the instrument does not watch.

## ASSUMPTIONS -- not proven by this audit

- A1. That the Admin Playbooks tab only reads. Inferred from the absence of a write path;
  I did not exercise the tab in a live authenticated session (the public build forces
  Supabase empty, so Admin cannot be reached there).
- A2. That the KCR store is populated. `kaw1-migration.sql` exists; I did not query it.
- A3. That `PlaybookCampaigns.jsx` targets playbook enrichment specifically rather than
  generic campaigns. Named for it; not traced end to end.
- A4. That research output is *schema-compatible* with the playbook provenance block. Both
  express tier/confidence/sources, but no mapping code exists to compare.
