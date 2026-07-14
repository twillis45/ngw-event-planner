# NGW Host Shell V2 — Complete Engine & Doctrine Gap Audit

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/240f4b6a-4f60-488b-aa5e-4e2528012048. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-08 · Source: artifact `240f4b6a`

**NGW Event Planner · Host Shell V2**

Every production intelligence engine in `demo/src`, compared against what the V2 prototype (`demo/hostv2`) actually wires — plus doctrine compliance, live contracts, and what shipped from the findings the same day.

| | |
|---|---|
| Date | July 8, 2026 |
| Method | 5 parallel deep-readers + manual source verification + live Chrome checks |
| Scope | ~90 lib modules · App.js 46,769 lines · HostShellV2.jsx 2,696 lines |
| Fix sprint | shipped & live, commit `518d0d5` |

## Contents

- 01 — Confirmed live defects
- 02 — Doctrine violations
- 03 — Systemic parameter defaults
- 04 — Engines absent from V2
- 05 — Imported but shallow
- 06 — Do not port
- 07 — Load-bearing contracts
- 08 — The taxonomy alias bug
- 09 — Fragile invariants
- 10 — Backlog implications

> **Overall verdict:** V2 is a disciplined port — Rule 1 (single point of truth) came back clean, CTAs degrade honestly, crab pricing is scrupulous, no hex literals, no bounce. The failures cluster in three places: engines wired against the **wrong return shape** (silently dead UI), **sample data outrunning its labels**, and a **large host-live engine surface** that simply hasn't been brought over yet — led by the guest self-RSVP loop and the vendor cockpit cluster.

---

## 01 — Confirmed live defects

Agent findings verified by hand against engine source before being accepted. All were real; all are now fixed and live-verified.

### The essentials system was entirely dead — **Fixed**

`deriveEventPhaseProgress()` returns `{phase, label, completedCount, totalCount, progress, summary, nextCue}` — it never returned an `items` field. V2 read `phaseCues.items` in five places (tile ledger, essentials rail, "next:" naming), so every read was `undefined` and the UI silently fell back to `plan.progress`. The engine's counts, summary, and routed `nextCue` were computed and thrown away.

**Fix:** `items[]` added additively to all three phase builders in the production lib (15/15 tests green); V2 tile now reads the engine's own `completedCount / totalCount / nextCue`; the per-item rail renders real rows. Live-verified: tile shows "2 of 4" essentials distinct from "basics 4 of 4", with the ranked next cue named.

### "Who's helping" could never render — **Fixed**

`deriveHelperResponsibilities()` returns an object `{helpers, responsibilities}` (`helperResponsibility.js:123`); V2 treated it as an array — `.length` on the wrapper is `undefined`, so the helper count and the whole helpers section were unreachable.

**Fix:** rows come from `.responsibilities` (helperName/label/status), the "N helping" count from the deduped `.helpers` people list. Live-verified: "Space, seats & helpers — 1 helping" and "Denise · Bring the big cooler and ice — Assigned to Denise, but not confirmed".

### Lessons capture had disappeared — **Fixed**

`lessonDraft` state existed but the After stage rendered no input — only recall (`lastLesson`) survived, contradicting the project memory's claim that capture shipped. **Fix:** capture restored on After (past events only) through the canonical `eventMemory.setLesson / getLesson` (200-char cap lives in the lib). Live-verified on the past Graduation event.

### Minor dead wiring — **Fixed**

- `estimatorConfidence` imported, never called — removed.
- Debug read `ctx.identity`; the field is `ctx.eventIdentity` — corrected (identity now logs).
- Engine `dietFlags` (per-item dietary watch tags merged from roster `needs` + `dietCounts`) were never rendered — now shown on spread rows. This exposed a second bug: V2's stepper key `'Shellfish allergy'` never matched the engine's `DIET_KEYWORDS` key `'Shellfish'`, so shellfish flags could never fire. Renamed; live-verified shellfish tags on Blue crabs and Steamed shrimp.
- Dead `pct`/`pctAnim` variables (a one-line-edit away from a percentage violation) — deleted.

