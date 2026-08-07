# Where We Are -- live status board

**THIS FILE IS THE ANCHOR. Update it at the end of every working session.**
Undated on purpose: there is exactly one of these, and it is always current. Dated
snapshots (`2026-07-17_WHERE_WE_ARE.md`, `2026-07-17_THE_PLAN.md`) are history.

**Last updated:** 2026-08-06

---

## 1. Branch state

> ### ⚠ A SECOND SESSION IS LIVE IN THIS TREE - AND IT SWEPT MY WORK INTO ITS COMMIT
>
> Still running as of 2026-08-07 (vite preview on :5233, restarted at least once).
> It is building the **persistent section rail** (`VIEWPORT_PORT_RULING` step 3):
> `src/lib/sectionDirectory.js`, `showsRail()`, `hostv2/src/sectionIcons.jsx`, `.srail*` CSS.
>
> **What happened.** `hostv2/src/styles.css` carried that session's rail CSS and this
> session's wide-canvas fixes inside ONE diff hunk, so there was no pathspec that
> committed either alone - the wide-canvas work was deliberately left uncommitted while
> the entanglement lasted. That session then committed the whole tree in `cf0336c0`
> ("The menu existed as an attribute..."), sweeping in `wideSurfaceCss.test.js`,
> `wideCanvas.spec.mjs`, `playwright.config.mjs` and the styles.css fixes.
>
> **Nothing was lost and nothing is broken** - both CSS fixes are present and
> `wideSurfaceCss.test.js` passes as committed. The only damage is attribution: that
> work is described by an unrelated commit message. **History was deliberately NOT
> rewritten** - rebasing shared history while another session is actively committing
> is how work actually gets destroyed. Read `cf0336c0` as two changes, not one.
>
> That session has also already built what the design seat filed as item #7
> ("fill the 356x422 command-rail void"). Do not build it twice.
>
> **Before any `git add` in this tree:** `lsof -nP -iTCP:5233 -sTCP:LISTEN` and
> `git status --porcelain`. Untracked `src/lib/*.js` you did not write is someone's
> in-flight work; its header carries a dated "EXTRACTED <date> from ..." note.

**Branch:** `feat/lodging-search-offer` - **HEAD `0d273115`**, 3 ahead of `origin/main`.
PRs #79/#80 are closed/merged; **#81 merged 2026-08-06**; **#82 is open and green on all
five checks** (jest, e2e, backend, cra-build, hostv2-build).

| Commit | What |
|---|---|
| `d4ab4f5f` | occupancy is the bed count, not the capacity - and amenities were on the page |
| `961a86b8` | the Hotels door carries the trip (dates + party) instead of a sentence about it |
| `0d273115` | the review board killed the URL-capture feature and found six live defects under it |

**`public/hostv2/` IS NOW GITIGNORED** (`.gitignore:62`, zero tracked files). Section 2's
old warning about it being a committed artifact that conflicts across branches is CLOSED -
that was item 3 on this list and it is done.

### The Hotels door carried nothing, and said it did

Driven live 2026-08-06: Google reads the PLACE out of `?q=` and **discards the dates and the
party**, falling back to tomorrow / one night / two guests. `checkin=`/`checkout=`/`adults=`
are ignored too. So the door opened on wrong-month, wrong-party prices and
`extractHotelCandidates` would store one as `priceShown`. The code comment above it asserted
the opposite ("Google parses 'Jun 17-Jun 21' perfectly well") and had been wrong since the
door was built.

`ts` is the only parameter that carries a trip - a base64url protobuf, decoded from a real
shared link and re-captured from Google's own picker. Full shape in `src/lib/googleTravelTs.js`.
Three findings that are not obvious and cost real time to establish:

- **Name-only works.** The captured links carry a Knowledge Graph id we never hold for a town
  the host typed; field `3.1.2.7` alone is honoured.
- **The party size IS a repeat count** - one submessage per adult. No integer field holds it.
- **A past check-in is silently ignored** and Google reverts to defaults. Two verification
  attempts were misread as "the mechanism doesn't work" because of this. Emitting a `ts`
  anyway would restore the original bug in a form that LOOKS fixed, so it returns null.

**Do not propose passing a hotel NAME as the place** to get a per-hotel dated door - driven,
returns an empty page (83 chars, no results). That field is a location.

---

## 2. Gates -- all green locally at `0d273115` (2026-08-06)

Jest **5430 passed / 1 skipped** - **358 suites** - `gate:cra` GREEN (242 of 245
baselined) - `gate:hostv2` GREEN (no drift, 14 files, after `sync:hostv2`) -
`gate:knowledge` GREEN - hostv2 build + `check-parity` GREEN. CI on PR #82 green on all
five checks.

