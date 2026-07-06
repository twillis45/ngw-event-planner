# Flagship Demo & Pricing Hypothesis — Slice D-2

Status: no-code business slice, 2026-07-06. Product state: main at D-1 (`main.d6e6eb31.js`),
936/936 frontend, 97/97 backend, zero known 3-minute-demo blockers.
Nothing in this document is validated by real buyers. Every price is a test, not a fact.

---

## 1. Executive recommendation

**First sellable wedge: the DIY Host One-Event Pass.** One host, one high-stakes personal
event, one price. The strongest live workflow (brief → vendor confirms → host acts →
record updates) is host-shaped; the last six months of shipped depth (host shell, day-of
focus, readiness chains, host language) all point at this buyer; and planner-scale
behavior beyond ~3 clients is explicitly unverified (HQ-3), so selling planners a
workload tool today would be selling ahead of the evidence.

**First buyer:** the anxious host of a can't-fail milestone event — a retirement,
a 50th, a memorial, a reunion. They are hiring 4–12 vendors for the first time in years,
coordinating by text message, and terrified of the day going sideways. They are not
"event people." That's the point.

**Do not sell yet:** planner subscriptions (unverified at scale), team seats, anything
called "AI," marketplace placement, or an API.

**Honest gate: the product is not ready to take money today.** What must exist first,
in order: (1) a repeatable demo/staging account, (2) stranger-proof onboarding
(sign-up → first event without a guide), (3) a checkout path (a Stripe router exists in
the backend — its readiness for consumer checkout is unverified and must be audited
before any price page goes live), (4) a real domain + terms/privacy page (we make
privacy *claims* in the product; a github.io subdomain with no policy undercuts them),
(5) a support/refund story, even if it's one email address.

---

## 2. The 3-minute flagship demo script

Anchor event: **30-Year United States Army Retirement Celebration at the VFW** (DMV
vendors, host shell). Presenter runs on the demo account (§3), phone or split-screen
for the vendor beat.

**0:00–0:30 — Stakes.**
Say: *"This is a 30-year Army retirement at a VFW hall. 120 guests, six vendors, one
shot at getting it right. The person running it isn't an event planner — they're a
family member with a full-time job. Here's what their event looks like."*
Show: open the event from the events overview → Command. Let the screen sit for two
beats — name, date, countdown, vendor states visible.
Avoid: the day-of Focus surface, the switcher panel, anything under Budget.

**0:30–1:00 — Command / readiness.**
Say: *"Notice it doesn't greet you with a dashboard. It tells you the one thing that
can't slip, and it tells you what's still undecided. This isn't a to-do list you wrote —
the app worked it out from the event itself."*
Show: the next-step strip and the needs-attention item. Tap **Handle it now →** once,
show that it lands on the exact field, then come straight back to Command.
Avoid: resolving the item on stage (it's the "before" state — resetting it mid-demo is
fiddly). Route in, route out.

**1:00–1:40 — Vendor Brief.**
Say: *"Here's the caterer. Instead of forwarding them a spreadsheet, you share a brief.
Look at the link — it's short, it's live, and it's filtered. If the run of show changes
tonight, the vendor's copy changes too. And this list here is everything the vendor will
NEVER see: your budget, your deposits, your private notes, your other vendors."*
Show: caterer → Share Brief. Point at the short URL, the QR, and the "NOT shared with
vendor" panel — that panel is the trust moment; give it three full seconds.
Avoid: scrolling the vendor's payment section while the share panel is open.

**1:40–2:15 — The vendor answers.**
Say: *"Now I'm the caterer. I scanned the QR in my truck. I see when to arrive, where to
load in, who to call — nothing else. Two buttons: I'm confirmed, or something's off."*
Show: open the link on the phone/incognito → tap **All good — I'm confirmed** → on-site
name and phone → send. Then, for the second pass of the demo (or if asked): the
**Something's off** path with a real note ("the power drop is 30A, not 50A").
Backup narration if the live mint/confirm can't run (offline venue, API down): keep a
screen-recording of this exact beat on the phone and say *"I'll show you the vendor's
side from a recording so we don't wait on conference wifi — this is the same link."*
Never fake a live submission that didn't happen.