---

## 02 — Doctrine violations

| Severity | Finding | Doctrine | Status |
|---|---|---|---|
| P0/P1 | Collapsed weather pill presented the hardcoded sample forecast ("Rain likely on your event day") with **no sample marker** — the disclosure lived only in the expanded body. Expanded copy asserted fabricated precision ("from the hour-by-hour read"). | No fake intelligence; inferred output always labeled | **Fixed** — "Sample forecast ·" leads the collapsed line; timing line reads "sample timing for this preview, not a live read" |
| P1 | The Day's advance was session-only `dayIdx`; "Done" recorded nothing, so "N moments queued" never decremented and progress died on reload. | Rule 2 — raw fields feed the truth layer | **Fixed** — day-of taps persist `event.rosDone` (production contract); The Day resumes at the first open cue; preview walks stay session-only by design |
| P1 | Checklist pillar showed "**73%**" — the engine's raw note rendered verbatim to a host. | Rule 4 — host words, never percentages | **Fixed** — remapped to "6 of 11 done" from the same timeline the pillar scores |
| P1 | After tab renders planner category budget rows (`l.category … $actual of $budgeted`) to the host for sample events with a planner ledger. | Rule 4 — ONE totalBudget number, never category rows | **Open** |
| P2 | Planner vocabulary in host copy: "Lock at {N}", "the menu can lock now", "$X locked", "lock it"; "closeout"/"reconcile" in the After eyebrow and empty copy. | Rule 4 / planner-language docs | **Open** |
| P2 | Raw color literals outside theme.js: danger tint `rgba(232,64,54,.14)` at 4 JSX sites + `styles.css`; steel rgba in glow/spotring. A palette change won't propagate. | Rule 7 — Studio Matte via theme.js only | **Open** — add `--danger-tint` + steel-alpha tokens |
| P2 | Budget-sheet allocation rows show engine estimates ("$X bought of $Y") without an "est." marker. | Source-of-truth UX — estimates carry markers | **Open** |
| P2 | Small pockets of re-derived intelligence: `guestNumber` re-derives headcount vs `guestCountResolved`; `upNext` re-parses `T-Nd` offsets; day-before rows and blocker cards **discard the engine's own `route`/`cta`** and re-derive routing with local regexes; the store-pick→price-band lock heuristic (~line 2450) is V2-local pricing logic. | Rule 1 / row-level CTA rule | **Open** |

**Rule 1 (single point of truth): clean.** `ALL_PLAYBOOKS` is used only for sanctioned catalog listing; food plan, ros, decisions, capacity, risks, checklist, attendance band, and the crab ladder all flow through canonical accessors. **Rule 3 (one question, one place): clean today**, but only because `venueBlockerShown`/`needsCity()` gating keeps the venue and city asks mutually exclusive — see §9.

---

## 03 — Systemic parameter defaults

Not bugs individually — a pattern. Every engine call in V2 silently accepts a default the original threads deliberately:

| Parameter | V2 passes | Consequence |
|---|---|---|
| `priceFactor / foodPP` | `1` everywhere (hostSpending, playbookFoodPlan, buildExperienceContext, reveal stages) | Every dollar shown is national-average; the original threads `getFoodPriceFactor(event.state)` regional pricing |
| `profile` | `null` everywhere | hostIntel's learned-attendance adjustment (±25%, confidence-gated) can never apply |
| `estimateTotalRange` opts | no `timeOfDay`, no `metroFactor` | Budget estimates carry no evening premium and no metro premium |
| `expectedFromPlanned` 3rd arg | omitted | Playbook `attendanceClass/attendanceFactors` overrides ignored — turnout band is always the keyword default |
| `eventDateStatus` opts | no `minLeadDays` | The `'rushed'` status can never fire |
| Reveal identity | hand-rolled stub (`confidence: 0.8`, `isCompound: false`) + `eventPlan(custom, null)` | Compound/ceremony blockers (`ceremony-timing`, `dress-code`) and risks (`compound-confusion`, `weather-ceremony`) can never fire for a V2-created event — while the real classifier output sits unused in `ctx.eventIdentity` |

