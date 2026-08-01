# The Ice Purchase Model

**Date:** 2026-08-01. ASCII-only. Phase 5F.3 Step 0.
**Purpose:** the reasoning behind an ice recommendation, so a correction can be judged
rather than copied.

---

# 1. Why ice is not a universal constant

Ice is the only line in the corpus that is consumed by the **environment** as much as by
the guests. A pound of ice bought for an indoor dinner party is still a pound of ice at
serving time. A pound bought for an August cookout is a fraction of a pound by the time
the second cooler is opened.

That makes ice unlike every other per-guest quantity NGW plans:

| | driven by | stable across venues? |
|---|---|---|
| protein lb/guest | appetite | mostly yes |
| drinks/guest | thirst, duration | mostly yes |
| **ice lb/guest** | **thirst AND ambient heat AND exposure time AND refill behaviour** | **no** |

So a single number is wrong by construction. The corpus already reflects this: 29
playbooks carry `p_ice` at **five different rates** (1.0, 1.25, 1.5, 2.0, 2.5), and the
spread tracks environment rather than guest count. That is not inconsistency to be
normalised away - it is the model working, undocumented.

**This document makes it explicit so corrections stop being judgement calls made twice.**

---

# 2. The categories

## 2.1 Indoor baseline - ~1.5 lb/guest

Controlled temperature, drinks served from a bar or fridge, ice used for chilling and
in-glass service rather than for cooling a cooler against ambient heat.

**Evidence:** `bar-provision-2026` states **ice ~1.5 lb/guest (12-15 bags per 100)** as
standard US party drink provisioning.

**SCOPE LIMIT - the most important line in this document.** That source is a *bar*
provisioning guide. Its ice figure sits inside a claim about drink service where alcohol
is offered. **It does not cover a dry event**, and citing it for one would be attributing
a claim the source does not make. See section 2.4.

## 2.2 Outdoor / heat exposure - ~2.0 lb/guest

Coolers standing in ambient heat, lids opened repeatedly, service running hours. Ice is
being spent on *melt* as well as on drinks.

**Evidence:** `reddy-ice-2026` publishes 1-2 lb per person and its own worked
**outdoor BBQ** example computes to **2.1 lb/guest** (50 guests = 15 seven-pound bags =
105 lb).

**Interest disclosure, recorded with the source:** Reddy Ice is a packaged-ice
manufacturer and profits from a higher figure. Treat 2.0 as a ceiling-leaning planning
number, not a measured mean. It *corroborates* the corpus's authored 2.0 for outdoor
events; it does not independently establish it.

## 2.3 Unknown / mixed - no default

An event that is neither clearly indoor nor clearly outdoor, or whose venue is not known
at plan time.

**The rule: do not silently pick either value.**

Choosing the higher number quietly wastes a host's money and looks like caution.
Choosing the lower one quietly risks the failure the corpus itself flags as
"COMMONLY UNDER-BOUGHT". Both are guesses wearing the authority of governance.

A mixed case may be **grounded without a value change** when two conditions both hold:

1. the authored value already equals a category baseline, and
2. the source's scope genuinely covers the event.

Grounding a number that is already right is a low-risk act - it adds traceability
without asserting a new fact. **Moving** a value in a mixed case is not, and requires a
human decision recorded as such.

## 2.4 Exceptions - the recommendation changes for a stated reason

| Exception | Why the category baseline does not apply |
|---|---|
| **Dry events** (no alcohol) | `bar-provision-2026` is bar-scoped. A repast, a daytime shower with no bar, a children's party - the indoor 1.5 is out of scope and NGW currently has **no source** that covers them |
| **Boils and fries** | A crawfish boil authored at 2.5 exceeds anything either registered source supports. Cold-holding live shellfish and icing down drinks are different jobs |
| **Short events** (<2h) | Exposure time is an input; the baselines assume a multi-hour event |
| **Very small events** | Bag granularity dominates: at 6 guests, 1.5 lb/guest is 9 lb, and ice is sold in 7- and 10-lb bags |
| **Venue supplies ice** | A catered hall may include it; the line becomes zero, not smaller |

**An exception is not a licence to invent a number.** It is a statement that the
registered sources do not reach this case, and the honest outcome is
`requires human decision` - not a rounded guess.

---

# 3. Where human judgement remains required

1. **Classifying an event.** Signal counting (outdoor/indoor keyword density) is a
   *hint for a human*, not a classifier. This document deliberately specifies no
   automated classification.
2. **Deciding whether a source's scope reaches an event.** Only a person reads
   "bar provisioning" and concludes it does not cover a funeral repast.
3. **Weighing a source's interest.** "A packaged-ice vendor profits from a higher
   figure" is a judgement no fetcher makes.
4. **Every value move.** Grounding an already-correct number is mechanical. Changing
   one is a claim, and claims go through review.

---

# 4. What this model does NOT authorise

- Normalising the five authored rates to one number.
- Rounding an ambiguous case toward whichever source was cited most recently.
- Citing `bar-provision-2026` for a dry event.
- Citing `reddy-ice-2026` for an indoor event (its example is explicitly outdoor).
- Publishing a value no registered source supports - including the authored 2.5 on
  Crawfish Boil, which currently has no backing.

---

# 5. Open source gaps this model exposes

| Gap | Consequence |
|---|---|
| No dry-event ice guidance | Repast, Game Night and similar cannot be grounded at all today |
| No source above ~2.1 lb/guest | Crawfish Boil's authored 2.5 is unsupported |
| No duration-scaled figure | Both sources assume a typical multi-hour event; neither states a rate per hour |
| No small-event guidance | Bag granularity is unaddressed |

These are the next sources worth acquiring, and they were identified by trying to
classify real playbooks rather than by speculation.
