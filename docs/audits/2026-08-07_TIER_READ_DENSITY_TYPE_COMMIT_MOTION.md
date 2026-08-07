# Every tier vs the leaders — density, type, commit, motion, workflow

_Read 2026-08-07. ~80 screens across three parallel reads: mobile (iOS, 30 screens),
desktop+tablet (web, 21), widescreen+commit+motion (web/iOS, 29). Numbers are estimated
from pixels (Mobbin web captures render 768px against a ~1440–1512 viewport, scaled ~1.97x)
— treat as +/-8%, not spec._

## FIRST, A CORRECTION TO THE 2026-08-07 SPACING READ

That doc said our 55px roster row is "1.5x to 3x taller than every leader." **That was
wrong, and it compared the wrong thing.** It measured our TWO-LINE row (name + reply
state) against leaders' SINGLE-line rows.

| row type | leaders | ours |
|---|---|---|
| single-line, web | 34–60px (Twenty 34, Luma 47, Mercury 50, Vimeo 60) | — |
| two-line, web | 64–79px (Deel 64, Vapi 72, User Interviews 79) | — |
| single-line, iOS | 44–50pt (Notion 44, Slack 43, Telegram 50) | — |
| **two-line, iOS** | **56–73pt** (ClickUp 60, Discord 64, Jira 73) | **55px** |

We are **under** the two-line band on mobile, not over it. Density is not our defect —
we fit ~12 rows above the fold against Vapi 10, Vimeo 11, Mercury 13. **Do not shrink the
row.** The mobile read says go the other way: 64pt row, 32pt avatar (ours is 28, smallest
in the set).

## WHAT IS ALREADY RIGHT — do not touch

- **Spacing scale.** `--sp-1..7` = 4/8/12/16/20/24/32 covers every measured leader value:
  gutter 16, card padding 12–24, section gap 32–48, panel pitch 32. One note: **no 20pt
  step appeared anywhere in 30 iOS screens** — `--sp-5` is the one rung with no external
  precedent. The real spacing defect is the 272 off-ladder literals, not the ladder.
- **Rail at 200px.** Leaders 180–266. At par. The code comment "leaders run 180-220" is
  accurate.
- **Motion tokens.** 100/120/140/200/220/240/260/420ms on one ease. More disciplined than
  what the leaders' surfaces imply.
- **No confetti on commit.** ZERO of 21 ops apps celebrate a commit. Our no-confetti rule
  is not austerity, it is the category standard.
- **Row selection does not animate.** Deel, Wrangle, Midday, Xero, Pipedrive all render
  selection as a flat tint. We match.
- **Per-field auto-commit + toast, no undo.** See the undo finding below — this is right.

## TYPE — the direction is settled

**Desktop body is SMALLER than mobile body, by 2–4px, in every app read.**

| | leaders | note |
|---|---|---|
| iOS body / row primary | **15–17pt** | Telegram, Discord, Fi, Jira all ~16 |
| web table row | **13–14px** | Twenty, Vapi, Mercury |
| secondary / meta | 11–14px, muted grey, never coloured | |
| status pill | 10–11px caps | the smallest type on the screen, by design |
| sizes on ONE screen | **3–6.** Twenty runs 3 and does hierarchy with weight+colour | 6 is the ceiling; more reads as CRM |

## THE GAPS, ranked by how many readers found them independently

**1. No list toolbar. 6/6 web and 5/5 iOS have one; we have zero controls.**
Luma — our closest positional competitor — puts Search + `All Guests` + `Sort` + "1 Going ·
1 Invited" on a guest list. 44px strip, search 260–320px with `⌘K` printed inside.

**2. The shell caps a WORK surface. No leader does this.** 15 of 21 web apps are
full-bleed. The apps that cap-and-centre (Framer, Xero, Clerk, Laravel Cloud) are capping
**settings and reading pages**, at ~700–900px for the PROSE COLUMN — not ~1280 for the
shell. Evernote and Claude show the reconciliation: full-bleed pane, capped paragraph
inside it. **We cap at the wrong layer.**
Correction to our own numbers: there are TWO caps in `styles.css` — `:168`/`:4693` are a
bare 1280 (32% dead at 1920) and `:3963`/`:4095` include the rail (~1504, ~20% dead). The
dead canvas is not uniform; the worst surfaces are on the bare-1280 rule.

**3. Our detail panel at 340px is the narrowest in the set.** Leaders 310–665, median
~430 (Mixpanel 310, Pipedrive 310, Linear 430, ClickUp 430, GitHub 480, Asana 665). Our
own `styles.css:2491` already records that 340 clipped the expanded card.

**4. The inline accordion has ZERO precedent — at any width, on any tier.** Both the
desktop and mobile reads flagged this independently as their strongest negative finding.
Nobody reflows a list as a consequence of the tap you just made. Leaders use a right panel
(desktop) or an overlay anchored on the row (mobile). Ours injects ~283px.

