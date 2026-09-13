# HANDOFF — NGW Event Planner

**Measured reality, not intentions.** Updated 2026-09-13 (a live-hosting session
closed: sporting-event recognition widened far beyond Super Bowl (NBA
Finals, World Cup, Kentucky Derby, UFC, Olympics, bowl games, and more —
all routing to Watch Party); Watch Party missing from the quick occasion
picker at creation; Super Bowl / sports-watching free text not resolving to
Watch Party; no way to start a second event mid-session; a Game Night/Watch
Party misclassification; an occasion-picker mis-tap risk; a dead "Something
else" pill; and, earlier the same session, a severe nav dead end on
Day/After. On top of the Cookout wings/game-day content, headcount parse
fix, and CI-red closure).
The long-form architecture log stays `docs/architecture/WHERE_WE_ARE.md`;
this file is the short answer to "where is it, is it green, what's next."

## State

| Fact | Value |
|---|---|
| Branch / HEAD | `main` @ `0e1d73b` |
| Jest | **6,238 passed**, 1 skipped, **0 failed**, **442 suites** — first fully green run this session; the prior pre-existing failure is fixed, not just excused (see below) |
| vitest (hostv2 seam) | **14 passed** — the only runner that EXECUTES the host shell (new 2026-09-03) |
| Backend pytest | **353 passed** — re-run this pass via `verify-all` |
| verify-all | **10 steps**, seam included; `--fast` skips the matrix |
| e2e (Playwright) | full matrix **909 passed / 190 skipped / 0 failed** (20.7m). Skips down 20 from the rotted-guard fix; the census classified all 36 guards |
| Activation funnel | `activationFunnel.spec.mjs` **49/49** across 7 viewports, 4 hooks each red-proofed |
| Deploy | GitHub Pages from source; backend on Render |
| Billing | **DORMANT** — `REACT_APP_BILLING_LIVE` unset (Model D built, gated) |
| Path to Production | stage **1 recorded PASSED 2026-09-03** (who hits this today, sourced from the project's own competitive reads — not invented). Stage **8 (Maintain) recorded, passed-with-conditions, 2026-09-03** — first gate ever posted for this stage. Stage 6 PASSED WITH CONDITIONS (Todd, 2026-08-29). Stage 7 ruled `passed-with-conditions` by the review board 2026-09-02, under the owner's standing delegation. **Stage 5 (Security) also recorded 2026-09-03** — closing a tracking gap: the audit ran 2026-08-21 but the gate was never POSTed, so it read as historical/unanswered until this run. **Stage 9 entry: NO** |
| Standing conditions | **9**, gating stage 9 (Promotion) — 6 security, 3 marketing. No paid spend authorized. Unchanged by the stage 5/8 recordings — no new claims, only closing tracking gaps |
| Path artifact | Republished 2026-09-03 (twice). Stage 5 and 8 cards show real recorded state. Three stage-7 checkboxes corrected: they described fixed problems (admin console key, 3-of-4 recovery functions, day-of probe) that had never been ticked off when the fix landed — found by re-verifying every open item against the repo, not by trusting the page |

## ADDED 2026-09-13 — Sporting-event coverage widened far beyond Super Bowl

Host: "I want sporting event watch party types. Do we have playbooks?"
Only one exists — `watchParty.js` — and it's genuinely built for this (see
the FIXED entry below). Asked which of Super Bowl / March Madness / World
Series should get their OWN dedicated playbook; host's answer: "All and
then some. Cover more sporting events than these 3."

**Decision, stated plainly:** did not author a dozen near-duplicate
playbook files. Every one of these is the same hosting shape — a screen
everyone can see, food timed to a start whistle/tipoff/first pitch, drinks
in coolers, cleanup between rounds — and separate files would each carry
their own copy of the same cost citations, which is exactly what
`researchPolicyCompliance.test.js`'s ratchet exists to catch (a duplicate,
not a corroboration). Instead widened `eventTaxonomy.mjs`'s KEYWORDS to
route many more named events to the existing Watch Party playbook: NFL
Draft, NBA Finals/Draft, Stanley Cup, NHL playoffs, World Cup, Champions
League, the Masters, Ryder Cup, Kentucky Derby, Daytona/Indy 500,
Wimbledon, fight night/UFC/PPV/boxing/title fight, Olympics, bowl games
(rose/sugar/orange/cotton/fiesta/peach), national championship, CFP, wild
card, conference championship, tailgate, Elite Eight, draft day/night,
all-star game.

**Deliberately left alone:** "sweet sixteen" — already resolves to the
Sweet 16 birthday milestone (that rule runs first in KEYWORDS), and the
basketball tournament round of the same name isn't worth a real collision
over. Verified both "Sweet 16 party" and "Sweet sixteen birthday bash"
still resolve to Sweet 16 after this change, unaffected.

**Honest limitation, disclosed rather than papered over:** the Watch Party
playbook's actual CONTENT — not just its name — assumes a single
continuous ~3.5–4h game with one halftime: several schedule tokens and
risk ids are literally `kickoff`/`halftime` (`r_kickoff`, `t_halftime`,
`when: 'halftime'`). That's accurate for football/basketball/soccer, a
looser fit for a multi-fight UFC card, and a real mismatch for a horse
race (the Derby itself is ~2 minutes; the party is a build-up event, not a
game with a halftime), a golf major (hours of continuous coverage, no
discrete break), the NFL Draft (a broadcast announcement show, not a
game), or the Olympics (multi-week, many discrete events). Recognition
now routes all of these to Watch Party; the schedule/risk COPY they'll see
still talks about kickoff and halftime regardless of which one it is. Not
rewritten in this pass — a genuine per-format content differentiation
(or at minimum a copy-only de-footballing pass: "kickoff" → "the start,"
"halftime" → "the midpoint break") is real, scoped work, flagged for a
follow-up rather than done blind under time pressure.

Live-verified 13 phrasings (NBA Finals, Stanley Cup, World Cup, Kentucky
Derby, UFC fight night, the Masters, bowl game, national championship,
wild card weekend, NFL Draft, tailgate, Wimbledon, Olympics) resolve to
Watch Party; both Sweet 16 phrasings unaffected. Root Jest 442/442. hostv2
build + parity gate + hostv2-artifact drift gate all clean.

## FIXED 2026-09-13 — Watch Party missing from the quick occasion picker at creation

Host report: "Those events aren't in list at creation." Asked which list
specifically before touching anything (three real candidates existed) —
answer: the occasion TYPE list shown while creating an event, not an
events list after the fact.

**Ruled out first, with live evidence, not assumed:** the searchable event
palette (Cmd/Ctrl+K → type an event name) and the events-switcher sheet
("This event" → "Your events") both already show a newly created event
immediately and correctly — verified by creating two fresh events back to
back and confirming both listed in each surface with full data intact. My
first pass at checking this had truncated my own debug output and looked
like a miss; re-checked with the untruncated text before concluding
anything, and both were actually fine. Recorded here so the false lead
isn't re-investigated.

**The real gap:** `QUICK_TYPES` — the 6-chip default shown when picking
"Which occasion?" — is `['Birthday', 'Wedding', 'Anniversary',
'Graduation', 'Reunion', 'Get-Together']`. Watch Party existed only one tap
deeper, inside "See every occasion." That six-item set was a deliberate
host ruling (2026-08-05, "six common occasions plus search," a density
fix) — not touching that call in general, but a live host report today
asking for this specific type is a stronger, current signal than the old
default. Added `'Watch Party'` as a 7th quick chip. Game Night stays one
tap away — this report was about Watch Party specifically.

Live-verified: the quick chips now read Birthday, Wedding, Anniversary,
Graduation, Reunion, Get-Together, Watch (Party) — no extra tap. Root Jest
442/442. hostv2 build + parity gate + hostv2-artifact drift gate all clean.

## FIXED 2026-09-13 — Super Bowl / sports-watching free text didn't resolve to Watch Party

Host question: "Do we have event for watching sports? Super Bowl etc." The
honest answer at the time: **the playbook does, the parser mostly didn't.**
`watchParty.js` already exists and is explicitly authored for this — its
own file header says "Super Bowl / Sports Watch Party... TV-forward,
grazing food ready before kickoff, halftime refresh." But before this fix,
free-text recognition only caught the literal phrase "watch party" (fixed
earlier this session) or the exact alias strings `'Super Bowl Party'` /
`'Game Day Party'`, which real sentences rarely match verbatim. Tested and
confirmed broken:

  "Super Bowl for 10 people this weekend"        → no type recognized
  "Super Bowl Sunday at my place, 10 people"      → **Day Party** (wrong)
  "Hosting the big game this weekend, 10 people"  → no type recognized
  "Playoff game at my house, 8 people"            → no type recognized

The "Super Bowl Sunday" → Day Party result is a second bug on its own:
`smartParseEvent.js` falls back to `HOST_TYPES.find(ht => text.includes(ht
.replace(' party','')))` when `resolveCanonicalType` finds nothing — a
bare substring match against type names — and "Sunday" contains "day".

**Fix:** added an explicit `eventTaxonomy.mjs` KEYWORDS entry for `super
bowl`, `playoffs`, `the big game`, `march madness`, `world series`, `final
four`, `championship game`, ordered ahead of the generic fallbacks. Once
`resolveCanonicalType` returns 'Watch Party' directly for these phrasings,
the fragile substring fallback never runs for them either — one fix closes
both bugs for this class of input.

