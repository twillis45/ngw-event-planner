# Attention System Audit — every corner, vs leaders + 10+

**Date:** 2026-07-14 · **Method:** four parallel auditors (ranking · visual · timing · coverage), each scored against a named leader, every claim carrying file:line. Verified against running code, not against prior audit docs.

> **Standing rule applied:** a finding inherited from an audit is not evidence. Every claim below was re-derived from current code. Where a prior audit was wrong, that is recorded as a finding in its own right.

## Scores

Score = the **lowest** dimension, not the average.

| Slice | Leader compared | Score | Capping dimension |
|---|---|---|---|
| What earns attention (ranking/triage) | Linear triage, Superhuman split inbox | **3/10** | The ranking function does not exist |
| Coverage across every surface | Linear inbox, Asana/Monday roll-up | **3/10** | Surfaces can hold a real problem silently |
| Attention over time (decay/escalation) | Things 3, Google Calendar, Linear cycles | **3/10** | Lead times are decorative |
| How attention looks (visual semantics) | Linear, Slack badges, Apple HIG | **4/10** | Attention inflation — no severity scale |

## The one-sentence finding

**The engine that KNEW was not the engine that SPOKE.**

`deriveEventPhaseProgress` held the gaps *and* the row-level routes. `eventPlan().nextActions` — which the NEXT tile speaks from — knew only four dominoes (`date`, `guests`, `budget`, `food`). Rain, venue, shopping, vendors, the crab order: structurally uncountable.

Measured on an outdoor August crab feast with the four dominoes set, three engines gave three answers on one screen:

| Engine | Said |
|---|---|
| "Where you stand" | 3 of 5 areas · next: **Add a rain backup** |
| "NEXT" tile | **1 thing needs you** · first: **Set your budget** · **"3 handled · all clear"** |
| "What needs you" | **1** item |

## Fixed 2026-07-14

### One ledger (`14f4973`)
`nextActions` now reads the phase ledger — the same items "Where you stand" counts, deduped by domain, ordered by the phase engine's own priority, reactive top action still leading. Live: **"3 things need you"**, the list names all three, both tiles agree on the first action.

- **"· all clear"** was `n('Blocked') ? '' : ' · all clear'` — and `Blocked` is *only* set for an overdue decision. It printed "all clear" over two open areas. A presence predicate licensing a completion claim.
- **The calm gate was a regex on the engine's own prose** — `/on track|nothing urgent|good shape/i.test(actions[0].title)`. Calm asserted by string match. Now reads `category`, which also caught the `calendar` and `heart` tiers whose body copy says *"nothing to do yet"* while the tile counted them as "1 thing needs you."

### Lead times are real (`5bb1abf`)
**Nothing in this app was ever overdue.** Not one task, on any event, ever.

```
playbookChecklist WROTE   week: taskPhaseLabel(offset)   →  'Week of'
every consumer READ       /T-(\d+)\s*d/.exec(task.week)  →  never matched
                    or    PHASE_OFFSET[task.week]        →  keys are 'Week Of'
```

Wrong case *and* wrong wording. So `isTaskOverdue` was permanently false, `overdueCount` permanently 0, the readiness engine's decision axis permanently "No open decisions", `classifyTemplateTaskUrgency` permanently `'standard'`, and the day-of "N things still open" alert could never fire.

`lib/taskLead.js` now owns the lead, off a stable persisted `leadDays`. Includes the reachability guard: an event created 3 days out never had a chance at a T-5d task — that is a tight timeline, not the host being late.

**Also:** `dayAlerts.today8601()` was a **UTC** date compared against a **local** event date. At 8:30pm ET on the night of the party it returned *tomorrow*, and the entire day-of alert stack — vendor hasn't arrived, allergies the caterer wasn't told about, payment due today — silently switched off **mid-event**.

**A test that agreed with the bug:** `dayAlertsBehavior.test.js` derived its event date with `toISOString()` — "the same way the module derives today" — so it reproduced the UTC mistake faithfully and could never catch it.

## Open — ranked by host harm

