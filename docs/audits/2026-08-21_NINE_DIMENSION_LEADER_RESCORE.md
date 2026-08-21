# Nine-dimension re-score vs category leaders — 2026-08-21

Dimensions set by the host: workflow, design, modern UI/UX, micro motion,
animation, attention systems, ease of use, less friction, DIFM. Scored by a
dispatched auditor against the recorded competitive reads (Mobbin 07-29,
Blink 08-01, leaders baseline 07-13, spacing 08-07, CTA 08-04, landing
08-18) plus HEAD; two of its claims were then FALSIFIED by direct code
check and corrected below (marked ✎). Prior scored baseline: 07-13 audit
closed at 63.8%. The table at the top is the CURRENT score; the re-score
sections below record how each cell got there, and no cell moves without
a check in the code first.

## Score table — CURRENT (as of `547919e2` / `a1cf8929`)

Each row is the score as it stands now; the "remaining gap" column is the
one specific thing between that dimension and a 10, and is what the next
session works from. The progression that produced each number is recorded
in the re-score sections below.

| Dimension | Bar-setter | Us /10 | Remaining gap to 10 |
|---|---|---:|---|
| Workflow | Wanderlog (Partiful on creation) | 9 | Day CRUD: add / move / delete a day inside the programme span (the per-day schema, build-queue item 1) |
| Design | Paperless Post / Vercel craft | 9 | Vendors ruling items 2, 3, 5: `.frow` metrics, `.vc-chip` base off `--warn` (red-proofed), settled fold |
| Modern UI/UX | Linear | 8 | The on-demand detail panel at >=1200px (vendors ruling item 6) — the desktop dead third is still dead. Second, newly observed: at 1920 roughly a fifth of the viewport below the app frame is dead band (marketing capture, 08-21) |
| Micro motion | Linear / Family | 8 | The readiness digit still cuts beside a gliding bar — the one remaining visible motion defect, and it sits on the surface a host looks at most. Behind it: `.bline i` / `.bline b` still animate layout (`styles.css:1627`, `:1629`) and `.wxpill{transition:bottom}` (`:2906`). Atom-input parity is now complete; `.mbar i` stays on `width` by a recorded decision and is not a gap |
| Animation | Family / Partiful | 9 | FLIP covers ONE list — "Then, in order". The call-sheet, vendor and checklist lists still cut. No shared element and no view transition anywhere (`startViewTransition` grepped at HEAD: zero), so cross-SURFACE continuity remains unbuilt while within-surface continuity now exists |
| Attention systems | Blink | 9 | `Send Failed` exists only on the email path, so the three-not-dones model is not complete across channels. Two more, newly observed: the send ledger answers "did the asks go out" one vendor at a time where Blink answers it for the whole list, and the checklist can read "280 days past its window" on a wedding 85 days out (a playbook-runway artifact — a false urgency signal is an attention defect) |
| Ease of use | Evite / Apple HIG | 8 | Run the stranger-proof onboarding test — the score is asserted, not observed |
| Less friction | Partiful | 8 | Send covers the vendor case only; the other 25 draft generators still exit to the clipboard |
| DIFM | Joy (breadth) — the set's bar is ours | 9 | Resend webhook proven live so `delivered` can exist, and send beyond the vendor case. Secondary: the milestone-to-task join lands on 123/408 (30.1%) and `playbookMilestones` / `playbookTasks` still have zero hostv2 imports (grepped at HEAD) |

**Overall: 77/90 (86%)** — up from 63.8% (07-13 audit) via 67, 70, 72, 73,
75, 76.

Micro motion and animation are no longer the table's pending cells. Both
were held at 7 awaiting the motion audit
(`2026-08-21_MOTION_AND_MICRO_INTERACTION_AUDIT.md`); both reached 8 on
`76cc7a76`, and animation reaches 9 in the sixth re-score below on
`547919e2`, which built the capability the audit named as the category
gap. Every cell in this table is scored from a code check at HEAD.

## Post-build re-score (same session, pre-dawn — verified movement only)

Three dimensions moved on SHIPPED, driven work:

- **Workflow 7 → 8.** The multi-day programme engine was already real
  (`programmeDays`, per-day clocks) and is now FINDABLE: the span-gated
  "Your days · The plan, day by day" door in Sections + rail, landing on
  the programme block, driven live end to end (`00670766`). First-day
  start-time copy honest on spans. Still short of Wanderlog's day CRUD.
- **Attention 8 → 9.** The dimension's named top gap — the three
  not-dones as a designed state model — shipped as the send ledger
  (board 6-0, `fdfa17fc` + `24cd0101`): not_sent → handed_off
  (host-attested, channel + age) → confirmed (vendor confirm-back), wired
  into the silence clock the engines already score. Send Failed joins
  when the email path ships; that absence is what keeps this off 10.
- **Less friction 7 → 8.** One gesture now hands off AND records
  (draft exits write the ledger; vendor drafts also log contact) — the
  re-log tax and the re-propose tax are gone. The transport itself
  (board-approved slice (b)) is still unbuilt, so not higher.

**Overall after those builds: 70/90 (78%).** Unmoved dimensions were
unmoved for real reasons: Design/Modern-UI awaited desktop work that had
not been driven; Ease-of-use awaited the stranger test; DIFM awaited
sending; Micro motion/Animation awaited the ceremonial→work
redistribution.

