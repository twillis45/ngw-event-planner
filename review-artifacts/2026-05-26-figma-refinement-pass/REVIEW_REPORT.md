# FIGMA REFINEMENT PASS — Review Report

Captured 2026-05-26. Six concept frames in Figma page `Sprint 13 — Refinement Pass`. Six PNGs on disk.

## What operational problems were solved

| # | Problem | Refinement | Concept |
|---|---|---|---|
| 1 | Dev-tool toolbar ("Trigger 3 cascading delays / Cycle Catering / Reset") read as Storybook controls, breaking the illusion that the system is live. | Command layer with severity-aware mode chips — LIVE indicator + EVENT MODE / COMM / ENV at nominal, narrowing to a single channel-held chip at emergency. | A, B, D |
| 2 | Center escalation pane had too much dead emotional field — operator had to invent the texture. | Concentration block under the title: LAST OUTREACH / ESCALATION CONTACT / CASCADE RADIUS. Three quiet key-value rows. No new cards. | A |
| 3 | Right thread rail was structurally correct but conceptually thin — "Catering" + "Floral Co." told the operator nothing about parallel state. | Each thread card now carries elapsed badge + last-action + trajectory strip + comm-lock row. Rail stays compressed and quiet. | A |
| 4 | Left context rail felt accurate but static — the event didn't feel alive. | Operational drift strip (12 cells, last 12 min) + recent-memory whisper line. Subtle temporal rhythm without animation theater. | A, B |
| 5 | Emergency red plane risked becoming wallpaper at full-bleed surfaces. | Surface stays panel-colored with a thin emergency pressure-ring (1.5px stroke). Deep red appears ONLY in the cascade-radius fact box and the primary action. Focused pressure, not environmental fill. | B, E |
| 6 | Whispers (the strongest concept) read as just another card and didn't carry the psychological weight of operational memory. | Whispers section moved onto an ink-deep plane with a thin gold side-mark; whisper body promoted to 14px Medium; each whisper carries a small `meta` tag (`AV · 2 of last 3 events`). | C |
| 7 | Friction Review section was drifting into BI dashboard rhythms — bright bars, dashboard cadence. | Bars are stone-coloured (`textMute`) by default; only the slowest gets a quiet warning highlight. Explicit "no grade assigned" footer. | C |
| 8 | Debrief timeline reconstructed memory too evenly — every moment got the same visual weight, which is not how memory works. | Pivot entries (AV emergency, AV backup) get bold + left red mark + larger dot; nominal entries blur (dim, smaller); silence-rules between groups. Memory now has asymmetry. | C |
| 9 | Risk of analytics drift in the debrief. | Trust preserved — no scores, no AI language, no charts for decoration. Footer reaffirms "Memory exists to change the next decision." | C |

## What was intentionally NOT changed

| Surface | Why not touched |
|---|---|
| 3-zone orchestration grid (rail / active / threads) | Already canonical — refinements live inside the zones. |
| Containment matrix (mobile=full, escalation=280, emergency=360, secondary=160) | Locked per Figma 44. Verified at runtime Sprint 11/12. |
| Motion matrix (310 / 230 / 200 / 360) | Locked. Cannot be improved by static refinement. |
| Single-P1 hierarchy | Working as intended. |
| Surface elevation logic (plane 1 → 2 → 3) | Refinements use existing planes; no new planes invented. |
| Button primitive | No new props or variants needed — refinements use existing `style.width` + `size` patterns. |
| Color palette | No new colors except `emergDeep` (a darker plane behind cascade-radius fact box) and `whisperGold` (single accent for whispers). Both stay within Studio Matte restraint. |
| Density-collapse rules | Already correct — refinements ride on the rules, don't redefine them. |
| App.js, backend, slices' core architecture | Out of scope — pure Figma refinement pass. |

## Where SaaS drift was avoided

