# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-08-29.
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `0283a9f8` |
| Jest | **6,179 passed**, 1 skipped, 432 suites — measured this pass |
| Backend pytest | **353 passed** (unchanged; not re-run this pass) |
| e2e (Playwright) | full matrix **791 passed**, zero failures (all 8 projects, 19.3m) |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |
| Path to Production | stage **6 PASSED WITH CONDITIONS**, ruled by Todd 2026-08-29. Stage 7 open |
| Standing conditions | **9**, gating stage 9 (Promotion) — 6 security, 3 marketing. No paid spend authorized |

## Path artifact

| Artifact | URL | Source |
|---|---|---|
| The First Recorded Gate | https://claude.ai/code/artifact/7f14f1d1-209a-4686-8615-61564542f6db | `docs/artifact/the-first-recorded-gate.html` |

Republish that same file path to keep the URL stable. Its `Recorded` date must
equal the newest gate record's date, or it is stale by definition.

## What shipped 2026-08-29

**The Helpers panel became actionable.** It was the canonical ownership view
and was read-only: a host saw "not confirmed" beside a name and had nowhere to
act on it. The chip is now the control (`HostShellV2.jsx`, Helpers panel), with
a 44px tap target and an aria-label naming both the person and the act.
`handled` is deliberately NOT offered — the work is already finished, and
confirming a promise about something done is a control with nothing behind it.
Three e2e tests in `hostv2/e2e/helperConfirm.spec.mjs` (confirm, unconfirm,
survive reload); red-proofed by making the handler inert and watching all three
fail. Closes item 4 of the previous session's queue.

**The project's first Path to Production gate.** It had deployed publicly and
continuously since 3 August with *no gate ever recorded at any stage*. Stage 6
(Deploy) is now on record as `not-yet`, recommendation `passed-with-conditions`,
awaiting your ruling — only the owner rules a gate. Stages 0-5 are recorded as
"no gate," not as passed: work exists behind several of them, but a stage marked
done because work happened rather than because a gate passed is exactly the
failure the artifact exists to prevent.

## What shipped overnight 2026-08-22

**The corpus had no post-event phase, and nobody had noticed.** Measured:
91 pre-event tasks, 15 day-of, ZERO after, across all ten types. Now 37
post-event tasks in all ten (143 rows, up from 106; content-library depth
137 -> 225 steps). Mechanism: NEGATIVE `offsetDays`, which the engine
already supported (`dueDate = eventDate + (-offsetDays)`) and nothing had
ever used. They land on a new **"After the Event"** workstream assigned by
RULE -- any negative offset -- not by category, so a future one cannot be
filed wrong by forgetting to mark it. `content-mappings.mjs` +
`extract-content.mjs`. No workbook change needed: the Workstream column has
no data validation, so the value is written, not picked.

**Design's counting fault is closed and red-proofed.** `Everyone` carried a
count while the default lens folded settled vendors away. Fixed to the
leaders' shape (Linear/Plane/ClickUp/Asana put counts on GROUPS, never on
an all-lens). The settled-vendor seed the eighth and ninth re-scores both
named and neither ran is now done -- `isInformal` is what short-circuits
accountability to on_track; a confirmed status alone is not sufficient. The
same fault was found one screen over in the guest roster, which counted the
raw array while its rows were search-filtered, and nothing covered it.
Gate: `hostv2/e2e/lensCountsMatchRows.spec.mjs`.

**TRAP THAT COST TIME TWICE.** A Playwright red-proof runs against the
BUILT bundle. Editing source and re-running the spec proves nothing -- both
of my first two red-proofs passed against a stale build and looked like the
gate was broken. `npm run build` between the edit and the run, every time.

**Also:** `template-products/` is now under git (it was untracked -- the
whole product line, no undo). Four Notion niches built and verified by diff
against the generated CSVs. Four Etsy mockup squares. Four FALSE listing
claims fixed and the numbers now derived at build time from canonical.

## What shipped the previous session

1. **Path to Production audit** — all 10 stages, `docs/audits/2026-08-21_PATH_TO_PRODUCTION_AUDIT.md`.
   Stages 1–4/6/8 pass, 5 + 7 worked below, 9 pending (D-2 preconditions).
