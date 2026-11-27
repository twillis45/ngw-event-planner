# Live check ea22a08c (#315 budget T2, #316 phone header T2): Fri Nov 27, 2026, 5:10–5:30 PM EST

Live: the hostv4 `ngw-build` meta reads ea22a08c5352 (deployed 3:54 PM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Weather GETs answered locally (rain). Rename was opened and cancelled; the name is unchanged. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 7a2347c8 | 0 new failures, 0 floor regressions, 0 new console errors. Changed: the version string, and the 390 After header now reads "Saturday, December 19 · 2 days ago" (#316, expected). The only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| budget-b589 / drinks-7a23 reruns | All ok at 5 sizes, light and dark |
| #315 at 390 | Question 28px/800, figure 52px/800, "Covers your plan" green (rgb 119,193,152), no "Your budget" h3. |
| #316 phone header (390, bp mobile) | Name 28px/700. Date line "Monday, November 30 · 3 days", 15px, sentence case, under the name. Tablet (834, 1024, 1194) and desktop (1440) unchanged: 24px name, caps date line above it ("MON, NOV 30 · 3 DAYS"). |
| Rename long-press (touch: 390, 834, 1024, 1194) | Opens in place: an INPUT in the header, the whole name selected, no sheet. Escape leaves the name unchanged. |
| Sample tag | "Sample Saturday, January 9 · 43 days" (phone) / "SAMPLE SAT, JAN 9 · 43 DAYS" (others). |
| Trip date line | Ahead: "Dec 3–Dec 6 · 6 days" (phone) / caps elsewhere. On day 1 (Plan board): "Dec 3–Dec 6 · Day 1 of 4" / "DEC 3–DEC 6 · DAY 1 OF 4". |
| Weather pill | Shown on the phone and tablets under the date line: "Rain forecast for Monday (your event day), 100% chance — guests may need extra time to get there ›". |

## Findings (phone, not regressions)
1. **On a touch phone "✎ Rename" sits between the name and the date line.** The date line is 58px under the name (0px without touch). The approved T2 render and theHeaderWearsT2 ("the date sits close under the name", ≤ 8px) don't cover touch, where the Rename row renders. Probe: `header-gap-ea22.cjs`.
2. **The weather line is cut mid-word at 390** ("…100% chanc") with no ellipsis (screenshot header/390x844/01-header.jpg).