**5. No bulk select (5/5 have it), no count footer (4/4), no ⌘K (5/5 — and it is PRINTED
in the UI, not hidden).**

## COMMIT — our shape is correct, and the undo question has a real answer

Observed taxonomy, sorted by scope of the edit:

- **per-row / per-value** → auto-commit silent (Linear, Asana, ClickUp) or optimistic +
  toast + undo (Todoist, Quicken, Coda). **Never a save bar.**
- **whole form** → dirty-only save/discard bar (Laravel Cloud, Clerk, Whop, Chatbase),
  with a modal guard as the backstop. Disabled-until-dirty IS the dirty indicator.
- **bulk write** → a confirm gate (Xero: "You have selected 3 items to submit").

**The undo finding is the sharpest thing in the whole read: ZERO of 21 apps offer undo on
a per-field value change.** Setting a guest to "coming" is a fact, and the correction for
a wrong fact is to state the right one. Our chip → optimistic write → toast path needs no
undo and is at par.

Where it genuinely fails is on writes that are **not facts but structure** — deleting a
guest, removing a vendor, clearing a date. Those destroy information rather than record
it, and re-stating cannot restore them. Todoist proves the middle case: a *date change*
earns undo because the prior date is not recoverable from the new one.

## SEQUENCED — what gets us to 9, then to 10+

### To 9/10 (all tiers)
1. **Roster toolbar** — 44px strip: search (`⌘K` printed) + filter + sort, live count
   beneath. 6/6 web, 5/5 iOS. *Proof: Luma, Vapi, WRITER.*
2. **Move the cap from shell to measure** — shell `min(100% - 48px, 1800px)` on work
   surfaces; introduce `--measure:720px` for prose INSIDE panes. *Proof: Evernote, Claude.*
3. **Panel 340 → ~440**, non-modal, `⌘↵` printed on its primary, ‹ › next-record in the
   header. *Proof: Linear 430, Twenty 420 with `Open ⌘↵` on the button; Whop for prev/next.*
4. **Kill the accordion at every tier.** Desktop already has the right panel; below 1280
   use an overlay drawer + scrim (440px at 768–1024, un-scrimmed 1024–1194), and on mobile
   an overlay anchored on the row so tap 2 always lands in the same place. *Proof:
   Airwallex 770, Midday 500, Fi.*
5. **Bulk select + honest bulk editor** — every field defaults to the literal string
   "Keep current value". *Proof: Pipedrive.*

### To 10+ — where the set has nothing
1. **Spend the third pane on the ROLLUP, not the record.** Every leader's third pane shows
   the selected thing. Jira alone shows what the BOARD is telling you ("1 work item is
   due", "Time spent in status") — and it ships with a "Give feedback" link, i.e. new and
   unfinished even for them. A readiness pane reading the decision engine, with row-level
   CTAs, is unoccupied. **This also squares the standing ruling**: leaders never add a
   third NAV pane, but 8 run a third INSPECTOR/CONTROL pane. Frame.io resolves it — make it
   toggleable, keyed, and state-remembered, and it is neither permanent nor merely
   on-demand.
2. **Filter by who owes the next act, not by status enum.** Every filter in the set is a
   property filter. None filters by ownership of the next move. Ship *you owe / they owe /
   blocked* — a re-cut of data we already compute, and the one distinction a host holds in
   their head.
3. **Classify every write as fact-stated vs structure-changed, and gate it in a test** the
   way `taskInferenceProof.test.js` gates inference. Offer reversibility only on the second
   class. That is a more defensible line than any leader draws, precisely because it is
   derived rather than copied — and it converts "no undo" from an absence into a position.
   Asana's durable second tier (a Restore page after the toast dies) is the only precedent,
   and a per-event change log is the higher form.

## EXPECTED AND NOT FOUND — stated plainly
- **No tablet-width web captures exist (768–1194).** Mobbin holds none. Nobody in this set
  has solved that width; our tier-7 answers are INFERENCE from collapse patterns, not
  evidence, and must be marked as such.
- No row-expand accordion at desktop width, in any app.
- No undo on a per-field value change, in any app.
- No density toggle (comfortable/compact) anywhere, despite expecting one.
- No `/`-to-search — universally `⌘K`. **Do not build `/`.** (This retires Saarinen's `/`
  proposal from the board sitting.)
- No dense DARK operations roster to copy. Only Riot Mobile and alias were dark, and Riot
  is low-density consumer social. Our dark+dense combination has no direct comparator, and
  dark type needs slightly more leading than these light-mode numbers imply.
- No keyboard row navigation beyond Twenty's `⌘↵`. No j/k anywhere.
- No app binds a shortcut to the detail pane except Frame.io. Nearly unclaimed.
