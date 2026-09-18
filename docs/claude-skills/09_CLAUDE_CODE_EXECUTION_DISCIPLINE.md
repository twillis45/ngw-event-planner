# 09_CLAUDE_CODE_EXECUTION_DISCIPLINE.md

You are Claude Code working on NGW Event Planner.

You must operate like a senior product engineer.

## Before Editing

Inspect:
- relevant components,
- data model,
- route model,
- persistence,
- design tokens,
- existing helper functions,
- mobile layout,
- tests/build scripts.

Report what you found when asked.

## During Editing

Make targeted changes.

Prefer:
- display mappers,
- helper functions,
- clear component boundaries,
- runtime-safe fallbacks,
- preserved route keys,
- preserved persistence.

Avoid:
- broad rewrites,
- duplicate components,
- hidden state changes,
- fake data,
- dead code,
- inline logic sprawl,
- one-off CSS hacks,
- breaking route keys.

## After Editing

Run these — they are the repo's real commands, not placeholders:

| Command | What it proves | When |
|---|---|---|
| `npx react-scripts test --watchAll=false` | the suites (jest) | every code change |
| `npm run gate:knowledge` | the knowledge snapshot is baked | any KCR/knowledge change |
| **`npm run verify:push`** | **handoff + knowledge + jest + hostv2 seam + `npm run release`** | **before every push** |
| `npm run verify:all` | the full set, ~20 min incl. the 7-viewport matrix | before a release, or when the change is broad |
| `npm run verify:fast` | the same minus the 14-minute matrix | when the matrix is not implicated |

Plus manual runtime QA at the mobile and desktop viewports.

### Before pushing, `npm run release` is not optional

`npm run release` is what the deploy runs (`sync:hostv2` → hostv2's own
build → copy into `public/hostv2` → the CRA build). It is a SEPARATE
TOOLCHAIN from the test runners, and it can be red while every suite is
green.

That is not hypothetical. On 2026-09-18 deploys 310 and 311 both died at
"Build release artifact" — a statement between two imports, which
react-scripts treats as a build ERROR (`import/first`), not a lint
warning. jest, `gate:hostv2` and `gate:knowledge` were green on both
commits, both were reported to the owner as verified, and production sat
two commits stale for two and a half hours. No test suite could have seen
it; only a build can.

So: **"jest is green" is a true statement that does not mean the change
ships.** `npm run verify:push` is the check that does, and its `release`
step is the reason it exists.

Two consequences worth stating plainly:

- A failing `release` step also means every LATER deploy step never ran —
  including the demo-artifact safety scan. A skipped safety check and a
  passing one look identical in a log you did not read.
- Reporting "verified" on a set of checks that excludes the one the
  deploy actually performs is how both of those commits were signed off.
  Name which checks ran; do not let the word "verified" imply the set.

## Final Report Required

Every completed task must report:

1. Files changed.
2. What changed.
3. Why it changed.
4. Runtime behavior.
5. QA performed.
6. Known limitations.
7. Recommended next step.

## Stop Conditions

Stop and ask if:
- required data model does not exist,
- requested change would create duplicate surface,
- change would break architecture,
- route model is unclear,
- persistence would be faked,
- AI backend is not present but user expects real AI.
