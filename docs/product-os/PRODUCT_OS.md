# NGW Product OS — Canonical Source of Truth

The doctrine every No Guesswork Systems (NGW) product is built from. Six layers, top → bottom in authority. Lower layers may specialize a higher one but may never contradict it. **Append, consolidate, never duplicate.** Every entry records its **origin sprint**, **evidence**, and **affected products**.

Established: 2026-06-14 (Curator pass after Intake Rebuild + Sprint 53 Engine Hardening).
Affected products legend: **EB** = Event Boss app · **NS** = Notion Studio template · **ALL** = every NGW product.

---

## 1 · Executive Principles
*The non-negotiables. If a decision conflicts with one of these, the decision is wrong.*

- **EP-1 · No Guesswork = the system cannot disagree with itself.** One concept resolves to one answer everywhere. Duplicated classifier/keyword logic across modules is a defect, not a convenience. *(Origin: Sprint 53. Evidence: 5 separate type classifiers found drifting; consolidated to `eventTaxonomy.js`. Affected: ALL.)*
- **EP-2 · Bless = 10+, and it is GATED, not summed.** A single real blocker caps the composite below bless no matter how strong the rest is. Never "almost ready" until every dimension is 10 AND the system feels inevitable. *(Origin: standing; reinforced this sprint. Evidence: home-host 3.2→4.3→6.5, still "not host-first" because of one structural blocker. Affected: ALL.)*
- **EP-3 · Render-AND-trace, not render-OR-claim.** A fix is unproven until you (a) see it on the rendered screen and (b) trace the same datum reappearing in a downstream instrument. A passing unit test or "compiles clean" is necessary but not sufficient. *(Origin: Path-to-10 + Sprint 53. Evidence: the board caught a full compile-error overlay a code check called "ok". Affected: ALL.)*
- **EP-4 · Verify the audit against source before implementing.** Audits/specs (even expert ones) are hypotheses. Reproduce each finding in the live code; refute the wrong ones. Build only confirmed issues. *(Origin: Sprint 53. Evidence: audit claimed 9 vendor categories "missing"; all 9 were present — the real gap was playbook depth. Affected: ALL.)*

## 2 · Studio Matte Design System
*Visual + status language. See memory `feedback_studio_matte_no_warm_gold`, `feedback_attention_system` (canonical detail). Summarized pointers only — do not re-state in full here.*

- **SM-1 · Status colors:** RED at-risk · AMBER `#ef962e` approaching-with-a-clock (≤7d) · GREEN on-track · STEEL neutral substrate. Amber never an accent or wallpaper; one accent moment = brand steel-blue; confidence channel stays green/steel. *(Origin: 2026-06-13 amber ruling. Affected: EB, NS.)*
- **SM-2 · The Attention System:** ONE hero per screen · evidence whispers · 3 contrast tiers · progressive disclosure · motion = change only · empty screen = caught-up reward. *(Affected: ALL.)*
- **SM-3 · Counts are informational (white); urgency lives on the near-term row, not the aggregate.** A big ever-present count painted amber is wallpaper. *(Origin: 2026-06-13. Affected: EB.)*

## 3 · Runtime Architecture
*How NGW software is wired.*

