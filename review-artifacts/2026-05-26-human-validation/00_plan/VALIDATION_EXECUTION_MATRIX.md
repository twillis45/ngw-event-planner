# VALIDATION EXECUTION MATRIX — Sprint 13

Single-page plan for every operator session. Print this. Sit with the operator.
Do not improvise the order. The order is the experiment.

## Session shape (per operator — 8–10 min)

| Block | Time | Surface | URL | Operator does | You watch for |
|---|---|---|---|---|---|
| Frame | 30s | — | — | hears the frame ("you're 90 min into a wedding…") | — |
| 1. Vendor delay | 2m | `?slice=vendor&observe=1` | http://localhost:3000/?slice=vendor&observe=1 | Triggers delay, decides next action | Time to first action; first eye target; hesitation; verbatim |
| 2. Cascading failure | 3m | `?slice=desktop-density&observe=1` | http://localhost:3000/?slice=desktop-density&observe=1 | Triggers 3 cascading delays; cycles AV to emergency | Whether they identify primary; whether they scan threads unprompted; whether emergency feels theatrical |
| 3. Recovery | 1m | (continues from #2) | — | Marks resolved / hits Reset | Does it feel finished? Re-scan or relax? |
| 4. Debrief | 1m | `?slice=debrief` | http://localhost:3000/?slice=debrief | Reads quietly, then narrates | Does the archive feel operational or analytical? |
| Transcript | 30s | (any slice) | Ctrl/Cmd+Shift+L | — | You paste transcript into operator folder |

## Per-surface goal / risk / observation focus

| Surface | Goal | Highest risk | Observation focus |
|---|---|---|---|
| `?slice=vendor` | Confirm single-escalation hierarchy is instantly readable | Operator hesitates >3s before primary action | Time-to-first-action; first eye target; whether they reach for the primary or scan |
| `?slice=desktop-density` | Confirm 3-zone orchestration holds under cascade | Operator can't identify which thread is primary; rail/threads become noise | Whether they name the dominant escalation unprompted; whether they ever say "I don't know where to look" |
| `?slice=desktop-density` @ EMERGENCY | Confirm emergency feels authoritative, not theatrical | Operator flinches, laughs, or doesn't react | Body language, verbatim, "wait what" pauses |
| Recovery | Confirm decompression feels like exhaling | Operator searches for a "did it work?" pill or asks "is it done?" | Whether they relax visibly or re-scan |
| `?slice=debrief` | Confirm archive reads as operational memory | Operator asks "what's the score?" or "what does it recommend?" | First word out of their mouth — operational vocabulary vs. analytical vocabulary |

## Pre-flight checklist (do BEFORE the operator sits down)

- [ ] `npm start` running, http://localhost:3000 responsive
- [ ] One tab open: `?slice=vendor&observe=1`
- [ ] Second tab open: `?slice=desktop-density&observe=1`
- [ ] Third tab open: `?slice=debrief`
- [ ] DevTools console open on at least one tab (you'll watch for the observer banner)
- [ ] Window full-screen at ≥ 1280×800
- [ ] Operator name on observation form
- [ ] Recording running (phone-camera-of-screen is fine) — strongly recommended

## Anti-patterns (do not do these)

- ❌ Narrate the interface. ("This is the awareness rail…") Kills the data.
- ❌ Ask "what do you think?" Produces opinions, not signal.
- ❌ Explain why something is where it is. They are the test.
- ❌ Patch findings during the session. Note and move on.
- ❌ Run more than 2 operators back-to-back without aggregating notes. You'll forget which was which.

## After every session (5 min)

1. Press Ctrl/Cmd+Shift+L in DevTools console → transcript copied to clipboard.
2. Save transcript to `06_observer_transcripts/operator_{N}_{slice}_{timestamp}.txt`.
3. Fill `02_operator_{N}/OBSERVATION_FORM.md`.
4. Move on. Don't analyze yet.

## After all sessions (30 min)

Run aggregation in `05_aggregated/AGGREGATE_FINDINGS.md`. Anything that shows up
in ≥ 50% of operators is systemic. One-off opinions are logged but not acted on.
