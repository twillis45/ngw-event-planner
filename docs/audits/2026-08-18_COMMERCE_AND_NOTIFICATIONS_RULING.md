# Review Board — paywall boundary + notification channel

Date: August 18, 2026
Dimension: Production-readiness, the two remaining product-shape decisions
before opening past preview to the first 5-10 paying studios.
Board: Market & Finance wing (roster-authoritative, 5 seats) — commercial/GTM
questions only, no visual panel per the board's own sizing rule.

---

## Question 1 — the paywall boundary

**The measurement.** The $39 One-Event Pass is fully built: real Stripe
checkout, a tested backend route, an honest double-gate (`isStripeApiConfigured()
&& REACT_APP_BILLING_LIVE === '1'`) that defaults to "free while in preview."
Nothing is actually gated behind it. The pass sheet's own copy says *"Every
tab, fully unlocked"* — a whole-event model.

**The prior ruling nobody re-checked.** `docs/FLAGSHIP_DEMO_AND_PRICING_D2.md`
§6 (2026-07-06) already answered this, in writing: *"Free tier: full planning
for one event, but sharing vendor briefs beyond the first vendor is the
paywall (the wedge feature IS the paywall)."* The shipped UI copy drifted away
from that decision into a different model — not a re-decision, an accident.
There's also an older, unrelated headline ruling in the roster (2026-06-12:
Lite/Pro $59/App $29-mo SaaS ladder) — D-2 explicitly supersedes it ("do not
sell yet: planner subscriptions... unverified at scale") and picks the
one-time host pass as the sole first wedge. The 06-12 ruling is dead; treat it
as history, not a live option.

### The seats

**The Template Economist** (Easlo/Thomas-Frank-class — template pricing,
creator-economy conversion). "A whole-event unlock at $39 is priced like a
template, not like access. Templates sell on 'get the finished thing now.'
This product's actual value compounds across the vendor relationship — the
brief, the confirms, the record. Gating the compounding part, not the whole
product, is the correct creator-economy instinct: give away enough that the
free user already trusts you, charge for the thing that scales with their
real workload."

**The Solopreneur** (Justin-Welsh-class — one-time vs. recurring economics,
LTV). "D-2 already ran this math and it's right: one host, one event, no
recurring relationship to justify a subscription. The one-time $39 is the
correct instrument. But 'everything unlocked' at $39 caps LTV at the first
sale with no natural second touch. Vendor-brief-per-vendor gating creates a
plausible upsell shape later (more vendors = more value = a second pass for a
second event) that a whole-event unlock forecloses."

**The Wedding-SaaS Strategist** (ex-Aisle Planner/HoneyBook PM — how pro
planners buy software, incumbent pricing). "Wrong buyer comparison if this
ships as whole-event unlock — that's competing against HoneyBook's ~$32.50/mo
on THEIR terms (feature completeness), a fight this product loses on breadth.
Vendor-brief gating competes on a feature incumbents don't have at all: an
honest, host-shaped brief. That's a market this product can actually own.
Whole-event unlock is undifferentiated pricing for a differentiated product."

**The Marketplace Seller** (Etsy/Gumroad power-seller — conversion, CAC).
"From a pure conversion-funnel view: a host who's already planning their
event for free, gets real value from the free tier (full plan, one vendor's
brief), and THEN hits a wall exactly when they need vendor #2 — that's the
highest-intent moment to ask for money. A host who hits a paywall on page one
because they can't unlock ANY tab churns before ever feeling the product
work. Free-tier depth is the whole conversion mechanism here; whole-event
unlock deletes it."

**The Planner Educator** (wedding-business coach — what working people will
actually pay for). "Both models can convert. The real risk isn't which one —
it's that the current UI COPY promises one thing ('every tab, fully
unlocked') while the reasoned pricing doc specifies another. Ship whichever
model you pick, but ship the copy and the gate in agreement. A host who reads
'everything unlocked' and then hits a wall on vendor #2 feels lied to, and
that kills trust harder than either pricing model on its own."

### RULING — Question 1

**Ship the vendor-brief gate, per D-2 §6, not the whole-event unlock the
current copy implies.** Free tier: full planning for one event. Paywall: the
vendor-brief share beyond the first vendor. This was already decided with
real reasoning in D-2; the current UI copy is drift, not a re-decision, and
should be corrected to match rather than treated as the new source of truth.

**What this requires, concretely:**
1. Rewrite the pass sheet's perks copy — "Every tab, fully unlocked" is false
   under this model and must go.
2. Add the actual gate: vendor-brief sharing for a second+ vendor checks pass
   ownership before generating/sending the brief link.
3. Everything else (planning, budget, guests, the day-of run) stays free and
   fully usable, matching D-2's "full planning for one event" free tier.
4. `REACT_APP_BILLING_LIVE` stays unset until D-2's own five preconditions
   are met (demo account, stranger-proof onboarding, audited Stripe path,
   domain + privacy/refund policy, 3 non-founder hosts asked for money in
   conversation) — none of those changed today, they're still genuinely
   "needs you."

---

## Question 2 — the notification channel

**The measurement.** Zero push/reminder channel exists. The activation
return-card rewards a host who comes back on their own; nothing pulls a
lapsed host back.

### The seats

**The Solopreneur.** "For a $39 one-time-purchase product with no recurring
billing relationship, a heavy notification investment (web push + service
worker + VAPID infra) is solving a retention problem this pricing model
doesn't have — there's no subscription to save. Email is directionally
correct: cheap infra, fits a slow-moving planning timeline (weeks between
sessions is normal for event planning), doesn't need to be real-time."

**The Marketplace Seller.** "Agreed on channel, disagreed on urgency. This
isn't a launch blocker. The five-gate 'not ready to charge' list (D-2) is the
real gate for revenue; a reminder email is a post-launch retention lever, not
a pre-launch requirement. Sequence it after the first paying studios exist to
send reminders TO."

**The Planner Educator.** "One narrow exception worth carving out now, cheap
to build: a payment/vendor-deadline reminder tied to something already
computed (the readiness engine, the vendor-unbooked gate shipped today). Not
a general notification system — a single transactional email when a vendor
category is unbooked past its window or a payment is due. That's infra a
provider account unlocks in an afternoon, not a project."

**The Template Economist.** "Concur — don't build a notification SYSTEM
before there's a channel decision and a provider account. If a narrow
transactional reminder ships, it should reuse copy the app already writes
(the vendor-unbooked raiser, the payment-due raiser) rather than invent new
notification-specific language."

**The Wedding-SaaS Strategist.** "No disagreement. Incumbents (HoneyBook,
Aisle Planner) lean on notifications because they're subscriptions with
ongoing engagement to protect. This product's business model doesn't need
that yet. Defer."

