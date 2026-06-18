# Sprint UX-6 — Intake Deconstruction Audit

**Date:** 2026-06-18 · **Mode:** AUDIT ONLY (no redesign, no relabel, no new systems)

**Question:** what is the minimum a host must answer before reaching their first planning
screen? **Assume every additional field reduces activation.**

**Verdict up front:** the engine needs **two answers — event TYPE and DATE — and nothing
else** to deliver first value (a playbook, a timeline-to-date, a typical-setup budget, and a
concrete next step). **Zero fields in the 7-step intake are required before planning.** The
intake is, almost in its entirety, a planner-software artifact: it front-loads data collection
the host should never face before they've gotten value — and one whole step (Client Contact)
exists only because the product began as a planner CRM.

---

## Classification key
**RB** Required *before* planning · **RL** Required *later* (after first value, at the moment
it's used) · **OPT** Optional (delight/refinement) · **PO** Planner-only (delete from the host
path) · **DEL** Delete (no one needs it as an intake field).

## A. Pre-intake — the Create modal (already gates first value)
| Field | Class | Why |
|---|---|---|
| **type** | **RB** | Drives the playbook, kit, vendor categories, budget model. The one true prerequisite. |
| **date** | **RB** | Drives countdown, timeline-to-date, shopping windows. The second true prerequisite. |
| name | OPT | Identity only — defaultable to "My {type}". Nice, not required. |
| secondaryType | OPT | Refines the playbook; defaultable. |
| guestCount | RL | Powers budget/food/seating — but it's the *first planning action* ("Add your guests"), not a gate. Reach the screen first, then add. |
| totalBudget / estimator | OPT | The playbook already gives a typical-setup budget; host refines later. |
| venue | RL | Anchors arrival/day-of; needed at the schedule stage, not to start. |
| theme / market / timeOfDay | OPT | Flavor + estimate inputs; all deferrable. |
| honoree / honoreeSong / honoreeDrink | OPT | Delight; capture contextually if at all. |
| audience | RB-ish (persona) | Not event data — it's the *persona switch*. Keep, but it's identity, not intake. |

**Read:** Create already over-asks. Only **type + date** are load-bearing.

## B. The 7-step intake — field by field

**Step 1 · "The Celebration" (meaning) —** `meaning_host` `honoree_story` `feeling_words`
`must_have_moment` `meaning_why` `meaning_people` `meaning_cry_moment` `meaning_avoid`
`honoree` `honoree_song` `honoree_drink`
→ **All OPT.** This is the emotional core that powers Event Identity / "What Matters Most" —
genuinely valuable, but **never required to begin planning**, and best captured *contextually*
(a light "what matters most?" prompt once the host is in), not as an 11-field wall up front.

**Step 2 · "Client Contact" —** `clients[].firstName/lastName/email/phone/preferredContact`,
`address_street` `address_city` `address_state_zip` (PRIMARY + SECONDARY CLIENT, MAILING ADDRESS)
→ **All PO / DEL.** A self-host **is** the account — there is no client to contact, no mailing
address to collect. This entire step exists only because the workflow originated in planner
CRM software. **Delete from the host path** (relocate to the planner-only flow).

**Step 3 · "Guest List" —** `guestEstimate` (RL — the first action) · `guest_confirmed`
`ceremony_seats` `reception_seats` `plus_one_policy` `rsvp_method` `rsvp_deadline`
`children_policy` `dietary_notes` `accessibility_notes`
→ **guestEstimate = RL; the rest = RL/relocate.** These belong to **contextual collection
inside the Guests surface** (asked when seating/RSVPs/dietary actually happen), not a form at
intake. Collecting RSVP method and dietary notes before a single guest exists is pure
data-completeness theater.

**Step 4 · "Budget Overview" —** `total_budget` `budget` (category breakdown) `budget_priority`
`budget_remaining` `deposit_paid_amount`
→ **All OPT / RL.** The playbook ships a typical-setup budget; the host refines in the **Money**
surface when they have real numbers. `deposit_paid_amount` is a *post-vendor* fact — only
useful after a vendor exists (RL, relocate to the vendor record).

**Step 5 · "Look & Feel" —** `style_vibe` `color_palette` `floral_direction` `lighting_notes`
`inspiration_notes` `ceremony_type` `officiant` `ceremony_length` `ceremony_time`
`cocktail_time` `dinner_format` `first_dance_song` `special_rituals`
→ **All OPT.** Vision/aesthetic detail. None gates planning. Several (`officiant`,
`ceremony_*`, `first_dance_song`) are **wedding-only** and shouldn't appear for other hosts at
all. Relocate to contextual capture at the vendor/run-of-show stage.

**Step 6 · "Vendor Priorities" —** `priorities` `mustHaves` `dealBreakers` `vipConcerns`
`vendor_notes`
→ **All RL.** Only useful **after another planning action** (choosing/comparing vendors).
Collect in the Vendors surface, not before the host has met a single vendor.

**Step 7 · "Review & Confirm"** → **DEL** (for hosts). A review-and-confirm gate is a
planner sign-off ritual; a self-host doesn't "confirm an intake," they just plan.

## C. Answers to the five questions
1. **Required before planning:** `type`, `date`. (Plus the persona/`audience` switch, which is
   identity, not event data.) **Nothing in the intake.**
2. **Collectible after first value:** guest count, budget, venue, vendor priorities, RSVP /
   dietary / seating details, look-&-feel — *all of it.*
3. **Exists because of planner-software origin:** the entire **Client Contact step** (clients,
   mailing address), **Review & Confirm**, `deposit_paid_amount`, `preferredContact`, and the
   "Intake Confidence" chore-card framing.
4. **Only useful after another action:** vendor priorities/deal-breakers (after a vendor),
   `deposit_paid_amount` (after a vendor), seating/RSVP/dietary (after guests), `budget_remaining`
   (after budget entries).
5. **Should move from intake → contextual collection:** meaning (→ a light Host Home/Identity
   prompt), guest details (→ Guests), budget (→ Money), look-&-feel + ceremony (→ vendor/run-of-
   show), vendor priorities (→ Vendors).

---

## Final answer — minimum questions before the first planning screen

> **Two: "What are you planning?" (type) and "When is it?" (date).**

That's the whole gate. From those two, the engine already produces a playbook, a
timeline-to-the-date, a typical-setup budget, and the first next step ("Add your guests"). A
name can default (`My {type}`) or be the only optional third field. **Everything else — all
seven intake steps — is RL / OPT / PO / DEL and must not stand between a host and first value.**

**The deconstruction, stated plainly:**
- **Delete from the host path:** the Client Contact step (planner CRM), Review & Confirm,
  `deposit_paid_amount`, `preferredContact`.
- **Defer (collect at the moment of use):** guest details, budget detail, vendor priorities,
  look-&-feel, ceremony specifics.
- **Relocate to context:** meaning → a light prompt on Host Home / Identity; guests → Guests;
  budget → Money; vendor priorities → Vendors; deposit → the vendor record.
- **Keep at the front:** type + date. Optionally name.

**Does the intake deserve to exist in its current form?** **No — not for hosts.** As a
front-loaded 7-step questionnaire it is a planner instrument that taxes activation for
data the host doesn't need yet. The host product needs **no host intake** at the front: create
asks type + date, the host lands on a planning screen, and every other field is gathered *in
context, when it's actually used.* The planner intake can remain for planner accounts, where a
client genuinely must be interviewed.

*(Audit only — no fields removed in this sprint. This defines what a future Host Intake / "no
intake" change should delete, defer, and relocate.)*