| Drift attractor | What I would not do | What I did instead |
|---|---|---|
| Dashboard sparklines on the drift strip | Add axis labels, gridlines, hover tooltips | 12 raw cells, no axis, no labels — just an honest indicator |
| "Smart insights" panel in debrief | "AI recommends contacting AV early next time" | Whisper: "Sound & AV required emergency escalation at the prior event." (factual recall) |
| KPI tiles for hesitation | "Score: 78 · Average reaction time: 3.2s" | Bar chart, stone-coloured, no grade, no overall score |
| Notification-center behavior on threads | Toast / popover / bell icon / unread count | Thread card stays a card; trajectory strip carries the signal |
| Brightening red to "increase urgency" | Saturate plane fill, add glow | Reduce red's footprint; let negative space carry pressure |
| Productivity gamification | Streaks, badges, "operator of the day" | Removed any concept of operator scoring entirely |
| Onboarding overlays / tooltips | "Did you know the awareness rail shows…" | Surfaces explain themselves through structure; no captions |
| Hero CTA bar at the top of the page | Bright full-bleed "TAKE ACTION" banner | Command layer is ink-deep, terse, severity-aware |
| Glassmorphism on the emergency surface | Translucent blurred background | Plane elevation only; no transparency, no blur |
| Modern productivity-app cliché (rounded everything, big numbers) | KPI hero numbers, oversized labels | Tight 9–14px scale, square keylines, conservative radii |

## What concepts became stronger

| Concept | Was | Is |
|---|---|---|
| Command posture | Dev-tool toolbar (debug language) | Severity-aware operational console |
| Thread rail | Name + meta line | Name + elapsed + last-action + trajectory + comm-lock |
| Left rail temporal awareness | Static fact list | Drift strip + recent-memory whisper |
| Emergency mass | Full-surface red plane | Pressure ring + focused red ONLY at action + cascade fact |
| Whispers | Card among cards | Gold-marked, ink-plane, typographic-gravity section |
| Friction review | BI-leaning bar chart | Stone-coloured forensic bar list with explicit no-grade footer |
| Timeline texture | Evenly weighted rows | Pivots bold + marked; nominal entries blur |

## Remaining weak areas

1. **Recovery card** — still mostly a key-value list. Could carry a quiet decompression mini-curve (3-cell strip ascending in green). Restraint check: would adding it be cognitively useful, or would it be analytics theater? Verdict: borderline. Hold for human validation.
2. **Tablet portrait** at 768 still relies on the left-rail-as-strip pattern — when severity drops to escalation (vs critical), the strip may carry less information than the operator expects. Likely fine, but a session would tell us.
3. **Mobile emergency** — full-width CONTACT NOW is correct doctrine but pairs with a 28pt title that takes most of the screen. May feel heavy. Reduce title to 24pt if a real session flags it.
4. **Drift strip at nominal** — currently shows 12 green cells, which reads as "everything is fine" but offers nothing operationally. Could be hidden entirely until the first amber cell. Hold for validation.

## Highest-risk future drift vectors

| Drift vector | Trigger | Defense |
|---|---|---|
| Stakeholder demo pressure → "make the red brighter" | Investor / customer flinches at first emergency render | Doctrine page 44 explicitly forbids saturation drift — point them at it |
| Engineer pressure → "add toasts when state changes" | Notification-center thinking | Page 13 escalation choreography forbids it — replace with state mutation only |
| Designer pressure → "the rail looks empty at nominal" | Whitespace anxiety | Page 30 density rules: empty is correct at nominal — "memory is invisible until it would change a decision" |
| PM pressure → "operators want a score on debrief" | KPI thinking | Page 11 doctrine: "no score, no celebration" — the interval is the instrument |
| AI feature pressure → "let's add smart suggestions" | Industry trend | Footer of debrief explicitly says "no AI recommendation" — this is the line |
| Mobile gesture pressure → "swipe between threads on mobile" | iOS interaction patterns | Mobile single-column is the doctrine — no gestures, no peeks |

## Recommended next runtime implementation priorities

| Priority | Item | Rationale |
|---|---|---|
| 1 | Replace dev-toolbar with command-layer (refinement #1) | Visible everywhere; high signal-to-cost ratio. ~80 lines in each slice. |
| 2 | Add density concentration block (LAST OUTREACH / ESCALATION CONTACT / CASCADE RADIUS) to desktop-density slice | Real cognitive payoff. Pulls vendor card cascade-radius doctrine (page 08) into runtime. |
| 3 | Upgrade right-thread-rail cards with elapsed + last-action + trajectory + comm-lock | Strongest parallel-cognition refinement. Requires no new primitives. |
| 4 | Upgrade left-rail with drift strip | Tiny visual, big "the event is alive" win. |
| 5 | Whisper section visual upgrade in `?slice=debrief` (ink plane + gold mark + typographic gravity) | Already runtime-proven concept; refinement is purely visual. |
| 6 | Friction-review color drain (stone bars, single-warning) | Reduces analytics drift risk. Trivial CSS change. |
| 7 | Timeline temporal-weighting in debrief slice | Adds pivot/blur typography. ~30 lines. |

All seven are doctrine-compatible, additive, and would not touch App.js, backend, or any primitive.
