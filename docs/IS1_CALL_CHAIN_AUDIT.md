# Sprint IS-1 — Runtime Call-Chain Audit

**Date:** 2026-07-04
**Method:** Source-grep every engine's exports against every import site in `src/App.js` (the only host runtime entry point). "Caller" means a live App.js code path, not a test file.

---

## Audit Table

| Engine | Runtime Caller | Consumer Screen | Rendered? | User-Visible? | Broken? | Fix |
|---|---|---|---|---|---|---|
| **Event Identity (Sprint A)** `eventIdentityEngine.js` `resolveEventIdentity()` | **None** | — | No | No | ✅ **Yes — orphaned** | Wire into `AssembleReveal` (this sprint) |
| **Event Identity (legacy)** `eventIdentity.js` `eventIdentity()` | `AssembleReveal`, `HostHome` | AssembleReveal identity stage, HostHome `id` var | Partially (HostHome uses `mustHaveMoment`/`feeling`, Reveal used it for stages) | Only when host filled in meaning/honoree fields (rare at first touch) | ✅ Yes — wrong reader for Reveal's purpose | Replace with Sprint A engine in Reveal; keep legacy reader in HostHome (different, valid purpose) |
| **Persona Resolution (Sprint A)** `personaResolutionEngine.js` `resolvePersona()` | **None** | — | No | No | ✅ **Yes — orphaned** | Not required for Reveal fix (Reveal doesn't need persona); flag for future shell-routing sprint |
| **Shell Routing (Sprint A)** `shellResolver.js` `resolveShell()` | **None** | — | No | No | ✅ **Yes — orphaned** | Same as above — actual shell routing still runs on `intakeFamilyConfig`/taxonomy, not this engine |
| **Assemble Reveal** `AssembleReveal()` in App.js | `createEvent()` via `setAssemble()` | Full-screen modal | Yes (when it fires) | Only for `home_hosted` family (~16 of 53+ types) | ✅ **Yes — gated by unrelated taxonomy field** | Loosen the `evIsHost` condition at the `setAssemble` call site only |
| **Decision Blockers** `deriveDecisionBlockers()` in `assembleRevealEngines.js` | `buildAssembleRevealStages()` → `AssembleReveal` | Reveal stage list | Partially (`title`/`what` only) | Yes, but reasoning invisible | ✅ Yes | Render `why`/`status`/`nextDecision` |
| **Timeline** `effectiveRos()` | `buildAssembleRevealStages()`, `HostHome`, day-of Focus mode | Reveal + HostHome + Focus | Yes | Yes | No | — |
| **Food** `playbookFoodPlan()` | `buildAssembleRevealStages()`, `HostHome` | Reveal + HostHome | Yes | Yes | No | — |
| **Shopping** `playbookFoodPlan().list` | `buildAssembleRevealStages()`, HostHome shopping list view | Reveal + HostHome | Yes | Yes | No | — |
| **Budget** `event.budget` reducer | `buildAssembleRevealStages()`, HostHome, Budget tab | Reveal (if set) + Budget tab | Yes | Yes, but rarely populated before Reveal (optional at intake) | No (gating is correct — budget genuinely isn't set yet) | — |
| **Vendor** `getVendorCOIState()`, `event.vendors` | `buildAssembleRevealStages()`, Vendor tab | Reveal (if named vendors) + Vendor tab | Yes | Yes, but never populated before Reveal (vendors added later in planning) | No (correct gating — same reason as Budget) | — |
| **Risk** `deriveTopRisks()` in `assembleRevealEngines.js` | `buildAssembleRevealStages()` | Reveal risk stage | Yes when triggered | **Never observed live** — depends on `eventIdentity.isCompound`/`ceremonyComponents`, which never populate without Sprint A wiring | ✅ Yes (downstream of Identity defect) | Fixed automatically once Identity is wired correctly |
| **ExperienceView** `experience/experienceView.js` | **None** (AdminConsole only) | Admin console | N/A | No (admin-only tool, by design) | ⚠️ Not a runtime defect — architectural boundary | No action; confirm intentional (admin tooling, not host-facing) |
| **Blueprint** `knowledge/researchBlueprint.js` | **None** (AdminConsole, missionControl, campaignRunner — all admin/knowledge-ops) | Admin console | N/A | No (admin-only, by design) | ⚠️ Same as above | No action — this is the Knowledge Factory layer, correctly walled off from host runtime per CLAUDE.md guardrails |
| **Research pipeline** `knowledge/researchPlaybooks.js`, `campaignRunner.js` | **None** (AdminConsole, knowledgeWorkers) | Admin console | N/A | No (admin-only, by design) | ⚠️ Same as above | No action |

---

## Interpretation

**Two different classes of "orphaned":**

1. **Should be wired, isn't (real defects):** Sprint A's `resolveEventIdentity()`. This is a host-facing engine that was built to feed Reveal and never connected.
2. **Correctly unreachable from host runtime (not defects):** ExperienceView, Blueprint, Research pipeline. These are admin/knowledge-ops tools. CLAUDE.md's architecture guardrails explicitly require the host shell never leak knowledge-manufacturing complexity — their isolation from `App.js` is the system working as intended, not a bug. `resolvePersona()`/`resolveShell()` are a gray area: built for host runtime, not yet wired, but **not required to fix the Reveal defect** (Reveal doesn't need persona/shell to render identity/blockers/risk) — flagged as future work, not fixed in this sprint per the "no new architecture" instruction.

**One defect drives most of the downstream failure:** because Identity was wired to the wrong reader, Risk (which reads `eventIdentity.isCompound`/`ceremonyComponents`) never fires either. Fixing Identity wiring should make Risk observable without any additional change.

---

## Fixes Performed This Sprint (see IS1_IMPLEMENTATION_REPORT.md for detail)

1. `AssembleReveal` now calls Sprint A's `resolveEventIdentity()` instead of the legacy `eventIdentity()` reader.
2. The `setAssemble(...)` trigger condition no longer depends on `intakeFamilyConfig(...).recordKind` — loosened to fire for any qualifying real event regardless of taxonomy family (Birthday/Retirement/Reunion/Anniversary/Graduation now included).
3. `why`, `status`, `nextDecision`, `confidenceLabel` are now rendered in the Reveal card markup.
4. HostHome's post-Reveal state audited against Reveal's claims for contradictions.

**Explicitly not touched (out of scope for this sprint):** `resolvePersona()`/`resolveShell()` wiring, global `intakeFamilyConfig`/taxonomy shell routing (Plan/Budget/Client Detail tabs), ExperienceView/Blueprint/Research pipeline (admin-only by design), animations, styling, UX layout.
