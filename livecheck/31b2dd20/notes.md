# Live check 31b2dd20 (#291, #294): Thu Nov 26, 2026, 9:45–10:00 AM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read 31b2dd20fe8d (deployed 9:32 AM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). GET /api/weather/geocode and /onecall were answered locally with moderate rain, 48–54°F, 100%. Share, clipboard and open stubbed; share was never called. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 697f8d9b | 0 new failures, 0 floor regressions, 0 new console errors. Changed: the version string, and The Day text (the expected #291 changes). The only HTTP error is the expected 404 on public/announcements/test-two-days. |
| hostv4 / guests-e / swipe / batch / reach-289 | 40/40, 30/30, 55/55, all states ok, 5/5 |
| #294 one count (Thanksgiving today, 6 days old, seeded steps, 10:00 AM) | ok at 5 sizes. Every count on The Day and Plan reads **20**: "20 steps past their window" (alert, twice), "20 past their window" (run-through) and "Needs you — 20 past their window" (checklist). "34 plan steps left" (≥ 20). None of the old wording ("things still open", "plan steps still open", "N overdue") remains. |
| #291 hostv2 weather (10:40 AM) | ok at 5 sizes. `[data-day-weather="rain"]` reads "Moderate rain · 48°–54°F · 100% chance of rain or snow", with the wx-coats check. "Weather note to guests" opens the existing draft ("…bring an umbrella"). Share not called. |
| #291 hostv4 The Day (10:40 AM) | ok at 5 sizes. Phase `morning`, "Now · since 10:30 AM Baste and rotate the bird…", the same rain card, and the weather note sheet ("…bring an umbrella") closes with Done. |
| Today's run | 14 steps (past / now / later), plus "Change the run in the current app". |
| Counter mode | Opens with 34px type and the clock and Now step; "Leave counter mode" closes it. Plan unchanged, no sideways scroll. |
| hostv4 phases (390) | 7:30 AM `morning` ("Up first · 9:00 AM"), 4:00 PM `under-way` ("If something goes wrong" first, Now Dinner, Next 4:45), 8:10 PM `under-way` (last step at 8:30). |
| Floors | No sideways scroll and no target under 44 on any probed screen. 0 page errors. |

## Probe notes (not app issues)
- The hostv4 weather-note sheet does not close on Escape at 834; its Done button does. Touch devices have no Escape key.
- At 834 the closed places drawer still has an off-screen "The Day" button. It is inert (#275), but Playwright resolves it, so the probe uses the page's own back link.