### RULING — Question 2

**Defer the general notification channel past this launch — it is not a
production-readiness blocker for a one-time-purchase product with no
recurring relationship to protect.** Revisit once there are real hosts to
retain and revenue data on what's worth reminding them about.

**If you want the narrow exception:** a single transactional email (via
whichever provider — SendGrid/Postmark, your call, this doesn't need a board)
that fires on the same conditions the `vendor-unbooked` raiser (shipped
earlier today, `gateHolder: true`) already computes — a required vendor still
unbooked past its authored window. That's the one place "you weren't going
to come back and check" has real financial consequence. Everything else
(general re-engagement, streaks, "come back and plan") stays out per the
board's read: it's solving a retention problem this pricing model doesn't
have.

---

## Summary — what's actually left to build vs. what's a real gate

| Item | Status after this ruling |
|---|---|
| Paywall boundary | **Decided** — vendor-brief gate per D-2. Needs: copy rewrite + the actual gate check (buildable now). |
| Billing going live | Still genuinely gated — D-2's 5 preconditions unchanged, needs you (Stripe keys, domain, policy, demo account, 3 test hosts). |
| Notification channel | **Deferred** — not a launch blocker. Narrow exception (vendor-deadline email) is buildable in an afternoon once you pick a provider; general system stays unbuilt. |
| Pentest, real-device AT passes | Unchanged — still genuinely needs you, no board can substitute. |

Two of the seven original punch-list categories just moved from "needs you"
to "buildable" or "correctly deferred." The remaining hard gates (billing
keys/policy, security pentest, accessibility device passes, the phone-frame
strategy call, collaboration/localization) are unchanged by this ruling —
they were never product-shape questions, they're external actions or
standing strategy calls this board doesn't re-litigate.

---

## RE-SIT (same day, 20:1x) — the host challenged the Question-1 ruling, and the challenge held

**The host's objection, in substance.** Only the host shell ships for now, and
the vendor-brief-per-vendor gate has a trap the first sitting under-weighed: a
milestone host has 4-12 vendors, so "first vendor free" means the wall lands
on their SECOND phone call — before the product has done anything for them.
That is not try-before-you-buy; it is buy-after-one-tap. The host proposed a
different axis entirely: gate on the event, not the vendor — and specifically
raised destination/lodging/transportation as the paid surface.

**Three models were framed; the board was asked to rule on Model C:**
- A — event-count: first event free in full; each additional event takes the pass.
- B — complexity: local single-day events free in full; destination/multi-day
  surfaces (lodging, group transport, multi-day program) take the pass.
- C — both: first LOCAL single-day event free in full; destination/multi-day
  events always take the pass; second and subsequent events always take the pass.

**A code fact that changes the build cost, verified before the sitting:**
`event.isDestination` is already the single flag the entire travel/lodging
stack gates on (lodgingIntel.js:357/1421, assembleRevealEngines.js:331,
eventSpan.js) — heard at host intake, never inferred from a city name. And
`spanIntel()` already classifies multi-day honestly (host-declared span or
taxonomy-definitional, never guessed). The complexity gate's predicate
EXISTS; nothing about the event's nature would be invented to bill it.

### The seats, on Model C

**The Template Economist.** "C prices the two moments where the product is
worth the most: the moment planning starts AGAIN (a proven repeat user), and
the moment the software's deepest, least-copyable work engages (lodging
blocks, group travel). Both are high-perceived-value moments. My one demand:
the destination surfaces must be VISIBLE in the free tier — teased with real
content, locked with an honest label — or the buyer never learns what the
$39 buys. A paywall on an invisible feature converts at zero."

