# PEOPLE — SECOND VISUAL REVIEW CHECKPOINT

**2026-10-20 · branch `main-2utz0n` · commit `f117efb` · `?people=1` (opt-in)**

Against the owner's decision of the same day: *directionally accepted, not
visually accepted — "the top of People belongs to the redesign. The body still
belongs to the old product. Fix that seam."*

This is a **checkpoint report, not a completion claim.** Nothing is merged to
main, no PR is open, Host V2 is not retired, and the palette doctrine is
unchanged.

---

## 1 · WHAT CHANGED VISUALLY, AND WHY

| § | Owner's finding | What it is now | Why that answer |
|---|---|---|---|
| 4 | Calculation exposed as UI | +1s, kids and covers moved behind the same disclosure as the reasoning | They are supporting explanation, not the decision. `confirmedCovers` / `kidsTotal` still drive food and seating unchanged — they stopped narrating themselves |
| 5 | Estimate state reads as a configuration form | `PLAN AROUND / 40 / "We'd expect 32–46 on the day. Nobody has replied yet." / [Plan for 40] [Use a different number]` — steppers appear only on *adjust* | The host's job in that state is one decision. The controls support it; they are not it |
| 6 | Confirmed/RSVP needs different emphasis | Estimate leads with the **recommendation**; an active RSVP leads with the **standing** and what is still out; a settled count stays quiet with a way back in | Different jobs: a decision waiting to be made vs. a situation to read |
| 7 | One Move had no engine | `OneMove` renders the **first item `eventPlan()` already ranked** whose `domain === 'guests'` | A filter shortens that order; it cannot reorder it. No People-local ranking exists |
| 8 | Keep Still Unknown compressed | Unchanged — labelled list, one row per unknown | It was already right |
| 9 | Roster still the old product | Four of five competing emphasis signals quieted; the reply pill kept | References: *"Rows are quiet… density comes from restraint, not from shrinking"* |
| 10 | RSVP actions mechanism-first | `GET RESPONSES` + the outcome line; the same six controls beneath it | Share link / QR / preview are mechanisms, not outcomes |
| 11 | Reply-by is a date field | Framed by what it buys — *"A final headcount by November 27 means 22 more replies"* / *"Set a date you need the final number by"* | §11 verbatim |
| 12 | Photography transition, esp. light mode | Two layers: a legibility veil (identical in both themes) + a short dissolve into `--bg` | One ramp was doing two incompatible jobs |
| 14 | Tablet/desktop look like a stretched phone | Band capped at 320px (≥768) / 280px (≥1280); statement given a measure | 38vh is a proportion of a *phone* |
| — | — | Sheet title reads **People**, not "Guest list" | The chrome was still naming the old product above the redesign |

---

## 2 · WHAT LEGACY UI WAS RECOMPOSED, AND WHAT WAS LEFT

**Recomposed (register changed, behaviour identical):**

- The roster rows and toolbar — `.people-roster` / `.people-rtoolbar`. Search,
  the five-way reply lens with its counts, grouping, the accordion and the
  **index-based writers** are untouched. Dietary and needs facts still render;
  they stopped being capsules, because a capsule is a control's shape and none
  of them are controls.
- The share block → `GET RESPONSES`, both on the roster branch and on the
  headcount branch (where the honest outcome is *"Nobody has been invited yet"*,
  not *"everyone has answered"*).
- The reply-by line → the outcome it buys.

**Suppressed under the flag (markup intact, baseline unaffected):** the legacy
`guestHero`, the `+1 plus-one · 2 kids` meta line, the `N heads with plus-ones`
line, the headcount stepper and the kids stepper (both revealed on *adjust*).

**Deliberately left alone:** `quickAdd`, invite look/rules, counting chips, CSV
import/export, the guest detail accordion and every draft handler. They are
below the outcome and they are honest.

---

## 3 · CAPABILITIES PRESERVED

No capability was removed. `theBaselineOutlivesTheRedesign.test.js` asserts the
legacy markers (`guests-counting-anchor`, `Add names — one per line`,
`guests-entry-anchor`, `Share & invite`, `By headcount`) all still exist, that
`?people=1` is read as an exact match (opt-in), and that exactly one guests
sheet renders. **The default URL is still the pre-redesign surface**, on the
same build, same shell, same event blob.

