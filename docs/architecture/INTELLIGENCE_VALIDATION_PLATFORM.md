# Intelligence Validation Platform — INTEL-QA-1 (Design Only)

**Status:** DESIGN. Nothing in this document is built. It does not change Host Intelligence, Context Intelligence, the OS, or any reader/writer. It is the plan for proving whether the intelligence *helps*.
**Owner:** Todd. **Drafted:** 2026-07-02. Part of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md).
**Rule inherited:** everything remains observable, explainable, measurable, backward-compatible; no speculative AI; no fake confidence.

> **The thesis:** we have stopped measuring features and started measuring **whether intelligence improves decisions.** Today we can see a recommendation *fire* and be *accepted*. We cannot see whether it was *correct*. This platform closes that loop: every recommendation becomes an evaluation record, reality scores it, and calibration tells us when to trust ourselves. It is the OpenAI-Evals / Netflix-experimentation discipline applied to a plan, not a model.

---

## 1. Executive Review (deliverable 1)

**Where we are.** Host Intelligence is a clean, honest, observation-first system: store (P1) → reconcile (P2/W1) → inspect-clear (P3) → one governed read-forward (P4/R1). Two registries and an Observatory enforce discipline. **But the system is currently blind to its own accuracy.** R1 says "size for 34"; the host accepts; the event happens; and *nothing measures whether 34 was closer than 40.* Acceptance ≠ correctness — a host can accept a wrong suggestion (misplaced trust) or revert a right one (under-trust). We are measuring behavior, not truth.

**The move.** Build a validation layer that (a) records every recommendation as an immutable evaluation object, (b) scores it against captured reality at event close, and (c) calibrates confidence against observed accuracy — all read-only over the existing memory, changing no reader.

**The discipline.** Accuracy claims are gated on sample size; nothing reports precision the data can't support; there is no single "intelligence score." The validation platform's own honesty is the product (§8).

**One-line recommendation:** **EXECUTE Stage 1 (telemetry) now; it is pure instrumentation, ships independently, and is the prerequisite for everything.** Stages 2–5 gate on data volume, not calendar.

---

## 2. Intelligence QA Architecture (deliverable 2)

Five components, layered over the existing system, all read-only w.r.t. Host/Context Intelligence:

```
  [ Recommendation fires ]        R1 today; R2/R3/Context later
            │  emits (immutable snapshot)
            ▼
  ┌────────────────────────┐
  │  Evaluation Object      │  one record per recommendation shown (§3)
  │  (event.intelEvaluations)│  ← stored on the EVENT, non-PII, backward-compat
  └────────────────────────┘
            │  host acts (accept / revert / override)  ← existing analytics
            │  event closes; W1 captures reality        ← existing reconciliation
            ▼
  ┌────────────────────────┐
  │  Scoring Engine (pure)  │  recommendation vs actual → error + grade (§6)
  └────────────────────────┘
            │  aggregate scored records
            ▼
  ┌────────────────────────┐        ┌───────────────────────────┐
  │  Calibration (§5)       │───────▶│  Observatory v2 (§4)       │
  │  observed accuracy by    │        │  admin: memory/readers/    │
  │  confidence, MEASURED    │        │  writers/playbooks/accuracy│
  │  never auto-fed-back yet │        └───────────────────────────┘
  └────────────────────────┘
```

**Key architectural choices (all preserve backward-compat):**
- **The evaluation object lives on the event** (`event.intelEvaluations[]`), not the profile. It is per-event, reconciled at close, and contains **no memory writes** — it only *references* the memory snapshot that produced the recommendation. Absent ⇒ today's behavior.
- **Scoring is pure** (`scoreEvaluation(record)` → grade), same discipline as `hostIntel.js`. It reads the record + the captured actual; it writes nothing back into `profile.hostIntelligence`.
- **Calibration is MEASURED, not applied.** Until an explicit future stage (and a new registered reader), calibration numbers are *shown in the Observatory* — they do NOT change `confidenceFor`/`stabilityFor` or any gate. This is the hard line that keeps R1's behavior frozen while we learn.
- **Telemetry is the spine.** Every lifecycle transition emits a PostHog event; the on-event record is the local, inspectable mirror (this-browser Observatory) — same dual-plane honesty the current Observatory already declares.

