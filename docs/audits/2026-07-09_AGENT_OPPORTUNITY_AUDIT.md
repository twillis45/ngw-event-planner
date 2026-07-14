# Agent Opportunity Audit — NGW Event Planner

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/43d0c7b5-b9a1-4324-8f99-78af14daaa4c. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-08 (dateline inside the artifact) · artifact last updated 2026-07-09 · Source: artifact `43d0c7b5`

**NGW Event Planner · Engine Audit**

## AI Agent Opportunity Audit

Where agents can create magic moments and do-it-for-me leverage — perceive, reconcile, and execute with one approval, without breaking a single doctrine rule.

Tags: `2026-07-08` · `Audit-only · zero code changed` · `Builds on DIFM-MAGIC-AUDIT-1` · `Live-verified on localhost:3000`

---

## Executive verdict

The app has already built the two hard parts of an agent product — the **cognition** (vendor promise state machine, `eventPlan()` next-actions, 39 provenance-scored playbooks, 17 draft generators) and the **rails** (real email via commApi, DocuSign, Stripe, Instacart, tokenized RSVP and vendor-brief loops). What is missing is the **connective tissue**: the AI call graph is completely flat — one prompt, one text response, nothing chains, nothing acts on results — and every intelligence engine is deliberately derive-only ("NEVER sends," "never writes back"). The opportunity is not more text generation; that space is saturated and was audited yesterday. It is three new verbs: **perceive**, **reconcile**, and **execute with one approval**.

| State | Layer | Detail |
|---|---|---|
| Built | **Cognition** | Promise state machine, next-best-action engine, playbooks, DIFM voice module — the app already knows what needs doing. |
| Built | **Rails** | commApi email, DocuSign, Stripe, Instacart cart, weather, tokenized public loops — real, backend-gated act paths. |
| Missing | **Agent tissue** | Nothing parses what comes back in, nothing applies known fixes, nothing chains a draft to a send. Derive-only by design. |

---

## Baseline — what exists today

Confirmed by four parallel code sweeps across `demo/src` and `backend/app`.

**One canonical DIFM voice module.** `lib/doItForMe.js` — 17 deterministic generators (invite, guest brief, RSVP chase, shopping list, vendor outreach/reconfirm/payment, toast, recap, and more), all edit-before-send, never auto-send, never invent. Yesterday's audits ranked its gaps and shipped the top five.

**One flat LLM seam.** `aiProxy.js` → 8 server-owned OpenAI features plus a GPT-4o vision document extractor returning structured JSON with a built-in disclaimer. Consumed with consistent review-before-apply: budget suggestions pass through `ConfirmTrustDialog`; AI schedule rows carry `aiDraft:true, confirmed:false`.

**Derive-only engines.** `lib/vendorAccountability/` models the vendor chase as a full promise lifecycle (`requested → promised → evidence_needed → confirmed/overdue`) and generates follow-up drafts — but only ever offers copy or mailto. `inferPromisesFromVendor` (`derive.js:284-343`) enumerates the ~15 fields a human currently reads out of vendor replies and types by hand.

| Rail | State | Note |
|---|---|---|
| commApi messaging + email | Live | Real send when backend + `email_configured`; inert in keyless demo |
| DocuSign e-signature | Live | Send envelope + status poll; outbound only, no inbound parsing |
| Stripe checkout | Live | Checkout + subscription sessions, verified |
| Instacart cart | Live | Pre-filled cart via proxy; search-URL fallback |
| Weather (OpenWeather) | Live | Outdoor events within 14 days, forecast-labeled |
| RSVP + vendor-brief public loops | Live | Tokenized, rate-limited, confirm-back stored |
| mailto / sms / tel handoffs | Link-out | 90+ call sites — the default "send" everywhere |
| Pay links (Venmo / PayPal / CashApp) | Link-out | Deep links + instruction text; no execution |
| Vendor accountability engine | Derive-only | Never sends, never writes back; Slice 2B write-back not started |
| CSV import | Local | Platform-template-bound; no document parsing |

---

## Do-it-for-me — ranked agent opportunities

Ranked by leverage × doctrine fit × rails readiness. Every one feeds the existing DraftSheet / ConfirmTrustDialog review gates.

### P0 — Inbound vendor-reply parser

The single highest-leverage agent in the app. A vendor replies "we'll arrive at 2pm, COI attached, deposit received" — today a human reads that and hand-types every field. The agent extracts against the exact schema `inferPromisesFromVendor` already defines and presents a review-diff sheet: "3 fields will update — Apply."

