# ChatGPT Prompt — Audit the NGW Event Boss Engine

Paste the prompt below into ChatGPT, then attach the files listed at the bottom.

---

## PROMPT

You are a senior systems engineer and domain expert in event planning. I'm giving you the **engine** of an event-planning product called **NGW Event Boss**. It serves BOTH professional planners and regular people hosting their own events. I want a rigorous, skeptical audit of the engine's *logic* — not the UI.

The engine has four cooperating parts:

1. **Backward-solve / critical-path engine** (`lib/eventSolve.js`) — the core. It holds ~29 per-family event "graphs" (nodes = milestones with lead-times + dependencies) and back-solves from the event date to produce the binding next action, date-at-risk flags, and completion. `familyFor(type)` maps an event type to its solve-family; `enginePreview(event)` runs the solve; `completionFromEvent(event)` infers progress. `eventSolveAdapter.js` is the ESM/CJS bridge.

2. **Intake-family engine** (`intakeFamily.engine.js`) — a SECOND axis. Routes each event type into one of 5 families (`home_hosted`, `full_service`, `corporate`, `host_driven`, `travel_led`), each a config of which intake sections, chrome, and vocabulary an event should show. `recordKind:'event'` = a self-host (no client/fee/pipeline); `'client'` = a professional engagement. `intakeFamily(type)` is the classifier (explicit map → keyword fallback → middle-weight default; it must NEVER default an unknown type to the maximal `full_service`).

3. **Budget estimator** (`lib/budgetEstimator/*`) — `totalEstimate.js` + `categoryShares.js` + `estimatorFactors.js` produce a per-guest cost range by type/market/date; `confidence.js` scores how much the estimate can be trusted and provides family-aware "not included" exclusions and its own `budgetFamilyForType` classifier (a MIRROR of #2 — check for drift).

4. **Vendor intelligence** (`lib/vendorAccountability/*`, `lib/vendorQuestions.js`, `lib/vendorCategoriesByType.js`) — per-category vendor playbooks (promises to track, evidence/proof needed, questions to ask, COI/deposit/load-in expectations) and an accountability/promise model.

### What I want you to evaluate

For each part, and for the system as a whole:

1. **Correctness** — Is the logic sound? Find actual bugs: off-by-one lead-times, dependency cycles or unreachable nodes in the graphs, wrong/contradictory family assignments, classifier inputs that produce a wrong or surprising family, budget math errors, exclusion lists that don't match the family.
2. **Completeness & coverage** — Every event type in `EVT_CATEGORIES` should resolve sensibly in ALL FOUR engines. Find types that fall through to a default, lack a real solve-graph, or get a generic budget/vendor set. Name them.
3. **Taxonomy soundness** — Are the 5 intake families the right cut? Are any types mis-filed (e.g., is `Birthday` really `host_driven` and not `home_hosted`? Is `Client Dinner` corporate?)? Is the `recordKind` event/client split defensible per type?
4. **Classifier robustness** — Stress-test `intakeFamily()` and `budgetFamilyForType()` with real-world off-taxonomy names ("Welcome Dinner", "Team Offsite", "50th Birthday Bash", "Sip & See", "Galentine's", "Crawfish Boil", "Diwali party", "Shiva", "Bris", "Graduation Cookout"). Where does keyword inference misfire? Where would a wrong family hurt a user?
5. **Drift & duplication** — `confidence.js` re-implements a family classifier (`budgetFamilyForType`) separately from `intakeFamily.engine.js`. Do they agree on every type? Flag any divergence and recommend a single source of truth.
6. **Cultural / real-world domain gaps** — As an event-planning expert: what does this engine get wrong or miss about how real events actually work (religious/cultural events, multi-day events, destination logistics, dietary/accessibility, vendor sequencing on load-in day)?
7. **Edge cases & failure modes** — null/empty types, past-dated events, events with no date, very-short runways, huge guest counts, types not in any map.

### Output format

- **Verdict** (1 paragraph): overall soundness, and the single most important problem.
- **Findings table**: each row = { severity (blocker/major/minor), engine part, file, concrete issue, the input that triggers it, recommended fix }.
- **Coverage gaps**: list every event type that is under-served by any of the 4 engines.
- **Classifier failures**: the specific off-taxonomy inputs that misroute, with the family they get vs should get.
- **Taxonomy recommendation**: keep / re-file specific types, with reasoning.
- **Top 5 fixes**, prioritized.

Be specific and cite file + symbol. Do not be generous — assume I want the hard truth before this ships.

---

## FILES TO ATTACH

Attach this whole `engine-audit/` folder (or these files):

- `intakeFamily.engine.js`  ← the family router (extracted from the app)
- `lib/eventSolve.js`  ← the core backward-solve engine (READ THIS MOST CAREFULLY)
- `lib/eventSolveAdapter.js`
- `lib/budgetEstimator/totalEstimate.js`
- `lib/budgetEstimator/confidence.js`
- `lib/budgetEstimator/categoryShares.js`
- `lib/estimatorFactors.js`
- `lib/vendorAccountability/playbooks.js`
- `lib/vendorAccountability/promiseModel.js`
- `lib/vendorAccountability/derive.js`
- `lib/vendorAccountability/conflicts.js`
- `lib/vendorQuestions.js`
- `lib/vendorCategoriesByType.js`

Total ≈ 4,000 lines — fits in one ChatGPT context. If it complains about size, drop the vendor files first and audit them in a second pass; `eventSolve.js` + `intakeFamily.engine.js` are the non-negotiable core.
