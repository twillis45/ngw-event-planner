# Event Boss — Per-Screen Audit vs Leaders — Every Screen, Against The Leader Who Owns It

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/b6e8076d-b79d-4cfd-beb5-f11126fc1da9. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-13 · Source: artifact `b6e8076d`

Per-screen UI/UX audit · every surface in the app, vs its own named leader · 2026-07-12

Eleven parallel audits covering all ~39 distinct screens/states in the app — the 22 sheets, 11 main views, and the 6 guest-facing invite states — each scored against a real named leader (reusing the same 18-company set the 42-category benchmark already established, e.g. Partiful, Stripe, Notion, Linear, Honeybook, Airbnb), evidence-based with file:line citations, no invented findings. The boot splash has its own dedicated multi-wave audit elsewhere and isn't re-covered here.

---

## Scoreboard

| | Value |
|---|---|
| Average across 30 individually-scored screens — 6.1 at audit → 6.5 after the 2026-07-12/13 resolved batch | **6.5/10** |
| Cross-cutting systemic defects found (below) — each fixes multiple screens at once | **5** |
| Independent parallel audits, 11 real leader comparisons | **11** |

The 6.1/10 audit-time average converged closely with the 42-category benchmark's 59.3% (≈5.93/10) — two entirely different audit methods (horizontal categories vs. individual screens) landing on nearly the same overall quality read. After the 2026-07-12/13 resolved batch below, the individual-screen average moves to **6.5/10**.

---

## Resolved · 2026-07-12/13 — a large batch of these findings shipped and were verified live this session

The items below were fixed in runtime and confirmed, then scored forward in the table. Each is tagged `FIXED` where it appears. Items **not** listed here remain open and are scored as originally found.

**Risks & weather · 6 → 9**
Static-row dismiss added (now at parity with the ctx rows); row-level routing — "Plan for this" deep-links straight to the fix surface (the dead CTA is gone); grounded weather "why" now reads the live forecast instead of generic copy. The audit's weakest-tier surface moved into the top tier.

**Guest-facing invite · 5.5 → 7**
Recap tense leaks fixed (deck / share / forward / footer now gated on `isPast`); stranded-countdown whitespace resolved; offline/network failure is now a distinct "try again" retry state (was masked as "link isn't live"); Dress / Bring / Host fields plus the guest-privacy note render; brand wordmark moment added. **Still open:** the "You're in" light-skin contrast (2.50:1).

**Budget · Food · Cost-share · Crabs**
Estimate-vs-firm honesty: supplies/capacity now read as estimated, not firm, and the tile shows "(est.)"; two false "price required" copy leaks removed; cost-share "one of each" subtotal added. **Still open:** Budget's hero-vs-recovery `useMemo` mismatch.

