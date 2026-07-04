# UXP-1 — User Activation & Onboarding Intelligence Audit
**Date:** 2026-07-03  
**Method:** Static codebase analysis + UI flow tracing (AuthGate.jsx, App.js ~44k lines, 37 playbook files)  
**Scope:** Full 8-phase activation funnel, brand-new user through return session  
**Audit style:** Every finding is a system call, not a design preference. "Why?" follows every gap.

---

## Executive Summary

| Phase | Score | Verdict |
|-------|-------|---------|
| 1 — First Impression | 2/10 | **CRITICAL** |
| 2 — Sign-up & Activation | 7/10 | Good |
| 3 — First Event Creation | 6/10 | Solid gaps |
| 4 — First AI Win | 7/10 | Good, but fragile |
| 5 — Trust | 4/10 | **Failing** |
| 6 — Cognitive Load | 5/10 | Moderate |
| 7 — Conversion Readiness | 2/10 | **CRITICAL** |
| 8 — Returning User | 3/10 | **Failing** |

**Overall: 4.6/10**

The system has meaningful AI that a first-time user cannot see, cannot understand, and cannot trust fast enough to return. The intelligence built in HIP-1's scope (planning engine, playbooks, shopping lists, timeline) is real. The problem is the ramp to it.

---

## Phase 1 — First Impression (0–60 seconds)

### What actually happens

There is no marketing landing page. The app URL resolves directly to a React SPA. For an unauthenticated user, the first screen is the **LoginScreen** in `AuthGate.jsx`:

```
[NGW EVENT BOSS]  ← tiny uppercase, steel-blue

Sign in

Enter your email and we'll send a one-time sign-in link — 
no password to remember.

[you@email.com            ]
[Email me a sign-in link  ]
```

That's the entire first impression.

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P1-1 | No marketing/landing page. The auth screen IS the front door. New users arrive with zero context about what they're signing up for. | P0 CRITICAL |
| P1-2 | Brand name "NGW Event Boss" is opaque. "NGW" is unexplained. "Event Boss" is confident but unexplained. Nothing on the screen says what the product does. | P0 CRITICAL |
| P1-3 | The headline is "Sign in" — not a product headline. The only copy below it explains the auth mechanism (magic link), not the product value. | P1 HIGH |
| P1-4 | No screenshots, no demo, no social proof, no testimonials before commitment. The user must trust an unknown brand with their email before seeing any product value. | P1 HIGH |
| P1-5 | The product's best feature — AI-driven planning intelligence — is completely hidden behind the auth wall. The first-time user has no reason to believe it exists. | P0 CRITICAL |
| P1-6 | "Why should I continue?" cannot be answered from this screen. | P0 CRITICAL |

### What the screen should answer and doesn't

| Question | Currently answered? |
|---------|-------------------|
| Do I understand what this product does? | ✗ No |
| Who is it for? | ✗ No |
| Why is it different? | ✗ No |
| Why should I trust it? | ✗ No |
| What's my next action? | ✓ (Sign in) |
| Is there friction before I see value? | ✗ MAX friction |

### Root cause

The product was built from the inside out — the intelligence was designed first, the entry ramp was never designed. The auth screen is a developer default, not a product decision.

---

## Phase 2 — Sign-up & Activation

### What actually happens

Auth is a magic link via Supabase (`signInWithOtp`). Flow:
1. User enters email
2. System sends a one-time link
3. User opens email, clicks link
4. User lands in the app, session active

Optional Google OAuth path exists but is env-var gated (`REACT_APP_ENABLE_GOOGLE_AUTH=true`). Not confirmed enabled in production.

Invite-only mode available (`REACT_APP_INVITE_ONLY=true`). If enabled, attempting to sign up with an unregistered email returns: *"That email isn't on the access list. Ask your admin to add you."*

