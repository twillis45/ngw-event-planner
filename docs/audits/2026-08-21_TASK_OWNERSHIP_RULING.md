# Task Ownership -- Review Board Ruling

Date: August 21, 2026
Stage: 2 (scope and design)
Surface: hostv2, facing public, mobile-flagship web at 390px
Question: Should a host be able to assign a task to a named person, and if so,
what exactly does that mean?
Prior reading: `docs/audits/2026-08-21_DECISION_ENGINE_AND_TASK_COVERAGE_AUDIT.md`
item 4 (MEASURED block, `:525-551`)

---

## THE RULING

SHIP, at a scope far narrower than the audit item implied, and NOT the feature
it asked for. The board rejects "import `playbookMilestones` and seed a row
owner from the milestone owner" outright -- the join is 30.1% and the authored
owners are role words, so that build would paint 350 rows with the word "host"
and 58 with the word "coordinator" and call it delegation. What ships instead is
one affordance: a host can put a name from their own roster onto a checklist row
that already exists, and that name flows into the helper model the app already
runs (`src/lib/helperResponsibility.js:107-121`, source `timeline.owner`). This
is not a new feature; it is the missing intake on a model that is already built,
already aggregated, already rendered, and already has an honest outward path.
Assignment notifies nobody and the UI must say so in those words. Two things the
board additionally orders shipped in the same slice, because without them the
affordance is a trap: the `helperConfirmed` writer that exists only in the frozen
CRA (`src/App.js:11261`) and has no hostv2 equivalent, and a `retired` filter in
the helper derivation that is missing today.

**Vote: 6-2 to ship at the stated scope.**

**Dissent, by name:**

- **Dieter Rams -- DEFER.** Holds that the control belongs only in the Helpers
  panel and that putting anything on a checklist row is the 86% paying for the
  14%. Would not build the row-level entry at all this sprint.
- **Bryan Rafanelli -- REJECT on planning rows.** Holds that ownership on
  planning tasks is a fiction and that the only real ownership surface is the
  day-of spine, where `ros.owner` is already read and still has no editor.

**Concurring with conditions:** Don Norman votes yes only on the copy in
clause 3; if that copy is softened at build time he records his vote as a no.

---

## THE SEATS

### 1. Don Norman -- affordances and error prevention (central seat)

The audit item wanted to write a name onto a row. My question is what the host
believes when they see it. The row already renders `t.owner` today -- line
`hostv2/src/HostShellV2.jsx:15546` joins `[due, week, t.owner]` into the meta
line, and `:15630` does the same in the done fold. So the display half of this
feature has been shipped for months and is simply never fed. That is the whole
problem in one fact: the app is already prepared to show "Wanda" on a row and
has never had a way for the host to mean anything by it.

Is there an honest version that sends nothing? Yes -- but only because this
codebase already drew the line and held it. `helperResponsibility.js:1-8` opens
with "ASSIGNED IS NOT HANDLED. Chosen is not bought," and `:70-77` turns that
into the host's next action verbatim: `Confirm with ${name}`. The engine's
position is that a name on a thing creates WORK FOR THE HOST, not relief from
it. `hostBackupNeeded: status === 'assigned'` (`:98`, `:116`, `:135`, `:158`,
`:184`) says the same thing structurally. If the UI renders that stance rather
than a bare chip, assignment is not a lie -- it is a note-to-self with a name
in it, and the app says so.

Where I will not bend: `helperResponsibility.js:32` promises "no helper
accounts, invites, notifications" and the panel at `:11676` renders the chip
"not confirmed" -- and hostv2 has no writer for `helperConfirmed` anywhere.
Grep across `hostv2/src` and `src` returns writes only at `src/App.js:11261`,
in the FROZEN CRA donor, and only for food-add items. So today the app shows a
host a permanent orange "not confirmed" with no control that could ever turn it
green. Adding a second intake into that dead end is an error-prevention failure,
not a feature. Ship the confirm writer in the same slice or ship nothing.

