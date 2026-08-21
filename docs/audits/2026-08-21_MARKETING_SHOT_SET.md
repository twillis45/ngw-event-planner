# Marketing shot set — 2026-08-21

35 frames, 14 surfaces, 6 viewports. Every frame was captured in real Chrome
against a production `vite build` of hostv2 at HEAD, and every frame in the
table below was **opened and looked at** before it was allowed into the set —
a green capture is not a good frame, and five of the first pass were thrown
away for exactly that reason (see "What was recaptured").

Output: `hostv2/review-shots/marketing/<viewport>/<surface>.png`.

**Note on the path.** The brief named `demo/review-shots/`; that directory does
not exist. The repo's durable capture tree is `demo/hostv2/review-shots/`,
which `.gitignore:48` covers only for the `drift/` subdirectory. So
**`hostv2/review-shots/marketing/` is TRACKED, not ignored** — these 35 PNGs
will show up in `git status` and are committable as artifacts. That is a
decision for the session that commits, not for this capture.

## How they were captured

- Own preview server on port **5299** (`vite preview`, `E2E_BASE=1`), so this
  never contended for the matrix's 5233/5244. The main session's server was
  live on 5233 throughout and was not touched.
- `deviceScaleFactor: 2` — every PNG is retina/print usable.
- Waited on the `settled()` end-state predicate from `hostv2/e2e/fixtures.mjs`
  (splash gone AND the app has real content — it cannot resolve early), then a
  further 700ms, then 400ms more at the shutter. Sheets got 900ms after the
  260ms entrance. No frame in this set is caught mid-rise.
- No `?demo=1`, no `?admin=1`. Boot is `?elegant=1` only.
- The `addInitScript` seed is **guarded** by a one-shot key, per the HANDOFF
  trap: an unguarded seed rewrites host state on every navigation.
- The capture harness lived outside the repo (scratchpad) and has been
  removed. No throwaway spec was added to `hostv2/e2e/`.

### Light and dark

**Dark only — the app has no light mode.** `styles.css:6` sets
`color-scheme:dark` globally and the sheet is described at `:1340` as "this
app's near-black dark-on-dark UI". There is no light palette to shoot, so
there are no light variants. This is a product fact, not a capture shortcut.

### What was staged, and how

Nothing was invented. Two things were seeded through the app's **own**
localStorage patch layer (`ngw-hostv2-patch-<id>`), the same mechanism
`hostv2/e2e/tabletCapture.mjs` already uses:

1. **The send ledger** (`sendLedger`) on the wedding — three vendors given
   `handed_off`/`accepted`/`failed` entries. The ledger is written by host
   action, so a pristine sample shows every vendor as "No record of reaching
   out yet", which photographs the feature's empty state rather than the
   feature.
2. **`test-day-of`** was renamed from "Test — Cookout (day of)" to "The
   Whitfield Family Cookout" and given `startTime: '15:00'`. The word "Test" is
   a harness artifact, not product copy. The start time is the more
   consequential one: without it the day-of screen sits in `PREVIEW` with
   pencilled times, and with it the real day-of engine runs a live clock. Both
   states are honest; the live one is the one worth selling. See "Weakest
   frames" for why the preview state existing at all is a finding.

### The event states

Chosen by measuring every seeded sample for guests + vendors + budget lines +
timeline rows, not by eye:

| Event | Why it was picked |
|---|---|
| `ev-dmv-wedding` — Marcus & Adaeze | Richest sample in the pool by a clear margin: 9 vendors, 8 budget lines, 11 timeline rows, 8 guests with meals + dietary, COI verified, 8 decisions past window |
| `ev-x-bachelorette` — Priya's, Scottsdale | Best hero state in the pool: one overdue vendor payment with the amount, the age, and a one-tap settle |
| `ev-x-wanda` — Wanda's 50th + retirement | The only rich sample whose guest count and budget are in a believable ratio (75 guests / $5,000) |
| `test-day-of` — the cookout | The only T-0 state; 18 run-of-show beats |
| `my-crab-feast` | Carries the set's single best-grounded line (a cited portion guide) |

## The shot list

