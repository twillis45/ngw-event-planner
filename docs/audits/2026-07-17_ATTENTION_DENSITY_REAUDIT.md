# Attention & Density Re-Audit — the novice host

_2026-07-17 · Triggered by the host: "the app has become too dense… make sure we're not confusing a first/new/novice
host… the attention system should only show what's important — intuitive, calm, the boss / assistant / guide /
hand-holder." Method: the live hostv2 shell driven as a brand-new host (fresh localStorage, a simple "birthday for
30 on Sep 20"), plus a code audit of the attention engine. Findings are DRIVEN or cited at file:line._

---

## The verdict, in one line

**The attention ENGINE is full. The attention PRESENTATION is not calm.** The mechanism that decides *what* matters
is complete and genuinely good — one ranked list, density-capped, deferrable, nothing hidden, a real first-timer
start. But the *screen* re-expresses that one list across **three or four separate surfaces with two or three
different counters**, and scolds empty fields in red — so a novice sees several voices, not one hand-holder. **The
fix is subtraction at the presentation layer, not more engine.**

---

## What is genuinely working — do NOT "fix" this (code-confirmed)

The engine already does the hard part. Verified in `hostv2/src/HostShellV2.jsx` + `src/CommandCenter.jsx`:

1. **One always-present next action.** The pinned `.next-bar` renders `queue[0]` of a single ranked list
   (`nextActions`), degrading to "All quiet" when calm and "Run the day" on the day (`HostShellV2.jsx:10869`).
2. **Complete coverage — no dead ends.** Three producers fold into that one list (foundation dominoes +
   `phaseProgress` ledger + the **surface registry** of 13 declared raisers — risks, vendor conflicts, arrivals,
   reconfirm, day-of, seating, lodging, travel, helpers, decisions, payments, COI). The registry exists precisely
   so "a surface cannot be silent by accident" (`CommandCenter.jsx:1906`). Deduped by domain.
3. **Density cap is live.** When behavioral `overwhelm` is read, the board slices the queue to a runway-sized
   `focusCount` (rush 5 → relaxed 2), never below criticals/past-due (`HostShellV2.jsx:5022`). It actually reduces
   rendered rows — not computed-and-ignored.
4. **No silent hiding.** Trimmed rows stay one tap away ("+ N more — show the rest", `:5229`); the snooze pile is
   shown with a comeback date and undo ("a snooze the host cannot see and undo is a trapdoor", `:4963`).
5. **First-timer start.** A truly empty event returns a single "Start here — add who's coming" (`CommandCenter.jsx:2776`),
   and overdue-on-creation is guarded so a fresh event is never scolded as "late."
6. **The old "one-wire-short" attention bug is fixed and guarded** — phase items now emit the `route`/`cta` contract
   the shell actually reads (`CommandCenter.jsx:1883`), covered by tests.

This is a real strength. The engine passing all six axes is why the problem below is *presentation*, not *plumbing*.

---

## What a novice actually sees — the findings (DRIVEN live)

Driving a brand-new "My Birthday, 30 guests, Sep 20, nothing else filled," the command board stacks these on one
screen (top → bottom): countdown "65 days" · "On track" · a "Where you stand" card · Guests tile · Budget tile · a
filter row · a red "Blocked · Venue" card · a "What needs you" list · a pinned "NEXT" bar.

