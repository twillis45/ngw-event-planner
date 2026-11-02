# PEOPLE — CAPABILITY PARITY LEDGER

**Phase B of the First Production Calibration Slice. Written 2026-10-20.**

Every reachable People capability at `d36740f`, classified, with its current
door, its reader and writer, where it goes in the redesign at mobile and at
desktop, what changes about its behaviour, what the migration risks, and the
test that would prove parity.

**Method.** A full read of `hostv2/src/HostShellV2.jsx` (~24.7k lines),
`hostv2/src/PeopleSurface.jsx`, `hostv2/src/InviteV2.jsx`, `hostv2/src/main.jsx`
and the `src/lib/` authorities they import, tracing every door, every reader and
every writer. Line references are to HEAD and will drift; the capability claims
will not.

**Nothing here is retired.** The owner requirement stands: a capability reaching
parity is reported **ELIGIBLE FOR RETIREMENT** and removed only on explicit
approval. No row in this ledger authorizes a deletion.

---

## 0 · CLASSIFICATION KEY

| Class | Means |
|---|---|
| **PROVEN IN HOST** | A host can reach it, use it, and the write lands and persists. Verified by reading the door, the handler and the write path end to end. |
| **WIRED** | The code path is complete but something outside this read gates it — a backend config, an engine raise I could not force, or a breakpoint I could not exercise. Not a defect; an unverified claim. |
| **ENGINE ONLY** | The authority exists and is correct. Nothing on the People surface reads it. |
| **SPEC ONLY** | Described in a document; no code. |
| **BROKEN / CONTRADICTORY** | Reachable, but two parts of the system disagree, and the disagreement costs the host something real. |
| **CAPABILITY GAP** | The product needs it, the host would expect it, and it does not exist anywhere. |

**Flag column** — `both` = present with and without `?people=1`; `peopleMode` =
only in the redesign; `legacy` = only without the flag.

**Destination column** — `M:` mobile (<640), `D:` desktop (≥1280). Tablet is
specified in Phase C; it inherits mobile's order and desktop's affordances in
the order Phase C sets out.

---