**2:15–2:45 — The host acts.**
Say: *"Back on the host's side — the answer is already on the vendor's card. One tap
saves the day-of contact into the event. One tap marks them confirmed — and notice it
asks WHY. Months from now you'll remember what you decided; this remembers why. If the
vendor had flagged a problem, it lands in the vendor's log, dated, in their words."*
Show: cockpit row → **Save on-site contact** → **Mark confirmed** → the Decision Memory
prompt (answer it with one honest line — don't skip it; it's a feature, not friction).
Avoid: the raw log list view; stay on the cockpit.

**2:45–3:00 — Close.**
Say: *"No chasing, no guessing. The vendor confirmed themselves, the day-of phone number
is saved where you'll need it, the record knows what changed and why, and the readiness
count just moved. That's the product: your event, under control, with proof."*
Show: readiness/vendor rollup reflecting the change. Stop. Do not tour anything else.

---

## 3. Demo account / staging requirements

**Use a dedicated demo account.** Never demo on the founder's real account again: the
D-0/2B-1 verification cycles created and deleted disposable events in real synced data,
and one mis-tap in a live demo mutates real client history. A demo account also makes
the "reset" honest.

Required staging:
- The flagship event, fully dressed: date ~10–14 weeks out, 120 guests, venue set
  (VFW Post 3150 — Alexandria, VA), six named DMV vendors (never "Vendor A"), the
  caterer with `contactName`, `arrivalTime`, a `briefNote`, and 2–3 run-of-show cues
  assigned to it (so the brief has a schedule to show).
- **Before-states:** exactly one visible needs-attention item on Command (for beat 2);
  caterer at a pre-Confirmed stage with empty on-site contact fields; no confirmation
  rows for the caterer's brief code.
- **After-states to reach live:** confirmation row exists → contact saved → status
  Confirmed → one Decision Memory rationale recorded.
- **Reset procedure (manual until tooling exists):** un-mark the caterer's status, clear
  the two on-site fields, delete the demo-added log entries, and clear the confirmation
  rows for the demo code (server-side delete — currently requires a SQL touch, which is
  exactly why §9 recommends reset tooling). Re-verify the before-states from §above.
- **Never stage with real client data**, real phone numbers, or a real vendor's name
  attached to invented reliability facts.

---

## 4. Product wedge statement

**Short:** No Guesswork stops the chasing: your vendors confirm themselves, and your
event always knows what's still open.

**Landing hero:** Stop chasing vendors. Start commanding your event. — No Guesswork
watches your vendors, decisions, and readiness, and closes the loop when something
needs you.

**Plain English:** You're throwing a big event and hiring people you've never worked
with. This app sends each vendor a link that shows them exactly what they need — and
nothing they shouldn't see. They tap "confirmed" or "something's off," and your event
updates itself. You always know who's locked in, who to call on the day, and what's
still hanging.

---

## 5. Packaging hypothesis

**DIY Host One-Event Pass — TEST (the recommendation).**
Buyer: milestone-event host. Pain: vendor chasing, dropped threads, day-of dread.
Promise: one event, fully under control, vendors confirm themselves.
Might convert: single decision, single price, emotionally urgent, matches the demo 1:1.
Might fail: one-shot revenue, no recurrence until their next milestone; hosts may balk
at paying for something Partiful-adjacent tools do "free" (they don't do this, but the
buyer may not know that yet).
Pricing power: moderate — anchored against the cost of ONE vendor mistake, not against
software. Support burden: low-moderate (one event, finite lifespan, self-expiring).

**Planner Pro — PARK.**
Buyer: independent planner, 5–30 events/yr. Pain: multi-client chaos.
Promise: every client's readiness in one command surface.
Might convert: real recurring pain, subscription-shaped.
Might fail: scale beyond 3 clients is *unverified in our own testing* (HQ-3); planners
have entrenched tools; churn risk if one flagship feature gap appears. Selling this now
means supporting a workload we haven't proven. Park until 2–3 planners have run real
events on it unpaid.

**Event Ops Assistant — KILL (as a package name).**
Buyer: unclear — that's the problem. It's a positioning word, not a buyer. Anything real
inside it is either the Host Pass or Planner Pro wearing a costume. Kill the package;
keep the phrase for enterprise conversations if they ever arrive.

