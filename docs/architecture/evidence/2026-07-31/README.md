# Live evidence — 2026-07-31

Screenshots taken by driving `hostv2` in Chrome against a local build, not mocked and
not composed. Each one is the proof for a claim made in the same session; without them
the claims are assertions.

They live here rather than in `review-artifacts/` because that directory is gitignored
(`.gitignore:26`) — nothing in it survives a clone. This directory is tracked.

| # | file | what it proves |
|---|---|---|
| 01 | `01-queue-reason-renders-wedding-71d.jpg` | Reasoning Continuity v1 renders on a queue row: `Resolve 9 decisions` carries `past its window`. The row's own title is em-dash-trimmed at `HostShellV2.jsx:6832`, so the reason is the ONLY overdue signal there — this is why the proposed STOP-set "restatement" fix was withdrawn. |
| 02 | `02-past-its-window-repeated-3x-retirement.jpg` | The repetition defect. `past its window` renders **3x on one screen** — hero card, Vendors card, and a queue row — from three independent producers. Doctrine says once. |
| 03 | `03-retirement-43d-after-date-rebase.jpg` | Sample-date rebase landed: header reads `43 DAYS · RETIREMENT PARTY`, the lead every Figma board was captured at. Before the fix it read 29 and was shrinking daily. |
| 04 | `04-cta-atom-gradient-restored.jpg` | The primary CTA rendering `var(--cta-grad)` — the steel-blue gradient all 42 plain `.cta` sites use. It had been forked to a flat `#282d33` that the parity gate never checked. |
| 05 | `05-decision-options-consolidated.jpg` | The decision-option component after collapsing the `.app-elegant` duplicate into the base. Rendering byte-identical; matched rules dropped from 3 to 1-2 per row. |
| 06 | `06-decision-options-aligned-to-cta-family.jpg` | Alignment to the `.cta` family: radius `var(--r-md)` 12px -> `var(--r-row)` 14px, and a 46px tap-target floor added (rows had been 43-45px, UNDER the floor `.cta`'s own S1 audit set). |

## Caveat on what a screenshot can and cannot show

02 and 04 are resting states and can be read directly. The `.decopt.pick:hover` hardcode
found in the same pass is **not** visible in any of these: `:hover` does not survive
across a tool-call boundary, and it was not faked with a synthetic event. That finding is
rule-level (the selector matches the "Send the ask" row), not pixel-level, and is recorded
as such.
