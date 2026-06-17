# Sprint 57E — Host Information Architecture + Operator Mode + Judgment Readers (design)

*Design only. No build, no new engine, no Notion. Detailed design of the 57D recommendations. Traced to runtime; expression over expansion. Date: 2026-06-17.*

## The cost-revising finding (read first)
57D called host-mode IA "the one genuine UI build." **Runtime says it's cheaper:** the nav **already filters on a per-item `hide` flag** — `navItems.filter(it => !it.hide)` (App.js:17513) — and `eventIsHostFam`/`isHostEvent` (recordKind helpers) already exist. ⇒ **Hiding planner-only nav in host mode is config over an existing filter**, driven by `audiencePersona` (the 57A-B signal), **not a rebuild.** *Merging* tabs (Planning+Decisions) is later; *hiding* the irrelevant ones is immediate and trivial. This makes the host's #1 blocker (cockpit density) the **cheapest** high-value move left.

## Core question
**Can a first-time host immediately see what matters now / can wait / is handled — without feeling they entered pro planning software?** Today: **No.** The hero + (flagged) labels read host, but the **14-item nav and 3-zone dashboard still present a planner's cockpit.** The reason is purely structural — *the nav shows planner-only destinations (Client Intake, Crew) a host will never use*, and nothing collapses by relevance or stage.

---

## Part 1 — Host Information Architecture (design)
**Mechanism (existing):** set `it.hide` per nav item by `audiencePersona(event)` (behind a `pi.nav` flag, default OFF = today). Reuses the `!it.hide` filter.

| Nav item | Host | Operator | Planner | Rationale |
|---|---|---|---|---|
| Overview | **keep** | keep | keep | the home |
| Planning | **keep** (as "Plan") | keep | keep | the to-dos |
| Decisions | **fold into Plan** | keep | keep | hosts don't separate decisions from tasks |
| Client Intake | **HIDE** | hide | keep | a self-host *is* the client — meaningless |
| Vendors | **progressive** (when ≥1 vendor) | keep | keep | hosts may have none |
| Crew | **HIDE** | progressive | keep | pro staffing concept |
| Guests | **keep** | keep | keep | core |
| Seating | **fold into Guests** | keep | keep | a sub-view of guests |
| Budget | **keep** (as "Money") | keep | keep | core |
| Documents | **progressive** (when ≥1 doc) | keep | keep | hosts rarely have contracts |
| Calendar | **fold into "The Day"** | keep | keep | redundant with schedule |
| Event Day Schedule | **reveal near event / dayMode** | keep | keep | irrelevant 90d out |
| Event Details | **keep** (secondary) | keep | keep | settings |
**Host nav result: ~5–6 items** (Overview · Plan · Guests · Money · The Day · Details) vs 14. **Implementation:** Phase A = `hide` the planner-only items (Client Intake, Crew) + progressive-reveal (Vendors/Documents/Event-Day) — **config, cheap, reversible.** Phase B (later) = *merge* (Plan = Planning+Decisions; Guests+Seating; The Day = Calendar+Schedule) — light UI work.

---

## Part 2 — Operator Mode Design (authoring only; reuse VOICE + labelFor + audience)
Add `'operator'` to `AUDIENCE_VOICE` (remap `organization → operator`); author `VOICE[cat].operator` + an operator label map. Operator = **professional-but-plain: efficiency + accountability, generic-business terms, no industry jargon, no hand-holding.**
| Dimension | Host | **Operator** | Planner |
|---|---|---|---|
| Labels | Where things stand / Seating & supplies | **Event status / Headcount & supplies** | Planning Health / Capacity |
| Badges | Needs attention / You're set | **Action needed / On track** | AT RISK / ON TRACK |
| Headers | Before the big day | **Pre-event checklist** | Reality Check |
| Status language | "you're in good shape" | **"on schedule"** | "ON TRACK" |
| Decision language | "Let's lock the headcount." | **"Confirm final headcount."** | "Confirm catering count." |
| Success language | "You're all set!" | **"Complete."** | "Confirmed." |
| Failure language | "Let's fix this together." | **"Needs resolution."** | "AT RISK." |
| Approval language | "Send it for the OK." | **"Route for approval."** | "Send approval request." |
**Overlap:** Operator ≈ planner terseness, but **generic** (Event status, On track, Route for approval) vs **event-industry** (Planning Health, COI, Run of Show). **Complexity: LOW** — pure authoring; the seam already keys by persona string. **Implementation design only.**

---

## Part 3 — Momentum Reader Design (no engine)
Input: `getReadinessHistory(eventId)` — a forward-only `[{ts, score 0–100}]` series (recorded only on change; already powers the card sparkline).
```
momentum(event) → { trajectory, confidence, slope }
  pts = getReadinessHistory(event.id)
  if pts.length < 3       → { trajectory:'unknown', confidence:'low' }
  slope = leastSquares(score over ts) of the last K points (e.g. K=5)
  recencyDays = daysSince(lastPt.ts)
  daysToEvent = …
  trajectory =
    slope > +ε                      → 'improving'
    |slope| ≤ ε && recencyDays small → 'stable'
    |slope| ≤ ε && recencyDays large && daysToEvent shrinking → 'stalled'
    slope < −ε                      → 'declining'
  confidence = pts.length≥5 ? 'high' : 'medium'
```
- **Risks / false positives:** a *deliberately paused* event reads `stalled` (soften copy: "quiet for a while — pick back up when ready"); a brand-new event reads `unknown` (graceful). `declining` is rare (readiness seldom drops) → treat as a real flag.
- **Reader only**; presentation overlay ("planning's moving well" / "things have gone quiet"). Pairs with Positive Attention (✓ + improving).

