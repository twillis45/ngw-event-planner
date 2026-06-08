# Sprint 51B — Communication Trust Fixes

Date: 2026-06-07 · File changed: `src/App.js` (GlobalCompose) · Build: compiled (warnings only, pre-existing).

## Scope (as directed)
Implement the two confirmed P0 trust failures from 51A. No rebuild, no redesign, no new workspace, no architecture change.

## What the code reality required
The `GlobalCompose` FAB renders **only on the Home dashboard** — when an event is open the app returns `EventPlanner`, whose Messages tab (`CommunicationHub`) already inherits event context correctly. Every *contextual* launch on Home (the "N messages waiting for reply" rows, the Decisions/Approvals/Communication quick actions) already routes via `onSelectEvent(eventId, { tab: 'Communication' })` into the correct event — verified at runtime. The only offender was the generic Home FAB silently defaulting to `activeEvents[0]` (the soonest event).

## P0 Fix 1 — Context inheritance / no silent switch
`src/App.js` GlobalCompose:
- New `currentEventId` prop, wired to `activeId` at the mount. If the panel is opened with a source event, it inherits **that** event and resets the recipient to the client.
- When opened with **no** source context (generic Home FAB): it no longer auto-selects the soonest event. Auto-select happens **only** when there is exactly one active event; otherwise the picker shows **"Choose event…"** and the planner must pick. Added an inline prompt: *"Choose the event this message is about — nothing is assumed for you."*
- Event still switches only via explicit dropdown action.

## P0 Fix 2 — Recipient identity
`src/App.js` GlobalCompose:
- "To" dropdown now shows the **real client name** (e.g. "Sarah & Todd Chen") instead of "Client", vendors as **"Name · Category"** (e.g. "Bluebell Venue · Venue"), and "Team · Internal note".
- Recipient `useMemo` resolves **Name · Role · Company · Email/Phone**:
  - Client → name = client name, role = "Client".
  - Vendor → name = contact person (or company), role = category, company = vendor business when a contact person exists.
  - Team → "Team · Internal note".
- Recipient card redesigned to show **Name + role chip + company line + email/phone**. (Bride/Groom-style sub-roles were *not* invented — the data model stores no such field; role honestly reflects what we store.)

## QA — 375 / 390 / 768 / 1024 / 1440 (auth-bypass dev server, SEED data, system Chrome headless)
| Width | FAB on Home | Panel default | No silent default | After explicit pick | Vendor option format | Overflow | Console err | Page err |
|------:|:-----------:|:--------------|:-----------------:|:--------------------|:---------------------|:--------:|:-----------:|:--------:|
| 375 | hidden (mobile-home, by design) | — | — | — | — | none | 0 | 0 |
| 390 | hidden (mobile-home, by design) | — | — | — | — | none | 0 | 0 |
| 768 | yes | "Choose event…" | ✅ | Todd & Sarah's Wedding | Bluebell Venue · Venue | none | 0 | 0 |
| 1024 | yes | "Choose event…" | ✅ | Todd & Sarah's Wedding | Bluebell Venue · Venue | none | 0 | 0 |
| 1440 | yes | "Choose event…" | ✅ | Todd & Sarah's Wedding | Bluebell Venue · Venue | none | 0 | 0 |

Additional runtime checks:
- **No event switching:** default is "Choose event…", never the soonest (`Annual Strategic Planning Session`). Confirmed at all reachable widths.
- **Correct recipient shown:** TO = "Sarah & Todd Chen", recipient card = name + **CLIENT** role chip + email + phone (screenshot `51b-1440.png`).
- **Contextual inheritance intact:** clicking the "Todd & Sarah's Wedding · Lena Kim Photography" waiting-for-reply row lands in the wedding's Communication tab (`inWedding=true`, `onComms=true`).
- Mobile-home FAB intentionally hidden (Sprint 60.P); panel uses existing responsive bottom-sheet styles (unchanged). The two fixes are data/logic + a wrapping role chip — width-independent.

## Success condition
The planner always knows (1) which event they're communicating about — nothing is silently assumed — and (2) exactly who will receive it — name, role, company, email. **Met.**

Artifacts: `51b-{375,390,768,1024,1440}.png`, `qa-51b-results.json`, `qa-51b.js`.
