# Sprint 55L — Persona Rendering Architecture Audit

*Code-grounded audit. No build, no runtime change. Question: what is the smallest path to **One Engine → Multiple User Confidence Layers** (a grandmother hosting a dinner, a first-time bride, a corporate exec, a pro planner — same engine + playbooks, different guidance/language/complexity) without forking workflows, products, logic, playbooks, or the next-action system?*

**Governance standard:** "The engine owns reality; the UI owns confidence." Promote only what code evidence supports. Date: 2026-06-14.

---

## Headline findings (4)

1. **It is genuinely ONE engine today.** One next-action authority, one readiness computation, one playbook set — no competing systems. The *precondition* for "one engine, many layers" already holds in code.
2. **The confidence-layer DATA already exists but is 100% DARK.** `engine-audit/playbooks/dinner-party.eos.json` carries `guestManagement` + `readiness` + `experience` + `mindset` + `plannerLens` (with an explicit `nextActionContract`) — fully authored, **zero runtime consumers** (`grep src/ "mindset|plannerLens|experience|guestManagement"` → 0). This is *hidden capability*, not missing capability.
3. **The app ALREADY renders a simpler-vs-fuller surface — but keyed to the EVENT, not the USER.** `recordKind` (`home_hosted` → `'event'` vs professional families → `'client'`) suppresses pipeline/discovery/comms/portal for self-host events and substitutes a plain-language Host Checklist. This is persona-rendering's nearest living relative — proof the pattern is achievable *without a mode toggle* — but it discriminates by event-ownership, not user sophistication.
4. **There is no persona signal and almost no copy seam.** No persisted user experience/sophistication field exists. ~90% of user-facing copy (every next-action title/consequence/CTA) is hard-coded inline; only 4 small label maps offer any swap-point.

---

## Part 1 — Existing capability (code evidence)

### 1A. One engine — confirmed
| Concern | Single source | Evidence |
|---|---|---|
| Next action | `selectEventNextAction` → `_selectEventNextActionInner` (one 14-tier cascade) | `src/CommandCenter.jsx:1121, 1171–1424` |
| Studio-level next action | `selectStudioCommand` (consumes same readiness) | `src/CommandCenter.jsx:830–1090, 972` |
| Readiness | `getEventReadiness` — 4 axes `[decision, vendor, timeline, document]` | `src/CommandCenter.jsx:753` |
| Playbooks | one registry + pure readers over shared data | `src/lib/playbooks/index.js:18–40`; readers `topPlaybookTask:224`, `topPlaybookDecision:234`, `playbookCapacity:409`, `playbookInfraPrompts:436`, `effectiveRos:385` |

The cascade emits **structured objects** (`{ title, consequence, primaryCta, statusLabel, … }`) from one function — the ideal single seam for a renderer.

