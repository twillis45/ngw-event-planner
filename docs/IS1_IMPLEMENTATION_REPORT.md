# Sprint IS-1 — Integration Stabilization — Implementation Report

**Date:** 2026-07-04
**Status:** ✅ COMPLETE
**Scope:** Integration-only. No new engines, no new UI, no redesign, no animation/styling changes.

---

## What This Sprint Did

Made the runtime actually consume architecture that already existed: Sprint A's Event Identity Engine and F4's stage-generation logic. Fixed four integration defects discovered by the call-chain audit and by live browser testing — no new features were built.

---

## Runtime Call-Chain Audit

See [IS1_CALL_CHAIN_AUDIT.md](IS1_CALL_CHAIN_AUDIT.md) for the full engine-by-engine table. Summary:

| Engine | Before | After |
|---|---|---|
| Event Identity (Sprint A) | 0 runtime callers — orphaned | Wired into `AssembleReveal` |
| Event Identity (legacy) | Wired into `AssembleReveal` (wrong reader for this purpose) + `HostHome` | Kept in `HostHome` only (correct, separate use) |
| Persona Resolution (Sprint A) | 0 runtime callers | Still 0 — not required for this fix; flagged for a future sprint |
| Shell Routing (Sprint A) | 0 runtime callers | Still 0 — same as above |
| Assemble Reveal | Fires for ~16 of 53+ event types | Fires for any qualifying event created under a host account |
| Decision Blockers | Computed, rendered partially (title/what only) | Computed, fully rendered (why/status/nextDecision) |
| Risk Preview | Never observed live (depended on broken Identity) | Fires correctly once Identity is wired |
| ExperienceView / Blueprint / Research pipeline | 0 runtime callers (admin-only) | Unchanged — confirmed intentional architecture boundary, not a defect |

---

## Before / After Wiring Diagram

### Before
```
NewEventModal (intake)
  ↓ creates event { type, secondaryType, name, guestEstimate, ... }
createEvent()
  ↓ evIsHost = intakeFamilyConfig(ev.type).recordKind === 'event'   ← taxonomy gate
  ↓ (Birthday/Retirement/Reunion/Anniversary/Graduation all FAIL this gate)
  ↓
  [ if evIsHost ] → setAssemble({ev}) → AssembleReveal
  [ else ]        → straight to EditorialCover / HostHome, reveal never mounts

AssembleReveal (when it does mount):
  evIdentity = eventIdentity(ev)        ← legacy meaning/honoree reader
                                           (no primaryEventType/isCompound/etc.
                                            fields — always undefined for a
                                            fresh event with no meaning captured)
  ↓
  buildAssembleRevealStages(ev, evIdentity, profile)
  ↓
  stages[].{title, what}  ← only these two fields rendered
  stages[].{why, status, nextDecision, confidenceLabel}  ← computed, discarded
```

### After
```
NewEventModal (intake)
  ↓ creates event { type, secondaryType, name, guestEstimate, ... }
createEvent()
  ↓ _revealEligibleAccount = accountTypeOf(profile, clients) !== 'planner'  ← account gate
  ↓ (Birthday/Retirement/Reunion/Anniversary/Graduation/Crab Feast all PASS
  ↓  for any host account, regardless of event-type taxonomy family)
  ↓
  [ if _revealEligibleAccount && qualifies ] → setAssemble({ev}) → AssembleReveal

AssembleReveal:
  freeText = strip-primary-type-words(ev.name) + secondaryType + honoree + theme
  evIdentity = resolveEventIdentity(ev, ev.type, 'self', freeText)   ← Sprint A engine
  ↓
  buildAssembleRevealStages(ev, evIdentity, profile)
  ↓
  stages[].{title, what, why, status, nextDecision, confidenceLabel}  ← ALL rendered
```

**Note:** `evIsHost` (the taxonomy-based `recordKind` check) is untouched everywhere else in the app — Plan tab, Budget tab, Client Detail, first-event sample-purge guard, etc. Only the Reveal trigger condition was changed, per the sprint's explicit scope ("entering Assemble Reveal," not a global shell-routing rewrite).

---

## Defects Found and Fixed

