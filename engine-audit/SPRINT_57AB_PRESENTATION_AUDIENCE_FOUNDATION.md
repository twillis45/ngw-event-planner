# Sprint 57A-B — Presentation Intelligence Activation + Audience Intelligence Foundation (build-ready spec)

*Presentation-only · reversible · feature-flaggable · no new engine · no logic change. Reuses the 55M seam + Pattern 011/014. The 14 deliverables below are the build-ready spec; the engine is never touched. Success = a first-time host feels **guided by a planner**, not **operating planner software.** Date: 2026-06-17.*

**Governing principle — Pattern 017 (candidate): Intelligence Is Not The Interface.** Users should *experience* planner expertise, never planner *terminology*. The engine stays planner-grade; the presentation becomes audience-aware. Activated under this and Pattern 011 (one layer, many presentations) + Pattern 014 (confidence) + the AP-002 fence (presentation never alters logic).

---

## 1 — Audience Model Design
**Signal (NOT recordKind — the audit proved it mis-targets grandmother/bride/parent).** A self-declared field captured at event creation:
> **"Who are you planning this event for?"** — Myself / My family · A friend or loved one · A client · My organization · I plan events professionally · Other
- **Storage:** `event.audience` (string enum) — **per-event** (a pro planning her own birthday = host voice for *that* event). Plus `profile.defaultAudience` so returning users don't re-answer (event value wins; profile is the fallback).
- **Default behavior:** **flag OFF → everyone gets planner voice = today (inert).** Flag ON + `audience` unset → **host** (the *safer* default: plain language never harms a pro; jargon harms a host).
- **Fallback order:** `event.audience` → `profile.defaultAudience` → (flag-on) host / (flag-off) planner.
- **Migration impact:** additive nullable field; **no data migration**; existing events render unchanged (flag off, or unset→planner). New events get the one-tap question.
- **Scope guard:** drives **presentation only** — never permissions, workflows, planning, or business logic.

## 2 — Persona Mapping
| Audience answer | Voice |
|---|---|
| Myself / My family | **host** |
| A friend or loved one | **host** |
| A client | planner |
| My organization | planner |
| I plan events professionally | planner |
| Other / unset (flag on) | **host** (safer default) |
`personaFor(event, profile)` returns `'host' | 'planner'` from this map. **Replaces the recordKind proxy.** recordKind is dropped from `personaFor` (it mis-classifies; §Background).

## 3 — Host Voice Specification (the 55M spine VOICE, by `category`)
*Reassuring · simple · action-oriented · confidence-building · jargon-free.* Authored as `VOICE[category].host = (cmd) => ({title, consequence, primaryCta})`:
| category | Host title | Host consequence | Host CTA |
|---|---|---|---|
| `decision` | "One thing's waiting on you." | "Decide this and everything after it can move — nothing else is stuck on you first." | "Make the call" |
| `caterer` | "Let's lock the headcount." | "Your caterer is holding a number that doesn't match your guest list — fixing it keeps the food and seating right." | "Update the count" |
| `operational` | "Time to grab a few things." | "Picking these up now keeps the day calm." | "See the list" |
| `vendor` | "Give your vendor a nudge." | "A quick check-in keeps them on track for your day." | "Send a note" |
| `timeline` | "A couple of things are coming up." | "Getting ahead of these keeps the week relaxed." | "See what's next" |
| `comm` | "Someone's waiting to hear back." | "A quick reply keeps things moving." | "Reply" |
| `compression` | "Things are getting close." | "A little focus now and you're in great shape." | "Tighten the plan" |
| `neutral` | "You're in good shape." | "Nothing needs you right now — enjoy the calm." | — |
**Tone rules:** second person, present tense, no nouns-as-jargon, always a reassurance clause, never a severity label.

## 4 — Planner Voice Specification
**Identity = no VOICE entry.** Planner audience → `VOICE[category].planner` is absent → `renderAction` falls through to the engine's current strings (the command-desk voice). **Planner mode = today's UI verbatim, zero change, zero risk.** The activation is *additive for hosts, inert for planners.*

