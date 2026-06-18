# Sprint 60F — Moment Library v1 (ROS-Only)

**Date:** 2026-06-18 · **Branch:** `main` · **Flag:** `pi.moments` (default **OFF**)
**Build:** `main.846915c0.js` (+195 B vs the pre-gap-fix build; all flag-gated → prod-identical)
**Tests:** 239/239 (17 new for momentLibrary)

**What shipped:** the smallest thing that survives 60C/60D/61A/60E — *authored* type→moment
knowledge + *one* consumer (Run of Show). One tap puts the moment a host cares about on the
schedule **with an owner**. No classifier, no NLP, no corpus, no scoring, no recommendations,
no new engine.

---

## Part 1 — Existing ROS infrastructure (reused, not duplicated)

| Asset | Reused how |
|---|---|
| `event.ros[]` segment shape `{id,time,segment,location,type,owner,confirmed,notes}` | `buildMomentSegment` emits exactly this shape (minus `id`, stamped by caller) |
| `RunOfShow.add()` (App.js:23888) | The chip's insert mirrors it verbatim: `setRos(r => [...r, {id: uid(), ...seg}])` |
| `ROS_STARTER_LABELS` + `buildStarterROS` | `momentOnRos` detects what's already seeded (Toasts, the type moment, Dedication) so chips never double-insert |

No new ROS data model, no new setter, no new render row — the moment becomes an ordinary ROS
segment the planner edits like any other.

## Part 2 — Moment Library (authored data)

`src/lib/momentLibrary.js` — a small catalog of 17 moments keyed to ~25 event types
(type-specific first, then the one universal moment). Each moment: `{id, label, owner,
support, match[], note?}`. **Authored, deterministic, corpus-free, valid at event #1.**

## Part 3 — Dependency mapping (only what exists)

Every moment maps to the one dependency that always exists — a **ROS segment with an owner**
(`supported`). Moments whose *deeper* need isn't modeled are `partial` and carry an honest
note instead of a fake dependency:

| Moment | Class | Honest note on insert |
|---|---|---|
| Toast · Cake cutting · First dance · Group photo · Bouquet toss · Gift opening · Games · Send-off · Ceremony · The reveal · Family celebration · Shared meal | **supported** | — |
| Recognition speech | partial | "Confirm a microphone — AV isn't tracked here." |
| Award presentation | partial | "Have the award + podium ready." |
| Video tribute | partial | "Bring a screen/projector + the files — AV isn't tracked here." |
| Keynote / remarks | partial | "Confirm a mic / slides — AV isn't tracked here." |
| The ask / appeal | partial | "Donations aren't tracked here — brief whoever makes the ask." |
| The proposal | partial | "The surprise itself — brief whoever cues the timing/signal." |

**No missing system was invented.** AV/files/donations remain untracked; we *say so* on the
segment rather than pretend to plan them.

## Part 4 — Surface

**Run of Show only** (the "Event Day Schedule" planning tab) — per 60E. **Not** intake (60E
parked chips behind activation), **not** Event Identity, **not** the planning engine. The
library is authored playbook-style data; the consumer is a chip row above the schedule.

## Part 5 — Smallest honest implementation (what was built)

A chip row "**Moments that matter · one tap adds it with an owner**" rendering
`suggestableMoments(eventType, ros)` (the type menu minus anything already scheduled). Tap →
appends a ROS segment with the moment's label + default owner + (if partial) its note. The
planner sets the time. **Nothing else** — no ranking, no scoring, no recommendation, no
intelligence layer. ~140 lines of authored data + readers, ~18 lines of ROS JSX.

## Part 6 — Guardrails (explicitly OUT OF SCOPE — and enforced)

Classifier · NLP · free-text interpretation · moment/vendor/venue recommendations ·
Experience Intelligence · dependency invention · new planning engine · scoring · ranking ·
any cross-event aggregation. None are present. The free-text `must_have_moment` is untouched
and **never parsed**.

## Part 7 — Activation impact (value before any data scale)

Yes — for every persona, at event #1, with zero corpus:
- **First-time host / family / birthday organizer:** the moment they care about is *guaranteed
  on the schedule with a name next to it* — the thing they'd otherwise forget.
- **Retirement / operator:** the program moments (recognition, video tribute, award) land as
  owned ROS rows in one tap, with honest AV reminders.

It's authored, so it works on day one — unlike everything 61A parked behind activation.

---

## Addendum — Knowledge-gap cross-check (review board + canon + playbooks + taxonomy)

Validated the catalog against every canonical event type, the playbook data, and the
event-expert lens. Gaps found **and fixed**:

1. **Gender Reveal** had no reveal moment → added **The reveal** (the event's entire point).
2. **Surprise Proposal** had nothing → added **The proposal**.
3. **Wedding** was missing **Bouquet toss** (in 60E's own list) → added.
4. **Honesty bug (Grandmother/VenueOps lens):** the old `COMMON = [toast, cake, groupPhoto]`
   suggested **"Cake cutting" + "Toast" on a Board Meeting / Conference / Corporate** event.
   Fixed: **Group photo is the only universal moment**; toast/cake live only on types that
   actually have them. Business events now offer just Group photo — honest minimalism.
5. **Cake added** to Graduation / Baby Shower / Bridal Shower (playbooks confirm cake/desserts).
6. **Anniversary** gained **Video tribute** (milestone slideshows); **Dinner Party /
   Housewarming / Elopement / Get-Together** got honest type-specific menus (no spurious cake).

**Deliberate scope boundary (not a gap):** culturally-specific Quinceañera moments (changing
of the shoes, last doll, the waltz beyond "first dance") are **not** half-authored — they
belong to the Event Intelligence cultural overlays, not a generic v1 catalog. Offering a
guessed-wrong cultural moment would violate No Guesswork. First dance + cake + toast + group
photo is the honest floor.

Full coverage map verified for all ~33 taxonomy types; every type resolves to an honest menu
(celebrations rich; business/casual → Group photo only).

---

## Verification

- **Unit:** 17 tests (flag gate; authored menus; soft type-match; dedupe; ROS-presence
  detection prevents double-insert; partial notes; the 5 gap fixes). Suite **239/239**.
- **Build:** compiles; flag-OFF → production-identical.
- **Runtime (puppeteer, `pi.moments` on):** the chip row renders with type-correct chips;
  tapping **+ Group photo** inserted a ROS segment owned by **Photographer**, and the chip
  then disappeared (no double-insert); **0 console errors**. Screenshot:
  `review-artifacts/60f_moments_row.png`.

---

## Final Answer

The smallest Moment Library that (1) needs zero corpus, (2) needs zero AI, (3) needs zero new
engine, (4) improves planning immediately, (5) strengthens the Run of Show, and (6) stays
inside No Guesswork — is **~140 lines of authored playbook-style data + a Run-of-Show chip
insertion.** That is exactly what shipped. It optimizes for *usefulness*, not intelligence:
the moment a host names is guaranteed onto the schedule with an owner, on event #1, with no
data, no inference, and no second planning engine.