| # | Severity | Finding (live) |
|---|---|---|
| **1** | **P0** | **The one ranked list is re-expressed as several competing voices.** "Set your budget" appears as the **NEXT bar**, the **#1 "What needs you"** card, *and* the milestone line — while a separate red **"Blocked · Venue"** card competes for the top slot. A novice asking "what's my one thing?" gets no single answer: budget (×3) or the red venue? The engine has ONE answer; the screen shows several. |
| **2** | **P0** | **The counters don't reconcile.** "Where you stand: **1 of 4** parts handled" implies **3 left**, but the NEXT list is **"Set your budget +3" = 4** — because Budget is the #1 next action yet is **not one of the 4 "parts"** (Date, Venue, Guests, Food). Two systems counting different sets; off-by-one for the novice. (The July-14 fix unified NEXT with "What needs you" — those *do* agree — but the *parts tracker* was never reconciled with the *action list*.) |
| **3** | **P1** | **Three different numbers on one card.** "Where you stand" shows **"1 of 4"** (handled) *and* **"setup 2 of 4"** with no explanation of how "handled" differs from "setup." A hand-holder shouldn't make you reconcile two fractions. |
| **4** | **P1** | **Red "Blocked" language on an empty new event.** Venue reads **"Blocked"** (red) 65 days out simply because it hasn't been typed yet. That's a scold on a brand-new plan, not a calm guide. "Blocked" should mean *something is stuck*, not *you haven't started*. |
| **5** | **P1** | **The un-actionable thing dominates; the actionable thing is smallest.** The **countdown ("65 days")** is the largest element and can't be acted on; the actual instruction (NEXT) is a thin bar pinned at the bottom. Visual weight is inverted relative to what the host should *do*. |
| **6** | **P2** | **Filter-heavy, content-light.** A filter row (Everything / Budget / Food / Plan) sits above a near-empty new plan — UX_04 anti-pattern #4. Filters earn their space once there's volume to filter. |

**Not a finding — credit where due:** each "What needs you" card explains *why* it's first and offers a **"not now"**
defer. The components are right. The problem is how many attention surfaces share the screen, and that they count
differently.

---

## The real structural gap (scoped, and it's planner-tier, not novice-tier)

- **Cross-event / portfolio attention is absent from hostv2.** `getEventAttention` / `getCrossEventAttention` (the
  L2 "which of my events needs me" rollup) have **zero consumers in `hostv2/src`** — they live only in the frozen
  `App.js`. For a single DIY host this doesn't matter; it matters if hostv2 ever holds multiple events. Note, not
  novice-blocker.
- **`raiseCounts` dock badges never shipped** (by design). From "The Day," an at-risk pillar has no nav badge. Minor.

---

## Recommendation — collapse to one calm voice

The engine already ranks correctly; the work is to let **one** surface speak it. In priority order:

1. **(P0) Pick one hero instruction.** On the board, the ranked list's `queue[0]` should be the single visually
   dominant "do this next" — larger than the countdown. Everything else (the list, the tracker) is secondary. The
   NEXT bar and the "What needs you" #1 card are the *same* item rendered twice; keep the in-context card as the
   hero and let the pinned bar be a quiet echo, not a third voice.
2. **(P0) Reconcile the counters — or show only one.** Either fold Budget into the "parts" model so "handled" and
   "next" count the same set, or drop the parts fraction from the board and let the ranked list be the only
   progress signal. A novice should never have to reconcile "3 left" with "4 to do."
3. **(P1) Retire the second fraction.** "1 of 4 · setup 2 of 4" → one number with one meaning.
4. **(P1) Soften empty-field states.** "Blocked" (red) for an un-entered field on a new event → a calm "Not set yet"
   with the normal attention treatment. Reserve red/"Blocked" for something genuinely stuck.
5. **(P1) Re-weight the hierarchy.** The instruction should out-weight the countdown; the countdown is context, not
   the headline.
6. **(P2) Hide filters until there's volume.** No filter row on a new/near-empty plan.

**None of this is a redesign** (that was the call-sheet, killed). It's turning four attention voices into one and
reconciling two counters — a copy/hierarchy pass on a working engine.

**Status 2026-07-17 — cuts 1–4 IMPLEMENTED & live-verified in `HostShellV2.jsx`** (dev preview, no console errors):
- **Cut 1** (drop the second "· setup X of Y" fraction) — `HostShellV2.jsx:~4288, ~4301`. Board now shows one number.
- **Cut 2** (red "Blocked" → muted "Not set yet" on un-entered fields) — `~4799`.
- **Cut 3** (drop the milestone sentence; ordered queue cards are the single "what's next" voice) — `~4938`.
- **Cut 4** (hide the domain filter row until `queue.length >= 5`) — `~4686`.

Middle of the board is now one vertical flow: tiles → "Not set yet" venue → "What needs you" → ordered cards. Three
counters → one; four "what's next" voices → the queue (+ NEXT-bar echo).

