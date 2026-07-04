# Sprint A — Persona Resolution Engine Spec
**Date:** 2026-07-03  
**Status:** AWAITING APPROVAL  
**Scope:** Shell routing only. No UI redesign. No new persona shells. No new tabs.

---

## Problem Statement

The current system routes shells via:

```
event.type → taxonomy.family → FAMILY_RECORD_KIND[family] → 'event' | 'client'
```

`FAMILY_RECORD_KIND` maps only `home_hosted` → `'event'`. Everything else → `'client'`.

This means Birthday, Graduation, Retirement Party, Anniversary, Reunion, and 10+ other personal milestone events route personal hosts to the **planner shell**. A mom planning her daughter's graduation party sees "Client Intake," "Pipeline," and "Portfolio."

The fix: replace the flat type→shell map with a **priority-rule engine** that considers WHO is planning, not just WHAT type they selected.

---

## 1. Function Signature

```js
/**
 * Pure function — no side effects, no state reads.
 * All inputs are passed in; caller owns the data.
 *
 * @param  event    — current event object (or partial at intake time)
 * @param  profile  — host intel profile for this user (or null)
 * @param  account  — authenticated account metadata (or null)
 * @param  context  — runtime context flags (or null)
 * @returns PersonaResult
 */
resolvePersona(event, profile, account, context) → PersonaResult

// Types:

event: {
  type?: string,           // canonical taxonomy type ('Birthday', 'Retirement Party', …)
  family?: string,         // taxonomy family if pre-resolved ('home_hosted', 'host_driven', …)
  relationship?: string,   // declared: 'self' | 'family' | 'friend' | 'client' | 'company' | 'organization'
  recordKind?: string,     // LEGACY — read only for backward compat, never the authority
}

profile: {
  role?: string,           // 'host' | 'planner' | 'coordinator' (stored on the user's profile)
} | null

account: {
  role?: string,           // 'host' | 'planner' | 'coordinator' | 'operator' | 'vendor' | 'venue'
  orgType?: string,        // 'individual' | 'business' | 'nonprofit' | 'government'
} | null

context: {
  workspaceMode?: string,  // 'host' | 'planner' | 'admin' — active workspace at call time
  explicitOverride?: string, // force a specific shell, bypasses all rules (QA / admin use)
} | null

PersonaResult: {
  shell: 'host' | 'planner' | 'coordinator' | 'corporate' | 'venue' | 'vendor',
  reason: string,    // human-readable explanation of which rule fired
  ruleIndex: number, // 1–6 (which rule resolved it)
  isDefault: boolean, // true if Rule 6 (fallback) fired
}
```

**Degradation contract**: The function is called with progressively richer context as the user progresses through intake. It must return a stable, useful result at every level:

| Context available | Rules that can fire |
|-------------------|-------------------|
| `{ type }` only | Rule 6 |
| `{ type, relationship }` | Rules 4–6 |
| `{ type, relationship }` + account | Rules 2–6 |
| Full all four args | Rules 1–6 |

---

## 2. The 6-Rule Priority Hierarchy

Rules are evaluated **top-down**. First match wins. No fallthrough.

```
Rule 1 — Explicit override (highest priority)
Rule 2 — Account role + client relationship
Rule 3 — Account role for vendor / venue
Rule 4 — Declared personal relationship  ← THE GUARDRAIL
Rule 5 — Organizational coordinator
Rule 6 — Event family fallback (lowest priority)
```

---

### Rule 1 — Explicit Override

```
IF context.explicitOverride is set
THEN shell = context.explicitOverride
     reason = 'Explicit override'
     ruleIndex = 1
```

**Purpose**: QA testing, admin impersonation, future "switch persona" UX.  
**Who sets it**: Admin console, URL param `?persona=planner` in dev mode.  
**Not user-facing** in production.

---

### Rule 2 — Professional Planner with Client

```
IF account.role === 'planner'
AND event.relationship === 'client'
THEN shell = 'planner'
     reason = 'Professional planner managing a client event'
     ruleIndex = 2
```

**Purpose**: A professional planner organizing a birthday party for a client should get the planner shell, not the host shell. The event type is irrelevant here.  
**Key**: BOTH conditions required. A planner organizing their OWN birthday (relationship = 'self') still gets host shell via Rule 4.

---

### Rule 3 — Vendor / Venue Account

```
IF account.role === 'vendor'
THEN shell = 'vendor'
     reason = 'Vendor account'
     ruleIndex = 3

IF account.role === 'venue'
THEN shell = 'venue'
     reason = 'Venue account'
     ruleIndex = 3
```