### 2. Dieter Rams -- ruthless reduction (DISSENT: defer)

350 of 408. That is the number, and it is the argument. The authored corpus says
the host does the work. A per-row control that is correct on 58 rows and noise on
350 has not earned the row.

Look at what the row already carries at 390px: the checkbox
(`:15514`), the task lead, up to two chips -- the inferred "done by your plan"
tag at `:15518` and the urgency chip at `:15520-15533` -- a detail line, a meta
line carrying due plus week plus owner (`:15546`), and a nested `rowlink` deep
link at `:15550-15556`. That is six to seven elements before anything is added.
The reduction question is not "can we fit an assign button" -- of course you can
fit one -- it is "what does the row lose." It loses the property that it is one
thing you tap.

And the destination already exists. `addHelper` at `:4021-4036` writes
`{ task: job, owner: name }` straight into `event.timeline`, and the comment at
`:4017-4018` says exactly why: it is "the shape deriveHelperResponsibilities
already reads... so one write reaches every surface." A host who wants to say
"Marcus has the bar" can already say it, in one form, in the Helpers panel. My
vote is to make that form better and leave the checklist alone. I lose 6-2, and
I want it recorded that the reason I lose is convenience, not necessity.

### 3. Luke Wroblewski -- mobile-first and progressive disclosure

Rams is right about the row's budget and wrong about the conclusion. The
capability is real; the placement is the design problem, and "no room on the row"
is solved by not putting it on the row's primary layer.

Two hard constraints from the code. First, the row is a `<button>`
(`:15511-15513`) whose entire body toggles done, and it already contains a
nested `role="button"` span with `stopPropagation` at `:15550-15556`. That
pattern is a known compromise -- the comment at `:15683-15690` records an
earlier round where invented classes shipped on exactly this kind of nested
control. I will not vote to add a second nested interactive inside a button.
Second, `toggleTask(i)` indexes into `event.timeline` by array position
(`:4614`), which is why the vendor-obligation rows were kept as a separate group
rather than spliced in (`:15651-15660`). Any assign control must not disturb
that index.

So: the assign affordance is a SIBLING of the row button, not a child, in a row
wrapper. It is disclosed, not displayed -- the default row shows no assign
control at all when nothing is assigned and the event has no roster; it appears
once the event has at least one guest or helper to assign to. When a name IS on
the row it renders in the meta line where it already renders today, costing zero
new space. That is progressive disclosure doing its actual job: the 350 host-owned
rows never see the control, the 58 that need it get it.

### 4. Karri Saarinen -- opinionated workflow craft

Every assignee model any of us has shipped assumes the assignee has an account.
Ours do not, will not, and the doctrine forbids it -- `helperResponsibility.js:32`
is explicit. So the honest question is: what survives of the pattern without the
substrate?

What survives is the LEDGER, not the assignment. Strip out the account and an
assignee field degrades into a label. But this codebase already worked out what
replaces the account: host attestation with a state machine.
`src/lib/sendLedger.js:19-22` -- `not_sent -> handed_off` (host-attested,
channel and timestamp, "never the word Sent") `-> confirmed` (system-verified).
And `helperResponsibility.js:9-13` runs the parallel ladder for people:
`assigned -> confirmed -> handled`. Those two ladders are the same shape and they
are the substrate. The assignee does not need an account because the HOST is the
system of record for what the assignee said.

That gives the opinion I would hold this build to: assignment is never a terminal
state. A row that has been assigned and not confirmed is a row with MORE open
work than an unassigned one, and the product should feel that way. The existing
`startHelperMessages` path at `:4508-4529` already builds one personalized
confirm draft per deduped helper, carries their own ROS rows (`:4514-4524`), and
routes each through the individual handoff -- "no silent bulk send," per its own
comment at `:4506-4507`. The loop is complete. What is missing is the first step
into it and the last step out of it. Build those two, build nothing else.

### 5. Bryan Rafanelli -- run-of-show and day-of production (DISSENT: reject on planning)