| File | Surface | Viewports | Leader targeted | The claim it makes |
|---|---|---|---|---|
| `01-decision-hero` | Command surface, hero | 390, 430, 768, 1440, 1920 | **Partiful** (creation), **Wanderlog** (workflow) | The app opens on the one thing that is late — named, priced, dated — and settles it in one tap. Not a dashboard, not a feed |
| `02-command-surface-full` | Command surface, whole board | 390, 1440 | **Linear** | At desktop it is a three-column command board: nav rail, the ask + what follows it + what could go wrong, and a derived readiness column. Nothing here was typed by the host |
| `03-readiness-derived` | "Where you stand" | 390, 1440 | **Blink** | Readiness is 7 named plan parts computed from the plan, with the arithmetic on screen. No status dropdown, no percent-complete field |
| `04-decision-why` | Calls to make, one call expanded | 390, 1440 | **Wanderlog**, generic AI planners | The recommendation shows its reasoning — "ceremony length (20–30 min civil, 45–60 religious)" — and says "This one's your call to make" |
| `05-send-ledger-handed-off` | Vendor card, open | 390, 1440, 1920 | **Blink** | "Handed off by text · 6d ago". Never "Sent" — an SMS tap proves a composer opened and nothing more |
| `05b-send-ledger-honest-failure` | Vendor card, open | 390, 1440 | **Blink** | The one red state is system-owned: "The email didn't go out — nothing was sent" |
| `06-checklist-follows-decisions` | Your checklist | 390, 1440 | **Asana / Monday** | Rows are derived and reconciled, not frozen at creation: "done by your plan — tap to confirm", owner names, and every CTA names the act |
| `07-money-way-back-under` | Your money | 390, 1440 | **Wanderlog**, spreadsheets | Over by $955 — with "4 vendors are still unpriced, so this can change" and a named route back under that protects what is already committed |
| `08-provenance-every-line` | Shopping list, food open | 390, 1440, 1920 | Every "AI planner" | Twelve consecutive rows each showing derived quantity (`½ lb/guest × 46 guests`) and a cited price (`Costco ~$3–4, grocery $4–5+`) |
| `09-provenance-sourced-quantity` | Shopping list, crab feast | 390, 1440 | Every "AI planner" | The strongest single citation in the product: quantity "grounded to the WebstaurantStore protein portion guide (fetched 2026-07-16)" |
| `10-day-of-run-of-show` | Day-of, live clock | 390, 1024, 1440 | **Partiful / Family** | On the day it becomes a run of show: live clock, one moment at a time, "Done — what's next", 17 more, and BEHIND markers on what slipped |
| `11-risks-with-a-source` | What could go wrong | 390, 1440 | **Blink** | Risk guidance with an industry source named — "The insurance-industry pattern (Markel/III)" — not generic advice |
| `12-roster-the-caterer-can-use` | Guest list | 768, 1440 | **Partiful / Evite** | The roster carries meal picks, dietary notes, kids and plus-ones grouped by side — the thing the caterer actually asks for |
| `13-rail-one-frame-one-measure` | Rail + a section, wide | 1920 | **Linear** | 13 sections, one collapsible rail, one frame, one 820px measure |
| `14-day-of-safety-brief` | Day-of, before the big day | 390, 1440 | **Joy**, task managers | Eight domain-specific safety items — fire, food-holding, child watcher, circuits — that no general planner carries |

### Viewport policy — where a size was deliberately skipped

- **430x932** carries only the hero. It is 390's layout with 40 more pixels;
  every other frame would be a near-duplicate. It exists because the App Store
  listing wants a 6.7" frame.
- **768x1024** carries the hero and the roster only. Tablet portrait is where
  the roster's column structure first pays off; the rest of the tablet story is
  a letterboxed phone stage (recorded in the tablet-prototype read) and
  photographs as a wide phone, not as a tablet product.
- **1024x768** carries the run of show only — landscape tablet is a plausible
  day-of device on a kitchen counter, and nothing else needed it.
- **1920x1080** carries five frames, not all fourteen. See the weakest-frames
  section: at 1920 the app does not use the extra vertical space, so most
  frames are 1440 with more letterboxing.

## What was deliberately NOT shot

- **Empty states, onboarding, and event creation.** The brief ruled them out
  and they are correct to rule out: a set that opens on "no events yet" sells
  the absence of the product.
- **"Your days" — the multi-day programme.** This is the workflow dimension's
  headline capability and the answer to Wanderlog, and **it could not be shot
  at all**: not one of the 26 seeded sample events carries a span, so the
  span-gated door never renders. That is not a capture problem. See weakest
  frames.
- **The One-Event Pass / pricing surface.** Billing is DORMANT
  (`REACT_APP_BILLING_LIVE` unset). Shooting a paywall the product cannot yet
  charge through would be a claim we cannot honor.
- **Ask the Boss.** It answers from the host's own numbers, which is a real
  differentiator, but it needs a typed question to show anything, and a
  screenshot of a staged question reads as a staged question.
- **The invite / RSVP guest path.** It is a genuinely strong surface, but it
  sells the *guest's* experience. This set is aimed at the host, who is the
  buyer.
- **Motion.** Six of the eight motion-audit shortlist items shipped in
  `76cc7a76` and the sheet-origin continuity work is real, but motion does not
  survive a PNG. It wants a capture pass of its own.
- **Admin console and demo tools bar.** Internal-facing by declaration.

## Weakest frames — where this set does not yet beat the leader it targets

This is the part that matters. Each item names the frame, the leader, and what
would have to change **in the product** — not in the photography.

### 1. `05-send-ledger-*` — loses to Blink on the surface, despite winning on the model

The state model is better than Blink's: three not-dones, host-attested versus
system-verified, and it refuses to say "Sent". The **frame** is bad anyway.
Two reasons, both structural:

