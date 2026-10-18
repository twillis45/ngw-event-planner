# Venue cross-domain trace — with a positive control

**Status: evidence complete.** Venue is kept as the primary gap case per the
owner's ruling. A proven-propagation control is traced in the same structure
beside it.

---

## 0. The headline, stated first

**"Venue has no raiser" was the wrong question, and the answer it implies is
wrong.** Venue propagates *more widely than almost anything in the repo* — 30
non-test consumers. What venue lacks is not propagation. It lacks **attention
production** and, more importantly, it exposes a primitive that is missing
**repo-wide**: there is no way for a decision to create a *new open question*.

---

## 1. Venue — the chain, and exactly where it stops

### Canonical authority

`src/lib/venueFor.js` — self-declared "the ONE reader for *where is this event,
as a place a human sees*." It imports **no engine or playbook code** by
constitution, so both shells and the invite bundle can use it.

Its header records the measured reason it exists: a 2026-07-27 audit counted
**~250 raw field reads across 15 modules**, three engines re-implementing the
at-home carve-out, and phantom fields (`event.address`, `event.venueNotes`) that
nothing writes. `venueSourceProof.test.js` is the guard that catches raw reads
outside it. `src/App.js` is grandfathered, "not sanctioned."

- **Reader:** `venueFor(event)` (:21)
- **Writer:** `setVenue(current, {name, locationText})` (:189) — narrow; writes
  `venue`, `venueKind`, and via `parseVenueLocation` → `venueCity`/`venueState`
- **Raw fields:** `venue`, `venueKind`, `venueCity`, `venueState`,
  `venueAddress`, `venueStreet`, `venueZip`
- **Host ruling encoded (2026-08-03):** a `venue` field holding "City, ST" is a
  *place*, not a venue name — because a CTA once routed to `event-venue` and
  wrote "Santa Fe, NM" into the NAME field, leaving `venueCity` empty so lodging,
  weather and shopping all read nothing.

### Consumers — 30 non-test modules

```
budgetFor        weather          lodgingIntel      taskEngine       taskRoute
itinerary        startTime        vendorBrief       marketFor        placeIntelligence
venuePark        vacationAreas    locationAssist    cvbIntel         doItForMe
webhookService   phaseProgress    assembleRevealEngines              surfaceRegistry
knowledge/geoCostIndex  knowledge/incidentContext  knowledge/lodgingBasisLadder
playbooks/index  playbooks/recommendedPick
CommandCenter.jsx  HostShellV2.jsx  InviteV2.jsx  LodgingCockpit.jsx
```

### What actually recomputes when venue truth changes

**Everything in that list, automatically.** The mechanism is
**derive-on-read**: `venueFor` and its consumers are pure functions of the
event, with no caching (`grep` for cache/memo in `venueFor.js`/`budgetFor.js`
returns nothing). Change `event.venue*` and the next render recomputes money,
weather, lodging basis, task routing, start-time guidance and the vendor brief.

**There is no invalidation problem to solve, because nothing is stored.**

### And venue *is* already in the registry — as an input

`surfaceRegistry.js:69` imports `venueFor`; `:391` reads
`venueFor(event).addressSettled` inside the **`vendor-unbooked`** raiser
(defined :343). So venue already drives attention — through a vendor surface,
not a venue surface.

### Where the chain stops

| Link | State |
|---|---|
| venue fact → canonical reader | ✅ `venueFor` |
| → derived money / weather / lodging / tasks / brief | ✅ derive-on-read, 30 consumers |
| → raises | ⚠️ **only indirectly**, via `vendor-unbooked`'s `addressSettled` |
| → `eventPlan()` ranking | ⚠️ only whatever reaches it through that one raiser and through task/decision producers |
| → route | ✅ `sheet.kind === 'venue'`, plus `event-venue` focus targets |
| → **"now I must ask X"** | ❌ **STOPS HERE — and stops here for every domain** |

### The §6 alcohol-policy case, precisely

The brief's example is the right one and the repo cannot express it. Selecting a
venue must not invent an alcohol policy; it should *create* `Confirm alcohol
policy` **if that fact has become consequential**. Searching the lib for
`openQuestion`, `needToAsk`, `mustAsk`, `unknownFact`, `pendingQuestion` returns
**nothing**.

Question *producers* exist — `askPlan.js`, `heroAsk.js`, `vendorQuestions.js`,
`vendorAsks.js`, `taskEngine.js` — but each derives questions from *current
event state*, not from *a transition having occurred*. Nothing in the repo
distinguishes:

- **known venue fact** (capacity is 120) from
- **fact NGW now knows it needs to ask** (what is the alcohol policy)

That distinction is the actual missing primitive, and it is missing everywhere,
not just in venue. Venue only makes it visible because venue selection is the
transition that unlocks the largest number of newly-consequential unknowns.

---

## 2. Positive control — vendor commitment + guest count + lodging → money

Selected because it has **observable downstream numeric state change**, not just
a notification, and because its propagation is *measured inline in the source*.

### Canonical authorities

