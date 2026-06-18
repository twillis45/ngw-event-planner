# Sprint UX-1 — Experience Architecture & Figma System Audit

**Date:** 2026-06-18 · **Branch:** `main` @ `ac25ae1` · **Mode:** AUDIT + Figma system (no screen mockups)
**Grounding:** render-first — live captures in `review-artifacts/` (`ux1_L1_home_OFF.png`,
`ux1_event_mobile_more.png`, `stack_allflags_1440/390.png`, `postmerge_OFF_1440.png`,
`60f_moments_row.png`) + the 61B code audit.

**Thesis tested:** has NGW's bottleneck shifted from intelligence to usability?
**Answer: yes, decisively.** The intelligence is ahead of the UX. The product a real human
touches today is a **professional planner CRM**, and the simpler host product — already built —
is switched off. The question is no longer "can NGW be smarter," it's "can a grandmother use
what exists." Today: **no.**

---

## Part 1 — Grandmother Test  →  **FAIL (at the front door)**

A 65-year-old planning a grandchild's birthday lands on the L1 home (`ux1_L1_home_OFF.png`)
and sees a **planner CRM**: left nav = **Pipeline · Client Events · Clients · Vendor Bank**;
setup step #1 = **"Name your studio"**; the ribbon reads **"1 of 104 open"** across 36 sample
events. This is a sales funnel — a **direct violation of PRODUCT_OS PP-3** ("a self-host gets a
checklist, never a sales funnel, never 'studio'/'client'/'intake'/'roster'").

- *Could she use it?* Not without translating "Pipeline," "Vendor Bank," "studio," "intake."
- *Complete planning without training?* Unlikely — opening her event shows **14 tabs incl.
  Decisions / Client Intake / Crew** (`ux1_event_mobile_more.png`), and the Command tab says
  "Nothing urgent right now" with no get-started CTA.
- *Know what to do next?* No. *Feel confident?* No. *Overwhelmed?* Yes.

The cruelty of it: the host experience that *passes* this test — host nav (6 tabs), host
vocabulary, Positive Attention, Event Identity, Moments — **is built, tested, and OFF** (61B).
The grandmother test fails not for lack of a solution but because the solution is unplugged.

## Part 2 — Planner Test  →  **PASS (this is who the product actually serves today)**

Through a pro's eyes the same surfaces read as **capable and operationally serious**: a real
pipeline, vendor COI/payment tracking, run-of-show, decision/outcome capture, confidence
grammar. The depth is respected, not toy-like. **Where host wins:** simplicity, meaning,
reassurance (when enabled). **Where planner wins:** the 14-tab operational surface, vendor
intelligence, the CRM L1. **Where both fail:** mobile (everything important buried under
"More"), the empty-event cold start, and onboarding that assumes prior fluency.

**The product is, today, a planner tool wearing a host's product name ("Event Boss").**

## Part 3 — First-Time Host Journey (ranked severity)

| Step | What happens | Severity |
|---|---|---|
| Landing / L1 | Planner CRM nav (Pipeline/Clients/Vendor Bank); "studio"; 104 open over samples | **BLOCKER** |
| Signup → first event | ~5 micro-decisions (name+date+type → kit bundling 3–5 surfaces → open budget estimator) | **HIGH** |
| Intake | "Client Intake" tab; planner-client framing for someone who is the host | **HIGH** |
| Planning / first landing | Command tab: "Nothing urgent right now," no next-step CTA | **HIGH** (abandonment #1) |
| Navigation | 14 tabs incl. Decisions / Crew jargon | **BLOCKER** (abandonment #2 — "not for me") |
| Run of Show | Strong once reached; buried under mobile "More" | **HIGH** |
| Completion | Outcome Capture exists but never instrumented/surfaced as a finish line | **MEDIUM** |

**Two abandonment cliffs:** the empty Command landing, and the jargon-tab wall. Both are
artifacts of the host experience being off + one cold-start gap.

## Part 4 — Information Architecture Audit

**Mental model imposed:** the 4-layer planner architecture (L1 Studio → L2 Portfolio → L3
Event Command → L4 tabs). For a host with *one* event this is 3 layers too many.
- **Can the user tell where they are / what to do / what matters / what's done / what's
  waiting — without training?** Partially at best. The 14-tab L4 has no "what matters" signal
  when flags are off; the empty Command gives no "what to do."
- **Duplicated concepts:** onboarding lives in *three* disconnected places (L1 launchpad,
  empty Command, per-tab empty states) that don't hand off to each other (61B).
- **Hidden functionality:** the entire host experience (flags), Run of Show (mobile "More"),
  sample-clearing (buried in Settings).
- **Navigation debt:** "Run of Show" vs "Event Day Schedule" dual naming; "Pipeline/Client
  Events/My Events" overlap; Calendar that's a month grid for single events (parked rework).

**IA verdict:** the architecture is sound *for planners* and *miscast for hosts*. The fix is
not re-architecting — it's letting persona drive which layers/labels a user ever sees.

## Part 5 — Cognitive Load Audit (doctrine: reduce thinking / translation / hunting / ambiguity)

| Screen | User must think about | NGW should think instead |
|---|---|---|
| L1 home | "What's Pipeline/Vendor Bank? which of these is mine?" | Show a host only their event(s) + one next step |
| Event create | name, date, type, kit, budget tiers — up front | Ask 2 things; scaffold the rest; defer budget |
| Command (empty) | "Where do I start?" | A single "Start here" action |
| 14-tab nav | "Which tab? what's 'Crew'/'Intake'?" | 6 host tabs in plain words |
| Mobile | "Where's the day-of schedule?" | Put it in the primary lane |

Every row is a **translation or hunting tax** the doctrine says to eliminate. The biggest
single reduction: **persona-gate the surface** so a host never thinks about planner concepts.

## Part 6 — Mobile Experience Audit (mobile = the primary host surface)

- **Native-feeling:** the bottom 5-lane bar (Overview/Planning/People/Money/Messages), the
  Studio-Matte visual language, the Moments chip row (60F).
- **Desktop-first leakage (trust-breaking):** the **"More" drawer dumps all 14 tabs** incl.
  Decisions/Client Intake/Crew (`ux1_event_mobile_more.png`); **Event Day Schedule — a core
  host task — is buried there**, not in the primary lane; the empty Command cold-start is the
  first mobile screen after creating an event.
- **Onboarding/identity/moments/memory on mobile:** identity + moments render well *when
  enabled*; memory/decisions are buried; outcome capture has no mobile finish-line surface.

**Mobile is the surface the host vision depends on and the surface most compromised by
desktop-first IA.**

## Part 7 — Figma System Definition (system before screens)

Grounded in the existing, mature **Studio Matte** language + **The Attention System** +
**Width/Measure**. Codify, don't reinvent.

- **Design principles:** (1) One hero per screen; evidence whispers. (2) No Guesswork — never
  show a number/word we can't ground. (3) Persona drives surface — a host never sees planner
  concepts. (4) Reduce thinking/translation/hunting/ambiguity. (5) Mobile-first; desktop is
  the enhancement.
- **Visual hierarchy:** 3 contrast tiers (primary text / steel secondary / tertiary), **one
  accent moment** per screen (brand steel-blue), progressive disclosure (collapse on-track
  rows). Motion = change only.
- **Typography:** one family; sizes ~ 9/11.5/12.5/13.5/scale-hero; weight (600/700) and color
  carry hierarchy, not size inflation.
- **Spacing:** 8-pt rhythm; card padding 14–16; section gaps 10–18.
- **Status system:** RED at-risk · AMBER `#ef962e` approaching-with-a-clock (≤7d only) · GREEN
  on-track · STEEL neutral. Amber is never accent/wallpaper.
- **Confidence system (Pattern 014):** Known / Likely / Estimated / Needs-Verification /
  Unknown — green/steel channel only; **gold/warm banned from confidence** (locked 2026-05-01).
- **Persona system:** Host / Operator / Planner from `audiencePersona(event)`; persona selects
  vocabulary (presentationLabels), nav set (presentationNav), and voice — **on by default for
  the matching audience**, not behind a flag.
- **Width/Measure:** Reading 760 · Content 1180/1280 · Data 1320/1560 · Full fluid, by content
  type; tablet/mobile fluid by construction.
- **Mobile rules:** ≤5 primary lanes; the persona's top task is always a lane (host ⇒ Event
  Day Schedule), never "More"; thumb-reachable primary action; no horizontal overflow.
- **Desktop rules:** persona nav in a grouped sidebar; measure capped by content type; the
  hero + evidence pattern, not a dashboard of equals.

## Part 8 — Screen Inventory (ranked by impact)

| Rank | Screen | Why |
|---|---|---|
| 1 | **L1 Home (host variant)** | First impression; today a planner CRM — the PP-3 violation |
| 2 | **Event Command (empty + populated)** | The cold-start cliff; the daily home of an event |
| 3 | **Mobile event nav + "More"** | The primary host surface; 14-tab leak |
| 4 | **Event Creation** | The 5-decision gauntlet |
| 5 | **Run of Show** | Core host artifact, mobile-buried |
| 6 | **Onboarding / first-run** | Three disconnected onboarding loci |
| 7 | **Vendors** | First-vendor cold start |
| 8 | **Event Identity / Moments** | Built; need native mobile expression |
| 9 | **Event Completion / Outcome** | The missing finish line (and the data we need) |
| 10 | **Event Memory surface** | Last, gated on real data |

## Part 9 — Figma Roadmap (sequencing)

- **Phase 1 — Architecture, navigation, mobile-first system.** The persona-driven host
  shell (L1 host home, 6-tab nav, mobile lanes incl. Event Day Schedule, plain vocabulary).
  *Highest impact; mostly expressing what's already built.*
- **Phase 2 — Core planning screens.** Event creation (2-question start + scaffold), the
  empty/populated Command with a real "Start here," empty-state sequencing.
- **Phase 3 — Vendor experience.** First-vendor flow, recollection reader surfaced honestly.
- **Phase 4 — Memory & intelligence expression.** Identity, Moments, Outcome/finish-line,
  decision recall — native mobile. (Value gated on real data per 61A/61B.)
- **Phase 5 — Advanced planner/operator surfaces.** The full operational cockpit, refined.

Sequence rationale: Phase 1 unlocks activation (the actual bottleneck); intelligence
expression (Phase 4) waits behind the data Phase 1–3 generate.

## Part 10 — Brutal Product Grade

| Area | Grade | Why |
|---|---|---|
| Intelligence | **A−** | Genuinely substantial and honest — but largely dormant (flag-off) |
| Trust | **A−** | No-Guesswork doctrine, honest sample labels, confidence grammar |
| Memory | **B−** | Built and sound; zero real data; unsurfaced |
| Planning | **A−** | The engine is the real strength |
| Mobile UX | **D+** | Desktop-first; core host tasks under "More"; 14-tab leak |
| Onboarding | **C−** | Planner-framed ("name your studio"); three disconnected loci; sample noise |
| Navigation | **D+** | 14 tabs + jargon imposed on hosts; planner CRM L1; host nav off |
| Visual Design | **A−** | Studio Matte is genuinely premium — the clearest strength |
| Cognitive Load | **C−** | Constant translation/hunting; too many up-front decisions |
| Host Experience | **D** | Built but OFF; a host gets the full planner product today |
| Planner Experience | **B+** | Capable, operational, respected — who it actually serves |
| Activation Readiness | **D** | Host product off; intelligence signals uninstrumented; ~0 cohort |

**Composite read:** the *bones* (intelligence, planning, visual design, trust) grade A−; the
*experience for the intended user* (host, mobile, onboarding, navigation, activation) grades
C−/D. **The gap between those two columns IS the bottleneck.**

---

## Final Question — 60 days of UX vs 60 days of intelligence

**60 days of UX/onboarding/activation/navigation/design would create far more user value —
not close.** The product's biggest weakness is now **experience, not intelligence.** The
intelligence is a generation ahead of the UX; another 60 days of it deepens a moat **no one is
standing in.** Meanwhile the cheapest, largest gains are sitting unplugged:

1. **Turn the host experience on** (persona-default, not flag) — converts the BLOCKER nav +
   jargon + L1 CRM problems in one move; it's built and tested.
2. **Fix the cold start** — a "Start here" on the empty Command; 2-question event create.
3. **Mobile-first the host surface** — Event Day Schedule into the primary lane; drop the
   14-tab "More" dump for hosts.
4. **Instrument the finish line** — `event_completed` + `first_outcome_captured` so the data
   the intelligence needs actually accrues.

None of that is new intelligence. All of it is expressing, simplifying, and enabling what
exists. **Do not protect the prior decision to ship everything behind default-OFF flags —
that was correct for safe building and is now the single biggest thing standing between NGW
and a real user.** Ruthlessly: stop building intelligence; spend the 60 days making the
grandmother succeed. The smart product already exists — it just needs to become a *usable*
one. **Reality before intelligence; usability before more of it.**
