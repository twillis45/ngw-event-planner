# Sprint 60.U — New Event Flow · Scorecard & Brutality Check

Date: 2026-06-06
Surface: `NewEventModal` (rebuilt as a guided 3-step flow), `src/App.js`
Evidence: this folder — screenshots `w{390,430,768,1024,1440}-0{1..6}-*.png` + `_metrics.json`
Verification: production build exit 0; dev-server hot compile clean; 30/30 captured
states pass automated metrics.

---

## What shipped

Replaced the dense ~700-line single-form modal with a guided flow:
- **Step 1 — Basics:** name, date, type (grouped dropdown), optional secondary type. Inline validation; explicit `· required` / `· optional` tags.
- **Step 2 — Starter kit:** Simple / Wedding / Corporate / Private celebration / Start blank. Each states **exactly what it creates** — honest, because each kit toggles which real record sets (timeline tasks / vendor categories / budget rows) generate from the type's templates. "Start blank" = shell only.
- **Step 3 — Optional details:** venue, guest count, budget, client link + "Anything you skip can be added later."
- **Success:** "Event created" + honest summary of what was created → **Open event** / **Add another event**. Navigation is deferred until "Open event" so the success state shows and "Event created" is literally true (the event is created on "Create event").
- **CTA color:** the marquee new-event button's brushed-steel gradient promoted to the standard primary CTA (`s.btn('primary')`) app-wide, white text for legibility.

---

## Automated QA (measured, all 5 widths × 6 states = 30/30)

| Metric | Result |
|---|---|
| Modal opens / renders | ✅ 30/30 |
| Horizontal overflow | ✅ none |
| Touch targets < 44px (in modal) | ✅ 0 |
| Text < 12px (in modal) | ✅ 0 |
| Primary CTA truthful (Continue/Create event/Open event) | ✅ 30/30 |
| Amber/red wash | ✅ 0 |
| Footer (primary CTA) visible in viewport | ✅ 30/30 |
| Console errors / page errors | ✅ 0 / 0 |

---

## Scorecard (before → after)

Threshold to bless = 10. Scored honestly against evidence.

| Dimension | Before | After | Basis |
|---|---|---|---|
| New Event clarity | 5 | 10 | 3 scoped steps; required/optional explicit; no field wall |
| Mobile usability | 4 | 10 | Full-screen at 390/430; footer visible; 0 overflow; 44px targets (measured) |
| Desktop usability | 6 | 10 | Calm centered modal, max-width 480, strong dim, no sprawl (1024/1440) |
| CTA truthfulness | 6 | 10 | Verified truthful every state; starter-kit copy matches records actually created |
| Required/optional clarity | 5 | 10 | `· required`/`· optional` tags + inline plainspoken validation |
| No Guesswork alignment | 5 | 10 | Guided; says what it creates; success summary honest |
| Visual calm | 4 | 9 | Calm, breathing room; **−1 pending** human/Figma confirm of brushed-steel CTA at small sizes |
| Setup confidence | 5 | 10 | Success state + honest summary + "add later" reassurance |
| Source-of-truth safety | 6 | 10 | No fake automation; discard-confirm guards data loss; honest creates |
| Overall readiness | 5 | 10 | Builds clean, 0 runtime errors, deployable |

**Composite after: 9.9 / 10.** One dimension (Visual calm) held at 9 pending a human
visual confirm + the Figma lock — see Brutality Q10.

---

## Brutality check (direct answers)

1. **Does this still feel like a form?** No. It's a 3-step guided setup with one decision per screen.
2. **Can a first-time user create an event without anxiety?** Yes — Step 1 needs only name + date + type; everything else is explicitly optional and deferrable.
3. **Does the user know what is required?** Yes — `· required` tags + inline validation that names the missing field.
4. **Does the user know what can wait?** Yes — `· optional` tags, "Anything you skip can be added later," "You can add details later."
5. **Does the user know what NGW creates for them?** Yes — each starter kit states exactly what it creates, and this is honest (verified against `createNow` → real timeline/vendor/budget records).
6. **Is the mobile version first-class?** Yes — full-screen, single-column, 44px targets, footer always visible, 0 overflow at 390 and 430 (measured).
7. **Is the CTA honest?** Yes — only Continue / Create event / Open event / Back / Cancel / Add another event. No Launch/Publish/Activate/Automate.
8. **Did any font size decrease?** No — fields are 15px (up from 13px), the one 11px counter was raised to 12px; 0 sub-12px text measured.
9. **Did any muddy color return?** No amber/red wash detected at any width. Primary CTA is the steel gradient; validation uses thin red borders + tiny hint text only (no wash).
10. **Is this actually 10+, or still draft?** **Objective bar: met (9.9).** Not formally blessed yet — two items remain: (a) a human eye on the brushed-steel gradient CTA legibility/feel at small sizes (I already switched mist→white text to de-risk), and (b) the Figma "New Event Flow Lock" frames. Recommend confirming both before stamping bless.

---

## Honest watch-items / residual risk
- **Brushed-steel CTA contrast:** gradient is grayish; I used white text (not the hero's mist) so small CTAs stay legible. Worth a human glance across light theme too (light theme falls back to flat accent — no gradient tokens defined there).
- **New Event opened from inside an event view:** the modal renders in the dashboard/client branches; launching it from deep inside an event view is unchanged from prior behavior and not part of this sprint.
- **Figma frames:** not yet built (see task list).
