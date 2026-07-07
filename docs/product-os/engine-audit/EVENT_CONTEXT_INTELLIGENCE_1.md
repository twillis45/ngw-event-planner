# EVENT-CONTEXT-INTELLIGENCE-1 — Safe Cultural / Event-Context Nudges

Date: 2026-07-07 · Slice type: build (pattern-proving, deliberately narrow) · Status: SHIPPED

## 1. Executive verdict
Cultural intelligence as "help the host avoid missing what matters," never "teach culture": six safe contexts, four surfaces, one nudge per surface, all optional and dismissible, all "many hosts… / if it fits…" framed, all action-linked to existing controls. The line the product must not cross — context-aware → prescriptive/stereotyping — is enforced by tests, not intent.

## 2. What shipped
`src/lib/eventContextNudges.js` — `eventContextNudge(event, surface)` returns at most ONE nudge `{id, text, why, actionLabel, route}` or null. Contexts: Juneteenth, Birthday (incl. quinceañera/sweet-16 phrases), Memorial/Celebration of Life, Retirement, Graduation, Baby shower. Surfaces: `food` (Plan tab, above the food plan), `guests` (Guests tab), `vendors` (Vendors tab), `program` (The Day). Renderer `ContextNudgeCard` (App.js): eyebrow "If it fits your event", optional "Why this matters" expand, action button, "Not for this event" dismiss.

## 3. Doctrine enforcement (all test-locked)
- **Source-bounded**: matches ONLY host-entered `type`/`name`/`theme`/`secondaryType`. Test 3 proves guest names, vendor names, and notes can NEVER trigger a context — no identity inference, ever.
- **Respect**: every authored string swept for banned prescription ("you need/should/must/required/have to"), identity claims, and verified-ownership claims (the app never asserts a vendor's ownership — it lets the host keep their own preference in mind).
- **Choice**: per-nudge dismissal (`event.contextNudges[id]`) via the normal patch path; dismissing one never hides another.
- **No overload**: max one per surface; no dot, no completion state, no blocking, zero green-dot impact.
- **Action-linked**: food → food-plan anchor, guests → guest-update draft home (`guests-invites-<id>`), vendors → vendor-list anchor, program → ros-now.
- **Guest/vendor safety**: nudges are host-side context only; the guest-message nudge routes to the existing editable GUEST-UPDATE draft — never auto-sends cultural copy.

## 4. "What matters most" field
NOT added — it already exists as `must_have_moment` + `meaning_why` (host-editable, MOMENT-PROTECT-1 carries it into day-before/do-now). Adding a duplicate field would violate the no-duplicate-surfaces rule; the existing fields already outrank templated context.

## 5. Verification
Live (real Juneteenth event, read-only; disposable `ecn-test` for vendors/dismiss, cleaned): food nudge on Plan, guests nudge on Guests, vendors nudge on the Vendors tab, dismissal removes exactly that nudge; mobile clean, no overflow. Interesting compound observation: the vendorless real event correctly suppresses its Vendors tab entirely (HOST-CHOICE-SUPPRESSION-1), so the vendor nudge only ever appears where vendors are a real workflow — the two doctrines compose.

## 6. Tests & suites
7 contract tests (`src/lib/__tests__/eventContextNudges.test.js`): option-not-requirement phrasing, per-surface authoring, source-bounding (sneaky guest/vendor/notes text), dismissal, all six contexts + unknown-type null, language sweep, action-linking. Full frontend **2085/2085 (126 suites)** · backend **97/97** · build clean.

## 7. Parked (deliberate)
Broad context expansion (prove the pattern first); decor/timeline as distinct surfaces (folded into food/program where authored); religious/cultural-rule contexts (higher-stakes authoring, needs Todd's review of copy before shipping); host-marked vendor-preference field (would need a real data field + brief integration).

## 8. Recommendation
Accept, watch alpha reaction, then expand contexts one at a time with the same test harness.

## Addendum — full-spec pass (same day)
- `deriveEventContextNudges(event)` aggregate added per spec shape: `{eventContext, source: event_type|event_name|host_entered_context|unknown, nudges (HARD CAP 3, each dismissible+low priority), suppressed}` — the no-overload cap is now structural, not just editorial.
- 5 spec tests added: 3-nudge cap + source naming; cross-context isolation (birthday/retirement/graduation/baby shower never receive Juneteenth copy); memorial calm-tone sweep; unknown context returns nothing fabricated; **host meaning fields never flip the context engine** — "Celebrate Black history and family" in must_have_moment protects the moment via MOMENT-PROTECT but does NOT trigger cultural nudges (that would be inference).
- Place-fit nudges: PARKED — Place Intelligence already carries arrival/parking guidance (PLACE-DIFM-1); a context-flavored duplicate would violate no-duplicate-surfaces. Decor surface: parked with it.
- No red/urgent/green-dot impact is structural: ContextNudgeCard renders no severity color, no done prop, no alert tier.
Totals after addendum: 12 context tests · suites 2090/2090 frontend · 97/97 backend · build clean.
