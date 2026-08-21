# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-08-21 (dawn + midday).
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `0f62d4e2` — pushed, tree clean. The parallel session's tween work landed as its own `4d671f75` ("The digit moves with its bar", CI green): the readiness digit — micro motion's last named gap — is DONE |
| Last pushed | `4da9dfde`; `e006f52d` verified green (Checks + Pages) |
| Jest | **6,137 passed**, 1 skipped, 430 suites — measured this pass |
| Backend pytest | **353 passed** (unchanged; not re-run this pass) |
| e2e (Playwright) | full matrix **617 passed / 195 skipped, zero failures** (last full run); taskOwnership + rankedReorder + multiDayDoor + dayOfChecklist + checklistFollowsDecisions green since |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |

## What shipped this session

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

## The open finding that matters most

`docs/audits/2026-08-21_DECISION_ENGINE_AND_TASK_COVERAGE_AUDIT.md`.

The frozen checklist — that document's item #1, and the one that mattered
most — is **DONE** (see "What shipped", item 10). What remains:

**The day-of list now reaches the host** (`3f0ad471`) — `playbookDayOfChecklist`
had zero hostv2 imports for months. Wired, with the generic floor stating
that it is a floor. **Client Dinner (26 tasks) and Fundraiser/Gala (41)**
are authored, so audit item #2 is closed end to end.

**Total silence is closed** (item #2 part one, `d35606e9`). Eight of the
nine typeless types now borrow a named playbook and produce 11–19 real
tasks; the borrow is stated on screen and in every row's provenance, and
"Other" stays honestly empty. Part two is open: **Client Dinner and
Fundraiser/Gala should be authored, not aliased** — and borrowed content
keeps its source's vocabulary, so a Town Hall's risks currently say
"directors".

**Ownership (audit item #4) needs a ruling, not a wire — measured
2026-08-21.** The milestone-to-task id join lands on 123 of 408 (30.1%),
and 350 of 408 milestone owners are "host" while the other 58 are generic
role words (coordinator, couple, organizer…). Seeding a row's owner from
a milestone would paint a label naming nobody. The real gap is
host-assignable ownership sourced from the ROSTER — a feature with
questions attached (who is assignable, are they told, what does an
owned-but-open row do to readiness), so it wants a board sitting.

**Two finished engines still have ZERO hostv2 imports.**
`playbookMilestones` (382 authored milestones) and `playbookTasks` (the
dated buy ladder). `playbookDayOfChecklist` was the third and **is now
wired** (`3f0ad471`).

**Still open on the reconcile itself:** it has not been driven through
the decision board's own control in a browser. The crab swap is pinned at
unit level against the real generator; two attempts at a browser walk
produced a flaky test rather than a failing feature, so it is recorded
open rather than papered over.

Day-of coverage itself is strong and should be left alone: a Cookout at
T-0 surfaces 18 run-of-show rows from 5h out through teardown.

## Next, in order

1. Push `3c39884e` once CI drains (watcher running; never push over an
   in-flight run). Then verify Checks green on it.
3. Template line W2 (**Todd only**): import
   `template-products/dist/NGW_Milestone_Event_Planner_MVP.xlsx` into real
   Google Sheets + desktop Excel + a phone. Gates all styling/mockup work.
4. W1.3 reunion enrichment (multi-day/travel/committee/cost-share into the
   Reunion playbook — turns five inert toggles real), then W1.4 PTA/booster.
5. Vendors ruling items 5–6: sheet toolbar; on-demand detail panel ≥1200px
   (also Modern UI/UX's named gap, with the 1920 dead band).
6. Comms: prove the Resend webhook live; extend send beyond the vendor case
   (Less friction's whole remaining gap — 25 of 26 generators still exit to
   the clipboard).
7. **Todd only:** brand name, pricing rails, free-funnel scope, Etsy AI
   disclosure; D-2's five preconditions, pentest, device AT passes,
   stranger-proof onboarding test.

## Traps that cost time here

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