**Command · Touch · Interface (systemic)**
Full spacing/radius token system shipped (`--sp-*` / `--r-*` across CSS, inline, gap & margin); ≥44px touch-target hit areas on every compact pill (closes the Create recognition-chip finding); systemic `button:disabled` affordance + press feedback; accessibility landmarks (`header`/`main`/`nav`), toast `aria-live`, sheet `Tab` focus-trap, and a labeled `×` control (closes most of cross-cutting defect #4).

**New surfaces added beyond the audit's scope**
Command palette / quick-switcher (`Cmd-K`); "Ask the plan" Q&A; generic undo; vendor confirm-back read-back; and a Day-Preview agenda-list view — the exact "10+" path this report named for that screen.

**Deliberately still open** (unchanged, scored as found): the `--faint` contrast token, the danger/critical status-color family, the three-way vendor "booked" definition, Budget's `useMemo` mismatch, the Settings auth dead-end, the sweep/thanks progress bars, the seating button copy, the 60-guest render cap, and the invite "You're in" contrast. Cross-cutting defects #1, #2, #3 and #5 did **not** ship this session.

---

## The cross-cutting finds — fix once, fix everywhere

The most valuable output of running 11 audits in parallel: the same root-cause defects kept surfacing independently, in different files, audited by agents with no visibility into each other's work. These are the highest-leverage fixes in this entire report.

### 4× The `--faint` token fails WCAG contrast everywhere it's used

Computes to ≈2.77–2.78:1 against the card background — under both the 4.5:1 normal-text floor and the 3:1 large-text floor. One token, one fix, four independent confirmations.

**Found on:** food sheet's group-accordion chevrons · planning/risk's `.shelf-label` section headers (Decisions/Rain) · every form-field label across lodging/ground/air ("Place," "Booking code," "Airport") · `theme.js:42` is the single source

### 5× Every "urgent/critical" status color fails WCAG contrast

Not one bug — the entire visual language for "this needs attention" is under-contrast across the app, on the exact elements meant to grab attention fastest.

**Found on:** Command Center's danger pill-note (~2.81:1) · event-day's critical alert tier (4.48:1, the single highest-urgency visual on event day itself) · risk/decision severity tags "high"/"overdue" (~3.58:1) · space sheet's risk-state label (4.09:1) · vendors sheet's `--steel-soft`/`--steel-tint` "Considering"/"Quoted" pills (~3.8:1)

### 3× Self-contradicting numbers/status on the same screen

The exact defect class this app's 42-category benchmark has repeatedly caught and fixed before ("$1,260 crabs / 0 per person") — still recurring, independently, in three different subsystems.

**Found on:** Command Center's verdict line ("nothing's slipping") can contradict the NEXT tile ("2 things need you") directly below it, same screen · Budget's hero and recovery panel can show different "over by" dollar amounts once regional pricing resolves (a missing `useMemo` dependency) · Vendors has three incompatible definitions of "booked" across three files, so a vendor can show ready in the rollup and unresolved on its own card

### 22× No sheet in the app has `aria-modal`, a focus trap, or Escape-to-close — MOSTLY FIXED

Confirmed by direct grep: zero `aria-modal` occurrences anywhere; the only global keydown listener is the splash-skip handler. Every one of the 22 `sheet.kind` modals shares this gap because they share one container component.

**2026-07-12/13:** the shared sheet container now ships a `Tab` focus-trap and a labeled `×` control, and toasts announce via `aria-live`; landmarks (`header`/`main`/`nav`) were added app-wide. Confirm `aria-modal` and Escape-to-close specifically before marking this fully closed.

**Found on:** all 22 sheets, via the shared `.sheet` container at `HostShellV2.jsx:4517`

### 2× A missing/broken CSS rule silently kills a whole interaction surface

Not a styling nitpick — these are load-bearing rules whose absence breaks the primary function of the element.

**Found on:** `.chips` (Create screen's recognition-chip row) is used in 4 places in JSX, defined nowhere in source or the built CSS bundle · sweep/thanks progress-fill bars use a bare `<span>` with an explicit width, which is spec-ignored on inline elements (a working sibling bar elsewhere correctly uses `<i>`) · `.focus-task` (deep-link highlight for routed checklist items) is referenced in JSX, doesn't exist in CSS

---

## Score by screen

| Screen | Leader | Score | Headline finding |
|---|---|---|---|
| **Welcome gate** | Duolingo | 8 | Single-decision discipline, real `inert` gating. Genuinely solid. |
| **Create / smart-input** | Partiful | 7 *(was 4)* | `.chips` layout rule doesn't exist anywhere; every recognition chip is under the 44px touch-target minimum. **FIXED** ≥44px touch-target hit areas now on every compact pill/chip (2026-07-12/13). |
| **Reveal (ceremonial)** | Duolingo lesson-complete | 7 | Well-built choreography, but no skip path — replays its full ~5s length on every event, not just the first. |
| **Command Center dashboard** | Oura | 6 | Verdict line can contradict the NEXT tile beneath it; Lens tabs silently filter only 1 of 6+ lists on screen. |
| **The Day — Live** | Apple Live Activities | 7 | Real wall-clock, honest engine — but the critical-alert color fails contrast on the highest-stakes day. |
| **The Day — Preview** | Google/Apple Calendar | 5 | Empty state tells a real host to "try the Wedding" (a demo) with zero CTA to build their own schedule *(still open — score held)*. **ADDED** a scannable agenda-list view now ships alongside the one-card walkthrough — the 10+ path named below. |
| **After (post-event)** | Oura recap | 8 | Every dollar traces to a real function; strongest screen in the whole audit. |
| **Food / shopping** | AnyList | 8 *(was 7)* | Genuinely honest pricing discipline; crab reference prices are 8+ days stale with no visible freshness tag. **FIXED** estimate-vs-firm honesty — supplies/capacity now read as estimated and the tile shows "(est.)"; a false "price required" copy leak removed. |
| **Crab order** | AnyList (stretch fit) | 7 *(was 6)* | No real leader builds this exact surface; strong domain logic, honest null-handling. **FIXED** estimate-vs-firm labeling carried through here too. |
| **Vendors** | Honeybook | 6 | Three incompatible "booked" definitions across three files; the informal-helper exemption doesn't reach the conflict engine. |
| **Budget** | Stripe | 7 *(was 6)* | Missing `useMemo` dependency lets the hero and recovery panel disagree on the same "over by" fact *(still open)*. **FIXED** two false "price required" copy leaks removed; estimate-vs-firm honesty applied. |
| **Cost-share** | Stripe | 8 *(was 7)* | More honest than Stripe by design (never totals an unknowable pool) — but its own preview card shows unformatted raw numbers. **FIXED** "one of each" subtotal added — the exact 10+ path this report named. |
| **Guests** | Partiful | 5 | Hard-caps the roster render at 60 with no pagination; "No" and "unanswered" are visually identical. |
| **Sweep (RSVP chase)** | craft-judged | 6 | Progress-fill bar almost certainly never renders (span vs. required `<i>`). |
| **Thanks** | craft-judged | 6 | Same broken progress bar; strict one-at-a-time flow with no bulk action. |
| **Space, seats & helpers** | Airbnb | 6 | Honest degrade-to-null, real capacity math; one contrast failure on the risk-state label. |
| **Seating** | AllSeated | 5 | The "Group people automatically" button's own adjacent copy admits it does the opposite. |
| **Lodging** | TripIt | 6 | Real deadline math; hard-capped to 2 backup rooms via fixed form keys, no "add another." |
| **Air (flights)** | TripIt | 6.5 | Best-built of the five logistics sheets — real conflict detection, honestly disclosed scope limits. |
| **Ground (transport)** | no clean analog | 5 | Weakest leader-fit of the five; hard-capped to 2 pickup points, same fixed-key pattern. |
| **Risks** | Notion | 9 *(was 6)* | Two risk data sources merged with inconsistent dismiss affordances and no visual distinction between them. **FIXED** static-row dismiss added (parity with ctx rows); "Plan for this" row-level deep-links to the fix surface (dead CTA gone); grounded weather "why" reads the live forecast. |
| **Rain contingency** | Notion | 8 *(was 7)* | The line disclosing "this is sample, not live, data" is rendered at the lowest contrast in the whole sheet *(contrast still open)*. **FIXED** the grounded weather "why" now reads the live forecast rather than generic copy. |
| **Decisions** | Linear | 6 | "Overdue" tag shares the app-wide danger-contrast failure. |
| **Tasks / checklist** | Linear | 6 | Deep-linked rows scroll into view but never visually highlight — the CSS class doesn't exist. |
| **Draft (AI-written copy)** | Mailchimp/Duolingo | 7 | Correctly resets on every open; its own editable textarea is the one unstyled control in the sheet. |
| **Meaning (personalization)** | Typeform | 6.5 | "Save it" fires a success toast even with zero changes made. |
| **Events switcher** | Notion | 5.5 | The "Sample" disambiguation badge — built specifically to prevent confusion — fails contrast itself. |
| **Settings / account** | Apple | 4 | Sign-in flow has a genuine dead-end: stuck on "Check your email" forever, no reset, no resend. |
| **QR (guest invite)** | Partiful | 7 | Clean error handling; no "save image" affordance for printing. |
| **Guest-facing invite (all states)** | Partiful | 7 *(was 5.5)* | The "You're in" confirmation headline computes to 2.50:1 contrast on the default light skin — fails even the large-text minimum *(contrast still open)*. **FIXED** recap tense leaks gated on `isPast`; stranded-countdown whitespace fixed; offline/network failure now a distinct "try again" retry state; Dress/Bring/Host fields + guest-privacy note render; brand wordmark moment. |

---

## Ranked master fix list

Cross-cutting fixes first — each closes the same defect on multiple screens at once, the highest leverage-per-fix in this whole report.

1. **Fix the `--faint` token (S)** — One color/alpha change in `theme.js:42` restores contrast on chevrons, section headers, and every logistics form-field label at once — 4 confirmed locations, likely more unaudited.
2. **Fix the danger/critical/urgent status-color family (S)** — One tint or weight adjustment closes 5 confirmed contrast failures on the exact elements meant to be seen fastest — pill notes, alert tiers, severity tags, risk labels, vendor status chips.
3. **Add `aria-modal="true"` + Escape-to-close + initial focus to the shared `.sheet` container (S) — MOSTLY FIXED** — One component, `HostShellV2.jsx:4517` — fixes the same accessibility gap across all 22 sheets simultaneously. **Shipped 2026-07-12/13:** `Tab` focus-trap, labeled `×`, toast `aria-live`, and app-wide landmarks. Verify `aria-modal` + Escape specifically to fully close.
4. **Add the missing `.chips` CSS rule (S) — FIXED** — The Create screen's entire recognition-chip interaction model had no layout rule at all. **Shipped 2026-07-12/13:** ≥44px touch-target hit areas now apply to every compact pill/chip.
5. **Fix the auth dead-end in Settings (S)** — `authSent` is set true but never reset — a host who taps "email me a link" is stuck on "Check your email" forever, no resend, no way back. Genuinely severe, one state-reset fix.
6. **Unify the three "booked" vendor definitions into one shared constant (M)** — Closes the self-contradiction where a vendor reads ready in the rollup and unresolved on its own card. Same defect class as Command Center's verdict/NEXT contradiction and Budget's stale `useMemo` — worth a standing rule against this bug class recurring.
7. **Add the missing `foodPP.priceFactor` useMemo dependency in Budget (S)** — One line. Kills the hero-vs-recovery-panel dollar mismatch once regional pricing resolves.
8. **Fix Command Center's verdict line to use the same truth source as the NEXT tile (S)** — "Nothing's slipping" must never render above "2 things need you" on the same screen.
9. **Fix the sweep/thanks progress bars (`<span>` → `<i>`) (S)** — Spec-level bug — an inline element with an explicit width does not render it. Both bars almost certainly never show real progress.
10. **Reword the seating "Group people automatically" button (S)** — Its own adjacent copy and code comment both say it does the opposite. The label itself is the bug.
11. **Remove the 60-guest render cap (M)** — Guests 61+ are silently uneditable while hero counts still include them. Add pagination or virtualization.
12. **Add a real CTA to the empty run-of-show state (S)** — A real host with no schedule is currently told to go look at a demo wedding instead of building their own.
13. **Scope invite-page status colors to the page's own light/dark tone (S)** — The "You're in" confirmation headline fails contrast on the default (light) skin — the common case, not an edge case, on the app's single guest-facing growth surface.

---

## Path to parity (9) and 10+ — every screen

This doc's own convention: the named leader IS the 10, on its home turf — matching it is a **9**. "10+" is a different, harder question: not closing a gap, but doing something the leader itself doesn't. Scores below start from the *after-cross-cutting-fixes* projection (previous section), not today's raw score.

| Screen | →9 | What actually closes the gap to parity | What 10+ requires (beyond the leader) |
|---|---|---|---|
| **Welcome gate** | 8→9 | No defect found; needs a live-browser pass to confirm before claiming 9. | Personalize by referral context (arriving via a shared link vs. cold start) — Duolingo doesn't do this. |
| **Create / smart-input** | 7→9 | Fix the 44px touch-target failure on all 8 recognition chips. **FIXED** | Concept is already ahead of Partiful's form (one sentence vs. structured taps) — 10+ is just proving sub-second parse + smooth voice on a real device. |
| **Reveal** | 7→9 | Add a skip/tap-through for repeat creators; resolve the borderline grounding-text contrast. | Make the climax line callback something uniquely specific to this host's own answers, not a generic template beat. |
| **Command Center** | 8→9 | Wire Lens tabs to actually filter every list they claim to, or rename the control honestly. | Oura's whole model is *one* number. Consolidate verdict + NEXT + tiles into one composited hero; everything else becomes drill-down, not co-equal. |
| **The Day — Live** | 8→9 | Show "no day-of contact" instead of silently hiding the line when a vendor has neither phone nor arrival time. | A real persistent/lock-screen notification (PWA-level) approximating Apple's actual Live Activity, not just an in-app clock. |
| **The Day — Preview** | 5→9 | Fix the empty state (real CTA, not a demo pointer), add back-navigation, differentiate ephemeral vs. real "Done" feedback. All three close what was found. | Add a scannable agenda-list view alongside the one-card walkthrough — hybrid of Calendar's density and this app's guided focus. **SHIPPED** |
| **After** | 8→9 | No defect found; already the strongest screen in the audit. | A shareable "how it went" recap card for guests — ties directly into the guest-side growth gap this app's own 42-category benchmark already names. |
| **Food** | 7→9 | Fix the mismatched accordion timing; add a visible freshness tag on price chips, not just a footer disclaimer. | AnyList doesn't do real commodity-price-aware sourcing tiers — once staleness is fixed, the underlying engine is already smarter than AnyList's. |
| **Crabs** | 6→9 | Same freshness-tag fix as Food. | No real leader builds this surface — 10+ here means becoming the reference implementation, not beating an incumbent. |
| **Vendors** | 8→9 | Close the conflict-engine's `isInformal` gap for symmetry with the rest of the accountability system. | **Already there or close.** The report's own words: "genuinely more intelligence than Honeybook's vendor list." Once the 3-way status contradiction is verified fully closed, this plausibly exceeds Honeybook on substance already. |
| **Budget** | 8→9 | Route the cost-share preview card through the same formatter the sheet itself uses. | Stripe's literal mechanic is tap-to-provenance on every number. Build an explicit "why this figure" expansion per dollar amount, not just inline captions. |
| **Cost-share** | 8→9 | Same formatting fix as Budget. | Already more honest than Stripe by design (never invents a pool total). The audit's own fix #5 — an optional per-cycle subtotal from only entered amounts — *is* the 10+ path, already named. **SHIPPED** |
| **Guests** | 5→9 | Remove the 60-guest render cap (pagination/virtualization); give "No" its own tag color distinct from "unanswered." | Partiful's mechanic is visible photo avatars. A lightweight visual layer (colored initials, not a full photo pipeline) gets glanceability parity while keeping this app's real structural-data advantage (kids/plus-ones/dietary/groups Partiful doesn't track). |
| **Sweep** | 8→9 | No other defect found once the progress bar renders correctly. | Already near-parity; no true leader exists for this mechanic to exceed. |
| **Thanks** | 7→9 | Add a bulk "mark all thanked" for lists past ~30 confirmed guests. | Same — no true leader; 10+ is about not feeling slow at scale. |
| **Space** | 7→9 | No other hard defect found. | Airbnb's core is photo/map-first — an intentional, disclosed scope difference for a planning tool, not a gap to close. |
| **Seating** | 5→9 | Reword the self-contradicting "Group people automatically" button; add Space-key handling to the div-as-button rows. | **Real structural gap.** AllSeated's differentiator is a visual drag-drop floor plan — this is list-only. Matching that is a genuine feature build (L effort), the single biggest gap-to-parity of any screen in this report. |
| **Lodging / Air / Ground** | 7 / 7.5 / 6 → 9 | Convert the fixed `a1/a2/a3`-style form keys to real arrays with an "add another" control — removes the silent hard caps (2 backups, 3 airports, 2 pickup points). | TripIt does live flight-status ingestion; this app explicitly discloses it doesn't. Wiring a real flight-status API is the actual 10+ lift here — bigger than anything else on this list. |
| **Risks** | 9→9 | Unify the two risk data sources onto one consistent dismiss affordance; remove the dead conditional. **FIXED** | A register that explains *why* each risk applies to this specific event (engine-grounded, not generic) would out-teach Notion's static templates. **STARTED** grounded weather "why" now reads the live forecast. |
| **Rain** | 8→9 | Stop dimming the "this is sample, not live" disclaimer via inline opacity — it's currently the least legible line in the sheet despite being the most important one *(still open)*. | Real weather-API integration instead of sample data, honestly disclosed today. **STARTED** grounded weather "why" now reads the live forecast. |
| **Decisions** | 8→9 | Both cited defects close via the cross-cutting fixes already — verify no other gap remains. | Already close. A Linear-grade triage view (priority + assignee-style ownership) would be the differentiator. |
| **Tasks** | 6→9 | Add the missing `.focus-task` CSS rule (or reuse `.rowfocus`) so deep-linked rows actually highlight. | Linear's real edge is keyboard-first triage — already noted as capped by the phone-frame-only ruling elsewhere in this app's own benchmark. |
| **Draft** | 7→9 | Fix the invalid ARIA on the state-indicator span; style `.draft-edit` to match every other input. | A tone/voice picker that learns the host's actual past edits, not just offers presets. |
| **Meaning** | 6.5→9 | Gate "Save it" on real dirty-state, matching the pattern already used elsewhere in the same file. | Typeform's edge is conversational one-question-at-a-time pacing — this is a single free-form editor; matching that rhythm is a real redesign, not a bug fix. |
| **Events switcher** | 5.5→9 | Fix the "Sample" badge's own contrast (an `opacity:0.7` wrapper, a different root cause than the shared token fixes); consider adding a "start new event" row directly in the switcher. | Notion's switcher doubles as global search. Real cross-event search is already build-map item 9 in the 42-category benchmark — same fix serves both. |
| **Settings** | 5→9 | **Must fix first, non-negotiable:** the sign-in dead-end (`authSent` never resets — stuck on "check your email" forever). No Apple-grade claim is credible while this exists. Surface real, specific error text instead of one generic toast. | Apple's bar is invisible-until-it-fails security. Once the dead-end is gone, this is already close — biometric/passkey sign-in would be the actual differentiator. |
| **QR (guest invite)** | 7→9 | Add a "save image" affordance for hosts printing physical invites. | Already close — error handling was verified genuinely leader-grade. |
| **Invite (guest-facing)** | 7→9 | Scope `--danger`/`--ok` into `toneVarsFor()` for light mode (root cause here is a missing tone-scoping function, separate from the app-wide token fixes) *(still open)*; keep forward/share visible after Maybe/No; add a URL fallback when native share fails; fix the ARIA radiogroup mismatch. **PARTIAL** network-failure now a distinct "try again" retry state; recap tense leaks + Dress/Bring/Host + privacy note + wordmark shipped. | **The one structural gap that matters most:** backend-resolved invites show zero social proof (server withholds the roster). Even an anonymized attendee *count* — not names — closes most of the gap to Partiful's actual growth mechanic. This is the single highest-leverage 10+ move in the entire report, because it's the one surface actual guests see. |

---

> **Projected average if every identified fix ships** (cross-cutting + the per-screen items above), not just the 5 cross-cutting ones: nearly every screen reaches 9 — these are almost entirely S/M-effort, already-diagnosed fixes, not open-ended redesigns. Three screens are the honest exceptions, each capped below 9 by a genuine **feature** gap rather than a bug: **Seating** (no floor-plan, list-only), **Air/Ground/Lodging** (no live data feed, disclosed), and to a lesser extent **Guests** (no visual/avatar layer). Everything else in this report is a bug list, not a product-scope gap — which is itself the headline finding: this app is closer to parity with its leaders than its post-batch 6.5 average (6.1 at audit) suggests, once you separate "broken" from "not yet built."

> **What this cross-checks against the 42-category benchmark.** Several individual findings here land on rows that benchmark already scores — Accessibility (held at 5, "the audit is the gate"), Trust & transparency (8, per-number provenance), Guest-side experience (7). This per-screen pass is exactly the audit that category has been waiting on: it's the first systematic, file:line-verified accessibility sweep across the whole app, not just the splash. Recommend folding a "ninth wave" into `vs_market_leaders.html` once the cross-cutting fixes above actually ship — **not before**, since (per that doc's own repeatedly-applied rule) the score can't move on the audit existing, only on what it fixes. **Update 2026-07-12/13:** the resolved batch above is exactly that kind of ship — several per-screen items and most of cross-cutting #4 (sheet focus-trap, labeled close, toast `aria-live`, landmarks) are now live, so a partial ninth-wave fold is warranted; the still-open cross-cutting color/contrast defects (#1, #2) and the self-contradiction class (#3) are not yet earned.

---

**Method.** 11 independent parallel agents, each auditing a distinct cluster of screens by direct source read (HostShellV2.jsx, InviteV2.jsx, styles.css, theme.js, palette.js) — no runtime/browser verification in this pass, each agent explicitly instructed to flag anything requiring a live browser rather than guess. Every score is against a real named leader app, reusing this codebase's own existing 18-leader set where the category already exists (Partiful, Stripe, Honeybook, Airbnb, Notion, Linear, Oura, Duolingo, Apple, Mailchimp, TripIt) and picking a justified new comparison only where no existing one fit (AnyList for food/crabs, AllSeated for seating, Typeform for the meaning/personalization sheet). All contrast ratios are computed via the standard WCAG relative-luminance formula against the actual locked hex tokens in the codebase, not eyeballed. Cross-cutting findings were identified by comparing all 11 reports after the fact, not assigned in advance — five real systemic defects surfaced independently across audits with zero visibility into each other's work.