After authentication, the user lands on the welcome hero immediately — no profile setup step, no onboarding wizard, no role selection.

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P2-1 | Magic link auth is excellent. 1 field, 1 click, no password. This is the right call. | STRENGTH ✓ |
| P2-2 | "Check your email" state is clean. Shows the email address they used. "Use a different email" escape hatch. | STRENGTH ✓ |
| P2-3 | No post-signup profile setup. Name, role, event type are never collected at entry. This means the system cannot personalize the first session at all. | P2 MEDIUM |
| P2-4 | If `REACT_APP_INVITE_ONLY=true` (which it likely is for a controlled beta), the error message "Ask your admin to add you" is accurate but gives new users no path forward. No "request access" link, no contact info. | P1 HIGH |
| P2-5 | The "check your email" state has no preview of what the user is about to see. "Your event plan is waiting" or a single capability teaser would reduce abandonment at this step. | P2 MEDIUM |
| P2-6 | No email subject/content visibility from this audit. The magic link email is presumably a plain Supabase template — no product branding, no "here's what you just unlocked" copy. | P1 HIGH (unverified) |
| P2-7 | Supabase session resolution can stall in iOS Safari Private Mode. A hard 5-second timeout fallback exists ("Taking too long? Continue to sign-in →"). Correct engineering, but a new user who hits this has no context to interpret it. | P2 MEDIUM |

### Clicks to first session: 2
(Email input → Send → Click link in email → App loads)

That's best-in-class. The auth flow is not the problem. The context before and after it is.

---

## Phase 3 — First Event Creation

### What actually happens

After authentication, the welcome hero appears (if no events exist):

```
WELCOME TO NGW EVENT BOSS (eyebrow)
A calm place to plan your event (headline)
Whether it's a wedding, a backyard birthday, a baby shower, 
or a fundraiser — track what matters, see what needs follow-up, 
and feel ready for event day. Pick how you want to start.

New here? See how to run an event, step by step →

[Welcome: Plan your first event]   [Just exploring?: Try a sample event]   [Link to a client]
```

The user clicks "Plan your first event" → create modal opens.

**Create modal — progressive disclosure:**

1. **Q1: "What are you celebrating?"** (TypePicker)
   - Hint: "Pick the occasion — I'll build the whole plan around it."
   - After selection: the `occasionBlurb()` + `playbookSetupPreview()` appear inline
   
2. **playbookSetupPreview (THE REAL INTEL PREVIEW):**
   ```
   WHAT I'LL SET UP FOR A RETIREMENT PARTY
   12-step plan · a 23-item shopping list, sized to your count · 5 key decisions · a moment that matters.
   ✓ Set the date and pick the venue           · 90d before
   ✓ Choose the format                         · 75d before
   ✓ Confirm catering or potluck direction     · 60d before
   ✓ Collect memories and tributes             · 45d before
   ✓ Plan the tribute program                  · 30d before
   +7 more milestones
   ```
   This is genuinely impressive. It appears BEFORE the user commits to the date.

3. **"Anything else mixed in? · optional"** — secondary type picker. Quiet, not explained.

4. **Q2: "When is it?"** — date picker, revealed after type

5. **Q3: Guest count, name, location, notes** — revealed progressively