Every piece exists: the extraction endpoint pattern, the honest-labeling banner ("AI-EXTRACTED · Verify against original document"), the field map, the promise-confirmation states. This is "Apply reviewed extraction" — explicitly doctrine-allowed.

**Clears:** The entire vendor chase loop — ~15 hand-typed fields per reply.

Anchors: `derive.js:284-343` · `ai.py:284 /extract-document` · `VendorPlanningWorkspace.jsx:2455`

### P0 — Two-number reconciliations — "Fix it for me"

The caterer headcount drift is the crystalline case: the engine computes both `event.catererCount` and `yesGuestsCount`, detects the drift — then routes the user to a form to retype a number the app already knows. One button through the existing confirm dialog turns a routed chore into a one-tap magic moment.

**Clears:** Headcount drift, and every sibling next-action where the engine holds both the current and correct value.

Anchors: `CommandCenter.jsx:344-353` · `CommandCenter.jsx:1703` · `App.js:28022 ConfirmTrustDialog`

### P0 — One-approval send chains

Doctrine bans auto-send absolutely — it does not ban one approval covering N prepared sends. Three chains are ready wherever commApi email is configured: the RSVP chase (exact no-reply list + per-guest drafts → one "Review & send all"), the T-10 vendor reconfirm sweep, and the day-before details blast.

Per CTA truthfulness, the button says "Send" only when email is actually configured; otherwise it honestly stays "Copy" — the fallback branch already exists.

**Clears:** Manual mailto blasts; unscheduled reminders; the reconfirm sweep.

Anchors: `followUpDrafts.js:68-73` · `commApi.js:131` · `App.js:32589`

### P1 — Contract / COI extraction write-back

The vision extractor already parses documents and shows key dates, payment terms, and contacts — but stops at display. Extend it one step: offer to fill the vendor record and satisfy promise evidence, through the same review-diff sheet as the reply parser.

**Clears:** Manual contract transcription; COI status chase.

Anchors: `ai.py:284-405` · `VendorPlanningWorkspace.jsx:2328`

### P1 — Universal import agent

CSV import is locked to hard-coded platform templates. An LLM header-mapper that takes any messy CSV, paste, or screenshot and maps it to the NGW schema — then hands off to the existing `applyMerge` engine — removes the biggest onboarding cliff. The merge engine already acts; only the mapping is missing.

**Clears:** Template lock-in; the guest-list entry cliff.

Anchors: `csvParsers.js:3-106` · `csvParsers.js:173 applyMerge`

### P1 — Day-before pack agent

The day-before plan already composes five sections of manual "Follow up / Confirm with / Open the list" rows. An agent that pre-executes every preparable row — drafts all reconfirms, the helper brief, the guest details message, builds the Instacart cart for unbought items — and presents one review sheet: "Your day-before pack is ready: 4 messages + 1 cart."

**Clears:** An evening of chores compressed into a single approval. Simultaneously the best DIFM and best magic-moment candidate.

Anchors: `dayBefore.js:29 buildDayBeforePlan` · `instacart.js`

### P2 — RSVP free-text parsing

Guest notes like "we'll be 4, one is gluten-free" → structured headcount + needs, review-gated, flowing into the sizing engines that already consume them.

Anchors: `guestMerge.js:42` · `rsvp.py:224`

---

## Magic moments — anticipation, not generation

The established thesis is "the app writes the artifact from facts it already has." Agents extend it to: "the app noticed, prepared, and is waiting."

### P1 — Weather sentinel

The weather rail is live for outdoor events within 14 days. An agent that watches the forecast and — when rain probability crosses a threshold — has the rain-plan starter and the guest weather update already drafted and waiting on the home surface. Pure anticipation, grounded entirely in real forecast data.

Anchors: `weather.js suggestRainPlan` · `weather.js guestRainMessage`

### P2 — Post-event learning loop

Yesterday's audit named "capture without payoff reads as fake over time" as the app's closest thing to fake-smart. This is an agent-shaped job: consume decision records + outcomes + recap, produce a grounded "what we learned" note, seed next-event adjustments. The pattern exists in miniature — hostIntel's clamped ±25% attendance adjustment. This is what makes the Reveal feel smarter on event #2.

Anchors: `closeoutIntel.js` · `hostIntel.js R1` · `intelEval.js`

### P2 — Copilot-everywhere via the sanctioned hybrid

vendorCopilot is the best architecture in the app: deterministic rule preview as ground truth, optional AI enhancement forbidden to invent, same output shape either way, honest source badges. The backend `readiness` feature already exists — extend the dual-mode pattern to event-level readiness in Command Center.