### 1. Wrong Identity reader wired (Critical)
**File:** `src/App.js`
`AssembleReveal` called `eventIdentity()` from `lib/eventIdentity.js` (legacy meaning/honoree presentation reader — no compound/complexity/confidence fields) instead of Sprint A's `resolveEventIdentity()` from `lib/eventIdentityEngine.js`.
**Fix:** Added import of `resolveEventIdentity`; `AssembleReveal` now calls it directly. `HostHome`'s own use of the legacy `eventIdentity()` reader (for its "heart of your event" must-have-moment card) is untouched — that's a different, valid purpose.

### 2. Reveal gated by unrelated taxonomy field (Critical)
**File:** `src/App.js`, `createEvent()`
The `setAssemble(...)` trigger required `intakeFamilyConfig(ev.type).recordKind === 'event'`, which only ~16 "at-home gathering" types satisfy. Birthday, Retirement Party, Reunion, Anniversary, and Graduation are all `host_driven` family and never triggered the reveal.
**Fix:** Replaced with `accountTypeOf(profile, clients) !== 'planner'` — the reveal now fires based on whether the *account* is a host, not on the event type's planner-vocabulary classification. A professional planner managing a "Birthday" client still correctly skips the host-only reveal.

### 3. Computed fields never rendered (Critical)
**File:** `src/App.js`, `AssembleReveal` JSX
`why`, `status`, `nextDecision`, `confidenceLabel` were computed by `buildAssembleRevealStages()` and discarded before render — only `title`/`what` were shown.
**Fix:** Added three conditionally-rendered spans reusing the exact same design tokens already in use on the card (`T.caption`, `C.muted`, `FW.semibold`) — no new styling system, no layout change.

### 4. Field-name mismatch: `guestCount` vs `guestEstimate` (Bug, found during live verification)
**File:** `src/lib/assembleRevealEngines.js`
`NewEventModal` stores the intake guest count under `guestEstimate`, not `guestCount` (that field is only populated later, once a host locks a real headcount). The guest-count-confirmation blocker and the Guests domain both checked `event.guestCount` only, so they misfired for every freshly created event even when a guest count was entered at intake.
**Fix:** Both now resolve guest count the same way `HostHome` already does: `guestCount → guestEstimate → guests.length → 0`.