**#5 → SUPERSEDED by the full REBALANCE (implemented + live-verified 2026-07-17, both events, no console errors):**
instruction-first Command shipped in `HostShellV2.jsx` + `styles.css`. The display slot speaks the ASK in a
controlled hand-holder vocabulary (`heroAskFor`, `HERO_NOUN` — "Confirm your caterer.", never a proper noun at
display size); the countdown folds into the TRUTH line; the wave-6 status sentence is computed once — calm folds
into the truth ("· on track"), non-calm keeps its full amber sentence. queue[0] renders as the ONE hero panel
(dedup: ask owns the verb, panel names the record only when it adds info — birthday's panel has no title, Wanda's
says "Semper Catering Co"), with the horizon whisper as its footer ("then — the menu · vendors · 1 more").
Positions 2+ are THEN-ROWS (whispers, truncated, tap-to-route); criticals and bundles keep card form; "+N — show
the rest" expands to full cards where snooze lives. The queue stratum moved above the tracker (340-line splice —
strata: ask → path → status → plan). NEXT bar is now a scroll ECHO (IntersectionObserver on the hero zone — one
bottom overlay at a time; dock already auto-hides). Type ramp corrected: ask 40 / headings 19 (ev-title down from
21) / body 16 (verdict weight 650, outranks truth) / whispers 13–14.5. Calm/day-of/past keep the countdown display
(the date IS the story). Not committed (no git), not deployed (needs rebuild+rsync).

**Original #5 note (kept for history):** not half-implemented on purpose. The live preview
proved a countdown shrink alone leaves nothing as the hero and the instruction still isn't dominant; making the
instruction the hero is a real `layout` restructure (promote the next-action to the top), not a CSS change. Held as
a separate layout task.

_Not committed (repo is not under git) and not deployed — changes are in `hostv2/src` for the Vite dev preview; a
production deploy needs the rebuild + rsync step (see `feedback-deploy-rebuild-hostv2`)._

---

## Still to press — the doctrine backlog

_The command board is one surface. The doctrine (calm · novice-intuitive · only-what-matters · never-lie) has
pressure points we have NOT yet tested. Ranked by leverage on the calm/novice goal. Each names what pressing it
would find and the doctrine it enforces._