## 5 — Vocabulary Translation Inventory (the labels that BYPASS the seam → `labelFor`)
| Current (hardcoded) | Planner | Host | Reasoning (translate *intent*, not just words) |
|---|---|---|---|
| Planning Health | Planning Health | **"Where things stand"** | host wants a status feeling, not a metric name |
| Capacity | Capacity | **"Seating & supplies"** | "capacity" is an abstraction; she thinks chairs + plates |
| Reality Check | Reality Check | **"Before the big day"** | reframes a jargon noun as a moment she recognizes |
| Run of Show | Run of Show | **"The day's plan"** | "run of show" is industry term; "the plan" is universal |
| Readiness | Readiness | **"Are you ready?"** | a question she can answer, not a score |
| Operational | Operational | **"To-do & to-buy"** | names the two concrete actions, not the category |
| Vendor Risk | Vendor Risk | **"Vendor check"** | "risk" alarms; "check" guides |
| Timeline | Timeline | **"What's coming up"** | forward-looking, plain |
| Budget Status | Budget Status | **"Money so far"** | conversational, not a dashboard noun |
| Documents | Documents | **"Paperwork"** | what she calls it |
| ESTIMATE / REVIEW (badges) | ESTIMATE / REVIEW | **"about" / "double-check"** | a qualifier, not a status token |
**Test applied:** if a grandmother must stop and interpret, it failed. (e.g., "Seating & supplies" needs no interpretation; "Capacity" does.)

## 6 — Confidence Rendering Design (Pattern 014, presentation-only)
The **qualifier travels with the value** — same numbers, honest framing:
| Tier | Rule | Example |
|---|---|---|
| Known | plain | "12 guests confirmed" |
| Likely | soft prefix | "**usually** included at venues like this" |
| Estimated | range + about/~ | "**about $400–600**" (never "$500") |
| Unknown | confirm-prompt, never a value | "**check** the alcohol policy" |
Each engine value is tagged with its tier (the readers already know: estimates are ranges, prompts are prompts) → `renderConfidence(value, tier, persona)`. **Never render an estimate as a fact (AP-005).**

## 7 — Trust Rendering Design (the "because", from existing calculations)
Surface the **already-computed inputs** inline / on tap:
- "**24 plates** — because 12 guests × 2 each."
- "**4 platters** — buffet service for 12."
- "**about $180 ice** — ~1.5 lb/guest × 120."
`renderWhy(recommendation)` reads the derivation the reader already produced (e.g., the capacity note already contains "48 plates"). **No new calculation.**

## 8 — Attention Rendering Design (positive confirmation)
Add the **explicit "you're set"** beside the existing "needs you":
> **You're set on:** ✓ Seating ✓ Budget ✓ Guest count  **·  Needs you:** Confirm the headcount
Derived from the existing health array (on-track axes = ✓; the one open = needs-you). **No change to priorities, next-action, or readiness scoring** — it re-presents what's already computed.

## 9 — Context Rendering Design (timing-aware presentation)
Frame the same surfaces by lifecycle stage (from the existing event date / `dayMode`):
| Stage (from dates) | Host framing |
|---|---|
| 120d+ | "Plenty of time — let's lock the big decisions first." |
| ~30d | "Now's the time to confirm your vendors." |
| ~7d | "Final stretch — focus on food, guests, and the day's plan." |
| Event day (`dayMode`) | "Stop planning — today's about enjoying it. Here's your day." |
Presentation only — reuses existing date math + `dayMode`; **no planning-logic change.**