| Fact | Authority |
|---|---|
| Is vendor money real | `vendorMoney.js:35 vendorIsCommitted` → `workstreams.isVendorBooked` |
| What is paid | `vendorMoney.js:40 vendorPaid` |
| What is owed | `vendorMoney.js:48 vendorBalance`, `:57 vendorOutstanding` |
| Budget total | `budgetFor.js:77 budgetTotal` |
| Food plan | `playbookFoodPlan` (same one the food panel renders) |
| Hub | `hostSpending.js:90 hostSpending(event, priceFactor, itemFactors)` |

### The chain, closed

```
vendor.status → vendorIsCommitted (Contracted/Deposit Paid/Confirmed/Booked/Paid)
              → vendorBalance → vendorOutstanding(event)
              → hostSpending.js:45 import, :242 vendorOwed
guest count   → hostSpending hasRealCount gate (guestCount | guestEstimate | guests[] | guestCountResolved)
              → food contribution is 0 until a REAL count exists
lodging kind  → kitchen gate (foodSpanNote) → food/supplies contribution
              → hostSpending → budget surfaces
raises        → surfaceRegistry 'vendor-payments' (:887), 'vendor-unbooked' (:343)
              → raiseAll → eventPlan → route
```

### Measured propagation, quoted from `hostSpending.js`

> "skipping a food line moves $280 → $105, skipping a supply $53 → $48, locking
> a price $280 → $115"

And a measured *failure* that was fixed: the Santa Fe 80th carried **$333 of
groceries for a kitchen the app had just said does not exist**, because the food
sheet honoured the kitchen gate and the budget did not.

### Two rules this control encodes that the redesign must preserve

1. **A guessed headcount must not become budget money.** `hasRealCount` gates
   the food contribution to 0 otherwise — "that guess is fine for a labeled
   preview, but it must NOT become budget money."
2. **No parallel math.** `hostSpending` deliberately calls the *same*
   `playbookFoodPlan` the food panel renders — "single source, no parallel
   math." `budgetFor.js` exists because five readers had each picked a different
   rule for "what is the budget."

---

## 3. The comparison

| Question | **Proven control** (vendor/guest/lodging → money) | **Venue** |
|---|---|---|
| Canonical fact | `vendor.status`, `guestCount*`, lodging kind | `event.venue*` (7 raw fields) |
| Writer | vendor edit surfaces; creation; lodging answer | `venueFor.setVenue` (+ grandfathered raw writes in App.js) |
| Reader | `vendorMoney`, `budgetFor`, `hostSpending` | `venueFor` — 30 consumers |
| Recompute mechanism | **derive-on-read through a hub** (`hostSpending`) | **derive-on-read, no hub** |
| Cross-domain effects | vendors→money, guests→food→money, lodging→kitchen→food→money | venue→money, weather, lodging basis, tasks, start time, vendor brief, parking |
| Raises / blockers | `vendor-payments`, `vendor-unbooked`, `dues-unpriced` | **none of its own**; contributes `addressSettled` to `vendor-unbooked` |
| `eventPlan()` effect | direct — vendor raises rank into next action | **indirect only** |
| Route | `sheet.kind` `budget`, `vendors`, `costshare` | `sheet.kind === 'venue'`, `event-venue` focus |
| Persistence | event blob (`vendors[]`, `budget[]`, `guestEstimate`) | event blob (`venue*`) |
| Browser/E2E proof | vendor + money e2e present; measured $ deltas in source | `venueSourceProof.test.js` (source-proof, **not** browser) |
| **Creates new questions on transition** | ❌ no | ❌ no |

---

## 4. What this comparison actually tells us

The control and the gap case **share the same propagation mechanism** and it
works. The difference between them is not architectural depth — it is:

1. **Attention production.** The control has three raisers; venue has none of
   its own. This is a *coverage* difference, not a *mechanism* difference.
2. **A hub.** The control has `hostSpending` as a named aggregation point where
   cross-domain rules live and are tested. Venue's 30 consumers each read
   `venueFor` independently, so venue-driven cross-domain *rules* (e.g. "an
   unknown capacity blocks the seating plan") have nowhere to live.
3. **Neither can express a derived question.** The missing primitive is shared.

### Therefore — against the brief's four options

| Option | Verdict |
|---|---|
| 1. Additional domain-specific propagation | **Not needed.** Derive-on-read already propagates venue to 30 consumers. |
| 2. Broader `surfaceRegistry` coverage | **Yes — this is the main one.** Venue, food, money, schedule, tasks, weather have no raiser. This is additive, low-risk, and uses a proven mechanism. |
| 3. A thin generalized consequence contract | **Yes, but only for one thing** — the derived *open question*. Not RECALCULATE (derive-on-read already does it), not BLOCK/UNLOCK (raises + `eventPlan` already do it). The contract needed is narrower than the brief's six verbs: essentially **ASK**. |
| 4. Combination | **This.** (2) + the narrow (3). |

**Recommended smallest viable contract:** a surface may raise an item whose
`severity`/kind marks it as *an unanswered question created by a known fact*,
carrying the fact that created it. This fits the existing raise shape
(`{surface, domain, severity, title, why, route, key, …}`) and needs **no new
pipeline** — `raiseAll` → `eventPlan` → route already carries it. The brief's
RECALCULATE / UNLOCK / BLOCK / REVIEW / CREATE / RESOLVE vocabulary is larger
than the evidence supports; four of the six already exist implicitly.

**Not decided here.** This is the evidence-backed recommendation; the
architecture call is the owner's.
