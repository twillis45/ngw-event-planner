# Shopping Intelligence & "Do It For Me" — Engine Audit
**Date:** 2026-06-22 · **Board:** Jobs / Chesky / Rams / Cagan / Weil + Prime-logistics / Costco-ops / Instacart-strategy / Event-ops / Behavioral-econ + No Guesswork Review Board
**Mandate:** Challenge, don't validate. Optimize for user value, trust, activation, retention, moat. Kill freely.

---

## The one fact that governs everything

You have **~0 real completed events** in the system. The last three intelligence sprints (60C Planning Alignment, 60D, 61A) **dead-ended on exactly this** — "no real corpus to ground or validate against" — and the standing memory note (`project_activation_is_the_bottleneck`) already concluded: *don't build more intelligence speculatively; the next sprint that matters is activation/recruitment; minimum viable corpus ≈ 10–15 planners / 50–100 completed events.*

The proposed **Shopping Intelligence Layer** — Quantity, Budget, Local, Timeline, Risk, Human-Reality, Execution intelligence, seven new engines — is the **single largest speculative-intelligence build you've ever proposed**, aimed at the exact wall you already hit three times. The board's job is to stop you from building it as specced.

This is not "no." It's "almost none of this, and the 10% that survives is an *activation weapon*, not an intelligence layer."

---

## Part 1 — Moat, or bloat?

**Bloat. Decisively.** Seven engines that each fabricate precision the system cannot honestly possess, shipped before a single real event has stress-tested the *one* deliverable you already have.

The honest moat is **not breadth of intelligence**. It is:
1. **The deliverable.** `draftShoppingList` / `buildShoppingPlan` already produce a *hand-it-to-someone* artifact — a real, copyable, store-grouped list with amounts. Nobody else in event software hands the host a finished thing. That is the moat seed.
2. **Trust through honesty.** Your code already refuses to fake ("links open the storefront; they do NOT pre-fill a cart… future work"; "modeled, not live prices"; Kroger present in backend, *absent* from UI). That restraint is the brand. Six of the seven proposed engines **violate it** (see Part 5).

Adding Risk/Human-Reality/Budget-optimization intelligence doesn't deepen the moat — it dilutes the one credible promise (a correct, honest list) under a pile of guesses a planner will catch in week one and never trust again.

> **Rams:** "You are proposing *more*. The product needs *better* — one list, provably right." 
> **Cagan:** "This is a roadmap of features in search of a validated problem. You have no evidence any host wants melt-rate math. You have evidence they want the buns number to be right."

---

## Part 2 — What Apple / Airbnb / Amazon / Costco / Instacart would do differently

- **Apple:** Ship *one* number perfectly. "42 guests → 84 buns" with a one-line because. No dashboard of seven intelligences. The demo is a host reading one screen and saying "that's exactly right." Kill the rest until that one number is unimpeachable.
- **Airbnb (Chesky):** Design the *trip*, not the tool. The unit isn't "shopping" — it's "I'm hosting Saturday and I'm not afraid." The artifact a host forwards to their sister is the product. Everything else is plumbing behind that single shareable object.
- **Amazon (Prime logistics):** Work backwards from the receipt. Don't model "where to buy" — own the *list → fulfilled* seam. But you can't fulfill yet (no pre-filled carts), so **don't pretend to**. The honest Amazon move is the boring one: make the list exportable into the rails people already use (you've done this — Things/Email/Copy/Instacart-storefront). Deepen *that*, don't invent advisory layers on top.
- **Costco (ops):** Bulk-break math is real and defensible ("warehouse run pays off at this quantity" — you already say this). But a **specific dollar savings ("Move beverages to Costco, save $113")** is a fabricated number you cannot stand behind across regions, pack sizes, and live prices. Costco itself wouldn't quote it. Kill the specific-savings claim; keep the qualitative bulk nudge.
- **Instacart (strategy):** They would tell you the truth you've already coded: a search deep-link is not a cart, and a fake cart is worse than no cart. The high-value integration is **real pre-filled cart via partner API** — but that's a business-development unlock, not an engine. Don't build advisory intelligence to compensate for not having the integration.

