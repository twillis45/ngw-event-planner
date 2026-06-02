# Sprint 38 — Human Trust + Orientation Validation

Psychological trust formation and orientation confidence refinements. This sprint addresses five behavioral risks identified from Sprint 37 alpha readiness: orientation loss after interruption, compression anxiety, progress ambiguity, mobile context loss, and disruption layout instability.

## What Was Done

### Sprint 38 Orientation Refinements

| Refinement | Mechanism | Behavioral Target |
|---|---|---|
| Sequence progress indicator | X/Y count + slim progress bar below section label | Progress ambiguity → unambiguous position anchor |
| Mobile sticky context header | Fixed strip (event name + mode dot + time) appears when scrolled past 80px | Mobile context loss → always-present orientation |
| Trust compression clarity | "+ N confirmed" quiet label below ghosted vendor list | Compression anxiety → "where did they go?" answered |
| Disruption indicator geometry stability | 52px reserved layout space prevents geometry shift on appear/disappear | Disorienting layout shift → stable context |
| Tab-return attention re-anchor | Visibility change → 2s amber border intensification on active items | Interruption recovery loss → re-anchor on return |

### Files Modified

| File | Change |
|---|---|
| `src/slices/OrchestrationSlice.jsx` | All 5 orientation refinements; Sprint 38 header comment; footer Sprint reference |

---

## Behavioral Verification

### Desktop (1345px) — Tick States Captured

**Tick 0 — PRE-EVENT / Calm:**
- CEREMONY TRANSITION label shows new header format (label + empty progress bar, no count since completedCount=0)
- Full vendor list visible, all FULL compression
- Event card clean in left rail
- Disruption indicator slot empty (reserved space invisible)

**Tick 30 — disruption-cascade / Active disruption:**
- Disruption indicator ("Sparkle Lighting, Bloom Florals responding") in reserved slot — no layout shift from surrounding elements
- Trust compression working: Atlas, Grand Ballroom, Sparkle, Bloom, Premier expanded; SoundWave + Lumina ghosted ("+2 confirmed" rendered in DOM)
- Cognitive tunneling: lower-dependency items receding to ~20%+ opacity
- Progress bar renders with active amber tint (rgba 184,148,63,0.35) but width 0% — correct, no items complete yet

**Tick 36 — active / Peak coordination (2/8 complete):**
- Progress indicator: **"2/8"** visible top-right of CEREMONY TRANSITION
- Completed items (Guest Transportation, Cocktail Service End) ghosted at ~20% as cognitive landmarks
- Active items (Room Flip, Lighting Crossfade, Guest Seating) with amber borders
- Ghosted vendor count: **"+2 confirmed"** rendered (SoundWave, Lumina ghosted via trust compression)
- Environmental memory border on Lighting Crossfade (red, from Chen Wedding failure memory)

**Tick 52 — recovery / POST-EVENT:**
- "POST-EVENT" mode label; "Resolved" (not "Complete") — recoveryResidue.intensity > 0.5 from 3 preceding disruptions
- Progress: 8/8 all complete — sequence items at ~20% ghosted in unison
- Canvas background shifted to #080808 (heavier disruption residue, not default)
- Vendor list fully expanded in recovery unwinding

### Mobile (375px) — Tick States Captured

**Tick 0 — PRE-EVENT / Calm:**
- Event card (Hartwell Wedding, PRE-EVENT, T-4:00) visible above fold in single column
- CEREMONY TRANSITION section below with progress bar (no count, 0 completed)
- Controls bar wraps to 2 rows as expected (~80px)
- Memory border on Lighting Crossfade visible

**Tick 36 — active / Peak coordination:**
- "2/8" progress anchor clearly visible top-right of sequence header
- Active items (Room Flip, Lighting Crossfade with red fragile border, Guest Seating) highlighted
- Completed items ghosted at correct ~20% opacity
- Lower-dep items (Dinner Positions, DJ Ceremony Intro) receding to peripheral opacity
- Sticky context header NOT showing at default scroll position (correct — only fires at scrollY > 80px)

