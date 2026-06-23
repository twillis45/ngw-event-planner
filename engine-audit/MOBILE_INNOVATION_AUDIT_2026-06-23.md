# Mobile Innovation Audit — "Too SaaS. Break the bubble."
**Date:** 2026-06-23 · **Scope:** MOBILE (390px) · **Method:** 4 parallel expert lenses + live web research, grounded in render captures.
**Lenses:** Anti-SaaS/consumer-app · Information display & transition (motion) · Consumer-event/party · Deep web research (frontier + experts to recruit).

---

## The one diagnosis all four lenses reached independently

> **The app treats a celebration as a WORKLOAD to be tracked, not an OCCASION you're excited about.** It's a desktop control-room dashboard responsive-shrunk onto a phone. The copy got the warmth right; the *visual system and the mental model never did.* A board meeting and a Juneteenth crab feast render in the **identical** carbon-steel shell. The data already knows it's a party for the people you love — the pixels are still rendering vendor-status telemetry.

**SaaS-ness is a mental model, not a color.** The model here is "dashboard for a process." The fix is "companion for an occasion."

### The exact tells (named, mobile)
1. **The dark-card stack** = the universal grammar of Linear/Notion/Stripe internal tools. Equal-weight rounded cards read as *widgets*, not "my cookout." There is no hero — just a grid.
2. **Uppercase letter-spaced eyebrows** ("YOUR NEXT STEP") = the single loudest SaaS tell. "The font equivalent of a lanyard."
3. **Status-chip vocabulary** ("On track", "3 done", "by Jun 25") = project-management language wearing a party hat. A celebration is not a backlog.
4. **Uniform gray hierarchy** = one mood, neutral-administrative. The day you throw a party, the app's affect equals a Tuesday standup. *Calm got over-applied until calm became flat.*
5. **Food plan = a priced spreadsheet.** "QuickBooks for hot dogs." The most sensory part of a party rendered as the most clerical surface.
6. **The countdown actively works against feeling** — `countdownLabel` (~App.js:1366) goes **greyer/cooler as the day nears**. Anticipation should warm up; ours cools down. (This is almost a bug.)
7. **Cultural specificity lives in the engine and dies at the surface.** Dedicated playbooks (Kwanzaa, crab feast, Lowcountry boil, pupusa, Juneteenth) all render in the same steel shell. `EVT_CLR` exists but only paints a 12px pill.
8. **Morning-of = the operating room** (`EventDayMode`: "LIVE", "HOLD 5+", red CTAs) — a host's proudest day reads as incident response. (Contradicts our own Ruthless Host Lens.)

---

## What "personality" means here (without breaking calm/honest)
Not confetti, not a mascot, not gamification. Personality = **a point of view + a temperature** — the app feels like it *knows what a party is and is on your side.* Levers:
- **Voice** — warm-competent, not corporate-cheerful and not fake-hype. "On track" → **"Food's handled. Just the playlist left."** (Cheapest, highest-leverage lever; costs zero pixels.)
- **One signal motif** (a lit ember / string-light dot), not a character — the "next step" mark + the caught-up reward. Stays inside iconic-only doctrine.
- **Color as meaning, finally earned** — one identity hue *per event, from its type/culture*, on the hero + spine only.
- **Type-as-graphic for the date** — the countdown ("**9 days**") is the most emotional number in the app; set it big, let type carry the feeling.
- **The caught-up state as the reward** — dim the room, one warm line ("Nothing needs you. Go enjoy the prep."), the event color glows once.

---