Anchors: `vendorCopilot.js:117 getRuleBasedPreview` · `VendorPlanningWorkspace.jsx:2910`

---

## Prerequisite surfacing fixes

Existing magic gated off exactly when it matters. Deterministic, cheap, no AI needed — fix these first.

- **The head-start queue vanishes on event day.** The entire ranked draft queue is gated `!isDayOf` (`App.js:23891`) — the day-before details and vendor reconfirm drafts disappear on the day they matter most. Only the helper brief survives.
- **The payment reminder never reaches the host.** `draftVendorPaymentReminder` renders only in the planner cockpit — never on the host home, even when a deposit is due and returnNarration already computes the gap.
- **The toast is permanently buried.** Hardcoded score 25 (`App.js:23953`) and disconnected from the Moment Library's toast moment — tapping "+ Toast" onto the run of show never offers to draft it.
- **The dietary note is siloed.** It lives on Guests only, absent from the Food surface where the cook context — and the matching context nudge — actually live.
- **Reassurance renders in the wrong shell.** positiveAttention ("You're set on…") was built for first-time hosts but renders only in the planner CommandCenter — never on the host home.

---

## Horizon 2 — agents nobody has proposed yet

Beyond the ranked audit and the prior DIFM audits. Two classes: agents that build the product, and in-product agents with no prior candidate entry.

> **The sleeper finding.** The playbook schema is already agent-ready. Every claim carries `provenance{tier, confidence, sources, researchedAt}` plus a `sufficientWhen` field that is a machine-readable verification contract — "≥2 crab-house vs live-buy quotes in the DMV market agree within 15%" (`crabFeast.js:45`). Verification work orders for research agents were designed into the data before any research agent existed. The builder trio below compounds the data moat while everything else competes on UI.

### Agents that build the product

**Playbook research author** — Authors new event-type playbooks directly in the existing schema — decisions with provenance tiers, purchases with sourced price ranges — human-reviewed before merge. The long tail (military retirement categories, flagged in the vendor audit) is waiting. Anchors: `playbooks/data/` · `PLAYBOOK_SCHEMA_ARCHITECTURE.md`

**Provenance verification agent** — Works the queue of `verificationStatus: 'synthesized'` claims, each with its own acceptance criteria in `sufficientWhen`. Researches, cites, upgrades synthesized → researched. Trust improves with zero new features. Anchors: `crabFeast.js:45-49`

**Price freshness agent** — `PRICE_TABLE_META` declares `reviewCadence: 'yearly'`; the crab price ladder is pinned to four named DMV vendors as of 2026-07-03. A scheduled agent re-quotes sources each season and bumps `asOf`/`version` — staleness becomes structurally impossible. Anchors: `sourcing.js:5-10` · `crabFeast.js:143`

**Doctrine lint agent** — Three standing rules are enforced by memory alone: no emojis in product copy, UX_07's "re-classify every CTA each sprint," the token-debt raw-hex sweep. A per-sprint agent lints the diff against doctrine. Anchors: `UX_07` · `docs/token-debt.md`

**QA scorecard fleet** — Dozens of `cap*.js` screenshot scripts plus the UX_09 scorecard already exist. An agent fleet drives the preview across breakpoints and files severity-ranked findings — a standing defense against the "unit tests passed, live browser broke" failure mode. Anchors: `demo/scripts/cap*.js` · `UX_09`

**Alpha-feedback synthesizer** — Skill 08 defines how to interpret tester observations; the fleet funnel lives in PostHog. A weekly agent pulls both and writes the interpretation brief currently done by hand. Anchors: `08_ALPHA_FEEDBACK` · `analyticsReader.js`

### In-product agents with no prior candidate entry

**Quote normalizer** — Three caterer quotes in three formats → per-person cost, inclusions, and gaps, rendered as a decision card with evidence. Feeds Decision Memory; pure No Guesswork. Anchors: `decisionMemory.js`

**Guest concierge on the RSVP page** — Answers guest questions only from the guest-brief payload; unknowns escalate to the host as an attention item ("3 guests asked about parking — want to add it?"). The escalation itself closes a data gap. Anchors: `rsvp.py:199 PUBLIC_EVENT_FIELDS` · `draftGuestBrief`

**Venue logistics researcher** — placeIntelligence is deterministic-only by doctrine — no invented venue facts. A citation-grounded agent graduates its "needs info" states honestly: "the venue's site says load-in is via the rear dock — confirm with them," source linked, confirm-back required. Anchors: `placeIntelligence.js:7-9`