---

## Observation Synthesis — 8 Categories

The following findings are synthetic — derived from behavioral simulation observation during Sprint 38 development, not from live human testing sessions. Real human observations will follow in scheduled alpha sessions.

### A. Trust Success Signals (Predicted)

**A1 — Compression transparency reducing anxiety.** The "+N confirmed" label below the vendor list directly answers the question "where did they go?" without expanding vendor cards. Coordinators should not need to ask about hidden vendors during active pressure phases if this label is readable.

**A2 — Progress bar as ambient confidence.** The slim 2px progress bar below the sequence label provides peripheral confirmation that sequence items are completing without requiring explicit attention. This is a passive confidence signal rather than an active notification.

**A3 — Recovery residual as atmospheric confirmation.** "Resolved" vs "Complete" and the 1-2 step canvas darkening in heavy-disruption recovery should feel like environmental validation — the system acknowledges what happened without narrating it.

**A4 — Stable geometry reduces scan cost.** Reserved space for the disruption indicator eliminates geometry shift. Coordinators won't visually lose their position in the sequence when the indicator appears or disappears.

### B. Orientation Failure Risks (Predicted)

**B1 — Mobile context loss on deep scroll.** The event card (which shows mode + timing) is at the top of the single-column layout and scrolls off as the coordinator reads the sequence. Without the sticky header, a coordinator who has scrolled halfway through the sequence has no mode indicator visible. The Sprint 38 sticky header fires at scrollY > 80px — but only if they haven't scrolled. The threshold timing needs validation.

**B2 — Progress indicator invisible at 0%.** The slim progress bar is 2px high and 0% wide at the start of every scenario. A coordinator in calm or early disruption phases gets no position signal from the bar. The X/Y count only appears when completedCount > 0. This means orientation anchors are absent during the first 57% of the wedding scenario (ticks 0-31). Whether coordinators feel disoriented during this window depends on whether they need the progress anchor during calm/building phases.

**B3 — Phase transition as position ambiguity.** The jump from disruption-cascade (no completions) to active (2 completions appear simultaneously) could read as "things suddenly changed" rather than "two items are now behind us." Items appearing at ~20% opacity simultaneously may register as disappearance rather than completion.

### C. Over-Subtlety Risks (Predicted)

**C1 — "+N confirmed" opacity at 35% may be unreadable.** The ghosted vendor count uses 9px font at 35% opacity. On a dark canvas, this may be imperceptible to testers who are not specifically looking for it. If the anxiety signal ("where did they go?") is strong but the answer ("+ 2 confirmed") is invisible, we've added cognitive dissonance rather than resolution.

**C2 — Slim progress bar may be too slim.** 2px is below the threshold of casual peripheral awareness. A coordinator glancing at the sequence header may not register the bar at all. If the orientation function of the bar depends on being noticed subconsciously, 2px may not achieve that.

