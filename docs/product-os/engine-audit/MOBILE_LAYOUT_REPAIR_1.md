# MOBILE-LAYOUT-REPAIR-1 — First-Card/Progress Collision & Viewport Containment

Date: 2026-07-07 · Slice type: layout containment repair · Status: SHIPPED

## 1. Executive verdict
The reported first-card/progress collision was real and universal: `ReadinessTrack` — the 4px unified header progress bar on EVERY host tab — reserved zero space below itself, and the first card on Command (Still-to-decide strip) starts flush against it. Live-measured gap at 390×844: **0px**. One source fix (the track reserves 12px of its own margin) repairs all five host tabs at once. Everything else audited came back clean — no horizontal overflow, no hidden CTAs, no editorial overflow on any target viewport.

## 2. Mobile Layout Defect Matrix
| Surface | Viewport | Defect | Root cause | Fix |
|---|---|---|---|---|
| Every host tab (Command/Plan/Guests/Budget/The Day) | 390×844 (repro), all | first-card/progress collision — gap 0px | ReadinessTrack had no marginBottom; first cards (e.g. BlockedDecisionsReminder `margin: 0 auto 16px`) have no top margin | `marginBottom: 12` on the track root — a progress strip reserves layout space (App.js ReadinessTrack) |
| HostHome / all tabs | 360/390/393/430/768 | horizontal overflow | — | none found (0px at every viewport, incl. Event Details form) |
| Bottom of tab content | 360×740 | content behind bottom nav? | — | none: lowest content clears the fixed nav by 39px |
| Editorial/context cards (ContextNudgeCard, editorial notes) | 360–430 | viewport fit | — | fit verified: fluid width (maxWidth 760), no fixed heights, long copy behind "Why this matters" expand by design |
| Fixed DEMO TOOLS pill | any (opt-in flag only) | overlays content near bottom | deliberate dev/demo overlay (`ngw-demo-tools` localStorage flag, off by default) | PARKED — opt-in tooling, never visible to hosts |

## 3–7. Root cause & fix
One line, at the source: the track (App.js `ReadinessTrack`) was flush (`height: 4`, no margin) and every tab's first card trusted it to keep distance. Fixed per the spec's progress-bar rule — strips reserve their own space. In-flow (`position: relative`), so no sticky-offset or z-index work needed. During the fix a broken intermediate edit (JSX comment before the return root) briefly blanked the dev preview — caught and corrected within the session; final build compiles clean.

## 8–13. Verification
Live geometry after fix — gap between track and first card: **12px on Command, Plan, Guests, Budget, The Day**; horizontal overflow **0px** at 360×740, 390×844, 393×852, 430×932; tablet 768×1024 sane (gap 12, no overflow); bottom-nav clearance 39px; Event Details form contained at 360; screenshots taken at 390 pre/post-fix (collision visible → 12px breathing room). Desktop unregressed (margin applies harmlessly; full suite green). CTAs: no wrap/clipping observed; "Do this first", tab bar, and per-card CTAs all inside viewport.

## 14–19. Tests & suites
3 source-contract tests (`src/__tests__/mobileLayout.test.js`): track reserves margin, track stays in flow, editorial card fluid/no-fixed-height. (jsdom cannot measure layout — geometry evidence is the browser audit above.) Full frontend **2093/2093 (127 suites)** · backend **97/97** · build clean.

## 20. Parked
DEMO TOOLS overlay (opt-in dev tooling); persisted-event cosmetic copy (unrelated); no other defects found to fix.

## 21. Recommendation
Accept. If the collision Todd saw on his device differs from this repro (e.g. specific to a page I couldn't reach), send a screenshot and I'll extend the matrix.

## Addendum — app-shell fullscreen behavior audit (same day)
Audited: html/body/#root heights, vh vs dvh, safe-area, body reset, manifest, Fullscreen API.
Already correct (receipts): index.css kills UA body margin + dark first-paint; `#root { min-height: 100vh; min-height: 100dvh }` progressive dvh fallback with viewport-fit=cover in index.html; manifest `display: standalone` (PWA shell without forcing browser fullscreen); bottom tab bar + More sheet + DraftSheet footers already pad `env(safe-area-inset-bottom)`; NO Fullscreen API anywhere; overscroll doesn't flash white (body bg synced to theme).
Fixed: host-shell content padding was a flat 76px while the fixed tab bar is 70px + safe-area inset — on notched phones the last ~28px of content hid behind the nav. Now `calc(76px + env(safe-area-inset-bottom))` (verified 76px computed in emulation where inset=0). The app fills the viewport by layout, respecting browser/OS chrome — acceptance met.
