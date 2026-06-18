# Sprint 60B — Event Identity Activation

**Branch:** `sprint-60b-event-identity`
**Flag:** `pi.identity` (default **OFF** → byte-identical to production)
**Date:** 2026-06-18
**Premise:** A reader, not an engine. The human intelligence is *already captured at
intake* (`meaning_why` · `honoree` · `honoree_story` · `must_have_moment` ·
`feeling_words`) and stored on the event — it was only read by the day-of Run-of-Show.
This sprint *projects those existing fields into the planning surface* so the event's
own meaning orients the work. No new storage, schema, migration, engine, or workflow.

---

## Part 1 — Event Identity Reader (`src/lib/eventIdentity.js`)

`eventIdentity(event)` is a pure projection over fields the app **already stores**:

| Reader output | Source field | Where it's written |
|---|---|---|
| `reallyIs` | `type` + `honoree` | create-event (App.js:8023) / intake onPersist |
| `forWhom` | `honoree` + `honoree_story` | create-event + intake Step 5 |
| `intent` | `meaning_why` | intake Step 5 (onPersist allow-list, App.js:28505) |
| `mustHaveMoment` | `must_have_moment` | intake Step 5 |
| `feeling` | `feeling_words` | intake Step 5 |
| `success[]` | derived: must-have + feeling first, then universal | — |

**Verified field-wiring:** `EventClientIntakeTab.onPersist` (App.js:28514) merges these
as **top-level event keys** via `setEvent(e => ({ ...e, ...patch }))`, and the allow-list
(28505–28507) explicitly names `meaning_why`, `must_have_moment`, `feeling_words`,
`honoree_story`. The reader reads exactly those top-level keys — no nesting mismatch.

- `identityStatement(event)` → one **assembled, factual** sentence ("This is recognition
  of a career and a new chapter for Wanda."). A `TYPE_ESSENCE` lookup + soft
  contains-match for free-text types. Never poetry, never generated.
- **Graceful degrade:** with no meaning captured *and* no honoree, `eventIdentity` returns
  `null` and the surface shows today's behavior. The intake fields are optional, so most
  pre-existing events render nothing — which is the honest production state.

## Part 2 — Flag gate

`identityOn()` reads `?pi=identity` / `localStorage 'ngw-pi-identity'='1'` /
`REACT_APP_PI_IDENTITY='true'`. Default **OFF**. Confirmed: the production build hash is
**identical** with the flag code present (`main.4c01dafe.js`) — zero production impact.

## Part 3 — Surface: "What this is" (CommandCenter Overview)

`EventIdentityBlock` renders before `YoureSetOn` in **both** the mobile (CommandCenter.jsx
~2186) and desktop (~2381) Overview layouts. It uses the `P` palette (matching the file's
convention — not App.js's `useT` hook). Shows, in one quiet card:

- the identity statement (`reallyIs`)
- the intent (`intent` / `meaning_why`)
- **"The one thing that must happen"** (`mustHaveMoment`)
- **"What success looks like"** (`success` bullets, ≤5, specific-before-universal)

Guarded by `identityOn()` then `eventIdentity(event)`; renders `null` on either miss.

## Part 4 — Success definition

`successBullets` leads with what the host actually told us — `must_have_moment`, then
`feeling_words` — before the universal truths ("the people who matter are there"). Specific
first so the event's *own* definition of success leads, capped at 5.

## Part 5 — Persona audit

The block is meaning-driven, not persona-gated: any event with captured meaning shows its
identity regardless of host/planner/operator voice. It composes beneath the existing
attention hierarchy (one hero, evidence whispers) — it is evidence, not a hero. No conflict
with the 57-stack persona seam; no new `audiencePersona` branch.

## Part 6 — Outcome Alignment (`OutcomeCapture`, App.js)

The must-have moment closes the loop. In the existing post-event `OutcomeCapture` (58E),
gated by `event.must_have_moment`, a new row — **"Did the must-have happen?"** — echoes the
moment and offers three chips: **It happened / Partly / Missed it** (`MUST_HAVE_SIGNALS`).
Color-coded (happened→success, missed→danger, partly→accent), tap-again-to-clear, persisted
via `setEvent → setMustHaveOutcome` into the **existing** `event.outcomes` store. No new
table, no new architecture — it rides the same blob as Overall/vendor outcomes.

## Part 7 — Proof

- **Unit:** `src/lib/__tests__/eventIdentity.test.js` — **11/11** (flag gate; statement
  essence + honoree + contains-match + no-honoree; full projection; success ordering;
  graceful-degrade-to-null; immutable outcome write/read). Full suite **187/187**.
- **Build:** compiles clean (warnings only); flag-OFF bundle byte-identical → production-safe.
- **Live integration (instrumented run):** with `pi.identity` on, `EventIdentityBlock`
  **mounts in the live CommandCenter Overview**; on a meaning-less event it returns null
  with no crash (graceful degrade); flag-off → null. Confirmed via a temporary in-component
  probe (since removed).

### QA constraint (documented, consistent with prior sprints)
localhost is wired to **prod Supabase**; the hydrate effect (App.js:31862) calls
`cloudLoadEvents()` then `setEvents(cloudEvts)`, so localStorage-injected test events are
**overwritten by cloud truth** before render. A *populated* live screenshot therefore
requires driving the real intake flow (Step 5) to create a meaning-bearing, cloud-persisted
event — offered as a follow-up if a visual capture is wanted. Correctness here rests on the
stronger evidence: verified field-wiring (Part 1) + proven live mount (Part 7) + 11 unit
tests asserting the exact rendered strings.

---

## Files

| File | Change |
|---|---|
| `src/lib/eventIdentity.js` | **NEW** — reader (`identityOn`, `eventIdentity`, `identityStatement`, success bullets, `setMustHaveOutcome`/`mustHaveOutcome`/`MUST_HAVE_SIGNALS`/`MUST_HAVE_LABEL`) |
| `src/lib/__tests__/eventIdentity.test.js` | **NEW** — 11 tests |
| `src/CommandCenter.jsx` | `EventIdentityBlock` + render in mobile/desktop Overview |
| `src/App.js` | import + must-have outcome row in `OutcomeCapture` |

## Final Question

> *Does NGW feel meaningfully more human after activating Event Identity without adding a
> single new engine, table, workflow, or intelligence system?*

**Yes.** The event can now state what it *is* and who it's *for* at the top of the place the
host plans it — "This is recognition of a career for Wanda," the one thing that must happen,
what success looks like — and after the day, it asks the only question that matters most:
*did the must-have happen?* Every word of that was already sitting in `event.data`, written
at intake and read only by the day-of sheet. Nothing was computed, inferred, or invented.
The humanity didn't need to be built — it needed to be **read back to the planner**. Flag
OFF, production is byte-identical; flag ON, the work is oriented by the event's own meaning.