**Progress indicator:** 3 dots labeled "LET'S BEGIN → NEXT → LAST ONE"

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P3-1 | `playbookSetupPreview` is the best UX in the app. Real milestones from the actual playbook, before the user commits to a date. This is the product's strongest argument for itself — and it's hidden inside a create modal. | STRENGTH ✓ |
| P3-2 | Shell routing bug: 19+ personal event types (Retirement Party, Anniversary, Bridal Shower, Sweet 16, etc.) route to the planner shell instead of the host shell. A parent planning their kid's graduation party lands in "Command / Pipeline / Portfolio" — a professional planner cockpit. This is the single biggest first-run experience failure. Sprint A fixes this. | P0 CRITICAL |
| P3-3 | "Who is this for?" question doesn't exist. There is no way to signal "I'm planning this for myself" vs. "for a client." Sprint A adds this. | P0 CRITICAL (Sprint A) |
| P3-4 | Welcome hero headline "A calm place to plan your event" doesn't communicate differentiation. "Calm" is a product attribute, not a user benefit. The lead should be: what does the user get that they can't get elsewhere? | P1 HIGH |
| P3-5 | Secondary type picker ("Anything else mixed in?") exists and is the seed of the Event Composition Engine (Sprint B). But it appears as a quiet optional field with no explanation. Users who have a Birthday + 4th of July won't know to use it. | P1 HIGH |
| P3-6 | For event types without a playbook, `playbookSetupPreview` falls back to a generic 5-item checklist from `kitCfg.checklist`. No indication to the user that this is a generic fallback, not an authored plan. Reduces the "wow" signal for uncommonly planned types. | P2 MEDIUM |
| P3-7 | "New here? See how to run an event, step by step →" is a text link in body size. It will be missed by the majority of first-time users. | P2 MEDIUM |
| P3-8 | No honoree age, no milestone depth, no "surprise or announced?" in intake. The system cannot differentiate a 50th birthday from a 5th birthday from intake alone. Sprint A (honoree age field) begins to fix this. | P1 HIGH |
| P3-9 | 5 required fields shown before the create completes (type, date, count, name, location). Count and name are presented together; name is optional but labeled and visible. Form length is not the issue — sequential revelation is — but the last screen feels denser. | P3 LOW |

### First event creation click count: ~6–8 clicks
(Welcome card → Type → Date → Count → Location → Create)

That's reasonable.

---

## Phase 4 — First AI Win

### What actually happens

After "Create event" is pressed, **AssembleReveal** fires — a full-screen animated sequence (`src/App.js:22445`):

```
[Event glyph in event's identity color, 78px, animated in]

Setting up [event name]           (eyebrow)
Putting it together…              (headline)

[ ✓ Building your day             ]  → reveals first  (360ms)
    12 moments, hour by hour

[ ✓ Sizing the food & drink       ]  → reveals second (620ms)
    23 items for ~18 guests

[ ✓ Writing your shopping list    ]  → reveals third  (620ms)
    Every item, ready to check off

[Open my event →]  ← always live, never a fake loader
```

Headline changes to **"Your plan is ready."** when all 3 cards are done. Haptic feedback fires (`feedbackReveal()`). The button label changes from "Take me in →" to "Open my event →".

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P4-1 | AssembleReveal is the best first-run UX in the product. Real computed values ("23 items for ~18 guests"). Event identity color. Ceremonial weight. The "someone competent just handled this" feeling lands. | STRENGTH ✓ |
| P4-2 | The reveal is never a fake loader. The button is live from frame 1. The comment reads: "An impatient host opens instantly; the rest watch it build." Correct. | STRENGTH ✓ |
| P4-3 | Events WITHOUT a food playbook show only 2 cards (day + shopping skipped). The reveal is noticeably thinner. No explanation to the user. The "wow" is weaker for non-food events. | P2 MEDIUM |
| P4-4 | The AssembleReveal only fires when the event qualifies as host-nav (or post-create in the planner flow). The shell routing bug (P3-2) means 19 event types miss the full reveal experience. | P0 CRITICAL (linked to Sprint A) |
| P4-5 | "Your plan is ready" is the moment. What follows it — the first view in the event — must be equally strong. The "Your Event" tab (first tab shown) is an identity summary, not an action surface. The user might wonder: "Now what?" | P1 HIGH |
| P4-6 | No explanation of HOW the plan was built. The cards say what was done, not on what basis. "Based on typical patterns for a Retirement Party" or "Sized to 18 guests using USDA meal quantity guidelines" would build trust at the peak moment. | P1 HIGH |
| P4-7 | The reveal happens once. If the user navigates away and returns, the plan is just there — no signal of its origin. The wow only has one shot. | P2 MEDIUM |

