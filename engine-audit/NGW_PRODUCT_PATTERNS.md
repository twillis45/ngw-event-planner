# NGW Product Operating System — Pattern Library

*Reusable operating principles extracted from building the NGW Event Planner, captured as portable IP for the broader **No Guesswork Product Operating System (NGW-POS)**. Each pattern is product-agnostic: it states a principle, the rule that enforces it, the anti-pattern it kills, where it was discovered, and which NGW products it powers. The Event Planner is the proving ground; these patterns are the asset.*

**Products in scope:** Event Planner · Lighting Intelligence · Photography Business OS · Studio Operations OS · FCR Command Center · future NGW products.

---

## Pattern 001 — Decision-First Runtime

**Principle.** Prerequisite decisions always outrank dependent actions.

**Rule.** A user is never instructed to execute an action before the decision that the action depends on exists. If the prerequisite decision is unresolved, surface the *decision*, not the action.

**Bad (action surfaced before its decision):**
- Buy protein · Order flowers · Reserve chairs

**Before those, the decision must exist:**
- Headcount finalized · Budget approved · Venue confirmed

**Runtime priority ladder:**
1. Solve (a constraint/date is at risk)
2. Blocking decision (headcount, dietary, menu, venue)
3. Vendor risk
4. Readiness risk
5. Operational decision (non-blocking host choices)
6. Purchase
7. Execution task
8. Contingency / recovery

**Anti-pattern.** Purchases (or any dependent action) appearing before the prerequisite decision is resolved — the "shopping-list" failure mode.

**Enforcement note.** Gate the dependent action on observable state; where the decision's done-state is undetectable, surface it as a *prompt*, never a hard block (an undetectable hard block hides the action forever).

**Origin.** Event Planner Sprint 55F (design) → 55G (implementation): the playbook reader surfaced purchases gated only by a date window; "Buy protein" could precede "Confirm final headcount."

**Future products.** Event Planner · Lighting OS (don't spec fixtures before the room/throw decision) · Photography Business OS (don't quote before scope) · Studio Operations OS · FCR Command Center.

---

## Pattern 002 — Next Action Spine

**Principle.** Every screen answers three questions, in order:
1. What matters?
2. Why?
3. What should I do next?

**Rule.** No primary surface ships as a passive readout. The single highest-priority next action is always present, with its justification.

**Anti-pattern.** Dashboards that surface information without guidance — data the user must interpret into a decision themselves.

**Origin.** NGW Event Planner (the Next-Step Spine) · NGW Lighting.

**Future products.** Every NGW product's L1/home surface.

---

## Pattern 003 — Trust Before Intelligence

**Principle.** Never show uncertain information as truth. Escalate only after certainty; never de-escalate after having displayed certainty.

**Rule.** Until data is hydrated/confirmed, render the calm/neutral state. Move *up* in severity as confidence arrives — never show a red/critical or a confident value and then walk it back, and never paint sample data as if it were real.

**Examples (real defects this pattern prevents):**
- Red → Steel flash (the spine showed critical, then downgraded on hydration).
- Sample → Real data flash (balance "600K → 200K"; whole-app sample values flashing before cloud truth).

**Origin.** Spine hydration bug (gate critical accent on `eventsHydrated`) · No-seed runtime fix (`hasSupabaseSession()` — never paint samples for a signed-in user).

**Future products.** Any product with async hydration, cloud sync, or sample/demo data.

---

## Pattern 004 — One Meaning, One Label

**Principle.** One concept gets exactly one label. Users never translate terminology in their heads.

**Rule.** A single canonical vocabulary maps each concept to one planner-facing label across every surface; engines and internal states may differ, but the rendered word is unified.

**Anti-pattern.** The same concept under different names on different screens (status vocab drift); forcing the user to learn that "X here" = "Y there."

**Origin.** Pipeline Vocabulary Unification (`STATUS_DISPLAY` / `clientStatusLabel`).

**Future products.** Every product with statuses, stages, or lifecycle states.

---

## Pattern 005 — Operational Intelligence Layer

**Principle.** Tracking dates is not planning. A system that only stores when things happen is a calendar, not an operator.

**Rule.** Operational guidance must carry the full execution layer:
- decisions · purchases · quantities · readiness · contingencies · recovery paths

…derived from grounded, source-honest domain knowledge (not generated checklists), and surfaced through the existing runtime — not a new dashboard.

**Anti-pattern.** A milestone/date tracker presented as "planning"; a checklist with no quantities, no dependencies, no recovery path.

**Origin.** Playbook System · Dinner Party Operational Layer (the `playbooks/` reader: decisions, purchases with `qtyPerGuest`, buy windows, risks, contingencies, schedules; honest `verificationStatus`).

**Future products.** Lighting OS (gear lists + power/load + fallbacks) · Photography Business OS (shoot run-of-show + deliverable pipeline) · Studio Operations OS · FCR Command Center.

---

## Pattern 006 — Reuse Before Reinvention

**Principle.** When a capability appears missing, the default assumption is that it already exists somewhere in the system and is mis-routed — not that a new engine is required.

