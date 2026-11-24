# Cohesion batch D: Your checklist (renders for owner approval, never merges)

**Plan:** the built-in Wanda sample (41 steps, 2 checked off). **Clock:** fixed at Tue, Nov 24, 2026 10:00, so the party is 116 days out. **Theme:** light. **Scale:** dsf 2 at 390 (phone), 834 (11" iPad), 1024 (13" iPad, rail board) and 1440 (desktop).

**before** is the live build (`main` at `5fa9fe9`, `npm run e2e:build`).

**proposed** is the same build with the checklist's rows swapped for proposed markup made from the app's own classes (`render.mjs`):
- Every step's words, date, owner and action label are read from the live rows. None are typed in.
- The hero ("Checked off · 2 of 41") is the real one.
- Nothing in the app was changed.

## The proposal

Audit rows: **#10** (P1, rules 1 and 2) and **#33** (P2, rule 11).

1. **One lit action: "Up next".** The earliest open step sits on its own card at the top. Its own route is the lit button ("Open your guest list" for the photo drop). "Check it off" and "Give this to someone" sit under it, quiet. When she checks it off, the next step moves up. This follows the Day's "Still to do today" pattern (batch A).
2. **Grouped by when, with each date said once.** The groups are:
   - By the end of February;
   - Early March · Mar 1–13;
   - The last week · Mar 14–19;
   - On the day · Sat, Mar 20;
   - After the party.

   A step shows a plain date ("Mon, Feb 22"), never "in 95 days" beside "Week of".
3. **Only the current group is open.** Later groups fold to one row each ("Early March · Mar 1–13 · 10 steps · 3 handed off ▸") and open in place. The finished steps fold to "✓ 2 checked off ›" (rule 5).
4. **A step opens in place (rule 2).** A closed row has two targets:
   - the check, its own 44 px box;
   - the row, which opens the step under itself (▸ turns to ▾).

   The opened step shows the detail, then "Who has it", then its buttons in one line: the route, "Give this to someone" (or "Send Cory their job"), and "Check it off". The proposed render shows "Lock catering" opened as the example.
5. **The host is "You" (#33).** A step owned by the host reads "Yours". The tell and confirm buttons are gone from it ("Wanda — not told yet" and "Mark Wanda confirmed" today, where Wanda Mundy is the host).

## Measured (`measure.json`, from `render.mjs`)

| | Buttons in the sheet | Lit | Full length at 390 | Sideways scroll | Text < 11 px | Taps < 44 (touch) |
|---|---|---|---|---|---|---|
| before | 126 | 0 | 10,119 px | none | none | "‹ Sections" 67×16, "Close" 64×28 (the sheet header, batch F #46) |
| proposed | 18 | 1 | 1,619 px | none | none | the same two header controls only |
| proposed, every group open | 88 | 1 | 5,190 px | none | none | the same two |

None of the proposal’s own controls measured under 44×44 at any touch width.

## Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 | Group by **when** (phases with dates) or by **area** (food, people, venue, the day)? | **When.** The checklist answers "what's next"; Calls to make and the sections already sort by area. |
| D2 | Later groups **folded** (proposed) or **all open** (`proposed-all-groups-open__…__390.png`)? | **Folded**, with the current group open and each folded row saying its count and how many are handed off. |
| D3 | What a row tap does: **open the step in place** (proposed) or **check it off** (today)? | **Open in place.** The check keeps its own 44 px box. Checking off by accident is today's most likely mistake, because the whole row is the toggle. |
| D4 | When "Up next" has no route (e.g. "Lock catering": `checklistRouteFor` returns none), the lit button is **"Check it off"**. Or should it borrow the area's door (People you're hiring)? | "Check it off" now. Add the fallback route with batch F's "step routing fallbacks", so the lit button always goes somewhere real. |
| D5 | Steps "your plan did this" (inferred) stay in their group with a green "confirm" tag (proposed). Or move them into one "Your plan handled N · confirm" row? | Keep them in place. There is one in Wanda; a separate row is worth it only past about 3. |

**Owner decisions (11/24/2026): D1–D5 approved as recommended.**
- **D1:** group by when.
- **D2:** later groups folded.
- **D3:** a row tap opens the step in place; the check keeps its own box.
- **D4:** a step with no declared target lights "Check it off" on the checklist. The parent confirmed the routing fallback: everywhere else, such as the board's "Then, in order", a step with no declared target goes to its own checklist row (`stepRoute`). The checklist itself has no further fallback to borrow.
- **D5:** inferred steps stay in their group with the green "confirm" tag.

## What the build needs

- **View-only.** No new data. The groups come from the existing due date (`taskDueLabel`/`taskLeadDays`) against `event.date`. "Up next" is the first open, non-inferred step in that order. The host match uses the existing `hostNameFor(event, profile)`.
- `renderGroupedTasks` keeps the dinner group (`theDinnerStepsAreOneGroup`) as a group inside its phase.
- Open-in-place state is per step, session-only. The fold reopen uses `useReopened` (rule 5).

## e2e specs it would touch

- **Row structure.** Today the row is a button that toggles done, with the action, assign and helper buttons as siblings. These specs read or press that structure:
  - `taskOwnership`
  - `helperConfirm`
  - `aHelperGetsTheirJobByLink`
  - `theHelperEmailSaysWhatItDoes`
  - `theChecklistButtonsLineUp`
  - `aCallStepOpensItsCall`
  - `theAlbumRowAddsTheLink`
  - `groupTripRowsLandRight`
  - `theDinnerStepsAreOneGroup`
  - `aStepTheChecklistHandledIsNotCaughtUp`
  - `checklistFollowsDecisions`
  - `dayOfChecklist`
  - `aFinishedGroupCollapses`
  - `confirmEveryBooking`
  - `theBorrowedListGoesBack`
  - `sponsorsAreMoneyComingIn`
  - `oneRoomPlanSaysWhoSleepsWhere`
  - `theTripDetailsDraft`
  - `theTripDetailsPostToEveryone`
  - `theDatePollAsksOnTheInvite`
- **Tap floor and sweeps:**
  - `mobileTapFloor`
  - `nothingPressableIsUnderTheFloor`
  - `a11yFloor`
  - `motionContinuity`
  - `boardMatrix`
  - `_eightiethAudit` (a capture, not a gate)
- **New:** extend `oneLitButtonPerSheet` to require **exactly 1** lit button on the checklist.

## Files

| File | What it shows |
|---|---|
| before__checklist__Wanda-sample__{390,834,1024,1440}.png | The checklist today, full length (10,119 px at 390) |
| before__checklist__Wanda-sample__{w}__screen.png | The same, as the first screen shows it |
| proposed__checklist__Wanda-sample__{390,834,1024,1440}.png | Proposed, full length: Up next, February open with "Lock catering" opened, later groups folded, "2 checked off" fold |
| proposed__checklist__Wanda-sample__{w}__screen.png | Proposed, the first screen |
| proposed-all-groups-open__checklist__Wanda-sample__390.png (+ __screen) | Decision D2's alternative: every group open, no step opened |
| measure.json | Buttons, lit count, full height, taps under 44, text under 11 px, sideways scroll, per capture |
| render.mjs | The render script (uses `../_tools/lib.mjs`) |
