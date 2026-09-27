# Review Board — should hostv2 grow a service worker?

> **REVISITED AND LIFTED 2026-09-27 (host ruling).** The ruling below stood for
> six weeks and then failed its own load-bearing fact. Read the revisit note at
> the bottom of this file before citing anything above it.

Date: August 16, 2026
Question: the board's #3 item is "offline shopping list". I built a service
worker for it. A PRIOR board already ruled against exactly that.

---

## The prior ruling, which I did not read first

`hostv2/index.html:14`, board 2026-07-28, shipped in the code I was editing:

> Deliberately NOT shipped, per the same ruling: no service worker (this deploy
> pipeline should not grow one)

I wrote `public/sw.js` and registered it without checking. That is the failure,
independent of what this board decides.

## The evidence FOR revisiting

1. **The gap is real and measured.** Warm online visit, then an offline reload:
   `net::ERR_INTERNET_DISCONNECTED`, blank page, zero service workers. The host's
   entire plan sits readable in localStorage and nothing can serve the shell that
   reads it.
2. **A later board ranked it #3** of the production-readiness list, above
   accessibility.
3. The aisle is exactly where the app is most needed and the signal is worst.

## The evidence AGAINST, which is stronger than I expected

4. **This pipeline has already shipped stale bundles.** A documented trap: a green
   Pages run shipping a stale hostv2, provable only by inspecting the chunk hash.
   Adding a caching layer on top of a pipeline with a KNOWN staleness fault makes
   a transient failure permanent.
5. **My implementation failed its own first drive.** Three of five tests red —
   the offline reload never mounted. A service worker that half-works is worse
   than none: it controls every request and takes the app down with it.
6. **The need is already partly met.** `draftShoppingList` produces a copyable,
   sendable, printable list, and print CSS exists. A host can put the list in
   their own messages before leaving the house — which also survives a dead
   battery, a browser update, and cleared site data.

---

## Design bench (first)

**Dieter Rams.** "You are proposing a permanent caching layer to solve a problem a
text message already solves. Less."

**Don Norman — error prevention.** "Weigh the failure modes, not the features. No
worker: the app fails in the aisle, the host is annoyed, and the next online load
is fine. Broken worker: the app fails everywhere, for everyone, until each person
clears site data — which no host will ever do. The second is unbounded."

**Karri Saarinen.** "Offline is table stakes in a tool people live in, and I would
normally push for it hard. But a hand-rolled worker on a Pages deploy with a known
staleness fault is not the way in. If this ships eventually it wants a build-time
precache manifest and a tested update path, not sixty hand-written lines."

## Event bench (second — override authority)

**Mindy Weiss.** "I plan around bad signal already; everyone in this business does.
I screenshot things. What I cannot plan around is the app being broken for a week
because something clever went wrong."

**"Grandmother" — usability override, and she declines to use it here.** "If it
does not work in the shop I would just have written a list on paper before I left.
That is not the app failing me. But if the app stopped working at home and I did
not know why, I would not open it again."

## Specialist seats

**The Engineering Realist — RULING SEAT.** "Uphold. Not because offline is
worthless — because the specific combination is bad: a hand-written worker, on a
pipeline with a documented stale-ship fault, that failed its first drive, to
serve a need with an existing partial answer. Any two of those would be
survivable. Four is not.

And note what the failing drive actually tells you. The tests were written before
the code was believed, and they said no. That is the process working. Shipping it
anyway because the idea is good is how the bad version gets in."

**The Liability & Trust Reviewer.** "An un-updatable app cannot be patched for a
security issue either. That is the part nobody thinks about until it matters."

---

## RULING

**The 2026-07-28 ruling STANDS. The service worker is not shipped.** Revert it.

Ordered:

1. **Delete `public/sw.js` and its registration.** Not parked, not flag-gated —
   dead code beside a live ruling is how a barred thing quietly returns.
2. **Meet the aisle need with what exists.** `draftShoppingList` already produces
   a take-it-with-you list. If #3 is to be closed, close it by making that path
   OBVIOUS at the moment a host is about to leave, which is cheap, reversible, and
   survives a dead battery.
3. **Keep the measurement.** The offline behavior is now a known, documented fact
   rather than an assumption. Record it; do not re-derive it in three months.
4. **If a worker is ever revisited**, it arrives with a build-time precache
   manifest, a tested update path, and a kill switch — as its own piece of work
   with its own review, not as a sub-task of a shopping-list item.

