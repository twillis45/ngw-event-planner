# Lodging Listing UI — what the leaders display, and what transfers

> Published as artifact https://claude.ai/code/artifact/2057dcd0-c32d-4ef5-853e-9259f4e3624b.
> Keep the two in sync.

Date: 2026-08-01 · Source: Mobbin (iOS) — Airbnb, Booking.com, Vrbo, Expedia, Trip.com, Agoda,
Skyscanner, Tripadvisor, Zillow, KakaoTalk

Companion to [`2026-07-29_MOBBIN_COMPETITIVE_READ.md`](2026-07-29_MOBBIN_COMPETITIVE_READ.md), whose
lodging section covered *architecture* (one trip object, modality-named details). This one covers
**pixels: what a listing actually shows.**

---

## ⚠ Scope first — most of this library is for a job we deliberately do not do

Our ruling stands: **the app never searches Airbnb or Vrbo.** The host already found the house. Our
job is the *return trip* — turning a pasted results page or an unfurled listing into a decision, a
cost, and a backup. `lodgingSearchLinks` hands off to the platforms and that is the right call.

So the transferable material is **not** the search funnel. It is:

| Pattern | Transfers? | Why |
|---|---|---|
| Card anatomy — what a candidate row must carry | ✅ **Directly** | Our `candidatesFromGroups` output renders as cards |
| Price display semantics — nightly vs total vs fees | ✅ **Directly, and it is the biggest one** | We already take the *last* price off a strike-through pair |
| Comparison surfaces | ✅ **Directly** | Our shortlist *is* a comparison |
| Missing-data rendering | ✅ **Directly** | Unfurl fails on Vrbo; we must show absence honestly |
| Post-booking / reservation view | ✅ | The closest thing to our committed pick |
| Search filters, map search, sort | ❌ | We hand off |
| Scarcity and urgency pressure | ❌ **Reject** | See the section below |

---

## 1 · Card anatomy — the field census

Every card in the set, decomposed. This is the checklist for what a candidate row can carry.

| Field | Airbnb | Vrbo | Booking.com | Trip.com | Tripadvisor |
|---|---|---|---|---|---|
| Photo | 1, tall | 1 + 2 thumbs | 1 | 1 | 1, carousel dots |
| Save control | heart, top-right on artwork | heart, top-left | heart, top-right | heart | heart |
| Badge on artwork | `Guest favorite` pill | — | — | — | award medallion |
| Title | **"Apartment in San Juan"** — type + place | long descriptive name | property name | property name | **"11. Yabar Hotel Plaza"** — rank prefix |
| Distance | — | **"1.97 mi from Bangkok City Centre"** | "Near Pham Ngu Lao" | "Near Tan Son Nhat Airport" | — |
| Capacity | — | **"Condo · Sleeps 16 · 4 bedrooms"** | "2 beds · 1 bedroom · 1 bathroom" | — | — |
| Size | — | — | "Entire apartment – 54 m²" | — | — |
| Rating | `★4.84` inline with price | — | `9.1 Wonderful · 74 reviews` chip | `4.1/5 Very Good · 20 reviews` | green circles + count |
| Cancellation | — | "Free cancellation until Sep 17" (green) | — | "Free Cancellation" (green) | "Fully Refundable Options" |
| Price | **"$126 for 2 nights"** | **$16,800** + `$20,529 total` | "Per night $102" then "2 nights: ~~$276~~ **$204**" | **$17** + "Total (incl. taxes & fees): $19" | "from **$54**" |
| Dates | — | "Wed, Oct 1 – Thu, Oct 2" | — | — | — |
| Urgency | — | — | "Only 1 left at this price" (red) | — | — |

### The three findings that matter

**Airbnb's card title is a type and a place, not a marketing name.** "Apartment in San Juan",
"Room in Southeast Washington". The *listing's* own headline is demoted to the detail page. For us
this is a gift: an unfurled listing's title is often marketing junk, and `"House in McHenry"` derived
from type + city is both cheaper to extract and more scannable than whatever the host pasted.

**Vrbo is the only one that puts capacity on the card** — `Sleeps 16 · 4 bedrooms`. That is exactly
our must-have axis. Note it says *Sleeps*, and our own scar says **`beds` is never written as
`sleeps`** — "8 beds" is not "sleeps 8". Vrbo shows both concepts as one number; we must not.

