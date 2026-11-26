# Live check f60ebbb0 (#305 vendors on the day, #306 day reminders, #307 trip moment day): Thu Nov 26, 2026, 5:50–6:10 PM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read f60ebbb08ccc (deployed 5:19 PM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Share, clipboard and open stubbed. "Call" (tel:) and "Send the details" were read, never tapped. The .ics files were saved into vr/<vp>/ and never opened or imported. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 61219b8f | See diff-from-61219b8f.md; the only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore / day-fb01 / here / tell reruns | All ok at 5 sizes; 0 page errors |
| **#307** trip moment day | Fixed. `moments-0363.cjs` now asserts `day === 2`, and passes at 5 sizes (it failed on 036302b5). |
| **#305** hostv4 vendors (Thanksgiving, 1:30 PM EST; caterer due 1:00 PM with a phone, rentals due 2:30 PM) | Ok at 5 sizes. "Vendors today" lists Bay Catering 1:00 PM · Call (tel:2025550199) and Rentals 2:30 PM. The alert reads "Can't wait · Bay Catering hasn't arrived". After "They're here" the caterer has arrivalStatus arrived, its row is ticked ("Here"), the Call link is gone and the alert clears. "Running late" on Rentals sets delayed ("Running late"). "Send the details" links to ../hostv2/. |
| **#305** hostv2 "They're here" | The alert card "Bay Catering hasn't arrived … They're here" sets arrivalStatus arrived. |
| **#306** reminders | "Reminders in your calendar" opens a sheet; the first rows are in time order. "Add 16 reminders" downloads E2E-TEST-Thanksgiving-reminders.ics with 16 VEVENTs: every run step, "Bay Catering due", "Rentals due" and "Arrivals" (3:00 PM), in time order. The default alarm is TRIGGER:-PT10M; "At the time" gives TRIGGER:PT0M. |

## Observation (not a bug, worth knowing)
The .ics uses floating local times (`DTSTART:20261126T090000`, no TZID or Z), so the reminders follow the phone's current time zone. That is right for a host at home. A host who sets reminders and then flies to another time zone would get them at the same clock time there. Reminders also include steps already past (the 1:00 PM caterer at 1:30 PM); the calendar shows them in the past.
