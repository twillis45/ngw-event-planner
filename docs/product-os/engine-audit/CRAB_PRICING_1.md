# CRAB-PRICING-1 — Maryland Crab Quantity, Bushel & Mixed-Size Pricing

Date: 2026-07-07 · Slice type: domain food intelligence (thin helper, no engine) · Status: SHIPPED

## 1. Executive verdict
Crab ordering now works the way crabs are actually bought: mixed lines by size × unit (dozen / half-bushel / bushel) at the host's own prices, with live coverage math ("covers about N crabs per person"), honest under/covered/extra status, a coverage-framed bushel nudge, and truthful money flow into the budget and Budget Recovery. No fake market prices anywhere — cost exists only where the host typed a quote.

## 2. Crab Pricing / Coverage Matrix
| Signal | Source | Behavior |
|---|---|---|
| Crabs per dozen | definitional (12) | always known |
| Crabs per bushel/half-bushel, known size | vendor count if host entered it; else the crab-feast playbook's RESEARCHED approximations (~84 medium / 72 large / 60 XL / 52 jumbo per bushel, Captain White's July 2026), always shown "about/~" | default_estimate, host count wins |
| Crabs per bushel, mixed/unknown size | none | `needs_count_per_unit` + "Add the vendor's estimated count per bushel…" routed to the line's count field |
| Headcount | crabPlan.crabEatingHeadcount → guestCount/estimate/roster-yeses fallback | missing → `needs_headcount` routed to crab-headcount |
| Target crabs/person | host override → role default (main 6 · supplement 3 · snack 1, per playbook serving guide) | |
| Coverage | `total / headcount` vs target: <0.9 under · ≤1.5 covered · >1.5 extra | spec copy verbatim |
| Cost | `sum(qty × pricePerUnit)` over EXPLICIT prices only; unpriced line → costComplete false + "Add the quote price…" | never invented |
| Spent | bought-marked lines × their explicit price | estimate never becomes spent |
| Bushel nudge | target total ≥ 60 crabs OR host already priced a bushel → "Bushel buying may make sense… compare by total crabs covered, not just price"; small groups with a bushel line → "Dozens may be easier…" | NEVER a cheaper/best-price claim (test-banned) |

## 3–5. Files & model
- `src/lib/crabPlan.js` — NEW: `buildCrabPlan(event)`, `defaultCountPerUnit`, `lineCrabCount`, unit/size vocab. Reads host-entered `event.crabPlan { role, crabEatingHeadcount, targetCrabsPerPerson, acceptLowerCoverage, lines[{id,size,unit,quantity,estimatedCountPerUnit,pricePerUnit,bought}] }`.
- `src/lib/hostSpending.js` — crab money flows in: bought → spent, priced-unbought → committed; zero-impact without a crabPlan (byte-identical).
- `src/lib/budgetRecovery.js` — unbought priced crab line = TRADEOFF ("reduces what each person gets"), savings from the host's own price; bought lines protected ("already committed. Protect this.").
- `src/App.js` — `CrabPlanCard` on the Plan tab (both branches) for crab events / existing plans: headcount field (`crab-headcount`), per-line qty/unit/size + count + price + Mark bought (`crabline-<id>-count/-price`), add-line, coverage summary, bushel hint, money block; issues each scroll/focus their exact field. Green dot = `plan.handled` only (lines + headcount + counts + coverage met or explicitly accepted lower).

## 6–10. Behavior (verified live, disposable `cp-test`: 24 eaters, 1 bushel large @$345 + 2 dz jumbo @$150)
~96 crabs · "covers about 4 crabs per person. Add more if crabs are the main food." (under vs main-role 6) · order summary "1 bushel large + 2 dozen jumbo" · $645 estimated / $26.88 per eater from entered prices · Mark bought → "$345 bought so far", budget spent moves, recovery protects the bushel and offers the jumbo line as a ~$300 tradeoff.

## 11. Data deliberately not invented
No live/market prices, no vendor quotes, no cheaper-unit claims, no coverage when counts are unknowable (mixed-size bushel without a vendor count), no cost without a price, no bought without the host marking it.

## 12–15. Green dot / CTAs / recovery / mobile
Handled requires real completeness (test 21 — never just "crab selected"). Every issue routes to its exact field. Recovery: tradeoff-only for unbought, protected when bought. Mobile 375px: lines wrap to two rows, no overflow, CTAs tappable (screenshot in session).

## 16–23. Tests & suites
16 contract tests (`src/lib/__tests__/crabPlan.test.js`) covering spec tests 1–18, 21 + relevance + half-bushel defaults; recovery/hostSpending interaction covered by their suites staying green. Full frontend **2109/2109 (128 suites)** · backend **97/97** · build clean. Prod smoke post-deploy.

## 24. Parked
Role selector UI (role defaults to main; the field exists in the model — expose when a non-main crab event shows up); ladder-driven price PREFILL from the playbook (would blur host-entered vs reference pricing — deliberate omission); crab line in the printed shopping list (existing p_crabs food-plan line still covers the reminder).

## 25. Recommendation
Accept.