On the day, nobody looks at a checklist. They look at a call sheet, and a call
sheet is a schedule with names in the margin. That surface exists here and is
half-built.

`effectiveRos` rows carry `owner` and it is read in three places -- the now-cue
line at `:9982` (`nowCue.owner && ('owner: ' + nowCue.owner)`), the full agenda
row at `:10307`, and the Walk-it lead line at `:10408-10409`, which literally
computes `ownerNamed` and prints "`X` runs this" or falls back to "You run this."
`helperResponsibility.js:126-140` reads `ros.owner` as a first-class source with
its own confirm flag (`r.confirmed === true`). Three renderers, one engine reader,
and no editor anywhere. The day-of spine is where ownership is REAL -- it is a
time, a place, and a person, which is what a call sheet is -- and it is the one
place the host cannot type a name.

So my position is that the board is fixing the wrong end. A planning task with a
name on it is an intention. A 3:45pm cue with a name on it is an assignment,
because the day will test it. I vote no on the planning rows and I want the ROS
owner editor on the record as the higher-value build. I acknowledge I lose on
sequencing, not on substance: `addHelper` at `:4028` already writes day-of rows
(`week: 'Day of'`, `category: 'event-day'`) into the timeline, so the two tracks
are already tangled and the board is choosing to untangle them later. I think
later is a mistake.

### 6. Mindy Weiss -- high-volume delegation (overrides Wroblewski on the unit)

Nobody delegates a task. You delegate a PERSON. You say "Marcus has the bar" and
then everything bar-shaped is his, including the four things you have not thought
of yet. If this ships as per-task assignment, a host will assign three rows on a
Tuesday, never open it again, and the field will be dead corpus by the event.

But here is what makes me vote yes anyway, and it is a code fact, not a
preference. The aggregation is ALREADY per-person. `deriveHelperResponsibilities`
collects from five sources -- food owners, timeline owners, ROS owners, capacity
helpers, informal vendors -- and then dedupes by resolved guest id at
`:193-208`, producing one helper with `role` as a joined list of their item types.
The comment at `:194-196` says it outright: "Uncle Ray's pitmaster task and his
protein pickup surface as ONE person, not two." So the storage is per-row and the
MODEL is per-person. That is the right architecture and it is already standing.

Which means the unit of ownership in this product is the PERSON, and a row-level
owner field is just one of five ways to add a job to a person. That is fine --
that is a data entry choice, not a model choice. What I will not accept is a UI
that presents per-task assignment as the concept. The host must see people, with
their jobs under them, and the row-level control must read as "add this to
someone's list," not "this task now has an owner." Wroblewski's disclosure design
is correct mechanically and I am overriding its framing: the sheet the assign
button opens is a list of PEOPLE, showing what each already holds, not a
name-picker.

On per-AREA: there is no section model in the checklist to hang an area on --
`category` exists on rows (`checklistReconcile.js:44`) but it is a generator
field, not a host-facing grouping. Do not invent one. The person IS the area in
this product, because a person's job list is what an area amounts to.

### 7. "Grandmother" -- the first-timer canary (archetype; DECISIVE on clause 3)

I was asked one question. If it says Wanda's name on it, does Wanda know?

If the answer is no, then I have to be TOLD no, on the screen, in the moment,
in words I do not have to interpret. Not a gray chip. Not a subtle color. Words.
Because I will absolutely assume that a computer that lets me put someone's name
on a job has told them about the job -- that is what putting someone's name on
something has meant my whole life.

I looked at what the app says elsewhere and it is better than I expected. The
message state line says "Handed off by text -- 6d ago" and never "Sent"
(`sendLedger.js:96-104`), and the invite copy at `HostShellV2.jsx:4604-4606`
says "Replies are not collected yet" when they are not. Somebody here already
decided not to fib to me. So I know it can be done.

