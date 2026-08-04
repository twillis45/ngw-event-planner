# Audit Index

Every audit, and where it actually lives.

## Why this file exists

Most of the recent audits were authored as **published Claude artifacts** and never landed in the repo. A repo search could not find them, so they were invisible to any file-based review — including one done in this repo on 2026-07-14, which listed "the last 20 audits" and structurally could not see the most recent and most important ones.

The artifacts below were ported into `demo/docs/audits/` on **2026-07-14**. **The artifact remains the editable original.** If you change one, change the other, or this file starts lying too.

Note also: the repo-root `docs/` tree (including `docs/audits/`) is **outside the git repo** — the git root is `demo/`. Anything written there is unversioned. Audits belong here.

## Ported from artifacts (2026-07-14)

| Date | Doc | Artifact | Headline |
|---|---|---|---|
| 2026-07-13 | [Event Boss vs The Market Leaders](2026-07-13_EVENT_BOSS_VS_MARKET_LEADERS.md) | `a6a7f8b9` | **V2 268/420 (63.8%)** vs Legacy 198/420. Wave trail 210→226→237→238→246→249→**268** |
| 2026-07-13 | [Per-Screen Audit vs Leaders](2026-07-13_PER_SCREEN_AUDIT_VS_LEADERS.md) | `b6e8076d` | **6.5/10** across 30 screens; 5 cross-cutting defects (`--faint` ≈2.77:1 contrast, 22× missing `aria-modal`) |
| 2026-07-13 | [Copy + Layout Audit — V2](2026-07-13_COPY_AND_LAYOUT_AUDIT_V2.md) | `a923806a` | 2 P0 blockers; copy 7.6/10, layout 6.9/10 across ~32 surfaces |
| 2026-07-13 | [Launch-Gate Punch-List](2026-07-13_LAUNCH_GATE_PUNCH_LIST.md) | `a21d24f6` | 279/420 · 66.4%. Only 2 of 7 gated dimensions have a coding path today |
| 2026-07-13 | [Food Plan & Shopping — Friction Audit](2026-07-13_FOOD_PLAN_SHOPPING_FRICTION_AUDIT.md) | `105c09a8` | Price-gated check-off (fixed 07-12); "tune" label hiding 4 of 5 actions |
| 2026-07-12 | [Dark Carbon Splash — The 10+ Audit](2026-07-12_DARK_CARBON_SPLASH_10PLUS_AUDIT.md) | `0c052828` | **9.7/10**, 16/16 fixes verified. Score trail 4.8→6.0→7.5→6.5→9.7 |
| 2026-07-11 | [Parity Audit + Re-Audit Synthesis](2026-07-11_PARITY_AUDIT_REAUDIT_SYNTHESIS.md) | `fc607878` | Nine-audit synthesis; 10-item ranked master fix queue; HQ-1: 9 fixed / 6 partial / **8 open** |
| 2026-07-11 | [Event Boss — The Scorecard](2026-07-11_EVENT_BOSS_SCORECARD.md) | `44294497` | V2 **159/240** (B−) vs Legacy 155/240 (C+); 24 layers |
| 2026-07-11 | [Every Intelligence Layer, Rated](2026-07-11_EVERY_INTELLIGENCE_LAYER_RATED.md) | `480298a1` | 31 layers: 17 Good / 12 Could be better / **1 Bad / 1 Broken** |
| 2026-07-09 | [Agent Opportunity Audit](2026-07-09_AGENT_OPPORTUNITY_AUDIT.md) | `43d0c7b5` | Cognition + rails, **zero agentic tissue**; P0 = inbound vendor-reply parser |
| 2026-07-09 | [Engine Parity — Original vs V2](2026-07-09_ENGINE_PARITY_AUDIT_ORIGINAL_VS_V2.md) | `b76b62ad` | ~35 engines V2 never touches; "V2 consumes engines like a dashboard, not a command system" |
| 2026-07-08 | [Host Shell V2 — Engine & Doctrine Gap Audit](2026-07-08_HOSTV2_ENGINE_DOCTRINE_GAP_AUDIT.md) | `240f4b6a` | 4 confirmed live defects; 8-row doctrine-violation table |

## Ported from artifacts (2026-08-01)