- **RA-1 · One canonical taxonomy; classifiers DERIVE.** A single table (`eventTaxonomy.js`) maps each type to its answer on every axis; engines call accessors, never re-add keyword/regex logic. Edit the table, not the engines. *(Origin: Sprint 53 Task 1/2. Evidence: `project_event_taxonomy_canonical`, 33/33 node parity harness. Affected: EB; pattern for ALL.)*
- **RA-2 · Map each AXIS once — axes are not collapsible.** solveFamily (granular CPM graphs) ≠ family (intake/budget complexity) ≠ shareFamily (budget breakdown) are *different questions*. The canonical layer holds all three per type; it does not force one "family for everything." *(Origin: Sprint 53. Evidence: corrected the audit's "one event, five answers" framing. Affected: ALL.)*
- **RA-3 · Off-taxonomy degrades to the SAFE MIDDLE, never the maximal.** Unknown/aliased inputs resolve via keyword inference to a middle-weight default; they must never fall through to the most complex/expensive family. *(Origin: Sprint 53. Evidence: "Welcome Dinner"→home, "Trivia Night"→host_driven, never full_service. Affected: ALL.)*
- **RA-4 · Audience is an engine axis (`recordKind`), and surfaces READ it.** `recordKind:'event'` (self-host) vs `'client'` (professional engagement) drives vocabulary, chrome, suppression, and tab visibility from the engine config. No ad-hoc `if (home)` checks in surfaces. *(Origin: Intake Rebuild. Evidence: `INTAKE_FAMILIES` config + ~12 surfaces routed off it. Affected: EB; pattern for any multi-persona product.)*
- **RA-5 · Build hygiene is render-visible.** A misplaced import (`import/first`) or any compile warning surfaces as a full-screen overlay that crashes the user experience — and a code-level "compiles" check can miss it. Capture-and-look is part of QA. *(Origin: Sprint 53 re-demo. Evidence: confidence.js mid-file import crashed the build behind the dinner-party modal. Affected: ALL.)*

## 4 · Product Patterns
*Reusable solution shapes.*

- **PP-1 · Family-aware suppression (not amputation).** A surface shows only what its family calls for; a populated section is never hidden (`familyShows || hasData`). *(Origin: Intake Rebuild. Evidence: Dinner Party intake = 3 sections, Wedding = 10. Affected: EB.)*
- **PP-2 · Show only the tab that is *theirs*.** When two surfaces serve different personas, gate each on having its own content so most users see exactly one (Client Events vs My Events). Name by ownership, not by object ("Client Events"/"My Events", not two "Events"). *(Origin: 2026-06-13. Affected: EB.)*
- **PP-3 · A self-host gets a checklist, never a sales funnel.** Host on-ramp = invites/headcount/menu/dietary/shopping/setup; never Inquiry→Proposal→Contracted, planner fees, "intake", "roster", or "client". *(Origin: Intake Rebuild board home-host demo. Affected: EB.)*
- **PP-4 · Stepper-driven progressive disclosure.** Open only the sections relevant to the current lifecycle stage; collapsed sections carry a fill-state caption so value shows without opening empty drawers. *(Origin: Intake Rebuild #7. Affected: EB.)*
- **PP-5 · Intake captures the EVENT, not the intent.** A record with no operational facts (date, location, deposit, COI, headcount) tracks nothing. Every captured field must drive a downstream instrument (countdown / deposit clock / dock board / readiness). *(Origin: Intake Rebuild. Evidence: vendor values+COI seeding; client date→stub event w/ live countdown. Affected: EB.)*

### ⚠ Anti-pattern (promoted) — **"Tuxedo on a contact form"**
Reskinning copy over an unchanged CRM/sales skeleton does NOT make a product serve a new persona. The host modal scored 6.5 but still opened *on top of* the planner's "Client Portfolio" pipeline/AR — kind words, wrong room. **A new persona needs its own shell, not a relabeled one.** *(Origin: Intake Rebuild board re-demos. Affected: ALL.)*

## 5 · Expert Knowledge Library
*Domain truth (event planning).*

- **EK-1 · Budget per-head by family, bands OVERLAP (non-additive).** home_hosted $30–120 · host_driven $60–250 · full_service $200–500 · corporate $150–400 · travel_led $200–600. Category-share bands intentionally overlap (a planner shifts budget); they do NOT sum to 100%. **Venue (site rental ~12–20%) ≠ venue+catering combined** — never double-label. *(Origin: Sprint 53 Task 4/5. Affected: EB.)*
- **EK-2 · Five intake families.** home_hosted / full_service / corporate / host_driven / travel_led — each defines venue/vendors/COI/deposit/partner/vision/pipeline/communication flags + host-facing vocab. *(Origin: Intake Rebuild. Affected: EB.)*
- **EK-3 · Cultural/religious events are first-class needs, not edge cases.** Bar/Bat Mitzvah, Diwali, Eid, Lunar New Year, Bris, Quinceañera must classify, estimate, and get sensible vendors — via taxonomy aliases + cultural flags. Don't overbuild; do route correctly. *(Origin: Sprint 53 Task 8. Status: aliases + flags shipped; deeper consumption pending. Affected: EB.)*
- **EK-4 · Vendor accountability has DEPTH, not just presence.** A category in a roster without a playbook + questions + accountability model is half-built (9 corporate/gala categories found roster-present, playbook-absent). *(Origin: Sprint 53 Task 6. Affected: EB.)*

## 6 · Doctrine Ledger
*Append-only. Promote a finding to doctrine after it recurs across ≥2 sprints/surfaces. Candidate = seen once; Doctrine = promoted.*

| ID | Doctrine | Status | Origin | Evidence | Affects |
|---|---|---|---|---|---|
| DL-001 | Render-first review catches failures code checks miss (compile crashes, duplicate captures, CRM-bleed) | **Doctrine** | Intake Rebuild + Sprint 53 | compile-overlay catch; byte-identical capture detection | ALL |
| DL-002 | Verify audit findings against source; refute the wrong ones before building | **Doctrine** | Sprint 53 | 9 "missing" vendor cats were present | ALL |
| DL-003 | One canonical taxonomy; engines derive, never re-implement classification | **Doctrine** | Sprint 53 | eventTaxonomy.js, 5 classifiers unified | ALL |
| DL-004 | `recordKind` (persona) is an engine axis; surfaces read it, no ad-hoc branches | **Doctrine** | Intake Rebuild | INTAKE_FAMILIES drives ~12 surfaces | ALL |
| DL-005 | New persona needs its own shell, not a relabeled one ("tuxedo on a contact form") | **Doctrine** | Intake Rebuild | 6.5 ceiling: host modal inside Client Portfolio | ALL |
| DL-006 | Off-taxonomy resolves to the safe middle, never the maximal family | **Doctrine** | Sprint 53 | keyword-fallback parity tests | ALL |
| DL-007 | Bless is gated not summed; one structural blocker caps the score | **Doctrine** | standing | host-host 6.5 capped by shell blocker | ALL |
| DL-008 | Identity informs by **annotation, never computation** — expression before expansion; meaning changes emphasis/explanation, never the math/set | **Candidate** | Sprint 60C | 60C audit: Event Identity earns a whisper in 4 existing surfaces (Outcomes/Spine/Vendor/Event-Day) via the renderAction seam + becauseLayer, **0 new engine**; forbidden from scores/quantities/deadlines (`engine-audit/SPRINT_60C_PLANNING_ALIGNMENT.md`) | EB |
| DL-009 | **Cost surfaces are persona-split:** a host gets a *spending plan* (what it costs me); a planner gets the *AR/fee/vendor cockpit* (getting paid). Never show the host the ledger — gate on `recordKind`, own shell not a relabel (reinforces DL-005 / RA-4 / PP-3) | **Candidate** | Sprint 60E | Host Budget audit: the `Budget` component renders Stripe collection links, fee schedule, vendor committed/uncontracted, client/AR with **no recordKind branch** — while `home_hosted` is `diy/no-vendors/no-deposit/no-fee` (`engine-audit/SPRINT_60E_HOST_BUDGET_AUDIT.md`) | EB |

---

### Curator notes
- This file supersedes scattered per-sprint verdicts as the canonical reference. Per-sprint docs (board verdicts, roadmaps, verified-findings) remain as *evidence*, linked from ledger rows, not as competing doctrine.
- Next consolidation: fold the standalone amber ruling, attention-system, and bless-threshold memory files into §2/§1 pointers (they currently live only in the memory index).