---

## 04 — Engines host-live in production, absent from V2

Each verified to render on a host-persona surface in the original. Grouped by what they'd change for the host.

### The guest loop — the single biggest gap

| Engine | What the host loses without it | Original wiring |
|---|---|---|
| `api/rsvp.js` + `PublicRsvpRoute`/`RSVPFormView` | Guest self-RSVP via `?rsvp=CODE` link — attendance/meal/allergy chips, plus-one, kids, note, mailing-address gate, add-to-calendar, "I'm in" forward, honest offline outbox | `App.js:31714 / 29988`; outbox `ngw-rsvp-queue-*`; merge at `:31990` |
| `csvParsers.js` | Guest & vendor CSV import from 8 platforms (The Knot, Zola, Paperless, Evite, Partiful…), merge modes, export | ImportWizard / VendorImportWizard / ExportMenu |
| `guestMode.guestPlanningMode` | The count-only / rsvp-tracking / unknown distinction (V2 uses only the boolean gate) | 5 reply-pressure gates in App.js |
| Gift & thank-you fields | `giftReceived / thankYouSent` tracking per guest (phaseProgress wrap-up reads `thankYouSent`) | Guests tab, closeout |

### Narrative & continuity intelligence

| Engine | Powers | Original wiring |
|---|---|---|
| `returnNarration.js` | One "Since last time: …" line on every host tab, diffed from a localStorage snapshot (`ngw-return-snap-*`), suppressed when the hero already says it | `App.js:40436→43458`, HostEventShell |
| `nextActionRenderer.js` | The persona backbone (`audiencePersona`) + host-voice rewrite of the hero action's title/consequence/CTA | `CommandCenter.jsx:1563` |
| `planHeroCopy.js` | Plan-tab scoped hero (settle_overdue / settle_ready / shopping / allset) | `App.js:42610` |
| `eventContextNudges.js` | Culturally-aware, dismissible nudges (juneteenth, memorial, retirement, graduation, babyshower…) on Guests/Food/Program | `App.js:43515/43539/43563` |
| `disclosure.js / upcomingRail` | Stage-aware dormant sections + a "Coming up later" rail so early hosts aren't shown vendor/food surfaces prematurely | `App.js:24239` |
| `momentLibrary.js` | Authored "moments that matter" menu — one tap drops a moment into the run of show | `App.js:35354` |

### Memory & learning

| Engine | Powers | Original wiring |
|---|---|---|
| `decisionMemory.js` | Capture WHY at decision time (`event.decisionMemory[]`), outcome chips (`event.outcomes`), payoff read-back in the host's own words | `App.js:43365, 42304–42439` |
| `eventMemory.js` | Cross-event private vendor track record ("Used 3× · 2 on-time · rehired") + the lessons API (V2 now uses `setLesson/getLesson`) | VendorPlanningWorkspace:829; `App.js:42445` |
| `hostIntel.js` | Learned attendance read-forward (clamped ±25%, gated on confidence & stability), closeout reconciliation ("how'd it go?"), Settings "what Event Boss remembers" | `App.js:10292, 22216, 17486` |
| `closeoutIntel.js` (beyond `isPastEvent`) | `needsActual / needsCloseout / pendingCloseouts` — the confirm-final-count loop that feeds the learning layer | `App.js:22421, 23835` |
| `readinessHistory.js` | Readiness sparkline (`ngw-readiness-hist-*`, records on change, caps 30) | `App.js:5706, 46370` |

### Money & food depth