2. **Stage 5 hardened** — `backend/tests/test_protected_routes_sweep.py` is a
   standing per-route gate over 8 sensitive routers (source gate + reasoned
   PUBLIC allowlist + bare-401 sweep). It caught `verify-session`
   unauthenticated on its first run. DocuSign token moved out of the URL;
   all comm reads/writes gated. Checklist: `2026-08-21_SECURITY_TRACK_CHECKLIST.md`.
3. **Admin console** — 3-seat board, stage 2 + 4 passed after fixes
   (`2026-08-21_ADMIN_CONSOLE_INTERNAL_REVIEW.md`). Corpus actions now reach
   `admin_audit_log`; retirement ruled standalone-capable (zero App.js imports).
4. **Build queue** — "Your days" span-gated door; the **send ledger**
   (board 6-0, `2026-08-21_COMMS_OUTLET_RULING.md`): handed_off is
   host-attested, never "Sent"; vendor drafts log contact in the same
   gesture; email slice (b) records the SERVER's answer only.
5. **Vendors sheet** — 8-seat ruling (`2026-08-21_VENDORS_SHEET_RULING.md`):
   collapsed face is one band, one ranked chip, amber demoted from default.
6. **Desktop/widescreen parity** — one frame + one measure across all 13 rail
   sections; heroes added to the 3 that lacked them. The top "Jump to a
   section" menu was a duplicate of the rail and no longer renders when the
   rail is up; its three non-section doors moved into a rail group.
7. **Collapsible rail + splash corner** (`a259ecd7`) — the rail drops to a
   64px icons-only band, persisted per browser, every door still named and
   still clearing the 44px tap floor. The splash was painting the phone's
   48px bezel inside the 20px desktop frame; it takes the frame's corner now.
   Two new gates, both red-proofed: `railCollapse.spec.mjs`,
   `frameCorners.spec.mjs`.

