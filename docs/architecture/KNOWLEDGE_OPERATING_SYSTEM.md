# Knowledge Operating System — v1.0 (Canonical)

**Status:** Canonical, living. The **top** of the platform hierarchy — the doctrine that unifies the [Playbook OS](./PLAYBOOK_OPERATING_SYSTEM.md) (the corpus), the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md) (the truth engines), and the projection/role layer (new here). Curate after each sprint; never re-invent the framework.
**Owner:** Todd. **Established:** 2026-07-02 (ratifying the Platform Architecture memo v2 → v3).

> **The thesis in one line:** There is **one canonical body of knowledge**. Truth Engines compute over it, a **Projection Engine** presents it per *role · phase · workspace*, and workspaces assemble those projections into experiences. **Knowledge never forks. Views never own truth.** Every future role, workspace, event type, or product is a new *projection*, never new knowledge and never a new intelligence.

---

## 0. Why this document exists

Event Boss is becoming a **Knowledge Platform for Events** — hosting is the first customer, not the product. The risk at this scale is *fragmentation*: a Planner app, a Venue app, a Corporate app, each with its own forked playbooks and bolted-on "role intelligence." This OS makes that structurally impossible by fixing one hierarchy and one hard rule: **if two roles disagree, the Truth Engine changes — never the projection.**

This OS does **not** replace the others; it sits above them:
- **[Playbook OS](./PLAYBOOK_OPERATING_SYSTEM.md)** governs the corpus (now: one *kind* of Knowledge Asset).
- **[Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md)** governs the Truth Engines (L2 playbook · L3 Context · L4 Host · …).
- **[Readers](./INTELLIGENCE_READERS_REGISTRY.md) / [Writers](./INTELLIGENCE_WRITERS_REGISTRY.md) registries** + the **[Validation Platform](./INTELLIGENCE_VALIDATION_PLATFORM.md)** govern consumption, production, and proof.
- **This OS** adds the layer above them: **Knowledge Assets → Projection Engine → Workspaces**, and the **Role Registry**.

---

## 1. The permanent hierarchy

```
Knowledge Assets      ← the ONE canonical body of truth (playbooks + future kinds)
   ↓
Truth Engines         ← compute/discover/validate/remember FACTS (Intelligence OS)
   ↓
Projection Engine     ← present truth per Role · Phase · Workspace (PURE, read-only)
   ↓
Workspaces            ← assemble projections into an operational experience
   ↓
Experience            ← the rendered surface
```

This hierarchy is permanent. Every feature must locate itself in exactly one layer. **If it doesn't fit, challenge the design** (the 10-question gate, §9).

---

## 2. Knowledge Assets (the canonical object)

"Playbook" becomes one **kind** of Knowledge Asset. The [Playbook registry](../../src/lib/playbooks/playbookRegistry.js) generalizes to a **Knowledge Registry** via a `kind` field. Playbooks remain the user-facing artifact; the *canonical object* is the Knowledge Asset.

| Kind | Example |
|---|---|
| `playbook` | Crab Feast, Wedding (shipped — the 39 today) |
| `runbook` · `checklist` · `workflow` | future operational kinds |
| `venue-kit` · `vendor-kit` | role/operator knowledge |
| `role-pack` · `template` · `policy` · `intelligence-pack` | future |

**Rule:** everything derives from Knowledge Assets. A new kind extends the registry's `kind` enum + its derivation; it never creates a parallel store (EP-1).

---

## 3. Truth Engines (own reality)

Truth Engines are the **only** thing that owns facts. They are the Intelligence OS engines, named at platform scope:

Knowledge · Occasion (L2 playbook) · Context (L3) · Host (L4) · Vendor · Financial · Outcome · Learning (the eval corpus).

**Every Truth Engine declares** — Reader · Writer · Validation · Governance · Observability · Explainability. This is the existing nine-field registry discipline; **no new truth engine ships without registry entries** (Readers/Writers). Role-named "intelligences" (Planner/Coordinator/Corporate/Venue) are **NOT** truth engines — they are projections (§4). *A coordinator has a different view of a dinner party, not different facts about it.*

---

## 4. The Projection Engine (presents truth — never owns it)

The one new primitive. **Pure, read-only, no calculations, no business logic, no mutations** — the same contract as a reader, but for *presentation* instead of *adjustment*.

```
projection = f( Knowledge , Role , Operational Phase , Workspace )
```

A projection is a **declarative selection + relabel** over already-resolved truth. The knowledge object already carries every section each role needs (`tasks`, `schedules`, `capacity`, `heartMoments`, `vendors`, `risks`) — a projection *picks and renames*, it never adds or edits.

### 4a. Role axis
Host · Co-host · Planner · Coordinator · Producer · Corporate Manager · Venue Manager · Banquet Captain · Photographer · DJ · Vendor · Hospitality · Security · Operations Lead · (future).
A new role = **one Role Registry entry + one projection definition. Never new knowledge.** The precedent is live: `audiencePersona()` already renders Host / Operator / Planner from one flag-free core (`recordKind`, RA-4 / DL-004) — the Projection Engine formalizes that seam.

