# Custom Event Persistence — Investigation, 2026-08-21

Status: NOT A PRODUCT DEFECT. The reported data loss does not exist in the app.
Scope: hostv2 custom-event store (`ngw-hostv2-custom-events`) and the sample-event
patch store (`ngw-hostv2-patch-<id>`).
Method: driven live against the built bundle under `vite preview` (Playwright,
`--project=desktop`), plus source reading. Probe specs were temporary and have
been deleted.

---

## Verdict

Nothing is lost. A host's day-of confirmation (`safetyChecked`) is written to
`ngw-hostv2-custom-events` and it is still there after a reload, after a fresh
`goto`, and after a second reload. The same holds for the sample-event path: a
confirmation on `my-crab-feast` lands in `ngw-hostv2-patch-my-crab-feast` and
survives. There is no boot-time normalizer, no field allowlist, and no
reconstruction of a custom event from a base shape anywhere in the boot path. A
seeded custom event carrying 39 fields — including a key named
`probeUnknownField` that no code in the repo has ever heard of — came back from
a boot with all 39 intact, byte-identical except `timeline`, which the checklist
reconciler legitimately and visibly extends. The blast radius is zero fields.

What was actually measured on 2026-08-21 was a test-harness artifact.
`page.addInitScript()` re-runs on EVERY navigation in the page, including
`page.reload()`. The `boot()` helper in `hostv2/e2e/dayOfChecklist.spec.mjs`
seeds `ngw-hostv2-custom-events` unconditionally inside that init script, so the
reload wrote the pristine seed event over the host's confirmed one before the
app had booted. The reader then observed a missing `safetyChecked` and concluded
the app had dropped it. The app never saw the write disappear; the test erased
it. This matters beyond the one field: an in-repo comment block now asserts a
data-loss defect in the shipping shell as measured fact, and that claim is
false. The correction below is a test fix and a comment retraction, not a code
fix.

---

## Reproduction

The two runs below differ in ONE line — whether the seed is guarded — and that
line decides whether "the defect" appears.

Setup, once, from `demo/hostv2`:

1. `PATH=/usr/local/opt/node@20/bin:$PATH` (the default `node` is 16 and
   Playwright needs 20).
2. `lsof -ti:5233 | xargs kill -9; lsof -ti:5244 | xargs kill -9`
3. `npm run build` if `dist/` is stale (the harness serves the built bundle, not
   the dev server).

### Run A — reproduces the reported "loss" (harness artifact)

4. In a spec, `page.addInitScript()` that sets `ngw-hostv2-splash-seen`,
   `ngw-v2-welcomed`, `ngw-hostv2-last-event = 'cust-probe-1'`, and
   UNCONDITIONALLY sets `ngw-hostv2-custom-events` to a single Cookout event.
