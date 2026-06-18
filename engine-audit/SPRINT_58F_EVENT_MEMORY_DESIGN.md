# Sprint 58F — Event Memory (audit + design)

*Design only (deliverables are audits/inventories/rankings/architecture — no build scope). The question: what should survive beyond a single event? The answer, ruthlessly: **remember vendor performance extremely well; derive everything else; defer the rest.** Every claim traced to runtime. Date: 2026-06-18.*

## The one-line thesis
Event Memory is **not a new store or engine** — it's a thin **reader that aggregates the per-event signals already captured** (`decisionMemory[]` + `event.outcomes` + budget actuals) **across the events already loaded** (`allEvents`, App.js:18978), into the Vendor-Bank reliability fields that **already exist** (`eventsCompleted · onTimeRate · incidentCount · plannerRehireCount`, App.js:1741) and `vendorSpecialtiesFromHistory` (App.js:1819) **already half-builds**. The compounding asset is one thing: **the planner's private vendor track record.**

## Part 1 — Event Memory Audit (value vs repetition)
| | 1 event | 5 | 25 | 100 |
|---|---|---|---|---|
| **Event-specific** (guests, tasks, messages, this timeline/budget rows, documents) | useful | — | — | — | *no cross-event value; expire with the event* |
| **Cross-event valuable** (vendor outcomes, budget variance by type, decision→outcome patterns) | anecdote | signal forming | **reliable** | **proprietary** |
| **Permanent** (the vendor network / Vendor Bank, the planner's own cost baselines, client identity/history) | seed | growing | **a moat** | **a moat competitors can't replicate** |
**Becomes more valuable with repetition:** vendor performance (most), budget/timeline accuracy (this planner's real numbers), decision patterns. Guests/tasks/messages do **not**.

## Part 2 — Memory Inventory (remember / expire / never)
| Signal | Verdict |
|---|---|
| **Decision Memory** (`decisionMemory[]`) | **REMEMBER** — reason↔outcome is the learning unit |
| **Outcome Capture** (`event.outcomes`) | **REMEMBER** — vendor execution + overall |
| **Vendors** (identity, category, contract, COI) | **REMEMBER** (facts) — the key the rest hangs on |
| **Budget** (actual vs budgeted) | **REMEMBER as derived** — variance by event type (the planner's baseline) |
| **Timeline / Tasks** | **DERIVE** slip/completion; the task list itself **expires** |
| **Guests** | **EXPIRE** (event-scoped); never aggregate guest PII cross-event (privacy) |
| **Messages** | **EXPIRE** — operational, not memory |
| **Documents** | **EXPIRE** per event (contracts belong to that event); only the *fact* a vendor delivers paperwork is memory |
| **Event metadata** (type, date, market, guest count) | **REMEMBER (lightweight)** — the dimensions memory is keyed/segmented by |
| **NEVER store** | guest personal data as a cross-event profile · subjective opinions as facts · anything that becomes a cross-studio reputation/public rating |

## Part 3 — Memory Types (v1 vs deferred)
| Class | v1? | Why |
|---|---|---|
| **Vendor Memory** (private vendor track record) | **V1 — the only one** | already-captured outcomes + existing Bank fields; the one compounding asset |
| **Outcome Memory** (decision→outcome patterns) | **V1-light** | already captured per-event; aggregate read, no new capture |
| Relationship Memory (client history) | **DEFER** | `clientId` exists but value is thinner; later |
| Preference Memory (client/planner tastes) | **DEFER** | needs new capture; low reliability v1 |
| Operational Memory (what timeline worked) | **DEFER** | derivable later; not the moat |
| Process Memory (how the planner runs) | **DEFER** | vague; subsumed by the above |

## Part 4 — Event Completion (< 30 s, no survey)
- **Required:** *nothing.* Never block completion.
- **Derived (0 taps):** budget variance, timeline slip, guest-estimate accuracy — **already computed** (58E `outcomeFor`).
- **Optional (already built, 58E):** overall (great/ok/rough) + per-confirmed-vendor (on-time/late/no-show/great/poor) — one tap each.
- **One new optional line:** a single **"biggest lesson"** free-text (≤1 sentence), skippable. That's the entire completion ask. No retrospective forms.

## Part 5 — Compounding Value (ranked)
| Candidate | UserV | MoatV | Cost | Reliability | Compounding | Rank |
|---|---|---|---|---|---|---|
| **Vendor outcomes → Bank** | High | **High** | Low (1 tap, built) | High | **High** | **1** |
| Budget variance by type | Med | Med | **Zero (derived)** | High | High | **2** |
| Decision→outcome patterns | Med | Med | Zero (captured) | Med | Med | 3 |
| Timeline slip rate | Med | Low | Zero (derived) | High | Med | 4 |
| Lessons (free-text) | High | Low | Low (1 line) | **Low** (unstructured) | Low | 5 |
| Client/preference memory | Med | Med | High (new capture) | Low | Med | 6 (defer) |
**Winner by every axis that matters: vendor outcomes.** Remember that one extremely well.

## Part 6 — Vendor Memory (facts / opinions / outcomes)
| Layer | Examples | Can influence future picks? |
|---|---|---|
| **Facts** | category, contract signed, COI on file, contact, # events used | **Yes** — objective |
| **Outcomes** | on-time / late / no-show / great / poor (captured) | **Yes — PRIVATELY** (this planner's own experience) |
| **Opinions** | the rationale ("chose for fast response") | **As context only** — never a score |
**Safe to influence recommendations:** the planner's *own* aggregated outcomes (e.g. "you've used them 3× — 2 on-time, 1 late") — **private intelligence, one studio.** **Must NOT:** become a cross-studio reputation, a public rating, or a shared score. The Bank fields (`onTimeRate`/`incidentCount`/`plannerRehireCount`) are exactly this private shape — Event Memory **fills them from captured outcomes**; it does not publish them.

## Part 7 — Lessons Learned (what's lost; what's worth storing)
| Lesson | Confidence | Repeatable | Actionable | Store? |
|---|---|---|---|---|
| Vendor arrived late | **High** (captured) | Yes | Yes | **Yes — vendor memory** |
| Budget category over/under | **High** (derived) | Yes | Yes | **Yes — derived** |
| Timeline ran long | High (derived) | Yes | Yes | **Yes — derived** |
| Guest estimate wrong | High (derived: final vs estimate) | Yes | Yes | **Yes — derived** |
| Parking was a bottleneck | Med | venue-specific | Yes | **One-line lesson** (free-text; venue-keyed later) |
| Buffet excess food | Med | semi | Yes | one-line lesson |
**The structured lessons are already captured/derivable.** The unstructured ones (parking, food) are the *only* case for the new one-line "biggest lesson" — low reliability, so optional and low-weight.

## Part 8 — Memory Experience (information architecture only)
| When | What memory surfaces | Source |
|---|---|---|
| **Before planning** (new event, same type/vendors) | "What NGW learned" — relevant vendor track records + your typical variance for this type ("Dinner Parties tend to run ~$X over on catering") | aggregate read over `allEvents` |
| **During planning** (at the decision point) | inline at vendor selection: "you've used Bloom & Stem 3× — 2 on-time, 1 late"; at budget: "your last 4 of this type averaged +12% catering" | the vendor/budget memory reader |
| **After planning** (completion) | the 1-tap capture (built) + a "Things that worked / to watch" recap | `outcomeFor` + lessons |
**The highest-leverage v1 surface is *during planning at the vendor-selection point*** — memory where the decision is made, not a separate "memory" page. A "What we learned last time" panel when **starting a same-type event** is the second.

## Part 9 — Moat Analysis (Head Start vs Moat)
**Head start (copyable, flat with volume):** playbooks, the engine, the entire presentation/judgment stack.
**Moat (compounds, private per studio):**
| Signal | 5 events | 25 events | 100 events |
|---|---|---|---|
| **Vendor track record** | anecdotal | **a reliable private signal** | **a defensible reliability network** |
| Budget/timeline baselines | rough | this planner's real numbers | calibrated estimate engine |
| Decision patterns | noise | emerging | predictive |
**The first truly compounding intelligence asset: the private Vendor track record** — outcomes aggregated per vendor, filling the Bank fields that already exist. It is the single thing that is worthless at 1 event and a moat at 100, and it is **already being captured** (58E).

## Part 10 — Architecture
**Storage: none new.** Event Memory is a **pure reader** — `eventMemory(allEvents)` — that aggregates the existing per-event signals:
- **Vendor memory:** group `event.outcomes.vendors` + `decisionMemory` (vendor_selection) across `allEvents` **by vendor identity** (v1 key: normalized vendor name; later: a Vendor-Bank id link) → `{ vendor, timesUsed, onTime, late, noShow, lastRationale }`. This is exactly what `vendorSpecialtiesFromHistory` (App.js:1819) already does for specialties — extend the *pattern*, don't fork it.
- **Budget baselines:** aggregate `budget[].actual/budgeted` by `event.type`.
- **The ONE optional new field:** `event.lessons` (a short string), captured at completion — rides the `event.data` blob like `outcomes` (the 58E-B fix makes this persist).
**Requirements met:** no new engine (a reader), no duplicated logic (reuses `outcomeFor`/the Bank fields/`allEvents`), consumes Decision Memory + Outcome Capture directly. **Compatible with the futures:** Vendor Intelligence = this reader expressed in recommendations; Stakeholder/Outcome/Experience = sibling readers over the same per-event signals. Storage stays in `event.data` (one source) until a real cross-event table is justified (a later, schema-governed sprint — see 58E-C).

## Roadmap (EXECUTE / TEST / PARK / KILL)
| Capability | Verdict | Why |
|---|---|---|
| **Event Memory** (the aggregate reader) | **EXECUTE (next, 58G)** | reuses existing signals + Bank fields; the compounding substrate; minimal |
| **Vendor Intelligence** | **TEST → EXECUTE** | it *is* Event Memory's vendor read surfaced at the pick — build right after, data-gated on N events |
| **Outcome Intelligence** | **FOLD into Event Memory** | already captured; aggregation is the same reader |
| **Stakeholder Intelligence** | **PARK** | needs new capture; thinner moat |
| **Venue Foundation** | **PARK** | high effort, not the moat path |
| **Experience Intelligence** | **KILL as standalone** | undefined; subsumed |
| **Learning Loop** | **PARK** | the expression layer; needs Event Memory first |

## Final Question — the smallest implementation that compounds
**A pure `eventMemory(allEvents)` reader that aggregates the already-captured vendor outcomes into a private per-vendor track record, surfaced at the moment of choosing a vendor — plus zero-cost derived budget/timeline baselines — and one optional one-line "lesson" at completion.** Nothing else.
- **Remember extremely well:** vendor outcomes (the one compounding asset).
- **Derive for free:** budget variance, timeline slip, guest-estimate accuracy.
- **Capture minimally:** one optional lesson line.
- **Store nowhere new:** aggregate `allEvents` in memory; the only persisted addition is `event.lessons` on the existing blob.
- **Defer:** relationship, preference, process, operational memory; new tables; cross-event schema.
This is the line between *remembering one thing that matters at 100 events* and *remembering everything poorly at 5*. Build the vendor track record; let the rest derive.

*Confidence: High — grounded in `allEvents` (App.js:18978), `vendorSpecialtiesFromHistory` (1819), the Bank reliability fields (1741), and the 58C/58E memory signals. Weakest assumption: vendor identity across events keys on normalized name in v1 (a Vendor-Bank id link is the real fix — flagged for Vendor Intelligence, not Event Memory).*
