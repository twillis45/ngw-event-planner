# HOST-SHELL-BUSINESS-AUDIT-1 — Psychology, Conversion, Retention, Business Impact
## v2 — post-cleanup (supersedes the same-day v1 that recommended PHASE-HERO-1 + ONE-TELLING-1)

Date: 2026-07-07 · AUDIT ONLY — zero code changed · Evidence: fresh 390×844 walkthroughs after PHASE-HERO-1/ONE-TELLING-1 landed (prod main.e0153776.js), plus the day's full brutal-testing record across new/partial/day-before/live/post-event states and 360–430 viewports.

## 1. Executive verdict
The v1 audit's top two commercial defects are FIXED AND VERIFIED: the hero and header now share one phase engine (post-event shows wrap-up, never stale planning), and the next step is told once per screen (the duplicate Next Up row and its empty section are gone). With those closed, the shell now passes trust, mobile, and first-session tests convincingly. **The weakest remaining pillar is RETENTION**: the shell changes by phase but never narrates change — nothing tells a returning host what moved since last visit. Everything else left is polish-sized. Verdict: **strong enough to trial with real hosts now**; run the vendor-brief trial and one small retention slice before judging conversion further from the armchair.

## 2. Host Shell Business Audit Matrix (deltas from v1 in bold)
| Surface | Current behavior | Psych | Conv | Ret | Trust | Cog-load | Mobile | Verdict |
|---|---|---|---|---|---|---|---|---|
| Create flow | one question, promise in a line | High | High | — | Low | Low | Pass | Keep; protect from growth |
| Head-start reveal + Ready-to-send | aha above the fold (verified at 390: head-start + shopping list visible pre-scroll) | High | **High — the paywall moment** | Med | Low | Low | Pass | Keep |
| Phase progress line + cue | "Planning readiness: 2 of 5 · Add the location →" | Med-High | Med | High | Low | Low | Pass | Keep |
| Hero (phase-gated) | **pre: ladder · live: day cue · post: wrap-up · all-wrapped: none** — verified | High | High | **High (post-event no longer dead-ends)** | **Low (was Med)** | Low | Pass | **Fixed — keep** |
| Next Up after dedupe | drops the hero's row; hides when emptied — verified told-once | — | — | — | Low | **Low (was High)** | Pass | **Fixed — keep** |
| Cue vs hero naming two DIFFERENT steps (cue: location · hero: caterer, observed simultaneously) | deliberate hierarchy (nearest-finishable vs highest-leverage) | Med — mild competition | — | — | Low | Med | Pass | **Watch — revisit only if real hosts report confusion** |
| "The step you tapped" focus card | can mirror the hero's exact task when its openTaskId IS the hero task (observed via stale session state) | Low | — | — | Low | **Med — residual duplicate telling** | Pass | **Execute (micro): yield when identical to the hero** |
| Day-before card / weather phase copy / budget recovery / crab plan | unchanged, phase-relevant | High | High | High | Low | Med near event (defensible) | Pass | Keep |
| Scroll burden | Command 1.6 screens · event home 1.2 · portfolio 1.9 (390×844) | — | — | — | — | **Low (measured, was suspected-High)** | Pass | No action |
| DEMO TOOLS floating pill | still overlaps content incl. the create-flow CTA | — | Negative in demos | — | — | — | Fail (demo mode) | **Execute (micro): dock it** |
| Stored old-copy tasks in existing events | "lock the final headcount" still visible in saved events' heroes/rows | Low | — | — | Med | — | — | **Test: one-time template-string migration** |
| Return-session narration | absent — phase machinery changes silently | — | Med | **High gap — now the #1 weakness** | Low | Low (one line) | — | **Test: RETURN-NARRATION-1 (one line, no feed)** |

## 3. First 5-second clarity — PASS
390×844, partial event: identity → "Planning readiness: 2 of 5 essentials handled · Add the location →" → hero with one CTA, all above the fold. New host path (create → head-start) unchanged and strong.

