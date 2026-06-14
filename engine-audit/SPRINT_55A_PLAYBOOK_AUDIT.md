# Sprint 55A — Event Playbook Engine: Audit & Foundation

*Source-grounded audit of the Event Intelligence layer. No UI work. Verified against `src/lib/eventSolve.mjs`, `eventTaxonomy.mjs`, `budgetEstimator/*`, `vendorCategoriesByType.js`, `vendorAccountability/playbooks.js`, `vendorQuestions.js`.*

## What the engine knows today (4 layers)

| Layer | Source | What it carries |
|---|---|---|
| **Solve** | `eventSolve.mjs` — 29 backward-solve GRAPHS | per-type milestones + dependencies + lead times (offset days) + owner + a "fires rule" that generates the next-action and the date-at-risk **risk**. WEDDING = 30 milestones (deepest) → HOME_GATHERING = 8 (shallowest). |
| **Budget** | `budgetEstimator/` | per-head bands (15 explicit types + a 5-family fallback), 3 category-share tables (wedding/corporate/private) + fallback, a 6-signal **confidence** score, family-keyed **exclusions**. |
| **Vendor** | `vendorCategoriesByType.js` + `vendorAccountability/playbooks.js` | curated vendor **rosters for all 33 types**; **accountability playbooks** (promises, proof-required, asks, red-flags, contract/payment guidance) for **14 common vendor categories**. |
| **Operational Playbook** | — | **NONE.** There is no purchases / quantities / shopping-list / setup-cook-cleanup task data anywhere in the engine. (`grep purchases:/quantity:/shoppingList` → 0 hits.) |

**The headline:** the engine is strong on **WHEN** and decent on **HOW MUCH (money)** and **WHO (vendors)** — but it is **blind to the operational HOW**: *what to buy, how much, where, and the hour-by-hour shopping / cooking / setup / cleanup choreography a real planner runs.* That operational layer is the next competitive advantage, and it is the one thing a self-host user (no professional planner) needs most.

---

## Deliverable 1 — Coverage Matrix

**Scoring.** Solve: 🟢 own graph ≥14 milestones · 🟡 own graph <14 *or* maps to a family graph · 🔴 no graph. Budget: 🟢 explicit per-head + explicit share family · 🟡 family-fallback per-head *or* fallback shares · 🔴 generic fallback. Vendor: 🟢 curated roster + its vendor categories have accountability playbooks · 🟡 roster present but specialist categories lack playbooks · 🔴 generic. Playbook: operational task/purchase/quantity data — **🔴 for every type (none exists)**.