**Nobody shows one price.** Every app shows at least two of {per night, total, total incl. fees}, and
the pairing is always small-label-plus-large-number. More on this next.

---

## 2 · Price display — the honesty problem, and the best answer in the library

### The patterns, ranked by honesty

| App | What it shows | Read |
|---|---|---|
| **Agoda** | A **first-run tutorial** offering three price modes: `Base per night` / `Total stay include taxes and fees` / `Average per night` — the user picks the semantics | ⭐ **Best in library** |
| Trip.com | `$17` large, `Total (incl. taxes & fees): $19` small beneath | Honest, both visible |
| Vrbo | `$4,000` large, `$4,539 total` underlined beneath | Honest, both visible |
| Booking.com | `Per night $102` then `2 nights: ~~$276~~ $204` | Honest, but three numbers in one card |
| Airbnb | `$126 for 2 nights` — one number, scope stated in the label | Cleanest; scope is *in the sentence* |
| Skyscanner | `$268 a night` + `More deals from $348` + provider logo | Aggregator — price belongs to a *seller*, not the property |
| Expedia | `~~$2,073~~ **$1,731**` + "includes taxes & fees" + "$302 per night" | Three numbers plus a discount claim |

**Agoda's move is the one to steal.** A coachmark on first run lets the user choose what a price
*means* for the rest of the session. It converts an unresolvable design argument — nightly or total? —
into a stated user preference. That is our propose-don't-ask doctrine applied to a unit.

**Airbnb's is the cheapest.** `$126 for 2 nights` needs no second line because the scope rides the
sentence. Compare our own money doctrine: unit nouns and named scopes. Same instinct.

### Direct hit on our parser

Booking.com, Expedia and Trip.com all render `~~struck~~ payable`. Our measured page fact —
***"price is `$1,997 $1,668` (strike-through, then payable) → take the LAST"*** — is confirmed as the
correct rule across three more platforms, not just Airbnb. Worth locking in a test.

---

## 3 · Comparison surfaces — this is our shortlist

Three real comparison UIs exist in the library, and they resolve the same problem three ways.

### Vrbo — "Compare stays" · [screen](https://mobbin.com/screens/accca64c-ac77-4b11-bc62-b2503d061287)

Three columns side by side, horizontally scrollable. Per column: photo · name · type icon
(`Villa` / `Aparthotel`) · `2 bedrooms / 2 bathrooms / Sleeps 4` · review chip · date range ·
**price + total** · then an amenity block of `✓ / ✕` rows — Pool, Hot tub, Kitchen — with a `View`
button at the foot.

**Two details worth copying exactly:**

- Where a property has no review score it renders **`-`**, not a blank and not a zero. Explicit
  absence, same instinct as Blink's em dash.
- `✓` is green, `✕` is grey — **not red.** A missing hot tub is not an error. This matters for us:
  a candidate lacking a must-have is *disqualifying*, but it is not a *fault*, and colouring it red
  would violate our own semantic map.

### Expedia — "Compare" · [screen](https://mobbin.com/screens/fc7c0e6d-205c-4acf-a5a7-fcd62860c387)

Two columns, denser. Adds star rating, neighbourhood, `8.8/10 Excellent · 442 reviews`, bed config,
a scarcity line, the struck price pair, `includes taxes & fees`, `$302 per night`, then `✓ / ✕`
amenity rows. Same skeleton as Vrbo with more rows.

### Zillow — the table transpose · [screen](https://mobbin.com/screens/7f98c4e0-c014-4e8c-90e5-ec6fc207e60f)

The most structurally interesting. Properties are **columns**; attributes are **labelled rows** down a
sticky left rail — Status, List Price, Zestimate, Estimated monthly cost, Price/sqft, Bedrooms,
Bathrooms, Square feet — with **grouped section headers** (`Interior`) breaking the rail into
sections. Above the table, a `Tags` row of chips (`Price`, `House size`, `Style of home`) marks which
attributes differ.

**Why this is the right model for us and the card-column one is not:** our comparison axis is
*must-haves*, and must-haves are a known, finite, named list (beds, sleeps, distance, price, backup
status). A labelled left rail makes a missing value visible as a gap in a known row. Vrbo's card
columns hide a missing attribute by simply not rendering it.

---

## 3b · HotelTonight — the card that does the most with the least

