I now have the real taxonomy grounded. The codebase has 4 EVT_CATEGORIES but the 6 lenses describe 5 archetype *families*. The key mapping insight: the existing `EVT_PARENT` taxonomy must be refined into 5 intake families (the current "Weddings & Celebrations" bucket conflates full-service celebrations with host-driven socials, and "Corporate"/"Social & Fundraising" contains travel-led retreats). I have everything I need to write the spec.

---

# Client-Intake Rules Spec — Engine-Driven, Family-Selected

**Board-chair synthesis of 6 lenses into ONE implementable spec.** The event's type → family selects the rule set. Grounds against real code: `ClientIntakeFlow.jsx` (1313 lines, 7 hardcoded steps), `App.js` `EVT_CATEGORIES`/`EVT_PARENT` (line 1926), `isAtHomeType` (1954), `isCorporateType` (1952), `proposedVendorCategories`, `BudgetEstimateHint`, creation budget at `budgetRange` (App.js 1839/9885).

---

## 0. The family taxonomy (the selector)

The current `EVT_PARENT` has 4 buckets but they don't match intake needs. Add a derived **intake family** (5 values) — a thin classifier over existing types, NOT a schema change:

```js
// INTAKE family — the one value that selects the rule set.
function intakeFamily(type, secondaryType = '') {
  const t = type || '';
  if (isAtHomeType(t)) return 'home_hosted';            // Dinner Party, Housewarming, Get-Together
  if (isCorporateType(t)) {
    if (/retreat/i.test(`${t} ${secondaryType}`)) return 'travel_led'; // Team Retreat
    return 'corporate';                                 // Conference, Board Meeting, Product Launch, Town Hall, Training, Award, Client Dinner, Holiday Party
  }
  if (/bachelorette|bachelor|wellness retreat/i.test(`${t} ${secondaryType}`)) return 'travel_led';
  if (/wedding|elopement|vow renewal|quincea/i.test(`${t} ${secondaryType}`)) return 'full_service';
  if (/shower|birthday|sweet 16|gender reveal|graduation|retirement|anniversary|engagement|reunion|proposal/i.test(`${t} ${secondaryType}`)) return 'host_driven';
  return 'full_service'; // safe maximal default
}
```

The 6 lenses unanimously agree on these 5 families. This function is the entire selector — everything below keys off its output.

---

## 1. Section spec — per family (ORDERED show / hide / new)

Sections are components, not steps. The family picks which render and in what order. (Replaces the fixed `STEPS[1..7]` → `StepMeaning, Step2..Step7` map at `ClientIntakeFlow.jsx:1040`.)

### Family 1 — `full_service` (Wedding, Quinceañera, Vow Renewal, Elopement)
**This is the reference/maximal intake — the form the current flow was secretly built for. It changes least; its richness becomes conditional on this family rather than shown to all.**

| Order | Section (component) | Notes |
|---|---|---|
| 1 | **Recap chip** (name/type/date/venue, read-only) | From creation. Kills the dead Step1 (`:236–282`) re-asking name/type/date/venue. |
| 2 | **The Celebration / Meaning** (`StepMeaning`, full depth) | honoree_story, meaning_people, meaning_cry_moment, meaning_avoid, honoree_song/drink. The one family where this fully belongs. |
| 3 | **Client Contact** (`Step2` full) | primary + secondary client (co-clients), mailing address. |
| 4 | **Guest List** (`Step3` full) | ceremony/reception seat split (`isWedding`, :365–378), plus-one + children policy, RSVP, dietary, accessibility. |
| 5 | **Look & Feel** (`Step5` full) | palette, floral, lighting + `isWedding` ceremony/first-dance block (:695). |
| 6 | **Cultural & Ceremony** (NEW — accessibility lens) | tradition, officiant, rituals via `VENDOR_CULTURAL_TAGS` (App.js:1786), languages, AVOID. Only this family gets it. |
| 7 | **Vendor Priorities** (`Step6` full) | `proposedVendorCategories('Wedding')`. |
| 8 | **Budget recap** (read-only chip + allocation) | See §2. No re-entry. |
| 9 | **Review** (`Step7`) | |

**HIDE:** corporate Objectives/Stakeholders/AV · travel lodging/itinerary/per-person budget · home-hosted "handling yourself" checklist.

---

