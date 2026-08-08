# Viewport ruling — hostv2 has no multi-viewport architecture

_2026-08-07. Raised by the host's goal: 9/10 vs leaders on mobile, tablet, desktop AND wide screen,
with the explicit constraint that "tablet, desktop and wide screen can't be just a larger version of
a mobile viewport."_

## The finding

**hostv2 was built as a phone shell and never given the breakpoint system.** This is not a polish
gap; the machinery is absent.

| Probe | `src/App.js` (frozen donor) | `hostv2/src/HostShellV2.jsx` |
|---|---|---|
| `bp === '…'` / `useBreakpoint` / `isWide` | **117** | **0** |
| `window.innerWidth` | present | **0** |
| `sidebar` (JSX + CSS) | present | **0** |
| `matchMedia` width queries | present | **0** — its 4 calls are `prefers-reduced-motion` ×2 and `pointer:coarse` ×1 |
| width-responsive CSS rules | — | **39 of 1299 (3%)** |

Checked exhaustively per *Absence Claims Need Exhaustion*: `matchMedia`, `innerWidth`,
`ResizeObserver`, `clientWidth`, `useMediaQuery`, `breakpoint`, `isTablet/isDesktop/isMobile`,
`orientation`. Only reduced-motion and pointer-coarse came back.

## Rendered evidence (all captured live, board method = render-first)

| Viewport | What actually renders |
|---|---|
| Mobile 390 | Designed. The only viewport with a real layout. |
| **Tablet 768** | Single column, ~230px of dead space above the headline. **No CSS block targets 768–1023 at all.** |
| Desktop 1440 | A two-column hero *does* exist — roughly half the vertical space is dead. |
| Wide 1728 | Stage caps at 1280 with dead gutters both sides; **identical to desktop, adds nothing.** |

Correction worth keeping: I first reported desktop as having no columns. It does. My column-count
heuristic missed it because both columns sit inside one full-width hero element. Render-first caught
what the census got wrong — which is exactly why the board mandates it.

## What the leaders do (Mobbin, web platform)

Six of six converge on one structure — [Motion](https://mobbin.com/screens/92889ff3-9b81-4cc2-a961-1fd2f9beaf32),
[Height](https://mobbin.com/screens/6d955cd7-83eb-4b39-987c-65d3dd4196c9),
[Wrike](https://mobbin.com/screens/380c4dcc-8f10-4c7a-b22f-e1ac63b57e2f),
[Bonsai](https://mobbin.com/screens/00c7365d-5ad5-4766-8c10-3cd8162359d0),
[Asana](https://mobbin.com/screens/c1eba8c1-ef08-47f3-a66f-204a9c885c98),
[Plane](https://mobbin.com/screens/b514ef79-8fda-4cdb-9b42-09eb407cdcce):

1. **Persistent left rail**, ~180–220px — global nav plus the project/section tree. Never a hamburger.
2. **A content-area top bar** carrying the page title and view switchers, not a page-level header.
3. **A dense main area** — real columns for status, owner, date. Tufte's seat, satisfied.
4. **An optional right detail pane** (Height, Bonsai) *instead of* a modal.
5. **No vertical void.** Content begins immediately under the top bar.

Event Boss at desktop is one centred hero with half the screen empty and no persistent navigation.

## The ruling: this is a PORT, not a design invention

`UX_03_MULTI_VIEWPORT_EXCELLENCE.md` already specifies the whole thing, and `App.js` already
implements it — board-ratified, with the reasoning preserved in its own comments:

- `useBreakpoint()` — mobile <640 · tablet 640–1023 · tablet-land 1024–1279 · desktop ≥1280
- `useWideScreen()` — ≥1536, deliberately a refinement *within* `desktop` rather than a new enum
  value. Threshold board-revised 1680→1536 because "1680 stranded the 1440/1536 laptops planners
  actually triage on."
- `measureFor(tier, wide)` — one source of truth for content width by content **type**, collapsed by
  a 2026-06-11 board ruling to two tiers (`standard` 1200/1280, `wide` 1360/1480) so the app stops
  reading as five different widths.
- Its stated purpose, verbatim: *"turn extra real-estate into the WORK laid out in columns, not a
  stretched single column."*

That sentence is the host's complaint, already solved, in the shell we froze — and never carried
across. Consistent with the standing read that Sprint 3–4 is **a narrow port, not a build.**

## Guardrail the board already set

The pros previously killed a 3-pane cockpit and a 9-cell grid as *"the overwhelm we just escaped,
repainted."* So the ceiling is **rail + main + on-demand detail** (master-detail, which UX_03 calls
ideal for desktop) — **not** a permanent third pane. Extra width buys measure control and list
density, never more simultaneous panes.

Mindy Weiss's seat is why this is not optional: "40 events/yr on a laptop + iPad" — the tablet and
the laptop *are* the working devices.

## Sequence

1. Port `useBreakpoint` + `useWideScreen` + `measureFor` into hostv2 (no visual change yet — land the
   primitives and prove them with tests).
2. Tablet 640–1023 — the worst offender and the only viewport with zero rules.
3. Desktop ≥1280 — kill the vertical void; persistent section rail.
4. Wide ≥1536 — columns for the work, raise the 1280 stage cap.
5. Re-render all four and rescore before→after. Never tick a stale number.