My condition: the moment I put a name on something, the app tells me the next
thing to do about it, and the next thing is telling that person. The engine
already has the sentence -- `Confirm with ${name}` at
`helperResponsibility.js:71`. Put that sentence in front of me, not in a panel I
have to find. And the chip on the row must not be a bare name; a bare name reads
as settled. If it says "Wanda -- not told yet," I understand exactly where I
stand, and I will not be surprised on the day.

One more thing. If I assign it and then the app decides that job is not needed
anymore, do not just make it vanish. I told someone. I need to know I have to
un-tell them.

### 8. Access-needs practitioner -- non-visual and motor access (archetype)

Note first, since it is confused constantly: this is not the roster's "Accessible
and Budget" wing. That is about money. This is about whether a person using a
screen reader or an imprecise tap can operate the control at all.

Three findings, all concrete.

**Naming.** The owner today is rendered as a bare string inside a joined meta
line -- `[due, due ? null : t.week, t.owner].filter(Boolean).join(' . ')` at
`:15546`. To a screen reader that is a run-on: "Due in 4 days, Wanda." Wanda is
what? The relationship between the name and the row is carried entirely by
position and by the host's assumption. Every other stateful chip on this row has
the same problem -- the inferred tag at `:15518` and the urgency chip at `:15520`
are both bare `span.tag` with no role and no accessible name of their own. The
owner chip must not repeat that. It needs a label that contains the relationship
and the state in one string.

**Target size.** The row is one tappable button; that is currently its
accessibility virtue. The existing nested `rowlink` at `:15550` is a
`role="button"` span with no size floor declared at the call site -- it inherits
`.mini`. Adding a second nested target inside the same button is where the 44px
floor breaks quietly, and it also creates nested interactive content, which is
invalid. Wroblewski's sibling-wrapper answer is the only one I will sign off on,
and the sibling needs a real 44x44 minimum measured, not asserted. Per the
standing rule that a computed `::after` can be clipped to nothing, this gets
probed with `elementFromPoint`, not with a CSS read.

**Announcement.** A state change with no visual-independent form is not shipped.
`patchEvent` already routes every write through one path (`:5157`) and surfaces
a toast with undo, so the announcement channel exists -- but the toast must be in
a polite live region and must speak the full new state, not "Saved."

---

## THE ANSWERS

1. **Ship, defer, or reject -- and at what scope.**
   SHIP, at this scope and no wider:
   (a) a row-level "Assign" affordance on hostv2 checklist rows, rendered as a
   SIBLING of the existing `.frow` button, never a child, that opens a people
   sheet and writes `owner` (a name string) onto that timeline row via
   `patchEvent`;
   (b) the missing hostv2 writer for `helperConfirmed`, giving the
   `assigned -> confirmed` step a control (today it exists only in the frozen
   CRA at `src/App.js:11261` and only for food);
   (c) a `retired` filter in `deriveHelperResponsibilities`.
   REJECTED: the audit item as written -- importing `playbookMilestones` and
   seeding row owners from milestone owners. The join is 123/408 and the owners
   are role words; that build is not deferred, it is dead.

2. **The unit of ownership.**
   The PERSON, not the task. Storage stays per-row on `timeline[].owner`,
   because that is the shape five surfaces already read
   (`helperResponsibility.js:107-121`), but every host-facing presentation is
   per-person: the assign sheet lists PEOPLE with what they already hold, and
   the Helpers panel remains the canonical view of ownership. Not per-area --
   no section model exists and none is to be invented. Not per-day-of-role --
   the ROS owner editor is a separate, later build (see NOT IN SCOPE).