## Second post-build re-score (vendors sheet + comms slice b)

- **Design 8 → 9.** The vendors sheet was the recorded outlier — the
  08-07 spacing read's "status pills loudest in the set", and the last
  sheet still carrying a four-band collapsed face while every restyled
  surface showed one line. After the 8-seat ruling (`c22acec4`): cards
  measure 98–109px, one ranked chip, amber demoted from default to
  exception. Measured in real Chrome, not eyeballed. Not 10: the
  `.vc-chip` token default is still amber (board item 3), rows are not
  yet at `.frow` metrics (item 2), and there is no roster toolbar.
- **DIFM 8 → 9.** The dimension's stated top gap was "writes but cannot
  send". It can now: vendor-directed email with a known address, behind
  review-then-send, recording the SERVER's answer (`accepted`, never
  "delivered", never "Sent"). Not 10 until the Resend webhook is proven
  live so `delivered` can exist, and until the send covers more than the
  vendor case.
- **Attention 9 → 9 (held).** The vendor row now answers all three parts
  of the ops question — did it go out, when, did they answer — but
  `Send Failed` only exists on the email path, so the three-not-dones
  model is not yet complete across channels.

**Overall at that point: 72/90 (80%).**

## Third re-score: the widescreen-parity session

Five things landed. Each was checked in the code before it was allowed to
touch a cell.

VERIFIED AS SHIPPED:

1. **One rail-aware frame.** `DATA_SHEETS` (src/lib/responsiveSurface.js:65)
   was a whitelist of eight sheets that took the wide frame; the other five
   rail sections fell to `legacy`, and food and data tiers ran different
   rail-aware formulas, so walking the rail moved the whole app 80px
   sideways — the shift the host reported. All 13 rail doors are now on one
   frame: at 1920 every section measures 1580 frame / 1358 app / 820
   content; at 1440, 1392 / 1170 / 820 (`1bd405de`, `63e812da`; measured in
   Playwright, section by section).
2. **Heroes everywhere.** Make it yours, Ask the Boss and You & settings
   opened on something that approximated a hero or on no hero at all; all
   three now render `SheetHero`. 12 of 13 sections open on an identical
   44px star / 14px eyebrow / 820px measure.
3. **The top menu folded into the rail.** With the rail up, "Jump to a
   section" opened a sheet whose only content was a second copy of the
   rail. It no longer renders at rail widths (HostShellV2.jsx:14303); its
   three non-duplicate doors — This event, Search, Feeling stuck? — moved
   into an "Elsewhere" group at the foot of the rail, each with its own
   mark.
4. **The rail collapses, and survives it.** A per-browser persistent toggle
   (`ngw-hostv2-rail-min`) drops `--rail-w` from 200px to 64px icons-only.
   Every door keeps an accessible name (`aria-label` on each `.srail-row`),
   64px is the 44px tap floor plus the row's own padding, and the choice
   survives a reload. Gated by `hostv2/e2e/railCollapse.spec.mjs`.
   Where the freed width goes DEPENDS ON THE VIEWPORT, and both readings of
   it circulated in this session before anyone measured. Reading the CSS
   alone says the frame narrows, because the width formula is
   `min(100% - 48px, 1360px + rail + gap)` and the second term shrinks with
   the rail. Measuring at 1440 says the opposite: the first term binds
   there, the frame is already as wide as the window allows and cannot
   narrow, so all 136px lands in the content column. At 1920 the formula
   binds and the frame does narrow. Neither description is the correction
   to the other; the invariant that holds at every width is CONSERVATION —
   whatever the rail gives up is taken by the frame, the content, or both,
   and the content never gets narrower for collapsing the nav. That is what
   the gate asserts, at 1440 and 1920 rather than at one flattering width.
5. **One corner on one rectangle.** At 1440 the frame was 20px, the splash
   48px and the app 0px: the splash was painting the 393x852 phone bezel
   over a desktop canvas, and the sheet carried a phone bottom-sheet corner
   (26px top / 46px bottom) inside a 20px frame. Both now take the frame's
   corner with the rail up, held by a new standing gate,
   `hostv2/e2e/frameCorners.spec.mjs`.

Vendors ruling: items 1 and 2 of the sequence — one-band collapsed face
with a single ranked chip, and amber demoted from the default state — are
shipped (`c22acec4`). Items 3–6 are NOT: `.vc-chip`'s base is still
`color:var(--warn)` at styles.css:2589-2590, and the settled fold, the
sheet toolbar and the detail panel do not exist. They are not credited.

What moved:

- **Modern UI/UX 7 → 8.** This is the dimension Linear sets, and Linear's
  bar at desktop is a nav that is persistent, collapsible, and quiet. We
  now have all three: one rail, one frame that does not jump as you walk
  it, a collapse that persists and stays named and hittable, and no
  second copy of the nav behind a door. Not 10: the dead third at 1920 is
  still dead — the on-demand detail panel (vendors ruling item 6) has not
  been built.

What did not move, and why:

- **Design holds at 9.** The parity work removed real defects — the 80px
  shift, three corners on one rectangle, three heroless sections — but
  every blocker this document named between Design and a 10 is untouched:
  `.frow` row metrics, the `.vc-chip` amber base, the settled fold.
  Correcting defects a 9 was awarded without noticing is not a move up.