**What you're missing:** a single, ruthless **"is this number *right*?"** discipline. With no corpus, every quantity must trace to a *citable* per-person ratio (published catering/serving standards), not an invented model. The differentiator isn't more intelligence — it's *defensible* intelligence.

---

## Part 3 — Smallest version that creates disproportionate value

Not MVP theater. The actual lever:

> **Quantity Intelligence, grounded in citable per-person ratios, for the ONE thing that already works (the at-home gathering shopping list), surfaced as a one-tap shareable artifact — and wired as an activation event.**

Concretely, the disproportionate-value slice is **three moves on the surface you already ship**:
1. **Correct quantities with a because.** "84 buns — 2 per guest + 10% buffer." Sourced from a ratios table you can cite, not a model you invented. This is the entire "no guesswork" promise made literal.
2. **One honest bulk nudge** (qualitative, no fabricated dollar figure): "Buying ice? Get it day-of — and a warehouse run is worth it above ~60 lbs." You already have the bulk language; strip the fake savings.
3. **Make the shareable list the activation hook.** The moment a host generates and *shares/copies/exports* a list = a real intent signal. That's the funnel event worth instrumenting (you already instrument `ASSEMBLE_VIEWED` etc.). This is how shopping work *earns its place* — by driving the bottleneck (activation), not by adding intelligence.

Everything else (Risk, Human-Reality, Budget-optimization, Timeline-as-engine, Local store-ranking) is **PARK or KILL** until 50–100 real events exist to ground it.

---

## Part 4 — EXECUTE / TEST / PARK / KILL

| Layer | Verdict | Why |
|---|---|---|
| **Quantity Intelligence** (citable per-person ratios + because) | **EXECUTE** | The literal "no guesswork" promise. Defensible without a corpus *if* every number cites a ratio. The one engine that earns trust instead of spending it. |
| **Shareable list as activation event** | **EXECUTE** | Directly attacks the real bottleneck. Cheap — you already have the artifact and the funnel instrumentation. |
| **Qualitative bulk/timing nudges** (no $ figure) | **EXECUTE** (you mostly have it) | Honest, useful, already coded. Just remove fabricated savings amounts. |
| **Timeline Intelligence** ("today reserve / 14d cake / 1d ice") | **TEST** | Valuable *as a derived view over existing buyAt/T0 data you already model* — NOT a new engine. Surface it from the data you have; don't build a planner. |
| **Local Intelligence** (rank Costco Glen Burnie vs Giant vs Wegmans) | **PARK** | A *clean maps "near you" link* is honest and done (just fixed). *Ranking specific named stores with reasoning* requires data you don't have and can't fake. Park until partner/place data exists. |
| **Budget Intelligence** ("save $113 at Costco") | **KILL** (as specced) | Fabricated cross-region precision. Violates honesty doctrine. Reduce to a qualitative bulk nudge (already under EXECUTE). |
| **Risk Intelligence** ("90°F → 80 lbs ice via melt rate") | **PARK / KILL** | The *direction* (hot + outdoor → more ice/water) is a fine qualitative nudge. The *specific melt-rate quantity* is invented physics presented as fact. Keep the nudge, kill the number. |
| **Human-Reality Intelligence** ("80 invited → 68–72 attend, historical no-show") | **KILL** | You have **zero history**. "Historical no-show ranges" is fabricated from nothing. This is the most dangerous claim in the deck — it *looks* like data science and is pure invention. A planner who catches one wrong range never trusts the app again. Revisit only after a real corpus exists, and even then label it loudly as modeled. |
| **Execution / "DO IT FOR ME" package** | **EXECUTE (the assembly), not new generation** | You already generate the pieces (`draftShoppingList`, vendor outreach, helper brief, day-before). The win is *assembling* them on one button — not inventing "Family Assignment" / "Pickup Plan" engines. See Part 7. |

