# Sprint 57K — Value-Level Confidence (build + audit)

*Presentation-only. Confidence travels WITH the number. Pattern 014 — exactly five levels (Known / Likely / Estimated / Needs Verification / Unknown), no scores, no percentages, no sixth category. Feature flag `pi.valueConfidence`, default OFF = production identity. Date: 2026-06-18. Branch: `sprint-57k-value-confidence`.*

## Core question
*Can a user tell how certain NGW is about a specific value?* Today: no — "24 plates" / "$500" look exact regardless of provenance. 57K attaches the value's certainty to the value itself.

## Deliverable 1 · Value Inventory & Deliverable 2 · Classification Matrix
Confidence is **provenance-driven** — classified from existing signals, never inferred.
| Value | Provenance (runtime) | Level | Surfaced in v1? |
|---|---|---|---|
| **Capacity / supplies** (plates, glasses…) | derived `qtyPerGuest × count` | **Likely** (count confirmed) / **Estimated** (estimate/pending) | **✅ built** (the chip) |
| **Food / Beverage quantities** | same derivation (`playbookTasks`) | Likely / Estimated | reader supports; spine application = phase 2 |
| **Guest Count** | confirmed list / estimate / none | Known / Estimated / Unknown | reader supports (also Decision Confidence 57J) |
| **Vendor / Staffing / Seating / Timeline counts** | user-entered facts | **Known** | **not surfaced** — tagging the obvious = confidence spam (Part 6) |
| **Venue facts** (capacity/parking/power) | never confirmable by NGW | **Needs Verification** (AP-005) | not a rail value today → reader-only |
| **Budget** | `event.budgetSource` is **creation-form-only, not persisted**; CommandCenter never reads it | **DEFERRED** | **omitted** — provenance unobservable ⇒ classifying it would invent certainty |
| Future Experience Intelligence | — | — | n/a |

**The discipline:** only values whose provenance is **observable** are classified. Budget's manual-vs-estimate flag isn't persisted, so budget value confidence is **deferred** (same AP-005 honesty as 57J's deferred decisions), not guessed.

## Deliverable 3 · Range Audit
Ranges are more honest than point values where a band genuinely exists:
| Candidate | Range honest? | v1? |
|---|---|---|
| Budget estimate ($400–600) | **Yes** | deferred (provenance + the range needs `estimateTotalRange` wired to the rail) |
| Protein lbs (10–14), bartenders (1–2) | Yes | spine phase 2 |
| Capacity serveware (24 plates) | the playbook emits a **point** value (`qtyPerGuest`), no authored ± band | **the confidence CHIP is the honest v1 substitute** — "About · 24" says "this is an estimate" without fabricating a band |
**Finding:** don't fabricate ranges where no band data exists; the Pattern-014 **chip** conveys the uncertainty truthfully. Real ranges (budget, protein) are a phase-2 enhancement once their band/provenance is available.

## Deliverable 4 · `valueConfidence` reader (`src/lib/valueConfidence.js`)
`valueConfidence(kind, event) → level | null` (null = deferred / not classifiable). Reuses `guestCountResolved` (no parallel math). A derived quantity is **Likely** only with a **confirmed list** (`guests.length>0 && guestCountResolved.resolved`) — an estimate-only count is treated as "resolved" by the gate but is **not** a confirmed count, so for *value* confidence it reads **Estimated**. `valueWord(level, event)` returns the persona word. `VALUE_LEVELS` (exactly five), `DEFERRED_VALUES = ['budget']`, `VALUE_WORDS` exported. Presentation-only: no calculation/output/readiness/decision/quantity change.

## Deliverable 5 · Persona Review (words only, no logic fork)
| Level | Host | Operator | Planner |
|---|---|---|---|
| known | Set | Confirmed | Known |
| likely | Likely | Likely | Likely |
| estimated | **About** | Estimate | **Estimated** |
| needs_verification | Confirm | Verify | Needs verification |
| unknown | Not set | Not set | Unknown |
*Operator activates with PR #52 (organization→operator); authored + unit-tested now.*

## Deliverable 6 · Placement Recommendation
**Where it belongs:** ON the value — a small Pattern-014 pill **immediately before the number** it qualifies, on **derived quantities** (the Capacity row in v1: "About · 14 plates · …"). It travels with the number, not the screen.
**Where it does NOT belong:** user-entered facts (vendor/guest/crew counts — obviously Known; a chip there is spam), and **deferred** values (budget — would fabricate certainty). Recommendation: v1 = Capacity rail chip; **phase 2** = budget *range* (once `budgetSource` is persisted) + food/beverage spine quantities. *Note: the rail is desktop-only, so this chip is desktop-scoped (like grammar/Because).*

## Deliverable 7 · QA Report (puppeteer · screenshot-verified)
| # | Check | Result |
|---|---|---|
| 1 | Flag OFF = no chip (production identity) | **PASS** |
| 2 | Host, pending count ⇒ **"About"** chip (Estimated) | **PASS** |
| 3 | Host, confirmed count ⇒ **"Likely"** chip | **PASS** |
| 4 | Planner ⇒ **"Estimated"** chip (persona word) | **PASS** |
| 5 | **QUANTITY UNCHANGED** — "14 plates" identical flag off ↔ on (same data) | **PASS** |
| 6 | No console / page errors | **PASS** |
| — | Operator word | authored + unit-tested (runtime via PR #52) |
| — | No confidence contradiction (chip = value provenance; distinct from row status) | by design |
| — | Mobile 390 | rail desktop-only ⇒ chip not shown on mobile (no regression) |
| — | Tests | **160/160 PASS** (incl. 14 new) |
| — | Build compiles; `playbookCapacity` qty math 0-diff; engine 0-diff | **PASS** |

## Deliverable 8 · Screenshots (`demo/review-artifacts/`)
`57k_flagOFF_1440.png` (no chip) · `57k_host_estimated_1440.png` (**"ABOUT · 14 plates"**) · `57k_host_likely_1440.png` (**"LIKELY · 6 plates"**) · `57k_planner_1440.png` (**"ESTIMATED"**).

## Deliverable 9 · Merge recommendation
**APPROVE — merge-ready, hold for review.** A small, flag-gated (default-OFF), additive chip that attaches Pattern-014 certainty to the one class of value that *looks* exact but is a derivation (capacity/supplies). Provenance-driven, never inferred; budget is correctly **deferred** (unobservable provenance), venue facts are **Needs Verification** (AP-005). Quantity provably unchanged (T5), engine/playbook 0-diff, persona words only. It makes the product **more honest, not more complicated** — minimum useful presentation, no confidence spam. Ship with the PI stack, flags OFF; phase-2 = budget ranges + spine quantities once their band/provenance exists.

## Success condition — met
A user can now answer "how sure is NGW about this number?" without documentation: **"About · 14 plates"** (an estimate) vs **"Likely · 6 plates"** (from a confirmed count). Confidence travels with the value; the number itself is unchanged. *Expression over expansion.*

*Confidence: High — classification traced to `guestCountResolved` + provenance fields; the budget deferral confirmed by grep (`event.budgetSource` never persisted/read at runtime). Weakest point: v1 surfaces only the Capacity value (minimum-useful, anti-spam) — broader rollout (budget ranges, spine quantities) is phase 2, gated on band/provenance data.*