| Event Type | Solve | Budget | Vendor | Playbook |
|---|:--:|:--:|:--:|:--:|
| Wedding | 🟢 30 | 🟢 | 🟢 | 🔴 |
| Vow Renewal | 🟢 17 | 🟢 | 🟢 | 🔴 |
| Quinceañera | 🟢 22 | 🟢 | 🟢 | 🔴 |
| Sweet 16 | 🟢 | 🟢 | 🟢 | 🔴 |
| Engagement Party | 🟡 14 | 🟢 | 🟢 | 🔴 |
| Anniversary | 🟢 15 | 🟡 | 🟢 | 🔴 |
| Bridal Shower | 🟡 14 | 🟢 | 🟢 | 🔴 |
| Baby Shower | 🟡 14 | 🟢 | 🟢 | 🔴 |
| Birthday | 🟡 14 | 🟢 | 🟢 | 🔴 |
| Gender Reveal | 🟡 13 | 🟡 | 🟢 | 🔴 |
| Graduation | 🟢 15 | 🟢 | 🟢 | 🔴 |
| Retirement Party | 🟢 16 | 🟡 | 🟢 | 🔴 |
| Reunion | 🟡 14 | 🟢 | 🟢 | 🔴 |
| Surprise Proposal | 🟡 11 (proposal) | 🟡 | 🟢 | 🔴 |
| Bachelorette Party | 🟡 13 | 🟡 | 🟢 | 🔴 |
| Bachelor Party | 🟡 13 (bachelorette) | 🟡 | 🟢 | 🔴 |
| Elopement | 🟡 12 | 🟡 | 🟢 | 🔴 |
| Conference | 🟢 23 (corporate) | 🟢 | 🟡 | 🔴 |
| Holiday Party | 🟢 17 | 🟡 | 🟡 | 🔴 |
| Board Meeting | 🟢 17 | 🟡 | 🟡 | 🔴 |
| Product Launch | 🟢 17 | 🟡 | 🟡 | 🔴 |
| Team Retreat | 🟢 15 | 🟢 | 🟡 | 🔴 |
| Town Hall | 🟡 14 | 🟡 | 🟡 | 🔴 |
| Training / Workshop | 🟢 15 | 🟡 | 🟡 | 🔴 |
| Award Ceremony | 🟢 17 | 🟡 | 🟡 | 🔴 |
| Client Dinner | 🟡 11 | 🟡 | 🟡 | 🔴 |
| Fundraiser / Gala | 🟢 23 | 🟢 | 🟡 | 🔴 |
| Networking Event | 🟢 16 | 🟢 | 🟡 | 🔴 |
| Wellness Retreat | 🟢 17 | 🟡 | 🟡 | 🔴 |
| Dinner Party | 🟡 8 (home_gathering) | 🟡 | 🟡 | 🔴 |
| Housewarming | 🟡 8 (home_gathering) | 🟡 | 🟡 | 🔴 |
| Get-Together | 🟡 8 (home_gathering) | 🟡 | 🟡 | 🔴 |
| Other | 🔴 null | 🔴 | 🟡 | 🔴 |

### Missing decisions / purchases / milestones (the operational blind spot, by cluster)

| Cluster | Missing **decisions** | Missing **purchases** | Missing **milestones** |
|---|---|---|---|
| **At-home (Dinner Party, Housewarming, Get-Together, BBQ)** | menu lock, seating, dietary/allergy collection, alcohol strategy, DIY-vs-help | ice, propane, coolers, serving utensils, leftover containers, trash/recycling bags, extra chairs, paper goods | make-ahead cook prep, day-of setup, drinks-chill, post-party reset |
| **Host celebrations (Birthday, Baby/Bridal Shower, Graduation, Gender Reveal)** | theme, games/activities, favor strategy, cake size, kid-vs-adult | balloons/decor kit, tableware counts, favors, cake/dessert qty, drink qty, signage | décor setup, food/drink quantities by headcount, activity prep, cleanup |
| **Weddings (Wedding, Vow Renewal, Quinceañera, Elopement)** | ceremony style, guest-count lock, vendor selections, timeline-of-day | welcome bags, signage, table linens/numbers, escort cards, favors, gratuity cash | day-of run-of-show beyond vendor booking, rentals count reconciliation, final headcount → catering count |
| **Corporate (Conference, Board, Launch, Town Hall, Training, Award, Client Dinner, Retreat)** | AV requirements, registration process, speaker management, catering headcount, swag | name badges, lanyards, signage, extension cords/power, printed agendas, AV cabling, gift bags | run-of-show, AV check, registration setup, badge printing, room reset |
| **Fundraising / Social (Gala, Networking)** | auction format, donor-ask flow, sponsor fulfillment, seating/table sales | paddles/bid tools, signage, name badges, centerpieces, printed programs | auction setup, donor data capture, sponsor activation, checkout flow |

> Every "Missing purchases" item above is real and *absent from the engine* — the solve graphs name phases ("Shop groceries + supplies") but carry **no item, quantity, location, or cost**.

---

## Deliverable 2 — Event Type Ranking

*Revenue Value = $ per event the planner/host transacts. Demand = likely frequency across the user base. Effort = cost to fully operationalize a playbook (lower if it shares an operational template with others).*