- **Ease of use holds at 8.** The stated gap is that the score is asserted
  rather than observed. Only the stranger-proof onboarding test closes it,
  and it has not been run.
- **Less friction holds at 8.** Removing a duplicate door is real but
  small; the dimension's gap is the outlet, and send still covers the
  vendor case only.
- **Workflow (8), Attention (9), DIFM (9) hold.** Nothing this session
  touched day CRUD, cross-channel `Send Failed`, or the webhook.
- **Micro motion (7) and animation (7) hold, pending the motion audit.**
  No motion work was done this session. A dedicated motion audit is in
  flight; these two cells should be re-scored from its findings, not from
  here. Nothing about motion in this document is newer than the ✎
  correction below.

**Recompute: 8 + 9 + 8 + 7 + 7 + 9 + 8 + 8 + 9 = 73.**

**Overall now: 73/90 (81%)** — 72 → 73, the single point on Modern UI/UX.

| Dimension | 07-13 | now |
|---|---|---|
| Workflow | 7 | 9 |
| Design | 8 | 9 |
| Modern UI/UX | 7 | 8 |
| Micro motion | 6 (7 ✎) | 8 |
| Animation | 7 | 9 |
| Attention | 8 | 9 |
| Ease of use | 8 | 8 |
| Less friction | 7 | 8 |
| DIFM | 8 | 9 |

## Fourth re-score: the two motion cells, resolved

These were the only cells in the table not scored from a current code
check. The motion audit landed and `76cc7a76` worked six of its eight
shortlist items. Every claim below was read in the source at HEAD before
it was allowed to touch a cell, per the standing rule — and the check
caught two things the commit message would have over-credited on its own
(see "what the check corrected" at the foot of this section).

VERIFIED AS SHIPPED:

1. **Sheets have an origin.** A capture-phase `pointerdown` listener
   records the last tap's Y (`HostShellV2.jsx:3490, 3512-3516`); a
   `useLayoutEffect` keyed on the sheet's identity measures the sheet
   rect, computes `--from-y` as `tap.y - rect.top` clamped to 0-320px,
   and restarts the animation with the none/reflow/`''` idiom
   (`:3529-3546`). `@keyframes sheetrise` reads
   `translateY(var(--from-y,24px))` (`styles.css:1494`). Done at the
   pointer rather than at each call site, and the tap is trusted for only
   1200ms, so keyboard, deep-link and route-restore paths keep the old
   constant.
2. **Reduced motion is now correct, not merely complete.** The
   `.rowfocus` landing ring carried its shadow in the base rule with
   `rowfade` as the only remover, so the global `animation:none
   !important` left a 2px core plus an 8px halo applied permanently and
   stacking across landings. `styles.css:2686-2689` now gives reduce a
   static 2px core, no halo — the fix that keeps the landing legible,
   which is what the row-level-CTA law requires.
3. **Fills run on the compositor.** `.bar i` is `width:100%;
   transform:scaleX(var(--fill,0))` (`:1104-1106`), radius deleted (the
   track already clipped), three JSX call sites converted to `'--fill':
   pct/100`.
4. **The slow band is named at the source.** `slow: 550 / fill: 700 /
   land: 3200` in `src/design/tokens.js`, `--ms-slow / --ms-fill /
   --ms-land` in `theme.js` — the build's own `check-parity.mjs` refused
   the change until the tokens existed at source. `cardin`'s off-ladder
   durations moved to `var(--ms-enter)` at 14 sites.
5. **Duplicate `toastin` deleted, and the doctrine conflict resolved
   rather than deferred.** The surviving `-4px` overshoot was kept: the
   2026-07-23 host ruling that shipped the Motion System specifies "one
   soft bounce" and is later and more specific than UX_01:154's "No
   spring physics. No bounce." UX_01:154 is now the stale text.
6. **Focus parity** extended to `.srail-row`, `.palette-row`,
   `.sec-row` (`:3601-3603`).
7. **A standing gate.** `hostv2/e2e/motionContinuity.spec.mjs`, three
   tests, each red-proofed. jest 6044 passed; Playwright desktop 117
   passed / 7 skipped, mobile 84 passed.

What moved:

- **Micro motion 7 → 8.** The dimension's stated dock was distribution
  of press/settle feedback, and that distribution is now near-complete
  across pointer capability, press, focus and disabled — plus a real
  reduced-motion defect closed and the highest-frequency fill moved off
  the main thread. **Not 9, and here is exactly what is between:** the
  readiness digit still cuts while the bar beside it glides, which reads
  as a bug on the surface a host looks at most (finding 10); four of the
  five progress fills still animate layout — `.bline i`/`.bline b`
  (`styles.css:1627, 1629`), the invite bar (`:2455`), `.mbar i`
  (`:3636`) — plus `.wxpill{transition:bottom}` (`:2877`); and `.mini`,
  `.path-row` and `.navrow` still have press with no focus response
  (grepped at HEAD, zero hits). Linear's bar is that every interactive
  atom answers every input the same way; three atoms still do not.
