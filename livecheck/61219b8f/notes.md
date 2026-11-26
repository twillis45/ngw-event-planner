# Live check 61219b8f (#304 B4 tell your guests): Thu Nov 26, 2026, 3:55–4:20 PM EST

Live: the hostv4 `ngw-build` meta reads 61219b8fd056 (deployed 3:40 PM EST). #305 (2737f4f6) is merged but was not live during this check.
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted. Share and clipboard stubbed and counted: 0 shares, 0 copies. Copy and "Post it to everyone's invite" were never tapped. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 036302b5 | See diff-from-036302b5.md; the only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore / day-fb01 / here / moments reruns | All ok at 5 sizes; 0 page errors. The moments probe does not yet assert the trip moment's `day` (bug sent; fix is #307). |
| #304 Tell your guests (Thanksgiving with a place, 9:00 AM) | Ok at 5 sizes. The sheet holds Send the details, Parking note and "Post it to everyone's invite". |
| Parking note | The draft is "Guests can park [street / driveway / nearby lot — pick what fits]. Come to [front door / side gate / backyard — pick one]." Copy is disabled with the 2 blanks and enabled once they are filled in the editable box. Not copied. |
| Send the details, signed out | "Sending uses your account, so replies come back to this plan. Sign in once in the current app, then come back here." This is correct: the details wait for the reply link. |
| No place | Parking note is absent; Send the details is present. |
| Escape | The Tell sheet closes on one Escape at every size, including 834 (my 31b2dd20 note), and the plan is unchanged. |

## Note (minor, not a regression)
Escape does not leave counter mode (a full-screen dialog). "Leave counter mode" works. Today's run is a pushed page, so Escape is a no-op there, which is fine. Whether counter mode should take Escape is a product call.
