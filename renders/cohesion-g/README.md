# Cohesion batch G: small sheets and copy (renders for owner approval, never merges)

**Plan:** the built-in Wanda sample. **Clock:** fixed at Tue, Nov 24, 2026 10:00. **Theme:** light. **Scale:** dsf 2 at 390, 834, 1024 and 1440.

**before** is the live build (`main` at `5fa9fe9`, `npm run e2e:build`). **proposed** is the same sheet with the change applied to its DOM, in the app's own classes (`render.mjs`). Nothing in the app was changed.

Most of G is wording. **Only the sheets whose layout changes are rendered**: Messages, Where everyone stays, What could go wrong, You & settings, Make it yours, Venue and Ask No Guesswork. Every wording change is in the old → new table below.

## Rendered: layout changes

| Sheet | Audit row · rule | Before | Proposed |
|---|---|---|---|
| **Messages** | #27 · rules 6, 14 | "Couldn't load the email the app sent — check your connection and reopen this. Below is only what this device recorded." It points below, and nothing is there. | Hero "Sent from this plan · **Nothing yet**", then "When you send the invite, a nudge or an update, it's listed here: what went out, to whom, and when." The load failure gets its own row: "Email history · Couldn't reach it just now…". |
| **Where everyone stays** | #28 · rules 6, 1 · #58 · rule 8 | The names are bold and link-blue with no handler, the address is printed twice, and there is nothing to do. The door says "Travel & where everyone stays" while the sheet says "Where everyone stays". | Names in ink. Each stay is a row that **opens in place to edit** who, where and the note (▸). The address is said once, in the hero. One quiet "Add a stay". The title matches the door. |
| **What could go wrong** | #26 · rule 1 (with #25, #60 wording) | 8 cards, each with two equal buttons. The first button's name changes card to card ("Add to my checklist" or "Plan for this"). | Grouped by the tag the card already wears: **Worth planning now (2)** open; **Keep an eye on it (5)** and **Minor (1)** folded with their counts. The same slot always holds the constructive act: "Plan for this ›" where the risk routes, "Add it to my checklist" where it doesn't. Then "I've covered this" (Undo in its toast, as today). |
| **You & settings** | #41 · rule 2 · #50 · rule 4 | The name and area fields are labeled only by their placeholders, and the name placeholder truncates ("Your name — it signs every note we dra…"). "On — tap to mute". Hero "Nothing remembered yet". | Labeled fields: "Your name — it signs the notes we draft for you", "Your town or city". Placeholders become examples ("For example: Rosa Delgado"). The toggles read "On". The hero is "Your setup", with "How you host, your area and your data. Nothing is guessed about you." |
| **Make it yours** | parent's list (8 fields) · rule 2 · #52 · rule 4 | 8 fields. The words above each are a `<div>`, not a `<label>`. Several placeholders are bold dark text that reads like a saved answer ("Good food, good people", "The moment that has to happen"). One placeholder uses a real first name ("Todd — or “Todd & Sarah”"). The intro says "The day-before brief". | The visible words become each field's `<label>`. Placeholders are faint italic "For example: …", and the name example uses made-up names ("Rosa — or “Rosa & Sam”"). Intro: "Your words go into the run of show, the toast and the note we draft the day before. Nothing here is required." |
| **Venue** | parent's list (1 field) · rule 2 | One field with the placeholder "Name or address" and no label. | Label "The place's name or street address", placeholder "For example: Elm Court Hall, or 42 Elm Ct". |
| **Ask No Guesswork** | parent's list (1 field) · rule 2 | One field with the placeholder "e.g. will $2,000 cover it?" and no label. | Label "Your question", placeholder "For example: will $2,000 cover it?". |

## Measured (`measure.json`)

| Sheet | Fields without a `<label>`: before → proposed | Text < 11 px | Sideways scroll | Taps < 44 (touch) |
|---|---|---|---|---|
| You & settings | 2 → 0 | none | none | none in the sheet body |
| Make it yours | 8 → 1 | none | none | none in the sheet body |
| Venue | 1 → 0 | none | none | none in the sheet body |
| Ask No Guesswork | 1 → 0 | none | none | none in the sheet body |
| Messages, Where everyone stays, What could go wrong | 0 → 0 | none | none | none in the sheet body |