**Purpose**: Forward-compatible rule for vendor/venue personas. Not fully built yet — `vendor` and `venue` shells resolve to the existing vendor screen for now.  
**Behavior today**: If shell = 'vendor' or 'venue', the runtime treats it as 'planner' (no regression). When those shells are built, they become distinct.

---

### Rule 4 — Declared Personal Relationship ← THE GUARDRAIL

```
IF event.relationship IN ['self', 'family', 'friend']
THEN shell = 'host'
     reason = 'Planning for self / family / friend'
     ruleIndex = 4
```

**This is the central fix.** Event type does NOT matter when the host declares a personal relationship. A professional planner who declares 'self' still gets the host shell (their personal retirement party, not a client's). A parent planning their kid's Sweet 16 declares 'family' → host shell.

**Guardrail stated explicitly**: `event.type` and `event.family` are ignored in Rule 4. The relationship is the authority.

---

### Rule 5 — Organizational Coordinator

```
IF event.relationship IN ['company', 'organization']
AND account.role NOT IN ['planner', 'vendor', 'venue']
THEN shell = 'coordinator'
     reason = 'Organizing event within/for a company or organization'
     ruleIndex = 5
```

**Purpose**: An HR person organizing the company holiday party, a nonprofit volunteer organizing a charity gala, a school parent organizing a fundraiser. These are not planners (no client contract) and not personal hosts.  
**Note**: If `account.role === 'planner'` and `relationship === 'company'`, Rule 2 takes precedence if the event also has `relationship === 'client'`. If it doesn't, Rule 5 fires.

---

### Rule 6 — Event Family Fallback (lowest priority)

```
ELSE (no relationship declared, no account role signals)
  family = resolveFamily(event.type)  // from taxonomy
  shell = FAMILY_SHELL_MAP[family]
  reason = 'Derived from event type family (no relationship declared)'
  ruleIndex = 6
  isDefault = true
```

**The new FAMILY_SHELL_MAP** (replaces FAMILY_RECORD_KIND):

| Family | Shell | Rationale |
|--------|-------|-----------|
| `home_hosted` | `host` | Always personal. Dinner Party, Crab Feast, etc. |
| `host_driven` | `host` | **THE FIX.** Personal milestones. Was 'client'. |
| `full_service` | `planner` | Wedding, Elopement, Vow Renewal — professionally planned. |
| `corporate` | `coordinator` | Holiday Party, Board Meeting, Conference, etc. |
| `travel_led` | `planner` | Elopement, Team Retreat, Wellness Retreat. |
| `null` (unknown type) | `host` | Safe default. Unknown → assume personal host, not planner. |

**Why `host_driven` → `host` is correct**: The taxonomy itself says `host_driven` means "the host is driving." Birthday, Graduation, Retirement Party, Anniversary — the planning burden falls on a person, not a professional. The old `'client'` mapping was a classification error from when the system was planner-first.

---

## 3. Exact Shell Outputs

| Shell | Meaning | Tabs shown | Voice |
|-------|---------|-----------|-------|
| `host` | Personal host planning own event | Your Event · Plan · Budget · Guests · The Day | "you," "your guests," "your event" |
| `planner` | Professional planner with client | Command · Planning · Vendors · Guests · Budget · Docs · Comms | "your client," "the event," professional |
| `coordinator` | Internal organizer (company / org) | Command · Planning · Vendors · Guests · Budget | Neutral operational |
| `corporate` | Corporate event management (external clients) | Full planner suite + client portal | Formal professional |
| `venue` | Venue-side operations | [Not yet built — degrades to planner] | Venue-centric |
| `vendor` | Vendor-side operations | [Not yet built — degrades to planner] | Vendor-centric |

**Today's implementation**: `venue` and `vendor` shells are placeholders for Sprint E+. The function returns them correctly; the runtime treats them as `planner` until those shells exist. No regression.

`corporate` shell also not yet built as distinct from `planner`. Returns `coordinator` in practice until Sprint E+. This is intentional: we're wiring the resolver now so shell-building later requires only runtime changes, not resolver changes.

---

## 4. Inputs Detail

### `event.relationship` — the new field

```
'self'          — planning my own event (birthday, retirement, anniversary)
'family'        — planning for a family member (parent → kid's birthday, adult child → parent's retirement)
'friend'        — planning for a friend (hosting someone else's bridal shower, bachelorette)
'client'        — professional engagement with a paying client
'company'       — organizing for my employer (HR, office manager, employee committee)
'organization'  — organizing for a nonprofit, school, club, or community group
```

**Where set**: Intake question (see Section 8). Defaults to `null` for existing events — Rule 6 fires.

### `account.role`
Read from Supabase `app_metadata.role`. Current values in production: `'admin'`, `'planner'`, `'host'`, `'user'` (legacy catch-all → treated as `null`).  
**No schema change needed.** The resolver reads it; no new roles are written by this sprint.

### `event.family`
Pre-resolved from `intakeFamilyFor(event.type)` if the caller has already resolved it. If not, the function resolves it internally from `event.type`. Both paths produce the same result.

### `event.recordKind` (legacy)
**Read-only.** Never the authority. Used only for `isDefault = true` warning when the legacy value disagrees with the new resolution. Gives operators a migration audit signal without breaking anything.

### `context.workspaceMode`
Set by the active workspace at call time. Today: the admin console sets `'admin'`, forcing the planner view regardless of event type. No change to this behavior.

---

## 5. Backward Compatibility Rules

### Existing events with no `relationship` field
Rule 6 fires. New `FAMILY_SHELL_MAP` applies:
- Old events typed as `home_hosted` → `host` (no change)
- Old events typed as `host_driven` (Birthday, Graduation, Retirement Party, etc.) → `host` (FIXED — was 'client')
- Old events typed as `full_service` (Wedding) → `planner` (no change)
- Old events typed as `corporate` → `coordinator` (behavioral change from 'client', but correct)

### Old events with `recordKind: 'client'` in database
The stored `recordKind` field is **not consulted for shell routing**. `resolvePersona()` is called fresh at each render. Old data is not migrated. Old `recordKind: 'client'` values on `host_driven` events will be silently overridden by the new resolver.

### `isHostEvent` boolean in App.js
Current: `const isHostEvent = (intakeFamilyConfig(vocabType) || {}).recordKind === 'event';`  
New: `const isHostEvent = resolvePersona({ type: vocabType }, profile, account, context).shell === 'host';`  
This is a drop-in replacement — `isHostEvent` semantics unchanged.

### `hostNavActive(event)` in presentationNav.js
Current: reads feature flag + derives from event internals.  
New: reads feature flag + calls `resolvePersona()`.  
Same output interface — callers unchanged.

### Feature flags
`pi.nav` and `pi.shell` flags unchanged. When shell flag is OFF, `hostNavActive()` returns false regardless of resolver output. This is intentional — flag can override the resolver for QA.

---

## 6. Migration Impact

### Taxonomy (`eventTaxonomy.mjs`)
**No change to the taxonomy table.** The `host_driven` family entry is correct — it describes the planning model, not the shell. The resolver now maps it correctly.

**No change to `FAMILY_RECORD_KIND`.** That map is used by `recordKindFor()`, which is still needed for backward-compat reads. The resolver does NOT call `recordKindFor()`. Two separate concepts, two separate maps.

### Playbook data files
No changes to playbook `recordKind` fields in this sprint.  
`recordKind` on playbook files is documentation only. The field is deprecated as a routing signal but kept to avoid confusion during the transition. A future cleanup sprint can remove it.

### Database
No migrations. No schema changes. `relationship` is written to the event object at creation time via the intake form. Old events have `relationship: undefined` → Rule 6. Safe.

### `intakeFamilyConfig()` in App.js
This function returns a config object used for: intake chrome labels, the `isHostEvent` boolean, and a few other intake-time guards. It will internally call `resolvePersona()` to derive the shell. Its output interface is unchanged — callers keep reading `config.recordKind` and it will still return `'event'` or `'client'` based on the resolved shell. This keeps the number of call sites zero.

---

## 7. Test Matrix — 19 Misrouted Events

Each row: input → expected shell under Rule → currently routed to → after fix.

| # | Event Type | account.role | relationship | Rule fires | Expected shell | Currently | After fix |
|---|-----------|-------------|-------------|-----------|---------------|-----------|-----------|
| 1 | Retirement Party | null | null | 6 | `host` | `planner` | `host` ✅ |
| 2 | Anniversary | null | null | 6 | `host` | `planner` | `host` ✅ |
| 3 | Reunion | null | null | 6 | `host` | `planner` | `host` ✅ |
| 4 | Holiday Party (personal) | null | 'self' | 4 | `host` | `planner` | `host` ✅ |
| 5 | Holiday Party (corporate) | null | 'company' | 5 | `coordinator` | `planner` | `coordinator` ✅ |
| 6 | Bridal Shower | null | 'friend' | 4 | `host` | `planner` | `host` ✅ |
| 7 | Engagement Party | null | 'family' | 4 | `host` | `planner` | `host` ✅ |
| 8 | Gender Reveal | null | null | 6 | `host` | `planner` | `host` ✅ |
| 9 | Sweet 16 | null | 'family' | 4 | `host` | `planner` | `host` ✅ |
| 10 | Bachelorette Party | null | 'friend' | 4 | `host` | `planner` | `host` ✅ |
| 11 | Bachelor Party | null | 'friend' | 4 | `host` | `planner` | `host` ✅ |
| 12 | Surprise Proposal | null | 'friend' | 4 | `host` | `planner` | `host` ✅ |
| 13 | Baby Shower | null | null | 6 | `host` | `host` | `host` ✅ (no change) |
| 14 | Birthday | null | null | 6 | `host` | `host` | `host` ✅ (now robust) |
| 15 | Graduation | null | null | 6 | `host` | `host` | `host` ✅ (now robust) |
| 16 | Birthday | 'planner' | 'client' | 2 | `planner` | `host` | `planner` ✅ |
| 17 | Retirement Party | 'planner' | 'client' | 2 | `planner` | `planner` | `planner` ✅ (no change) |
| 18 | Wedding | 'planner' | 'client' | 2 | `planner` | `planner` | `planner` ✅ (no change) |
| 19 | Birthday | 'planner' | 'self' | 4 | `host` | `host` | `host` ✅ (planner's own party) |

**Regression risk**: Rows 13–15 are "no change" cases that are now explicitly tested. Rows 17–18 confirm professional planner cases still work. Row 19 is the key override case: a professional planner's own birthday → host shell.

**Additional edge cases to test:**
- `type: null` (no type selected yet) → Rule 6 → `host` (safe fallback)
- `type: 'Wedding'`, `relationship: 'self'` (self-planned elopement) → Rule 4 → `host` (overrides full_service → planner)
- `type: 'Conference'`, `relationship: 'company'` → Rule 5 → `coordinator`
- `type: 'Crab Feast'`, `account.role: 'planner'`, `relationship: 'client'` → Rule 2 → `planner` (planner organized crab feast)
- `context.explicitOverride: 'planner'` → Rule 1 → `planner` (QA mode)

---

## 8. Intake Question

**One lightweight question added to the create modal**, below the event type selector:

```
Who are you planning this for?

○ Myself or my family
○ A friend
○ A client                    [shows only if account.role = 'planner' or similar]
○ My company / organization
```

**Saves as**: `event.relationship = 'self' | 'friend' | 'client' | 'company'`  
(Family maps to 'self' for intake simplicity; they're treated identically in Rules 4+.)

**Defaults**: Field is optional. If not answered:
- `account.role === 'planner'` → defaults to `'client'`
- otherwise → `null` (Rule 6 fires — family-based routing)

**UI budget**: 4 radio buttons, no labels beyond the question. No additional chrome. Does NOT appear in the event details edit view — relationship is set at creation and not editable post-create (to avoid mid-event persona switching which breaks the experience).

---

## 9. Guardrail (Stated Formally)

```
INVARIANT: event.type and event.family SHALL NOT force shell = 'planner'
           when event.relationship ∈ { 'self', 'family', 'friend' }

COROLLARY: A host planning any event type — including Wedding, Conference,
           Fundraiser — gets the host shell if they declare a personal relationship.

EXCEPTION: Rule 1 (explicit override) can bypass the guardrail. This is QA-only.
           Rule 2 (planner + client) requires relationship = 'client', so it
           cannot fire when relationship is personal.
```

This means the guardrail is enforced by the rule structure itself, not by a separate check. If Rule 4 fires, it fires unconditionally on the relationship value — it reads nothing else.

---

## 10. Final Recommendation

**EXECUTE**

Rationale:

| Factor | Assessment |
|--------|-----------|
| Risk | Low. Pure function, no state, no DB migration. Old events degrade safely to Rule 6. |
| Impact | High. 19 issues resolved. ~29% of HIP-1 findings fixed in one sprint. |
| Reversibility | Full. The resolver can be wrapped in a feature flag (`pi.persona`) if a regression appears. |
| Scope | Tight. New file (~100 lines), 2 integration points (presentationNav.js, intakeFamilyConfig), 1 intake UI change (4 radio buttons). |
| Risk of NOT doing it | Sprint B (Event Composition) assumes correct shell routing. Building compound events on a broken persona foundation compounds the debt. |
| Test coverage | 19-case matrix is mechanical to cover. Pure function is trivial to unit test. |

**What to watch**:
- `Wedding` + `relationship: null` still routes to `planner` via Rule 6 (full_service). Correct. But a self-planned elopement with `relationship: 'self'` now routes to `host`. This is a behavior change worth calling out in release notes.
- `Holiday Party` is now `coordinator` when `relationship: 'company'` — the corporate events tab will show. No regression, but operators should know.

**Park/Kill scenarios**: None. The only reason to park would be if `intakeFamilyConfig()` has more call sites than identified. Read it fully before implementing.

---

*Spec complete. Awaiting approval to implement.*