**Receipt → budget actuals** — Photo of a receipt → vision extraction → review-gated line items into hostSpending. Closes the budget honesty loop and gives the learning loop real spend data to correct the estimate bands. Anchors: `hostSpending.js` · `ai.py:284`

**ROS repair proposer** — rosOverlap detects timeline conflicts but only returns a count. The agent proposes the repaired schedule as a reviewable diff — and the day-of version ("the DJ is 40 minutes late") replans downstream segments exactly when the host can't think. Anchors: `rosOverlap.js:17`

**Contract red-flags + COI validity** — Extraction exists; comparison doesn't. Check COI coverage dates against the event date, amounts against venue requirements, and contracts against the playbook's expected clauses ("no rain clause — your event is outdoors"). Questions to ask, never legal advice. Anchors: `ai.py:284-405` · `vendorQuestions.js`

**Client-intake parser** — Planner shell: a client's rambling email or voice-note transcript → structured intake draft → event created for review. The planner-side twin of the import agent. Anchors: `eventTaxonomy.mjs` · `personaResolutionEngine.js`

**Cross-event conflict sentinel** — Planner scale: same vendor double-booked across events, staffing collisions, shared-resource clashes. HQ-3 flagged planner scale as unverified beyond 3 clients — this is the intelligence that makes scale safe. Anchors: `CommandCenter.jsx:788 getCrossEventAttentionItems`

### Explicitly don't build

- Seating optimizer — requires relationship/emotional inference, killed territory
- Anything sentiment-reading; autonomous negotiation (auto-send by another name); a general chatbot
- The concierge is safe only because it is grounded in host-approved facts with escalation

---

## Doctrine constraints

What binds every agent proposal — from 06_AI_GROUNDING, UX_07 CTA truthfulness, and the DIFM audit kill list.

**Sanctioned**

- "Apply reviewed extraction" — explicitly allowed by the grounding skill
- One approval covering N prepared sends (batch review, then send)
- Rule-based ground truth + optional AI enhancement (the vendorCopilot pattern)
- Honest labels: "AI-extracted · verify", source badges, deterministic fallbacks
- Agents feed the existing DraftSheet / ConfirmTrustDialog — never bypass them

**Banned**

- Auto-send anything — absolute, no exceptions
- A second drafts module — "a competing engine, kill on sight"
- Invented facts, confidence percentages, emotional inference
- Primary-styled CTAs for actions that don't execute end-to-end
- Magic that doesn't clear a state

> **Tension to resolve.** The kill list parks "AI-generated vendor messages" as a hard rule — yet the backend `vendor_followup` AI feature is live and used in the planner cockpit today. The park likely applies to the host shell only, but doctrine and code currently disagree. Reconcile before building the send chains.

---

## Recommended sequence

1. **Surfacing fixes** — day-of gate, payment reminder to host, toast link. Days, not weeks, and deterministic.
2. **Inbound vendor-reply parser** — the flagship agent; every pattern it needs already ships.
3. **Reconciliations + batch-approval sends** — after resolving the vendor-message doctrine tension.
4. **Doc write-back, import agent, day-before pack** — prototype in `hostv2/`, which imports production engines and is the sanctioned proving ground.
5. **Anticipation layer** — weather sentinel, post-event learning loop.

---

## Live verification

**Confirmed in Chrome · localhost:3000 · 2026-07-08**

- The "I've made a head start" ranked queue renders on an upcoming event — shopping list hero, invite and guest brief collapsed sub-hero, no toast or payment item anywhere in the queue.
- The DraftSheet pattern works as designed: "We wrote it for you," editable text, "Polish warms the wording — never invents," Share/Send vs Copy.
- Derive-don't-act, live: "NEXT UP — Add a rain backup → Take me to it" routes to a form rather than applying the starter.
- The capture-without-payoff loop, live: "2 past events are still missing a final count" asks for manual entry — the exact seam the learning agent would close.

---

Prior art: `DIFM_MAGIC_AUDIT_1.md` · `HOST_DIFM_AUDIT_1.md` (2026-07-07, deterministic-DIFM scope) · `PRODUCT_OS.md` · `INTELLIGENCE_ENGINE_DOCTRINE.md`. This audit covers the agentic layer those documents excluded.

Method: four parallel code sweeps (DIFM surfacing, AI infrastructure, manual friction, host journey) + live runtime verification. Palette and type per Studio Matte locked tokens (`theme/palette.js`, UX_01).
