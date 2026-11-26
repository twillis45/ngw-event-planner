# Live check c6e6c5a (#276 #277 #278 #279 #280)

Live at 1:35 AM EST, Nov 26, 2026. Read-only: 0 writes attempted by the app (the only aborted POST is our own Sentry guard in hostv2), 0 page errors.

| Fix | Result |
|---|---|
| #276/#277 signed-out 401s | **Pass.** hostv4 Updates at 5 sizes: 0 requests to announcements / guest-threads / invite-opens / guest-photos / communication/sent / stripe/pass, one line "Updates and guests’ questions need this plan saved to your account. Sign in from the current app first." + Open the current app. hostv2 run: **0 401s** (was 25 distinct at 2981924); only the expected 404 public/announcements/test-two-days remains. Live build has accounts on (the skip is real, not a no-Supabase build). |
| #278 path, start to finish | **Pass.** 5 sizes × 5 states. Question screen: only the question, no path. No names → lit Names / "Add names". Named → lit Your invite / "Review your invite". Sent → lit Replies "7 of 10" / "Nudge the 3 who haven’t replied" (when the 3 have an email; with no contact details nobody can be nudged, so Replies is lit with no button). After reply-by → lit The count / "Lock the count". ⋯ holds only Share, Download, alerts. 390 with 10 names: 0.95 screens, 11 controls (#272 was 0.8 / 7; #266 was 2.3 / 25). Floors clean. |
| #279 centering B | **Pass.** 834x1194: column 77–757, margins 77/77; 844x390: 82–762, 82/82. Menu/back on the left edge, the pane's button on the right edge. (1024 wide is the three-pane layout, not compact.) |
| #280 contact (hostv4) | **Pass** at 390, 1024, 1440: "2025550134" → "(202) 555-0134" as typed and saved; "202555" → "Needs 10 digits." + aria-invalid; "bad@" → "Needs a full email, like name@example.com." + aria-invalid; "  ada.pine@example.com  " saved trimmed. **hostv2 side not checked this run.** |
| Regressions | hostv2 diff vs 2981924: no change but the version. hostv4 budget 40/40. Guests groups 30/30 (More expectations updated for #278), guest-threads 0. Swipe 55/55 (script now centres a row before dragging; the path pushes rows under the bottom button at 390). |

Minor: at 390 the guest sheet's "Done" link measures 40x44 (below 44 wide). Not checked in earlier runs, so not known to be new.