| Engine | Powers | Original wiring |
|---|---|---|
| `budgetCopy.js` | Budget hero with truthful states (unset/waiting/under/near/over; 15% headroom threshold) — never calls estimates "spent" | `App.js:42635` |
| `budgetRecovery.js` | Over-budget recovery plan: safe_cut / tradeoff / ask suggestion classes, protected items (paid vendors, rain plan, honoree moment), no invented savings | `App.js:27703` |
| `foodShopItems.js` + `effectiveItem.js` | The normalized shopping-line projection (FOOD-2 seam) feeding the order flow and Instacart handoff | `App.js:10518, 23970, 22987` |
| `taskEngine.js` | `effectiveDone` — tasks proven done from event facts ("Inferred"), so the checklist doesn't nag about things the data already shows handled | `App.js:43998, 44001` |
| `foodPrices.js` / `estimatorFactors.js` | Regional BLS price factor; date/time-of-day/service-tax/contingency estimator factors | `App.js:17201, 12812, 28232` |

### Day-of & venue

| Engine | Powers | Original wiring |
|---|---|---|
| `weather.js` live subset | `geocodeVenue`, `getEventWeatherRisk` (One Call 3.0, 14-day gate, heat as first-class risk), `weatherLogistics` (ice lb/guest math, shade/water), `rainPlanGap`, `computeRainWindow`, `RAIN_PLAN_TARGET` — V2 has only the 6 copy-side helpers on a sample forecast | `App.js:37841–37946` |
| `placeIntelligence.js` | The 7-section "Location check" card (venue, arrival, parking, rain, load-in, contact, rules) | `App.js:41443` |
| `rosOverlap.js` | Run-of-show time-conflict count | `App.js:34905` |
| `locationAssist.js` / `maps.js` | Location status classifier, weather coords fallback, Google Places autocomplete (host-confirmed) | `App.js:37869, 17259` |
| `syncStatus.js` / `demoSeed.js` / `legacyCopy.js` | Sync badge; demo-event tooling; load-time data-heal migrations (banned copy, polluted city fields) | `App.js:23793, 23277, 45513` |

### The vendor cockpit cluster — largest missing block

| Engine | Powers | Original wiring |
|---|---|---|
| `vendorIntelligence.js` (16 exports) | COI requirement/state/next-action, lifecycle stage, challenge summary, readiness, portfolio summary — the host-live slice is `getVendorCOIState` on the day-of roster | `App.js:34855`; full surface in VendorPlanningWorkspace |
| `vendorAccountability/` | Promise inference from vendor records, missing-proof, follow-up questions, accountability tiers, follow-up drafts | `App.js:6460, 39045` (VendorModal) |
| `vendorBrief.js` / `vendorBriefConfirm.js` | Whitelisted shareable vendor brief (excludes money/notes/COI) + confirm-back lifecycle writing `status='Confirmed'`, on-site contact, log | `App.js:8019, 7951` |
| `payLinks.js` / `docusign.js` / `storage.js` | Venmo/PayPal/CashApp/Zelle deep links; e-signature send + envelope status; contract/COI file uploads. Payment recording is honest: "Money moved: None — this is a record, not a charge", with Undo | `App.js:7059, 7232, 7295` |
| `vendorCategoriesByType.js` | Curated vendor lists + missing-category nudges per event type | `App.js:41197` + create flow |

### Unused doItForMe drafts

V2 wires 6 of ~16 generators. Missing: `draftGuestBrief`, `draftHelperBrief`, `draftDietaryNote`, `draftRecap`, `draftDayBeforeDetails`, `draftVendorReconfirm`, `draftVendorPaymentReminder`, `draftVendorBriefAsk`, `draftGuestUpdate`, `draftParkingInstructions`.

---

## 05 — Imported but shallow — dropped return fields