| # | Press | Why it's here / what it finds | Doctrine |
|---|---|---|---|
| **1** | **Unify the severity scale** | The single biggest calm lever left, and already diagnosed (July-14 open #7): **seven** status vocabularies, **amber carries ~13 meanings**, vendors have no red tier, workstreams no blocked tier. Inconsistent color *is* noise to a novice ("is amber bad, or just day-of?"). One scale, applied everywhere. | UX_02 (color semantics) · UX_04 (one severity) |
| **2** | **Press "The Day" and "After" stages as a novice** | We only audited the **Plan** stage. Two surfaces unaudited — plus a known gap (July-14 open #12): from "The Day," an at-risk pillar is **invisible** (no nav/dock badges), so a host running the day can't see trouble brewing. Same test: one calm voice, only what matters, can you see the one thing. | UX_04 · UX_09 (5-second test) |
| **3** | **CTA truthfulness + source-of-truth sweep** | We caught one honest gate ("Please sign in to use AI features") and the crab-order honest ceiling, but no full sweep. Does **every** primary button do what it says (send vs record vs deep-link)? Does **every** number trace to a real source? The historical food-cost drift bug lived here — confirm it's the only one. | UX_07 (CTA truthfulness) · UX_08 (source of truth) |
| **4** | **Planner-language sweep** | Copy pass across the sheets: no "Pending," every status carries a **consequence** not just a state, no industry jargon, no emojis in UI. | UX_06 · [no-emojis rule] · [no-jargon rule] |
| **5** | **Per-sheet density** | The top board is one surface; each sub-sheet (Guests, Food, Vendors, Budget) is its own surface with its own "one voice / calm / only what matters" test. Not yet pressed. | UX_04 · UX_03 |
| **6** | **Component-vocabulary consistency** | Same button shape, same form controls, same affordances across every surface — the product register's "the tool disappears into the task." If the "save" button looks different in two places, one is wrong. | product register |

### NEXT PIECE — the panel anatomy redesign (host: "more intuitive copy layout")

_The hero panel's copy layout is inconsistent: some panels are dense multi-clause paragraphs with the verb
repeated in title+button; others are blunt ("What you're serving · 4 open" + "Go"). Proposed ONE anatomy, every
panel, in reading order:_
1. **THE FACT** — what IS, as a scannable line, numbers as chips ("Caterer set for 8 · 5 said yes")
2. **THE STAKE** — one clause, why it matters now ("seating and meals are working from the wrong number")
3. **THE ACT** — primary button as the specific fix ("Match the 5 yeses"), defers quiet-right
4. **THE RECEIPT** — muted sentence + green done-dot after acting (wired 2026-07-17; verify on a completion)
_Fact→stake→act→receipt = how a human assistant briefs. Kills the verb-echo and the paragraph walls. Engine
fields map: fact=derived state · stake=first clause of consequence · act=cta. Status: SPEC'D, not built._

### T-2D BUSYNESS (host evidence 2026-07-17, full-board paste: "too much")
The near-event board gets BUSIER as the day approaches — the opposite of the hand-holder's job. At T-2d, one
screen carried: ask (vague fallback) + verdict + critical card + 5 THEN-rows + "+1 more" + lens row + 7-chip
tracker + 2 tiles + the day-before block (5 rows) + venue blocker + 6 index rows. Root causes: ① the day-before
block DUPLICATES the queue (food / rain / shopping listed twice — two voices for the same work at max anxiety);
② the lens gate (queue ≥5) fires exactly when the board is fullest; ③ the ask's vague floor ("Your next step.")
on unmatched titles — "Settle your decisions." rule added 2026-07-17 (dev, undeployed).
**THE RULE TO BUILD — runway-adaptive quiet:** at ≤2 days the day-before plan BECOMES the path (THEN-rows fold
into it, one list, engine-deduped by domain), lenses hide, tracker collapses to its single line. The closer the
day, the fewer the words. Pairs with the panel-anatomy pass; both open the next session.

### The copy-quieting track (added 2026-07-17, host-approved direction)

_Minimize the impact of every word that is not the hero — demote, defer, or say-once; never hide._

| # | Move | What it is |
|---|---|---|
| C1 | **Copy budget per stratum** | Hard render limits: ask ≤4 words · truth 1 line · panel why ≤12 words (first clause) · rows ≤6 words; longer copy lives in the routed sheet. The queue cap, for words. **Ship first** (mechanical). |
| C2 | **Progressive ink** | Opacity/weight ramp by stratum (hero 100% · panel ~80% · whispers ~60%) — copy recedes by material, not deletion. **Ship with C1.** |
| C3 | **Speak-once contracts** | A fact stated above (date, headcount, budget) may not reappear verbatim below — downstream copy references it. The title-dedup rule generalized to all copy. |
| C4 | **Numbers become chips** | Prose that exists to carry a figure drops the sentence, keeps a quiet chip (`26–32 likely`). Sweep. |
| C5 | **Answer-shaped copy** | Propose-don't-ask applied to prose: show the proposed answer dimmed in place ("$1,200 — a starting point"); acceptance replaces explanation. Pairs with earned disclosure. |
| C6 | **Copy that decays with familiarity** | First visit: full why · third: the clause · fifth: just the ask. `returnNarration` already tracks returns — adaptivity doctrine applied to language; the hand-holder goes quieter as trust builds. |

Open small items from the rebalance: the panel why's REAL render seam (it is not `a.consequence` — find the field that
renders, then apply the first-clause rule = C1's pilot), and the stray margin between the THEN and MIND groups.

**Recommended first press: #1 (severity-scale unification)** — largest calm improvement, diagnosis already done,
and it touches every surface at once. #2 and #3 are the "never-lie / can-you-see-trouble" pair and pair well
together.

---

## Where this leaves the "is it full?" question

- **Attention completeness ("full"): YES**, for a single event — one list, capped, deferrable, no dead ends,
  first-timer start, dead-attention fixed. This is the good news and it's earned.
- **"Only shows what's important, calm, the hand-holder": NOT YET** — the ranked list is correct but it's presented
  as several overlapping surfaces with mismatched counts. The calm is lost at the presentation layer, not the
  engine.

_Driven 2026-07-17 in hostv2 at phone width (the prototype's only viewport). Engine claims verified at file:line by
a code audit. Related: `2026-07-14_ATTENTION_SYSTEM_AUDIT.md` (prior), `UX_04_COMMAND_BOARD_HIERARCHY.md`,
`UX_06_PLANNER_FRIENDLY_LANGUAGE.md`._