3. **Does assignment notify? NO.**
   Assigning writes local/cloud event state only. It performs no outward act, so
   it does not touch `sendLedger` and writes no send state. Required copy, and
   this is Norman's condition of vote:
   - The row chip reads `<Name> -- not told yet` while the responsibility status
     is `assigned`. Never a bare name. It becomes `<Name> -- confirmed` at
     status `confirmed` and `<Name> -- done` at `handled`.
   - The confirmation toast on assign reads:
     `Noted -- <Name> has "<job>". They haven't been told yet; you still owe
     them the ask.`
   - The follow-on action offered on the row and in the sheet is the engine's
     own sentence, `Confirm with <Name>` (`helperResponsibility.js:71`), which
     routes into the EXISTING `startHelperMessages` draft path
     (`HostShellV2.jsx:4508`).
   When the host completes that handoff, the existing draft flow writes
   `sendLedger` `handed_off` via `recordHandoff` (`sendLedger.js:38-49`) -- that
   is the ONLY state assignment can ever cause to be written, and it is written
   by the message path, not by the assign control. Per UX_07 the assign control
   is Level 4 RECORD-ONLY and must never carry primary button styling.

4. **Who is assignable.**
   In priority order, all resolved through `matchGuestIndexByName`
   (`helperResponsibility.js:52-60`) so one person is one identity:
   - anyone on `event.guests` (the roster) -- the primary list;
   - existing helpers already derived from the other four sources, so a person
     who holds a food item shows up here without being re-typed;
   - vendors flagged `isInformal` (`helperResponsibility.js:174-186`) -- friends
     entered on the vendor list;
   - free text, allowed, as the last row of the sheet, resolved against the
     roster on write and falling back to a name string when nobody matches. No
     guest record is invented -- that rule is already load-bearing at `:57-59`.
   NOT assignable: paid vendors. They have their own accountability lifecycle
   and `helperResponsibility.js:30` forbids mixing them in. A row whose work is
   a vendor's belongs in the vendor-obligation group (`:15700-15720`), which
   routes and does not check off.

5. **What an owned-but-open task does to readiness.**
   NOTHING. Assigning changes no count, closes no card, and earns no credit.
   The row stays open in `live`/`openRows` (`:15470-15473`), stays in the hero's
   N-of-M, and stays in the readiness engine's overdue-planning input exactly as
   before. The engine's existing stance is authoritative and is to be preserved:
   `hostBackupNeeded: status === 'assigned'`. An assigned, unconfirmed row is
   MORE open work than an unassigned one, because it now carries a second act
   (the ask) that has not happened. Once status reaches `confirmed`, still no
   readiness credit -- confirmed is a promise, not a fact. Only `handled`
   (`done === true`) closes anything, which is what the existing `statusFor`
   already encodes (`:64-68`).

6. **What happens when reconciliation RETIRES an owned row.**
   The assignment SURVIVES in the data and must be surfaced to the host once.
   Mechanics, all verified:
   - `owner` and `assignee` are already in `KEPT_FIELDS`
     (`checklistReconcile.js:45`), so a retire preserves the name; a revive
     brings it back carrying its state (`:88-92`). No data work needed.
   - LIVE DEFECT to fix in this slice: `deriveHelperResponsibilities` iterates
     `ev.timeline` at `:107` with no `retired` check, so a retired row's helper
     stays in the Helpers panel, stays in the deduped `helpers` list, and rides
     into `startHelperMessages` drafts (`:4508`). A host would text Wanda about
     a job the engine already stood down. Add `if (t.retired) continue;`.
   - Required host-facing consequence, Grandmother's condition: when a reconcile
     retires a row that had a non-host owner, `reconcileSummary`
     (`checklistReconcile.js:131-140`) gains one clause naming the person --
     e.g. `1 no longer needed -- Wanda had that one, you may want to tell her.`
     Silence here is the trap she named.
   - Also flagged, not fixed here: a retired row currently still renders in the
     open list carrying the `.got` class and the tag "done by your plan -- tap to
     confirm" (`:15494-15519`), because `isTimelineStepResolved` returns true for
     `t.retired` (`:1750`) rather than the row being filtered. Wrong words for a
     retired row. Logged as a separate defect.