## The signature idea — **"The Approach / The Runway"**
> Stop stacking cards a host scrolls *down*; build a **runway a host travels *along*.** Now → the next days → **The Day** as a visible horizon. Opening the app gently **advances you** toward the event (it's *closer* than last time). The single next step is the **one lit object at the station you're standing on**; food/budget/guests are *what's due along the way*; the heart waits at the horizon; on the morning-of you **arrive** (hero + heart, nothing else).

Why it's *the* Event Boss thing: it turns "I've got this, you're moving forward" from a copy line into a **felt spatial truth** — progress you can see the *distance* of. Calm + honest by construction (no timers, no badges). Ownable the way Arc owns the sidebar.

### Supporting display/transition reinventions
- **"Scenes, not pages."** Tapping an event → the card **becomes** the event (shared-element container transform; title flies to header). No cut → no "start over." Reverse shrinks it back to its spot (spatial memory).
- **Tabs = rotations of one object.** Plan/Budget/Guests/The Day are *faces of the same event object* (persistent header/heart, axis rotation w/ parallax) — "the money side of *this* party," not a different screen.
- **Assembly motion** — when the app computes (food from headcount, budget from playbook), **assemble it** (numbers count up, bars grow to fit, items drop in). The "Do It For Me" leap made visible. Once, on change only (motion = change).
- **Money fitting** — budget changes *redistribute to fit* (largest absorbs residual); the host sees the money fit (or visibly not). No red alarm theater.
- **Modals = the surface lifts** (recede + dim, sheet rises from the bottom in real z-depth), never a cross-fade between unrelated planes.

---

## Consumer-event moves (make it feel like throwing a party)
1. **Every event = a real cover + identity at creation** (full-bleed cover, display-type title, live countdown; per-type/culture art+color: cookout = smoke/char, crab feast = newspaper/Old Bay, Kwanzaa = red/black/green, Juneteenth = the toast & the telling). *Highest-leverage change — half-built in `EVT_CLR` + playbooks, fully suppressed in UI.*
2. **Guest list = a room filling up** — faces/initials, "9 coming" plainly; dietary note attached to the *person*. (Today: a CRM status table.)
3. **"Your spread" = a proud, food-first hero** — named dishes big and warm; price demoted to a quiet tappable line. Same honest data, different register.
4. **Countdown warms up, not greys out** — flip `countdownLabel`: "11 days" → "This Saturday" → "Today", more present as it nears.
5. **Morning-of = calm hype, not triage** — gate out the command-bar/HOLD/vendor console for hosts; good-morning + cover + the one must-have moment + ≤3 gentle to-dos.

---

## Experts to recruit (break the bubble — add to the review board)
Web-research named real practitioners; the two highest-leverage seats to add **first**:
1. **Interaction / motion-engineer (the "feel" seat)** — deform, scale-on-touch, haptic timing, shared-element transitions. *Refs: Emil Kowalski (Linear — restraint/speed, ideal for a calm tool), Rauno Freiberg (Vercel — craft-level detail).*
2. **Editorial / magazine art director (type-as-graphic seat)** — numbers as the hero graphic; a characterful house type system. *Refs: Order, Gretel.*

Then: **Brand/character designer** (warmth without cartoon — *BUCK*, Cash App), **Consumer-social product designer** (the Partiful instinct — *Studio Kaki*, Browser Company), **Game-feel designer** (juice without gamification — Cultured Code/Things 3 Taptic discipline), **Spatial/depth designer** (the "scenes" system — use lightly).

### Techniques worth stealing (from the frontier)
Shared-element "scenes not pages" (Arc) · Magic-Plus drag-to-place + haptic-on-commit (Things 3) · film-roll "develops overnight" for the post-event photo album (Lapse) · binary-comparison ranking for vendor/menu/song decisions (Beli) · type-as-graphic + color-as-information (Cash App / BUCK) · a whisper-level reactive mark (Arc smiley / Duo).

## What to NOT do (preserve the brand)
No confetti / "🎉 you crushed it" (dishonest — you bought buns). No streaks/points/badges. No cartoon mascot. No second accent color "to pop." No illustration-per-card. **Celebrate by getting quiet, not loud.** Warmth must stay honest (cover/faces/heart are respect, not fake urgency).

---

## Recommended sequencing (highest leverage first, all honesty-safe)
1. **Voice pass** — kill eyebrow-caps + chip vocabulary; rewrite to spoken truth. (Copy + one component; flips the *felt category*.)
2. **The event identity object** — cover + culture color + big countdown as the home hero. (Half-built in data.)
3. **Countdown warms, not greys.** (Near-trivial, big emotional payoff.)
4. **Faces not rows** (guest list) · **food-first spread** (re-register the food plan).
5. **The Approach** — prototype the runway + shared-element "card becomes event" as the signature. (Bigger; the moonshot.)
6. **Recruit the motion-engineer + editorial seats** to own 1–5 to a 10+ bar.

**Verdict: the app isn't ugly — it's *uninhabited*.** It looks like the tool that tracks the party instead of the friend throwing it with you. The fastest break-out is mental-model + voice + one hero + one identity color — not a visual-noise redesign.