- **Animation 7 → 8.** Sheet origin is the first real spatial continuity
  in the app, the ladder above 420ms is named at the token source rather
  than spelled six ways, and reduced motion is complete AND correct.
  **Not 9, and specifically:** there is still no FLIP, no shared element
  and no view transition anywhere — when ranking changes, and ranking
  changing is this product's entire thesis, rows cut to their new
  positions (finding 2, the largest remaining continuity gap). And the
  `cardin` list stagger still replays in full on every remount across
  fourteen surfaces: only its duration was tokenized, no first-mount
  gate was added, so the ceremonial-cost finding is unresolved and a
  host toggling a filter still watches a settled list re-enter from
  below. (SUPERSEDED by the fifth re-score below: `ae2c99da` added the
  arrival gate. The cell still holds at 8, on FLIP alone.) An app that
  answers "where did this come from" but not "what
  just moved" is an 8 against Family and Partiful, not a 10.

Is either a 10? No, and the gap is not subtle. A 10 on animation in this
category means a list whose reorder is legible as movement and an
entrance that fires when something actually arrives. We have neither.
The list that closes both cells is short and concrete: FLIP on the
ranked-decision and call-sheet lists; the first-mount gate on `cardin`;
the digit tweened with its bar; the four remaining layout-animating
fills; `.mini` / `.path-row` / `.navrow` focus parity. That is what the
next session works from.

(SUPERSEDED by the sixth re-score below. Every item on that list except
the digit and two `.bline` fills has since shipped: the arrival gate in
`ae2c99da`, FLIP on the ranked list plus the last three `cardin`
literals and the finding-17 focus atoms in `547919e2`. Animation moves
to 9 there; micro motion holds at 8 on the digit.)

What the check corrected: two things the commit narrative would have
over-credited. `cardin` tokenization covered 14 sites but **three
literals survive** (260ms at `HostShellV2.jsx:14418` and `:14456`, 300ms
at `:17613`) — the ladder is cleaner, not clean. And the focus-parity
item closed finding 16, not finding 17: the three atoms that gained
parity are not the three finding 17 named.

**Recompute: 8 + 9 + 8 + 8 + 8 + 9 + 8 + 8 + 9 = 75.**

**Overall now: 75/90 (83%)** — 73 → 75, two points, one on each motion
cell.

## Fifth re-score: coverage, reconciliation and the drifting rail

Five things landed after the motion cells were resolved. Each was read in
the source at HEAD before it was allowed near a cell.

VERIFIED AS SHIPPED:

1. **The checklist follows the decisions** (`46909fa8`).
   `src/lib/checklistReconcile.js` exists and is imported by the shell
   (`HostShellV2.jsx:82`), driven by an effect (`:5127`) keyed on the
   event id plus `foodChoices`, `travelMode`, `isDestination`,
   `foodFocus`, `caterer` and `date`. `event.timeline` was seeded once at
   creation and never asked again, so four working gates inside
   `playbookChecklist` — `choiceShown`, `modeShown`, `whenKids` and the
   caterer lever — fired exactly once and were dead afterwards. The merge
   appends new rows, RETIRES gated-out rows with a reason rather than
   deleting them (`checklistReconcile.js:86-88`) and revives them in
   place carrying `done` (`:95-96`), never touches host-written rows, and
   treats an empty derivation as no information. Retired rows are
   excluded from the live set at `HostShellV2.jsx:1750` and `:15470`, so
   they leave the "N of M" denominator too. The catch-up pass patches
   silently (`first ? '' : reconcileSummary(res)`) — announcing it put a
   toast over the app on every event open and turned 12 specs red.
   Idempotence is pinned in `src/lib/__tests__/checklistReconcile.test.js`;
   `hostv2/e2e/checklistFollowsDecisions.spec.mjs` covers the wiring.
2. **No event type is silent** (`d35606e9` + `3f0ad471`). Nine of the
   taxonomy's 48 types had NO playbook: a bare Town Hall measured ros 0,
   checklist 0, decisions 0, risks 0, raises 0. `BORROWED_PLAYBOOK`
   (`src/lib/playbooks/index.js:127`) is an explicit map, each entry
   carrying the sentence that justifies it; `getPlaybook` returns the
   base with `isDefault`, `appliedTo` and `because`, and deliberately
   leaves `type` as the SOURCE playbook so every row's
   `provenance.source` names where the work actually came from. The
   borrow is stated on screen (`.borrowed-note`, `HostShellV2.jsx:10152`
   and `:15449`). "Other" stays null on purpose. Six types borrow today;
   the other two now have authored playbooks (below).
3. **The day-of list reaches the host, and two playbooks authored**
   (`3f0ad471`). `playbookDayOfChecklist` had worked for months with zero
   hostv2 imports — the frozen CRA rendered it, the shipping shell never
   did. It is now imported (`HostShellV2.jsx:81`) and rendered in the Day
   stage (`:10131`), with confirm state persisting to
   `event.safetyChecked` (`:10133-10138`); the generic floor states that
   it is a floor. `data/clientDinner.js` and `data/fundraiserGala.js`
   exist and replace their borrows — the gala is now the corpus's richest
   file, and it authors all four of the coverage audit's universal blind
   spots (licensing/permits `:101`, `:123`; accessibility `:105`, `:134`;
   load-in; first aid). Client Dinner authors no load-in or permit rows,
   correctly, because a restaurant booking has neither.
