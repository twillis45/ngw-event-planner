# Live check f3b65ccb (#320 G2b .gk scope, #321 G2c-1 hostv2 ?guests=kit): Sat Nov 28, 2026, ~4:20–5:15 AM EST

Live: the hostv4 `ngw-build` meta reads f3b65ccb (deployed 2:09 AM EST); the hostv2 bundle carries the same sha.
Chromium at 5 sizes (390 in dark and light: see the theme correction below). Every POST/PUT/PATCH/DELETE aborted (only Sentry). E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 44ae2726 | 0 new failures, 0 floor regressions, 0 new console errors. Only the version string changed (2026.11.28.2). |
| hostv4 / guests-e / swipe / reach-289 | 40/40, 30/30, 55/55, 5/5, after switching `.app`→`.gk-app, .app`, `.q`→`.gk-q, .q`, `.row.go`→`.row.gk-go, .row.go`. The `q` values read identically to 44ae2726. |
| hostv4-batch-278 | 33/36; the same 3 "center" geometry misses as 44ae2726/ea22a08c, identical numbers. |
| guests-kit-44ae (hostv4) | 15/15: no "about —"; three panes at 1024/1194/1440. |
| hostv2 ?guests=kit (`v2kit-f3b6.cjs`), 390 dark+light, 834, 1024, 1194, 1440 | All steps ok, 0 page errors, 0 sideways. |

### hostv2 ?guests=kit detail
- Layout: phone one pane; 834 one pane (no rail at that size); 1024 / 1194 / 1440 three panes. The kit's left edge equals `.srail`'s right edge (1194: rail 1–201, listpane 201–601, gk-gdetail 601–1194).
- Saved-answer line: after answering, "Planning around 2 now. Undo" shows on screen at every size. In hostv2 it is the toast (bottom; bottom-right at 1440), not hostv4's inline line under the header.
- Path: Your answers line reads "about 2 · by name · no +1s · adults only · replies by Dec 9". Guests → Review your invite (view `invite`) → Design this page (view `invite-design`).
- Back, in-page: "‹ Your invite" → invite, "‹ Guests" → guests.
- Back, browser/phone: from Design this page, one Back → invite, the next → guests.
- Row swipe (touch): left swipe on Bo Reed reveals "Mark Bo Reed can’t make it"; tapping it saves rsvp No. Passes at 390, 834, 1024, 1194 once the toast has cleared.
- Without the flag: no `.gk`; the old sheet (#sheet-title) opens.

## Observation (product call, not a regression)
For ~6 s after the last question ("Reply-by date set — your invite and the nudges read it. Undo"), hostv2's toast covers the guest rows:
- 390: it sits over the "No reply yet" group, just above the "Review your invite" button.
- 1194: it straddles the list/detail boundary (about 397–797px) over the Bo Reed row.
A swipe or tap there in that window hits the toast, or opens the guest behind it. hostv4 shows the same answer inline, so it doesn't overlap. (The probe now waits for the toast to clear, so the passing run's screenshots no longer show the overlap; v2kit/1194x834-dark/07-swipe-back.jpg, from an earlier pass, shows the same toast covering the "Your message" box on Design this page.)

## Correction: hostv2's light theme (affects 44ae2726 and the first f3b65ccb runs)
hostv2 reads its theme from `localStorage['ngw-theme']`, not from the system setting (`prefers-color-scheme`). Without the key it is always dark (`data-theme="dark"`).
So the "light" runs of `header-44ae.cjs` (44ae2726) and the first `v2kit-f3b6.cjs` runs here actually rendered dark.
The probes now set `ngw-theme`, and the reruns are genuinely light:
- `v2kit` 390 light: all 8 steps ok.
- `header-318` 390 touch light: gap 0, Rename after the date line, pill ellipsis inside the screen.
- `signedout` 390 light: all 5 steps ok.

## Signed-out Guests pass (parent's steps 1–5, ⋯ More, QR): `signedout-kit-f3b6.cjs`
Setup: no account, ?elegant=1&guests=kit. A seeded E2E_TEST_ Thanksgiving plan with 3 guests at example.com (two with made-up 555 phones) and a made-up street address. Sizes: 390 dark, 390 light, 1194 dark.
Results were identical at all three.

| Step | Result | What the screen says signed out |
|---|---|---|
| 1 Questions → path | ok | Questions asked in order: About how many → Can guests bring someone → Are kids welcome → When should replies be in by. Path: "✓ Your answers about 3 · by name · no +1s · adults only · replies by Dec 9", "✓ Names 3 named", "Your invite Not sent yet", "Updates and questions". No "Replies" / "The count" rows yet. |
| 2 Your invite | ok | Message in 5 voices: As written, Tighter, Warmer, Playful, Formal. "[your reply link goes here] · The reply link goes in when it’s sent." Preview frame loads `../hostv2/?invite-preview=<id>` (356×418 at 390, 678×418 at 1194). There is no "isn't ready" note on this page. Without an address it lists "Before it can go out … The street address Missing" and sends you to the current app. |
| 3 Send the invite | ok (nothing to block) | The sheet reads "Sending uses your account, so replies come back to this plan. Sign in once in the current app, then come back here." Buttons: "Sign in in the current app" and "Done". There is no send button and no email/text list signed out. Nothing was tapped beyond opening the sheet. |
| 4 ⋯ More → Share the link | ok | Menu: Share the link · Download the list · Tell me when someone replies ("By email and notifications, at most once an hour") · "Importing a list and the QR code are in the current app for now." Share the link shows "Your reply link isn’t ready. Your plan isn’t saved to your account yet. Open it once in the current app, signed in, and it saves." Nothing was shared or copied (stubs recorded 0). |
| QR | n/a in the kit | There is no QR control in the kit; the menu points to the current app. |
| 5 Updates and questions | ok | "Updates and guests’ questions need this plan saved to your account. Sign in from the current app first." There is no post box signed out, so there is nothing to send. |

Requests:
- Blocked: only `POST o4511174955565056.ingest.us.sentry.io/api/…/envelope/` (Sentry). No `/communication/` or `/invite` request was ever made.
- sms:/mailto:/tel: clicks: 0. share/clipboard/window.open calls: 0.
- Reads: GET `ngw-events-api.onrender.com` `/api/food-prices`, `/api/capabilities`, `/api/shopping/instacart/status`, plus the preview iframe `hostv2/`.
- HTTP ≥ 400: none. Page errors: 0. Sideways scroll: 0.

The same reply-by toast also covers part of the send sheet's text at 390 for its ~6 s (screenshot `signedout/390x844-light/03-3-send-invite.jpg`).
Not covered (needs an account): the email-vs-text list, the real send, the reply link, the notify toggle saving, and a guest reply.
