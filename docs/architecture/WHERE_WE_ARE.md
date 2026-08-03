# Where We Are -- live status board

**THIS FILE IS THE ANCHOR. Update it at the end of every working session.**
Undated on purpose: there is exactly one of these, and it is always current. Dated
snapshots (`2026-07-17_WHERE_WE_ARE.md`, `2026-07-17_THE_PLAN.md`) are history.

**Last updated:** 2026-08-03

---

## 1. Branch state

**Branch:** `product/decision-soundness-p0` - **HEAD `7bbe1ad6`** - tree clean.
**25 commits UNPUSHED. Not merged. Not deployed.**

`main` has NOT moved (merge-base == origin/main == `5853f2ec2`, 0 commits ahead of us),
so this is a clean fast-forward -- there is no conflict to resolve and no rebase needed.

Latest four, this session (2026-08-03):

| Commit | What |
|---|---|
| `7bbe1ad6` | Re-sync the hostv2 artifact -- the committed bundle was 3 source commits stale |
| `276f8bf8` | No date is an ask, not an absence -- undated events reach the elegant board |
| `578c0ca5` | Clear the CRA warning gate; stop root-level QA screenshots re-accumulating |
| `102a716d` | Span intelligence; the multi-day arc generalised from 1 of 39 types to all |

Earlier 21 are the knowledge-governance wave (#1-14) and the hostv2 responsive work
(#15-21). **Worth splitting into two PRs**: the only cross-over is `314a88b9`.

PR #70: https://github.com/twillis45/ngw-event-planner/pull/70 (base `main` @ `5853f2ec`)

**Open decision for the host: push the 25 (ideally as two PRs), or keep holding?**

---

## 2. Gates (as of `7bbe1ad6`) -- ALL GREEN

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

1. **Decide the push.** 25 commits, clean fast-forward, all gates green. Splitting
   knowledge (#1-14) from host (#15-25) is the reviewable shape.
2. **Get `public/hostv2/` out of version control** and build it in CI -- the single
   highest-leverage change for parallel sessions (see section 2).
3. **Label the 397 unlabeled priced items**, then point the research factory at the 34
   zero-cited playbooks (`wedding` first). Unchanged from 2026-07-31 and still the
   binding constraint.
4. **Activity content for the 4 destinations** (Santa Fe, Tulum, Deep Creek, one
   DestWed locale). Now the ONLY thing standing between the multi-day arc and a real
   programme -- the machinery is finished and honest about the hole.
5. **Extend the evidence envelope to ladder + phase actions** (`phaseProgress` = 47%).
6. **Prove or retire the 6 silent registry surfaces**.
7. **Human validation** -- one real event professional in front of the fixtures. Still
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
