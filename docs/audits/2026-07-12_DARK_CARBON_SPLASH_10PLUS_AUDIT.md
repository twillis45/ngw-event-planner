# Dark Carbon Splash — The 10+ Audit

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/0c052828-f35f-4b43-8f77-d11a78b11513. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-12 · Source: artifact `0c052828`

---

**Event Boss · Splash: Dark Carbon · consolidated rescore, 2026-07-12**

# Rescore: every fix item, verified against the actual code — and pushed harder

Not a new investigation — a verification pass, then a second pass when told to be **brutally honest** rather than accept a clean sweep at face value. First pass: every `.f-fix` item across all three waves re-checked with `grep` against live source, 15 for 15 confirmed present. Second pass, pushing past "everything's done": found one real gap the first sweep missed entirely — fixed and re-verified below — plus checked one more thing that looked wrong on inspection and turned out to be an acceptable, arguably intentional effect, not a defect.

| Score | Meaning |
|---|---|
| **9.7 / 10** | Consolidated, honest — see the flagged unknowns below |
| **16 / 16** | Fix items verified present in current code (was 15 — see below) |
| **2** | Genuinely unreachable from here (hardware/perf) — attempted, confirmed blocked |

Full trail: deck **4.8** → Dark Carbon scoped **6.0** → post-ship **7.5** → Wave 1 hostile **6.5** → all 10 items shipped incl. the inversion → Wave 2 (**2** regressions caught + fixed, boot policy resolved) → Wave 3 (wordmark to AAA contrast + cascading bead/caps/tagline fixes) → rescore pass 1 (15/15 verified) → **rescore pass 2, this one: caught a 16th gap the first "everything's done" sweep missed, fixed it, held at 9.7** — the score didn't move because the new find was fixed within the same pass, but it's the reason this says 9.7 and not a flat, self-congratulatory 10.

### FIXED, FOUND BY PUSHING HARDER — The short-viewport bead never got the presence arc at all

The first rescore pass verified `sp-bead-fall-short` exists and clips correctly — true, and not enough. It never checked whether that variant kept pace with a LATER change: `sp-bead-fall` (full-size) got a "larger while alone, true size at landing" presence arc; `sp-bead-fall-short` was still flat `scale(1)` the whole time. Every short-viewport or landscape host was silently missing that entire improvement — a real, live gap that "confirm the fix exists" checking didn't catch, because the fix existed, just not everywhere it needed to.

**Fix** — Same `scale(1.3)` arc added to `sp-bead-fall-short`. Re-measured clipping margins with the now-larger held size: 12–35px clear across 280/320/340/390/560px (down from the pre-scale 16–38px, exactly as expected from a 30% larger radius — still safely positive at every tested height).

### CHECKED, HOLDS — The bead blows out to a flat bright ellipse at the impact frame

Zoomed on the exact impact frame (t≈2980ms, ~80%): the specular highlight has essentially merged into the squashed body's own brightness — no distinct glossy dot, just an overexposed bright oval. Real, visible, confirmed via screenshot.

**Not fixed — read as intentional.** A sufficiently bright momentary flash clipping to a blown-out highlight is how real light reads at peak brightness (the same thing a camera does at peak exposure) — it sells "flash" rather than undermining it. Left alone; flagged here so it's a documented judgment call, not an unnoticed defect.

## Verified present — 16 fix items, this pass