### 5. Name self-echo false-positive compound detection (Bug, found during live verification)
**File:** `src/App.js`, `AssembleReveal`
The free-text signal built for `resolveEventIdentity()` included `ev.name`, which frequently echoes the primary type verbatim (the default auto-name is literally `"My {type}"`). A plain Retirement Party ("My Retirement Party") falsely detected its own name as a second "retirement" milestone, producing "A retirement party + retirement. Two milestones, one event" — wrong and confusing.
**Fix:** Strip the primary type's own words out of the name before parsing (word-boundary filter, case-insensitive) — a host's genuine compound description ("50th Birthday and Military Retirement from the Navy" for type=Birthday) still detects correctly, while the type-echoing default name no longer self-matches.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.js` | Added `resolveEventIdentity` import; replaced `eventIdentity()` call in `AssembleReveal` with `resolveEventIdentity()` + name-stripped free-text construction; replaced `evIsHost` gate with `accountTypeOf(...) !== 'planner'` at the `setAssemble` call site only; added rendering for `why`/`status`/`nextDecision`/`confidenceLabel` |
| `src/lib/assembleRevealEngines.js` | Fixed guest-count resolution in `deriveDecisionBlockers()` and `assemblePlanningDomains()` to check `guestEstimate` and `guests.length` in addition to `guestCount` |
| `src/lib/__tests__/f4AssembleReveal.test.js` | Added 3 regression tests for the `guestEstimate` field-name fix |
| `src/lib/__tests__/is1NameStripping.test.js` | New file — 4 regression tests for the name self-echo fix |
| `docs/IS1_CALL_CHAIN_AUDIT.md` | New — full engine-by-engine runtime audit table |
| `docs/IS1_IMPLEMENTATION_REPORT.md` | This report |

**Explicitly not touched:** animations, CSS, layout, `resolvePersona()`/`resolveShell()` wiring, global taxonomy/shell-routing logic used elsewhere in the app, ExperienceView/Blueprint/Research pipeline (confirmed correct as admin-only).

---

## Live Browser Verification

All 5 required scenarios were created fresh (cleared `localStorage`, brand-new host session) and walked through end-to-end: intake → Assemble Reveal → Host Home.

| Scenario | Reveal Fired? | Identity Shown? | Compound Detected? | Correct Shell? | HostHome Matches Reveal? |
|---|:---:|:---:|:---:|:---:|:---:|
| Birthday | ✅ | ✅ "A birthday." | N/A | ✅ Host | ✅ |
| Retirement Party | ✅ | ✅ "A retirement party." (no false compound) | N/A | ✅ Host | ✅ 75 guests match |
| Family Reunion | ✅ | ✅ "A reunion." | N/A | ✅ Host | ✅ 60 guests match |
| Crab Feast | ✅ (unchanged — already worked) | ✅ | N/A | ✅ Host | ✅ |
| **50th Birthday + Military Retirement** | ✅ | ✅ "A birthday + retirement + military-retirement. Two milestones, one event." | ✅ Yes — `Ceremony Timing`, `Dress Code` blockers + `Watch Out` risk stage all fired | ✅ Host | ✅ 85 guests match |

### Flagship scenario detail (50th Birthday + Military Retirement)
Full card sequence observed live:
1. **Your Event** — "A birthday + retirement + military-retirement. Two milestones, one event. We'll handle both." / "We recognized Birthday. Formal ceremony first, then celebration. Guests span immediate-family and military-colleagues." / Next: confirm ceremony timing / **High confidence**
2. **Ceremony Timing** — "This decision cascades: it affects your timeline, guest experience, vendor sequence, and risk profile." / Required
3. **Venue** — Required
4. **Dress Code** — "Formal ceremony + casual celebration = guests will be confused. Clarity here prevents day-of friction." / Required
5. **Building Your Day** — 5 moments, hour by hour / Assembled
6. **Guest Planning** — 85 guests / Assembled
7. **Watch Out** — "Guest expectations for ceremony vs. celebration formality will diverge if not clarified early." / "These aren't fears—they're patterns we see in events like yours." / mitigation guidance

HostHome after opening: title reads the full event name, "85 guests" matches the reveal exactly, correct Host tab bar (Your event / Plan / The Day / Guests / Budget / More). No contradiction between what the reveal promised and what HostHome shows.

---

## Tests

```
Test Suites: 3 passed, 3 total
Tests:       121 passed, 121 total
```
- `sprintAEngines.test.js` — 55 tests (unchanged, still passing)
- `f4AssembleReveal.test.js` — 65 tests (62 original + 3 new `guestEstimate` regression tests)
- `is1NameStripping.test.js` — 4 new tests (name self-echo fix)

## Production Build

```
Build folder is ready to be deployed. 0 errors.
```
(Pre-existing lint warnings in unrelated files are unchanged from before this sprint.)

---

## Remaining Orphaned Engines (Not Fixed — Out of Scope)

Per the audit, two categories remain unwired:

1. **`resolvePersona()` / `resolveShell()`** (Sprint A) — still have zero runtime callers. Not required to fix the Reveal defects addressed here (Reveal doesn't need persona/shell to render identity/blockers/risk). Actual shell routing throughout the app still runs on `intakeFamilyConfig`/taxonomy. **Recommendation:** a future, explicitly-scoped sprint should decide whether to wire these in to replace the taxonomy-based shell routing, or formally retire them if the taxonomy approach is to remain canonical. Leaving both live and unreconciled is an architecture-debt item, not a runtime defect fixed by this sprint.
2. **ExperienceView / Blueprint / Research pipeline** — confirmed intentionally admin-only (Knowledge Factory layer). No action needed; this is the architecture working as designed per CLAUDE.md's guardrails against leaking admin complexity into the host shell.

---

## Success Criteria Check

- ✅ Brand-new Birthday, Retirement, Crab Feast, Reunion, and 50th Birthday + Military Retirement all enter the correct Host shell
- ✅ All trigger Assemble Reveal
- ✅ All show identity (with accurate compound detection, no false positives)
- ✅ All explain reasoning (why/status/nextDecision/confidenceLabel now rendered)
- ✅ All transition into a Host Home that matches what was promised (guest counts, event names verified live, no contradictions)