| Module | V2 drops | Why it matters |
|---|---|---|
| `eventPlan()` | `workstreams`, `vendorReadiness`, all of `planningState` (blockedDecisions, milestones, recommendation lifecycle, deepLink, reasoning, confidence) except a console.debug | The engine's own sequencing/explanation layer is computed and discarded |
| `getEventReadiness()` | the `decision` axis; per-axis `label` | Overdue-decision health signal never shown (V2 substitutes the decision board pill) |
| Reveal stages | `icon, status, sourceEngines, confidenceLabel, mark`; blockers' `route, blockerType` | Confidence + source transparency never surface; V2 re-implements blocker resolution instead of using the engine's continuity route |
| `buildExperienceContext()` | ~14 of 16 fields, incl. `eventIdentity`, `humanContext`, `recommendations/assembledState`, `activeRisks`, `reasoning`, `confidence` | Only `decisionBlockers` (via unresolvedBlockerStages) is consumed |
| `weatherImpactByEventPhase()` | `primaryPhase, affectedPhases` (per-phase summaries/CTAs), `shouldPromptRainPlan/GuestUpdate` | Only headline + confidence used |
| `deriveEventCompressionSummary()` | `doNow / considerSwap / canSkip / totalUrgent / level` | The substance of compression — V2 shows only the headline; per-task chips (`taskUrgencyChip`) unused |
| `buildDayBeforePlan()` | per-section `route, cta, items, open`; `openCount`; `moment.sub` | Engine's row-level deep links discarded for a local regex |
| `rsvpDeadlineFor()` | `hard, source` | Soft "as soon as you can" vs firm-date distinction lost |
| `buildCrabPlan()` | `role, targetCrabsPerPerson, coverageStatus, costComplete, costPerPerson, handled`; V2 redefines its own UNIT/SIZE labels instead of importing the lib's | Coverage state machine unused |
| `expectedFromPlanned()` | `planned, planning, note, class` | The "size-to ceiling" and the no-show explainer never shown |
| `positiveAttention` | the `attentionActive()` persona gate | Wins render unconditionally where the original gates them |
| `playbooks` unused exports | `playbookDayOfChecklist, topPlaybookDecision, playbookAbout, playbookSetupPreview, playbookMilestones, playbookInfraPrompts, sizingGuests`… | Most consequential: The Day has no day-of checklist; Create has no occasion descriptions |

---

## 06 — Do not port — dead or planner-only in production

**Dead in prod** — `becauseLayer.js` and `valueConfidence.js` — the fields they render (`h.because`, `h.valueLevel`) are never populated anywhere; the classifiers are never called; and their render surface (HealthList) is `!isHost`-gated anyway. The backlog item "explainability flags" is therefore **not a port** — it needs field producers built first.

**Planner-only** — `decisionConfidence.js` ("Where decisions stand") renders only behind `!isHost` (DecisionsBlock, `CommandCenter.jsx:3244`) — a genuine candidate for a host surface, but currently not one. `presentationLabels.js` / `confidenceGrammar.js`: real engines whose main surface is the `!isHost` HealthList. `vendorQuestions.js` / `vendorCopilot.js`: planner cockpit only, not a host-parity gap.

---

## 07 — Load-bearing contracts (mapped for the build)

### The guest RSVP loop

- **Route:** `?rsvp=CODE` → resolve local event by `rsvpCode||id`, else backend `fetchPublicInvite`; not-found gets an honest dead-link state.
- **Outbox:** `ngw-rsvp-queue-${eventId}`; entry = payload + `idempotencyKey` (persisted per `ngw-rsvp-idemp-${eventId}:${code}`) + `submittedAt`. Re-submit replaces the same-key entry. 7-day PII TTL purge; 5 retry attempts; flush on mount + `online`.
- **Payload:** name/firstName/lastName · rsvp (Yes/No/Maybe) · meal (only when Yes; Standard/Vegetarian/Vegan/Gluten-Free) · needs (chips: Nut allergy, Shellfish, Dairy-free, Egg, Kosher, Halal, Wheelchair access + Other) · plusOne fields (gated `plusOnePolicy !== 'no_plus_ones'`) · kids (gated `kidsPolicy !== 'adults_only'`) · note · mailingAddress (gated `event.collectAddresses`).
- **Host merge** (`App.js:31990`): purge stale → name-match *exact* → *last+first (last ≥3)* → *first-only (≥4)* → merge fields (meal only on Yes; `data.x || g.x` for the rest; note → `partyNotes`, mailingAddress → `address`) or append a new guest → `removeItem(key)`.
- **No backend configured:** local write counts as delivered — the same-browser host merge shows it.
- **Confirmation extras:** .ics + Google Calendar (zone-aware), guest-voice "I'm in" forward (primary at delivered-YES), quiet share link, social-proof line derived only from real yeses ("Be the first to say yes" at zero, suppressed for somber events).

