# 00 — Read Me First

**What this is.** A current-state audit of No Guesswork Events, performed 2026-07-30 against
the working tree at `097ce84e` on branch `grounded-decision-surface`. It establishes what is
built and running **now**. It is not a roadmap, redesign, or sprint report.

**No application code was changed.** No git state was changed. One temporary jest probe was
created under `src/lib/__tests__/`, executed, and deleted; `git status src/` confirmed clean.

**The working tree was not clean at audit start** — two modified files, both pre-existing,
both audited as-is. See `01_CURRENT_STATE.md`.

## Read in this order
1. `CURRENT_STATE_REVIEW_SUMMARY.md` — ruling, maturity ratings, top five actions.
2. `01_CURRENT_STATE.md` — repo truth, runtime verification, build status, CI reality.
3. `04_DECISION_SYSTEM.md` — the highest-priority section.
4. `05_TEST_EVENT_RESULTS.md` — five event types driven through the live engines, incl. the mandatory repast test.
5. `07_QA_RESULTS.md` — every command run, with exit codes.
6. `02_PRODUCT_MAP.md`, `03_ARCHITECTURE.md`, `06_UI_AND_RESPONSIVE_REVIEW.md`, `08_DECISION_LEDGER.md`, `09_METRICS_AND_FEEDBACK.md`, `10_OPEN_QUESTIONS.md`.
7. `evidence/` — raw command output, measurement scripts, screenshots.

## Evidence conventions
- **Verified fact** — observed by running a command or reading the live DOM this session.
- **Code-supported inference** — read from source, not executed.
- **Unresolved question** — could not be determined; the reason is stated.
- **Known defect** — reproduced.

## What this audit could NOT verify
- Responsive behaviour: only a 2560×1294 viewport rendered; programmatic resize did not change output.
- hostv2 Playwright E2E: requires Node ≥18, local shell is 16.16.0.
- Authenticated behaviour: the environment runs with `REACT_APP_AUTH_BYPASS` active.
- Backend Python tests, Supabase reads/writes, live analytics: no credentials, analytics disabled locally.
- Whether production serves this commit.
