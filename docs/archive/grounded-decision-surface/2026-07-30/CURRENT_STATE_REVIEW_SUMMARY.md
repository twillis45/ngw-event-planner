# Current State Review — Summary
**Repo** `/Users/toddwillis/Code/ngw-event-planner/demo` · **Branch** `grounded-decision-surface` · **Commit** `097ce84e` · **Date** 2026-07-30
Working tree not clean at audit start (2 pre-existing modified files). No code changed by this audit.

---

## 1. Recommendation

**Correct specific structural defects. Do not redesign, and do not run the playbook-vs-capability migration yet.**

The engine is more sound than the debate around it suggests: 53 `dependsOn` edges with **0 dangling and 0 cycles**, 4229 tests passing, both apps running clean. The defects that are actually costing users are not architectural — they are **truthfulness and wiring** defects: copy that states false causes, a documented scorer that is not on the host path, a renderer that re-decides what the engine ranked, and 35% of decisions that cannot be routed to.

A shared capability spine would not fix any of those five. Fix them first; the spine question can be answered afterwards with better evidence.

## 2. Current product state

Two front-ends over one shared engine. The CRA app (`src/App.js`, frozen donor per CLAUDE.md) still runs and renders a real event. The hostv2 Vite prototype is where host features are built; it imports ~100 modules from `../src` via an `@app` alias, so engine changes reach both and surface changes reach one. Neither uses a router. A Python backend exists and was not exercised. The product today is a **single-host, single-day event planner with a decision-ranking engine**, delivered as a 393px phone stage regardless of viewport.

## 3. What materially changed (verified against code, not claims)

- Priority metadata is now **fully authored**: `weight`, `reversibility`, `emotionalWeight`, `priorityBasis.rationale` at **215/215**. The in-code doctrine (`playbooks/index.js:2093`, `playbookSchema.js:99`) still says the opposite, and `derivedImportanceOf` is consequently dead code.
- A shared solemn classifier (`src/lib/solemn.js`) now exists and is consumed by two independent consumers.
- A parity drift gate runs inside the hostv2 build and passes.
- `blocks` has drifted from an intended graph into a free-text tag: **380 values, 109 tokens, 52% match no consumer**.

## 4. Architectural ruling

- **Playbooks vs capabilities** — drift is real and measured (28 of 29 recurring ids deviate; `venue` spans T-18d…T-365d), but this is **not the current bottleneck**. Re-frame from *where decisions are defined* to *what is allowed to reach the host*.
- **Contextual policies** — a per-capability layer already exists corpus-wide (14 `*Context.js` resolvers, `effectiveTimingProvenance`). It annotates; it does not define. That is the cheapest path to a spine if one is wanted.
- **Scoring** — the documented scorer is not wired to the host. Ranking comes from `playbookDecisionBoard`.
- **Dependencies** — sound. Leave per-playbook. Add tests (none exist for cycles or timing order).
- **Blocks** — type and validate, or delete. It gates nothing today.
- **Timing provenance** — computed for 24/215 and rendered nowhere.
- **Emotional/care behaviour** — affects ranking only. Tone is a hardcoded type-name regex patched site-by-site; 4 sites still emit "past their easy window" on a repast.
- **Rendering** — the renderer overrides the engine (`HostShellV2.jsx:1190` filters `venue`; `decisionPins` re-sorts ahead of the tier lattice).
- **Lifecycle** — completion rides a single predicate; no test asserts ranking order anywhere.

## 5. Product maturity (1–10, evidence-based, not averaged)

| Dimension | Rating | Evidence |
|---|---:|---|
| Product coherence | **6** | One clear job, two front-ends, no router; 393px stage on desktop |
| Workflow integrity | **5** | 35% of decisions unroutable; all 4 top conference actions had no route |
| Recommendation quality | **5** | Ranking sound in structure; urgency flattens on realistically-created events |
| AI truthfulness | **4** | 4% grounding coverage; hero states a false cause on non-food events; provenance never rendered |
| UI quality | **6** | Clean, consistent, no console errors; 85% desktop width unused; 9px nav affordance |
| Mobile quality | **unrated** | Could not verify — resize did not change render; no emulation available |
| Technical reliability | **6** | Both apps run clean; CRA build fails under `CI=true`; no CI gate on it |
| Test coverage | **5** | 4229 tests pass, but **zero** assert ranking order, cycles, or timing order |
| Commercial readiness | **3** | Auth bypassed in this env; no conversion instrumentation; laptop-built releases |