### Does the "first AI win" happen early enough?

Yes, but barely. The user gets the reveal **after** creating an event — within the first session, before any investment. That's the right timing. The question is whether the reveal is legible enough to be memorable when the user is still learning the product.

---

## Phase 5 — Trust

### What the user sees and can verify

After AssembleReveal, the user enters the event. These are the trust signals available on the first view:

| Signal | Where | Present for new user? |
|--------|-------|----------------------|
| `playbookSetupPreview` steps (modal) | Create modal | ✓ Yes |
| "Sized to N guests" (shopping) | Shopping list | ✓ Yes |
| Per-guest quantity "because" labels | Shopping items | ✓ Yes (since 2026-06-22) |
| Day-of timeline moments | The Day tab | ✓ Yes |
| Vendor provenance ("NETWORK-TRUSTED") | Vendors tab | ✗ No — needs populated vendor bank |
| Attendance adjustment + `because` | Guests tab | ✗ No — needs 3+ Memory observations |
| Source attribution on milestones | Plan tab | ✗ Never shown |
| Confidence tier on any recommendation | Any tab | ✗ Never shown |
| "This is based on..." header | Any tab | ✗ Never shown |

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P5-1 | Shopping list quantity "because" labels exist ("Based on 1.5 servings per adult, 18 guests"). These are a genuine trust builder. They're present for new users. | STRENGTH ✓ |
| P5-2 | Plan milestones have no source attribution. They appear as authoritative commands ("Book the venue — 90 days out") with no basis given. A skeptical user has no way to verify these are correct for their specific event. | P1 HIGH |
| P5-3 | The playbook intelligence has knowledge pedigree (KCR system, sourceCatalog.js) but none of it surfaces to the user. The system knows WHERE its advice comes from; the user never sees that. | P1 HIGH |
| P5-4 | Vendor provenance (NETWORK-TRUSTED, CLIENT-REFERRED, etc.) only appears once a vendor bank is populated — a feature only returning planners can access. New users see no social proof that vendor recommendations are trustworthy. | P2 MEDIUM |
| P5-5 | For the first event, no part of the system says "I've seen this before" or "here's what usually goes wrong." Those signals exist in the playbook (risks, contingencies) but they're not framed as trust-building. They're just information. | P2 MEDIUM |
| P5-6 | Uncertainty is not communicated. A new user cannot tell the difference between a high-confidence recommendation (based on 50 events) and a low-confidence one (best guess for an unusual type). Every recommendation reads with identical authority. | P1 HIGH |
| P5-7 | The food plan says "sized to your count" but doesn't say WHAT formula was used. BLS regional pricing labels exist in the codebase but are behind the `ai-backend-rewire` branch — not live in production. | P2 MEDIUM (branching issue) |

### The trust question for every recommendation:

- "Why should I believe this?" — answered only for shopping quantities (the "because" label). Not answered for anything else.
- "Is there supporting evidence?" — not exposed to users.
- "Can I inspect the reasoning?" — no inspection interface exists.
- "Is uncertainty communicated?" — no.
- "Is this recommendation actionable?" — mostly yes, some milestones are vague.

---

## Phase 6 — Cognitive Load

### First screen after AssembleReveal

The user lands on the "Your Event" tab with sub-tabs:

```
[Your Event] [Plan] [Budget] [Guests] [The Day]
```

