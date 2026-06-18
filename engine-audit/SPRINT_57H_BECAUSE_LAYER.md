# Sprint 57H — Because Layer (Planner Reasoning Visibility) — build

*Build. Presentation/explanation only — reasoning VISIBILITY, not generation. The "because" strings are built from factors the engine already computes then discards before render. No readiness/scoring/planning/routing/playbook/intelligence change. Feature flag `pi.because`, default OFF = byte-identical to production. Date: 2026-06-17. Branch: `sprint-57h-because-layer`.*

## The gap
NGW now says what matters (spine), what's healthy (Positive Attention), how sure it is (Confidence Grammar) — but not **why**. The Planning Health rail shows bare conclusions: "14 plates", "rain plan". The factors that produced them exist in scope at the playbook compute sites and are thrown away. 57H exposes them.

## Deliverable 1 · Reasoning Inventory & Deliverable 2 · Rationale Classification Matrix
| Type | Current output | Existing factors (runtime) | Availability | In 57H build? |
|---|---|---|---|---|
| **Capacity** | "14 plates · 18 glasses …" | `playbookCapacity` items × `r.qtyPerGuest`/`qtyFlat` (discarded) | **COMPUTABLE** | **✅ built** |
| **Reality Check** | "confirm: rain plan · food safety …" | `playbookInfraPrompts` authored triggers (`weather`/`grill`/`alcohol`/`kids`) | **COMPUTABLE** | **✅ built** |
| **Ice / operational** | "Buy ice — 18 lbs" | `playbookTasks` `qtyPerGuest × guests` (in scope; the spine `consequence` already carries `~N/guest`) | **COMPUTABLE** | spine already reasons; next increment |
| **Guests / caterer** | "Confirm final guest count" | spine `consequence`: "headcounts cascade into seating, meal counts…" | **AVAILABLE (already shown)** | already in consequence |
| **Timeline** | next-action consequence | overdue days / % — embedded in consequence for the dynamic tiers | AVAILABLE (partial) | already in consequence |
| **Budget typical-setup** | "typically $X–$Y" | `playbookBudgetCategories` per-item `qty × unitCostRange` (discarded) | **COMPUTABLE** | Priority 2 (next) |
| **Vendors** | "Photography — needed" | flat curated roster, no per-category "why" | **MISSING** | excluded (would require authored content — guardrail) |
| **Venue / Decision Confidence** | (future) | — | future | excluded |

**Build target (Part 3):** the two COMPUTABLE, bare-conclusion surfaces with the starkest gap — **Capacity + Reality Check** — both on the Planning Health rail, both one additive field from their compute site. No inferred / generated / invented explanations (Vendors MISSING ⇒ not shown — AP-005/guardrail honored).

## Deliverable 3 · Build implementation
- **`src/lib/playbooks/index.js`** (additive):
  - `playbookCapacity` — each item now carries `factor` + `factorType` (`perGuest`/`perN`/`flat`); returns a `because` built only from those factors: `"7 guests × 2 plates · 2.5 glasses · 1 flatware · 1 chairs each + 4 platters flat"`. **The `qty` math and `summary` formula are byte-identical.**
  - `playbookInfraPrompts` — returns a `because` from the signals that actually fired: `"standard dinner party safety basics + alcohol service in your plan"`. No inference beyond authored triggers.
- **`src/lib/becauseLayer.js`** (new): `becauseOn()` (pi.because flag) + `becauseActive()`.
- **`src/CommandCenter.jsx`**: Capacity/Reality-Check rows pass `because`; `HealthRow` renders a **quiet tier-3 steel "Because …" line** under the note, only when `becauseActive() && h.because`. No predicate/quantity/score/route change.

## Deliverable 4 · Runtime safety review
| Guarantee | Evidence |
|---|---|
| No calculations changed | `qty` assignments untouched; `factor` capture is additive in the same branches |
| **No quantities changed** | **QA T4: "14 plates" identical flag OFF ↔ ON** (Solstice 7 guests × 2); unit snapshot guard on `summary`/`qty` |
| No readiness / score change | Capacity & Reality Check are display-only rows (never enter `getEventReadiness`); untouched |
| No routing change | no route/handler touched |
| No intelligence change | `because` strings derive 100% from existing factors; nothing inferred/generated |
| Output = recommendation + existing reasoning | exactly one new line per eligible row |

