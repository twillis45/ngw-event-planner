# The venue reader sitting - board ruling, 2026-08-14

Convened per `docs/claude-skills/REVIEW_BOARD_ROSTER.md`: render-first, design stars
first, event pros + Grandmother second with override authority, brutal not consensus.

Render evidence: `review-artifacts/2026-08-14_venue_reader/` (gitignored) - three venue
states x four viewports, plus `facts.json` capturing the words each surface uses.
Harness: `hostv2/e2e/_venueReaderCapture.spec.mjs` (env-guarded, `VENUE_CAPTURE=1`).

---

## The question put to the board

Two engines read one fact and disagree on a destination event with a town but no
named venue:

```
eventLocationStatus(ev)      "city_only"   -> the location essential is HANDLED
deriveDecisionBlockers(ev)   venue-selection, urgency:'critical',
                             reversibility:'locked', blocks:['catering']
```

Shipped consequence, one viewport (`b-cityonly__desktop-1440.png`):

```
chip     "Venue - handled. Open it."
card     tag "Not set yet" / heading "Venue" / empty input
count    "3 of 6 plan parts handled"
hero     "Sort where everyone stays."      <- go book rooms
```

Options offered: **A** strict reader wins - **B** permissive reader wins - **C** third
state on the surface.

---

## The ruling

**Option C, amended by the operations seat into a SPLIT: two facts, not three values
of one.** `A` and `B` are both dead. The location essential and the venue address are
different questions with different unlock layers, different failure costs, and
independent regression.

| Seat | Ruling | /10 |
|---|---|---|
| Don Norman | C - third state, must count as NOT handled | 2 |
| Edward Tufte | C amended - the axis is mislabeled | 3 |
| Rams + Ive | B - town resolves it, delete the orphan card | 4 |
| Mindy Weiss (override) | C amended - **overrides Rams/Ive outright** | 2 |
| Rafanelli + Venue Ops (override) | **D - split into two facts** | 3 |
| Grandmother (override) | count must not say handled | 3 trust |

**Why B lost.** Mindy Weiss: option B is the screen that already ships. "They ruled for
the status quo and scored it 4/10. That's the 3-pane cockpit all over again - the thing
we just escaped, repainted."

**Why A lost, unanimously.** A town genuinely unblocks weather, shopping and lodging
search. Nagging for a location the app is already using is a scar this repo has taken
once (`phaseProgress.js:88-100` records it).

---

## The five things the board agreed on

1. **Venue must not count as handled on a town.** The count reads `2 of 6`, not `3 of 6`.
   Norman, Tufte, Weiss and the Grandmother all state this independently.
2. **The axis is mislabeled.** The essential is keyed `location` and measures location;
   the chip prints the word **"Venue"** over it (`hostv2/src/HostShellV2.jsx:8456`).
   Rename it. Tufte found it; both pros adopted it.
3. **`critical` at 310 days is wrong.** It is *sequence*, not severity - venue is first
   in order, not on fire. A constant red gate trains the host to ignore the word before
   it is ever true. Escalate on the countdown and on the first irreversible commitment.
4. **The real injury is the hero handoff, not the label.** The app sends a host with no
   address to go book rooms for 24 people. Weiss: courtesy holds cost nothing and are
   mandatory this early; a contracted block before the venue signs is the money-losing
   act, and the product has no vocabulary for the difference between a hold and a booking.
5. **Nobody notices the contradiction.** The Grandmother did not see it: "This is not a
   confusing screen. It's a comforting screen that's wrong. That's worse." On mobile the
   dissenting card is not on screen at all. She would book the rooms, blame the app, and
   not open it again.

---

## What operations proved that no other seat could

`blocks:['catering']` is wrong in KIND, not scope. Catering is not *blocked* by a missing
address - it is unpriceable and uncontractable, which is a different failure. The blocker
names one dependent and misses six, and the six it misses carry the real lead times:

**Proceeds on a town alone:** date hold, guest list, save-the-dates, weather and sunset,
caterer longlist and ballpark range, rental *date* holds, lodging search, drive-time
bands, permit research.

**Cannot start without a signed address:** COI (a certificate names the venue's legal
entity as additional insured), load-in window and dock, final rental counts and spec
(staking vs ballast is a different order and price), power and kitchen (moves a catering
quote 20-40% and changes the menu), run-of-show timing, transport and shuttles, then
every signature and deposit.