Retirement is **not** requested. Nothing here is proposed for deletion.

---

## 4 · EVIDENCE

`review-artifacts/2026-10-20_people_art_direction/` (gitignored):

| Frame | What it shows |
|---|---|
| `A-estimate-mobile-light/dark` | The decision state, photography present |
| `B-rsvp-mobile-light/dark` | Active RSVP — standing leads, One Move fires |
| `C-noimage-*` | The **default** state — no cover pipeline exists |
| `G-roster-mobile-light/dark` | §9, on a 75-guest roster |
| `H-getresponses-mobile-dark` | §10/§11 |
| `D-tablet-dark` · `E-desktop-dark` | §14 |
| `F-paletteA/B-steel/warm-light/dark` | §13, identical screens |
| `tokens.json` | The tokens that actually painted |

The fixture is a **design fixture, labelled on screen**, passed by a review-only
URL parameter that is never persisted. No stock photography is bundled, no
`coverImageUrl` is ever written, and no guest is attached to a photograph.

---

## 5 · PALETTE A/B — EVIDENCE, NOT A RECOMMENDATION TO CHANGE DOCTRINE

`?palette=warm` is a **review instrument** (`hostv2/src/paletteAB.js`). It is a
no-op without the parameter. Production doctrine is untouched: steel is the
identity accent, the `palette.js` gold ban stands.

**What the frames show.** On the warm ivory field the candlelit photograph
dissolves into warm paper and the One Move card reads as a tinted editorial
block. On the production field the same composition reads cooler and more
clinical in **light mode specifically** — dark mode is close to a draw. This is
exactly the conflict `ART_DIRECTION_GRAMMAR.md §7` predicted: *"much of the
set's warmth comes from the tan accent over near-black and from the ivory
field."*

**What it is not.** The warm variant's accent (`#7A5B21` light / `#D9A441`
dark) is decorative gold, which is on the never-reintroduce list. A credible
third option — **production steel accents on a warmer neutral field** — was not
rendered this pass and is the variant I would actually test next.

---

## 6 · ACCESSIBILITY — MEASURED FROM THE LIVE DOM

Contrast against each variant's own `--bg`, read off the painted tokens:

| Token | light-prod | light-warm | dark-prod | dark-warm |
|---|---|---|---|---|
| `--ink` | 18.06 | 16.10 | 16.00 | 16.64 |
| `--ink-soft` | 5.20 | 9.61 | 6.58 | 11.61 |
| `--muted` | 5.11 | 5.84 | 5.86 | 6.58 |
| `--faint` | 5.11 | 4.57 | 5.86 | 4.93 |
| `--steel-soft` | 6.53 | 5.58 | 6.91 | 8.63 |

**Every text token clears AA in both variants and both themes. Accessibility
does not decide this question — taste and brand do.**

Type over the photograph is light type in both themes and clears AA against the
veil's darkest stop. Tap targets are unchanged (the lens chips stay 32px because
they change what you are *looking at*; the reply picker stays 44px because it
commits a fact). One note worth recording: in light-production `--muted` and
`--faint` resolve to the **same** value (`#686A6C`), so the two-step meta
hierarchy that exists in dark mode is flat in light mode.

---

## 7 · TESTS

| Suite | Result |
|---|---|
| Full unit suite | **620 suites / 8,522 passed**, 1 skipped |
| `thePeopleZoneTellsTheTruth.spec.mjs` | **12/12** (was 10 — two added) |
| `gate:cra` | 241 of 241 baselined |
| `hostv2 npm run parity` | passed |
| `spacingLadder` | 269, unmoved |
| `textGateRatchet` | unmoved |

**Two tests moved, and why — neither was weakened:**

- `theBaselineOutlivesTheRedesign.test.js` asserted `<AttendanceTruth`. The gate
  caught the rename, which is its job. It now asserts `<AttendanceDecision`, and
  `AttendanceTruth` was **deleted** from `PeopleSurface.jsx` rather than left as
  a second attendance component nothing renders.
