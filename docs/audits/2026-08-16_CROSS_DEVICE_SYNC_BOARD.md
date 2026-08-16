# Review Board — cross-device merge policy

Date: August 16, 2026
Convened on: the defect proven by `hostv2/e2e/crossDeviceSync.spec.mjs` (commit f9987b4e)
Proposal on the table: **newest `updated_at` wins, per event**

---

## The verified facts the board was given

1. Cross-device sync carries NEW events between devices and never carries EDITS.
   `hydrate()` drops any cloud event the device already knows; `base` prefers the
   local copy over anything hydrated. Two independent causes.
2. `loadEvents` selects `updated_at` and orders by it, then discards it in the
   row map.
3. **The local event has no event-level timestamp.** `updatedAt` exists only on
   nested guest-travel sub-objects. `saveEvent` upserts `{id, studio_id, data}`.
4. **`updated_at` is a Postgres trigger** (`001_initial_schema.sql:52`), so it is
   a SERVER clock, stamped on write.
5. A per-event sync ledger already exists: `markEventSynced` stamps, and the
   pending-write queue records what has not reached the cloud.

Fact 3 is fatal to the proposal as literally worded, and fact 4 is fatal to the
obvious repair. That is the whole ruling.

---

## Design bench (first)

**Don Norman — error prevention.** "The proposal cannot be built. There is no
local timestamp to compare against. So the real proposal is 'add one', and the
moment you do you are comparing a device clock to a server clock. A phone with a
wrong clock either loses every edit it makes or wins every conflict forever, and
in both cases the host is never told. The failure is silent, which is the only
kind I refuse outright."

**Karri Saarinen — the sync-craft seat.** "Nobody who ships sync compares
wall-clocks across devices. You already hold the fact you need: the queue.
An event with unflushed writes has been edited since its last confirmed push —
that is not a heuristic, it is bookkeeping. An event with an empty queue is, by
construction, exactly what this device last pushed; so if the cloud differs, the
difference came from somewhere else, later. You get 'newest wins' out of state
you already maintain, with no clock in the comparison at all."

**Julie Zhuo — craft at ship.** "Ship the direction that cannot lose data, and
ship it narrow. Cloud-wins-when-clean is one predicate. Field-level merge is a
research project and needs per-field timestamps the schema does not have."

**Dieter Rams.** "Less. The timestamp column is a fifth wheel here. Do not add a
local clock to answer a question the queue already answers."

## Event bench (second — override authority)

**Mindy Weiss — 40 events a year on a laptop and an iPad. OVERRIDES on urgency.**
"This is not a polish item, it is the reason I would stop using it. I change a
venue on the iPad in the car and open the laptop at the office. If the laptop
shows the old venue and says 'synced', I do not file a bug — I decide the app
lies and I go back to the spreadsheet. And understand which way round the danger
runs: I would rather see a stale screen than lose the change I typed. Never
trade my typing away to win a race."

**Bryan Rafanelli — run-of-show.** "On site the stale device is the one that
prints. Whatever you build, the host has to be able to tell that a screen is
behind. Silence is what gets a wrong call sheet into somebody's hand."

**"Grandmother" — uses her usability override.** "If the two do not match, tell
me in words I know. I do not want to pick a version. I want it to say which one
it kept and let me undo it if it chose wrong."

## Specialist seats

**The Engineering Realist — write-path and concurrency truth. THE RULING SEAT.**
"Concretely, three cases and no clocks:

- Event has queued writes → LOCAL WINS. It has been edited since the last
  confirmed push. Do not let the cloud copy touch it. This is the case that
  protects the offline edit, and it is the one the naive fix gets wrong.
- Event is clean (no queued writes, has a sync stamp) → CLOUD WINS. The local
  copy is by definition what this device last pushed, so a differing cloud row is
  another device's later write. Adopt it whole.
- Event is clean and has NO sync stamp → it has never been confirmed to the
  cloud. Treat as local-wins and let the upload path settle it.

Everything needed is already in `syncState`. The changes are: stop filtering
known ids out of `fresh`, and let `base` prefer the adopted cloud copy when the
event is clean. Note the second one is required — fixing only the filter changes
nothing, because `activeCustom` still wins in `base`. Two edits or zero."

**The Liability & Trust Reviewer.** "Last-write-wins on a device clock is how you
get a support thread you cannot answer, because you cannot reconstruct which
write survived or why. The queue-based rule is auditable after the fact."

---

## RULING

**The proposal is rejected as worded and replaced, unanimously, with the
queue-authoritative rule.** It delivers the intent behind "newest wins" — the
later edit survives — without putting a clock comparison anywhere in the path.

Ordered:

1. **Queue-authoritative merge, per event.** Dirty → local wins. Clean + stamped
   → cloud wins. Clean + unstamped → local wins.
2. **Both edits or neither.** The `fresh` filter and the `base` precedence must
   change together; changing one alone is a no-op and would ship as a fix while
   fixing nothing.
3. **Say when a copy was replaced.** Grandmother's override. A quiet line, not a
   modal, naming what changed — and it must not claim more than it did.
4. **Do not add a local timestamp.** If a future feature genuinely needs one, it
   is a separate decision with its own review, not a side effect of this fix.
5. **Field-level merge: not now.** Revisit only with per-field timestamps and a
   real reason.

**Dissent:** none on the mechanism. Rafanelli and Grandmother both pressed for a
staleness indicator beyond the replacement notice; the board recorded that as
worth doing but did not gate the fix on it.

**Bar for done:** the `fixme` in `crossDeviceSync.spec.mjs` unmarked and passing,
the tripwire deleted in the same commit, plus a new case proving an offline edit
with queued writes SURVIVES a differing cloud copy. That last one is the test
that matters — it is the data-loss guard, and without it this fix is more
dangerous than the bug.