- Tap-through fix — `pointer-events:none` confirmed absent from `.splash-leaving`
- Timestamp boot gate — `SPLASH_REPLAY_DAYS`, 21-day replay window
- Physics pass — `sp-boss-dip`, `sp-contact`, `cubic-bezier(.5,0,1,.6)` fall
- Resequenced tagline — `sp-tag2` timed to land on the 76% impact frame
- Landscape/short-viewport — `@media(max-height:560px)`, re-verified 280–560px clear
- Daily-boot stagger — `dash-hold` wired on the main shell's `.content`
- Font honesty — `1,500` (italic 500) present in the Google Fonts URL
- Compositable relief — `.sp-carv` shadow is static, only opacity animates
- `inert` + accessible skip — `inert={splash !== 'gone'}`, `role="button"`
- The inversion — `sp-bead-fall`, bead alone from frame one
- Short-viewport bead clip — `sp-bead-fall-short`, vh-clamped
- Glow repositioned + follows the fall — `sp-glow-follow`/`sp-glow-settle`
- sessionStorage fallback + cross-device sync — `splashLastSeen` in the synced profile
- Bead never dark — surface runs light-steel → `--ink` across the whole sequence
- Caps/tagline brightness — lifted to 9.79:1 / 13.27:1, still secondary to the 16.71:1 wordmark
- Short-viewport presence arc — `sp-bead-fall-short` now matches the full-size scale arc

## Vs. leaders — where this now stands, checked against the same research

- **Wordmark material** — solid, high-contrast fill now matches the Airbnb/Uber/Linear/Nike pattern found in the research; the neumorphic same-tone treatment (no leader precedent, documented industry-abandoned trend) is gone
- **Accessibility** — 16.71:1 exceeds every leader-adjacent bar found; the 1.00:1 failure this whole track started from is fully resolved
- **Quick-cut duration** — ~~1200ms~~ now exactly 1000ms, matching Android's SplashScreen bound instead of sitting 200ms over it. One-line fix, no reason not to clear it once named.
- **A multi-second brand film at all** — Apple HIG's position is that a launch screen should never be a branding moment, full stop, on ANY load. This product still runs one on first boot / after a 21-day absence. **Left standing, deliberately** — the earlier boot-frequency verdict already named this as an accepted, considered tradeoff for a product whose own standard is a ceremonial moment, not a bare utility screen. Recorded here again so "vs. leaders" doesn't quietly drop the one point where the answer is "we disagree with the strictest reading, on purpose," not "we missed it."

## Explicitly not claimed — attempted, hit a real environmental limit

### ATTEMPTED, BLOCKED — Frame-rate performance under load — genuinely tried, not just left unverified