**The Solopreneur.** "The first sitting's weakness in A was that repeat
usage is unproven — C keeps A's clean story but no longer bets the whole
revenue line on it, because the destination axis converts FIRST-event buyers
too. LTV shape improves: one host can now pay twice for two different
reasons (a destination first event, then a second event later). But hold the
line on ONE price. Two axes must not become two SKUs — $39 unlocks the
event, full stop, whatever made it paid. A pricing page with a matrix kills
a solo product."

**The Wedding-SaaS Strategist.** "Strongest competitive read of the three.
Incumbents have nothing host-shaped for destination coordination — HoneyBook
and Aisle Planner are planner-back-office tools; The Knot's checklists don't
coordinate lodging blocks. C puts the paywall exactly on the surface where
this product has no substitute. The vendor-brief gate (first ruling) put it
on a surface a group text imperfectly substitutes for — that is a worse
fight. I reverse my first-sitting position; the host's objection was right."

**The Marketplace Seller.** "Conversion mechanics of C beat both A and B.
The free tier is now a COMPLETE experience for the most common case — a
local milestone event, fully planned, briefs and all — which is what earns
the five-star word-of-mouth a marketplace listing lives on. The wall only
appears when the host's own situation escalates (they're planning a
destination event, or they came back). Both are self-selected high-intent
moments. One caution: the intake question that sets `isDestination` must
never read as a pricing question. The host answers 'is this a destination
event?' to get the right PLAN; discovering later that the answer also set
the price is fine ONLY if the free tier never shrinks retroactively —
an event that started free stays free."