**Why two facts and not three values:** they unlock different layers (town unlocks the
*travel* layer; address unlocks the *production* layer); they have different failure
costs (a wrong town costs a re-announcement, a missing address at T-90 costs the site its
insurance certificate); and they **regress independently** - when a venue falls through
the address goes null while the town stays committed, and a four-value enum cannot
distinguish "never had one" from "just lost one", which is exactly the state needing the
loudest message.

### The severity ladder, driven backward from the dependents' lead times

| Window | Level | What is actually closing |
|---|---|---|
| T-310 -> T-240 | normal | Nothing. Town committed, address open is the expected shape. |
| T-240 | elevated | Save-the-dates: nothing telling guests where to book goes out first. |
| T-180 | high | Peak-season caterer and rental availability closes; site visit due. |
| T-120 | **critical** | COI, permits, load-in, final rental counts - all ~90 days, all address-bound. |
| T-60 | emergency | Move the date. |

Plus an event trigger: the first irreversible guest-facing or non-refundable commitment
escalates to critical regardless of the countdown.

---

## The finding that outranks the ruling - VERIFIED

**Naming the venue changes nothing on screen.** Found by the Weiss seat, then confirmed
by checksum:

```
b-cityonly__mobile-390.png   f724a7a58717d43d212dd34f6b7905a2
c-named__mobile-390.png      f724a7a58717d43d212dd34f6b7905a2   <- byte-identical
b-cityonly__tablet-768.png   953d0c7aa3ac162e89b7b43a44c6b753
c-named__tablet-768.png      953d0c7aa3ac162e89b7b43a44c6b753   <- byte-identical
```

At desktop the only difference in the entire 1440 frame is that the unnamed-venue case
carries one extra orphan card. Same hero, same count, same chips, same rail.

So the `deriveDecisionBlockers` verdict - critical, locked, blocks catering - **reaches
the host on this screen not at all**: it is filtered out of the card list at
`HostShellV2.jsx:8908-8917`, and the hero it was meant to be promoted into is talking
about hotel rooms. The two readers disagree and today it does not matter, because the
strict reader is not wired to anything the host can see.

**Consequence for the Tier 0.6 guard (`923ba55b`):** it is not merely a truce, it is a
truce over a wire that was never connected. Fix the wire first. Renaming the chip on a
screen that ignores the value underneath relabels an axis on a chart that is not plotted.

---

## Build order

1. **Wire it before wording it.** Make the resolution a real three-valued read that the
   hero actually consumes, so `b-cityonly` and `c-named` stop rendering the same screen.
2. **Split the essential in two** - `Where it happens` (town) and `Venue address` - and
   take the address out of the handled numerator. Count reads `2 of 6`.
3. **Guard the spend, not the status.** Block the hero's advance to lodging while the
   address is unsigned; if the host proceeds anyway, say what it costs. The warning
   belongs where the money leaves, not on a pill 400px away.
4. **Replace constant `critical` with the countdown ladder** above, plus the
   irreversible-commitment trigger.
5. **Rename the chip** (`HostShellV2.jsx:8456`) and **delete the orphan card**
   (`HostShellV2.jsx:8921-8940`) - the hero already carries the capture.
6. **Delete the Tier 0.6 agreement guard** once (1) and (2) land; both readers then
   return the same three-valued fact and there is nothing to arbitrate.

Copy, per the pros (host language, no jargon, CTA names the act):

```
chip     Where it happens - Santa Fe, no venue yet
count    2 of 6 plan parts handled
hero     Pick the place first.
         You've got Santa Fe, but not the actual address. Book rooms before you
         know where the party is and people could end up 40 minutes away -
         hotels rarely refund that.
         [ Add the venue address ]
queue    Ask three hotels to hold rooms - a hold costs nothing and you can
         release it. Wait on the room block until the venue is signed.
```

---

## Two unrelated defects the sitting logged

- **A risk line is reading the wrong clock.** `"Final headcount still not locked 3 days
  out"` renders on a **310-day** event (visible in every `b-cityonly` capture). Flagged
  independently by the operations seat.
- That same string uses the banned word **"locked"** (see the no-hospitality-jargon
  rule). It should read "still not confirmed".