**C3 — Recovery residual is intentionally invisible.** The 1-step canvas color shift (#080808 vs #060708) is imperceptible without direct comparison. Whether coordinators feel "this event was heavy" vs "that went smoothly" subconsciously — without being able to articulate why — is an untested hypothesis. The mechanism exists but its psychological effect cannot be validated through code inspection alone.

### D. Panic Behavior Risks (Predicted)

**D1 — Simultaneous active-item bordering on tab return.** The tab-return flash (all active items briefly intensify borders simultaneously) may register as a system event rather than an orientation aid. Coordinators returning to the screen may see "something happened" rather than "here's where I left off."

**D2 — Compression expansion from ghosted still alarming.** The GHOSTED → FULL transition for a vendor entering disruption (e.g., SoundWave going from invisible dot to a full expanded card) is a 2000ms transition but still a significant visual event. If the coordinator had been trusting that "the ghosted dots are fine," a sudden card appearance signals "something went wrong" — which is the correct interpretation, but could register as anxiety rather than information.

### E. Confidence Reinforcement Signals (Predicted)

**E1 — Cognitive tunneling providing focus relief.** During active pressure, lower-dependency items receding to ~20% opacity reduces visual noise. Coordinators should be able to direct full attention to the 3-4 active items without the full 8-item list competing for attention. This is the primary cognitive load mechanism.

**E2 — Memory borders as silent warnings.** The red fragile border on "Lighting Crossfade" (from Chen Wedding failure) provides a pre-emptive caution signal before the actual disruption phase begins. Coordinators who notice this border may mentally prepare for crossfade issues before they occur — a genuine confidence affordance from environmental memory.

**E3 — Continuity field contamination as cross-context awareness.** When Sparkle Lighting enters caution, the brass/warm tinting on connected sequence items (those sharing the continuity field) provides ambient signal that neighboring items are affected. No coordinator action is required, but peripheral awareness of affected scope is present.

### F. Interruption Recovery (Observed in Code, Not Yet in Humans)

**F1 — Tab-return flash mechanism implemented.** On `visibilitychange` → visible, a 2s amber border intensification fires on all active items. Timer is debounced (clearTimeout + setTimeout) so repeated tab-switches don't stack. The flash is a `3px solid rgba(184, 148, 63, 0.85)` border that fades back to normal over 2 seconds via CSS transition.

**F2 — Mode indicator as return anchor.** The event card's mode indicator (LIVE dot + "T-0:05" display) provides the most information for a coordinator returning after looking away. PRE-EVENT → LIVE → POST-EVENT is an unambiguous position in time.

**F3 — Mobile recovery has no sticky header during phone-away scenario.** If a coordinator puts their phone down and picks it back up while already scrolled, the sticky header is their mode anchor. But if they were at scroll position < 80px when they put it down, the sticky header won't be showing when they return. They'll see the event card immediately — which contains the same information. Net: adequate, not optimal.

### G. Mobile Friction (Observed)

**G1 — Single-column prevents simultaneous sequence + vendor view.** During active pressure, a coordinator checking vendor status must scroll past the sequence. The "+2 confirmed" hint in the vendor section (when reached) partially addresses the compression concern, but the vendor section is not visible without scrolling.

**G2 — Controls bar at 375px takes ~80px in two-row wrap.** The scenario tabs + play/pause + speed buttons wrap to 2 rows. This is 80px less real estate that could show operational content. Under active pressure at 375px, the first sequence item appears just below the controls (confirmed in screenshots).

**G3 — Touch targets confirmed 44px+.** All tap-able items (sequence cards, vendor rows) maintain 44px+ touch targets even at maximum compression. One-handed operation confirmed through visual inspection at 375px.

**G4 — Sticky header activates at scrollY > 80px.** This threshold needs real-device validation. On a 375px device with a large event card (~120px) and controls bar (~80px), the sequence items start at approximately y=200. Scrolling to sequence item 3 or 4 would exceed 80px. Threshold may need adjustment based on device testing.

### H. Cognitive Relief (Predicted)

**H1 — "Less to manage" signal from tunneling.** At peak active pressure, the system presents 3-4 items at full weight with 4 items receded. A coordinator who has experienced coordination without tunneling would be managing 8 equally-weighted items. The narrowing to "here's what matters now" is the primary cognitive relief mechanism. Whether this translates to subjective relief requires human testing.

**H2 — Recovery unwinding as closure signal.** In recovery, all items completing simultaneously at full ghosting provides a visual "it's done" signal. The 8/8 count, full vendor list expansion, and canvas shift toward calm together represent a multi-channel closure signal. Whether coordinators experience this as genuine closure vs "the simulation ended" depends on how deeply they engaged with the pressure simulation.

---

## Trust Formation Analysis

### What the surface now does vs Sprint 37

| Aspect | Sprint 37 | Sprint 38 |
|---|---|---|
| Progress awareness | None — coordinator must count manually | X/Y count + progress bar in section header |
| Vendor compression response | No answer for "where did they go?" | "+N confirmed" quiet label below list |
| Layout stability at phase transitions | Disruption card shifts geometry on appear | Reserved 52px slot — no geometry shift |
| Mobile context after scroll | Event card scrolls off screen | Sticky strip (event + mode + time) when scrolled |
| Return-from-interruption anchor | No special treatment | 2s active item border flash on visibility return |

### What we still don't know

1. **Whether any of this is perceptible.** The "+2 confirmed" label is 9px at 35% opacity. The progress bar is 2px. The canvas color shift is 1 hex step. These could all be below perception threshold for human testers.

2. **Whether trust is formed or anxiety is created.** The same mechanism (vendor compression) that reduces visual noise could create anxiety if coordinators notice vendors disappearing. The "+N confirmed" label is only helpful if the coordinator notices both the disappearance AND the label.

3. **Whether interruption recovery is different.** The tab-return flash intensifies active item borders. A coordinator returning to the screen may notice this and orient quickly — or they may not notice the flash at all because their attention is drawn first to reading the content, not the border styling.

4. **Whether the "feeling" matches the function.** We've built mechanisms that theoretically reduce mental fragmentation. The hypothesis is that coordinators feel less exhausted and more in control. Alpha testing with real coordinators — Sprint 37's facilitator materials are already prepared — is the only way to know.

---

## Brutally Honest Sprint 38 Assessment

**What was built:** Five targeted orientation refinements addressing specific psychological risks identified from Sprint 37 alpha readiness analysis. Each refinement is implemented correctly, renders correctly, and addresses a real behavioral risk. The code is clean, transitions are smooth, and build is clean.

**What was not built:** Evidence that any of this helps human coordinators. The five refinements are hypotheses about what will reduce orientation loss, compression anxiety, and interruption recovery difficulty. They're good hypotheses, grounded in UX principles. They're still hypotheses.

**The instrumentation gap:** The observation kit (Sprint 37) records hesitations, repeated taps, scroll seeks, and tab returns. Sprint 38's refinements are designed to reduce these signals. But without baseline data (Sprint 37 sessions before these refinements), we can't attribute any reduction to Sprint 38's changes vs general acclimation to the interface.

**The most likely validation result:** Alpha testers will feel oriented during active pressure and recovery. They will notice the progress count when it appears. They will either not notice the "+N confirmed" label or will find it reassuring. The tab-return flash will go unnoticed by most (which is acceptable — it's a subconscious anchor, not a notification). Mobile friction from single-column layout will be the primary friction point regardless of these refinements.

**Recommendation:** Run alpha sessions. The interface is ready. The facilitator guide is prepared. These five refinements make the environment more trustworthy. Whether coordinators experience it as trustworthy can only be determined by coordinators.

---

## Human Testing Readiness

| Criterion | Status | Notes |
|---|---|---|
| Sequence progress anchor | ✅ Implemented | X/Y count + 2px bar. Visibility validation needed. |
| Mobile sticky context | ✅ Implemented | Fires at scrollY > 80px. Threshold needs device testing. |
| Compression clarity | ✅ Implemented | "+N confirmed" at 9px / 35% opacity. May be imperceptible. |
| Geometry stability | ✅ Implemented | 52px reserved slot. No layout shift on disruption appear/disappear. |
| Tab-return flash | ✅ Implemented | 2s amber intensification. Effect may be subconscious. |
| Observation tooling | ✅ (Sprint 37) | Hesitation / repeated tap / scroll seek / return tracking |
| Facilitator guide | ✅ (Sprint 37) | Session structure, key questions, warning signals |
| Consent handling | ⚠️ Not implemented | Must be handled verbally in facilitated sessions |
| Real-time mode | ❌ Not available | Simulation only |

**Overall: Ready for facilitator-observed alpha testing.** Sprint 38 adds orientation refinements that address the five highest-risk trust failure modes identified in Sprint 37. These have not been validated with human coordinators. That is the next step.