## 1 · THE COUNT AND ITS TRUTH

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Set a headcount without naming anyone | PROVEN IN HOST | both | guests sheet no-roster branch, `#guests-entry-anchor` −/+ | `event.guestEstimate` / `setGuests` → `patchEvent({guestEstimate, guestCountSource:'host'})` | M: inside the attendance block, revealed by *Use a different number* · D: same, in the main column | Reveal-on-demand instead of always-visible | **Medium** — see #6a; on a roster event it is currently unreachable | Setting a number from the no-roster state renders the new figure and writes `guestCountSource:'host'` |
| 2 | Lock the headcount so it drives food and seats | PROVEN IN HOST | both | ask card, *Lock N in* | `patchEvent({guestCount, guestEstimate, guestCountSource:'host'})` | Unchanged — the ask card is outside People | None | Low | A locked count renders on `basis:'count'` and never as a reply word |
| 3 | Adopt the number the app guessed (*Plan for 40*) | PROVEN IN HOST | **peopleMode** | `AttendanceDecision` CTA | `attendanceStatement().confirmable` / `onConfirmCount` → `patchEvent({guestEstimate, guestCount, guestCountSource:'host'})` | M + D: the dominant action of the attendance block on `basis:'estimate'` | **New capability** — the explicit adopt act §6.3 of the contract requires | Low | Adopting flips `countFromHost` and opens the outward gate; the figure's wording changes |
| 4 | Reopen a locked count | **WIRED** | both | ask card `lockcount` editor | `patchEvent({guestCount:''})` | Unchanged | None | **Medium — unverified.** I could not confirm the engine raise that produces this editor fires | Force the raise in a fixture; assert the editor renders and the reopen writes |
| 5 | Set the count from confirmed yeses | **WIRED** | both | `lockcount` editor | `confirmedCovers` / `patchEvent({guestCount, guestMode:'count'})` | Unchanged | None | **Medium — same raise dependency.** Note it correctly reads **covers**, not rows | Assert the written number equals `confirmedCovers`, not `yes.length` |
| 6 | See the honest attendance range | PROVEN IN HOST | hero = **legacy**; `AttendanceDecision` = **peopleMode** | legacy `BigValue` hero `:23441`; redesign `AttendanceDecision` | `attendanceBand` + `attendanceBandLabel` | M + D: first block of the operational field | The figure leads with its **basis** and **provenance**, not as a bare number | Low | Two events differing only in `basis` render visibly different statements |
| 6a | Headcount mode on a roster event | **BROKEN / CONTRADICTORY** | peopleMode | — | — | M + D: must be reachable | The stepper is `display:none` until *Use a different number*, and that control is `null` whenever a roster exists (`:24122`, `:24724`) | **Medium** | A roster event can still reach and change its headcount |
| 7 | Learn the number was the app's, not yours | **WIRED** | peopleMode | *Why this number* disclosure → `band.because` | `attendanceBand().because` | M + D: **in the statement**, not behind a disclosure | Promotes provenance from optional to unavoidable, per contract §6.1 | Low | The provenance sentence is present with the disclosure closed |
| 8 | Be told plainly *this number is not in anything we send* | **ENGINE ONLY** | neither | — (People) | `guestCountNotice` / — | M + D: beside the figure on `countFromHost === false` | **Closes G4.** The sentence exists and is discarded; only the vendor draft sheet renders it | Low — pure exposure | `guestCountNotice()`'s text appears on the People surface for a substituted count |
| 9 | Divide costs by real heads · *is the host in the count* | **ENGINE ONLY** | neither | — | `headsFor`, `hostCounts` / — | **Out of scope.** Money's consumer, not People's | None | Low | — (recorded, not adopted) |
| 10 | Choose counting mode: by list vs by headcount | PROVEN IN HOST | both | `#guests-counting-anchor` chips | `showsReplyTracking` / `guestPlanningMode` / `patchEvent({guestMode})` | M: inside the admin fold · D: same | Subordinated, not removed | **Low on data, real on a11y** — see #10a | The chips survive and the mode still suppresses chase UI |
| 10a | The chips' pressed state | **BROKEN / CONTRADICTORY** | both | same | *By list* is `aria-pressed={showsReplyTracking(event)}`; *By headcount* is `aria-pressed={event.guestMode === 'count'}` (`:23355`) | — | Two chips in one group answering two different questions | **Low effort, a11y-visible** | Both chips read their pressed state from `guestPlanningMode(event)` |
| 11 | *N of my 40 are kids* | **BROKEN / CONTRADICTORY** | both | no-roster branch stepper `:24757` | `event.kidsCount` / `patchEvent({kidsCount})` — then silently recomputed from the roster by `writeGuest` `:6549`, `removeGuest` `:6556`, `applyCsv` `:6533`, `undoLastCsvImport` `:6462`, `announceReplies` `:6911` | M + D: the value must survive | **G2 — silent data loss reaching the protein engine.** State 6 kids of 40, add one name, the 6 becomes 0 | **HIGH — fix before building on it** | State a headcount kids figure, add one roster name, assert the figure is not 0 and food did not resize |

---

