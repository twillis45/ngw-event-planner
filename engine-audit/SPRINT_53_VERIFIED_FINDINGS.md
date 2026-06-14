# Sprint 53 — Engine Hardening: VERIFIED Findings (source-inspected, not assumed)

Every audit claim was checked against the live source. **Confirmed** = reproduced in code. **Refuted** = audit was wrong for current code. **Partial** = real but mis-framed. Only confirmed issues were implemented.

## What was IMPLEMENTED this pass (confirmed + low-risk)

| Fix | File | Status |
|---|---|---|
| **Task 4** — family-level per-head fallback (`PER_HEAD_BY_FAMILY`) so ~19 uncovered types stop hitting the flat `{100,250}` generic | `lib/budgetEstimator/totalEstimate.js` | ✅ done, compiles |
| **Task 5** — WEDDING_SHARES `venue` relabeled "Venue (site rental)" + band corrected 30–45% → 12–20% (was double-labeled "Venue + catering combined" while catering was a separate row) | `lib/budgetEstimator/categoryShares.js` | ✅ done |
| Host-aware purge guard — a self-host (`recordKind:'event'`) event no longer trips the first-real-event sample purge | `src/App.js` `createEvent` | ✅ done |

## Verified findings per task

**Task 1/2 — Taxonomy drift: CONFIRMED (with nuance).** Five independent classifiers exist, each with its own regex/map:
1. `familyFor` (eventSolve.js:749) — 29 *solve* families; returns `null` for unmapped **by design** ("NEVER silently a wedding").
2. `intakeFamily` (App.js ~2025) — 5 *intake* families; defaults `host_driven`.
3. `budgetFamilyForType` (confidence.js) — 5 families, an **exact mirror of #2** (this is the genuine same-axis duplication).
4. `getCategoryShares` (categoryShares.js:81) — its **own** 3-family regex (WEDDING/CORPORATE/PRIVATE).
5. `proposedVendorCategories` (vendorCategoriesByType.js:94) — curated map + `ALIASES` + falls back to #4.
*Nuance the audit missed:* #1/#2/#4 are **different axes** (solve granularity ≠ intake complexity ≠ budget shares), so it's not "one event, five different answers" — but **#2 and #3 are the same axis computed twice**, and all five carry independent keyword logic that *can* disagree on off-taxonomy input. → A canonical `eventTaxonomy.js` is **warranted**; see "Remaining."

**Task 3 — Off-taxonomy routing: PARTIAL.** `intakeFamily` never returns null (good, defaults to middle-weight). `familyFor` returns null by design (acceptable — no fake solve preview). But there's **no shared alias layer**: `ALIASES` (vendorCategoriesByType.js:80) covers only ~6 modal-vocab variants. "Welcome Dinner" → `familyFor` null / `intakeFamily` home_hosted / categoryShares FALLBACK — three engines, three different treatments. Confirmed: aliases belong in the canonical layer.

**Task 4 — Budget coverage: CONFIRMED + FIXED.** `PER_HEAD_BY_TYPE` (17 entries) + flat fallback; ~19 of 24 canonical types fell through (Elopement, Anniversary, Holiday Party, Board Meeting, Product Launch, Team Retreat, Town Hall, Training, Award Ceremony, Client Dinner, Wellness Retreat, Dinner Party, Housewarming, Get-Together…). Also **label drift**: keys 'Corporate Retreat'/'Corporate Event' don't match taxonomy 'Team Retreat'/'Holiday Party'. → Added `PER_HEAD_BY_FAMILY`; every type now resolves explicit-or-family.

**Task 5 — Category integrity: CONFIRMED + FIXED.** See above. Bands are non-additive/overlapping (already documented; comment strengthened). Other type tables in categoryShares still use 'Corporate Retreat'/'Corporate Event' keys but the **family regex fallback already catches the real names**, so no silent generic — verified.

**Task 6 — Vendor coverage: REFUTED on rosters, CONFIRMED on depth.** The audit said Auctioneer / Fundraising Platform / Live Streaming / Event App / Registration-Badging / Sponsor / Speakers / MC-Host / Brand Activation are *missing* — **false**: all 9 are present in `CURATED_VENDORS` rosters. BUT verified: **0 of the 9 have a playbook (`playbooks.js`) or questions (`vendorQuestions.js`)**. So the real gap is accountability depth, not roster presence. (Not yet implemented — see Remaining.)

**Task 7 — Date engine: SPOT-CHECKED, deeper pass needed.** `completionFromEvent` (eventSolve.js:757) uses a 21-day past-deadline cutoff to infer done. `familyFor`/preview return null cleanly for unmapped. Did NOT fully verify DST/timezone math in `daysBetween` or past-event labeling — **flagging as unverified**, not claiming a fix I didn't confirm.

**Task 8 — Cultural events: CONFIRMED gap.** `Quinceañera` is first-class. **Absent**: Bar/Bat Mitzvah, Diwali, Eid, Lunar New Year, Bris. They currently degrade to keyword/default families (e.g., "Bris" → host_driven, `familyFor` null). Per the audit's own "don't overbuild," they need *enough* structure to classify/estimate/vendor sensibly — best delivered via the canonical layer + aliases. (Not yet implemented.)

