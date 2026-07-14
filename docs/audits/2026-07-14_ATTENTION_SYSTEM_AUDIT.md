# Attention System Audit — every corner, vs leaders + 10+

**Date:** 2026-07-14 · **Method:** four parallel auditors (ranking · visual · timing · coverage), each scored against a named leader, every claim carrying file:line. Verified against running code, not against prior audit docs.

> **Standing rule applied:** a finding inherited from an audit is not evidence. Every claim below was re-derived from current code. Where a prior audit was wrong, that is recorded as a finding in its own right.

## Scores

Score = the **lowest** dimension, not the average.

| Slice | Leader compared | Before | After | Capping dimension now |
|---|---|---|---|---|
| What earns attention (ranking/triage) | Linear triage, Superhuman split inbox | **3/10** | **7/10** | One inbox, but no snooze/decay and no cross-surface registry |
| Coverage across every surface | Linear inbox, Asana/Monday roll-up | **3/10** | **6/10** | Roll-up is still hand-wired per surface |
| Attention over time (decay/escalation) | Things 3, Google Calendar, Linear cycles | **3/10** | **7/10** | No snooze; nudges never expire |
| How attention looks (visual semantics) | Linear, Slack badges, Apple HIG | **4/10** | **7/10** | Amber still carries several meanings; no dock badges |

Scores recomputed against the code as it now stands, not tagged onto the old numbers. The
remaining caps are all *structural* rather than dishonest — the app no longer says things
that aren't true; it is now merely less complete than a leader.

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

## Closed 2026-07-14

| # | Finding | Fix | Commit |
|---|---|---|---|
| 1 | **The "urgent decision" tier ranked by timeline array order.** `x.urgency` / `x.overdue` / `x.overdueDays` were never set on the object — `od` was computed one line above the return and thrown away — so both `find()`s always missed and it fell to `decisions[0]`. Which wasn't the worst one either: the sort was `parseInt(dueLabel)` over prose ("Overdue 3d") → `NaN` for every comparison → insertion order preserved. | Attach the fields; sort by the real number. `criticalNeeds`, which read the same phantom fields and was permanently 0, works for free. | `646750a` |
| 2 | **The top-ranked critical tier was a dead CTA.** `{tab:'Decisions'}` had no `routeSheet` branch → "Not wired here yet" toast, while *outranking* the compression tier whose route was wired. | The destination existed the whole time (`sheet.kind === 'decisions'`, "Calls to make"). Wired it, plus `Event Day Schedule`. `Communication` deliberately still toasts — V2 has no messages surface, so there is nowhere honest to land. | `646750a` |
| 3 | **An overdue vendor payment was invisible while planning.** The one `critical` money tier needs `v.payDueDate` — **five** engines read that field and V2 gave the host no way to set it. | Added the field to the vendor money row. Live: *"Send payment to Fired Up BBQ · Balance was due 5 days ago ($4,200)"* is now the #1 action. | `646750a` |
| 4 | **The emergency sentence was the least legible text in the app.** `.pill-note` at `opacity:.75` → 3.94:1 on `.p-risk`, 3.89:1 on `.p-ok`. The existing "fix" (`.p-risk{opacity:1}`) was a **no-op**: `.p-risk` is the parent button, `.pill-note` a child span with its own opacity. The comment asserted a fix that had never applied. | Dropped the dimming. All four tiers measured live: **p-ok 5.80 · p-warn 7.19 · p-risk 5.91 · p-steel 6.04**. (My *own* first pass enumerated three classes and left `.p-steel` failing at 4.03 — the same mistake, one hour later.) | `646750a` |
| 5 | **Four confidence tiers collapsed into two.** No `.p-steel` class existed, so `UNKNOWN`/`ESTIMATED` painted **amber urgency** — an empty field looked like a slipping deadline. | Added `.p-steel`; routed all four tiers. Root cause beneath it: `getEventReadiness` returned `AT_RISK`/"No tasks" for an **empty** checklist — a red alarm about work that does not exist. Missing data is not a risk; it now returns `UNKNOWN`. | `646750a` |
| 8 | **`.wchip` signalled blocked by colour alone** — and its number *contradicted* the tint ("3 of 3" reads as finished). | The state says itself now — "blocked", "2 to confirm" — with a full aria-label. Tint is reinforcement, not the message. | `c8d7c8d` |
| 9 | **"Nudge the quiet ones" nudges nobody.** No guest contact exists, so no recipient list can be built. The *sheet* was honest (it never fakes a send); the **label** was the lie. | Now "Write a nudge to send". The real fix — capturing guest contact — is a data-model change, filed not faked. | `dc5abee` |
| 10 | **The invite fabricated a reply-by date.** `rsvpDeadlineFor` invents `event.date − 7d` with `hard:true`; the invite never read `.source`. Also gated on days-to-**event**, not days-to-**deadline**, so a lapsed date kept rendering as live urgency. | Only `source === 'override'` — a date the host actually set — is shown to a guest. Verified both ways: gone when unset, still renders when set. | `dc5abee` |
| 11 | **The chase task retired itself.** "Chase non-responders; lock the count" shared the *send* predicate: one reply out of forty marked it done. | Chasing is finished when nobody is left to chase (`every`), not when somebody answered (`some`). Sending is still honestly evidenced by one reply. | `dc5abee` |

## An audit finding that was WRONG — #6, "Documents/COI have no surface in V2"

Filed on the evidence that `lib/eventDocuments` is imported zero times. Checked against the code: **COI is fully surfaced and fully actionable.** It lives on the vendor card — `coiNextAction` renders at `HostShellV2.jsx:8398`, the requested → received → verified ladder writes at `:8638-8640` — and the `coiCritical` tier routes to `{tab:'Vendors', vendorSection:'documents'}`, which `routeSheet` **does** handle.

What is true is narrower: there is no standalone *documents sheet*, and `lib/eventDocuments` is unused. That is not "a COI can expire silently."

> The standing lesson, earned a third time today: **a finding inherited from an audit is not evidence.** Verify it against the running thing, or do not repeat it.

## Still open

| # | Finding | Why it survived |
|---|---|---|
| 7 | **No single severity scale.** Seven status vocabularies; amber still carries several meanings. Vendors have no red tier. | Real work — a semantic pass across every chip, not a patch. |
| 12 | **Zero nav/dock badges.** From The Day, an at-risk pillar is invisible. | Absent rather than dishonest. |
| — | **Surfaces start life invisible.** The roll-up is hand-wired per surface; nothing is automatic. | The structural call: make the tier list data-driven off the same registry the surface rows come from, so a surface *cannot exist* without declaring how it escalates. |
| — | **Nothing snoozes or decays.** The ranked list cannot be deferred; context nudges never expire. | Leaders all have this. Needs a design call on what deferral means for an event with a fixed date. |

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
