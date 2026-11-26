# Live check 2981924 (#272 Guests option E, #273 44px links, #274 swipe)

Checked: Nov 25, 2026, ~10:30 PM EST. All read-only: writes aborted (0 attempted), share, clipboard and open stubbed.

| Check | Result |
|---|---|
| hostv2 (diff vs b4b4d04) | no change: only the version string differs |
| hostv4 budget (8 steps × 5 sizes) | 40/40 ok; small targets 52 → 0 (#273 fixed Undo, How we got these, Open the current app) |
| hostv4 reply-by (#269) | 6/6 ok. My script opened Your answers from the page; it now opens "More" first (#272 moved the row there) |
| hostv4 Guests option E (#272) | 30/30 ok; 0 guest-threads requests when signed out; open group and closed state both survive a reload; the plan record is never written |
| hostv4 swipe (#274), new | 55/55 ok: partial reveal right and left, buttons 84×52, Maybe, Coming, Can’t make it, No reply each save and move the guest, Remove is tap-only with a working Undo, full right = Coming, full left = Can’t make it (never Remove), a vertical drag reveals nothing, one row open at a time, a tap closes an open row without opening the guest |

livecheck/hostv4-guests.cjs (pre-option-E) is retired; hostv4-guests-e.cjs replaces it.