8. **Motion shortlist worked** (`76cc7a76`) — sheets now rise from the point
   that opened them (the audit's one real gap: continuity); a live
   reduced-motion defect closed (`.rowfocus` ring was stuck on permanently);
   `.bar i` moved to `scaleX`; the 300-900ms band named at the token source;
   `cardin`'s list stagger gated to arrival instead of every redraw. Gate:
   `motionContinuity.spec.mjs`, all four red-proofed.
9. **The rail stopped drifting** (`ae2c99da`) — host reported the desktop menu
   "jumping, dizzying". `.stagewrap` had `overflow:hidden`, which still permits
   programmatic scrolling, so every row landing scrolled the frame and the rail
   walked off the top with no scrollbar to bring it back. `overflow:clip`.
10. **The checklist follows the decisions** (`46909fa8`) — the audit's #1 item,
    shipped. `src/lib/checklistReconcile.js` merges `playbookChecklist(event)`
    into `event.timeline` instead of freezing it at creation: derived rows
    append, stored rows keep `done`/`owner`/host edits, gated-out `pbt-` rows
    are marked `retired` (never deleted) and revive in place carrying `done`,
    host-written rows are never touched, and an empty derivation is treated as
    no-information so the 9 typeless types cannot wipe a list. Wired as a
    `useEffect` on the event and the gate inputs (`HostShellV2.jsx:5125-5152`);
    retired rows leave the "N of M" DENOMINATOR as well as the numerator
    (`:15387`). Gates: `checklistReconcile.test.js` (9, against the real
    generator) and `checklistFollowsDecisions.spec.mjs` (3, red-proofed by
    unwiring the call). **The catch-up pass is silent** — the first reconcile
    per event per session patches with no toast; announcing it put a banner
    over the controls 12 specs were reaching for.
11. **Sheet-origin motion, finished** — `@keyframes panelrise` is origin-aware
    too (`styles.css:3367`); wiring only `sheetrise` had left the centered-panel
    breakpoint on the old constant. And the shell now measures the sheet with
    its animation temporarily off (`HostShellV2.jsx:3560-3576`): measuring
    through the entrance transform put every origin exactly 24px short.

## The evening block (compressed — details in the audits + git log)

- **Ownership shipped at the board's scope** (`e006f52d`): row-level assign
  writing roster-resolved names to `timeline[].owner`; `<Name> — not told
  yet` copy (Norman's condition); the `helperConfirmed` writer hostv2 never
  had; retired rows carry no responsibility and reconcile names the person
  whose job left the list.
- **FLIP on "Then, in order"** (`547919e2`) — first wired to `.qidx`, which
  returns null in the shipping mode: ten green unit tests over a surface no
  host sees. Rewired to `.ef-list`, driven. Animation 8→9.
- **Vendors ruling clauses 2–4 closed**; day-of copy truth at T-0; multi-day
  span seeded (`TEST_MULTI_DAY` — in BOTH `ROSTER` and `ALL_SAMPLES`, the
  second registration being the fix's own near-miss); "280 days past its
  window" capped at the 60-day countability line.
- **Template line program**: `products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`
  (5 workstreams, seasonality-sequenced launch calendar) on the evidence of
  `docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md` (US-scoped,
  amended after the owner caught the missing Oct–Dec hosting arc).
- **Template line executed to the W2 gate** (evening): seasonal research
  (US-scoped, Halloween amendment) -> program spec
  (`products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`) -> W3 done (10
  types, FIVE niche workbooks, QA 75->132, whenChoice gates live in the
  sheet) -> engine delta audit done (7 stale claims, 5 ranked ports) ->
  Reunion enriched (`4d10920a`: decisions 5->9, tasks 24->44, all gated,
  byte-identical local-host invariance) -> template QA re-run 132/132.
  Two artifacts published (When Hosts Buy; The Template Line). Next in
  line: W3.5 engine round per the delta audit; PTA/booster playbook;
  `home_hosted` budget-share family (a home Thanksgiving currently shows
  Venue/Catering bands). W2 + brand/pricing/funnel/disclosure = Todd.
- **Three playbooks authored + grounded** (`4da9dfde`, `3c39884e`):
  Thanksgiving Hosting (24 tasks), Halloween Party (22), New Year's Eve (14,
  midnight-anchored ROS as its stated distinctness). Corpus now 44. Eleven
  new source ids (AFBF, FSIS thaw/temps, CDC/NHTSA Halloween pedestrian,
  NRF, champagne-pour standard…); gap counts dropped 7→6 / 8→7 / 6→4; the
  corroboration ratchet reverted four single-source upgrades — the reason
  is in their notes, the gate was not touched.

## Scores

`docs/audits/2026-08-21_NINE_DIMENSION_LEADER_RESCORE.md` — **77/90 (86%)**
vs 63.8% on 07-13, via 67→70→72→73→75→76→77. Decision engine 42/50
(unmoved; its next lever is the ownership ruling now BUILT — re-score it).

## The rulings that now govern this work

Three boards sat on 2026-08-21. Read the ruling before touching its area —
each one rejected something, and the rejections are the load-bearing part.

- **`2026-08-21_TASK_OWNERSHIP_RULING.md`** (6-2 ship, narrow). BUILT. Assign
  writes a roster name to `timeline[].owner`, notifies NOBODY, and says so:
  `<Name> — not told yet`. Rejected outright: importing `playbookMilestones`
  (the join is 123/408 and the owners are role words) — dead, not deferred.
- **`2026-08-21_GUEST_TRANSPORT_RULING.md`** (6-2 DEFER guest sending).
  Dissent from BOTH directions: one seat wanted a capped guest batch, another
  wanted the vendor path deleted entirely. Its measurements are the reason
  this session changed course — see below.
- **`2026-08-21_VENDORS_SHEET_RULING.md`** — all six clauses now shipped.

## The pattern that cost the most today

Not a bug — a class. Seven times something was **built, correct, and
unreachable**, and each was found by looking rather than by any gate:

- `playbookDayOfChecklist`, `playbookMilestones`, `playbookTasks` — finished
  engines with zero hostv2 imports.
- FLIP mounted on `.qidx`, which returns null in elegant mode (the shipping
  mode). Ten green unit tests over a surface no host sees.
- The span-gated "Your days" door, with no seeded event carrying a span.
- The seed that fixed it, registered in `ROSTER` but not `ALL_SAMPLES`.
- **The vendor send button, which renders on zero events** — one of 24
  `openDraft` sites passed a `vendorId` and `emailTarget` requires one. The
  transport this repo describes as working had never fired.

Its mirror: five times a **probe was wrong, not the product** — a source slice
scoped to one card, `settled()` between a click and a toast, an assertion on
`.app` for a toast that renders outside it, zero-WIDTH asserted on a
`max-height:0` panel, a `> 4` row count taken from a desktop run.

And once a test **ran, passed, and proved nothing**: the lens gate asserted
`chip === rows` on a chip reading 0, so `0 === 0` was the whole evidence while
the control was visibly broken. That one shipped the same arithmetic fault
three times.

**The question none of these were asking: is this check actually looking at
the thing it claims to check?** Red-proofing and independent verification
caught every one. Three claims of mine were falsified by a verify pass this
session — the vendor money that had no tabular-nums, and both lens faults.

## Next, in order

1. **The transport board's queue**, non-transport and none of it needs the
   webhook: per-recipient handoff recording on the guest rails; the roster
   told/not-told read (`Told 24 of 41 — 17 still to tell`).
2. **Day CRUD across a span** — Workflow's named gap, and newly TESTABLE
   because `TEST_MULTI_DAY` now exists. Was unbuildable before: no seeded
   event had a span.
3. Author the 16 `synthesized` purchases in clientDinner/fundraiserGala with
   real citations. Today ADDED to the grounding backlog rather than reducing
   it — honestly, but it is now owed.
4. ~~`helperConfirmed` has a writer but no surface shows the confirmed state~~
   — **DONE 2026-08-29**, see above.
5. ~~Rule the stage 6 gate~~ — **RULED 2026-08-29: passed with conditions.**
   Deploy is closed; stage 7 (Handoff) is now the open stage.
6. **Work the nine standing conditions.** They gate stage 9 and are in force
   NOW, not later, because the surface is already public. Six are security
   (external pentest; finding #8 portal authz, a board question; and four
   attestations only you can make — RLS applied-status, backups plus one real
   restore, login rate limiting, Sentry DSN reporting in prod). Three are
   marketing: the acquisition thesis is unwritten, the stranger test has not
   run, and economics are unproven — **so no paid spend is authorized.**
7. Stage 7's own items: instrumentation and tracker sync, and per-asset
   attribution. Both are re-run retroactively at stage 9, so doing them once,
   properly, now is the cheap path.

## What only you can do

These are not blocked on engineering and will not move without you:

- **Run the stranger-proof onboarding test.** Ease of use is asserted at 8,
  not observed. Nobody outside this project has used it.
- **Prove the Resend webhook live.** Until then `delivered` cannot honestly
  exist, and DIFM/Attention both sit against that.
- **Send one real vendor email end to end.** Now possible for the first time:
  put an address on a vendor, sign in, and the send path is reachable. That
  run is the precondition for everything above it.
- **Grounding** is authoring, not engineering — capped at 9 by the
  cultural-basis ruling.

## The artifact is gated now

`hostv2/e2e/pathArtifact.spec.mjs` — three tests over the "Hide completed"
toggle the path-artifact skill requires. The one that matters asserts every
NOT RUN item is still visible with the toggle on: the naive selector catches
`.mark`, which would bury exactly the findings the page exists to surface.
Red-proofed by widening the selector to `.mark` and watching it go red
(4 not-run items visible expected, 0 received), then restoring from a copy
rather than `git checkout --`.

## The conditions, verbatim

The server turned the ruling into a standing `conditional` flag that persists
past stage 6 — that is what a conditional pass is for. Read them off the
artifact or `~/Code/skill-index/cache/ptp-gates.json` (record 32); do not
re-derive them from memory.

A conditional pass is not a finished security track, and it is not permission
to spend money.

## Traps that cost time here

- **Artifact stage items come from the spine, never from a summary.** Writing
  them out of conversation memory produced three different defects on one page:
  an invented task (stage 3 has no gate by design, and the page demanded one),
  four omitted gates (including stage 2's reference-scan ordering rule, the very
  failure the command exists to prevent), and one softened gate (stage 1's real
  gate is *name who hits this problem today*). Read
  `~/Code/ngw-os/docs/path-to-production.md` and count obligations against
  items. Now written into the path-artifact skill (`c78aff4`).
- **A geometry check is not a look.** The artifact passed 11-stages /
  zero-horizontal-scroll / no-JS-errors at six viewport-theme combinations
  while two stages rendered their numbers one word per line. Cause: switching
  the item rows to CSS grid promoted every inline `<span class="num">` to its
  own grid cell on its own row. Flex had the opposite failure (an anonymous
  text box floors at min-content and pushes the row past the viewport). A
  hanging indent has neither. **Screenshot after the measurement passes**, and
  count rendered lines per row as part of the check.

- **A deployed bundle's hash proves nothing against a LOCAL build.** Nearly
  reported a stale Pages deploy today: the live `HostShellV2-*.js` hash did not
  match the local build while the CSS hash matched exactly, which looks precisely
  like the recorded staleness trap firing. It was not — CI injects `REACT_APP_*`
  repo variables the local build lacks, so content and therefore hash differ
  legitimately. Probe the deployed bundle for a **feature marker** shipped in a
  known commit instead.
- **`minmax(0,1fr)` and anonymous flex items.** Three wrong diagnoses in a row
  chasing 17px of horizontal scroll on the artifact page. A `1fr` grid track and
  a flex item both floor at min-content; worse, an item made of a bare text node
  is an *anonymous* box with no element to set `min-width:0` on. Measure which
  leaf overflows, then hide top-level children one at a time to find the owner —
  do not reason about the cascade.
- The **browser pane** stops accepting clicks after a few interactions and
  never clicks at desktop widths. Drive with Playwright instead.
- **Four false-zero probes** in one session (grep missed a chunk; a class-name
  counter missed a quote style; `hit.contains(el)` counted ancestors; a raw
  token compared against computed `rgb()`). Red-proof every gate.
- **A door that moves with the viewport belongs in one helper.** Hiding the
  duplicate "Jump to a section" row at rail widths turned ten e2e specs red at
  `desktop` and `wide` while the app itself was fine; I fixed exactly one
  (`a11yFloor`) because it was the one my local desktop run happened to
  execute, and left nine carrying the old inline phone path. The door is now
  `openSectionByName(page, name)` in `hostv2/e2e/fixtures.mjs` — it uses the
  rail when present and the two-tap menu otherwise. Running one project
  locally is not running the suite.
- **A new toast is a new obstacle.** The reconcile's announcement broke 12
  specs on click timeouts by sitting over the controls they were reaching for.
  The specs were right: it was a banner nobody had asked for.
- **`addInitScript` re-runs on EVERY navigation.** An unconditional
  localStorage seed rewrites the pristine state over the host's own on
  `reload()` — indistinguishable from app data loss, and I filed it as such
  before the harness was ruled out. Guard the seed; assert SURVIVAL across a
  boot, never the write (the write lands even when the value is about to be
  destroyed). `docs/audits/2026-08-21_CUSTOM_EVENT_PERSISTENCE_DEFECT.md`.
- `git checkout --` after a red-proof reverts the guarded edit too. Fault
  and restore with a targeted string swap instead.
- **Reading the CSS is not measuring it.** A reviewer derived "the frame
  narrows when the rail collapses" from the width formula; measurement at
  1440 showed the opposite, because the formula clamps on the viewport
  there and only binds at 1920. Both are correct at their own width. Any
  claim about a `min()`/`clamp()` layout has to name the width it holds at.
- The unit suite is `CI=1 npx react-scripts test --watchAll=false` from
  `demo/`. Bare `npx jest` scans node_modules and reports ~1369 bogus
  suite failures — a false red that looks exactly like a real one.
- Node 20 lives at `/usr/local/opt/node@20/bin`. Playwright leaves its
  preview server bound; `lsof -ti:5244 | xargs kill -9` before a re-run.