### Family 2 — `home_hosted` (Dinner Party, Housewarming, Get-Together) — **biggest reduction win**
**Target: 3 short sections, one screen, answerable in under 2 minutes at the kitchen table. Voice = a friend helping you host, not an account manager.**

| Order | Section | Detail |
|---|---|---|
| 1 | **You & the occasion** (NEW, merged) | ONE field "What should we call you?" (first name) + email OR phone (one method, optional, "so we can text you reminders") + "What are we celebrating?" + ONE line "What would make this a good night?". Replaces `Step1` + `Step2` + all of `StepMeaning`. |
| 2 | **Guests** (stripped) | headcount range ("about how many?") + dietary/allergies (host is cooking — this genuinely matters) + ONE optional "anyone need step-free access?" line. Nothing else. |
| 3 | **⭐ What are you handling yourself vs. want help with?** (NEW — the defining section) | Checklist, every row defaults to **"I've got it"**: Food (cooking myself / potluck / ordering in / want catering help) · Drinks (got it / want help) · Space (my place is ready / need rentals — chairs/tables) · Cleanup · Music/playlist. **This replaces Vendor Priorities entirely.** Only a checked "want help" surfaces ANY later vendor suggestion — pulled in, never pushed. |
| 3a | **Potluck?** toggle (NEW) | If on, reveal a tiny "who's bringing what" line. |
| 4 | **Rough spend** (optional, de-emphasized) | ONE field: "Rough spend you're comfortable with? — totally optional, just helps us suggest the right scale." No breakdown. See §2. |