**Rule.** Before building anything new, run the four audits in order:
1. Audit the runtime (what computes a signal today?)
2. Audit existing intelligence (what data is already authored?)
3. Audit existing surfaces (what already renders?)
4. Audit existing workflows (what path already reaches the user?)

Only build a new engine if the capability *truly* does not exist after all four come back empty.

**Preferred path:**
> Data → Existing Runtime → Existing Surface

**Before reaching for:**
> Data → New Engine → New UI

**Anti-pattern.** Building a Planner Brain / Readiness Engine / Contingency Engine / AI Orchestrator when the capability already exists elsewhere — adding a parallel system instead of routing the one that's already there. (Every such "engine" becomes a second source of truth that can disagree with the first — see Pattern 001's two-authority problem.)

**Origin.** Sprints 55C (runtime audit found ~70% already existed), 55E (quality audit: authored-but-dark intelligence), 55F (decision-first design = routing, not a new engine), 55G (shipped planner-grade behavior with zero new engines/dashboards/UI).

**Evidence it works.** 55G moved the product from "Buy protein" to "Confirm final guest count" with **one gate + one cascade tier** over existing data — no new architecture. The capability was never missing; the orchestration was.

**Future products.** Every NGW product. The first response to "we need an X engine" is the four audits, not a ticket to build X.

---

## Pattern 007 — Surface Before Building

**Principle.** When a capability seems missing, assume the intelligence already exists and the job is to *expose* it — not to create another engine to produce it.

**Rule.** The first move for any "we need X" is to **surface** authored-but-dark data through an existing surface, and only escalate to building if surfacing proves the data genuinely isn't there. Surfacing is cheap, reversible, and never adds a second source of truth; building does the opposite.

**Relationship to 006.** Pattern 006 (Reuse Before Reinvention) is the *audit discipline* — look before you build. Pattern 007 is the *bias for action it produces* — when the audit finds dark data, route it to a surface; don't model it again. 006 says "check first"; 007 says "expose, don't re-derive."

**Anti-pattern.** Authoring a parallel data model / engine for intelligence that is already written down somewhere and merely unrendered (e.g. building a "run-of-show generator" when the playbook already contains setup/cook/cleanup schedules).

**Origin.** Sprint 55H-B1: the playbook run-of-show was fully authored (`schedules`) and invisible; the Event Day Schedule tab seeded generic content. The fix surfaced the authored schedules through the existing tab — no generator, no new surface, ~one reader function.

**Future products.** Lighting OS (surface the authored shot/gear list before building a planner), Photography Business OS (surface the deliverable pipeline before a workflow engine), every NGW product.

---

## Pattern 008 — Right Surface Before New Surface

**Principle.** Before adding a new feature or modifying the runtime, verify whether the capability already exists on the **correct** surface — and if the user need is mode-specific, surface it *inside that mode* rather than bolting it onto a general one.

**Rule.** Match the need to the surface that owns it. A signal shown on the wrong surface (even if technically present) reads as missing. Don't promote mode-specific guidance to a global surface that another priority pre-empts.

**Surface ownership (Event Planner, as a worked example):**
- **Home Spine** → gets the user *to* the right mode ("Your event is today → Enter Day-of Mode"). It does not own granular execution detail.
- **Event Day Schedule / Day-of Mode** → owns **NOW / NEXT** execution guidance.
- **Command Center** → owns operational triage (decisions, vendor, readiness).
- **My Events / Client Events** → own the host vs professional event rosters.

**Relationship to 006/007.** 006 says *audit before building*; 007 says *expose authored data before re-deriving it*; **008 adds the targeting rule** — expose it on the surface that *owns* the need. Getting 006/007 right but on the wrong surface still fails the user (the data is "present" but invisible where they look).

**Anti-pattern.** Forcing a signal onto a surface a higher priority owns (B.2: pushing "what's next" into the Home Spine, which the event-day hero pre-empts) instead of the surface that owns it (the Event Day Schedule's NOW/NEXT board — B2R).

**Origin.** Sprint 55H-B2 → B2R: execution guidance was wired to the Home Spine (wrong surface, pre-empted, invisible); the correct surface (Event Day Schedule) already owned NOW/NEXT and just needed the B.1 data.

**Future products.** Every NGW product: map each need to its owning surface/mode before building, and never let a higher-priority surface swallow a mode-specific signal.

---

## How patterns relate

- **002 (Spine)** is the *surface contract*; **001 (Decision-First)** is the *ordering law* that governs what the spine shows next.
- **005 (Operational Layer)** supplies the *content* the spine ranks; **001** ensures that content is ordered decision-before-action.
- **003 (Trust)** governs *when* any of it is allowed to appear; **004 (One Label)** governs *how it reads*.

Together they describe an NGW product that behaves like an experienced operator: it knows what matters, shows it honestly, names it once, orders decisions before actions, and carries the full operational layer — without adding another dashboard, engine, or brain.

*Living document — append a new `Pattern NNN` entry each time a reusable operating principle is proven in a shipped NGW product.*