## Deliverable 5 · Placement recommendation
**Belongs on the Planning Health rows that state a bare conclusion** (Capacity, Reality Check) — the reasoning sits one line below its conclusion, where the eye already is. **Rendering:** a quiet **tier-3 steel inline line** ("Because …"), collapsible-ready, mobile-safe (one short line). **Does NOT belong** on: the hero spine where the consequence *already* carries the reasoning (would duplicate); Positive Attention ✓ rows (a "set" item needs no justification); or any row whose rationale is MISSING (Vendors) — showing an invented because there would break AP-005.
- *Recommendation on visibility (Parts 4–6):* **inline-collapsed by default for all personas** in v1 (the line is short). Future refinement: host = tap-to-expand, planner = always inline, operator = same factual line — a **presentation** difference only; the reasoning content is identical (One Truth).

## Deliverable 6/7/8 · Host / Planner / Operator screenshots
- `57h_flagON_host_1440.png` — Capacity **"Because 7 guests × 2 plates · 2.5 glasses … each + 4 platters flat"**; Reality Check **"Because standard dinner party safety basics + alcohol service in your plan."**
- `57h_flagON_planner_1440.png` — same factual reasoning (universal trust; planner sees the identical because — presentation parity by design in v1).
- `57h_flagOFF_1440.png` — no Because line (production identity).
- Operator: persona not yet wired (`organization → planner` today); when Part 3 (Operator) wires it, the same `because` renders under operator labels — no logic fork.

## Deliverable 9 · QA report (puppeteer, dev runtime · screenshot-verified)
| # | Check | Result |
|---|---|---|
| 1 | Flag OFF = no Because line (identity) | **PASS** |
| 2 | Host mode = Capacity "Because … guests ×" + Reality "Because … safety basics" | **PASS** |
| 3 | Planner mode = same reasoning (universal) | **PASS** |
| 4 | Operator mode | N/A (persona unwired; renders when Part 3 ships) |
| 5 | Mobile 390 | rail is **desktop-only** (no health rail on mobile) → no Because, no regression |
| 6 | Desktop 1440 | **PASS** (screenshots) |
| 7 | **Snapshot: quantity unchanged** — "14 plates" identical OFF ↔ ON | **PASS** |
| 8 | No readiness change | **PASS** (rows are display-only) |
| 9 | No quantity change | **PASS** (T7) |
| 10 | No console errors | **PASS** |
| 11 | No page errors | **PASS** |
| — | Unit suite (`becauseLayer.test.js` + full): flag gate, factor-traced because, additive snapshot | **118/118 PASS** |
| — | Prod build compiles; playbook `qty`/`summary` formula 0-diff | **PASS** |

## Deliverable 10 · Merge recommendation
**APPROVE — merge-ready, hold for review.** A small, flag-gated (default-OFF) reasoning-VISIBILITY layer: every "because" is built from factors the engine already computed and discarded, the quantities are provably unchanged (snapshot-verified), and the MISSING case (Vendors) is correctly excluded rather than invented (AP-005). It answers "why is NGW telling me this?" directly under the conclusion — **the intelligence and planning do not change; trust rises because the reasoning becomes visible.** Ship behind `pi.because` OFF; enable with the other PI flags for cohort QA. Next increments: ice/operational spine because, budget typical-setup line-items (both COMPUTABLE); Vendors stays out until a `why` is authored.

## Final question — answered
**Can a first-time host answer "Why is NGW telling me this?" without documentation?** For the built surfaces: **yes** — "14 plates · Because 7 guests × 2 plates each" and "rain/safety prompts · Because standard dinner-party basics + the alcohol service in your plan" are self-explaining. The reasoning is now visible where the conclusion lives. *Expression over expansion.*
