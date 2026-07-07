# BUDGET-RECOVERY-1 — Safe Host-Purchase Over-Budget Recovery Plan

Date: 2026-07-07 · Slice type: build (Outcome B scope from BUDGET_RECOVERY_AUDIT_1) · Status: SHIPPED

## 1. Executive verdict
Over-budget hosts now get a source-backed "Budget recovery" card on the Budget tab: 3–5 prioritized, deep-linked adjustments drawn only from unbought, host-controlled data — with paid money, signed vendors, rain backup, and the honoree's moment explicitly named as not-on-the-table. No new engine: `buildBudgetRecoveryPlan(event)` is a thin composition over `hostSpending` + `playbookFoodPlan` + `playbookCapacity` + `guestCountResolved`.

## 2. Budget Recovery Build Matrix
| Source | Signal | Truth | Suggestion | $ shown? | CTA | Test |
|---|---|---|---|---|---|---|
| playbookCapacity unbought line (not checked/owned/skipped) | estimate range or host-locked $ | unbought | safe_cut (ask when host locked a price) | Yes — same midpoint/locked $ the checklist bills | `Planning · caprow-<key>` | 3, 4, 14, 18 |
| playbookFoodPlan Supplies-group unbought | estimate range | unbought consumable | safe_cut | Yes | `Planning · foodrow-<id>` | 3, 14 |
| playbookFoodPlan food line unbought | estimate range | unbought dish | **tradeoff** (guest-experience copy) | Yes | `Planning · foodrow-<id>` | 5, 6 |
| Guest roster (yeses < sized count, RSVPs settled) | derived | resize lever | safe_cut, **no single $** (recompute per line) | No | `Guests · guests-entry` | 7 |
| Missing real guest count | absent | blocker | missingData prompt only | No | — | 8 |
| Vendor quote, nothing committed | vendor.cost (quote) | uncommitted | **ask** — quote stated, savings never promised | Quote in copy, savings null | `Vendors · vendorId` | 11 |
| Vendor paid/signed/confirmed | depositPaid/balancePaid/contractSigned/status | committed | do_not_cut → protectedItems | No | none by design | 9, 10 |
| rainPlan text | authored | safety | protected | No | none | 12 |
| honoree | named moment | heart | protected | No | none | 13 |
| No budget target | totalBudget ≤ 0 and no rows | unknown | status `needs_more_data` | No | — | bonus test |

## 3. Files inspected
BUDGET_RECOVERY_AUDIT_1.md, INTELLIGENCE_ENGINE_DOCTRINE.md, hostSpending.js, budgetCopy.js, playbooks/index.js (food list item shape `item/short/low/high/locked`, capacity `key/name/costLow/costHigh`), HostSpendingPlan (App.js 27286+), anchors (caprow/foodrow/guests-entry/hsp-budget).

## 4. Files changed
- `src/lib/budgetRecovery.js` — NEW, the helper.
- `src/App.js` — recovery card inside HostSpendingPlan (renders only when `status === 'recovery_available'`), `event` prop threaded, import.
- `src/lib/__tests__/budgetRecovery.test.js` — NEW, 15 tests covering the spec's 1–18 numbered behaviors.

## 5. Helper behavior
Returns `{status: not_over_budget|recovery_available|needs_more_data, overBudgetAmount, headline, summary, suggestions[{id,class,label,why,estimatedSavings,savingsConfidence,source,actionLabel,route,risk}], protectedItems, missingData}`. Over = `hostSpending.committed − total` (only when a real budget target exists). Suggestion caps enforce diversity: 1 capacity + 1 supplies + 1 food tradeoff + 1 guest resize + 1 vendor ask, max 5.

## 6. UI placement
Budget tab (HostSpendingPlan), between the must-have moment card and the budget accordion — amber-railed compact card "Budget recovery". No new page; no HostHome duplicate added (existing over-budget hero already routes to Budget).

## 7–8. Data used / deliberately not used
Used: budget target, committed math, unbought playbook lines with their own price fields, roster yes-counts, vendor quote + commitment flags, rainPlan, honoree. NOT used/invented: refundability, cancellation terms, negotiability, vendor scope line items, deposit recovery, percent readiness, any stored recovery state.

## 9–13. Class behaviors
safe_cut only for unbought+unlocked host lines and settled-roster right-sizing; host-locked prices demote to ask ("your deliberate call"); food cuts always tradeoff-framed with spread copy; uncommitted vendor asks state the quote and say "savings are not guaranteed — ask before changing the plan"; protected items render as one calm "NOT ON THE TABLE" line; missing guest count produces a prompt, never sized-cost fiction.

## 14. CTA behavior
Every suggestion routes: caprow/foodrow anchors (live-verified in-viewport landing), guests-entry, vendor detail. Protected items have no CTA by design.

## 15. State behavior
Pure re-derivation — live-verified: marking the cooler bought removed its suggestion and surfaced the next line on reload. No completion state stored; no recovered state exists to fake; no green dot added.

## 16. Audience/privacy
Card lives only in the host Budget surface; no guest copy, vendor brief payload, or DIFM draft touched (existing privacy suites green).

## 17–21. Tests & suites
15 new contract tests — all green. Full frontend **2058/2058 (121 suites)** · backend **97/97** · production build clean.

## 22–23. Preview results
Desktop: over-budget event showed $585 over, 4 suggestions across all classes with real playbook names ("folding chairs", "Disposable plates…", "Burgers, hot dogs & chicken", Bounce Kingdom ask), protected line named the paid caterer + rain backup + Uncle Marcus's moment; food CTA landed the foodrow anchor in-viewport; buying an item cleared its suggestion. Under-budget event: no card. Mobile (375px): card readable, 4 CTAs tappable, no overflow, no fresh console errors (marker technique). Disposable `br-test` event removed.

## 24. Production smoke
Post-deploy bundle grep for recovery copy strings (see deploy log).

## 25. Parked
Sourcing/BYOB tradeoff deltas (playbook factors exist but extracting an honest per-event delta needs its own slice); HostHome summary row (existing budget hero already routes here); DIFM vendor-ask draft (existing BRIEF-ASSIST path covers it); CTA tap-height polish (27px ghost buttons match existing ghost pattern).

## 26. Recommendation
Accept. Narrow, source-backed, protective — matches the audit's Outcome B scope exactly.
