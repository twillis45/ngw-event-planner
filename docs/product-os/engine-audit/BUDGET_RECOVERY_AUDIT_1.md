# BUDGET-RECOVERY-AUDIT-1 — Budget Recovery Intelligence (audit-only)

Date: 2026-07-07 · Slice type: AUDIT ONLY (zero code changed) · Commit audited: f31eabb
Working name: **Budget Recovery Intelligence / Over-Budget Recovery Plan** (never "Cost Cutting Engine"). Belongs under Budget / Money Core.

## 1. Executive verdict
The data model can support an honest recovery surface **for host-purchased items** (food, supplies, capacity) today: every line carries an estimate-vs-bought truth state, a skip affordance that already removes it from totals, and locked/owned semantics. Vendor-side recovery is **NOT build-ready**: no refundability, cancellation-terms, or negotiability data exists, so any vendor "saving" beyond *unpaid, unsigned, still-deciding* rows would be invented. Verdict: **Outcome B — partial build-ready** (host-purchase recovery yes; vendor recovery only as ask/tradeoff prompts with zero dollar claims).

## 2. Matrix 1 — Budget Source Safety (per money field)
| Field | Truth type | Safe for recovery math? |
|---|---|---|
| `event.totalBudget` | planned ceiling | Yes (denominator only) |
| `budget[].budgeted` | estimate | Yes — reallocation candidate, never "savings" |
| `budget[].actual` | ACTUAL spend | **No** — money already gone; never counted as recoverable |
| `foodGot{}` / `capacityChecked{}` | actual purchased | **No** — bought; only "return/repurpose" as a manual note, never a $ claim |
| `foodLocked{}` / `capacityLocked{}` | locked price | **Ask/tradeoff** — priced commitment; cutting requires a host decision, not a suggestion of free money |
| `capacityOwned{}` | owned, $0 | N/A (already free) |
| food/supplies/capacity **estimate remainder** (`committed − spent` per group) | planned, unbought | **YES — the one fully safe recovery pool** |
| `foodSkip{}` / `capacitySkip{}` | exclusion affordance | Yes — the existing, honest "cut" mechanism (reversible, already wired into totals) |
| `vendor.cost` | quote/contract total | **Ask** — is it signed? paid? unknown terms |
| `vendor.depositAmt` + `depositPaid` | actual once paid | **No once paid** — never suggest a paid deposit is recoverable (no refund data) |
| `vendor.balancePaid` | actual | **No** |
| `vendor.status` ('Considering'/'Quoted') | pre-commitment | Yes — walking away from a quote is a real, safe saving of the *quoted* amount, labeled as "not yet committed" |
| `vendor.contractSigned` | commitment flag | Gate: signed ⇒ tradeoff-only with explicit warning |
| Sourcing/drink choices (`sourcing`, BYOB, caterer-vs-cook factors) | decision levers | Yes — real deltas derivable from the playbook's own price factors |
| `hasRealCount` gate | sizing truth | Hard precondition: no recovery math at all without a real count |

## 3. Matrix 2 — Recovery Candidates (18 areas)
| # | Area | Data support | Class |
|---|---|---|---|
| 1 | Unbought food lines | full (estimate remainder + skip) | **safe_cut** |
| 2 | Unbought supplies | full | **safe_cut** |
| 3 | Unbought capacity/rentals | full | **safe_cut** |
| 4 | Food quantity right-sizing (guest mismatch) | full (guest-scaled qty + `capacityQty`/kids scaling) | **safe_cut** (recompute, not guess) |
| 5 | Guest-count vs purchase mismatch | full (`guestCountResolved`, roster vs estimate) | **safe_cut** prompt ("your count dropped — resize before buying") |
| 6 | Sourcing switch (butcher→warehouse) | full (playbook factors 0.7–1.15×) | **tradeoff** with real derived delta |
| 7 | Drinks → BYOB | full (factor exists) | **tradeoff** |
| 8 | Caterer vs host-cooks | partial (approach flag + per-guest line) | **tradeoff** |
| 9 | Vendor still 'Considering'/'Quoted' | full | **safe_cut** (nothing committed) — quoted $ shown as "not yet committed" |
| 10 | Vendor quoted-but-unsigned, deposit unpaid | full flags | **ask** ("still negotiable? ask before signing") — no invented negotiability |
| 11 | Vendor signed, unpaid balance | flags only, no terms | **do_not_cut without tradeoff warning** (cancellation terms unknown) |
| 12 | Paid deposits / paid balances | actual | **do_not_cut** (refundability unknown — never implied) |
| 13 | Vendor scope reduction (fewer hours/items) | **no data** (no line-item scope) | **unknown** — park |
| 14 | Locked food/capacity prices | full | **ask** (host priced it; cutting = deliberate reversal) |
| 15 | Honoree/ceremony moments (honoree, story, song, drink) | fields exist, no $ link | **do_not_cut** — heart-protected, excluded from all suggestions |
| 16 | Rain/safety backup items (rainPlan, safetyChecked, canopy-class supplies) | partial (no structured safety tag on supply lines) | **do_not_cut** where identifiable; park tagging |
| 17 | Timing-critical vendors (arrival-locked, day-of) | arrivalTime exists | **do_not_cut** flag input |
| 18 | Budget row reallocation (budgeted vs actual per category) | full | **ask** (planner judgment) |