5. `page.goto('?elegant=1')`, wait for settle.
6. Open The Day: click `.ev-eyebrow`, then the `.navseg-b` reading "The Day"
   (in elegant mode the dock is retired and the phase control lives in the
   eyebrow's nav sheet).
7. Click the first `.dayof-card .frow`.
8. Read the store: `safetyChecked` is `{"weather": true}`. The write lands.
9. `page.reload()`, wait for settle.
10. Read the store: `safetyChecked` is `undefined`.

Measured output:

```
A after click : {"weather":true}
A after reload: undefined
```

### Run B — the same flow with the seed guarded

4'. Identical, except the seed is wrapped in
    `if (!localStorage.getItem('ngw-hostv2-custom-events')) { ... }`.

Steps 5-8 identical. Then reload once via a fresh `goto('?elegant=1')` and once
via `page.reload()`.

Measured output:

```
B after click : {"weather":true}
B after goto  : {"weather":true}
B after reload: {"weather":true}
```

Run A's step 9 does not merely reload. `addInitScript` fires again on that
navigation and executes `localStorage.setItem('ngw-hostv2-custom-events', ...)`
with the pristine seed, before any application code runs. The host's
confirmation was overwritten by the test, in the test's own setup, one frame
before the assertion that reported it missing.

### Run C — the sample-event path

Seed only `ngw-hostv2-last-event = 'my-crab-feast'` (no custom-event seed at
all, so nothing can be clobbered), confirm a day-of row, reload:

```
C after click : {"ngw-hostv2-patch-my-crab-feast":{"food":true}}
C after reload: {"ngw-hostv2-patch-my-crab-feast":{"food":true}}
```

---

## Mechanism — what the boot path actually does

There is no field allowlist. Each suspect named in the brief was read and each
is field-agnostic:

- `hostv2/src/eventPool.js:63` — `loadCustomEvents()` parses the raw array and
  applies `list.filter(e => e && e.id)` at `:65`. It filters ROWS, never keys.
  Every event object passes through by reference.
- `hostv2/src/eventPool.js:92` — `CUSTOM_EVENTS_AT_LOAD` is that array,
  unmodified.
- `hostv2/src/HostShellV2.jsx:738` — `useState(CUSTOM_EVENTS_AT_LOAD)` seeds the
  `customs` state from it whole.
- `hostv2/src/HostShellV2.jsx:1267` — `base = activeCustom || ...`. A custom
  event resolves to the live object; no base-shape merge is applied to it.
- `hostv2/src/HostShellV2.jsx:1268` — `event = { ...base, ...(activeCustom ? {} : patch) }`.
  Note the ternary: for a custom event the patch overlay is deliberately EMPTY,
  because custom events store themselves whole.
- `hostv2/src/HostShellV2.jsx:5168-5177` — `patchEvent`'s custom branch is
  `setCustoms(list => list.map(c => c.id !== eventId ? c : { ...c, ...obj }))`.
  A spread onto the existing object; unknown keys are carried, never rebuilt.
- `hostv2/src/HostShellV2.jsx:2478-2482` — the persistence effect passes the
  whole `customs` array to `saveCustomEvents`.
- `src/lib/customEventStore.js:152-193` — `saveCustomEvents` filters rows
  (`:154`, again `e && e.id`) and calls `JSON.stringify(list)` at `:180`. No key
  inspection of any kind.
- `hostv2/src/HostShellV2.jsx:2429` — the SAMPLE path,
  `localStorage.setItem(LS_PATCH(eventId), JSON.stringify(patch))`, likewise
  serializes the whole patch object.
- `hostv2/src/HostShellV2.jsx:6153` — creation writes the whole `ev` object.
- `hostv2/src/HostShellV2.jsx:1444-1470` — the only boot path that REPLACES a
  stored custom event with a differently-shaped object is the cloud-adopt
  branch, and it is gated on `session` (signed in) plus a sync-status check. It
  never runs in the reported scenario, and even it substitutes a whole cloud row
  rather than filtering fields.

Second, differently-shaped probe (a grep is a hypothesis): rather than trust the
reading, a custom event was seeded with 39 fields and the store was read back
after a boot. Result: 39/39 present, including `probeUnknownField: "ZZZ"`. An
allowlist could not have produced that.

The store's own write log corroborates it. After the confirm-and-reload
sequence, `ngw-hostv2-write-log` contains only `hostshell:customs-state`
entries, all `refused: false, dropped: []`, and the backup taken at boot
(`ngw-hostv2-backup-<ts>`) contains `safetyChecked: {"weather": true}` — the
confirmation was in the store at the moment the next boot snapshotted it.

The writer that actually destroyed the value is in the test:
`hostv2/e2e/dayOfChecklist.spec.mjs:11-24` (`boot()`'s `addInitScript`), whose
`localStorage.setItem('ngw-hostv2-custom-events', ...)` at `:17` is
unconditional.

---

## Blast radius

Zero product fields. Table below is the measured survival of every field the
write path patches, plus a control key that exists nowhere in the codebase. All
were seeded onto a custom event (`cust-probe-1`) and read back from
`ngw-hostv2-custom-events` after a full boot at `?elegant=1`.

| Field | Written by | Survives reload |
|---|---|---|
| `safetyChecked` | `HostShellV2.jsx:10138` (day-of confirm) | YES |
| `timeline` | `:4032`, `:4645`, `:4661`, `:5150` (reconciler) | YES (seeded rows kept; reconciler APPENDS playbook rows — by design, `:5150`) |
| `guests` | `:3873`, `:3878`, `:4167`, `:4810`, `:4891` and others | YES |
| `vendors` | `:2740`, `:2906` | YES |
| `budget` | creation `:6152`, budget surfaces | YES |
| `foodChoices` | `:1903`, `:2052` | YES |
| `foodGot` | `:4721` | YES |
| `notes` | note editors | YES |
| `sendLedger` | send/ledger surfaces | YES |
| `travelMode` | creation `:6109`, travel surfaces | YES |
| `isDestination` | creation `:6103` | YES |
| `decisionMemory` | `:1891` | YES |
| `decisionPins` | `:2089` | YES |
| `contextNudges` | `:4407` | YES |
| `tables` | `:3890` | YES |
| `tableNames` | `:3896` | YES |
| `tablePos` | `:3803` | YES |
| `doorPos` | `:3859` | YES |
| `airportOptions` | `:4307` | YES |
| `briefSharedVendorIds` | `:2889`, `:6156` | YES |
| `kidsCount` | `:4810`, `:5225` | YES |
| `rainPlan` | rain-plan surface | YES |
| `startTime` / `startTimeSource` | `:5236` (`defaultStartTime`), `:6142` | YES |
| `venueCity` / `venueState` | `:1056`, creation `:6096` | YES |
| `totalBudget` | creation `:6104` | YES |
| `guestEstimate` | creation `:6103` | YES |
| `lodgingWants` | creation `:6122` | YES |
| `lodgingStyle` | creation `:6128` | YES |
| `theme` | creation `:6116` | YES |
| `secondaryType` | creation `:6115` | YES |
| `timeOfDay` | creation `:6112` | YES |
| `kidsPolicy` | creation `:6090` | YES |
| `passPurchased` | `:2695` | YES |
| `guestsStayOvernight` | creation `:6107` | YES |
| `probeUnknownField` (control — no code writes it) | nothing | YES |

The control row is the load-bearing one: if any allowlist existed, an invented
key would be the first casualty. It survived.

---

## Sample events vs host-created events

They do take different persistence paths, and BOTH preserve unknown fields.

- Custom (host-created, `cust-*`): stored whole in `ngw-hostv2-custom-events`
  via `saveCustomEvents` (`src/lib/customEventStore.js:180`). No patch overlay —
  `HostShellV2.jsx:1268` explicitly passes `{}` instead of `patch` for these.
- Samples / app events: base stays in the pool, edits accumulate in a patch
  object persisted at `HostShellV2.jsx:2429` under `ngw-hostv2-patch-<id>`, and
  are re-overlaid at `:1268` on the next boot.

Run C above measured the sample path end to end and it round-trips. So the
answer to "is this invisible in testing and only bites real users" is that there
is nothing to be invisible: neither path drops data.

---

## How long has it been there

The defect does not exist, so there is nothing to date. The false CLAIM is
brand new. `hostv2/e2e/dayOfChecklist.spec.mjs` is UNTRACKED
(`git status --porcelain` reports `??`), created earlier the same day,
2026-08-21, and never committed. `git log` for that path returns nothing. No
`git merge-base --is-ancestor` check is warranted, because there is no suspect
commit: the claim has never entered history, and the shipping code it accuses is
unchanged and correct.

---

## Severity

P3 — test and documentation hygiene. No host loses data, no core task is
blocked; the cost is a false data-loss claim sitting in the repo as measured
fact, which would send the next session hunting a bug that is not there.

The one genuine gap it exposes is worth its own small P2 line: nothing in the
suite asserts that a day-of confirmation SURVIVES a reload, which is why an
incorrect claim about survival had nothing to contradict it.

---

## Recommended fix

Two edits, both in `hostv2/e2e/dayOfChecklist.spec.mjs`. No product code changes.

1. Guard the seed in `boot()` (`:16-22`) so a re-navigation cannot overwrite the
   host's state:

   ```js
   if (!localStorage.getItem('ngw-hostv2-custom-events')) {
     localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ /* ... */ }]));
   }
   ```

   `addInitScript` runs on every navigation by design; any spec that seeds a
   store there and later reloads has the same latent bug. Worth a sweep of the
   other specs that seed `ngw-hostv2-custom-events` in an init script.

2. Delete the retraction-worthy comment at `:57-68` (the block beginning "NOT
   ASSERTED HERE, and deliberately: that it survives a reload. It does not --
   measured.") and replace it with the assertion described below. Leaving the
   comment is the higher-risk option: an unchallenged, confidently-worded false
   measurement in the tree is exactly what cost this investigation.

Risk of the fix: low, and confined to the harness. The one thing to get right is
that the guard must not silently skip seeding on a spec that INTENDS a fresh
store per test; Playwright gives each test a fresh context, so the guard only
suppresses the re-seed on navigations WITHIN a test, which is precisely the
intent.

---

## Red-proof plan

The trap that produced this finding is that a naive test asserts the WRITE.
Under the broken harness, `expect(written).toBeTruthy()` passed cleanly — and
would still pass if the app really did drop the field on boot, because it reads
the store before any reload. Asserting the write proves the store accepted a
value; it says nothing about survival. The assertion has to straddle a boot.

Add to `dayOfChecklist.spec.mjs`, after the existing write assertion:

```js
await page.reload();
await settled(page);
const survived = await page.evaluate(() =>
  (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {}).safetyChecked);
expect(survived).toEqual(written);          // the SAME value, across a boot
await expect(page.locator('.dayof-card .frow.got')).toHaveCount(1);  // and rendered
```

Two halves, deliberately. The store read catches a persistence regression; the
rendered `.got` row catches the other direction — a value that persists but that
the boot no longer reads back into the card, which a store-only assertion would
call green.

Red-proof it by reintroducing the defect and watching it fail, in both of its
possible shapes:

1. HARNESS SHAPE — remove the `if (!localStorage.getItem(...))` guard from
   `boot()`. The reload re-seeds, `survived` is `undefined`, the test goes red.
   This is the exact fault that hid here, so the gate must fail on it.
2. PRODUCT SHAPE — temporarily edit `src/lib/customEventStore.js:180` to
   serialize through a field allowlist, e.g.
   `JSON.stringify(list.map(({ id, name, type, date }) => ({ id, name, type, date })))`,
   which is the mechanism this investigation was sent to find. Rebuild
   (`npm run build` — the harness serves `dist`, so an unbuilt edit proves
   nothing, per the standing "gate the source, not the artifact" rule) and the
   test must go red. Revert.

A gate that only fails on shape 1 guards the test; one that fails on both guards
the host. Note the rebuild requirement: this suite runs the BUILT bundle under
`vite preview`, so any red-proof that skips `npm run build` measures the old
artifact and gives a false green.
