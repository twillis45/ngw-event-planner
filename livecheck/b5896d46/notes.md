# Live check b5896d46 (#308 budgetChoices, #309 hostv2 budget question, #310 dark steel ask): Fri Nov 27, 2026, 1:15–1:32 AM AM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read b5896d46af22 (deployed 8:26 PM EST, Nov 26).
Chromium at 5 sizes, light and dark. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Share, clipboard and open stubbed. "Plan with" and "Use it" were never tapped (totalBudget stays unset). E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs f60ebbb0 | Only the version string changed. The only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / day-fb01 / vendors-remind reruns | All ok at 5 sizes; 0 page errors |
| #309 budget question (Thanksgiving for 12, 10 days out), light and dark | Ok at 5 sizes. "How much do you want to spend?" with $400 (= "Plan with $400"). Rows: Lean $100 $8 a head · Mid‑range $300 $25 a head · All-out (Covers your plan, picked) $400 $33 a head · A different amount. Every row is ≥ 46px tall. Picking Lean makes the headline and button $100. "How we got these · 5 things not included" opens to "Your plan's lines come to about $334. The mid-range for 12 at a Thanksgiving is $300. Not included: …". No sideways scroll, including 1194×834 landscape. |
| "A different amount" → Change drawer | Opens inline on the board (not a sheet): "Change your budget · Pick a size, or type your own." Lean $100 / Mid‑range · our pick $300 / All-out $400 (48px rows), "Your own number" (44px tall) and "Use it" (54px), in view at every size. |
| #310 dark steel ask (a past birthday, "Save what worked", theme=dark) | The background equals var(--cta-grad), the label is var(--on-steel), and the edge is a 1px ring (box-shadow color(srgb 0.694 0.761 0.796 / 0.55) 0 0 0 1px). Label contrast per gradient stop is 4.57 / 5.16 / 5.85. |

## Findings (product consistency, not regressions)
1. **Two different picks.** The question pre-selects All-out ("Covers your plan", $400), but the Change drawer behind "A different amount" labels **Mid‑range "our pick"**. Same plan, same moment, different recommendation.
2. **The drawer drops the per-head.** The question shows each tier's per-head (owner: "Per head for each"). The drawer's tiers show only the totals.
3. **Dark label contrast is tight at the top stop:** 4.57:1 against the lightest gradient stop (AA is 4.5).