- `thePeopleZoneTellsTheTruth.spec.mjs` asserted the `our estimate` chip and the
  `Yes, plan for 40` button. **Obsolete presentation, not obsolete behaviour:**
  provenance now *leads* the composition instead of annotating it. The required
  behaviour is asserted at full strength — an app-supplied number is still
  marked as ours (`Plan around` / *"Nobody has replied yet"*), still offered
  rather than assumed, still held out of anything we send, and the paired
  host-sourced fixture still proves the two states differ.

**Two tests added, red-proofed:** `A DERIVED REPLY-BY IS NEVER SPOKEN AS A DATE
SHE SET` and its paired positive. Reverting the one-line gate turns the first
red on the exact assertion.

---

## 8 · COMMIT

`f117efb` on `main-2utz0n`, pushed. Files: `PeopleSurface.jsx`,
`HostShellV2.jsx`, `styles.css`, `paletteAB.js`, `main.jsx`,
`parity/MANIFEST.md` (extended, per the owner's decision that it stays the
single authority), the two specs, `playwright.config.mjs`, and the preservation
test. No screenshots, no fixtures, no debug files, no shims committed.

---

## 9 · THINGS I FOUND, AND UNRESOLVED DECISIONS

**One real defect, found by looking at a frame.** The first capture of the §10
block read *"Replies close November 27"* over a fixture whose host had never set
a deadline. `rsvpDeadlineFor()` returns a derived `event.date − 7d` regardless;
`source === 'override'` is the only value that means she chose it. This is the
2026-07-14 defect — fixed then in the guest invite, left standing in the host
line forty rows away, whose own comment reads *"half a fix is its own kind of
lie."* A third surface now reads that field, so it got a test instead of a third
comment.

**One instrument defect.** The fixture lived in `dist/`, which `e2e:build`
regenerates. One build deleted it and the matrix captured twelve frames of grey
gradient — an image-present review with no image in it, which is worse than no
review because it looks like evidence. It is route-intercepted now, and a frame
whose `<img>` never decoded **fails the run**.

**Open for your decision:**

1. **Desktop roster.** At the data tier the roster flips into a NAME / KIDS /
   MEAL / DIETARY column table. That is a deliberate production capability
   (`styles.css:5655`), and it is also the most CRM-looking thing left on the
   screen. I did not override it unilaterally. Keep, or bring the quiet row
   grammar up to desktop too?
2. **The third palette variant** — production steel over a warmer field — is the
   one I would test next. Not rendered this pass.
3. **Desktop right rail — and a correction.** I first read the desktop capture
   as the photographic band being trapped in column 1 of the data-tier grid and
   added `grid-column:1 / -1` to span it. **The re-capture was byte-identical:
   that rule is inert.** `.roster` is what becomes the grid, not the sheet body,
   and the band already spans the full content column. What is actually beside
   the photograph is the **340px rail the roster reserves for a guest detail
   that is not open yet.** The references park a persistent photographic event
   card plus quick actions there. That is the real §14 answer, it is out of
   scope this pass, and the dead rule has been removed rather than left in
   claiming to do something.
4. **One Move has no CTA**, deliberately. The engine item carries a `route`, but
   a guests-domain move routes back into the sheet the host is already looking
   at, and the one live example ("3 confirmed guests still need seats") actually
   belongs to seating. A button reading "Take care of it" that reopens the
   current sheet is the kind of CTA UX_07 exists to prevent. Wiring it properly
   means auditing which routes a guests-domain raise can carry — worth doing,
   not worth guessing.
5. **Host-supplied cover media** remains a stated product requirement with no
   implementation authorization. The surface reads a forward-compatible
   `coverImageUrl` and never writes one.
6. **The bounded gap is unchanged** — "identify guest" is still not offered,
   because `lodgingIntel.js:2073` would then say *"2 people asked about stairs"*
   for one person.

---

## 10 · RECOMMENDATION

**Second visual review requested. Not accepted, not merged, not retired.**

The seam is closed: the body of People now speaks the same language as its top,
on a 75-guest roster, in both themes, at three breakpoints, with every
capability intact and the pre-redesign baseline still one URL away. What is left
is not seam work — it is the three composition questions in §9, and those are
yours to call before I build anything further.
