# Live check 99402647 (#301 B6 who's here and at the table): Thu Nov 26, 2026, 2:25–2:46 PM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read 994026472feb (deployed 2:19 PM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted. Share, clipboard and open stubbed. "Text" (sms:) links were read, never tapped. E2E_TEST_ plans and made-up names only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs fb017d49 | See diff-from-fb017d49.md: 0 new failures, 0 floor regressions, 0 new console errors. The only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore-f795 / day-fb01 reruns | All ok at 5 sizes; 0 page errors |
| #301 who's here (Thanksgiving list plan, 3:20 PM EST) | Ok at 5 sizes. "Who's here · 0 of 3" with rows Ada, Ben, Cy (yes only; the "no" guest is not listed). One "Text" link, sms:2025550101, for the guest with a phone. The maybe (Dee Ash) is named below. |
| Tap in | Ada's checkedIn = 2026-11-26T20:20Z (3:20 PM EST); the heading reads "1 of 3" and "1 here · Show" appears. Tapping again clears checkedIn; her phone and the other guests are unchanged. |
| At the table | "Vegetarian · Ada Pine, Cy Fern" and "Tree nuts · Ben Oak". The "no" guest's gluten-free is not at the table. |
| Gates | Not shown at 2:00 PM (before the 3 PM start), and not shown for a headcount plan. |
| Floors | No sideways scroll; 0 page errors. |

## Watch item (from the parent)
The WebKit flake on rsvpCapability "verified event … guest QR" was a CI issue. This live check runs Chromium and does not exercise the guest QR, so I have nothing to add.
