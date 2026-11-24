# Cohesion batch E: the After stage (renders for owner approval, never merges)

**Plan:** the built-in Wanda sample, two days after the party. **Clock:** fixed at Mon, Mar 22, 2027 11:00. **Theme:** light. **Scale:** dsf 2 at 390, 834, 1024 and 1440.

**before** is the live build (`main` at `5fa9fe9`, `npm run e2e:build`).

**proposed** is the same build. The hero ("How it landed.") and the money card are untouched. Everything from "What carries forward" down is swapped for proposed markup made from the app's own classes (`render.mjs`). Guest names and plus-ones are read from the live gift rows. Nothing in the app was changed.

## The proposal

The stage follows her order: check, act, share, follow up (rule 1).

| Order | Block | What changes | Audit row · rule |
|---|---|---|---|
| check | The money (unchanged) | — | — |
| check | **How many came?** | The final number gets its own labeled card. "Record it" is quiet. | — |
| act | **Thank-yous & gifts · 0 of 7 thanked** | **The one lit action:** "Write the thank-yous". It opens the existing thank-you run, one note at a time, and she sends each from her phone. "Draft the thank-you" and "Start the thank-you run" merge into it. | #11 (three lit → one) · rule 1; #29 (three doors → one) · rule 8 |
| act | per-guest row | "thank them" → **"Mark thanked"**, and once set, "✓ Thanked". These are the run's own words. A line under the list says it sends nothing. "gift?" → "Gift received". | #12 · rules 6, 7 |
| share | **The recap for guests · not started** | Labeled fields: "A note to everyone" and "Photo album link". "Write the recap" becomes "Write it for me" beside the note. "Publish the recap" becomes **"Preview what guests see"**. The preview shows the recap as the invite link will show it, marked "Preview · nothing is published yet", with "Put it on the invite link" and "Keep editing". | #30 · rule 7; #29 · rule 8 |
| follow up | **For next time** | Labeled field. "Save it" is quiet, not lit. One plain line replaces "What carries forward": "It comes back the next time you plan a retirement party. Your guest list, vendors and every money line above stay saved with this plan." | #34 · rule 4 (removes "foundation facts" and "wrap-up meter") |

## Measured (`measure.json`)

| | Lit (`.cta`) on the stage | Sideways scroll | Text < 11 px | Taps < 44 (touch) |
|---|---|---|---|---|
| before, 390 | **3** ("Save it", "Publish the recap", "Draft the thank-you"; two of them disabled-dim) | none | none | none |
| proposed, 390 | **1** ("Write the thank-yous") | none | none | none |

The other widths are in `measure.json`. Each holds 3 → 1 with no floor failures.

## Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| E1 | Which thank-you door survives: the **run** (one note per person; it names the gift; proposed) or the **single group draft** ("Draft the thank-you")? | **The run.** It already words each note from the gift log and records "Mark thanked". A single group note can stay inside the run as "One note for everyone". |
| E2 | Publish the recap: **preview, then "Put it on the invite link"** (proposed), or keep one tap and add Undo? | **Preview first.** It reaches every guest's link. Rule 7 says nothing reaches guests in one tap, and rule 18 allows a confirm step for what goes out to guests. |
| E3 | The per-guest record word: **"Mark thanked"** (proposed, the run's word) or "I sent it"? | **"Mark thanked"**: one word for one record, in both places. |
| E4 | Order: **thank-yous above the recap** (proposed) or the recap first? | **Thank-yous first.** They are the work, and the recap is the share. This keeps check, act, share, follow up. |

## What the build needs

- **View-only.** No new data:
  - "Mark thanked" writes the same `thankYouSent` flag;
  - the preview renders from the same `recapNote`/`albumUrl` drafts before `patchEvent`;
  - "Write it for me" fills the note from `draftRecap`.
- The recap preview is a new local state (draft → preview → published). It needs no new field.
- **One copy change in data-free code:** the toast "thanked — the wrap-up meter keeps count" becomes "Marked Cory Mundy thanked · Undo" (rule 18).

### Build item added by the parent (live check, code-level, not rendered)

- **After the event, she lands on After (rule 13).**
  - **The report:** in the parent's live check on Dec 21, two days after a Dec 19 event, the app opened on Plan at all 5 sizes.
  - **The cause, read from code:** `src/lib/landingStage.js` returns `'day'` during the event and `'plan'` in every other case, including after it. Its own comment says "Before it, the day before it, after it: the plan." `'after'` is in `STAGES` but is never returned.
  - **Proposed:** for her own plan, once the event's last day is past (`isPastEvent`), return `'after'`. Samples keep landing on Plan, as they do on the day itself (audit caveat, `ownPlan` false). A tap on Plan is still her own choice and is not a landing.
  - **Owner decision (11/24/2026): indefinitely.** After stays her landing for that past event until she starts a new plan. Landing is chosen per event: her new plan lands on its own stage (Plan before it, The Day on it), and reopening the past event still lands on After. No time window.
  - **Tests:** jest `oneRuleForWhereSheLands.test.js` (it may pin "after it: the plan") and `textGateRatchet.test.js`. Also any e2e spec that boots an own plan with a past date and expects Plan; grep `isPastEvent` and past dates in `e2e/` before building. Add a spec: own plan, clock two days after → After, at 390 and 1440.

## e2e specs it would touch

- `theGiftLogLivesOnTheGuestRows`: reads the "gift?" and "thank them" buttons and the "Thank-yous & gifts" header.
- `theAlbumRowAddsTheLink`: the recap block and "Publish/Update the recap".
- `guestPhotosAfterTheEvent`: the After album and photos line.
- `wandasMoneyIsOneAnswer`: reads the After money card, which is unchanged; check its selectors.
- `statusInkReadsOnScreen`: After ink.
- **New:** `oneLitButtonOnAfter` (the audit's §3 rule 1 test): exactly 1 lit button on the After stage, and "Publish" never in one tap.

## Files

| File | What it shows |
|---|---|
| before__after__Wanda-sample__{390,834,1024,1440}.png | After today, full length |
| before__after__Wanda-sample__{w}__screen.png | The first screen |
| proposed__after__Wanda-sample__{390,834,1024,1440}.png | Proposed, full length: money, How many came?, Thank-yous with the one lit button, Recap for guests, For next time |
| proposed__after__Wanda-sample__{w}__screen.png | The first screen |
| proposed-recap-preview__after__Wanda-sample__{390,1440}__screen.png | Decision E2: the recap typed, the preview open, and one guest marked "✓ Thanked" |
| measure.json | The lit count and floors per capture |
| render.mjs | The render script (uses `../_tools/lib.mjs`) |
