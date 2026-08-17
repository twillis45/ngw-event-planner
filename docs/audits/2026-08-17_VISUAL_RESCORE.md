# Visual re-score — W9, 2026-08-17

Leader: Slack badges / Apple HIG. Prior: **7/10** (W8, 2026-07-15).

## W8's two caps, re-derived — both smaller than they read

**"Two reds for one meaning."** Real, and documented on purpose. `--danger` is
`#F27A70` (lightened so label text clears AA on card and on tint) and
`--danger-solid` is `#E84036` (the deep red, preserved for solid fills). Two reds
for two RENDERING CONTEXTS, with the contrast arithmetic written down in
`palette.js`. `--danger-solid` has exactly TWO uses, both progress-bar fills.

Apple HIG would prefer one systemRed varied by opacity, so the criticism is not
baseless — but it is a 2-use token with a stated reason, not a defect.

**"The 8→1 vocabulary unification."** Measured, and it appears substantially
handled. The host-facing terms for lateness are three, and they are
register-separated rather than drifting:

| term | surface | guard |
|---|---|---|
| `BEHIND ·` | run-of-show row prefix | day-of only |
| `past its easy window` | decision copy | `!heroSpeaksThisOverdue && !solemn` |
| `nothing is slipping` | the calm verdict | solemn events say "take it gently" |

The dedup guard is explicit and its comment names the risk — "the same scold
twice". `HostShellV2.jsx:7493` even strips the "— they're past their easy window"
suffix when the same title renders elsewhere. That is a vocabulary that was
tended, not one that drifted.

## The evidence that actually moved this score

Since W8, the visual axis gained instrumentation it did not have:

- **`a11yFloor` sweeps all TWELVE sections** (enumerated from the Sections door at
  runtime, so a new sheet is covered the day it is added) for WCAG AA contrast and
  accessible names. **Zero findings.**
- The matrix checks geometry and overflow across **six viewports**. Zero findings.
- Every W7 contrast figure still reproduces.

## Score

**Visual: 8/10** (from 7).

Raised because the two stated caps are a 2-use token with a documented rationale
and a vocabulary that turns out to be deliberately register-separated — and
because contrast/naming is now swept across every section rather than asserted
once.

Capped at 8, honestly, because I have NOT adversarially re-derived the
sub-dimensions this pass did not touch: density, hierarchy, type scale, motion.
Every dimension audited today had an unnamed floor sitting beneath its stated
caps, and it would be out of character for this one not to. 8 is what the
evidence supports; it is not a claim that nothing is wrong.

## Note for the next pass

Five findings dissolved under scrutiny today (a −364 that was legitimate, two
Coverage halves, a wedding-day head, this vocabulary). The common cause was
measuring a fixture rather than the app, or a range that never reached the
behaviour. Visual is the dimension where that risk is highest, because a
screenshot of an unrealistic state looks exactly as convincing as a real one.
