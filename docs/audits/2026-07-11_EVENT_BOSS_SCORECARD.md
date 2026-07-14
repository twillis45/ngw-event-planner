# Event Boss — The Scorecard

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/44294497-168a-4a59-8cb9-d9c39ccc8378. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-11 · Source: artifact `44294497`

---

**Intelligence-layer scorecard · 24 layers · 0–10 each · Both apps**

Every intelligence layer, scored 0–10 for each app on how honestly and usefully a real host experiences it — grounded in the live crab-feast run and the re-verified code review. Re-scored 2026-07-10 as fixes shipped: the exact tie has broken, narrowly, as the shared engine bugs came out. Updated again 2026-07-11 as three more shared food-plan engine bugs were found and fixed.

## Shipped since this audit — 2026-07-11

A separate food-plan audit (scoped to a general host event, not the crab feast specifically) surfaced and fixed three more shared-engine bugs, all in `lib/playbooks/index.js` — the same food-plan engine the "Food plan" row below scores. **Skip/restore money bug:** the caterer line (`fa-catering`) was missing its `skipped`/`locked` fields entirely — tapping "skip it" on the caterer produced a "skipped" toast but silently left its full cost ($600–$1,600+ at typical counts) counted in every total. Also rebuilt V2's skip control itself: it used to filter skipped items out of the list entirely with no way back; skipped items now stay visible (struck-through) with a one-tap restore, matching legacy's toggle. **Shopping list wiring:** V2's "Copy the shopping list" called `draftShoppingList(event, profile)` with no items and no location — every line and every "find a store near you" map link came back empty. Fixed by wiring the same `foodShopItems`/`eventGeoQuery` engines legacy's shopping list already reads (the latter was legacy-only and un-exported despite its own doctrine comment claiming "single source of truth" — extracted to a shared `lib/eventGeoQuery.js` so it's actually true now). **Per-item sourced cost:** V2's per-item "where to buy" store chip used to record the store only, never the price. It now re-prices that one line using the same real, cited per-channel price data (`sourcingPrices` / `canonicalProteinPrice`, both carry real citation URLs) the plan-wide sourcing-tier picker already used — verified live against real numbers (ribs: butcher $80–140 → Costco $60–80, matching the sourced $3–4/lb Costco range). **Also audited, not a scored row here:** the admin research/provider pipeline (`lib/knowledge/*`) was found to be 100% simulated — every provider family (government, food-safety, commercial, industry, academic, community) fabricates realistic-looking citations by default with no live fetch ever wired, gated only by a human-review step before publish. Bridged two of six: `fda-foodsafety` (openFDA) and `scholar` (Crossref) now do a real live fetch, both keyless; the other four (retail/wholesale-specific pricing, industry-association surveys, community forums) have no free public API and stay honestly simulated rather than faked live. **Correction, not a fix:** the 07-10 note below still claimed the vendor cockpit "forces informal helpers through paid-vendor COI/contract tracking, not yet fixed." Re-verified against live code: it was already fixed in both apps — `vendorIntelligence.js`'s `vendorCoiRequirement`/`getVendorCOIState`/`coiNextAction` and `vendorAccountability/derive.js`'s four derive functions all short-circuit to "not needed" when `vendor.isInformal`, and both `App.js:6930` and `HostShellV2.jsx` hide the entire Pricing/Payment/Deposit/Contract/COI block for an informal helper. No code changed; the citation was stale.

## Shipped since this audit — 2026-07-10

The three highest-priority fixes below (Decision board, Readiness/guardrails, Crab coverage) are now live in both apps — see the impact table below, marked ✓, and the layer scores above them recomputed to match. **New:** a legacy-only vendor cost estimator (metro-market index + rush-timeline premium, each with a plain-language "why") is now shared and live in V2, closing part of the procurement gap this scorecard flags below — though V2's vendor *cockpit itself* was found to be unreachable from a cold start (now also fixed). *See the 07-11 correction above: the "still forces informal helpers through paid-vendor tracking" claim that used to follow here was stale — re-verified already fixed in both apps.* Also fixed the same session: the retirement playbook's surprise-choreography default, now decision-gated (9 tests); the food plan's vegetarian double-buy (protein base now nets vegetarians/vegans out in full, same as it already did for kids at 40%); getEventReadiness pinning DIY hosts "At risk" forever — **legacy only** (Studio Events Index card), V2 has its own parallel instance of this bug still open; a deeper roster-mode kids bug found while closing the kids-input gap — a roster's per-guest "kids brought" count was invisible to the shared headcount engine entirely (10 adults × 3 kids sized food for 10, not 40), and where V2's roster auto-derived a kids figure anyway, it was being subtracted from a headcount that never included those kids, undercounting toward the floor instead of adding them at their discounted portion. Fixed in the one shared engine (`attendanceBand`) both apps read — legacy's roster mode has real kids modeling for the first time; the earlier "V2's by-list mode already summed kids correctly" note below was itself an overclaim, corrected now. **Also corrected, not fixed:** the "legacy's host-memory loop is inert" finding below was itself wrong — re-verified that legacy's writer (App.js:22400, not the originally-cited :22202) already writes attendance and the read-forward already renders live ("Sized for 66 instead of 75... your call"). No code changed; legacy's score moves 3→7 as a correction. **Two more found+fixed the same session, not yet reflected in a specific row above:** a CTA-truthfulness sweep — a live "seems like it's lying" report on a "Send everyone the details" button traced to a real doctrine violation (it only opens a draft, never actually sends; no messaging integration exists anywhere in the app) repeated 8 times across both apps, all relabeled ("Draft the…"/"Ready to draft"); and a "1 days" → "1 day" pluralization fix on V2's main countdown hero plus 3 sibling spots in legacy sharing the same unguarded pattern. Neither maps cleanly onto an existing scored row/category here — full detail in the Working Doc. **Also fixed:** Event disambiguation — V2's two identical "My Crab Feast" rows (sample + custom) now carry a "Sample" badge on every seed/demo event, the same id-based mechanism legacy's own "Demo" badge already used, and a small "The the cookout move" doubled-prefix typo. Event disambiguation row moves 3→7, now tied; V2's total moves to 156/240. **Also fixed:** three of the four unreconciled denominators (75 guests · 50 crab-pickers · 60–86 food band · 75 budget) now carry a real reconciling caption in both apps — crab-pickers ("30 of your 42 guests are picking crabs," kept in a neutral color, not the clamp-warning color), and budget ("sized for 16–23 guests," reusing the same attendance-band engine everywhere else). Legacy's Guests-tile overclaim ("all size to it," false once a real spread exists) is also fixed, moving Guest resolution 5→7. **Also fixed:** the 7× food-cost band ("$1,825–$12,915" for the same 75 guests) — both ends used to price a DIFFERENT headcount (floor vs ceiling) on top of different price tiers, multiplying two independent uncertainties together; both ends now price the same ceiling qty, only price varies, and the real attendance spread stays disclosed separately rather than folded into the dollar figure. Food plan row moves 5/6→7/7, tied. Also: no upper clamp existed on an implausible headcount (5,000 guests) — never clamped (a host may genuinely run something that large), just now names it ("that's a lot for a typical Crab Feast — worth double-checking the number"), reusing the same `expectedFromPlanned`/`attendanceBand` engine every consumer already reads. And a 6-year-past event no longer contradicts the phase engine by still saying "N things need you." V2's total moves to 158/240, legacy's to 154/240 — V2 still ahead, by 4.

## Headline

| | Score | Grade |
|---|---|---|
| **V2 prototype** | **159 / 240** | B− · 66.3% |
| **Legacy app** | **155 / 240** | C+ · 64.6% |

V2 > Legacy.

V2 leads by 4. The V2 kids-input gap — the single biggest recurring finding across every audit — is closed: V2 now has the same +/− stepper legacy has, feeding the same protein-scaling engine. The "Host memory" row's legacy score was corrected from 3→7 (a correction, not a fix — the earlier finding cited the wrong line). Event disambiguation is fixed. The 7× food-cost band is fixed — both ends now price the same ceiling headcount, only price varies — and all three "cheap" unreconciled denominators (crab-pickers, budget, guests hero) now carry a real reconciling caption in both apps. Food plan moves again 07-11 (7/7→8/8) as three more shared-engine bugs (skip/restore money bug, shopping-list wiring, per-item sourced cost) were found and fixed.

## The 24 layers, scored

Rubric:
- 10 = honest + useful + degrades
- 7–8 = good, minor gap
- 5–6 = works, real gap
- 3–4 = misleads / contradicts
- 0–2 = broken / absent

| Layer | V2 | Legacy | Why the score / the delta |
|-------|:--:|:------:|---------------------------|
| Procurement estimator | **9** | 2 | V2's best layer — cost band, confidence, region, logistics, tightens with location. **Legacy has none at all** — a crab host gets zero cost guidance. +7 V2 |
| ✓ Kids modeling | 7 | 7 | **Fixed 07-10, then hardened same day.** Was 2 / 7. V2's by-headcount mode gained the same +/− "kids/light eaters" stepper legacy has. A deeper bug then surfaced in by-list (roster) mode: per-guest kids were invisible to the shared headcount engine in **both** apps (10 adults × 3 kids sized food for 10, not 40), and where V2's roster auto-derived a kids figure anyway it was subtracted from a headcount that never included them, undercounting instead of adding them at their discounted portion. Fixed in the one shared reader (`attendanceBand`) — legacy's roster mode has real kids modeling for the first time. Tied. |
| ✓ Host memory / learning | 7 | 7 | **Correction 07-10, not a fix.** Was scored 7 / 3 — legacy's writer was cited at the wrong line (App.js:22202, a card that explicitly says attendance is captured elsewhere) and concluded inert. Re-verified: `PostEventRecap` (App.js:22400) writes the attendance domain, `attendanceAdjustment` reads it (App.js:10345), and it renders "Sized for 66 instead of 75. Your plan, your call." + a revert button — the same feature the Attendance band row below already credits to legacy. No code changed; both apps' loops were already closing. Tied. |
| ✓ Event disambiguation | 7 | 7 | **Fixed 07-10.** Was 3 / 7 — V2 showed two identical "My Crab Feast" rows (sample + custom) with no way to tell apart. Fixed with a "Sample" badge on every seed/demo row (id-based, same mechanism legacy's own "Demo" badge already used) — a real custom event now never gets the badge, so even an exact name+venue collision stays distinguishable. Tied. |
| Recommendation lifecycle | **5** | 3 | V2 renders 3 of 7 states; legacy computes it and renders none. Both under-realize the doctrine. +2 V2 |
| ✓ Decision board / verdict | 7 | 7 | **Fixed 07-10:** overdue-on-creation is gone in both. V2's copy now reads "A good place to start"; legacy already said "5 to settle." Was 3 / 5 (V2's alarmist framing on top of the shared bug) — now tied, both calm. |
| Attendance band | 7 | **8** | Both honest ranges; legacy adds "Sized for 66 instead of 75. Your plan, your call." + a one-tap revert. +1 |
| ✓ Food plan | 8 | 8 | **Fixed 07-10, twice over, then again 07-11.** 07-10: the vegetarian double-buy (was 4/5), then the 7× band itself — both ends used to price a DIFFERENT headcount (floor vs ceiling) on top of different price tiers, multiplying two uncertainties together; both ends now price the same ceiling qty, only price varies. Crab-pickers and budget denominators are now captioned too. **07-11:** three more shared-engine bugs in the same food-plan reader — the caterer line was silently missing its skip/lock fields (skipping it never actually dropped its cost from any total); V2's skip control used to delete the item from view entirely with no way back (now stays visible, struck-through, one-tap restore); and a per-item store pick (e.g. "Costco") now re-prices that line with the real cited per-channel data instead of doing nothing. Tied, one point up. |
| ✓ Budget / spend | 6 | **7** | **Fixed 07-10:** the "no budget / $7,370" self-contradiction is reconciled in both. Was 5 / 6 — legacy still ahead by 1 (threads region + shows the denominator; V2 still has a stale-memo lag). +1 |
| ✓ Crab coverage | 7 | 7 | **Fixed 07-10:** the distinct "no order yet" state replaces "0 crabs per person" in both. Was 4 / 5 — now tied, both honest. |
| Weather / rain | **8** | 7 | Shared honest engine; V2 labels "sample" + discloses forecast granularity. +1 V2 |
| Task done-state | **7** | 6 | Shared inference; V2 badges "Inferred" vs explicitly checked. +1 V2 |
| Phase / countdown | 8 | 8 | Shared, honest, clean day-of transition. Tie. |
| Capacity / seating | 8 | 8 | Shared; sizes to the real count, fabricates no price. Tie. |
| Vendor COI | 8 | 8 | Shared, best-in-class honesty ("received — not verified valid"). Tie. |
| Risk advice | 7 | 7 | Shared; expert-correct content ("count by pickers") the food engine then ignores. Tie. |
| Vendor workstreams | 7 | 7 | Shared single-source rollup; can't detect an absent vendor category. Tie. |
| Phase progress | 6 | 6 | Shared; "3 of 6" reads calm next to a 3-day countdown. Tie. |
| Return narration | 6 | 6 | Shared; misses list-builders, routes to a section top. Tie. |
| ✓ Guest resolution | 5 | **7** | **Fixed 07-10, legacy only.** Was 5/5 tied — legacy's "all size to it" overclaim (food sizes to a band, crabs to a picker count, not the bare number) is gone, now reads the honest range. V2 still has the separate, unfixed "kids invisible at `guestCountResolved`" issue. +2 legacy |
| Vendor accountability | 5 | 5 | Shared; a cost/flag infers "evidence attached" (system-tagged). Tie. |
| Identity / context | 5 | 5 | Shared; "confidence" measures input length, compound fires on any " and ". Tie. |
| Dietary | 5 | 5 | Shared; no shellfish-allergy nudge on a crab feast. Tie. (V2's dietary tag breadth + RSVP-merge parity gap closed 07-11 — see Working Doc — but the specific shellfish-nudge gap this row scores isn't that fix, so the row holds.) |
| ✓ getEventReadiness | 4 | **7** | **Legacy fixed 07-10** — the Studio Events Index card now uses the same null-out-inapplicable-axes rule the header score already had, via new shared `applicableReadinessAxes()`. Was 4 / 4. **V2 still open:** HostShellV2.jsx has its own separate raw `getEventReadiness()` call (line 1119) feeding its pillar pills and positiveAttention — found live this session, not yet swapped (deferred: touches 3 downstream consumers, needs its own null-safety check first). +3 legacy |
| **Total** | **159** | **155** | Out of 240. V2 66.3%, legacy 64.6% — V2 ahead by 4. |

## Where V2 wins

Capability + disclosure · +11 net (unchanged — Host memory correction and Disambiguation fix cancel out, since Disambiguation moves from a legacy-win to a tie)

- **Procurement (+7)** — the one genuinely excellent layer; legacy has nothing.
- **Rec lifecycle (+2)**, **weather (+1)**, **task "Inferred" badge (+1)** — discloses more.
- ~~**Host memory (+4)** — the learning loop actually closes.~~ — corrected 07-10, legacy's loop already closes too; tied.

## Where legacy wins

Honesty + completeness · +6 net (this list; the table above also ties Food plan, now 8/8, not itemized here separately)

- **getEventReadiness (+3)** — fixed on legacy 07-10; V2's parallel bug still open.
- **Guest resolution (+2)** — legacy's "all size to it" overclaim fixed 07-10; V2 still has the separate unfixed "kids invisible at guestCountResolved" issue.
- **Denominators, residual (+1)** — V2's food card still doesn't caption its own attendance band (crab-pickers, budget, and guests-hero are now captioned in both apps).
- ~~**Disambiguation (+4)** — no duplicate-name trap.~~ — closed 07-10, V2 now has the same seed-badge mechanism.
- ~~**Kids (+5)** — it asked; V2 never did.~~ — closed 07-10, V2 now has the same stepper.
- ~~**Decision framing (+2)** — "to settle," not "past their easy window."~~ — closed 07-10, both apps now calm.

## Callout

**V2 pulls ahead for real this time.** A ~66% ceiling on both means neither app is close to trustworthy yet — 7 of 24 layers still score 5 or below on at least one side (recounted directly from the table above; Food plan just moved out of this count as the 7× band closed), and the two apps still fail in *opposite directions* on what's left. V2 is a better **engine chassis** (procurement, disclosure, calm, disambiguation, food-band honesty) wrapped in copy that still hides some of its numbers; legacy is **plainer and more honest** about what it knows (readiness), on an older frame that lacks V2's best layer entirely. The target app isn't either one — it's V2's chassis with legacy's remaining edge, minus the shared-engine bugs that remain. Do that and the same 24 layers clear ~215/240 without inventing a single new engine.

## High-priority impact — if / when addressed

The score deltas each fix would buy. All reuse existing engines.

| Fix | Layer lift | What it unlocks |
|-----|-----------|-----------------|
| ✓ Stop overdue-on-creation | Decision 3/5→7/7 | Fresh events stop scolding — the widest trust win, one engine edit. **Shipped 2026-07-10.** |
| ✓ Input guardrails | Readiness 4→7 | Prevents the $9k fat-finger; sanity-checks pickers vs guests and extreme counts. **Shipped 2026-07-10** (plus a related date-corruption guardrail found live this session). |
| ✓ DIY-host readiness fix | Readiness 4/4→4/7 | Backyard hosts no longer pinned "At risk" forever on the Studio Events Index card. **Shipped 2026-07-10, legacy only** — V2's own parallel call site (HostShellV2.jsx:1119) still open. |
| ✓ V2 kids input `✓ fixed 07-10` | Kids 2→7 | V2 gains legacy's kids modeling (by-headcount stepper). Denominator captions still open. |
| ✓ Roster-mode kids engine bug `✓ fixed 07-10` | Both apps | Per-guest "kids brought" is now summed by the shared `attendanceBand` reader (excluding declined rows) and folds into the real headcount + protein discount — legacy's roster mode had zero kids modeling before this; V2's had a silent undercount bug. |
| ✓ Crab "no order yet" state | Crab 4/5→7/7 | Kills the "$1,260 / 0 per person" contradiction. **Shipped 2026-07-10.** |
| ✓ Budget copy reconciliation | Budget 5/6→6/7 | "No budget set" no longer sits beside a priced total. **Shipped 2026-07-10.** |
| Fix legacy learning loop | Legacy Memory 3→6 | "Event Boss remembers" true in both apps. |
| Dedup events + disambiguate | Disamb 3→7 | Removes the "can't find my plan" trap. |
| ✓ Vendor cost estimator → V2 | Procurement gap ↓ | Legacy's metro-market + rush cost engine now shared and live in V2 with a per-category "why." **Shipped 2026-07-10.** |
| ✓ Vegetarian double-buy fix | Food 4/5→5/6 | Protein base now nets vegetarians/vegans out in full (they get the diet-derived veg main instead), not just kids at 40%. **Shipped 2026-07-10.** |
| ✓ Caterer skip/lock money bug `✓ fixed 07-11` | Food 7/7→8/8 | The caterer line ($600–$1,600+ typical) had no `skipped`/`locked` fields at all — "skipping" it never actually dropped its cost from any total. Fixed in the shared engine; V2's skip UI also rebuilt to keep skipped items visible with a one-tap restore instead of deleting them from view. |
| ✓ Shopping list real items/anchor `✓ fixed 07-11` | V2 only | V2's "Copy the shopping list" called the draft function with no items and no location — every line and every store map-link came back empty. Wired to the same `foodShopItems`/`eventGeoQuery` legacy's list already reads; `eventGeoQuery` extracted to a shared lib so it's no longer legacy-only. |
| ✓ Per-item sourced cost `✓ fixed 07-11` | Food 7/7→8/8 | Picking a specific store per line (e.g. "Costco") used to record the store only; now re-prices that line with the real, cited per-channel data the plan-wide sourcing tier already used — verified against real numbers, no new pricing invented. |

**Projected:** both apps clear ~200/240 (from 152/147) — the target app is V2's chassis + legacy's honesty, minus the shared-engine bugs still open.

---

**Method & scoring.** 0–10 per layer reflects the host's lived experience, not raw math: honesty, usefulness, graceful degradation, and whether the layer explains itself. Grounded in the live crab-feast run (75 guests / 50 pickers / 10 kids / ~3 days / Annapolis MD) driven through both apps on 2026-07-09, cross-checked against engine source with every ranked code claim re-verified, then re-scored 2026-07-10 against the shipped fixes, and again 2026-07-11 for three more shared food-plan engine bugs (found via a separate general food-plan audit, not a re-run of the crab-feast scenario specifically — the Food plan row's bump reflects real engine-level fixes, not a fresh live-run re-score).
