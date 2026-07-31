# 06 — UI and Responsive Review (Phase 7)

**Method.** Both apps driven live in Chrome against the local dev servers started in Phase 1.
Screenshots and DOM measurements captured this session. Screenshots in `evidence/ui_*.jpg`.

**Coverage limitation, stated up front.** Captures were taken at a **2560×1294** browser
viewport. Programmatic window resizing did not change the rendered output in this harness, so
**mobile / tablet / laptop breakpoints were NOT visually verified**. Findings below are
therefore desktop-viewport findings plus DOM-measured facts that are viewport-independent.
This is a real gap in this audit — see "Not verified".

---

## Measured facts (DOM, this session)

| Measurement | Value | Where |
|---|---|---|
| Browser viewport | 2560 × 1294 | `window.innerWidth/Height` |
| hostv2 stage width | **393 px** (fixed) | `.stagewrap` bounding rect |
| hostv2 dock (stage nav bar) | **`display: none`** | computed style on `.dock` |
| hostv2 nav caret | **9 px** | computed `.eb-caret` font-size |
| CRA content column | ~230 px centred | `evidence/ui_cra_home_2560.jpg` |
| Console errors, CRA | **none** | `read_console_messages`, after reload |
| Console errors, hostv2 | **none** | same |

---

## Findings

### U1 — HIGH · 85% of desktop width is unused, in both apps
hostv2 renders a fixed **393 px** stage centred on a 2560 px viewport; the CRA home renders a
~230 px column. Neither adapts. The app is a phone layout letterboxed onto desktop.
Evidence: `evidence/ui_hostv2_hero_2560.jpg`, `evidence/ui_cra_home_2560.jpg`.
User harm: desktop hosts get a phone-sized reading column and must scroll for content that
would fit on one screen. Root cause: fixed-width stage container, not a breakpoint bug.

### U2 — HIGH · the persistent stage navigation is hidden in the default configuration
`.dock` computes to `display: none` on a default load. `elegantMode` is on unless
`?elegant=0`, and it applies `dock-retired`. The Create / Plan / The Day / After bar is
therefore absent by default; those stages remain reachable via the summoned sheet, but there
is no persistent wayfinding.
User harm: no visible indication that other stages exist. Root cause: elegant mode retires
the dock and nothing replaces it as resident navigation.

### U3 — MEDIUM · the only nav affordance renders at 9 px
`.eb-caret` computes to 9 px. `UX_01_STUDIO_MATTE_VISUAL_LANGUAGE.md` states nothing renders
below 11 px. At 1× it reads as stray punctuation after the event name rather than a control.
Combined with U2 this is the sole persistent entry to navigation.

### U4 — MEDIUM · a dev-only auth bypass badge renders in the running app
The CRA home displays **"AUTH BYPASS · DEV ONLY"** (`evidence/ui_cra_home_2560.jpg`), driven
by `REACT_APP_AUTH_BYPASS`. Correct that it is labelled; the finding is that this environment
runs with authentication bypassed, so **no authenticated behaviour was verifiable in this
audit** — see Phase 8 "Not tested".

### U5 — LOW · hero vertical composition leaves a large dead band
On the hostv2 hero the act, the two disclosures, and the hairline occupy the upper and lower
thirds with roughly 130 px of empty stage between them (`ui_hostv2_hero_2560.jpg`). Not a
defect on its own; noted because it is where a second-call whisper or the date would sit.

### U6 — VERIFIED FACT · host-facing language reads naturally on the surfaces observed
No system vocabulary leaked into the surfaces captured. Observed copy: "What kind of games?",
"Nothing's stalled — the plan's been running on our pick.", "Tap one to settle it — nothing
else changes.", "Other ways", "Calls to make (2)", "3 of 7 plan parts handled". No ids,
domains, or engine terms surfaced. (Separately, Phase 6 F1 documents a false *claim* in hero
copy on non-food events — a truthfulness defect, not a vocabulary leak.)

---

## Not verified (and why)
- **Mobile 390×844, tablet, laptop breakpoints** — programmatic resize did not alter the render
  in this harness; no device emulation was available. Responsive behaviour is unaudited.
- **Empty / loading / error states** — not reached without mutating stored data, which the
  audit forbids.
- **Modals beyond the summoned sheet, settings, Decision Memory, budget, guests, run of show**
  — not individually captured; Phase 2 documents their existence from code, not from runtime.
- **Keyboard traversal, focus order, contrast ratios, tap-target sizes** — not measured. No
  automated a11y tooling exists in the repo (Phase 8).
- **Authenticated surfaces** — auth is bypassed in this environment (U4).

## Method and limits
Live-driven, single viewport, two apps, no app code modified. Every number above was read from
the live DOM or a screenshot captured this session; none is carried from prior work.
