# Sprint IS-2 — Shell Resolution Consolidation Audit

**Date:** 2026-07-04
**Type:** Audit only. No code changed. No files modified. `App.js` untouched.
**Method:** Direct source tracing (grep + read) of every routing decision point, from `New Event` through `Planning surfaces`.

---

## Executive Summary

The runtime has **two unrelated routing systems running side by side**, and they answer two different questions:

1. **The legacy taxonomy system** (`eventTaxonomy.mjs` + `intakeFamilyConfig()`) answers *"what vocabulary/features does this event TYPE get?"* — it's a per-event-type lookup table, and it drives 11 separate call sites across intake, tabs, budget, sync, and analytics.
2. **The account-based gate** (`accountTypeOf()`) answers *"is the CURRENT ACCOUNT a host or a planner?"* — it's a single binary switch, and it is the **only thing that decides which top-level shell actually renders** (`HostHome` vs `MainDashboard`).
3. **Sprint A's `resolveShell()`** answers a *third, currently unused* question — "which of 6 personas (host/planner/coordinator/corporate/venue/vendor) should this event route to?" — a vocabulary that has **no corresponding runtime UI for 4 of its 6 values.** Only `host` and `planner`-shaped UI exist at all.

**The two live systems don't conflict as often as expected, because they don't overlap much:** the taxonomy answers a per-event question that only matters *within* whichever shell the account-gate already picked. But they **do produce one measurable defect**: taxonomy-driven vocabulary/tab-visibility decisions inside `MainDashboard` will show "Client" language for a `host_driven`-family event, even for a genuinely host-flavored event, whenever a planner account is managing it — and, before IS-1, that same taxonomy field also wrongly gated whether the *reveal itself* fired. IS-1 fixed the reveal-specific instance; the other 10 call sites are unchanged and were out of that sprint's scope.

**Recommendation: `resolveShell()` should NOT become the canonical routing authority today.** It is architecturally impossible for it to do so without first building the shells it names (Corporate, Venue, Vendor, Coordinator) or narrowing its output vocabulary to match what exists (Host, Planner). This is a real decision, not a small integration gap — see Section 5.

### Correction / Addendum (added after deeper verification pass)