Built a real `requestAnimationFrame`-based frame-timing harness (frame count, avg/max frame time, frames over the 16.7ms/33ms budget) and attempted to run it against the actual splash, including a version with artificial main-thread load to approximate throttled hardware. Both runs hung until timeout. Root cause, confirmed rather than assumed: `document.visibilityState` reports `"hidden"` on this tab — Chrome suspends `requestAnimationFrame` entirely for backgrounded tabs, and no tool available in this environment can force a tab to actual OS-level foreground (a synthetic click dispatches input but doesn't change which tab Chrome treats as active — verified: `document.hasFocus()` flipped to `true` after clicking, `visibilityState` stayed `"hidden"`). This is why every other verification this session used the Web Animations API's `currentTime` scrubbing instead — that mechanism keeps working in a backgrounded tab; frame-by-frame real-time instrumentation does not. The compositable-relief reasoning (static shadow, transform/opacity-only animation → compositor thread, not main thread) remains sound engineering — Chrome's own architecture documentation confirms this is how the rendering pipeline works — but it's still unmeasured, not measured-and-passing.

### NOT REACHABLE FROM HERE — Real physical devices

No device farm, cloud device lab, or physical hardware is reachable from this environment. Every verification this session (including the original same-tone wordmark's near-invisibility on "a bright/low-quality screen") was done in a desktop Chrome instance — synthetic short-viewport harnesses stood in for real short phones. Stated plainly rather than worked around with a simulation dressed up as the real thing.

---

**Event Boss · Splash: Dark Carbon · hostile investigation · Wave 2, 2026-07-12**

# Wave 2: the inversion shipped — what's actually in the way now

All ten items from Wave 1's road-to-10+ are now shipped, including #10, the inversion (the bead as protagonist, alone in the dark from frame one). This wave re-audits **that specific rewrite** for fresh regressions, plus opens a track the first audit never scored: **the reload/repeat-open policy** against real platform/leader precedent, researched fresh. Method: live frozen-frame animation scrubbing (paused Web Animations, `currentTime` set to exact ms, computed transform matrices read directly — not eyeballed), a synthetic short-viewport harness measuring actual clipping in pixels, and a research pass citing Apple HIG, Android's SplashScreen API, and Superhuman's own published launch-speed doctrine. **Two real regressions found and fixed in this pass; one structural policy question found that isn't a code defect at all — it's a product decision nobody has actually made yet.**

| Score | Meaning |
|---|---|
| **10 / 10** | Motion/craft, post-fix — the inversion executes clean now |
| **?** | Boot-frequency policy — no leader precedent found either way; see below |
| **2** | Fresh regressions found this wave, both fixed + re-verified live |

Audit trail: deck **4.8** → Dark Carbon scoped **6.0** → post-ship **7.5** → Wave 1 hostile **6.5** → all 10 items shipped, incl. the inversion → **this wave: caught 2 regressions the inversion itself introduced, fixed both, and found the boot-frequency policy has no precedent among leaders or platform guidance**. Full Wave 1 findings (motion craft, the road-to-10+ list) preserved below as the historical record — nothing in it has reversed, it's been executed.

## Wave 2 — regressions the inversion introduced, found live and fixed

### FIXED THIS WAVE — The protagonist was invisible on exactly the device class Wave 1 already fixed once

The inversion's whole premise is the bead held aloft, lit, alone in the dark, for the first ~55% of the clock — but its `translateY(-240px)` hold offset was a fixed px value with no height-awareness. Measured live in a synthetic 390px-tall harness (the same height Wave 1 measured for the wordmark/caps collision): the bead's entire held position sat **94–116px above the visible, `overflow:hidden` stage** — invisible for its own establishing beat, popping into view only mid-fall. Same short-viewport/landscape class Wave 1 called a blocker for the wordmark; nobody had run the new bead choreography on it at all.

**Fix** — Added a separate `sp-bead-fall-short` keyframe set with a `vh`-clamped hold offset (`clamp(-100px, -20vh, -70px)`), swapped in via `animation-name` under the existing `max-height:560px` query. Re-measured at 280/320/340/390/560px: clears with 16–38px of margin at every height — verified via computed `getBoundingClientRect()`, not eyeballed.

### FIXED THIS WAVE — A second, unrelated light source was quietly undermining the whole inversion's causality

`.sp-glow` — the ambient drifting bloom — sat at `left:6% top:-4%`, a wash over the upper-left/center that predates the inversion by months. It had no relationship to anything: not the wordmark, not the frame, and — critically, now — not the bead, which measured live at **~86%, 24%** of the stage during its held-aloft beat. Two independent light sources doing unrelated things in the same dark frame directly contradicts the inversion's entire premise ("the bead's light resolves the mark") — the audience has no reason to read the glow as connected to the story at all. Host flagged it unprompted as "a little arbitrary" before this audit confirmed why.

**Fix** — Recentered the glow on the bead's measured position (`left:52% top:4% width:60% height:36%`), mirrored the opposite-corner vignette angle to match (`160deg → 200deg`) so the two keep agreeing, and retimed the drift to move toward the bead's eventual fall direction instead of away from it. Re-verified live: the bloom now visibly wraps the bead, reading as its own light rather than a coincidence.

## Wave 2 — the boot-frequency policy, against real precedent (researched, not assumed)

### UNRESOLVED — PRODUCT DECISION — "Full film once ever, permanent quick-cut after" has no precedent among leaders or platform guidance

Current policy: a `localStorage` flag set the first time the splash ever finishes; every load after that, forever, on that device/profile, gets a stripped ~1.2s cut. Researched against real sources, not general impression:

- **Apple HIG (current, direct quote):** "The launch screen isn't a branding opportunity... don't design an entry experience that looks like a splash screen." It must look "nearly identical to the first screen of your app." Apple treats "launch screen" and "splash screen" as opposed concepts and **forbids the latter outright** — every load, not just repeats.
- **Android SplashScreen API (12+, official docs):** recommends ≤1,000ms, and explicitly shows **on every cold/warm start** — never suppressed permanently after first use. "Never shows during a hot start" is the only exemption, which is a technical distinction (already-running process), not a "seen it once" one.
- **Superhuman (primary source, their own engineering blog):** the "100ms rule" — no brand moment to reason about at all, on any open, solved via raw speed rather than gating a splash by visit count.
- **No verified example** — leader app or platform doc — of "show the full branded moment exactly once in the app's lifetime, then never make it available again" as a deliberate pattern. The closest real precedent found was *onboarding tutorials* (Material Design: show once) — but that's walkthrough content, not a brand-film splash; conflating the two isn't supported by any source.

**Not a code fix — a decision.** Three real options, none of them "wrong," but the current one is the least precedented of the three: **(a)** keep once-ever-permanent, accept it's a novel policy with no comparable; **(b)** time-box it — replay the full film after N days of inactivity (a "welcome back" beat, which DOES have informal precedent in re-engagement patterns, though no named leader confirmed doing it for a brand splash specifically); **(c)** add a real user-facing "replay the intro" affordance (currently only a `?splashfull` dev URL param exists — zero in-app path, verified: only 2 references to the flag/param in the whole file, neither wired to any button or menu).

### REAL, MINOR — Three edge cases the current policy has no answer for

Verified in code: private/incognito browsing plays the full ~4.75s film **every single load, forever** (the flag write/read both fail silently and fall back to "never seen" — a deliberate choice per the code's own comment, but worth being an explicit product call, not a side effect). A second device or browser profile — even the same signed-in host account — replays the full film once, since the flag lives in `localStorage`, not the synced profile. And any legitimate "clear site data" privacy sweep silently reverts a host to first-boot status with no way for the app to tell the difference from an actual new user.

> **Wave 2 verdict.** The inversion's *execution* is now a clean 10 — both regressions this wave found were real, measured, and are fixed and re-verified live. The *policy* question is genuinely open: nothing researched supports "once ever, then permanently stripped" as an established pattern, but nothing researched forbids it either — it's simply undocumented territory. That's a call for the host to make, not something a re-audit can score.
>
> **Resolved same session, after this was written:** host chose option (b), time-boxed. `LS_SPLASH_SEEN` now stores a timestamp, not a boolean — the full film replays after 21 days of absence. Both edge cases fixed too: a `sessionStorage` fallback degrades private/incognito to the quick-cut within a session instead of full-film-forever, and the flag now syncs through the existing profile mechanism so a signed-in host's second device doesn't replay it needlessly. Verified all 5 gate cases (no flag, just-now, 10 days, 25 days, the 21-day boundary itself) deterministically correct. Option (c), an in-app replay affordance, was deliberately not built — no leader confirms users want manual control over a splash.

---

**Event Boss · Splash: Dark Carbon · Wave 3, 2026-07-12 (same day)**

# Wave 3: the wordmark's material changed — does everything still agree?

Separate track, opened by a fresh audit question: does the wordmark itself have any leader precedent? It didn't. Neumorphic same-tone-plus-carved-shadow (1.00:1 contrast) had no comparable among Airbnb/Uber/Linear/Nike and sits inside neumorphism's documented, industry-abandoned failure mode — real WCAG failures, not a style question. Host chose the highest-contrast option: solid `--ink` fill, 16.71:1, AAA. That single change then cascaded — this wave is about whether the rest of the light recipe caught up, or whether it now contradicts a much brighter mark sitting next to it.

| Score | Meaning |
|---|---|
| **10 / 10** | Wordmark contrast + material consistency, post-fix |
| **16.71 : 1** | Wordmark, AAA (was 1.00:1) |
| **2** | Cascading defects caught live and fixed this wave |

## Wave 3 — what a brighter wordmark exposed

### FIXED THIS WAVE — The light source was dimmer than what it was supposedly producing

The instant the wordmark went solid `--ink`, the bead — the inversion's whole protagonist, the thing whose light is supposed to resolve the mark — read as a small, comparatively dark dot next to it. Checked the numbers: the bead's own resting glow (`10px/.28 + 19px/.16`) was literally **weaker** than the wordmark's own ambient glow (`24px/.35 + 48px/.2`) even before this wave — backwards for a light source. First pass brightened the glow only; host caught that this wasn't enough ("I don't believe the bead can be dark anymore") — a brighter halo around a dark sphere still reads as a dark sphere.

**Fix** — The bead's actual surface color now runs light-steel (`#a8c2d6`) through near-white across the whole sequence, landing exactly on `--ink` at rest — the bead becomes the same material as the letters, not a dim source next to bright ones. Added inset shading (dark, lower-right) so the now-bright fill still reads as a sphere via light-across-the-surface, not via contrast against a dark base. Verified live via detached test harness at both t=0 (held aloft — reads as a genuinely lit sphere, not overexposed) and the landed frame (matches the wordmark's color exactly, real dimensionality retained).

### FIXED THIS WAVE — Caps and tagline still carried the old treatment's restraint

Neither was a contrast failure — `#8fa4b2` (caps) cleared 7.37:1 and `#b4c5d3` (tagline) cleared 10.78:1, both already well past WCAG AA. But once the wordmark jumped to 16.71:1, the gap between "hero" and "supporting detail" widened enough that both read as leftover dimness from the old treatment rather than an intentional hierarchy.

**Fix** — Lifted, not matched: caps to `#a8bdc9` (9.79:1), tagline to `#cdd9e2` (13.27:1) — both stay clearly secondary to the wordmark's 16.71:1, closing the gap without flattening the hierarchy into everything competing at the same brightness.

### CHECKED, HOLDS — Does a brighter mark still read as "Dark Carbon," or has it gone loud?

Flagged as a real risk in the options comparison before this shipped ("closer to a loud consumer app... worth checking against the color-budget doctrine"). Checked against the actual rendered frame: the composition is still overwhelmingly dark field with ONE concentrated bright cluster (wordmark + bead), not multiple competing bright elements — a spotlight-in-the-dark read, not a bright screen. The restraint moved from "the mark itself is dim" to "the frame around the mark is dark" — same doctrine, different mechanism. Holds.

### CHECKED, HOLDS — Does the ignition beat still mean anything if the bead starts bright?

Worth asking: if the bead is never dark, does "ignition" (the impact-frame brightness flash) still read as an event, or is it just already-bright staying bright? Checked the actual arc: held is light-steel (`#a8c2d6`), impact peaks near-white (`#dae4ee`), rest settles on full `--ink` (`#eef0f4`) — a real, visible progression start to finish, just one that starts from "lit ember" instead of "cold dark." Arguably more coherent than before: an object that was never dark getting hotter reads better than one that was supposedly unlit moments earlier.

> **Wave 3 verdict.** The cascading fixes were real, not precautionary — the bead genuinely looked wrong (underpowered, then still dark-bodied) against the new wordmark until both passes landed, and caps/tagline genuinely looked like an oversight until lifted. Both host catches ("bead will have to be adjusted" and "I don't believe the bead can be dark anymore") were correct calls the audit hadn't itself surfaced yet — a case where post-ship eyes caught something a contrast-ratio spreadsheet didn't. The two structural questions this wave asked of itself (loud vs. restrained; is ignition still meaningful) both hold up on inspection. Nothing left open on this track.

---

**Wave 1 · original hostile investigation · preserved below, unchanged**

## What a 10 actually is — five properties, by shipped precedent

**A. The motion IS the idea.** Apple's "hello" doesn't show a logo — a stroke writes itself; the humanity claim performed. Family's onboarding cards literally diagram the product. At a 10, describing only the motion tells you the brand promise.

**B. Physics is real and per-property.** Falling accelerates; arriving decelerates; fades run near-linear. Emil Kowalski (Linear): ease-out for entrances, ease-in-out only for on-screen A→B — never one curve for everything. Family: "unbreakable physical rules."

**C. Staggering everywhere, at small offsets.** Apple's letters draw sequentially; Family morphs only changed glyphs. Two words on identical keyframes reads as a slide build.

**D. It runs long ONCE — or never.** Apple HIG rejects launch-screen brand theater outright; abandonment data puts the cliff at ~1.5–2s. Arc and Family run the film on first launch only. Linear/Vercel/Stripe run none. Nobody world-class shows ~5s on every cold boot.

**E. The handoff is one continuous shot.** Something survives the seam — an element morphs into chrome, or the splash's last beat initiates the UI's reveal stagger. A fade over a fully-painted dashboard is a cut.

## Verified defects — found by this investigation, each with evidence

### FIXED DURING AUDIT — The skip tap's fade window pressed invisible UI — reproduced live, destroying the first-run welcome

During the 200ms fade, `.splash-leaving` set `pointer-events:none` while still visibly opaque — so a second impatient tap hit-tested straight through the overlay. **Live reproduction: the second tap landed on the invisible "Start my event" button under the splash's center, set the welcomed flag, and permanently consumed the one-time welcome screen** — the host never sees it, ever. Fix shipped: the fading overlay now swallows residual taps (its handlers are idempotent no-ops), and the keyboard skip eats its keystroke and ignores bare modifiers. Re-ran the identical attack: second tap lands on the splash, welcome survives. The single-tap case was already safe (the click's common-ancestor rule), which is why nobody had noticed.

### BLOCKER FOR 10 — Landscape phones have never seen this choreography — broken in both width regimes

Zero `max-height`/`orientation` handling exists. Measured live at 390px viewport height: the caps line paints at 216px and the tagline at 262px — **both inside the wordmark**, which ends at ~282–331px. And on modern phones (≥700px wide in landscape) the desktop frame kicks in with `--fit ≈ 0.397` — the brand moment renders as a **~156×338px postage stamp** centered in the screen. Short portrait phones (590px effective height) are on the knife's edge too. Very likely a second mechanism behind the original device clipping report.

**Fix** — Add `@media(max-height:500px)` compaction (smaller stack, caps/tagline anchored below the stack in flow instead of at fixed 66%/70%), and gate the ≥700px desktop frame on height as well as width.

### REAL — The tagline's font weight does not exist — it renders as a substitute on every device, always

`.sp-line` asks for Playfair **italic 500**; the Google Fonts URL loads italic 700/800 only. The browser silently substitutes 700 — **the authored weight has never rendered once**. Separately: no preload, so on a first-ever visit on a slow network the tagline lands at ~2.7s in fallback Georgia and swaps mid-beat — a visible reflow inside the purest brand moment. Bonus: the URL loads a 900 weight nothing uses, on the boot-critical path.

**Fix** — Author 700 honestly (or load 1,500), preload the tagline face (ideally self-host the one woff2), drop the unused 900.

### REAL — The daily boot burns all its entrance motion invisibly, then hard-cuts

The dashboard's count-ups and card entrances start at mount — under an opaque splash — and complete by ~0.5s, unseen. The 200ms fade then reveals a fully static screen. The welcome path got the real choreography (`.splash-hold` paused-stagger release: genuinely at the bar); **the screen a host sees every day got none of it.**

**Fix** — Gate the shell's entrance animations on `splash !== 'up'` — the exact pattern the welcome path already uses — so the dashboard settles as the splash dissolves.

### REAL — The most premium beat animates the most paint-expensive properties available

The relief resolve interpolates **4-layer text-shadow with up-to-28px blurs** across two display-size text nodes for 3.6s — non-compositable, main-thread repaint every frame — under a full-surface `mix-blend-mode:overlay` grain group, beside a 20s animated `blur(26px)` layer and an infinite box-shadow breathe. No `will-change` anywhere in the splash. On a mid-tier Android, the boot moment is the likeliest frame-drop in the entire product.

**Fix** — Bake the relief end-state into a stacked duplicate and cross-fade `opacity` (compositable) instead of interpolating text-shadow.

### REAL — Screen-reader users can operate the invisible app under the splash; the skip is undiscoverable for everyone

The splash is `aria-hidden` but nothing beneath is `inert` — a VoiceOver swipe lands on controls the user cannot see, and double-tap activates them (the same class of bug as the fixed tap-through, still open on the AT path). And the only skip affordance on screen is `cursor:pointer` — nobody is told tapping skips.

**Fix** — `inert` the app while the splash is up; give the splash an accessible "Skip intro" name; consider a quiet visual hint after ~1.5s.

### NITS, RECORDED — Small dishonesties that a 10 team wouldn't carry

The "1s settle" is actually 1050ms and total is 4970ms (comment says ~4.95s); the bead's breathe gets clipped 31% into its cycle — the fade interrupts the glow on its way UP to peak (retime dismiss to ~5.4s or shorten the breathe period so the fade lands post-apex); the drop's `-180px` is a magic number calibrated to one frame width while everything around it clamps.

## Structural gaps — what separates the concept from the leaders

### THE CAP — ~5 seconds, every cold boot — no leader does this, and Apple's HIG forbids it

Arc and Family run their film once. Daily tools at the bar run nothing. Ours plays ~4.97s to a host who has seen it forty times, and the new settle hold is pure added latency for them. The skip listeners are excellent, but "the user must interrupt us" isn't "we respected the user." **The reviewer's verdict: this one change is worth more than everything else combined.**

**Fix** — Gate on a localStorage flag exactly like `LS_WELCOMED`: full film on first boot; a ≤1.2s condensed cut on every boot after (the reduced-motion end-frame is literally this asset, already built — field lit, mark resolved, one breathe, fade). Keep `?splashhold` for review.

### STRUCTURAL — The drop violates physics three ways — including one nobody had caught

(1) **The bead materializes hanging in mid-air:** opacity fades 74→77% while its Y position is held constant — it apparates, then remembers gravity. (2) The fall runs the global ease-in-out, so it **decelerates into the ground** — velocity reaches zero exactly at contact, gravity's opposite. (3) **Zero impact:** no squash, no contact shadow, no reaction from the letters it lands beside. The ignition is a color event, not a physical one.

**Fix** — Enter already moving (fade only over the first 25% of the fall); fall 240ms on `cubic-bezier(.5, 0, 1, .6)`; at contact, three simultaneous events — squash `scale(1.15,.8)` recovering ~250ms via `cubic-bezier(.34,1.56,.64,1)`, a contact-shadow kick under the bead, and "Boss" dipping 1.5px for ~120ms as the baseline takes the weight. That last move is Family's "unbreakable physical rules" — no other splash will have it.

### STRUCTURAL — Eight animations, one easing curve; two words in perfect lockstep

Everything runs the same ease-in-out — the single most reliable tell of non-expert motion (it's the curve the leaders say to use *sparingly*). And "Event" and "Boss" resolve on identical keyframes with identical delays — a slide build, not a performance.

**Fix** — Per-property curves: fades → linear/ease-out; the tagline's rise → ease-out (it's an entrance); relief resolve may keep a slow symmetric curve (it's light, not movement); drift and breathe are the one legitimately correct ease-in-out. Delay "Boss" +140ms so the relief pours down the mark; at the bar, per-glyph 40–60ms staggering — Apple's hello logic applied to neumorphic relief, which would be genuinely novel.

### STRUCTURAL — The climax and its explanation never coexist — the idea is subtext

The tagline that decodes the drop ("the details are ours. the day is yours.") has finished appearing **before** the bead arrives; then three elements compete inside the final 26% of the clock while the protagonist got 74% of dead air. The audience is never holding the sentence and the action in mind at once — so "Event Boss places the final detail" reads as "a dot arrives."

**Fix** — Resequence: caps 58–65%; tagline line 1 only at 65–72%; the bead falls 74–81% and **lands on the exact frame "the day is yours." appears** — impact and copy as one beat, nothing else moving; ignite 84–100%. Same clock, same assets.

## Survived hostile review — do not touch

- Skip architecture: window-capture, idempotent, scoped — games get this wrong 40 years in
- Reduced-motion: pinned settled end-frame beats most shipped leaders — and it's the return-boot asset
- The light rig as a system: tokens, agreeing vignette, grain, drifting key light — real cinematography
- Color restraint: one accent event in a monochrome scene, matching the app's color budget
- The welcome-path handoff: paused-stagger release is the Family-grade move — extend it, don't replace it
- The ignition ramp and breathe: the period's end state is fully at the bar
- Public-path isolation + app-renders-beneath: product judgment most splashes botch
- Timer hygiene, z-index order, frame-radius match, HMR behavior, bead handoff continuity: all verified clean
- Sound/haptics: correct to omit for this product — the bar for a planning tool is quiet

## The road to 10+ — ranked

1. **Tap-through fix** — *DONE — this audit*. Reproduced live, fixed, attack re-run and defeated. The welcome screen can no longer be invisibly consumed.
2. **First-boot-full / return-boot-short gate** — *S · the single biggest point on the board*. Full film once; ≤1.2s condensed cut after (asset already exists). Removes the structural cap and retires the leaders-audit pressure note.
3. **The physics pass** — *S–M · drop becomes the signature*. Fall curve + impact squash + contact shadow + the "Boss" dip, plus per-property easing and the +140ms word stagger — one coherent motion pass.
4. **Resequence the back half** — *S · the idea becomes legible*. "the day is yours." lands on the impact frame. The cheapest change with the largest meaning-per-line ratio in the whole plan.
5. **Landscape / short-viewport handling** — *S*. max-height compaction + height-gate the desktop frame. Currently the choreography has simply never been run on a rotated phone.
6. **Daily-boot reveal stagger** — *S*. Gate the dashboard's entrance motion on the splash leaving — the mechanism is built, it's wired to only one of the two exits.
7. **Font honesty** — *S*. Load or stop asking for italic 500; preload/self-host the tagline face; drop the unused 900 from the critical path.
8. **Compositable relief** — *M*. Cross-fade a baked end-state instead of interpolating 4-layer text-shadow — protects the premium beat on low-end Android.
9. **inert + accessible skip** — *S*. Close the AT-path variant of the tap-through; name the skip.
10. **The inversion — the bead as protagonist** — *M–L · the 10th point*. Frame one: a single lit bead alone in the dark (the detail). Its light resolves the wordmark's relief around it; it travels to the baseline and seats itself as the period on the frame the tagline completes. Same tokens, same light recipe, same locked period — but the idea becomes the plot instead of the epilogue. As currently structured (static wordmark, garnish period) the concept ceiling is ~8.5; this restructure is what earns 10.

> **Verdict.** Items 2–8 make this a 9 — an impeccably executed version of the current concept, honest on every device, physical, legible, respectful of the returning host. The 10th point cannot be polished into existence: it requires the inversion, because at the bar **the mark performs its meaning** — and today the meaning arrives after the film is over.

---

**Method.** Two independent hostile reviewers (code-level defect hunt with computed layout math and file:line evidence; motion-director critique grounded in researched leader precedent — Family Values, Emil Kowalski's animation doctrine, Apple HIG on launching, Apple-hello teardowns, Arc onboarding breakdowns, splash-duration abandonment data), plus live adversarial testing: the tap-through reproduced and re-verified fixed in the running app; the landscape collision measured at 390/590/660/852px heights; token/animation state inspected via frozen frames. Scores are as-shipped on the 5200 preview. Supersedes the 7.5 post-ship audit at this URL.
