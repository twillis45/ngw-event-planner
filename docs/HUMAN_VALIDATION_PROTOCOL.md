# NGW Events — Human Operational Validation Protocol

Hand this to a real planner / operator. The goal is **truth extraction**, not
feedback. Your job is to **observe**, not to ask "what do you think?" — that
produces useless data. Watch where their eyes go, when they pause, when they
hesitate, when they reach. Capture **patterns**, not opinions.

**Time per operator:** 8–10 min.  **Operators needed:** 2–5 (≥3 ideal).
**Device:** desktop required; tablet/mobile optional.
**Recording:** strongly encouraged — phone-camera video of the screen + audio
is enough. Even just audio + your notes is usable.

---

## Setup (before they arrive)
1. Local dev or your live test URL, signed-in or open — doesn't matter for the slices.
2. Two tabs open and ready:
   - `?slice=vendor` — single-escalation lab.
   - `?slice=desktop-density` — multi-escalation orchestration.
3. Desktop browser, **window full-screen at ≥1280×800**.
4. DevTools console open if you're using the `?observe=1` instrumentation (optional — see HEURISTIC_WALKTHROUGH.md §3).

---

## Script
**Frame it as their job, not a test of yours.**

> "You're 90 minutes into running a wedding. A vendor's late. I'm going to show
> you a tool I'm building that surfaces operational problems. Just react like
> you would on a real event day. I'm watching, not testing you — there's no
> wrong answer."

Then run the scenarios below in order. **Don't narrate the interface.** Don't
explain what they're looking at. Let them figure it out — that's the data.

---

## Scenario 1 — Vendor delay (single escalation, ~2 min)
Tab: **`?slice=vendor`**.

- Click **Trigger delay**.
- **Observe in silence for 5 seconds.** Don't speak. Just watch.
- Then ask: *"What's the next thing you'd do?"* — and **shut up**.
- Watch them click. Capture: did they reach for the primary action, or scan first?
- Then click **Resolve / reset**.

**What to capture** (use the template below):
| Observation | Note |
|---|---|
| Time between escalation appearing and first eye movement to a control | seconds |
| First eye target | top-of-screen / center / sheet / vendor list / elsewhere |
| Hesitation before first click | "none / 1–2s / 3–5s / >5s" |
| Did they say anything aloud unprompted? | verbatim |
| Did the primary action feel found, or did they search for it? | found / searched / missed |

---

## Scenario 2 — Cascading operational failure (multi-escalation, ~3 min)
Tab: **`?slice=desktop-density`**.

- Click **Trigger 3 cascading delays**.
- Wait 3 seconds. Watch their face — confusion or recognition?
- Ask: *"What's the most important thing right now?"*
- Then ask: *"What else is going on?"* (this probes whether the awareness rail is being read).
- Click **Cycle AV** until it reaches EMERGENCY.
- Ask: *"What changed?"*
- Then: *"What do you do now?"*
- Click **Reset**.

**What to capture:**
| Observation | Note |
|---|---|
| Did they correctly identify the primary escalation? | yes / no — what did they pick? |
| Could they articulate the other two? | yes / partial / no |
| Did they scan the awareness rail unprompted, or only when asked? | unprompted / prompted |
| When AV escalated to EMERGENCY, did they notice the change? | instantly / after seconds / had to be told |
| Did the layout feel "calmer" or "busier" than expected at emergency? | verbatim |
| Did they ever say "I don't know where to look"? | yes/no |

---

## Scenario 3 — Recovery (~1 min)
Still on `?slice=desktop-density` (or `?slice=vendor`).

- After they've handled an escalation, click **Resolve all** or **Mark resolved**.
- Watch their reaction. Don't speak.
- Ask: *"Does that feel finished?"*

**What to capture:**
| Observation | Note |
|---|---|
| Did decompression feel relieving, anticlimactic, or jarring? | verbatim |
| Did they re-scan after resolution, or relax? | re-scanned / relaxed |
| Did they trust the resolution? | yes / "is it really fixed?" / unclear |

---

## Question bank (use these as probes — never as opener)

✅ **Good probes** (use sparingly, after silent observation):
- "What's the next thing you'd do?"
- "What's the most important thing right now?"
- "What changed?"
- "What else is happening?"
- "Does this feel finished?"
- "Show me what you'd ignore."

❌ **Banned questions** (produce noise, not signal):
- "What do you think?"
- "Do you like this?"
- "Is the red enough?"
- "Should this be bigger?"
- "Any feedback?"

---

## Findings template (one row per scenario per operator)

```
Operator:  ___________
Scenario:  ___________
Viewport:  ___________

Pre-click hesitation (seconds):  ___
First eye target:                ___
First click target:              ___
Mis-clicks / hovered-wrong:      ___
Said aloud (verbatim):           "_______________"
Calm or stressed (your read):    ___
Trust signal:                    "_______________"
One thing they got immediately:  ___
One thing they missed/searched:  ___
```

**Aggregate after all operators:**
| Pattern | Operators who exhibited it |
|---|---|
| Hesitation >3s on primary action | __ / __ |
| Scanned awareness rail unprompted | __ / __ |
| Identified emergency promotion instantly | __ / __ |
| Said "I don't know where to look" or equivalent | __ / __ |
| Felt motion as artificial / theatrical | __ / __ |
| Felt motion as trustworthy / inevitable | __ / __ |

---

## What to do with the findings
- **Patterns that show up in ≥50% of operators** → systemic; worth a doctrine
  conversation before any change.
- **One-off opinions** → log, do not act on.
- **Hesitation without confusion** → likely a motion/timing issue, not a
  hierarchy issue. Look at motion timings before restructuring.
- **Confusion without hesitation** → hierarchy/spatial issue. Restructure
  before retiming.
- **Both** → the doctrine itself may need re-examination. Do not patch
  cosmetically.

**Anti-pattern:** the moment after a test, the urge to "just brighten the red"
or "just add a pulse" is the strongest. Resist it. Those instincts are exactly
what the Studio Matte doctrine exists to refuse. If structure isn't winning,
fix structure (mass, isolation, placement) — never saturation or motion drama.

---

## Reporting back
When you've run 2+ operators, paste the aggregated table and verbatim quotes
into the chat. I'll synthesize patterns (systemic vs cosmetic) and propose
**structural** corrections — not cosmetic ones.
