# 08_motion — intentionally empty (static capture cannot prove motion)

Motion is the one doctrine layer that **cannot** be validated by static PNG.
Capturing a still frame of a transition would mislead.

## How motion IS validated
1. **Source of truth:** `src/design/motion.js` — locked timing matrix.
2. **Runtime probe:** `?observe=1` instrumentation captures hesitation per click; transitions are observable in real-time DOM mutation events.
3. **Locked matrix (cannot drift):**
   - ambient: `0.31s cubic-bezier(0.16,1,0.3,1)`
   - escalation: `0.23s cubic-bezier(0.16,1,0.3,1)`
   - emergency: `0.20s cubic-bezier(0.05,0.7,0.1,1)`
   - recovery: `0.36s cubic-bezier(0.16,1,0.3,1)`
   - no spring, no bounce, no overshoot, no decorative motion

## To validate motion empirically
- Run `?slice=desktop-density&observe=1`, trigger the cascade, escalate to emergency, resolve.
- Press Ctrl/Cmd+Shift+L to copy the observer transcript.
- Hesitation column is the data; transitions appear in `state` rows.

Static PNG cannot substitute for this.