### 1B. Dark confidence-layer data — the key asset
`engine-audit/playbooks/dinner-party.eos.json` (authored, unrendered):
- `guestManagement` (rsvp/comms/seating/conflict) — lines 11–23
- `readiness` — 20 checks across mental/physical/emotional/social — lines 25–54
- `experience` — 9 failure-mode detectors with severity — lines 56–66
- `mindset` — 4-phase coaching (Decide/Plan/Acquire&Prep/Execute) with mental/emotional/social/physical/**reassurance** language + `flagshipExample` — lines 68–118
- `plannerLens` — `successDeterminants`, `alwaysBuffers`, `thinkingByPhase`, `theOneThing`, and a **`nextActionContract`** ("answer *what would an experienced planner do next?* … state it with the WHY and the reassurance") — lines 131–152

The `reassurance` language is precisely the raw material for a **Host** (high-warmth, low-jargon) rendering; the `plannerLens`/severity language is the **Planner** (terse, diagnostic) rendering. The same authored truth, two voices — already written.

### 1C. Identity / role systems that EXIST (none capture persona)
| System | Field | Values | Purpose |
|---|---|---|---|
| Supabase auth | `app_metadata.role` | `admin` \| `support` | Admin-console gate (`AuthGate.jsx:246`, `AdminConsole.jsx:704`) |
| Studio membership | `studio_members.role` | `owner` \| `planner` \| `assistant` | Team permissions (`lib/api/studio.js:89`) |
| Plan tier | `profile.plan` | `essentials` \| `studio` \| `agency` | Feature gates (`App.js:14148`) |
| Profile label | `profile.role` | free text, default `Owner` | Display only (`App.js:31448`) |
| Alpha tester | `testerProfile.yearsExp/role` | research enum | **Research-only**, never reaches runtime (`AlphaTesterGate.jsx:228`) |

**None** is a persisted user-sophistication/persona attribute. `yearsExp` is collected but isolated to the observation kit.

### 1D. Event-family suppression — the nearest living relative
`src/App.js:1976–2038` (`INTAKE_FAMILIES`): `home_hosted` sets `pipeline/discovery/commsChecklist/clientPortal/communication = false` and swaps in `HOST_CHECKLIST` (invites/headcount/menu, plain language); the four professional families set them `true`. Derived at render via `intakeFamilyConfig(event.type).recordKind` (`App.js:17397, 31896`). **Persona-rendering already works here — but the discriminator is the event, not the user.**

### 1E. Copy seam — thin
- **Exists (B):** 4 frozen label maps — `ACCOUNTABILITY_LABEL` (`lib/vendorAccountability/derive.js:18`), `PROMISE_STATUS_LABEL` (`promiseModel.js:26`), `SEVERITY_LABEL` (`lib/severity.js:80`), `CREW_STATUS_LABEL` (`lib/studioTeam.js:27`). Each maps one fact → one string — a ready-made place to add a persona axis.
- **Absent (D):** ~50+ next-action consequence/CTA strings are inline (`CommandCenter.jsx:1184–1428`); **zero** examples of the same fact rendered two ways by any flag/role.

### 1F. Complexity adaptation — exists, but not persona-keyed
- Progressive disclosure: on-track events collapse behind a count (`App.js:18931`), empty-state reward "Nothing needs you right now" (`CommandCenter.jsx:2042`), sticky per-vendor collapse.
- Density cascade by **escalation severity** (`full`/`compact`/`crisis`) — `EscalationContext.jsx:11`, `DesktopDensitySlice.jsx:395`. Not user-adjustable.
- Width by **content type** (`measureFor`, `App.js:1145`).
- All driven by **viewport + event-family + escalation/transient state — never by user persona.**

---

## Part 2 — Architecture classification

`A = already exists · B = partially exists · C = hidden · D = missing`

| Dimension | Class | Evidence / why |
|---|---|---|
| **Persona detection** | **D** (missing) | No user-sophistication field. *Partial proxy:* `recordKind` detects event-family, not user. |
| **Language adaptation** | **D** with a thin **B** substrate | 4 label maps are swappable (B); the 50+ inline next-action strings are not (D). No role-based wording anywhere. |
| **Complexity adaptation** | **B** (partial) | recordKind section-suppression + progressive disclosure + density — real, but keyed to event/viewport/escalation, not persona. |
| **Progressive disclosure** | **A** (exists) | Robust collapse/empty-state/density systems — just not persona-keyed. |
| **Confidence-layer rendering** | **C** (hidden) | The `mindset`/`experience`/`plannerLens`/`reassurance` overlays are fully authored in `*.eos.json` but unrendered. |
| **Host vs planner presentation** | **B** (partial) | Exists via `recordKind` (event-driven), not via user role. |

Net: the **substrate is mostly present** (one engine = A; disclosure = A; confidence DATA = C; section-rendering = B). The two true gaps are **persona detection (D)** and a **copy-rendering seam (D)**.

---

## Part 3 — Product OS evaluation: does Pattern 011 qualify?

**Pattern 011 — One Engine, Multiple Confidence Layers.** *Principle: the engine owns reality; the UI owns confidence; the same truth is rendered at the user's sophistication.*

**Evidence FOR:** the one-engine precondition is real in code (Part 1A); the app already proves surface can vary without a fork (recordKind, 1D); the confidence-layer data is already authored (1B); and the principle is the natural terminus of the existing doctrine chain **003 (Trust Before Intelligence) → 009 (Requirements Before Gaps) → 010 (Inform Without Escalating) → 011 (render that informed truth at the user's confidence level).**

**Evidence AGAINST canonical promotion:** **zero production implementation.** Persona detection = D, copy renderer = D, the overlay data is dark. A Canonical Product Pattern asserts a proven, reusable practice; 011 is currently an *intention with a strong substrate*, not a shipped practice.

**Classification recommendation → Experimental Doctrine (Needs Review).** Do **not** add to the canonical Patterns DB yet. Promote the *principle* to the Doctrine Ledger as Experimental, note the 003→009→010→011 lineage, and gate canonical promotion on a shipped renderer slice (see Part 4 / the 55M Decision). This honors "do not promote if unsupported."

**Not** Event-OS Knowledge (it is product-agnostic — Part 6). **Not** an Anti-Pattern (the *forks* are — Part 5).

---

## Part 4 — Smallest executable path (Data → Existing Runtime → Existing Surface)

**Yes — feasible without any fork.** The engine already produces the next-action as one structured object in one function; persona rendering is a **thin indirection on copy already computed once**:

```
Engine Truth (unchanged)            →   Renderer seam (new, thin)            →   Existing UI (unchanged)
_selectEventNextActionInner()           renderFor(persona, factKey, data)        CommandCenter rows / spine
getEventReadiness() / stat()            default persona === current strings      HealthRow
*.eos.json reassurance/plannerLens      (verbatim) → zero diff at launch
```

**Smallest first slice (the 55M candidate):**
1. **Persona = one derived signal, reuse what exists.** Start from `recordKind` (`home_hosted` → *Host*; professional families → *Coordinator/Planner*). No new field, no new detection. (A real `profile.experienceLevel` can refine it later.)
2. **One seam, one surface.** Add a single phrasing function the **existing** next-action builder calls for `{title, consequence, primaryCta}`. `persona='default'` returns today's strings **verbatim** → behaviorally inert until a non-default voice is authored.
3. **Source the voices from the dark data, don't invent.** Host voice ← `mindset.*.reassurance`; Planner voice ← `plannerLens`/severity. Wiring the dark `*.eos.json` *is* the renderer's content.
4. **Confidence layers = rendering profiles over one truth, not modes.** Host/Coordinator/Planner/Operator select wording + disclosure depth; the cascade, readiness, and playbooks are untouched.

**Explicitly NOT required:** duplicate playbooks ✗ · duplicate next-action ✗ · duplicate readiness ✗ · Beginner/Pro fork ✗ · global copy refactor ✗ (the first slice touches only the next-action triplet — one function — extending the proven 4-label-map pattern).

**The one real constraint:** ~90% inline copy. Mitigation — scope the slice to the next-action surface only; never attempt a whole-app copy registry in one pass.

---

## Part 5 — Anti-Pattern analysis

| Approach | Verdict | Why |
|---|---|---|
| Beginner Mode / Expert Mode (user toggle) | **Anti-pattern** | Forks UI + logic; doubles QA; strands users who pick wrong; contradicts one-engine. recordKind already proves surface can vary *without* a toggle. |
| Separate Host App / Separate Planner App | **Anti-pattern** | Product fork → duplicates engine + playbooks + next-action; violates 006 (Reuse Before Reinvention). |
| Role-specific playbooks | **Anti-pattern** | Duplicates playbooks → re-opens **AP-001 (Silent Data Subset)**. The *same* dinner-party playbook must serve grandmother and pro; only the rendering differs. |

**Recommendation → promote one umbrella anti-pattern: AP-002 — Persona Fork.** *Failure: serving different user sophistications by duplicating the workflow (a mode toggle, a separate app, or role-specific playbooks) instead of re-rendering one engine truth.* **Fix:** one engine + one playbook set + a rendering layer that varies language/disclosure by persona. **Evidence:** recordKind section-suppression (varies surface with no fork); AP-001 (playbook duplication already cost two sprints). Strong support — promote.

---

## Part 6 — Future product impact

Pattern 011 is **platform-level**, not Event-Planner-specific. "Engine owns reality, UI owns confidence" is a rendering doctrine independent of domain:

| Product | Same truth | Host voice | Operator voice |
|---|---|---|---|
| Event Planner | "Collect dietary restrictions" | "Ask guests about foods they can't eat" | "Dietary collection incomplete" |
| Lighting OS | a circuit-load fact | apprentice prompt | gaffer diagnostic |
| Photography Business OS | "deposit unpaid" | first-year reminder | studio-owner ledger flag |
| Studio Operations OS / FCR Command Center | an operational gap | trainee guidance | operator-tier alert |

Because the doctrine is content-agnostic and rides on the shared engine/renderer split, it belongs in the **Product OS as platform doctrine** (cross-product), classified **Experimental** until a slice ships in any one product.

---

## Deliverable 6 — EXECUTE / TEST / PARK / KILL

| Item | Disposition | Rationale |
|---|---|---|
| One-engine architecture (one cascade / readiness / playbook set) | **CONFIRMED** (no action) | Already true in code — the precondition for 011. |
| **Pattern 011** as **Experimental Doctrine (Needs Review)** | **PROMOTE → Doctrine Ledger only** | Principle sound + strong substrate; zero implementation → not Canonical yet. |
| **AP-002 — Persona Fork** | **PROMOTE → Anti-Pattern DB** | Mode/app/role-playbook forks all = duplicating the workflow; recordKind + AP-001 are the evidence. |
| Persona renderer seam — next-action triplet only, `persona` from `recordKind`, default = current copy verbatim | **TEST (55M candidate)** | Smallest Data→Runtime→Surface slice; behaviorally inert until a voice is authored; no fork. |
| Wire dark `*.eos.json` `mindset.reassurance` / `plannerLens` as the Host/Planner voices | **PARK** (depends on the seam) | High-value authored source; do *after* the seam exists. |
| Persisted `profile.experienceLevel` (real persona signal) | **PARK** | Refinement; recordKind is a sufficient v1 discriminator. |
| Beginner/Pro mode · Separate Host/Planner apps · role-specific playbooks | **KILL** | Promoted as AP-002. |
| Global copy-registry refactor | **PARK** | Too large for one pass; do incrementally, next-action surface first. |

**Bottom line:** the architecture can support One Engine → Multiple Confidence Layers as **Engine Truth → thin Renderer seam → existing UI**, with **no** playbook/readiness/next-action/product forks. Recommend logging the execution as the **Sprint 55M** Open Decision, promoting **AP-002**, and recording **Pattern 011 as Experimental** pending that slice.