4. **The rail stopped drifting** (`ae2c99da`). `.stagewrap` carried
   `overflow:hidden`, which suppresses the scrollbar without ceasing to
   be a scroll container, so every row-level landing's `scrollIntoView`
   scrolled the FRAME and the rail walked off the top with nothing to
   bring it back — measured 21 -> -80 -> -194 -> -299 across five
   sections while `window.scrollY` stayed 0. Now `overflow:clip`
   (`styles.css:3865`), with the reasoning recorded in place. The same
   commit gated the `cardin` list stagger to the SHEET's arrival
   (`HostShellV2.jsx:3519-3541`): a `rowEnter(i)` helper returns
   `undefined` outside a 900ms window from the sheet's identity change,
   used at 15 call sites. The clock is stamped during render, not in a
   layout effect — the first version stamped it after children had
   rendered and silently deleted the entrance it was meant to schedule.
5. **Test-suite integrity** (`d531362a`). Nine e2e specs had each
   hand-rolled the phone section-door path inline; hiding "Jump to a
   section" at rail widths broke all nine. One shared
   `openSectionByName` helper (`hostv2/e2e/fixtures.mjs:84`) now owns it,
   used across seven spec files. The matrix also surfaced two real bugs,
   both fixed: `panelrise` is now origin-aware
   (`styles.css:3386` reads `var(--from-y,24px)`, so tablet and landscape
   have a sheet origin at all), and sheet origins were 24px short because
   the shell measured the sheet's top with its entrance transform still
   applied — the layout effect now kills the animation, reflows, measures
   the resting rect, then restores (`HostShellV2.jsx:3562-3579`).

NOT CREDITED, checked and confirmed absent:

- **Ownership shipped no code, deliberately.** Grepped at HEAD:
  `playbookMilestones` and `playbookTasks` still have zero hostv2
  imports. The measurement (join lands on 123/408, and 350 of 408
  authored owners are "host") is with the review board; seeding a row's
  owner from a milestone today would paint a label naming nobody.
- **No FLIP, shared element or view transition** anywhere in the shell
  (grepped `startViewTransition` / FLIP at HEAD: zero).
- **The crab swap has not been driven** through the decision board's own
  control in a browser.
- **The stranger-proof onboarding test has not been run.**

What moved:

- **Workflow 8 -> 9.** This is not a defect fix inside a covered
  capability; it is a missing loop. The product's thesis is that the plan
  responds to what the host decides, and until `46909fa8` it responded
  exactly once, at creation — four authored gates that could never fire
  again, so flipping a crab feast to "Steam them myself" left the host's
  real list still telling them to go collect hot crabs. The plan now
  re-derives on every answer that changes it, on the EVENT rather than in
  the sheet (so the hero, the readiness feed and the open-task counts
  stop quoting a stale list), and it does so without destroying host
  state: retire-with-a-reason, revive carrying `done`, never touch a
  host-written row. Coverage is the other half — nine event types that
  produced literally nothing now produce 11-19 real tasks, with the
  borrow named on screen and in provenance. Wanderlog's remaining
  advantage is the one this document has named all along and nothing this
  session touched: day CRUD across a programme span. That is the whole of
  the distance to 10.

What did not move, and why:

- **DIFM holds at 9.** Tempting, and wrong. The coverage work is real
  DIFM breadth, but nine types producing nothing was a defect the 9 was
  awarded without noticing — the same reasoning that held Design at 9 in
  the third re-score applies here unchanged. The stated gap is sending:
  the Resend webhook is still unproven live and send still covers the
  vendor case only. Neither was touched. The unwired milestone join is
  now recorded as a secondary gap so it is not lost.
- **Attention holds at 9.** The silent catch-up pass is a genuine
  attention decision — the app declines to interrupt a host about its own
  housekeeping, and the 12 red specs proved the interruption was real —
  and retire-with-a-reason keeps the "N of M" denominator honest. Both
  are craft inside a 9, not the named gap: `Send Failed` still exists
  only on the email path.
- **Less friction holds at 8.** The day-of list reaching the host and the
  rail no longer walking off the top both remove real host cost, but the
  dimension's gap is the OUTLET, and 25 of 26 draft generators still exit
  to the clipboard.
- **Modern UI/UX holds at 8.** `overflow:hidden` -> `overflow:clip` fixed
  a defect the 8 already implicitly claimed not to have (a desktop frame
  that does not move as you walk it). The gap is the on-demand detail
  panel at >=1200px, and the dead third at 1920 is still dead.
- **Micro motion holds at 8, animation holds at 8.** The stagger gate
  closes one of the two absences named against animation, and it is the
  smaller one. The larger stands: ranked rows still cut to their new
  positions, and ranking changing is this product's entire thesis. Three
  literal `cardin` sites also sit outside the new gate
  (`HostShellV2.jsx:14557`, `:14595`, `:17781`), so the ceremony is
  gated, not eliminated. Nothing this session touched the readiness digit,
  the four layout-animating fills, or focus parity for `.mini` /
  `.path-row` / `.navrow`.
- **Design holds at 9, ease of use holds at 8.** No vendors-ruling item
  moved; the stranger test has not been run.

**Recompute: 9 + 9 + 8 + 8 + 8 + 9 + 8 + 8 + 9 = 76.**

**Overall now: 76/90 (84%)** — 75 -> 76, the single point on Workflow.

## Sixth re-score: FLIP, and an engine that had no event to run on

Two commits — `547919e2` (motion) and `a1cf8929` (day-of copy + the
multi-day span) — plus the work between them. Everything below was read
in the source at HEAD before it was allowed near a cell; line numbers are
current, and three the previous sections carried had drifted (see the
foot of this section).