## 10 — Runtime Impact Assessment
| Change | Logic touched | Risk | Reversible |
|---|---|---|---|
| `event.audience` field + creation prompt | No (stored pref + 1 small UI question) | Low | Yes |
| `personaFor` reads audience (drops recordKind) | No (presentation selector) | Low | Yes |
| Host `VOICE` (spine) | **No** (55M seam, inert default) | **Very low** | Yes |
| `labelFor` at ~12–20 label sites | No (string substitution, default identity) | Low–Med | Yes |
| Confidence/Trust/Attention/Context text | No (presentation strings) | Low | Yes |
**Untouched:** `_selectEventNextActionInner`, `getEventReadiness`, cascade, playbooks, budget, capacity, risk — frozen. AP-002 fence holds.

## 11 — Migration Impact Assessment
- New nullable `event.audience` + `profile.defaultAudience` — **additive, no migration.**
- Existing events: `audience` unset → fallback (flag-off planner / flag-on host) → **render unchanged with flag off.**
- No Supabase schema change required (events/profile are JSON blobs); no backfill.
- Rollback = flag off → 100% today's behavior.

## 12 — Feature Flag Strategy
- **Master flag** `presentationIntel` (default **OFF** → everyone planner = today). Source: `profile` setting or `REACT_APP_PRESENTATION_INTEL` / `localStorage 'ngw-presentation-intel'`.
- **Per-phase sub-flags** (ship independently, de-risk): `pi.voice` (Phase 1) · `pi.labels` (Phase 2) · `pi.confidence` (Phase 3) · `pi.trust` (Phase 4) · `pi.attention` (Phase 5) · `pi.context` (Phase 6).
- Flag OFF at every layer = identity render (proven-inert, like 55M `VOICE={}`). The flag IS the kill switch.

## 13 — QA Plan
- **Unit:** `personaFor` maps each audience → correct voice; `renderAction` host vs planner per category; `labelFor` maps all 11 terms; confidence qualifier travels; **flag-off = byte-identical to today** (the critical regression guard); `renderWhy` echoes existing inputs.
- **Integration (puppeteer, 390 + 1440):** create a **graduation party, audience "Myself/family"** → assert **no jargon** on Home/Command (no "Planning Health/Capacity/Reality Check/Operational/Compression" visible; host strings present) + spine reads host voice. Create a **client wedding, audience "A client"** → assert **today's verbatim** labels (planner identity, zero diff).
- **Regression:** full playbook/renderer suite green; flag-off snapshot == pre-sprint.
- **Grandmother walkthrough (manual):** can she, at each screen, answer *what to do / why / how sure / what if I ignore* without interpreting a single term?

## 14 — Expected Grade Improvements
| Dimension | Now | Target |
|---|---|---|
| Audience Intelligence | F | **B+** |
| Adaptive Language | F | **A−** |
| Presentation Intelligence | D | **B+** |
| UI Intelligence (overall) | C− | **B+** |
| Trust Rendering | B− | **A** |
| Confidence Rendering | C | **B+** |
*All without changing the planning engine.* Cap (honest): does not touch taste / real-time presence / emotional labor (56F human-only residuals); the lift assumes the **audience signal lands** (Phase 0) — VOICE alone on recordKind would leave the target hosts on planner voice.

---

## Build sequence (recommended, gated)
1. **Phase 0** — `event.audience` field + the one-tap creation prompt + `personaFor(event,profile)` (drops recordKind) — **the unblock.**
2. **Phase 1** — host spine `VOICE` (the 55M seam — promotes POS-P011/012/013/014 toward Canonical).
3. **Phase 2** — `labelFor` vocabulary layer.
4. **Phases 3–6** — confidence · trust · attention · context (each behind its sub-flag).
Each phase is presentation-only, flag-gated, reversible. **Smallest shippable = Phase 0 + Phase 1 behind `pi.voice`.**

*Confidence: High — traced to the seam (`OVERRIDE_FIELDS`), the hardcoded label sites, and the recordKind taxonomy gap. Weakest assumption: a single self-declared audience field is a sufficient signal — likely true for v1 (users can answer "who is this for?"), to be validated against real behavior once the 55N funnel has a cohort. This document is the build-ready spec; no runtime code written, no Notion update.*