| Event Type | Revenue Value | Demand | Effort | Priority |
|---|:--:|:--:|:--:|:--:|
| Dinner Party | Low | **Very High** | **Low** | **P1** |
| Birthday | Low–Med | **Very High** | **Low** | **P1** |
| Baby Shower | Low | High | Low | **P1** |
| Get-Together / BBQ | Low | High | Low (shares Dinner Party template) | **P1** |
| Graduation | Low–Med | High | Low | **P1** |
| Bridal Shower | Med | High | Low | P2 |
| Holiday Party | Med | High (seasonal) | Med | P2 |
| Wedding | **Very High** | Med | **High** | P2 |
| Fundraiser / Gala | **Very High** | Med | High | P2 |
| Conference | **High** | Med | High | P2 |
| Quinceañera / Sweet 16 | High | Med | Med | P3 |
| Corporate (Board/Launch/Town Hall/Training/Award/Retreat) | Med–High | Med | Med–High | P3 |
| Anniversary / Reunion / Retirement | Low–Med | Med | Low | P3 |
| Elopement / Proposal / Gender Reveal / Bachelorette | Low–Med | Low–Med | Low | P4 |
| Networking / Client Dinner / Wellness Retreat | Med | Low | Med | P4 |

**Why host events rank first:** the operational playbook (what to buy, how much, the cook/setup/cleanup choreography) is the *killer feature for the self-host segment*, who have **no professional planner**. For pro-served events (Wedding, Gala, Conference) the planner already supplies that knowledge, the solve + vendor layers are already 🟢/🟡, and the playbook is *incremental* — so those are higher value but lower marginal lift, making them Phase 2.

---

## Deliverable 3 — Phase 1 Playbooks (the first five to fully operationalize)

1. **Dinner Party** — the archetype host event; the operational layer (menu→quantities→cook schedule) is the entire value. Built below as the reference example.
2. **Birthday** — highest-frequency celebration; broadest user appeal; adds theme/cake/activity/favor operations on top of the Dinner Party food/drink core.
3. **Baby Shower** — high-demand host event; games/favors/grazing-table operations; near-zero overlap risk.
4. **Get-Together / BBQ** — shares ~70% of the Dinner Party template (food, beverage, setup, cleanup) so marginal effort is tiny; surfaces the forgotten outdoor purchases (ice, propane, coolers, bug/shade).
5. **Graduation Party** — high-demand seasonal host event; combines the celebration template with headcount-heavy catering quantities.

**Reasoning.** These five (a) hit the **highest-demand, lowest-effort** quadrant, (b) all sit in the `home_hosted` / `host_driven` families where the user is their own planner, so the playbook *is* the product, (c) share a common operational spine (food / beverage / setup / guest / cleanup) so building #1 makes #2–#5 ~60–70% cheaper, and (d) immediately deliver the "experienced planner sitting beside you" feeling to the largest slice of users. Wedding / Gala / Conference are deliberately **Phase 2** — highest revenue, but their solve + vendor layers are already strong and a pro planner backfills the operational gap, so they earn less per dollar of build right now.

---

## Deliverable 4 — Playbook Data Model

A declarative, per-type data structure (one JSON object per event type) layered **on top of** — never replacing — the existing solve graph, budget bands, and vendor rosters. It is pure data so it can be (a) hand-authored, (b) **AI-generated** per type, and (c) consumed by a future **shopping integration** (every purchase has retailers + a guest-scaling quantity formula + a cost range).

