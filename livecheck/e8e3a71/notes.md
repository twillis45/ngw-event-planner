# Live check e8e3a71 (#275: the closed Places drawer is out of reach)

Checked Nov 26, 2026, ~12:12 AM EST. Read-only: 0 writes attempted, 0 page errors. Script: livecheck/hostv4-drawer.cjs.

| Size | Layout | Closed drawer | Tab stops in it while closed | "Show places" opens it |
|---|---|---|---|---|
| 390x844 | phone tabs | none | n/a | n/a |
| 834x1194 touch | compact | inert, off screen | 0 of 40 | yes, not inert, buttons visible |
| 844x390 touch (phone sideways) | compact | inert, off screen | 0 of 40 | yes |
| 932x430 touch (phone sideways) | compact | inert, off screen | 0 of 40 | yes |
| 1024x1366, 1194x834, 1440x900 | three panes | always open (not a drawer) | n/a | n/a |

Pass.