---

## Part 5 — Hidden assumptions, attacked

1. **"We can estimate attendance from history."** — **False. You have no history.** Any no-show range is fabricated. (Behavioral econ: even *with* data, no-show is dominated by event type, RSVP friction, weather, and host relationship — a single range is malpractice.) **Kill.**
2. **"We know what's cheaper where (save $113 at Costco)."** — You don't know live prices, pack sizes, or the host's local store set. The number is invented. **Kill the figure.**
3. **"Guests behave to a model."** — Per-person consumption varies enormously by event type (cookout vs cocktail vs kids' party), culture, time of day, and whether it's a meal or a graze. A flat "21 lbs hamburger for 42" is only safe *with the event-type ratio attached and shown*. **Constrain to cited, type-specific ratios.**
4. **Regional/cultural assumptions.** — You already learned this (Kwanzaa: abstract → concrete buyable groceries; cultural meaning preserved). A generic ratio table will erase that. Any quantity engine must respect the **playbook/taxonomy** layer (`lib/eventTaxonomy.js`, `lib/playbooks/data/*`) — and only Dinner Party / Juneteenth / Kwanzaa are wired. **Quantity intelligence is only as good as playbook coverage.** Don't promise it universally.
5. **"Families will take assignments."** — "Family Assignment Package" assumes the host's people are in the system, reachable, and willing. Most aren't. This is a CRM assumption the host hasn't opted into. **Park** behind real helper data.
6. **"Hosts want optimization."** — Behavioral econ: a stressed host wants *certainty and permission* ("you have enough; you're ready"), not a spreadsheet of savings to second-guess. Optimization *increases* cognitive load — the opposite of No Guesswork. **The product's job is to end the deliberation, not add decision points.**
7. **"More intelligence → more value."** — Refuted by your own three dead-ended sprints. Value is gated by **activation and corpus**, not engine count.

> **Grandmother test:** She does not want to know the expected melt rate. She wants the app to tell her how many burgers to buy, be right, and let her text the list to her son. Anything past that is the app showing off.

---

## Part 6 — The ideal intelligence stack (order + dependencies)

Layers, in dependency order. The honest insight: **most of these already exist** — the work is *expression and grounding*, not new engines.

```
0. CORPUS (real events)            ← THE GATE. Nothing speculative ships until this fills.
1. Taxonomy + Playbook             ← EXISTS (eventTaxonomy.js, playbooks/data/*). Expand coverage.
2. Quantity (cited ratios)         ← BUILD NEXT. Depends on (1): ratios are per event-type.
3. Deliverable assembly            ← EXISTS (doItForMe.js). The "Do It For Me" artifact.
4. Activation instrumentation      ← EXISTS (PostHog funnel). Wire shopping share as an event.
--- everything below is GATED on (0) reaching ~50–100 events ---
5. Timeline view (derived)         ← from buyAt/T0 data you already hold. View, not engine.
6. Local store data (partner)      ← business unlock, not an engine. Until then: honest maps link.
7. Risk/Weather nudges (qualitative)
8. Attendance / no-show modeling   ← LAST. Requires real corpus. Until then: forbidden.
```

**What must NOT be built yet:** 6, 7-as-numbers, and 8. They depend on data you don't have. Building them now = fabrication, which is the one thing your brand cannot survive.

---

## Part 7 — The ideal "DO IT FOR ME" experience

One button. Here's the honest version — built from pieces that **already exist**, assembled, not invented:

**On press, the app produces ONE artifact set, each piece a draft the host owns and can edit/send:**
1. **The Shopping List** — quantities (cited), store-grouped, day-of section, honest export rail (Copy / Things / Email / Instacart-storefront). *Exists.*
2. **The Messages** — invite, RSVP-chase, helper brief, day-before details, thank-yous. *All exist in `doItForMe.js`.* Assemble them into a "what to send and when" stack.
3. **The Day Plan** — a derived timeline from the data you hold (`buyAt`, `ros`/Event Day Schedule, milestones). *Derived view, not a new engine.*

**What is delegated (honestly):** nothing is silently done on the host's behalf. The app **drafts**; the host **sends**. That boundary *is* the trust. "Do it for me" means "I wrote it all for you" — not "I emailed your family without asking."

**What remains the host's responsibility (state this in the UI):** pressing send, the actual purchase, the final headcount call. The app removes the *blank page*, not the *agency*. (This is your `feedback_ruthless_host_lens`: "do, don't advise" — but never "act without consent.")

**What "Do It For Me" must NOT become:** an autonomous agent that books, buys, or messages people unprompted. That's a different, much later, trust-and-liability product. The current honest leap is the **finished draft**, not the executed action.

---

## Part 8 — Monetization, ranked

Ranked by (Revenue × Trust-impact ÷ Effort). Trust is the constraint — a monetization that erodes "no guesswork honesty" is negative-value at any revenue.

| Opportunity | Revenue | Effort | Trust impact | Verdict |
|---|---|---|---|---|
| **Premium intelligence / concierge tier** (the planner pays for depth: full playbook coverage, vendor intel, multi-event) | High | Med | **Positive** (pay for the thing that works) | **#1 — the real model.** Aligns money with value. Planners (your paying persona) will pay for leverage. |
| **Affiliate on order rails** (Instacart/Walmart/Amazon checkout) | Med | Low (links exist) | **Neutral *if disclosed*, toxic if it biases the list** | **#2 — only with a hard wall:** the list is built from the menu, *never* steered by commission. Disclose. The day a host suspects the list serves the affiliate, the moat dies. |
| **Vendor marketplace / lead-gen** (caterers, rentals) | High | High | **Risky** — "recommended" becomes "paid placement" | **#3 — gate behind real corpus + the `pi.memory` "recollection, never Recommended" doctrine you already set.** Lead-gen before trust = CRM spam. |
| **Subscription (host side)** | Low–Med | Low | Neutral | **Park.** Hosts are the activation top-of-funnel; charging them throttles the corpus you desperately need. Keep host free; monetize the planner. |
| **Sponsorship (brand pays to be in lists)** | Med | Med | **Toxic** | **KILL.** This is fabricated recommendation wearing a sponsor badge. Direct violation of the brand. |

**Honest ranking:** monetize the **planner's leverage (premium/concierge)** first; take **disclosed, list-neutral affiliate** as gravy; treat marketplace/lead-gen as a *post-PMF* play gated on trust; **kill sponsorship outright.**

---

## Part 9 — The 3-year destination

Not incremental. The destination:

> **Event Boss becomes the operating system for hosting and running events — the layer that turns an intention ("I'm having people over") into a fully-assembled, hand-off-ready execution package, and (for pros) the command system that runs a portfolio of events without dropping a thread.**

The defensible long-term asset is **the corpus + the deliverable engine**: once tens of thousands of real events flow through, the quantity/timeline/risk/attendance intelligences become *grounded and true* (the thing they cannot be today), and the "Do It For Me" artifact becomes *complete* (real carts, real fulfillment, real vendor handoffs). At that point the moat is **"the only system that hands you a correct, finished plan because it has seen this event a thousand times."**

But — and this is the whole point — **you reach that destination through activation and corpus, not through building the intelligence first.** The intelligence is the *output* of the corpus, not the *input* to getting one. Build the speculative stack now and you ship fabrication, lose trust, and never get the corpus that would have made it real.

---

## Part 10 — Final Deliverable

**1. Executive Verdict.** **Do not build the Shopping Intelligence Layer as specced.** Six of seven engines fabricate precision you cannot honestly possess, aimed at the exact "no corpus" wall you've hit three times. **Execute one engine — cited Quantity Intelligence — on the surface you already ship, wired as an activation hook. Kill Human-Reality and specific-dollar Budget intelligence outright. Park Local-ranking, Risk-numbers, and Attendance until ~50–100 real events exist.** The moat is the *honest, correct, shareable deliverable* — not engine count.

**2. Biggest Opportunity.** The **shareable "Do It For Me" artifact as the activation weapon**: the host generating and forwarding a correct list/plan is both the product's magic moment *and* the funnel event that breaks your real bottleneck. One stone, both birds.

**3. Biggest Risk.** **Fabricated precision** (no-show ranges, $113 savings, melt-rate ice quantities) shipped before a corpus can validate them. The first wrong number a planner catches permanently kills the "no guesswork" trust — and trust is the entire moat. This risk is *self-inflicted* and 100% avoidable by refusing to ship un-citable numbers.

**4. Moat Score: 3/10 as specced → 7/10 if narrowed.** Seven speculative engines deepen nothing. One cited quantity engine + the deliverable + the corpus flywheel is genuinely defensible.

**5. Complexity Score: 9/10 as specced → 3/10 narrowed.** Seven engines + new persistence + new packages is enormous. The narrowed version is mostly *expression over data you already hold.*

**6. Trust Score: 3/10 as specced → 9/10 narrowed.** As written it repeatedly violates the honesty doctrine. Narrowed (every number cited, no fabricated ranges/savings), it *reinforces* the brand.

**7. Revenue Potential: 6/10 (real, but gated).** The premium/concierge planner tier is a genuine model — but it's gated on the product actually working, which is gated on the corpus. Revenue follows trust follows activation. In that order.

**8. Recommended Architecture.**
- Keep `doItForMe.js` as the **single deliverable engine** (it already is). No parallel shopping engine.
- Add **`lib/quantities/` — a cited per-person ratio table, keyed by event taxonomy type**, returning `{ qty, unit, basis }` where `basis` is the citable rationale. Pure, tested, no network, no fabrication. Quantities only emit when a ratio exists for that item+type; otherwise silent (never guess).
- Quantities flow *into* `buildShoppingPlan` (amounts + because), not a new surface.
- **Timeline = derived view** over existing `buyAt`/Event-Day-Schedule data. No engine.
- **Activation:** emit a funnel event on list generate + share/export (reuse PostHog rig).
- Everything gated behind a `pi.*` flag, default OFF, until render-verified — consistent with your stack discipline.

**9. Recommended Roadmap.**
- **Now → corpus:** activation/recruitment is still the headline (memory `project_activation_is_the_bottleneck`). Shopping work earns its slot *only* by driving activation.
- **Sprint A (this slice):** cited Quantity Intelligence for the 3 wired playbooks (Dinner Party / Juneteenth / Kwanzaa) + activation event on share. Render-first verified.
- **Sprint B:** derived Timeline view; remove fabricated dollar/melt numbers from existing nudges (honesty cleanup).
- **Gated (post-50–100 events):** Local store data (partner), Risk modeling, Attendance modeling, marketplace/lead-gen.
- **Never (as specced):** sponsorship-in-lists; autonomous send/buy.

**10. What To Build Next Week.**
1. **`lib/quantities/ratios.js`** — a small, *cited* per-person ratio table for the 3 wired event types (buns, proteins, ice, water, napkins, etc.), each row carrying its source basis. Pure + unit-tested. ~1 day.
2. **Wire amounts + because into `buildShoppingPlan`** so the existing shopping modal shows "84 buns — 2/guest + 10% buffer" instead of bare items. Render-first verify in the modal you already have. ~1 day.
3. **Honesty cleanup pass:** ensure no surface emits a fabricated dollar saving or invented quantity range; downgrade to qualitative nudges. ~half day.
4. **Instrument** list-generate + share/export as a PostHog activation event. ~half day.
5. **Do NOT** start Risk, Human-Reality, Local-ranking, or "packages." Park them in this doc; revisit when the corpus exists.

> **Closing, Jobs voice:** "You showed me seven intelligences. Six of them lie. Build the one that tells the truth — the right number, every time, that she can send to her sister — and make *that* unbelievably good. Then go get the events that earn you the right to build the other six."