```
EventTypePlaybook {
  type            // canonical EVT_TYPE — joins to eventTaxonomy / solve / budget / vendor
  solveFamily     // existing GRAPHS key — the playbook EXTENDS the solve milestones, not replaces
  family          // 5-family (home_hosted/host_driven/full_service/corporate/travel_led)
  recordKind      // 'event' (host) | 'client' (pro) — gates host-vs-pro copy + DIY-vs-vendor
  meta: { summary, typicalGuests{low,default,high}, typicalDurationHours,
          leadTimeDays, hostDifficulty, perGuestCost{low,high}, scaleBy:'guestCount' }

  decisions[]  { id, label, options[], default, when, dependsOn[], blocks[], why }
  milestones[] { id, name, offsetDays, owner, dependsOn[], category, risk{ifDelayed,severity} }
                 // operational, finer-grained than (and reconcilable with) the solve graph
  tasks[]      { id, milestoneId, phase, label, when, optional }
                 // phase ∈ setup|shopping|food|beverage|staffing|rental|logistics|guest|cleanup
  purchases[]  { id, item, category, qtyPerGuest | (qtyFlat,qtyPer), unit,
                 where[], unitCostRange[lo,hi], essential, buyAt, substitutes[],
                 dependsOnDecision }            // ← shopping-integration + cost ready
  rentalsGap[] { item, qtyPerGuest|qtyFlat, note, altToBuy }
  vendors[]    { category, required, altToDIY, when, proofRequired[], costRange, costUnit }
                 // joins to CURATED_VENDORS + vendorAccountability playbooks
  risks[]      { id, trigger, severity, mitigation }
  schedules    { purchasing[], cooking[], setup[], cleanup[] }   // hour-by-hour, day-of
}
```

**Design rationale**
- **Joins, doesn't fork.** `type`/`solveFamily` key into existing systems; `milestones` reconcile with the solve graph (engine stays the source of truth for *timing*); `vendors[].category` joins the existing roster + accountability playbooks; `purchases` feed the budget per-head as a *bottom-up* cross-check.
- **Host + pro.** `owner` + `recordKind` + `altToDIY` let one playbook render as "you cook this" for a host and "brief the caterer" for a pro.
- **AI-ready.** Flat, declarative, enum-constrained (`phase`, `severity`, `category`) — an LLM can generate a new type's playbook against this schema and it validates.
- **Shopping-ready.** Each purchase carries `where[]`, a guest-scaling quantity, and `unitCostRange` — enough to build a real cart and a real cost estimate later.
- **No premature architecture.** It's data files + a thin reader; no new UI, pages, or services are implied by this sprint.

---

## Deliverable 5 — Complete Example: DINNER PARTY

Full operational playbook authored to professional standard:
**`engine-audit/playbooks/dinner-party.playbook.json`** — 6 decisions · 10 milestones · 15 tasks · 16 purchases (with per-guest quantities, retailers, cost ranges) · rentals gap · 4 vendor options (DIY-vs-hire with cost/ROI) · 6 risk flags · and four day-of schedules (purchasing / cooking / setup / cleanup).

Highlights that read like a real planner, not a generic checklist:
- **Dietary collected *before* the menu locks** (the one ER-risk), with a mandatory safe vegetarian main.
- **Quantities that scale:** ½ bottle of wine per drinking guest, ~1.5 lb ice/guest, 0.4 lb protein/guest, 2.5 glasses/guest (breakage spares).
- **The forgotten purchases surfaced:** ice, leftover containers, serving utensils, extra trash + recycling bags, spare chairs.
- **A make-ahead-first menu rule** ("the host should *plate*, not *cook*, once guests arrive") and a staged-bus-tub cleanup plan ("don't wash mid-party").
- **Honest DIY-vs-hire tradeoffs** with cost: a $100–180 post-party cleaner flagged as the highest-ROI sanity spend.

---

## Bottom line — what to invest in next

The engine **knows WHEN** (solve, 🟢 for most types) and **roughly HOW MUCH / WHO** (budget + vendors, 🟢/🟡). It **does not know the operational HOW** — the purchases, quantities, and hour-by-hour choreography (🔴 universally). That gap is the differentiator, and it pays back fastest on the **five Phase-1 host events**, which share one operational spine. Recommend: ship the playbook data model (Deliverable 4), author the five Phase-1 playbooks (Dinner Party done), and only then layer the (already-strong) pro events in Phase 2.
