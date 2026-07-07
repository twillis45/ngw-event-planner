# MOMENT-PROTECT-1 — Annotate-Only Moment Protection (DL-008)

Date: 2026-07-07 · Slice type: thin annotation, no new engine · Status: SHIPPED

## 1. Verdict
The host's named moment (must_have_moment, honoree + song/drink) was captured but invisible at peak task pressure. Now it rides two surfaces as a quiet context line — host's own words only, nothing inferred, nothing invented when the fields are empty.

## 2. Placements (exactly the 2 authorized)
1. **Day-before plan** (`buildDayBeforePlan` now returns `moment {text, sub}`; DayBeforePlanCard renders "Protect the moment: <must-have> — <honoree> — their song: X · their drink: Y", testid `daybefore-moment`).
2. **Do-now compressed list** (HostTaskFocusCard: "Worth protecting while you work: <moment>", testid `donow-moment`).

## 3. Honesty rules
must_have_moment verbatim; honoree fallback "<Name>'s moment"; song/drink from explicit fields (both spellings honored); all fields empty → no annotation at all. Read-only — no status, no dot, no CTA (nothing to do; it's context).

## 4. Verification
Live: full line rendered on the T-1 card ("The toast when Marcus takes off the uniform — Marcus — their song: Before I Let Go · their drink: Crown & Coke"); empty-fields event shows nothing. Tests: `src/lib/__tests__/momentProtect.test.js` (4). Suites 2078/2078 · build clean.

## 5. Parked (per HOST-DIFM-AUDIT-1)
VIP plan (no data model), any inference of emotional importance beyond named fields.
