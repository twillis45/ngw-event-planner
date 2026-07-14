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

## Authored in-repo

| Date | Doc | Headline |
|---|---|---|
| 2026-07-14 | [Claim Source-of-Truth Sweep](2026-07-14_CLAIM_SOURCE_OF_TRUTH_SWEEP.md) | The vendor over-claim was one instance of a **systemic class**. 4 critical findings, 2 worse than the original |

Older engine audits live in [`../product-os/engine-audit/`](../product-os/engine-audit/); sprint/architecture audits in [`../`](../).

## Artifacts deliberately NOT ported

Visual prototypes, where markdown would destroy the point: Splash Prototypes (`82ad7302`), Wordmark Options (`86abfe99`, `6aa220ee`), "hello" stroke-draw mockup (`c81d0111`), DIFM Magic motion demos (`adde9658`), Host Shell Concept (`bc64ccb0`). Specs and plans (Graduation Spec `81350b10`, Execution Plan & Cost `6ece90b7`, The Working Doc `4cb20aa9`, First-Timer's North Star `87675bf8`) were left as artifacts — they are living documents, not point-in-time findings.
