# COI-LOGIC-1 — Service-Mode-Aware Vendor Insurance Classification

Date: 2026-07-07 · Slice type: audit + repair · Status: SHIPPED

## 1. Executive verdict
The COI gate WAS blunt category guessing: a hardcoded `COI_REQUIRED_CATEGORIES` list forced `catering`/`beverage`/etc. into "Request it" (escalating to critical ≤14 days out) regardless of whether the vendor ever sets foot on the property. A restaurant pickup order could read as a missing COI. Fixed: requirement now comes from a deterministic service-mode + venue-requirement classifier; category alone can no longer assert "COI missing."

## 2. COI Logic Matrix (summary)
| Scenario | Old behavior | New behavior |
|---|---|---|
| Restaurant/bakery pickup or delivery/drop-off | Neutral only if category missed the list; "Catering pickup" read REQUIRED | `not_needed` — "Insurance probably not needed for pickup or drop-off. Ask only if the venue requires it." No fix-it button, no chip, no hero |
| Caterer, mode unknown (on-site serving default) | "Request it" → critical ≤14d | `recommended` — "Ask about insurance…" attention-capped, never critical on its own; hero copy asks instead of asserting the load-in gate |
| DJ / band / photographer / video / florist / decor / food-unknown | DJ/photo weren't in the list (silent); florist silent | `ask_venue` — "Check insurance need/venue rules", level safe, zero alarms |
| Tent/stage/bounce/rentals, alcohol/bar, transport/shuttle, security, valet, generator, pyro, food truck / open flame | required | `required` — "Ask for a COI. This vendor creates on-site risk…" (unchanged escalation) |
| Venue notes mention insurance/COI | Not read at all | `required`, source `venue` — overrides everything derived, incl. pickup |
| Explicit coiStatus (received / requested / not_required) | Wins | Still wins, unchanged gate lifecycle (received→verify→verified/expired) |
| No category, no signals | Silent (not required) | `unknown` — "Check insurance need. We need to know whether this vendor is just delivering or working on-site." |

## 3. Files inspected
`src/lib/vendorIntelligence.js` (COI state, next-action, priority ladder), `src/plan/VendorPlanningWorkspace.jsx` (insurance hero, list chip, Documents COI row, lock-in gates), `src/CommandCenter.jsx` (Tier-4.2 COI dock-blocker), `src/lib/doItForMe.js` (guest/brief bans), doctrine + BRIEF_ASSIST_1/PAY_COPY_1/ACTIONABLE_ROWS_1 docs, venue fields (`houseRules`, `venueNotes` — free text; no structured venue-COI flag exists).

## 4. Files changed
- `src/lib/vendorIntelligence.js` — new exported `vendorCoiRequirement(vendor, event)`; `getVendorCOIState` consumes it (blunt category list retired); recommended tier capped at attention with "Ask about insurance" label; `coiNextAction` recommended-tier copy asks instead of asserting; state now carries `need`/`hostCopy`/`needReason`.
- `src/plan/VendorPlanningWorkspace.jsx` — insurance hero sub-copy honest per tier; Documents COI row shows classifier guidance (`data-testid="coi-guidance"`); fix-coi-row suppressed when `not_needed`.
- `src/lib/__tests__/coiLogic.test.js` — new, 14 contract tests.

## 5. Classification helper behavior
`vendorCoiRequirement(vendor, event)` → `{ level: not_needed|ask_venue|recommended|required|unknown, reason, hostCopy, source: explicit|venue|service_mode|category|none }`. Precedence: explicit coiStatus → venue requirement text → pickup/drop-off signals → high-risk service mode → on-site work → mixed-category check → unknown. Pure, deterministic, existing fields only.

## 6. Service mode model
No structured service-mode field exists and none was added (per slice guardrail). Mode is derived only from explicit text in `category`/`name`/`notes` (`pickup`, `carry-out`, `drop-off`, `delivery only`, `food truck`, `grill on-site`, …). When text can't say, the answer is "check", never a claim. Future structured field recommended in §22.

## 7. Venue requirement behavior
`event.houseRules` / `venueNotes` / `venueRules` scanned for insurance/COI language (`certificate of insurance`, `proof of insurance`, `insurance required`, `requires a COI`…). A hit forces `required` with source `venue` and venue-explicit copy — overriding even pickup vendors (test 10).

## 8. Host-facing copy changes
All copy from the spec's examples verbatim or near-verbatim; asks not assertions; no "COI missing" for pickup/drop-off; no legal-certainty language (test-banned: legal/liab/guarantee/approved/compliant).

## 9. Actionability / CTA behavior
- `not_needed`: guidance line only, no fix button, no chip, no hero (informational by design — nothing to fix).
- `ask_venue`/`unknown`: "Check insurance need" guidance + existing "Review insurance" action into ContractFlow (real fields).
- `recommended`/`required`: existing actionable path unchanged (fix-coi-row → contract section; hero → cockpit COI section; coiNextAction ladder).

## 10. Vendor Brief / public safety
Untouched. The public brief payload never carried COI internals (PAY-COPY/BRIEF-ASSIST privacy tests still green); the vendor-facing COI ask remains the existing request-framed coiNextAction copy.

## 11. Guest / audience safety
No guest surface touched; guest-copy bans (no vendor-document language) still enforced by existing tests.

## 12. Data deliberately not invented
No service-mode field, no venue-COI boolean, no upload state, no "insurance approved" state, no refund/coverage terms. Unknown stays unknown.

## 13–17. Tests & suites
14 new contract tests (pickup, delivery, catering, on-site cooking, alcohol, DJ, photographer, rentals, unknown, venue-override, explicit-tracking, transport/security, language bans, no-critical-escalation-for-recommended). Full frontend **2043/2043 (120 suites)** · backend **97/97** · production build clean.

## 18–19. Preview results
Desktop (disposable `coi-test` event, 7 vendors): only the tent vendor wore "needs insurance" + hero; pickup restaurant showed "probably not needed" with NO fix button; DJ showed check-copy with action; catering read calm status. Mobile (375px): guidance readable, no false red, no overflow, no fresh console errors. Disposable event removed after.

## 20. Production smoke
Post-deploy bundle grep for classifier copy strings (see commit/deploy log below).

## 21. Items parked
- Structured `serviceMode` field + edit UI (needs product decision on where the host declares pickup vs on-site).
- Contract/COI reversal flow (pre-existing parked item).
- `venue` category tier: kept in on-site `recommended` tier (was blunt-required) — venue-vendor COI relationship is genuinely mixed.

## 22. Recommended future model fields
`vendor.serviceMode` (enum from the spec's 12 modes) + `event.venueCoiRequired` (boolean set from venue contract/house rules) would make tiers 3–6 explicit instead of text-derived.

## 23. Recommendation
Accept. The classifier is deterministic, honest about unknowns, changes no privacy surface, and removes the "app doesn't understand real event ops" failure mode.
