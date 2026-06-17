# Sprint 56A — Intake Intelligence Audit

*Code-grounded audit of the entire intake experience. No build, no redesign, no runtime change. Question: how do we move intake from **Data Collection → Calculation** to **Discovery → Inference → Guidance** — so NGW feels like an experienced planner asking smart questions, not software presenting forms? Date: 2026-06-17.*

**Governance correction (carried into Part 8):** the proposed anti-pattern name **"AP-002 — Asking For What Can Be Inferred" collides** — AP-002 is already **Persona Fork** (shipped 55M). The new anti-pattern is **AP-003**.

---

## Headline findings (5, all code-verified)

1. **Intake is large and front-loaded:** ~95 distinct questions across three surfaces (NewEventModal ~13, ClientIntakeFlow 7-step ~70, EventDetailsTab ~25). Most are optional free-text that feed AI vendor briefs / ROS — *not* engine reasoning.
2. **Six fields are DEAD** — `vision · priorities · mustHaves · dealBreakers · vipConcerns · commPrefs` are persisted (in the intake `ALLOWED` list, `App.js:28449`) but have **0 runtime readers** (verified by two independent greps). Pure cost, zero value.
3. **The "subjective budget tiers" concern is partly misplaced.** There is **no** `Shoestring/Classic/Premium/Luxury` event-level selector. The real tiers are **`good/better/best` = `Classic/Signature/Luxury`** (`App.js:2911`), picked **per budget category** during estimation and **not even stored** (only the resulting amounts are). The user is **not** asked to classify their venue's cost class — the engine uses `profile.metroMarket`. The subjectivity that *does* exist is the per-category tier label (what is "Signature"?).
4. **Venue is inert free-text.** `event.venue` is a string (+ optional `venueTags` that nothing reads). Entering a venue triggers almost no inference — but a **seed already exists**: `COMMUNITY_VENUE_RE` (`App.js:2323`) recognizes VFW/Legion/church/community halls and emits a budget-stretch *hint*. It produces text, not structured inference.
5. **Inference already works where applied** — the positive proof Pattern 012 is feasible: `tables` derived from guest count, `timeOfDay` auto-suggested from type, date-premium/rush **computed not asked**, COI defaulted from venue presence, `playbookCapacity`/`playbookBudgetCategories` derive rentals + budget from type+guests. The principle is real in pockets; intake just doesn't follow it.

---

## Part 1 — Current Intake Map (Question → Field → Consumed by → Status)

### Surface A · NewEventModal (`App.js:7862`) — event creation
| Question | Field | Consumed by | Status |
|---|---|---|---|
| Event name | `name` | display/lists/timeline | **Required** |
| Event date | `date` | timeline urgency, readiness, estimator | **Required** |
| Event type | `type` | templates, budget band, playbook, color, vendor roster | **Required** |
| Secondary type | `secondaryType` | hybrid template merge | Optional |
| Where is it held? | `venue` (free text) | display; weather/community-hint only | Optional |
| Guest of honor / song / drink | `honoree*` | AI vendor briefs, ROS | Optional |
| Event location/market | `market` (transient) | estimator metro factor (not stored) | Derived-input |
| Estimated guests | `guestEstimate` | **per-head budget, seating, estimator, readiness** | **Required (math)** |
| Theme / venue tags | `theme` / `venueTags` | AI briefs / *nothing* (tags) | Optional / **Dead-ish** |
| Total budget | `budget[]` | budget tab | Optional |
| (derived) tables, rsvpCode, timeOfDay | — | seating / portal / ROS | **Derived (good)** |
| catererCount | `catererCount=0` | set later via vendor | Dormant |