## 6. Locked decisions (do not reopen without new evidence)
- `playbookDecisionBoard` is the host ranking engine.
- `dependsOn` stays per-playbook — it is measurably sound.
- The parity kit and its drift gate.
- Migration governance (`check:migrations`).
- hostv2 is where host surfaces are built; `App.js` stays frozen.

## 7. Highest-risk assumptions still treated as fact
1. That the documented scorer governs host ranking. **It does not.**
2. That `blocks` encodes gating. **It gates nothing.**
3. That authored `weight` is rare and derivation fills the gap. **It is 100% authored; the derivation is dead code.**
4. That solemn protection is structural. **It is per-call-site; 4 sites still leak.**
5. That CI protects the release. **CI never builds the CRA app.**
6. That grounding claims are supported. **4% cited.**
7. That the backend AI proxy is protected. **Two endpoints have no auth and no rate check** while a sibling in the same router requires a planner token.
8. That `public/hostv2/` reflects source. **It is a tracked build artifact and is currently stale** — tracked `HostShellV2-d2c51e67.js` (17:09) vs current build `HostShellV2-974d773d.js` (19:26).

## 8. Top actions (six — a P0 security finding was added after Phase 3 landed)

| Priority | Action | Why now | Expected result | Disposition |
|---:|---|---|---|---|
| 1 | **Authenticate and rate-limit `/api/ai/complete` and `/api/ai/extract-document`** | Both spend the server's OpenAI key with no auth and no rate check; `/feature` in the SAME router does it correctly | Closes an open-cost/abuse vector | EXECUTE |
| 2 | Add a CI gate that runs `CI=true npm run build`, and fix or explicitly waive the 237 warnings | Releases are laptop-built; no CI can build this repo today | Reproducible releases | EXECUTE |
| 3 | Remove the hardcoded consequence clause in `planHeroCopy` and derive it, or delete it | The app states a false cause to the host on every non-food event | Explanations stop lying | EXECUTE |
| 4 | Decide `decisionIntelligence.js`: wire it to the host path or retire the spec section | The documented engine is unreachable; the spec misleads every future reader | One true ranking story | TEST |
| 5 | Type and validate `blocks`, or delete it | 52% inert; it reads as encoded gating and is not | Honest dependency model | EXECUTE |
| 6 | Add judged ranking-order fixtures per event type × scenario | 4229 tests and none asserts what leads | Regressions become visible | EXECUTE |

## 9. What NOT to do
- **Do not run the playbook→capability migration now.** It touches 39 files and fixes none of the top five.
- **Do not redesign the UI.** The measured UI defects are a fixed-width stage and a 9px control, not a visual language problem.
- **Do not "fix" `dependsOn`.** It is the healthiest part of the system.
- **Do not add features to `App.js`.** It is frozen; hostv2 is the surface.
- **Do not chase the 237 lint warnings as a quality project.** Gate them, then burn down opportunistically.
- **Do not treat the 4229 passing tests as coverage of ranking.** They cover mechanics.

## 10. Evidence index
- Repo/runtime: `01_CURRENT_STATE.md`, `evidence/01_*`, `02_build_cra*`, `03_workflows.txt`, `04_*`
- Product map: `02_PRODUCT_MAP.md` · Architecture: `03_ARCHITECTURE.md`
- Decision system + measurements: `04_DECISION_SYSTEM.md`, `evidence/05_measurements.md`, `evidence/05_measure_decisions.mjs`
- Five-event test incl. repast: `05_TEST_EVENT_RESULTS.md`, `evidence/06_engine_probe.txt`
- UI: `06_UI_AND_RESPONSIVE_REVIEW.md`, `evidence/ui_*.jpg`
- QA: `07_QA_RESULTS.md`, `evidence/07_*`
- Ledger / metrics / questions: `08_DECISION_LEDGER.md`, `09_METRICS_AND_FEEDBACK.md`, `10_OPEN_QUESTIONS.md`