---

## 6. First pricing hypothesis (tests, not truths)

- **Host One-Event Pass: test at $39**, with $29 and $59 as A/B rails. Logic: below the
  cost of one centerpiece, above impulse-app pricing so the buyer treats it as real.
  Free tier: full planning for one event, but sharing vendor briefs beyond the first
  vendor is the paywall (the wedge feature IS the paywall).
- **Planner monthly (when unparked): test at $49/mo** (rails $29/$79), unlimited events,
  single seat.
- **Higher tier: do not price yet.** No evidence of who'd buy it.
- **Must be true before charging anything:** demo account exists; a stranger completes
  sign-up → first event unaided; the Stripe path is audited end-to-end (router exists —
  consumer-checkout readiness unknown); domain + privacy policy + refund policy live;
  at least 3 non-founder hosts have run the vendor-brief loop and were asked for money
  in conversation (even if we don't take it) to hear the objection.

---

## 7. Landing-page copy draft

**Headline:** Stop chasing vendors. Start commanding your event.
**Subheadline:** No Guesswork gives every vendor a live brief that shows exactly what
they need — nothing private — and lets them confirm with one tap. You always know who's
locked in and what still needs you.

**Bullets:**
- **Vendors confirm themselves.** Share a link or QR; they see their schedule, confirm,
  or flag a problem — no account, no app install, no phone tag.
- **Private stays private.** Your budget, deposits, and notes never leave your side.
  The brief shows the vendor's slice, verified field by field.
- **The event remembers.** Day-of contacts, confirmations, issues, and the *why* behind
  every decision, saved where you'll need them when it counts.

**Primary CTA:** Set up your event free
**Secondary CTA:** Watch the 3-minute demo

**How it works:** 1. Tell it about your event — it maps what has to happen. 2. Share
each vendor their brief. 3. They confirm or flag issues; you approve with one tap.
4. Walk in on the day knowing exactly who's coming and who to call.

**Trust/privacy note:** Vendor briefs are built from an audited whitelist — money,
notes, and other vendors are excluded by construction, and links stop working the
moment an event is deleted.

**Who it's for:** Hosts of milestone events with hired vendors — retirements, big
birthdays, reunions, memorials, backyard weddings.
**Who it's not for:** Venues, vendor businesses looking for leads, or teams needing
chat — this isn't a marketplace or a messaging app.

---

## 8. Demo success criteria (observable, no metrics theater)

- Within 60 seconds the viewer can say the wedge back in their own words ("so the
  vendors confirm themselves?").
- They ask **"what does the vendor see?"** — the privacy question is engagement, and we
  have the best possible answer on screen.
- They ask to use it on a **real upcoming event** of their own (the only signal that
  matters).
- They ask **price** unprompted.
- They ask **"does it handle multiple events / all my vendors?"** — expansion appetite.
- Failure signals to record honestly: "how is this different from a group text?",
  polite nodding with no event of their own mentioned, or fixation on features off the
  wedge (chat, invites, seating).

---

## 9. Next build decision

**Next code slice: demo account seeding/reset tooling.** The demo is now blocked on
operations, not product: staging the before-states and resetting after each run is a
manual, error-prone SQL-touching chore (§3). A small dev-gated seed/reset path makes
the demo repeatable by a human who isn't me, and doubles as the template for future
onboarding samples. The attention chip stays deferred until real demo audiences say
the Command surface felt silent — that's cheap to learn and free to wait on.

## 10. What not to build next

Vendor portal. Chat/messaging. Notifications. Marketplace. AI expansion. Broad
dashboards. Guest Brief expansion. Revoke/rotate lifecycle (unless a leaked-link
incident makes it a risk item). Team seats. Anything not touched by the 3-minute script.

## 11. Final recommendation

- **Next code slice:** demo seeding/reset tooling (dev-gated, no product surface).
- **Next no-code business slice:** the selling-readiness audit — Stripe path,
  domain/policy pages, onboarding walkthrough by a stranger; produces the punch list
  that gates the price test.
- **Park:** Planner Pro (until unpaid planner evidence), attention chip (until demo
  feedback), Event Ops Assistant (killed as a package).