For a host shell event, this is the host navigation. For the 19 misrouted event types (Sprint A), it's the planner navigation: `[Command] [Planning] [Vendors] [Guests] [Budget] [Docs] [Comms]` — 7 tabs, none self-explaining to a first-timer.

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P6-1 | The welcome hero presents 3 clear paths, none misleading. Clean. | STRENGTH ✓ |
| P6-2 | The 5-tab host navigation is learnable (Your Event / Plan / Budget / Guests / The Day). The labels make sense after a session. But there's no onboarding gesture pointing the user to the Plan tab — which contains the most intelligence. | P1 HIGH |
| P6-3 | For the 19 shell-misrouted event types, the user lands in a 7-tab planner cockpit. "Command · Planning · Vendors · Guests · Budget · Docs · Comms" — none of these labels address a personal host's questions ("What do I do next?", "How much does this cost?", "Am I missing anything?"). | P0 CRITICAL (Sprint A) |
| P6-4 | "New here? See how to run an event, step by step →" is the only orientation offer before the create modal. It's a text link. Most new users will not click it. This guide — whatever it contains — is likely the clearest orientation resource in the app, but it's buried. | P1 HIGH |
| P6-5 | The Plan tab has the next-step engine, decision board, and timeline. The user must discover it through tab exploration. There's no CTA on the first screen that says "Start here: here's what to do first." | P1 HIGH |
| P6-6 | The "START HERE" priority level exists in the command system and appears on high-severity next actions. But this signal only fires if the user navigates to the right tab. A new user who doesn't know to check the Plan tab will miss it. | P1 HIGH |
| P6-7 | On mobile (390px), the tab bar compresses. The host 5-tab set is manageable. The planner 7-tab set is not. Tab overflow / scrollable tab bar behavior is not audited here (render-verify required). | P2 MEDIUM |
| P6-8 | After the AssembleReveal "Your plan is ready" → user taps "Open my event →" → lands on Your Event tab. The "Your Event" tab shows identity information (event name, type, date, guest count). This is a landing page, not an action surface. The user's first question after "wow" is "what do I do?" — this tab doesn't answer it. | P1 HIGH |

### Three first-screen questions (per-screen audit):

| Screen | What am I doing? | Why? | What happens next? |
|--------|------------------|------|-------------------|
| Auth screen | Signing in | Unknown | Unknown |
| Welcome hero | Starting | "Plan your first event" | Create event |
| Create modal | Setting up my event | "I'll build the whole plan around it" | See the plan |
| AssembleReveal | Watching the plan build | Visual reveal of deliverables | Open my event |
| Your Event tab | ??? | ??? | ??? (explore tabs) |

The "Your Event" tab breaks the question chain.

---

## Phase 7 — Conversion Readiness

### What exists today

No upgrade prompts appear in the first-run flow. The user experiences the full product without being shown:
- What premium adds
- When a trial ends
- What they'd lose without a subscription
- Why paying is worth it

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P7-1 | There is no conversion moment in the first-run flow. Not at the AssembleReveal ("Your plan is ready — this is what you get with Event Boss"). Not at the first plan view. Not at the first shopping list. | P0 CRITICAL |
| P7-2 | The product is fully unlocked for new users. This is fine for early activation, but there's no moment where the user realizes: "I would lose something if I didn't subscribe." Value realization without urgency doesn't convert. | P1 HIGH |
| P7-3 | The AI planning features (playbook milestones, shopping list, food sizing, risk cards, contingency plan) are all present in the first session. The user experiences the ceiling immediately — there's no "unlock more" path visible. | P1 HIGH |
| P7-4 | "Subscribing" never comes up. The concept of the product being paid is invisible. For a user who isn't already expecting to pay, this is fine. For a user trying to decide if it's worth paying for, the answer never surfaces. | P2 MEDIUM |
| P7-5 | The "Do It For Me" feature (auto-drafted invites, vendor inquiries, thank-yous) is one of the product's clearest premium value demonstrations. It's present but not highlighted as something the user should try in the first session. | P2 MEDIUM |

### When does the user think "I don't want to plan events without this"?

**Current answer:** It's possible — after assembling a plan and seeing the shopping list sized correctly — but it happens by accident, not by design. The product doesn't guide the user to this realization. It requires them to use the product enough to discover it.