| # | Finding | Evidence | Harm |
|---|---|---|---|
| 1 | **The "urgent decision" tier ranks by timeline array order.** `x.urgency` / `x.overdue` / `x.overdueDays` are never set on the object; the `parseInt(dueLabel)` sort is all-`NaN`, so the array keeps insertion order. Always resolves to `decisions[0]`. Stamped `critical` regardless. | `CommandCenter.jsx:225-238, 1865-1872` | Host is sent at the wrong problem first, told it's critical, never told how overdue (`od` always 0). |
| 2 | **The top-ranked critical tier is a dead CTA in V2.** `{tab:'Decisions'}` has no `routeSheet` branch → falls to "Not wired here yet" toast. Same for `Communication`, `Event Day Schedule`. | `HostShellV2.jsx:2182-2259, 2884` | The #1 item is pure anxiety, and it *outranks* the wired compression route. |
| 3 | **An overdue vendor payment is invisible during planning.** The critical money tier requires `v.payDueDate`, which has **zero occurrences** in V2 — no input, no write. Structurally unreachable. | `CommandCenter.jsx:1912-1916` | An unpaid balance on a booked caterer raises nothing pre-event. |
| 4 | **`.p-risk .pill-note` = 3.94:1** (WCAG AA fail). The `opacity:1` "fix" is a **no-op** — it sets the parent; the child has its own `opacity:.75`. The comment describes a fix that was never applied. | `styles.css:886-891` | The sentence explaining the emergency is the least legible text in the app. |
| 5 | **`confidenceGrammar`'s 4 tiers collapse to 2 at render.** No `.p-steel` class exists, so `UNKNOWN` / `ESTIMATED` / `NEEDS_VERIFICATION` all paint **amber urgency** — an empty field looks like a slipping deadline. Worse: an `AT_RISK` pillar whose note says "estimated" **downgrades to amber**. | `HostShellV2.jsx:4182` vs `confidenceGrammar.js:70-77` | Real risk hidden; empty fields cry wolf. |
| 6 | **Documents / COI have no surface in V2 at all.** `lib/eventDocuments` imported zero times. The `coiCritical` tier can fire with nowhere to go. | — | A COI expiring is a venue-turns-you-away event. |
| 7 | **No severity scale.** Seven parallel status vocabularies, three different "third colours" (danger / lavender / muted). Amber carries **13 distinct meanings**. Vendors have **no red tier**; workstreams have **no blocked tier**. | `styles.css:887-891, 1190-92, 1211-12` | A blocked vendor and a dietary tag are the same colour. |
| 8 | **`.wchip.attn` signals blocked by colour alone** — rendered text is only the label and "3 of 3". | `styles.css:1191-92`; `HostShellV2.jsx:8291-96` | A colour-blind host misses a blocked vendor entirely. |
| 9 | **"Nudge the quiet ones" targets nobody.** The draft's exits are `sms:?&body=` with **no recipient**; no list is built from the non-responders. | `HostShellV2.jsx:9246, 7184-7222` | The label is the untruthful part; the sheet is honest that it never sends. |
| 10 | **The invite fabricates a reply-by date.** With no `event.rsvpDeadline`, `rsvpDeadlineFor` invents `event.date − 7d` and returns `hard: true`. The invite never reads `.source`. | `dates.js:75-81`; `InviteV2.jsx:744` | A guest is shown a deadline the host never committed to. |
| 11 | **Chase task self-satisfies.** "Chase non-responders; lock the count" is done when **any one** guest replies. | `taskEngine.js:92-95` | One reply out of forty retires it. |
| 12 | **Zero nav/dock badges.** No cross-section attention channel — from The Day, an at-risk pillar is invisible. | `HostShellV2.jsx:9409-14` | Not dishonest — absent. |

## What is genuinely good

- **Motion is Linear/Apple-grade (9/10).** Nothing pulses or flashes in amber or red. Every attention ring is steel, one-shot, decaying. `prefers-reduced-motion` kills all of it globally.
- **No emojis in product UI copy.** Full Unicode sweep of `hostv2/src`: zero. The doctrine is actively enforced in code comments.
- **Risk counts are honest and clearable** — `riskCount` equals exactly the rows the sheet renders, and every row has "Handled — stop showing this."
- **The engines underneath are good.** `taskEngine`'s money/invite predicates, `workstreams`' `isVendorConfirmed`, `getEventReadiness`'s SSOT-#1 fix, `dayAlerts`' tiering are honest in isolation. **The failure was entirely in the composition layer** that decides what the host sees.

## The architectural lesson

> Attention is not a feature. It is a **contract**: if it isn't in the list, it doesn't need you.
>
> This app could not make that claim — four of its own sheets could hold a problem the list would never mention — while the tile said *"Nothing waiting on you right now."*

The structural fix, beyond what shipped: make the ladder's tier list **data-driven off the same registry the surface rows are built from**, so a surface cannot exist without declaring how it escalates. Today every new surface starts life invisible and stays invisible until someone remembers to hand-wire a row. That is exactly why Documents is silent, and why Risks got a row but never a rank.