## 4–5. Psychology & cognitive load
The repetition complaint from v1 is materially resolved; measured scroll burden is modest everywhere. Remaining load items are edge-class: the tapped-step card mirroring the hero, and the cue/hero occasionally naming two different next steps (an intentional hierarchy that reads fine to us — real-host check needed before touching it). Red remains budgeted; optional reads optional.

## 6. Conversion
Aha intact and early. The bridge from aha to payment remains deliberately unbuilt (D-2 gates). Nothing in the shell now undermines the pitch — the demo path is clean end-to-end except the floating demo pill, which in demo contexts covers the primary CTA (observed over "Choose the occasion").

## 7. Retention — the weakest pillar
Machinery: phase heroes, phase progress, day-before, weather — all real and now truthful through post-event. Missing: narration of change ("2 yeses came in · forecast now clear · Wrap-up: 1 thing left"). Decision memory still vendor-detail-only. This is the one place a small addition (one line, diffed from existing sources + a lastOpenedAt stamp) plausibly moves a business metric; everything else additive should stay parked.

## 8–9. Business impact & trust
Willingness-to-pay ranking unchanged: day-before compression · DIFM drafts · budget recovery · weather phase intelligence · domain depth (crabs). Trust: no fake states found in this pass; the two v1 trust dents (stale hero, triple telling) verified gone; remaining dent = stored old-copy tasks for existing events.

## 10. Mobile-first — PASS
No overflow at 360/390/393/430; first card clears header+cue line (12px); bottom nav safe-area'd; app-shell fullscreen by layout (no API hacks); editorial fits.

## 11–12. Pricing power & template risk
The $59–79 story is now coherent through the whole lifecycle — pre (head-start + drafts), week-of (day-before + weather), during (day flow), after (wrap-up). Template-app risk LOW; the shell reads as a phase-aware partner. The gap between "coherent" and "convincing" is now evidence, not features: it needs real hosts (vendor-brief trial packet is ready and still waiting on links).

## 13–14. First-session win / return reason
Win: real, verified, above the fold. Return reason: structurally present, still un-narrated (see §7).

## 15. Parked-item reassessment (no auto-promotion)
- Settle-panel default collapse → **PARK**: observed collapsed-by-default in current states; no evidence of harm.
- Stored-task copy migration → **TEST**: one-time mapping of known template strings; touches user data, so behind care + backup, not a casual slice.
- "Since last visit" line → **TEST (promoted to top candidate)**: one line on the event home, diffed from real sources; hard cap one line, no feed, no notifications.
- Demo-pill docking → **EXECUTE (micro)**: it covers CTAs in the exact contexts Todd demos in.

## 16–19. Verdicts
**Execute (one micro-slice, SHELL-POLISH-1):** dock the demo pill · tapped-step card yields when identical to the hero. **Test:** RETURN-NARRATION-1 · stored-task migration. **Park:** settle-collapse, portfolio metrics, any new shell cards. **Kill:** nothing — and keep killing additions by default; the shell's remaining risk is re-crowding what today's work uncluttered.

## 20. Highest-leverage next slice
**SHELL-POLISH-1 (micro) + RETURN-NARRATION-1 (test-framed)** — then STOP shell work and get real-host evidence: send the vendor-brief trial links; the next audit should cite host behavior, not reviewer judgment.

## 21–22. Evidence
Fresh this pass (390×844): Command fold text incl. cue+hero+focus-card duplicate; event home 1.2 screens; portfolio 1.9 screens with head-start above fold; plus the day's screenshot record (create flow, post-event wrap-up hero verified live, dedupe verified told-once). No invented metrics; every claim traces to an observed screen.

## 23. Risks
Single-reviewer audit; the retention judgment especially is a hypothesis until hosts return (or don't). The cue/hero two-steps tension might be a strength (breadth) — don't fix it on theory.

## 24. Recommendation
Accept. Ship SHELL-POLISH-1, build RETURN-NARRATION-1 behind its one-line cap, then pause shell work for real-host evidence.