### Day-of progress (`rosDone`)

`event.rosDone = {[cueId]: true}` — single write site in production (`App.js:23575`, "persist ONLY the per-cue done flag, never a full ros snapshot"). `effectiveRos()` (`playbooks/index.js:901`) overlays it on the derived schedule so the plan keeps tracking time-of-day. V2 now writes this on day-of Done taps.

### Event persistence (`ngw-events`)

Debounced `useEffect` serializes the whole events array to `localStorage['ngw-events']` + Supabase upsert (`App.js:45800`); quota-exceeded prunes import batches and retries. All mutations funnel through `setEvents` (`onPatchEvent`, scoped `setEvent`). `storage.js` is unrelated — it's the Supabase Storage contract for binary files (contracts, COIs).

---

## 08 — The taxonomy alias bug, precisely located

`resolveCanonicalType()` resolves in order: exact key → exact alias → case-insensitive both → **ordered `KEYWORDS` regex pass over the whole raw string, first match wins** (`eventTaxonomy.mjs:213–223`). The Get-Together catch-all (`:180`) contains the token `backyard` — and the named food playbooks (Crab Feast, Fish Fry, Crawfish Boil…) have **no KEYWORDS entries at all**. So "crab feast for 20 in the backyard" matches nothing until the catch-all sees *backyard* and returns Get-Together: **a venue word decides the event type**.

**Fix belongs in the lib, not V2:** remove `backyard` from the `:180` regex (venue is resolved separately) and add earlier KEYWORDS entries for the named food playbooks. Then delete V2's exact-mention-first workaround — every consumer (intake, solve previews, budget bands) is fixed at once.

---

## 09 — Fragile invariants — correct today, easy to break

- **CTA honesty** rests on `wiredKind` staying complete: new engine domains fall back to the honest toast, but restyling that fallback as a primary CTA would resurrect the button-that-lies.
- **Crab pricing** stays reference-only only because no default price is ever written into a line (`pricePerUnit` stays undefined until the host taps or types one).
- **Sample weather** must stay inside the ≤14-day window (`d > 14` guard mirrors `getEventWeatherRisk`) — drift leaks fake rain into unforecastable ranges.
- **Venue/city single-ask** depends entirely on the `venueBlockerShown` / `needsCity()` gates staying in sync with blocker derivation.
- **No-percentage rule**: the `pct`/`pctAnim` trap is deleted, but the readiness pillar notes come from the engine — the "73%" remap must survive future pillar additions.

---

## 10 — Backlog implications

1. **Broken-wiring sprint** — *shipped* same day (commit `518d0d5`): all §1 defects, the weather labeling, rosDone persistence, the checklist percentage, the shellfish key.
2. **Public self-RSVP invite page** — unchanged as the headline feature; the full contract is in §7, so it's specification-complete. *In build*
3. **Thread `priceFactor` + `profile` through V2's engine calls** — new systemic item; every dollar V2 shows is national-average until this lands.
4. **Use engine routes** — swap V2's regex routing (day-before rows, blockers) for the engines' own `route`/`cta` fields; adopt `taskEngine.effectiveDone` in the checklist.
5. **Re-scope "explainability flags"** — becauseLayer/valueConfidence need producers, not ports; decisionConfidence needs a product decision to become a host surface.
6. **Fix `resolveCanonicalType` in the lib** (§8), then delete V2's workaround.
7. **Remaining P1/P2 doctrine items** — After-tab category rows, lock/closeout vocabulary, theme tokens for danger/steel tints, "est." markers.
8. **Vendor cockpit cluster + live weather keys** — the two big engine blocks still waiting (§4).

---

Audit run 2026-07-08 · five parallel deep-readers over demo/src (App.js, CommandCenter.jsx, ~90 lib modules) and demo/hostv2 · every severe claim re-verified against engine source before acceptance · fix sprint live-verified in Chrome against the dev server, then deployed (pages run 28963584974, bundle index-65363052.js).
