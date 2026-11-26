# Live check fb017d49 (#296, #297, #298, #299, #300, #302): Thu Nov 26, 2026, 1:35–2:05 PM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read fb017d496e35 (deployed 1:12 PM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted. Weather GETs answered locally (rain). Share, clipboard and open stubbed; share was never called. The probe never taps Send, Email, Text, Copy or "Tell your guests". E2E_TEST_ plans and made-up names only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs f79567de | Only the version string changed. The only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore-f795 reruns | All ok at 5 sizes; 0 page errors |
| **#300** shopping tick = Still to get | Fixed. "Still to get 28 items", then the "Do the shopping" tick: "28 items marked bought" (was 40 on f79567de); foodGot 28; afterwards "Still to get · 4 rentals". Same at 5 sizes. |
| **#297** indoor: no rain row | Thanksgiving at home (unanswered) the evening before: Before tomorrow is shopping and vendors, with no rain row (f79567de had "Rain backup Not set"). A Crab Feast at home, unanswered, still has the rain row. |
| **#299** alerts | At 1:05 PM the line "Watch · 1 hasn't replied" sits above Now. A tap opens "Needs you today": "1 hasn't replied — Headcount may shift — text them, or plan for 2 to be safe", with Guests. Done closes it. |
| **#299** outdoor weather | A Crab Feast at a park with rain shows the impact line "Rain risk is on Thursday (your event day), but hourly timing isn't available yet — confirm the rain plan…" and "Set your rain plan". |
| **#296** day crew | The Day row "Your day crew · 1 of 2 sent" opens two rows: "Ada Pine · Drinks and ice · Send" and "Ben Oak · Coats and parking · Link sent · Resend". Everyone's part today is there, and Print links to ../hostv2/. Nothing tapped, no request made. |
| **#298** running late | Options 15 / 30 / 45 min. The preview shows 2:30 PM Turkey out to rest … "Arrivals stay at 3:00 PM. Guests already have the time." Nothing saves before "Move the rest". After it, rosEdited is set, arrivals stay at 15:00, the step under way stays, and the "Tell your guests in Updates" row appears (not tapped). Running late is also in counter mode. |
| Floors | No sideways scroll on any probed screen; 0 page errors. |