VERIFIED AS SHIPPED:

1. **The ranking moves, it does not cut** (`547919e2`). A new pure module,
   `src/lib/flipReorder.js` — `measureRows(container, attr)` returns a
   Map of id -> rect top, `playReorder(container, before, opts)` inverts
   with `translateY`, forces layout (`void container.offsetHeight`, the
   step whose absence makes FLIP "sometimes work"), then releases the
   transform onto the compositor. Ten unit tests in
   `src/lib/__tests__/flipReorder.test.js`. Wired to the `.ef-list`
   "Then, in order" list (`HostShellV2.jsx:8604`, rows carry
   `data-flip={String(a.id || i)}` at `:8629`) through a
   `useLayoutEffect` at `:3521-3527` that measures INTO the ref before it
   plays from the previous measurement — the order is the correctness
   argument, since measuring after playing captures rows mid-flight and
   poisons the next reorder. Rows that ARRIVE are skipped by
   construction: no entry in the `before` map, no travel, because an
   entering row has no direction the data actually carries. A 4px
   `MIN_TRAVEL` floor keeps subpixel layout noise off an idle screen, a
   40-row ceiling keeps the per-commit measure cheap, and reduced motion
   returns 0 and gets the new order instantly — correct here, unlike the
   landing ring, because the cue carries no information the final
   position does not. Gated in both directions by
   `hostv2/e2e/rankedReorder.spec.mjs`: if the order changed a row must
   have travelled, and if nothing was reranked nothing may animate.

   **The near-miss is the point of the standing rule.** It was first
   wired to `.qidx`, the legacy ranked index, which returns null in
   elegant mode — the shipping mode. Ten green unit tests over a FLIP no
   host could ever see. The correction is recorded in place at
   `HostShellV2.jsx:8594-8598` so the next person does not repeat it.
2. **The last named micro-motion items** (`547919e2`). Focus parity now
   reaches `.mini`, `.path-row` and `.navrow` (`styles.css:3641`, inside
   the hover-capable block, with finding 17 cited above it) — `.mini` is
   the app's most-used button and was the worst one to have missed.
   `.fg-track i` moved onto the compositor (`:2458-2460`:
   `width:100%; transform-origin:left center;
   transform:scaleX(var(--fill,0))`), radius deleted rather than moved
   because the track already clips. And the final three off-ladder
   `cardin` literals folded into the arrival gate: grepping `cardin`
   across `HostShellV2.jsx` at HEAD returns exactly one animation-shorthand
   site (`:3563`, `var(--ms-enter)`) inside `rowEnter`, used at 18 call
   sites. **Zero literals left.** `.mbar i` deliberately stays on `width`
   and now says why in place (`:3676-3682`): it is a `display:flex`
   multi-segment chart, so scaling one segment overlaps rather than
   stacks, and the hairline guard directly above keys on the inline style
   string containing `"width: 0%"`, which a custom property would
   silently break. That is a recorded decision, not an outstanding item.
