# Where We Are -- live status board

**THIS FILE IS THE ANCHOR. Update it at the end of every working session.**
Undated on purpose: there is exactly one of these, and it is always current. Dated
snapshots (`2026-07-17_WHERE_WE_ARE.md`, `2026-07-17_THE_PLAN.md`) are history.

**Last updated:** 2026-08-04

---

## 1. Branch state

**Branch:** `feat/lodging-cockpit-demo` - **HEAD `cee3e559`** - pushed, 5 ahead of
`origin/main` (`8093dfa2`). **One uncommitted file:** `hostv2/src/LodgingCockpit.jsx`.

**PR #70 MERGED 2026-08-03** (the 25-commit span-intelligence / knowledge-governance stack).
`main` has since taken #75-#78. The 2026-08-03 "25 commits UNPUSHED" state is closed.

**Two PRs open, both green on all six CI checks** (jest, e2e, backend, cra-build, hostv2-build):

| PR | Branch | What | Note |
|---|---|---|---|
| #79 | `feat/lodging-sheet-calm` | The lodging sheet leads with the decision, folds the machinery | `0be2c4bf` |
| #80 | `feat/lodging-cockpit-demo` | `lodgingStage(event)` cockpit at `?demo=lodging`, derived never stored | **contains #79** |

Both are based on `main`, and #79's commit is an ANCESTOR of #80 -- so merge #79 first, or
merge #80 and let #79 close itself out. Do not merge them as independent PRs.

**Uncommitted, unbuilt, undriven:** `LodgingCockpit.jsx` retires the file-local `.lc-cta`
button vocabulary for the app's real `.cta` / `.cta soft` atoms, and merges the paste + read
buttons into one whose label follows the box. Both moves are backed by
[`../audits/2026-08-04_BUTTON_AND_CTA_LANGUAGE_MOBBIN_READ.md`](../audits/2026-08-04_BUTTON_AND_CTA_LANGUAGE_MOBBIN_READ.md)
section 5. **Nothing in it has reached a browser yet.**