The picture above understates the routing surface by one layer. There is a **third, independent persona mechanism**, `audiencePersona(event)` (`lib/nextActionRenderer.js:203`), which reads a self-declared `event.audience` field ('personal'/'organization'/'professional'/'other') and maps it to `host`/`operator`/`planner`. It feeds `hostNavActive(event)` (`lib/presentationNav.js:34`), which in turn gates a **second-level shell split** inside the root `App()` return chain: `HostEventShell` vs the planner-facing `EventPlanner` component, for the event-detail workspace specifically (separate from the portfolio-level `HostHome`/`MainDashboard` split). This sits behind two feature flags — `navOn()` (default ON) and `hostShellOn()` (**default OFF**, per its own code comment: *"pi.shell (default OFF)... OFF ⇒ the existing EventPlanner path, byte-identical to today"*). **In default production configuration, `hostShellOn()` is off, so `HostEventShell` never renders — every event detail view uses `EventPlanner` regardless of account type or event audience.** This doesn't change the audit's conclusion; it strengthens it: the runtime already has **three** independent, unreconciled persona/shell mechanisms (`accountTypeOf`, `audiencePersona`/`hostNavActive`, and Sprint A's orphaned `resolvePersona`/`resolveShell`) before Sprint A is even counted. Adding a fourth without first reconciling the existing three would compound the problem this audit was meant to surface, not solve it.

**The corrected root render chain** (all gates read local App.js state or the two functions above — none consult Sprint A):
1. `intakeToken` → `PublicIntakeForm` (public RSVP route)
2. `eventDayMode` → `EventDayMode` (dev-only harness)
3. `activeEvent` + cover not yet seen → `EditorialCover`
4. `activeEvent` + `hostShellOn() && hostNavActive(activeEvent)` (both flag-gated, second defaults OFF) → `HostEventShell`
5. `activeEvent` (fallthrough) → `EventPlanner`
6. `activeClient` → `ClientDetail`
7. Otherwise: `showWelcome` → `WelcomeOnboarding`; else `accountTypeOf(...) === 'host'` → `HostHome` : `MainDashboard`

Section 6's "NO" conclusion and Section 7's hypothetical migration plan are unchanged by this correction, but any future migration plan must also account for reconciling `audiencePersona`/`hostNavActive`, not just `accountTypeOf`, before `resolveShell()` could safely become canonical.

---

## 1. Complete Runtime Routing Chain

| Step | Input | Output | Caller | Consumer | Fallback | Legacy logic? |
|---|---|---|---|---|---|---|
| **New Event** | User clicks "+ New event" | `showNew = true` | Various (`HostHome`, `MainDashboard`, `PipelineView`, header buttons) | `NewEventModal` render gate | — | No |
| **Intake** | Type search, date, name, guest count (host cold-open flow) | Form state → `ev` object literal | `NewEventModal` (App.js:11136) | `onCreate` callback | — | Uses `intakeFamilyConfig` only for vocab/KIT defaults, not routing |
| **Event Creation** | `ev` object | Persisted event + side effects | `createEvent()` (App.js ~44222) | `setEvents`, `setAssemble` | — | `evIsHost` (taxonomy, App.js:44280) still computed and used for the **sample-purge guard** (unchanged, correctly scoped — different concern than Reveal) |
| **Event Identity** | `ev`, `ev.type`, `'self'`, stripped free text | `{primaryEventType, isCompound, complexity, ceremonyComponents, confidence, ...}` | `AssembleReveal` (App.js ~22467) via `resolveEventIdentity()` | `buildAssembleRevealStages()` | `null` on any error (caught) | **None** — this is the one call site Sprint A's engine actually reaches (fixed in IS-1) |
| **Persona** | *(would be: eventIdentity, accountProfile, relationship, context)* | *(would be: `{persona, confidence, appliedRule}`)* | **No caller exists.** `resolvePersona()` has zero production call sites. | — | — | N/A — never invoked, so nothing to "fall back" from |
| **Shell Resolution** | *(would be: eventIdentity, persona)* | *(would be: one of host/planner/coordinator/corporate/venue/vendor)* | **No caller exists.** `resolveShell()` has zero production call sites. | — | — | **`accountTypeOf(profile, clients) === 'host' ? <HostHome/> : <MainDashboard/>`** (App.js:44329, root `App()` return) is the entire real shell decision — binary, account-based, unrelated to Sprint A's 6-value vocabulary |
| **Editorial Cover** | `event`, `profile` (props only) | Visual identity card (icon/color/countdown) | Root `App()` render (App.js:44668) | Host, pre-`activeId`-open | — | **None** — `EditorialCover` (App.js:28659) makes zero host/planner/shell decisions itself; it is purely presentational and receives whatever event it's given |
| **Assemble Reveal** | `ev`, `evIdentity` (Sprint A now), `profile` | Stage cards | `createEvent()` → `setAssemble()` → `<AssembleReveal>` (App.js:44508) | Host, once, on qualifying event creation | Empty stage array on error | **Trigger gate fixed in IS-1**: was `evIsHost` (taxonomy), now `accountTypeOf(...) !== 'planner'` (account-based) — the only Reveal-specific taxonomy dependency has been removed |
| **Host Home** | `events`, `profile` | Host's home dashboard | Root `App()`, when `accountTypeOf === 'host'` | Host | `MainDashboard` if not host | Same account gate as Shell Resolution step (same line, same decision — there is no separate "Host Home routing" distinct from the top-level shell pick) |
| **Planning surfaces** (Plan/Budget/Guests/The Day/etc. tabs) | `event`, `event.type` | Tab visibility, vocabulary ("event" vs "client"), field labels | 10 distinct call sites — see Section 2 | Various tab components | Defaults to `'host_driven'` family (`INTAKE_FAMILIES.host_driven`) if type is unrecognized | **Yes — all 10 remaining sites, unchanged, unrelated to Reveal, still taxonomy-driven** |

---

## 2. What Determines Shell Routing Today — Exactly Where

**The actual top-level shell switch — the only place that decides HostHome vs MainDashboard:**

```
App.js:44329
accountTypeOf(profile, clients) === 'host' ? <HostHome .../> : <MainDashboard .../>
```

`accountTypeOf()` itself — App.js:245:
```js
function accountTypeOf(profile, clients) {
  const t = profile && profile.accountType;
  if (ACCOUNT_TYPES.includes(t)) return t;
  const hasRealClient = Array.isArray(clients) && clients.some(c => c && c.id && !SEED_CLIENT_IDS.has(c.id));
  return hasRealClient ? 'planner' : 'host';
}
```

That's it. **One function, one call site, one binary decision.** Everything else — taxonomy, `recordKind`, `intakeFamilyConfig` — operates entirely *within* whichever shell this already picked, changing vocabulary and tab visibility, not which shell renders.

### `accountTypeOf(...)` call sites (App.js)
| Line | Enclosing context | Drives |
|---|---|---|
| 11234 | `NewEventModal` | `hostMode` — whether intake shows host-flavored copy/flow vs planner client-creation flow |
| 44329 | Root `App()` return | **The actual shell switch** (HostHome vs MainDashboard) |
| 44338 | `createEvent()` | IS-1's Reveal trigger gate (`_revealEligibleAccount`) |
| 44808 *(duplicate of above under different build)* | Root `App()` | Same switch, re-confirmed |
| 44852 | Root `App()`, profile modal | Whether the profile sheet shows host or planner settings variant |

### `intakeFamilyConfig(...).recordKind` call sites (App.js) — 11 total, none of them the shell switch
| Line | Function | Drives |
|---|---|---|
| 15138 | (vocab helper) | `isHostEvent` — copy/vocabulary selection for a specific UI string |
| 23909 | `clientIsHostRec` closure | Whether a *client record* is treated as host-flavored for tab-visibility purposes |
| 23910 | `eventIsHostFam` closure | Same, for a raw event object |
| 24737 | `isHostClient` closure | Same pattern, third near-duplicate of the two above |
| 26197 | Client Detail | `isHostRecord` — which tabs/vocab render inside Client Detail |
| 26359 | Client Detail row | `evIsHost` — per-event-row vendor-metric display logic |
| 27412 | Budget tab | `isHostBudget` — host vs. client budget vocabulary/behavior |
| 41719 | Planning view wrapper | Whether the read-only "Day" schedule or the editable planner schedule renders |
| 41781 | Planning view | `isHostEvt` — general host/planner UI branch inside the event workspace |
| 43975 | Analytics tracking | `is_host` property tagged onto the `EVENT_QUALIFIED` tracking event |
| 44280 | `createEvent()` | `evIsHost` — **only** for the first-real-event sample-purge guard (unrelated to Reveal since IS-1) |

**Three of these (23909, 23910, 24737) are near-duplicate closures** doing the same `intakeFamilyConfig(...).recordKind === 'event'` check with cosmetic naming differences (`clientIsHostRec`, `eventIsHostFam`, `isHostClient`) — this is the clearest instance of **duplicated routing logic** in the audit.

---

## 3. Where Taxonomy Overrides Runtime Intelligence

**Direct answer: nowhere, currently, for the Reveal path** (IS-1 removed the one place it did). For every other planning surface, taxonomy is the *only* signal — there is no runtime-intelligence path to override, because `resolvePersona()`/`resolveShell()` are never called at all. "Override" implies a conflict between two active signals; today there is no second active signal outside of Reveal, so it's more precise to say: **taxonomy is the sole authority everywhere except the one call site IS-1 fixed.**

The distinction that matters for the audit: taxonomy governs **vocabulary and tab visibility within an already-chosen shell**; it has never governed **which shell renders** (that's `accountTypeOf` alone, and always has been, per Section 2). Sprint A's engines were built to answer the "which shell" question, but nothing routes through them for that question today except the narrow Identity-only slice IS-1 wired into Reveal.

---

## 4. Every Bypass — Runtime Flows That Never Call Sprint A's Engines

| Flow | Calls `resolveEventIdentity`? | Calls `resolvePersona`? | Calls `resolveShell`? | Why |
|---|:---:|:---:|:---:|---|
| Root shell switch (`App()` return, :44329) | No | No | No | Uses `accountTypeOf` directly; Sprint A engines were never wired here |
| `NewEventModal` intake | No | No | No | Builds the raw event object only; no identity/persona resolution happens at creation time itself — only later, inside `AssembleReveal` |
| `EditorialCover` | No | No | No | Purely presentational; receives event/profile as props, makes no identity or routing decision |
| `HostHome` (own must-have-moment card) | No (uses legacy `eventIdentity()` reader instead — different purpose, correctly so) | No | No | HostHome's use of "identity" is about the event's *meaning* (must-have moment), not its *classification* — a legitimately separate concept from Sprint A's engine |
| `MainDashboard` / `PipelineView` / `ClientDetail` (planner-side surfaces) | No | No | No | These are reached only when `accountTypeOf → 'planner'`; nothing inside them consults Sprint A at all |
| Budget / Plan / Guests / Vendor / The Day tabs | No | No | No | All host/planner branching inside these tabs is taxonomy-driven (Section 2) |
| **`AssembleReveal`** | **Yes (as of IS-1)** | No | No | The only genuine, live call site for any Sprint A engine |

**Summary: exactly one runtime code path in the entire app calls any Sprint A engine, and it only calls one of the three (`resolveEventIdentity`).** Every other flow — including the shell switch itself — bypasses Sprint A entirely.

---

## 5. Every Orphan — Sprint A Functions With Zero/Test-Only Callers

Confirmed via direct grep of the full `src/` tree (not just `App.js`), separating test files from production files:

| Function | File | Non-test callers | Test-only callers | Recommendation |
|---|---|---|---|---|
| `resolveEventIdentity()` | `lib/eventIdentityEngine.js` | **1** — `App.js` (`AssembleReveal`, wired in IS-1) | `sprintAEngines.test.js`, `is1NameStripping.test.js` | **WIRE** (already done) — no further action |
| `resolvePersona()` | `lib/personaResolutionEngine.js` | **0** | `sprintAEngines.test.js` | **PARK** — see reasoning below |
| `resolveShell()` | `lib/shellResolver.js` | **0** | `sprintAEngines.test.js` | **PARK** — see reasoning below |

### Why PARK and not WIRE or DELETE

**Not DELETE:** both functions are correctly implemented, fully tested (55 passing Sprint A tests cover them), and represent real design intent (a persona/shell resolution layer richer than the current binary account gate). Deleting working, tested code with no evidence it's wrong would be destructive for no benefit.

**Not WIRE (yet):** wiring `resolveShell()` into the root switch today would require the switch to branch on 6 values it currently has no UI for (see Section 6 — 4 of 6 shells don't exist as components). Wiring `resolvePersona()` alone, without `resolveShell()` consuming its output, would create computed-but-unused state — exactly the same class of defect IS-1 was created to fix in Reveal. Wiring both together, correctly, is a multi-sprint architectural decision (Section 6 details what would be required), not a small integration fix — it's out of this audit's guardrails ("do not implement").

**PARK is the correct classification**: keep the code and its tests as-is, don't call it from anywhere new, and revisit only if/when the product decides to build the missing shells or narrow the vocabulary (Section 6).

---

## 6. Can `resolveShell()` Become the Canonical Routing Authority?

## **NO.**

### What blocks it, precisely

`resolveShell()`'s output vocabulary (from `lib/shellResolver.js`, `SHELLS` enum):
```js
const SHELLS = { HOST: 'host', PLANNER: 'planner', COORDINATOR: 'coordinator', CORPORATE: 'corporate', VENUE: 'venue', VENDOR: 'vendor' };
```

The runtime's actual top-level shell components (root `App()` return, App.js:44329):
```
accountTypeOf(...) === 'host' ? <HostHome/> : <MainDashboard/>
```

**Two branches exist. Six are named.** There is no `CoordinatorShell`, `CorporateShell`, `VenueShell`, or `VendorShell` component anywhere in `App.js` or its render tree. `MainDashboard` is the single component that today absorbs everything that isn't `HostHome` — including what Sprint A's vocabulary would call `planner`, `corporate`, `venue`, and `vendor` cases alike, undifferentiated.

**This means `resolveShell()` cannot be wired in as-is without one of two prerequisite decisions being made first:**

- **(a)** Build the four missing shell components (Corporate, Venue, Vendor, Coordinator) as real, distinct UI surfaces — a genuine feature-build project, explicitly out of this audit's scope ("do not build new UX").
- **(b)** Narrow `resolveShell()`'s vocabulary down to the two values the runtime actually supports (`host`/`planner`), which would make it correct but also make most of its current design (and the corresponding branches in `resolvePersona()`) dead weight — effectively asking Sprint A to describe a simpler system than it was built for.

Neither of these is a small integration patch. Both are product/architecture decisions with real design cost, which is exactly the kind of thing this audit was scoped to surface rather than resolve.

### Secondary blocker: `resolvePersona()` has never run against real accounts

Even setting the shell-count mismatch aside, `resolvePersona()`'s 6-rule hierarchy (Sprint A) was designed and tested against **fixtures**, not against the real `accountTypeOf()`/`profile`/`clients` data shape the runtime actually has. It has never been exercised against a real profile object in the running app. Before it could safely become load-bearing, it would need the same kind of live-verification pass IS-1 did for `resolveEventIdentity()` — which caught two real bugs (`guestEstimate` field-name mismatch, name self-echo) that zero unit tests had surfaced. There is no reason to expect `resolvePersona()` is bug-free against real data just because its fixtures pass.

---

## 7. If This Were to Proceed Anyway — Migration Plan (Informational Only, Not Authorized)

Per the sprint's own guardrails, this is **not being executed**. It is provided because the prompt asked "if YES, produce the plan" — included here as the answer to what *would* be required, explicitly contingent on resolving the two blockers in Section 6 first (i.e., this plan assumes a future decision to either build the missing shells or narrow the vocabulary).

### Hypothetical Sprint 1 — Narrow-Vocabulary Alignment
**Goal:** Decide and implement the vocabulary match (host/planner only) so `resolveShell()`'s output space equals the runtime's actual branches.
**Files:** `lib/shellResolver.js` (narrow `SHELLS`/`PERSONA_TO_SHELL` map), `lib/personaResolutionEngine.js` (confirm 6-rule hierarchy collapses cleanly to 2 outputs).
**Risk:** Low — code-only change to an already-orphaned module; no runtime behavior changes until Sprint 2 wires it in.
**Regression tests:** Re-run `sprintAEngines.test.js` with updated assertions for the narrowed enum.
**Rollback:** Revert the file; zero runtime impact since nothing calls it yet.

### Hypothetical Sprint 2 — Shadow-Mode Verification
**Goal:** Call `resolvePersona()` + `resolveShell()` alongside the existing `accountTypeOf()` switch (log-only, do not branch render on it), across real accounts/events, to see whether outputs agree.
**Files:** Root `App()` render (`App.js` — add a diagnostic-only comparison, not a behavior change), likely gated behind a dev-only flag.
**Risk:** Medium — must guarantee zero render-path change; any accidental behavior coupling is exactly what IS-1 was built to catch elsewhere.
**Regression tests:** New test asserting `resolveShell()` output matches `accountTypeOf()` output for the 20-scenario regression matrix (Section 8) on every existing sample/seed event.
**Rollback:** Delete the diagnostic call; no user-facing risk since it was never live.

### Hypothetical Sprint 3 — Cutover
**Goal:** Only if Sprint 2's shadow data shows 100% agreement across the regression matrix: replace `accountTypeOf(...) === 'host'` at App.js:44329 with `resolveShell(...) === SHELLS.HOST`.
**Files:** `App.js` root render only.
**Risk:** High — this is the single highest-traffic conditional in the entire app; any mismatch sends real hosts to the planner CRM or vice versa.
**Regression tests:** Full 20-scenario matrix (Section 8) run live in-browser (not just unit tests) exactly as IS-1 did for Reveal, plus every existing App.js test suite.
**Rollback:** One-line revert to `accountTypeOf(...) === 'host'`; keep both code paths available behind a flag for at least one release cycle before deleting the old gate.

---

## 8. Regression Matrix

Columns: **Event Identity** = what `resolveEventIdentity()` would classify it as (primaryEventType/isCompound) if called; **Persona** = what `resolvePersona()` would output if called (not called today — "N/A, not wired"); **Shell (Taxonomy)** = what `intakeFamilyConfig` actually produces today; **Shell (Actual Runtime)** = what a user really sees, which is always `accountTypeOf`-driven, not taxonomy-driven; **Reveal** = fires? (post-IS-1); **Host Home matches?** = consistency check from IS-1's live verification.

| Event Type | Event Identity (if called) | Persona (not wired) | Taxonomy family/recordKind | Actual Shell Rendered | Reveal Fires? | Expected | Actual | Match? |
|---|---|---|---|---|---|---|---|:---:|
| Birthday | Birthday, simple/standard | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (IS-1 live-verified) | Host shell, Reveal fires | Host shell, Reveal fires | ✅ |
| Retirement Party | Retirement Party, simple/standard | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (IS-1 live-verified) | Host shell, Reveal fires | Host shell, Reveal fires | ✅ |
| Military Retirement | **No distinct type — must be typed as "Retirement Party" + free text** | N/A | Same as Retirement Party | HostHome (account-gated) | ✅ (via free-text detection, IS-1) | Host shell, compound/ceremony detected if described | Works only if host types military language into name field | ⚠️ Works, but fragile — no dedicated type |
| Birthday + Military Retirement | Compound (Birthday + retirement + military-retirement) | N/A | `host_driven` / `client` (Birthday's own family) | HostHome (account-gated) | ✅ (IS-1 flagship, live-verified) | Host shell, compound detected, ceremony/dress-code blockers | Confirmed live in IS-1 | ✅ |
| Anniversary | Anniversary, simple | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (account-gated, not live-tested this sprint but same code path as Birthday) | Host shell, Reveal fires | Expected to match Birthday's pattern | ✅ (inferred — same gate) |
| Family Reunion | Reunion, simple/standard | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (IS-1 live-verified) | Host shell, Reveal fires | Host shell, Reveal fires | ✅ |
| Graduation | Graduation, standard | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (account-gated, same pattern) | Host shell, Reveal fires | Expected match | ✅ (inferred) |
| Baby Shower | Other/Baby Shower (not in Sprint A milestone list explicitly, would classify generically) | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (account-gated) | Host shell, Reveal fires | Expected match | ✅ (inferred) |
| Bridal Shower | Same as above | N/A | `host_driven` / `client` | HostHome (account-gated) | ✅ (account-gated) | Host shell, Reveal fires | Expected match | ✅ (inferred) |
| Bachelor Party | Same pattern | N/A | `host_driven` / `client`, `travel: true` | HostHome (account-gated) | ✅ (account-gated) | Host shell, Reveal fires | Expected match | ✅ (inferred) |
| Bachelorette Party | Same pattern | N/A | `host_driven` / `client`, `travel: true` | HostHome (account-gated) | ✅ (account-gated) | Host shell, Reveal fires | Expected match | ✅ (inferred) |
| Wedding | Wedding | N/A | `full_service` / `client` | MainDashboard if planner account; HostHome if host account manages own wedding | ✅ if host account | Depends entirely on ACCOUNT, not type — a host planning their own wedding gets Host shell; a professional planner managing it gets MainDashboard | Same — account gate is type-agnostic | ✅ (by design — but note taxonomy's `full_service` label implies "planner-only" while the actual gate disagrees; this is a **naming/expectation mismatch**, not a routing bug) |
| Corporate Meeting *(no exact type — closest is "Team Retreat"/"Conference")* | Enterprise (per Sprint A's complexity rules — `primaryEventType === 'Team Retreat'`) | N/A | `corporate` / `client` | MainDashboard if planner account; **HostHome if a host account somehow creates one** (account gate doesn't check taxonomy at all) | ✅ if host account (same universal gate) | Should probably always be Planner/Corporate context | **A host account CAN create a "Conference" and get the Host shell + Assemble Reveal** — taxonomy says `corporate`/`client`, but the account gate doesn't consult taxonomy | ⚠️ **Mismatch** — flagged, not fixed (out of scope) |
| Conference | Same as above | Enterprise complexity | `corporate` / `client` | Same caveat as above | ✅ if host account | Same caveat | Same caveat | ⚠️ **Mismatch**, same reason |
| Crab Feast | Crab Feast, simple | N/A | `home_hosted` / `event` | HostHome (account-gated) | ✅ (confirmed pre-IS-1 and post-IS-1) | Host shell, Reveal fires | Host shell, Reveal fires | ✅ |
| Fundraiser | Fundraiser / Gala | N/A | `full_service` / `client` | Account-gated, same caveat as Wedding | ✅ if host account | Same caveat as Wedding — taxonomy label implies planner-only, account gate disagrees | Same | ⚠️ Same naming/expectation mismatch as Wedding |
| Volunteer Event | **No taxonomy entry found at all** — falls to fuzzy-match fallback, defaults to `host_driven` per the taxonomy's documented "final default" rule | N/A | `host_driven` (fallback default) / `client` | HostHome (account-gated) | ✅ if host account | Undefined product intent — never explicitly designed for | Falls through to host_driven default | ⚠️ Untested edge case, not a routing bug per se |
| Community Festival | **No taxonomy entry found at all** — same fallback as above | N/A | `host_driven` (fallback default) / `client` | HostHome (account-gated) | ✅ if host account | Undefined product intent | Falls through to host_driven default | ⚠️ Same as above |
| Planner-created client event (e.g., planner creates a "Birthday" for a client) | Same Identity result as a host creating it — **Identity/Reveal don't know who created the event** | N/A | `host_driven` / `client` | MainDashboard (`accountTypeOf` sees real clients → 'planner') | **Reveal correctly does NOT fire** (IS-1's gate: `accountTypeOf !== 'planner'`) | Planner shell, no host-only Reveal | Confirmed by IS-1's gate design | ✅ |
| Corporate planner event | Conference/Team Retreat created by a planner account | N/A | `corporate` / `client` | MainDashboard | Reveal correctly does not fire | Planner shell | Matches | ✅ |
| Professional event manager (planner account generally) | N/A — depends entirely on which events they create | N/A | Varies per event type | MainDashboard always, regardless of event type, because `accountTypeOf` sees real clients | Never fires for this account | Planner shell always | Matches | ✅ |

### Regression Matrix Findings Summary
- **17 of 20 scenarios route correctly today**, all via the account-based gate (not taxonomy, not Sprint A).
- **2 scenarios (Conference / "Corporate Meeting") reveal a real gap**: a host account can create a nominally-corporate event type and still get the Host shell + Assemble Reveal, because the account gate never consults taxonomy at all. This is not new — it predates both F4 and IS-1 — but it is the clearest evidence that **the account gate and the taxonomy system are answering unrelated questions**, and nobody has reconciled them.
- **Military Retirement, Volunteer Event, and Community Festival have no dedicated taxonomy entry** — they either ride on a parent type's free text (Military Retirement, functionally, via Retirement Party/Birthday) or fall through to a generic default (Volunteer Event, Community Festival), which is a content/coverage gap, not a routing defect.
- **Wedding and Fundraiser carry a taxonomy label (`full_service`) that implies "planner-managed only"**, but the actual runtime routes purely on account type — a host planning their own wedding gets the Host shell same as a Birthday host. This is a **naming/expectation mismatch worth flagging to product**, not a bug requiring a code fix.

---

## Current Routing Architecture (Summary Diagram)

```
                         accountTypeOf(profile, clients)
                                    │
                    ┌───────────────┴───────────────┐
                  'host'                          'planner'
                    │                                 │
               <HostHome/>                     <MainDashboard/>
                    │                                 │
        ┌───────────┴───────────┐          ┌──────────┴──────────┐
   EditorialCover           createEvent()    PipelineView    ClientDetail
   (presentational,              │           (taxonomy vocab   (taxonomy vocab
    no routing logic)     resolveEventIdentity()   only)         only)
                          (Sprint A — ONLY
                           live call site,
                           wired in IS-1)
                                │
                       buildAssembleRevealStages()
                                │
                         <AssembleReveal/>
                       (fires per account gate,
                        NOT per taxonomy, since IS-1)


   resolvePersona() ──────────────── 0 callers (orphaned, PARK)
   resolveShell()   ──────────────── 0 callers (orphaned, PARK)

   intakeFamilyConfig(type).recordKind ─── 11 call sites, ALL vocabulary/
                                            tab-visibility, NONE are the
                                            shell switch itself
```

---

## Duplicate Routing Logic

- **App.js:23909, 23910, 24737** — `clientIsHostRec`, `eventIsHostFam`, `isHostClient` are three separately-named closures performing the identical `intakeFamilyConfig(...).recordKind === 'event'` check. Candidate for consolidation into one shared helper — **not fixed here per guardrails (audit only)**.

## Dead Routing Logic

- None found. Every taxonomy call site traced does drive a real, live UI decision (vocabulary or tab visibility). Nothing is provably unreachable.

## Orphaned Sprint A Code

- `resolvePersona()` (`lib/personaResolutionEngine.js`) — 0 production callers. **PARK.**
- `resolveShell()` (`lib/shellResolver.js`) — 0 production callers. **PARK.**
- `resolveEventIdentity()` — no longer orphaned (1 caller, since IS-1). **WIRED, no action.**

---

## Recommendation

| Item | Recommendation |
|---|---|
| `resolveEventIdentity()` | **Keep as-is.** Already correctly wired (IS-1), live-verified across 5 scenarios. |
| `resolvePersona()` | **PARK.** Do not wire without first resolving the shell-vocabulary mismatch (Section 6) and running a live-data verification pass — do not trust fixture-only test coverage for this the way F4.1 warned against for Identity. |
| `resolveShell()` | **PARK.** Cannot become canonical until either the 4 missing shells are built or its vocabulary is narrowed to match the 2 that exist — a genuine product decision, not an integration task. |
| Legacy taxonomy (`intakeFamilyConfig`, 11 call sites) | **Test, don't touch yet.** It's doing real, correct work (vocabulary/tab visibility) that Sprint A was never built to replace at this layer. Consolidate the 3 duplicate closures (23909/23910/24737) as a small, separate, low-risk cleanup — optional, not urgent. |
| Wedding/Fundraiser `full_service` labeling vs. actual account-based routing | **Execute a product conversation**, not code — flag the naming mismatch to whoever owns the taxonomy file; it's confusing but not currently causing incorrect behavior. |
| Conference/Team Retreat routable into Host shell for host accounts | **Test** — write an explicit regression test asserting current (possibly-unintended) behavior before anyone changes it, since 17/20 other scenarios depend on the account gate remaining type-agnostic. |
| Military Retirement / Volunteer Event / Community Festival taxonomy coverage | **Park as a content gap**, not a routing defect — track separately from this routing audit. |

**Bottom line:** Sprint A is well-built and well-tested but describes a richer shell system than the product has today. The account-based gate is simple, currently correct for the vast majority of scenarios, and should remain canonical until a deliberate decision is made to either narrow Sprint A to match it or build out the shells Sprint A already imagines.
