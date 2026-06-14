# Sprint 55J — Product OS Governance Pass (Notion-ready)

*Reviewing the 55E–55I audit + implementation findings against the existing Product OS, Pattern Library, Studio Matte doctrine, and Anti-Pattern Library. Only evidenced findings are promoted. The repo Pattern Library (`engine-audit/NGW_PRODUCT_PATTERNS.md`) has already been updated with the three promotions below; this doc is the ready-to-paste Notion mirror + the governance decisions.*

**Promotion summary**
| Candidate | Classification | Recommendation | Status |
|---|---|---|---|
| Inform Without Escalating | **New Pattern (010)** | EXECUTE | ✅ promoted |
| Never-Infer boundary | **Pattern Update (009)** | EXECUTE | ✅ promoted |
| Silent Data Subset | **New Anti-Pattern (AP-001)** | EXECUTE | ✅ promoted |
| Two next-action authorities (cascade vs solve binding) | No new pattern (covered by 006) | KILL → archive | event-specific |
| "Audit before build" cadence | No change (embodied in 006/007) | KILL | process, not doctrine |
| Host physical-infrastructure blind spots | Event-OS knowledge (not Product OS) | PARK (build queued) | logged below |

---

## 1. Product OS Updates *(paste → Product OS / Doctrine)*

**Doctrine clarified (not new): Inform vs Escalate is a first-class boundary.**
A product surface may be *rich* (many helpful signals) without being *noisy* (everything demanding action), **only if** informational/requirement signals are kept out of the priority/escalation system. This is now codified as Pattern 010 and refines the relationship between Patterns 001/002 (the decision-first ladder + single hero) and 007/008 (surface the authored data on the surface that owns it). **Net doctrine:** *expose authored intelligence widely (007/008), but let only true blockers escalate (010).*

No change to Studio Matte doctrine — the capacity/infra rows use the neutral steel `ESTIMATE`/`REVIEW` treatment, consistent with "secondary = steel; status colors only for status" (the rows are intentionally **not** green/amber/red).

---

## 2. Pattern Library Updates *(paste → Pattern Library)*

### Pattern 010 — Inform Without Escalating *(NEW)*
- **Principle:** a surface may render an informational/requirement signal without it entering the priority/escalation computation.
- **Rule:** informational signals render on their owning surface but must not feed the action-priority math (next-action cascade, hero/spine, attention count).
- **Anti-pattern:** routing a requirement into the priority engine so it inflates urgency and pre-empts a real blocker.
- **Evidence:** 55H-B3A — the Capacity row is in the *display* `health` array (`CommandCenter.deriveCommandCenterData` ~L353), **not** in `getEventReadiness` (4 axes ~L784) which the cascade alone counts (`[r.decision, r.vendor, r.timeline, r.document]` ~L959). Zero change to the surfaced next-step in QA.
- **Recommendation:** EXECUTE *(promoted)*.

### Pattern 009 — Requirements Before Gaps *(REFINEMENT: the Never-Infer boundary)*
- **Added:** some facts are not just un-derivable but **unsafe to infer** — physical **load** (circuit/power) and **adequacy of a physical space/duty** (parking, restrooms, room capacity, child-safety supervision, accessibility readiness). Never estimate these; the only honest move is a **prompt to confirm**, never a number/deficit/adequacy claim.
- **Evidence:** 55H-B3 / 55I — parking/restroom/power are absent from the data **and** venue-specific; a fabricated number reads as measured.
- **Recommendation:** EXECUTE *(promoted)*.

### No-change confirmations *(patterns re-validated, no edit)*
- 001 Decision-First (55G shipped "Confirm final guest count" before "Buy protein").
- 005 Operational Layer + 007 Surface Before Building + 008 Right Surface (55H-B1/B2R/B3A shipped run-of-show, day-of NOW/NEXT, capacity by routing authored data).
- 006 Reuse Before Reinvention (B2R: the marker already existed; no new engine).

---

## 3. Anti-Pattern Library *(paste → Anti-Pattern Library)*