### 4b. Operational Phase axis (the v3 refinement)
The same role needs different information by phase:

`Planning · Preparation · Shopping · Load-In · Setup · Guest Arrival · Live Event · Execution · Strike · Cleanup · Wrap-Up · Recap · Learning`

A Coordinator in **Planning** ≠ in **Execution** ≠ in **Wrap-Up**. **Phase is derivable from the corpus, not newly authored** (EP-1): playbook `tasks[].phase` (logistics/guest/food/setup/cleanup), `milestones[].category`, and `schedules{purchasing/preparation/setup/cleanup}` already tag work by phase. The projection filters the resolved plan by phase; it invents no new phase data.

---

## 5. Workspaces (assemble projections)

Workspaces organize projections into an operational experience (Host · Planner · Coordinator · Corporate · Venue · Operations · Photography · Media · Vendor …). **Workspaces own NO intelligence** — they compose projections. Dual-persona is *gating over a shared core, not a fork* (Host Shell Decision). Host is the only live workspace; others are **parked until real role-demand pulls them** — the seam makes them cheap when they arrive.

---

## 6. The Role Registry (governance — the sibling of Readers/Writers)

**No projection ships unregistered.** Same discipline as the intelligence registries. Every entry declares:

`Role · Consumes (knowledge sections + truth engines) · Produces · Primary Goal · Success Metrics · Decision Rights · Notifications · Visibility · Operational Phases · Workspace · Terminology · Permissions · Validation Owner.`

This is the fourth governance surface (Readers · Writers · Role · + the Knowledge Registry health), and it keeps projection expressiveness from becoming drift.

---

## 7. Knowledge Command Center

The [Playbook Command Center](../../src/admin/AdminConsole.jsx) (shipped 2026-07-02) evolves into the **Knowledge Command Center** — extend, never duplicate its observability. It governs: Knowledge Registry · Lifecycle · Maturity · Health · Grounding · Validation · Dependencies · Research Queue · Review Scheduling · Stewardship · Coverage · Version History · Observability · Performance · future kinds.

**Three orthogonal axes (do not collapse):**
- **Lifecycle** (governance): Concept → Draft → Researching → Grounded → Internal Testing → Closed Cohort → Validated → Production → Needs Review → Deprecated → Archived. *Where it is in its governed life* — not quality.
- **Maturity** (evidence-gated): Concept → Authored → Grounded → Validated → Trusted → Canonical. *Promotion requires evidence, never opinion* — "Validated"/"Trusted" bind to the Validation Platform's scored-recommendation corpus.
- **Health** (component checks, shipped): Grounding · Sections · Shopping · Timeline · Risks · Food Safety · Validation · Dependencies · Governance · Research · Freshness · Coverage — each reports independently. **Never one score.**

*(Refinement of the shipped Playbook OS, which collapsed these into one derived `status`. The three-axis model supersedes it — status remains as a convenience rollup of lifecycle, not the whole picture.)*

---

## 8. Performance (measured only from real events)

Completion · Recommendation Accuracy/Acceptance/Reversion · Budget Accuracy · Food Waste · Timeline Accuracy · Operational/Vendor Success · Host/Coordinator/Planner Satisfaction. **Reuse the Validation Platform's `IntelEvaluation` harness — do NOT build a parallel metric system.** Until reconciled-event data exists, every tile shows **"Awaiting completed events"** with its `n`, greyed below the sample floor (Validation Platform §8). Never fabricate.

---

## 9. The 10-question gate (every review/build answers)

1. What canonical knowledge changes? 2. Which Truth Engine owns this? 3. Can an *existing* one own it? 4. Should it be Projection instead? 5. Does it belong in a Workspace instead? 6. Does it create duplicate intelligence? 7. Does it violate the Readers Registry? 8. The Writers Registry? 9. How is it validated? 10. Does it make the platform more extensible?

**Non-negotiables:** no duplicated knowledge/intelligence/playbooks · no role-specific forks · no fake scores/confidence/analytics/validation. Unknown is acceptable; invented certainty is not.

---

## 10. Change log
- **v1.0 (2026-07-02)** — Established the permanent hierarchy (Knowledge Assets → Truth Engines → Projection Engine → Workspaces → Experience), the pure read-only Projection Engine keyed on *Role · Phase · Workspace* (phase **derived** from existing `tasks[].phase`/`schedules`, not authored), the Role Registry contract (sibling of Readers/Writers), the Knowledge Command Center evolution, and the three-axis Lifecycle/Maturity/Health separation (superseding the Playbook OS single-`status`). Ratifies Platform Architecture memo v2→v3. Extends — does not duplicate — the Intelligence OS, Playbook OS, and registries. No code built in this doc; see the Execute/Test/Park/Kill in the memo for sequencing.
