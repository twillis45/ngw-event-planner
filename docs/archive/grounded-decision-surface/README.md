# Archive — `grounded-decision-surface` sprint evidence

**These files are historical evidence. They are not operating instructions.**

`grounded-decision-surface` was the working branch that carried the July 2026
convergence work — release integrity, backend security, solemn-event protection,
and the host experience. Every piece of code, test, tooling and runbook from that
branch now lives on `main`. The branch was retired on 2026-07-31 once the diff
proved nothing valuable remained exclusively there.

What survived the branch is here **only so the reasoning is recoverable**.

## How to read this archive

- **Not canonical.** Nothing in this folder governs how the product is built,
  released, or operated today.
- **Current doctrine lives on `main`** — `docs/release/RELEASE_INTEGRITY.md`,
  `docs/release/PRODUCTION_CONFIG.md`, `docs/release/LIVE_MODE_READINESS.md`,
  `docs/security/AI_PROXY_AND_DOCUMENT_FETCH_SECURITY.md`, `CLAUDE.md`, and the
  skills under `docs/claude-skills/`.
- **Conflicts resolve in favour of current `main`, always.** These reports were
  accurate on the day they were written; several describe states that have since
  been fixed, superseded, or deliberately reversed.
- **Figures are frozen in time.** Warning counts, test totals, SHAs and route
  inventories here are snapshots, not current values.
- **Recovery point:** the tag `archive/grounded-decision-surface-final` holds the
  branch's final commit if anything needs to be recovered.

This archive does not create a second Product OS. There is one, and it is on
`main`.

## Index

### Release integrity
- `RELEASE_INTEGRITY_IMPLEMENTATION.md` — CI gates, CRA warning policy, hostv2
  artifact model, the Pages migration plan
- `DETERMINISM_AND_CONFIG_IMPLEMENTATION.md` — deterministic Jest, the demo/live
  configuration contract, the 27-variable classification

### Security
- `SECURITY_MAIN_PRODUCTION_VERIFICATION.md` — merge and live backend proof for
  the AI-auth and SSRF work

### Solemn-event behaviour
- `SOLEMN_AND_C4_DEPLOYMENT_REPORT.md` — the three blame-language surfaces and
  why suppression was chosen over softer wording
- `SOLEMN_PRODUCTION_DEPLOYMENT_REPORT.md` — production verification and the
  per-guard mutation evidence

### Deployment and verification
- `C4_DEMO_DEPLOYMENT_REPORT.md` — the first source-built demo deployment, which
  restored a `/hostv2/` surface that was crashing on every event

### Current-state review (2026-07-30)
- `00_READ_ME_FIRST.md`, `CURRENT_STATE_REVIEW_SUMMARY.md`
- `01_CURRENT_STATE.md`, `02_PRODUCT_MAP.md`, `03_ARCHITECTURE.md`
- `04_DECISION_SYSTEM.md` — decision/ranking measurements
- `05_TEST_EVENT_RESULTS.md`, `06_UI_AND_RESPONSIVE_REVIEW.md`, `07_QA_RESULTS.md`
- `08_DECISION_LEDGER.md`, `09_METRICS_AND_FEEDBACK.md`, `10_OPEN_QUESTIONS.md`

### Handoff and status notes — `handoff/`
- `HANDOFF_hero_composition.md`, `HANDOFF_hero_session_consolidation.md`
  *(Superseded operating guidance: both described a manual `rsync` step for
  `public/hostv2` that is now `npm run sync:hostv2` with a CI drift gate.)*

### Raw evidence — `evidence/`
Build logs, workflow dumps, engine probes, QA output, measurement scripts and UI
screenshots captured during the review. Retained for traceability; no credentials
(the `phc_…` PostHog reference is a public write-only ingestion key, redacted in
the reports).