**NOT run: the lodging e2e.** Its port (5233) was held by an orphaned `vite preview` that
session did not start, and `playwright.config` sets `reuseExistingServer: false` on purpose -
so a reused server would have tested a STALE bundle. Kill the orphan and run it.

Two gates that had been red for weeks were closed this session:

- **`gate:hostv2`** was red since `aab1db7e`: three commits changed hostv2 source
  without regenerating the artifact `public/hostv2/` serves. A deploy would have
  shipped a bundle predating all three. Prove it by the CHUNK HASH, never index.html.
- **`gate:cra`** was red on two dead symbols in `AdminConsole.jsx` left behind when
  Phase 5D moved the merge inside `exportBase`.

**RESOLVED: `public/hostv2/` is gitignored** (`.gitignore:62`, zero tracked files). It used
to be a committed build artifact rewritten by every hostv2 commit, whose minified bundles
could not be hand-resolved across parallel branches -- the mechanism behind the 2026-07-30
sweep. It is still a real artifact on disk that a deploy serves, so **`npm run sync:hostv2`
before trusting `gate:hostv2`** remains true; what changed is that it no longer conflicts.

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

1. **Land #82**, then the two commits after it. All gates green locally.
2. **The room-block half of lodging is still dark** - the biggest open item, and it is a
   RECONNECTION not a build. A review board convened 2026-08-06 (8 seats, full ruling in
   `0d273115`) put this above everything else on this surface: three of four `dest_lodging`
   options are room blocks, and `goToLodgingCockpit` (`HostShellV2.jsx:3176`) navigates away
   from the sheet that held them. The file says so itself at `:10233` - "This sheet is
   unreachable now."
   - **Reconnected in `0d273115`:** the booking code (it was written to `lodging.bookingCode`
     while every engine reads `lodging.code`, so `draftLodgingNote` - the guest note that IS
     the group-lodging deliverable - silently omitted it), and **Group rate ends** →
     `lodging.deadline`, which `travelPlan` turns into the dated obligation.
   - **STILL DARK:** the backups list, and **"Who's booked a room"** (`HostShellV2.jsx:11565+`).
     For a block the roster IS the work - the cutoff matters because you chase the people who
     have not booked.
3. **Buttons + CTA language, from the 2026-08-04 Mobbin read** (full sequence in that doc):
   name the **7 bare `done`/`View` labels** (file:line listed; read each call site first --
   do not guess the words), amend **UX_06 to sentence case** (shipped labels run 179 sentence
   to 14 Title, so doctrine is the holdout), kill the **180deg** gradient keeping `#4E6877`
   and `--sheen`, then put the number in the label where it is already in scope.
   Deferred to its own audit: classifying the record-only surfaces tap-to-result (only 2 of
   277 labels say `Mark`/`Record`, which is not plausible -- but it is a flag, not a finding).
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
- **A pasted page is not a DOM.** Building a parser against markup (hrefs, `aria-label`,
  anchor counts) assumes the clipboard carried it; a plain-text copy carries none of it.
  Match on VISIBLE TEXT where the discrimination has to hold. Three markup discriminators
  for "is this a results list or one hotel" were measured live and all three failed - `/aclk`
  counts (9 vs 67, both pages have them), "exactly one non-Google anchor" (the detail page
  has 27), and entity hrefs.
- **One field, two meanings, is this repo's recurring defect.** Three instances landed in a
  single day 2026-08-06: `occupancy` (bed count) read as guest capacity, the Hotels door's
  dates read as carried when Google dropped them, and a hotel's NIGHTLY rate stored as a stay
  total then split across the party. Each wore `sources: 'read'`. When a value arrives from a
  platform, establish what the platform MEANS by it before storing it - a field that returns
  a plausible number is not the same as a field that means what you assumed.
- **Choosing is not booking, on every surface.** `lodgingIsHeld` is the one predicate;
  `phaseProgress` had its own looser copy (bare `hotelName`) and marked a mere PICK as a held
  room. Gated by `lodgingHeldNotPicked.test.js` from both ends.
- **Every number ships with its command.** Proof ledger:
  `review-artifacts/2026-07-31-intelligence-audits/12-PROOF-LEDGER.md`. If a figure is not
  in the ledger, it is unproven -- say so.

---

## 7. Session update protocol

At the end of every session, update **this file only** (not a new dated one):
branch/HEAD, gate numbers, the grounding number if it moved, what shipped, and the next
action. If a dated snapshot is genuinely needed for history, write it separately and link
it from section 1 -- but this file stays the single current source.
