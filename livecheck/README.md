# livecheck — read-only checks of the live hostv2 build

Branch `livecheck-2utz0n` only; never merges. Nothing here changes app code.

    node livecheck/run.cjs                       # all five sizes, ~2 min
    node livecheck/run.cjs --only 390x844        # one size
    node livecheck/summary.cjs livecheck/<prev>/results.json livecheck/<cur>/results.json   # diff

Each run lands in `livecheck/<sha>/` (sha read from Settings' "Version … (sha)" line):
`results.json` (every step: pass/fail, console errors, HTTP ≥400, aborted writes, key texts,
floors), `summary.md`, and `shots/<size>/<nn>-<step>.jpg` (full page, dsf 1, JPEG q60).

**Safety.** Every POST/PUT/PATCH/DELETE is aborted at the context; `navigator.share`,
the clipboard and `window.open` are stubbed. No sign-in, send, share, invite, reply or pay.
The seeded event is made up (Rosa's Harvest Dinner, 42 Elm Ct, Springfield, VA 22150);
the guest page uses the built-in sample `?rsvp=test-two-days`.

**Clock.** Fixed so texts compare run to run: board 2026-11-24 12:00, The Day 2026-12-19
15:00, After 2026-12-21 10:00 (America/New_York). The event is 2026-12-19 18:00.

**Floors.** Sideways scroll (document and `.app`), visible text under 11px, and — touch sizes
only — controls under 44×44 probed with `elementFromPoint` from the centre outward (the
method of `hostv2/e2e/everyTapIsFortyFourSquare.spec.mjs`; inline links in a sentence exempt).
Floors are measured in the open sheet when one is open, else the page.

**Journeys** at 390×844, 834×1194, 1024×1366, 1194×834 (touch) and 1440×900:
new host (create → sentence → put together → open, unsaved); board (hero ask, lit buttons,
one `[data-cue]` with its keyframe peak and resting ring alpha, What's counted parts each
opening a section); every menu section (spread: opens Menu; vendors: opens the card;
settings: version line); The Day; After; guest invite (view only); weather geocode GET.
