# Facilitator Observation Guide — Alpha Testing

## Session Structure

**Duration**: 20–30 minutes per tester
**Testers**: 2–5 real coordinators/planners
**Format**: Facilitator-observed, think-aloud protocol

### Setup

1. Open `localhost:3000/?slice=orchestration&sim=wedding&observe=1`
2. Verify viewport: desktop (1280+) or mobile (375px device/emulator)
3. Confirm "● Recording" appears in footer
4. Do NOT show debug overlay to tester (Ctrl+D is facilitator-only)

### Session Flow

| Phase | Duration | What Tester Does | What Facilitator Observes |
|---|---|---|---|
| Orientation | 2 min | Look at the screen. Describe what you see. | Does the tester understand the layout without explanation? |
| Calm exploration | 3 min | Play simulation at 1×. What stands out? | Where do eyes go first? Any confusion? |
| Building pressure | 3 min | Continue playing. What changed? | Does the tester notice hierarchy shifts? Or only the mode label? |
| Disruption response | 5 min | A vendor has a problem. What do you do? | Does attention route to the disrupted vendor naturally? |
| Active pressure | 5 min | Things are happening fast. What matters right now? | Does cognitive tunneling help? Does the tester feel lost or focused? |
| Recovery | 3 min | It's over. What happened? | Can the tester reconstruct the event? Does recovery feel calm? |
| Debrief | 5 min | How did that feel? What confused you? What helped? | Capture specific language about cognitive load |

### Key Questions to Ask

**During simulation:**
- "What do you think is most important right now?"
- "Where would you look if [vendor] had a problem?"
- "Do you know where you are in the sequence?"
- "What would you do next?"

**After simulation:**
- "Did anything feel confusing?"
- "Did anything feel helpful that you didn't expect?"
- "Did you ever feel like the software was doing something you didn't understand?"
- "Did you ever feel lost or disoriented?"
- "How does this compare to how you normally coordinate events?"

### What to Watch For

**Positive signals:**
- Tester looks at the right place without being told
- Tester says "I can see what matters"
- Tester ignores compressed/ghosted vendors (correct behavior)
- Tester feels "calm" or "in control" during active pressure
- Tester doesn't ask "what does this system do?"

**Warning signals:**
- Tester asks "why did that disappear?" (trust compression anxiety)
- Tester scrolls up and down repeatedly (orientation loss)
- Tester taps the same thing multiple times (interaction dead zone)
- Tester says "I don't know what changed" (behavioral transition too subtle)
- Tester asks about the system itself (orchestration still visible)

### Mobile Testing

Same session flow, but on a phone (or 375px emulated viewport).

**Additional observations:**
- Can they operate one-handed?
- Do they scroll to find information?
- Can they recover after looking away?
- Do touch targets feel adequate?
- Does the single-column layout make sense?

### After Session

1. Press Ctrl+Shift+E to export observation data to clipboard
2. Save as `session_[tester-name]_[date].json`
3. Note: hesitation count, repeated taps, scroll seeks, return events
4. Write 3–5 sentence facilitator summary

### Keyboard Shortcuts (Facilitator Only)

| Shortcut | Action |
|---|---|
| Ctrl+D | Toggle debug overlay (shows pressure %, weights, zones) |
| Ctrl+Shift+O | Toggle observation recording |
| Ctrl+Shift+E | Export session data to clipboard |
| Ctrl+Shift+R | Reset simulation + clear session |