**Uncommitted, BUILT + DRIVEN (iOS-simulator session): `HostShellV2.jsx` pick-switch fix.**
The lodging `write()` fill-only-empty guard treated a previously DERIVED `lodging.hotelName`
("Option 1") as host-typed, so switching the pick never updated the stay — "Option 1 is the
plan" survived while the pick chip moved. Now derived-vs-typed is decided once (name matches
a shortlist label ⇒ derived, follows the pick); host-typed stays still win. Dead `parsedCity`
var in `saveVenue` removed. Proof: vite build + check-parity green; driven live on iPhone 17
Pro sim — unpick → "No place picked yet", re-pick → "Villa in Bondi Beach … is the plan".
Unfixed, filed from the same drive: single-day events emit zero-night search links
(checkin==checkout) with whole-event budget as `price_max` and `adults=40` over Airbnb's cap
(`lodgingSearchLinks`); "in <City, ST>" alone sets `isDestination` (smartParseEvent) and
re-shapes the whole plan toward lodging; iOS empty `<input type=date>` renders today's date
AND a scroll gesture across it can COMMIT today into `moneyDates` (then shows "refund window
closes in 0 days"), with no way to clear it on iOS.

---

## 2. Gates -- CI green at `cee3e559`; the working-tree change is UNGATED

CI on PR #80 at `cee3e559`: jest, e2e, backend, cra-build, hostv2-build all SUCCESS
(2026-08-04 12:07Z). **No local gate run this session, and the uncommitted
`LodgingCockpit.jsx` change has not been built, gated or driven.** The figures below are the
2026-08-03 local numbers at `7bbe1ad6`, carried forward unchanged.

Jest **5195 passed / 1 skipped** - **334 suites** - `gate:cra` GREEN (242 of 245
baselined) - `gate:hostv2` GREEN (no drift, 12 files) - `gate:knowledge` GREEN -
hostv2 build + `check-parity` GREEN.

Two gates that had been red for weeks were closed this session:

- **`gate:hostv2`** was red since `aab1db7e`: three commits changed hostv2 source
  without regenerating the artifact `public/hostv2/` serves. A deploy would have
  shipped a bundle predating all three. Prove it by the CHUNK HASH, never index.html.
- **`gate:cra`** was red on two dead symbols in `AdminConsole.jsx` left behind when
  Phase 5D moved the merge inside `exportBase`.

**`public/hostv2/` is a committed BUILD ARTIFACT rewritten by 12 commits on this
branch.** Linear, it is noise; across two parallel branches every one of those files
conflicts and minified bundles cannot be hand-resolved. This is the mechanism behind
the 2026-07-30 sweep. Moving it to a CI build is the only fix that scales.

Commands that matter:

```
CI=true TZ=UTC npx react-scripts test --watchAll=false     # never bare `npm test` - it hangs
cd backend && python3 -m pytest -q                          # backend is pytest, not npm
npm run gate:cra          npm run gate:hostv2
npm run bake:knowledge    npm run gate:knowledge
npm run grounding:audit   # THE number - re-run every sprint
PATH=/usr/local/opt/node@20/bin:$PATH                       # Node 20 required
```

---

## 3. The one number to watch

```
GROUNDING COVERAGE -- 4% cited   (8 cited - 40 consensus - 131 synthesized - 541 priced)
```

Mind the denominator. 4% is `cited / labeled`. The figure that matters for host trust is
**8 of 541 priced items cited = 1.5%**, and **73% of priced items carry no provenance
block at all**. 34 of 39 playbooks are 0% cited; `wedding` has zero provenance on any of
its 7 priced items; one `lastVerified` stamp exists in the whole canon.

**This is a SUPPLY problem, not a carriage problem, and it is the binding constraint.**
Perfect delivery of an absent citation is still "nobody researched this".

---

## 4. What is true about the architecture

Full measurement: [`2026-07-31_INTELLIGENCE_MEASURED_STATE.md`](./2026-07-31_INTELLIGENCE_MEASURED_STATE.md).
Four things to hold in your head:

1. **~230 intelligence-bearing modules**, 131 in the decision path. The system is big and
   mostly connected -- 12 of 15 planning domains reach a recommendation.
2. **Evidence does not travel.** 13 grounded axes computed per decision, zero consumers.
   1 of the 5 provenance registries checked reaches the host UI (15 unverified).
2b. **CORRECTED 2026-08-03 -- the per-day programme schema EXISTS.** The 2026-07-31
   line "No per-day programme schema / a 5-day Santa Fe arc cannot be authored as days"
   is now false. `itinerary.js` carries `{day, slot, time, title, note, anchor}`, a host
   day/slot editor, and a guest projection reaching the invite + the backend RSVP
   whitelist. What was actually missing was the GATE and the CONTENT: the arc was
   `ev.type === 'Reunion'` and nothing else, so 38 of 39 playbooks returned
   `relevant:false`. The gate is now the SPAN. **The content gap is real and remains**:
   1 of 39 playbooks authors "Day N" agenda rows (teamRetreat), and `activities:` schema
   keys across all 39 playbooks = **0**. The structural arc is deliberately contentless
   and says so in its own provenance.
3. **`phaseProgress.js` emits 47% of all actions.** It carries no evidence envelope.
4. **~14,000 lines are stranded in the frozen CRA** (`orchestration/`, `plan/`, `slices/`)
   -- either port to hostv2 or delete; leaving them is the dishonest option.

---

## 5. Next actions, in order

1. **Land the lodging pair.** #79 then #80 (or #80 alone -- it contains #79). Both green.
   Finish the uncommitted `LodgingCockpit.jsx` first: build, drive at `?demo=lodging`, commit.
2. **Buttons + CTA language, from the 2026-08-04 Mobbin read** (full sequence in that doc):
   name the **7 bare `done`/`View` labels** (file:line listed; read each call site first --
   do not guess the words), amend **UX_06 to sentence case** (shipped labels run 179 sentence
   to 14 Title, so doctrine is the holdout), kill the **180deg** gradient keeping `#4E6877`
   and `--sheen`, then put the number in the label where it is already in scope.
   Deferred to its own audit: classifying the record-only surfaces tap-to-result (only 2 of
   277 labels say `Mark`/`Record`, which is not plausible -- but it is a flag, not a finding).
3. **Get `public/hostv2/` out of version control** and build it in CI -- the single
   highest-leverage change for parallel sessions (see section 2).
4. **Label the 397 unlabeled priced items**, then point the research factory at the 34
   zero-cited playbooks (`wedding` first). Unchanged from 2026-07-31 and still the
   binding constraint.
5. **Activity content for the 4 destinations** (Santa Fe, Tulum, Deep Creek, one
   DestWed locale). Now the ONLY thing standing between the multi-day arc and a real
   programme -- the machinery is finished and honest about the hole.
6. **Extend the evidence envelope to ladder + phase actions** (`phaseProgress` = 47%).
7. **Prove or retire the 6 silent registry surfaces**.
8. **Human validation** -- one real event professional in front of the fixtures. Still
   the cheapest item here and the only one that cannot be done in code.

---

## 6. Traps -- do not re-derive these

- **Bare `npm test` HANGS** (watch mode). Always `CI=true`. Backend is **pytest**;
  `demo/backend` has no `package.json`.
- **Node 20 at `/usr/local/opt/node@20/bin`**. `/usr/local/bin/node` v18 has a broken
  esbuild arch.
- **`review-artifacts/` is gitignored** (`.gitignore:26`). Working papers there are
  local-only -- durable findings belong in `docs/architecture/`.
- **Game Night / repast are the HOST'S OWN events** (`gn`, `rp` in `ngw-events` +
  `ngw-hostv2-patch-<id>`), not the `test-*` seeds. `ev-x-repast` has a hardcoded past
  date and renders a recap.