## 4. Matrix 3 — Protected Spend (never suggested for cutting)
- Honoree moments & ceremony items (`honoree*` fields) — heart-protected, hard exclusion.
- Anything paid (`budget[].actual`, `depositPaid`, `balancePaid`, bought items) — money gone; recovery may not imply refunds.
- Signed/locked commitments (`contractSigned`, `foodLocked`/`capacityLocked`) — tradeoff-only with explicit "you've committed to this" warning.
- Rain backup & safety items — a recovery plan that cuts the rain plan is a liability, not a saving.
- Timing-critical vendors (arrival-scheduled, day-of roles).

## 5. Matrix 4 — CTA / Actionability
Every candidate class already has a real destination: safe_cut food/supply/capacity → existing skip/qty controls at `foodrow-<id>` / `caprow-<key>` anchors; sourcing/drinks tradeoffs → food-plan decision controls (`food-plan` anchor, inline foodFocus); vendor ask → vendor cockpit payment/contract sections (first-undone routing); budget reallocation → `hsp-budget` + budget rows. **No new CTA infrastructure is needed** — recovery rows can deep-link to controls that already mutate the single sources. No dead-CTA class identified.

## 6. Hard truth rules (validated against the model)
Never invent savings (all safe $ come from the playbook's own estimate remainders); never infer refundability/negotiability (fields don't exist — classes 10–12 are ask/do_not_cut); never call an estimate "owed"; never "save $X" without a source field; never cut paid/signed/locked without a tradeoff warning; never touch heart moments; no percent-readiness; no fake "budget recovered" state (recovery = committed falling below total via real skips/resizes, measured by the existing `hostSpending` math — no new state).

## 7. Decision gate (8 questions)
1. Can the app tell actual from estimate? **Yes** (hostSpending truth hierarchy). 2. Can it identify unbought spend? **Yes.** 3. Can it identify committed-but-cancellable spend? **No** (no terms data) — ask-framing only. 4. Does a cut mechanism already exist? **Yes** (skip/qty/owned/choice levers). 5. Can savings be sourced to real fields? **Yes for host purchases; quoted-not-committed for vendors.** 6. Can protected spend be excluded? **Mostly** — honoree/paid/signed yes; safety-tagging of supply lines is partial. 7. Does it need a new engine? **No** — composition over hostSpending + playbooks + existing anchors. 8. Is guest/vendor/public leakage possible? **No** — Budget/Money Core is host-only.

## 8. Verdict & suggested next prompt
**Outcome B (partial).** Build-ready scope: "Over-Budget Recovery Plan" panel on the Budget tab, rendered only when `budgetHeroCopy` state is `near`/`over` and `hasRealCount`, listing (a) unbought-line skips/resizes with real $ ranges, (b) sourcing/drink tradeoffs with derived deltas, (c) not-yet-committed vendor quotes, (d) ask-framed prompts for unsigned vendors — each deep-linked, none touching protected spend. Parked until data exists: vendor scope reduction, refundability, cancellation terms, structured safety tags.
Recommended next prompt: **BUDGET-RECOVERY-1 (build)** scoped to Outcome B's safe list, with contract tests banning $ claims that lack a source field.

## 9–18. Required report fields
Commit audited: `f31eabb`. Files inspected: `src/lib/hostSpending.js`, `src/lib/budgetCopy.js`, `src/lib/playbooks/index.js` (food/capacity engines + factors), `src/App.js` (Budget tab 27371+, food plan 10788+, capacity 9670+), `src/CommandCenter.jsx` (vendorPaid math :2222, budget hero), `src/lib/decisionMemory.js`, vendor fields (App.js 4302+). Code changed: **none**. Tests changed: **none**. Copy corrections needed now: **none found** (budget hero language already honest: "review", never "cut"). Risks if built wrong: implying refunds on paid deposits (worst), cutting rain/safety items, double-counting locked vs owned. Top safe opportunities: unbought food/supplies remainder, guest-count right-sizing, sourcing/drinks levers, uncommitted vendor quotes. Top protected: honoree moments, paid money, signed contracts, rain backup.