- The same at all four widths.
- The one field left in Make it yours is the hashtag field. It has no visible words above it to promote, so the build gives it the label "Your own hashtag".
- The sheet header's "‹ Sections" (67×16) and "Close" (64×28) are the only touch taps under 44. They are batch F's #46.

## Not rendered: outward and code-level

| Item | What happens today (measured or read from code) | Proposed |
|---|---|---|
| **City save writes "City, ST" into the venue name** (outward pages) | Measured here (`measure.json` → `venue-city-typed`; screenshot `before__venue-city-typed__own-plan__390.png`). On a made-up plan with no venue, typing "Springfield, VA" in the Venue box and pressing Save stores `venue: "Springfield, VA"` with **no `venueCity`/`venueState`**. `saveVenue` (HostShellV2.jsx:1712) reads typed text with `townFieldsToPersist` only for an at-home plan. Anywhere else it is `setVenue({ name })`. The invite, family and vendor pages then print the city as the place's name, and "City noted" never happens. | Read every typed venue with the same reader (`townFieldsToPersist` / `readPlace`). Text that is only a town or ZIP goes to `venueCity`/`venueState` (or `venueZip`). The name stays empty, and the venue card then asks "What's the place called?". The toast says "Springfield, VA noted. Add the place's name when you have it." |
| **The reply notice's `host`** (outward email) | `backend/app/guest_notices.py:77` (reply notice) and `:123` (announcement) read `coalesce(hostName, hostNames)` only. They miss the event's `host` field (the Wanda sample stores `host: 'Wanda Mundy'`) and her profile name. So the email says "Your host answered your question" when the plan knows her name. Every other outbound template asks `real_host_name(sender, host_name_for(ev))` (`communication.py:165`, `invite_email.py:95`). | Use the same reader: `real_host_name(<profile display name>, host_name_for(e.data))`, then take the first word. One reader for every outbound name. |
| **Reconfirm sweep order** (#31 · rule 7) | Per vendor, `HostShellV2.jsx:22386–22388` shows "Text them" (an `sms:` link), "Copy the note", then "Read it first". There is no "Mark it sent" record. | Same order as the vendor draft sheet: **"Read it first"** (opens the draft), then inside the draft "Text them" and "Copy", then "Mark it sent — I sent it myself", which records it. |
| **Split: "Copy the settle-up ask"** (#32 · rules 7, 10) | `HostShellV2.jsx:20175` copies silently: no toast and no record. | Toast "Copied — paste it in your group chat." plus a quiet record line: "Settle-up ask copied Nov 24". |
| **Date change confirm** (#53 · rule 18) | A native `window.confirm`: "N things planned after the new last day: … Change the dates anyway? Nothing is deleted." (`:10172`). | No confirm. Change it, and the toast reads "Dates changed. 3 things now fall after the last day — they're kept. Undo." (`patchEvent` undo). "Put this copy back?" (`:22591`) keeps a confirm, because restoring replaces work and cannot be undone. |
| **#39 settings checkbox 13×14** | The marketing-email checkbox shows only when the cloud is configured. The e2e build has no cloud, so it was **not reproduced here**. | A 44×44 label hit area around it (the row is the label). |

## Copy changes: old → new

| # | Where | Old | New |
|---|---|---|---|
| 25 | What could go wrong | "Guest expectations for ceremony vs. celebration formality will diverge if not clarified early." | "Guests may not know if this is a formal ceremony or a party." |
| 25 | What could go wrong | "Clarity on timing cascades to reduce all downstream friction." | "Say which it is on the invite: the dress, and when the ceremony part starts." |
| 26 | What could go wrong | "Plan for this" / "Add to my checklist" (the name changes in the first slot) | "Plan for this ›" (routes) / "Add it to my checklist" (records), always in the first slot |
| 26 | What could go wrong | "Handled — stop showing this" | "I've covered this" (toast keeps Undo) |
| 60 | What could go wrong | "Buy ~1.5 lb ice/guest day-of" | "Buy about 1.5 lb of ice a guest (est., your playbook) the day of" |
| 60 | What could go wrong | "Plan ~1-1.25 servings/guest (buffet ~0.5 lb protein/guest)" | "Plan 1 to 1¼ servings a guest, about ½ lb of protein each at a buffet (est., your playbook)" |
| 60 | What could go wrong | "Pre-assign 3-5 speakers at ~2-3 min" | "Ask 3 to 5 speakers for about 2–3 minutes each (est., your playbook)" |
| 27 | Messages | "Couldn't load the email the app sent — check your connection and reopen this. Below is only what this device recorded." | "Nothing yet" + "When you send the invite, a nudge or an update, it's listed here: what went out, to whom, and when." / failure row: "Couldn't reach it just now. Check your connection and reopen this. Anything sent from this device still shows here." |
| 58 | Section door ↔ sheet title | door "Travel & where everyone stays", title "Where everyone stays" | one name: "Travel & where everyone stays" (decision G3) |
| 41 | You & settings | placeholder "Your name — it signs every note we draft" | label "Your name — it signs the notes we draft for you", placeholder "For example: Rosa Delgado" |
| 41 | You & settings | placeholder "Town or city — “Annapolis, MD”" | label "Your town or city", placeholder "For example: Springfield, VA" |
| 50 | You & settings | "On — tap to mute" / "On — tap for dark" / "On — tap to turn off" | "On" (the switch shows the state; the label names the setting) |
| 50 | You & settings | "Nothing remembered yet" / "Tell it how you host and it stops asking twice. Nothing is inferred." | "Your setup" / "How you host, your area and your data. Nothing is guessed about you." |
| 50 | You & settings (signed in) | "One account, both apps, this device and your others." | "One sign-in for your phone and your computer." |
| 50 | You & settings (no cloud) | "Everything lives on this device. Accounts turn on when the cloud is configured." | "Your plans are saved on this device only." |
| 52 | Make it yours | "The day-before brief, the run of show, and the toast draw from your words." | "Your words go into the run of show, the toast and the note we draft the day before." |
| — | Make it yours | placeholder "Todd — or “Todd & Sarah”" | "For example: Rosa — or “Rosa & Sam”" (made-up names, never a real person's) |
| — | Make it yours (all 8) | placeholders that read as answers ("Good food, good people") | "For example: Good food, good people" in faint italic |
| — | Venue | placeholder "Name or address" (no label) | label "The place's name or street address", placeholder "For example: Elm Court Hall, or 42 Elm Ct" |
| — | Ask No Guesswork | placeholder "e.g. will $2,000 cover it?" (no label) | label "Your question", placeholder "For example: will $2,000 cover it?" |
| 49 | Create | "sharing one vendor brief" | "sending the details to one vendor" (batch B's name for that page) |
| 49 | Create | the "42 Elm Ct" recognition chip looks pressable | a plain, unbordered "Found: 42 Elm Ct" (not a button) |
| 56 | Split the costs | "Remove" | "Remove Linda and what she paid" (names exactly what goes; Undo in the toast) |
| 57 | Trip board | "Tip: press and hold the name to rename it" | the name gets a visible ✎ "Rename" (as the desktop title already has), and the tip goes |
| 59 | Calls to make | "How to recognize the spouse / Family?" | "How will you thank the spouse and family?" |
| 59 | Calls to make | "Pin to top" / "Why this call matters" beside the pick | "Why this call matters" folds under the pick; "Pin to top" moves into the call's ⋯ |
| 31 | Reconfirm sweep | "Text them" · "Copy the note" · "Read it first" | "Read it first" → (draft) "Text them" · "Copy" · "Mark it sent — I sent it myself" |
| 32 | Split | "Copy the settle-up ask" (silent) | same label; toast "Copied — paste it in your group chat." |
| 53 | Date change | native confirm "… Change the dates anyway? Nothing is deleted." | toast "Dates changed. N things now fall after the last day — they're kept. Undo." |
| — | City save toast | "Venue on the plan — invites, maps, and the rain note now carry it." (for a bare city) | "Springfield, VA noted. Add the place's name when you have it." |
| — | Reply notice email | "Your host answered your question" (when the plan knows her name) | "Wanda answered your question" |
| 43 | Disabled CTAs | `.cta[disabled]` at opacity .45 (2.5–2.7:1) | quiet `.mini` until there is something to save (as batch E does), so no dimmed lit button |
| 44 | Guest pages | wordmark at 3.55–4.24:1, 12 px | the wordmark ink at least 4.5:1 |

## Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| G1 | Risks: **fold** "Keep an eye on it" and "Minor" (proposed), or show all 8? | **Fold.** The two worth planning now are the work. The rest say their counts. |
| G2 | Where everyone stays: **edit stays in place** (proposed; needs a small editor on `event.lodging`), or keep it read-only and remove the link color only? | **Edit in place.** The audit's finding is that there is nothing she can do on the sheet. |
| G3 | The lodging door and sheet share one name: **"Travel & where everyone stays"** (proposed) or "Where everyone stays"? | **"Travel & where everyone stays"** on an event with travel, and "Where everyone stays" otherwise. Either way, the door and the title match. |
| G4 | A bare city typed in the Venue box: save it **as the town** (proposed) or keep it as the name? | **As the town.** Guests otherwise read "Springfield, VA" as a place to go. |
| G5 | Settings toggles say **"On" / "Off"** only (proposed)? | Yes. The control shows the state; the words name the setting. |

## What the build needs

- **View-only:** Messages, Risks, You & settings, Make it yours, Venue, Ask, and every row in the copy table except the four below.
- **A small editor:** Where everyone stays edits `event.lodging` rows (`who`, `address`, `notes`). These fields exist already; no new data.
- **Client logic:** the Venue save reads a bare town or ZIP into `venueCity`/`venueState`/`venueZip` (`townFieldsToPersist`, the reader already used at home).
- **Backend:** `guest_notices.py` (reply notice and announcement) reads the host name through `real_host_name(profile name, host_name_for(e.data))`. That needs a join to the planner's profile for the display name.
- **Records:** the reconfirm sweep's "Mark it sent" uses the vendor draft's existing record. Split's copy gets a toast.

## e2e specs it would touch

- **Messages:** `theMessagesViewTellsTheTruth`, `flowAnalyticsInTheBrowser`.
- **Lodging:** `lodgingWearsTheAppFrame`, `lodgingCockpit`, `lodgingReachesTheAccount`, `aPickedStayIsNotABookedStay`, `theStayKnowsTheParty` and `oneRoomPlanSaysWhoSleepsWhere`.
- **Risks:** `_riskLaneCapture` (a capture), `noHeroDeadEnds` (routes to risks) and any spec pressing "Handled — stop showing this" or "Plan for this". Grep before building.
- **Settings:** `a11yFloor`, `everyTapIsFortyFourSquare`, `nothingKnownIsAskedAgain` (name and area) and `theLightThemeIsWarm` (toggle words).
- **Make it yours, Venue, Ask:**
  - `theVenueIsAskedOnce`, `handlingTheVenueMyself`, `aVenueAddressIsFoundWhole`, `yourWordsStayWithTheirEvent`, `planYoursSaysWhereItCameFrom`, and specs that `getByPlaceholder` these fields, whose placeholders change.
  - A new spec for the parent's §3 rule 2 test ("every input has a visible label").
- **City save:** `theVenueIsAskedOnce`, `aHomeWithoutATownAsksForTheTown`, `_venueReaderCapture`, plus a new spec, "a bare city is a town, not a place".
- **Reply notice:** backend `test_guest_reply_notices.py`, `test_guest_messages.py` (pytest).
- **Sweep, split, date:** `confirmEveryBooking`, `friendsSplitTheCosts`, `ourDateArguesWithItsSource`, `twoDatesTwoLabels`.

## Files

| File | What it shows |
|---|---|
| {before,proposed}__messages__Wanda-sample__{390,834,1024,1440}.png | Messages (#27) |
| {before,proposed}__where-everyone-stays__Wanda-sample__{w}.png | Where everyone stays (#28, #58) |
| {before,proposed}__what-could-go-wrong__Wanda-sample__{w}.png (+ __screen) | Risks, full length and the first screen (#26, #25, #60) |
| {before,proposed}__you-and-settings__Wanda-sample__{w}.png (+ __screen) | You & settings (#41, #50) |
| {before,proposed}__make-it-yours__Wanda-sample__{w}.png (+ __screen) | Make it yours: 8 labeled fields, example placeholders (#52) |
| {before,proposed}__venue__Wanda-sample__{w}.png | Venue: the labeled field |
| {before,proposed}__ask__Wanda-sample__{w}.png | Ask No Guesswork: the labeled field |
| before__venue-city-typed__own-plan__390.png | The Venue box after saving "Springfield, VA" on a made-up plan; the stored fields are in measure.json |
| measure.json | Floors per capture, unlabeled fields per capture, and the venue-city readback |
| render.mjs | The render script (uses `../_tools/lib.mjs`) |
