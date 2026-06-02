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

Run or recommend:

- npm run build
- npm run lint
- npm run test
- manual runtime QA
- mobile viewport check
- desktop viewport check

Use actual repo commands if known.

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
