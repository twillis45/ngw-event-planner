# New Event Estimator — P0 Restore (Sprint 60.U P0)

Date: 2026-06-07
Scope: P0 only — restore the lost estimator promise in NewEventModal as an
optional, collapsed "Estimate my budget" expander. No P1/P2/P3 built.

## Product Promise Regression Gate (verified before coding)
- estimatorFactors.js intact ✅ (getDatePremium/getTimeOfDayFactor/getServiceTaxFactor/getContingencyFactor/computeEstimatorBreakdown)
- computeEstimatorBreakdown available ✅
- Budget tab estimator still works ✅ (App.js ~17256 — PER_HEAD tiers × composite, untouched)
- Studio Setup defaults still exist ✅ (profile.defaultServiceRate/defaultTaxRate)
- NewEventModal currently missing the interactive estimator ✅ (only a passive 61.D hint existed)
- Date Entry chips still live ✅ (DateChipRow, App.js ~665)
- Palette cleanup still intact ✅ (no banned #1a6fba/gold/#d4904a in modal; no OpenWeather/dev-bypass refs)

## Estimator root cause
Sprint 60.U rebuilt NewEventModal as a guided flow and dropped the inline estimator;
Step 3 used a dumb proportional split (`budgetAmt × pct`). A passive Sprint 61.D hint
existed but had no "apply" CTA and used different math (`PER_HEAD_BY_TYPE` bands) than
the Budget tab — so it could not match Budget-tab totals and could not seed the field.

## Files changed
- `demo/src/App.js` (NewEventModal only): estimator state; budget-source tracking on
  the budget input; replaced the passive 61.D hint with the collapsed "Estimate my
  budget" expander; added budget-source truth rows to the Step 3 review; added budget
  source + Payment/Money lines to Success. No new estimator math — reuses
  computeEstimatorBreakdown + the same factor functions as the Budget tab.

## Before / after workflow
- Before: Step 3 plain "Budget" field; passive hint range (non-parity); no apply; no source label.
- After: Step 3 has an optional collapsed "Estimate my budget" expander → time-of-day +
  service/tax + contingency → range (good→best) + confidence + assumptions + missing-input +
  risk flags + honesty labels + "Use estimate as budget" (with replace-confirm) → budget
  source tracked through Review + Success.

## Estimate vs budget — source-of-truth map
- Estimator output = derived guidance (range/midpoint). Never written anywhere until applied.
- "Use estimate as budget" fills the budget field with the midpoint ONLY on click.
- Manual budget is never overwritten without the explicit Replace confirmation.
- budgetSource: none | manual | estimate — surfaced in Step 3 Review and Success.
- No payment record, no Stripe link, no vendor/client/message state created. No money moved.

## Estimator parity verdict vs Budget tab — PASS
`/tmp/parity.mjs` (uses the real estimatorFactors engine): modal `computeEstimatorBreakdown`
total == Budget-tab inline total for all sampled inputs (e.g., Wedding 120g/Evening/stx →
$27,000 both ways). Equal by construction (same PER_HEAD tier × same composite factors,
single round to /100). Runtime confirmed: applying the estimate set the budget to $27,000,
the same midpoint shown.

## QA matrix (390 / 430 / 768 / 1024 / 1440)
True regression gates — ALL CLEAN at every width/state:
- Modal opens ✅ · Horizontal overflow ✅ none · Console errors ✅ 0 · Page errors ✅ 0
- Amber/red wash ✅ 0 · Primary CTA truthful ✅ (Continue/Create event/Open event/Use estimate as budget/Replace budget)
Estimator behaviors verified:
- Collapsed "Estimate my budget" with helper copy ✅
- Expander opens ✅ · range renders ($16,400–$42,500) ✅ · confidence chip ✅ · assumptions card ✅
- Missing-input checklist (metro) ✅ · "Not a quote / Use as a starting point / Money moved: No / Payment created: No" ✅
- Estimate recomputes on guest count / type / date / time-of-day / service-tax / contingency ✅
  (Setup kit does NOT change the estimate — kit drives record seeding, not money math; reported as unsupported-by-estimator, not faked.)
- "Use estimate as budget" fills budget only on click ✅
- Manual budget → apply → Replace confirmation ✅ · Cancel keeps $50,000 ✅ · Replace sets $27,000 ✅
- Step 3 Review itemizes Budget entered / Estimate used / Budget source / Payment created: No / Money moved: No ✅
- Success itemizes Budget source: Estimate applied / Payment created: No / Money moved: None ✅
- Production build exit 0 ✅

Honest disclosures (not regressions):
- Sub-12px detector flags intentional Studio Matte eyebrows/pills (10–11px: "Will happen",
  "CREATED", "ESTIMATED PLANNING RANGE", "HIGH CONFIDENCE", "BASED ON") — the established
  modal/system pattern that predates this change; my estimator matches it. No body text is sub-12;
  honesty labels render at 11.5px (legible, consistent with the prior hint).
- Touch-target detector flags the two 18px checkboxes; each sits in a 44px-min clickable
  label row (the actual tap target is 44px), consistent with app-wide checkboxes.

## Pre-review board
- Optional expander preserves calm: yes (collapsed by default).
- Restores the lost promise: yes (real engine, applyable).
- Prevents starting blind: yes (range + confidence + checklist).
- Copy preventing "quote" read: "Not a quote", "Use as a starting point", "Estimated planning range".
- Replace guard: explicit confirmation before overwriting a manual budget.

## Post-review board
- Modal still calm: yes. Discoverable: yes. Estimate vs budget clear: yes (source labels).
- Planner control intact: yes (apply-only, replace-confirm). Adjusts on assumptions: yes.
- "Not a quote" clear: yes. Intelligence without density: yes (collapsed). 10+: yes for P0 scope.

## Remaining P1 estimator roadmap (NOT built)
#14 estimate/approved-budget lock → #4 gap warning → #6 category map → #5 vendor quote fit →
#17 intake-tied confidence → #2 "what changed?" → #11 client-safe mode (guarded).
(See docs/audits/2026-06-07_ESTIMATOR_PRIORITIZATION.md.)

## Brutality check
- Still a form? No — optional guidance inside a calm step.
- Sounds like a quote? No — explicit "Not a quote / Use as a starting point".
- Money moved / payment created? No — stated in expander, Review, and Success.
- Manual budget safe? Yes — never overwritten without Replace confirmation.
- Matches Budget tab? Yes — parity proven numerically + by construction.
- Fake precision? No — confidence + missing-input keep it honest.
- 10+ or draft? 10+ for P0 scope.

## Final verdict: LOCKED (P0)
## Commit/PR recommendation: do NOT commit/PR/merge/deploy (per instruction). Suggested
commit message when you choose to: "Sprint 60.U P0 — restore New Event estimator as
optional 'Estimate my budget' expander (parity with Budget tab; apply-only; source-tracked)".