7. **The accessible form of the control.**
   - Placement: a sibling of the `.frow` button inside a row wrapper. NEVER
     nested inside it -- nested interactive content is invalid and the row
     already carries one such compromise at `:15550`.
   - Element: a real `<button>`, not a `role="button"` span.
   - Accessible name: `aria-label="Assign <task lead> to someone"` when
     unassigned; `aria-label="<Name> has <task lead>, not told yet. Change who
     has this."` when assigned. The name carries the relationship and the state;
     a bare name is forbidden.
   - The owner chip in the meta line gets `aria-hidden="true"` and the state is
     carried by the button's label instead, so a screen reader hears it once,
     in a sentence, not as a fragment appended to a due date.
   - Target size: minimum 44x44 CSS px, PROVEN by `elementFromPoint` at 390px on
     a live drive, not by reading the CSS. A computed `::after` expander is
     acceptable only if it survives that probe.
   - Announcement: the `patchEvent` toast is the announcement channel and must
     sit in an `aria-live="polite"` region, speaking the full resulting state --
     the clause-3 toast string, not "Saved."
   - Disclosure: the control does not render at all when the event has no
     roster, no helpers and no informal vendors -- there is nobody to assign to,
     and an empty picker is worse than no button.

8. **What is explicitly NOT in scope.** See the list below.

---

## WHAT WOULD MAKE THIS A 10

This ruling is scoped at what can be shipped honestly today. Four things would
take the capability from honest to excellent, and none of them is this slice:

1. **The ROS owner editor.** Rafanelli's dissent is the strongest unbuilt idea in
   this document. Three renderers read `ros.owner` (`:9982`, `:10307`,
   `:10408`) and no surface writes it. Ownership on the day is a call sheet, and
   the call sheet is the surface where a name has teeth. Build it next.
2. **A close of the confirm loop from the other side.** Today `confirmed` is the
   host asserting the helper said yes. The brief confirm-back path already
   exists for vendors and produces a system-verified state
   (`sendLedger.js:19-22`). The same path pointed at a helper would make
   `confirmed` a fact rather than an attestation, and would be the first time
   this product could truthfully say someone was told.
3. **Per-person load.** Once names are on rows, the question a real planner asks
   is "how much is on Marcus" and "who has nothing." The aggregation at
   `helperResponsibility.js:193-208` is one step from answering it. That is the
   feature Weiss actually wants; per-row assignment is only its intake.
4. **Retirement that reaches the person.** Clause 6 makes the app TELL the host
   to un-tell someone. A 10 would draft that message the way
   `startHelperMessages` drafts the ask -- the withdrawal is as much an outward
   act as the request, and right now only half of it exists.

---

## NOT IN SCOPE

Explicitly excluded from this build. Do not scope-creep these in.

1. Importing `playbookMilestones` for any purpose. Rejected on measurement.
2. Seeding any row owner from playbook-authored owner strings ("coordinator",
   "grill master"). A role word is not a person.
3. Any notification, invite, account, or login for an assignee.
   `helperResponsibility.js:32` forbids it and this ruling does not reopen it.
4. Any write to `sendLedger` by the assign control itself.
5. The ROS owner editor. Named as the next build; not this one.
6. A section/area grouping model for the checklist. No such model exists and the
   `category` field is the generator's, not the host's.
7. Assigning paid vendors to checklist rows. They keep their own lifecycle.
8. Reordering, re-sorting, or regrouping the checklist by owner. The stored
   order is the order the host reads (`checklistReconcile.js:118-121`).
9. Bulk assign, assign-by-category, or any auto-assignment inference. Explicit
   host input only -- the "explicit data only" rule at
   `helperResponsibility.js:27-29`.
10. Any change to `toggleTask` indexing (`:4614`). Index safety is why the
    vendor-obligation rows are a separate group and it stays true here.
11. Fixing the retired-row "done by your plan -- tap to confirm" mislabel
    (`:15494-15519`). Real defect, logged, separate slice.
12. Any change to `demo/src/App.js` beyond reading it. It is frozen (A1,
    2026-07-16); its `helperConfirmed` writer at `:11261` is a donor reference,
    not an edit target.