3. **Day-of copy is day-aware at the source** (`a1cf8929`). At T-0 the
   surface read "TODAY · YOUR DAY-BEFORE PLAN" over a module headed "How
   tomorrow starts" — the window runs T-2 through T-0 and only the
   headline was ever day-aware. Fixed where it is generated: the `cues`
   section's `label` in `src/lib/dayBefore.js:172-175` is now
   `daysOut === 0 ? 'How today starts' : daysOut === 1 ? 'How tomorrow
   starts' : 'How the day starts'`, and the shell's `case 'cues'`
   (`HostShellV2.jsx:8716`) returns `sec.label` instead of restating it.
   The eyebrow above it is day-aware too (`:8671`, "Today · your final
   run-through"). Four tests in `src/lib/__tests__/dayBefore.test.js`
   under a PREMISE-first block — the premise test asserts the section
   exists across the window before the three day-cases assert what it
   says — and red-proofed.
4. **The span-gated door finally has an event to open on** (`a1cf8929`).
   `sectionDirectory.js:62` gates "Your days · The plan, day by day" on
   `spanNights(ev) >= 1`, and NOT ONE of the 26 seeded events carried a
   span, so the predicate was false everywhere and the door had never
   rendered on any event in the app. The multi-day programme engine had
   been built, wired and shipped for weeks with nothing to run on.
   `TEST_MULTI_DAY` (`hostv2/src/eventPool.js:179`, "Test — Team Retreat
   (3 days)") now seeds one, registered in BOTH `ROSTER` (`:294`) and
   `ALL_SAMPLES` (`:292`) — the note at `:288` records that adding it to
   `ROSTER` alone was the first attempt and left it out of the resolver's
   lookup set. Gated by `hostv2/e2e/multiDayDoor.spec.mjs`, three tests,
   including the red-proof that a single-day event still does NOT get the
   door and one that the door lands on the programme rather than a dead
   tap. Driven live: eight day-parts, Friday arrivals through Sunday
   departures, with authored content, venue readiness rows and
   what-to-bring.

Verification run: jest 6090 passed / 1 skipped across 428 suites; the
full Playwright matrix 617 passed / 195 skipped, zero failures, all eight
projects.

NOT CREDITED, checked and confirmed still open:

- Send covers ONE of 26 draft generators (the vendor case); the other 25
  exit to the clipboard, and the Resend webhook is unproven, so
  `delivered` cannot exist.
- `playbookMilestones` and `playbookTasks` still have zero hostv2
  imports.
- Ownership shipped no code. The board ruled 6-2 to ship a narrow
  version and it is not built — `2026-08-21_TASK_OWNERSHIP_RULING.md`.
- Vendors ruling items 2, 3, 5 and 6 — `.frow` metrics, the `.vc-chip`
  base off `--warn`, the settled fold, the desktop on-demand detail panel
  — all untouched, so the desktop dead third remains dead.
- The stranger-proof onboarding test has not been run.

What moved:

- **Animation 8 -> 9.** This is the one cell where the standing principle
  cuts the other way, and it is worth being explicit about why. FLIP's
  absence was not a defect the 8 was awarded without noticing — the
  motion audit named it as finding 2, this document's own table named it
  as the whole of the gap in three consecutive re-scores, and the audit
  sequenced it LAST as the highest-risk change precisely because it was a
  capability the app did not have rather than a fault in one it did. The
  8 was awarded with the absence fully in view and priced in. Building it
  is therefore a capability gain, and the fact that it landed on the list
  that IS the product's claim — the app says it knows what to do next and
  says it by order — is what makes it worth a point rather than a
  footnote. Both absences named against this cell are now closed: the
  reorder is legible as movement, and with the last three literals inside
  `rowEnter` the entrance fires when something actually arrives rather
  than on every remount. Not 10, and specifically: FLIP covers one list.
  The call-sheet, vendor and checklist lists still cut, and there is no
  shared element and no view transition anywhere, so an app that now
  answers "what just moved" within a surface still cannot answer it
  ACROSS one. The `.qidx` misfire is the evidence that coverage is a real
  question and not a formality.

What did not move, and why:

- **Micro motion holds at 8.** Genuinely close, and the argument for 9 is
  real: the dock this document stated was distribution of press/settle
  feedback, its closing sentence was "every interactive atom answers
  every input the same way; three atoms still do not", and those three
  now do. A fill also came off the main thread and the duration ladder is
  clean rather than cleaner. But the third item the 8 named is still
  live: the readiness digit cuts while the bar beside it glides, which
  this document already described as reading like a bug on the surface a
  host looks at most. A dimension carrying a visible motion defect on its
  most-looked-at surface is not a 9 against Linear and Family, however
  complete the parity behind it. The gap line is now materially shorter —
  the digit, `.bline i` / `.bline b`, `.wxpill` — and that is the whole
  of it.
- **Workflow holds at 9.** The seed is the cleanest example in this
  document of the principle it keeps applying. A span-gated door that had
  never rendered on any event in the app is a defect the 9 was awarded
  without noticing — worse, the third re-score credited that door as
  "driven live end to end", which was true of the code path and false of
  every event a host could actually open. What changed is that the credit
  is now observable rather than asserted; the capability was already
  counted. Day CRUD across the span is still the whole distance to 10.
- **DIFM holds at 9.** Eight day-parts of authored programme content
  becoming reachable is real breadth, but it is breadth this cell was
  already credited for on the engine's existence. The stated gap is
  sending, and neither the webhook nor the 25 clipboard exits moved.
- **Attention holds at 9.** Day-aware copy stops the app contradicting
  itself at T-0, which is honesty craft inside a 9, not the named gap.
  The gap line gains two newly observed items from the marketing capture
  — the per-vendor send ledger against Blink's whole-list answer, and the
  checklist reading "280 days past its window" on a wedding 85 days out —
  but observing a gap does not lower a score any more than repairing an
  unnoticed one raises it.
- **Modern UI/UX holds at 8, design holds at 9, less friction holds at 8,
  ease of use holds at 8.** No vendors-ruling item moved, send is
  unchanged, the stranger test has not been run. Modern UI/UX's gap line
  gains the 1920 dead band below the app frame, from the same capture.

Line references corrected against HEAD: the three `cardin` literals
previously cited at `HostShellV2.jsx:14557` / `:14595` / `:17781` no
longer exist; `.wxpill{transition:bottom}` is at `styles.css:2906`, not
:2877 or :2896; `.mbar i` is at `:3682`, not :3636. And one item this
document listed as an open gap was misattributed: "the invite bar
(`:2455`)" was `.fg-track`, which is now on `scaleX` — so the count of
layout-animating fills goes from four to two, not three.

**Recompute: 9 + 9 + 8 + 8 + 9 + 9 + 8 + 8 + 9 = 77.**

**Overall now: 77/90 (86%)** — 76 -> 77, the single point on Animation.

## The honest line on "10s across the table"

Nine 10s against Linear, Partiful, Paperless Post and Blink is a
multi-sprint product arc, not an overnight loop: the remaining points
are majors (send beyond the vendor case, day CRUD, the on-demand detail
panel, the vendors ruling's remaining four items, FLIP across the other
ranked lists) plus one observation only real strangers can produce. The
day moved the table 63.8% → 86% with every point tied to a driven, gated
build. Inflating the remaining cells would break the scoreboard's only
value, which is that it is true — which is why the two motion cells
moved one point each and not two when the motion audit landed, why the
coverage-and-reconcile session moved exactly one cell out of nine, and
why this session moved one as well: four shipped items, of which exactly
one built a capability the table had priced as absent. The other three
repaired defects the scores already implicitly claimed we did not have,
including a door that three re-scores had credited as driven while it
had never rendered on a single event a host could open.

## ✎ Corrections to the auditor's report (checked at HEAD)

1. **"`@media (hover:hover)` guards still 0" is FALSE.** styles.css:3491
   carries a dedicated STICKY HOVER section — `@media (hover:none)` resets
   every decorative hover rule (the reset idiom, not the guard idiom; the
   auditor grepped only for the guard). Micro motion 6→7; its remaining
   dock is distribution of press/settle feedback, not a defect.
2. **"hostExperience/hostCapacity wired in the engine, dead in the shell"
   is STALE.** The settings sheet ("How you plan", HostShellV2.jsx:14685+)
   collects both into the profile, engine reads profile fallbacks
   (playbooks/index.js:3086-87, :3121-22). Neither inferred; unanswered
   stays neutral. DIFM's top gap moves to sending.
   Lesson (again): a scored claim sourced from a prior audit doc must be
   re-grepped at HEAD before it ranks a build queue — both "near-zero-cost
   fixes" the auditor ranked were already shipped.

## The build queue this re-score actually justifies

1. **Per-day programme schema** — the recorded keystone ("converts existing
   intelligence from working once to working across a span"); ceiling on
   Workflow, Animation-of-work, and the reunion market. Long-standing
   "heads the queue" item, and now the ONLY thing between Workflow and a
   10: `46909fa8` made the plan work across a host's CHANGES, which is
   the other half of the same sentence; day CRUD across the span is what
   remains.
2. **The comms outlet** — send with Blink's three not-dones designed in
   (`Not Sent` / `Pending` / `Send Failed`). The single largest write-off
   of built capability: we draft everything and send nothing. Unblocks
   Less friction, Attention, and DIFM together. (Comms freeze is an Event
   Boss redesign/audit-scoped decision — reopening comms for BUILD is a
   board question first.)
3. **Vendors ruling items 2, 3 and 5** — `.frow` metrics, `.vc-chip` base
   off `--warn` (red-proof it by reintroducing a two-amber card), settled
   fold. The three named blockers between Design and a 10, and the
   cheapest points left on the table.
4. **The desktop detail panel** — the dead third at 1920 (vendors ruling
   item 6), permitted by the standing ruling; also answers the spacing
   read's right-panel pattern (5/5 leaders), and is the one thing between
   Modern UI/UX and a 10.
5. **Stranger-proof onboarding test** — not a build, the observation that
   grounds Ease-of-use's 8 (also stage-9 precondition 3).
6. **The motion continuity remainder** — nearly closed. The audit landed,
   `76cc7a76` worked six of eight shortlist items, `ae2c99da` gated the
   `cardin` stagger to arrival, and `547919e2` built FLIP, closed
   finding 17's focus parity and folded the last three literals into
   `rowEnter` (zero left, 18 call sites). Animation is at 9. What
   remains is short: the readiness digit tweened with its bar — the one
   visible motion defect left, and the whole of what holds micro motion
   at 8; `.bline i` / `.bline b` (`styles.css:1627`, `:1629`) off
   layout; and `.wxpill{transition:bottom}` (`:2906`). `.mbar i` is
   settled — it stays on `width` by a decision recorded in place, and
   should not be re-opened. Beyond that, FLIP's coverage: it is wired to
   `.ef-list` only, and the call-sheet, vendor and checklist lists still
   cut. Carry forward unchanged: UX_01:154's "no bounce" line is
   contradicted by a later host ruling and needs an exception noted or a
   re-ruling.
7. **A multi-day event now exists to test against** — `TEST_MULTI_DAY`
   is seeded and gated, which means the per-day schema work in item 1 can
   be driven rather than reasoned about. Worth knowing before starting
   it: the span-gated door had been dead across all 26 events since it
   shipped, so any surface downstream of `spanNights(ev) >= 1` should be
   treated as unproven until driven on this seed.
8. **Three findings from the marketing capture**, recorded so they are
   not lost: the 1920 frame leaves roughly a fifth of the viewport dead
   below it; the checklist can read "280 days past its window" on a
   wedding 85 days out, which is a playbook-runway artifact producing
   false urgency; and the send ledger answers "did the asks go out" one
   vendor at a time where Blink answers it for the whole list. The first
   sits under Modern UI/UX, the other two under Attention. A companion
   `2026-08-21_MARKETING_SHOT_SET.md` was cited for these; it is NOT in
   `docs/audits/` at HEAD, so the three lines above are the only record
   of them and should be treated as the source until that file lands.

## Where we genuinely lead (the moat, per the recorded reads)

Blink — the closest positional competitor, funded, using our exact
"command center" phrase — "counts inventory, not readiness … it cannot
tell a host whether the event is ready. That is the moat." Stacked with
the three capabilities the 922-flow Mobbin sweep found nowhere else: the
26-generator draft engine ("we write the thing"), group arrival/transport
modeling, and defer-as-a-primitive at Linear's level. The category's
presentation leaders have no guidance; its guidance leader (Wanderlog)
has no readiness. Event Boss is the only product in the recorded evidence
that computes whether the event is ready, says why, proposes the fix, and
drafts the message — it just can't yet send the message or run twice
across a span. Those two absences are exactly build-queue items 1 and 2.