**The Planner Educator.** "C is explainable in one sentence — 'your first
local event is free; destination events and additional events take the
pass' — which passes my paragraph test from the first sitting. Two trust
requirements, both cheap: (1) the pass sheet copy must name BOTH triggers
plainly, no asterisks; (2) the D-2 free-tier promise ('full planning for one
event') survives intact for the local case, so nothing already said to
early hosts becomes untrue. The first sitting's vendor-brief gate would have
quietly broken that promise for any host with two vendors — I also reverse."

### RULING — Question 1, superseding the first sitting

**Adopt Model C.** The board's first ruling (vendor-brief gate) is
SUPERSEDED — the host's objection exposed a real flaw (the wall lands on
vendor #2, before value is felt), and four of five seats moved on the
evidence. The gate is now:

1. **Free, complete:** the host's first LOCAL, single-day event — every
   surface, every vendor, every brief. D-2's free-tier promise holds.
2. **Pass required ($39, one price, one SKU):** an event with
   `isDestination === true`, OR a multi-day span per `spanIntel()`
   (host-declared or taxonomy-definitional — never inferred), OR any event
   after the first. Whatever triggers it, the same single pass unlocks that
   whole event.
3. **Grandfather rule (hard):** an event that began free never becomes
   paid retroactively — including a host who later marks it destination or
   adds a span mid-planning. The gate checks at event CREATION, not
   continuously. (A host whose event genuinely turns into a destination
   event mid-plan keeps everything; we eat that edge case for trust.)
4. **Visibility rule:** destination/lodging/transport surfaces render
   teased-and-locked in the free tier with honest copy naming the pass —
   never hidden, never fake-functional.
5. **Copy correction still required:** "Every tab, fully unlocked" comes off
   the pass sheet regardless — under C it is true only per-event, and the
   sheet must say what triggers needing a pass.
6. **Billing stays off** until D-2's five preconditions are met — unchanged
   from the first sitting.

**Honest dissent recorded (Template Economist, partial):** the first-event-
free half of C still bets some revenue on repeat behavior with zero data; if
the launch cohort shows destination-triggered purchases dwarfing
second-event purchases, simplify to pure B at the first pricing review
rather than carrying two triggers forever. Accepted by the board as a
review-trigger, not a change to this ruling.

---

## THIRD SITTING (same day, 20:2x) — the vendor brief returns; host seats added

**The host's directive.** Bring the vendor brief back into the model space,
and seat actual users of the application — hosts — alongside the finance
wing. Board expanded to 10: the 5 Market & Finance seats plus 5 host
archetype seats. Archetypes, not real people; their authority is the
population they stand in for, per the roster's own canary tradition.

### The host seats

**The Anxious Milestone Host** — archetype. D-2's named first buyer:
running a retirement / 50th / memorial / reunion, 4-12 vendors, local,
full-time job, not an "event person." Expertise: first-contact vendor
coordination under real stakes. Represents: the modal buyer. Catches: any
gate that lands mid-vendor-conversation, where a wall reads as sabotage.

**"Grandmother"** — the roster's own permanent canary seat. Non-technical
first-time user; shuts the laptop when confused. Expertise: first-contact
comprehension with no prior model of the product. Represents: the
non-technical majority. Catches: pricing that needs a paragraph — decisive
on whether the offer is explainable in one sentence.

**The Budget Host** — archetype (Accessible & Budget wing's lens:
emotional-ROI allocation, dignity over discount). Expertise: making it
special on little. Represents: hosts for whom $39 is real money that
competes with centerpieces. Catches: gates that read as "pay to be treated
decently" rather than "pay for more capability."

**The Destination Host** — archetype. Coordinating a multi-day destination
event: lodging blocks, group travel, a program spanning days. Represents:
the buyer Model C charges. Catches: whether the price lands at a moment
that feels fair, and whether the locked surfaces are visible enough to buy.

**The Family Planner-by-Default** — archetype. The relative who plans
everything: this year the retirement, next year the reunion. Represents:
the second-event trigger's actual buyer. Catches: whether repeat purchase
feels like loyalty rewarded or a subscription in disguise.

### What the sitting established

**The first sitting's "wall on the second phone call" framing was half
right, and the host seats located the half.** The Anxious Milestone Host:
"By the time I share a SECOND brief, I have already built the whole plan
and run one full loop — brief out, vendor confirmed, record updated. That
loop is the product's own 3-minute demo (D-2 §2). One full loop IS the
taste. What I cannot forgive is a wall that appears mid-conversation with
a vendor I'm already talking to, or a gate nobody told me about when I
started." The objection was never really vendor-count — it was surprise
and interruption.

**Grandmother's comprehension test, applied to the combined model:** "Plan
your first event free, including sharing one vendor brief. The pass
unlocks sharing with every vendor, destination planning, and your next
events." One sentence, no asterisks. Passes — barely. Anything more
compound fails her test and gets cut.

**The Budget Host's dignity line:** the free tier must be a complete
planning experience, not a demo. Planning, budget, guests, day-of — all
real. Charging for SHARING capability (more briefs) and for MORE product
(destination surfaces, more events) is capability pricing, which preserves
dignity. Charging to see your own plan would not. This model stays on the
right side.

**The Destination Host** confirmed the second sitting's read: at the
lodging-block moment, $39 reads as obviously fair — "cheaper than one
night of anyone's hotel." No change.

**The Family Planner-by-Default** on the second-event trigger: "Fine —
once. If I'm paying $39 per event every year, at event three I want the
app to acknowledge me, even if only in copy. Never let the third purchase
feel identical to the first." Recorded as post-launch copy work, not a
gate change.

**The finance seats, on bringing the brief back:** The Wedding-SaaS
Strategist: "Each buyer now pays at THEIR point of differentiated value —
the local multi-vendor host at unlimited briefs, the destination host at
the travel stack, the repeat host at event two. That is price
discrimination done correctly: one price, three doors." The Marketplace
Seller, previously the strongest voice against the brief gate, moved on
the disclosure condition: "A wall disclosed at event creation is a
boundary; a wall discovered at vendor #2 is a betrayal. Same gate, ruinous
difference." The Solopreneur held the one-SKU line. The Template Economist
withdrew the second sitting's dissent — the brief trigger converts the
modal (local) buyer, so revenue no longer leans on repeat behavior alone.

### RULING — Model D (final; supersedes both prior sittings)

**Free, forever, for the first local single-day event:** full planning —
budget, guests, timeline, day-of, every vendor tracked — plus ONE vendor
brief, shared and confirmable end-to-end. One complete loop is the taste.

**The $39 One-Event Pass (one price, one SKU, three doors):** unlocks the
whole event, triggered by ANY of:
1. sharing vendor briefs beyond the first vendor,
2. a destination (`isDestination === true`) or multi-day (`spanIntel()`,
   never inferred) event,
3. any event after the first.

**Conditions, all load-bearing:**
- **Disclosure at creation:** the free tier's exact boundary is stated when
  the event is created — before any work is invested. No surprise walls.
- **Never mid-conversation:** the brief gate fires only at GENERATING a
  brief for a new vendor — never at viewing, updating, or confirming a
  brief already shared. An in-flight vendor loop is never interrupted.
- **Grandfather rule** (from sitting two, unchanged): an event that began
  free never turns paid retroactively; the gate evaluates at creation plus
  at new-brief generation — never continuously.
- **Visibility rule** (unchanged): locked destination surfaces render
  teased with honest copy; the second-brief gate is labeled on the brief
  surface itself from day one.
- **Copy:** the pass sheet must carry Grandmother's sentence, near
  verbatim. "Every tab, fully unlocked" comes off.
- **Billing stays off** until D-2's five preconditions are met.

**Dissents: none standing.** The Template Economist's sitting-two dissent
is withdrawn; the Family Planner's acknowledgment request is recorded as
post-launch copy work.

**Standing honesty note:** archetype host seats are lenses, not users.
This ruling still requires D-2's precondition five — at least 3 real,
non-founder hosts run the loop and are asked for money in conversation —
before anyone charges anything. A board cannot substitute for that, and
this one does not claim to.