---

## Part 4 — Decision Confidence Reader Design (no engine)
```
decisionConfidence(event, decision) → { state, reason }
  if prereqUnresolved(decision)              → { 'blocked', whichPrereq }
  if pastDue(decision)                       → { 'overdue' }           // cascade already knows
  if enough(decision, event)                 → { 'ready', why }        // "you have enough — lock it"
  else                                       → { 'gathering', whatsMissing }
```
| Decision | `enough()` inputs | Threshold |
|---|---|---|
| Guest count | confirmed-Yes / estimate, days-out | RSVP ≥ ~80% **or** T-window reached |
| Venue | venue + date set | both present |
| Food | guest count locked | the guest decision is `ready`/done (prereq) |
| Rentals | guest count + venue | both locked |
| Budget | budget set + date | both present |
| Entertainment | budget + date | both present |
| Vendor selection | needed categories vs booked | needed categories addressed |
All inputs exist (RSVP counts, dates, the decision graph). **Reader only**; turns "Confirm X" → "You have enough — lock X now" (or "still gathering: waiting on RSVPs").

---

## Part 5 — Navigation Density Audit (brutal)
**% of the 14 nav items useful per persona:**
- **Host: ~43%** (Overview · Plan · Guests · Budget · The Day · Details = 6/14). **8 of 14 are planner noise.**
- **Operator: ~70%** (adds Vendors · Documents · Schedule · Messages; rarely Crew/Client-Intake/Seating-as-separate).
- **Planner: ~100%** (it is their tool).

**Top 10 unnecessary host-facing nav (ranked by cognitive load):**
1. **Client Intake** — a self-host *is* the client; pure confusion.
2. **Crew** — pro staffing; a host has none.
3. **Decisions** (as a separate tab) — hosts don't separate decisions from tasks.
4. **Seating** (as a separate tab) — a sub-view of Guests.
5. **Documents** — most hosts have no contracts/COIs.
6. **Vendors** (when none added) — empty, irrelevant.
7. **Calendar** (separate from Schedule) — redundant.
8. **Event Day Schedule** (90d out) — premature.
9. **Messages** (when none) — empty channel.
10. **"Planning" as a label** — operator/planner word for "your to-dos."

---

## Part 6 — Updated Roadmap (strictly by value, not effort)
1. **Host IA — hide/reveal nav by audience** *(cheapest high-value: config over the existing `!it.hide` filter; kills the #1 host blocker).*
2. **Extend `labelFor`** to sidebar nav + NEEDS-YOU triage badges *(finish 57C).*
3. **Confidence grammar** (qualifier-on-value; retire alarm tokens).
4. **Positive Attention** ("You're set on…") + **Trust "because."**
5. **Operator authoring** (VOICE + labels; remap organization→operator).
6. **Momentum reader** + **Decision Confidence reader** (pure readers; data exists).
7. **Decision-Memory `rationale` field** (the cheap moat seed).
8. **Venue Foundation** — the next *intelligence/data* build, **after** presentation+IA.
9. Stakeholder → Outcome (dark). 10. Knowledge-capture loop / Distribution (traction-gated). 11. Network / Moat (far).

---

## Final Verdict
1. **Biggest host problem:** the **14-item planner cockpit** — a host sees 8 destinations they'll never use; fixable cheaply via the existing nav `hide` filter.
2. **Biggest operator problem:** **no operator voice** — `organization → planner` serves an exec assistant event-industry jargon; fixed by authoring (remap + VOICE/labels).
3. **Biggest planner problem:** essentially **none** — the product is already built for the planner; their risk is *over-simplification* if host changes ever leak into planner mode (they don't — persona-gated, identity default).
4. **Biggest UI problem:** **no progressive disclosure** — everything visible always, tuned for managing 20 events, not 1.
5. **Biggest judgment gap:** **Momentum + Decision Confidence un-surfaced** — pure readers over existing data (readinessHistory + sparkline).
6. **Biggest trust gap:** confidence as bare values/alarm tokens + no "because."
7. **Biggest intelligence gap:** **Outcome/Stakeholder** (dark, captured-not-expressed).
8. **What to build next:** **Host IA nav hide/reveal** (cheapest, biggest host win) → **extend labelFor** (nav/badges) → **Operator authoring** → **Momentum + Decision-Confidence readers** → confidence/attention/trust. *All config / authoring / readers — no engine.*
9. **What NOT to build next:** a new **planning/intelligence engine**; **Venue** (until presentation + IA complete); a separate **Operator/Momentum/Decision-Confidence engine** (they're authoring/readers); deep **Stakeholder/Outcome** (dark, later). **Expression over expansion.**

**The synthesis:** the grandmother's wall is no longer words — it's **a navigation built for a professional.** And the runtime already has the lever (`it.hide`): **hide what a host will never use, reveal the rest by relevance and stage, give the operator her own plain voice, and turn on the two judgment readers the data already feeds.** Not one new engine in the list.

*Confidence: High — traced to the nav `!it.hide` filter (17513), the recordKind helpers, `getReadinessHistory` + sparkline, and `organization→planner`. Weakest assumption: that hiding nav items doesn't strand a host who later needs one (e.g., adds a vendor) — mitigated by **progressive reveal** (show when the data appears) rather than hard-hide, and by the flag default-OFF. No build; design only.*