---

## Phase 8 — Returning User

### What happens on the second session

The user returns (same day or next day). They log back in. They see:

**If they have one event:** The event list on the home screen, without the welcome hero. The event card shows status. They tap it, see the 5 tabs, continue where they left off.

**If they created a second event:** The same create modal — no "you planned X before" context, no suggestion based on prior event type, no "here's what went well last time."

**Memory / Intelligence Profile** (`pi.memory` flag): This system exists but requires data. The attendance adjustment `because` field fires only after 3+ observations. No Memory surface is active for a first-session returner.

### Findings

| # | Finding | Severity |
|---|---------|---------|
| P8-1 | The second session has zero personalization. The home screen looks the same as the first session (minus the welcome hero). There is no "welcome back" moment, no reinforcement of what was accomplished in session 1. | P1 HIGH |
| P8-2 | The D1 and D7 return signals are tracked (PostHog) but there is no UX response to them. The system knows the user returned — it doesn't act on that knowledge. | P1 HIGH |
| P8-3 | The second event creation modal is identical to the first. No "you've done this before" context. No type suggestions. No "last time you needed 18 guests — want to use that as a starting point?" | P2 MEDIUM |
| P8-4 | The Intelligence Profile requires 3+ observations to activate the attendance band and because-labels. This means the second event is planned with exactly the same intelligence as the first. There is no felt improvement. | P1 HIGH |
| P8-5 | The home screen after session 1 shows an event card, but it doesn't highlight: "3 things changed since you were here" or "your next milestone is in 14 days." The return visit has no urgency. | P1 HIGH |
| P8-6 | If a user left during or after AssembleReveal, they won't see the reveal again. But there's no alternative "welcome back to this plan" experience when they re-enter their event. They land on the same tab they left. | P2 MEDIUM |
| P8-7 | No re-engagement copy anywhere in the app. The system doesn't know when to say "your event is 30 days out — here's what moves now." This is a retention play that doesn't exist. | P1 HIGH |

### Does the second session feel faster, smarter, more personalized?

**Faster:** No. Same modal, same flow.  
**Smarter:** No. Intelligence activates after 3 observations minimum.  
**More personalized:** No. No welcome back, no memory of prior event, no type context.

The second session feels identical to the first. That's a retention failure.

---

## Issue Concentration

### By root cause

| Root | Issues | % | Fix Lever |
|------|--------|---|-----------|
| **No front door** — auth wall is the entry point, no value demonstration before commitment | 6 | 20% | Landing page / pre-auth experience |
| **Shell routing bug** — 19 event types route personal hosts to planner cockpit | 7 | 23% | Sprint A: Persona Resolution Engine |
| **Trust gap** — recommendations appear with no basis, source, or confidence | 7 | 23% | Source attribution system (Sprint C side effect) |
| **No returning user experience** — second session = first session | 6 | 20% | Sprint E: Return layer |
| **No conversion path** — no upgrade moment, no urgency, no premium demonstration | 5 | 16% | Sprint F: Conversion |

### Priority order

Fix in this sequence:

1. **Sprint A (already specced)**: Shell routing — fixes 7 of these issues immediately, enables the correct first impression for 19 event types.
2. **Front door**: Pre-auth value demonstration — a single marketing page (or a guest/preview mode) that shows the product before sign-up.
3. **"What do I do next" from first view**: The Plan tab CTA needs to be in the face of new users at the right moment — not buried in tab 2.
4. **Trust layer**: Source attribution at plan level ("Based on typical Retirement Party planning patterns"). This requires the same provenance work Sprint C produces — it's a surfacing problem, not a new-data problem.
5. **Return layer**: "Welcome back" moment, delta since last visit, re-engagement copy.
6. **Conversion**: Premium demonstration at natural value realization moments.

---

## Success Metrics — Baseline vs Target

