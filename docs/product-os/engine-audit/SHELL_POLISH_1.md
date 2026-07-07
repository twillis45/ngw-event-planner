# SHELL-POLISH-1 — Micro-Polish: CTA Obstruction & Landing-Yield Cleanup

Date: 2026-07-07 · Slice type: micro (no redesign, no new cards) · Status: SHIPPED

## 1. Executive verdict
Three obstructions between the host and the app's best moments, removed: the demo pill no longer covers primary CTAs (it rests as a 38×38 corner chip, toolbar one tap away); the header cue can never re-tell the hero's words; and the landing-must-differ doctrine was audited across every deep-link class — the Plan path repair generalizes cleanly because the other landings already change the screen (fields focus with the calm settle ring, vendors open a different surface).

## 2. Shell Polish Matrix
| Surface | Issue | Impact | Fix | Test |
|---|---|---|---|---|
| DEMO TOOLS pill (flag-gated) | full floating bar covered the create-flow CTA and Food card at mobile widths | conversion-negative in the exact contexts Todd demos in | collapsed ⚙ chip by default (38×38, safe-area-inset-bottom aware); tap expands the toolbar, ✕ collapses; nothing removed | shellPolish 1–2 + live geometry (zero button overlap at 390) |
| Header cue vs hero | could re-tell the hero's wording when both name the same step | duplicate telling in the brightest strip | cue yields when its normalized label sits inside the hero title; distinct steps (e.g. "Add the location" cue over a caterer hero) still show — verified live | shellPolish 3 |
| Plan focused landing | (repaired previous slice) hero re-told the tapped step | perceptual dead CTA | `{!openTaskId && <PlanNowHero/>}` — pinned | shellPolish 4 / phaseHero 7 |
| Landing audit — Food/Place/Vendor/Budget/Guests/Next Up/recovery/rain/cue | — | — | AUDITED PASS: every route lands on a field anchor with the calm-focus ring or a different surface entirely; no other same-words-above-the-landing case found (Guests/Budget scoped heroes have no focus-card mechanism to duplicate) | covered by existing CTA suites |
| First-card/progress spacing, bottom-nav coverage, overflow | — | — | re-verified this pass at 390 (12px gap intact, no overflow, chip clear of all buttons) | mobileLayout suite |

## 3–9. Behaviors
Demo/admin access preserved (flag-gated, one tap); non-demo hosts never see it. One-telling now enforced at three seams: hero↔Next Up (dedupe + section hide), hero↔focus card (hero yields), cue↔hero (cue yields). Mobile containment re-verified live at 390×844 incl. the chip's non-overlap sweep against every button on screen.

## 10–17. Tests, suites, verification
4 new source-contract tests (`src/__tests__/shellPolish.test.js`). Full frontend **2142/2142 (132 suites)** · backend **97/97** · build clean. Live: chip collapsed → expanded ("DEMO TOOLS · Seed demo event") → collapsed; cue "Add the location →" correctly persists over the distinct caterer hero; demo flag removed after testing. Prod smoke post-deploy.

## 18. Parked
Live geometry assertions in CI (jsdom can't measure; browser checks remain the instrument); RETURN-NARRATION-1 next as a test-framed slice per the v2 audit.

## 19. Recommendation
Accept. Shell work pauses here pending real-host evidence, except RETURN-NARRATION-1.