### Surface B · ClientIntakeFlow 7-step (`plan/ClientIntakeFlow.jsx`) — ~70 fields
| Step | Representative fields | Consumed by | Status |
|---|---|---|---|
| 1 Meaning | `meaning_host, honoree_story, feeling_words, must_have_moment, meaning_why, meaning_people, meaning_cry_moment, meaning_avoid` | AI briefs, ROS, toasts | Active (soft) |
| 2 Contact | `clients[].firstName/last/email/phone/preferredContact`, mailing address | comms, portal | Active / address optional |
| 3 Guests | **`guestEstimate`** (asked again), `guest_confirmed, ceremony_seats, reception_seats, plus_one_policy, children_policy, rsvp_deadline, rsvp_method, dietary_notes, accessibility_notes` | guestEstimate critical; most = intake note/display | **Mixed** |
| 4 Budget | `total_budget, budget_priority, deposit_paid_amount, budget_remaining` + category checkboxes → `budget[]` | budget rows used; the 4 scalars = note/display | **Mixed** |
| 5 Look&Feel | `style_vibe, color_palette, floral_direction, lighting_notes, ceremony_*, first_dance_song, dinner_format, inspiration_notes` | AI vendor briefs, ROS | Active (soft, design-phase) |
| 6 Vendors | display + `vendor_notes` | brief prep | Display / optional |
| 7 Review | recap (read-only) | confirmation | Display |
| (persisted, **DEAD**) | `vision, priorities, mustHaves, dealBreakers, vipConcerns, commPrefs` | **nothing** | **DEAD** |

### Surface C · EventDetailsTab (`App.js:29444`) — post-creation editor
Venue logistics: `venueAddress, venueContact, venuePhone, venueEmail, indoorOutdoor, loadInNotes, parkingNotes, houseRules, rainPlan, coiNeeded, venueTags`. Mostly day-of/vendor-brief context; `indoorOutdoor`/`rainPlan` feed weather/contingency display.

**Duplicate-ask:** `guestEstimate` is collected in **both** Surface A and Surface B (single storage, two prompts) — the user is asked their guest count twice.

---

## Part 2 — Question Classification (A/B/C/D)

- **A · Must Ask** (cannot be reliably inferred): event **type**, **date**, **guestEstimate** (target), **venue identity** (the *place*, not its category), **client contact** (for client events), the **meaning** prompts (genuinely generative, only the host knows).
- **B · Ask Later** (needed eventually, not at intake): `dietary_notes`, `accessibility_notes`, `parkingNotes`, `rsvp_deadline/method`, `ceremony_seats/reception_seats`, design fields (`floral_direction, lighting_notes, dinner_format, ceremony_*, first_dance_song`), payment scalars (`deposit_paid_amount, budget_remaining`), `vendor_notes`. (Aligns with Pattern 009 — collect dietary at RSVP, not intake.)
- **C · Infer** (should not be asked): venue **category / cost-profile / included items** (from `venue` — the community regex already half-does this), **budget tier** (default from one experience goal), `tables`, `timeOfDay`, date-premium, COI need, seating/rental counts. *(Several already inferred — extend the pattern.)*
- **D · Dead** (remove): `vision, priorities, mustHaves, dealBreakers, vipConcerns, commPrefs` (0 readers); `venueTags` (collected, never read by logic); `budget_priority`, `plus_one_policy`, `children_policy`, `guest_confirmed` (intake note/display only — no runtime consumer).

---

