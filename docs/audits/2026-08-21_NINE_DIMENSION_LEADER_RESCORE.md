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

## Score table — CURRENT (as of the widescreen-parity session)

Each row is the score as it stands now; the "remaining gap" column is the
one specific thing between that dimension and a 10, and is what the next
session works from. The progression that produced each number is recorded
in the re-score sections below.

| Dimension | Bar-setter | Us /10 | Remaining gap to 10 |
|---|---|---:|---|
| Workflow | Wanderlog (Partiful on creation) | 8 | Day CRUD: add / move / delete a day inside the programme span |
| Design | Paperless Post / Vercel craft | 9 | Vendors ruling items 2, 3, 5: `.frow` metrics, `.vc-chip` base off `--warn` (red-proofed), settled fold |
| Modern UI/UX | Linear | 8 | The on-demand detail panel at >=1200px (vendors ruling item 6) — the desktop dead third is still dead |
| Micro motion | Linear / Family | 8 | The digit still cuts beside a gliding bar; four of five fills still animate layout; `.mini` / `.path-row` / `.navrow` still have press but no focus response |
| Animation | Family / Partiful | 8 | No FLIP or shared element on list reorder — ranked rows still cut to new positions — and the `cardin` list stagger still replays on every remount |
| Attention systems | Blink | 9 | `Send Failed` exists only on the email path, so the three-not-dones model is not complete across channels |
| Ease of use | Evite / Apple HIG | 8 | Run the stranger-proof onboarding test — the score is asserted, not observed |
| Less friction | Partiful | 8 | Send covers the vendor case only; the other 25 draft generators still exit to the clipboard |
| DIFM | Joy (breadth) — the set's bar is ours | 9 | Resend webhook proven live so `delivered` can exist, and send beyond the vendor case |

**Overall: 75/90 (83%)** — up from 63.8% (07-13 audit) via 67, 70, 72, 73.

Micro motion and animation are no longer pending. Both were held at 7
awaiting the motion audit; that audit landed
(`2026-08-21_MOTION_AND_MICRO_INTERACTION_AUDIT.md`), six of its eight
shortlist items shipped in `76cc7a76`, and both cells move to 8 on the
evidence. The reasoning is in the fourth re-score section below. Every
cell in this table is now scored from a current code check.

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
| Workflow | 7 | 8 |
| Design | 8 | 9 |
| Modern UI/UX | 7 | 8 |
| Micro motion | 6 (7 ✎) | 8 |
| Animation | 7 | 8 |
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
  below. An app that answers "where did this come from" but not "what
  just moved" is an 8 against Family and Partiful, not a 10.

Is either a 10? No, and the gap is not subtle. A 10 on animation in this
category means a list whose reorder is legible as movement and an
entrance that fires when something actually arrives. We have neither.
The list that closes both cells is short and concrete: FLIP on the
ranked-decision and call-sheet lists; the first-mount gate on `cardin`;
the digit tweened with its bar; the four remaining layout-animating
fills; `.mini` / `.path-row` / `.navrow` focus parity. That is what the
next session works from.

What the check corrected: two things the commit narrative would have
over-credited. `cardin` tokenization covered 14 sites but **three
literals survive** (260ms at `HostShellV2.jsx:14418` and `:14456`, 300ms
at `:17613`) — the ladder is cleaner, not clean. And the focus-parity
item closed finding 16, not finding 17: the three atoms that gained
parity are not the three finding 17 named.

**Recompute: 8 + 9 + 8 + 8 + 8 + 9 + 8 + 8 + 9 = 75.**

**Overall now: 75/90 (83%)** — 73 → 75, two points, one on each motion
cell.

## The honest line on "10s across the table"

Nine 10s against Linear, Partiful, Paperless Post and Blink is a
multi-sprint product arc, not an overnight loop: the remaining points
are majors (send beyond the vendor case, day CRUD, the on-demand detail
panel, the vendors ruling's remaining four items, FLIP for list reorder)
plus one observation only real strangers can produce. The day moved the
table 63.8% → 83% with every point tied to a driven, gated build.
Inflating the remaining cells would break the scoreboard's only value,
which is that it is true — which is why the two motion cells moved one
point each and not two, with the specific absences named rather than
waved at.

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
   "heads the queue" item; still true.
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
6. **The motion continuity remainder** — RESOLVED as a queue item in its
   original form: the audit landed, `76cc7a76` worked six of its eight
   shortlist items, and both cells are now scored from a current code
   check at 8. What replaces it is specific: FLIP on the ranked-decision
   and call-sheet lists (the largest continuity gap, and correctly
   sequenced after sheet-origin, which has now shipped); the first-mount
   gate on the `cardin` stagger; the readiness digit tweened with its
   bar; the four remaining layout-animating fills plus `.wxpill`; and
   focus parity for `.mini` / `.path-row` / `.navrow`. Also carry
   forward: UX_01:154's "no bounce" line is now contradicted by a later
   host ruling and needs an exception noted or a re-ruling.

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