**Dissent:** Saarinen dissents on the long run — he holds that a tool people live
in should work offline eventually, and does not want this ruling read as "never".
It is "not like this, and not as a side quest".

**Process note, recorded against me:** the prior ruling was in a comment at the
top of the file I edited. I did not read it. The rule that would have caught this
is the repo's own: read the surrounding code before writing beside it — the same
rule that saved the double-applied price factor an hour earlier, applied
inconsistently.

---

## REVISIT — September 27, 2026

**Outcome: the ban is lifted. A worker ships, built to condition 4 below.**

### The argument that failed

Objection #4 — *"This pipeline has already shipped stale bundles… adding a
caching layer on top of a pipeline with a KNOWN staleness fault makes a
transient failure permanent"* — was the strongest one here, and the Engineering
Realist's ruling cited it first.

It was not true when this board sat. Checked 2026-09-27:

* **Nothing prebuilt is tracked.** `git ls-files` finds no `hostv2/dist` and no
  `public/hostv2`. Both are build outputs.
* **The laptop flow is gone.** `pages.yml`, the `gh-pages` branch flow, the
  `deploy:branch` script and the `gh-pages` devDependency were all deleted
  **2026-08-03**. `npm run deploy` is now just `gh workflow run`.
* **The artifact is SHA-stamped and CI verifies it.** `pages-from-source.yml`
  writes `GITHUB_SHA` into `build/RELEASE_SHA.txt` and fails the build if the
  stamp is missing — on both the `demo` and the `services`/`live` paths.

That workflow landed **2026-07-30** and the duplicate path went **2026-08-03**.
This board sat on **2026-08-16**. The fault had been fixed for over two weeks
and nobody re-read the pipeline before ruling on it.

**The lesson is not "the board was careless".** It is that a fact about
infrastructure decays faster than the ruling that rests on it, and a ruling
does not carry a re-check date. A stale note about a deploy pipeline did not
just cost a step — it decided a product question for six weeks. The repo's own
memory of this trap was equally stale and has been corrected in the same pass.

### What did NOT change, and how it is answered

* **Norman's asymmetry** — a broken worker "fails everywhere, for everyone,
  until each person clears site data" — stands, and is answered by
  construction rather than by confidence: **navigation is network-first**, so
  the cache can only ever answer when the network did not. A bad cached shell
  cannot out-rank a working network, and one good deploy reaches every host on
  their next load with signal. This is asserted on the worker's source and
  driven with a deliberately poisoned cache.
* **The Liability seat** — "an un-updatable app cannot be patched" — is
  answered by two independent kill switches: `?nosw=1` in the page, which runs
  before any registration and therefore works even if the worker is serving a
  broken shell; and `sw-kill.txt` at the site root, which disables every
  installed worker on its next activation with no host action at all.
* **Rams and #6** — "a text message already solves this" — is not answered and
  is not disputed. `draftShoppingList` still exists and is still the better
  path for a host who plans ahead. This is for the one who did not.
* **Saarinen's dissent** — "not like this, and not as a side quest" — is
  honoured on the first half: build-time manifest, tested update path, kill
  switch, its own tests. It is NOT honoured on the second: this was built as
  part of a working session, not as a separately reviewed piece of work. That
  is a real deviation from order 4 and is recorded rather than glossed.

### Condition 4, item by item

| Required | Where |
|---|---|
| Build-time precache manifest | `src/offline/vitePluginOfflineShell.mjs` — reads the emitted bundle; the build id IS the manifest hash |
| Tested update path | new id → new cache name → old caches dropped on activate; no `skipWaiting`, so a new worker never swaps chunks under a running app |
| Kill switch | `?nosw=1` (page-side, pre-registration) and `sw-kill.txt` (worker-side, no host action) |

### Scope, which the 2026-07-28 board cared about

`sw.js` is emitted **inside** the hostv2 bundle, so its scope is
`/ngw-event-planner/hostv2/` and it cannot reach `/ngw-event-planner/` — where
the frozen CRA shell and the public vendor-brief page live. That board's
original objection to the CRA manifest was that an install "would have launched
the FROZEN App.js shell"; the same hazard is closed here by construction.

### Gates

`hostv2/test/offlineShell.test.mjs` (19) — manifest, build id, network-first
asserted on source, both kill switches, scope, and the last-signal record.
Red-proofed four ways: cache-first navigation, the worker kill switch removed,
registration before the `?nosw=1` check, and API responses left cacheable.

`hostv2/e2e/theShellOpensWithoutSignal.spec.mjs` — the drive the last attempt
failed: install and precache, **an offline reload that still mounts**, a
poisoned cache losing to a live network, the kill switch, and a negative
control that no plan or price is ever cached.