| Metric | Current estimate | Target (after Sprint A + Front Door) |
|--------|-----------------|--------------------------------------|
| Did the user create an event? | ~40% (estimated — requires real data) | 70%+ |
| Did they complete intake? | ~60% of creates | 80%+ |
| Did they see an AI-generated plan? | ~50% of creates (shell routing failure for 19 types) | 90%+ (Sprint A) |
| Did they accept at least one recommendation? | Unknown (no tracking) | Need instrumentation |
| Did they experience a clear "wow" moment? | ~40% (AssembleReveal, when shell is correct) | 70%+ (Sprint A) |
| Could they complete planning without outside help? | Unknown | Need observation sessions |
| Would they trust the platform enough to use it again? | Unknown | D7 return rate as proxy |

---

## HIP-1 vs UXP-1 — Combined View

| Question | Audit | Answer |
|----------|-------|--------|
| Is the planner intelligent enough? | HIP-1 | 5.8/10. Good foundation, architectural roots need Sprint A–C. |
| Can a new user reach that intelligence? | UXP-1 | 4.6/10. Major gaps in Phase 1 (no front door) + Phase 3 (shell routing). |
| **What should be built first?** | Both | **Sprint A** is the pivot. It fixes the #1 HIP-1 root cause AND the #1 UXP-1 failure mode simultaneously. Every other investment depends on users landing in the right shell. |

---

## Recommendations by Phase

### Immediate (this sprint)
- **Execute Sprint A** — persona resolution engine. Fixes 7 UXP-1 issues and 19 HIP-1 issues.
- **Wire "Plan" tab as the post-Assemble default** — after "Open my event →", show Plan tab not Your Event tab. The user's first question is "what do I do?" — Plan answers it.

### Sprint A+1 (front door)
- Build a pre-auth **value demonstration screen** before the login form. Not a full marketing site — a single screen that shows: what the product does in one sentence + one animated or static screenshot of a completed plan + "Get started" → login.
- Alternatively: an unauthenticated **preview mode** (read-only, seeded with a sample event) so users can experience the product before committing their email.

### Sprint A+2 (trust layer)
- Add **plan-level attribution** ("This plan was built using typical patterns for a Retirement Party, validated against 40+ years of event planning knowledge"). One line, low chrome.
- Add **confidence tier** to playbook milestones — high confidence (canonical, well-sourced) vs. typical (general pattern). The KCR system already has this; it needs to surface.

### Sprint A+3 (return layer)
- **Delta since last visit**: "Since you were here, you have 2 decisions waiting and your event is 30 days out."
- **Returning create flow**: "You planned a Graduation Party last time — want to start from there?" (type suggestion only, no data copying).
- **D7 email / push**: "Your event is coming up. Here's what moves this week." (Requires backend — schedule separately.)

### Sprint A+4 (conversion)
- **Premium demonstration at the wow moment** — after AssembleReveal: "This is what Event Boss builds for every event — powered by [N] expert planning patterns. [Upgrade to unlock X]."
- **Natural gate** for a premium feature at a natural realization point (vendor COI tracking, guest dietary sheet, multi-event planning).

---

## Appendix — Component Locations

| Component | File | Line |
|-----------|------|------|
| Auth screen | `src/components/AuthGate.jsx` | L72–188 |
| Welcome hero | `src/App.js` | ~24540 |
| Create modal (Q1 + playbookSetupPreview) | `src/App.js` | ~11543 |
| AssembleReveal (the "wow" moment) | `src/App.js` | ~22445 |
| Setup progress tracker | `src/App.js` | ~21050 |
| First run signals | `src/App.js` | ~2220 |
| Activation event tracking | `src/App.js` | ~282–300 |
| First value tracking | `src/App.js` | ~258–279 |
| Return signals (D1/D7) | `src/App.js` | ~298–299 |

---

*UXP-1 audit complete. 8 phases, 4.6/10. The intelligence exists. The ramp to it does not.*
