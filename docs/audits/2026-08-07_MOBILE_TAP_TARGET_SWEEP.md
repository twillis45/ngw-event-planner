# Mobile tap-target sweep — 2026-08-07

**Method.** Chromium, isolated context, isolated storage state, 393x852 @3x,
`isMobile` + `hasTouch`. Served a PRIVATE copy of `hostv2/dist` on :5299 — the
user's browser was never driven and the other session's preview on :5233 was
never touched. Entered the app through "Explore a sample first" with a real
pointer click, then navigated by the eyebrow.

**Status: BOTH FIXED and gated later the same day**, once the second session
released `styles.css` and `HostShellV2.jsx`. Verified live on a 393x852 phone:
`.navseg-b` 37 -> 44px, `.sheet-back` keeps its 16px box with a 44px hit area,
and the fold peek is intact (eyebrow bottom 48 in an 852 viewport). Gated by
`hostv2/e2e/mobileTapFloor.spec.mjs`, which sweeps EVERY control rather than a
named class list — mutation-checked, both reverts fail it.

A third offender surfaced from that sweep and is **open**: see "The pill" below.

---

## What the sweep had to correct about itself first

Two false readings were produced before any finding was trusted, both worth
recording because the next sweep will hit them too:

1. **The front door is not the app.** The first run reported a spotless mobile
   experience. It had measured the welcome screen: 34 elements, 2 buttons. A
   premise check (element count, button count, visible text length) is now part
   of the harness, and any run reporting zero offenders against a trivial DOM
   should be discarded.

2. **`cursor: pointer` inherits.** The first real run flagged 8 controls; 6 were
   spans inside a button. The sweep now counts only the OUTERMOST control
   (`el.parentElement.closest('button,a,[role=button]')` must be null) and
   unions the element box with its absolutely-positioned `::before` / `::after`,
   because several controls here meet the 44px floor via a pseudo-element
   hit-area expander rather than their own box. Without that union the
   `.ev-eyebrow` (32px box, 44px `::after`) reads as a false positive.

**The dock is retired.** `.dock.dock-retired { display:none }` — its buttons
measure 0x0, which is why an initial attempt to navigate by dock timed out four
times. Mobile navigation is the eyebrow. Any future mobile harness should drive
`.ev-eyebrow`, not `.dock button`.

---

## Findings

Clean across every surface reached: **horizontal overflow 0px**, and **zero
sub-44px controls on the home surface** — the tap-target work earlier in this
sprint holds where it was applied.

### 1. The back control is 16px tall, on every sheet — `HostShellV2.jsx:9658`

| | |
|---|---|
| Measured | **67 x 16 px** (w x h) |
| Floor | 44px (UX_03 lines 31, 55) |
| Surfaces | Every sheet — `sections`, and each sheet opened from it |
| Label | `‹ Sections` |

This is the highest-severity item in the sweep: it is how a host leaves any
sheet, it appears everywhere, and at 16px it is under half the floor. It carries
no class (a bare `<button>`), so it cannot be fixed from the stylesheet alone —
either give it a class and a `::after` hit-area expander (the pattern already
used by `.ev-eyebrow`, which costs zero layout), or set padding on it directly.

### 2. The phase segments are 37px — `styles.css:326` (`.navseg-b`)

| | |
|---|---|
| Measured | **85 x 37 px** |
| Floor | 44px |
| Surface | `sections` (the mobile nav sheet) |
| Labels | `Create`, `Plan` (`.navseg-b`, `.navseg-b.on`) |

Currently `padding: 11px 0` with `font-size: 12.5px`. `min-height: 44px` on
`.navseg-b` closes it; the segment is inside `.navseg` (`padding:4px`), so the
control grows to 44 and the pill to 52 — check the sheet header still fits above
the fold afterwards. Note the trap from 2026-08-06: adding `min-height` to
`.ev-eyebrow` pushed the fold peek off-screen (440.6px in a 430px viewport),
which is why that one got a `::after` expander instead. If the same happens
here, use the expander.

### 3. `.eb-caret` renders at 9px — `styles.css:537`

UX_01 line 49: "Never use font-size below 10px." Present on every surface. It is
the `▾` disclosure glyph rather than reading text, so severity is low, but it is
a literal violation of a stated rule and costs one character to fix.

Also below the floor but **dead**: `.tp-names` at 9px and `.floor-door` at 8px.
`.tp-names` has no reference anywhere in `hostv2/src` or `src` — do not "fix"
it; delete it or leave it. `.floor-door` is live in `HostShellV2.jsx`.

### Not a defect, checked and cleared

`.dock::after` declares `width: 440px` on a 393px viewport, which a naive
stylesheet scan flags as an overflow risk. It also carries `max-width: 96vw`, so
it never overflows. Measured scrollWidth - clientWidth = 0 on every surface.

---

## FOUND, NOT FIXED — the status pill, and why an expander is wrong for it

`.pill` chips (`p-warn`, `p-steel`, `p-risk`) are real routing buttons and
measure **267 x 28**. The `::after` expander that fixed `.sheet-back` is the
wrong tool here, and the reason is measured rather than assumed: consecutive
pills in a stacked list sit **7px apart**, so a 44px hit area on each would
overlap its neighbour by 8px and let one row steal the next row's taps.

Closing it means raising the pill's real height and the list rhythm together
(28+7 -> roughly 36+8), which changes a core Studio Matte atom used across many
surfaces. That is a design ruling, not a test fix, so it is named in
`mobileTapFloor.spec.mjs`'s `KNOWN_OPEN` with this reason — and that spec
carries a premise test which FAILS the day the pill is fixed, so the exception
cannot outlive the defect.

## Reproducing

The harness is not committed — it drives a private static copy of `dist` and
depends on a free port, so it is a scratch instrument rather than a spec. To
rebuild it: serve `dist` under `<root>/ngw-event-planner/hostv2/`, launch
Chromium at 393x852 with `isMobile`/`hasTouch` and empty `storageState`, click
"Explore a sample first", then for each surface collect every element whose
computed `cursor` is pointer or whose tag is BUTTON/A, excluding any with a
control ancestor, unioning in absolutely-positioned pseudo-element boxes.

**Why not a spec.** `e2e/tapTargets.spec.mjs` already exists and passes — it
enumerates a named list of classes, and neither offender above is on that list.
That is the gap. A sweep-everything spec is the right instrument, but it would
fail on findings 1 and 2 the day it lands, so it belongs in the same change as
their fix, not before it.