---

## 3. The Evaluation Object (deliverable 3) — canonical

Every recommendation made anywhere in the app becomes ONE record. This is the canonical shape (mirrors the user's example, formalized):

```
IntelEvaluation = {
  id,                         // stable: `${eventId}:${reader}` (one rec per reader per event)
  createdAt,                  // when the recommendation was first shown

  // ── WHAT was recommended (immutable snapshot at show-time) ──
  reader,                     // 'R1'
  layer,                      // 'ground' | 'context' | 'host'   (§4.5 precedence)
  domain,                     // 'attendance'
  source,                     // 'attendance-memory'
  field,                      // what it moved, e.g. 'planTo'
  from, to,                   // 40 → 34
  adjustmentPct,              // -15   (signed)
  ratio, clamped, clampHit,   // the raw + clamped ratio, and whether the ±25% bound bound

  // ── the GATE at show-time (snapshot — never recomputed) ──
  gate: { confidence, stability, applicability:{ eligible, reason, observations, required } },
  because,                    // the human sentence shown to the host

  // ── LIFECYCLE (host actions; §3 lifecycle) ──
  shown: true, shownAt,
  accepted: null,             // true once the host proceeds with the suggestion
  reverted: null,             // true if the host tapped "Keep {from}"
  overrideValue: null,        // the host's own number, if they typed one instead

  // ── OUTCOME (filled at reconciliation, from W1) ──
  actual: null,               // { value, capturedAt }  e.g. actual attendance 36
  actualSource: null,         // 'reconciliation'

  // ── SCORE (computed post-reconciliation; §6) ──
  evaluation: null,           // { status:'scored', error, absError, signedError, grade, betterThanBaseline }
}
```

Notes:
- **Immutable snapshot.** `from/to/ratio/gate/because` are captured **when shown** and never recomputed — because memory changes over time, and the only fair score is against what the host actually saw. This is why the record is persisted rather than recomputed at close.
- **One record per (reader, event).** The `id` enforces it; re-showing updates lifecycle fields, never forks the record. Same dedupe philosophy as observations (by `eventId`).
- **No PII.** The record holds counts/ratios/grades — the same guarantee as observations. `actual` is an aggregate (attendance 36), never a roster.
- **Baseline-relative.** `betterThanBaseline` compares the recommendation's error to the *L2 default's* error (what would have happened with no memory). This is the metric that answers "did intelligence help?" — not just "was the number close?"

---

## 4.a The Evaluation Lifecycle (Part 3)

```
 Created ──▶ Shown ──▶ ┬─ Accepted ─┐
   (rec)     (once)    ├─ Ignored ──┤──▶ Event Happens ──▶ Reality Captured ──▶ Scored ──▶ Calibration Updated ──▶ (future) Confidence Recalibrated
                       ├─ Overridden┤        (W1)              (W1 actual)      (§6 grade)   (§5 table, MEASURED)      (gated future stage only)
                       └─ Reverted ─┘
```

Each transition is explainable and emits telemetry:

| Transition | Trigger (exists today?) | Telemetry | Writes to record |
|---|---|---|---|
| Created + Shown | R1 renders the because (App.js FoodPlan) | `intel_rec_shown` (NEW) | the immutable snapshot |
| Accepted | host proceeds with the sized plan | `intel_attendance_applied` (exists) | `accepted:true` |
| Reverted | host taps "Keep {from}" | `intel_attendance_reverted` (exists) | `reverted:true` |
| Overridden | host edits the count to their own number | `intel_rec_overridden` (NEW) | `overrideValue` |
| Ignored | shown, no action, event proceeds | derived at close (shown && !accepted && !reverted) | — |
| Reality Captured | W1 reconciliation ("final numbers") | `outcome_captured` (exists) | `actual` |
| Scored | pure scorer runs at/after reconciliation | `intel_rec_scored` (NEW) | `evaluation` |
| Calibration Updated | aggregate scored records | (Observatory read; no event) | calibration table (separate) |
| Confidence Recalibrated | **future stage, explicitly gated** | — | **nothing today** (keeps R1 frozen) |

**Explainability rule:** a scored record can always answer "what did we tell you, why, did you take it, and were we right?" in one sentence.

---

## 4.b Intelligence Observatory v2 (deliverable 4 / Part 4)

Extends the existing `?observatory=1` dev screen. Same honesty guardrail (this-browser aggregates; behavioral cross-host = PostHog). New sections:

| Section | Metrics | Source |
|---|---|---|
| **Memory Health** | profiles(=1 local), observations by domain, confidence, stability, freshness (stale %) | `hostIntel` (exists) |
| **Readers** | firing frequency, suppression (eligible-but-clamped / not-shown), acceptance rate, revert rate, avg adjustment, applicability rate | eval records + `intel_attendance_*` |
| **Writers** | observations written, dedupe hits (overwrite-in-place count), skipped writes (all-fields-empty), failed writes (guard rejects) | W1 + NEW `intel_*_written` counters |
| **Playbooks** | usage, completion, reconciliation-completion %, budget accuracy, attendance accuracy, leftover accuracy, avg confidence — **by playbook** | scored records joined to `event.type` |
| **Recommendation Accuracy** | grade distribution + avg error, sliced **by reader / playbook / event-type / confidence / stability** | scored records (§6) |
| **Prediction Accuracy** | *empty section, scaffolded* — "no predictions exist (L5 gated)" | future |
| **Calibration** | per-confidence observed accuracy curve (§5) | calibration table |

**Every accuracy tile carries its `n`** and greys out below the sample-size floor (§8). No tile ever shows a percentage it can't support.

---

## 5. Calibration System (deliverable 5 / Part 5) — design only

The system should eventually know: *"When confidence is HIGH for Attendance, how often are we actually correct?"*

**Calibration table** (per domain × confidence bucket), computed from scored records:

```
Calibration[domain][confidence] = {
  n,                    // scored records in this bucket
  observedAccuracy,     // share graded A/B (within tolerance)
  avgAdjustment,        // mean |adjustmentPct| we made
  avgError,             // mean absError vs reality
  avgBaselineError,     // mean error the L2 default would have had
  lift,                 // avgBaselineError − avgError  (>0 ⇒ memory helped)
}
```

Example (the target readout, once data exists):

| Domain | Confidence | n | Observed accuracy | Avg adjustment | Avg error | Lift vs default |
|---|---|---|---|---|---|---|
| Attendance | High | 24 | 91% | 11% | 3% | +6% |
| Attendance | Medium | 18 | 78% | 9% | 6% | +2% |

**The honest half of calibration:** if "High confidence" attendance is only 60% accurate, that is a finding, not a failure — it says the confidence threshold is *miscalibrated* and should tighten. **Calibration is measured and displayed; it is NOT auto-fed into the reader in this sprint.** Feeding observed accuracy back into `confidenceFor` (so confidence becomes *earned* not just *counted*) is a future, separately-registered reader — flagged here, deliberately not built, to keep R1's behavior frozen and backward-compatible.

**Well-calibrated = the diagonal:** a system where "High confidence" is right ~90%, "Medium" ~75%, "Low" ~55% is trustworthy. Calibration is how we prove we sit on that diagonal instead of asserting it.

---

## 6. Recommendation Accuracy Model (deliverable 6 / Part 6)

**Scoring (pure).** For a scored record: `signedError = (recommendedDelta − actualDelta)`, `absError = |signedError|` as a % of the planned base. Example: recommended −14% burgers, reality needed −11%, `absError = 3%`.

**Grade bands** (tolerance is per-domain — food tolerates more slop than headcount):

| Grade | Abs error (attendance) | Meaning |
|---|---|---|
| A | ≤ 5% | dead-on |
| B | ≤ 10% | helpful |
| C | ≤ 15% | directionally right |
| D | ≤ 25% | weak |
| F | > 25% **or wrong direction** | harmful — the strongest signal |

**Direction matters most.** A recommendation that moved the plan the *wrong way* (said "fewer," more came) is an F regardless of magnitude — those are the records that must never hide inside an average.

**Baseline comparison is mandatory.** Every grade is paired with `betterThanBaseline` (did the recommendation beat doing nothing?). A "B" that was *worse* than the L2 default is still a loss. This is the single most important guard against self-congratulation.

**Per-domain accuracy models** — same shape, different capture + tolerance, all gated on their writer existing first:

| Domain | Recommendation | Actual (from writer) | Tolerance band | Writer needed |
|---|---|---|---|---|
| **Attendance** | plan-to count Δ | reconciled headcount | ±5/10/15% | W1 (live) |
| **Food** | per-item qty Δ | leftover/short per item | ±10/20/30% | W1 (leftovers, live) / W3 |
| **Ice** | ice qty Δ | ran short / right / too much | 3-way hit/miss | W1 (ice, live) / W4 |
| **Budget** | spend estimate | actual spend | ±10/20% | W1 (ratio) / W6 |
| **Timeline** | prep-start | actual start (rosDone) | ±15/30 min | W7 |
| **Weather** | ice/shade action | observed need | hit/miss | W4 |
| **Shopping** | trip/store plan | actual store used | hit/miss | W3 |
| **Vendor** | who to rebook | showed / quality | hit/miss | W5 |
| **Run of Show** | segment timing | actual vs planned | ±15 min | W7 |

Only **Attendance** can be scored today (R1 recommends, W1 captures). The rest are *designed* and unlock as their reader+writer ship — the accuracy model exists so no future reader ships without a way to grade it.

---

## 7. Telemetry Matrix (deliverable 7 / Part 1) — every engine audited

| Engine | Decision it influences | Inputs | Output | Can we know if it helped? | Observable? | Measurable? | Self-improve? | Missing telemetry |
|---|---|---|---|---|---|---|---|---|
| **Playbook (L2)** | the whole default plan | type + attendance band | tasks/spread/ROS | Only via reconciliation deltas (budget/attendance/leftover accuracy) | Partial (usage) | **Not yet** — no baseline-error capture | No | **playbook_baseline_error** at close (budget/attendance/leftover vs plan) |
| **Effective Item seam** | shopping list shape | plan.list | read-model | N/A (mechanical) | Yes (tests) | N/A | No | none (correctly out of scope) |
| **Context Intelligence (L3)** | first-event kit/qty | event signals | ContextAdditions | Only once additions are accept/remove-tracked | Designed | No (unbuilt) | No | `context_addition_shown/removed`, per-pack accept rate |
| **Host Intelligence store (P1)** | none (data) | reconciled obs | rollups | N/A | Yes (Observatory) | Partial | No | freshness/decay counters |
| **Reconciliation writer (W1)** | fills memory | host confirmations | observations | Indirectly (fuels readers) | Partial (`outcome_captured`) | Partial | No | `intel_*_written`, skipped-write, dedupe-hit counters |
| **R1 Attendance read-forward** | plan-to headcount | attendance memory | sized count + because | **Almost** — we see applied/reverted, NOT accuracy | Yes | **Acceptance only, not correctness** | No | `intel_rec_shown/overridden/scored`, actual-vs-rec, baseline-vs-rec |
| **Observatory v1** | none (visibility) | profile+events | maturity readout | N/A | Yes | Yes | No | accuracy/calibration sections (v2) |

**The single biggest gap, everywhere:** we instrument *action* (`applied`/`reverted`), never *outcome*. Stage 1 adds `intel_rec_shown` + the eval record; Stage 2 adds `intel_rec_scored` + baseline comparison. That converts every "Measurable? Acceptance only" cell to "Yes — correctness."

---

## 8. What must NEVER be measured (deliverable 8 / Part 8)

These would manufacture fake intelligence and violate the Honesty doctrine. Banned:

1. **A single "Intelligence Score" / health %.** There is no one number for "is the AI good." It hides direction, sample size, and domain. Banned outright — the Observatory shows *distributions with n*, never a rolled-up grade.
2. **Fake confidence / hallucinated precision.** No accuracy % below the sample-size floor (proposal: **n ≥ 8 scored records** per bucket to display, greyed with "n=3 — not enough to score" below it). Never "94% accurate" off n=2.
3. **Vanity acceptance-as-accuracy.** "Hosts accepted 80% of suggestions" is a **trust** metric, NOT an **accuracy** metric, and must be labeled as such. Reporting acceptance as if it were correctness is the cardinal sin this platform exists to prevent.
4. **Synthetic personalization.** Never fabricate a per-host stat to look smart (e.g. "we tuned this to you" when n<3). Honest-empty stands.
5. **Precision theater.** No "−14.3%" when the data supports "~15%." Round to the confidence the sample earns.
6. **Self-graded success without a baseline.** An accuracy grade with no `betterThanBaseline` is meaningless — a B that lost to the default is a loss. Baseline is mandatory (§6).
7. **Backfilled/imputed outcomes.** If reality wasn't captured, the record stays `pending` forever — never guess the actual to complete a score.
8. **Cross-host aggregation in-app.** Fleet accuracy lives in PostHog/server, never faked from one browser (existing guardrail).

**Doctrine:** the platform would rather show *"we don't know yet (n too low)"* than a confident wrong number. Its credibility is the entire point.

---

## 9. Commercial Review (deliverable 9)

| Dimension | Impact | Why |
|---|---|---|
| **Trust** | ★★★★★ | "The app told me to plan for 34, and 36 came" — provable rightness is the deepest trust a planning tool can earn. Revert-when-wrong is honesty users feel. |
| **Retention** | ★★★★☆ | Calibrated recommendations that visibly improve event-over-event are the compounding hook — the tenth event is measurably better, and the host *sees* it. |
| **Enterprise value** | ★★★★★ | An evaluation ledger + calibration is exactly what a venue group / franchise buyer diligence-checks: "prove your AI works." This is the artifact that answers it. |
| **Commercial moat** | ★★★★★ | Competitors can copy a feature; they cannot copy *proven, calibrated accuracy on real reconciled outcomes.* The eval corpus is the moat, same as the memory corpus — arguably deeper. |
| **Product quality** | ★★★★☆ | Scoring surfaces bad recommendations as F-grades before users churn on them — a quality flywheel. |
| **Internal QA speed** | ★★★★★ | Regression detection: a reader change that drops attendance grade-A share is caught in the Observatory, not in support tickets. This is `evals` for the plan. |
| **User confidence** | ★★★★☆ | The because + a track record ("right 9 of your last 10") converts skeptics — but ONLY if honest (§8). |
| **Future AI readiness** | ★★★★★ | When prediction (L5) or an LLM layer arrives, the eval harness already exists to validate it. You never ship an unmeasured model. This is the on-ramp. |

**Commercial verdict:** the validation platform is not overhead — it is the mechanism that turns "we have AI" (commodity) into "we have *proven* AI" (defensible). It should be treated as core product, funded before more readers.

---

## 10. Execution Roadmap (deliverable 10 / Part 9) — each stage ships independently

| Stage | Ships | Scope | Depends on | Backward-compat |
|---|---|---|---|---|
| **1 · Telemetry** | `intel_rec_shown` + `IntelEvaluation` record created/updated on `event.intelEvaluations` (lifecycle fields only, NO scoring). `intel_*_written`/skipped/dedupe counters on W1. | Instrument what already fires; persist the immutable snapshot. | nothing | pure-additive optional field |
| **2 · Recommendation Evaluation** | pure `scoreEvaluation(record, actual)` + `intel_rec_scored`; join W1 reconciliation → score attendance records; baseline-vs-rec. Observatory v2 Accuracy section. | Turn records into grades. | Stage 1 + reconciled events | read-only; no reader change |
| **3 · Calibration** | calibration table (measured), Observatory calibration curve; **display only, no feedback into gates.** | "High confidence → how often right." | Stage 2 + n≥8/bucket | reader gates frozen |
| **4 · Prediction validation** | *scaffold only* — the eval harness generalized to score any future L5 prediction. Empty until predictions exist. | Future-proof the harness. | Stage 3 + a prediction to score | no-op today |
| **5 · Continuous Intelligence QA** | regression alerts (grade-share drops), per-reader accuracy gates in CI, the calibration-feedback reader (registered, gated) that finally makes confidence *earned*. | The self-improving loop. | Stages 1–4 + volume | the ONLY stage that may change a gate — and only via a new registered reader |

**Sequencing principle (unchanged):** each stage is grounded in data the prior stage produced. Stage 1 is pure instrumentation and can ship immediately. Nothing after Stage 2 runs until real reconciled events exist ([[activation]] is still upstream of all of it).

---

## 11. Kill / Execute / Test decisions (deliverable 11)

| Item | Decision | Rationale |
|---|---|---|
| Stage 1 telemetry + eval record | **EXECUTE** | Pure additive instrumentation; prerequisite for everything; zero behavior risk. |
| Scoring engine (Stage 2) | **EXECUTE (after S1 + data)** | The core value; pure + testable like `hostIntel`. |
| Baseline-vs-recommendation | **EXECUTE** | Non-negotiable — without it, accuracy is self-congratulation. |
| Observatory v2 accuracy/calibration | **EXECUTE** | The visibility that justified this whole sprint. |
| Calibration *display* | **EXECUTE (Stage 3)** | Measured truth about our confidence. |
| Calibration *feedback into gates* | **TEST, don't ship** | Changes reader behavior — must be A/B'd against frozen R1, and only via a new registered reader (Stage 5). |
| Single "Intelligence Score" | **KILL** | Vanity; violates §8. |
| Acceptance-as-accuracy | **KILL** | Category error; trust ≠ correctness. |
| Cross-host in-app accuracy | **KILL** (keep in PostHog) | Honesty guardrail. |
| Prediction validation build | **DEFER** (scaffold only) | No predictions exist; building the validator now is speculative. |
| New readers (R2/R3) | **KILL for this sprint** | Explicitly out of scope; they wait on validation. |

---

## 12. Final Recommendation (deliverable 12)

**Build the validation platform before the next reader — and build it in the honest, staged way above.**

The pivot the last sprint identified ("from here every reader changes behavior") has a corollary: **you cannot responsibly add readers you can't grade.** R1 is live and un-graded right now. The single highest-leverage next move is not R2 — it is making R1 *provably* right or wrong.

Concretely:
1. **Ship Stage 1 (telemetry + the `IntelEvaluation` record) now.** It is pure, additive, and unblocks all measurement. It changes no behavior and needs no data to be correct.
2. **Ship Stage 2 (scoring) as reconciled events accumulate.** The first scored attendance record is the moment the system stops guessing whether it helps.
3. **Hold R2 until the Observatory shows R1 earns its trust** — accept ≫ revert AND grade-A share > baseline. That is the data-driven gate, replacing the calendar-driven one.
4. **Never let calibration silently change a gate.** Measure it, show it, and only ever act on it through a new registered reader with its own A/B — preserving the frozen, backward-compatible core this platform is built to protect.

The corpus of *scored recommendations* becomes the second moat beneath the memory corpus: proof, not just personalization. That is what makes this a platform and not a feature — and it is the on-ramp to every future AI layer, because from here on, **nothing ships unmeasured.**
```