- **Only one vendor card opens at a time** (`sheet.focus` holds a single id).
  The ops question is "did the asks go out" — plural, across the roster — and
  the product can only answer it one vendor at a time. Blink answers it for the
  whole list at a glance. That is why this needed two frames instead of one.
- **The opened card is a raw form.** The vendors ruling restyled the
  *collapsed* face to one band; the expanded face was not part of that ruling
  and still renders a native date input, an empty `email` placeholder, a
  textarea placeholder, and the full status ladder. The differentiator — the
  "Handed off by text · 6d ago" chip — sits in the middle of it and is the
  smallest thing in the frame.

**Product fix:** put the send state on the *collapsed* row, next to the ranked
chip, so the roster reads as a ledger without opening anything; and give the
expanded card the same restyle the collapsed face got.

### 2. `13-rail-one-frame-one-measure` and every 1920 frame — loses to Linear on wide

At 1920 the app frame stops around 950px tall and leaves roughly a fifth of the
viewport as dead band below it. Horizontally the rail-aware frame is correct and
conservation holds, but vertically the app does not grow into the display.
Linear fills the window. A wide screenshot of this product currently
advertises unused screen.

**Product fix:** let the frame take the viewport height at rail widths, and give
the sections that end early something to end into.

### 3. `05-send-ledger` at 1440 and `11-risks` at 1440 — the desktop dead third

The known open item (Modern UI/UX, 8/10: "the on-demand detail panel at
>=1200px — the desktop dead third is still dead") is visible in the
photographs. Roughly a quarter of the frame right of the content column is
empty on every sheet. `02-command-surface-full` is the proof it is fixable:
that surface puts a derived readiness column there and is the best desktop
frame in the set.

**Product fix:** vendors ruling item 6. Ship the detail panel and the sheets
stop photographing like a centered mobile column on a desktop.

### 4. `06-checklist-follows-decisions` — a real frame with a broken-looking number

"Agree total budget + who pays — **280 days past its window**" on a wedding that
is 85 days out. The window offsets are computed from a playbook that assumes a
12-month wedding runway, and the sample's rebased date puts several rows
absurdly far past. A prospect reads "280 days past its window" as a bug, and on
this sample it effectively is one.

**Product fix:** clamp or re-express a window that predates the plan's own
creation. "Past its window" is the right idea; "280 days" is not a number the
host can act on.

### 5. `10-day-of-run-of-show` — only wins because it was staged

The frame is one of the three strongest in the set, and it required seeding a
start time. Without one the same screen renders "FRIDAY, AUGUST 21 · PREVIEW /
These moments don't have times yet" with a pencil-in-times proposal. Worse, the
un-staged day-of command surface reads "TODAY · **YOUR DAY-BEFORE PLAN** / It's
today" and a module headed "**How tomorrow starts**" — day-before copy showing
on the day itself. That incoherence is in the shipped product, and it is the
first thing a host sees on the most important day.

**Product fix:** the day-before module needs a T-0 branch, in copy and in
heading. Separately, the day-of engine should propose and accept a start time
far earlier than the day itself, so the live clock is the default state rather
than the staged one.

### 6. `07-money-way-back-under` — the claim is cropped

The frame leads with "Over by $955", which is honest and good, but the named
route back under is at the bottom edge and only the first cut is legible. The
sheet's information order puts four category rows and a paragraph of
explanation between the problem and the remedy.

**Product fix:** the first cut belongs directly under the over-by number. Also:
this frame carries a red bar, a red number and an amber eyebrow at once, which
is more color than the restraint budget wants.

### 7. Nothing in the set answers Wanderlog on multi-day

The workflow dimension is scored 9/10 with day CRUD as the remaining gap, and
the programme engine is real. But there is no seeded event with a span, so the
capability is unphotographable and therefore unsellable. A leader comparison
that omits the dimension's own headline surface is not a complete set.

**Product fix:** seed at least one multi-night sample — the bachelorette
*weekend* and the team *retreat* are both named as multi-day events and both
carry a single date. Fixing the sample data is a day's work and it unlocks the
frame that answers the one competitor the workflow dimension names.

### 8. `12-roster` and `03-readiness` at 390 — good, not distinctive

Both are honest and clean and neither makes a claim a competitor cannot make.
They earn their place as supporting frames in a gallery. They should not lead.

## What was recaptured, and why

Recorded because it is the useful half of the method:

1. `05-send-ledger` — first pass shot the collapsed vendor list. The ledger line
   was in the DOM (and so in the recon text dump) but hidden by
   `.vc-more{max-height:0}`. **A text dump is not a frame.** Re-driven by
   clicking `.vcard`, not the status chip, which opens a menu instead.
2. `08` / `09` — first pass landed on the sheet masthead with two item rows
   visible. Re-driven with a scroll onto the rows.
3. `10` — first pass shot the day-before module and a "Sample forecast" pill
   with demo-ish copy. Re-driven through the real run-of-show door, then
   recaptured again once a start time turned PREVIEW into the live clock.
4. `03` at 1440 — "WHERE YOU STAND" renders twice at desktop; the visible one is
   the last, not the first.