| Date | Doc | Artifact | Headline |
|---|---|---|---|
| 2026-07-29 | [Mobbin Competitive Read — Gap Board](2026-07-29_MOBBIN_COMPETITIVE_READ.md) | `0582ce14` | 10 flow taxonomies, **922 flows**, 24 sections. **Keystone: per-day programme schema** — every engine assumes one day, one anchor, one cohort, so none of it works twice. Nothing in the library guides a host; the guidance leader is a road-trip planner (Wanderlog). Includes the Blink ExperienceOS enterprise mirror |
| 2026-08-01 | [Blink ExperienceOS — Addendum](2026-08-01_BLINK_AND_CONFIRMATION_PATTERNS.md) | `f7dfd4c1` | Knowledge-base extension of the board's Blink section. The operator completion loop in their own labels · **their AI auto-fill does not mark what it filled** and silently drops transits · the analytics inventory: they count inventory, never work owed |
| 2026-08-01 | [Lodging Listing UI Patterns](2026-08-01_LODGING_LISTING_UI_PATTERNS.md) | `2057dcd0` | 10 lodging apps, scoped to the return trip — we don't search, so only card anatomy, price semantics, comparison and missing-data transfer. **Adopt Zillow's transposed rail for the shortlist**; Agoda lets the user choose what a price *means*; reject the whole scarcity vocabulary |
| 2026-08-01 | [Multi-Option Mobile Patterns](2026-08-01_MULTI_OPTION_MOBILE_PATTERNS.md) | `e7d74073` | 18 apps, **zero wrap a pill row**. Container is a function of (count, axes): Binance stacked labelled rails for multi-axis, Hyundai `⌄` expander for overflow, komoot grouped sheet past 9. ⚠️ hostv2 has **2 images total** — every leader tile grid is photo-driven, so the mocks use data instead |
| 2026-08-01 | [CTA Inventory & Redesign](2026-08-01_CTA_INVENTORY_AND_REDESIGN.md) | `5efe3c4f` | 9 button styles → 6. **`cta stay` is a phantom** (3 sites, 0 rules) — 2nd occurrence after `cta big`, so gate it. `.confrow` **and its parent** are hero-only. Redesign: kill the 180° gradient, pill 750 is bolder than the primary 700, tap floor is on the wrong button. **⚠️ "no leader ships a gradient" was CORRECTED 2026-08-04** — Airbnb does; the real rule is no leader ships a *vertical* one. See the 08-04 read below |

## Authored in-repo

| Date | Doc | Headline |
|---|---|---|
| 2026-08-04 | [Buttons and CTA Language — Mobbin Read](2026-08-04_BUTTON_AND_CTA_LANGUAGE_MOBBIN_READ.md) | 27 screens, 27 apps, against 277 measured labels of ours. **Corrects two claims in the 08-01 CTA doc**: Airbnb ships a gradient primary (the rule is no *vertical* gradient), and "a sentence on a button" is 4 labels of 277. **Sentence case has won 179–14 and UX_06 is the holdout.** 11 of 13 leaders keep the number within one glance of the verb; we do it once. 7 bare `done`/`View` labels with file:line |
| 2026-07-17 | [Attention & Density Re-Audit](2026-07-17_ATTENTION_DENSITY_REAUDIT.md) | **The attention ENGINE is full; the PRESENTATION is not calm.** One ranked list re-expressed across 3–4 surfaces with 2–3 counters. The fix is subtraction at the presentation layer, not more engine |
| 2026-07-14 | [Claim Source-of-Truth Sweep](2026-07-14_CLAIM_SOURCE_OF_TRUTH_SWEEP.md) | The vendor over-claim was one instance of a **systemic class**. 4 critical findings, 2 worse than the original |

Older engine audits live in [`../product-os/engine-audit/`](../product-os/engine-audit/); sprint/architecture audits in [`../`](../).

## Artifacts deliberately NOT ported

Visual prototypes, where markdown would destroy the point: Splash Prototypes (`82ad7302`), Wordmark Options (`86abfe99`, `6aa220ee`), "hello" stroke-draw mockup (`c81d0111`), DIFM Magic motion demos (`adde9658`), Host Shell Concept (`bc64ccb0`). Specs and plans (Graduation Spec `81350b10`, The Working Doc `4cb20aa9`, First-Timer's North Star `87675bf8`) were left as artifacts — they are living documents, not point-in-time findings.

**Exception — ported on request (2026-07-16):** Execution Plan & Cost (`6ece90b7`) → [`../architecture/2026-07-11_EXECUTION_PLAN_AND_COST.md`](../architecture/2026-07-11_EXECUTION_PLAN_AND_COST.md). The genAI/genUI build sequence + cost model; the artifact remains the editable original.