Live-verified all 4 broken cases plus 5 more ("Super Bowl party," "watching
the super bowl," "March Madness," "World Series") now resolve to Watch
Party. **One residual gap, not fixed:** "Sports watching party" with no
named event still falls through to the generic party/celebration catch →
Birthday — matching on bare "sports" without an anchor (a named
event/team, or "watch") risks false-positiving on unrelated party types,
so left as a known edge case rather than widened blind.

Root Jest 442/442. hostv2 build + parity gate + hostv2-artifact drift gate
all clean.

## FIXED 2026-09-13 — No way to start a second event while one was already loaded

Host report: "When in an event need to create new events on occasion."
Confirmed a real dead end, live, not a UI nit. Every apparent entry point
for starting a second event mid-session — the dock's Create tab, the nav
sheet's Create segment (the Menu button added earlier this session), the
command palette's "New event" result — all called bare `setStage('create')`.
That stage only renders the blank "What are we planning?" prompt while
`!revealed`; once the loaded event has cleared the reveal ceremony,
`'create'` shows THAT event's recap ("YOUR EVENT, UNDERSTOOD…") forever —
nothing anywhere reset `revealed` back to `false` except "Change an
answer," which deliberately re-edits the SAME event via `redoEventId`, not
a new one. Live-verified before touching anything: all three entry points
looped back to the current event's recap with no way past it.

**Fix:** added `startNewEvent()` (`hostv2/src/HostShellV2.jsx`, near
`dismissWelcome`) — when a finished event is loaded, clears the
create-flow scratch state (`smartText`, `fType`, `createEdit`,
`intakeOpen`, `typeOpen`) and un-reveals so the blank prompt renders; a
draft still in progress (`!revealed`) is left alone so returning to Create
doesn't wipe a half-typed one. `assemble()` already mints its own new
event id on every call unless `redoEventId.current` is set, and the
current event's data lives in the store under its own id regardless of
this scratch state, so nothing about the event in progress was ever at
risk. Wired into all three entry points.

**Live-verified end to end, not just read from code:** created a second
event ("Sunday Dinner…") from inside today's real Cookout event via
Day tab → Menu → Create, then confirmed via `localStorage` that both
events now persist independently under separate ids — the Cookout keeps
its real date, name and data untouched:
```
cust-mtzzrwkd-6byeqj  My The Cookout   The Cookout   2026-09-13
cust-mtzzs1om-g3n0ei  My Dinner        Dinner Party  (no date)
```
Root Jest 442/442. hostv2 build + parity gate + hostv2-artifact drift gate
all clean.

**Noted in passing, not fixed (separate from what was asked):** the
free-text type resolver read "Sunday Dinner for 8 next weekend" as generic
"Dinner Party," not the authored "Sunday Dinner" playbook — the same class
of gap as the Game Night fix above, in a different type. Flagging for a
follow-up keyword audit across `eventTaxonomy.mjs`'s `KEYWORDS` list rather
than patching one more entry blind.

## FIXED 2026-09-13 — Game Night/Watch Party misclassification, occasion-picker mis-tap risk, dead "Something else" pill

Three more reports from the same live-hosting session, root-caused and fixed:

**"Chose game night and it fed day party."** `eventTaxonomy.mjs`'s `KEYWORDS`
list still routed `game\s*night` and `watch\s*party` into the generic
Get-Together bucket. Both were later promoted to their own authored
playbooks (`gameNight.js`, `watchParty.js`, both in `ALL_PLAYBOOKS`) but the
keyword carve-out was never added — a half-finished promotion. Added
explicit entries for both ahead of the generic line (first match wins).
Live-verified: "Game night for 6 people this Saturday at 7pm" now resolves
to Game Night.

**The likely mechanism behind that report's exact wording:** the occasion
picker's "See every occasion" shelves (`.shelf`) were a horizontal
snap-scroll carousel with no fade/edge cue, overflowing the viewport —
several types, "Day Party" (shown as "Day") among them, sat fully
off-screen. Confirmed by screenshot: cut-off labels, no visible affordance
that more existed. Combined with `scroll-snap-type:x proximity`, a
flick-then-tap can land on whatever chip just snapped into place, not the
one tapped at. This class has exactly one consumer (this picker) and is a
selection list, not a browse carousel that earns horizontal scroll —
switched to wrap. No off-screen options left. `spacingLadder.test.js`'s
ratchet baseline lowered 272 → 271 as a side effect (the carousel's bleed
margin goes with it) — a legitimate ratchet turn, not a spacing pass.

**"Something else pill in creation doesn't extend type list."** Tapping it
in the quick-intake flow silently closed the panel — no focus, no hint,
nothing visibly happened, reading as a dead control. Now focuses the
free-text input, the hand-off the code's own comment already claimed it
was doing.

All three live-verified against the running app. Root Jest 442/442
(271-baseline spacing ratchet included). hostv2 build + parity gate +
hostv2-artifact drift gate all clean.

## Still open from this session — needs a product call, not a blind patch

**"Nowhere to advance when it's today screen. Can get back but not advance."**
Confirmed: the persistent "what needs you next" bar (`.next-bar`, the
primary CTA pinned to the frame bottom) is scoped to `stage === 'plan'`
only (`hostv2/src/HostShellV2.jsx` ~19779: `{stage === 'plan' && !heroInView && (...)`).
Day and After never render it — Day-of only has the safety checklist
(togglable, not sequenced), the Walk-it/Full-agenda toggle, and — only
before a start time is set — a "pencil in times" propose card. Once that's
accepted or dismissed, there is no forward-pointing CTA on Day at all; the
host has to leave the tab (now possible, see below) to see what's next.
Didn't patch this blind: the next-bar's logic (`queue`, `listIsCalm`,
`heroInView`) is built for the Plan-tab hero and its `days === 0` branch
already assumes it's being read FROM Plan, not reused ON Day — grafting it
on is a product decision (what does "next" mean once you're already on the
day-of screen?), not a wiring fix.

**"Should also be able to decline hiring anyone."** Confirmed: every
suggested vendor category (`unbookedSuggestions`, `hostv2/src/HostShellV2.jsx`
~18373) renders only an "Add" action — no decline/dismiss. The "People you
might hire" home-tile nudge (~10007) and this list will suggest the same
roles indefinitely even after a host has consciously decided to DIY
everything; `cat.altToDIY` shows the DIY alternative as text but there's no
way to record the decision. The established in-app pattern for exactly
this (a per-item "skip it" that's undoable) is `event.foodSkip` on the
shopping list — the natural fix is the same shape here
(`event.vendorDeclined`), but it also touches `src/lib/vendorPlan.js`'s
category list and the home-tile count, both shared/tested engine code, so
it's sized as its own piece of work rather than a same-turn patch.

## FIXED 2026-09-13 — Day tab and After tab were a hard navigation dead end

Host report while actually running today's real event through the app: "No
way to get back from day of." Reproduced live (Playwright), root-caused two
layers deep before touching anything:

1. `elegantMode = q.get('elegant') !== '0'` in `hostv2/src/HostShellV2.jsx`
   is inverted from its own documented intent — `styles.css:575-576` calls
   it a "Flag-gated test... `?elegant=1`," but the code makes it opt-OUT
   (`?elegant=0` required to disable). Every real host, with no query
   param at all, has been running in elegant mode.
2. `.dock.dock-retired{ display:none; }` hides the entire floating bottom
   nav (Create/Plan/The Day/After) whenever elegant mode is on — confirmed
   via `getComputedStyle`, not just the class name.
3. The documented replacement for the dock — an `.ev-eyebrow` "Menu"
   button that opens the phase-nav sheet, commented in its own code as
   "the ONE element every elegant screen keeps" — was only ever wired into
   one branch of the Plan tab's hero. The Day tab (both the live-clock
   branch and the pre-time-set preview branch a same-day event actually
   renders) and the After tab had **zero** navigation control on screen:
   no dock, no eyebrow, nothing. Confirmed by DOM inspection
   (`.ev-eyebrow` did not exist in the tree on Day), not just a screenshot.

**Fix:** added the same button — same class, same `setSheet({kind:'nav'})`
handler already used elsewhere — to the three screens that were missing
it. No new surface, no change to `elegantMode`'s default (it gates 61
call sites across this file's visual language; flipping it was out of
scope for a nav bug). Live-verified: Day (both branches) and After now
show Menu, open the nav sheet, and return to Plan correctly. hostv2 build,
the parity gate, and the hostv2-artifact drift gate (`npm run gate:hostv2`)
all clean; root Jest still 442/442 (hostv2 is a separate Vite app the root
suite doesn't import).

**Still open, reported same session, not yet fixed (see below for why):**
- Shopping-list "skip it" does not update the day-of run-of-show or the
  "How today starts" checklist text — those are static authored prose in
  each playbook's `schedules` block, not derived from `foodGot`/`foodSkip`
  state. Confirmed in `theCookout.js` and `playbooks/index.js`'s
  `effectiveRos`/`playbookRunOfShow`. This is a real architecture gap
  spanning every playbook (~40 files), not a one-line bug — scoping it as
  a project, not patching one file.
- `smartParseEvent.js` has no street-address extraction at all — only
  `venuePhrase` (named-place phrases like "my brother's house") and
  city/state (`parseVenueLocation`). A full address typed into the create
  sentence is silently dropped; the "Guests will ask where — add the
  address" prompt (gated on `!/\d/.test(vf.name)`) will therefore always
  fire for a home-hosted event, regardless of what was typed at creation.
  Address only ever lands via the separate manual "Add it" flow.
- Cookout's new `game_day` decision ("Is this cookout also a watch party?")
  is confirmed live on the decision board for today's real event — but
  it's the 6th of 6 open calls, collapsed behind "+1 more — show the rest,"
  and defaults to "No." Shipped and reachable, not surfaced prominently.

## ADDED 2026-09-13 — Cookout wings alternative + game-day decision (first day of NFL season)

Host directive: "Cookout should have chicken wing alternative. The [demo]
should also be built for game day. Today is first day of nfl season."
Two additions to `src/lib/playbooks/data/theCookout.js`, both verified
against the full 442-suite root Jest run (6,238 passed, 0 failed) before
commit — not just the touched-file scope.

**Wings:** added to `p_chicken`'s existing `alternatives` array as plain
text (pricing + the mambo/buffalo-sauce framing), the same pattern every
other protein alternative in this file already uses. **Two self-inflicted
regressions found and reverted on the way, worth recording so the pattern
isn't repeated:**
1. First attempt added wings as its own standalone `purchases` entry.
   That silently auto-summed into every Cookout plan's `foodHigh`/`foodLow`
   total (alternatives-as-text do not; a separate purchase line does),
   which collapsed a `reader.test.js` assertion (`foodHigh` delta between
   two fixture plans) to exact equality. Reverted to text-only.
2. Second attempt merged the wings citation into `p_chicken`'s existing
   `provenance`/`costProvenance`. That tripped `knowledgeInventory.test.js`
   ("ambiguous" claim, combined sourcing) and the `researchPolicyCompliance.test.js`
   ratchet (uncorroborated-claims count went down without a baseline
   update — that ratchet only permits a *tracked* decrease). Reverted
   `p_chicken`'s provenance to its original single-claim text; the wings
   price lives only in the alternatives string, which these corpus
   scanners don't parse.

**Game day:** new `game_day` decision (between `music` and `shade_seating`)
asking whether the cookout is also a watch party, defaulting to "No —
cookout only," framed as a logistics call (TV/sound), not a food one — it
does not resize the protein order by itself. First draft gave it an
`affects` array (`['p_wings']`, then `['p_chicken']`); both failed
`decisionWireProof.test.js`'s "declared effect is real" gate because none
of its 3 options actually move a quantity or cost. Removed `affects`
entirely, matching how `music`/`shade_seating` (also non-quantitative) are
authored in this same file. Added one `heartMoments` line ("a big play on
the screen and the whole yard erupts together") and updated `meta.summary`
to mention the game-day framing without pinning it to today's specific date.

Live-verify against the running app is the one item still open from this
change — code-level tests are green, UI behavior not yet clicked through.

## FIXED 2026-09-13 — "5 headcount" silently became 40 guests

Host report, reproduced exactly before touching anything: typing "5
headcount" into the create screen showed "~40 · typical" on the guest chip.
Same class of gap as the bachelor/bachelorette fix already in this file's
history — `COUNT_NOUNS` in `smartParseEvent.js` had no entry for
"headcount"/"head count", so the guest-count regex never matched, `guests`
stayed `null`, and `effGuests` fell through to `playbookTypicalGuests('The
Cookout')` — 40, the playbook's own default, standing in for the 5 the host
actually typed. Added both forms to `COUNT_NOUNS`. 2 new tests
(`smartParseEvent.test.js`), live-verified: the same input now shows "~5."

## FIXED 2026-09-13 — CI was red on `main` for 4 days, silently blocking every deploy

Host directive: "Has everything been pushed to prod?" The honest answer at
the time was **no** — `git push` had succeeded both times this session, but
that only means the commit reached GitHub. Checked the actual GitHub Actions
run for each push (`actions_list` / `get_job_logs`, not assumed from the git
result) and found the **Unit suite step failing on both**, which skips every
step after it — including the build and the Pages deploy. **The live site
has been serving commit `02f03cf` (2026-09-09) this entire session**; none
of today's fixes reached production until this was found and closed.

**Root cause, confirmed from the CI log, not guessed:** `lodgingOutlet.test.js`
hardcoded its fixture event's date as a literal — `{ date: '2026-09-11',
endDate: '2026-09-13' }`. `surfaceRegistry.js`'s lodging `raise()` opens with
`if (isPastEvent(event.date)) return [];` — once today's date passed the
fixture's, every row the test expects is silently `[]`. This ran green on
2026-09-09 (the fixture was still in the future) and started failing the
moment the calendar caught up to it — the exact drift class this file's own
HANDOFF already documents for the Repast fixture. Confirmed via `git stash`
that this predates every commit made this session; not something introduced
today, but something blocking today's (and the last 4 days') deploys
regardless of who pushed.

**Fix:** the fixture's dates are now computed relative to `Date.now()` (30
days out, 2-night span preserved) instead of a literal string, so this
class of failure cannot recur here. Verified: 16/16 tests in that file pass,
full root suite now genuinely 442/442 suites green — the first clean run
this session, not a suite with one excused failure.

**Still to confirm once this is pushed:** watch the next Pages deploy run
actually reach the `deploy` job (not just `build`) and go green — that is
the only real proof "pushed to prod" is true again.

## FIXED 2026-09-13 — the "Typical" budget ignored every playbook's own real cost data

Host directive: "find where the pricing budget is wrong — don't include
items not part of the plan for the spine." Traced to
`src/lib/budgetEstimator/totalEstimate.js`.

**The bug:** the "Your budget — Typical/Lean/All-out" number never reads
what the plan itself already knows. `PER_HEAD_BY_TYPE` has zero entries for
any of the ~20 home-hosted types (The Cookout, Fish Fry, Crab Feast, Sunday
Dinner, Housewarming...), so all of them fell to one flat **$30–120/head**
`home_hosted` family default — even though every one of those playbooks
already carries its own authored, type-specific `meta.perGuestCost`:

| Type | Playbook's own band | Estimator used instead |
|---|---|---|
| Fish Fry | $8–18/head | $30–120/head |
| Housewarming | $8–22/head | $30–120/head |
| The Cookout | $15–35/head | $30–120/head |
| Crab Feast | $25–60/head | $30–120/head |

Live-verified on the exact BBQ input from the previous session: a 15-guest
Cookout's "Typical" was **$1,400** before the fix (using the flat $30–120
band), **$500** after (using the playbook's own $15–35). Fish Fry could be
up to 6x its own playbook's number.

**The fix, deliberately narrow.** `estimateTotalRange` now checks
`getPlaybook(type)?.meta?.perGuestCost` ONLY when the type has no entry in
`PER_HEAD_BY_TYPE` — it fills the actual gap, nothing else. Every
already-curated type in that table (Wedding, Birthday, Reunion, Retirement
Party, Baby Shower, Bridal Shower, Sweet 16...) is untouched, even though —
this was the surprise mid-fix — **every one of them ALSO has its own
`perGuestCost` on its playbook, and it usually disagrees with the curated
table** (Birthday: playbook $15–60 vs. table $60–250; Reunion: playbook
$12–35 vs. table $60–200). Overriding those would be a much bigger, riskier
change than what was asked, and reconciling two independently-sourced price
datasets is a pricing-research call, not a missing-data bug. Left alone,
gated by a test that asserts the curated entry always wins.

**Still open, not fixed here — a separate, deeper mismatch.** "Typical" and
the plan's own real itemized total (the food/shopping list `hostSpending`
sums from `playbookFoodPlan`) are two independently-computed numbers that
were never unified, and can still disagree — now in the OTHER direction:
the same 15-guest Cookout shows "Typical $500" against a real itemized
total of "~$1,018 spoken for" once the food list is priced out. The
estimator's own copy claims "the plan sizes food, vendors and shopping from
here," which isn't true either way — the food plan sizes independently from
guest count, never from the Typical number. Making them agree means
picking which one is the source of truth; that's a design call for a board
sitting, not a code fix, and it's flagged here rather than silently implied
solved.

Files: `src/lib/budgetEstimator/totalEstimate.js`,
`src/lib/__tests__/playbookPerHeadBudget.test.js` (5 new tests). Full root
suite re-verified after the change: 6,236 passed / 1 skipped, same single
pre-existing `lodgingOutlet.test.js` failure (unrelated, predates this
session — confirmed via `git stash`).

## FIXED 2026-09-13 — "today" not parsed as a date, and a home venue misread as a destination trip

Driven from a real create-screen input: "Backyard BBQ at my brother's house in
Greenbelt, MD today at 3pm, about 15 guests." Two separate defects in
`src/lib/smartParseEvent.js`, both live-verified in `hostv2` (local dev
build) before and after.

**1. "today"/"tonight" had no relative-date handler.** "Tomorrow", "next
Saturday", "in 2 weeks" all resolved; the single most literal date a host can
say fell through to "no date yet." Added alongside the other relative forms.
Gated: `smartParseEvent.test.js` › `"today" / "tonight" resolve to the
current date`.

**2. The destination weak-signal fired on ANY resolved city with no signed-in
profile — including the host's own family's house.** `placeAway` used
`!homeCity || normCity(placeName) !== homeCity`; with no profile, `homeCity`
is `''`, so `!homeCity` was always true. A bare "in Savannah, Georgia" firing
this way is DELIBERATE, tested prior behaviour
(`destinationDetection.test.js`, `destinationBarePlace.test.js`) — the
file's own header says a miss here silently deletes the whole travel/lodging
stack, which is the costlier failure. That tradeoff was not touched.

The narrower, real bug: the text already says whose home it is
(`home`/`venuePhrase` — "my brother's house", "our place", "at home") and
those bare-city test cases never have that signal ("in Savannah, Georgia"
names no one's house). So the carve-out only fires for a NAMED PRIVATE HOME:
with no known home city to compare against, a named home stays local; with a
known home city, it's still compared normally (a relative's lake house in
another state still reads as travel). A bare city with no named home venue
keeps the old fire-by-default rule exactly as before.

**Why this matters beyond copy:** `isDestination` blends the budget estimate
toward the `travel_led` per-head band ($200–600 vs. `home_hosted`'s
$30–120) and is one of Model D's three paywall doors. Before the fix, a
signed-out host planning an ordinary local BBQ with a known city could get a
budget estimate ~5x too high (verified: $7,200 "Typical" for 15 guests vs.
the correct $1,400) and risked the destination paywall gate on a plan that
never left town.

**First attempt was too broad** (`!!homeCity && normCity(placeName) !==
homeCity`, no home-venue carve-out) and broke 2 test suites encoding the
deliberate tradeoff above (6 tests). Caught by running the full suite before
push, not assumed from the one file touched — re-run confirmed 6,231
passed / 1 skipped / 0 new failures against the narrower fix, only the
pre-existing `lodgingOutlet.test.js` failure remains (confirmed via `git
stash` to predate this session entirely).

Files: `src/lib/smartParseEvent.js`, `src/lib/__tests__/smartParseEvent.test.js`
(4 new tests, 2 existing tests corrected to pass a `homeCity` matching their
actual intent, which predated the HostShellV2.jsx call site's documented
contract for the absent-profile case).

## STANDING DELEGATION — the board decides, 2026-09-02

Owner's instruction: **"decisions are to be handled by the review board."**
Recorded in `ptp-gates.json` with `ruledBy`, because the Stop hook reads that
field and because a delegation living only in a conversation is one the next
session cannot see. It persists across stages until withdrawn (Step 8b), and it
waives seat confirmation with it (Step 4c).

**What it does NOT delegate.** Acts that need Todd's own hands or accounts are
not decisions and no board can discharge them:

- reading the PostHog and Sentry consoles — proving events *arrive*, not merely ship
- the stranger-proof first run
- the rollback-to-private rehearsal

A board can rule on what those results *mean*. It cannot produce them. Anything
else — every gate ruling, every design call — goes to the board and does not
wait on Todd.

## The parked shelf said its own heading seven times — fixed 2026-09-03

`decisionRankReason()` opened with a constant, `'Comes up closer to the date.'`,
for any row with `horizon === 'later'`. The board partitions
`deferred = open.filter(r => r.horizon === 'later')` — the same predicate — and
HostShellV2 prints "Comes up closer to the date" as the shelf HEADING above
those rows, and again in the toggle above that.

Driven live on a 120-day Crab Feast: **seven copies of one sentence on one
shelf**, and nothing said about any of the five decisions parked there.

Now derived from `daysOut`, which was already on the row: "Comes up in about 4
months." The engine's underlying call is unchanged and still right — for a
parked row the headline is timing, which is why that branch deliberately
outranks an authored `priorityBasis.rationale`. It just stated the timing in
the one phrasing that carries none.

The five rows still read alike. They are 110–115 days out — the same distance —
and the first draft of the test demanded they differ, which would have meant
manufacturing precision the data does not carry. The probe caught it; the
assertion now compares a 60-day shelf against a 120-day one.

Gated by `parkedRowReasonIsSpecific.test.js`. `decisionBoardWave2b` had pinned
the old literal and now checks the property it meant.

**A FIFTH site, in frozen code — noted, deliberately not fixed.**
`src/App.js:43171` carries the same fallback,
`{r.rankReason || r.because || 'Comes up closer to the date.'}`, and the
comment above it at :43164 asserts the engine's rankReason *is* that string.
That comment is now false.

No action taken, on purpose. App.js is the FROZEN CRA donor (A1 freeze) and
this is neither a security nor a data-loss fix. And there is nothing to repair
behaviorally: App.js reads `rankReason` from the same shared engine, so its
decisions panel now shows "Comes up in about 4 months." too, and the literal
stays dead. **The stale comment is the trap** — whoever unfreezes App.js will
read it as a statement about current engine behavior. It is not.

Checked before worrying: **no e2e spec asserts on this copy**, so the string
change cannot redden the matrix.

**The trap worth keeping:** this defect had no source location. Each file was
individually reasonable; the duplication existed only in their composition. No
single-file assertion could see it, which is the argument for the live drive.

## TRAP: a green unit run does not cover the host shell at all

**35 jest suites read `hostv2/` as TEXT** because jest cannot execute it —
`react-scripts` pins `roots` to `<rootDir>/src`, and hostv2 is a separate Vite
tree outside it. Zero tests import from hostv2; every one of the 35 is a
`readFileSync` + regex.

They are tripwires, not behavior coverage. The 50 specs in `hostv2/e2e/` are
what actually executes the shell.

**RULED AND HALF-BUILT the same session.** The board rejected both routes the
census offered: "eject CRA" was never required. hostv2 had vite + playwright
and no vitest anywhere, so the seam costs a devDependency, not a toolchain
migration.

- **Built:** `hostv2/test/shellParses.test.mjs` + `npm run test:unit`. vitest
  reuses `vite.config.js`, so the `@app` alias, jsx loader and env `define` are
  the app's own. It **imports** the shell — the thing jest cannot do.
- **Wired:** runs in the CI e2e job *before* `playwright install`, so a shell
  that will not compile costs ~3s instead of 14 minutes.
- **Red-proofed, and this is the number to quote:** with a syntax error in
  `HostShellV2.jsx`, **vitest fails and jest's `heroComposition` +
  `sendLedger` stay green across 73 assertions** — both of which read that
  exact file. Not a criticism of the 73; it is the reach limit, measured.

**Dissent DISCHARGED the same session, and it was right within the hour.** The
seat said step 1 was prose with no instrument. Proof arrived faster than the
ruling: the census published "35 text gates" and the number was **36** by the
end of the session, because `seamRunsInCi.test.js` was added and nobody noticed.

`textGateRatchet.test.js` is the instrument — a **ratchet, not a ban**. A new
text gate on hostv2 fails the build and is named; the author either writes an
e2e or bumps `MAX_HOSTV2_TEXT_GATES` with a logged reason. Red-proofed against
exactly that violation. It caught itself first (37 vs 36) and is excluded by
exact path, never a name pattern.

`npm run coverage:honesty` prints what a green run reaches:

```
jest suites total                    441   execute demo/src
  ...of which only READ hostv2        36   TRIPWIRES. Cannot catch a parse error.
vitest files (execute hostv2)          1   the seam
e2e specs total                       50
  ...dormant by design (_*Capture)     3
e2e LIVE GATES                        47   the real behavior instrument
```

**Two numbers I published today were wrong** (corrected in the census, originals
left visible): 35→36 text gates, and 50 e2e specs → **47 live gates**. On the
second: five files match a grep for "not a gate", but two only quote the phrase
in comments *about* gate honesty. Classifying from the grep would have retired
two working gates on paper.

Census, ruling, dissent and the red-proof table:
`docs/audits/2026-09-03_SOURCE_TEXT_SUITE_CENSUS.md`.

**Two suspicions I had this session were WRONG, both caught by checking:**
e2e does run on push-to-main (I misread the workflow indentation and nearly
reported it dead), and my two attempts to measure e2e/text-gate overlap were
both unsound — no overlap figure is claimed anywhere.

## TRAP (dated, not urgent): hostv2's vite.config.js has two deprecations

Surfaced by reading the CI log for the run that first executed the seam
(`c0ac1557`, green). Neither breaks anything today; both are scheduled breaks:

```
(!) Your Vite config uses features that are unsupported by
    `configLoader: 'native'`, which is planned to become the default in a
    future major version of Vite:
  - `__dirname` (vite.config.js:15:45). Use `import.meta.dirname` instead
warning: `esbuild` option was specified by "vite:react-babel" plugin. This
    option is deprecated, please use `oxc` instead.
```

**CORRECTED an hour later — the causal story above is wrong.** I wrote that
these warn about the app's build Vite. They do not, and the real finding is
about a change *I* made.

Measured: `hostv2` builds with **vite@4.5.14**, which has no `configLoader` and
no `oxc` — it cannot emit either warning. The warnings came from **vitest**,
which declares `vite: ^6 || ^7 || ^8` and therefore installed its own
**vite@8.2.2** nested under `node_modules/vitest/`. Vite 8 parses the same
`vite.config.js` and warns about it.

**So adding vitest put TWO Vite majors in hostv2, four apart:**

| | Version | Role |
|---|---|---|
| `node_modules/vite` | **4.5.14** | builds the shipping bundle |
| `node_modules/vitest/node_modules/vite` | **8.2.2** | transforms the seam's tests |

Neither ships — both are dev-only — and the seam's red-proof still held: a
syntax error in `HostShellV2.jsx` failed vitest. But **"vitest executes the
tree the app builds" is now only approximately true.** The two run different
transform pipelines (Vite 4's esbuild path vs Vite 8's), so the residual risk
is a **false green**: syntax or syntax-adjacent code that Vite 8 accepts and
Vite 4 rejects would pass the seam and fail the build.

**That risk is COVERED, checked rather than assumed.** `checks.yml` runs
`hostv2-build` as its own job on every push and PR — `npm run build`, which is
`check-parity && vite build` on **Vite 4.5.14** — and the `e2e` job builds
again before the matrix. So anything Vite 8 accepts and Vite 4 rejects turns
`hostv2-build` red in the same run. The seam is a fast tripwire *in front of*
the real bundler, not a substitute for it, which is the same relationship the
35 text gates have to the e2e specs.

`__dirname` is still worth fixing — **five** uses (I wrote six; miscounted),
and **line 25 is the `@app` alias**, so when `configLoader: 'native'` becomes
default the config fails to load and takes the alias with it, surfacing as
"hostv2 cannot find @app/*" and naming nothing about `__dirname`. It is a
*vitest-side* pressure today, not a build-side one.

**FIXED 2026-09-03 — and the framing below was wrong, kept for the lesson.**
The choice was never "pin Node 20.11 or skip it". `import.meta.dirname` is
shorthand; the longhand needs no version floor:

```js
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

Builds on **node 16 (7.99s) AND node 20 (4.73s)**, and the warning is **gone** —
red-proofed by putting `__dirname` back (warning returns) and reapplying the
fix (0 occurrences), measured against vitest's Vite 8, which is the thing that
emits it. No `engines` field needed, no runbook line, no bundler dependency.

I had accepted a false either/or and written it into two documents before
testing the third option. The rejected reasoning follows.

---

**Why `import.meta.dirname` specifically was rejected — measured both ways.**
works under Vite 4 today (the config is real ESM, since hostv2 is
`"type": "module"`), so it does *not* need the Vite 8 upgrade. But it lands a
**Node floor of 20.11**:

```
node v20.20.2  + import.meta.dirname  ->  ✓ built in 4.52s
node v16.16.0  + import.meta.dirname  ->  TypeError [ERR_INVALID_ARG_TYPE]:
                                          The "path" argument must be of type
                                          string. Received undefined
node v16.16.0  + __dirname (today)    ->  ✓ built in 7.92s
```

**This machine's default node is 16.** CI pins 20, so CI would stay green while
a local `npm run build` broke for anyone who did not switch node first — the
worst shape of regression. Ship it with an `engines` field and a line in the
runbook, or not at all.

**Open, and it is a real fork:** accept two Vites and document the caveat, or
pin vitest to a Vite-4-compatible line (vitest 0.34/1.x — old, its own cost),
or move hostv2 to Vite 8 (large). **Not decided. Not urgent** — nothing is
broken today and nothing about this reaches a user.

## FIXED — the diet picker was flagging no allergens for two of its own options

Found by the stage-8 tech-debt dispatch, verified by hand before acting.

The shipping picker offers **"Egg allergy"** and **"Soy allergy"**. The matcher's
keys are **"Egg"** and **"Soy"**. So:

    host ticks "Egg allergy" on Deviled eggs   ->  []        nothing flagged
    guest types it as free text                ->  ["egg"]   flagged

`rosterDiets` normalizes prose to the canonical keys; the picker never did — so
the app screened allergens better when a host typed a sentence than when they
used the control built for it. Two Big-9 allergens, silent, on a menu the host
believed had been screened.

The map's own comment records someone fixing this exact class for the invite
path — *"before, Egg/Soy/Sesame/Fish matched nothing"* — and never reconciling
the picker's labels.

**Fixed by ALIAS, not rename**, so every guest record already storing "Egg
allergy" starts flagging immediately with no migration. Gated by
`dietVocabularyResolves.test.js`, which ENUMERATES every vocabulary in the tree
rather than naming files — there were five definitions and naming files is how
the fifth survives. Red-proofed three ways.

**Still open from that pass, ranked:** hostv2 ships five undeclared dependencies
resolved from the CRA package.json that is scheduled for deletion; rank-reason
copy is derived in three places and one already diverges; 36 test suites assert
on source text rather than behaviour; `xlsx@0.18.5` carries two unfixable
advisories and leaves with the CRA.

## OWNER-ONLY: the repast copy needs real people before it reaches strangers

An insider-lens panel ruled the repast cultural copy on 2026-09-03 and the
copy is now materially better — but **its own verdict says a panel of lenses is
not community consent**, and that outranks its approval.

**Before this copy is shown to a stranger in grief**, put the exact string in
front of **at least three real people** — ideally an active kitchen/repast
committee member, a pastor or church administrator who handles homegoings, and
a family member who hosted one recently — across more than one denomination and
more than one region. The five questions, from the panel:

1. Does *"In many churches the meal is carried by the community rather than the
   family"* read as true, or as a stranger explaining your own church to you?
2. Is *"Ask the repast committee to carry it"* the phrase you would actually
   use, or does your church call it something else?
3. Read it as though there is no committee and no church — does the catering
   line feel equal, or feel like a demotion?
4. **Should an app say any of this at all**, or should it just show the meal
   task and stay quiet?
5. What did we get wrong that we do not know we got wrong?

**If (4) comes back "stay quiet" from people inside, that outranks the entire
panel.** Its dignity seat dissented on shipping at all before that review; I
shipped the improved string anyway because holding it leaves the *worse* copy
live — the version that stated a norm as fact and told a mourner how to feel.
That is my call and it is reversible: `git revert` the copy commit.

**Unresolved and larger, flagged by the tradition seat:** one generic repast
template serves every denomination, region and immigrant congregation. No
wording fix addresses that.

Also open: the seeded event is a fabricated deacon ("A Repast for Deacon Willie
Hayes"). The panel asked whether that name was reviewed by anyone inside. It
was not.

## The board withdrew its own finding — and what survived

I briefed the board that the solemn path renders no ask. **False**: the repast
fixture had drifted 39 days into the past, and a past event correctly has
nothing to settle. A future repast renders a real hero — one unsettled option at
T-3, and at T-10 *"What you're serving · 2 open… 5 of 6 are already handled."*

Re-convened on its own ruling, the same panel **vacated Decision 1: do not build
the quiet-ask card.** Its reduction seat put it best — *a board that adds a
component on one measurement has failed its own principle.*

What survived, and is genuinely open:

- **The register standard has a real subject now.** *State the thing, do not
  offer choices* — and the T-3 repast ask renders one unsettled **option**,
  which is a choice handed to a grieving host. Nobody has evaluated that card
  against the standard.
- **A past event does not say loudly enough that it is over.** The first-timer
  read "BEHIND YOU — Deacon's day, done" and still took a finished event for a
  broken product. Small, and the only thing the false brief actually surfaced.
- **The sequencing gate was replaced, not dropped:** the acquisition unit must
  be shot from an event that passes the horizon guard, green in the same run.
  A fixture can be stale in a way that is invisible in a screenshot.

**On the failure itself**, the board's own accounting: the error was not
recoverable from the brief — it contained no date, no horizon, no state label.
But *"checked twice to rule out missing data"* describes two probes, and two
probes are a hypothesis, not an exhaustion. It should have conditioned the
verdict on the event's horizon instead of ruling flat. Shared and asymmetric.

## One product observation — resolved, corrected 2026-09-03

**This section previously said the solemn Repast state was "STILL OPEN, and
genuine" — that claim went stale on 2026-09-02 and this file was not updated
until asked.** Commit `26d3bd71` (22:31, the same day) withdrew the finding:
the repast's seeded date was hardcoded to Jul 25 and had drifted 39 days into
the *past*, so the screen correctly read "BEHIND YOU — Deacon's day, done." A
past event has nothing to settle; that is not a product defect. Its
`noSettle` declaration is gone from the spec and its loop-advance probe now
runs like every other state. Re-verified fresh this session: all 6
loop-advance states pass on `desktop`, including Repast T-3, with no
`noSettle` on it.

Inverting `boardMatrix`'s loop-advance guard turned three silent skips into
three real failures, all three of which turned out to be FIXTURE artifacts,
not product defects:

- Day-of and T-2 surfaced "Venue … Save" — a field, not a decision — only
  because the seeded event has no venue. Fixed by giving the fixture a venue.
- Repast T-3, above — a hardcoded date that had drifted into the past.

**The lesson worth keeping:** the first fix declared all three `noSettle` with
reasons that read as considered. A declaration that sounds measured is not the
same as one that was, and it would have excluded the product's highest-stakes
screen from the probe built for it. Ask whether the fixture is representative
before concluding the product is wrong.

## Board conditions discharged the same session — 4 of 5 stage-7 closure items

| Condition | State |
|---|---|
| Prove telemetry ARRIVES, not just ships | **OPEN — yours.** Needs the PostHog and Sentry consoles |
| Admin console reads the wrong storage key | **DONE.** Reads both books, additively, deduped |
| `gate:cra` local/CI divergence | **DONE.** It was a stale `node_modules/.cache` |
| Census the 210 skips | **DONE.** **4** tests cannot fail; 9 rotted guards retargeted |
| 8th `verify:all` suite | **DONE.** Now **8 of 8** — the set passes together for the first time |

Stage-9 items: durable storage **DONE**, recovery UI **DONE**. Remaining are the
stranger test, the rollback rehearsal, and the economics — all yours.

**The census finding this row used to name — `boardMatrix`'s loop-advance
probe skipping 4 of 6 states — is DONE, corrected 2026-09-03.** The guard is
already inverted (a zero-step walk without a reasoned `noSettle` throws, named
above); re-run fresh this session, all 6 states pass with real settles, zero
skips.

**A correction to the census, and to what this file said an hour ago.** It
reported 7 tests that can never fail and I repeated it. Three of those are the
`_*Capture` specs, and they are *supposed* to be dormant: each declares "not a
gate" in its first line, uses the `_` prefix convention, and writes to a
gitignored directory. They are capture tools for board sittings. **The true
number is 4**, and it is the one that matters — those four are real tests
everyone believes are running.

## The board ruled stage 7, 2026-09-02 — and refused stage 9

Two panels, ten seats, under your standing delegation. Both reached
**passed-with-conditions** on stage 7 and both refused stage 9 entry, for the
same reason: three of the gates stage 9 re-runs retroactively have **never been
run** rather than run and failed — the stranger test, the rollback rehearsal,
and the economics. **No offer may be described as ready and no money taken.**

Dissent kept per seat rather than averaged. Panel A's **first-timer** would have
blocked stage 7 too ("observe cannot pass when nothing has ever been observed
being *used*"), overruled 4–1. Panel B's **verification** seat entered the
strongest dissent: three greens cannot currently be trusted — 210 of 1,071
browser tests are skipped by guards nobody has examined, `gate:cra` emits a
provably false warning, and Sentry is presence-assumed-delivery. Panel B's
**paying host**: *"I would ask for a refund, and I would be right to — the
browser may quietly delete my entire plan, and the backups the app took for me
cannot be restored by any button I can reach."*

**Their ONE THING, named by six of ten seats, is half done.** Durable storage is
now requested — asked once on the first successful write, fire-and-forget so it
can never delay or fail a save, the answer recorded so a surface can report it
honestly, a refusal kept rather than re-prompted forever. 13 tests, three faults
red-proofed. **One escaped and is recorded as a finding:** removing the call
from the write path left all twelve green, because "a refused write does not
ask" is vacuously true when nothing ever asks. The missing positive assertion —
that a *successful* write asks at all — is now there.

**Corrected 2026-09-03 — this line said "the other half is not done" for all
four; three of four are.** `restoreBackup`, `importCustomEvents`, `listBackups`
are called from `HostShellV2.jsx` (settings → Your data), re-confirmed by grep
just now (:15435, :15399, :15359). Only `readWriteLog` still has zero callers.

## Stage 7 recording, 2026-09-02 — two obligations that had NEVER been met

Both live in the spine's own numbered steps rather than in `requiredSkills`,
and `requiredSkills[7]` is empty — so the gap table was vacuous while two real
obligations sat unmet, and nothing surfaced them.

**`verify:all` did not exist.** Nine verification scripts, no way to run them as
a set, so the full set had never once run together. It exists now and it
COLLECTS rather than chains, because two scripts cannot be chained:
`gate:hostv2` exits 1 unconditionally (CI retired it 2026-08-01; the npm script
was never removed) and in an `&&` chain silently deletes every step after it.
First full run: **7 of 8 pass**. Backend pytest — 353 tests — is reachable from
a local command for the first time.

**`docs/ADMIN-CONSOLE.md` did not exist**, required since stage 3. A console
does ship (`?admin=1`) and its presence read as coverage. Audited by subagent,
re-verified by hand. Four findings, all now in that file:

- `AdminConsole.jsx:1323` reads `localStorage['ngw-events']` — the FROZEN CRA's
  key — while hostv2 writes `ngw-hostv2-custom-events`. The "This Browser"
  panels read **empty against the shipping app while labelled as showing it.**
- **No admin surface is reachable from the shipping app at all.**
- `restoreBackup`, `importCustomEvents`, `listBackups`, `readWriteLog` are
  implemented, guarded, unit-tested and have **zero callers**. Finished work
  that never reached a surface — invisible to every instrument, because
  coverage looks healthy and the suite is green.
- Durable storage is never requested. No `navigator.storage.persist()` on a
  localStorage-only profile.

## Stage 7 — what got wired 2026-08-29

**The shipping app reported no activation funnel, and nothing said so.** 55
events defined, hostv2 fired 7 — all lodging and decision-reason — while every
activation event (`event_created`, `host_home_viewed`, `invite_shared`,
`invite_viewed`, `invite_rsvp_submitted`, `signed_up`, `first_value` …) fired
ONLY from the frozen CRA. Transport worked, both keys ship, and the funnel was
empty. Same shape as `untrackedIsNotPassing`: a check that never ran scored as
a check that passed.

Wired in `HostShellV2.jsx` (host home, event created, invite shared × 2
outcomes) and `InviteV2.jsx` (invite viewed, rsvp submitted). Four of the five
are gated by `hostv2/e2e/activationFunnel.spec.mjs`, **49/49 across all seven
viewports**, each hook red-proofed individually.

`event_created` is wired but NOT gated — hostv2 has no create door reachable
from a seeded boot. Declared, not silently omitted.

Verified in the deployed bundle, at feature level rather than by hash: the
PostHog key sits in `eventIdentityEngine`, the FIFTH of seven lazy chunks, and
the Sentry DSN is in the entry. Checking only the entry and `HostShellV2` would
have produced a confident false zero.

**Presence is not delivery.** Keys shipping proves the client is configured; it
does not prove an event arrived. That needs the dashboards — yours.

## Path artifact

| Artifact | URL | Source |
|---|---|---|
| The First Recorded Gate | https://claude.ai/code/artifact/7f14f1d1-209a-4686-8615-61564542f6db | `docs/artifact/the-first-recorded-gate.html` |

Republish that same file path to keep the URL stable. Its `Recorded` date must
equal the newest gate record's date, or it is stale by definition.

## What shipped 2026-08-29

**The Helpers panel became actionable.** It was the canonical ownership view
and was read-only: a host saw "not confirmed" beside a name and had nowhere to
act on it. The chip is now the control (`HostShellV2.jsx`, Helpers panel), with
a 44px tap target and an aria-label naming both the person and the act.
`handled` is deliberately NOT offered — the work is already finished, and
confirming a promise about something done is a control with nothing behind it.
Three e2e tests in `hostv2/e2e/helperConfirm.spec.mjs` (confirm, unconfirm,
survive reload); red-proofed by making the handler inert and watching all three
fail. Closes item 4 of the previous session's queue.

**The project's first Path to Production gate.** It had deployed publicly and
continuously since 3 August with *no gate ever recorded at any stage*. Stage 6
(Deploy) is now on record as `not-yet`, recommendation `passed-with-conditions`,
awaiting your ruling — only the owner rules a gate. Stages 0-5 are recorded as
"no gate," not as passed: work exists behind several of them, but a stage marked
done because work happened rather than because a gate passed is exactly the
failure the artifact exists to prevent.

## What shipped overnight 2026-08-22

**The corpus had no post-event phase, and nobody had noticed.** Measured:
91 pre-event tasks, 15 day-of, ZERO after, across all ten types. Now 37
post-event tasks in all ten (143 rows, up from 106; content-library depth
137 -> 225 steps). Mechanism: NEGATIVE `offsetDays`, which the engine
already supported (`dueDate = eventDate + (-offsetDays)`) and nothing had
ever used. They land on a new **"After the Event"** workstream assigned by
RULE -- any negative offset -- not by category, so a future one cannot be
filed wrong by forgetting to mark it. `content-mappings.mjs` +
`extract-content.mjs`. No workbook change needed: the Workstream column has
no data validation, so the value is written, not picked.

**Design's counting fault is closed and red-proofed.** `Everyone` carried a
count while the default lens folded settled vendors away. Fixed to the
leaders' shape (Linear/Plane/ClickUp/Asana put counts on GROUPS, never on
an all-lens). The settled-vendor seed the eighth and ninth re-scores both
named and neither ran is now done -- `isInformal` is what short-circuits
accountability to on_track; a confirmed status alone is not sufficient. The
same fault was found one screen over in the guest roster, which counted the
raw array while its rows were search-filtered, and nothing covered it.
Gate: `hostv2/e2e/lensCountsMatchRows.spec.mjs`.

**TRAP THAT COST TIME TWICE.** A Playwright red-proof runs against the
BUILT bundle. Editing source and re-running the spec proves nothing -- both
of my first two red-proofs passed against a stale build and looked like the
gate was broken. `npm run build` between the edit and the run, every time.

**Also:** `template-products/` is now under git (it was untracked -- the
whole product line, no undo). Four Notion niches built and verified by diff
against the generated CSVs. Four Etsy mockup squares. Four FALSE listing
claims fixed and the numbers now derived at build time from canonical.

## What shipped the previous session

1. **Path to Production audit** — all 10 stages, `docs/audits/2026-08-21_PATH_TO_PRODUCTION_AUDIT.md`.
   Stages 1–4/6/8 pass, 5 + 7 worked below, 9 pending (D-2 preconditions).
2. **Stage 5 hardened** — `backend/tests/test_protected_routes_sweep.py` is a
   standing per-route gate over 8 sensitive routers (source gate + reasoned
   PUBLIC allowlist + bare-401 sweep). It caught `verify-session`
   unauthenticated on its first run. DocuSign token moved out of the URL;
   all comm reads/writes gated. Checklist: `2026-08-21_SECURITY_TRACK_CHECKLIST.md`.
3. **Admin console** — 3-seat board, stage 2 + 4 passed after fixes
   (`2026-08-21_ADMIN_CONSOLE_INTERNAL_REVIEW.md`). Corpus actions now reach
   `admin_audit_log`; retirement ruled standalone-capable (zero App.js imports).
4. **Build queue** — "Your days" span-gated door; the **send ledger**
   (board 6-0, `2026-08-21_COMMS_OUTLET_RULING.md`): handed_off is
   host-attested, never "Sent"; vendor drafts log contact in the same
   gesture; email slice (b) records the SERVER's answer only.
5. **Vendors sheet** — 8-seat ruling (`2026-08-21_VENDORS_SHEET_RULING.md`):
   collapsed face is one band, one ranked chip, amber demoted from default.
6. **Desktop/widescreen parity** — one frame + one measure across all 13 rail
   sections; heroes added to the 3 that lacked them. The top "Jump to a
   section" menu was a duplicate of the rail and no longer renders when the
   rail is up; its three non-section doors moved into a rail group.
7. **Collapsible rail + splash corner** (`a259ecd7`) — the rail drops to a
   64px icons-only band, persisted per browser, every door still named and
   still clearing the 44px tap floor. The splash was painting the phone's
   48px bezel inside the 20px desktop frame; it takes the frame's corner now.
   Two new gates, both red-proofed: `railCollapse.spec.mjs`,
   `frameCorners.spec.mjs`.

8. **Motion shortlist worked** (`76cc7a76`) — sheets now rise from the point
   that opened them (the audit's one real gap: continuity); a live
   reduced-motion defect closed (`.rowfocus` ring was stuck on permanently);
   `.bar i` moved to `scaleX`; the 300-900ms band named at the token source;
   `cardin`'s list stagger gated to arrival instead of every redraw. Gate:
   `motionContinuity.spec.mjs`, all four red-proofed.
9. **The rail stopped drifting** (`ae2c99da`) — host reported the desktop menu
   "jumping, dizzying". `.stagewrap` had `overflow:hidden`, which still permits
   programmatic scrolling, so every row landing scrolled the frame and the rail
   walked off the top with no scrollbar to bring it back. `overflow:clip`.
10. **The checklist follows the decisions** (`46909fa8`) — the audit's #1 item,
    shipped. `src/lib/checklistReconcile.js` merges `playbookChecklist(event)`
    into `event.timeline` instead of freezing it at creation: derived rows
    append, stored rows keep `done`/`owner`/host edits, gated-out `pbt-` rows
    are marked `retired` (never deleted) and revive in place carrying `done`,
    host-written rows are never touched, and an empty derivation is treated as
    no-information so the 9 typeless types cannot wipe a list. Wired as a
    `useEffect` on the event and the gate inputs (`HostShellV2.jsx:5125-5152`);
    retired rows leave the "N of M" DENOMINATOR as well as the numerator
    (`:15387`). Gates: `checklistReconcile.test.js` (9, against the real
    generator) and `checklistFollowsDecisions.spec.mjs` (3, red-proofed by
    unwiring the call). **The catch-up pass is silent** — the first reconcile
    per event per session patches with no toast; announcing it put a banner
    over the controls 12 specs were reaching for.
11. **Sheet-origin motion, finished** — `@keyframes panelrise` is origin-aware
    too (`styles.css:3367`); wiring only `sheetrise` had left the centered-panel
    breakpoint on the old constant. And the shell now measures the sheet with
    its animation temporarily off (`HostShellV2.jsx:3560-3576`): measuring
    through the entrance transform put every origin exactly 24px short.

## The evening block (compressed — details in the audits + git log)

- **Ownership shipped at the board's scope** (`e006f52d`): row-level assign
  writing roster-resolved names to `timeline[].owner`; `<Name> — not told
  yet` copy (Norman's condition); the `helperConfirmed` writer hostv2 never
  had; retired rows carry no responsibility and reconcile names the person
  whose job left the list.
- **FLIP on "Then, in order"** (`547919e2`) — first wired to `.qidx`, which
  returns null in the shipping mode: ten green unit tests over a surface no
  host sees. Rewired to `.ef-list`, driven. Animation 8→9.
- **Vendors ruling clauses 2–4 closed**; day-of copy truth at T-0; multi-day
  span seeded (`TEST_MULTI_DAY` — in BOTH `ROSTER` and `ALL_SAMPLES`, the
  second registration being the fix's own near-miss); "280 days past its
  window" capped at the 60-day countability line.
- **Template line program**: `products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`
  (5 workstreams, seasonality-sequenced launch calendar) on the evidence of
  `docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md` (US-scoped,
  amended after the owner caught the missing Oct–Dec hosting arc).
- **Template line executed to the W2 gate** (evening): seasonal research
  (US-scoped, Halloween amendment) -> program spec
  (`products/2026-08-21_TEMPLATE_LINE_PROGRAM_SPEC.md`) -> W3 done (10
  types, FIVE niche workbooks, QA 75->132, whenChoice gates live in the
  sheet) -> engine delta audit done (7 stale claims, 5 ranked ports) ->
  Reunion enriched (`4d10920a`: decisions 5->9, tasks 24->44, all gated,
  byte-identical local-host invariance) -> template QA re-run 132/132.
  Two artifacts published (When Hosts Buy; The Template Line). Next in
  line: W3.5 engine round per the delta audit; PTA/booster playbook;
  `home_hosted` budget-share family (a home Thanksgiving currently shows
  Venue/Catering bands). W2 + brand/pricing/funnel/disclosure = Todd.
- **Three playbooks authored + grounded** (`4da9dfde`, `3c39884e`):
  Thanksgiving Hosting (24 tasks), Halloween Party (22), New Year's Eve (14,
  midnight-anchored ROS as its stated distinctness). Corpus now 44. Eleven
  new source ids (AFBF, FSIS thaw/temps, CDC/NHTSA Halloween pedestrian,
  NRF, champagne-pour standard…); gap counts dropped 7→6 / 8→7 / 6→4; the
  corroboration ratchet reverted four single-source upgrades — the reason
  is in their notes, the gate was not touched.

## Scores

`docs/audits/2026-08-21_NINE_DIMENSION_LEADER_RESCORE.md` — **77/90 (86%)**
vs 63.8% on 07-13, via 67→70→72→73→75→76→77. Decision engine 42/50
(unmoved; its next lever is the ownership ruling now BUILT — re-score it).

## The rulings that now govern this work

Three boards sat on 2026-08-21. Read the ruling before touching its area —
each one rejected something, and the rejections are the load-bearing part.

- **`2026-08-21_TASK_OWNERSHIP_RULING.md`** (6-2 ship, narrow). BUILT. Assign
  writes a roster name to `timeline[].owner`, notifies NOBODY, and says so:
  `<Name> — not told yet`. Rejected outright: importing `playbookMilestones`
  (the join is 123/408 and the owners are role words) — dead, not deferred.
- **`2026-08-21_GUEST_TRANSPORT_RULING.md`** (6-2 DEFER guest sending).
  Dissent from BOTH directions: one seat wanted a capped guest batch, another
  wanted the vendor path deleted entirely. Its measurements are the reason
  this session changed course — see below.
- **`2026-08-21_VENDORS_SHEET_RULING.md`** — all six clauses now shipped.

## The pattern that cost the most today

Not a bug — a class. Seven times something was **built, correct, and
unreachable**, and each was found by looking rather than by any gate:

- `playbookDayOfChecklist`, `playbookMilestones`, `playbookTasks` — finished
  engines with zero hostv2 imports.
- FLIP mounted on `.qidx`, which returns null in elegant mode (the shipping
  mode). Ten green unit tests over a surface no host sees.
- The span-gated "Your days" door, with no seeded event carrying a span.
- The seed that fixed it, registered in `ROSTER` but not `ALL_SAMPLES`.
- **The vendor send button, which renders on zero events** — one of 24
  `openDraft` sites passed a `vendorId` and `emailTarget` requires one. The
  transport this repo describes as working had never fired.

Its mirror: five times a **probe was wrong, not the product** — a source slice
scoped to one card, `settled()` between a click and a toast, an assertion on
`.app` for a toast that renders outside it, zero-WIDTH asserted on a
`max-height:0` panel, a `> 4` row count taken from a desktop run.

And once a test **ran, passed, and proved nothing**: the lens gate asserted
`chip === rows` on a chip reading 0, so `0 === 0` was the whole evidence while
the control was visibly broken. That one shipped the same arithmetic fault
three times.

**The question none of these were asking: is this check actually looking at
the thing it claims to check?** Red-proofing and independent verification
caught every one. Three claims of mine were falsified by a verify pass this
session — the vendor money that had no tabular-nums, and both lens faults.

## Stage 8's first gate, and a historical tracking gap closed alongside it — 2026-09-03

Running the path-to-production spine fresh (Step 1, not from memory) surfaced
`historical: 1` in the tracker's own flags — a stage below the current one with
no gate ever POSTed. That was **stage 5 (Security)**: a full audit ran
2026-08-21 (`docs/audits/2026-08-21_SECURITY_TRACK_CHECKLIST.md`), a per-route
sweep exists as a standing gate, and both were cited inside the stage-6 gate's
own `skillsUsed` — but the stage-5 gate itself had never been recorded via the
API, so the tracker read it as unanswered rather than done. Recorded now with
the identical six OPENs already carried by the stage-6 flag. No new security
work; the gap was in the tracker, not the project.

**Stage 8 (Maintain) recorded for the first time.** Zero gates had ever been
posted at this stage despite the project sitting there through this entire
session. Debt ranked by what it blocks (the six stage-5 opens and the repast
community-review gate block stage 9; Vite 8 adoption and the source-text
census block nothing, tracked); the runbook's location and what was wrong with
it; which earlier claims were re-checked fresh this session (CI, unpushed
count, both test runners, the CI seam) versus left standing on the owner's own
authority (the security opens, PostHog/Sentry arrival, repast review).

Per Step 2g (added to `ngw-os/commands/path-to-production.md` this session,
before this recording ran): stage 8 having no required skill is a deliberate,
dated ruling, not an oversight — and this session's shape (verify claims by
breaking them, red-proof every gate same-session, read the runner's log rather
than the workflow file, trace warnings to blast radius, gate pushes in the
condition, correct stale findings in place) is recorded there as evidence for
a future adoption decision, which is the board's to make, not this session's.

Artifact republished, `Recorded` date current, stage 5 and 8 cards now show
real state instead of "No gate" / "Locked". Both gate POSTs re-verified via
Step 5k (re-read the API, confirm the right flag actually changed) rather than
assumed.

## Next, in order

1. **The transport board's queue**, non-transport and none of it needs the
   webhook: per-recipient handoff recording on the guest rails; the roster
   told/not-told read (`Told 24 of 41 — 17 still to tell`).
2. **Day CRUD across a span** — Workflow's named gap, and newly TESTABLE
   because `TEST_MULTI_DAY` now exists. Was unbuildable before: no seeded
   event had a span.
3. Author the 16 `synthesized` purchases in clientDinner/fundraiserGala with
   real citations. Today ADDED to the grounding backlog rather than reducing
   it — honestly, but it is now owed.
4. ~~`helperConfirmed` has a writer but no surface shows the confirmed state~~
   — **DONE 2026-08-29**, see above.
5. ~~Rule the stage 6 gate~~ — **RULED 2026-08-29: passed with conditions.**
   Deploy is closed; stage 7 (Handoff) is now the open stage.
6. **Work the nine standing conditions.** They gate stage 9 and are in force
   NOW, not later, because the surface is already public. Six are security
   (external pentest; finding #8 portal authz, a board question; and four
   attestations only you can make — RLS applied-status, backups plus one real
   restore, login rate limiting, Sentry DSN reporting in prod). Three are
   marketing: the acquisition thesis is unwritten, the stranger test has not
   run, and economics are unproven — **so no paid spend is authorized.**
7. Stage 7's own items: instrumentation and tracker sync, and per-asset
   attribution. Both are re-run retroactively at stage 9, so doing them once,
   properly, now is the cheap path.

## What only you can do

These are not blocked on engineering and will not move without you:

- **Run the stranger-proof onboarding test.** Ease of use is asserted at 8,
  not observed. Nobody outside this project has used it.
- **Prove the Resend webhook live.** Until then `delivered` cannot honestly
  exist, and DIFM/Attention both sit against that.
- **Send one real vendor email end to end.** Now possible for the first time:
  put an address on a vendor, sign in, and the send path is reachable. That
  run is the precondition for everything above it.
- **Grounding** is authoring, not engineering — capped at 9 by the
  cultural-basis ruling.

## The artifact is gated now

`hostv2/e2e/pathArtifact.spec.mjs` — three tests over the "Hide completed"
toggle the path-artifact skill requires. The one that matters asserts every
NOT RUN item is still visible with the toggle on: the naive selector catches
`.mark`, which would bury exactly the findings the page exists to surface.
Red-proofed by widening the selector to `.mark` and watching it go red
(4 not-run items visible expected, 0 received), then restoring from a copy
rather than `git checkout --`.

## The conditions, verbatim

The server turned the ruling into a standing `conditional` flag that persists
past stage 6 — that is what a conditional pass is for. Read them off the
artifact or `~/Code/skill-index/cache/ptp-gates.json` (record 32); do not
re-derive them from memory.

A conditional pass is not a finished security track, and it is not permission
to spend money.

## Traps that cost time here

- **Node 20 here is the INTEL Homebrew prefix** (`/usr/local/opt/node@20`), so
  on Apple Silicon it runs under Rosetta as x86_64 and **every child process
  inherits that**. `python3` then cannot dlopen `pydantic_core`'s arm64 binary,
  so the backend suite fails to COLLECT under a spawn while the identical
  command in an interactive shell passes all 353. Same interpreter, same cwd,
  opposite result — and nothing prints the parent's architecture unless you ask.
  `verify:all` guards it with `arch -arm64`.
- **RESOLVED: `gate:cra` red locally / green in CI was a STALE `node_modules/.cache`.**
  The babel-loader ESLint cache held a result from before `COST_PROVENANCE_TYPE`
  acquired its use, so the gate reported the symbol unused while it is used at
  `governedFieldTypes.js:342`. CI runs `npm ci` into a clean tree and never saw
  it. `rm -rf node_modules/.cache` makes the gate print CI's exact line —
  "241 of 245 baselined" — and `verify:all` went 7 of 8 to **8 of 8**.
  **When a gate disagrees with CI on the same commit, clear the build cache
  before believing either.** A cached lint result is a measurement's corpse.
  Related: a subagent that ran the command inferred main was red. The command
  was reported honestly; the inference past it was not checked. Verify a board's
  findings before acting on them.
- **The e2e preview server serves the EXISTING `dist` and never builds.** A
  source edit changes nothing until `npm run build`, so my first red-proof
  disabled four hooks in source and watched all 7 tests pass — a completely
  vacuous green. Rebuild between red-proof steps. (CI is fine: `checks.yml`
  chains build before `test:e2e`.)
- **A `test.skip()` on the condition under test turns a broken gate green.**
  Disabling the instrumentation made the invite spec SKIP rather than fail —
  7 tests became 6 and the summary still said passed. Guard on a precondition
  (the surface rendering), never on the thing being asserted.
- **Track calls are awaited before they fire.** `shareInviteLink` and the RSVP
  submit both await the clipboard / the API before tracking, so reading the
  event log after `settled()` is a race — it failed on a different viewport
  each run, which reads like a layout bug and is timing. Use `expect.poll`.
- **Artifact stage items come from the spine, never from a summary.** Writing
  them out of conversation memory produced three different defects on one page:
  an invented task (stage 3 has no gate by design, and the page demanded one),
  four omitted gates (including stage 2's reference-scan ordering rule, the very
  failure the command exists to prevent), and one softened gate (stage 1's real
  gate is *name who hits this problem today*). Read
  `~/Code/ngw-os/docs/path-to-production.md` and count obligations against
  items. Now written into the path-artifact skill (`c78aff4`).
- **A geometry check is not a look.** The artifact passed 11-stages /
  zero-horizontal-scroll / no-JS-errors at six viewport-theme combinations
  while two stages rendered their numbers one word per line. Cause: switching
  the item rows to CSS grid promoted every inline `<span class="num">` to its
  own grid cell on its own row. Flex had the opposite failure (an anonymous
  text box floors at min-content and pushes the row past the viewport). A
  hanging indent has neither. **Screenshot after the measurement passes**, and
  count rendered lines per row as part of the check.

- **A deployed bundle's hash proves nothing against a LOCAL build.** Nearly
  reported a stale Pages deploy today: the live `HostShellV2-*.js` hash did not
  match the local build while the CSS hash matched exactly, which looks precisely
  like the recorded staleness trap firing. It was not — CI injects `REACT_APP_*`
  repo variables the local build lacks, so content and therefore hash differ
  legitimately. Probe the deployed bundle for a **feature marker** shipped in a
  known commit instead.
- **`minmax(0,1fr)` and anonymous flex items.** Three wrong diagnoses in a row
  chasing 17px of horizontal scroll on the artifact page. A `1fr` grid track and
  a flex item both floor at min-content; worse, an item made of a bare text node
  is an *anonymous* box with no element to set `min-width:0` on. Measure which
  leaf overflows, then hide top-level children one at a time to find the owner —
  do not reason about the cascade.
- The **browser pane** stops accepting clicks after a few interactions and
  never clicks at desktop widths. Drive with Playwright instead.
- **Four false-zero probes** in one session (grep missed a chunk; a class-name
  counter missed a quote style; `hit.contains(el)` counted ancestors; a raw
  token compared against computed `rgb()`). Red-proof every gate.
- **A door that moves with the viewport belongs in one helper.** Hiding the
  duplicate "Jump to a section" row at rail widths turned ten e2e specs red at
  `desktop` and `wide` while the app itself was fine; I fixed exactly one
  (`a11yFloor`) because it was the one my local desktop run happened to
  execute, and left nine carrying the old inline phone path. The door is now
  `openSectionByName(page, name)` in `hostv2/e2e/fixtures.mjs` — it uses the
  rail when present and the two-tap menu otherwise. Running one project
  locally is not running the suite.
- **A new toast is a new obstacle.** The reconcile's announcement broke 12
  specs on click timeouts by sitting over the controls they were reaching for.
  The specs were right: it was a banner nobody had asked for.
- **`addInitScript` re-runs on EVERY navigation.** An unconditional
  localStorage seed rewrites the pristine state over the host's own on
  `reload()` — indistinguishable from app data loss, and I filed it as such
  before the harness was ruled out. Guard the seed; assert SURVIVAL across a
  boot, never the write (the write lands even when the value is about to be
  destroyed). `docs/audits/2026-08-21_CUSTOM_EVENT_PERSISTENCE_DEFECT.md`.
- `git checkout --` after a red-proof reverts the guarded edit too. Fault
  and restore with a targeted string swap instead.
- **Reading the CSS is not measuring it.** A reviewer derived "the frame
  narrows when the rail collapses" from the width formula; measurement at
  1440 showed the opposite, because the formula clamps on the viewport
  there and only binds at 1920. Both are correct at their own width. Any
  claim about a `min()`/`clamp()` layout has to name the width it holds at.
- The unit suite is `CI=1 npx react-scripts test --watchAll=false` from
  `demo/`. Bare `npx jest` scans node_modules and reports ~1369 bogus
  suite failures — a false red that looks exactly like a real one.
- Node 20 lives at `/usr/local/opt/node@20/bin`. Playwright leaves its
  preview server bound; `lsof -ti:5244 | xargs kill -9` before a re-run.