### AP-001 — Silent Data Subset *(NEW)*
- **Failure:** authored data mirrored in a canonical store + a runtime copy, where the runtime copy is a **subset** that silently drifts; the reader no-ops for the subset record and the gap is invisible until a feature is built on the missing field.
- **Evidence:** `dinner-party.playbook.json` (canonical) had `schedules` + `rentalsGap`; `src/.../dinnerParty.js` (runtime, migrated as a subset in 55C-1) shipped without them. **Two sprints (55H-B1, 55H-B3A) each discovered + backfilled the gap mid-build**; the other 4 playbooks masked it.
- **Fix:** one source of truth — import/generate `src` from canonical, or a parity test that fails when a `src` playbook lacks a canonical field. Smell: "field present in N−1 of N records."
- **Recommendation:** EXECUTE *(promoted; the parity-test fix is itself queued — see Decisions Log #6).*

---

## 4. Event OS Knowledge Library *(paste → Event OS Knowledge)*

*Operational intelligence — event-specific, NOT product doctrine.*

1. **The host physical-infrastructure blind spot (highest-value).** A first-time host using only NGW would succeed on the *soft* layer (decisions, run-of-show, capacity) and fail on the *physical* one: **power, parking, restrooms, food-safety enforcement, injury/emergency, lighting** are dark or absent across all 5 host playbooks. (55I, ranked Top-20.)
2. **Injury/emergency is absent even for BBQ** (a grill + fire with no first-aid/extinguisher prompt) — the single highest-liability gap.
3. **Weather/food-safety/alcohol contingencies are authored but dark** — present in `risks`/`contingencies`, never surfaced when they matter.
4. **Host vs client events are distinct rosters** — host events belong in My Events (now event-based), client events in Client Events; a host event with no client record is invisible if My Events lists clients (shipped fix, PR #39).
5. **Trade quantities remain the operational backbone** — ice ~1.5 lb/guest indoor / ~2 lb outdoor, ~0.5 lb protein/guest, ~1 chair/guest, etc., source-honest in the playbook `knowledge` blocks (`verificationStatus`).

---

## 5. Decisions Log *(paste → Decisions Log)*

| # | Decision | Reasoning | Evidence | Recommendation | Status |
|---|---|---|---|---|---|
| 1 | Promote **Pattern 010 — Inform Without Escalating** | Reusable across products; protects the priority ladder from informational inflation | Capacity in display `health` (L353) vs `getEventReadiness` 4-axis (L784) counted at L959; zero next-step change in QA | EXECUTE | ✅ Done |
| 2 | Refine **Pattern 009** with the Never-Infer boundary | Load/adequacy are venue-specific; fabricating them violates 003 | 55H-B3/55I: power/parking/restroom absent + unsafe | EXECUTE | ✅ Done |
| 3 | Add **AP-001 — Silent Data Subset** | Cost two sprints; prevents recurrence | dinnerParty.js missing schedules (B1) + rentalsGap (B3A) vs canonical JSON | EXECUTE | ✅ Done |
| 4 | Do **not** promote "two next-action authorities" to a pattern | Already covered by 006 (don't build a parallel engine); event-specific shadow | 55F: `EngineNextStep` shadow vs cascade | KILL → archive | Archived |
| 5 | Do **not** create an "audit-before-build" pattern | Embodied in 006/007; would be process-as-doctrine | 55E–55I cadence | KILL | Closed |
| 6 | Queue the **canonical→src parity test** (AP-001 fix) | Stops the subset class for good | AP-001 | EXECUTE (next) | Open |
| 7 | Queue the **Infrastructure-check prompt row** (55I smallest win) | Surfaces the dark infra prompts + power/emergency/child-safety | 55I Part 6 | EXECUTE (next) | Open |

---

## Product OS Governance Check

1. **What should become permanent doctrine?** Pattern 010 (Inform Without Escalating), the Pattern 009 Never-Infer refinement, and AP-001 (Silent Data Subset) — all evidenced, product-agnostic, reusable.
2. **What remains event-specific?** The physical-infrastructure findings, the trade quantities, and the host/client roster split — these live in the **Event OS Knowledge Library**, not the Product OS.
3. **What should be archived as historical learning?** The two-next-action-authorities / shadow-comparator investigation (55F) and the B.2 wrong-surface attempt — keep the *lessons* (which produced Patterns 008/010), archive the implementations.
4. **What should never be added to the Product OS?** Inferred physical values — power/circuit load, parking spots, restroom adequacy, accessibility/child-safety adequacy. The **doctrine** ("never infer these") belongs in the OS; the **numbers** must never be authored as if known.

---

## Success condition — met
Every meaningful finding was routed: **3 promoted to the Product OS** (1 pattern, 1 refinement, 1 anti-pattern — all evidenced), **5 logged as Event-OS knowledge**, **2 archived** as historical learning, **2 queued** as builds, and the never-infer values explicitly **fenced out**. No orphaned knowledge; the Pattern Library is stronger, clearer, and more reusable for future NGW products.

*The repo Pattern Library is updated; this doc is the Notion mirror. Say the word to push these blocks into Notion via the connected workspace.*
