# 10_PRODUCTION_READINESS_PRIORITIES.md

You are helping NGW Event Planner reach first 5–10 paying studios within 60 days.

Prioritize runtime value and buyer trust.

## Current Production Priorities

1. First-run orchestration and clear starting point
2. Vendor Detail Cockpit / vendor readiness
3. Auth + cloud sync MVP
4. File uploads
5. Onboarding flow
6. Accessibility targeted pass
7. Performance/code splitting
8. Studio Setup depth

## Launch Trust Minimum

Before paying users trust the app, it needs:

- real account login,
- durable cloud save,
- data visible across devices,
- no fake data,
- clear onboarding,
- vendor readiness,
- file/document support,
- basic accessibility,
- stable mobile layout.

## Auth Scope Rule

Auth must be boring and narrow.

Build:
- login/logout,
- user-owned events,
- cloud save/load,
- localStorage migration,
- sync state,
- sync error state.

Do not overbuild:
- complex team roles,
- client portal auth,
- enterprise permissions,
- billing,
- audit logs.

## File Upload Scope Rule

Start with:
- vendor contracts,
- invoices,
- proposals,
- COI,
- logos/docs.

Do not start with:
- full AI document parser,
- document collaboration,
- complex permissions.

## Accessibility Rule

Do targeted accessibility before broader launch:
- keyboard path,
- focus states,
- button semantics,
- contrast,
- drawer/modal behavior,
- labels for icon-only buttons.

## Performance Rule

Optimize after runtime surfaces are stable:
- code-split L4 specialists,
- bundle analysis,
- memoize hot lists,
- lazy-load heavy tabs.

Do not prematurely optimize before product clarity is fixed.
