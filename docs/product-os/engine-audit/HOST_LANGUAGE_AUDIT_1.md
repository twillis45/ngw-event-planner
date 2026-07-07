# HOST-LANGUAGE-AUDIT-1 — Host-Facing Language Audit & Copy Repair

Date: 2026-07-07 · Slice type: language trust audit + surgical copy repair · Status: SHIPPED

## 1. Executive verdict
The "lock" family was the systemic offender: host surfaces said "Lock it", "Lock your final guest count", "Locked at", "READY TO LOCK", "Lock a cost", "Lock Plans / Lock It In" for states that are host-editable, not contractual (no vendor/venue deadline field exists anywhere in the model, so NO headcount lock can currently be "truly locked"). All host-facing lock language repaired to set/confirm/finalize/settle vocabulary. Other red-flag words audited in context; most uses are truthful (see parked list).

## 2. Host Language Audit Matrix (fixes applied)
| Surface | File:site | Was | Now | Risk class |
|---|---|---|---|---|
| What to settle · count card | App.js HostDecisionsPanel | "Lock your final guest count" / "Lock it" | "Finalize your guest count" / "Finalize it" | too rigid |
| Guests · NOW hero stepper | App.js ~42213 | "Lock it" | "Set the count" | too rigid |
| Day-focus inline headcount | App.js ~23342 | "Lock it" | "Set it" | too rigid |
| Guests · headcount pin | App.js ~31973 | "Locked at [n] guests" / "Unlock the count" | "Set at [n] guests" / "Change the count" | too rigid |
| Guests · all-set copy | App.js ~42055 | "Your guest count is locked / count's locked" | "…is set / count's set" | fake finality |
| What to settle chips + labels | App.js STATUS map | "READY TO LOCK" / "LOCKED" / "N locked" / section "Locked" | "READY TO SETTLE" / "SETTLED" / "N settled" / "Settled" | system-internal |
| Host decision word | lib/decisionConfidence.js host persona | "Lock it" | "Settle it" (operator/planner personas untouched) | planner jargon |
| Food/supply price control | App.js ×3 | "Lock a cost" (+title/aria) | "Set the exact cost" | system-internal |
| Phase labels | App.js WEEK_FOCUS | "Lock Plans" / "Lock It In" | "Firm Up Plans" / "Settle Details" | too rigid |
| Seed + demo task copy | App.js 208, 5211, 22316 | "lock the (final) headcount" | "confirm the final guest count" / "Finalize the headcount and rentals" | too rigid |

## 3. Status Word Doctrine (glossary, now test-backed)
locked → only truly contractual/unchangeable (currently NOTHING qualifies — no deadline field exists); count language → set the planning count / confirm who's coming / finalize the headcount / confirm the final guest count; spent → actual money only (hostSpending doctrine, already enforced); planned/chosen → intended/selected, never bought; confirmed → only with confirmation data; ready/handled/done → only when source conditions complete (green-dot doctrine); missing → prefer helpful phrasing ("Add parking details"); risk → true risks only, else "needs attention"; estimate → never implies paid.

## 4. Food/Spread Language Pass
Spread choices already speak "Chosen/Choose →"; bought state already gated on foodGot; green dot already full-condition (HOST-AUDIT-1). The one offender was the "Lock a cost" control → "Set the exact cost". "Spent" audit: hostSpending/budgetCopy already restrict to actuals (BUD-1 + BUDGET-RECOVERY-1 tests).

## 5. Headcount Language Pass
All "lock" variants replaced per the doctrine mapping (see Matrix). RULE ENCODED: "lock the final headcount" may return only when a vendor/venue deadline field exists to make it true. Persisted event data note: previously saved events retain old task TEXT in their stored timeline (e.g. the flagship's "…lock the final headcount" task) — data, not code; new events seed the corrected copy. Not migrated (no invented mutation of user data).

## 6. CTA Label Quality
Changed CTAs remain precise ("Set the count", "Finalize it", "Change the count" — all verified routing unchanged, same handlers). Reviewed-and-kept: "Handle it now →" (sits under a row that names the exact decision and lands on the exact field — scoped by context); "Review insurance" (scoped); "Review timeline" (destination is genuinely broad).

## 7–8. Fixes applied / parked
Applied: 17 copy sites (above). Parked with reasons: planner-persona vocabulary ("Ready to lock", "Lock" — planner surfaces are operator tools, out of host scope); venue-booking "lock in a date/venue" tips (booking IS contractual — truthful); vendor sample-log strings ("locked in early") — demo planner data; "Handle it now" (scoped by row context); broad red-flag words (required/critical/overdue) in planner surfaces.

## 9. Audience/privacy safety
No guest, vendor-brief, or public payload copy touched; DIFM drafts untouched; privacy suites green.

## 10–11. Green-dot & weather compliance
No dot logic touched (doctrine tests green). Weather event-day/phase anchoring untouched (WEATHER-IMPACT-1 tests green).

## 12–13. Files inspected / changed
Inspected: App.js (all host shells), CommandCenter.jsx, lib/decisionConfidence.js, lib/playbooks/index.js, lib/vendorIntelligence.js, VendorPlanningWorkspace.jsx, doItForMe.js, budgetCopy.js + doctrine docs. Changed: `src/App.js`, `src/lib/decisionConfidence.js`, `src/lib/__tests__/decisionConfidence.test.js` (repinned), `src/__tests__/nextUpActionable.test.js` (seed string), `src/__tests__/hostLanguage.test.js` (NEW — 7 doctrine tests that read the live source and fail if lock-language returns).

## 14–18. Tests & suites
7 new source-reading doctrine tests; 2 repinned. Full frontend **2065/2065 (122 suites)** · backend **97/97** · build clean.

## 19–21. Preview & prod
Desktop: Guests card reads "Set at 30 guests · Change the count"; all-set copy "Your count's set—"; What-to-settle chips READY TO SETTLE/SETTLED; only residual "lock" on screen is the flagship's PERSISTED task text (data, §5). Mobile (375px): lock-free copy scan clean, no overflow. Prod smoke after deploy (strings below).

## 22. Remaining risks
Persisted old-copy task text in existing events (cosmetic, self-heals on reseed); planner surfaces still speak ops vocabulary by design; a future vendor/venue-deadline field would legitimately reintroduce "locked" — the doctrine test will force a deliberate decision.

## 23. Recommendation
Accept. Lock-language rule now enforced app-wide by tests, not convention.

## Addendum — budget recovery language (folded into this audit, 2026-07-07)
The budget-recovery card speaks calm budget help, not collections/accounting: banned-word test extended in budgetRecovery.test.js (cut/cancel/recover/overpriced/unpaid/owed/locked in host-visible strings); preferred phrases adopted (get back on plan, still flexible, already committed, protect this, ask before changing).