## Task 1/2 — Canonical taxonomy: SHIPPED (this pass)

Built `src/lib/eventTaxonomy.js` — ONE CommonJS table (`EVENT_TAXONOMY`, 33 canonical types) that maps each type to its answer on every axis, plus one `TYPE_ALIASES` map + one ordered `KEYWORDS` resolver that all engines now share. CommonJS so the node-testable engine (`eventSolve.js`) can `require` it while the webpack/ESM surfaces import it via interop.

**The 5 classifiers now DERIVE (no engine keeps its own keyword logic):**
| Classifier | File | Before | After |
|---|---|---|---|
| `familyFor` (solve) | `eventSolve.js` | local `FAMILY_BY_TYPE` regex array | `taxonomy.solveFamilyFor()` |
| `intakeFamily` | `App.js` | `INTAKE_FAMILY_BY_TYPE` + 4 regexes | `taxonomy.intakeFamilyFor()` |
| `budgetFamilyForType` | `confidence.js` | `_FAMILY_BY_TYPE` + 4 regexes (verbatim mirror of intake) | `taxonomy.budgetFamilyFor()` (alias of intake axis — dup eliminated) |
| `getCategoryShares` | `categoryShares.js` | own 3-family regex | `taxonomy.budgetShareFamilyFor()` → share table |
| `proposedVendorCategories` | `vendorCategoriesByType.js` | local `ALIASES` map | `taxonomy.curatedRosterKeyFor()` |

**Axes are mapped ONCE each (they are NOT collapsed into one family):** solveFamily (29 graphs, null-for-unmapped preserved) ≠ family (5 intake/budget) ≠ shareFamily (3+fallback). The genuine same-axis duplication (intake vs budget family) is gone — `budgetFamilyFor` is now literally the intake function.

**Drift-eliminated proof (node parity harness, all 33 canonical types):**
- `solveFamily`: 33/33 identical to the pre-refactor `eventSolve.familyFor`.
- `family`: 33/33 identical to the old `INTAKE_FAMILY_BY_TYPE` **and** `_FAMILY_BY_TYPE` (confirmed the two maps were byte-equivalent in result → one axis).
- `shareFamily`: 33/33 identical to old `getCategoryShares`, **except one intentional upgrade**: `Elopement` fallback→wedding (it's a micro-wedding; its curated roster is already wedding-shaped).

**Off-taxonomy now resolves ONE way across all engines (was three):** "Welcome Dinner"→Dinner Party (home_hosted), "Team Offsite"→Team Retreat (corporate), "Sip & See"→Baby Shower, "Crawfish Boil"→Get-Together, "Diwali Party"→Birthday family + cultural:hindu, "Bris"→Baby Shower + cultural:jewish, "Bar Mitzvah"→Sweet 16 + cultural:jewish-coming-of-age. Truly-unknown ("Trivia Night") → host_driven / fallback / solve-null — the safe middle, **never** the maximal family.

**Documented intentional axis difference:** Holiday Party = family:corporate but shareFamily:private (preserves current budget breakdown; the share axis is coarser than the family axis by design).

**Task 8 (partial):** cultural names resolve to the nearest host model + carry a `culturalFlagFor()` flag (forward-looking metadata; not yet consumed by core engines). No new EVT_TYPES added (would change the create-event picker — out of this engine-only scope).

**Verification:** `node src/lib/eventSolve.js` ✓ · `validateEngine.js` 0 unmapped ✓ · `backtestEngine.js` 6/6 hits, 0 false-alarms ✓ · webpack compiles clean (no overlay) ✓ · live: home next-step spine + Budget category rows ($ ranges) render ✓.

## Remaining (confirmed, NOT yet built — recommend a focused pass)

- ~~**Canonical `lib/eventTaxonomy.js` (Task 1/2)**~~ — ✅ DONE this pass (see section above).
- **Task 6 depth** — playbooks + questions for the 9 corporate/gala categories that have rosters but no accountability model (Auctioneer, Fundraising Platform, Live Streaming, Event App, Registration/Badging, Sponsor/Exhibitor, Speakers, MC/Host, Brand Activation). NOT started.
- **Task 8 (full)** — cultural names now classify + carry a flag via the taxonomy; a bespoke cultural overlay (real milestones/rosters per tradition) still TODO, and would pair with adding first-class EVT_TYPES (a UI change).
- **Task 7** — deeper read of `daysBetween`/`completionFromEvent`/`enginePreview` for DST/timezone/past-event correctness. NOT started.

## Beta-readiness verdict

The engine is **structurally sound and degrades safely today** — no event silently nulls in the user-facing paths (intake/budget/vendor all have fallbacks; only `familyFor`/solve nulls, by design). The drift is **latent, not actively wrong** for the canonical types. The two highest-value confirmed gaps (budget per-head coverage, the misleading wedding category label) are **fixed**. **Verdict: safe for continued planner testing as-is; the canonical-taxonomy consolidation (Task 1/2) is the right next foundational pass before broad GA, but is not a beta blocker.**
