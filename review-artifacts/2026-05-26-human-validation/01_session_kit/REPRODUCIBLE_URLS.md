# REPRODUCIBLE URLS — Sprint 13 Capture Kit

Every URL below loads the slice in a known state. Bookmark them; do not
hand-trigger states during a session if you can avoid it.

## Vendor slice
| State | URL |
|---|---|
| Nominal | http://localhost:3000/?slice=vendor |
| Nominal + observer | http://localhost:3000/?slice=vendor&observe=1 |
| Escalation (pre-loaded) | http://localhost:3000/?slice=vendor&state=escalation |
| Escalation + observer | http://localhost:3000/?slice=vendor&state=escalation&observe=1 |
| Emergency (pre-loaded) | http://localhost:3000/?slice=vendor&state=emergency |
| Emergency + observer | http://localhost:3000/?slice=vendor&state=emergency&observe=1 |

## Desktop-density slice
| State | URL |
|---|---|
| Nominal | http://localhost:3000/?slice=desktop-density |
| Nominal + observer | http://localhost:3000/?slice=desktop-density&observe=1 |
| Cascade (catering + floral delayed, AV non-responsive) | http://localhost:3000/?slice=desktop-density&state=cascade |
| Cascade + observer | http://localhost:3000/?slice=desktop-density&state=cascade&observe=1 |
| Emergency (AV emergency tier) | http://localhost:3000/?slice=desktop-density&state=emergency |
| Emergency + observer | http://localhost:3000/?slice=desktop-density&state=emergency&observe=1 |

## Debrief slice
| State | URL |
|---|---|
| Synthesized example | http://localhost:3000/?slice=debrief |
| Live transcript (must run with `?observe=1` on another slice first in same tab session) | http://localhost:3000/?slice=debrief |

## Observer instrumentation
- Add `&observe=1` to any slice URL.
- Look for the console banner `[NGW Observer] active`.
- Press **Ctrl/Cmd+Shift+L** to copy the transcript to clipboard.
- The transcript contains: timestamps, hesitation (ms between last state change and next click), state transitions, click labels.

## Viewport notes
- All states render correctly at: 390 / 768 / 1024 / 1280 / 1440.
- Desktop-density 3-zone activates at ≥ 1024.
- Vendor slice two-pane activates at ≥ 768.