## 2 · THE LIST

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 12 | Add names, one per line | PROVEN IN HOST | both | textarea + *Add them* | — / `addRoster` → `patchEvent({guests})` | M: folds behind *Add more names* at ≥8 guests · D: same | Folded once the list is established | Low | Adding names from the fold still lands rows |
| 13 | *Denise & Ray* counted as two people | PROVEN IN HOST | both | suggest-and-confirm under the textarea | `detectCoupleNames` / `addRoster` writes a shared `coupleId` | M + D: unchanged, under the add control | None — suggest-and-confirm stays, never silent | Low | A couple string yields two rows with one `coupleId`, only after confirmation |
| 14 | *Your stated couples aren't paired yet* | PROVEN IN HOST | both | format-hint line | `event.guestPairs` + `bedroomsNeeded().basis` | M + D: with the add control | None | Low | The hint appears when pairs are stated but unpaired |
| 15 | Change one guest's reply | PROVEN IN HOST | both | row → accordion → REPLY radiogroup | `confirmedCovers` receipt / `setRsvpValue` → `patchEvent({guests})` | M: inline accordion · **D: the rail**, list stays put | Detail moves out of the list at desktop | **Medium** — the hoist is what crashed once (a helper called 650 lines before its declaration); 19 browser tests passed through it | Selecting a guest at desktop renders the detail and **does not blank the surface** |
| 16 | Record how many children a guest brings | PROVEN IN HOST | both | accordion CHILDREN −/+ | `kidsTotal` / `writeGuest(i,{kids})` | M: accordion · D: rail | None | Low (but see #11) | Kids per row roll into `kidsTotal` and only a confirmed row's kids lock in |
| 17 | Mark a plus-one by name | PROVEN IN HOST | both | accordion *+1 name* | `attendanceBand` (a filled `plusOne` is a real adult) / `writeGuest` | M: accordion · D: rail | Labelled *Who they're bringing* | Low | A filled plus-one adds one adult to the band, not a half |
| 18 | Dietary needs, free text | PROVEN IN HOST | both | accordion field | `g.needs` / `writeGuest(i,{needs})` | M: accordion · D: rail | None | Low — **but no undo** (§5) | The field persists |
| 19 | Structured allergen / diet tags | **ENGINE ONLY** | displayed in both | — (no host writer) | `g.allergens` / `g.diets`, written only by `InviteV2.jsx:623` or CSV | M + D: display stays; **a host writer is a gap** | **G3** — the chips look like controls and are not | Low | The tags render read-only and no handler is attached |
| 20 | Meal choice | PROVEN IN HOST | both | accordion MEAL chip → inline picker | `MEAL_SHORT` / `writeGuest(i,{meal})` | M: accordion · D: rail | None | Low | The picker writes and the row reflects it |
| 21 | Phone / email | PROVEN IN HOST | both | accordion fields | `formatPhoneUS`, `isMalformedEmail` / `writeGuest` | M: accordion · D: rail | None | Low — **no undo** | Malformed email is flagged without blocking |
| 22 | File a guest into a group | PROVEN IN HOST | both | accordion field + `<datalist id="v2-groups">` | `g.group` / `writeGuest(i,{group})` | M: accordion · D: rail | None | Low — **no undo** | The four suggestions appear and free text is accepted |
| 23 | Roster grouped by group | PROVEN IN HOST | both | automatic at ≥2 distinct groups | — | M + D: unchanged | None | Low | Two groups produce two labelled sections |
| 24 | Remove a guest | PROVEN IN HOST | both | accordion *Remove* | — / `removeGuest(i)` → `patchEvent({guests, kidsCount})` | M: accordion · D: rail | Destructive styling under `peopleMode` | Low — **undoable** | Removal is undoable and the undo restores the row's reply and meal |
| 25 | **Edit a guest's name** | **CAPABILITY GAP** | neither | — | — | M + D: the first field of the detail | **G1.** A typo requires remove-and-re-add, destroying reply, meal, kids, contact and group | **HIGH — small fix, daily failure** | Editing a name preserves every other field on the row |
| 26 | A private note on a guest | **ENGINE ONLY** | neither | — | `g.partyNotes` round-trips through CSV export/import only (`:6486`, `:6517`) | **Out of scope** — recorded | **G9** | Low | — |
| 27 | Search the guest list | PROVEN IN HOST | both | roster toolbar *Find someone* (≥8) | `rosterQ` over name / plusOne / group / email | M + D: roster toolbar | None | Low | Search narrows and the lens counts recompute **after** it |
| 28 | Filter by reply state | PROVEN IN HOST | both | lens chips with per-state counts | `rosterLens` | M: scrollable chip row · D: same row, more room | None | Low | Each lens's count matches its filtered length |
| 29 | Recover when a filter empties the list | PROVEN IN HOST | both | *Show everyone* in the empty state | resets `rosterQ` + `rosterLens` | M + D: unchanged | None | Low | An empty filter result offers a working control, not prose |
| 30 | Jump to who hasn't replied | **WIRED** | **peopleMode, desktop only** | `PeopleRail` → *See who hasn't replied →* | `onShowUnanswered` sets `rosterLens('none')` + scrolls | D: the rail | Desktop-only affordance | **Medium — unverified.** Renders only at `peopleRailUp` (`peopleMode && railUp && bp==='desktop'`), which this read could not exercise | At 1280px the rail link sets the lens and scrolls the list |

---

## 3 · IMPORT, EXPORT AND HISTORY

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 31 | Import a guest list from CSV | PROVEN IN HOST | both | fold → platform `OptionList` → file → preview → *Bring them in* | `lib/csvParsers` / `applyCsv` → `patchEvent({guests, kidsCount})` | M + D: inside the admin fold | Subordinated into one fold | **Medium** — the fold must not bury a destructive merge | A CSV import still previews before writing |
| 32 | See what the CSV will do first | PROVEN IN HOST | both | preview line: *N of M read cleanly · X new · Y already on your list* | `csvPreview.summary` | M + D: with the import | None — **non-negotiable** | Low | No write occurs before the preview is confirmed |
| 33 | See past imports | PROVEN IN HOST | both | *Past imports · N* fold | `loadImportBatches` | M + D: admin fold | None | Low | Batch timestamp, platform and counts render |
| 34 | Undo the last import | PROVEN IN HOST | both | *Undo last import* | `undoLastImportBatch` / `patchEvent({guests: snapshot, kidsCount})` | M + D: admin fold | None — **latest batch only, and the copy says so** | Low | Undo restores the exact pre-import roster |
| 35 | Delete stored import snapshots (PII) | PROVEN IN HOST | both | *Clear import history* | `localStorage.removeItem` — **not a `patchEvent` write** | M + D: admin fold | None | Low — **but it is outside undo** | Clearing history leaves the guest list untouched |
| 36 | Download the guest list as CSV | PROVEN IN HOST | both | *Download the guest list (CSV)* | `toCSV` / `COLUMNS.guests` / `downloadCSV` | M + D: admin fold | None | Low | Export round-trips through import |

---

## 4 · ASKING, AND THE INVITE

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 37 | Share the RSVP link | PROVEN IN HOST | both | primary CTA of `GetResponses`; legacy pill grid | `inviteLinkUrl()` / clipboard or `navigator.share` | M + D: the single full-width primary of the ask block | Promoted to the one dominant action | Low — **the toast already downgrades honestly** when `isRsvpApiConfigured()` is false | The share toast tells the truth about configuration |
| 38 | Show a QR | PROVEN IN HOST | both | *Show the QR* → `sheet.kind:'qr'` | `QRCode.toDataURL(inviteLinkUrl())` | M + D: quiet secondary row | Demoted from a peer of share | Low | The QR sheet opens and encodes the invite URL |
| 39 | Preview the guest-facing page | PROVEN IN HOST | both | *Preview the RSVP* → `window.open('?rsvp=CODE')` | `inviteLinkUrl()` | M + D: quiet secondary row | Demoted | Low | Opening the preview does **not** mount the host shell |
| 40 | Copy the invite text | PROVEN IN HOST | both | → draft sheet | `draftInvite(event, profile, {rsvpUrl})` / `openDraft` | M + D: *More ways to reach people* fold | Demoted to a third tier | Low | The draft carries the invite URL |
| 41 | Draft the guest brief | PROVEN IN HOST | both | → draft sheet | `draftGuestBrief` / `openDraft` | M + D: third tier | Demoted | Low | The draft opens |
| 42 | Draft an update to everyone | PROVEN IN HOST | both | → draft sheet | `draftGuestUpdate` / `openDraft` | M + D: third tier | Demoted | Low | The draft opens |
| 43 | Write a bulk nudge | PROVEN IN HOST | both | only when `showsReplyTracking` | `draftRsvpChase` / `openDraft` | M + D: third tier, gated | None — **the label was deliberately changed from "Nudge the quiet ones" because the draft has no recipient list** | Low | The label never implies a recipient list, and the control is absent on a count-only event |
| 44 | Nudge one specific guest | PROVEN IN HOST | both | accordion *Text / Email / Call <first>*, when chasing and unanswered | `draftRsvpChase` body / OS composer | M: accordion · D: rail | None | Low | Shown only when chasing **and** the row is unanswered |
| 45 | Reach a guest who already replied | PROVEN IN HOST | both | quiet contact row, mutually exclusive with #44 | — | M: accordion · D: rail | None | Low | Exactly one of #44 / #45 renders per row |
| 46 | *I told them myself* | PROVEN IN HOST | both | *Mark it sent to <first>* / *✓ told* | `guestToldMap` / `isTold` / `markTold` → `patchEvent({guestTold})` | M: accordion · D: rail | None | Low | Marking told is undoable and persists |
| 47 | How many still don't know | PROVEN IN HOST | both | told-rollup above the toolbar (≥8) | `toldRollup(event)` — **counted only over guests with a phone or email** | M + D: above the toolbar | None | Low — **the denominator is reachable guests, and the copy must say so** | The rollup's denominator excludes uncontactable guests |
| 48 | *Nobody quiet left contact details* | PROVEN IN HOST | both | one-line grounding note | — | M + D: under the ask block | None | Low | The note appears instead of disabled-looking buttons |
| 49 | Set a reply-by date | PROVEN IN HOST | both | legacy: `v-meta` line · peopleMode: `GetResponses` quiet button | `rsvpDeadlineFor` (`rsvpByIsSet = source === 'override'`) / `patchEvent({rsvpDeadline})` | M + D: with the ask block | One `renderDeadlineEditor` definition, two openers | **Low now, HIGH historically** — this reintroduced the 2026-07-14 defect once and is red-proofed | **A derived reply-by is never spoken as a date she set** |
| 50 | Let the app propose a reply-by | PROVEN IN HOST | both | *pick one for me* / *use ours* + the derived reason | `proposeReplyBy(event)` / `patchEvent({rsvpDeadline})` | M + D: with #49 | None — **nothing is written until tapped; the invite stays silent until then** | Low | No `rsvpDeadline` is written by rendering the proposal |
| 51 | Plus-one policy | PROVEN IN HOST | both | invite rules fold | `event.plusOnePolicy`, enforced at `InviteV2.jsx:494` / `patchEvent` | M + D: admin fold | Subordinated | Low | The policy is enforced on the guest page |
| 52 | Kids policy | PROVEN IN HOST | both | invite rules fold | `event.kidsPolicy`, enforced at `InviteV2.jsx:495` | M + D: admin fold | Subordinated | Low | Enforced on the guest page |
| 53 | Ask yeses for a mailing address | PROVEN IN HOST | both | invite rules fold | `event.collectAddresses`, honoured at `InviteV2.jsx:1216` | M + D: admin fold | Subordinated | Low | The field appears on the guest page only when set |
| 54 | Gift wish + detail | PROVEN IN HOST | both | `SettledRow` *Gifts* → `OptionList` + detail | `event.giftWish` / `patchEvent({giftWish})` | M + D: admin fold | Subordinated | Low | Five options persist with their detail |
| 55 | Choose the invite look | PROVEN IN HOST | both | `SettledRow` *Invite look* | `event.inviteStyle` / `patchEvent({inviteStyle})` | M + D: admin fold | Subordinated | Low | Three looks persist |
| 56 | Put the event artwork on the invite | PROVEN IN HOST | both | artwork chips — **only when `eventArtworkFile(event)` is truthy** | `eventArtworkFile` / `patchEvent({inviteCrest})` | M + D: admin fold | None | Low | The chips are absent when there is no artwork |

---

## 5 · NEEDS, CONSEQUENCE AND THE MOVE

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 57 | Who has a known access need, and who is unnamed | PROVEN IN HOST | **peopleMode** | `StillUnknown` — *Accounted for* (grouped, with a *Who* expander) and *Still unknown* (host's verbatim phrase + *we won't guess which person*) | `accessNeedsFor(event)` / — | M + D: after the list · **D: also in full in the rail** | **Closes the old D2.** Grouped by need, not repeated per person | Low — **read-only by contract** | The unowned case renders the need **and** the unknown owner, and **neither roster name appears in the needs block** |
| 58 | Attach an unowned need to a named guest | **CAPABILITY GAP** | neither | — | — | **No control.** Engine work first | **G7, declared in-code.** `accessNeedsFor` merges intake and roster sources with **no dedupe**; `lodgingIntel.js:2073` prints the requirement count as prose (*"2 people asked about stairs"*), so assigning would make lodging say two people asked about one | **Medium — engine, not UI** | Closing it means changing `accessNeedsFor`, guarded by its own 29-test suite |
| 59 | The engine's one next guest move, with a door | PROVEN IN HOST | **peopleMode** | `OneMove` band | `eventPlan` → first action/worry with `domain === 'guests'`; **CTA only when `resolveRoute` lands somewhere that is not `guests`** | M + D: directly under the attendance block | **The move carries its consequence**, per the reference's ladder | Low | The move's *why* names another domain; no CTA is offered back to People itself |
| 60 | Dismiss a guest-list nudge | PROVEN IN HOST | both | `nudgeFor('guests')` → *Dismiss* | `eventContextNudge` / `patchEvent({contextNudges})` | M + D: **after** the roster under `peopleMode` (`:24631`); **before** it in legacy (`:24269`) | Position changed | Low | A dismissed nudge stays dismissed across a reload |
| 61 | Open the guest list from elsewhere | PROVEN IN HOST | both | nav `:25018` · tile `:11779` · voice `:8609` · chase/rsvp CTA `:7142` · `sheet.focus` deep links `:4657-4682` | `setSheet({kind:'guests'})` | M + D: one surface, five routes | None — **the Duplicate Surface Rule** | Low | Exactly one `{sheet.kind === 'guests' && (` render exists in the shell |
| 62 | Replies arrive and update the roster | **WIRED** | both | background effect, no control | local outbox `ngw-rsvp-queue-<id>` + `fetchEventRsvps` → `mergeGuestReplies` / `announceReplies` → `patchEvent({guests, kidsCount}, {noUndo:true})` | **Unchanged — must not change** | None | **Medium — unverified.** The backend leg is gated on `isRsvpApiConfigured()`; a live round trip was not confirmed. Audit find 2026-07-08: without the backend pull, *"delivery success made replies vanish"* | Replies land, merge by the `lib/guestMerge` rules (exact → last+first ≥3 → first-only ≥4), and offer **no Undo** |
| 63 | Assign a guest to a table | **WIRED** | both (not flag-gated) | `sheet.kind:'seating'` | `buildSeatingPlan`, `assignGuestToTable`, `autoAssignByGroup`, `seatsFor` / `patchEvent({guests})` | **Its own surface.** People shows the consequence only | None | **Medium — unverified** (drag interaction not exercised) | Seating counts **covers**, not rows |
| 64 | Gift received / thank-you sent | PROVEN IN HOST | both | plan stage *What carries forward* → `sheet.kind:'thanks'` | `g.giftReceived`, `g.thankYouSent` (read by `phaseProgress` post_event) / `writeGuest` | **Out of People's scope** — past events only (`isPast && some rsvp === 'Yes'`) | None | Low | — |
| 65 | The guest's own reply | **WIRED** | n/a (guest surface) | `?rsvp=CODE` | `fetchPublicInvite` / `submitRsvp` + local outbox | **Unchanged — must not change** | None | **Medium — the delivery leg needs `isRsvpApiConfigured()`** | The host shell is unreachable on an `?rsvp=` URL |

---

## 6 · WRITES, UNDO AND PERSISTENCE

| # | Capability | Class | Flag | Current door | Reader / Writer | Destination | Behaviour change | Migration risk | Parity test |
|---|---|---|---|---|---|---|---|---|---|
| 66 | Undo a guest edit | PROVEN IN HOST | both | the toast's *Undo* | `patchEvent` snapshots pre-patch values for the keys it writes | M + D: unchanged | **Coverage must become a decision, not an accident** | **Medium — G12** | Named edits are undoable; the uncovered set is explicitly listed and justified |
| 67 | Throw away all changes to an event | PROVEN IN HOST | both | settings → *Reset changes to this event* | `setPatch({})` — **bypasses `patchEvent`, so no undo and no toast** | **Out of People's scope** — recorded | None | Low | — |

### 6.1 · Undo coverage, measured

**Covered:** add names · remove a guest · set a reply · meal · kids ± · CSV
apply · import undo · counting mode · invite rules · gift wish · invite look ·
reply-by · mark-told.

**Not covered:** every `writeGuest(i, patch, null)` — **plus-one, dietary needs,
phone, email, group, gift-received** — because `msg` is `null`, so no toast and
therefore no undo. Plus: incoming replies (deliberate, `{noUndo:true}`),
`clearImportHistory` (localStorage, not an event write), and `setPatch({})`
(outside `patchEvent` entirely).

### 6.2 · Persistence, measured

`patchEvent` picks one of two destinations. A host-created event (`activeCustom`)
merges into the `customs` list and, with a session, pushes via `cloudSaveEvent`
with the result recorded by `noteSaveResult`. A seeded or real event merges into
`patch`, which an effect at `:3169` writes to `localStorage` under
`LS_PATCH(eventId)`; a signed-in host with a matching base also gets a
`cloudSaveEvent` superset merge.

**Two People stores sit outside the event blob and are device-local:** import
snapshots under `GUEST_IMPORT_BATCHES_KEY + ':' + event.id` (`:6440`), and the
inbound reply outbox `ngw-rsvp-queue-<eventId>`, which is **drained and deleted
on read** (`:6929-6938`). Everything else in this ledger survives a reload on
the same device.

---

## 7 · THINGS THAT LOOK LIKE CAPABILITIES AND ARE NOT

Recorded so the redesign does not "preserve" an affordance that was never one,
and does not accidentally promote a display into a control.

| What it looks like | What it is | Evidence |
|---|---|---|
| The RSVP status chip on a roster row | `aria-hidden`, display-only. The **whole row** is the trigger; the chip's prior life as the picker's trigger was deliberately removed | `:24478-24487` |
| Allergen and diet chips on a row | `.tag.plan` with **no handler**. Settable only by the guest or by CSV | `:24531-24534` |
| The detail's *Helping with:* line | A read-only projection of `guestHelperRoles`. Roles are assigned on the **space** sheet | `:23727-23738` |
| The roster's column header row | `aria-hidden`, CSS-hidden below the rail band — furniture for the desktop grid. **There is no sorting anywhere in the roster** | `:24589-24598` |
| `PeopleHero`'s cover image | Reads `event.coverImageUrl`, **a field no writer in the repo produces**, plus a review-only `?peoplefixture=` override. A host cannot set a cover | `:24040-24047` |
| *Write a nudge to send* | Opens a draft with **no recipient list**. The per-row `sms:` / `mailto:` / `tel:` links are the only thing that reaches a named person, and they hand off to the OS. **Nothing in this product ever claims to have sent** | `:23628-23632` |
| The headcount stepper under `peopleMode` | `display:none` until *Use a different number*, which is itself suppressed on any event with a roster — so on a roster event counting by headcount, it is **unreachable** | `:24724`, `:24122` |

---

## 8 · TALLY

| Class | Count | Of which carry risk |
|---|---|---|
| PROVEN IN HOST | 50 | — |
| WIRED | 8 | #4, #5 (engine raise), #30 (desktop rail), #62, #63, #65 (backend / interaction) |
| ENGINE ONLY | 4 | #8 (G4, pure exposure), #9, #19 (G3), #26 (G9) |
| SPEC ONLY | 0 | — |
| BROKEN / CONTRADICTORY | 3 | **#11 (G2 — silent data loss)**, #6a (G6), #10a (G10) |
| CAPABILITY GAP | 2 | **#25 (G1 — name editing)**, #58 (G7 — engine dedupe) |

### 8.1 · The headline, restated

**The People redesign remains mostly an exposure problem.** Fifty of
sixty-seven capabilities are proven and reachable; the redesign's job for those
is placement and language, not construction.

**But it is no longer *only* an exposure problem.** Three contradictions and two
gaps are now measured, and two of them cost a host something real:

1. **#11 / G2 — `kidsCount` is silently destroyed** by the next roster write,
   and the loss reaches the protein engine. This is the only defect in the
   ledger that produces a wrong number in the physical world.
2. **#25 / G1 — a guest's name cannot be edited.** The workaround destroys the
   row's reply, meal, children, contact details and group.

**Both are small, local fixes with existing writers, and both should land before
the surface is rebuilt on top of them.** A redesign built over silent data loss
makes the loss harder, not easier, to see.

### 8.2 · Verification debt

Six capabilities are **WIRED** rather than proven, and all six are unverified
for the same honest reason: this phase was a read, not a run. Specifically
unexercised — the `lockcount` engine raise (#4, #5), the desktop rail at ≥1280px
(#30), the live reply round trip (#62, #65), and the seating drag (#63). **None
is claimed as working.** Converting any of them to PROVEN is a browser test, not
an argument.