HotelTonight's card is the strongest single listing component in the library, and it is dark-native —
which means it is the only one whose composition transfers to Studio Matte without translation.

### Anatomy

```
┌─────────────────────────────────────┐
│ [1 room left]              ♡        │  ← scarcity overlay TL, save TR, on the photo
│                                     │
│         full-bleed photo            │
│                                     │
│ [SOLID]                    [DEAL]   │  ← taste badge BL on photo · deal badge magenta
├─────────────────────────────────────┤
│ Hilton Garden Inn Times Sq   $189   │  ← name left, price right, LARGE
│ 👍 91% | 0.5 km - Times Square       │
│                        was on HT $210│  ← price HISTORY, not RRP
│ ⌁ Free WiFi   ⌁ 24h Gym              │  ← two amenity micro-chips, icon + label
└─────────────────────────────────────┘
```

### Four decisions worth taking

**1 · The taste taxonomy is categorical, not ordinal.** `BASIC` · `SOLID` · `HIP` · `LUXE` ·
`HIGHROLLER`, each with its own colour. This is not a star rating — **HIP is not better than SOLID, it
is different.** It answers "what kind of place is this?" in one word, which a star rating can never do.

Directly applicable: our event types already use identification colour at low intensity that does *not*
count against the semantic budget (UX_02's `evtCLR` exception). A lodging *character* badge —
`house` · `cabin` · `hotel` · `condo` — is the same class of signal and inherits the same exemption.

**2 · The rating is a thumbs-up percentage, not stars.** `👍 91%`. One number, no half-symbols to
render, no 4.63-vs-4.84 false precision. Scans instantly at card size.

**3 · The struck price is the app's own history**, not a fictional RRP. `was on HT $210` means *we
listed this at $210 before* — a checkable claim about themselves rather than an unverifiable claim
about the market. Compare Expedia's `~~$2,073~~ $1,731`, which asserts a reference price nobody can
audit.

Ours would be **`was $412 when you saved it`** — honest, checkable, and genuinely useful when a host
returns to a shortlist built three weeks ago.

**4 · `Why these hotels?`** sits at the foot of the list as a plain button. The curation explains
itself on demand. We rank candidates by must-have fit and currently never say so.

### The composition lesson

The photo does the emotional work; the info strip is a flat dark band with **zero decoration** — no
borders, no shadows, no rounded chips except the badges. Name and price on one baseline, metadata
muted beneath. That is exactly the division of labour UX_01 already mandates, executed on a dark
ground.

---

## 3c · Hotels are a different object from rentals

Our lodging model assumes **one property = one booking**. Hotels break that, and a destination event
with eleven people is far more likely to need rooms than a whole house.

| Concept | Whole-house rental | Hotel |
|---|---|---|
| The unit | the property | **a room type** within the property |
| Price attaches to | the property | **a rate plan** within the room type |
| Quantity | always 1 | **N rooms** — the block |
| Capacity | `Sleeps 16` | *per room*: "guaranteed to fit 2 people" |
| Cancellation | one policy | **per rate plan** |

### How the leaders model it

**Booking.com** ([room options](https://mobbin.com/screens/55b568c2-e539-4ea1-9ff4-18ad4343f5fa)) nests
three levels: property → room type → rate plan. Each room type carries bed config, size in m², and an
amenity checklist. Beneath it, *selectable rate cards* with a radio control, each stating
`Free cancellation before Mar 18` · `No prepayment needed – pay at the property` · price. Quantity is a
**`1 unit ▾` dropdown** with a delete affordance — that is the room block, and it is the primitive we
lack entirely.

**The group blocker is the best pattern here.** When a room type cannot hold the party, Booking.com
renders it as a **disabled card reading "These options won't accommodate your entire group"**
([screen](https://mobbin.com/screens/d633d3b9-3a67-46da-8a5a-e7a1f3f01f7e)) — visible, self-explaining,
unselectable. For a host sizing rooms against a roster, that is the exact behaviour we want when a
candidate fails the head-count must-have.

**HotelTonight** states capacity as a *guarantee with an exception*:
> *"Rate displayed is per night, per room. Each room is guaranteed to fit 2 people. Extra guests are at
> the hotel's discretion and may be subject to additional fees."*

Note what that sentence does — it names the unit, the guarantee, and who decides the edge case. Our
`beds` ≠ `sleeps` rule is the same instinct; this is the sentence that expresses it to a host.

### What we would need

A hotel candidate cannot be stored in the current shape. Minimum additions: `roomType`, `ratePlan`,
`unitsNeeded`, `perRoomCapacity`, and a cancellation policy that hangs off the rate rather than the
property. **Scope before building** — this is a schema change, and it interacts with the per-day
programme keystone.

---

## 3d · Honesty patterns from the hotel set

Three moves that are stronger than anything in the rental apps.

**"We do not verify reviews."** HotelTonight prints this in its `Need to Know` list. A platform stating
the limit of its own social proof is rare, and it is precisely our doctrine — say what you do not know,
in place, without being asked.

**Negative amenities as a first-class list.** HotelTonight ships a whole card of what a hotel *lacks* —
`No fitness center.` `No pets.` `No minibar.` `No food or beverage options at the hotel.` `No bar
onsite.` `No breakfast available.` — each with a struck-through icon. Every other app in the set shows
only what a place *has*, leaving absence to inference.

For a host checking must-haves this inverts the work: instead of scanning a list of 55 amenities to
confirm something is missing, the absence is stated. **This is the strongest single argument for the
Zillow-transpose shortlist** — same principle, applied to comparison.

**Priced amenities carry their price.** `Valet parking $65/night.` · `No self-parking.` ·
`Dogs OK under 40 lbs, $150 flat fee.` · `Service fee of $35 per night per room collected by hotel.`
An amenity is not a boolean when it costs money — and a $35/night/room service fee across four rooms
for three nights is $420 that never appears in the headline price.

**`Need to Know` as plain operational bullets.** Check-in 15:00, checkout 12:00, photo ID and credit
card required, 21+ to book, non-smoking. No legalese, no accordion. This is the hotel equivalent of our
day-before plan, and the register is right: flat declarative sentences about what will actually happen.

### One commit-gesture worth noting

HotelTonight's final booking step is **"Trace the Logo to complete your booking"** — a gesture, not a
tap, drawn over the HT bed glyph. Same family as Blink's swipe-to-clock-in: *friction proportional to
irreversibility*. Ours already has a `commit` haptic (`10`) and a `seal` verb in the 17-verb
vocabulary; the gesture is the visual half we have not built.

---

## 4 · The detail page — Airbnb's section order

Read across the captured screens, in order:

1. **Photo carousel** with an `2/27` counter bottom-right
2. **Title** — "Private bedroom in Manhattan Upper East Side" — then `Room in New York, United States`
   and `1 queen bed · Shared bathroom`
3. **Three-up stat row**, divider-separated: `4.96 ★★★★★` | `🏆 Guest favorite` | `298 Reviews`
4. **Host row** — avatar, "Stay with Allison", `Superhost · 7 years hosting`
5. **"Where you'll sleep"** — a card per sleeping area with its bed config
6. **"What this place offers"** — icon + label list, then `Show all 55 amenities`
7. **"Where you'll be"** — map, neighbourhood named, expand control
8. **"About this place"** — prose, `Show more`
9. **Cancellation policy / House rules / Safety & property** — each a short list with `Show more`
10. **Reviews** — big `4.96` between laurels, "top 5% of eligible listings", horizontally scrolling
    review cards, `Show all 298 reviews`
11. `Report this listing`

Persistent throughout: a **sticky bottom bar** — `$356` underlined, `For 2 nights · Sep 5–7`,
`✓ Free cancellation`, and a `Reserve` button.

### Two things Airbnb does that we should

**Provenance on translated content.** *"Some info has been automatically translated. `Show original`"*
— [screen](https://mobbin.com/screens/b284e5ef-afbb-447b-8e42-8737fb9acaa3). A machine touched this
text and the page says so, with a route back to the source. That is our grounding doctrine, applied
to a listing description. **Our unfurl transforms listing text too, and says nothing.**

**Amenities are icon + plain label, never chips.** Five to seven visible, the rest behind a count.
No chip soup — matching our own three-chips-per-row rule.

---

## 5 · The return trip — the closest screen to our committed pick

Airbnb's **reservation view** ([screen](https://mobbin.com/screens/bb3a9535-0ef0-4dc6-b2de-bbf5113ebc15))
is what a listing becomes *after* it is decided, and it is the nearest analogue to our lodging
surface once a pick is committed:

- `In 3 months` chip over the photo — **relative time, not a date**
- `Home in New York` / `Hosted by Allison`
- A two-column card: **Check-in** `Fri, Sep 5 · 7:00 PM` | **Checkout** `Sat, Sep 6 · 1:00 PM`
- Then action rows, each icon + title + subtitle:
  `Getting there` / *311 East 91 Street* · `House manual` / *Instructions and house rules* ·
  `Message your host` / *Allison*

**The whole marketing apparatus is gone.** No rating, no reviews, no price, no amenities, no
scarcity. Once the decision is made the surface holds only *what you need to arrive and behave*.

That is a strong argument for our committed-pick state being a **different composition**, not the
candidate card with a checkmark on it — and it lines up exactly with the board's finding that
**leaders promote state to a named surface while we carry it as a parameter.**

---

## 6 · What to reject

The library is saturated with pressure devices that are correct for a marketplace and wrong for us:

- `Rare find! This place is usually booked` (Airbnb, pinned above the sticky bar on every scroll)
- `Only 1 left at this price on Booking.com` (red)
- `We have 5 left at 17% off` (Expedia)
- `We have 1 left` with a red dot (Booking.com)
- `It only takes 2 minutes` (Booking.com, a yellow interstitial band)
- `$169 off` + `Genius Discount` chips, `Silver Tier Deal 38% Off`, `New Guest Offer`

**None of it transfers.** These exist to move inventory the platform sells. We sell nothing, we hold
no inventory, and a host deciding where eleven people sleep is not a shopper to be hurried. Under
UX_02 every one of these would spend `--warn` or `--crit` on a commercial nudge rather than an
operational state — which is precisely the amber-"now" trap the gap board already caught us in.

**The one honest urgency signal worth keeping the shape of:** Booking.com renders an option that
cannot work as a **disabled card reading "These options won't accommodate your entire group"**
([screen](https://mobbin.com/screens/d633d3b9-3a67-46da-8a5a-e7a1f3f01f7e)) — it stays visible,
explains itself, and cannot be selected. That is honest degradation, not pressure, and it is exactly
how a candidate that fails a must-have should read.

---

## 7 · Recommendations for Event Boss

Ranked by how much they close a real gap in what we already ship.

1. **Adopt the Zillow transpose for the shortlist.** Named attribute rows down a left rail, candidates
   as columns. Missing data becomes a visible gap in a known row instead of an absent element. This is
   the single highest-value item here, because our comparison axis is a finite must-have list.
2. **Render absence as `-`, never blank, and never zero.** Vrbo does this on review score. We have a
   live case: Vrbo unfurl declines from a datacenter IP, so some candidates *will* arrive thin.
3. **Show two prices, or state the scope in the sentence.** Either Vrbo's `$4,000` + `$4,539 total`,
   or Airbnb's `$126 for 2 nights`. **Never one bare number.** Our own scar — three listings with
   visible prices and a recommendation that said *"I couldn't weigh what any of them cost"* — was a
   plumbing bug, but a bare unlabelled number would have hidden it longer.
4. **Consider Agoda's price-mode choice** for the destination case, where nightly-versus-total is
   genuinely ambiguous across a multi-night span.
5. **Mark what the unfurl derived.** Airbnb marks machine-translated text and offers the original. Our
   unfurl parses, normalises and infers — and says nothing. This is the same gap we just criticised
   Blink for.
6. **Give the committed pick its own composition**, not the candidate card in a "chosen" state.
   Airbnb's reservation view drops every marketing element and keeps only arrival facts.
7. **Green `✓`, grey `✕` — never red** for a missing amenity. Disqualifying is not faulty.
8. **Ship none of the scarcity vocabulary.**

---

## Sources

Mobbin iOS, read 2026-08-01. Screens cited inline. Apps: Airbnb, Booking.com, Vrbo, Expedia,
Trip.com, Agoda, Skyscanner, Tripadvisor, Zillow, KakaoTalk.

**Not claimed:** no pricing accuracy, no A/B or usage data, no exact type sizes (Mobbin re-renders at
roughly a third of native width), and no hands-on with any of these products. Everything above is read
off captured screens.

**Our-side claims** come from [`project_lodging_return_trip`](../../../CLAUDE.md) and the gap board's
lodging section; the `beds` ≠ `sleeps` rule and the take-the-last-price rule are prior measured facts,
not new findings.