---

## BOARD RECONVENED — September 27, 2026

Eight seats, confirmed by the owner before sitting: Farley, Bach/Bolton,
Feathers, Forsgren, Janca, The Next Maintainer (mandatory on a build board),
Norman (continuity — his asymmetry carried the original ban), and the
Grandmother player seat (mandatory, 2026-08-27 standing amendment).

### Ruling, as delivered

**Ban LIFTED. Design APPROVED. Did not ship on the day of the ruling** — one
blocker: the offline drive had not run. Three seats independently refused to
clear it on unit tests, Bach's reason being that the network-first assertion
read a SOURCE STRING and "would pass on code that never runs".

### The blocker is now cleared, and the drive earned its place

`e2e/theShellOpensWithoutSignal.spec.mjs` — **5/5 green**, and it found two
real product defects plus one blind test that unit tests had all missed:

1. **The shell was cached under the wrong URL.** The precache and the
   navigation fallback used `<base>index.html`. A navigation requests the
   DIRECTORY. So the fallback matched nothing and the offline reload failed —
   which is exactly how the previous attempt at this worker died. Both URLs
   are precached now and the fallback matches the directory.
2. **A worker protects nothing until the SECOND load.** Measured:
   `navigator.serviceWorker.controller` is null after the load that registers
   it. This confirms Forsgren's "two page loads" from the other direction —
   it is not only the update path, it is the first-protection path.
3. **The poisoned-cache test was blind.** It poisoned `index.html` — which,
   after fix 1, is not the entry the fallback reads. Making the worker
   cache-first still passed it. Bach's seat named this failure before it
   happened; red-proofing found it, review would not have.

Red-proofed: removing the navigation fallback fails the offline reload;
cache-first navigation fails the safety case. Both only fail correctly AFTER
fix 3 — the first attempt at the second red-proof passed, and that pass was
discarded rather than reported.

### The other five orders

| Ordered | State |
|---|---|
| Run the drive | **Done, 5/5, red-proofed** |
| Drive the "last signal" line on a screen | **Done 2026-09-27.** Rendered, driven in a browser, 5/5 in `e2e/sheKnowsItIsOld.spec.mjs`, red-proofed 4 ways |
| `?nosw=1` in the runbook | **Done** — `docs/DEMO_ACCOUNT_RUNBOOK.md`, with the two-load rule and both kill switches |
| Link this audit from `src/offline/` | **Done** — the header of `register.js` opens with it |
| State recovery as two page loads | **Done in host-facing copy** — "An update is ready. Close the app and open it again.", raised only when a worker is genuinely waiting |
| Pin the vendor-redirect ordering | **Done** — prose in `main.jsx` plus a gate, `offlineRedirectOrder` in `test/offlineShell.test.mjs` |

### Grandmother's condition, closed 2026-09-27

Her objection was not that offline is unnecessary; it was that a plan rendered
from cache looks identical to a live one, and being shown an old plan without
knowing it is worse than the app not opening. The line now renders:

> No signal — showing your saved plan. · Last updated 3 hours ago.

with "This device has not been online yet." when there is no record at all.
Driven at all four ages; a human has seen it.

**Driving it found a real bug that every test had passed over.** The phrase was
computed in a `useMemo` that only recomputed when something else re-rendered,
so it read "3 hours ago" and stayed there while the stored timestamp moved
underneath it — and an idle offline session, which is the entire situation this
exists for, has no other renders. A stale number wearing a current one's
clothes: her objection exactly, reproduced by the fix for it. A 60-second
ticker, running only while offline, closes it.

### What is proved, and by which half

The two-load copy is proved in two pieces because it cannot be proved in one.
`context.route('**/sw.js')` intercepted the browser's update check **zero**
times, so no second worker version can be installed under Playwright: the
e2e drive proves the line and its suppression while offline, and the trigger —
the controller gate, already-waiting, and installing → installed — is proved
against a fake registration in `test/offlineShell.test.mjs`. The first attempt
at the whole thing in one test failed, and would have passed had the line been
rendered unconditionally.

**Still not driven end to end:** a genuine deploy producing a waiting worker in
a real browser. That is a gap in the proof, not a gap in the code, and it is
recorded rather than papered over.

### Recorded against the process, again

This board sat after the code was written, at the author's request. Saarinen's
"not as a side quest" remains unhonoured, and the author remains the only
source of every measurement above; no seat re-ran them.