- **Chrome cannot reach 390px by window resize** (~614 min measured 2026-08-03). Use
  **`npm run device -- mobile|tablet|desktop [--dev]`** (hostv2/) -- real device
  profiles, WebKit, touch, safe-area; `--dev` points it at the dev server so it shows
  live source. It also prints WHICH composition the shell chose. Playwright's WebKit is
  a separate download; it was missing on this machine, which is why `npm run device`
  looked broken for weeks.
- **The app picks its SHAPE from the window, not from any demo setting.** At >=1280x700
  `.stagewrap` is a fixed 393x852 phone silhouette -- EXCEPT the command and food
  surfaces, which opt out into a real desktop canvas. So a laptop window can never show
  you the phone. Reported three times as "the demo is not mobile"; nothing was broken.
- **A 1280-wide canvas whose height tracks the viewport goes SQUARE on a tall display**
  (1280x1170 at 1230px tall). Height is capped so it keeps a landscape aspect.
- **A JSX comment directly after `return (` breaks the build** -- put it above the return.
- **hostv2-drift**: rebuild with `npm run sync:hostv2` (Node 20) before trusting the gate.
- **Never claim absent/dead/disconnected from one probe.** Four such claims were wrong or
  imprecise in the 2026-07-31 audit. Close the search space first.
- **Every number ships with its command.** Proof ledger:
  `review-artifacts/2026-07-31-intelligence-audits/12-PROOF-LEDGER.md`. If a figure is not
  in the ledger, it is unproven -- say so.

---

## 7. Session update protocol

At the end of every session, update **this file only** (not a new dated one):
branch/HEAD, gate numbers, the grounding number if it moved, what shipped, and the next
action. If a dated snapshot is genuinely needed for history, write it separately and link
it from section 1 -- but this file stays the single current source.