## Part 3 — Budget System Audit
1. **Assumptions today:** per-head bands by event **type** (`lib/budgetEstimator/totalEstimate.js:11`), × guests × **metroFactor** (`profile.metroMarket`, 4 tiers ×0.80–1.65, `App.js:11975`) × **time-of-day** × **date-premium/rush** (engine-computed). Playbook types instead roll up **authored purchases** into 6 categories (`playbookBudgetCategories`, `playbooks/index.js:491`).
2. **What drives the numbers:** **type + guest count** set floor/ceiling; market/date/time refine; **per-category tier** distributes. *(Verified.)*
3. **What the user self-classifies:** the **per-category tier** (`good/better/best`, mix-and-match, `App.js:8721`) and optionally a total budget — **the tier choice isn't even stored.** The user does **NOT** classify their venue's cost class.
4. **What should be engine-owned:** the per-category tier (replace with one experience goal that defaults all categories); venue cost-profile (infer, don't ask); the engine already owns market/date/time/playbook math — keep.

**Correction to the sprint premise:** the "Home / VFW / Community Center / Hotel Ballroom → users classify differently" concern doesn't match the code — users are **never** asked to classify venue cost. The genuine subjectivity is "what does *Signature* mean to me?"

---

## Part 4 — Venue Intelligence Audit
- **Current state:** `venue` = free-text string + `venueTags` (unread). After entry, the only logic is: (1) `COMMUNITY_VENUE_RE` (`App.js:2323`) → VFW/Legion/church/community-hall → a budget-stretch **text hint** (`App.js:8682`); (2) outdoor-keyword → weather check (`lib/weather.js`); (3) COI checkbox default when a venue exists (`App.js:27596`). Otherwise **inert display**.
- **Inferred today:** indoor/outdoor-ish (keyword), community-vs-not (regex), COI-need. **Absent:** venue **category**, **included items** (tables/chairs/kitchen/bar/AV), **typical capacity**, **typical cost bracket**, parking/restroom/power adequacy (deliberately Never-Infer per Pattern 009/POS-P009-R1).
- **Feasibility (audit only):** a **venue-type lexicon** (Home / community hall / hotel ballroom / restaurant / outdoor / barn …) keyed off the existing regex approach is **feasible and low-risk** for the *included-items / cost-profile / risk-flag* layer (the worked examples — Home→venue≈$0, parking limited; VFW→tables/chairs/kitchen often included, low venue spend; Hotel→catering minimum + staff + AV likely). It must **stay on the safe side of Never-Infer**: surface as *prompts/typical assumptions to confirm*, never as measured adequacy. The community regex proves the recognition step already works.

---

## Part 5 — Budget Tier Replacement Analysis
Replace `good/better/best` (Classic/Signature/Luxury) per-category picks with **experience goals**: *Keep costs low · Comfortable & polished · Memorable & elevated · Exceptional experience*.
1. **Easier for users?** Experience goals — they describe an **outcome the host can feel**, not a price abstraction. (A grandmother knows "keep costs low"; "Signature" is jargon.)
2. **Less ambiguity?** Experience goals — one event-level choice vs N per-category subjective tier picks.
3. **Better for No Guesswork?** Yes — the user states intent; the **engine** maps intent → per-category tiers (it already computes the tiers, just stops exposing them). Removes a self-classification.
4. **Better for future intelligence?** Yes — an explicit *goal* is a durable signal the engine can reason about (and feeds `first_value`/persona work); a transient per-category tier that isn't stored is not. **Recommendation: favorable** — but it's an *intake-mapping* change (1 event-level field → existing tier engine), not new budget math.

---

## Part 6 — Planner Thinking Audit (5 personas: natural vs software)
| Persona | Feels natural (ask first) | Feels like software (cut/defer) |
|---|---|---|
| **First-time host** | "What are you celebrating, when, roughly how many?" | venueTags, per-category tiers, ceremony_seats |
| **Grandmother** | "Where are you having it? About how many coming?" | "Signature vs Luxury", dealBreakers, lighting_notes |
| **Bride** | type/date/guests, "what's the one moment that matters?" | being asked guest count twice; dinner_format at intake |
| **Corporate exec** | date, headcount, budget ceiling, venue | meaning_cry_moment, honoree_drink, floral_direction |
| **Pro planner** | type/date/guests/venue/budget — then *let me work* | 70-field form before any guidance; dead fields |
**What an experienced planner asks first:** *occasion, date, rough headcount, where, and what would make it feel right* — then starts reasoning. NGW asks ~95 questions before it reasons. That gap is the whole sprint.

---

## Part 7 — Friction Score & Top-10s
Scored 1–5 (5 = worst) on Cognitive load · Ambiguity · Duplication · Inferability · Planner-realism:
- **Worst offenders:** the 6 dead fields (load 3 / realism 5 / value 0), per-category tier picks (ambiguity 5), duplicate guest-count ask (duplication 5), 70-field intake before guidance (load 5).

**Top 10 to ELIMINATE (0 runtime value):** `vision`, `priorities`, `mustHaves`, `dealBreakers`, `vipConcerns`, `commPrefs` (dead) · `venueTags` (unread) · `budget_priority` · `guest_confirmed` (redundant w/ guestEstimate at intake) · `plus_one_policy/children_policy` (intake-note only).

**Top 10 to DEFER (ask later, not at intake):** `dietary_notes` · `accessibility_notes` · `parkingNotes` · `rsvp_deadline/method` · `ceremony_seats/reception_seats` · design block (`floral_direction, lighting_notes, dinner_format`) · wedding ceremony block (`ceremony_*, first_dance_song`) · `deposit_paid_amount/budget_remaining` · `vendor_notes` · second `guestEstimate` ask.

**Top 10 INFERENCE opportunities:** venue category · venue included-items/cost-profile · venue risk flags (rain/parking-as-prompt) · budget tier from one experience goal · indoor/outdoor from venue · COI need · seating/rental counts (already via `playbookCapacity`) · budget categories (extend `playbookBudgetCategories` beyond the 5 playbook types) · `timeOfDay` (already) · date-premium (already — never ask).

---

## Part 8 — Product OS Evaluation (evidence-gated)

**Pattern 012 — Intake Is Discovery, Not Data Entry.** *Principle: every answer reduces uncertainty; the engine begins reasoning after the first meaningful answer; never ask for what the system can infer.*
- **Evidence FOR:** inference already works in pockets (tables, timeOfDay, date-premium, COI, playbook capacity/budget) — the principle is feasible, not theoretical. The community-venue regex is a literal "infer from the place" seed.
- **Evidence AGAINST canonical:** today the codebase mostly does the *opposite* (95 questions, 6 dead fields, inert venue). There is **no shipped instance of inference deliberately replacing a question** as a practice.
- **Recommendation → Experimental / Needs Review** (Doctrine Ledger), **Draft** in Product Patterns. Per the Doctrine Promotion Bar (Canonical needs a shipped *functioning* instance), 012 promotes to Canonical only after one intake question is provably replaced by inference (e.g., venue category, or the experience-goal tier). Sound direction; not yet a shipped practice.

**AP-003 — Asking For What Can Be Inferred (incl. Dead Data Collection).** *Failure: asking the user for information the engine can infer, derive later, or — worst case — never uses; every field must earn its existence.*
- **Evidence FOR (strong):** 6 fields collected → persisted → **0 readers**; `venueTags` collected → never read; `guestEstimate` asked twice; per-category tier self-classification the engine could own; venue free-text the engine ignores. Concrete, file-cited, comparable in rigor to AP-001/AP-002.
- **Recommendation → PROMOTE** (Product Patterns, Active). It is the negative companion to Pattern 012, and the dead fields are incontrovertible.

---

## Part 9 — Notion Governance
Applied to existing databases (no duplicates): **AP-003** → Product Patterns (Active); **Pattern 012** → Product Patterns (Draft) + Doctrine Ledger **POS-P012** (Needs Review, Open Obligation = one shipped inference instance); **Decisions Log** → "Remove dead intake fields + experience-goal tier + venue-inference spike" (Open, since implementation is recommended); Product OS governance note. Naming collision corrected (AP-003, not AP-002). See the chat report for links.

---

## Deliverable — EXECUTE / TEST / PARK / KILL
| Bucket | Item | Why |
|---|---|---|
| **EXECUTE** | Remove the 6 DEAD fields + `venueTags`-as-collected (data hygiene; 0 readers) | Zero-risk, pure friction removal; the cleanest AP-003 fix |
| **EXECUTE** | De-duplicate the guest-count ask (one entry point) | Two prompts, one field |
| **TEST** | Experience-goal tier (one event-level goal → existing good/better/best engine, default-with-override) | Reuses the tier engine; reversible; the first shipped Pattern-012 instance → unblocks POS-P012 |
| **TEST** | Venue-category inference spike (lexicon off the existing community regex → included-items/cost-profile/risk *prompts*, confirm-not-assert, Never-Infer-safe) | Proves "infer from the place"; bounded |
| **PARK** | Deferring the Ask-Later (B) block to post-intake phases | Sequencing/UX work; do after the EXECUTE hygiene |
| **PARK** | Extending `playbookBudgetCategories` beyond the 5 playbook types | Content work, not intake-structure |
| **KILL** | Adding any *new* free-text intake field; venueTags revival; per-category tier as a user choice; any inferred venue **adequacy** number (Never-Infer / POS-P009-R1) | Re-introduces the anti-pattern / violates doctrine |

**Confidence:** High on the field map, dead-field, budget, and venue findings (direct code + double-grep). **Weakest assumption:** the "DEAD" verdict rests on static greps — before *removal* (a separate build sprint) a final check for dynamic-key access (`event[x]`) and any serialized export should confirm 0 consumers. The audit recommends removal; it does not perform it.