**HIDE (suppress whole sections, via `isAtHomeType`):** Venue/Reception Venue/Cocktail Hour/Ceremony (the home IS the venue) · Secondary Client · mailing address (it's their home — invasive) · full `StepMeaning` · Look & Feel aesthetic block · Vendor Priorities "STILL NEEDED" gap board · RSVP method/deadline formality · seat split / plus-one / structured accessibility checklist · Cultural & Ceremony · budget category breakdown / deposit / remaining / Typical Setup. **Suppress the Intake Confidence cascade venue gate (`:1176`) and budget gate (`:1179`)** — a home host with no venue/vendors/budget is fully ready. Never show a "0 of N vendors booked" metric here.

---

### Family 3 — `corporate` (Conference, Board Meeting, Product Launch, Town Hall, Training, Award, Holiday Party, Client Dinner)
**Engine SWAPS sections one-for-one (StepMeaning→Brief, Look&Feel→Production), not just subtracts. Every field maps to an objective, approval, run-of-show, or PO.**

| Order | Section | Detail |
|---|---|---|
| 1 | **Recap chip** | name/type/date, read-only. |
| 2 | **Event Brief & Objectives** (NEW — replaces `StepMeaning`) | PRIMARY OBJECTIVE (one sentence) · SUCCESS METRICS · EVENT FORMAT (in-person/hybrid/virtual) · BUSINESS SPONSOR/OWNER · CONFIDENTIALITY (public/internal/NDA). |
| 3 | **Stakeholders & Approval Chain** (NEW — replaces "People Who Matter") | DECISION-MAKER · BUDGET APPROVER + threshold · KEY STAKEHOLDERS/VIPs · day-of POC · PROCUREMENT/LEGAL contact (vendor contracts & COIs). |
| 4 | **Client / Organization** (`Step2` relabeled) | ORG NAME · role/title · BILLING ENTITY + PO/COST-CENTER · AP contact. Drop partner/spouse framing. |
| 5 | **Attendees & Registration** (`Step3` reframed) | headcount + internal/external split · registration/badging method · NDA/security gating · ROOM FORMAT (theater/classroom/banquet/boardroom) · dietary + ADA accessibility (KEPT — legally consequential). |
| 6 | **Agenda, AV & Production** (NEW — replaces `Step5` Look&Feel) | run-of-show/agenda blocks · AV (screens/LED, mics, recording, interpretation) · live-stream/hybrid platform · presenter needs (confidence monitor, clicker, green room, rehearsal) · internet/power · staging/signage · BRAND GUIDELINES LINK (a URL — never a "gold & black" palette text box). |
| 7 | **Vendor Priorities** (`Step6`, already engine-keyed) | `proposedVendorCategories('Conference')` → AV/Tech, Live Streaming, Registration, Speakers, Sponsor/Exhibitor, Printing. |
| 8 | **Budget recap + PO** | total + cost-center/PO reference. See §2. |
| 9 | **Review** (re-sectioned: Objective, Stakeholders/Approval, Headcount, Budget+PO, AV). |

**HIDE:** entire meaning battery (honoree_story, feeling_words, meaning_cry_moment, honoree_song/drink, must_have_moment) · Look & Feel aesthetic (palette/floral/lighting/mood board/first-dance) · all `isWedding` ceremony fields · plus-one / children · honoree concept entirely · pronouns/address-as as personal fields (org-to-org) · Cultural & Ceremony. **Re-key Intake Confidence (`:1171`):** "enough to start" = Objective + Approver + Headcount + AV-known, NOT venue+guests+budget.

---

### Family 4 — `host_driven` (Baby/Bridal Shower, Birthday, Sweet 16, Gender Reveal, Graduation, Retirement, Anniversary, Engagement, Reunion)
**Closest cousin to the wedding flow; mostly works. The one real structural fix: HOST ≠ HONOREE.**

| Order | Section | Detail |
|---|---|---|
| 1 | **Recap chip** | name/type/date. |
| 2 | **The Celebration** (`StepMeaning`, HOST↔HONOREE framed) | The current `meaning_host` vs `honoree` split is RIGHT here. WHO IS THIS FOR (honoree — first-class identity, may have no contact / be a baby) · WHO IS THROWING IT (host = the client who fills intake & pays) · honoree_story · ONE must-have moment · "anything they don't want / **surprise OK?**" (NEW surprise flag — gates how comms/RSVP reach the honoree). **Re-label fields so the planner never asks the host about their own proudest moment.** Calibrate depth by sub-type: Sweet 16 / milestone = deep; casual kids' birthday = collapse cry-moment under "Make it personal (optional)". |
| 3 | **Client Contact** | host primary + optional co-host. No mailing address unless mailed invites. Second contact relabeled "honoree / co-host," NOT co-equal client. |
| 4 | **Guest List** | headcount, RSVP, dietary, kids-attending. Sweet 16 → teen+family split (engine `s16` guestlist). NO ceremony/reception seat split. |
| 5 | **Look & Feel** (LIGHT) | theme/vibe + color palette only (showers/Sweet-16s ARE theme-driven — this is the archetype where Look & Feel earns its place). Hide floral-direction/lighting/officiant/first-dance. |
| 6 | **Vendor Priorities** (LIGHT) | shower/birthday roster: Grazing Table, Balloon Décor, Cake, 360 Booth, Activities, Favors. No officiant/full wedding roster. |
| 7 | **Budget recap** | See §2. |
| 8 | **Review** | |

**HIDE:** ceremony / officiant / first-dance / seat split · corporate Objectives/AV · travel lodging/itinerary · full Cultural & Ceremony (offer a light OPT-IN cultural line only) · secondary client as co-equal party. If home-hosted sub-venue, inherit `home_hosted` venue suppression.

---

### Family 5 — `travel_led` (Bachelorette, Team Retreat, Wellness Retreat)
**Inverts the model: lodging + transport + itinerary ARE the plan; budget is per-person; date is a RANGE not a single day. Hybrid: team/wellness retreats also carry a corporate-funded flag that merges in the approval-chain section.**

| Order | Section | Detail |
|---|---|---|
| 1 | **Recap chip** | name/type + **DATE RANGE (arrive→depart)** — engine flag: travel family needs multi-day. |
| 2 | **Trip purpose** (light) | organizer + group name/purpose + ONE "what's the trip about" line. For team/wellness: borrow **Objectives-lite** (purpose, outcomes) + corporate Approver/cost-center if corporate-funded. NO cry-moment. |
| 3 | **Travel & Lodging** (NEW — replaces Venue) | destination/city · arrival/departure windows · # nights · lodging type (house/hotel/resort/block) + room count · ground transport · who books travel (each person / organizer). |
| 4 | **Itinerary & Activities** (NEW — replaces Look & Feel) | rough day-by-day · must-do activities · free-time balance · facilitator/trainer for retreats. |
| 5 | **The Group** (`Step3` reframed) | headcount · flying vs driving · dietary/allergies (group meals) · mobility/medical opt-in (wellness/active) · **room-sharing preference (ask, don't assign)**. |
| 6 | **Group budget** (per-person OR total toggle) | The defining travel difference — expressed per-head because that's how groups decide. + who's paying (split / one host / company). See §2. |
| 7 | **Vendor Priorities** (travel roster) | Lodging/Concierge, Transport, Activities, Private Chef/Catering, Facilitator. No florist/cake/officiant/photographer-as-vendor. |
| 8 | **Review** | |

**HIDE:** single event date (use range) · single-venue fields (ceremony_time/cocktail_time) · color palette/floral/lighting · `isWedding` ceremony fields · plus-one / children / RSVP-by-mail · per-guest mailing address · cry-the-good-tears depth · Cultural & Ceremony.

---

## 2. Budget — the SINGLE SOURCE OF TRUTH rule

**All 6 lenses converge identically. Resolution:**

1. **Entered exactly ONCE, at event creation** — one optional soft field: `event.total_budget` (a single number or range; "Not sure yet" triggers the engine's `BudgetEstimateHint` range). Never a required gate to start planning.
2. **The creation `budgetRange` radio (App.js:1839/9885) demotes to a hint** that pre-fills `total_budget`. Kill the per-type Discovery range (App.js ~2931) and the Event-Vision `budgetRange` (9885) as separate writes — they all write the ONE field.
3. **Intake NEVER re-collects the total.** Remove the standalone `total_budget` / deposit / remaining free-text inputs from `Step4` (`ClientIntakeFlow.jsx:445`). Deposit & remaining are **Payments-layer derived data** (the existing payment-tracking at :442–456), not intake.
4. **Intake's budget section = READ + ALLOCATE only:**
   - (a) a read-only recap chip: *"Budget: ~$X — set when you created the event,"* with inline edit that writes back to the **same** `total_budget` (mirror the existing Total Budget KPI inline-edit pattern that rescales categories), then
   - (b) the engine's **"Typical Setup" checklist** (`categoryShares` keyed by type+guests+date) seeding an editable, pre-filled category breakdown summing to the total. Planner **allocates**, never retypes.
5. **Per-family shaping of the SAME field:**
   - **`home_hosted`:** ONE optional "Rough spend (food, drinks, extras)" line. **NO category breakdown, NO Typical Setup, NO deposit/remaining, NO "0 of N vendors booked" metric, never a venue budget category.** Skipping it = fully ready; Confidence card treats budget as **not-applicable, not "missing."** Each self-host checklist row can be marked "we're handling this ourselves" (zero-cost, excluded from spend) so a $0 catering line never reads as a gap.
   - **`corporate`:** the one number carries a **COST-CENTER / PO + APPROVAL THRESHOLD** (metadata captured in Stakeholders, ON the number — not a second budget entry).
   - **`travel_led`:** the one number is **GROUP-scoped, expressed per-person** (per-head ↔ total toggle) + who's-paying model.
   - **`full_service` / `host_driven`:** single soft total + Typical Setup allocation. A wedding client who skips it sees a gentle "add a rough number so estimates are useful" — **same field, family-scaled insistence.**

**Net: one budget, entered once at creation, allocated (never re-typed) in intake, shaped per family, honest about $0 for DIY, never a blocker to starting.**

---

## 3. Engine rule mapping — `INTAKE_RULES[family]`

Drop-in object. `show` = ordered component keys; `hide` = explicit suppressions (hidden by family, not greyed); `budget` = the §2 mode; `confidence` = re-keyed readiness gate.

```js
export const INTAKE_RULES = {
  full_service: {
    show:  ['recap','meaning_full','contact_full','guests_full','lookfeel_full',
            'cultural_ceremony','vendors_full','budget_allocate','review'],
    hide:  ['objectives','stakeholders','av_production','travel_lodging','itinerary',
            'handling_checklist','per_person_budget'],
    budget: 'total_soft_allocate',           // recap chip + Typical Setup, gentle nag if blank
    confidence: ['name','type','date','contact','guests'],
  },

  home_hosted: {
    show:  ['you_and_occasion','guests_light','handling_checklist','potluck_toggle','rough_spend_optional'],
    hide:  ['venue','reception_venue','cocktail_hour','ceremony','secondary_client','mailing_address',
            'meaning_full','lookfeel_full','vendors_full','rsvp_formal','seat_split','plus_one',
            'accessibility_structured','cultural_ceremony','budget_breakdown','deposit_remaining',
            'typical_setup','vendor_readiness_metric'],
    budget: 'rough_optional_no_breakdown',   // one line; blank = ready; never a venue budget
    confidence: ['name','type','date'],      // venue/vendors/budget are NOT-APPLICABLE, never "missing"
  },

  corporate: {
    show:  ['recap','objectives','stakeholders','org_contact','attendees_registration',
            'av_production','vendors_corporate','budget_po','review'],
    hide:  ['meaning_full','honoree','lookfeel_full','ceremony','first_dance','seat_split',
            'plus_one','children','cultural_ceremony','pronouns_personal','mailing_address_personal'],
    budget: 'total_with_po_threshold',       // PO + cost-center + approval threshold on the one number
    confidence: ['objective','approver','headcount','av_known'],
  },

  host_driven: {
    show:  ['recap','meaning_host_honoree','contact_host','guests_full','lookfeel_light',
            'vendors_social','budget_allocate','review'],
    hide:  ['ceremony','officiant','first_dance','seat_split','objectives','stakeholders',
            'av_production','travel_lodging','itinerary','secondary_client_coequal','cultural_ceremony_full'],
    budget: 'total_soft_allocate',
    confidence: ['name','type','date','host_contact','guests'],
    flags: ['honoree_first_class','host_not_honoree','surprise_flag','cultural_optin'],
  },

  travel_led: {
    show:  ['recap_daterange','trip_purpose','travel_lodging','itinerary','group',
            'group_budget','vendors_travel','review'],
    hide:  ['single_date','venue','reception_venue','ceremony','cocktail_hour','lookfeel_full',
            'plus_one','children','rsvp_mailed','mailing_address','meaning_cry','cultural_ceremony'],
    budget: 'per_person_group',              // per-head ↔ total toggle + who-pays
    confidence: ['date_range','destination','group_size','lodging_known'],
    flags: ['date_is_range','room_sharing_ask','corporate_funded_merges_approval'],
  },
};

// selection at render:
const family = intakeFamily(event.type, event.secondaryType);
const rules  = INTAKE_RULES[family];
```

This replaces the fixed step map at `ClientIntakeFlow.jsx:1040` and the hardcoded `STEPS` array. The mechanism already exists at the field level (`isWedding`, `isAtHomeType`) — this lifts it to the **family** level (the same swap `isWedding` does for ceremony, but for whole sections), exactly the pattern the corporate and Rams/Zhuo lenses both demand.

---

## 4. Highest-priority change to ship FIRST

**Ship `home_hosted` section suppression — gate the whole intake on `isAtHomeType` so DIY home-hosted events render only: You & Occasion · Guests (headcount + dietary) · "What are you handling yourself" checklist · optional Rough Spend.**

Why this first, not the full engine:
- **It's the loudest, most-abused failure** — every lens flagged it independently; the home/Grandmother and Rams/Zhuo lenses called it the "studio owner's sharpest pain." Asking a housewarming host for a "reception venue," "cocktail hour time," officiant, vendor COI, and a category budget ledger is the bug that makes the tool feel like it doesn't understand the work.
- **`isAtHomeType` already exists** (App.js:1954) — the selector is built; this is a guard + a `display:none` map + suppressing two Confidence gates (`:1176` venue, `:1179` budget), plus building ONE new component (the "handling yourself" checklist). No schema migration, no engine rewrite.
- **It delivers the clearest measurable win** (7 steps → 3 sections, ~2-minute completion) and proves the family-gating mechanism end-to-end, de-risking the corporate swap and the full `INTAKE_RULES` rollout that follow.

**Sequence after:** (2) Budget single-source — delete intake's `total_budget`/deposit/remaining inputs, wire the read-only recap chip (high-value, low-risk, lens-unanimous). (3) `corporate` StepMeaning→Brief + Look&Feel→Production swap. (4) `host_driven` host≠honoree + surprise flag. (5) `travel_led` date-range + lodging + per-person budget.

**Files:** `/Users/toddwillis/Code/ngw-event-planner/demo/src/plan/ClientIntakeFlow.jsx` (step map :1040, Step4 budget :445, Confidence cascade :1171–1179, Step1 dead block :236–282) · `/Users/toddwillis/Code/ngw-event-planner/demo/src/App.js` (`intakeFamily` next to `isAtHomeType` :1954, creation budget :1839/9885, `EVT_CATEGORIES` :1926) · `/Users/toddwillis/Code/ngw-event-planner/demo/src/lib/vendorCategoriesByType.js` (rosters per family).