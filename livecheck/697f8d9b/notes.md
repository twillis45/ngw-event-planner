# Live check 697f8d9b (#287, #289, #290, #293): Thu Nov 26, 2026, 8:35–9:00 AM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read 697f8d9b4424 (deployed 8:28 AM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (the only one seen was Sentry). Share, clipboard and open stubbed. E2E_TEST_ plans and made-up names. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 9009f21 | 0 new failures, 0 floor regressions, 0 new console errors. The only text change is the version string. The only HTTP error is the expected 404 on public/announcements/test-two-days. |
| hostv4.cjs / guests-e / swipe | 40/40, 30/30, 55/55 |
| batch-278 | All states ok. `sent` now has the button "Add how to reach them" (#289); the script's expectation is updated. |
| The Day probe (9009 script) | #281/#288, #283, #285 and #286 are all still ok at 5 sizes. #284 parity is unchanged: 20 / 27 / 9 overdue (waiting on #294). |
| #287 Create (new `hostv2-create-trip-697.cjs`) | 4 sentences at 390 and 1 at each other size. Each built the right type, date and guest count: Ada's Baby Shower Sat Mar 20, 30; Thanksgiving Dinner Thu Nov 25, 12; Crab Feast Sat Jul 10, 40; Ben's Birthday Mon Jan 4, 25. The reveal reads correctly, "Open my plan (not saved yet)" opens the plan, and there is no sideways scroll. The plan is kept in this browser only until Keep (unchanged). |
| #290 trip day 2 | A Group Trip May 13–15, 2027, with the clock at 9:00 AM on day 2: the live view shows the "Brunch" h2 and "Payment due today: E2E_TEST_ Harbor Boats" at 5 sizes. |
| #289 (new `hostv4-reach-289.cjs`) | Nobody reachable: the button is "Add how to reach them", a tap opens the guest with the cursor in Phone (input type=tel, "Phone"), and the plan is unchanged. One guest with an email: "Nudge the one who hasn't replied". Ok at 5 sizes. |
